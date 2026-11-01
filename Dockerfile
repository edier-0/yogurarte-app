# ==============================================================================
# STAGE 1: Builder (Compilación autónoma de Backend, Frontend y Prisma)
# ==============================================================================
FROM node:20-alpine AS builder

# Instalar utilidades necesarias para compilar dependencias nativas y Prisma en Alpine
RUN apk add --no-cache openssl libc6-compat && npm install -g npm@11

WORKDIR /app

ENV CHECKPOINT_DISABLE=1

# Copiar manifiestos de dependencias, configuración de npm y TypeScript
COPY package*.json .npmrc* ./
COPY tsconfig.json ./
COPY prisma ./prisma/
COPY frontend/package*.json ./frontend/

# Instalar dependencias completas de manera reproducible ignorando scripts no controlados
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts --legacy-peer-deps
RUN --mount=type=cache,target=/root/.npm \
    npm --prefix frontend ci --ignore-scripts --legacy-peer-deps

# Si el host proveyó el motor nativo de Linux en .prisma, se incorpora para evitar esperas de red en WSL2
COPY node_modules/.prism[a]* ./node_modules/.prisma/

# Generar cliente de Prisma si no vino preinstalado por el host (autónomo en CI)
RUN if [ ! -f ./node_modules/.prisma/client/libquery_engine-linux-musl-openssl-3.0.x.so.node ]; then \
        npx prisma generate; \
    else \
        echo "✅ Motor nativo de Linux y cliente de Prisma detectados. Omitiendo descarga."; \
    fi

# Copiar código fuente backend y frontend
COPY src ./src/
COPY frontend ./frontend/

# Compilar frontend (genera public/index.html y public/assets/)
RUN npm --prefix frontend run build

# Compilar TypeScript a JavaScript limpio (dist/)
RUN npx tsc

# Podar dependencias de desarrollo para dejar solo las necesarias de producción
RUN npm prune --omit=dev --legacy-peer-deps --ignore-scripts

# ==============================================================================
# STAGE 2: Runner de Producción (Hardened, Lean & Autónomo)
# ==============================================================================
FROM node:20-alpine AS runner

# Instalar utilidades de runtime seguras (dumb-init para gestión PID 1)
RUN apk add --no-cache openssl libc6-compat dumb-init dos2unix

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV CHECKPOINT_DISABLE=1
ENV PRISMA_HIDE_UPDATE_MESSAGE=true

# Copiar manifiestos y esquemas necesarios para runtime y migraciones
COPY package*.json .npmrc* ./
COPY prisma ./prisma/

# Copiar dependencias de producción limpias desde el builder (sin descargas adicionales)
COPY --from=builder /app/node_modules ./node_modules

# Copiar artefactos compilados desde el builder (dist del backend y public del frontend)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Copiar script de entrypoint
COPY docker-entrypoint.sh ./

# Crear carpetas de runtime y configurar permisos seguros para usuario no root
RUN dos2unix docker-entrypoint.sh && \
    chmod +x docker-entrypoint.sh && \
    mkdir -p /app/baileys_auth_info /app/logs && \
    chown -R node:node /app

# Hardening: Ejecutar bajo el usuario no privilegiado 'node'
USER node

EXPOSE 3000

# Entrypoint resiliente con manejo de señales PID 1 y sincronización de migraciones
ENTRYPOINT ["/usr/bin/dumb-init", "--", "./docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
