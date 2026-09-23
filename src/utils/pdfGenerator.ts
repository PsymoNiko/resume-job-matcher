import jsPDF from 'jspdf';
import { ATSResume } from '../types';

export type PDFLanguage = 'en' | 'fa' | 'ru';

const PDF_LABELS: Record<PDFLanguage, Record<string, string>> = {
  en: {
    summary: 'Professional Summary',
    skills: 'Core Technical Skills',
    projects: 'Highlighted Technical Projects & Contributions',
    repositories: 'Additional Open Source Repositories',
    education: 'Education & Credentials',
    technologies: 'Technologies',
  },
  fa: {
    summary: 'خلاصه حرفه‌ای',
    skills: 'مهارت‌های فنی اصلی',
    projects: 'پروژه‌ها و مشارکت‌های فنی برجسته',
    repositories: 'مخازن متن‌باز اضافی',
    education: 'تحصیلات و گواهینامه‌ها',
    technologies: 'فناوری‌ها',
  },
  ru: {
    summary: 'Профессиональное резюме',
    skills: 'Основные технические навыки',
    projects: 'Избранные технические проекты и вклад',
    repositories: 'Дополнительные репозитории с открытым исходным кодом',
    education: 'Образование и сертификаты',
    technologies: 'Технологии',
  },
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function loadPdfFonts(doc: jsPDF, language: PDFLanguage) {
  const regularFont = language === 'fa' ? '/fonts/NotoNaskhArabic-Regular.ttf' : '/fonts/NotoSans-Regular.ttf';
  const boldFont = language === 'fa' ? regularFont : '/fonts/NotoSans-Bold.ttf';
  const [regular, bold] = await Promise.all([
    fetch(regularFont).then((response) => {
      if (!response.ok) throw new Error(`Unable to load PDF font: ${regularFont}`);
      return response.arrayBuffer();
    }),
    fetch(boldFont).then((response) => {
      if (!response.ok) throw new Error(`Unable to load PDF font: ${boldFont}`);
      return response.arrayBuffer();
    }),
  ]);

  doc.addFileToVFS('ResumeRegular.ttf', arrayBufferToBase64(regular));
  doc.addFont('ResumeRegular.ttf', 'Resume', 'normal');
  doc.addFileToVFS('ResumeBold.ttf', arrayBufferToBase64(bold));
  doc.addFont('ResumeBold.ttf', 'Resume', 'bold');
  doc.setFont('Resume', 'normal');
  if (language === 'fa') doc.setR2L(true);
}

export async function generateATSPDF(
  resume: ATSResume,
  filename = 'tailored_ats_resume.pdf',
  language: PDFLanguage = 'en'
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  await loadPdfFonts(doc, language);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;
  const labels = PDF_LABELS[language];
  const rtl = language === 'fa';
  const renderText = (text: string) => rtl ? doc.processArabic(text) : text;
  const textX = (text: string, x: number) => rtl ? pageWidth - x : x;
  const align = rtl ? 'right' as const : 'left' as const;

  const checkPageBreak = (neededSpace = 12) => {
    if (y + neededSpace >= pageHeight - 15) {
      doc.addPage();
      y = 18;
    }
  };

  const sections = resume.parsed_sections;
  const contact = sections.contact_info;

  // Header: Name (Bold, 18pt)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text(renderText(contact.name || 'Developer Resume'), textX(contact.name || 'Developer Resume', margin), y, { align });
  y += 6;

  // Title / Subheading (11pt)
  if (contact.title) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(renderText(contact.title), textX(contact.title, margin), y, { align });
    y += 5;
  }

  // Contact links / email / phone / location (9.5pt)
  const contactItems = [
    contact.email,
    contact.phone,
    contact.location,
    ...(contact.links || [])
  ].filter(Boolean);

  if (contactItems.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const contactLine = contactItems.join('  |  ');
    doc.text(renderText(contactLine), textX(contactLine, margin), y, { align });
    y += 7;
  }

  // Divider below header
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Helper for Section Headings
  const renderSectionHeader = (title: string) => {
    checkPageBreak(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(renderText(title.toUpperCase()), textX(title, margin), y, { align });
    y += 2;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.25);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4.5;
  };

  // Helper for Body Paragraph
  const renderParagraph = (text: string, fontSize = 9.5, lineHeight = 4.2) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(renderText(text), contentWidth);
    for (const line of lines) {
      checkPageBreak(lineHeight);
      doc.text(line, textX(line, margin), y, { align });
      y += lineHeight;
    }
    y += 2;
  };

  // Helper for Bullet Point
  const renderBullet = (text: string, indent = 4) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const bulletSymbol = '• ';
    const bulletWidth = doc.getTextWidth(bulletSymbol);
    const textWidth = contentWidth - indent - bulletWidth;
    const lines = doc.splitTextToSize(renderText(text), textWidth);

    checkPageBreak(4.5);
    doc.text(bulletSymbol, textX(bulletSymbol, margin + indent), y, { align });
    doc.text(lines[0], textX(lines[0], margin + indent + bulletWidth), y, { align });
    y += 4.2;

    for (let i = 1; i < lines.length; i++) {
      checkPageBreak(4.2);
      doc.text(lines[i], textX(lines[i], margin + indent + bulletWidth), y, { align });
      y += 4.2;
    }
  };

  // 1. PROFESSIONAL SUMMARY
  if (sections.professional_summary) {
    renderSectionHeader(labels.summary);
    renderParagraph(sections.professional_summary);
    y += 2;
  }

  // 2. CORE TECHNICAL SKILLS
  if (sections.core_skills && sections.core_skills.length > 0) {
    renderSectionHeader(labels.skills);
    for (const group of sections.core_skills) {
      checkPageBreak(5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      const prefix = `${group.category}: `;
      doc.text(renderText(prefix), textX(prefix, margin), y, { align });

      const prefixWidth = doc.getTextWidth(prefix);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      const skillsStr = group.skills.join(', ');
      const skillLines = doc.splitTextToSize(skillsStr, contentWidth - prefixWidth);

      doc.text(renderText(skillLines[0]), textX(skillLines[0], margin + prefixWidth), y, { align });
      y += 4.2;

      for (let i = 1; i < skillLines.length; i++) {
        checkPageBreak(4.2);
        doc.text(renderText(skillLines[i]), textX(skillLines[i], margin + 6), y, { align });
        y += 4.2;
      }
    }
    y += 2.5;
  }

  // 3. HIGHLIGHTED TECHNICAL PROJECTS
  if (sections.highlighted_projects && sections.highlighted_projects.length > 0) {
    renderSectionHeader(labels.projects);
    for (const proj of sections.highlighted_projects) {
      checkPageBreak(12);

      // Project Title and Role
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(20, 20, 20);
      doc.text(renderText(proj.title), textX(proj.title, margin), y, { align });

      if (proj.role_or_type) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        const roleWidth = doc.getTextWidth(proj.role_or_type);
        doc.text(renderText(proj.role_or_type), rtl ? margin : pageWidth - margin - roleWidth, y, { align });
      }
      y += 4.2;

      // Tech stack
      if (proj.technologies) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(70, 70, 70);
        const technologyText = `${labels.technologies}: ${proj.technologies}`;
        doc.text(renderText(technologyText), textX(technologyText, margin), y, { align });
        y += 4;
      }

      // Bullets
      if (proj.bullets && proj.bullets.length > 0) {
        for (const bullet of proj.bullets) {
          renderBullet(bullet);
        }
      }
      y += 2;
    }
  }

  // 4. ADDITIONAL REPOSITORIES
  if (sections.additional_repositories && sections.additional_repositories.length > 0) {
    renderSectionHeader(labels.repositories);
    for (const repo of sections.additional_repositories) {
      checkPageBreak(8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(20, 20, 20);
      const title = `${repo.title}: `;
      doc.text(renderText(title), textX(title, margin), y, { align });

      const titleWidth = doc.getTextWidth(title);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      const summaryLines = doc.splitTextToSize(repo.summary, contentWidth - titleWidth);
      doc.text(renderText(summaryLines[0]), textX(summaryLines[0], margin + titleWidth), y, { align });
      y += 4.2;

      for (let i = 1; i < summaryLines.length; i++) {
        checkPageBreak(4.2);
        doc.text(renderText(summaryLines[i]), textX(summaryLines[i], margin + 4), y, { align });
        y += 4.2;
      }
    }
    y += 2;
  }

  // 5. EDUCATION & CREDENTIALS
  if (sections.education_and_certifications && sections.education_and_certifications.length > 0) {
    renderSectionHeader(labels.education);
    for (const edu of sections.education_and_certifications) {
      renderBullet(edu);
    }
  }

  doc.save(filename);
}
