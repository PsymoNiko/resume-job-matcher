import jsPDF from 'jspdf';
import { ATSResume } from '../types';

export function generateATSPDF(resume: ATSResume, filename = 'tailored_ats_resume.pdf') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

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
  doc.text(contact.name || 'Developer Resume', margin, y);
  y += 6;

  // Title / Subheading (11pt)
  if (contact.title) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(contact.title, margin, y);
    y += 5;
  }

  // Contact links / email / location (9.5pt)
  const contactItems = [
    contact.email,
    ...(contact.links || [])
  ].filter(Boolean);

  if (contactItems.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const contactLine = contactItems.join('  |  ');
    doc.text(contactLine, margin, y);
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
    doc.text(title.toUpperCase(), margin, y);
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
    const lines = doc.splitTextToSize(text, contentWidth);
    for (const line of lines) {
      checkPageBreak(lineHeight);
      doc.text(line, margin, y);
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
    const lines = doc.splitTextToSize(text, textWidth);

    checkPageBreak(4.5);
    doc.text(bulletSymbol, margin + indent, y);
    doc.text(lines[0], margin + indent + bulletWidth, y);
    y += 4.2;

    for (let i = 1; i < lines.length; i++) {
      checkPageBreak(4.2);
      doc.text(lines[i], margin + indent + bulletWidth, y);
      y += 4.2;
    }
  };

  // 1. PROFESSIONAL SUMMARY
  if (sections.professional_summary) {
    renderSectionHeader('Professional Summary');
    renderParagraph(sections.professional_summary);
    y += 2;
  }

  // 2. CORE TECHNICAL SKILLS
  if (sections.core_skills && sections.core_skills.length > 0) {
    renderSectionHeader('Core Technical Skills');
    for (const group of sections.core_skills) {
      checkPageBreak(5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      const prefix = `${group.category}: `;
      doc.text(prefix, margin, y);

      const prefixWidth = doc.getTextWidth(prefix);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      const skillsStr = group.skills.join(', ');
      const skillLines = doc.splitTextToSize(skillsStr, contentWidth - prefixWidth);

      doc.text(skillLines[0], margin + prefixWidth, y);
      y += 4.2;

      for (let i = 1; i < skillLines.length; i++) {
        checkPageBreak(4.2);
        doc.text(skillLines[i], margin + 6, y);
        y += 4.2;
      }
    }
    y += 2.5;
  }

  // 3. HIGHLIGHTED TECHNICAL PROJECTS
  if (sections.highlighted_projects && sections.highlighted_projects.length > 0) {
    renderSectionHeader('Highlighted Technical Projects & Contributions');
    for (const proj of sections.highlighted_projects) {
      checkPageBreak(12);

      // Project Title and Role
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(20, 20, 20);
      doc.text(proj.title, margin, y);

      if (proj.role_or_type) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        const roleWidth = doc.getTextWidth(proj.role_or_type);
        doc.text(proj.role_or_type, pageWidth - margin - roleWidth, y);
      }
      y += 4.2;

      // Tech stack
      if (proj.technologies) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(70, 70, 70);
        doc.text(`Technologies: ${proj.technologies}`, margin, y);
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
    renderSectionHeader('Additional Open Source Repositories');
    for (const repo of sections.additional_repositories) {
      checkPageBreak(8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(20, 20, 20);
      const title = `${repo.title}: `;
      doc.text(title, margin, y);

      const titleWidth = doc.getTextWidth(title);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      const summaryLines = doc.splitTextToSize(repo.summary, contentWidth - titleWidth);
      doc.text(summaryLines[0], margin + titleWidth, y);
      y += 4.2;

      for (let i = 1; i < summaryLines.length; i++) {
        checkPageBreak(4.2);
        doc.text(summaryLines[i], margin + 4, y);
        y += 4.2;
      }
    }
    y += 2;
  }

  // 5. EDUCATION & CREDENTIALS
  if (sections.education_and_certifications && sections.education_and_certifications.length > 0) {
    renderSectionHeader('Education & Credentials');
    for (const edu of sections.education_and_certifications) {
      renderBullet(edu);
    }
  }

  doc.save(filename);
}
