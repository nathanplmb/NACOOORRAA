export interface DetailedExperience {
  id: string;
  role: string;
  company: string;
  location?: string;
  contractType?: string; // Stage, Alternance, CDI, CDD, Bénévolat, etc.
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  period?: string;
  description: string;
  missions?: string[];
  responsibilities?: string[];
  achievements?: string[];
  kpis?: string[];
  skills?: string[];
  tools?: string[];
  sector?: string;
  context?: string;
  source?: "cv" | "linkedin" | "profile" | "cv+linkedin";
}

export interface DetailedEducation {
  id: string;
  institution?: string;
  school?: string;
  degree: string;
  fieldOfStudy?: string;
  domain?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  period?: string;
  isCurrent?: boolean;
  status?: string;
  description?: string;
}

export interface HardSkillItem {
  id?: string;
  name: string;
  level: "Débutant" | "Intermédiaire" | "Avancé" | "Expert";
  category?: string;
}

export interface LanguageItem {
  id?: string;
  language: string;
  level: string; // e.g. "B2", "Langue maternelle", "C1"
  cefrLevel?: string;
  certification?: string;
  score?: string;
}

export interface CertificationItem {
  id?: string;
  name: string;
  title?: string;
  issuer?: string;
  organization?: string;
  date?: string;
  issueDate?: string;
  score?: string;
  maxScore?: string;
  level?: string;
  credentialId?: string;
  licenseId?: string;
  verificationUrl?: string;
  source?: "cv" | "linkedin" | "profile" | "cv+linkedin";
}

export interface ProjectItem {
  id?: string;
  name: string;
  title?: string;
  description?: string;
  role?: string;
  date?: string;
  url?: string;
  technologies?: string[];
  results?: string;
}

export interface VolunteerItem {
  id?: string;
  organization: string;
  role?: string;
  date?: string;
  dates?: string;
  description?: string;
  achievements?: string;
}

export interface CandidateProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  email: string;
  phone: string;
  title?: string;
  avatarUrl?: string;
  driverLicense?: string;
  city?: string;
  country?: string;
  mobility?: string;
  linkedInUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;

  currentSituation: string;
  currentAlternance: string;
  bio: string;

  // Objectifs & Préférences
  targetTitles?: string[];
  targetSectors?: string[];
  targetCompanies?: string[];
  contractTypes?: string[];
  startDateTarget?: string;
  durationTarget?: string;
  minSalary?: string;
  workMode?: "hybride" | "remote" | "presentiel" | "indifferent";
  idealPositionSearch?: string;
  avoidSectors?: string[];
  redFlags?: string[];

  // Collections
  experiences: DetailedExperience[];
  educations?: DetailedEducation[];
  hardSkills?: HardSkillItem[];
  toolsAndSoftware?: string[];
  softSkills?: string[];
  languagesList?: LanguageItem[];
  certificationsList?: CertificationItem[];
  projectsList?: ProjectItem[];
  volunteerWork?: VolunteerItem[];
  interests?: string[];

  // Legacy compatibility fields
  skills: string[];
  targetMasters: string[];
  languages: string[];
  certifications: string[];
  projects: Array<{ id: string; title: string; description: string }>;

  profileCompletionScore: number; // 0 - 100
}

export type OpportunityStatus = 'saved' | 'to_prepare' | 'to_study' | 'to_apply';

export interface RecruiterContact {
  name?: string;
  role?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  linkedinUrl?: string;
}

export interface EnterpriseDetails {
  presentation?: string;
  parentGroup?: string;
  secteur?: string;
  taille?: string;
  siege?: string;
  chiffresCles?: Array<{ label: string; value: string }>;
  faitsMarquants?: string[];
  partenairesClients?: string[];
}

export interface WorkflowStepItem {
  step: number; // 1 to 9
  id: string;
  title: string;
  desc: string;
  status: 'completed' | 'current' | 'upcoming';
  date?: string;
  notes?: string;
}

export interface ExtractedJobInfo {
  missions: string[];
  documentsDemandes?: string[];
  avantages?: string[];
  avantagesEnvironnement?: string[];
  competencesRequises: string[];
  competencesAppreciees: string[];
  softSkills: string[];
  outilsLogiciels: string[];
  formation: string;
  experienceRequise: string;
  languesRequises: string[];
  etapesRecrutement?: string[];
  recruiterContact?: RecruiterContact;
  entrepriseDetails?: EnterpriseDetails;
}

export interface Opportunity {
  id: string;
  companyId: string;
  companyName: string;
  title: string; // e.g., "Conseiller Clientèle Patrimoniale"
  contractType: 'Apprentissage' | 'Professionnalisation' | 'Stage' | 'CDI' | 'CDD' | 'Autre';
  duration: string; // e.g., "12 mois"
  location: string; // e.g., "Commentry", "Clermont-Ferrand"
  status: OpportunityStatus;
  salary?: string; // e.g., "1400€/mois"
  startDate?: string;
  deadline?: string;
  url?: string;
  notes: string;
  privateNotes?: string;
  workflowStep?: number; // 1 to 9
  workflowHistory?: WorkflowStepItem[];
  recruiterContact?: RecruiterContact;
  createdAt: string;
  updatedAt: string;
  aiExtracted: boolean;
  extractedInfo?: ExtractedJobInfo;
}

export type ContactCategory = 'recruiter' | 'alumni' | 'student' | 'sector_pro' | 'other_pro' | 'other';

export type DimensionCategoryType = 
  | 'status'                // Statut / Parcours (Étudiant, Alternant, Stagiaire, Diplômé, Enseignant...)
  | 'recruitment'           // Recrutement / RH (Recruteur, Talent Acquisition, Campus Recruiter, HR...)
  | 'professional_function' // Fonction professionnelle (Finance, Banque, Assurance, Fintech, Marketing, Commercial...)
  | 'seniority'             // Niveau / Seniorité (Junior, Confirmé, Senior, Manager, Director, C-Level, Founder...)
  | 'sector'                // Secteur d'activité (Banque, Finance, FinTech, Assurance, Conseil, Tech...)
  | 'academic'              // Relation académique (Alumni, Ancien camarade, Même établissement, Enseignant...)
  | 'professional_relation' // Relation pro (Collègue, Ancien collègue, Manager, Partenaire, Mentor...)
  | 'networking';           // Intérêt réseau (Recrutement, Networking, Alumni, Conseil carrière, Mentor...)

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ContactCategoryItem {
  category: DimensionCategoryType | string;
  subcategory: string;
  confidence: ConfidenceLevel;
  reason: string;
}

export interface NetworkingRelevanceItem {
  type: string;
  confidence: ConfidenceLevel;
  reason?: string;
  pillar?: string;
  context?: string;
  recommendation?: string;
}

export interface ProfessionalProfileDetails {
  currentFunction?: string;
  level?: string;
  sector?: string;
  company?: string;
  isTargetSector?: boolean;
}

export type ContactNetworkingStatus = 'to_contact' | 'contacted' | 'exchanging' | 'interview_done' | 'not_interested';

export type NetworkingTone = 'tutoiement' | 'vouvoiement';
export type NetworkingTemplateId = 'point_commun' | 'opportunite' | 'alumni_recommandation' | 'tres_personnalise';
export type NetworkingFollowUpId = 'relance_1' | 'relance_2' | 'relance_3';
export type NetworkingChannel = 'linkedin' | 'email' | 'linkedin_email';
export type NetworkingGoal = 'stage' | 'alternance' | 'emploi' | 'networking_echange' | 'recrutement_equipe' | 'conseils_carriere';

export interface OutreachMessageLogItem {
  id: string;
  stage: number; // 0: initial, 1: relance 1, 2: relance 2, 3: relance 3
  templateId: string;
  channel: NetworkingChannel;
  tone: NetworkingTone;
  subject?: string;
  message: string;
  sentDate: string;
  status: 'draft' | 'sent' | 'replied' | 'ignored';
}

export interface NetworkingOutreachStrategy {
  recommendedTemplateId: NetworkingTemplateId;
  recommendedTone: NetworkingTone;
  recommendedChannel: NetworkingChannel;
  toneReason: string;
  templateReason: string;
  seniorityLevel: 'junior_accessible' | 'mid_level' | 'senior_decision_maker';
  commonPointsFound: string[];
  suggestedSubjectLine: {
    standard: string;
    personalized: string;
  };
  followUpPlan: {
    delayDays: number;
    preferredDays: string;
    relance1: string;
    relance2: string;
    relance3: string;
  };
}

export interface ContactHistoryEvent {
  id: string;
  type: 'import' | 'note_added' | 'category_changed' | 'message_generated' | 'opportunity_linked' | 'profile_updated' | 'outreach_sent' | 'follow_up_scheduled';
  label: string;
  timestamp: string;
}

export interface Contact {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  companyId: string;
  companyName: string;
  jobTitle: string;
  normalizedJobTitle: string; // Normalized by Gemini
  category: ContactCategory; // Primary/legacy category for backwards compatibility
  relevanceScore: number; // 0 to 100
  connectionPoints: string[]; // e.g., ["Même établissement : IUT Clermont Auvergne"]
  academicPath?: string;
  previousCompanies: string[];
  notes: string;
  linkedInUrl?: string;
  email?: string;
  phone?: string;
  contactUrl?: string; // Internet link or application portal URL when direct contact isn't available
  aiCustomMessage?: string; // Personalized outreach message generated by Gemini
  createdAt: string;
  // Enriched CRM fields
  sector?: string;
  profileLevel?: string;
  networkingStatus?: ContactNetworkingStatus;
  opportunityId?: string;
  opportunityTitle?: string;
  history?: ContactHistoryEvent[];

  // Multidimensional classification
  categories?: ContactCategoryItem[];
  professionalProfile?: ProfessionalProfileDetails;
  networkingRelevance?: NetworkingRelevanceItem[];
  summary?: string;
  education?: string[];
  pastCompanies?: string[];

  // Networking Framework & Follow-up Tracking
  outreachTone?: NetworkingTone;
  outreachChannel?: NetworkingChannel;
  outreachTemplateId?: NetworkingTemplateId | string;
  outreachGoal?: NetworkingGoal | string;
  initialMessageSentDate?: string;
  lastOutreachDate?: string;
  nextFollowUpDate?: string;
  followUpStage?: number; // 0 = non contacté, 1 = initial envoyé, 2 = relance 1 envoyée, 3 = relance 2 envoyée, 4 = relance 3 envoyée
  outreachMessagesLog?: OutreachMessageLogItem[];
}

export interface CompanyFieldMetadata {
  value: string;
  source: 'manual' | 'ai';
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  logoUrl?: string;
  sector?: string;
  website?: string;
  description?: string;
  size?: string;
  location?: string;
  metrics?: Array<{ label: string; value: string }>;
  
  // Detailed candidate prep structured fields
  foundingYear?: string;
  companyStatus?: string; // start-up, PME, ETI, grand groupe, association, administration publique
  geographicPresence?: string;
  parentGroup?: string;
  revenue?: string;
  recentDynamics?: string;
  notableClients?: string;
  values?: string;
  csrCommitment?: string;
  distinctions?: string;
  hrContactEmail?: string;
  careersPageUrl?: string;

  fieldSources?: Record<string, 'manual' | 'ai'>;

  lastEnrichedAt?: string;
  enrichmentStatus?: 'enriched' | 'limited' | 'not_found' | 'pending';
  notes: string;
  createdAt: string;
  // Summary counts calculated reactively or aggregated
  opportunityCount: number;
  contactCount: number;
  noteCount: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  type: 'interview' | 'deadline' | 'follow_up' | 'other';
  opportunityId?: string;
  opportunityTitle?: string;
  companyName?: string;
  notes: string;
  completed: boolean;
  createdAt: string;
  googleEventId?: string;
  isGoogleEvent?: boolean;
  location?: string;
  htmlLink?: string;
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  due?: string; // RFC 3339 timestamp e.g. 2026-09-25T00:00:00.000Z
  status: 'needsAction' | 'completed';
  completed?: string;
  deleted?: boolean;
  hidden?: boolean;
  parent?: string;
  position?: string;
  updated?: string;
  selfLink?: string;
  listId?: string;
}

export interface GoogleTaskList {
  id: string;
  title: string;
  updated?: string;
  selfLink?: string;
}

export interface DocumentFile {
  id: string;
  title: string;
  type: 'CV' | 'Lettre de Motivation' | 'Autre';
  content: string; // text content for Gemini indexing
  fileName: string;
  uploadedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  personaId: string; // 'general' | 'interview' | 'cv_letter' | 'networking' | 'negotiation'
  personaName: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
}

export interface ToastState {
  isOpen: boolean;
  message: string;
  type: "success" | "error" | "info" | "ai";
}

// ============================================================================
// NACORA CV FRAMEWORK — STRUCTURE DE DONNÉES OFFICIELLE
// ============================================================================

export interface StructuredCVCoordonnees {
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  linkedin: string;
  ville: string;
  codePostal?: string;
}

export interface StructuredCVFormation {
  id: string;
  etablissement: string;
  ville: string;
  diplome_intitule_exact: string;
  dateDebut: string;
  dateFin: string;
  coursPertinents?: string[];
  specialisation?: string;
  projetsAcademiques?: string;
}

export interface StructuredCVExperience {
  id: string;
  type: "professionnelle" | "associative";
  poste: string;
  entreprise: string;
  ville: string;
  dateDebut: string;
  dateFin: string;
  missions: string[]; // Bullet points avec verbes d'action
  resultats?: string[]; // Résultats quantifiés (chiffres réels vérifiés)
  competencesTransferables: string[]; // Ligne en italique
  source: "utilisateur" | "ia_reformulation";
}

export interface StructuredCVLangue {
  langue: string;
  niveauAdjectif: "Débutant" | "Intermédiaire" | "Avancé" | "Courant" | "Bilingue" | "Langue Maternelle";
  niveauCECRL: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "Natif";
  certification?: string;
}

export interface StructuredCVCompetences {
  langues: StructuredCVLangue[];
  informatique: string[]; // Logiciels & Progiciels
  techniques: string[]; // Hard skills
  comportementales: string[]; // Soft skills
}

export interface StructuredCVCentreInteret {
  id: string;
  libelle: string;
  quantification?: string;
  competenceAssociee?: string;
}

export interface StructuredCVMetadata {
  nomFichierSuggere: string;
  version: string;
  poste_cible_adapte_pour?: string;
  opportunityId?: string;
  derniere_modification: string;
}

export interface StructuredCV {
  id: string;
  title: string;
  accroche?: string;
  photo?: {
    url?: string;
    statut_professionnel: boolean;
  };
  coordonnees: StructuredCVCoordonnees;
  formations: StructuredCVFormation[];
  experiences: StructuredCVExperience[];
  competences: StructuredCVCompetences;
  centresInteret: StructuredCVCentreInteret[];
  metadonnees: StructuredCVMetadata;
}

