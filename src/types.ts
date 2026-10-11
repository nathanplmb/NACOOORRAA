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

export type OpportunityStatus = 
  | 'to_explore'
  | 'to_prepare'
  | 'applied'
  | 'in_process'
  | 'saved' 
  | 'to_study' 
  | 'to_apply' 
  | 'candidated' 
  | 'interview_1' 
  | 'interview_2' 
  | 'interview_3' 
  | 'interview' 
  | 'proposal' 
  | 'refused' 
  | 'archived';

export interface RecruiterContact {
  id?: string;
  contactId?: string;
  name?: string;
  role?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  linkedinUrl?: string;
  meetingDate?: string;
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
  stepName?: string;
  desc: string;
  status: 'completed' | 'current' | 'upcoming';
  date?: string;
  notes?: string;
  completed?: boolean;
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
  contactIds?: string[];
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

export type ContactNetworkingStatus = 
  | 'a_contacter'
  | 'demande_envoyee'
  | 'connexion_acceptee'
  | 'message_envoye'
  | 'en_attente_reponse'
  | 'reponse_recue'
  | 'reponse_a_traiter'
  | 'echange_en_cours'
  | 'appel_prevu'
  | 'echange_realise'
  | 'opportunite_detectee'
  | 'candidature_envoyee'
  | 'relance_a_faire'
  | 'en_attente'
  | 'termine'
  | 'sans_suite'
  // Backwards compatibility
  | 'to_contact' 
  | 'contacted' 
  | 'exchanging' 
  | 'interview_done' 
  | 'not_interested';

export type ConversationMessageSender = 'nathan' | 'contact' | 'system' | 'note';

export interface ConversationMessage {
  id: string;
  sender: ConversationMessageSender;
  text: string;
  timestamp: string; // ISO string
  channel?: 'linkedin' | 'email' | 'phone' | 'in_person';
  subject?: string;
  stage?: NetworkingContactStage;
  status?: 'sent' | 'received' | 'draft';
  importSource?: 'linkedin_csv' | 'email' | 'paste' | 'manual';
  importedAt?: string;
  confidenceScore?: number;
}

export interface ContactNextAction {
  type: string; // e.g. "relance_1", "repondre", "appel", "recontacter"
  label: string; // e.g. "Relance 1 à effectuer", "Répondre à sa proposition d'échange"
  dueDate?: string; // YYYY-MM-DD
  priority: 'urgent' | 'to_do' | 'upcoming' | 'pending';
  completed?: boolean;
}

// Categories of Approach (5 Categories)
export type NetworkingCategory = 
  | 'connexion_premier_contact'
  | 'networking_echange'
  | 'opportunite'
  | 'recommandation'
  | 'tres_personnalise';

// Subtypes tailored to each category
export type NetworkingSubType =
  // 1. Connexion / Premier contact
  | 'point_commun'
  | 'parcours_metier'
  | 'entreprise_secteur'
  // 2. Networking / Échange
  | 'decouvrir_metier'
  | 'comprendre_secteur'
  | 'comprendre_entreprise'
  | 'parcours_personnel'
  // 3. Opportunité
  | 'stage'
  | 'alternance'
  | 'premier_emploi_cdi'
  | 'recrutement'
  // 4. Recommandation / Mise en relation
  | 'apres_echange_collaborateur'
  | 'alumni_ecole'
  | 'recommandation_interne'
  | 'demande_orientation'
  // 5. Très personnalisé
  | 'actualite_projet'
  | 'publication_linkedin'
  | 'transaction_deal'
  | 'parcours_remarquable'
  | 'evenement_intervention';

// Stages of Contact (6 Stages)
export type NetworkingContactStage =
  | 'demande_connexion'
  | 'message_apres_acceptation'
  | 'premier_message'
  | 'relance_1'
  | 'relance_2'
  | 'relance_3';

// Tone Options (Automatique, Tutoiement, Vouvoiement)
export type NetworkingTone = 'automatique' | 'tutoiement' | 'vouvoiement';

// Channels (LinkedIn, Email, Hybride)
export type NetworkingChannel = 'linkedin' | 'email' | 'hybride' | 'linkedin_email';

// Goals (12 Objectives)
export type NetworkingGoal = 
  | 'echange_10min'
  | 'decouvrir_metier'
  | 'comprendre_secteur'
  | 'comprendre_entreprise'
  | 'obtenir_conseils'
  | 'obtenir_recommandation'
  | 'identifier_contact'
  | 'stage'
  | 'alternance'
  | 'premier_emploi'
  | 'premier_emploi_cdi'
  | 'emploi'
  | 'recrutement_equipe'
  | 'candidature_directe'
  | 'networking_echange'
  | 'conseils_carriere';

// Backwards-compatibility aliases
export type NetworkingTemplateId = string;
export type NetworkingFollowUpId = string;

export interface StrategicPreAnalysis {
  whoIsNathan: string;
  whoIsContact: string;
  relationshipDetails: string;
  hookIdentified: string;
  strategyReasoning: string;
  antiHallucinationGuards: string[];
  fiftyPersonTestPassed: boolean;
  qualityReasoning: string;
}

export interface GeneratedOutreachResult {
  message: string;
  subject?: string;
  subjectStandard?: string;
  subjectPersonalized?: string;
  hybridEmail?: string;
  hybridEmailSubject?: string;
  analysis: StrategicPreAnalysis;
  category: NetworkingCategory;
  subType: NetworkingSubType;
  stage: NetworkingContactStage;
  goal: NetworkingGoal;
  channel: NetworkingChannel;
  toneApplied: 'tutoiement' | 'vouvoiement';
  wordCount: number;
  characterCount: number;
  callToAction: string;
  suggestedFollowUpDays: number;
  suggestedFollowUpDate: string;
  missingDataQuestions?: string[];
  isCompliantLinkedinNote?: boolean;
}

export interface OutreachMessageLogItem {
  id: string;
  stage: number; // 0: initial, 1: relance 1, 2: relance 2, 3: relance 3
  templateId: string;
  category?: NetworkingCategory;
  subType?: NetworkingSubType;
  contactStage?: NetworkingContactStage;
  channel: NetworkingChannel;
  tone: NetworkingTone;
  subject?: string;
  message: string;
  sentDate: string;
  status: 'draft' | 'sent' | 'replied' | 'ignored';
}

export interface NetworkingOutreachStrategy {
  recommendedCategory: NetworkingCategory;
  recommendedSubType: NetworkingSubType;
  recommendedStage: NetworkingContactStage;
  recommendedTemplateId: string;
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
    relance3?: string;
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
  function?: string; // Catégorie professionnelle normalisée (ex: "Direction / Management")
  functionSource?: 'manual' | 'ai_classification' | 'rule_engine' | 'imported';
  functionConfidence?: 'high' | 'medium' | 'low';
  functionClassifiedAt?: string;
  category: ContactCategory; // Primary/legacy category for backwards compatibility
  relevanceScore: number; // 0 to 100
  connectionPoints: string[]; // e.g., ["Même établissement : IUT Clermont Auvergne"]
  academicPath?: string;
  previousCompanies: string[];
  notes: string;
  linkedInUrl?: string;
  email?: string;
  phone?: string;
  city?: string;
  location?: string;
  department?: string;
  seniority?: string;
  schools?: string[];
  contactUrl?: string; // Internet link or application portal URL when direct contact isn't available
  aiCustomMessage?: string; // Personalized outreach message generated by Gemini
  createdAt: string;
  // Enriched CRM fields
  sector?: string;
  profileLevel?: string;
  networkingStatus?: ContactNetworkingStatus;
  opportunityId?: string;
  opportunityTitle?: string;
  opportunityIds?: string[];
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
  outreachCategory?: NetworkingCategory;
  outreachSubType?: NetworkingSubType;
  outreachStage?: NetworkingContactStage;
  lastAnalysis?: StrategicPreAnalysis;
  initialMessageSentDate?: string;
  lastOutreachDate?: string;
  nextFollowUpDate?: string;
  followUpStage?: number; // 0 = non contacté, 1 = initial envoyé, 2 = relance 1 envoyée, 3 = relance 2 envoyée, 4 = relance 3 envoyée
  outreachMessagesLog?: OutreachMessageLogItem[];
  conversationMessages?: ConversationMessage[];
  nextAction?: ContactNextAction;
}

export interface CompanyFieldMetadata {
  value: string;
  source: 'manual' | 'ai';
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  domain?: string;
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

export type CalendarEventType = 'interview' | 'deadline' | 'follow_up' | 'task' | 'meeting' | 'preparation' | 'event' | 'other';
export type CalendarEventSourceType = 'opportunity' | 'contact' | 'company' | 'task' | 'document' | 'manual' | 'google';
export type CalendarEventSyncStatus = 'confirmed' | 'calculated' | 'ai_suggestion';
export type CalendarEventPriority = 'high' | 'medium' | 'low';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  type: CalendarEventType;
  
  // Source Entity Linking
  sourceType?: CalendarEventSourceType;
  sourceId?: string;
  contactId?: string;
  companyId?: string;
  taskId?: string;
  documentId?: string;
  
  opportunityId?: string;
  opportunityTitle?: string;
  companyName?: string;
  
  // Intelligence, Status & Priority
  syncStatus?: CalendarEventSyncStatus; // 'confirmed' | 'calculated' | 'ai_suggestion'
  priority?: CalendarEventPriority; // 'high' | 'medium' | 'low'
  actionable?: boolean;
  isAutoDerived?: boolean;
  
  notes: string;
  completed: boolean;
  createdAt: string;
  updatedAt?: string;
  
  // Google Workspace Integration
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

export interface SessionSourceConfig {
  oppIds?: string[];
  contactIds?: string[];
  docIds?: string[];
  companyIds?: string[];
  includeProfile?: boolean;
  includeCalendar?: boolean;
  notes?: string;
  activeFocusId?: string;
  activeFocusType?: 'opportunity' | 'contact' | 'document' | 'company';
}

export interface ChatSession {
  id: string;
  personaId: string; // 'general' | 'interview' | 'cv_letter' | 'networking' | 'negotiation'
  personaName: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
  sourcesConfig?: SessionSourceConfig;
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

// ==========================================
// B2B PROSPECTING ENGINE TYPES & INTERFACES
// ==========================================

export type ProspectProviderSource = "hunter" | "nacora" | "demo" | "custom" | "nacora_engine" | "sandbox";
export type ProspectEmailStatus = "verified" | "risky" | "invalid" | "not_found" | "unverified";
export type ProspectLeadStatus = "new" | "qualified" | "contacted" | "in_conversation" | "converted" | "rejected";
export type ProspectSeniority = "junior" | "mid" | "senior" | "lead" | "manager" | "director" | "vp" | "c_level" | "founder";
export type ProspectDepartment = "marketing" | "sales" | "engineering" | "hr" | "finance" | "executive" | "product" | "operations" | "legal" | "other";

export interface ProspectCompanyLocation {
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  street?: string;
}

export interface ProspectCompany {
  id: string;
  name: string;
  domain: string;
  logoUrl?: string;
  description?: string;
  industry?: string;
  location?: ProspectCompanyLocation;
  employeeCount?: string | number;
  revenue?: string;
  foundedYear?: number | string;
  linkedinUrl?: string;
  twitterUrl?: string;
  website?: string;
  technologies?: string[];
  growthIndicator?: string;
  emailPattern?: string; // e.g. "{first}.{last}@"
  source: ProspectProviderSource;
  rawMetadata?: Record<string, any>;
  savedInNacora?: boolean;
  nacoraCompanyId?: string;
}

export interface ProspectPersonSource {
  domain: string;
  uri: string;
  title?: string;
  extracted_on?: string;
}

export interface ProspectPerson {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  jobTitle: string;
  normalizedTitle?: string;
  companyName: string;
  companyDomain?: string;
  department?: ProspectDepartment | string;
  seniority?: ProspectSeniority | string;
  email?: string;
  emailFindingType?: "public_verified" | "pattern_probable" | "unknown" | "not_found";
  emailSourceUrl?: string;
  emailStatus: ProspectEmailStatus;
  emailScore?: number; // 0 to 100
  phone?: string;
  phoneSourceUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  location?: string;
  summary?: string;
  verifiedDate?: string;
  confidence?: number;
  sources?: ProspectPersonSource[];
  source: ProspectProviderSource;
  isSavedLead?: boolean;
  leadId?: string;
  convertedContactId?: string;
}

export interface ProspectLead {
  id: string;
  personId?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  jobTitle: string;
  companyName: string;
  companyDomain?: string;
  department?: ProspectDepartment | string;
  seniority?: ProspectSeniority | string;
  email?: string;
  emailStatus: ProspectEmailStatus;
  emailScore?: number;
  phone?: string;
  linkedinUrl?: string;
  location?: string;
  status: ProspectLeadStatus;
  listIds: string[];
  tags: string[];
  notes?: string;
  source: ProspectProviderSource;
  convertedContactId?: string;
  convertedOpportunityId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProspectList {
  id: string;
  name: string;
  description?: string;
  color?: string; // hex color or tailwind
  leadsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProspectSearchFilters {
  query?: string;
  company?: string;
  function?: string;
  target_type?: "person" | "company" | "people" | "companies";
  location?: string;
  industry?: string;
  country?: string;
  city?: string;
  companySize?: string;
  jobTitle?: string;
  department?: string;
  seniority?: string;
  domain?: string;
  technology?: string;
}

export interface SavedSearch {
  id: string;
  title: string;
  queryText: string;
  type: "companies" | "people";
  filters: ProspectSearchFilters;
  resultsCount: number;
  createdAt: string;
  lastRunAt: string;
}

export interface ProspectActivityLog {
  id: string;
  type: "search" | "email_finder" | "email_verifier" | "company_enrich" | "lead_created" | "lead_converted" | "list_created";
  title: string;
  description: string;
  provider: ProspectProviderSource | "gemini_parser";
  status: "success" | "warning" | "error";
  creditsUsed?: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ProspectingSettings {
  activeProvider: "nacora" | "hybrid" | "demo";
  autoVerifyEmails: boolean;
  remainingCredits?: number;
  usedCredits?: number;
  planName?: string;
  emailAccount?: string;
  lastCheckedAt?: string;
}

export interface CompanySearchParams {
  query?: string;
  industry?: string;
  location?: string;
  country?: string;
  city?: string;
  size?: string;
  domain?: string;
  technology?: string;
  limit?: number;
}

export interface PeopleSearchParams {
  query?: string;
  companyDomain?: string;
  companyName?: string;
  jobTitle?: string;
  department?: string;
  seniority?: string;
  limit?: number;
}

export interface EmailFinderParams {
  domain: string;
  firstName: string;
  lastName: string;
  company?: string;
}

export interface EmailFinderResult {
  email?: string;
  score?: number;
  status: ProspectEmailStatus;
  firstName?: string;
  lastName?: string;
  position?: string;
  company?: string;
  sources?: ProspectPersonSource[];
  verificationDetails?: Record<string, any>;
}

export interface EmailVerifierResult {
  email: string;
  status: "verified" | "risky" | "invalid" | "not_found";
  result: "deliverable" | "risky" | "undeliverable" | "unknown";
  score: number;
  regexp: boolean;
  gibberish: boolean;
  disposable: boolean;
  webmail: boolean;
  mxRecords: boolean;
  smtpCheck: boolean;
  catchAll: boolean;
  sourcesCount?: number;
}

export interface QueryParseResult {
  target: "companies" | "people";
  searchQuery: string;
  filters: ProspectSearchFilters;
  explanation: string;
  suggestedAction?: string;
}

// ============================================================================
// SUIVI DE CONSOMMATION IA & GESTION DES TOKENS
// ============================================================================

export type AiFeatureCategory = 
  | 'networking_messages'      // Génération de messages networking & approches
  | 'conversation_analysis'     // Analyse & reconstruction de conversations
  | 'contact_analysis'          // Analyse stratégique de contacts & persona
  | 'ai_assistant'              // Assistant IA général & Copilote NACORA
  | 'job_extraction'            // Extraction intelligente d'offres d'emploi
  | 'cv_optimization'           // Optimisation & audit CV / Lettres de motivation
  | 'email_classification'      // Filtrage & pertinence professionnelle email
  | 'other';

export interface AiUsageRecord {
  id: string;
  timestamp: string; // ISO String (ex: 2026-09-28T14:30:00.000Z)
  feature: string; // ex: "Génération message LinkedIn", "Analyse conversation"
  featureCategory: AiFeatureCategory;
  model: string; // ex: "gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview"
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  isExact: boolean; // true si retourné directement par l'API Gemini (usageMetadata), false si estimation
  costEstimatedEuro: number; // Coût calculé en Euros
  status: 'success' | 'fallback_deterministic' | 'error' | 'quota_exhausted';
  durationMs?: number;
  requestId?: string;
  contextSnippet?: string; // Résumé ou aperçu non sensible
}

export interface AiUsageSettings {
  monthlyTokenLimit?: number | null; // null ou nombre si configurée
  dailyTokenLimit?: number | null;
  alertThresholds: number[]; // ex: [50, 75, 90, 100]
  lastAlertSentPercentage?: number;
  providerLimitSource?: string; // ex: "Google AI Studio / Gemini API"
  customCostPerMillionInput?: number;
  customCostPerMillionOutput?: number;
}


