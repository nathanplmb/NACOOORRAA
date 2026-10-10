import { Contact } from "../types";

export const SEED_CONTACTS: Contact[] = [
  {
    id: "cont_champroux",
    fullName: "Sébastien Champroux",
    firstName: "Sébastien",
    lastName: "Champroux",
    companyId: "comp_ca_cf",
    companyName: "Crédit Agricole Centre France",
    jobTitle: "Chargé de recrutement & Relations Campus",
    normalizedJobTitle: "Chargé de recrutement",
    category: "recruiter",
    relevanceScore: 95,
    connectionPoints: [
      "Partenariat bancaire avec l'Université Clermont Auvergne (UCA)",
      "Recruteur actif sur les profils Gestion de Patrimoine & Banque de Détail",
      "Établissement basé à Clermont-Ferrand"
    ],
    previousCompanies: ["Crédit Agricole Groupe", "Groupama Rhône-Alpes Auvergne"],
    notes: "Contact très réceptif rencontré via LinkedIn. Intéressé par le profil orienté conseil patrimonial et conformité.",
    email: "sebastien.champroux@ca-centrefrance.fr",
    linkedInUrl: "https://www.linkedin.com/in/sebastien-champroux-ca",
    city: "Clermont-Ferrand",
    location: "Clermont-Ferrand, Auvergne-Rhône-Alpes",
    sector: "Banque & Finance",
    seniority: "Manager / Confirmé",
    networkingStatus: "reponse_recue",
    outreachTone: "vouvoiement",
    outreachChannel: "linkedin",
    outreachCategory: "connexion_premier_contact",
    outreachSubType: "point_commun",
    outreachStage: "premier_message",
    followUpStage: 1,
    initialMessageSentDate: "2026-09-24",
    lastOutreachDate: "2026-09-24",
    nextFollowUpDate: "2026-10-04",
    nextAction: {
      type: "repondre",
      label: "Répondre à sa proposition et transmettre le CV",
      dueDate: "2026-09-29",
      priority: "urgent"
    },
    createdAt: "2026-09-20T09:00:00.000Z",
    history: [
      {
        id: "hist_c1_3",
        type: "profile_updated",
        label: "Réponse reçue : « Merci pour votre message, je vais regarder... »",
        timestamp: "2026-09-27T16:45:00.000Z"
      },
      {
        id: "hist_c1_2",
        type: "outreach_sent",
        label: "Premier message LinkedIn transmis",
        timestamp: "2026-09-24T11:15:00.000Z"
      },
      {
        id: "hist_c1_1",
        type: "import",
        label: "Contact ajouté au CRM NACORA",
        timestamp: "2026-09-20T09:00:00.000Z"
      }
    ],
    conversationMessages: [
      {
        id: "msg_champroux_1",
        sender: "nathan",
        text: "Bonjour Sébastien,\n\nÉtudiant en gestion patrimoniale à l'IUT / UCA Clermont-Ferrand, je suis avec grand intérêt le dynamisme du Crédit Agricole Centre France sur le marché des particuliers et des professionnels.\n\nSeriez-vous ouvert à un court échange informel de 10 minutes sur les compétences clés que vous recherchez au sein de vos équipes patrimoniales ?\n\nBien à vous,\nNathan",
        timestamp: "2026-09-24T11:15:00.000Z",
        channel: "linkedin",
        status: "sent"
      },
      {
        id: "msg_champroux_2",
        sender: "contact",
        text: "Bonjour Nathan,\n\nMerci pour votre message bien ciblé ! Nous sommes en pleine préparation des recrutements pour la rentrée sur nos agences du Puy-de-Dôme et de l'Allier.\n\nVotre profil correspond bien à nos recherches. Avez-vous votre CV à jour à me faire suivre ? Je pourrai le glisser directement à nos responsables de secteur.",
        timestamp: "2026-09-27T16:45:00.000Z",
        channel: "linkedin",
        status: "received"
      }
    ]
  },
  {
    id: "cont_sophie_martin",
    fullName: "Sophie Martin",
    firstName: "Sophie",
    lastName: "Martin",
    companyId: "comp_bnp",
    companyName: "BNP Paribas",
    jobTitle: "Talent Acquisition Specialist - Banque Privée & Wealth Management",
    normalizedJobTitle: "Talent Acquisition Manager",
    category: "recruiter",
    relevanceScore: 92,
    connectionPoints: [
      "Responsable des recrutements alternance & junior Banque Privée",
      "Intervenante lors des forums bancaires régionaux",
      "Échanges réguliers avec les diplômés finance de l'UCA"
    ],
    previousCompanies: ["BNP Paribas Fortis", "LCL"],
    notes: "Premier message envoyé il y a une semaine. Pas de retour pour le moment, relance J+7 à effectuer aujourd'hui.",
    email: "sophie.martin@bnpparibas.com",
    linkedInUrl: "https://www.linkedin.com/in/sophie-martin-bnp",
    city: "Lyon",
    location: "Lyon / Télétravail hybride",
    sector: "Banque & Finance",
    seniority: "Manager",
    networkingStatus: "relance_a_faire",
    outreachTone: "vouvoiement",
    outreachChannel: "linkedin",
    outreachCategory: "opportunite",
    outreachSubType: "alternance",
    outreachStage: "relance_1",
    followUpStage: 1,
    initialMessageSentDate: "2026-09-21",
    lastOutreachDate: "2026-09-21",
    nextFollowUpDate: new Date().toISOString().split("T")[0],
    nextAction: {
      type: "relance_1",
      label: "Relance 1 à effectuer aujourd'hui (J+7)",
      dueDate: new Date().toISOString().split("T")[0],
      priority: "urgent"
    },
    createdAt: "2026-09-18T10:30:00.000Z",
    history: [
      {
        id: "hist_c2_2",
        type: "outreach_sent",
        label: "Message initial envoyé via LinkedIn",
        timestamp: "2026-09-21T09:40:00.000Z"
      },
      {
        id: "hist_c2_1",
        type: "import",
        label: "Contact ajouté au CRM NACORA",
        timestamp: "2026-09-18T10:30:00.000Z"
      }
    ],
    conversationMessages: [
      {
        id: "msg_sophie_1",
        sender: "nathan",
        text: "Bonjour Sophie,\n\nJ'ai suivi avec attention le développement des activités de Banque Privée BNP Paribas dans la région Auvergne-Rhône-Alpes.\n\nActuellement en formation supérieure en gestion de patrimoine et banque privée, je serais ravi de vous poser quelques questions sur les trajectoires d'intégration des jeunes conseillers.\n\nAuriez-vous quelques minutes à m'accorder ces prochains jours ?\n\nBien cordialement,\nNathan",
        timestamp: "2026-09-21T09:40:00.000Z",
        channel: "linkedin",
        status: "sent"
      }
    ]
  },
  {
    id: "cont_delacroix",
    fullName: "Alexandre Delacroix",
    firstName: "Alexandre",
    lastName: "Delacroix",
    companyId: "comp_sg",
    companyName: "Société Générale Private Banking",
    jobTitle: "Directeur de Clientèle Patrimoniale & Alumni UCA",
    normalizedJobTitle: "Directeur Clientèle Patrimoniale",
    category: "alumni",
    relevanceScore: 89,
    connectionPoints: [
      "Alumni même formation : IUT / UCA Clermont Auvergne (Promotion 2018)",
      "Parcours exemplaire : Conseiller particulier vers Direction Patrimoniale",
      "Très actif dans l'accompagnement des étudiants"
    ],
    previousCompanies: ["Crédit du Nord", "Société Générale"],
    notes: "A accepté ma demande de connexion LinkedIn ce matin ! Premier message d'échange après acceptation à envoyer.",
    email: "alexandre.delacroix@sg.fr",
    linkedInUrl: "https://www.linkedin.com/in/alexandre-delacroix-sg",
    city: "Clermont-Ferrand",
    location: "Clermont-Ferrand",
    sector: "Banque & Gestion de Patrimoine",
    seniority: "Directeur / Senior",
    networkingStatus: "connexion_acceptee",
    outreachTone: "vouvoiement",
    outreachChannel: "linkedin",
    outreachCategory: "recommandation",
    outreachSubType: "alumni_ecole",
    outreachStage: "message_apres_acceptation",
    followUpStage: 0,
    nextFollowUpDate: new Date().toISOString().split("T")[0],
    nextAction: {
      type: "premier_message",
      label: "Envoyer le message d'échange après acceptation",
      dueDate: new Date().toISOString().split("T")[0],
      priority: "to_do"
    },
    createdAt: "2026-09-22T14:00:00.000Z",
    history: [
      {
        id: "hist_c3_2",
        type: "profile_updated",
        label: "Invitation acceptée sur LinkedIn",
        timestamp: "2026-09-28T08:15:00.000Z"
      },
      {
        id: "hist_c3_1",
        type: "outreach_sent",
        label: "Demande de connexion LinkedIn envoyée",
        timestamp: "2026-09-26T17:30:00.000Z"
      }
    ],
    conversationMessages: [
      {
        id: "msg_delacroix_sys_1",
        sender: "system",
        text: "Demande de connexion LinkedIn transmise le 26 septembre avec note personnalisée Alumni.",
        timestamp: "2026-09-26T17:30:00.000Z"
      },
      {
        id: "msg_delacroix_sys_2",
        sender: "system",
        text: "Alexandre Delacroix a accepté votre invitation sur LinkedIn.",
        timestamp: "2026-09-28T08:15:00.000Z"
      }
    ]
  },
  {
    id: "cont_camille_roche",
    fullName: "Camille Roche",
    firstName: "Camille",
    lastName: "Roche",
    companyId: "comp_cepal",
    companyName: "Caisse d'Épargne Auvergne Limousin",
    jobTitle: "Directrice d'Agence & Manager de Proximité",
    normalizedJobTitle: "Directrice d'Agence",
    category: "sector_pro",
    relevanceScore: 86,
    connectionPoints: [
      "Responsable de recrutement pour 3 agences de l'agglomération clermontoise",
      "Spécialiste de la relation clientèle patrimoniale et des pros",
      "Échange téléphonique chaleureux réalisé hier"
    ],
    previousCompanies: ["BPCE", "Banque Populaire Auvergne Rhône Alpes"],
    notes: "Appel de 15 minutes très constructif réalisé hier. Elle m'a conseillé de postuler à l'offre en cours et de mentionner notre échange à la DRH.",
    email: "camille.roche@cepal.caisse-epargne.fr",
    linkedInUrl: "https://www.linkedin.com/in/camille-roche-cepal",
    city: "Chamalières",
    location: "Chamalières / Clermont-Ferrand",
    sector: "Banque de Détail & Assurance",
    seniority: "Directrice / Manager",
    networkingStatus: "echange_realise",
    outreachTone: "vouvoiement",
    outreachChannel: "email",
    outreachCategory: "networking_echange",
    outreachSubType: "comprendre_entreprise",
    outreachStage: "relance_1",
    followUpStage: 2,
    initialMessageSentDate: "2026-09-15",
    lastOutreachDate: "2026-09-27",
    nextFollowUpDate: "2026-10-02",
    nextAction: {
      type: "remercier",
      label: "Envoyer un mot de remerciement post-échange et lien CV",
      dueDate: "2026-09-29",
      priority: "to_do"
    },
    createdAt: "2026-09-12T08:00:00.000Z",
    history: [
      {
        id: "hist_c4_4",
        type: "note_added",
        label: "Entretien téléphonique de 15 min réalisé avec succès",
        timestamp: "2026-09-27T14:30:00.000Z"
      },
      {
        id: "hist_c4_3",
        type: "profile_updated",
        label: "Créneau validé pour un échange téléphonique",
        timestamp: "2026-09-25T10:00:00.000Z"
      },
      {
        id: "hist_c4_2",
        type: "outreach_sent",
        label: "Email d'approche transmis",
        timestamp: "2026-09-15T15:20:00.000Z"
      }
    ],
    conversationMessages: [
      {
        id: "msg_camille_1",
        sender: "nathan",
        text: "Bonjour Madame Roche,\n\nEn formation en gestion patrimoniale à Clermont-Ferrand, j'apprécie tout particulièrement l'ancrage territorial de la Caisse d'Épargne Auvergne Limousin.\n\nSeriez-vous disponible pour un rapide échange téléphonique sur les métiers du conseil patrimonial au sein de votre agence ?\n\nBien cordialement,\nNathan",
        timestamp: "2026-09-15T15:20:00.000Z",
        channel: "email",
        status: "sent"
      },
      {
        id: "msg_camille_2",
        sender: "contact",
        text: "Bonjour Nathan,\n\nAvec grand plaisir ! C'est une excellente initiative. Je peux me rendre disponible ce jeudi à 14h30 pour un appel de 15 minutes. N'hésitez pas à me joindre directement sur mon portable professionnel.",
        timestamp: "2026-09-25T10:00:00.000Z",
        channel: "email",
        status: "received"
      },
      {
        id: "msg_camille_sys",
        sender: "note",
        text: "Échange téléphonique réalisé le 27 septembre (15 min). Retour très chaleureux. Recommande d'envoyer la candidature officielle en citant notre échange.",
        timestamp: "2026-09-27T14:45:00.000Z"
      }
    ]
  },
  {
    id: "cont_thomas_girard",
    fullName: "Thomas Girard",
    firstName: "Thomas",
    lastName: "Girard",
    companyId: "comp_natixis",
    companyName: "Natixis Corporate & Investment Banking",
    jobTitle: "Responsable Recrutement Campus & Programmes Alternance",
    normalizedJobTitle: "Campus Manager",
    category: "recruiter",
    relevanceScore: 84,
    connectionPoints: [
      "Pilote les programmes jeunes talents & alternances CIB",
      "Événements carrières finance de marché",
      "Point de contact clé pour les métiers d'analyste"
    ],
    previousCompanies: ["Groupe BPCE", "Mazars"],
    notes: "Demande de connexion envoyée sur LinkedIn le 26 septembre avec message personnalisé.",
    email: "thomas.girard@natixis.com",
    linkedInUrl: "https://www.linkedin.com/in/thomas-girard-natixis",
    city: "Paris",
    location: "Paris / La Défense",
    sector: "Banque d'Investissement & Marchés",
    seniority: "Manager",
    networkingStatus: "demande_envoyee",
    outreachTone: "vouvoiement",
    outreachChannel: "linkedin",
    outreachCategory: "opportunite",
    outreachSubType: "alternance",
    outreachStage: "demande_connexion",
    followUpStage: 0,
    initialMessageSentDate: "2026-09-26",
    nextFollowUpDate: "2026-10-03",
    nextAction: {
      type: "relance_1",
      label: "Vérifier acceptation connexion (J+7)",
      dueDate: "2026-10-03",
      priority: "pending"
    },
    createdAt: "2026-09-26T11:00:00.000Z",
    history: [
      {
        id: "hist_c5_1",
        type: "outreach_sent",
        label: "Demande de connexion LinkedIn transmise",
        timestamp: "2026-09-26T11:20:00.000Z"
      }
    ],
    conversationMessages: [
      {
        id: "msg_thomas_1",
        sender: "nathan",
        text: "Bonjour Thomas, étudiant en Master Finance & Gestion Patrimoniale, je suis les programmes CIB de Natixis. Ravi de rejoindre votre réseau !",
        timestamp: "2026-09-26T11:20:00.000Z",
        channel: "linkedin",
        status: "sent"
      }
    ]
  }
];
