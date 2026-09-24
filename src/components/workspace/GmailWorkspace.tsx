import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { 
  listGmailMessages, 
  getGmailMessageDetails, 
  sendGmailEmail, 
  GmailMessageSummary, 
  GmailFullMessage 
} from "../../services/gmailService";
import { GlassCard, GlassButton, Badge, Modal } from "../Shared";
import { 
  Mail, 
  Send, 
  RefreshCw, 
  Search, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Loader2, 
  ArrowLeft,
  Calendar,
  User,
  Clock,
  ExternalLink
} from "lucide-react";

export const GmailWorkspace: React.FC = () => {
  const { accessToken, connectGoogleWorkspace } = useAuth();
  const { language } = useLanguage();

  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Message details state
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<GmailFullMessage | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Compose modal state
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" | "ai" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "ai" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadMessages = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listGmailMessages(accessToken, {
        maxResults: 20,
        q: searchQuery ? searchQuery : undefined,
      });
      setMessages(data);
    } catch (e: any) {
      console.error("Error loading Gmail messages:", e);
      setError(e.message || "Erreur lors du chargement des emails.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      loadMessages();
    }
  }, [accessToken]);

  const handleOpenMessage = async (msgId: string) => {
    if (!accessToken) return;
    setSelectedMessageId(msgId);
    setLoadingDetails(true);
    try {
      const details = await getGmailMessageDetails(accessToken, msgId);
      setSelectedMessage(details);
    } catch (e: any) {
      showToast(`Erreur lecture email: ${e.message}`, "error");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleApplyTemplate = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    if (templateKey === "spontanee") {
      setSubject("Candidature Spontanée - [Votre Métier]");
      setBody(
        `Bonjour,\n\nVivement intéressé(e) par les activités et projets de votre entreprise, je me permets de vous adresser ma candidature pour rejoindre vos équipes.\n\nFort(e) de mon expertise en gestion de projets et développement stratégique, je serais ravi(e) d'échanger avec vous sur les opportunités de collaboration.\n\nVous trouverez mon profil et parcours détaillé ci-joint.\n\nBien cordialement,\n[Votre Nom]`
      );
    } else if (templateKey === "relance") {
      setSubject("Suivi de candidature - [Poste / Référence]");
      setBody(
        `Bonjour,\n\nJe me permets de revenir vers vous concernant ma candidature transmise récemment pour le poste de [Intitulé du poste].\n\nToujours très motivé(e) à l'idée de contribuer à vos projets, je reste à votre entière disposition pour tout échange ou entretien approfondi.\n\nExcellente journée,\n[Votre Nom]`
      );
    } else if (templateKey === "entretien_remerciement") {
      setSubject("Remerciements suite à notre entretien - [Poste]");
      setBody(
        `Bonjour,\n\nJe tiens à vous remercier chaleureusement pour le temps accordé lors de notre échange d'aujourd'hui au sujet du poste de [Poste].\n\nNotre discussion a confirmé mon vif enthousiasme à intégrer votre équipe et à relever vos prochains défis.\n\nRestant à votre écoute pour la suite du processus,\n\nBien à vous,\n[Votre Nom]`
      );
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !toEmail.trim() || !subject.trim() || !body.trim()) return;

    setIsSending(true);
    try {
      await sendGmailEmail(accessToken, {
        to: toEmail.trim(),
        subject: subject.trim(),
        body: body.trim(),
      });
      showToast("Email envoyé avec succès via Gmail !", "success");
      setIsComposeOpen(false);
      setToEmail("");
      setSubject("");
      setBody("");
      setSelectedTemplate(null);
      await loadMessages();
    } catch (e: any) {
      showToast(`Erreur d'envoi : ${e.message}`, "error");
    } finally {
      setIsSending(false);
    }
  };

  if (!accessToken) {
    return (
      <div className="space-y-6">
        <GlassCard className="p-8 text-center space-y-5 border-white/10 relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-[#EA4335]/15 border border-[#EA4335]/30 flex items-center justify-center mx-auto text-[#FF6685] shadow-[0_0_25px_rgba(234,67,53,0.15)]">
            <Mail className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-[#F5F6FA]">Connecter Gmail Recruteurs</h3>
            <p className="text-xs text-[#9AA0B2] leading-relaxed">
              Consultez vos messages reçus de recruteurs, répondez directement et envoyez vos candidatures spontanées ou relances avec l'assistance de l'IA NACORA.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <GlassButton
              variant="primary"
              size="md"
              onClick={async () => {
                try {
                  await connectGoogleWorkspace();
                } catch (e: any) {
                  showToast(`Échec connexion : ${e.message}`, "error");
                }
              }}
              icon={<Mail className="w-4 h-4" />}
            >
              Connecter Gmail
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 backdrop-blur-xl animate-fade-in ${
          toastMsg.type === "success" 
            ? "bg-[#34D399]/15 border-[#34D399]/30 text-[#34D399]" 
            : toastMsg.type === "ai"
            ? "bg-[#C084FC]/15 border-[#C084FC]/30 text-[#C084FC]"
            : "bg-[#F87171]/15 border-[#F87171]/30 text-[#F87171]"
        }`}>
          {toastMsg.type === "ai" ? <Sparkles className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EA4335]/15 border border-[#EA4335]/30 flex items-center justify-center text-[#FF6685]">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#F5F6FA]">Gmail Recruteurs & Candidatures</h3>
              <Badge variant="crimson">Connecté</Badge>
            </div>
            <p className="text-xs text-[#9AA0B2]">
              Consultez vos échanges recruteurs et envoyez vos emails directement depuis NACORA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={loadMessages}
            disabled={loading}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#FF6685]" : ""}`} />}
          >
            Actualiser
          </GlassButton>
          <GlassButton
            variant="primary"
            size="sm"
            onClick={() => setIsComposeOpen(true)}
            icon={<Send className="w-3.5 h-3.5" />}
          >
            Écrire un email
          </GlassButton>
        </div>
      </div>

      {/* Main View: Split Reader or List */}
      {selectedMessage ? (
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <button
              onClick={() => setSelectedMessage(null)}
              className="flex items-center gap-2 text-xs font-semibold text-[#9AA0B2] hover:text-[#F5F6FA] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour à la boîte de réception</span>
            </button>

            <a
              href={`https://mail.google.com/mail/u/0/#inbox/${selectedMessage.threadId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[#38BDF8] hover:underline"
            >
              <span>Ouvrir dans Gmail</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-bold text-[#F5F6FA]">{selectedMessage.subject}</h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#9AA0B2]">
              <span className="flex items-center gap-1.5 text-[#F5F6FA] font-medium">
                <User className="w-3.5 h-3.5 text-[#FF6685]" />
                {selectedMessage.from}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {selectedMessage.date}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-black/30 border border-white/5 text-xs text-[#F5F6FA] leading-relaxed whitespace-pre-wrap font-sans">
            {selectedMessage.bodyText}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <GlassButton
              size="sm"
              variant="primary"
              onClick={() => {
                const cleanEmail = selectedMessage.from.match(/<([^>]+)>/)?.[1] || selectedMessage.from;
                setToEmail(cleanEmail);
                setSubject(`Re: ${selectedMessage.subject.replace(/^Re:\s*/i, "")}`);
                setBody(`\n\n--- Message précédent ---\n${selectedMessage.bodyText.slice(0, 300)}...`);
                setIsComposeOpen(true);
              }}
              icon={<Send className="w-3.5 h-3.5" />}
            >
              Répondre
            </GlassButton>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9AA0B2]" />
            <input
              type="text"
              placeholder="Rechercher des emails recruteurs (nom de société, poste, expéditeur)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") loadMessages();
              }}
              className="w-full pl-10 pr-24 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-[#F5F6FA] placeholder-[#9AA0B2] focus:outline-none focus:border-[#FF6685]/50"
            />
            <button
              onClick={loadMessages}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-white/10 hover:bg-white/15 rounded-lg text-xs font-semibold text-[#F5F6FA] transition-colors"
            >
              Filtrer
            </button>
          </div>

          {/* List */}
          {loading && messages.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-7 h-7 text-[#FF6685] animate-spin" />
              <p className="text-xs text-[#9AA0B2]">Chargement de vos emails Gmail...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-[#F87171]/10 border border-[#F87171]/20 text-xs text-[#F87171] space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">{error}</p>
                  {error.includes("Gmail API") && (
                    <p className="text-[11px] text-[#F5F6FA]/80">
                      L'API Gmail doit être activée dans votre projet Google Cloud (1 clic requis).
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <a
                  href="https://console.developers.google.com/apis/api/gmail.googleapis.com/overview?project=350691239439"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6685] text-white font-bold text-xs hover:bg-[#FF6685]/90 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Activer l'API Gmail dans Google Cloud</span>
                </a>
                <GlassButton size="sm" variant="secondary" onClick={loadMessages}>
                  Réessayer
                </GlassButton>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="py-12 px-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center">
              <Mail className="w-8 h-8 text-[#9AA0B2]/40 mx-auto mb-2" />
              <p className="text-xs font-medium text-[#F5F6FA]">Aucun email trouvé</p>
              <p className="text-[11px] text-[#9AA0B2] mt-1">
                Vos derniers emails Gmail apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => handleOpenMessage(msg.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    msg.isUnread
                      ? "bg-white/[0.06] border-[#FF6685]/30 hover:border-[#FF6685]/60"
                      : "bg-white/[0.02] hover:bg-white/[0.05] border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      {msg.isUnread && (
                        <span className="w-2 h-2 rounded-full bg-[#FF6685] shrink-0 animate-pulse" />
                      )}
                      <span className="text-xs font-bold text-[#F5F6FA] truncate">
                        {msg.from}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-[#F5F6FA] truncate">
                      {msg.subject}
                    </p>
                    <p className="text-[11px] text-[#9AA0B2] truncate">
                      {msg.snippet}
                    </p>
                  </div>

                  <div className="shrink-0 text-right space-y-1">
                    <span className="text-[10px] text-[#9AA0B2] whitespace-nowrap block">
                      {msg.date ? new Date(msg.date).toLocaleDateString() : ""}
                    </span>
                    <span className="text-[10px] text-[#38BDF8] hover:underline block">
                      Lire & Répondre →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Rédaction Email */}
      <Modal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        title="Rédiger un email de candidature (Gmail)"
      >
        <form onSubmit={handleSendEmail} className="space-y-4">
          {/* Quick AI templates */}
          <div>
            <label className="block text-[11px] font-semibold text-[#9AA0B2] mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C084FC]" />
              <span>Modèles rapides suggérés par l'IA :</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "spontanee", label: "Candidature spontanée" },
                { id: "relance", label: "Relance polie" },
                { id: "entretien_remerciement", label: "Remerciement entretien" },
              ].map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => handleApplyTemplate(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    selectedTemplate === t.id
                      ? "bg-[#C084FC]/25 text-[#C084FC] border border-[#C084FC]/40"
                      : "bg-white/5 text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/10 border border-white/10"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#F5F6FA] mb-1">
              Destinataire (Email du recruteur) *
            </label>
            <input
              type="email"
              required
              placeholder="recruteur@entreprise.com"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              className="w-full px-3.5 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-[#F5F6FA] placeholder-[#9AA0B2] focus:outline-none focus:border-[#FF6685]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#F5F6FA] mb-1">
              Objet *
            </label>
            <input
              type="text"
              required
              placeholder="ex: Candidature au poste de Senior Product Designer"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-[#F5F6FA] placeholder-[#9AA0B2] focus:outline-none focus:border-[#FF6685]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#F5F6FA] mb-1">
              Corps du message *
            </label>
            <textarea
              rows={8}
              required
              placeholder="Rédigez votre email professionnel..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-[#F5F6FA] placeholder-[#9AA0B2] focus:outline-none focus:border-[#FF6685] font-sans"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <GlassButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsComposeOpen(false)}
            >
              Annuler
            </GlassButton>
            <GlassButton
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSending || !toEmail.trim() || !subject.trim() || !body.trim()}
              icon={isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            >
              {isSending ? "Envoi en cours..." : "Envoyer via Gmail"}
            </GlassButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};
