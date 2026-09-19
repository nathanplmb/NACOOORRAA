import { 
  CandidateProfile, 
  Opportunity, 
  Contact, 
  Company, 
  CalendarEvent, 
  DocumentFile, 
  ChatSession 
} from "./types";
import { db, auth } from "./firebase";
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  deleteDoc 
} from "firebase/firestore";

export const createDefaultProfile = (
  id: string = "profile",
  email: string = "",
  fullName: string = ""
): CandidateProfile => ({
  id,
  fullName: fullName || (email ? email.split("@")[0] : ""),
  email: email,
  phone: "",
  currentSituation: "",
  currentAlternance: "",
  targetMasters: ["Finance", "Gestion de patrimoine", "Fintech"],
  skills: [],
  languages: ["Français"],
  certifications: [],
  projects: [],
  experiences: [],
  bio: "",
  profileCompletionScore: 10
});

const INITIAL_PROFILE = createDefaultProfile();

const INITIAL_COMPANIES: Company[] = [
  {
    id: "co_ca",
    name: "Crédit Agricole Centre France",
    sector: "Banque & Assurance",
    website: "https://www.credit-agricole.fr",
    notes: "Mon employeur actuel pour mon alternance. Excellent réseau régional.",
    createdAt: new Date().toISOString(),
    opportunityCount: 1,
    contactCount: 0,
    noteCount: 1
  },
  {
    id: "co_lcl",
    name: "LCL",
    sector: "Banque Privée & Commerciale",
    website: "https://www.lcl.fr",
    notes: "Filiale du groupe Crédit Agricole. Très forte implantation sur la gestion de patrimoine.",
    createdAt: new Date().toISOString(),
    opportunityCount: 1,
    contactCount: 1,
    noteCount: 1
  },
  {
    id: "co_luko",
    name: "Luko (Fintech)",
    sector: "Fintech / Insurtech",
    website: "https://www.luko.eu",
    notes: "Acteur de premier plan de la fintech française. Intéressant pour une expérience digitale agile.",
    createdAt: new Date().toISOString(),
    opportunityCount: 1,
    contactCount: 1,
    noteCount: 1
  },
  {
    id: "co_bnp",
    name: "BNP Paribas",
    sector: "Banque & Finance",
    website: "https://group.bnpparibas",
    notes: "Leader européen de la gestion de fortune. Excellentes formations internes pour les alternants.",
    createdAt: new Date().toISOString(),
    opportunityCount: 1,
    contactCount: 1,
    noteCount: 0
  },
  {
    id: "co_sg",
    name: "Société Générale",
    sector: "Banque & Financement",
    website: "https://societegenerale.com",
    notes: "Grande banque d'affaires et de détail, pôle entreprises dynamique.",
    createdAt: new Date().toISOString(),
    opportunityCount: 1,
    contactCount: 0,
    noteCount: 1
  },
  {
    id: "co_palatine",
    name: "Banque Palatine",
    sector: "Banque Privée & Gestion de Patrimoine",
    website: "https://www.palatine.fr",
    notes: "Banque sur-mesure pour les dirigeants et le patrimoine haut de gamme.",
    createdAt: new Date().toISOString(),
    opportunityCount: 1,
    contactCount: 0,
    noteCount: 1
  },
  {
    id: "co_axa",
    name: "AXA Banque",
    sector: "Banque & Épargne",
    website: "https://www.axabanque.fr",
    notes: "Synergies banque-assurance et solutions d'épargne retraite.",
    createdAt: new Date().toISOString(),
    opportunityCount: 1,
    contactCount: 0,
    noteCount: 1
  },
  {
    id: "co_bpifrance",
    name: "Bpifrance",
    sector: "Banque Publique d'Investissement",
    website: "https://www.bpifrance.fr",
    notes: "Acteur central du financement des PME, de l'innovation et des fonds d'investissement.",
    createdAt: new Date().toISOString(),
    opportunityCount: 1,
    contactCount: 0,
    noteCount: 1
  },
  {
    id: "co_payplug",
    name: "Payplug",
    sector: "Fintech / Paiement",
    website: "https://www.payplug.com",
    notes: "Solution de paiement omnicanale française pour les e-commerçants et commerçants.",
    createdAt: new Date().toISOString(),
    opportunityCount: 1,
    contactCount: 0,
    noteCount: 1
  }
];

const INITIAL_OPPORTUNITIES: Opportunity[] = [
  // 1. Colonne : Sauvegardée (saved)
  {
    id: "opp_1",
    companyId: "co_ca",
    companyName: "Crédit Agricole Centre France",
    title: "Conseiller Clientèle Patrimoniale Junior",
    contractType: "Apprentissage",
    duration: "12 mois",
    location: "Clermont-Ferrand (63)",
    status: "to_prepare",
    salary: "1 520€ / mois",
    startDate: "Septembre 2026",
    deadline: "30 Juin 2026",
    url: "https://recrutement.credit-agricole.com/offre/patrimoine-auvergne",
    notes: "Opportunité de spécialisation en gestion de patrimoine pour approfondir l'analyse financière et la relation client haut de gamme.",
    privateNotes: "Prendre contact avec le chargé de recrutement avant la date limite. Relire les dossiers de bilans patrimoniaux.",
    workflowStep: 2,
    workflowHistory: [
      { step: 1, id: "step_1", title: "Sauvegardée", desc: "Offre repérée et analysée", status: "completed", date: "10 Mai 2026" },
      { step: 2, id: "step_2", title: "À préparer", desc: "Dossier de candidature & CV en cours de personnalisation", status: "current", date: "15 Mai 2026" },
      { step: 3, id: "step_3", title: "Candidature envoyée", desc: "Dépôt sur le portail RH", status: "upcoming" },
      { step: 4, id: "step_4", title: "Relance", desc: "Relance téléphonique ou email à J+10", status: "upcoming" },
      { step: 5, id: "step_5", title: "Entretien", desc: "Entretien RH de découverte", status: "upcoming" },
      { step: 6, id: "step_6", title: "Deuxième entretien", desc: "Entretien opérationnel & mise en situation", status: "upcoming" },
      { step: 7, id: "step_7", title: "Offre reçue", desc: "Proposition de contrat d'apprentissage", status: "upcoming" },
      { step: 8, id: "step_8", title: "Acceptée", desc: "Signature du contrat tripartite", status: "upcoming" },
      { step: 9, id: "step_9", title: "Refusée", desc: "Candidature non retenue", status: "upcoming" }
    ],
    recruiterContact: {
      name: "Léane Dubois",
      role: "Talent Acquisition Manager — Réseau Auvergne",
      email: "leane.dubois@ca-centrefrance.fr",
      phone: "04 73 30 22 14",
      linkedin: "https://linkedin.com/in/leane-dubois-rh"
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    aiExtracted: true,
    extractedInfo: {
      missions: [
        "Accompagner activement un portefeuille de clients particuliers haut de gamme sous la supervision d'un Conseiller en Gestion de Patrimoine senior. Participer aux entretiens de découverte patrimoniale globale, formaliser les bilans civils, fiscaux et économiques en agence de Clermont-Ferrand.",
        "Réaliser des simulations d'investissements sur-mesure combinant assurance-vie multi-supports, SCPI de rendement, private equity et produits de prévoyance. Préparer les propositions d'allocation financière adaptées au profil de risque et aux objectifs de transmission du client.",
        "Contribuer au développement commercial de l'agence via des campagnes ciblées de rebond commercial et de prospection patrimoniale sur les chefs d'entreprise locaux et professions libérales de la région.",
        "Assurer la conformité réglementaire rigoureuse de l'ensemble des dossiers clients (normes MiFID II, devoir de conseil, actualisation des questionnaires KYC et justification des arbitrages financiers).",
        "Participer à la rédaction d'argumentaires de marché hebdomadaires et à la vulgarisation des notes d'analyse économique pour outiller les conseillers généralistes de l'agence.",
        "Assister aux comités d'investissement trimestriels de la Caisse Régionale et participer à la restitution synthétique des performances des fonds structurés du groupe."
      ],
      documentsDemandes: [
        "Curriculum Vitae actualisé (format PDF)",
        "Lettre de motivation argumentée et personnalisée au Crédit Agricole",
        "Relevés de notes universitaires de BUT (Semestres 1 à 5)",
        "Lettre de recommandation de stage ou d'alternance"
      ],
      avantages: [
        "Rémunération : 1 520€ / mois (grille conventionnelle Caisse Régionale)",
        "Titres-restaurant : 10,50€ par jour (pris en charge à 60% par l'employeur)",
        "Télétravail : jusqu'à 1 jour par semaine selon organisation de l'agence",
        "Prise en charge à 75% du pass transports collectifs ou indemnité kilométrique vélo",
        "Avantages bancaires groupe : gratuité de compte, conditions préférentielles sur emprunt immobilier",
        "Intéressement et participation d'entreprise (moyenne 1,5 mois de salaire)",
        "Accès complet aux formations certifiantes de l'IFCAM (Université du groupe)"
      ],
      competencesRequises: [
        "Analyse financière et fiscale du particulier",
        "Maîtrise des enveloppes fiscales (Assurance-vie, PER, PEA)",
        "Réglementation bancaire et conformité MiFID II",
        "Techniques d'entretien commercial et négociation"
      ],
      competencesAppreciees: [
        "Expérience préalable en agence bancaire ou cabinet CGP",
        "Connaissance du tissu économique régional auvergnat",
        "Notions de droit de la famille et des successions"
      ],
      softSkills: [
        "Écoute active et sens aigu de la relation client",
        "Rigueur déontologique et discrétion professionnelle",
        "Aisance relationnelle et posture commerciale affirmée",
        "Esprit de synthèse et capacité rédactionnelle"
      ],
      outilsLogiciels: [
        "CRM Bancaire Interne (NMP)",
        "Excel Avancé (modélisations financières)",
        "Outil d'allocation d'actifs BigSys",
        "Suite Microsoft 365"
      ],
      formation: "Bac+3 validé (BUT TC, Licence Éco-Gestion), préparation d'un Master 1/2 Banque Privée ou Gestion de Patrimoine",
      experienceRequise: "Première expérience réussie de stage ou alternance en environnement bancaire ou financier vivement souhaitée",
      languesRequises: [
        "Français (Langue maternelle / Maîtrise parfaite)",
        "Anglais (Niveau professionnel B2/C1) — REQUIS"
      ],
      etapesRecrutement: [
        "1. Entretien de présélection avec Léane Dubois, Talent Acquisition Manager (30')",
        "2. Test de personnalité et mise en situation commerciale en ligne AssessFirst (45')",
        "3. Entretien approfondi avec Océane Renaud, Responsable du Pôle Patrimoine Régional (45')",
        "4. Échange final de confirmation avec le Directeur de Secteur Allier-Puy-de-Dôme (30')"
      ],
      entrepriseDetails: {
        presentation: "Le Crédit Agricole Centre France est la banque coopérative de référence sur les départements du Puy-de-Dôme, de l'Allier, du Cantal, de la Haute-Loire et de la Corrèze. Fort d'une gouvernance mutualiste ancrée dans l'économie réelle, l'établissement accompagne plus de 800 000 clients et investit massivement dans la transition énergétique et l'innovation locale.",
        parentGroup: "Groupe Crédit Agricole S.A.",
        secteur: "Banque de détail, Banque Privée & Financement Territorial",
        taille: "2 300 collaborateurs en région",
        siege: "Clermont-Ferrand (Puy-de-Dôme)",
        chiffresCles: [
          { label: "Clients sociétaires", value: "820 000" },
          { label: "Encours de crédits", value: "19,8 Md€" },
          { label: "Agences régionales", value: "228" },
          { label: "Taux de satisfaction", value: "92%" }
        ],
        faitsMarquants: [
          "Lancement de la filière d'excellence 'Patrimoine & Dirigeants' à destination des ETI régionales",
          "Distinction 'Top Employer France 2026' pour sa politique d'insertion des alternants",
          "Partenaire bancaire n°1 des créateurs d'entreprise en région Auvergne"
        ],
        partenairesClients: [
          "Amundi Asset Management",
          "Predica Assurances",
          "BPI France Régions",
          "Chambre de Commerce et d'Industrie d'Auvergne"
        ]
      }
    }
  },
  {
    id: "opp_3",
    companyId: "co_lcl",
    companyName: "LCL",
    title: "Assistant Gérant de Fortune - Alternance",
    contractType: "Apprentissage",
    duration: "12 mois",
    location: "Lyon (69) - Part-Dieu",
    status: "saved",
    salary: "1 580€ / mois",
    startDate: "Septembre 2026",
    deadline: "15 Juillet 2026",
    url: "https://lcl.recrutement.fr/offre-banque-privee-lyon",
    notes: "Pôle Banque Privée de LCL. Profil très haut de gamme, excellent tremplin pour le Master Gestion de patrimoine.",
    privateNotes: "Relire les fiches sur l'optimisation fiscale des holdings patrimoniales avant le premier échange téléphonique.",
    workflowStep: 1,
    workflowHistory: [
      { step: 1, id: "step_1", title: "Sauvegardée", desc: "Offre sauvegardée pour analyse d'adéquation", status: "current", date: "18 Mai 2026" },
      { step: 2, id: "step_2", title: "À préparer", desc: "Adaptation du CV et lettre", status: "upcoming" },
      { step: 3, id: "step_3", title: "Candidature envoyée", desc: "Dépôt officiel de la candidature", status: "upcoming" },
      { step: 4, id: "step_4", title: "Relance", desc: "Relance des recruteurs", status: "upcoming" },
      { step: 5, id: "step_5", title: "Entretien", desc: "Premier tour d'entretien", status: "upcoming" },
      { step: 6, id: "step_6", title: "Deuxième entretien", desc: "Entretien gérance de fortune", status: "upcoming" },
      { step: 7, id: "step_7", title: "Offre reçue", desc: "Proposition contractuelle", status: "upcoming" },
      { step: 8, id: "step_8", title: "Acceptée", desc: "Validation définitive", status: "upcoming" },
      { step: 9, id: "step_9", title: "Refusée", desc: "Dossier clôturé", status: "upcoming" }
    ],
    recruiterContact: {
      name: "Marc Albaric",
      role: "Responsable Recrutement Pôle Banque Privée Rhône-Alpes",
      email: "marc.albaric@lcl.fr",
      phone: "04 78 92 10 00",
      linkedin: "https://linkedin.com/in/marc-albaric-lcl"
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    aiExtracted: true,
    extractedInfo: {
      missions: [
        "Participer activement à la gestion sous mandat et au conseil en investissement pour des clients détenant plus de 500 000€ d'actifs financiers. Assister les banquiers privés dans la construction des stratégies d'allocation d'actifs sur les marchés actions et obligataires.",
        "Rédiger des notes de synthèse macroéconomique et d'analyse financière sur les valeurs recommandées par la cellule de recherche du groupe LCL.",
        "Préparer les supports de comités d'investissement personnalisés remis aux dirigeants d'entreprise et familles fortunées de la région lyonnaise.",
        "Suivre et contrôler l'exécution des ordres de bourse, des arbitrages sur les contrats de capitalisation et veiller au respect des ratios de diversification.",
        "Participer aux projets de digitalisation des parcours clients VIP et au déploiement de la nouvelle application de reporting patrimonial en temps réel."
      ],
      documentsDemandes: [
        "CV au format PDF avec détail des expériences financières",
        "Lettre de motivation ciblée Gestion de Fortune",
        "Derniers relevés de notes universitaires"
      ],
      avantages: [
        "Rémunération attractive de 1 580€ / mois",
        "Prime d'intéressement et participation d'entreprise annuelle",
        "Titres-restaurant pris en charge à 60% (11€ / jour)",
        "Accès à l'espace lounge d'entreprise et café barista",
        "Remboursement des frais de transport en commun à hauteur de 75%"
      ],
      competencesRequises: [
        "Connaissance pointue des instruments financiers cotés et non cotés",
        "Compréhension de la fiscalité des valeurs mobilières (PFU, IFI)",
        "Sens de l'analyse quantitative et modélisation Excel"
      ],
      competencesAppreciees: [
        "Certification AMF en cours ou validée",
        "Notions de Private Equity et de dette privée"
      ],
      softSkills: [
        "Excellence relationnelle et discrétion absolue",
        "Esprit d'analyse et sens du détail",
        "Proactivité et rigueur"
      ],
      outilsLogiciels: ["Bloomberg Terminal", "Excel Avancé (VBA)", "PowerPoint", "Morningstar Direct"],
      formation: "Master 1 ou 2 spécialité Finance de Marché ou Gestion de Patrimoine",
      experienceRequise: "Première expérience en banque privée, family office ou salle de marchés souhaitée",
      languesRequises: [
        "Français (Parfaite maîtrise écrite et orale)",
        "Anglais (Bilingue ou C1 fluide) — REQUIS"
      ],
      etapesRecrutement: [
        "1. Échange téléphonique avec Marc Albaric, Recruteur Banque Privée (20')",
        "2. Test technique de finance et logique quantitative en ligne (40')",
        "3. Entretien avec deux Gérants de Fortune seniors à Lyon (1h)",
        "4. Échange de validation avec le Directeur Régional LCL Banque Privée (30')"
      ],
      entrepriseDetails: {
        presentation: "Filiale du Groupe Crédit Agricole, LCL est l'une des banques historiques françaises de premier plan avec un réseau dense en milieu urbain. Son pôle Banque Privée accompagne plus de 200 000 clients patrimoniaux à travers la France en alliant proximité humaine et expertise financière d'un grand groupe international.",
        parentGroup: "Crédit Agricole S.A.",
        secteur: "Banque de Détail & Banque Privée Haut de Gamme",
        taille: "16 000 salariés",
        siege: "Villejuif / Lyon",
        chiffresCles: [
          { label: "Clients Banque Privée", value: "210 000" },
          { label: "Encours sous gestion", value: "54 Md€" },
          { label: "Bureaux privés", value: "70" }
        ],
        faitsMarquants: [
          "Pionnier des investissements responsables ESG avec plus de 80% des gammes labellisées",
          "Partenaire financier de plus d'un dirigeant de PME sur trois en région Auvergne-Rhône-Alpes"
        ],
        partenairesClients: ["Amundi", "CACEIS", "Bourse Direct"]
      }
    }
  },
  {
    id: "opp_5",
    companyId: "co_sg",
    companyName: "Société Générale",
    title: "Chargé d'Affaires Entreprises Junior",
    contractType: "Apprentissage",
    duration: "12 mois",
    location: "Clermont-Ferrand (63)",
    status: "saved",
    salary: "1 420€ / mois",
    startDate: "Septembre 2026",
    deadline: "Non spécifiée",
    url: "https://careers.societegenerale.com/entreprises-clermont",
    notes: "Suivi des comptes PME / ETI régionales, analyse des bilans et montage de dossiers de financement.",
    privateNotes: "",
    workflowStep: 1,
    workflowHistory: [
      { step: 1, id: "step_1", title: "Sauvegardée", desc: "Offre sauvegardée", status: "current", date: "12 Mai 2026" },
      { step: 2, id: "step_2", title: "À préparer", desc: "Préparation CV PME", status: "upcoming" },
      { step: 3, id: "step_3", title: "Candidature envoyée", desc: "Envoi RH", status: "upcoming" },
      { step: 4, id: "step_4", title: "Relance", desc: "Relance sous 10j", status: "upcoming" },
      { step: 5, id: "step_5", title: "Entretien", desc: "Entretien RH", status: "upcoming" },
      { step: 6, id: "step_6", title: "Deuxième entretien", desc: "Entretien Directeur d'Agence", status: "upcoming" },
      { step: 7, id: "step_7", title: "Offre reçue", desc: "Contrat proposé", status: "upcoming" },
      { step: 8, id: "step_8", title: "Acceptée", desc: "Contrat signé", status: "upcoming" },
      { step: 9, id: "step_9", title: "Refusée", desc: "Clôturé", status: "upcoming" }
    ],
    recruiterContact: {
      name: "Antoine Giraud",
      role: "Chargé de recrutement Réseau Entreprises",
      email: "antoine.giraud@socgen.com",
      phone: "04 73 17 00 20"
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    aiExtracted: false
  },
  {
    id: "opp_payplug",
    companyId: "co_payplug",
    companyName: "Payplug",
    title: "Revenue Operations & Stratégie",
    contractType: "Stage",
    duration: "6 mois",
    location: "110 Avenue de France, 75013 Paris",
    status: "saved",
    salary: "1 350€ / mois",
    startDate: "Septembre 2026",
    deadline: "15 Juillet 2026",
    url: "https://www.payplug.com/jobs/revenue-operations",
    notes: "Pilotage des process de vente, analyse de la performance commerciale et outils CRM.",
    privateNotes: "",
    workflowStep: 1,
    workflowHistory: [
      { step: 1, id: "step_1", title: "Sauvegardée", desc: "Offre sauvegardée", status: "current", date: "15 Mai 2026" },
      { step: 2, id: "step_2", title: "À préparer", desc: "Dossier en cours", status: "upcoming" },
      { step: 3, id: "step_3", title: "Candidature envoyée", desc: "Envoi RH", status: "upcoming" }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    aiExtracted: false
  },

  // 2. Colonne : À préparer (to_prepare)
  {
    id: "opp_6",
    companyId: "co_palatine",
    companyName: "Banque Palatine",
    title: "Analyste Gestion Privée & Patrimoine",
    contractType: "Apprentissage",
    duration: "12 mois",
    location: "Paris / Hybride",
    status: "to_prepare",
    salary: "1 600€ / mois",
    startDate: "Septembre 2026",
    deadline: "10 Juillet 2026",
    url: "https://www.palatine.fr/carrieres/alternance-gestion-privee",
    notes: "Préparation des propositions d'allocation d'actifs pour chefs d'entreprise et professions libérales.",
    privateNotes: "Mettre l'accent sur ma double compétence commerciale et d'analyse financière.",
    workflowStep: 2,
    workflowHistory: [
      { step: 1, id: "step_1", title: "Sauvegardée", desc: "Offre retenue", status: "completed", date: "05 Mai 2026" },
      { step: 2, id: "step_2", title: "À préparer", desc: "Dossier en finalisation", status: "current", date: "16 Mai 2026" },
      { step: 3, id: "step_3", title: "Candidature envoyée", desc: "Candidature", status: "upcoming" },
      { step: 4, id: "step_4", title: "Relance", desc: "Relance", status: "upcoming" },
      { step: 5, id: "step_5", title: "Entretien", desc: "Entretien RH", status: "upcoming" },
      { step: 6, id: "step_6", title: "Deuxième entretien", desc: "Entretien Métier", status: "upcoming" },
      { step: 7, id: "step_7", title: "Offre reçue", desc: "Proposition", status: "upcoming" },
      { step: 8, id: "step_8", title: "Acceptée", desc: "Signature", status: "upcoming" },
      { step: 9, id: "step_9", title: "Refusée", desc: "Refus", status: "upcoming" }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    aiExtracted: false
  },

  // 3. Colonne : À étudier (to_study)
  {
    id: "opp_4",
    companyId: "co_bnp",
    companyName: "BNP Paribas",
    title: "Conseiller Clientèle Privée Junior",
    contractType: "Apprentissage",
    duration: "12 mois",
    location: "Vichy (03)",
    status: "to_study",
    salary: "1 380€ / mois",
    startDate: "Septembre 2026",
    deadline: "20 Juillet 2026",
    url: "https://group.bnpparibas/emploi-carriere/vichy-patrimoine",
    notes: "Opportunité intéressante pour intégrer un grand groupe bancaire international.",
    privateNotes: "Vérifier le rythme d'alternance et les modalités de transport.",
    workflowStep: 2,
    workflowHistory: [
      { step: 1, id: "step_1", title: "Sauvegardée", desc: "Repérée", status: "completed", date: "02 Mai 2026" },
      { step: 2, id: "step_2", title: "À préparer", desc: "Étude d'adéquation", status: "current", date: "14 Mai 2026" },
      { step: 3, id: "step_3", title: "Candidature envoyée", desc: "Envoi", status: "upcoming" },
      { step: 4, id: "step_4", title: "Relance", desc: "Relance", status: "upcoming" },
      { step: 5, id: "step_5", title: "Entretien", desc: "Entretien", status: "upcoming" },
      { step: 6, id: "step_6", title: "Deuxième entretien", desc: "Entretien", status: "upcoming" },
      { step: 7, id: "step_7", title: "Offre reçue", desc: "Offre", status: "upcoming" },
      { step: 8, id: "step_8", title: "Acceptée", desc: "Acceptée", status: "upcoming" },
      { step: 9, id: "step_9", title: "Refusée", desc: "Refusée", status: "upcoming" }
    ],
    recruiterContact: {
      name: "Claire Marchand",
      role: "Responsable recrutement Auvergne",
      email: "claire.marchand@bnpparibas.com"
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    aiExtracted: false
  },
  {
    id: "opp_7",
    companyId: "co_axa",
    companyName: "AXA Banque",
    title: "Conseiller Spécialisé Épargne & Prévoyance",
    contractType: "Apprentissage",
    duration: "12 mois",
    location: "Clermont-Ferrand (63)",
    status: "to_study",
    salary: "1 350€ / mois",
    startDate: "Septembre 2026",
    deadline: "30 Juin 2026",
    url: "https://recrutement.axa.fr",
    notes: "Offre intéressante centrée sur les contrats d'assurance-vie et produits d'épargne retraite PER.",
    privateNotes: "",
    workflowStep: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    aiExtracted: false
  },

  // 4. Colonne : À candidater (to_apply)
  {
    id: "opp_2",
    companyId: "co_luko",
    companyName: "Luko (Fintech)",
    title: "Analyste Solutions d'Épargne Fintech",
    contractType: "Stage",
    duration: "6 mois",
    location: "Paris / Hybride",
    status: "to_apply",
    salary: "1 250€ / mois",
    startDate: "Septembre 2026",
    deadline: "25 Juin 2026",
    url: "https://careers.luko.eu/jobs/saving-analyst",
    notes: "Parfait pour valider ma cible Master Fintech. Mission de veille sur les robo-advisors et aide au développement des partenariats d'épargne en ligne.",
    privateNotes: "Candidature finalisée ! Il me reste à envoyer le message d'introduction sur LinkedIn à la fondatrice ou au Lead Product.",
    workflowStep: 3,
    workflowHistory: [
      { step: 1, id: "step_1", title: "Sauvegardée", desc: "Offre découverte sur Welcome to the Jungle", status: "completed", date: "20 Avril 2026" },
      { step: 2, id: "step_2", title: "À préparer", desc: "Dossier et CV Fintech calibrés", status: "completed", date: "02 Mai 2026" },
      { step: 3, id: "step_3", title: "Candidature envoyée", desc: "Prêt à être envoyé", status: "current", date: "18 Mai 2026" },
      { step: 4, id: "step_4", title: "Relance", desc: "À programmer à J+7", status: "upcoming" },
      { step: 5, id: "step_5", title: "Entretien", desc: "Premier call RH (30')", status: "upcoming" },
      { step: 6, id: "step_6", title: "Deuxième entretien", desc: "Étude de cas produit", status: "upcoming" },
      { step: 7, id: "step_7", title: "Offre reçue", desc: "Proposition formelle", status: "upcoming" },
      { step: 8, id: "step_8", title: "Acceptée", desc: "Validation de stage", status: "upcoming" },
      { step: 9, id: "step_9", title: "Refusée", desc: "Non retenu", status: "upcoming" }
    ],
    recruiterContact: {
      name: "Océane Vasseur",
      role: "People & Talent Lead",
      email: "oceane.vasseur@luko.eu",
      linkedin: "https://linkedin.com/in/oceane-vasseur-luko"
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    aiExtracted: true,
    extractedInfo: {
      missions: [
        "Mener une veille stratégique approfondie sur les innovations d'épargne digitale, l'agrégation de comptes bancaires et les plateformes de robo-advisory européennes.",
        "Contribuer à la conception et à l'optimisation des parcours utilisateurs sur les outils de simulation de prévoyance et de retraite intégrés à l'application mobile.",
        "Analyser les performances hebdomadaires des portefeuilles et rédiger des synthèses destinées aux équipes produit et partenariats bancaires.",
        "Participer activement à la vulgarisation financière en rédigeant des articles éducatifs et des supports d'aide à la décision pour les utilisateurs particuliers."
      ],
      documentsDemandes: [
        "Lien vers profil LinkedIn actualisé",
        "CV au format PDF",
        "Court paragraphe de motivation (3 questions clés)"
      ],
      avantages: [
        "Gratification de 1 250€ / mois",
        "Carte Swile titres-restaurant créditée de 10€ / jour (pris en charge à 60%)",
        "Politique de télétravail flexible (2 à 3 jours par semaine)",
        "Abonnement Gymlib / sport offert",
        "Café de spécialité et corbeille de fruits bio dans les locaux parisiens"
      ],
      competencesRequises: [
        "Bases solides en finance de marché et produits d'épargne",
        "Maîtrise de l'analyse de données chiffrées sur tableur",
        "Aisance rédactionnelle en français et bon niveau d'anglais"
      ],
      competencesAppreciees: [
        "Connaissance du fonctionnement des API Open Banking",
        "Intérêt démontré pour les crypto-actifs ou le trading responsable"
      ],
      softSkills: [
        "Culture startup et curiosité intellectuelle",
        "Capacité d'adaptation rapide aux outils digitaux",
        "Esprit d'initiative et autonomie"
      ],
      outilsLogiciels: ["Notion", "Slack", "Figma", "Excel / Google Sheets"],
      formation: "Bac+3 à Bac+5 en École de Commerce, IEP ou Master Finance / Fintech",
      experienceRequise: "Première expérience de stage appréciée mais profil débutant motivé bienvenu",
      languesRequises: [
        "Français (Natif)",
        "Anglais (B2 professionnel) — REQUIS"
      ],
      etapesRecrutement: [
        "1. Screening vidéo ou téléphonique avec Océane, People Lead (30')",
        "2. Test pratique d'analyse de marché à domicile (1h30)",
        "3. Entretien avec le Head of Product Finance (45')",
        "4. Rencontre informelle de culture fit avec l'équipe (30')"
      ],
      entrepriseDetails: {
        presentation: "Luko est une assurtech & fintech pionnière en Europe qui réinvente les services financiers du quotidien. Grâce à une technologie propriétaire et une expérience mobile épurée, l'entreprise protège et conseille plus de 400 000 foyers avec transparence et responsabilité sociétale.",
        parentGroup: "Indépendant / Partenariats bancaires européens",
        secteur: "Fintech, Insurtech & Épargne Digitale",
        taille: "180 collaborateurs",
        siege: "Paris (75010)",
        chiffresCles: [
          { label: "Utilisateurs actifs", value: "420 000" },
          { label: "Note App Store", value: "4.7 / 5" },
          { label: "Fonds levés", value: "70 M€" }
        ],
        faitsMarquants: [
          "Élue Fintech de l'année par l'écosystème French Tech",
          "Partenaire technologique de grands réseaux bancaires pour la distribution d'épargne"
        ],
        partenairesClients: ["Swiss Life", "Munich Re", "Stripe", "Budget Insight"]
      }
    }
  },
  {
    id: "opp_8",
    companyId: "co_bpifrance",
    companyName: "Bpifrance",
    title: "Chargé d'Études Financement PME & Innovation",
    contractType: "Apprentissage",
    duration: "12 mois",
    location: "Clermont-Ferrand (63)",
    status: "to_apply",
    salary: "1 500€ / mois",
    startDate: "Septembre 2026",
    deadline: "28 Juin 2026",
    url: "https://talents.bpifrance.fr/offre-clermont-pme",
    notes: "Dossier prêt à déposer. Analyse des demandes de prêts d'amorçage et garanties bancaires pour startups et PME d'Auvergne.",
    privateNotes: "Mettre en valeur mes compétences en analyse financière et ma connaissance du tissu industriel local.",
    workflowStep: 3,
    workflowHistory: [
      { step: 1, id: "step_1", title: "Sauvegardée", desc: "Repérée", status: "completed", date: "01 Mai 2026" },
      { step: 2, id: "step_2", title: "À préparer", desc: "Dossier monté", status: "completed", date: "15 Mai 2026" },
      { step: 3, id: "step_3", title: "Candidature envoyée", desc: "Prêt à déposer", status: "current", date: "19 Mai 2026" },
      { step: 4, id: "step_4", title: "Relance", desc: "À faire à J+10", status: "upcoming" },
      { step: 5, id: "step_5", title: "Entretien", desc: "Entretien RH", status: "upcoming" },
      { step: 6, id: "step_6", title: "Deuxième entretien", desc: "Entretien Délégué Régional", status: "upcoming" },
      { step: 7, id: "step_7", title: "Offre reçue", desc: "Offre", status: "upcoming" },
      { step: 8, id: "step_8", title: "Acceptée", desc: "Acceptée", status: "upcoming" },
      { step: 9, id: "step_9", title: "Refusée", desc: "Refusée", status: "upcoming" }
    ],
    recruiterContact: {
      name: "Julien Meunier",
      role: "Délégué Régional Financement",
      email: "julien.meunier@bpifrance.fr",
      phone: "04 73 98 12 00"
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    aiExtracted: false
  }
];

const INITIAL_CONTACTS: Contact[] = [
  {
    id: "cont_1",
    fullName: "Sophie Martin",
    firstName: "Sophie",
    lastName: "Martin",
    companyId: "co_lcl",
    companyName: "LCL",
    jobTitle: "Conseillère en Gestion de Patrimoine",
    normalizedJobTitle: "Conseillère en Gestion de Patrimoine",
    category: "alumni",
    relevanceScore: 95,
    connectionPoints: [
      "Alumni du réseau",
      "Secteur cible : Gestion de patrimoine"
    ],
    academicPath: "Parcours universitaire en finance puis Master Gestion de Patrimoine IAE",
    previousCompanies: ["Crédit Mutuel", "Banque Populaire"],
    notes: "A accepté mon invitation LinkedIn ! Très ouverte pour échanger sur les métiers de la gestion de patrimoine.",
    createdAt: new Date().toISOString()
  },
  {
    id: "cont_2",
    fullName: "Clara Dubois",
    firstName: "Clara",
    lastName: "Dubois",
    companyId: "co_luko",
    companyName: "Luko (Fintech)",
    jobTitle: "Product Manager Épargne & Assurance",
    normalizedJobTitle: "Product Manager Épargne & Fintech",
    category: "alumni",
    relevanceScore: 90,
    connectionPoints: [
      "Alumni du réseau",
      "Actrice de la Fintech"
    ],
    academicPath: "Parcours école de commerce / IAE puis Master Digital Marketing & FinTech",
    previousCompanies: ["Younited Credit", "Alan"],
    notes: "Contact précieux pour comprendre l'écosystème Fintech et optimiser mes candidatures.",
    createdAt: new Date().toISOString()
  },
  {
    id: "cont_3",
    fullName: "Jean-Paul Bernard",
    firstName: "Jean-Paul",
    lastName: "Bernard",
    companyId: "co_bnp",
    companyName: "BNP Paribas",
    jobTitle: "Responsable Recrutement",
    normalizedJobTitle: "Responsable Recrutement",
    category: "recruiter",
    relevanceScore: 85,
    connectionPoints: [
      "Recruteur RH principal Banque",
      "Pôle Alternances & Stages"
    ],
    academicPath: "Master RH",
    previousCompanies: ["Société Générale"],
    notes: "Intervenant lors de forums de recrutement et job datings.",
    createdAt: new Date().toISOString()
  }
];

const INITIAL_CALENDAR: CalendarEvent[] = [
  {
    id: "cal_1",
    title: "Relancer Sophie Martin (LCL)",
    date: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split("T")[0],
    time: "10:00",
    type: "follow_up",
    notes: "Lui envoyer un message de remerciement pour ses conseils et l'informer du dépôt de mon dossier.",
    completed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "cal_2",
    title: "Entretien d'entraînement Crédit Agricole",
    date: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().split("T")[0],
    time: "14:30",
    type: "interview",
    opportunityId: "opp_1",
    opportunityTitle: "Conseiller Clientèle Patrimoniale Junior",
    companyName: "Crédit Agricole Centre France",
    notes: "Simuler l'entretien avec le Coach Entretien de NACORA en insistant sur mes compétences clés.",
    completed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "cal_3",
    title: "Échéance Candidature Luko",
    date: new Date(Date.now() + 8 * 24 * 3600 * 1000).toISOString().split("T")[0],
    time: "23:59",
    type: "deadline",
    opportunityId: "opp_2",
    opportunityTitle: "Analyste Solutions d'Épargne Fintech",
    companyName: "Luko (Fintech)",
    notes: "Vérifier le CV optimisé ATS et finaliser la lettre de motivation.",
    completed: false,
    createdAt: new Date().toISOString()
  }
];

const INITIAL_SESSIONS: ChatSession[] = [
  {
    id: "sess_welcome",
    personaId: "general",
    personaName: "Conseiller Carrière",
    title: "Bienvenue sur NACORA AI",
    messages: [
      {
        id: "msg_1",
        role: "model",
        text: "Bonjour ! Je suis ton conseiller de carrière intelligent NACORA. Je suis là pour t'accompagner dans la recherche, la préparation et le suivi de tes opportunités d'alternance, de stage ou de premier emploi en Finance, Fintech ou Gestion de Patrimoine. Comment puis-je t'aider aujourd'hui ?",
        timestamp: new Date().toISOString()
      }
    ],
    updatedAt: new Date().toISOString()
  }
];

class DBStore {
  private profile: CandidateProfile = INITIAL_PROFILE;
  private opportunities: Opportunity[] = [];
  private contacts: Contact[] = [];
  private companies: Company[] = [];
  private calendarEvents: CalendarEvent[] = [];
  private documents: DocumentFile[] = [];
  private chatSessions: ChatSession[] = [];

  private currentUserId: string | null = null;
  private syncTimeout: any = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromLocalStorage();
  }

  // Subscribe to changes
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListenersOnly() {
    this.listeners.forEach(listener => listener());
  }

  private notify() {
    this.notifyListenersOnly();
    if (this.currentUserId) {
      this.saveToUserLocalStorage(this.currentUserId);
      if (this.syncTimeout) clearTimeout(this.syncTimeout);
      this.syncTimeout = setTimeout(() => {
        if (this.currentUserId) {
          this.syncToFirestore(this.currentUserId);
        }
      }, 800);
    } else {
      this.saveToLocalStorage();
    }
  }

  // Initialize for authenticated user
  async initializeForUser(userId: string, email?: string | null, displayName?: string | null) {
    this.currentUserId = userId;
    try {
      // 1. Try to load from Firestore document
      const userRef = doc(db, "users", userId);
      const snapshot = await getDoc(userRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.profile) this.profile = data.profile;
        else this.profile = createDefaultProfile(userId, email || "", displayName || "");
        
        if (data.opportunities) this.opportunities = data.opportunities;
        if (data.contacts) this.contacts = data.contacts;
        if (data.companies) this.companies = data.companies;
        if (data.calendarEvents) this.calendarEvents = data.calendarEvents;
        if (data.documents) this.documents = data.documents;
        if (data.chatSessions) this.chatSessions = data.chatSessions;
      } else {
        // 2. Check if user-scoped localStorage has cached state
        const localKey = `nacora_${userId}_profile`;
        if (localStorage.getItem(localKey)) {
          this.loadFromUserLocalStorage(userId);
        } else {
          // 3. Brand new account: initialize clean profile with starter template opportunities
          this.profile = createDefaultProfile(userId, email || "", displayName || "");
          this.opportunities = INITIAL_OPPORTUNITIES;
          this.contacts = INITIAL_CONTACTS;
          this.companies = INITIAL_COMPANIES;
          this.calendarEvents = INITIAL_CALENDAR;
          this.documents = [];
          this.chatSessions = INITIAL_SESSIONS;
        }
        // Save to Firestore for this new user
        await this.syncToFirestore(userId);
      }
      this.recalculateCompanyCounters();
      this.saveToUserLocalStorage(userId);
      this.notifyListenersOnly();
    } catch (e) {
      console.error("Error initializing user store:", e);
      // Fallback to local storage if offline or firestore fails
      this.loadFromUserLocalStorage(userId);
      this.notifyListenersOnly();
    }
  }

  clearUser() {
    this.currentUserId = null;
    this.profile = createDefaultProfile();
    this.opportunities = [];
    this.contacts = [];
    this.companies = [];
    this.calendarEvents = [];
    this.documents = [];
    this.chatSessions = [];
    this.notifyListenersOnly();
  }

  // LocalStorage Persistence (Fallback / Generic)
  private loadFromLocalStorage() {
    try {
      const p = localStorage.getItem("nacora_profile");
      if (p) this.profile = JSON.parse(p);
      else this.profile = INITIAL_PROFILE;

      const o = localStorage.getItem("nacora_opportunities");
      if (o) this.opportunities = JSON.parse(o);
      else this.opportunities = INITIAL_OPPORTUNITIES;

      const c = localStorage.getItem("nacora_contacts");
      if (c) this.contacts = JSON.parse(c);
      else this.contacts = INITIAL_CONTACTS;

      const co = localStorage.getItem("nacora_companies");
      if (co) this.companies = JSON.parse(co);
      else this.companies = INITIAL_COMPANIES;

      const cal = localStorage.getItem("nacora_calendar");
      if (cal) this.calendarEvents = JSON.parse(cal);
      else this.calendarEvents = INITIAL_CALENDAR;

      const docu = localStorage.getItem("nacora_documents");
      if (docu) this.documents = JSON.parse(docu);
      else this.documents = [];

      const sess = localStorage.getItem("nacora_sessions");
      if (sess) this.chatSessions = JSON.parse(sess);
      else this.chatSessions = INITIAL_SESSIONS;

      this.recalculateCompanyCounters();
    } catch (e) {
      console.error("Error loading local storage:", e);
    }
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem("nacora_profile", JSON.stringify(this.profile));
      localStorage.setItem("nacora_opportunities", JSON.stringify(this.opportunities));
      localStorage.setItem("nacora_contacts", JSON.stringify(this.contacts));
      localStorage.setItem("nacora_companies", JSON.stringify(this.companies));
      localStorage.setItem("nacora_calendar", JSON.stringify(this.calendarEvents));
      localStorage.setItem("nacora_documents", JSON.stringify(this.documents));
      localStorage.setItem("nacora_sessions", JSON.stringify(this.chatSessions));
    } catch (e) {
      console.error("Error writing local storage:", e);
    }
  }

  // User-scoped local storage
  private loadFromUserLocalStorage(userId: string) {
    try {
      const p = localStorage.getItem(`nacora_${userId}_profile`);
      if (p) this.profile = JSON.parse(p);
      else this.profile = createDefaultProfile(userId);

      const o = localStorage.getItem(`nacora_${userId}_opportunities`);
      if (o) this.opportunities = JSON.parse(o);
      else this.opportunities = INITIAL_OPPORTUNITIES;

      const c = localStorage.getItem(`nacora_${userId}_contacts`);
      if (c) this.contacts = JSON.parse(c);
      else this.contacts = INITIAL_CONTACTS;

      const co = localStorage.getItem(`nacora_${userId}_companies`);
      if (co) this.companies = JSON.parse(co);
      else this.companies = INITIAL_COMPANIES;

      const cal = localStorage.getItem(`nacora_${userId}_calendar`);
      if (cal) this.calendarEvents = JSON.parse(cal);
      else this.calendarEvents = INITIAL_CALENDAR;

      const docu = localStorage.getItem(`nacora_${userId}_documents`);
      if (docu) this.documents = JSON.parse(docu);
      else this.documents = [];

      const sess = localStorage.getItem(`nacora_${userId}_sessions`);
      if (sess) this.chatSessions = JSON.parse(sess);
      else this.chatSessions = INITIAL_SESSIONS;

      this.recalculateCompanyCounters();
    } catch (e) {
      console.error("Error loading user local storage:", e);
    }
  }

  private saveToUserLocalStorage(userId: string) {
    try {
      localStorage.setItem(`nacora_${userId}_profile`, JSON.stringify(this.profile));
      localStorage.setItem(`nacora_${userId}_opportunities`, JSON.stringify(this.opportunities));
      localStorage.setItem(`nacora_${userId}_contacts`, JSON.stringify(this.contacts));
      localStorage.setItem(`nacora_${userId}_companies`, JSON.stringify(this.companies));
      localStorage.setItem(`nacora_${userId}_calendar`, JSON.stringify(this.calendarEvents));
      localStorage.setItem(`nacora_${userId}_documents`, JSON.stringify(this.documents));
      localStorage.setItem(`nacora_${userId}_sessions`, JSON.stringify(this.chatSessions));
    } catch (e) {
      console.error("Error writing user local storage:", e);
    }
  }

  // Firebase Sync
  async syncToFirestore(userId: string) {
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, {
        profile: this.profile,
        opportunities: this.opportunities,
        contacts: this.contacts,
        companies: this.companies,
        calendarEvents: this.calendarEvents,
        documents: this.documents,
        chatSessions: this.chatSessions,
        updatedAt: new Date().toISOString()
      });
      console.log("State synced to Firestore successfully for user", userId);
    } catch (e) {
      console.error("Error syncing to Firestore:", e);
    }
  }

  async loadFromFirestore(userId: string) {
    try {
      const userRef = doc(db, "users", userId);
      const snapshot = await getDoc(userRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.profile) this.profile = data.profile;
        if (data.opportunities) this.opportunities = data.opportunities;
        if (data.contacts) this.contacts = data.contacts;
        if (data.companies) this.companies = data.companies;
        if (data.calendarEvents) this.calendarEvents = data.calendarEvents;
        if (data.documents) this.documents = data.documents;
        if (data.chatSessions) this.chatSessions = data.chatSessions;
        
        this.recalculateCompanyCounters();
        this.notifyListenersOnly();
      }
    } catch (e) {
      console.error("Error loading from Firestore:", e);
    }
  }

  // Helper to recalculate business analytics reactively
  private recalculateCompanyCounters() {
    this.companies = this.companies.map(co => {
      const oppCount = this.opportunities.filter(o => o.companyId === co.id).length;
      const contactCount = this.contacts.filter(c => c.companyId === co.id).length;
      return {
        ...co,
        opportunityCount: oppCount,
        contactCount: contactCount,
        noteCount: co.notes ? 1 : 0
      };
    });
  }

  // Profile Operations
  getProfile(): CandidateProfile {
    return this.profile;
  }

  updateProfile(p: Partial<CandidateProfile>) {
    this.profile = { ...this.profile, ...p };
    
    // Recalculate profile completion score
    let score = 20; // default for having profile
    if (this.profile.fullName) score += 10;
    if (this.profile.phone) score += 10;
    if (this.profile.bio) score += 10;
    if (this.profile.skills.length > 3) score += 15;
    if (this.profile.experiences.length > 0) score += 15;
    if (this.profile.certifications.length > 0) score += 10;
    if (this.profile.languages.length > 0) score += 10;
    
    this.profile.profileCompletionScore = Math.min(score, 100);
    this.notify();
  }

  // Opportunity Operations
  getOpportunities(): Opportunity[] {
    return this.opportunities;
  }

  addOpportunity(opp: Omit<Opportunity, "id" | "createdAt" | "updatedAt">): Opportunity {
    const newOpp: Opportunity = {
      ...opp,
      id: "opp_" + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.opportunities.push(newOpp);
    this.recalculateCompanyCounters();
    this.notify();
    return newOpp;
  }

  updateOpportunity(opp: Opportunity) {
    this.opportunities = this.opportunities.map(o => o.id === opp.id ? { ...opp, updatedAt: new Date().toISOString() } : o);
    this.recalculateCompanyCounters();
    this.notify();
  }

  deleteOpportunity(id: string) {
    this.opportunities = this.opportunities.filter(o => o.id !== id);
    this.recalculateCompanyCounters();
    this.notify();
  }

  resetOpportunities() {
    this.opportunities = [...INITIAL_OPPORTUNITIES];
    this.recalculateCompanyCounters();
    this.notify();
  }

  // Contact Operations
  getContacts(): Contact[] {
    return this.contacts;
  }

  addContact(contact: Omit<Contact, "id" | "createdAt">): Contact {
    const newContact: Contact = {
      ...contact,
      id: "cont_" + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString()
    };
    this.contacts.push(newContact);
    this.recalculateCompanyCounters();
    this.notify();
    return newContact;
  }

  updateContact(contact: Contact) {
    this.contacts = this.contacts.map(c => c.id === contact.id ? contact : c);
    this.recalculateCompanyCounters();
    this.notify();
  }

  deleteContact(id: string) {
    this.contacts = this.contacts.filter(c => c.id !== id);
    this.recalculateCompanyCounters();
    this.notify();
  }

  // Company Operations
  getCompanies(): Company[] {
    return this.companies;
  }

  getCompanyByNameOrCreate(name: string): Company {
    const cleanName = name.trim();
    let comp = this.companies.find(c => c.name.toLowerCase() === cleanName.toLowerCase());
    if (!comp) {
      comp = {
        id: "co_" + Math.random().toString(36).substring(2, 9),
        name: cleanName,
        sector: "Secteur à préciser",
        notes: "",
        createdAt: new Date().toISOString(),
        opportunityCount: 0,
        contactCount: 0,
        noteCount: 0
      };
      this.companies.push(comp);
      this.notify();
    }
    return comp;
  }

  updateCompany(company: Company) {
    this.companies = this.companies.map(c => c.id === company.id ? company : c);
    this.notify();
  }

  deleteCompany(id: string) {
    this.companies = this.companies.filter(c => c.id !== id);
    this.notify();
  }

  // Calendar Event Operations
  getCalendarEvents(): CalendarEvent[] {
    return this.calendarEvents;
  }

  addCalendarEvent(event: Omit<CalendarEvent, "id" | "createdAt">): CalendarEvent {
    const newEvent: CalendarEvent = {
      ...event,
      id: "cal_" + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString()
    };
    this.calendarEvents.push(newEvent);
    this.notify();
    return newEvent;
  }

  updateCalendarEvent(event: CalendarEvent) {
    this.calendarEvents = this.calendarEvents.map(e => e.id === event.id ? event : e);
    this.notify();
  }

  deleteCalendarEvent(id: string) {
    this.calendarEvents = this.calendarEvents.filter(e => e.id !== id);
    this.notify();
  }

  // Document Operations
  getDocuments(): DocumentFile[] {
    return this.documents;
  }

  addDocument(doc: Omit<DocumentFile, "id" | "uploadedAt">): DocumentFile {
    const newDoc: DocumentFile = {
      ...doc,
      id: "doc_" + Math.random().toString(36).substring(2, 9),
      uploadedAt: new Date().toISOString()
    };
    this.documents.push(newDoc);
    this.notify();
    return newDoc;
  }

  deleteDocument(id: string) {
    this.documents = this.documents.filter(d => d.id !== id);
    this.notify();
  }

  // Chat Session Operations
  getChatSessions(): ChatSession[] {
    return this.chatSessions;
  }

  addChatSession(personaId: string, title: string): ChatSession {
    const personaNames: Record<string, string> = {
      general: "Conseiller Carrière",
      interview: "Coach Entretien",
      cv_letter: "Expert CV & Lettre",
      networking: "Stratège Réseau",
      negotiation: "Expert Négociation"
    };

    const newSess: ChatSession = {
      id: "sess_" + Math.random().toString(36).substring(2, 9),
      personaId,
      personaName: personaNames[personaId] || "NACORA AI",
      title,
      messages: [],
      updatedAt: new Date().toISOString()
    };
    this.chatSessions.push(newSess);
    this.notify();
    return newSess;
  }

  addMessageToSession(sessionId: string, role: "user" | "model", text: string) {
    this.chatSessions = this.chatSessions.map(sess => {
      if (sess.id === sessionId) {
        const updatedMsgs = [
          ...sess.messages,
          {
            id: "msg_" + Math.random().toString(36).substring(2, 9),
            role,
            text,
            timestamp: new Date().toISOString()
          }
        ];
        return {
          ...sess,
          messages: updatedMsgs,
          updatedAt: new Date().toISOString()
        };
      }
      return sess;
    });
    this.notify();
  }

  deleteChatSession(id: string) {
    this.chatSessions = this.chatSessions.filter(s => s.id !== id);
    this.notify();
  }
}

export const dbStore = new DBStore();
