# 🚀 Changelog — MyWallet

Toutes les modifications notables apportées au projet **MyWallet** seront consignées dans ce fichier.

---

## [v1.1.0] - 2026-07-29

### 🛒 Liste d'Achat (Wishlist & Projets d'Achat)
* **Création & Gestion des Souhaits d'Achat** :
  * Configuration complète des articles : Libellé, Montant estimé, Lien web marchand (optionnel), Catégorie, Priorité/Criticité (*Urgent, Important, Majeur, Normal, Faible*), et Notes.
* **Simulateur de Financement & Marge de Sécurité** :
  * Calculateur local dynamique par case à cocher (sans persistance inutile en base de données).
  * Sélection multi-articles avec calcul automatique du Total Sélectionné.
  * Définition d'un pourcentage de marge de sécurité à réserver sur l'épargne disponible.
  * Simulateur automatique de paiement en plusieurs fois sans frais (3x, 4x, 6x, 12x) avec badges visuels de faisabilité (vert / rouge).
* **Déclenchement d'Achat & Modes de Règlement** :
  * Modal de conversion repositionnant le Portefeuille Cible au-dessus.
  * 3 modes épurés : **Comptant**, **Plusieurs fois** (date/jour pré-remplis à aujourd'hui, montant à gauche), **Crédits** (date de fin calculant automatiquement le nombre d'échéances).
  * **Suppression automatique en BDD** (`WishlistItem.delete`) dès qu'un achat est déclenché et transformé en dépense ou en échéances réelles.

### 📊 Statistiques & Visualisations Interactives
* **Graphique Camembert Interactif (Pie Chart)** :
  * Focus exclusif sur les **dépenses réelles** (enveloppes budgétaires + dépenses quotidiennes par catégorie).
  * Cartes KPI supérieures (Revenus totaux, Dépenses totales avec %, Solde disponible avec %).
  * Animation visuelle au survol du camembert et infobulles détaillées.

### 🔒 Sécurité & Droits "Lecture Seule" (Read-Only)
* **Sécurisation des accès partagés** :
  * Masquage complet de tous les boutons d'ajout, de modification et de suppression pour les membres invités avec le rôle `READ_ONLY`.
  * Désactivation des interrupteurs de pointage bancaire.

### 🔑 Authentification Hybride & Comptes Locaux (PostgreSQL)
* **Gestion des Comptes Locaux avec Inscription** :
  * Ajout du hachage de mot de passe sécurisé via `bcryptjs` et mise à jour du modèle `User` dans Prisma.
  * Nouvel écran d'accueil avec onglets **Se Connecter** / **Créer un compte**.
  * Auto-provisionnement du compte local et création automatique du premier portefeuille personnel (`isPersonal: true`).
* **Résolution Hybride Automatique** :
  * Formulaire de connexion unifié : le système tente d'abord l'authentification sur le serveur LDAP / Active Directory s'il est configuré, puis bascule de manière fluide sur la base de données PostgreSQL locale en cas d'échec ou d'absence de serveur LDAP.

### 🛡️ Formulaires & Validation des Données
* **Contrôle d'Erreur Inline (`error="..."`)** :
  * Validation stricte de l'ensemble des modaux et formulaires (champs obligatoires, montants `> 0 €`, jours `1 à 31`, e-mails valides).
  * Encadrement visuel rouge et messages d'erreur explicites sous chaque champ invalide.
  * Intégration de formulaires HTML `<form onSubmit="...">` permettant la validation directe avec la touche **Entrée**.
  * Réinitialisation dynamique des erreurs à la saisie et à la fermeture des modaux.

### 🎨 UI/UX, Typographie & PWA
* **Favicon Vectoriel PWA** :
  * Alignement du favicon du site sur l'icône SVG officielle PWA (`/icons/logo.svg`).
* **Harmonisation des Catégories** :
  * Filtrage des intitulés système (`Paiement échelonné`, `Crédit`, `Échéance`) de la liste globale des catégories.
  * Suppression des valeurs pré-remplies arbitraires (ex: "High-Tech") pour ouvrir un champ de catégorie vierge avec autocomplétion dynamique.
* **Relecture & Layout Responsive** :
  * Relecture orthographique et typographique complète des interfaces, modaux et infobulles.
  * Élargissement du conteneur principal desktop (`maxWidth: 1650px`).
