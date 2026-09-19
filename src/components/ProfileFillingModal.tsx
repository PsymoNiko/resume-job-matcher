import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Github, 
  Linkedin, 
  Share2, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Loader2, 
  Plus, 
  Trash2,
  FileText
} from 'lucide-react';
import { UserProfileInfo, GitHubProfileData } from '../types';

interface ProfileFillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProfile: UserProfileInfo | null;
  githubData?: GitHubProfileData | null;
  onSaveProfile: (updatedProfile: UserProfileInfo) => Promise<void>;
}

export const ProfileFillingModal: React.FC<ProfileFillingModalProps> = ({
  isOpen,
  onClose,
  initialProfile,
  githubData,
  onSaveProfile,
}) => {
  const [name, setName] = useState(initialProfile?.name || '');
  const [email, setEmail] = useState(initialProfile?.email || '');
  const [phone, setPhone] = useState(initialProfile?.phone || '');
  const [location, setLocation] = useState(initialProfile?.location || '');
  const [avatarUrl, setAvatarUrl] = useState(initialProfile?.avatar_url || '');
  const [title, setTitle] = useState(initialProfile?.title || '');
  const [bio, setBio] = useState(initialProfile?.bio || '');
  const [githubUsername, setGithubUsername] = useState(initialProfile?.github_username || '');
  const [linkedinUrl, setLinkedinUrl] = useState(initialProfile?.linkedin_url || '');
  const [portfolioUrl, setPortfolioUrl] = useState(initialProfile?.portfolio_url || '');
  const [communityLinks, setCommunityLinks] = useState<string[]>(
    initialProfile?.community_links || ['github.com/alexchen-dev', 'discord.gg/engineering']
  );
  const [newCommunityLink, setNewCommunityLink] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialProfile) {
      setName(initialProfile.name || '');
      setEmail(initialProfile.email || '');
      setPhone(initialProfile.phone || '');
      setLocation(initialProfile.location || '');
      setAvatarUrl(initialProfile.avatar_url || '');
      setTitle(initialProfile.title || '');
      setBio(initialProfile.bio || '');
      setGithubUsername(initialProfile.github_username || '');
      setLinkedinUrl(initialProfile.linkedin_url || '');
      setPortfolioUrl(initialProfile.portfolio_url || '');
      setCommunityLinks(initialProfile.community_links || []);
    }
  }, [initialProfile, isOpen]);

  if (!isOpen) return null;

  const handleAddCommunityLink = () => {
    if (!newCommunityLink.trim()) return;
    const clean = newCommunityLink.trim().replace(/^https?:\/\//, '');
    if (!communityLinks.includes(clean)) {
      setCommunityLinks([...communityLinks, clean]);
    }
    setNewCommunityLink('');
  };

  const handleRemoveCommunityLink = (idx: number) => {
    setCommunityLinks(communityLinks.filter((_, i) => i !== idx));
  };

  const handleAutofillFromGitHub = () => {
    if (!githubData) return;
    if (githubData.name && !name) setName(githubData.name);
    if (githubData.location && !location) setLocation(githubData.location);
    if (githubData.bio && !bio) setBio(githubData.bio);
    if (githubData.avatar_url) setAvatarUrl(githubData.avatar_url);
    if (githubData.blog && !portfolioUrl) setPortfolioUrl(githubData.blog);
    if (githubData.username) {
      setGithubUsername(githubData.username);
      const ghLink = `github.com/${githubData.username}`;
      if (!communityLinks.includes(ghLink)) {
        setCommunityLinks([ghLink, ...communityLinks]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    const updated: UserProfileInfo = {
      ...initialProfile,
      name: name.trim() || 'Candidate',
      email: email.trim() || 'candidate@example.com',
      phone: phone.trim(),
      location: location.trim(),
      avatar_url: avatarUrl.trim(),
      title: title.trim() || 'Software Engineer',
      bio: bio.trim(),
      github_username: githubUsername.trim(),
      linkedin_url: linkedinUrl.trim(),
      portfolio_url: portfolioUrl.trim(),
      community_links: communityLinks,
      updated_at: Date.now(),
    };

    try {
      await onSaveProfile(updated);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in duration-200"
        id="modal-profile-filling"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="relative">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Profile" 
                  className="w-11 h-11 rounded-full object-cover border border-amber-500/40"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-amber-400">
                  <User className="w-5 h-5" />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-100 flex items-center gap-2">
                <span>Personal Profile & Contact Details</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Resume Direct Sync
                </span>
              </h3>
              <p className="text-xs text-stone-400">
                These personal details populate the ATS contact header, PDF export, and verified candidate profile.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-200 rounded-md hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GitHub Auto-fill banner */}
        {githubData && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-stone-950/60 border border-stone-800 text-xs">
            <div className="flex items-center gap-2 text-stone-300">
              <Github className="w-4 h-4 text-amber-400" />
              <span>GitHub profile detected for <strong>@{githubData.username}</strong></span>
            </div>
            <button
              type="button"
              id="btn-autofill-gh"
              onClick={handleAutofillFromGitHub}
              className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-amber-400 rounded border border-stone-700 font-medium transition-colors"
            >
              Auto-fill Missing Fields
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                Full Name <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                <input
                  type="text"
                  required
                  id="profile-name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Chen"
                  className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                Email Address <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                <input
                  type="email"
                  required
                  id="profile-email-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@example.com"
                  className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                Phone Number <span className="text-stone-500">(included in ATS header)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                <input
                  type="tel"
                  id="profile-phone-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (415) 555-0192"
                  className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                Location & Work Preference
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                <input
                  type="text"
                  id="profile-location-input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA (Open to Remote)"
                  className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Professional Title */}
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                Target Professional Title
              </label>
              <input
                type="text"
                id="profile-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Staff Full-Stack & Distributed Systems Engineer"
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Avatar URL */}
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                Avatar Image URL
              </label>
              <input
                type="url"
                id="profile-avatar-input"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* LinkedIn */}
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                LinkedIn Profile URL
              </label>
              <div className="relative">
                <Linkedin className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                <input
                  type="text"
                  id="profile-linkedin-input"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Portfolio / Personal Website */}
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                Personal Portfolio or Website
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                <input
                  type="text"
                  id="profile-portfolio-input"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://alexchen.dev"
                  className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Community Links & Handles */}
          <div className="space-y-2 pt-2 border-t border-stone-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-stone-300 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Community & Developer Links (GitHub, Discord, X, LeetCode, StackOverflow)</span>
              </label>
              <span className="text-[11px] text-stone-500">{communityLinks.length} linked</span>
            </div>

            {/* Existing Chips */}
            <div className="flex flex-wrap gap-2">
              {communityLinks.map((link, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-950 border border-stone-800 text-xs text-stone-200"
                >
                  <span className="truncate max-w-[200px]">{link}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCommunityLink(idx)}
                    className="text-stone-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Add new link row */}
            <div className="flex gap-2">
              <input
                type="text"
                id="input-add-community-link"
                value={newCommunityLink}
                onChange={(e) => setNewCommunityLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCommunityLink();
                  }
                }}
                placeholder="e.g. discord.gg/devs or leetcode.com/u/alexchen"
                className="flex-1 px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                id="btn-add-community-link"
                onClick={handleAddCommunityLink}
                className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Professional Narrative / Bio */}
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">
              Candidate Narrative Summary / Bio
            </label>
            <textarea
              rows={3}
              id="profile-bio-input"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Staff engineer with 8+ years architecting event-driven microservices..."
              className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-stone-400 hover:text-stone-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-save-personal-profile"
              disabled={isSaving}
              className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Profile Saved & Synced!</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Save & Sync to Resume</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
