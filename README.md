# CamerRideShare API

API backend de gestion de flotte de motos pour le covoiturage au Cameroun, construite avec **NestJS** et **TypeScript**.

## 📋 Table des matières

- [Description](#description)
- [Technologies](#technologies)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Lancement du serveur](#lancement-du-serveur)
- [Schéma de données](#schéma-de-données)
- [Documentation API](#documentation-api)
- [Structure du projet](#structure-du-projet)
- [Tests](#tests)
- [Déploiement](#déploiement)

## 📝 Description

CamerRideShare est une API REST qui permet de gérer :

- **Utilisateurs** avec 3 rôles : `ADMIN`, `DRIVER`, `INVESTOR`
- **Flotte de motos** — suivi des motos, des investissements et des conducteurs
- **Paiements** — enregistrement des paiements conducteurs et dépenses
- **Incidents** — signalement et suivi des incidents (accidents, vols, pannes)
- **Invitations** — système d'invitation pour les investisseurs
- **Dashboard** — KPIs, alertes de paiements en retard et incidents ouverts

Schéma : [prisma/schema.prisma](prisma/schema.prisma)

## 🛠 Technologies

- **Framework** : [NestJS](https://nestjs.com/) v11
- **Langage** : TypeScript v5
- **Base de données** : PostgreSQL avec [Prisma ORM](https://www.prisma.io/) v5 (client type-safe)
- **Authentification** : JWT (JSON Web Tokens) via Passport
- **Sécurité** : bcrypt pour le hachage des mots de passe
- **Validation** : class-validator + class-transformer
- **Conteneurisation** : Docker multi-stage (dev + prod)
- **Package manager** : pnpm (avec workspace)

## 📦 Prérequis

- Node.js >= 18
- pnpm
- Docker & Docker Compose (optionnel mais recommandé)
- PostgreSQL 15+ (locale ou distante)

## 🚀 Installation

```bash
# 1. Cloner
git clone <repository-url>
cd camer-ride-share

# 2. Installer les dépendances
pnpm install

# 3. Copier et ajuster le fichier d'environnement
cp .env.example .env
```

## ⚙️ Configuration

Créez un fichier `.env` à la racine :

```env
# Base de données
DATABASE_URL="postgresql://postgres:password@localhost:5432/camerrideshare?schema=public"

# JWT
JWT_SECRET="your-secret-key-here-change-in-production"

# Serveur
PORT=3000
```

> **En Docker**, l'URL de connexion est automatiquement redirigée vers `host.docker.internal:5432` par Docker Compose. Voir [docker-compose.yml](docker-compose.yml).

## 🚀 Lancement du serveur

### Avec Docker Compose (recommandé)

```bash
# Développement (hot-reload)
docker compose up --build

# Production
docker compose -f docker-compose.prod.yml up --build -d

# Arrêter
docker compose down
```

> PostgreSQL doit tourner **sur la machine hôte** (port 5432 accessible). Le conteneur se connecte via `host.docker.internal`.

Créez la base une première fois si elle n'existe pas :

```bash
docker run --rm -e PGPASSWORD=<password> postgres:17-alpine \
  psql -h host.docker.internal -U postgres -c "CREATE DATABASE camerrideshare;"
```

### En local

```bash
# Appliquer le schéma Prisma
pnpm run db:push

# (Optionnel) Charger les données de démonstration
pnpm run db:seed

# Démarrer en mode développement (hot-reload)
pnpm run start:dev
```

Le serveur est accessible sur **http://localhost:3000**.

## 📦 Schéma de données

```prisma
enum UserRole { ADMIN, INVESTOR, DRIVER }
enum MotoStatus { ACTIVE, STOLEN, BROKEN }
enum PaymentType { PAYMENT, EXPENSE }
enum PaymentStatus { VERIFIED, PENDING }
enum IncidentStatus { OPEN, RESOLVED }
enum InvitationStatus { PENDING, ACCEPTED, EXPIRED }
```

```
User ──┬── Moto (driver)     ── Payment
       ├── Moto (investor)   ── Incident
       └── Invitation (creator)
```

- Les **motos** sont liées à un conducteur et/ou un investisseur (optionnel)
- Les **paiements** sont toujours liés à un conducteur
- Les **incidents** sont liés à un conducteur, et optionnellement à une moto
- Les **invitations** permettent d'inviter un investisseur sans créer de compte User

## 📚 Documentation API

### Authentification

#### POST /auth/register

Crée un nouvel utilisateur.

```json
{
  "email": "user@example.com",
  "phoneNumber": "690000000",
  "password": "password123",
  "fullName": "John Doe",
  "role": "DRIVER"
}
```

**Réponse** `201` :

```json
{
  "id": 1,
  "email": "user@example.com",
  "phoneNumber": "690000000",
  "fullName": "John Doe",
  "role": "DRIVER"
}
```

#### POST /auth/login

Authentifie et retourne un token JWT (durée de vie : 1 jour).

```json
{
  "phoneNumber": "690000000",
  "password": "password123"
}
```

**Réponse** `200` :

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "fullName": "John Doe",
    "role": "DRIVER",
    "phoneNumber": "690000000"
  }
}
```

### Routes protégées

Toutes ces routes nécessitent :

```http
Authorization: Bearer <access_token>
```

#### Utilisateurs

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `GET` | `/users` | JWT | Liste tous les utilisateurs (sans `passwordHash`) |
| `GET` | `/users/drivers` | JWT + ADMIN | Liste les chauffeurs (sans `passwordHash`), tri par `fullName` |
| `GET` | `/users/investors` | JWT + ADMIN | Liste les investisseurs (sans `passwordHash`), tri par `fullName` |
| `GET` | `/users/:id` | JWT | Récupère un utilisateur par ID |
| `POST` | `/users` | JWT | Crée un utilisateur |
| `PATCH` | `/users/:id` | JWT | Met à jour un utilisateur |
| `DELETE` | `/users/:id` | JWT | Supprime un utilisateur |

#### Motos (rôle ADMIN requis)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/motos?page=1&limit=12&search=&status=&city=&model=` | Liste paginée (`limit` max 50, défaut 12). Réponse `{ data, meta }` avec `ownershipPct`, `footerInfo`, conducteur & investisseur. |
| `GET` | `/motos/filters` | Options dynamiques pour filtres : `cities`, `models`, `statuses` |
| `GET` | `/motos/available` | Motos `ACTIVE` sans conducteur (modale incident) |
| `GET` | `/motos/:id` | Fiche détail : incidents ouverts, paiements récents du chauffeur |
| `POST` | `/motos` | Crée une moto (`status: ACTIVE`, `financedAmount: 0`) |
| `PATCH` | `/motos/:id` | Met à jour partiellement (statut, réassignation, entretien, etc.) |

**Breaking change :** `GET /motos` retourne désormais `{ data, meta }` au lieu d'un tableau brut.

**Body `POST /motos` :**
```json
{
  "matricule": "LT 9999 X",
  "model": "125cc",
  "city": "Douala",
  "targetAmount": 5000000,
  "driverId": 4,
  "investorId": 2,
  "imageUrl": null
}
```

**Mapping statuts UI ↔ backend :**

| UI Parc | `Moto.status` |
|---------|---------------|
| Actif | `ACTIVE` |
| En panne | `BROKEN` |
| Indisponible | `STOLEN` |

#### Dashboard Admin (rôle ADMIN requis)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/admin/dashboard/overview` | KPIs aggrégés (flotte, investisseurs, revenu mensuel, statut flotte, trésorerie hebdomadaire). Les `deltaPct` comparent au mois précédent. |
| `GET` | `/admin/fleet/summary` | KPI page Parc : `total`, `available`, `inMaintenance`, `incidents` (buckets exclusifs) |
| `GET` | `/admin/payments/summary` | KPI page Paiements : encaissements du mois, objectif, taux de recouvrement, paiements en attente |
| `GET` | `/admin/alerts?priority=high` | Alertes : paiements en retard (≥ 21 jours sans paiement) et incidents ouverts |

**Définitions `GET /admin/fleet/summary` :**

| Champ | Calcul |
|-------|--------|
| `total` | Nombre total de motos |
| `inMaintenance` | Motos `status === BROKEN` |
| `incidents` | Motos `STOLEN` **ou** `ACTIVE` avec ≥1 incident `OPEN` lié (`motoId`) — compte de motos, pas de lignes incident |
| `available` | `total - inMaintenance - incidents` |

**Définitions `GET /admin/payments/summary` :**

| Champ | Calcul |
|-------|--------|
| `monthlyCollected` | `SUM(amount)` où `type=PAYMENT`, `status=VERIFIED`, `createdAt` dans le mois courant |
| `monthlyTarget` | Motos `ACTIVE` avec conducteur × `DEFAULT_WEEKLY_VERSEMENT` (15 000 XAF) × semaines calendaires du mois |
| `recoveryRatePct` | `round(monthlyCollected / monthlyTarget × 100)` ; `0` si objectif nul ; peut dépasser 100 % |
| `pendingCount` | Nombre de paiements `status=PENDING` (tous types) |

#### Transactions

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/transactions` | Liste paginée des transactions (paiements + dépenses) |

Query params : `page` (défaut 1), `limit` (défaut 20, max 50), `sort` (`asc` \| `desc`, défaut `desc`), `search` (nom conducteur ou montant exact), `status` (`VERIFIED` \| `PENDING`), `type` (`PAYMENT` \| `EXPENSE`).

Réponse :

```json
{
  "data": [
    {
      "id": 12,
      "driver": { "fullName": "Jean-Paul N.", "avatarUrl": null },
      "createdAt": "2026-06-02T10:00:00.000Z",
      "status": "VERIFIED",
      "type": "PAYMENT",
      "amount": 15000
    }
  ],
  "meta": { "total": 158, "page": 1, "limit": 20, "totalPages": 8 }
}
```

> **Breaking change** : la réponse n'est plus un tableau plat — lire `response.data`.

#### Paiements

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/payments/:id` | Détail d'un paiement (conducteur inclus) |
| `PATCH` | `/payments/:id` | Met à jour le statut (`VERIFIED` \| `PENDING`) |
| `POST` | `/payments` | Enregistre un paiement vérifié |

```json
{
  "driverId": 4,
  "amount": 15000,
  "type": "PAYMENT"
}
```

`type` : `"PAYMENT"` (paiement conducteur) ou `"EXPENSE"` (dépense).

**`PATCH /payments/:id` :**

```json
{ "status": "VERIFIED" }
```

Statuts supportés en v1 : `VERIFIED`, `PENDING` (pas de `FAILED`).

#### Incidents

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/incidents` | Crée un incident ouvert |

```json
{
  "driverId": 4,
  "motoId": 1,
  "type": "Accident",
  "description": "Description de l'incident"
}
```

`motoId` est optionnel.

#### Invitations

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/invitations` | Crée une invitation investisseur (sans créer de compte User) |

```json
{
  "email": "nouveau@investisseur.com",
  "role": "INVESTOR"
}
```

### Exemples curl

```bash
# 1. Connexion
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"690000001","password":"password123"}' \
  | jq -r '.access_token')

# 2. Dashboard
curl http://localhost:3000/admin/dashboard/overview \
  -H "Authorization: Bearer $TOKEN"

# 3. Liste des chauffeurs
curl http://localhost:3000/users/drivers \
  -H "Authorization: Bearer $TOKEN"

# 3b. Liste des investisseurs
curl http://localhost:3000/users/investors \
  -H "Authorization: Bearer $TOKEN"

# 4. KPI page Parc
curl http://localhost:3000/admin/fleet/summary \
  -H "Authorization: Bearer $TOKEN"

# 5. Liste motos paginée
curl "http://localhost:3000/motos?page=1&limit=12&city=Douala" \
  -H "Authorization: Bearer $TOKEN"

# 6. Motos disponibles
curl http://localhost:3000/motos/available \
  -H "Authorization: Bearer $TOKEN"

# 7. KPI page Paiements
curl http://localhost:3000/admin/payments/summary \
  -H "Authorization: Bearer $TOKEN"

# 8. Transactions paginées
curl "http://localhost:3000/transactions?page=1&limit=20&status=PENDING" \
  -H "Authorization: Bearer $TOKEN"

# 9. Détail et validation d'un paiement
curl http://localhost:3000/payments/1 \
  -H "Authorization: Bearer $TOKEN"

curl -X PATCH http://localhost:3000/payments/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"VERIFIED"}'

# 10. Créer un paiement
curl -X POST http://localhost:3000/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"driverId":4,"amount":15000,"type":"PAYMENT"}'
```

### Données de démonstration

```bash
pnpm run db:seed
```

Compte admin seed : `690000001` / `password123`

## 📁 Structure du projet

```
src/
├── admin/                        # Dashboard admin (KPIs, alertes)
│   ├── admin.controller.ts
│   ├── admin-dashboard.service.ts
│   ├── fleet-summary.service.ts
│   ├── payments-summary.service.ts
│   └── admin.module.ts
├── alerts/                       # Alertes (paiements en retard, incidents)
│   ├── dto/
│   │   └── list-alerts-query.dto.ts
│   ├── alerts.controller.ts
│   ├── alerts.service.ts
│   └── alerts.module.ts
├── auth/                         # Authentification JWT
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── roles.decorator.ts
│   ├── dto/
│   │   ├── login.dto.ts
│   │   └── register.dto.ts
│   ├── types/
│   │   └── jwt-payload-user.type.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   ├── auth.service.ts
│   └── jwt.strategy.ts
├── common/                       # Utilitaires partagés
│   └── utils/
│       └── dashboard.utils.ts
├── incidents/                    # Gestion des incidents
│   ├── dto/
│   │   └── create-incident.dto.ts
│   ├── incidents.controller.ts
│   ├── incidents.service.ts
│   └── incidents.module.ts
├── invitations/                  # Invitations investisseurs
│   ├── dto/
│   │   └── create-invitation.dto.ts
│   ├── invitations.controller.ts
│   ├── invitations.service.ts
│   └── invitations.module.ts
├── motos/                        # Gestion des motos
│   ├── motos.controller.ts
│   ├── motos.service.ts
│   └── motos.module.ts
├── payments/                     # Paiements conducteurs
│   ├── dto/
│   │   └── create-payment.dto.ts
│   ├── payments.controller.ts
│   ├── payments.service.ts
│   └── payments.module.ts
├── prisma/                       # Service Prisma (injecté globalement)
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── transactions/                 # Transactions consolidées
│   ├── dto/
│   │   └── list-transactions-query.dto.ts
│   ├── transactions.controller.ts
│   ├── transactions.service.ts
│   └── transactions.module.ts
├── users/                        # Gestion des utilisateurs
│   ├── dto/
│   │   ├── create-user.dto.ts
│   │   └── update-user.dto.ts
│   ├── users.controller.ts
│   ├── users.module.ts
│   └── users.service.ts
├── app.controller.ts
├── app.module.ts
├── app.service.ts
└── main.ts
```

## 🔒 Sécurité

- **Tokens JWT** : expirés après 1 jour, stockés en variable d'environnement
- **Mots de passe** : hachés avec bcrypt (sel automatique)
- **Routes protégées** : `@UseGuards(JwtAuthGuard)` pour toute requête authentifiée
- **Rôles** : `@Roles(UserRole.ADMIN)` combiné à `RolesGuard` pour les routes reservées aux administrateurs
- **`passwordHash`** : exclu des réponses API GET (champs `select` dédié)

## 🧪 Tests

```bash
pnpm run test          # Tests unitaires
pnpm run test:watch    # Mode watch
pnpm run test:cov      # Couverture de code
pnpm run test:e2e      # Tests e2e
```

## 📝 Scripts disponibles

| Commande | Description |
|----------|-------------|
| `pnpm run start:dev` | Mode développement (hot-reload) |
| `pnpm run start:prod` | Mode production |
| `pnpm run build` | Compiler le projet TypeScript |
| `pnpm run lint` | Vérifier le code avec ESLint |
| `pnpm run format` | Formater avec Prettier |
| `pnpm run db:push` | Appliquer le schéma Prisma à la base |
| `pnpm run db:seed` | Charger les données de démonstration |

## 🐛 Résolution de problèmes

| Problème | Solution |
|----------|----------|
| Port déjà utilisé | Changer `PORT` dans `.env` |
| Build Docker lent | `docker compose build --no-cache` |
| Token JWT invalide | Vérifier l'expiration (1 jour) et l'en-tête `Authorization: Bearer <token>` |
| Connexion base de données | Vérifier que PostgreSQL est accessible sur le port 5432 |

## 👥 Auteurs

Équipe CamerRideShare

---

_Pour plus d'informations sur NestJS, consultez la [documentation officielle](https://docs.nestjs.com)._
