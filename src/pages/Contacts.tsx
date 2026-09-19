import React, { useState, useEffect } from "react";
import { dbStore } from "../dbStore";
import { Contact, ContactCategory, ContactNetworkingStatus, CandidateProfile } from "../types";
import { GlassCard, Badge, GlassButton, Modal } from "../components/Shared";
import { LinkedInImportModal } from "../components/LinkedInImportModal";
import { ContactDetailWorkspace } from "../components/ContactDetailWorkspace";
import { 
  Users, 
  Upload, 
  Search, 
  Sparkles, 
  CheckCircle, 
  Plus, 
  ChevronRight, 
  Linkedin, 
  Mail, 
  Phone, 
  Building2, 
  Briefcase, 
  GraduationCap, 
  Filter, 
  X, 
  ArrowUpDown, 
  Award,
  Link as LinkIcon,
  UserCheck,
  Trash2
} from "lucide-react";

interface ContactsProps {
  showToast: (message: string, type: "success" | "error" | "info" | "ai") => void;
  searchTerm: string;
}

export const Contacts: React.FC<ContactsProps> = ({ showToast, searchTerm }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [profile, setProfile] = useState<CandidateProfile>(dbStore.getProfile());
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Filters & Search
  const [localSearch, setLocalSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"relevance" | "recent" | "name">("relevance");

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  // Add Contact Form State
  const [formName, setFormName] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formJob, setFormJob] = useState("");
  const [formCategory, setFormCategory] = useState<ContactCategory>("other");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formLinkedIn, setFormLinkedIn] = useState("");
  const [formNotes, setFormNotes] = useState("");

  useEffect(() => {
    setContacts(dbStore.getContacts());
    setProfile(dbStore.getProfile());

    const unsub = dbStore.subscribe(() => {
      const allContacts = dbStore.getContacts();
      setContacts(allContacts);
      setProfile(dbStore.getProfile());

      // Keep selected contact synced
      if (selectedContact) {
        const fresh = allContacts.find(c => c.id === selectedContact.id);
        if (fresh) setSelectedContact(fresh);
      }
    });
    return unsub;
  }, [selectedContact?.id]);

  // Distinct company list from contacts for filter
  const companyOptions = Array.from(new Set(contacts.map(c => c.companyName).filter(Boolean))).sort();

  // Statistics
  const totalCount = contacts.length;
  const alumniCount = contacts.filter(c => c.category === "alumni").length;
  const recruiterCount = contacts.filter(c => c.category === "recruiter").length;
  const sectorProCount = contacts.filter(c => c.category === "sector_pro").length;
  const linkedOppCount = contacts.filter(c => Boolean(c.opportunityId)).length;

  const handleCategoryBadge = (category: ContactCategory) => {
    switch (category) {
      case "recruiter":
        return <Badge variant="green">Recruteur / RH</Badge>;
      case "alumni":
        return <Badge variant="blue">Alumni</Badge>;
      case "student":
        return <Badge variant="purple">Étudiant</Badge>;
      case "sector_pro":
        return <Badge variant="amber">Pro Secteur Cible</Badge>;
      case "other_pro":
        return <Badge variant="gray">Pro Autre Secteur</Badge>;
      default:
        return <Badge variant="gray">Autre</Badge>;
    }
  };

  // Filter & Sort contacts
  const effectiveSearch = (localSearch || searchTerm).toLowerCase().trim();

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = !effectiveSearch || (
      c.fullName.toLowerCase().includes(effectiveSearch) ||
      c.companyName.toLowerCase().includes(effectiveSearch) ||
      c.jobTitle.toLowerCase().includes(effectiveSearch) ||
      (c.academicPath && c.academicPath.toLowerCase().includes(effectiveSearch)) ||
      (c.connectionPoints && c.connectionPoints.some(pt => pt.toLowerCase().includes(effectiveSearch)))
    );

    const matchesCategory = categoryFilter === "all" || c.category === categoryFilter;
    const matchesCompany = companyFilter === "all" || c.companyName.toLowerCase() === companyFilter.toLowerCase();
    const matchesStatus = statusFilter === "all" || (c.networkingStatus || "to_contact") === statusFilter;

    return matchesSearch && matchesCategory && matchesCompany && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === "relevance") {
      return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    }
    if (sortBy === "name") {
      return a.fullName.localeCompare(b.fullName);
    }
    // "recent"
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Manual Add Contact
  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCompany || !formJob) {
      showToast("Veuillez remplir les informations obligatoires", "error");
      return;
    }

    const nameParts = formName.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const linkedCo = dbStore.getCompanyByNameOrCreate(formCompany);

    const newContact = dbStore.addContact({
      fullName: formName.trim(),
      firstName,
      lastName,
      companyId: linkedCo.id,
      companyName: linkedCo.name,
      jobTitle: formJob.trim(),
      normalizedJobTitle: formJob.trim(),
      category: formCategory,
      relevanceScore: formCategory === "alumni" ? 90 : formCategory === "recruiter" ? 85 : formCategory === "sector_pro" ? 80 : 50,
      connectionPoints: [
        formCategory === "alumni" ? "Réseau Alumni / Établissement d'études" : 
        formCategory === "recruiter" ? "Contact RH & Recrutement" : "Contact Professionnel"
      ],
      previousCompanies: [],
      notes: formNotes || "Ajouté manuellement",
      email: formEmail.trim() || undefined,
      phone: formPhone.trim() || undefined,
      linkedInUrl: formLinkedIn.trim() || undefined,
      networkingStatus: "to_contact",
      history: [
        {
          id: "hist_" + Math.random().toString(36).substring(2, 9),
          type: "import",
          label: "Contact ajouté manuellement au carnet",
          timestamp: new Date().toISOString()
        }
      ]
    });

    showToast(`Contact "${formName}" ajouté avec succès`, "success");
    setFormName("");
    setFormCompany("");
    setFormJob("");
    setFormCategory("other");
    setFormEmail("");
    setFormPhone("");
    setFormLinkedIn("");
    setFormNotes("");
    setIsAddModalOpen(false);
  };

  // Delete Contact
  const handleDeleteContact = (id: string) => {
    dbStore.deleteContact(id);
    showToast("Contact supprimé", "info");
    setSelectedContact(null);
  };

  // If a contact is selected, display the full-width workspace (similar to Opportunities)
  if (selectedContact) {
    return (
      <div className="relative z-10 w-full">
        <ContactDetailWorkspace
          contact={selectedContact}
          profile={profile}
          onClose={() => setSelectedContact(null)}
          onUpdate={(updated) => {
            setSelectedContact(updated);
            setContacts(dbStore.getContacts());
          }}
          onDelete={handleDeleteContact}
          showToast={showToast}
        />
      </div>
    );
  }

  return (
    <div className="relative z-10 w-full space-y-5">
      
      {/* ========================================================================= */}
      {/* 1. HEADER SECTION                                                         */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#F5F6FA] tracking-tight font-display whitespace-nowrap">
            Réseau & Contacts
          </h1>
          <p className="text-[#9AA0B2] text-xs sm:text-sm mt-0.5">
            Gérez vos relations professionnelles, ciblez les Alumni et générez des messages d'approche personnalisés
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <GlassButton 
            variant="secondary" 
            size="md"
            onClick={() => setIsImportModalOpen(true)}
            icon={<Upload className="w-3.5 h-3.5 text-[#9AA0B2]" />}
          >
            Importer LinkedIn (CSV)
          </GlassButton>
          <GlassButton 
            variant="primary" 
            size="md"
            onClick={() => setIsAddModalOpen(true)}
            icon={<Plus className="w-3.5 h-3.5 text-white" />}
          >
            Ajouter un contact
          </GlassButton>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. STATS BANNER                                                           */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-[#9AA0B2] uppercase">Total Contacts</span>
          <span className="text-xl font-extrabold text-[#F5F6FA] font-display mt-1">{totalCount}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-[rgba(14,165,233,0.2)] flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-[#38bdf8] uppercase">Alumni</span>
          <span className="text-xl font-extrabold text-[#38bdf8] font-display mt-1">{alumniCount}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-[rgba(18,183,106,0.2)] flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-[#12B76A] uppercase">Recruteurs RH</span>
          <span className="text-xl font-extrabold text-[#12B76A] font-display mt-1">{recruiterCount}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-[rgba(247,144,9,0.2)] flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-[#f79009] uppercase">Pro Secteur Cible</span>
          <span className="text-xl font-extrabold text-[#f79009] font-display mt-1">{sectorProCount}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-[rgba(216,26,69,0.25)] flex flex-col justify-between col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-[#FF6685] uppercase">Liés à des Offres</span>
          <span className="text-xl font-extrabold text-[#FF6685] font-display mt-1">{linkedOppCount}</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FILTERS & SEARCH BAR                                                   */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
        {/* Top filter row: Search input + Company dropdown + Sort dropdown */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#9AA0B2] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher par nom, poste, entreprise, points de connexion..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="glass-input pl-10 pr-9 py-2 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60 w-full"
            />
            {localSearch && (
              <button 
                onClick={() => setLocalSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9AA0B2] hover:text-[#F5F6FA] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
            {/* Company Filter */}
            {companyOptions.length > 0 && (
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="glass-input px-3 py-2 text-xs text-[#F5F6FA] bg-[#060812] cursor-pointer"
              >
                <option value="all" className="bg-[#060812] text-[#F5F6FA]">Toutes les entreprises</option>
                {companyOptions.map((co) => (
                  <option key={co} value={co} className="bg-[#060812] text-[#F5F6FA]">
                    {co}
                  </option>
                ))}
              </select>
            )}

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="glass-input px-3 py-2 text-xs text-[#F5F6FA] bg-[#060812] cursor-pointer"
            >
              <option value="all" className="bg-[#060812] text-[#F5F6FA]">Tous les statuts</option>
              <option value="to_contact" className="bg-[#060812] text-[#F5F6FA]">À contacter</option>
              <option value="contacted" className="bg-[#060812] text-[#F5F6FA]">Message envoyé</option>
              <option value="exchanging" className="bg-[#060812] text-[#F5F6FA]">Échange en cours</option>
              <option value="interview_done" className="bg-[#060812] text-[#F5F6FA]">Entretien réalisé</option>
              <option value="not_interested" className="bg-[#060812] text-[#F5F6FA]">Sans suite</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="glass-input px-3 py-2 text-xs text-[#F5F6FA] bg-[#060812] cursor-pointer"
            >
              <option value="relevance" className="bg-[#060812] text-[#F5F6FA]">Trier : Pertinence</option>
              <option value="recent" className="bg-[#060812] text-[#F5F6FA]">Trier : Plus récents</option>
              <option value="name" className="bg-[#060812] text-[#F5F6FA]">Trier : Nom (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills (Sober Liquid Glass) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-nowrap pt-1">
          {[
            { id: "all", label: `Tous (${totalCount})` },
            { id: "alumni", label: `Alumni (${alumniCount})` },
            { id: "recruiter", label: `Recruteurs RH (${recruiterCount})` },
            { id: "sector_pro", label: `Pro Secteur (${sectorProCount})` },
            { id: "student", label: `Étudiants (${contacts.filter(c => c.category === "student").length})` },
            { id: "other_pro", label: "Autres Pro" },
          ].map((item) => {
            const isActive = categoryFilter === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCategoryFilter(item.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                  isActive
                    ? "bg-[rgba(216,26,69,0.18)] text-[#FF6685] border-[rgba(216,26,69,0.35)] shadow-[0_0_12px_rgba(216,26,69,0.15)]"
                    : "bg-white/[0.03] hover:bg-white/[0.08] text-[#9AA0B2] border-white/5"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. CONTACTS GRID                                                          */}
      {/* ========================================================================= */}
      {filteredContacts.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/10 text-center space-y-3">
          <Users className="w-10 h-10 text-[#9AA0B2] mx-auto opacity-50" />
          <h3 className="text-base font-bold text-[#F5F6FA] font-display">Aucun contact trouvé</h3>
          <p className="text-xs text-[#9AA0B2] max-w-md mx-auto">
            {effectiveSearch || categoryFilter !== "all" || companyFilter !== "all"
              ? "Aucun contact ne correspond à vos filtres actuels. Réinitialisez vos critères de recherche."
              : "Votre carnet de contacts est actuellement vide. Importez vos relations LinkedIn ou ajoutez un contact manuellement."}
          </p>
          {(effectiveSearch || categoryFilter !== "all" || companyFilter !== "all") && (
            <button
              onClick={() => {
                setLocalSearch("");
                setCategoryFilter("all");
                setCompanyFilter("all");
                setStatusFilter("all");
              }}
              className="text-xs text-[#FF6685] hover:underline font-semibold cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map(contact => (
            <GlassCard
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className="p-5 flex flex-col justify-between transition-all duration-200"
              hoverable
            >
              <div className="space-y-3">
                {/* Top Badge Row: Category + Relevance Score */}
                <div className="flex items-center justify-between gap-2">
                  {handleCategoryBadge(contact.category)}
                  <span className="text-xs font-bold text-[#F5F6FA] bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/10">
                    {contact.relevanceScore}%
                  </span>
                </div>
                
                {/* Contact Identity: Exact requested hierarchy */}
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-[#F5F6FA] leading-snug font-display truncate">
                    {contact.fullName}
                  </h3>
                  <p className="text-xs text-[#9AA0B2] line-clamp-1">{contact.jobTitle}</p>
                  <p className="text-xs text-[#FF6685] font-semibold flex items-center gap-1.5 mt-0.5">
                    <Building2 className="w-3 h-3 text-[#FF6685] shrink-0" />
                    <span className="truncate">{contact.companyName}</span>
                  </p>
                </div>

                {/* Connection Points Highlights */}
                {contact.connectionPoints && contact.connectionPoints.length > 0 && (
                  <div className="pt-2.5 border-t border-white/5 space-y-1">
                    <span className="text-[10px] text-[#9AA0B2] uppercase font-semibold block">Points de connexion</span>
                    {contact.connectionPoints.slice(0, 2).map((pt, i) => (
                      <div key={i} className="text-[11px] text-purple-200 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-[#C084FC] shrink-0" />
                        <span className="truncate">{pt}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer: Status or LinkedIn + View Action */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {contact.linkedInUrl && (
                    <span className="text-[#38bdf8]" title="Profil LinkedIn disponible">
                      <Linkedin className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {contact.opportunityTitle && (
                    <span className="text-[#34D399] flex items-center gap-1 text-[11px]" title={`Lié à : ${contact.opportunityTitle}`}>
                      <LinkIcon className="w-3 h-3" />
                      <span className="truncate max-w-[100px]">Offre liée</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setContactToDelete(contact);
                    }}
                    className="p-1 rounded-lg text-[#9AA0B2] hover:text-[#F04438] hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Supprimer ce contact"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <span className="font-bold text-[#FF6685] flex items-center gap-1 hover:text-[#F5F6FA] transition-colors cursor-pointer">
                    <span>Consulter</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ADD CONTACT MODAL                                                      */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Ajouter un contact au réseau"
        size="md"
      >
        <form onSubmit={handleAddContact} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">Nom complet *</label>
            <input
              type="text"
              required
              placeholder="ex: Sophie Martin"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#9AA0B2] font-semibold">Entreprise *</label>
              <input
                type="text"
                required
                placeholder="ex: LCL, Crédit Agricole..."
                value={formCompany}
                onChange={(e) => setFormCompany(e.target.value)}
                className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#9AA0B2] font-semibold">Poste *</label>
              <input
                type="text"
                required
                placeholder="ex: Conseillère Patrimoniale"
                value={formJob}
                onChange={(e) => setFormJob(e.target.value)}
                className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">Catégorie</label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as any)}
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] bg-[#060812]"
            >
              <option value="alumni" className="bg-[#060812] text-[#F5F6FA]">Alumni (Même formation / école)</option>
              <option value="recruiter" className="bg-[#060812] text-[#F5F6FA]">Recruteur / RH</option>
              <option value="sector_pro" className="bg-[#060812] text-[#F5F6FA]">Professionnel Secteur Cible</option>
              <option value="student" className="bg-[#060812] text-[#F5F6FA]">Étudiant</option>
              <option value="other_pro" className="bg-[#060812] text-[#F5F6FA]">Professionnel Autre Secteur</option>
              <option value="other" className="bg-[#060812] text-[#F5F6FA]">Autre</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#9AA0B2] font-semibold">Email (optionnel)</label>
              <input
                type="email"
                placeholder="ex: contact@entreprise.fr"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#9AA0B2] font-semibold">Téléphone (optionnel)</label>
              <input
                type="tel"
                placeholder="ex: 06 12 34 56 78"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">URL LinkedIn (optionnel)</label>
            <input
              type="url"
              placeholder="https://www.linkedin.com/in/..."
              value={formLinkedIn}
              onChange={(e) => setFormLinkedIn(e.target.value)}
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">Notes / Informations de contexte</label>
            <textarea
              placeholder="ex: Rencontrée lors d'un forum carrières, très bon contact pour échange sur le secteur..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full min-h-[75px] glass-input p-3 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
            <GlassButton type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Annuler
            </GlassButton>
            <GlassButton type="submit" variant="primary">
              Ajouter le contact
            </GlassButton>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* 6. IMPORT LINKEDIN MODAL (Preserved completely)                           */}
      {/* ========================================================================= */}
      <LinkedInImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        candidateProfile={profile}
        showToast={showToast}
      />

      {/* ========================================================================= */}
      {/* 7. DELETE CONFIRMATION MODAL                                              */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(contactToDelete)}
        onClose={() => setContactToDelete(null)}
        title="Supprimer le contact"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-200 leading-relaxed">
            Êtes-vous sûr de vouloir supprimer définitivement le contact <strong className="text-white font-bold">{contactToDelete?.fullName}</strong> ({contactToDelete?.companyName}) ?
            Cette action est irréversible.
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={() => setContactToDelete(null)}
            >
              Annuler
            </GlassButton>
            <GlassButton
              variant="danger"
              size="sm"
              onClick={() => {
                if (contactToDelete) {
                  handleDeleteContact(contactToDelete.id);
                  setContactToDelete(null);
                }
              }}
            >
              Confirmer la suppression
            </GlassButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};
