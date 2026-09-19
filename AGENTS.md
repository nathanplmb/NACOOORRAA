# Directives de Direction Artistique & Design System NACORA

## 1. Direction Artistique Globale (Liquid Glass Sobre & Haut de Gamme)
La direction artistique validée sur la page **Opportunités** et ses fiches de détail sert de référence absolue pour l'ensemble des pages et composants de la plateforme NACORA :

### Palette de Couleurs & Nuances Sémantiques
- **Canvas / Fond sombre immersif** : `#060812` à `#0B0F19` avec subtil grain et reflets d'ambiance discrets.
- **Typographie principale** : `#F5F6FA` (titres et textes à fort contraste) et `#9AA0B2` (labels, métadonnées secondaires).
- **Rouge NACORA (`#D81A45` / `#FF6685`)** : Couleur de marque signature. Réservée aux actions clés, logos, badges entreprise et statuts prioritaires.
- **Liquid Glass Neutre** : `bg-white/[0.04]` à `bg-white/[0.06]`, bordures `border-white/10`, `backdrop-blur-xl`.
- **Couleurs sémantiques ciblées (avec retenue)** :
  - **Vert (`#34D399` / `#12B76A`)** : Rémunérations, gains, validations.
  - **Ambre (`#FBBF24` / `#F79009`)** : Deadlines, alertes, étapes intermédiaires.
  - **Violet IA (`#C084FC`)** : Fonctionnalités d'intelligence artificielle, extractions et suggestions.

## 2. Règles d'Agencement & Layout
- **Intégration fluide dans l'espace utile** : Les fiches et vues détaillées exploitent 100% de la largeur disponible à droite de la sidebar sans jamais déborder ou passer sous la navigation.
- **Bandeaux de métadonnées monoline** : Les séries de badges/chips d'informations privilégient un alignement sur une seule ligne (`flex-nowrap`, `whitespace-nowrap`) avec défilement fluide sans barre sur mobile.
- **Liquid Glass dosé** : Éviter les dégradés sursaturés ou effets de verre trop épais. Privilégier des panneaux nets avec coins arrondis (`rounded-2xl`), contrastes contrôlés et bordures fines (`border-white/10`).
