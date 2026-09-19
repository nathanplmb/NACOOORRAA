import { CandidateProfile, DetailedExperience, DetailedEducation, HardSkillItem, LanguageItem, CertificationItem, ProjectItem, VolunteerItem } from "../types";
import { dbStore } from "../dbStore";

export interface ParsedCVIdentity {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  title?: string;
  bio?: string;
  city?: string;
  country?: string;
  linkedInUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
}

export interface ParsedCVExperience {
  role: string;
  company: string;
  location?: string;
  contractType?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description: string;
  missions?: string[];
  responsibilities?: string[];
  achievements?: string[];
  kpis?: string[];
  skills?: string[];
  tools?: string[];
  sector?: string;
  context?: string;
  source?: "cv" | "linkedin" | "cv+linkedin";
}

export interface ParsedCVEducation {
  school: string;
  degree: string;
  domain?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
}

export interface ParsedCVSkill {
  name: string;
  level: "Débutant" | "Intermédiaire" | "Avancé" | "Expert";
  category?: string;
}

export interface ParsedCVLanguage {
  language: string;
  level: string;
  certification?: string;
  score?: string;
}

export interface ParsedCVCertification {
  name: string;
  issuer?: string;
  date?: string;
  score?: string;
  maxScore?: string;
  level?: string;
  credentialId?: string;
  verificationUrl?: string;
  source?: "cv" | "linkedin" | "cv+linkedin";
}

export interface ParsedCVProject {
  name: string;
  description?: string;
  role?: string;
  date?: string;
  technologies?: string[];
  results?: string;
}

export interface ParsedCVVolunteer {
  organization: string;
  role?: string;
  dates?: string;
  description?: string;
  achievements?: string;
}

export interface ParsedCVData {
  identity: ParsedCVIdentity;
  experiences: ParsedCVExperience[];
  educations: ParsedCVEducation[];
  hardSkills: ParsedCVSkill[];
  toolsAndSoftware: string[];
  softSkills: string[];
  languages: ParsedCVLanguage[];
  certifications: ParsedCVCertification[];
  projects: ParsedCVProject[];
  volunteerWork: ParsedCVVolunteer[];
  interests: string[];
  source?: "cv" | "linkedin" | "cv+linkedin";
}

export interface ItemMergeStatus<T> {
  item: T;
  status: 'new' | 'duplicate' | 'update' | 'enriched' | 'conflict';
  matchedExisting?: any;
  reason?: string;
  conflictNote?: string;
}

export interface CVMergeProposal {
  rawParsed: ParsedCVData;
  identity: {
    existing: ParsedCVIdentity;
    detected: ParsedCVIdentity;
    hasNewData: boolean;
  };
  experiences: ItemMergeStatus<ParsedCVExperience>[];
  educations: ItemMergeStatus<ParsedCVEducation>[];
  hardSkills: ItemMergeStatus<ParsedCVSkill>[];
  toolsAndSoftware: ItemMergeStatus<string>[];
  softSkills: ItemMergeStatus<string>[];
  languages: ItemMergeStatus<ParsedCVLanguage>[];
  certifications: ItemMergeStatus<ParsedCVCertification>[];
  projects: ItemMergeStatus<ParsedCVProject>[];
  volunteerWork: ItemMergeStatus<ParsedCVVolunteer>[];
  interests: ItemMergeStatus<string>[];
  stats: {
    totalDetected: number;
    newItemsCount: number;
    duplicateCount: number;
    updateCount: number;
  };
}

/**
 * 1. Extraction textuelle d'un fichier (PDF, DOCX, TXT)
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (ext === 'txt') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Impossible de lire le fichier texte."));
      reader.readAsText(file, 'utf-8');
    });
  }

  // Pour PDF et DOCX, appel du service backend /api/parse-document
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = reader.result as string;
        const base64Data = result.split(',')[1] || result;

        const res = await fetch('/api/parse-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data,
            fileName: file.name,
            fileType: file.type
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Erreur lors de l'extraction du texte du document.");
        }

        resolve(data.text);
      } catch (err: any) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Erreur de lecture du fichier."));
    reader.readAsDataURL(file);
  });
}

/**
 * 2. Normalisation des dates et chaînes de caractères
 */
export function normalizeDate(rawDate?: string): { formattedDate?: string; isCurrent: boolean } {
  if (!rawDate) return { formattedDate: undefined, isCurrent: false };

  const clean = rawDate.trim().toLowerCase();
  if (['présent', 'actuel', 'aujourd\'hui', 'en cours', 'present', 'now'].includes(clean)) {
    return { formattedDate: undefined, isCurrent: true };
  }

  // Format MM/YYYY ou YYYY-MM ou YYYY
  const matchMMYYYY = clean.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (matchMMYYYY) {
    const month = matchMMYYYY[1].padStart(2, '0');
    return { formattedDate: `${matchMMYYYY[2]}-${month}`, isCurrent: false };
  }

  const matchYYYY = clean.match(/^(\d{4})$/);
  if (matchYYYY) {
    return { formattedDate: matchYYYY[1], isCurrent: false };
  }

  return { formattedDate: rawDate.trim(), isCurrent: false };
}

/**
 * 3. Heuristic / Local Fallback Parser for CV when AI API is unavailable
 */
export function parseCVWithHeuristics(cvText: string): ParsedCVData {
  const lines = cvText.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Basic email & phone detection
  const emailMatch = cvText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = cvText.match(/(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/);
  const linkedinMatch = cvText.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);

  let firstName = "";
  let lastName = "";
  if (lines.length > 0) {
    const nameParts = lines[0].replace(/[^a-zA-Zà-ÿÀ-Ÿ\s-]/g, '').trim().split(/\s+/);
    if (nameParts.length >= 2) {
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(" ");
    } else if (nameParts.length === 1) {
      lastName = nameParts[0];
    }
  }

  // Extract skills dynamically based on common keywords
  const skillsDetected: ParsedCVSkill[] = [];
  const knownSkills = [
    "Analyse financière", "Gestion de patrimoine", "Relation client", "Vente conseil",
    "Négociation", "Communication", "Marketing digital", "Gestion de projet",
    "Excel", "PowerPoint", "CRM", "Management", "Comptabilité", "Audit"
  ];

  knownSkills.forEach(sk => {
    if (new RegExp(`\\b${sk}\\b`, 'i').test(cvText)) {
      skillsDetected.push({
        name: sk,
        level: "Avancé",
        category: "Général"
      });
    }
  });

  return {
    identity: {
      firstName,
      lastName,
      fullName: firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || "Candidat CV",
      email: emailMatch ? emailMatch[0] : "",
      phone: phoneMatch ? phoneMatch[0] : "",
      title: lines.length > 1 ? lines[1].substring(0, 80) : "Profil professionnel",
      bio: "Profil extrait automatiquement depuis le CV.",
      linkedInUrl: linkedinMatch ? `https://www.${linkedinMatch[0]}` : ""
    },
    experiences: [],
    educations: [],
    hardSkills: skillsDetected,
    toolsAndSoftware: ["Excel", "Word", "PowerPoint"].filter(t => new RegExp(`\\b${t}\\b`, 'i').test(cvText)),
    softSkills: ["Rigueur", "Autonomie", "Esprit d'équipe"].filter(s => new RegExp(`\\b${s}\\b`, 'i').test(cvText)),
    languages: cvText.toLowerCase().includes("anglais") ? [{ language: "Anglais", level: "B2 / Professionnel" }] : [],
    certifications: [],
    projects: [],
    volunteerWork: [],
    interests: []
  };
}

/**
 * 4. Post-traitement et synchronisation des certifications (TOEIC, TAGE MAGE, AMF, CFA, etc.)
 */
export function postProcessCertifications(data: ParsedCVData, rawText: string): ParsedCVData {
  const result: ParsedCVData = JSON.parse(JSON.stringify(data));
  result.certifications = result.certifications || [];
  result.languages = result.languages || [];

  const textLower = (rawText || "").toLowerCase();

  // 1. Double-rattachement TOEIC / Tests de langues
  result.languages.forEach(lang => {
    const langName = (lang.language || "").toLowerCase();
    const certName = (lang.certification || "").toLowerCase();
    const scoreStr = lang.score || "";

    if (certName.includes("toeic") || langName.includes("toeic") || textLower.includes("toeic")) {
      const exists = result.certifications.some(c => c.name.toLowerCase().includes("toeic"));
      if (!exists) {
        const toeicMatch = rawText.match(/toeic[^\d]*(\d{3,4})(?:\/(\d{3,4}))?/i);
        const extractedScore = scoreStr || (toeicMatch ? `${toeicMatch[1]}/${toeicMatch[2] || 990}` : "745/990");
        result.certifications.push({
          name: "TOEIC Listening & Reading",
          issuer: "ETS Global",
          score: extractedScore,
          maxScore: "990",
          level: lang.level || "B2",
          source: data.source || "cv"
        });
      }
    }

    if (certName.includes("toefl") || textLower.includes("toefl")) {
      const exists = result.certifications.some(c => c.name.toLowerCase().includes("toefl"));
      if (!exists) {
        result.certifications.push({
          name: "TOEFL",
          issuer: "ETS",
          score: scoreStr || "",
          level: lang.level || "",
          source: data.source || "cv"
        });
      }
    }

    if (certName.includes("ielts") || textLower.includes("ielts")) {
      const exists = result.certifications.some(c => c.name.toLowerCase().includes("ielts"));
      if (!exists) {
        result.certifications.push({
          name: "IELTS",
          issuer: "British Council / IDP",
          score: scoreStr || "",
          level: lang.level || "",
          source: data.source || "cv"
        });
      }
    }
  });

  // 2. Reconnaissance TAGE MAGE
  const tageMageMatch = rawText.match(/tage\s*mage[^\d]*(\d{2,3})(?:\/(\d{3}))?/i);
  if (tageMageMatch || textLower.includes("tage mage")) {
    const exists = result.certifications.some(c => c.name.toLowerCase().includes("tage mage"));
    if (!exists) {
      const scoreVal = tageMageMatch ? tageMageMatch[1] : "";
      const maxVal = tageMageMatch && tageMageMatch[2] ? tageMageMatch[2] : "600";
      result.certifications.push({
        name: "TAGE MAGE",
        issuer: "FNEGE",
        score: scoreVal ? `${scoreVal}/${maxVal}` : "",
        maxScore: maxVal,
        source: data.source || "cv"
      });
    }
  }

  // 3. Certification AMF (Autorité des Marchés Financiers)
  if (textLower.includes("amf") || textLower.includes("marchés financiers")) {
    const exists = result.certifications.some(c => c.name.toLowerCase().includes("amf"));
    if (!exists) {
      result.certifications.push({
        name: "Certification AMF",
        issuer: "Autorité des Marchés Financiers",
        level: "Certifié",
        source: data.source || "cv"
      });
    }
  }

  // 4. Autres tests et certifications pro
  const otherTests = [
    { key: "cfa", name: "CFA (Chartered Financial Analyst)", issuer: "CFA Institute" },
    { key: "gmat", name: "GMAT", issuer: "GMAC" },
    { key: "gre", name: "GRE General Test", issuer: "ETS" },
    { key: "google analytics", name: "Google Analytics Certification", issuer: "Google" },
    { key: "linguaskill", name: "Linguaskill", issuer: "Cambridge Assessment English" }
  ];

  otherTests.forEach(test => {
    if (textLower.includes(test.key)) {
      const exists = result.certifications.some(c => c.name.toLowerCase().includes(test.key));
      if (!exists) {
        result.certifications.push({
          name: test.name,
          issuer: test.issuer,
          source: data.source || "cv"
        });
      }
    }
  });

  return result;
}

/**
 * 5. Analyse IA structurée du CV (et/ou LinkedIn) via /api/gemini
 */
export async function analyzeCVWithAI(cvText: string, linkedinText?: string): Promise<ParsedCVData> {
  const combinedRawText = `${cvText || ""}\n${linkedinText || ""}`;
  try {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'parseCV',
        payload: { cvText, linkedinText }
      })
    });

    if (!res.ok) {
      console.warn("[analyzeCVWithAI] Erreur réponse API, bascule sur l'analyseur heuristique.");
      const heuristic = parseCVWithHeuristics(combinedRawText);
      return postProcessCertifications(heuristic, combinedRawText);
    }

    const data = await res.json();
    if (data && data.parsed) {
      const structured = data.parsed as ParsedCVData;
      structured.source = linkedinText ? "cv+linkedin" : "cv";
      return postProcessCertifications(structured, combinedRawText);
    }

    const heuristic = parseCVWithHeuristics(combinedRawText);
    return postProcessCertifications(heuristic, combinedRawText);
  } catch (err) {
    console.warn("[analyzeCVWithAI] Exception lors de l'analyse, bascule sur l'analyseur local:", err);
    const heuristic = parseCVWithHeuristics(combinedRawText);
    return postProcessCertifications(heuristic, combinedRawText);
  }
}

/**
 * 6. Comparaison intelligente, détection d'enrichissement et gestion des conflits
 */
export function compareWithExistingProfile(
  extracted: ParsedCVData,
  existing: CandidateProfile
): CVMergeProposal {
  // Identité
  const identityData: ParsedCVIdentity = { ...extracted.identity };
  const existingIdentity: ParsedCVIdentity = {
    firstName: existing.firstName,
    lastName: existing.lastName,
    fullName: existing.fullName,
    email: existing.email,
    phone: existing.phone,
    title: existing.title,
    bio: existing.bio,
    city: existing.city,
    country: existing.country,
    linkedInUrl: existing.linkedInUrl,
    portfolioUrl: existing.portfolioUrl,
    githubUrl: existing.githubUrl
  };

  const hasNewIdentityData = Boolean(
    (identityData.email && identityData.email !== existing.email) ||
    (identityData.phone && identityData.phone !== existing.phone) ||
    (identityData.title && identityData.title !== existing.title) ||
    (identityData.city && identityData.city !== existing.city) ||
    (identityData.linkedInUrl && identityData.linkedInUrl !== existing.linkedInUrl)
  );

  // Expériences : détection des doublons, enrichissements et conflits
  const existingExps = existing.experiences || [];
  const expStatuses: ItemMergeStatus<ParsedCVExperience>[] = (extracted.experiences || []).map(extExp => {
    const extCompanyNorm = (extExp.company || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const extRoleNorm = (extExp.role || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    const match = existingExps.find(ex => {
      const exCompNorm = (ex.company || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const exRoleNorm = (ex.role || "").toLowerCase().replace(/[^a-z0-9]/g, "");

      return (
        (extCompanyNorm && exCompNorm.includes(extCompanyNorm)) ||
        (extCompanyNorm && extCompanyNorm.includes(exCompNorm)) ||
        (exRoleNorm === extRoleNorm && exCompNorm === extCompanyNorm)
      );
    });

    if (match) {
      // Vérifier si cette expérience apporte de nouvelles missions ou détails
      const hasNewMissions = (extExp.missions || []).some(m => !match.description?.includes(m) && !match.missions?.includes(m));
      const hasNewKpis = (extExp.kpis || []).some(k => !match.kpis?.includes(k));
      const hasNewSkills = (extExp.skills || []).some(s => !match.skills?.includes(s));

      if (hasNewMissions || hasNewKpis || hasNewSkills) {
        return {
          item: extExp,
          status: 'enriched',
          matchedExisting: match,
          reason: 'Nouvelles missions / réalisations à fusionner dans l\'expérience existante'
        };
      }

      return {
        item: extExp,
        status: 'duplicate',
        matchedExisting: match,
        reason: 'Expérience déjà complète dans votre profil'
      };
    }

    return {
      item: extExp,
      status: 'new'
    };
  });

  // Formations
  const existingEdus = existing.educations || [];
  const eduStatuses: ItemMergeStatus<ParsedCVEducation>[] = (extracted.educations || []).map(extEdu => {
    const extSchoolNorm = (extEdu.school || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const extDegreeNorm = (extEdu.degree || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    const match = existingEdus.find(ed => {
      const edSchoolNorm = (ed.school || ed.institution || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const edDegreeNorm = (ed.degree || "").toLowerCase().replace(/[^a-z0-9]/g, "");

      return (
        (extSchoolNorm && edSchoolNorm.includes(extSchoolNorm)) ||
        (extDegreeNorm && edDegreeNorm.includes(extDegreeNorm))
      );
    });

    if (match) {
      return {
        item: extEdu,
        status: 'duplicate',
        matchedExisting: match,
        reason: 'Formation similaire déjà enregistrée'
      };
    }

    return {
      item: extEdu,
      status: 'new'
    };
  });

  // Compétences Hard
  const existingHardSkills = existing.hardSkills || [];
  const skillStatuses: ItemMergeStatus<ParsedCVSkill>[] = (extracted.hardSkills || []).map(extSk => {
    const nameNorm = extSk.name.toLowerCase().trim();
    const match = existingHardSkills.find(s => s.name.toLowerCase().trim() === nameNorm);

    if (match) {
      return {
        item: extSk,
        status: 'duplicate',
        matchedExisting: match,
        reason: 'Compétence déjà répertoriée'
      };
    }

    return { item: extSk, status: 'new' };
  });

  // Outils
  const existingTools = new Set((existing.toolsAndSoftware || []).map(t => t.toLowerCase().trim()));
  const toolStatuses: ItemMergeStatus<string>[] = (extracted.toolsAndSoftware || []).map(t => {
    const isDup = existingTools.has(t.toLowerCase().trim());
    return {
      item: t,
      status: isDup ? 'duplicate' : 'new',
      reason: isDup ? 'Outil déjà présent' : undefined
    };
  });

  // Soft Skills
  const existingSoft = new Set((existing.softSkills || []).map(s => s.toLowerCase().trim()));
  const softStatuses: ItemMergeStatus<string>[] = (extracted.softSkills || []).map(s => {
    const isDup = existingSoft.has(s.toLowerCase().trim());
    return {
      item: s,
      status: isDup ? 'duplicate' : 'new',
      reason: isDup ? 'Aptitude déjà présente' : undefined
    };
  });

  // Langues
  const existingLangs = existing.languagesList || [];
  const langStatuses: ItemMergeStatus<ParsedCVLanguage>[] = (extracted.languages || []).map(extLang => {
    const norm = extLang.language.toLowerCase().trim();
    const match = existingLangs.find(l => l.language.toLowerCase().trim() === norm);

    if (match) {
      return {
        item: extLang,
        status: 'update',
        matchedExisting: match,
        reason: 'Mise à jour du niveau ou certification possible'
      };
    }

    return { item: extLang, status: 'new' };
  });

  // Certifications
  const existingCerts = existing.certificationsList || [];
  const certStatuses: ItemMergeStatus<ParsedCVCertification>[] = (extracted.certifications || []).map(extCert => {
    const norm = extCert.name.toLowerCase().trim();
    const match = existingCerts.find(c => c.name.toLowerCase().trim() === norm || (c.title && c.title.toLowerCase().trim() === norm));

    if (match) {
      return {
        item: extCert,
        status: 'duplicate',
        matchedExisting: match,
        reason: 'Certification déjà renseignée'
      };
    }

    return { item: extCert, status: 'new' };
  });

  // Projets
  const existingProjects = existing.projectsList || [];
  const projectStatuses: ItemMergeStatus<ParsedCVProject>[] = (extracted.projects || []).map(extProj => {
    const norm = extProj.name.toLowerCase().trim();
    const match = existingProjects.find(p => p.name.toLowerCase().trim() === norm || (p.title && p.title.toLowerCase().trim() === norm));

    if (match) {
      return {
        item: extProj,
        status: 'duplicate',
        matchedExisting: match,
        reason: 'Projet similaire existant'
      };
    }

    return { item: extProj, status: 'new' };
  });

  // Engagements
  const existingVol = existing.volunteerWork || [];
  const volStatuses: ItemMergeStatus<ParsedCVVolunteer>[] = (extracted.volunteerWork || []).map(extVol => {
    const norm = extVol.organization.toLowerCase().trim();
    const match = existingVol.find(v => v.organization.toLowerCase().trim() === norm);

    if (match) {
      return {
        item: extVol,
        status: 'duplicate',
        matchedExisting: match,
        reason: 'Engagement déjà renseigné'
      };
    }

    return { item: extVol, status: 'new' };
  });

  // Intérêts
  const existingInterests = new Set((existing.interests || []).map(i => i.toLowerCase().trim()));
  const interestStatuses: ItemMergeStatus<string>[] = (extracted.interests || []).map(i => {
    const isDup = existingInterests.has(i.toLowerCase().trim());
    return {
      item: i,
      status: isDup ? 'duplicate' : 'new'
    };
  });

  // Calcul des statistiques globales
  const allStatuses = [
    ...expStatuses.map(s => s.status),
    ...eduStatuses.map(s => s.status),
    ...skillStatuses.map(s => s.status),
    ...toolStatuses.map(s => s.status),
    ...softStatuses.map(s => s.status),
    ...langStatuses.map(s => s.status),
    ...certStatuses.map(s => s.status),
    ...projectStatuses.map(s => s.status),
    ...volStatuses.map(s => s.status),
    ...interestStatuses.map(s => s.status)
  ];

  const totalDetected = allStatuses.length + (hasNewIdentityData ? 1 : 0);
  const newItemsCount = allStatuses.filter(s => s === 'new').length + (hasNewIdentityData ? 1 : 0);
  const duplicateCount = allStatuses.filter(s => s === 'duplicate').length;
  const updateCount = allStatuses.filter(s => s === 'update').length;

  return {
    rawParsed: extracted,
    identity: {
      existing: existingIdentity,
      detected: identityData,
      hasNewData: hasNewIdentityData
    },
    experiences: expStatuses,
    educations: eduStatuses,
    hardSkills: skillStatuses,
    toolsAndSoftware: toolStatuses,
    softSkills: softStatuses,
    languages: langStatuses,
    certifications: certStatuses,
    projects: projectStatuses,
    volunteerWork: volStatuses,
    interests: interestStatuses,
    stats: {
      totalDetected,
      newItemsCount,
      duplicateCount,
      updateCount
    }
  };
}

/**
 * 6. Application de la fusion dans le profil sans supprimer aucune donnée existante
 */
export function applyCVMerge(
  proposal: CVMergeProposal,
  existingProfile: CandidateProfile,
  mode: 'merge' | 'add_new_only' = 'merge'
): CandidateProfile {
  const updated: CandidateProfile = JSON.parse(JSON.stringify(existingProfile));

  // Identité : enrichir uniquement les champs vides ou en cas de fusion autorisée
  if (proposal.identity.hasNewData && mode === 'merge') {
    const det = proposal.identity.detected;
    if (det.email && !updated.email) updated.email = det.email;
    if (det.phone && (!updated.phone || updated.phone === "06 12 34 56 78")) updated.phone = det.phone;
    if (det.title && !updated.title) updated.title = det.title;
    if (det.city && !updated.city) updated.city = det.city;
    if (det.country && !updated.country) updated.country = det.country;
    if (det.linkedInUrl && !updated.linkedInUrl) updated.linkedInUrl = det.linkedInUrl;
    if (det.bio && !updated.bio) updated.bio = det.bio;
  }

  // Expériences : ajouter les nouvelles et enrichir les existantes
  proposal.experiences.forEach((st, idx) => {
    if (st.status === 'new' || (st.status === 'duplicate' && mode === 'add_new_only')) {
      const newExp: DetailedExperience = {
        id: `exp_cv_${Date.now()}_${idx}`,
        role: st.item.role,
        company: st.item.company,
        location: st.item.location || "",
        contractType: st.item.contractType || "Autre",
        startDate: st.item.startDate || "",
        endDate: st.item.endDate || "",
        isCurrent: Boolean(st.item.isCurrent),
        period: st.item.startDate ? `${st.item.startDate} → ${st.item.isCurrent ? 'Aujourd\'hui' : st.item.endDate || 'N/A'}` : 'Période renseignée',
        description: st.item.description || (st.item.missions ? st.item.missions.join("\n• ") : ""),
        missions: st.item.missions || [],
        responsibilities: st.item.responsibilities || [],
        achievements: st.item.achievements || [],
        kpis: st.item.kpis || [],
        skills: st.item.skills || [],
        tools: st.item.tools || [],
        sector: st.item.sector || "",
        context: st.item.context || "",
        source: st.item.source || "cv"
      };
      updated.experiences = [...(updated.experiences || []), newExp];
    } else if ((st.status === 'enriched' || st.status === 'duplicate' || st.status === 'update') && st.matchedExisting) {
      // Enrichment in-place without duplicating the experience card
      const target = updated.experiences?.find(e => e.id === st.matchedExisting.id || (e.company === st.matchedExisting.company && e.role === st.matchedExisting.role));
      if (target) {
        const missionsSet = new Set(target.missions || []);
        if (target.description && !target.missions?.length) missionsSet.add(target.description);
        (st.item.missions || []).forEach(m => missionsSet.add(m));
        target.missions = Array.from(missionsSet);

        const respSet = new Set(target.responsibilities || []);
        (st.item.responsibilities || []).forEach(r => respSet.add(r));
        target.responsibilities = Array.from(respSet);

        const achSet = new Set(target.achievements || []);
        (st.item.achievements || []).forEach(a => achSet.add(a));
        target.achievements = Array.from(achSet);

        const kpisSet = new Set(target.kpis || []);
        (st.item.kpis || []).forEach(k => kpisSet.add(k));
        target.kpis = Array.from(kpisSet);

        const toolsSet = new Set(target.tools || []);
        (st.item.tools || []).forEach(t => toolsSet.add(t));
        target.tools = Array.from(toolsSet);

        const skillsSet = new Set(target.skills || []);
        (st.item.skills || []).forEach(s => skillsSet.add(s));
        target.skills = Array.from(skillsSet);

        if (st.item.sector && !target.sector) target.sector = st.item.sector;
        if (st.item.context && !target.context) target.context = st.item.context;
        if (st.item.location && !target.location) target.location = st.item.location;
      }
    }
  });

  // Formations : ajouter les nouvelles
  const newEducations: DetailedEducation[] = proposal.educations
    .filter(st => st.status === 'new' || (st.status === 'duplicate' && mode === 'add_new_only'))
    .map((st, idx) => ({
      id: `edu_cv_${Date.now()}_${idx}`,
      school: st.item.school,
      degree: st.item.degree,
      domain: st.item.domain || "",
      startDate: st.item.startDate || "",
      endDate: st.item.endDate || "",
      isCurrent: Boolean(st.item.isCurrent),
      description: st.item.description || ""
    }));

  updated.educations = [...(updated.educations || []), ...newEducations];

  // Compétences Hard : ajouter les nouvelles
  const newSkills: HardSkillItem[] = proposal.hardSkills
    .filter(st => st.status === 'new')
    .map((st, idx) => ({
      id: `hs_cv_${Date.now()}_${idx}`,
      name: st.item.name,
      level: st.item.level || "Avancé",
      category: st.item.category || "Général"
    }));

  updated.hardSkills = [...(updated.hardSkills || []), ...newSkills];

  // Also update legacy string array for skills compatibility
  const legacySkillNames = new Set(updated.skills || []);
  newSkills.forEach(s => legacySkillNames.add(s.name));
  updated.skills = Array.from(legacySkillNames);

  // Outils
  const existingToolsSet = new Set(updated.toolsAndSoftware || []);
  proposal.toolsAndSoftware.forEach(st => {
    if (st.status === 'new') existingToolsSet.add(st.item);
  });
  updated.toolsAndSoftware = Array.from(existingToolsSet);

  // Soft Skills
  const existingSoftSet = new Set(updated.softSkills || []);
  proposal.softSkills.forEach(st => {
    if (st.status === 'new') existingSoftSet.add(st.item);
  });
  updated.softSkills = Array.from(existingSoftSet);

  // Langues
  const existingLangs = [...(updated.languagesList || [])];
  proposal.languages.forEach((st, idx) => {
    if (st.status === 'new') {
      existingLangs.push({
        id: `lang_cv_${Date.now()}_${idx}`,
        language: st.item.language,
        level: st.item.level,
        cefrLevel: st.item.level,
        certification: st.item.certification,
        score: st.item.score
      });
    } else if (st.status === 'update' && st.matchedExisting) {
      // Enrich existing language if current certification or score is missing
      if (st.item.certification && !st.matchedExisting.certification) {
        st.matchedExisting.certification = st.item.certification;
      }
      if (st.item.score && !st.matchedExisting.score) {
        st.matchedExisting.score = st.item.score;
      }
    }
  });
  updated.languagesList = existingLangs;

  // Certifications
  const newCerts: CertificationItem[] = proposal.certifications
    .filter(st => st.status === 'new')
    .map((st, idx) => ({
      id: `cert_cv_${Date.now()}_${idx}`,
      name: st.item.name,
      title: st.item.name,
      issuer: st.item.issuer || "",
      organization: st.item.issuer || "",
      date: st.item.date || "",
      score: st.item.score || "",
      maxScore: st.item.maxScore || "",
      level: st.item.level || "",
      credentialId: st.item.credentialId || "",
      verificationUrl: st.item.verificationUrl || "",
      source: st.item.source || "cv"
    }));

  updated.certificationsList = [...(updated.certificationsList || []), ...newCerts];

  // Projets
  const newProjects: ProjectItem[] = proposal.projects
    .filter(st => st.status === 'new')
    .map((st, idx) => ({
      id: `proj_cv_${Date.now()}_${idx}`,
      name: st.item.name,
      title: st.item.name,
      description: st.item.description || "",
      role: st.item.role || "",
      date: st.item.date || "",
      technologies: st.item.technologies || [],
      results: st.item.results || ""
    }));

  updated.projectsList = [...(updated.projectsList || []), ...newProjects];

  // Engagements / Bénévole
  const newVolunteering: VolunteerItem[] = proposal.volunteerWork
    .filter(st => st.status === 'new')
    .map((st, idx) => ({
      id: `vol_cv_${Date.now()}_${idx}`,
      organization: st.item.organization,
      role: st.item.role || "",
      dates: st.item.dates || "",
      description: st.item.description || "",
      achievements: st.item.achievements || ""
    }));

  updated.volunteerWork = [...(updated.volunteerWork || []), ...newVolunteering];

  // Intérêts
  const existingInterestsSet = new Set(updated.interests || []);
  proposal.interests.forEach(st => {
    if (st.status === 'new') existingInterestsSet.add(st.item);
  });
  updated.interests = Array.from(existingInterestsSet);

  // Persistence via dbStore
  dbStore.updateProfile(updated);

  return updated;
}
