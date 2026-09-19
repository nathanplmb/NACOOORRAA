import React, { useState } from "react";
import { CandidateProfile } from "../../types";
import { User, Mail, Phone, MapPin, Globe, Linkedin, Github, Car, Edit3, Link as LinkIcon, Sparkles } from "lucide-react";
import { ProfileModal } from "./ProfileModal";

interface IdentitySectionProps {
  profile: CandidateProfile;
  onSave: (updated: Partial<CandidateProfile>) => void;
}

export const IdentitySection: React.FC<IdentitySectionProps> = ({ profile, onSave }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [firstName, setFirstName] = useState(profile.firstName || "Nathan");
  const [lastName, setLastName] = useState(profile.lastName || "PALUMBO");
  const [title, setTitle] = useState(profile.title || "Étudiant PGE | Finance, Business Development & Fintech");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || "");
  const [driverLicense, setDriverLicense] = useState(profile.driverLicense || "Permis B (Véhiculé)");

  const [email, setEmail] = useState(profile.email || "nathpa1423@gmail.com");
  const [phone, setPhone] = useState(profile.phone || "06 12 34 56 78");
  const [city, setCity] = useState(profile.city || "Reims");
  const [country, setCountry] = useState(profile.country || "France");
  const [mobility, setMobility] = useState(profile.mobility || "Régionale (Auvergne-Rhône-Alpes / Grand Est), France entière");

  const [linkedInUrl, setLinkedInUrl] = useState(profile.linkedInUrl || "https://www.linkedin.com/in/nathan-palumbo");
  const [portfolioUrl, setPortfolioUrl] = useState(profile.portfolioUrl || "https://nathan-palumbo.fr");
  const [githubUrl, setGithubUrl] = useState(profile.githubUrl || "https://github.com/nathanpalumbo");

  const handleOpen = () => {
    setFirstName(profile.firstName || "Nathan");
    setLastName(profile.lastName || "PALUMBO");
    setTitle(profile.title || "Étudiant PGE | Finance, Business Development & Fintech");
    setAvatarUrl(profile.avatarUrl || "");
    setDriverLicense(profile.driverLicense || "Permis B (Véhiculé)");
    setEmail(profile.email || "nathpa1423@gmail.com");
    setPhone(profile.phone || "06 12 34 56 78");
    setCity(profile.city || "Reims");
    setCountry(profile.country || "France");
    setMobility(profile.mobility || "Régionale (Auvergne-Rhône-Alpes / Grand Est), France entière");
    setLinkedInUrl(profile.linkedInUrl || "https://www.linkedin.com/in/nathan-palumbo");
    setPortfolioUrl(profile.portfolioUrl || "https://nathan-palumbo.fr");
    setGithubUrl(profile.githubUrl || "https://github.com/nathanpalumbo");
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    onSave({
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      title,
      avatarUrl,
      driverLicense,
      email,
      phone,
      city,
      country,
      mobility,
      linkedInUrl,
      portfolioUrl,
      githubUrl,
    });
    setIsModalOpen(false);
  };

  return (
    <div id="identite" className="glass-panel relative overflow-hidden rounded-3xl p-6 md:p-8 space-y-6 before:absolute before:top-0 before:left-0 before:right-0 before:h-[1.5px] before:bg-gradient-to-r before:from-transparent before:via-white/45 before:to-transparent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/12">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FF6685]/15 border border-[#FF6685]/30 flex items-center justify-center text-[#FF6685] shadow-[0_0_12px_rgba(255,102,133,0.2)]">
              <User className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-[#F5F6FA] font-display">Identité & Positionnement</h3>
          </div>
          <p className="text-xs text-[#9AA0B2]">Tes informations visibles et ton positionnement professionnel.</p>
        </div>

        <button
          onClick={handleOpen}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] border border-white/18 hover:border-white/35 text-xs font-bold text-[#F5F6FA] backdrop-blur-2xl shadow-[0_4px_16px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.28)] transition-all cursor-pointer hover:-translate-y-0.5"
        >
          <Edit3 className="w-3.5 h-3.5 text-[#FF6685]" />
          <span>Modifier</span>
        </button>
      </div>

      {/* Grid of details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Box 1: Identité */}
        <div className="glass-card-static p-5 space-y-3 hover:border-white/25 transition-all duration-300 hover:-translate-y-0.5">
          <span className="text-xs font-bold text-[#FF6685] uppercase tracking-wider block font-display">
            Informations principales
          </span>

          <div className="space-y-2.5 text-xs">
            <div>
              <span className="text-[#9AA0B2] block text-[10px] uppercase font-bold">Nom complet</span>
              <span className="text-[#F5F6FA] font-bold text-sm">{profile.fullName || `${profile.firstName} ${profile.lastName}`}</span>
            </div>

            <div>
              <span className="text-[#9AA0B2] block text-[10px] uppercase font-bold">Titre / Accroche cible</span>
              <span className="text-[#F5F6FA] font-medium leading-relaxed block mt-0.5">
                {profile.title || "Étudiant PGE | Finance, Business Development & Fintech"}
              </span>
            </div>

            <div>
              <span className="text-[#9AA0B2] block text-[10px] uppercase font-bold">Permis de conduire</span>
              <span className="text-[#F5F6FA] font-semibold">{profile.driverLicense || "Non renseigné"}</span>
            </div>
          </div>
        </div>

        {/* Box 2: Coordonnées & Mobilité */}
        <div className="glass-card-static p-5 space-y-3 hover:border-white/25 transition-all duration-300 hover:-translate-y-0.5">
          <span className="text-xs font-bold text-[#38BDF8] uppercase tracking-wider block font-display">
            Coordonnées & Mobilité
          </span>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#9AA0B2] shrink-0" />
              <span className="text-[#F5F6FA] truncate">{profile.email || "Non renseigné"}</span>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#9AA0B2] shrink-0" />
              <span className="text-[#F5F6FA]">{profile.phone || "Non renseigné"}</span>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
              <span className="text-[#F5F6FA]">{profile.city ? `${profile.city}, ${profile.country || "France"}` : "Non renseigné"}</span>
            </div>

            <div>
              <span className="text-[#9AA0B2] block text-[10px] uppercase font-bold mt-1">Mobilité géographique</span>
              <span className="text-[#F5F6FA] font-medium">{profile.mobility || "Non renseignée"}</span>
            </div>
          </div>
        </div>

        {/* Box 3: Liens & Réseaux */}
        <div className="glass-card-static p-5 space-y-3 hover:border-white/25 transition-all duration-300 hover:-translate-y-0.5">
          <span className="text-xs font-bold text-[#C084FC] uppercase tracking-wider block font-display">
            Réseaux & Liens
          </span>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <Linkedin className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
              {profile.linkedInUrl ? (
                <a href={profile.linkedInUrl} target="_blank" rel="noopener noreferrer" className="text-[#38BDF8] hover:underline truncate">
                  {profile.linkedInUrl}
                </a>
              ) : (
                <span className="text-[#9AA0B2]">LinkedIn non renseigné</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-[#34D399] shrink-0" />
              {profile.portfolioUrl ? (
                <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-[#34D399] hover:underline truncate">
                  {profile.portfolioUrl}
                </a>
              ) : (
                <span className="text-[#9AA0B2]">Portfolio non renseigné</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Github className="w-3.5 h-3.5 text-[#C084FC] shrink-0" />
              {profile.githubUrl ? (
                <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="text-[#C084FC] hover:underline truncate">
                  {profile.githubUrl}
                </a>
              ) : (
                <span className="text-[#9AA0B2]">GitHub non renseigné</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Form */}
      <ProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Modifier Identité & Positionnement"
        subtitle="Renseigne tes informations personnelles et réseaux"
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Prénom *</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Nom *</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#F5F6FA] mb-1">
              Titre professionnel / Accroche cible *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Étudiant PGE | Finance, Business Development & Fintech"
              className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
            />
            <p className="text-[10px] text-[#9AA0B2] mt-1">
              💡 Ce titre permet de comprendre immédiatement ton positionnement professionnel.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Photo de profil (URL)</label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://.../photo.jpg"
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Permis de conduire</label>
              <input
                type="text"
                value={driverLicense}
                onChange={(e) => setDriverLicense(e.target.value)}
                placeholder="ex: Permis B (Véhiculé)"
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <h4 className="text-xs font-bold text-[#38BDF8] uppercase tracking-wider mb-3">Coordonnées & Mobilité</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Téléphone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Ville actuelle</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Pays</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Mobilité géographique</label>
              <input
                type="text"
                value={mobility}
                onChange={(e) => setMobility(e.target.value)}
                placeholder="ex: Régionale (Auvergne-Rhône-Alpes / Grand Est), France entière"
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <h4 className="text-xs font-bold text-[#C084FC] uppercase tracking-wider mb-3">Réseaux professionnels</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Profil LinkedIn</label>
                <input
                  type="text"
                  value={linkedInUrl}
                  onChange={(e) => setLinkedInUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/in/..."
                  className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Portfolio / Site personnel</label>
                <input
                  type="text"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Profil GitHub / Code</label>
                <input
                  type="text"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
                />
              </div>
            </div>
          </div>
        </div>
      </ProfileModal>
    </div>
  );
};
