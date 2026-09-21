import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "fr" | "en";

export interface Translations {
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    search: string;
    close: string;
    back: string;
    loading: string;
    confirm: string;
    export: string;
    view: string;
    yes: string;
    no: string;
    all: string;
    status: string;
    date: string;
    notes: string;
    details: string;
    error: string;
    success: string;
    info: string;
    actions: string;
    consult: string;
    required: string;
  };
  nav: {
    home: string;
    opportunities: string;
    calendar: string;
    documents: string;
    contacts: string;
    companies: string;
    settings: string;
    careerAiHub: string;
    interviewCoach: string;
    linkedinNetwork: string;
    cvLetterExpert: string;
    salaryNegotiation: string;
    searchAndTracking: string;
    aiAccelerators: string;
    dashboard: string;
    candidateProfile: string;
    candidateSpace: string;
    aiActive: string;
    searchPlaceholder: string;
    logout: string;
    logoutConfirm: string;
    privacy: string;
    terms: string;
    version: string;
  };
  home: {
    dailyBriefTitle: string;
    liveSync: string;
    regenBrief: string;
    generating: string;
    recommendedActions: string;
    keyActionsCount: string;
    noActions: string;
    challengeTag: string;
    challengeQuestion: string;
    challengeYes: string;
    challengeNo: string;
    challengeValidated: string;
    challengeLaunchAi: string;
    challengeHelpText: string;
    upcomingDeadlines: string;
    viewFullCalendar: string;
    noDeadlines: string;
    addEvent: string;
    interview: string;
    deadline: string;
    followUp: string;
    priorityHigh: string;
    priorityMedium: string;
    priorityNormal: string;
    application: string;
    network: string;
    profile: string;
    agenda: string;
    aiCareer: string;
  };
  opportunities: {
    title: string;
    subtitle: string;
    newOpportunity: string;
    aiExtraction: string;
    exportCsv: string;
    allContracts: string;
    apprenticeship: string;
    proContract: string;
    internship: string;
    overdueFilter: string;
    searchPlaceholder: string;
    colSaved: string;
    colSavedDesc: string;
    colToPrepare: string;
    colToPrepareDesc: string;
    colToStudy: string;
    colToStudyDesc: string;
    colToApply: string;
    colToApplyDesc: string;
    emptyColumn: string;
    tabOffer: string;
    tabFit: string;
    tabCompany: string;
    tabWorkflow: string;
    salary: string;
    location: string;
    contract: string;
    duration: string;
    startDate: string;
    deadline: string;
    url: string;
    privateNotes: string;
    saveNotes: string;
    deleteModalTitle: string;
    deleteModalDesc: string;
    addModalTitle: string;
    editModalTitle: string;
    jobTitle: string;
    companyName: string;
    status: string;
    lateBadge: string;
    saved: string;
    toPrepare: string;
    toStudy: string;
    toApply: string;
    importCsv: string;
    extractAi: string;
    addOpportunity: string;
    filterAll: string;
    filterApprenticeship: string;
    filterInternship: string;
    filterLate: string;
  };
  calendar: {
    title: string;
    subtitle: string;
    addEvent: string;
    today: string;
    tomorrow: string;
    all: string;
    allEvents: string;
    upcoming: string;
    interviews: string;
    deadlines: string;
    followUps: string;
    other: string;
    upcomingTitle: string;
    noEvents: string;
    emptyMonth: string;
    daysOfWeek: string[];
    daysOfWeekShort: string[];
    months: string[];
    modalAddTitle: string;
    modalEditTitle: string;
    eventTitle: string;
    eventDate: string;
    eventTime: string;
    eventType: string;
    linkedOpp: string;
    notes: string;
  };
  documents: {
    title: string;
    subtitle: string;
    addDoc: string;
    emptyState: string;
    noDocs: string;
    addedOn: string;
    cv: string;
    coverLetter: string;
    diploma: string;
    other: string;
    modalTitle: string;
    docTitle: string;
    docType: string;
    docContent: string;
    download: string;
    deleteConfirm: string;
  };
  contacts: {
    title: string;
    subtitle: string;
    addContact: string;
    importLinkedin: string;
    pasteText: string;
    allCategories: string;
    recruiter: string;
    manager: string;
    alumni: string;
    hr: string;
    otherCategory: string;
    allStatuses: string;
    identified: string;
    contacted: string;
    inDiscussion: string;
    interviewScheduled: string;
    offerReceived: string;
    archived: string;
    searchPlaceholder: string;
    sortRelevance: string;
    sortRecent: string;
    sortName: string;
    noContacts: string;
    contactCount: string;
    totalContacts: string;
    recruiters: string;
  };
  companies: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    enrichAi: string;
    enriching: string;
    associatedContacts: string;
    associatedOpps: string;
    noCompanies: string;
    sector: string;
    size: string;
    location: string;
    website: string;
    description: string;
    jobs: string;
    contacts: string;
    notes: string;
    explore: string;
    enrichWeb: string;
  };
  profile: {
    title: string;
    subtitle: string;
    completionScore: string;
    tabOverview: string;
    tabIdentity: string;
    tabObjectives: string;
    tabExperiences: string;
    tabEducation: string;
    tabSkills: string;
    tabLanguages: string;
    tabCertifications: string;
    tabProjects: string;
    tabInterests: string;
    saveChanges: string;
    savedSuccess: string;
    cvImportTitle: string;
    cvImportDesc: string;
    overview: string;
    identity: string;
    objectives: string;
    experiences: string;
    education: string;
    skills: string;
    languages: string;
    certifications: string;
    projects: string;
    interests: string;
    completed: string;
    autoSave: string;
    profileLevel: string;
    returnOverview: string;
  };
  hubIa: {
    title: string;
    subtitle: string;
    selectSpecialist: string;
    careerAdvisor: string;
    careerAdvisorRole: string;
    careerAdvisorDesc: string;
    interviewCoach: string;
    interviewCoachRole: string;
    interviewCoachDesc: string;
    linkedinStrategist: string;
    linkedinStrategistRole: string;
    linkedinStrategistDesc: string;
    cvExpert: string;
    cvExpertRole: string;
    cvExpertDesc: string;
    salaryNegotiator: string;
    salaryNegotiatorRole: string;
    salaryNegotiatorDesc: string;
    chatPlaceholder: string;
    send: string;
    thinking: string;
    newChat: string;
    clearChat: string;
    copy: string;
    copied: string;
    activeFocus: string;
    chooseFocus: string;
    history: string;
    hide: string;
    historyTitle: string;
    activeTopic: string;
    disable: string;
    listening: string;
    selectSuggestion: string;
    analyzing: string;
    contextUsed: string;
    realTime: string;
    candidateProfile: string;
    opportunities: string;
    active: string;
    networkContacts: string;
    alumni: string;
    calendarDeadlines: string;
    trackedCompanies: string;
    documents: string;
    activeStudySubject: string;
    change: string;
    select: string;
    noSubjectSelected: string;
    ongoingOpportunities: string;
    recentContacts: string;
    specialistsTitle: string;
    expertsCount: string;
    show: string;
    noHistory: string;
    startSession: string;
  };
  cookie: {
    title: string;
    text: string;
    decline: string;
    acceptAll: string;
  };
  auth: {
    brandSub: string;
    secureLogin: string;
    loginSub: string;
    googleButton: string;
    signingIn: string;
  };
}

const translationsData: Record<Language, Translations> = {
  fr: {
    common: {
      save: "Enregistrer",
      cancel: "Annuler",
      delete: "Supprimer",
      edit: "Modifier",
      add: "Ajouter",
      search: "Rechercher",
      close: "Fermer",
      back: "Retour",
      loading: "Chargement...",
      confirm: "Confirmer",
      export: "Exporter",
      view: "Consulter",
      yes: "Oui",
      no: "Non",
      all: "Tous",
      status: "Statut",
      date: "Date",
      notes: "Notes",
      details: "Détails",
      error: "Erreur",
      success: "Succès",
      info: "Information",
      actions: "Actions",
      consult: "Consulter",
      required: "Requis"
    },
    nav: {
      home: "Accueil",
      opportunities: "Opportunités",
      calendar: "Calendrier",
      documents: "Documents",
      contacts: "Contacts",
      companies: "Entreprises",
      settings: "Paramètres",
      careerAiHub: "Coaching & Stratégie",
      interviewCoach: "Interview Coach",
      linkedinNetwork: "LinkedIn & Réseau",
      cvLetterExpert: "Expert CV & Lettre",
      salaryNegotiation: "Négociation Salaire",
      searchAndTracking: "Recherche & Suivi",
      aiAccelerators: "Coaching & Préparation",
      dashboard: "Tableau de bord",
      candidateProfile: "Profil Candidat",
      candidateSpace: "Espace Candidat",
      aiActive: "Espace Connecté",
      searchPlaceholder: "Rechercher une offre, un contact, un document... (⌘K)",
      logout: "Se déconnecter",
      logoutConfirm: "Déconnexion réussie.",
      privacy: "Confidentialité",
      terms: "CGU",
      version: "v1.0"
    },
    home: {
      dailyBriefTitle: "Synthèse de la journée",
      liveSync: "En direct",
      regenBrief: "Actualiser ma synthèse",
      generating: "Génération...",
      recommendedActions: "Actions recommandées prioritaires",
      keyActionsCount: "3 actions clés",
      noActions: "Aucune action prioritaire requise pour le moment.",
      challengeTag: "Défi Réseau de la semaine",
      challengeQuestion: "As-tu réalisé ton contact réseau prioritaire cette semaine ?",
      challengeYes: "Oui, c'est fait ! ✅",
      challengeNo: "Non, pas encore ⏳",
      challengeValidated: "Objectif validé aujourd'hui !",
      challengeLaunchAi: "Préparer ma prise de contact",
      challengeHelpText: "Chaque action de réseautage validée renforce votre profil et affine les recommandations prioritaires.",
      upcomingDeadlines: "Prochaines Échéances du Calendrier",
      viewFullCalendar: "Voir le calendrier complet",
      noDeadlines: "Aucune échéance à venir enregistrée dans votre agenda.",
      addEvent: "Ajouter un événement",
      interview: "Entretien",
      deadline: "Échéance",
      followUp: "Relance",
      priorityHigh: "Priorité Haute",
      priorityMedium: "Priorité Moyenne",
      priorityNormal: "Priorité Normale",
      application: "Candidature",
      network: "Réseau",
      profile: "Profil",
      agenda: "Agenda",
      aiCareer: "Coaching"
    },
    opportunities: {
      title: "Opportunités & Candidatures",
      subtitle: "Gère ton pipeline d'alternance, analyse l'adéquation et pilote tes candidatures",
      newOpportunity: "Nouvelle offre",
      aiExtraction: "Importer une offre",
      exportCsv: "Exporter CSV",
      allContracts: "Tous les contrats",
      apprenticeship: "Apprentissage",
      proContract: "Professionnalisation",
      internship: "Stage",
      overdueFilter: "En retard",
      searchPlaceholder: "Rechercher par poste, entreprise, ville...",
      colSaved: "Sauvegardée",
      colSavedDesc: "Offres repérées et mises de côté",
      colToPrepare: "À préparer",
      colToPrepareDesc: "Dossier & CV en préparation",
      colToStudy: "À étudier",
      colToStudyDesc: "Analyse d'adéquation en cours",
      colToApply: "À candidater",
      colToApplyDesc: "Prêt pour envoi de candidature",
      emptyColumn: "Aucune opportunité dans cette colonne",
      tabOffer: "Offre & Description",
      tabFit: "Profil & Adéquation",
      tabCompany: "Entreprise & Infos",
      tabWorkflow: "Workflow & Étapes",
      salary: "Rémunération",
      location: "Localisation",
      contract: "Type de contrat",
      duration: "Durée",
      startDate: "Date de début",
      deadline: "Date limite",
      url: "Lien de l'offre",
      privateNotes: "Notes privées & Stratégie",
      saveNotes: "Enregistrer mes notes",
      deleteModalTitle: "Supprimer cette opportunité ?",
      deleteModalDesc: "Cette action supprimera définitivement l'opportunité de votre pipeline.",
      addModalTitle: "Ajouter une opportunité",
      editModalTitle: "Modifier l'opportunité",
      jobTitle: "Intitulé du poste",
      companyName: "Nom de l'entreprise",
      status: "Statut du pipeline",
      lateBadge: "Retard détecté",
      saved: "Enregistrées",
      toPrepare: "À préparer",
      toStudy: "À étudier",
      toApply: "À candidater",
      importCsv: "Importer CSV",
      extractAi: "Extraction IA",
      addOpportunity: "Nouvelle opportunité",
      filterAll: "Tous",
      filterApprenticeship: "Alternance",
      filterInternship: "Stage",
      filterLate: "En retard"
    },
    calendar: {
      title: "Calendrier & Échéances",
      subtitle: "Planifie tes entretiens, relances de recruteurs et deadlines de candidature",
      addEvent: "Nouvel événement",
      today: "Aujourd'hui",
      tomorrow: "Demain",
      all: "Tous les événements",
      allEvents: "Tous",
      upcoming: "À venir",
      interviews: "Entretiens",
      deadlines: "Deadlines",
      followUps: "Relances",
      other: "Autres",
      upcomingTitle: "Événements à venir",
      noEvents: "Aucun événement prévu sur cette période.",
      emptyMonth: "Aucun événement ce mois-ci",
      daysOfWeek: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
      daysOfWeekShort: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
      months: ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"],
      modalAddTitle: "Planifier un événement",
      modalEditTitle: "Modifier l'événement",
      eventTitle: "Titre de l'événement",
      eventDate: "Date",
      eventTime: "Heure (optionnel)",
      eventType: "Catégorie d'événement",
      linkedOpp: "Opportunité associée",
      notes: "Notes & Préparation"
    },
    documents: {
      title: "Bibliothèque de Documents",
      subtitle: "Gère tes versions de CV, tes modèles de lettres de motivation et tes diplômes officiels",
      addDoc: "Ajouter un document",
      emptyState: "Aucun document téléversé. Ajoutes-en un pour l'avoir sous la main !",
      noDocs: "Aucun document importé",
      addedOn: "Ajouté le",
      cv: "CV",
      coverLetter: "Lettre de motivation",
      diploma: "Diplôme / Certificat",
      other: "Autre document",
      modalTitle: "Téléverser un nouveau document",
      docTitle: "Titre du document",
      docType: "Type de document",
      docContent: "Contenu texte ou description",
      download: "Télécharger",
      deleteConfirm: "Supprimer ce document ?"
    },
    contacts: {
      title: "Annuaire & Réseau Professionnel",
      subtitle: "Identifie des recruteurs, managers cibles et alumni pour accélérer tes opportunités",
      addContact: "Nouveau contact",
      importLinkedin: "Import LinkedIn",
      pasteText: "Coller texte / contacts",
      allCategories: "Toutes les catégories",
      recruiter: "Recruteur",
      manager: "Manager / Opérationnel",
      alumni: "Alumni",
      hr: "Ressources Humaines",
      otherCategory: "Autre contact",
      allStatuses: "Tous les statuts",
      identified: "Identifié",
      contacted: "Contacté",
      inDiscussion: "En échange",
      interviewScheduled: "Entretien planifié",
      offerReceived: "Offre reçue",
      archived: "Archivé",
      searchPlaceholder: "Rechercher par nom, entreprise, poste...",
      sortRelevance: "Pertinence",
      sortRecent: "Récemment ajoutés",
      sortName: "Nom A-Z",
      noContacts: "Aucun contact trouvé avec ces critères.",
      contactCount: "contacts enregistrés",
      totalContacts: "Total Contacts",
      recruiters: "Recruteurs & RH"
    },
    companies: {
      title: "Entreprises Cibles & Veille",
      subtitle: "Explore les structures cibles, leurs effectifs et opportunités associées",
      searchPlaceholder: "Rechercher une entreprise par nom ou secteur...",
      enrichAi: "Enrichissement IA",
      enriching: "Recherche en ligne...",
      associatedContacts: "Contacts associés",
      associatedOpps: "Opportunités ouvertes",
      noCompanies: "Aucune entreprise enregistrée.",
      sector: "Secteur d'activité",
      size: "Effectif",
      location: "Siège / Localisation",
      website: "Site officiel",
      description: "Description & Activités",
      jobs: "Offres",
      contacts: "Contacts",
      notes: "Notes",
      explore: "Consulter la fiche",
      enrichWeb: "Enrichir avec l'IA"
    },
    profile: {
      title: "Mon Profil Candidat",
      subtitle: "Complète tes informations académiques et professionnelles pour optimiser les IA",
      completionScore: "Score de complétion du profil",
      tabOverview: "Vue d'ensemble",
      tabIdentity: "Identité & Contact",
      tabObjectives: "Objectifs & Alternance",
      tabExperiences: "Expériences",
      tabEducation: "Formations",
      tabSkills: "Compétences & Outils",
      tabLanguages: "Langues",
      tabCertifications: "Certifications",
      tabProjects: "Projets réalisés",
      tabInterests: "Centres d'intérêt",
      saveChanges: "Enregistrer les modifications",
      savedSuccess: "Profil mis à jour avec succès !",
      cvImportTitle: "Importer depuis un CV existant",
      cvImportDesc: "Extraction automatique de vos expériences, formations et compétences.",
      overview: "Aperçu général",
      identity: "Identité & Contact",
      objectives: "Objectifs & Cibles",
      experiences: "Expériences",
      education: "Formations",
      skills: "Compétences",
      languages: "Langues",
      certifications: "Certifications",
      projects: "Projets réalisés",
      interests: "Centres d'intérêt",
      completed: "complété",
      autoSave: "Sauvegarde auto",
      profileLevel: "Niveau de complétion",
      returnOverview: "Retour à l'aperçu"
    },
    hubIa: {
      title: "Espace Coaching & Stratégie",
      subtitle: "Conseils spécialisés et modules d'entraînement pour vos candidatures et entretiens",
      selectSpecialist: "Pôles d'expertise NACORA",
      careerAdvisor: "Conseiller Carrière",
      careerAdvisorRole: "Orientation & Stratégie",
      careerAdvisorDesc: "Structure ta recherche et affine ta stratégie professionnelle",
      interviewCoach: "Interview Coach",
      interviewCoachRole: "Simulation & Préparation",
      interviewCoachDesc: "Entraîne-toi aux questions clés et aux pitchs de présentation",
      linkedinStrategist: "Stratège LinkedIn & Réseau",
      linkedinStrategistRole: "Approches & Messages",
      linkedinStrategistDesc: "Rédige des messages d'approche ciblés vers recruteurs et alumni",
      cvExpert: "Expert CV & Lettre",
      cvExpertRole: "Optimisation de dossier",
      cvExpertDesc: "Améliore tes accroches, mots-clés ATS et formule tes succès",
      salaryNegotiator: "Négociateur Salaire & Offres",
      salaryNegotiatorRole: "Rémunération & Avantages",
      salaryNegotiatorDesc: "Estime ta valeur de marché et prépare tes arguments de négociation",
      chatPlaceholder: "Pose ta question ou demande une simulation précise...",
      send: "Envoyer",
      thinking: "Analyse de vos données en cours...",
      newChat: "Nouvelle session",
      clearChat: "Effacer l'historique",
      copy: "Copier",
      copied: "Copié !",
      activeFocus: "Élément en focus",
      chooseFocus: "Choisir un élément",
      history: "Historique",
      hide: "Masquer",
      historyTitle: "Historique",
      activeTopic: "Sujet actif :",
      disable: "Désactiver",
      listening: "est à ton écoute",
      selectSuggestion: "Sélectionne une suggestion ou pose directement ta question.",
      analyzing: "analyse et rédige sa réponse...",
      contextUsed: "Contexte Utilisé",
      realTime: "Temps réel",
      candidateProfile: "Profil candidat",
      opportunities: "Opportunités",
      active: "actives",
      networkContacts: "Contacts réseau",
      alumni: "alumni",
      calendarDeadlines: "Échéances agenda",
      trackedCompanies: "Entreprises suivies",
      documents: "Documents",
      activeStudySubject: "Sujet d'étude actif",
      change: "Modifier",
      select: "Sélectionner",
      noSubjectSelected: "Aucun sujet d'étude ciblé. L'IA utilisera l'ensemble de tes opportunités et de ton profil.",
      ongoingOpportunities: "Opportunités en cours",
      recentContacts: "Contacts récents",
      specialistsTitle: "Spécialistes IA NACORA",
      expertsCount: "5 experts dédiés",
      show: "Afficher",
      noHistory: "Aucun échange archivé pour ce conseiller.",
      startSession: "Démarrer une session"
    },
    cookie: {
      title: "Transparence & Confidentialité",
      text: "NACORA utilise uniquement le stockage local de votre navigateur pour maintenir votre session sécurisée et stocker vos opportunités de carrière. Aucun cookie publicitaire ou traceur tiers n'est utilisé.",
      decline: "Refuser",
      acceptAll: "Tout accepter"
    },
    auth: {
      brandSub: "Plateforme haut de gamme de pilotage de candidatures et networking intelligent.",
      secureLogin: "Connexion sécurisée",
      loginSub: "Accédez instantanément à votre espace candidat personnalisé avec votre compte Google.",
      googleButton: "Continuer avec Google",
      signingIn: "Connexion en cours..."
    }
  },
  en: {
    common: {
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      add: "Add",
      search: "Search",
      close: "Close",
      back: "Back",
      loading: "Loading...",
      confirm: "Confirm",
      export: "Export",
      view: "View",
      yes: "Yes",
      no: "No",
      all: "All",
      status: "Status",
      date: "Date",
      notes: "Notes",
      details: "Details",
      error: "Error",
      success: "Success",
      info: "Info",
      actions: "Actions",
      consult: "Consult",
      required: "Required"
    },
    nav: {
      home: "Home",
      opportunities: "Opportunities",
      calendar: "Calendar",
      documents: "Documents",
      contacts: "Contacts",
      companies: "Companies",
      settings: "Settings",
      careerAiHub: "Coaching & Strategy",
      interviewCoach: "Interview Coach",
      linkedinNetwork: "LinkedIn & Network",
      cvLetterExpert: "CV & Letter Expert",
      salaryNegotiation: "Salary Negotiation",
      searchAndTracking: "Search & Tracking",
      aiAccelerators: "Coaching & Preparation",
      dashboard: "Dashboard",
      candidateProfile: "Candidate Profile",
      candidateSpace: "Candidate Space",
      aiActive: "Connected Space",
      searchPlaceholder: "Search for an offer, contact, document... (⌘K)",
      logout: "Log Out",
      logoutConfirm: "Successfully logged out.",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
      version: "v1.0"
    },
    home: {
      dailyBriefTitle: "Daily Overview",
      liveSync: "Live",
      regenBrief: "Refresh Summary",
      generating: "Generating...",
      recommendedActions: "Top Recommended Actions",
      keyActionsCount: "3 key actions",
      noActions: "No priority actions required right now.",
      challengeTag: "Weekly Networking Challenge",
      challengeQuestion: "Have you reached out to your priority network contact this week?",
      challengeYes: "Yes, done! ✅",
      challengeNo: "Not yet ⏳",
      challengeValidated: "Goal verified today!",
      challengeLaunchAi: "Prepare Outreach",
      challengeHelpText: "Each completed networking action strengthens your profile and refines priority recommendations.",
      upcomingDeadlines: "Upcoming Calendar Deadlines",
      viewFullCalendar: "View Full Calendar",
      noDeadlines: "No upcoming deadlines recorded in your schedule.",
      addEvent: "Add an event",
      interview: "Interview",
      deadline: "Deadline",
      followUp: "Follow-up",
      priorityHigh: "High Priority",
      priorityMedium: "Medium Priority",
      priorityNormal: "Normal Priority",
      application: "Application",
      network: "Network",
      profile: "Profile",
      agenda: "Schedule",
      aiCareer: "Coaching"
    },
    opportunities: {
      title: "Opportunities & Applications",
      subtitle: "Manage your internship pipeline, analyze job fit, and steer your applications",
      newOpportunity: "New Opportunity",
      aiExtraction: "Import Job Offer",
      exportCsv: "Export CSV",
      allContracts: "All contracts",
      apprenticeship: "Apprenticeship",
      proContract: "Professional Contract",
      internship: "Internship",
      overdueFilter: "Overdue",
      searchPlaceholder: "Search by title, company, location...",
      colSaved: "Saved",
      colSavedDesc: "Jobs identified and bookmarked",
      colToPrepare: "To Prepare",
      colToPrepareDesc: "Application dossier & CV in progress",
      colToStudy: "To Review",
      colToStudyDesc: "Skills fit and market assessment",
      colToApply: "To Apply",
      colToApplyDesc: "Ready for application submission",
      emptyColumn: "No opportunities in this column",
      tabOffer: "Offer & Description",
      tabFit: "Candidate Fit",
      tabCompany: "Company Intel",
      tabWorkflow: "Workflow Steps",
      salary: "Compensation",
      location: "Location",
      contract: "Contract Type",
      duration: "Duration",
      startDate: "Start Date",
      deadline: "Deadline",
      url: "Job Post URL",
      privateNotes: "Private Notes & Strategy",
      saveNotes: "Save Notes",
      deleteModalTitle: "Delete this opportunity?",
      deleteModalDesc: "This will permanently remove the opportunity from your pipeline.",
      addModalTitle: "Add an Opportunity",
      editModalTitle: "Edit Opportunity",
      jobTitle: "Job Title",
      companyName: "Company Name",
      status: "Pipeline Status",
      lateBadge: "Overdue action",
      saved: "Saved",
      toPrepare: "To Prepare",
      toStudy: "To Review",
      toApply: "To Apply",
      importCsv: "Import CSV",
      extractAi: "AI Extraction",
      addOpportunity: "New Opportunity",
      filterAll: "All",
      filterApprenticeship: "Apprenticeship",
      filterInternship: "Internship",
      filterLate: "Overdue"
    },
    calendar: {
      title: "Calendar & Deadlines",
      subtitle: "Schedule your interviews, recruiter follow-ups, and application deadlines",
      addEvent: "New Event",
      today: "Today",
      tomorrow: "Tomorrow",
      all: "All Events",
      allEvents: "All",
      upcoming: "Upcoming",
      interviews: "Interviews",
      deadlines: "Deadlines",
      followUps: "Follow-ups",
      other: "Other",
      upcomingTitle: "Upcoming Events",
      noEvents: "No events scheduled for this timeframe.",
      emptyMonth: "No events this month",
      daysOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      daysOfWeekShort: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
      modalAddTitle: "Schedule an Event",
      modalEditTitle: "Edit Event",
      eventTitle: "Event Title",
      eventDate: "Date",
      eventTime: "Time (optional)",
      eventType: "Event Category",
      linkedOpp: "Associated Opportunity",
      notes: "Notes & Prep"
    },
    documents: {
      title: "Document Library",
      subtitle: "Manage your CV versions, cover letter templates, and official diplomas",
      addDoc: "Add Document",
      emptyState: "No documents uploaded yet. Add one to keep it ready at hand!",
      noDocs: "No documents uploaded",
      addedOn: "Added on",
      cv: "CV / Resume",
      coverLetter: "Cover Letter",
      diploma: "Diploma / Degree",
      other: "Other Document",
      modalTitle: "Upload a New Document",
      docTitle: "Document Title",
      docType: "Document Type",
      docContent: "Text content or description",
      download: "Download",
      deleteConfirm: "Delete this document?"
    },
    contacts: {
      title: "Directory & Professional Network",
      subtitle: "Identify recruiters, target managers, and alumni to accelerate your opportunities",
      addContact: "New Contact",
      importLinkedin: "LinkedIn Import",
      pasteText: "Paste text / contacts",
      allCategories: "All categories",
      recruiter: "Recruiter",
      manager: "Manager / Operational",
      alumni: "Alumni",
      hr: "Human Resources",
      otherCategory: "Other Contact",
      allStatuses: "All statuses",
      identified: "Identified",
      contacted: "Contacted",
      inDiscussion: "In Discussion",
      interviewScheduled: "Interview Scheduled",
      offerReceived: "Offer Received",
      archived: "Archived",
      searchPlaceholder: "Search by name, company, position...",
      sortRelevance: "Relevance",
      sortRecent: "Recently Added",
      sortName: "Name A-Z",
      noContacts: "No contacts found matching criteria.",
      contactCount: "saved contacts",
      totalContacts: "Total Contacts",
      recruiters: "Recruiters & HR"
    },
    companies: {
      title: "Target Companies & Intelligence",
      subtitle: "Explore target organizations, company size, and associated opportunities",
      searchPlaceholder: "Search company by name or sector...",
      enrichAi: "AI Enrichment",
      enriching: "Searching online...",
      associatedContacts: "Associated Contacts",
      associatedOpps: "Open Opportunities",
      noCompanies: "No companies saved yet.",
      sector: "Industry Sector",
      size: "Headcount",
      location: "HQ / Location",
      website: "Official Website",
      description: "Description & Operations",
      jobs: "Jobs",
      contacts: "Contacts",
      notes: "Notes",
      explore: "View dossier",
      enrichWeb: "Enrich with AI"
    },
    profile: {
      title: "My Candidate Profile",
      subtitle: "Complete your academic and career background to maximize AI relevance",
      completionScore: "Profile Completion Score",
      tabOverview: "Overview",
      tabIdentity: "Identity & Contact",
      tabObjectives: "Objectives & Target Roles",
      tabExperiences: "Experiences",
      tabEducation: "Education",
      tabSkills: "Skills & Tools",
      tabLanguages: "Languages",
      tabCertifications: "Certifications",
      tabProjects: "Featured Projects",
      tabInterests: "Personal Interests",
      saveChanges: "Save Changes",
      savedSuccess: "Profile successfully updated!",
      cvImportTitle: "Import from Existing Resume",
      cvImportDesc: "Automated extraction of your experiences, education, and skills.",
      overview: "Overview",
      identity: "Identity & Contact",
      objectives: "Objectives & Targets",
      experiences: "Experiences",
      education: "Education",
      skills: "Skills & Tools",
      languages: "Languages",
      certifications: "Certifications",
      projects: "Featured Projects",
      interests: "Interests",
      completed: "completed",
      autoSave: "Auto-saved",
      profileLevel: "Completion Level",
      returnOverview: "Return to Overview"
    },
    hubIa: {
      title: "Coaching & Strategy Hub",
      subtitle: "Dedicated specialist advisors and tools to prepare your applications and interviews",
      selectSpecialist: "NACORA Advisory Areas",
      careerAdvisor: "Career Advisor",
      careerAdvisorRole: "Orientation & Strategy",
      careerAdvisorDesc: "Structure your search and refine your career trajectory",
      interviewCoach: "Interview Coach",
      interviewCoachRole: "Simulation & Prep",
      interviewCoachDesc: "Practice key questions, objection handling, and elevator pitches",
      linkedinStrategist: "LinkedIn & Network Strategist",
      linkedinStrategistRole: "Outreach & Messaging",
      linkedinStrategistDesc: "Craft targeted outreach messages to recruiters and alumni",
      cvExpert: "CV & Letter Expert",
      cvExpertRole: "Dossier Optimization",
      cvExpertDesc: "Enhance your hooks, ATS keywords, and measurable accomplishments",
      salaryNegotiator: "Salary & Offer Negotiator",
      salaryNegotiatorRole: "Compensation & Perks",
      salaryNegotiatorDesc: "Assess your market value and prepare sound negotiation arguments",
      chatPlaceholder: "Ask a question or request a specific coaching scenario...",
      send: "Send",
      thinking: "Analyzing your profile and context...",
      newChat: "New Session",
      clearChat: "Clear History",
      copy: "Copy",
      copied: "Copied!",
      activeFocus: "Active Focus Element",
      chooseFocus: "Choose focus item",
      history: "History",
      hide: "Hide",
      historyTitle: "History",
      activeTopic: "Active topic:",
      disable: "Disable",
      listening: "is ready to assist",
      selectSuggestion: "Select a suggestion or type your query directly.",
      analyzing: "is analyzing your context...",
      contextUsed: "Context Utilized",
      realTime: "Real-time",
      candidateProfile: "Candidate Profile",
      opportunities: "Opportunities",
      active: "active",
      networkContacts: "Network Contacts",
      alumni: "alumni",
      calendarDeadlines: "Calendar Deadlines",
      trackedCompanies: "Tracked Companies",
      documents: "Documents",
      activeStudySubject: "Active Study Subject",
      change: "Change",
      select: "Select",
      noSubjectSelected: "No targeted focus selected. The AI will leverage all opportunities and your full profile.",
      ongoingOpportunities: "Ongoing Opportunities",
      recentContacts: "Recent Contacts",
      specialistsTitle: "NACORA AI Specialists",
      expertsCount: "5 dedicated experts",
      show: "Show",
      noHistory: "No archived conversation for this advisor.",
      startSession: "Start a session"
    },
    cookie: {
      title: "Transparency & Privacy",
      text: "NACORA exclusively utilizes your browser's local storage to securely maintain your session and store your career opportunities. No advertising cookies or third-party trackers are used.",
      decline: "Decline",
      acceptAll: "Accept All"
    },
    auth: {
      brandSub: "High-end career management and intelligent networking platform.",
      secureLogin: "Secure Sign-in",
      loginSub: "Instantly access your personalized candidate workspace with your Google account.",
      googleButton: "Continue with Google",
      signingIn: "Signing in..."
    }
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem("nacora_lang") as Language) || "fr";
  });

  useEffect(() => {
    const handleStorage = () => {
      const stored = localStorage.getItem("nacora_lang") as Language;
      if (stored && (stored === "fr" || stored === "en")) {
        setLanguageState(stored);
      }
    };
    window.addEventListener("nacora-lang-change", handleStorage);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("nacora-lang-change", handleStorage);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("nacora_lang", lang);
    window.dispatchEvent(new Event("nacora-lang-change"));
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: translationsData[language]
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Fallback if not wrapped in provider
    const fallbackLang = (localStorage.getItem("nacora_lang") as Language) || "fr";
    return {
      language: fallbackLang,
      setLanguage: (l: Language) => {
        localStorage.setItem("nacora_lang", l);
        window.dispatchEvent(new Event("nacora-lang-change"));
      },
      t: translationsData[fallbackLang]
    };
  }
  return ctx;
};
