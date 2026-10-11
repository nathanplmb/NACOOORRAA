import React, { useState, useMemo } from "react";
import { Contact, Opportunity, Company } from "../types";
import { 
  Bell, 
  X, 
  CheckCheck, 
  MessageSquare, 
  Briefcase, 
  Clock, 
  Building2, 
  Sparkles, 
  ArrowRight,
  Flame,
  CheckCircle2,
  Trash2,
  ChevronRight
} from "lucide-react";

export interface AppNotification {
  id: string;
  type: "message_reply" | "followup_due" | "opp_deadline" | "interview" | "company_lead" | "system";
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  priority: "urgent" | "high" | "normal";
  badge: string;
  badgeClass: string;
  appLabel: string;
  targetView: "messages" | "opportunities" | "companies" | "calendrier";
  targetId?: string;
}

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  opportunities: Opportunity[];
  companies: Company[];
  onNavigate: (view: string, targetId?: string) => void;
  showToast: (message: string, type: "success" | "error" | "info" | "ai") => void;
}

function formatIosTime(isoString?: string): string {
  if (!isoString) return "Récemment";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Récemment";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) {
      // Future date (e.g. deadline)
      const futureDays = Math.ceil(-diffMs / (1000 * 60 * 60 * 24));
      if (futureDays === 0) return "Aujourd'hui";
      if (futureDays === 1) return "Demain";
      return `Dans ${futureDays}j`;
    }
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours} h`;
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `${diffDays} j`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  } catch {
    return "Récemment";
  }
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  contacts,
  opportunities,
  companies,
  onNavigate,
  showToast
}) => {
  const [activeFilter, setActiveFilter] = useState<"all" | "messages" | "opportunities" | "system">("all");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Génération dynamique de toutes les notifications possibles de l'application
  const notifications = useMemo(() => {
    const list: AppNotification[] = [];
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // 1. Alertes Messages : Réponses reçues à traiter
    contacts.forEach(c => {
      const isNeedsReply = c.networkingStatus === "reponse_recue" || c.networkingStatus === "reponse_a_traiter";
      if (isNeedsReply) {
        list.push({
          id: `notif_reply_${c.id}`,
          type: "message_reply",
          title: `Réponse de ${c.fullName}`,
          description: `${c.jobTitle ? `${c.jobTitle} · ` : ""}${c.companyName || "Entreprise"} vous a répondu. Consultez l'échange et préparez votre retour.`,
          timestamp: c.lastOutreachDate || c.createdAt || new Date().toISOString(),
          isRead: readIds.has(`notif_reply_${c.id}`),
          priority: "urgent",
          badge: "Réponse reçue",
          badgeClass: "bg-purple-500/20 text-[#C084FC] border-purple-500/35",
          appLabel: "Networking",
          targetView: "messages",
          targetId: c.id
        });
      }
    });

    // 2. Alertes Relances : Relances échues ou prévues aujourd'hui
    contacts.forEach(c => {
      const isRelanceDue = c.networkingStatus === "relance_a_faire" || (c.nextFollowUpDate && c.nextFollowUpDate <= todayStr);
      if (isRelanceDue && c.networkingStatus !== "reponse_recue") {
        list.push({
          id: `notif_followup_${c.id}`,
          type: "followup_due",
          title: `Relance : ${c.fullName}`,
          description: `Échéance de relance calée au ${c.nextFollowUpDate || "Aujourd'hui"}. Entretenez le lien avec ${c.companyName || "votre interlocuteur"}.`,
          timestamp: c.nextFollowUpDate || new Date().toISOString(),
          isRead: readIds.has(`notif_followup_${c.id}`),
          priority: "urgent",
          badge: "Relance à faire",
          badgeClass: "bg-[rgba(216,26,69,0.2)] text-[#FF6685] border-[rgba(216,26,69,0.35)]",
          appLabel: "CRM · Suivi Contact",
          targetView: "messages",
          targetId: c.id
        });
      }
    });

    // 3. Alertes Opportunités : Deadlines proches (sous 7 jours)
    opportunities.forEach(o => {
      if (o.deadline) {
        const d = new Date(o.deadline);
        const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 7) {
          list.push({
            id: `notif_opp_deadline_${o.id}`,
            type: "opp_deadline",
            title: `Deadline J-${diffDays === 0 ? "0" : diffDays} : ${o.title}`,
            description: `Clôture des candidatures chez ${o.companyName}. Ajustez votre CV et soumettez votre dossier avant expiration.`,
            timestamp: o.deadline,
            isRead: readIds.has(`notif_opp_deadline_${o.id}`),
            priority: diffDays <= 2 ? "urgent" : "high",
            badge: diffDays === 0 ? "Aujourd'hui" : `J-${diffDays}`,
            badgeClass: diffDays <= 2 ? "bg-amber-500/25 text-amber-300 border-amber-500/40" : "bg-blue-500/20 text-blue-300 border-blue-500/35",
            appLabel: "Opportunités · Deadline",
            targetView: "opportunities",
            targetId: o.id
          });
        }
      }

      // Entretiens ou étapes avancées
      if ((o.workflowStep && o.workflowStep >= 5) || (o.notes && o.notes.toLowerCase().includes("entretien"))) {
        list.push({
          id: `notif_interview_${o.id}`,
          type: "interview",
          title: `Entretien : ${o.title}`,
          description: `Processus de recrutement actif chez ${o.companyName}. Préparez votre pitch et révisez les cas pratiques.`,
          timestamp: o.updatedAt || new Date().toISOString(),
          isRead: readIds.has(`notif_interview_${o.id}`),
          priority: "high",
          badge: "Entretien en cours",
          badgeClass: "bg-emerald-500/20 text-[#34D399] border-emerald-500/35",
          appLabel: "Pipeline · Recrutement",
          targetView: "opportunities",
          targetId: o.id
        });
      }
    });

    // 4. Entreprises ciblées sans contact rattaché
    const companiesWithoutContact = companies.filter(co => (co.contactCount || 0) === 0);
    if (companiesWithoutContact.length > 0) {
      const first = companiesWithoutContact[0];
      list.push({
        id: `notif_company_lead_${first.id}`,
        type: "company_lead",
        title: `Cible à activer : ${first.name}`,
        description: `${companiesWithoutContact.length} entreprise(s) ciblée(s) n'ont pas encore d'interlocuteur identifié.`,
        timestamp: first.createdAt || new Date().toISOString(),
        isRead: readIds.has(`notif_company_lead_${first.id}`),
        priority: "normal",
        badge: "Réseau à bâtir",
        badgeClass: "bg-sky-500/20 text-sky-300 border-sky-500/35",
        appLabel: "Entreprises · Cibles",
        targetView: "companies",
        targetId: first.id
      });
    }

    // 5. Notification Système & Synchronisation Cloud
    list.push({
      id: "notif_system_status",
      type: "system",
      title: "Workspace NACORA synchronisé",
      description: "Toutes vos données de candidatures, contacts et messages sont sécurisées avec double persistance locale & cloud.",
      timestamp: new Date().toISOString(),
      isRead: readIds.has("notif_system_status"),
      priority: "normal",
      badge: "Système",
      badgeClass: "bg-white/10 text-[#9AA0B2] border-white/20",
      appLabel: "NACORA · Système",
      targetView: "opportunities"
    });

    // Trier par priorité puis date
    const priorityOrder = { urgent: 0, high: 1, normal: 2 };
    return list.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.timestamp.localeCompare(a.timestamp);
    });
  }, [contacts, opportunities, companies, readIds]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "all") return notifications;
    if (activeFilter === "messages") return notifications.filter(n => n.type === "message_reply" || n.type === "followup_due");
    if (activeFilter === "opportunities") return notifications.filter(n => n.type === "opp_deadline" || n.type === "interview");
    if (activeFilter === "system") return notifications.filter(n => n.type === "system" || n.type === "company_lead");
    return notifications;
  }, [notifications, activeFilter]);

  const handleMarkAllAsRead = () => {
    const allIds = new Set(notifications.map(n => n.id));
    setReadIds(allIds);
    showToast("Toutes les notifications marquées comme lues", "info");
  };

  const handleNotificationClick = (notif: AppNotification) => {
    setReadIds(prev => new Set(prev).add(notif.id));
    onClose();
    onNavigate(notif.targetView, notif.targetId);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-end p-3 sm:p-5 sm:pt-16 bg-black/60 backdrop-blur-xl animate-fadeIn"
      onClick={onClose}
    >
      {/* iOS 27 Liquid Glass Container */}
      <div 
        className="w-full max-w-md rounded-[32px] bg-[#070A14]/85 border border-white/20 shadow-[0_24px_70px_rgba(0,0,0,0.85),inset_0_1px_1.5px_rgba(255,255,255,0.35),inset_0_0_24px_rgba(255,255,255,0.02)] backdrop-blur-3xl saturate-150 overflow-hidden flex flex-col max-h-[85vh] animate-slideDown relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Specular Ambient Top Glow (iOS Light Leak) */}
        <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

        {/* ========================================================================= */}
        {/* HEADER iOS Dynamic Style                                                  */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 pb-3 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            {/* Dynamic Squircle Icon */}
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-white/15 to-white/5 border border-white/25 flex items-center justify-center text-[#FF6685] shrink-0 shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.35)]">
              <Bell className="w-5 h-5 text-[#FF6685]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#F5F6FA] font-display tracking-tight">
                  Centre de notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-gradient-to-tr from-[#D81A45] to-[#FF6685] text-white text-[10px] font-black shadow-[0_0_12px_rgba(216,26,69,0.5),inset_0_1px_1px_rgba(255,255,255,0.4)]">
                    {unreadCount}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#9AA0B2]">
                Relances, réponses reçues, deadlines et statut
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="p-2 rounded-full bg-white/[0.05] hover:bg-white/[0.12] text-[#9AA0B2] hover:text-white border border-white/10 hover:border-white/25 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Tout marquer comme lu"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/[0.05] hover:bg-white/[0.12] text-[#9AA0B2] hover:text-white border border-white/10 hover:border-white/25 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* iOS 27 SEGMENTED PILL TRAY                                                */}
        {/* ========================================================================= */}
        <div className="px-4 py-2.5 border-b border-white/5 bg-white/[0.01]">
          <div className="p-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-xl flex items-center gap-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveFilter("all")}
              className={`flex-1 min-w-[70px] px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer text-center ${
                activeFilter === "all"
                  ? "bg-gradient-to-b from-white/20 to-white/10 text-white shadow-[0_2px_8px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.35)] border border-white/20 font-bold"
                  : "text-[#9AA0B2] hover:text-[#F5F6FA] border border-transparent"
              }`}
            >
              Toutes ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter("messages")}
              className={`flex-1 min-w-[85px] px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer text-center ${
                activeFilter === "messages"
                  ? "bg-gradient-to-b from-[rgba(216,26,69,0.3)] to-[rgba(216,26,69,0.15)] text-[#FF6685] shadow-[0_2px_8px_rgba(216,26,69,0.25),inset_0_1px_1px_rgba(255,255,255,0.35)] border border-[rgba(216,26,69,0.4)] font-bold"
                  : "text-[#9AA0B2] hover:text-[#FF6685] border border-transparent"
              }`}
            >
              Messages
            </button>
            <button
              onClick={() => setActiveFilter("opportunities")}
              className={`flex-1 min-w-[95px] px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer text-center ${
                activeFilter === "opportunities"
                  ? "bg-gradient-to-b from-amber-500/25 to-amber-500/10 text-amber-300 shadow-[0_2px_8px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.35)] border border-amber-500/35 font-bold"
                  : "text-[#9AA0B2] hover:text-amber-300 border border-transparent"
              }`}
            >
              Opportunités
            </button>
            <button
              onClick={() => setActiveFilter("system")}
              className={`flex-1 min-w-[70px] px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer text-center ${
                activeFilter === "system"
                  ? "bg-gradient-to-b from-purple-500/25 to-purple-500/10 text-purple-300 shadow-[0_2px_8px_rgba(168,85,247,0.2),inset_0_1px_1px_rgba(255,255,255,0.35)] border border-purple-500/35 font-bold"
                  : "text-[#9AA0B2] hover:text-purple-300 border border-transparent"
              }`}
            >
              Système
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* NOTIFICATIONS LIST (iOS 27 Glass Stacked Banners)                          */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 scrollbar-none">
          {filteredNotifications.length === 0 ? (
            <div className="py-14 text-center space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto text-[#34D399] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">Tout est à jour</p>
                <p className="text-xs text-[#9AA0B2]">
                  Aucune alerte active dans cette catégorie.
                </p>
              </div>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isUrgent = notif.priority === "urgent";

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 rounded-2xl transition-all cursor-pointer group relative overflow-hidden ${
                    notif.isRead
                      ? "bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.08]"
                      : isUrgent
                        ? "bg-gradient-to-b from-white/[0.08] to-white/[0.03] hover:from-white/[0.12] hover:to-white/[0.05] border border-[rgba(216,26,69,0.35)] shadow-[0_8px_24px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.25)]"
                        : "bg-gradient-to-b from-white/[0.06] to-white/[0.02] hover:from-white/[0.1] hover:to-white/[0.04] border border-white/15 shadow-[0_6px_20px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)]"
                  } active:scale-[0.99]`}
                >
                  {/* Subtle top edge specular highlight */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

                  <div className="flex items-start gap-3">
                    {/* iOS App Squircle Badge Icon */}
                    <div className="shrink-0 mt-0.5">
                      {notif.type === "message_reply" && (
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#C084FC]/30 to-[#A855F7]/10 text-[#C084FC] border border-[#C084FC]/40 flex items-center justify-center shadow-[0_4px_12px_rgba(192,132,252,0.2),inset_0_1px_1px_rgba(255,255,255,0.3)]">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                      )}
                      {notif.type === "followup_due" && (
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#D81A45]/30 to-[#FF6685]/10 text-[#FF6685] border border-[#D81A45]/40 flex items-center justify-center shadow-[0_4px_12px_rgba(216,26,69,0.2),inset_0_1px_1px_rgba(255,255,255,0.3)]">
                          <Flame className="w-4 h-4" />
                        </div>
                      )}
                      {notif.type === "opp_deadline" && (
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/30 to-amber-500/10 text-amber-300 border border-amber-500/40 flex items-center justify-center shadow-[0_4px_12px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.3)]">
                          <Clock className="w-4 h-4" />
                        </div>
                      )}
                      {notif.type === "interview" && (
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500/30 to-emerald-500/10 text-[#34D399] border border-emerald-500/40 flex items-center justify-center shadow-[0_4px_12px_rgba(52,211,153,0.2),inset_0_1px_1px_rgba(255,255,255,0.3)]">
                          <Briefcase className="w-4 h-4" />
                        </div>
                      )}
                      {notif.type === "company_lead" && (
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500/30 to-sky-500/10 text-sky-300 border border-sky-500/40 flex items-center justify-center shadow-[0_4px_12px_rgba(56,189,248,0.2),inset_0_1px_1px_rgba(255,255,255,0.3)]">
                          <Building2 className="w-4 h-4" />
                        </div>
                      )}
                      {notif.type === "system" && (
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-white/20 to-white/5 text-white border border-white/25 flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.3)]">
                          <Sparkles className="w-4 h-4 text-[#C084FC]" />
                        </div>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 min-w-0">
                      {/* Top Meta : App Name & Relative Time */}
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B2]/80 truncate">
                          {notif.appLabel}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-medium text-[#9AA0B2]/70 font-mono">
                            {formatIosTime(notif.timestamp)}
                          </span>
                          {!notif.isRead && (
                            <span className="w-2 h-2 rounded-full bg-[#FF6685] shadow-[0_0_8px_rgba(216,26,69,0.9)] animate-pulse" />
                          )}
                        </div>
                      </div>

                      {/* Main Title */}
                      <h4 className="text-xs font-bold text-[#F5F6FA] group-hover:text-white truncate mb-1">
                        {notif.title}
                      </h4>

                      {/* Description */}
                      <p className="text-[11px] text-[#9AA0B2] group-hover:text-[#CBD2E1] line-clamp-2 leading-relaxed transition-colors">
                        {notif.description}
                      </p>

                      {/* Bottom Pills Row */}
                      <div className="mt-2.5 flex items-center justify-between text-[10px]">
                        <span className={`px-2 py-0.5 rounded-full font-bold border backdrop-blur-md shadow-sm ${notif.badgeClass}`}>
                          {notif.badge}
                        </span>

                        <div className="flex items-center gap-1 text-[#FF6685] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>Ouvrir</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ========================================================================= */}
        {/* FOOTER Liquid Glass                                                       */}
        {/* ========================================================================= */}
        <div className="p-3.5 px-5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs text-[#9AA0B2]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
            <span className="text-[11px] font-medium text-[#9AA0B2]">NACORA Live Engine</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white font-bold text-xs cursor-pointer transition-all border border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.25)] active:scale-95"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
