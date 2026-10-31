# ==============================================================================
# STAGE: Runner de Producción (Hardened, Lean & Offline-Ready)
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
COPY package*.json ./
COPY prisma ./prisma/

# Copiar dependencias (incluye cliente y motor nativo de Linux generado por Prisma)
COPY node_modules ./node_modules

# Copiar artefactos compilados del backend (dist/) y frontend (public/)
COPY dist ./dist
COPY public ./public

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
