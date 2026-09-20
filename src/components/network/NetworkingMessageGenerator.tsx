import React, { useState, useEffect } from "react";
import { 
  Contact, 
  CandidateProfile, 
  NetworkingTone, 
  NetworkingTemplateId, 
  NetworkingFollowUpId, 
  NetworkingChannel, 
  NetworkingGoal, 
  NetworkingOutreachStrategy,
  OutreachMessageLogItem 
} from "../../types";
import { dbStore } from "../../dbStore";
import { 
  recommendNetworkingStrategy, 
  generateOutreachMessageWithFramework, 
  generateFollowUpMessageWithFramework,
  calculateFollowUpDate
} from "../../api/networkingFramework";
import { GlassButton } from "../Shared";
import { 
  Sparkles, 
  Send, 
  Copy, 
  Check, 
  Calendar, 
  Clock, 
  ArrowRight, 
  Layers, 
  UserCheck, 
  ShieldAlert, 
  CheckCircle2, 
  HelpCircle, 
  RefreshCw, 
  Mail, 
  Linkedin, 
  Award, 
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Compass
} from "lucide-react";

interface NetworkingMessageGeneratorProps {
  contact: Contact;
  profile: CandidateProfile;
  onUpdate: (updatedContact: Contact) => void;
  showToast: (message: string, type: "success" | "error" | "info" | "ai") => void;
}

export const NetworkingMessageGenerator: React.FC<NetworkingMessageGeneratorProps> = ({
  contact,
  profile,
  onUpdate,
  showToast
}) => {
  // Strategy State
  const [strategy, setStrategy] = useState<NetworkingOutreachStrategy>(() => 
    recommendNetworkingStrategy(contact, profile, "stage", "linkedin")
  );

  // Active generation settings
  const [selectedGoal, setSelectedGoal] = useState<NetworkingGoal>(
    (contact.outreachGoal as NetworkingGoal) || "stage"
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<NetworkingTemplateId>(
    (contact.outreachTemplateId as NetworkingTemplateId) || strategy.recommendedTemplateId
  );
  const [selectedTone, setSelectedTone] = useState<NetworkingTone>(
    contact.outreachTone || strategy.recommendedTone
  );
  const [selectedChannel, setSelectedChannel] = useState<NetworkingChannel>(
    contact.outreachChannel || strategy.recommendedChannel
  );

  // View mode: initial outreach vs follow-up stage
  const [mode, setMode] = useState<"initial" | "followup_1" | "followup_2" | "followup_3">("initial");

  // Advanced template options
  const [customNews, setCustomNews] = useState("");
  const [intermediaryPerson, setIntermediaryPerson] = useState("");
  
  // Message text and generation state
  const [messageText, setMessageText] = useState(contact.aiCustomMessage || "");
  const [subjectOption, setSubjectOption] = useState<"standard" | "personalized">("standard");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [hasCopiedSubject, setHasCopiedSubject] = useState(false);
  const [missingQuestions, setMissingQuestions] = useState<string[]>([]);

  // Recalculate strategy when contact or profile changes
  useEffect(() => {
    const updatedStrategy = recommendNetworkingStrategy(contact, profile, selectedGoal, selectedChannel);
    setStrategy(updatedStrategy);
  }, [contact.id, selectedGoal, selectedChannel]);

  // Generate initial message
  const handleGenerateInitial = async () => {
    setIsGenerating(true);
    try {
      const result = await generateOutreachMessageWithFramework(contact, profile, {
        templateId: selectedTemplateId,
        tone: selectedTone,
        channel: selectedChannel,
        goal: selectedGoal,
        customNewsOrDeal: customNews.trim() || undefined,
        intermediaryPerson: intermediaryPerson.trim() || undefined,
        targetOpportunityTitle: contact.opportunityTitle
      });

      setMessageText(result.message);
      setMissingQuestions(result.missingDataQuestions || []);

      const updated: Contact = {
        ...contact,
        aiCustomMessage: result.message,
        outreachTone: selectedTone,
        outreachChannel: selectedChannel,
        outreachTemplateId: selectedTemplateId,
        outreachGoal: selectedGoal
      };
      dbStore.updateContact(updated);
      onUpdate(updated);

      showToast("Message généré selon le Framework NACORA", "success");
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de la génération", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate follow-up message
  const handleGenerateFollowUp = (stageNumber: 1 | 2 | 3) => {
    setIsGenerating(true);
    try {
      const result = generateFollowUpMessageWithFramework(contact, profile, stageNumber, {
        tone: selectedTone,
        channel: selectedChannel
      });

      setMessageText(result.message);
      setMissingQuestions([]);

      showToast(`Relance ${stageNumber} générée selon la méthode NACORA`, "success");
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de la génération de la relance", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // Switch between initial outreach and follow-up tabs
  const handleTabChange = (newMode: "initial" | "followup_1" | "followup_2" | "followup_3") => {
    setMode(newMode);
    if (newMode === "initial") {
      handleGenerateInitial();
    } else if (newMode === "followup_1") {
      handleGenerateFollowUp(1);
    } else if (newMode === "followup_2") {
      handleGenerateFollowUp(2);
    } else if (newMode === "followup_3") {
      handleGenerateFollowUp(3);
    }
  };

  // Copy message to clipboard
  const handleCopyMessage = () => {
    if (!messageText) return;
    navigator.clipboard.writeText(messageText);
    setHasCopied(true);
    showToast("Message copié dans le presse-papiers !", "success");
    setTimeout(() => setHasCopied(false), 2500);
  };

  // Copy subject to clipboard
  const handleCopySubject = () => {
    const subject = subjectOption === "standard" 
      ? strategy.suggestedSubjectLine.standard 
      : strategy.suggestedSubjectLine.personalized;
    navigator.clipboard.writeText(subject);
    setHasCopiedSubject(true);
    showToast("Objet copié !", "success");
    setTimeout(() => setHasCopiedSubject(false), 2500);
  };

  // Mark message as sent and schedule follow-up
  const handleMarkAsSent = () => {
    const today = new Date().toISOString().split("T")[0];
    const currentStage = mode === "initial" ? 1 : mode === "followup_1" ? 2 : mode === "followup_2" ? 3 : 4;
    const nextFollowUp = calculateFollowUpDate(new Date(), currentStage);

    const logEntry: OutreachMessageLogItem = {
      id: "log_" + Math.random().toString(36).substring(2, 9),
      stage: currentStage - 1,
      templateId: selectedTemplateId,
      channel: selectedChannel,
      tone: selectedTone,
      subject: selectedChannel.includes("email") 
        ? (subjectOption === "standard" ? strategy.suggestedSubjectLine.standard : strategy.suggestedSubjectLine.personalized)
        : undefined,
      message: messageText,
      sentDate: today,
      status: "sent"
    };

    const historyEvent = {
      id: "hist_" + Math.random().toString(36).substring(2, 9),
      type: "outreach_sent" as const,
      label: `${mode === "initial" ? "Message d'approche initial envoyé" : `Relance ${currentStage - 1} envoyée`} (${selectedChannel}) • Prochaine relance le ${nextFollowUp}`,
      timestamp: new Date().toISOString()
    };

    const updated: Contact = {
      ...contact,
      networkingStatus: "contacted",
      initialMessageSentDate: contact.initialMessageSentDate || today,
      lastOutreachDate: today,
      nextFollowUpDate: nextFollowUp,
      followUpStage: currentStage,
      outreachTone: selectedTone,
      outreachChannel: selectedChannel,
      outreachTemplateId: selectedTemplateId,
      outreachGoal: selectedGoal,
      outreachMessagesLog: [logEntry, ...(contact.outreachMessagesLog || [])],
      history: [historyEvent, ...(contact.history || [])]
    };

    dbStore.updateContact(updated);
    onUpdate(updated);

    showToast(`Envoi consigné ! Prochaine relance programmée au ${nextFollowUp}`, "success");
  };

  const wordCount = messageText.trim() ? messageText.trim().split(/\s+/).length : 0;
  const charCount = messageText.length;
  const isLinkedinInviteCompliant = charCount <= 300;
  const isWordCountCompliant = wordCount <= 150;

  return (
    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-5">
      
      {/* 1. Header & Methodology Tag */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FF6685]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F6FA] font-display">
              Framework Réseau NACORA (LinkedIn & Email)
            </h3>
          </div>
          <p className="text-[11px] text-[#9AA0B2] mt-0.5">
            Méthodologie de référence intégrée : Analyse profil, stratégie, choix de template et relances J+7.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-white/[0.04] border border-white/10 text-[#F5F6FA] flex items-center gap-1.5">
            <UserCheck className="w-3 h-3 text-[#34D399]" />
            {strategy.seniorityLevel === "junior_accessible" ? "Profil Accessible (Tu)" : strategy.seniorityLevel === "senior_decision_maker" ? "Profil Décideur (Vous)" : "Profil Confirmé (Vous)"}
          </span>
        </div>
      </div>

      {/* 2. Strategic Insights Box */}
      <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B2] flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#FF6685]" />
            Analyse Stratégique NACORA
          </span>
          <span className="text-[10px] text-[#9AA0B2]">
            Règle anti-invention activée
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
          <div className="p-2.5 rounded-lg bg-black/20 border border-white/5 space-y-1">
            <span className="text-[10px] text-[#9AA0B2] uppercase font-semibold block">Niveau & Tonalité :</span>
            <p className="text-[#F5F6FA] font-medium text-[11px] leading-relaxed">
              {strategy.toneReason}
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-black/20 border border-white/5 space-y-1">
            <span className="text-[10px] text-[#9AA0B2] uppercase font-semibold block">Points communs factuels :</span>
            {strategy.commonPointsFound.length > 0 ? (
              <p className="text-[#34D399] font-medium text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#34D399] shrink-0" />
                {strategy.commonPointsFound[0]}
              </p>
            ) : (
              <p className="text-[#9AA0B2] italic text-[11px]">
                Aucun point commun factuel identifié. Utilisation des templates directs.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs: Initial vs Relances (J+7, J+14, J+21) */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/30 border border-white/5 text-xs overflow-x-auto">
        <button
          onClick={() => handleTabChange("initial")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-center font-semibold text-[11px] transition-all whitespace-nowrap cursor-pointer ${
            mode === "initial" 
              ? "bg-[#D81A45] text-white shadow-sm" 
              : "text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/5"
          }`}
        >
          Message Initial
        </button>

        <button
          onClick={() => handleTabChange("followup_1")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-center font-semibold text-[11px] transition-all whitespace-nowrap cursor-pointer ${
            mode === "followup_1" 
              ? "bg-[#D81A45] text-white shadow-sm" 
              : "text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/5"
          }`}
        >
          Relance 1 (J+7)
        </button>

        <button
          onClick={() => handleTabChange("followup_2")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-center font-semibold text-[11px] transition-all whitespace-nowrap cursor-pointer ${
            mode === "followup_2" 
              ? "bg-[#D81A45] text-white shadow-sm" 
              : "text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/5"
          }`}
        >
          Relance 2 (J+14)
        </button>

        <button
          onClick={() => handleTabChange("followup_3")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-center font-semibold text-[11px] transition-all whitespace-nowrap cursor-pointer ${
            mode === "followup_3" 
              ? "bg-[#D81A45] text-white shadow-sm" 
              : "text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/5"
          }`}
        >
          Relance 3 (J+21)
        </button>
      </div>

      {/* 4. Controls depending on mode */}
      {mode === "initial" ? (
        <div className="space-y-4">
          
          {/* Objectif & Canal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-[10px] text-[#9AA0B2] uppercase font-semibold block mb-1">
                Objectif de prise de contact
              </label>
              <select
                value={selectedGoal}
                onChange={(e) => setSelectedGoal(e.target.value as NetworkingGoal)}
                className="w-full glass-input px-3 py-1.5 text-xs text-[#F5F6FA] bg-[#060812]"
              >
                <option value="stage" className="bg-[#060812]">Stage</option>
                <option value="alternance" className="bg-[#060812]">Alternance</option>
                <option value="emploi" className="bg-[#060812]">Premier Emploi / CDI</option>
                <option value="networking_echange" className="bg-[#060812]">Échange Réseau 10 min</option>
                <option value="recrutement_equipe" className="bg-[#060812]">Savoir si l'équipe recrute</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-[#9AA0B2] uppercase font-semibold block mb-1">
                Canal privilégié
              </label>
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value as NetworkingChannel)}
                className="w-full glass-input px-3 py-1.5 text-xs text-[#F5F6FA] bg-[#060812]"
              >
                <option value="linkedin" className="bg-[#060812]">LinkedIn (Note / InMail)</option>
                <option value="email" className="bg-[#060812]">Email direct</option>
                <option value="linkedin_email" className="bg-[#060812]">Hybride (LinkedIn + Email)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-[#9AA0B2] uppercase font-semibold block mb-1">
                Tonalité
              </label>
              <select
                value={selectedTone}
                onChange={(e) => setSelectedTone(e.target.value as NetworkingTone)}
                className="w-full glass-input px-3 py-1.5 text-xs text-[#F5F6FA] bg-[#060812]"
              >
                <option value="tutoiement" className="bg-[#060812]">Tutoiement ("Tu") - Recommandé Junior</option>
                <option value="vouvoiement" className="bg-[#060812]">Vouvoiement ("Vous") - Recommandé Senior</option>
              </select>
            </div>
          </div>

          {/* 4 Reference Templates Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-[#9AA0B2] uppercase font-semibold block">
              Choix du Template de Référence NACORA :
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              
              {/* Template 1 */}
              <button
                type="button"
                onClick={() => {
                  setSelectedTemplateId("point_commun");
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedTemplateId === "point_commun"
                    ? "bg-[#D81A45]/15 border-[#D81A45] text-[#F5F6FA] shadow-[0_0_12px_rgba(216,26,69,0.2)]"
                    : "bg-white/[0.02] border-white/5 text-[#9AA0B2] hover:bg-white/5 hover:text-[#F5F6FA]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[11px] text-[#F5F6FA]">Template 1 : Point Commun</span>
                  {strategy.recommendedTemplateId === "point_commun" && (
                    <span className="text-[9px] font-bold text-[#FF6685] bg-[#D81A45]/20 px-1.5 py-0.5 rounded">★ Recommandé</span>
                  )}
                </div>
                <p className="text-[10px] line-clamp-2 text-[#9AA0B2]">
                  Idéal pour stagiaires, jeunes employés ou point commun identifié (école, ville, entreprise).
                </p>
              </button>

              {/* Template 2 */}
              <button
                type="button"
                onClick={() => {
                  setSelectedTemplateId("opportunite");
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedTemplateId === "opportunite"
                    ? "bg-[#D81A45]/15 border-[#D81A45] text-[#F5F6FA] shadow-[0_0_12px_rgba(216,26,69,0.2)]"
                    : "bg-white/[0.02] border-white/5 text-[#9AA0B2] hover:bg-white/5 hover:text-[#F5F6FA]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[11px] text-[#F5F6FA]">Template 2 : Opportunité Directe</span>
                  {strategy.recommendedTemplateId === "opportunite" && (
                    <span className="text-[9px] font-bold text-[#FF6685] bg-[#D81A45]/20 px-1.5 py-0.5 rounded">★ Recommandé</span>
                  )}
                </div>
                <p className="text-[10px] line-clamp-2 text-[#9AA0B2]">
                  Objectif direct pour savoir rapidement si l'équipe recrute pour une date donnée.
                </p>
              </button>

              {/* Template 3 */}
              <button
                type="button"
                onClick={() => {
                  setSelectedTemplateId("alumni_recommandation");
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedTemplateId === "alumni_recommandation"
                    ? "bg-[#D81A45]/15 border-[#D81A45] text-[#F5F6FA] shadow-[0_0_12px_rgba(216,26,69,0.2)]"
                    : "bg-white/[0.02] border-white/5 text-[#9AA0B2] hover:bg-white/5 hover:text-[#F5F6FA]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[11px] text-[#F5F6FA]">Template 3 : Recommandation</span>
                  {strategy.recommendedTemplateId === "alumni_recommandation" && (
                    <span className="text-[9px] font-bold text-[#FF6685] bg-[#D81A45]/20 px-1.5 py-0.5 rounded">★ Recommandé</span>
                  )}
                </div>
                <p className="text-[10px] line-clamp-2 text-[#9AA0B2]">
                  Approcher un manager après avoir échangé avec un membre de son équipe ou un Alumni.
                </p>
              </button>

              {/* Template 4 */}
              <button
                type="button"
                onClick={() => {
                  setSelectedTemplateId("tres_personnalise");
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedTemplateId === "tres_personnalise"
                    ? "bg-[#D81A45]/15 border-[#D81A45] text-[#F5F6FA] shadow-[0_0_12px_rgba(216,26,69,0.2)]"
                    : "bg-white/[0.02] border-white/5 text-[#9AA0B2] hover:bg-white/5 hover:text-[#F5F6FA]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[11px] text-[#F5F6FA]">Template 4 : Très Personnalisé</span>
                  {strategy.recommendedTemplateId === "tres_personnalise" && (
                    <span className="text-[9px] font-bold text-[#FF6685] bg-[#D81A45]/20 px-1.5 py-0.5 rounded">★ Recommandé</span>
                  )}
                </div>
                <p className="text-[10px] line-clamp-2 text-[#9AA0B2]">
                  Pour profils seniors/décideurs : ancré sur une transaction/actualité réelle et 3 compétences.
                </p>
              </button>
            </div>
          </div>

          {/* Contextual fields for templates 3 & 4 */}
          {selectedTemplateId === "alumni_recommandation" && (
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
              <label className="text-[10px] text-[#9AA0B2] uppercase font-semibold block">
                Collaborateur ou Alumni avec qui vous avez échangé :
              </label>
              <input
                type="text"
                value={intermediaryPerson}
                onChange={(e) => setIntermediaryPerson(e.target.value)}
                placeholder="Ex: Maxime Dupont, Analyste M&A dans votre équipe"
                className="w-full glass-input px-3 py-1.5 text-xs text-[#F5F6FA]"
              />
            </div>
          )}

          {selectedTemplateId === "tres_personnalise" && (
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
              <label className="text-[10px] text-[#9AA0B2] uppercase font-semibold block">
                Actualité, projet, deal ou transaction précise chez {contact.companyName} :
              </label>
              <input
                type="text"
                value={customNews}
                onChange={(e) => setCustomNews(e.target.value)}
                placeholder="Ex: le récent tour de table de 25M€ ou la structuration du fonds X"
                className="w-full glass-input px-3 py-1.5 text-xs text-[#F5F6FA]"
              />
            </div>
          )}

          {/* Email Subject Selector */}
          {selectedChannel.includes("email") && (
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#9AA0B2] uppercase font-semibold">
                  Objet de l'Email (Format Méthodologie) :
                </span>
                <button
                  onClick={handleCopySubject}
                  className="text-[10px] text-[#FF6685] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {hasCopiedSubject ? <Check className="w-3 h-3 text-[#34D399]" /> : <Copy className="w-3 h-3" />}
                  <span>{hasCopiedSubject ? "Objet copié" : "Copier l'objet"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => setSubjectOption("standard")}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    subjectOption === "standard"
                      ? "bg-white/10 border-white/20 text-[#F5F6FA]"
                      : "bg-white/[0.02] border-white/5 text-[#9AA0B2]"
                  }`}
                >
                  <span className="text-[10px] text-[#9AA0B2] block">Option 1 (Direct) :</span>
                  <span className="font-semibold">{strategy.suggestedSubjectLine.standard}</span>
                </button>

                <button
                  onClick={() => setSubjectOption("personalized")}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    subjectOption === "personalized"
                      ? "bg-white/10 border-white/20 text-[#F5F6FA]"
                      : "bg-white/[0.02] border-white/5 text-[#9AA0B2]"
                  }`}
                >
                  <span className="text-[10px] text-[#9AA0B2] block">Option 2 (Poste) :</span>
                  <span className="font-semibold">{strategy.suggestedSubjectLine.personalized}</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <GlassButton
              variant="ai"
              size="sm"
              disabled={isGenerating}
              onClick={handleGenerateInitial}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
              <span>{isGenerating ? "Génération..." : "Régénérer selon le Template"}</span>
            </GlassButton>
          </div>
        </div>
      ) : (
        /* Follow-up Stage Controls */
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[11px] text-[#F5F6FA] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#FF6685]" />
              {mode === "followup_1" ? "Relance 1 (Simple à J+7)" : mode === "followup_2" ? "Relance 2 (Apport de valeur à J+14)" : "Relance 3 (Exemples & Réalisations à J+21)"}
            </span>
            <span className="text-[10px] text-[#34D399] bg-[#34D399]/10 px-2 py-0.5 rounded border border-[#34D399]/20 font-semibold">
              Envoi idéal : Mardi à Jeudi
            </span>
          </div>

          <p className="text-[#9AA0B2] text-[11px] leading-relaxed">
            {mode === "followup_1" && "Relance de courtoisie courte pour vérifier si la personne a pu prendre connaissance du premier message."}
            {mode === "followup_2" && "Relance valorisant deux compétences réelles issues de votre profil pour apporter de l'aide concrète à l'équipe."}
            {mode === "followup_3" && "Relance finale partageant deux réalisations réelles de votre parcours avant de clore la démarche."}
          </p>
        </div>
      )}

      {/* 5. Missing Data Warnings (Anti-hallucination protection) */}
      {missingQuestions.length > 0 && (
        <div className="p-3.5 rounded-xl bg-[rgba(247,144,9,0.1)] border border-[rgba(247,144,9,0.25)] space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-[#FBBF24] font-bold text-[11px]">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Précision recommandée pour une personnalisation parfaite :</span>
          </div>
          {missingQuestions.map((q, qIdx) => (
            <p key={qIdx} className="text-[#F5F6FA] text-[11px] pl-5">
              • {q}
            </p>
          ))}
        </div>
      )}

      {/* 6. Message Box & Live Editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="text-[10px] text-[#9AA0B2] uppercase font-semibold">
            Corps du message (Éditable) :
          </label>
          <div className="flex items-center gap-2 text-[11px]">
            <span className={isWordCountCompliant ? "text-[#34D399]" : "text-[#FBBF24]"}>
              {wordCount} mots {isWordCountCompliant ? "(<150 mots OK)" : "(>150 mots - recommandation NACORA : faire plus court)"}
            </span>
            <span className="text-white/20">•</span>
            <span className={isLinkedinInviteCompliant ? "text-[#9AA0B2]" : "text-[#F04438] font-bold"}>
              {charCount} car. {charCount <= 300 ? "(Note LinkedIn OK)" : "(>300 car. - réserver pour InMail/Email)"}
            </span>
          </div>
        </div>

        <textarea
          value={messageText}
          onChange={(e) => {
            setMessageText(e.target.value);
            const updated: Contact = { ...contact, aiCustomMessage: e.target.value };
            dbStore.updateContact(updated);
            onUpdate(updated);
          }}
          className="w-full min-h-[160px] glass-input p-3.5 text-xs text-[#F5F6FA] leading-relaxed resize-y font-sans"
          placeholder="Le message généré par le framework apparaîtra ici..."
        />
      </div>

      {/* 7. Action Buttons & Follow-Up Planner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        
        {/* Copy button */}
        <button
          onClick={handleCopyMessage}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/10 text-[#F5F6FA] border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
        >
          {hasCopied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#34D399]" />
              <span className="text-[#34D399]">Message copié !</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copier le message</span>
            </>
          )}
        </button>

        {/* Mark as sent + schedule follow-up */}
        <button
          onClick={handleMarkAsSent}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#D81A45] hover:bg-[#b01437] text-white text-xs font-semibold shadow-[0_4px_16px_rgba(216,26,69,0.3)] transition-all cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Marquer envoyé & Planifier Relance (+7j)</span>
        </button>
      </div>

      {/* 8. Follow-up Timeline Summary if already contacted */}
      {contact.lastOutreachDate && (
        <div className="p-3.5 rounded-xl bg-black/20 border border-white/5 space-y-2 text-xs">
          <span className="text-[10px] text-[#9AA0B2] uppercase font-semibold block">
            Suivi des relances NACORA :
          </span>
          <div className="flex items-center justify-between flex-wrap gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-[#F5F6FA]">
              <Clock className="w-3.5 h-3.5 text-[#34D399]" />
              <span>Dernier contact : {new Date(contact.lastOutreachDate).toLocaleDateString("fr-FR")}</span>
            </div>
            {contact.nextFollowUpDate && (
              <div className="flex items-center gap-1.5 text-[#FBBF24]">
                <Calendar className="w-3.5 h-3.5 text-[#FBBF24]" />
                <span>Prochaine relance recommandée : {new Date(contact.nextFollowUpDate).toLocaleDateString("fr-FR")}</span>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
