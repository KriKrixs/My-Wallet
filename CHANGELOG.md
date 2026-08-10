# 🚀 Changelog — MyWallet

Toutes les modifications notables apportées au projet **MyWallet** seront consignées dans ce fichier.

## [v1.3.1] - 2026-08-10

### 🎨 Garanties de Couleurs des Enveloppes Budgétaires sur les Camemberts
* **Couleurs Exactes d'Enveloppes (`getCategoryChartColor`)** : Garantie à 100% que tous les camemberts par enveloppe (vue globale des enveloppes et ventilation des dépenses quotidiennes par enveloppe) utilisent la couleur exacte définie pour chaque enveloppe budgétaire.
* **Palette Variée Exclusivité "Dépenses par Libellés"** : Le camembert des dépenses par libellé conserve une palette variée de couleurs distinctes par intitulé pour différencier facilement chaque poste de dépense.
* **Matching Parfait Graphiques / Légendes / Barres** : Alignement strict à 100% des couleurs entre les tranches des camemberts SVG, les pastilles légendes du tableau et les barres de progression.

## [v1.3.0] - 2026-08-10

### 🏷️ Identité Visuelle & En-tête (Header)
* **Badge de Version (`v1.3.0`)** : Remplacement du badge *(PWA)* à côté du logo **MyWallet** dans l'en-tête principal par un badge affichant la version officielle actuelle (`v1.3.0`).

### 📊 Refonte Complète du Module Statistiques (2 Modes)
* **Correction des Couleurs SVG (`MANTINE_COLOR_MAP` & Hex)** : Résolution de l'affichage noir des camemberts grâce au mapping automatique des thèmes Mantine vers des codes hexadécimaux SVG valides (`#20c997`, `#22b8cf`, `#7950f2`, etc.).
* **Sélecteur de Mode Interactif (`SegmentedControl`)** : Intégration d'un sélecteur fluide permettant de basculer instantanément entre la vue des **Enveloppes Overall** et l'**Analyse des Dépenses Quotidiennes**.
* **Mode 1 — Enveloppes Budget (Vue Globale)** : Camembert interactif de la consommation globale de chaque enveloppe budgétaire (charges fixes, crédits et dépenses quotidiennes incluses) avec tableau de détail et barres de progression.
* **Mode 2 — Dépenses Quotidiennes (2 Camemberts Empilés)** :
  1. **Premier Camembert** : Ventilation des dépenses quotidiennes regroupées **par intitutés / libellés de dépenses** avec palette dédiée et tableau récapitulatif.
  2. **Deuxième Camembert (suivi juste en dessous)** : Ventilation des dépenses quotidiennes regroupées **uniquement par enveloppes / catégories** d'enveloppes de dépenses.

### 🖥️ Layout Optimal des Colonnes (Tous les Tableaux)
* **Tableau Liste d'Achat (Wishlist)** : Réorganisation complète de l'ordre des colonnes : **Priorité** ➜ **Catégorie** ➜ **Libellé** (`width: 100%`) ➜ **Lien** ➜ **Montant Estimé** ➜ **Actions** (en-tête renommé en *Actions*).
* **Ordre des Colonnes du Tableau Dépenses** : **Catégorie** (1ère colonne tout à gauche) ➜ **Libellé** (`width: 100%`) ➜ **Jour** ➜ **Montant** ➜ **Actions**.
* **Repositionnement à Gauche (`Type` & `Catégorie`)** : Placements des badges *Type* (*Fixe* / *Variable*) et *Catégorie* en **toute première colonne tout à gauche** dans les tableaux des Revenus du Mois, Charges Récurrentes et Crédits.
* **Colonnes Libellés Extensibles (`width: 100%`)** : La colonne *Libellé* s'étend pour occuper l'intégralité de l'espace horizontal disponible dans l'ensemble des tableaux de l'application.
* **Largeur Minimale Intégrale des Badges (`maxWidth: none`)** : Les colonnes *Type* et *Catégorie* s'adaptent désormais à la **largeur exacte du libellé le plus long de la colonne**, éliminant tout tronquage avec `...` sur les badges.
* **Colonnes Secondaires Compactes (`whiteSpace: nowrap`)** : Les colonnes *Jour*, *Montant* et *Actions* restent calées à leur largeur minimale idéale sans rupture de ligne.

### 🎨 Palette de Couleurs Élargie pour les Catégories & Enveloppes
* **27 Couleurs Distinctes & Expressives** : Ajout d'une vaste palette de 27 teintes (Vert d'eau, Cyan, Indigo, Raisin, Violet, Magenta, Framboise, Pourpre, Améthyste, Bleu Cobalt, Bleu Ciel, Émeraude, Menthe, Olive, Miel, Mandarine, Corail, etc.) avec icônes indicatrices dans le sélecteur.
* **Attribution & Rendu Sécurisés** : Prise en compte dynamique des couleurs hexadécimales et thématiques dans l'ensemble des badges, textes et graphiques récapitulatifs.

### 📱 Protection contre le Débordement sur Mobile
* **Conteneur de Défilement Interne (`Table.ScrollContainer`)** : Encapsulation de tous les tableaux (Dépenses, Liste d'Achat, Charges Récurrentes, Crédits et Revenus) dans un conteneur responsive.
* **Élimination du Débordement Général** : Empêche strictement le tableau de faire déborder la largeur de la page sur mobile, le défilement se faisant uniquement à l'intérieur de sa carte.

### 💸 Historique des Dépenses & Notes
* **Affichage des Notes en Sous-titre** : Les remarques/notes saisies sur une dépense s'affichent sous son libellé en texte gris discret (`c="dimmed"`).
* **Tronquage Responsive avec Ellipse (...)** : Gestion fluide pour éviter d'élargir la colonne *Libellé*, notamment sur écran mobile.

### 🗓️ Synchronisation des Modales de Création
* **Alignement Automatique du Mois & Année** : Les modales de création (Revenus, Remboursements, Charges Récurrentes, Crédits / Échéances, Enveloppes Budgétaires, Dépenses et Conversion de la Liste d'Achat) pré-remplissent désormais automatiquement le **mois et l'année actuellement consultés** dans le tableau de bord.

### 🛍️ Liste d'Achat & Filtres Avancés
* **Recherche par Libellé / Description** : Ajout d'un champ de recherche par texte permettant de filtrer instantanément les souhaits d'achat par libellé ou notes.
* **Filtre par Catégorie Dédié (Wishlist Uniquement)** : Remplacement du menu d'ordre par un sélecteur de catégorie proposant **uniquement les catégories présentes dans la Liste d'Achat**.
* **Autocomplétion des Catégories** : Prise en compte de toutes les catégories de la Liste d'Achat dans les sélecteurs de catégories de l'application (`CategorySelect`).

---

## [v1.2.1] - 2026-08-06

### 💸 Historique des Dépenses & Tri Avancé
* **Tri Interactif Multicritères** : Tri dynamique au clic sur les en-têtes de tableau (*Jour*, *Libellé*, *Catégorie*, *Montant*).
* **Filtre par Catégorie Responsive** : Sélecteur déroulant placé à gauche de la recherche, s'affichant sur 2 lignes distinctes sur mobile pour une ergonomie optimale.
* **Pied de Tableau Totalisant** : Calcul et affichage automatique du montant total des dépenses en bas de tableau.

### 💳 Tableau des Crédits & Échéances
* **Période en Sous-titre** : Intégration de la période du prêt (`01/2026 ➔ 12/2026`) sous le libellé du crédit.
* **Suppression de la Colonne Période** : Retrait de la colonne séparée sur PC et mobile pour harmoniser le tableau avec celui des charges récurrentes.

### 🛍️ Liste d'Achat (Wishlist)
* **Masquage Responsive de la Colonne Lien** : Colonne *Lien* masquée sur mobile et accessible via le bouton d'action *Ouvrir le lien marchand* dans la modale tactile.

---

## [v1.2.0] - 2026-08-06

### 📱 Interface Tactile & Expérience Mobile (UX/UI)
* **Navigation Tactile sur Mobile** : Sur écran mobile (< 768px), appuyer sur n'importe quelle ligne d'un tableau ouvre désormais une **modale d'actions tactiles** avec de grands boutons adaptés au tactile.
* **Isolation PC / Desktop** : Sur PC (≥ 768px), le clic sur les lignes est désactivé pour conserver l'interaction desktop standard via la colonne *Actions*.
* **Colonnes Responsives Épurées** : Masquage des colonnes secondaires et d'actions sur mobile (`visibleFrom="md"`) afin d'éliminer le défilement horizontal et d'offrir une lisibilité maximale sur smartphone.

### ↔️ Virements Inter-Portefeuilles
* **Édition des Virements Émis** : Possibilité de modifier à tout moment un virement inter-portefeuille (motif, montant fixe ou pourcentage du solde dispo, portefeuille cible).
* **Désactivation / Masquage Mensuel** : Ajout du bouton d'œil (👁️ / 🙈) permettant d'activer ou de désactiver un virement spécifiquement pour le mois en cours sans supprimer la règle globale.
* **Suppression du Pointage Virement** : Retrait du système de pointage bancaire sur les virements inter-portefeuilles pour simplifier le flux.

### 🛍️ Liste d'Achat (Wishlist & Simulateur)
* **Modale d'Actions Mobiles Complète** : Accès rapide sur smartphone pour :
  * 🛒 **Déclencher l'achat** (conversion en dépense réelle)
  * ✏️ **Modifier le souhait**
  * 🔗 **Ouvrir le lien marchand** *(bouton direct dans la modale mobile)*
  * 🗑️ **Supprimer le souhait**
* **Masquage de la Colonne Lien sur Mobile** : La colonne *Lien* disparaît sur mobile au profit du bouton d'ouverture dans la modale d'action.

### 💳 Charges & Paiements Échelonnés (Crédits)
* **Formatage Épuré des Crédits** : La période d'un prêt (`01/2026 ➔ 12/2026`) est désormais affichée en sous-titre élégant sous le libellé du crédit.
* **Harmonisation des Tableaux** : Suppression de la colonne *Période* séparée sur PC et mobile, alignant à 100% le tableau des crédits avec celui des charges récurrentes.

### 📂 Plafonds d'Enveloppes & Historisation
* **Report & Modification M+1** : La modification du plafond d'une enveloppe sur un mois futur (M+1) s'applique désormais aux mois suivants sans altérer l'historique des mois passés.

### 💸 Historique des Dépenses & Tri Avancé
* **Tri Interactif Multicritères** : Tri dynamique au clic sur les en-têtes de tableau pour le *Jour*, le *Libellé*, la *Catégorie* et le *Montant* (croissant / décroissant).
* **Filtre par Catégorie** : Menu déroulant permettant d'isoler en un clic les dépenses d'une catégorie spécifique.
* **Pied de Tableau & Total Dynamique** : Calcul et affichage automatique de la somme totale des dépenses (mise à jour dynamique selon la recherche et le filtre).

---

## [v1.1.4] - 2026-07-29

### ✏️ Édition des Dépenses Quotidiennes
* **Modification des Dépenses Saisies (`updateTransaction`)** :
  * Ajout du bouton d'édition (icône crayon bleu) dans le tableau de l'historique des dépenses.
  * Pré-remplissage complet du modal (*Libellé, Montant, Catégorie, Jour du mois, Notes*) lors du clic sur modifier.
  * Action serveur `updateTransaction` dédiée avec validation et réactualisation dynamique des calculs.

---

## [v1.1.2] - 2026-07-29

### 📊 Ajustements des Statistiques & Calculs Budgétaires
* **Regroupement des Statistiques par Nature** :
  * Les charges fixes, crédits, échéances et virements sont désormais regroupés par **Catégorie exacte** (ex: *Logement, Abonnements, Crédits & Échéances*).
  * Les dépenses quotidiennes sont regroupées par leur **Libellé en minuscules** (`title.toLowerCase()`).
  * **Tri Décroissant par Pourcentage** : L'ensemble des postes de dépenses est trié par montant/pourcentage décroissant (`b.value - a.value`) du plus gros au plus petit.
* **Formule Ajustée de la Capacité d'Épargne** :
  * Calcul exact : `Revenus totaux - Charges fixes - Dépenses courantes - Plafonds d'enveloppes non dépassés`.
  * Déduit uniquement le reliquat d'enveloppe non dépensé (`plafond - dépense`) pour éviter tout double compte lorsque le plafond est dépassé.

### 🗄️ Migrations BDD (Prisma)
* **Migration `20260729212700_v1_1_2_fix_recurring_expense_columns`** :
  * Ajout des colonnes optionnelles `startMonth` et `startYear` sur la table `RecurringExpense`.

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
