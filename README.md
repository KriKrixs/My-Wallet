# 💳 MyWallet - Gestion de budget & Finances personnelles (PWA)

**MyWallet** est une application web progressive (PWA) moderne, rapide et sécurisée, conçue pour gérer les finances familiales ou personnelles. L'application permet de suivre les revenus, les charges fixes récurrentes, les paiements fractionnés (avec échéances) et d'utiliser une méthode d'enveloppes budgétaires pour les dépenses quotidiennes.

---

## 🛠️ Stack Technique

- **Framework principal** : [Next.js 16](https://nextjs.org/) (App Router, TypeScript)
- **Interface Utilisateur** : [Mantine UI](https://mantine.dev/) (Design System & Composants React, thème sombre par défaut)
- **Base de Données & ORM** : [SQLite](https://www.sqlite.org/) (Base locale ultra-légère) avec [Prisma 7](https://www.prisma.io/) (utilisant l'adaptateur Node.js natif `better-sqlite3`)
- **Authentification** : [NextAuth.js](https://next-auth.js.org/) (Support natif Microsoft Active Directory / Entra ID + Fournisseur d'identifiants de test pour le développement local)
- **PWA** : [@ducanh2912/next-pwa](https://github.com/ducanh2912/next-pwa) (Support d'installation mobile, mode hors-ligne, icônes)
- **Déploiement** : [Docker](https://www.docker.com/) (Image unifiée multi-stage, persistance SQLite par volume)

---

## 🚀 Démarrage en Développement Local

### 1. Prérequis
Assurez-vous d'avoir installé :
- **Node.js 20+**
- **npm** (inclus avec Node.js)

### 2. Installation des dépendances
Dans le dossier du projet, exécutez :
```bash
npm install --legacy-peer-deps
```

### 3. Base de données (SQLite & Prisma)
Générez le client Prisma et appliquez les migrations à la base locale `dev.db` :
```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Lancement du serveur de développement
```bash
npm run dev
```
Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

---

## 👥 Connexion Active Directory & Comptes de Test

### En Développement Local (Mode Mock)
En local, un **Mock Dev Login** est activé par défaut. Sur la page de connexion, vous pouvez :
- Sélectionner un utilisateur prédéfini dans la liste (Kylian, Marie, Lucas).
- Saisir un utilisateur personnalisé (Entrez le nom, l'email et le rôle souhaités).
- Cliquer sur le bouton pour vous connecter instantanément sans mot de passe.
L'utilisateur sera automatiquement provisionné dans la base SQLite locale.

### En Production (Active Directory / Microsoft Entra ID)
Pour activer la connexion Active Directory réelle, configurez les variables d'environnement dans votre fichier `.env` ou `.env.local` :
```env
AZURE_AD_CLIENT_ID="votre-id-d-application-client"
AZURE_AD_CLIENT_SECRET="votre-secret-client"
AZURE_AD_TENANT_ID="votre-id-de-tenant"
NEXTAUTH_SECRET="une-cle-secrete-aleatoire-tres-longue"
NEXTAUTH_URL="https://votre-domaine-production.com"
```
*Note : N'oubliez pas d'enregistrer l'URL de redirection suivante dans votre portail Azure AD :*
`https://votre-domaine-production.com/api/auth/callback/azure-ad`

---

## 🐳 Déploiement avec Docker

L'application est entièrement conteneurisée. La base de données SQLite est conservée sur le système hôte via un volume Docker.

### Lancement avec Docker Compose
1. Remplissez les variables d'environnement AD dans le fichier `.env` à la racine (ou laissez-les vides pour utiliser uniquement les comptes de test locaux).
2. Lancez le conteneur en arrière-plan :
```bash
docker compose up -d --build
```
L'application sera accessible sur le port **3000**.
La base de données SQLite sera persistée dans le volume Docker nommé `my-wallet-data` (pointé vers `/app/data/dev.db` à l'intérieur du conteneur).
Les migrations Prisma s'appliquent automatiquement à chaque démarrage du conteneur.

### Secrets via fichiers (`*_FILE`)
Toute variable d'environnement `VAR` peut être fournie via un fichier en définissant `VAR_FILE` (convention Docker secrets / Kubernetes). Au démarrage, le conteneur lit le fichier et exporte son contenu dans `VAR` (les retours à la ligne finaux sont retirés).
```yaml
environment:
  - NEXTAUTH_SECRET_FILE=/run/secrets/nextauth_secret
  - DATABASE_URL_FILE=/run/secrets/database_url
secrets:
  - nextauth_secret
  - database_url
```
Le démarrage échoue si `VAR` (non vide) et `VAR_FILE` sont définis en même temps, ou si le fichier est introuvable. Les valeurs des secrets ne sont jamais affichées dans les logs (le mot de passe de `DATABASE_URL` est masqué).
