# CamerRideShare API

API backend pour l'application de covoiturage CamerRideShare, construite avec NestJS et TypeScript.

## 📋 Table des matières

- [Description](#description)
- [Technologies](#technologies)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Lancement du serveur](#lancement-du-serveur)
- [Documentation API](#documentation-api)
- [Structure du projet](#structure-du-projet)
- [Tests](#tests)
- [Déploiement](#déploiement)

## 📝 Description

CamerRideShare est une API REST pour une application de covoiturage permettant de gérer les utilisateurs (conducteurs, investisseurs, administrateurs) avec un système d'authentification JWT sécurisé.

## 🛠 Technologies

- **Framework**: [NestJS](https://nestjs.com/) - Framework Node.js progressif
- **Language**: TypeScript
- **Authentification**: JWT (JSON Web Tokens) avec Passport
- **Sécurité**: bcrypt pour le hachage des mots de passe
- **Validation**: class-validator, class-transformer

## 📦 Prérequis

- Node.js (v18 ou supérieur)
- pnpm (ou npm/yarn)
- Docker et Docker Compose (optionnel, pour le développement et la production containerisés)

## 🚀 Installation

1. **Cloner le repository** (si applicable)
```bash
git clone <repository-url>
cd camer-ride-share
```

2. **Installer les dépendances**
```bash
pnpm install
```

## ⚙️ Configuration

### Variables d'environnement

Créez un fichier `.env` à la racine du projet en vous basant sur `.env.example` :

```env
# JWT Authentication
JWT_SECRET="your-secret-key-here-change-in-production"

# Server
PORT=3000
```

**Important**: Remplacez les valeurs par défaut par vos propres valeurs de production, surtout `JWT_SECRET`.

## 🚀 Lancement du serveur

### Option 1 : Avec Docker Compose (Dev + Prod)

1. **Préparez les variables d'environnement**

```bash
cp .env.example .env
```

2. **Mode développement (hot-reload)**

```bash
docker compose up --build
```

3. **Mode production (image buildée + dist)**

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

4. **Arrêter les services**

```bash
docker compose down
```

Les services seront disponibles sur :
- **API**: http://localhost:3000

### Option 2 : En local (Développement)

1. **Créez le fichier `.env`** avec vos configurations

2. **Lancez le serveur**

```bash
# Mode développement (avec rechargement automatique) - RECOMMANDÉ
pnpm run start:dev

# Mode standard
pnpm run start

# Mode production (nécessite compilation préalable)
pnpm run build
pnpm run start:prod

# Mode debug
pnpm run start:debug
```

Le serveur sera accessible sur **http://localhost:3000** (ou le port défini dans `.env`).

## 📚 Documentation API

### Base URL

```
http://localhost:3000
```

### Authentification

#### 1. Inscription (Register)

**Endpoint:** `POST /auth/register`

Crée un nouvel utilisateur.

**Corps de la requête (JSON):**

```json
{
  "email": "user@example.com",     // Optionnel
  "phoneNumber": "690000000",      // Obligatoire, doit être unique
  "password": "password123",       // Obligatoire, min 6 caractères
  "fullName": "John Doe",          // Obligatoire
  "role": "DRIVER"                 // Obligatoire: 'DRIVER', 'INVESTOR', 'ADMIN'
}
```

**Réponse (Succès - 201):**

```json
{
  "id": 1,
  "email": "user@example.com",
  "phoneNumber": "690000000",
  "fullName": "John Doe",
  "role": "DRIVER",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 2. Connexion (Login)

**Endpoint:** `POST /auth/login`

Authentifie un utilisateur et renvoie un token JWT.

**Corps de la requête (JSON):**

```json
{
  "phoneNumber": "690000000",      // Obligatoire
  "password": "password123"        // Obligatoire
}
```

**Réponse (Succès - 200):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "DRIVER",
    "phoneNumber": "690000000",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Réponse (Erreur - 401):**

```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

### Routes protégées

Toutes les routes `/users` nécessitent une authentification JWT.

**Header requis:**

```
Authorization: Bearer <votre_access_token>
```

#### Gestion des utilisateurs

**GET /users** - Liste tous les utilisateurs
- **Auth**: Requis
- **Réponse**: Tableau d'utilisateurs

**GET /users/:id** - Récupère un utilisateur par ID
- **Auth**: Requis
- **Paramètres**: `id` (number)
- **Réponse**: Objet utilisateur

**POST /users** - Crée un nouvel utilisateur
- **Auth**: Requis
- **Corps**: `CreateUserDto`
- **Réponse**: Objet utilisateur créé

**PATCH /users/:id** - Met à jour un utilisateur
- **Auth**: Requis
- **Paramètres**: `id` (number)
- **Corps**: `UpdateUserDto`
- **Réponse**: Objet utilisateur mis à jour

**DELETE /users/:id** - Supprime un utilisateur
- **Auth**: Requis
- **Paramètres**: `id` (number)
- **Réponse**: 200 OK

### Exemple d'utilisation

```bash
# 1. Inscription
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "690000000",
    "password": "password123",
    "fullName": "John Doe",
    "role": "DRIVER"
  }'

# 2. Connexion
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "690000000",
    "password": "password123"
  }'

# 3. Accéder à une route protégée
curl -X GET http://localhost:3000/users \
  -H "Authorization: Bearer <votre_access_token>"
```

## 📁 Structure du projet

```
src/
├── auth/                    # Module d'authentification
│   ├── decorators/
│   │   └── current-user.decorator.ts  # Décorateur pour récupérer l'utilisateur
│   ├── dto/
│   │   ├── login.dto.ts     # DTO pour la connexion
│   │   └── register.dto.ts  # DTO pour l'inscription
│   ├── auth.controller.ts   # Contrôleur d'authentification
│   ├── auth.module.ts       # Module d'authentification
│   ├── auth.service.ts      # Service d'authentification
│   ├── jwt-auth.guard.ts    # Guard JWT pour protéger les routes
│   └── jwt.strategy.ts      # Stratégie JWT Passport
├── users/                   # Module utilisateurs
│   ├── dto/
│   │   ├── create-user.dto.ts
│   │   └── update-user.dto.ts
│   ├── users.controller.ts  # Contrôleur utilisateurs (protégé)
│   ├── users.module.ts      # Module utilisateurs
│   └── users.service.ts     # Service utilisateurs
├── prisma/                  # Module Prisma
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── app.controller.ts        # Contrôleur principal
├── app.module.ts           # Module principal
├── app.service.ts          # Service principal
└── main.ts                 # Point d'entrée de l'application

docker-compose.yml          # Configuration Docker
.env.example                # Template des variables d'environnement
```

## 🔒 Sécurité

### Authentification JWT

- Les tokens JWT expirent après **1 jour**
- Le secret JWT doit être stocké dans une variable d'environnement
- Les mots de passe sont hachés avec **bcrypt** avant stockage
- Les routes protégées nécessitent un token JWT valide dans le header `Authorization`

### Protection des routes

- Utilisez `@UseGuards(JwtAuthGuard)` pour protéger les routes
- Utilisez `@CurrentUser()` pour récupérer l'utilisateur authentifié dans les contrôleurs

**Exemple:**

```typescript
@Get('profile')
@UseGuards(JwtAuthGuard)
getProfile(@CurrentUser() user: any) {
  return user;
}
```

## 🧪 Tests

```bash
# Tests unitaires
pnpm run test

# Tests en mode watch
pnpm run test:watch

# Tests e2e
pnpm run test:e2e

# Couverture de code
pnpm run test:cov
```

## 🚢 Déploiement

### Build de production

```bash
# Compiler le projet
pnpm run build

# Lancer en mode production
pnpm run start:prod
```

### Variables d'environnement en production

Assurez-vous de définir les variables d'environnement suivantes :
- `JWT_SECRET`: Secret JWT fort et unique (générez-en un nouveau pour la production)
- `PORT`: Port sur lequel l'API écoute (optionnel, défaut: 3000)

## 📝 Scripts disponibles

| Commande | Description |
|----------|-------------|
| `pnpm run start:dev` | Mode développement avec rechargement automatique |
| `pnpm run start` | Mode standard |
| `pnpm run start:prod` | Mode production |
| `pnpm run build` | Compiler le projet TypeScript |
| `pnpm run start:debug` | Mode debug avec watch |
| `pnpm run test` | Lancer les tests unitaires |
| `pnpm run test:e2e` | Lancer les tests e2e |
| `pnpm run lint` | Vérifier le code avec ESLint |

## 🐛 Résolution de problèmes

### Port déjà utilisé
- Changez le `PORT` dans `.env`
- Ou arrêtez le processus qui utilise le port 3000

### Erreur de build Docker
- Le `Dockerfile` installe `openssl`, `python3`, `make` et `g++` pour les dépendances natives Node.js
- Rebuild complet: `docker compose build --no-cache`

### Token JWT invalide
- Vérifiez que le token n'a pas expiré (durée de vie: 1 jour)
- Vérifiez que le header `Authorization` est correctement formaté: `Bearer <token>`
- Vérifiez que `JWT_SECRET` est le même que celui utilisé lors de la génération du token

## 📄 License

Ce projet est sous licence MIT.

## 👥 Auteurs

Équipe CamerRideShare

---

Pour plus d'informations sur NestJS, consultez la [documentation officielle](https://docs.nestjs.com).

