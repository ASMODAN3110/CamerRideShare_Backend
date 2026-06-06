FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN apk add --no-cache openssl python3 make g++ && corepack enable

# Désactive la vérification d'âge minimum des packages (évite les timeouts réseau dans Docker)
ENV npm_config_minimum_release_age=0

WORKDIR /app

# --------------------------------------------------------------
# Étape : installation des dépendances (production + développement)
# --------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# --------------------------------------------------------------
# Étape : développement (hot-reload)
# --------------------------------------------------------------
FROM deps AS dev
COPY . .
RUN pnpm prisma generate
EXPOSE 3000
CMD ["pnpm", "run", "start:dev"]

# --------------------------------------------------------------
# Étape : build (compilation TypeScript)
# --------------------------------------------------------------
FROM deps AS build
COPY . .
RUN pnpm prisma generate && pnpm run build

# --------------------------------------------------------------
# Étape : production (image finale légère)
# --------------------------------------------------------------
FROM base AS prod
ENV NODE_ENV=production
WORKDIR /app

# Copie des artefacts depuis l'étape de build
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

EXPOSE 3000

# Lancement via le script défini dans package.json ("node dist/main")
CMD ["pnpm", "run", "start:prod"]