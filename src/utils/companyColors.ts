export interface CompanyTheme {
  sectorLabel: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  avatarGradient: string;
  avatarText: string;
  avatarBorder: string;
  avatarShadow: string;
  accentColor: string;
}

export function getCompanyTheme(sector?: string, name?: string): CompanyTheme {
  const s = (sector || "").toLowerCase();
  const n = (name || "").toLowerCase();

  if (s.includes("fintech") || s.includes("néo") || s.includes("neo") || n.includes("revolut") || n.includes("trade republic") || n.includes("finary") || n.includes("qonto") || n.includes("spendesk")) {
    return {
      sectorLabel: sector || "FinTech & Néo-finance",
      badgeBg: "bg-[rgba(192,132,252,0.12)]",
      badgeText: "text-[#C084FC]",
      badgeBorder: "border-[rgba(192,132,252,0.28)]",
      avatarGradient: "from-[#C084FC]/30 to-[#A855F7]/15",
      avatarText: "text-[#C084FC]",
      avatarBorder: "border-[#C084FC]/40",
      avatarShadow: "shadow-[0_0_24px_rgba(192,132,252,0.30)]",
      accentColor: "#C084FC"
    };
  }

  if (s.includes("patrimoine") || s.includes("wealth") || s.includes("cgp") || s.includes("privée") || s.includes("private") || n.includes("rothschild") || n.includes("palatine")) {
    return {
      sectorLabel: sector || "Gestion de Patrimoine",
      badgeBg: "bg-[rgba(251,191,36,0.12)]",
      badgeText: "text-[#FBBF24]",
      badgeBorder: "border-[rgba(251,191,36,0.28)]",
      avatarGradient: "from-[#FBBF24]/30 to-[#F59E0B]/15",
      avatarText: "text-[#FBBF24]",
      avatarBorder: "border-[#FBBF24]/40",
      avatarShadow: "shadow-[0_0_24px_rgba(251,191,36,0.30)]",
      accentColor: "#FBBF24"
    };
  }

  if (s.includes("assurance") || s.includes("mutuelle") || s.includes("courtage") || n.includes("axa") || n.includes("allianz") || n.includes("generali") || n.includes("swiss life")) {
    return {
      sectorLabel: sector || "Assurance & Prévoyance",
      badgeBg: "bg-[rgba(56,189,248,0.12)]",
      badgeText: "text-[#38BDF8]",
      badgeBorder: "border-[rgba(56,189,248,0.28)]",
      avatarGradient: "from-[#38BDF8]/30 to-[#0284C7]/15",
      avatarText: "text-[#38BDF8]",
      avatarBorder: "border-[#38BDF8]/40",
      avatarShadow: "shadow-[0_0_24px_rgba(56,189,248,0.30)]",
      accentColor: "#38BDF8"
    };
  }

  if (s.includes("audit") || s.includes("conseil") || s.includes("consulting") || n.includes("kpmg") || n.includes("deloitte") || n.includes("ey") || n.includes("pwc")) {
    return {
      sectorLabel: sector || "Audit & Conseil",
      badgeBg: "bg-[rgba(18,183,106,0.12)]",
      badgeText: "text-[#34D399]",
      badgeBorder: "border-[rgba(18,183,106,0.28)]",
      avatarGradient: "from-[#12B76A]/30 to-[#059669]/15",
      avatarText: "text-[#34D399]",
      avatarBorder: "border-[#12B76A]/40",
      avatarShadow: "shadow-[0_0_24px_rgba(18,183,106,0.30)]",
      accentColor: "#34D399"
    };
  }

  // Default: Banque & Services Financiers (NACORA Signature Crimson)
  return {
    sectorLabel: sector || "Banque & Finance",
    badgeBg: "bg-[rgba(216,26,69,0.14)]",
    badgeText: "text-[#FF6685]",
    badgeBorder: "border-[rgba(216,26,69,0.30)]",
    avatarGradient: "from-[#D81A45]/30 to-[#FF1A55]/15",
    avatarText: "text-[#FF6685]",
    avatarBorder: "border-[#D81A45]/40",
    avatarShadow: "shadow-[0_0_24px_rgba(216,26,69,0.30)]",
    accentColor: "#FF6685"
  };
}
