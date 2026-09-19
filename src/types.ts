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

export type ContactNetworkingStatus = 'to_contact' | 'contacted' | 'exchanging' | 'interview_done' | 'not_interested';

export interface ContactHistoryEvent {
  id: string;
  type: 'import' | 'note_added' | 'category_changed' | 'message_generated' | 'opportunity_linked' | 'profile_updated';
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
  category: ContactCategory;
  relevanceScore: number; // 0 to 100
  connectionPoints: string[]; // e.g., ["Même établissement : IUT Clermont Auvergne"]
  academicPath?: string;
  previousCompanies: string[];
  notes: string;
  linkedInUrl?: string;
  email?: string;
  phone?: string;
  aiCustomMessage?: string; // Personalized outreach message generated by Gemini
  createdAt: string;
  // Enriched CRM fields
  sector?: string;
  profileLevel?: string;
  networkingStatus?: ContactNetworkingStatus;
  opportunityId?: string;
  opportunityTitle?: string;
  history?: ContactHistoryEvent[];
}

export interface Company {
  id: string;
  name: string;
  logoUrl?: string;
  sector?: string;
  website?: string;
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
