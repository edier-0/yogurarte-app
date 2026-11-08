---
name: docker-hardening
description: Estándares de contenedores Docker, builds multi-stage híbridos, optimización de caché, hardening en Alpine y prevención de cuellos de botella en local (WSL2) y CI.
---

# Docker Hardening & Multi-Stage Optimization — YogurArte

Guía canónica y estándares de ingeniería senior para la construcción, empaquetado, hardening y ejecución de contenedores Docker en YogurArte. Diseñada específicamente para garantizar builds ultrarrápidos (<15s), resistencia total a fallos de red en WSL2/Windows, y portabilidad 100% autónoma en GitHub Actions y producción.

---

## 1. Principios Fundamentales del Contenedor

1. **Arquitectura Multi-Stage Estricta:**
   - **Stage 1 (Builder):** Entorno completo con herramientas de compilación (`openssl`, `libc6-compat`, `npm@11`), TypeScript (`npx tsc`) y Vite (`npm --prefix frontend run build`). Podado posterior de dependencias (`npm prune --omit=dev`).
   - **Stage 2 (Runner):** Imagen de producción mínima basada en Alpine Linux, sin compiladores, sin devDependencies y sin código fuente no transpilado.
2. **Resiliencia ante WSL2 y Red Local:**
   - En máquinas host con Windows y WSL2, los sockets TCP de npm sufren congestión (`EIDLETIMEOUT`). Queda terminantemente prohibido ejecutar scripts de postinstalación descontrolados en build sin `--ignore-scripts`.
   - Uso obligatorio de BuildKit Cache Mounts: `--mount=type=cache,target=/root/.npm`.
3. **Estrategia Híbrida y Autónoma para Prisma:**
   - `prisma/schema.prisma` debe declarar siempre:
     ```prisma
     generator client {
       provider      = "prisma-client-js"
       binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
     }
     ```
   - **Detección Dinámica:** Si el host proveyó el motor nativo de Linux en `node_modules/.prisma`, el builder lo reutiliza directamente omitiendo descargas. Si el build corre en un runner limpio de CI (GitHub Actions) donde el motor no existe, el builder ejecuta `npx prisma generate` de forma completamente autónoma.
4. **Hardening de Seguridad en Producción:**
   - **Gestión PID 1:** Uso mandatario de `dumb-init` como entrypoint del contenedor para recibir y propagar señales UNIX (`SIGTERM`, `SIGINT`) correctamente y evitar procesos zombies.
   - **Usuario No Privilegiado:** El proceso debe correr bajo `USER node`. Jamás ejecutar la aplicación en runtime como `root`.
   - **Superficie de Ataque Mínima:** Copiar únicamente `dist/`, `public/`, `node_modules` (podado), `prisma/` y manifiestos estrictamente necesarios.

---

## 2. Plantilla Canónica de Dockerfile

Todo Dockerfile del sistema debe ceñirse a este patrón de referencia:

```dockerfile
# ==============================================================================
# STAGE 1: Builder (Compilación autónoma de Backend, Frontend y Prisma)
# ==============================================================================
FROM node:20-alpine AS builder

# Instalar librerías nativas necesarias para Prisma y node-gyp en Alpine
RUN apk add --no-cache openssl libc6-compat && npm install -g npm@11

WORKDIR /app

ENV CHECKPOINT_DISABLE=1

# Copiar manifiestos de dependencias, configuración de npm y TypeScript
COPY package*.json .npmrc* ./
COPY tsconfig.json ./
COPY prisma ./prisma/
COPY frontend/package*.json ./frontend/

# Instalar dependencias completas ignorando scripts de postinstalación riesgosos
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts --legacy-peer-deps
RUN --mount=type=cache,target=/root/.npm \
    npm --prefix frontend ci --ignore-scripts --legacy-peer-deps

# Incorporar motor nativo de Linux si vino preinstalado por el host (WSL2 speedup)
COPY node_modules/.prism[a]* ./node_modules/.prisma/

# Generar cliente de Prisma de forma autónoma en CI si no vino preinstalado
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

# Compilar TypeScript backend a JavaScript nativo (dist/)
RUN npx tsc

# Podar dependencias de desarrollo para dejar solo las necesarias de producción
RUN npm prune --omit=dev --legacy-peer-deps --ignore-scripts

# ==============================================================================
# STAGE 2: Runner de Producción (Hardened, Lean & Autónomo)
# ==============================================================================
FROM node:20-alpine AS runner

# Instalar dumb-init para gestión PID 1 y utilidades de runtime seguras
RUN apk add --no-cache openssl libc6-compat dumb-init dos2unix

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV CHECKPOINT_DISABLE=1
ENV PRISMA_HIDE_UPDATE_MESSAGE=true

# Copiar manifiestos y esquemas requeridos para runtime y migraciones
COPY package*.json .npmrc* ./
COPY prisma ./prisma/

# Copiar dependencias limpias podadas desde el builder
COPY --from=builder /app/node_modules ./node_modules

# Copiar artefactos transpilados finales
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Copiar y sanear script de entrypoint
COPY docker-entrypoint.sh ./
RUN dos2unix ./docker-entrypoint.sh && chmod +x ./docker-entrypoint.sh

# Crear directorio de subidas/archivos con permisos adecuados
RUN mkdir -p /app/public/uploads && chown -R node:node /app

# Ejecutar como usuario sin privilegios
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--", "./docker-entrypoint.sh"]
CMD ["node", "dist/app.js"]
```

---

## 3. Higiene de `.dockerignore`

El contexto de build debe mantenerse liviano (<5 MB excluyendo `node_modules` selectivos). `.dockerignore` debe ignorar rigurosamente:

```dockerignore
.git
.github
.agent
specs
docs
backups
scratch
tests
coverage
*.md
.env*
!.env.example
docker-compose*.yml
frontend/node_modules
frontend/dist
dist
```

---

## 4. Entrypoint y Ciclo de Vida en Runtime (`docker-entrypoint.sh`)

1. **Esperar a PostgreSQL:** Usar polling no destructivo antes de arrancar.
2. **Prohibición de `prisma db push` Ciego:**
   - En producción o staging, las migraciones se ejecutan mediante `npx prisma db push --skip-generate` (o `prisma migrate deploy`) solo cuando la variable de control `RUN_MIGRATIONS=true` está presente.
   - Jamás ejecutar regeneraciones de cliente Prisma (`--skip-generate` es obligatorio) dentro del contenedor en ejecución, ya que el cliente ya fue transpilado en el Stage Builder.
3. **Pase de Mando a PID 1:**
   - La última línea del entrypoint debe usar `exec "$@"` para transferir el PID 1 a `dumb-init` y `node`.

---

## 5. Checklist de Verificación Senior

Antes de dar por cerrado un cambio en Docker o en los scripts de despliegue:

- [ ] **Build local verificado:** `docker compose build` se completa en <15 segundos sin caídas de red.
- [ ] **CI autónomo verificado:** El job `docker-build` en `.github/workflows/ci.yml` compila limpiamente en GitHub Actions sin `node_modules` del host.
- [ ] **Permisos de usuario:** `docker compose exec app whoami` responde `node` (no `root`).
- [ ] **Manejo de señales:** `docker compose stop app` se apaga de inmediato sin timeout de 10 segundos (gracias a `dumb-init`).
- [ ] **Healthcheck activo:** `docker inspect --format='{{json .State.Health.Status}}' <container_id>` responde `"healthy"`.
