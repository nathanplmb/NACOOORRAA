/**
 * Module centralisé de résolution et de déduplication des contacts NACORA
 * Gestion du matching multi-niveaux, filtrage des "LinkedIn Member" génériques et fusion non-destructive.
 */

import { Contact, ConversationMessage } from "../types";
import { isSameCompany } from "./companyResolver";

export type ContactMatchDecision = "certain" | "probable" | "uncertain" | "new_contact";

export interface ContactResolutionResult {
  matchedContact: Contact | null;
  matchScore: number; // 0 - 100
  decision: ContactMatchDecision;
  reason: string;
  isAmbiguousHomonym?: boolean;
}

/**
 * Extrait le slug unique d'un profil LinkedIn (insensible au sous-domaine, protocole, query params ou slash final)
 * Ex: "https://fr.linkedin.com/in/milan-allais?originalSubdomain=fr" -> "milan-allais"
 * Ex: "https://www.linkedin.com/in/milan-allais/" -> "milan-allais"
 */
export function extractLinkedInSlug(url?: string): string {
  if (!url) return "";
  let clean = url.trim().toLowerCase();
  clean = clean.replace(/^https?:\/\//i, "");
  // Retirer sous-domaines (fr.linkedin.com, uk.linkedin.com, www.linkedin.com, etc.)
  clean = clean.replace(/^[a-z0-9-]+\.linkedin\.com/i, "linkedin.com");
  // Retirer les query params et hash (?trk=..., ?originalSubdomain=..., #...)
  clean = clean.split("?")[0].split("#")[0];
  // Retirer les préfixes d'URL de profil
  clean = clean.replace(/^linkedin\.com\/in\//i, "");
  clean = clean.replace(/^linkedin\.com\/pub\//i, "");
  clean = clean.replace(/^in\//i, "");
  clean = clean.replace(/\/+$/, "").trim();
  return clean;
}

/**
 * Nettoie le nom affiché d'un contact en retirant les artefacts fréquents (pronoms, emojis, titres, entreprises accolées, degrés LinkedIn)
 */
export function cleanPersonDisplayName(rawName?: string, userProfile?: any): string {
  if (!rawName) return "";
  let name = rawName.trim();

  // Si plusieurs personnes séparées par des virgules ou points-virgules (ex: "Milan Allais, Nathan Paillard" dans la colonne TO)
  if (name.includes(",") || name.includes(";")) {
    const parts = name.split(/[,;]/).map(p => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      // Filtrer les participants correspondant à l'utilisateur courant (avec détection par mot entier)
      const userNorm = userProfile ? normalizePersonName(userProfile.fullName || userProfile.firstName) : "nathan";
      const userFirst = userProfile ? normalizePersonName(userProfile.firstName || "nathan") : "nathan";
      const candidateParts = parts.filter(p => {
        const pNorm = normalizePersonName(p);
        const pWords = pNorm.split(/\s+/);
        const isSelf = pNorm === userNorm || pWords.includes(userFirst) || pWords.includes("nathan") || pNorm === "me" || pNorm === "moi";
        return !isSelf;
      });
      if (candidateParts.length > 0) {
        name = candidateParts[0];
      }
    }
  }

  // 1. Retirer les degrés de relation LinkedIn : " · 1er", " · 1st", " • 2e", " - 3e+", " 1er degré", etc.
  name = name.replace(/\s*[\u00B7\u2022•·\-–—]?\s*(?:1er|1st|2e|2nd|3e|3rd|\d+e|\d+th|\d+er|\d+\+?)(?:\s+(?:degr[ée]|degree))?/gi, " ");

  // 2. Retirer les parenthèses de toutes sortes (pronoms, entreprises, statuts) : (He/Him), (Elle), (Reckitt), (Open to work), etc.
  name = name.replace(/\s*\([^)]*\)/g, " ");

  // 3. Retirer les crochets : [Reckitt], [BNP Paribas], etc.
  name = name.replace(/\s*\[[^\]]*\]/g, " ");

  // 4. Retirer les séparateurs d'entreprise ou de poste accolés au nom : "Milan Allais - Reckitt", "Milan Allais | Category Manager", "Milan Allais · BNP"
  name = name.replace(/\s+[\-–—|•·\u00B7\u2022@/]\s+.*$/, "");

  // 5. Retirer les emojis et symboles spéciaux
  name = name.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, " ");

  // 6. Retirer les civilités et titres académiques courants en préfixe
  name = name.replace(/^(?:dr|prof|mr|mme|ms|mrs|m|mlle)\.?\s+/i, "");

  // 7. Retirer les diplômes/certifications en suffixe
  name = name.replace(/,?\s*(?:mba|emba|ph\.?d|cfa|pmp|cpa|msc|m2|cgp|cgpc)\b/gi, "");

  return name.replace(/\s+/g, " ").trim();
}

/**
 * Normalise un nom de personne pour un rapprochement insensible aux accents, casse, espaces et ponctuation
 */
export function normalizePersonName(name?: string): string {
  if (!name) return "";
  const cleaned = cleanPersonDisplayName(name);
  return cleaned
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Vérifie si un nom ou intitulé correspond à un message sponsorisé, publicitaire ou robotique
 */
export function isSponsoredOrAdvertisingName(name?: string): boolean {
  if (!name) return false;
  const rawLower = name.trim().toLowerCase();
  
  // Filtrage direct et radical sur tout terme publicitaire / sponsorisé
  if (
    rawLower.includes("sponsored") ||
    rawLower.includes("sponsoris") ||
    rawLower.includes("sponsor") ||
    rawLower.includes("promoted") ||
    rawLower.includes("publicit") ||
    rawLower.includes("advertis") ||
    rawLower.includes("annonce sponsoris") ||
    rawLower.includes("annonce publicitaire") ||
    rawLower.includes("linkedin ads") ||
    rawLower.includes("marketing solutions") ||
    rawLower.includes("talent solutions") ||
    rawLower.includes("sales solutions") ||
    rawLower.includes("learning solutions") ||
    rawLower.includes("linkedin offer") ||
    rawLower.includes("linkedin notification") ||
    rawLower.includes("inmail publicitaire")
  ) {
    return true;
  }

  const clean = normalizePersonName(name);
  if (!clean) return false;

  const sponsoredPatterns = [
    "sponsored conversation",
    "conversation sponsorisee",
    "sponsored inmail",
    "inmail sponsorise",
    "message sponsorise",
    "sponsored message",
    "sponsored",
    "sponsorise",
    "sponsorisee",
    "promoted inmail",
    "promoted message",
    "promoted conversation",
    "promoted content",
    "linkedin ads",
    "linkedin marketing solutions",
    "linkedin talent solutions",
    "linkedin sales solutions",
    "publicite",
    "publicite linkedin",
    "annonce sponsorisee",
    "linkedin offer",
    "linkedin notification",
    "inmail publicitaire",
    "message publicitaire"
  ];

  return sponsoredPatterns.some(p => clean === p || clean.startsWith(p) || clean.endsWith(p));
}

/**
 * Vérifie si une chaîne correspond à un intitulé générique "LinkedIn Member" ou publicitaire
 */
export function isGenericLinkedInMember(name?: string): boolean {
  if (!name) return true;
  if (isSponsoredOrAdvertisingName(name)) return true;
  const clean = normalizePersonName(name);
  return (
    clean === "linkedin member" ||
    clean === "membre linkedin" ||
    clean === "utilisateur linkedin" ||
    clean === "anonymous" ||
    clean === "inconnu" ||
    clean === "contact linkedin" ||
    clean === "contact inconnu"
  );
}

/**
 * Détermine si un participant importé est une identité non identifiable ou un message sponsorisé à ignorer
 */
export function shouldFilterOutLinkedInParticipant(candidate: {
  fullName?: string;
  email?: string;
  linkedInUrl?: string;
}): { shouldFilter: boolean; reason?: string } {
  // RÈGLE 1 : Éliminer sans exception toute conversation sponsorisée ou publicitaire
  if (isSponsoredOrAdvertisingName(candidate.fullName)) {
    return {
      shouldFilter: true,
      reason: "Message publicitaire ou conversation sponsorisée LinkedIn ignorée"
    };
  }

  // RÈGLE 2 : Filtrer les membres génériques non identifiables
  const isGeneric = isGenericLinkedInMember(candidate.fullName);

  if (isGeneric) {
    const hasValidEmail = Boolean(candidate.email && candidate.email.includes("@"));
    const hasSpecificUrl = Boolean(
      candidate.linkedInUrl &&
      !candidate.linkedInUrl.toLowerCase().includes("/unknown") &&
      !candidate.linkedInUrl.toLowerCase().includes("/member") &&
      candidate.linkedInUrl.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//, "").replace(/\/$/, "").length > 3
    );

    if (!hasValidEmail && !hasSpecificUrl) {
      return {
        shouldFilter: true,
        reason: "Identité LinkedIn non identifiable (LinkedIn Member sans coordonnées rattachables)"
      };
    }
  }

  return { shouldFilter: false };
}

/**
 * Résout un contact candidat par rapport à la base existante selon les 5 priorités définies :
 * PRIORITÉ 1 — Identifiant / URL LinkedIn exact
 * PRIORITÉ 2 — Email exact
 * PRIORITÉ 3 — Nom normalisé + Entreprise concordante
 * PRIORITÉ 4 — Nom normalisé seul (vérification d'homonymes ambigus)
 * PRIORITÉ 5 — Correspondances partielles
 */
export function resolveContact(
  candidate: {
    fullName?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    linkedInUrl?: string;
    companyName?: string;
  },
  existingContacts: Contact[]
): ContactResolutionResult {
  if (!existingContacts || existingContacts.length === 0) {
    return {
      matchedContact: null,
      matchScore: 0,
      decision: "new_contact",
      reason: "Aucun contact existant dans la base NACORA"
    };
  }

  const candName = normalizePersonName(candidate.fullName);
  const candEmail = (candidate.email || "").trim().toLowerCase();
  const candCompany = (candidate.companyName || "").trim();

  // Nettoyage URL LinkedIn pour comparaison de slug robuste
  const candSlug = extractLinkedInSlug(candidate.linkedInUrl);

  let bestMatch: Contact | null = null;
  let bestScore = 0;
  let bestReason = "";

  // PRIORITÉ 1 — Identifiant / URL LinkedIn exact (SIGNAL DÉTERMINANT : 98%)
  if (candSlug && candSlug.length > 2 && candSlug !== "unknown" && candSlug !== "member") {
    for (const c of existingContacts) {
      const cSlug = extractLinkedInSlug(c.linkedInUrl);
      if (cSlug && cSlug === candSlug) {
        return {
          matchedContact: c,
          matchScore: 98,
          decision: "certain",
          reason: "Identifiant de profil LinkedIn identique"
        };
      }
    }
  }

  // PRIORITÉ 2 — Email identique (SIGNAL DÉTERMINANT : 97%)
  if (candEmail && candEmail.includes("@")) {
    for (const c of existingContacts) {
      const cEmail = (c.email || "").trim().toLowerCase();
      if (cEmail && cEmail === candEmail) {
        return {
          matchedContact: c,
          matchScore: 97,
          decision: "certain",
          reason: "Adresse email identique"
        };
      }
    }
  }

  // PRIORITÉ 3 & 4 — Nom complet normalisé
  if (candName) {
    const candWords = candName.split(" ").filter(w => w.length > 1);

    // Chercher tous les contacts ayant ce même nom normalisé
    const nameMatches = existingContacts.filter(c => {
      const cName = normalizePersonName(c.fullName);
      if (cName === candName) return true;

      // Inversion Prénom / Nom
      const cFirst = normalizePersonName(c.firstName);
      const cLast = normalizePersonName(c.lastName);
      if (cFirst && cLast) {
        const direct = `${cFirst} ${cLast}`.trim();
        const inverted = `${cLast} ${cFirst}`.trim();
        if (direct === candName || inverted === candName) return true;
      }

      // Rapprochement avec prénoms/noms composés, second prénom, inversion ou inclusion
      const cWords = cName.split(" ").filter(w => w.length > 1);
      if (candWords.length >= 2 && cWords.length >= 2) {
        // Premier mot = prénom, dernier mot = nom de famille
        if (candWords[0] === cWords[0] && candWords[candWords.length - 1] === cWords[cWords.length - 1]) {
          return true;
        }
        // Inversion (Nom de famille en premier)
        if (candWords[0] === cWords[cWords.length - 1] && candWords[candWords.length - 1] === cWords[0]) {
          return true;
        }
        // Token overlap : tous les mots d'un côté sont inclus dans l'autre (ex: "Milan Pierre Allais" vs "Milan Allais")
        const shared = candWords.filter(w => cWords.includes(w));
        if (shared.length >= 2 && (shared.length === candWords.length || shared.length === cWords.length)) {
          return true;
        }
      }

      // Si candidate a firstName et lastName explicites
      if (candidate.firstName && candidate.lastName) {
        const cf = normalizePersonName(candidate.firstName);
        const cl = normalizePersonName(candidate.lastName);
        if (cf && cl && ((cFirst === cf && cLast === cl) || (cFirst === cl && cLast === cf))) {
          return true;
        }
      }

      return false;
    });

    if (nameMatches.length === 1) {
      const singleMatch = nameMatches[0];
      const hasCompanyMatch = candCompany && singleMatch.companyName && isSameCompany(candCompany, singleMatch.companyName);

      if (hasCompanyMatch) {
        // PRIORITÉ 3 : Nom + Entreprise concordante -> MATCH CERTAIN (95%)
        return {
          matchedContact: singleMatch,
          matchScore: 95,
          decision: "certain",
          reason: `Nom identique et entreprise concordante (${singleMatch.companyName})`
        };
      } else if (!candCompany || !singleMatch.companyName) {
        // PRIORITÉ 4 : Nom identique seul avec entreprise manquante dans l'import (ex: CSV LinkedIn standard) -> MATCH CERTAIN (93%)
        return {
          matchedContact: singleMatch,
          matchScore: 93,
          decision: "certain",
          reason: `Contact unique existant sous ce nom (${singleMatch.fullName})`
        };
      } else {
        // Nom identique mais entreprises différentes explicitement déclarées -> FUSION RECOMMANDÉE (80%)
        return {
          matchedContact: singleMatch,
          matchScore: 80,
          decision: "probable",
          reason: `Même nom chez ${singleMatch.companyName} (import: ${candCompany}) — Fusion recommandée`,
          isAmbiguousHomonym: false
        };
      }
    } else if (nameMatches.length > 1) {
      // Plusieurs fiches contacts correspondent à ce nom (doublons antérieurs ou homonymes)
      // 1. Désambiguïsation par entreprise si disponible
      if (candCompany) {
        const exactCo = nameMatches.find(c => isSameCompany(candCompany, c.companyName));
        if (exactCo) {
          return {
            matchedContact: exactCo,
            matchScore: 94,
            decision: "certain",
            reason: `Nom identique désambiguïsé par l'entreprise (${exactCo.companyName})`
          };
        }
      }

      // 2. Désambiguïsation par identifiant LinkedIn
      if (candSlug) {
        const exactSlug = nameMatches.find(c => {
          const s = extractLinkedInSlug(c.linkedInUrl);
          return s && s === candSlug;
        });
        if (exactSlug) {
          return {
            matchedContact: exactSlug,
            matchScore: 98,
            decision: "certain",
            reason: "Identifiant de profil LinkedIn identique"
          };
        }
      }

      // 3. Privilégier le contact ayant déjà des messages ou de l'historique
      const withMessages = nameMatches.find(c => (c.conversationMessages || []).length > 0);
      const chosen = withMessages || nameMatches[0];

      return {
        matchedContact: chosen,
        matchScore: 90,
        decision: "certain",
        reason: `Contact existant sous ce nom (${nameMatches.length} fiches existantes — fusion proposée)`,
        isAmbiguousHomonym: false
      };
    }
  }

  // PRIORITÉ 5 — Correspondances partielles (Prénom + Entreprise ou similarité forte)
  for (const c of existingContacts) {
    const cFirst = normalizePersonName(c.firstName);
    const cLast = normalizePersonName(c.lastName);
    const candFirst = normalizePersonName(candidate.firstName);
    const candLast = normalizePersonName(candidate.lastName);

    if (candLast && cLast && candLast === cLast && candFirst && cFirst && candFirst[0] === cFirst[0]) {
      if (candCompany && c.companyName && isSameCompany(candCompany, c.companyName)) {
        if (75 > bestScore) {
          bestScore = 75;
          bestMatch = c;
          bestReason = `Nom de famille et initiale identiques chez ${c.companyName}`;
        }
      }
    }
  }

  if (bestScore >= 70) {
    return {
      matchedContact: bestMatch,
      matchScore: bestScore,
      decision: "probable",
      reason: bestReason
    };
  }

  return {
    matchedContact: null,
    matchScore: 0,
    decision: "new_contact",
    reason: "Aucun contact correspondant identifié dans NACORA"
  };
}

/**
 * Fusionne intelligemment un contact existant avec les nouvelles données importées (NON-DESTRUCTIVE)
 * RÈGLE ABSOLUE : Ne jamais écraser une donnée existante par une valeur vide ou nulle provenant de l'import.
 */
export function mergeContactData(existing: Contact, incoming: Partial<Contact>): Contact {
  const merged: Contact = { ...existing };

  // Préservation stricte des champs existants valorisés
  if (incoming.email && !existing.email) merged.email = incoming.email;
  if (incoming.phone && !existing.phone) merged.phone = incoming.phone;
  if (incoming.linkedInUrl && !existing.linkedInUrl) merged.linkedInUrl = incoming.linkedInUrl;
  if (incoming.contactUrl && !existing.contactUrl) merged.contactUrl = incoming.contactUrl;

  // Entreprise & Poste : ne jamais remplacer par un placeholder générique
  if (incoming.companyName && incoming.companyName !== "Entreprise" && (!existing.companyName || existing.companyName === "Entreprise")) {
    merged.companyName = incoming.companyName;
    if (incoming.companyId) merged.companyId = incoming.companyId;
  }

  if (incoming.jobTitle && incoming.jobTitle !== "Professionnel" && (!existing.jobTitle || existing.jobTitle === "Professionnel")) {
    merged.jobTitle = incoming.jobTitle;
  }

  if (incoming.function && (!existing.function || existing.function === "Inconnue" || existing.function === "Autre")) {
    merged.function = incoming.function;
    merged.functionSource = incoming.functionSource || "imported";
    merged.functionConfidence = incoming.functionConfidence || "medium";
    merged.functionClassifiedAt = incoming.functionClassifiedAt || new Date().toISOString();
  }

  // Fusion des messages de conversation en évitant les doublons
  if (incoming.conversationMessages && incoming.conversationMessages.length > 0) {
    const existingMsgs = existing.conversationMessages || [];
    const newMsgs = incoming.conversationMessages.filter(
      newMsg => !existingMsgs.some(e => e.text.trim() === newMsg.text.trim() && e.timestamp.slice(0, 16) === newMsg.timestamp.slice(0, 16))
    );
    merged.conversationMessages = [...existingMsgs, ...newMsgs];
  }

  // Mise à jour des statuts networking si applicable
  if (incoming.networkingStatus && incoming.networkingStatus !== "to_contact") {
    merged.networkingStatus = incoming.networkingStatus;
  }
  if (incoming.nextAction) {
    merged.nextAction = incoming.nextAction;
  }
  if (incoming.nextFollowUpDate) {
    merged.nextFollowUpDate = incoming.nextFollowUpDate;
  }
  if (incoming.lastOutreachDate) {
    merged.lastOutreachDate = incoming.lastOutreachDate;
  }

  return merged;
}
