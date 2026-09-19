import React, { useState, useEffect } from "react";
import { dbStore } from "../dbStore";
import { Contact, ContactCategory, CandidateProfile } from "../types";
import { GlassCard, Badge, GlassButton, Modal } from "../components/Shared";
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
  MessageSquare,
  RefreshCw,
  Trash2,
  FileSpreadsheet
} from "lucide-react";

interface ContactsProps {
  showToast: (message: string, type: "success" | "error" | "info" | "ai") => void;
  searchTerm: string;
}

export const Contacts: React.FC<ContactsProps> = ({ showToast, searchTerm }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [profile, setProfile] = useState<CandidateProfile>(dbStore.getProfile());
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [activeMessage, setActiveMessage] = useState<string>("");
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  
  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // CSV Import State
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Add Contact Form State
  const [formName, setFormName] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formJob, setFormJob] = useState("");
  const [formCategory, setFormCategory] = useState<ContactCategory>("other");
  const [formNotes, setFormNotes] = useState("");

  useEffect(() => {
    setContacts(dbStore.getContacts());
    setProfile(dbStore.getProfile());

    const unsub = dbStore.subscribe(() => {
      setContacts(dbStore.getContacts());
      setProfile(dbStore.getProfile());
    });
    return unsub;
  }, []);

  const handleCategoryBadge = (category: ContactCategory) => {
    switch (category) {
      case "recruiter":
        return <Badge variant="green">Recruteur / RH</Badge>;
      case "alumni":
        return <Badge variant="blue">Alumni IUT</Badge>;
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

  // Filter contacts
  const filteredContacts = contacts.filter(c => {
    const s = searchTerm.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(s) ||
      c.companyName.toLowerCase().includes(s) ||
      c.jobTitle.toLowerCase().includes(s)
    );
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
      fullName: formName,
      firstName,
      lastName,
      companyId: linkedCo.id,
      companyName: linkedCo.name,
      jobTitle: formJob,
      normalizedJobTitle: formJob,
      category: formCategory,
      relevanceScore: formCategory === "alumni" ? 90 : formCategory === "recruiter" ? 85 : 50,
      connectionPoints: [
        formCategory === "alumni" ? "Réseau Alumni / Établissement d'études" : "Contact Professionnel"
      ],
      previousCompanies: [],
      notes: formNotes || "Ajouté manuellement"
    });

    showToast(`Contact "${formName}" ajouté avec succès`, "success");
    setFormName("");
    setFormCompany("");
    setFormJob("");
    setFormCategory("other");
    setFormNotes("");
    setIsAddModalOpen(false);
  };

  // Delete Contact
  const handleDeleteContact = (id: string) => {
    dbStore.deleteContact(id);
    showToast("Contact supprimé", "info");
    setSelectedContact(null);
  };

  // CSV Import drag/drop mock parse helper
  const handleParseCsv = () => {
    if (!csvText.trim()) {
      showToast("Veuillez coller du texte au format CSV", "error");
      return;
    }

    try {
      const lines = csvText.split("\n").filter(l => l.trim());
      if (lines.length < 2) {
        showToast("Format invalide. En-tête + données requis.", "error");
        return;
      }

      // First Name, Last Name, Job Title, Company
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const records: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        const record: any = {};
        headers.forEach((h, idx) => {
          record[h] = cells[idx] || "";
        });
        records.push(record);
      }

      setCsvPreview(records);
      showToast(`${records.length} fiches lues. Prêt pour l'analyse IA de NACORA !`, "info");
    } catch (e) {
      showToast("Erreur d'analyse CSV", "error");
    }
  };

  // Batch analysis with Gemini API
  const handleConfirmImport = async () => {
    if (csvPreview.length === 0) return;

    setIsAnalyzing(true);
    showToast("Analyse et classement automatique des contacts par Gemini...", "ai");

    try {
      const rawPayload = csvPreview.map(c => ({
        fullName: c.fullname || `${c.firstname || ''} ${c.lastname || ''}`.trim() || "Inconnu",
        jobTitle: c.poste || c.jobtitle || c.title || "Professionnel",
        companyName: c.entreprise || c.company || "À préciser"
      }));

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyzeLinkedIn",
          payload: {
            rawContacts: rawPayload,
            profile: profile
          }
        })
      });

      if (!response.ok) throw new Error("API analysis issue");
      const analyzed: any[] = await response.json();

      analyzed.forEach(item => {
        const linkedCo = dbStore.getCompanyByNameOrCreate(item.companyName || "À préciser");
        const parts = item.fullName.split(" ");
        dbStore.addContact({
          fullName: item.fullName,
          firstName: parts[0] || "",
          lastName: parts.slice(1).join(" ") || "",
          companyId: linkedCo.id,
          companyName: linkedCo.name,
          jobTitle: item.normalizedJobTitle || "Professionnel",
          normalizedJobTitle: item.normalizedJobTitle || "Professionnel",
          category: item.category || "other",
          relevanceScore: item.relevanceScore || 50,
          connectionPoints: item.connectionPoints || [],
          academicPath: item.academicPath || "",
          previousCompanies: item.previousCompanies || [],
          notes: "Importé via LinkedIn et classé par l'IA de NACORA."
        });
      });

      showToast(`Import réussi de ${analyzed.length} contacts classés par IA !`, "success");
      setCsvPreview([]);
      setCsvText("");
      setIsImportModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast("Échec de l'analyse IA. Import des fiches en mode standard.", "error");
      
      // Fallback import
      csvPreview.forEach(c => {
        const fullName = c.fullname || `${c.firstname || ''} ${c.lastname || ''}`.trim() || "Inconnu";
        const companyName = c.entreprise || c.company || "À préciser";
        const jobTitle = c.poste || c.jobtitle || "Professionnel";
        const linkedCo = dbStore.getCompanyByNameOrCreate(companyName);
        dbStore.addContact({
          fullName,
          firstName: c.firstname || "",
          lastName: c.lastname || "",
          companyId: linkedCo.id,
          companyName: linkedCo.name,
          jobTitle,
          normalizedJobTitle: jobTitle,
          category: "other",
          relevanceScore: 50,
          connectionPoints: ["Importé via CSV"],
          previousCompanies: [],
          notes: "Importé via CSV"
        });
      });
      setIsImportModalOpen(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate customized message with Gemini AI
  const handleGenerateOutreach = async (contact: Contact) => {
    setIsGeneratingMessage(true);
    showToast(`Rédaction du message d'approche personnalisé par l'IA...`, "ai");

    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "outreachMessage",
          payload: {
            contactName: contact.fullName,
            contactJob: contact.jobTitle,
            contactCompany: contact.companyName,
            connectionPoints: contact.connectionPoints,
            profile: profile
          }
        })
      });

      if (!response.ok) throw new Error("API message failed");
      const data = await response.json();

      setActiveMessage(data.message);
      showToast("Message personnalisé rédigé !", "success");
    } catch (err) {
      console.error(err);
      showToast("Erreur de rédaction IA", "error");
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  return (
    <div className="relative z-10 w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#F5F6FA] tracking-tight font-display whitespace-nowrap">Réseau & Contacts</h1>
          <p className="text-[#9AA0B2] text-xs sm:text-sm mt-0.5">Gère tes relations professionnelles, identifie les Alumni et génère des messages de prospection</p>
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

      {/* Grid view of contacts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContacts.map(contact => (
          <GlassCard
            key={contact.id}
            onClick={() => {
              setSelectedContact(contact);
              setActiveMessage("");
            }}
            className="p-5 flex flex-col justify-between"
            hoverable
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                {handleCategoryBadge(contact.category)}
                <span className="text-xs font-bold text-[#9AA0B2] bg-black/40 px-2.5 py-1 rounded-full border border-white/5">
                  Score : {contact.relevanceScore}%
                </span>
              </div>
              
              <h3 className="text-sm font-bold text-[#F5F6FA] mb-1 leading-normal font-display">{contact.fullName}</h3>
              <p className="text-xs text-[#9AA0B2] line-clamp-1">{contact.jobTitle}</p>
              <p className="text-xs text-[#FF6685] font-semibold mt-0.5">{contact.companyName}</p>

              {/* Display connection highlights */}
              {contact.connectionPoints.length > 0 && (
                <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5">
                  <span className="text-[10px] text-[#9AA0B2] uppercase font-semibold">Points de connexion :</span>
                  {contact.connectionPoints.slice(0, 2).map((pt, i) => (
                    <div key={i} className="text-[11px] text-purple-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                      <span className="truncate">{pt}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
              <span className="text-xs font-bold text-[#FF6685] flex items-center gap-1 hover:text-[#F5F6FA] transition-spring cursor-pointer">
                <span>Consulter la fiche</span>
                <ChevronRight className="w-4 h-4" />
              </span>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* --- ADD CONTACT MODAL --- */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Ajouter un contact"
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
              className="glass-input px-3.5 py-2.5 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#9AA0B2] font-semibold">Entreprise *</label>
              <input
                type="text"
                required
                placeholder="ex: LCL"
                value={formCompany}
                onChange={(e) => setFormCompany(e.target.value)}
                className="glass-input px-3.5 py-2.5 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#9AA0B2] font-semibold">Poste *</label>
              <input
                type="text"
                required
                placeholder="ex: Conseiller Patrimonial"
                value={formJob}
                onChange={(e) => setFormJob(e.target.value)}
                className="glass-input px-3.5 py-2.5 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">Catégorie</label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as any)}
              className="glass-input px-3.5 py-2.5 text-xs text-[#F5F6FA] bg-[#060812]"
            >
              <option value="recruiter" className="bg-[#060812] text-[#F5F6FA]">Recruteur / RH</option>
              <option value="alumni" className="bg-[#060812] text-[#F5F6FA]">Alumni (Même école)</option>
              <option value="student" className="bg-[#060812] text-[#F5F6FA]">Étudiant</option>
              <option value="sector_pro" className="bg-[#060812] text-[#F5F6FA]">Professionnel Secteur Ciblé</option>
              <option value="other_pro" className="bg-[#060812] text-[#F5F6FA]">Professionnel Hors Secteur</option>
              <option value="other" className="bg-[#060812] text-[#F5F6FA]">Autre</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">Notes / Informations</label>
            <textarea
              placeholder="ex: Rencontrée au forum carrières, m'a proposé d'envoyer mon CV."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full min-h-[80px] glass-input p-3 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <GlassButton type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Annuler
            </GlassButton>
            <GlassButton type="submit" variant="primary">
              Ajouter le contact
            </GlassButton>
          </div>
        </form>
      </Modal>

      {/* --- IMPORT LINKEDIN MODAL --- */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setCsvText("");
          setCsvPreview([]);
        }}
        title="Importer vos connexions LinkedIn (CSV)"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#9AA0B2] leading-relaxed">
            Pour exporter vos connexions depuis LinkedIn : Réseau &gt; Gérer mon réseau &gt; Contacts &gt; Exporter les contacts.
            Collez le contenu du fichier CSV extrait ci-dessous pour le catégoriser avec l'IA.
          </p>

          <div className="bg-white/[0.03] p-3.5 rounded-2xl border border-white/10 text-[11px] text-[#F79009] leading-relaxed">
            <strong>Format standard de l'export LinkedIn :</strong><br />
            <code>firstname, lastname, jobtitle, company</code><br />
            <span className="text-[#9AA0B2]">Exemple : Clara, Dubois, Product Manager, Luko</span>
          </div>

          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="firstname, lastname, jobtitle, company&#10;Sophie, Martin, Conseillère Patrimoniale, LCL"
            className="w-full min-h-[150px] glass-input p-3.5 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60 font-mono"
          />

          <div className="flex justify-between items-center">
            <span className="text-xs text-[#9AA0B2]">
              {csvPreview.length > 0 ? `${csvPreview.length} contacts détectés` : "Aucune ligne lue"}
            </span>
            <div className="flex gap-2">
              <GlassButton type="button" size="sm" variant="secondary" onClick={handleParseCsv}>
                Analyser le CSV
              </GlassButton>
              {csvPreview.length > 0 && (
                <GlassButton 
                  type="button" 
                  size="sm" 
                  variant="ai" 
                  disabled={isAnalyzing}
                  onClick={handleConfirmImport}
                >
                  {isAnalyzing ? "Analyse IA..." : `Classer par IA & Importer (${csvPreview.length})`}
                </GlassButton>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* --- CONTACT WORKSPACE / DETAIL MODAL --- */}
      {selectedContact && (
        <Modal
          isOpen={!!selectedContact}
          onClose={() => setSelectedContact(null)}
          title={selectedContact.fullName}
          size="lg"
        >
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                {handleCategoryBadge(selectedContact.category)}
                <Badge variant="gray">Score : {selectedContact.relevanceScore}%</Badge>
              </div>
              <GlassButton 
                size="sm" 
                variant="ghost" 
                onClick={() => handleDeleteContact(selectedContact.id)}
                icon={<Trash2 className="w-3.5 h-3.5 text-[#F04438]" />}
              >
                <span className="text-[#F04438]">Supprimer le contact</span>
              </GlassButton>
            </div>

            {/* General Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <h4 className="text-xs text-[#9AA0B2] uppercase font-semibold">Poste Actuel</h4>
                <p className="text-sm font-bold text-[#F5F6FA] font-display">{selectedContact.jobTitle}</p>
                <p className="text-xs text-[#FF6685] font-semibold">{selectedContact.companyName}</p>
              </div>
              <div className="space-y-1">
                <h4 className="text-xs text-[#9AA0B2] uppercase font-semibold">Parcours Académique</h4>
                <p className="text-xs text-[#9AA0B2]">
                  {selectedContact.academicPath || "Non renseigné"}
                </p>
              </div>
            </div>

            {/* AI message custom composer */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#F5F6FA] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Message d'approche personnalisé par IA
                </h4>
                <GlassButton
                  variant="ai"
                  size="sm"
                  disabled={isGeneratingMessage}
                  onClick={() => handleGenerateOutreach(selectedContact)}
                >
                  {isGeneratingMessage ? "Rédaction..." : "Générer avec Gemini"}
                </GlassButton>
              </div>
              
              {activeMessage ? (
                <div className="space-y-3">
                  <textarea
                    value={activeMessage}
                    onChange={(e) => setActiveMessage(e.target.value)}
                    className="w-full min-h-[120px] glass-input p-3.5 text-xs text-[#F5F6FA] leading-relaxed focus:border-purple-400/50"
                  />
                  <div className="flex justify-between items-center text-[10px] text-[#9AA0B2]">
                    <span>Message optimisé pour l'invitation de connexion LinkedIn ({activeMessage.length} caractères)</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(activeMessage);
                        showToast("Message copié dans le presse-papiers !", "success");
                      }}
                      className="text-xs text-purple-300 hover:underline cursor-pointer font-semibold"
                    >
                      Copier le texte
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#9AA0B2] italic">
                  Clique sur "Générer avec Gemini" pour composer une invitation personnalisée tirant parti de vos points communs (Alumni, secteur finance, etc.).
                </p>
              )}
            </div>

            {/* Note manager */}
            <div className="space-y-2">
              <h4 className="text-xs text-[#9AA0B2] uppercase font-semibold">Notes de suivi</h4>
              <textarea
                value={selectedContact.notes}
                onChange={(e) => {
                  const updated = { ...selectedContact, notes: e.target.value };
                  setSelectedContact(updated);
                  dbStore.updateContact(updated);
                }}
                className="w-full min-h-[80px] glass-input p-3 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
                placeholder="Ajoute tes notes (ex: Date d'envoi du message, rendez-vous fixé...)"
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-white/10">
              <GlassButton variant="secondary" onClick={() => setSelectedContact(null)}>
                Fermer la fiche
              </GlassButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
