# 🚀 Changelog — MyWallet

Toutes les modifications notables apportées au projet **MyWallet** seront consignées dans ce fichier.

## [v1.6.2] - 2026-11-09

### 🏥 Correctif du Contrôle de Santé OIDC (`/health`)
* **Vérification OIDC dédiée** : Le contrôle de santé OIDC ne réutilise plus le test de joignabilité LDAP. Auparavant, une URL `https://…:443` perdait son port lors du parsing et le test se rabattait sur le port LDAP `389`, provoquant un `503` (`ECONNREFUSED …:389`) et le passage du conteneur en `unhealthy` alors qu'Authentik était fonctionnel.
* **Découverte OpenID Connect** : Nouvelle fonction `checkOidcIssuer` qui interroge `<OIDC_ISSUER>/.well-known/openid-configuration` (timeout de 3 s, sans cache) et valide une réponse `200` contenant le champ `issuer`.
* **Messages d'erreur explicites** : En cas d'échec, `/health` et `/api/health` renvoient un `503` précisant l'URL appelée et la cause (code HTTP, JSON invalide, champ `issuer` absent, timeout ou erreur réseau).

## [v1.6.1] - 2026-11-09

### 🔒 Sécurité & Secrets Docker
* **Masquage de `DATABASE_URL` dans les logs** : Le mot de passe de la connection string n'est plus affiché en clair au démarrage du conteneur (`postgresql://user:****@host:5432/db`), y compris lorsqu'il contient des caractères spéciaux (`@`, `:`).
* **Support des variables fichiers (`*_FILE`)** : Toute variable d'environnement `VAR` peut désormais être fournie via un fichier avec `VAR_FILE` (convention Docker secrets / Kubernetes), par ex. `NEXTAUTH_SECRET_FILE=/run/secrets/nextauth_secret` ou `DATABASE_URL_FILE=/run/secrets/database_url`.
  * Le démarrage échoue explicitement si `VAR` (non vide) et `VAR_FILE` sont définis simultanément, ou si le fichier est introuvable / illisible.
  * Les retours à la ligne finaux du fichier sont retirés et la valeur du secret n'est jamais journalisée.
* **Documentation** : Exemple de configuration `secrets:` commenté dans `docker-compose.yml` et nouvelle section « Secrets via fichiers » dans le README.

## [v1.6.0] - 2026-09-09

### 🛡️ Support Authentification OIDC / Authentik & Choix du Mode d'Authentification (`AUTH_MODE`)
* **Support SSO OpenID Connect (Authentik, Keycloak, etc.)** : Intégration d'un provider OIDC NextAuth réactif et configurable via `AUTH_MODE=OIDC` (ou `NEXT_PUBLIC_OIDC_ENABLED=true`), `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_ISSUER` et `OIDC_CLIENT_NAME`.
* **Liaison des Comptes & Table `Account`** : Ajout du modèle Prisma `Account` et de la migration PostgreSQL associés. Tout compte connecté via OIDC (Authentik) est automatiquement rattaché au compte local existant partageant le même e-mail. Le mot de passe local est préservé en méthode de secours.
* **Connexion Automatique SSO (Zero-Click)** : Lors de la navigation vers la page de connexion, si le mode OIDC est actif et que l'utilisateur ne s'est pas déconnecté manuellement, l'application déclenche automatiquement la redirection SSO vers Authentik.
* **Déconnexion Débrayable (`?logout=true`)** : Un clic sur le bouton Déconnexion redirige vers `/login?logout=true`, ce qui suspend temporairement la redirection automatique et affiche la mire de connexion complète.
* **Attribution Automatique du Rôle Admin (Groupes OIDC)** : Promotion automatique au rôle `ADMIN` si l'utilisateur fait partie d'un groupe admin OIDC configuré (`OIDC_ADMIN_GROUP`).
* **Synchronisation Automatique du Nom** : Mise à jour automatique du nom d'affichage dans la base PostgreSQL si celui-ci a changé dans Authentik / OIDC lors d'une connexion.
* **Administration & Édition des Utilisateurs (Interface Admin)** :
  * Modale grand format (largeur 50%) réservée aux administrateurs.
  * Édition complète des utilisateurs (nom d'affichage, adresse e-mail, définition / réinitialisation d'un mot de passe local).
  * Gestion des rôles (bascule `USER` <-> `ADMIN`).
  * Suppression définitive de comptes avec nettoyage automatique des portefeuilles orphelins.
* **Vérification de Santé `/health`** : Prise en compte du statut du serveur OIDC (`oidcStatus`) dans le rapport de santé de l'application.

## [v1.5.2] - 2026-09-04

### 🏥 Endpoint de Santé pour Conteneur Docker (`/health`)
* **Endpoint `/health` & `/api/health`** : Création d'une route de vérification de santé pour le conteneur Docker.
* **Vérification PostgreSQL** : Exécution d'une requête test `SELECT 1` pour valider la connectivité de la base de données.
* **Vérification Active Directory / LDAP** : Test de joignabilité réseau socket (TCP/TLS) vers le serveur AD (`LDAP_URL`) uniquement lorsque `NEXT_PUBLIC_LDAP_ENABLED=true` ou `LDAP_ENABLED=true`.
* **Exclusion Middleware & Codes HTTP** : Retourne un statut `200 OK` si tous les composants sont sains, et `503 Service Unavailable` en cas de défaillance. Exclu de la protection NextAuth dans le middleware pour permettre les healthchecks Docker.

## [v1.5.1] - 2026-09-03

### 🔄 Correction de l'Affichage des Virements Inter-Portefeuilles
* **Propriétaire du Portefeuille Source dans le Pointage** : Le libellé des virements entrants dans le pointage bancaire `(Virement de ...)` affiche désormais le nom du propriétaire du portefeuille source émetteur au lieu du créateur de la transaction.
* **Refonte du Tableau des Virements Reçus** : Organisation en colonnes claires (*Motif*, *Portefeuille*, *Propriétaire* affichant uniquement le prénom, *Montant*).

## [v1.5.0] - 2026-09-02

### 🔑 Connexion & Authentification par Passkey (WebAuthn / Biométrie)
* **Authentification sans Mot de Passe (Passkey / WebAuthn)** : Support complet des Passkeys FIDO2 / WebAuthn (Touch ID, Face ID, YubiKey, clés de sécurité matérielles et smartphones).
* **Bouton & Flux de Connexion Direct** : Intégration d'un bouton de connexion dédié *Passkey / Biométrie* sur la page `/login` pour une authentification instantanée sans mot de passe.
* **Délai d'Enregistrement de 10 Minutes** : Extension du timeout WebAuthn et des jetons de challenge pour permettre aux coffres-forts (Bitwarden, 1Password, etc.) le temps nécessaire de créer l'entrée sans être déconnecté.
* **Gestion des Clés de Sécurité (Dashboard)** : Modale de gestion des Passkeys accessible depuis le header pour enregistrer de nouvelles clés de sécurité (Touch ID, Face ID, etc.) et révoquer les clés existantes.

## [v1.4.3] - 2026-08-31

### 📊 Prise en Compte du Déficit/Surplus du Mois Précédent dans les Statistiques
* **Diction et Calcul Précis (`effectiveRevenues`)** : Le KPI *Solde disponible / Épargne* dans l'onglet Statistiques intègre désormais rigoureusement le déficit renseigné ou le report du mois précédent (`totalRevenues - previousMonthDeficit + previousMonthSurplus - totalExpenses`).
* **Formatage sur la Même Ligne (`(-X€) - Déficit du M-1`)** : Formatage concis et épuré affiché sur la même ligne que le montant du solde disponible en orange `(-X.XX €) - Déficit du M-1` (ou en vert `(+X.XX €) - Report du M-1`).

## [v1.4.2] - 2026-08-30

### 🏷️ Badge de Version Dynamique dans le Header
* **Lecture Dynamique (`pkg.version`)** : Le badge de version dans le header lit désormais automatiquement le numéro de version depuis `package.json` (`v{pkg.version}`), garantissant la synchronisation de l'affichage lors de chaque nouvelle version.

### 🧹 Épuration de la Vue d'Ensemble
* **Suppression du Panneau "Dernières Dépenses"** : Retrait du panneau de la liste restreinte des dernières dépenses quotidiennes dans l'onglet *Vue d'ensemble* afin d'alléger la vue et d'éviter les doublons avec l'onglet dédié aux transactions.

## [v1.4.1] - 2026-08-27

### 💳 Correction du Calcul du Montant Restant (Crédits & Paiements Fractionnés)
* **Calcul Dynamique du Restant Dû (`remainingAmount`)** : Correction du calcul du montant restant à payer sur les crédits et paiements échelonnés. Le montant restant est désormais rigoureusement basé sur le nombre de mois restants jusqu'à l'échéance de fin (`remainingMonths * baseAmount` ou `totalAmount - paidAmount`).
* **Suppression de la Valeur Factice (`instTotal`)** : Suppression de l'ancienne variable de formulaire statique qui envoyait un total par défaut de 500 € en base de données lors de la création d'échéanciers, ce qui faussait le reste à payer sur les crédits longs.
* **Calcul Automatique à la Création & Modification** : Calcule automatiquement et avec précision le montant total (`totalAmount = mensualité * nombreDeMois`) lors de la création ou mise à jour globale d'un crédit ou d'un paiement fractionné.

## [v1.4.0] - 2026-08-24

### 🛡️ Préservation de l'Historique lors de la Suppression
* **Fin Automatique au Mois Précédent (`endMonth` / `endYear`)** : Lors de la suppression d'un revenu fixe, d'un remboursement fixe, d'une charge récurrente ou d'un crédit/paiement échelonné, si l'élément existait sur des mois antérieurs, il est automatiquement clôturé au mois précédent au lieu d'être supprimé définitivement de la base de données.
* **Intégrité Totale des Mois Passés** : L'historique, les bilans financiers, les reliquats et les graphiques des mois passés restent 100 % intacts et inchangés, tandis que l'élément cesse d'apparaître pour le mois en cours et tous les mois futurs.
* **Suppression Physique Sécurisée** : Si l'élément a été créé durant le mois en cours ou un mois futur, il est supprimé définitivement sans laisser de trace orpheline.

### 📅 Déplacement / Report des Remboursements & Revenus Variables
* **Déplacement Direct dans la Modale de Modification (`editOverrideModal`)** : Pour tout remboursement ou revenu variable, la modale de modification propose désormais deux champs dédiés (*Mois d'imputation / destination* et *Année d'imputation*).
* **Mise à Jour Complète en Une Seule Étape** : Permet de modifier simultanément le libellé, le montant, la nature et le mois/année de destination sans bouton ou modale séparée.

### 📊 Filtre & Lignes Totales sur les Graphiques de Statistiques
* **Lignes Totales sur les Tableaux de Détails (`Table.Tfoot`)** : Ajout d'une ligne de totalisation bien en évidence au bas de chaque tableau de détail des statistiques (Vue Globale des Enveloppes, Détail par Intitulé de Dépense et Détail par Enveloppe de Dépense) affichant le montant total consommé et 100%.
* **Sélecteur de Catégorie Dédié (`Select`)** : Ajout d'un sélecteur déroulant de catégorie au sommet de l'analyse des dépenses quotidiennes (Mode 2) permettant de filtrer les graphiques par enveloppe/catégorie spécifique (*Toutes les catégories* par défaut).
* **Mise à Jour Dynamique des Camemberts & Légendes** : Le camembert des dépenses par libellé et celui des enveloppes se mettent à jour instantanément pour afficher uniquement les dépenses associées à la catégorie sélectionnée (avec recalcul du montant total).

### 🔐 Sécurisation & Contrôle de l'Authentification (Mode Développeur)
* **Variable d'Environnement Dédiée (`NEXT_PUBLIC_ENABLE_DEV_LOGIN`)** : Contrôle précis de l'affichage et du fonctionnement du mode développeur (connexion rapide avec profils de démo) via la variable `NEXT_PUBLIC_ENABLE_DEV_LOGIN` dans le fichier `.env` (activé si `"true"`, désactivé si `"false"` ou en production).

### 🔒 Persistance & Verrouillage des Modales (`closeOnClickOutside: false`)
* **Verrouillage au Clic Extérieur sur Toutes les Modales** : Configuration globale (`MantineProvider`) et explicite sur les 15 modales de l'application (Nouveau Portefeuille, Dépenses, Revenus, Charges, Crédits, Enveloppes, Souhaits d'achat, Report de déficit, Partage, etc.) pour empêcher la fermeture involontaire lors d'un clic accidentel en dehors de la fenêtre modale.
* **Badge de Version Header (`v1.4.0`)** : Mise à jour du badge de version dans le header et synchronisation avec `package.json`.

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
