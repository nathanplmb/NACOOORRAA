# Plan d'Isolation Stricte Multi-Comptes et Sécurisation Firestore

Ce plan apporte la correction définitive et structurelle à la cause racine de la fuite de données constatée lors du changement de compte Google (où les données du compte A s'affichaient sous le compte B). Il garantit une isolation cryptographique et étanche par UID Firebase, tant au niveau du stockage local que dans le Cloud Firestore.

## Décisions Clés & Diagnostic Préalable

> [!IMPORTANT]
> **Cause racine identifiée lors de l'audit approfondi :**
> 1. Dans `src/dbStore.ts` (lignes 635–675), la fonction `loadFromUserLocalStorage(userId)` comportait un mécanisme de repli rétroactif qui scannait l'intégralité du `localStorage` à la recherche de n'importe quelles clés `nacora_*_opportunities` existantes appartenant à d'autres sessions (`guest` ou ancien compte). Dès qu'un nouvel utilisateur sans données locales se connectait, le store copiait délibérément l'intégralité des candidatures, contacts, entreprises, calendrier et profil de l'ancien utilisateur vers le nouvel UID, avant de les renvoyer dans Firestore lors de la synchronisation suivante.
> 2. Des clés globales non cloisonnées (`nacora_profile`, `nacora_contacts`, `nacora_opportunities`, `nacora_active_session`) étaient lues dans le constructeur de `dbStore` dès l'instanciation, polluant la mémoire avant même la confirmation de l'identité par Firebase Auth.
> 3. Lors de la déconnexion ou du changement d'utilisateur, les minuteries de synchronisation asynchrone (`syncTimeout`) et les requêtes en vol n'étaient pas annulées avec un token d'abandon/session ID, risquant d'écrire les données de l'ancien compte sous le nouvel UID.
> 4. Les règles de sécurité Firestore actuelles (`allow read, write: if true;`) autorisent n'importe quel client à lire ou écraser les documents d'autrui sans restriction d'UID.

- **Décision 1 (Isolation UID absolue)** : Suppression totale du mécanisme de balayage ou d'héritage de clés d'autres comptes. Si un compte n'a pas de données, il démarre vierge (`[]`).
- **Décision 2 (Cloisonnement du stockage local)** : Toutes les clés de cache local sont préfixées de manière stricte par l'UID Firebase authentifié (`nacora:uid:<UID>:*`). Aucune donnée sensible dans des clés globales partagées.
- **Décision 3 (Cycle de vie & purge synchrone à la déconnexion)** : La déconnexion appelle `signOut(auth)`, vide immédiatement l'état en mémoire (`dbStore.clearUser()`), révoque les timers asynchrones (`syncTimeout`) et invalide les requêtes en vol avec un identifiant de session incrémental.
- **Décision 4 (Règles Firestore RBAC/Ownership par UID)** : Verrouillage strict de `/users/{userId}` à `request.auth.uid == userId` (avec contournement réservé aux seuls administrateurs identifiés), empêchant structurellement un client A d'accéder au document du client B.

---

## 1. Vue d'Ensemble & Objectifs

- **Isolation par défaut (Zero Data Leak)** : L'UID Firebase délivré par `firebase/auth` est l'unique source de vérité. L'adresse email n'est plus utilisée comme clé primaire de recherche de documents ni comme preuve d'accès.
- **Déconnexion réelle & étanche** : La déconnexion vide la mémoire vive du store React, efface le token de session et stoppe net tout transfert vers le cloud.
- **Sécurité serveur & client** : Les règles Firestore empêchent formellement toute lecture ou écriture non autorisée, indépendamment du comportement du code React.

---

## 2. Expérience Utilisateur & Parcours

```
[Utilisateur A connecté] ────► [Déconnexion] ────► [Écran de Connexion] ────► [Utilisateur B connecté]
  • Données A actives            • Store vidé 0ms      • Aucun résidu A         • Store B chargé
  • Sync UID_A                   • Cache A préservé    • Authentification       • Documents UID_B
                                   isolé par UID         Firebase fraîche         strictement séparés
```

1. **Déconnexion de l'utilisateur A** :
   - Clic sur "Déconnexion".
   - Purge synchrone immédiate de la mémoire vive (`opportunities = []`, `contacts = []`, `profile = default`).
   - Fin réelle de session via `signOut(auth)`.
   - L'écran d'accueil/auth est affiché sans aucune trace visuelle ni résidu des données de l'utilisateur A.
2. **Connexion de l'utilisateur B** :
   - Firebase Auth valide les identifiants et émet un UID `UID_B`.
   - `dbStore` initialise l'espace de travail dédié exclusivement à `UID_B`.
   - Si `UID_B` est un nouvel utilisateur, il démarre avec un espace propre, zéro opportunité et un profil par défaut à son nom, sans jamais hériter des données de A.
   - Si `UID_B` possède déjà des données dans Firestore `/users/{UID_B}`, elles sont chargées fidèlement.

---

## 3. Architecture Technique & Flux de Données

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FIREBASE AUTHENTICATION                         │
│                    (Source unique de vérité : UID)                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ onAuthStateChanged(user)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                              AUTH CONTEXT                              │
│  • Valide user.uid                                                     │
│  • Déclenche dbStore.initializeForUser(user.uid)                       │
│  • Sur déconnexion : cancel en vol + clearUser() + signOut()           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                                DB STORE                                │
│                                                                        │
│  ┌───────────────────────────────┐   ┌──────────────────────────────┐  │
│  │   Isolation Mémoire (UID)     │   │     Stockage Local (UID)     │  │
│  │  • currentUserId = UID        │   │  • nacora:uid:<UID>:profile  │  │
│  │  • sessionSequenceId++        │   │  • nacora:uid:<UID>:opps     │  │
│  │  • cancelPendingSync()        │   │  • nacora:uid:<UID>:contacts │  │
│  └───────────────┬───────────────┘   └──────────────▲───────────────┘  │
│                  │                                  │                  │
│                  ▼                                  │                  │
│  ┌──────────────────────────────────────────────────┴───────────────┐  │
│  │                     Synchronisation Firestore                    │  │
│  │    • getDoc(doc(db, "users", currentUserId))                      │  │
│  │    • setDoc(doc(db, "users", currentUserId), cleanPayload)        │  │
│  └───────────────────────────────┬──────────────────────────────────┘  │
└──────────────────────────────────┼─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    RÈGLES DE SÉCURITÉ FIRESTORE                        │
│                                                                        │
│  match /users/{userId} {                                               │
│    allow read, write: if request.auth != null &&                       │
│      (request.auth.uid == userId || isAdmin());                        │
│  }                                                                     │
└────────────────────────────────────────────────────────────────────────┘
```

### Détail des Composants Clés à Modifier

1. **`src/dbStore.ts`** :
   - Éliminer le balayage transversal du `localStorage` (suppression définitive des lignes copiant des opportunités/contacts d'autres clés).
   - Standardiser toutes les clés de stockage local avec le format canonique : `nacora:v2:user:<UID>:<collection>`.
   - Ajouter un identifiant de séquence incrémental (`sessionSequenceId`) pour invalider immédiatement les promesses et retours réseau Firestore asynchrones qui aboutiraient après un changement de compte.
   - Supprimer le repli par email (`users_by_email`) au profit de requêtes strictement basées sur `doc(db, "users", userId)`.
   - Réinitialiser l'état interne de manière synchrone avant tout nouveau chargement.
   - Vider les timers (`clearTimeout(this.syncTimeout)`) à chaque changement de compte ou appel à `clearUser()`.

2. **`src/context/AuthContext.tsx`** :
   - Écouteur `onAuthStateChanged` : lorsque `firebaseUser === null`, appeler impérativement `dbStore.clearUser()` et réinitialiser `currentUser` à `null`.
   - Fonction `logout` : vider les états locaux, appeler `dbStore.clearUser()`, exécuter `signOut(auth)` et nettoyer les traces résiduelles de session.
   - Ne plus stocker de session globale non sécurisée susceptible d'être rechargée par un autre utilisateur.

3. **`firestore.rules`** :
   - Remplacer la règle globale ouverte par des règles restrictives par document :
     - `/users/{userId}` : autorisé uniquement si `request.auth.uid == userId` ou si le demandeur dispose du rôle administrateur (`isAdmin()`).
     - Même restriction pour les sous-collections de l'utilisateur.
     - Déploiement immédiat via `deploy_firebase`.

---

## 4. Stratégie de Vérification & Scénario de Test

Le protocole suivant sera exécuté pour valider l'étanchéité totale :

1. **Test d'analyse statique & typage** :
   - Exécution de `npm run lint` et `tsc --noEmit` pour garantir l'absence de régression TypeScript.
2. **Test d'isolation des clés locales** :
   - Inspection des clés générées dans `localStorage` pour confirmer qu'aucun préfixe orphelin ou global n'est partagé.
3. **Simulation multi-comptes séquentielle (Compte A -> Compte B -> Compte A)** :
   - Initialisation avec l'UID du compte A (`user_A_test`) : création d'un contact et d'une candidature spécifique ("Poste Test Compte A").
   - Déconnexion complète : vérification que le store est vide.
   - Initialisation avec l'UID du compte B (`user_B_test`) : vérification que la liste des opportunités et des contacts de B est strictement vide (0 élément), sans trace de "Poste Test Compte A".
   - Création d'une donnée pour B ("Poste Test Compte B").
   - Déconnexion puis reconnexion sous A (`user_A_test`) : vérification que A retrouve "Poste Test Compte A" et ne voit à aucun moment "Poste Test Compte B".
4. **Vérification des règles Firestore** :
   - Test de rejet si un token avec UID A tente de lire ou écrire sur `/users/user_B_test`.
