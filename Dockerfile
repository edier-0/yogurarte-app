# Etapa 1: Build
FROM node:20-alpine AS builder

# Instalar dependencias del sistema necesarias para Prisma en Alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

RUN npm install

# Copiar código fuente y compilar TypeScript
COPY src ./src/
RUN npx prisma generate
RUN npm run build

# Etapa 2: Runner de Producción
FROM node:20-alpine AS runner

# Instalar dependencias del sistema necesarias para Prisma en Alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
COPY prisma ./prisma/

# Instalar solo dependencias de producción
RUN npm install --omit=dev

# Copiar archivos compilados y frontend estático
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY public ./public

EXPOSE 3000

# Ejecutar sincronización de base de datos y arrancar servidor
CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
