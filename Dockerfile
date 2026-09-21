# ==============================================================================
# STAGE 1: Builder
# ==============================================================================
FROM node:20-alpine AS builder

# Instalar dependencias necesarias para compilar Prisma en Alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copiar manifiestos de dependencias y configuración de TypeScript
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

# Instalar dependencias completas de manera reproducible
RUN npm ci

# Generar cliente de Prisma
RUN npx prisma generate

# Copiar código fuente y compilar TypeScript a JavaScript limpio (dist/)
COPY src ./src/
RUN npx tsc

# ==============================================================================
# STAGE 2: Runner de Producción (Hardened & Lean)
# ==============================================================================
FROM node:20-alpine AS runner

# Instalar utilidades de runtime seguras (dumb-init para gestión PID 1)
RUN apk add --no-cache openssl libc6-compat dumb-init

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copiar manifiestos e instalar ÚNICAMENTE dependencias de producción
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev
RUN npx prisma generate

# Copiar artefactos compilados desde el builder y assets estáticos del frontend
COPY --from=builder /app/dist ./dist
COPY public ./public
COPY docker-entrypoint.sh ./

# Crear carpetas de runtime y configurar permisos seguros para usuario no root
RUN chmod +x docker-entrypoint.sh && \
    mkdir -p /app/baileys_auth_info /app/logs && \
    chown -R node:node /app

# Hardening: Ejecutar bajo el usuario no privilegiado 'node'
USER node

EXPOSE 3000

# Entrypoint resiliente con manejo de señales PID 1 y sincronización de migraciones
ENTRYPOINT ["/usr/bin/dumb-init", "--", "./docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
