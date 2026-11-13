# 🥛 YogurArte - Sistema de Gestión Operativa, Trazabilidad Láctea y CRM

[![CI / CD Pipeline](https://github.com/edier-0/yogurarte-app/actions/workflows/ci.yml/badge.svg)](https://github.com/edier-0/yogurarte-app/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Vue 3](https://img.shields.io/badge/Vue.js-3.5-4FC08D?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.19-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/Vitest-253%20Passing-brightgreen?logo=vitest&logoColor=white)](https://vitest.dev/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

Sistema integral de planeación de recursos y ejecución operativa (ERP artesanal & CRM) diseñado y construido a medida para **YogurArte** (Fonseca, La Guajira). La plataforma digitaliza y optimiza el ciclo de vida completo de la producción láctea artesanal: desde la recepción de materia prima cruda, fermentación térmica controlada y fraccionamiento multi-presentación, hasta la logística de reparto de última milla, CRM interactivo sobre WhatsApp oficial vía WebSockets y control financiero bimonetario con gestión flexible de obligaciones crediticias.

---

## 📑 Tabla de Contenidos
1. [Estado Actual del Proyecto](#-estado-actual-del-proyecto)
2. [Stack Tecnológico](#-stack-tecnológico)
3. [Estructura Canónica del Proyecto](#-estructura-canónica-del-proyecto)
4. [Lógica de Negocio y Flujos Operativos](#-lógica-de-negocio-y-flujos-operativos)
   - [Producción en Dos Fases y Rendimiento Volumétrico](#1-producción-en-dos-fases-y-rendimiento-volumétrico)
   - [Flexibilidad Multi-Presentación Dinámica](#2-flexibilidad-multi-presentación-dinámica)
   - [Ciclo de Pedidos y Cartera Cero-Redundancia](#3-ciclo-de-pedidos-y-cartera-cero-redundancia)
   - [Programa de Fidelización 10+1 Inteligente](#4-programa-de-fidelización-101-inteligente)
   - [CRM WhatsApp con Baileys & Sockets](#5-crm-whatsapp-con-baileys--sockets)
   - [Tesorería Bimonetaria y Créditos Flexibles](#6-tesorería-bimonetaria-y-créditos-flexibles)
5. [Despliegue y Puesta en Marcha en Local](#-despliegue-y-puesta-en-marcha-en-local)
   - [Prerrequisitos](#prerrequisitos)
   - [Variables de Entorno (.env)](#variables-de-entorno-env)
   - [Opción A: Entorno de Desarrollo Rápido (Inner Loop - Recomendado)](#opción-a-entorno-de-desarrollo-rápido-inner-loop---recomendado)
   - [Opción B: Pila Completa en Docker Compose (Outer Loop)](#opción-b-pila-completa-en-docker-compose-outer-loop)
   - [Opción C: Compilación y Ejecución Productiva Local (Node.js)](#opción-c-compilación-y-ejecución-productiva-local-nodejs)
6. [Despliegue en Remoto y Producción (Render + Neon DB)](#-despliegue-en-remoto-y-producción-render--neon-db)
   - [Arquitectura de Producción](#arquitectura-de-producción)
   - [Flujo de Despliegue Continuo (CI/CD)](#flujo-de-despliegue-continuo-cicd)
   - [Variables de Entorno en Render](#variables-de-entorno-en-render)
   - [Dockerfile Multi-Stage Autónomo y Hardened](#dockerfile-multi-stage-autónomo-y-hardened)
7. [Credenciales Demo Preconfiguradas](#-credenciales-demo-preconfiguradas)
8. [Comandos de Verificación y Testing](#-comandos-de-verificación-y-testing)
9. [Respaldos y Mantenimiento de Base de Datos](#-respaldos-y-mantenimiento-de-base-de-datos)

---

## 🌟 Estado Actual del Proyecto

El sistema se encuentra en **estado productivo y 100% operativo**, cubriendo todos los hitos y especificaciones de la arquitectura canónica:
* **253 pruebas automatizadas pasando en Vitest** a través de 24 suites de pruebas de integración y pruebas Golden Master de costeo y lotes.
* **Compilación TypeScript estricta** (`tsc --noEmit` y `vue-tsc`) sin errores de tipado.
* **Docker Multi-Stage 100% Autónomo**: Desacoplado de las dependencias locales del host, eliminando fallos en clones limpios de Git (`lstat /node_modules`) y optimizado contra deadlocks en Docker Desktop / WSL2.
* **Flexibilidad Multi-Presentación Completa (Spec 013)**: Operación sin columnas fijas (1L / 2L) en pedidos, lotes de Fase B, compras frecuentes CRM y fidelización.
* **Principio de Rendimiento Volumétrico (Constitución Art. 5.6)**: Balance de masa y volumen que admite rendimientos comerciales superiores al 100% por adición de fruta, mermeladas y endulzantes sin alterar la base láctea consumida.
* **Fidelización 10+1 con Cartera Cero**: Bloqueo preventivo de premios si el cliente presenta obligaciones crediticias o saldos pendientes de pago.

---

## 🛠️ Stack Tecnológico

### Backend
* **Runtime**: [Node.js](https://nodejs.org/) v20+ LTS con soporte ESM nativo (`"type": "module"`, `NodeNext`).
* **Framework Web**: [Express 4](https://expressjs.com/) estructurado en módulos de dominio canónicos.
* **Base de Datos & ORM**: PostgreSQL 16 (compatible con [Neon Serverless DB](https://neon.tech/)) gestionado mediante [Prisma ORM 5.19](https://www.prisma.io/).
* **Motor WhatsApp**: [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) v7.x con persistencia multi-dispositivo y recuperación de socket inteligente (errores 401 vs 440/515).
* **Eventos en Tiempo Real**: [Socket.IO 4](https://socket.io/) para comunicación bidireccional inmediata.
* **Seguridad y Validación**: [Zod 4](https://zod.dev/) para esquemas de entrada, [Bcrypt.js](https://www.npmjs.com/package/bcryptjs) para hashing de credenciales y PINs, [JWT](https://jwt.io/) para autenticación stateless y [Helmet](https://helmetjs.github.io/) para protección de cabeceras HTTP.

### Frontend
* **Core & Reactividad**: [Vue 3.5](https://vuejs.org/) (Composition API, `<script setup lang="ts">`) y TypeScript 5.6.
* **Tooling & Bundler**: [Vite 5](https://vitejs.dev/) con división de código por rutas y proxy reverso local.
* **Componentes & Estilos**: [Tailwind CSS 3.4](https://tailwindcss.com/) adaptativo para móviles de domiciliarios y pantallas de planta, componentes accesibles sin estilos con [Reka UI](https://reka-ui.com/), iconos con [Lucide Icons](https://lucide.dev/) y toasts con [Vue Sonner](https://vue-sonner.vercel.app/).
* **Estado Global y Navegación**: [Pinia](https://pinia.vuejs.org/) y [Vue Router 4](https://router.vuejs.org/) con guardas de autenticación y normalización de roles RBAC.

### Infraestructura & DevOps
* **Contenedores**: [Docker](https://www.docker.com/) con compilación multi-etapa en Alpine Linux, `dumb-init` (PID 1) y usuario no privilegiado `node`.
* **Orquestación**: [Docker Compose](https://docs.docker.com/compose/) con red bridge y volúmenes nombrados persistentes.
* **CI/CD**: [GitHub Actions](https://github.com/features/actions) con verificación de tipos, pruebas de integración en PostgreSQL efímero y test de Docker build.
* **Hosting Productivo**: [Render PaaS](https://render.com/) sincronizado con [Neon Serverless PostgreSQL](https://neon.tech/) en AWS `us-east-2`.

---

## 📂 Estructura Canónica del Proyecto

La arquitectura backend se rige por el patrón modular canónico en `src/modules/<dominio>/`:

```text
yogurarte-app/
├── .github/
│   └── workflows/
│       └── ci.yml               # Pipeline de CI/CD automatizado en GitHub Actions
├── prisma/
│   ├── migrations/              # Historial cronológico de migraciones relacionales
│   ├── schema.prisma            # Modelado de datos canónico Prisma
│   └── seed.ts                  # Semillero interactivo de onboarding con datos demo
├── scripts/
│   ├── audit_neon_db.cjs        # Auditoría profunda de saldos y esquema en Neon DB
│   ├── backup_cloud.cjs         # Extracción de respaldos SQL comprimidos
│   ├── backup_db.bat            # Respaldo rápido local para sistemas Windows
│   └── sync_neon_to_local.cjs   # Sincronización selectiva entre nube y desarrollo local
├── src/                         # Backend canónico (Node.js + Express + TypeScript ESM)
│   ├── modules/                 # Capa de dominio desacoplada (Routes, Controller, Service, Schema)
│   │   ├── auth/                # Autenticación JWT, login con PIN y gestión de usuarios
│   │   ├── batches/             # Fase A (lotes madre) y Fase B (fraccionamiento dinámico)
│   │   ├── crm/                 # CRM WhatsApp con Baileys, sockets y respuestas rápidas
│   │   ├── customers/           # Cartera de clientes, saldo dinámico y fidelización
│   │   ├── finance/             # Caja bimonetaria (Efectivo/Nequi), gastos y créditos
│   │   ├── inventory/           # Stock de materias primas, envases y recetas de mermelada
│   │   ├── orders/              # Pedidos, rutas de entrega y cartera dinámica
│   │   ├── preparations/        # Elaboración de insumos compuestos (mermeladas artesanales)
│   │   ├── production/          # Supervisión de fermentación láctea y costos
│   │   ├── settings/            # Catálogo de sabores, precios y presentaciones
│   │   └── staff/               # Nómina, colaboradores y liquidaciones de jornales
│   ├── services/                # Servicios de integración externa (Baileys WhatsApp)
│   ├── shared/                  # AppError, middlewares de auth/roles, logger Pino y utilidades
│   ├── app.ts                   # Ensamblado del servidor Express, CORS y middlewares
│   └── server.ts                # Entrypoint de arranque HTTP y enlace Socket.IO
├── frontend/                    # Cliente SPA (Vue 3 + TypeScript + Vite + Tailwind)
│   ├── public/                  # Favicon institucional y logos vectoriales
│   └── src/
│       ├── api/                 # Cliente HTTP Axios centralizado (client.ts)
│       ├── components/          # Componentes reutilizables (TopBar, BottomNav, Modales)
│       ├── composables/         # Hooks reutilizables (useAuth, useSocket, useCurrency)
│       ├── layouts/             # Plantilla visual responsiva (Desktop / Móvil)
│       ├── router/              # Rutas declarativas y guardas de seguridad RBAC
│       ├── stores/              # Stores Pinia (auth, batches, orders, crm, finance)
│       ├── views/               # Vistas: Dashboard, Lotes, Pedidos, Reparto, CRM, Caja
│       ├── App.vue              # Componente raíz con contenedor de toasts
│       └── main.ts              # Entrypoint de inicialización de la app Vue 3
├── tests/                       # Pruebas automatizadas de integración y Golden Master
├── Dockerfile                   # Construcción multi-stage autónoma y hardened
├── docker-compose.yml           # Orquestación de base de datos y aplicación
├── docker-entrypoint.sh         # Script de inicio resiliente en contenedor
├── package.json                 # Dependencias raíz y scripts de automatización
├── tsconfig.json                # Configuración de compilación TypeScript NodeNext
└── vitest.config.ts             # Configuración del ejecutor de pruebas Vitest
```

---

## ⚙️ Lógica de Negocio y Flujos Operativos

```mermaid
flowchart TD
    subgraph S1["1. Fase A: Fermentación Térmica"]
        A1["Recepción de Leche Cruda + Cultivo"] --> A2["Monitoreo Térmico 6 - 8h"]
        A2 --> A3["Lote Madre Base (ProductionBatch)"]
    end

    subgraph S2["2. Fase B: Envasado y Fraccionamiento"]
        A3 --> B1["Fracción Fresa (Mermelada + Botellas 500ml / 1L)"]
        A3 --> B2["Fracción Melocotón (Almíbar + Botellas 1L / 2L)"]
        B1 --> B3["Deducción Automática de Insumos y Empaques"]
        B2 --> B3
    end

    subgraph S3["3. Pedidos y Despacho"]
        B3 --> C1["Pedido (Web o CRM WhatsApp con Selector Dinámico)"]
        C1 --> C2["Despacho: PREPARING ➔ IN_ROUTE ➔ DELIVERED"]
    end

    subgraph S4["4. Finanzas y Fidelización"]
        C2 --> D1{"¿Pago Inmediato?"}
        D1 -- "Sí: Efectivo / Nequi" --> D2["Asiento en Caja Menor o Banco"]
        D1 -- "No: A Crédito" --> D3["Cartera Dinámica Activa (totalAmount - paidAmount)"]
        D3 --> D4["Cobro en Ruta / CRM"]
        D4 --> D2
        D2 --> E1{"¿Fidelización 10+1?"}
        E1 -- "10 Unidades Cumplidas y Cartera = $0" --> E2["Canje 1x 1L o 2x 500ml a $0 COP"]
        E1 -- "Tiene Deuda Pendiente" --> E3["Bloqueo Preventivo hasta Liquidar Cartera"]
    end
```

### 1. Producción en Dos Fases y Rendimiento Volumétrico
* **Fase A (Lote Base / `ProductionBatch`):** Transforma la leche cruda fresca mediante pasteurización e inoculación de cultivo termófilo. Se supervisa el rendimiento térmico, temperatura y horas de fermentación. El lote base representa exclusivamente base láctea a granel.
* **Fase B (Fraccionamiento / `BatchPackaging`):** Un lote base se divide en fracciones por sabor y presentación. Al envasar, el sistema descuenta automáticamente los envases, tapas de seguridad, etiquetas y los insumos compuestos (mermeladas artesanales).
* **Principio de Rendimiento Volumétrico (Constitución Art. 5.6):** La base láctea consumida (`baseLitersUsed`) permanece fija según lo extraído del tanque madre, pero el volumen comercial envasado puede legítimamente superar el 100% debido a la masa y volumen aportados por mermeladas, frutas y endulzantes.

### 2. Flexibilidad Multi-Presentación Dinámica
* No existen columnas estáticas ni supuestos hardcodeados de 1L o 2L.
* El sistema opera con presentaciones configurables (500 ml, 1 L, 2 L y futuros formatos), adaptando automáticamente el selector de lotes en pedidos, la vinculación masiva en Fase B (`linkOrdersToPackaging`) y las suscripciones frecuentes en CRM.

### 3. Ciclo de Pedidos y Cartera Cero-Redundancia
* **Flujo de Logística:** `PREPARING` (alistamiento en planta) $\rightarrow$ `IN_ROUTE` (asignado a domiciliario) $\rightarrow$ `DELIVERED` (entregado exitosamente) o `CANCELLED`.
* **Cálculo Matemático de Deuda:** No existen columnas de saldo estático en `Customer`. La deuda se evalúa en tiempo real:
  $$\text{Deuda Total} = \sum_{\text{Pedidos Entregados}} (\text{totalAmount} - \text{paidAmount})$$
  Cada pago registrado (`OrderPayment`) impacta el balance del pedido y genera el asiento contable en la caja seleccionada.

### 4. Programa de Fidelización 10+1 Inteligente
* Cada botella comprada en pedidos entregados acumula unidades hacia la recompensa.
* Al completar 10 unidades, el cliente tiene derecho a canjear **1 Litro o 2 unidades de 500 ml** de yogur de obsequio a $0 COP (`PREMIO_FIDELIZACION`).
* **Bloqueo por Cartera:** Si el cliente tiene deudas pendientes (`pendingDebt > 0`), el sistema bloquea proactivamente el canje tanto en la interfaz como en el backend con HTTP 400 hasta que el saldo sea cancelado.

### 5. CRM WhatsApp con Baileys & Sockets
* **Discriminación de Errores:**
  * Error `401 (loggedOut)`: Limpieza controlada de credenciales y regeneración de código QR.
  * Error `440 / 515 (restartRequired)`: Reconexión transparente sin invalidar la sesión existente.
* **Sincronización en Vivo:** Emisión inmediata de chats y estados de pedidos hacia la interfaz Vue 3 vía Socket.IO.
* **Respuestas Rápidas (`QuickReplies`):** Atajos integrados para `/sabores`, `/precios`, `/pago` y `/domicilio`.

### 6. Tesorería Bimonetaria y Créditos Flexibles
* **Canales Separados:** **Efectivo** (dinero físico en caja menor para vueltos y mostrador) y **Nequi / Bancolombia** (transferencias bancarias digitales).
* **Créditos con Frecuencia Flexible:** Registro de adquisiciones mayores bajo la modalidad `FLEXIBLE` (abonos libres según el flujo de caja diario, sin cuotas periódicas forzadas).

---

## 🚀 Despliegue y Puesta en Marcha en Local

### Prerrequisitos
* **Node.js**: v20.12.0 o superior ([Descargar Node.js](https://nodejs.org/)).
* **npm**: v10.x / v11.x.
* **Docker y Docker Desktop**: Opcional para desarrollo local nativo, mandatorio si se utiliza Docker Compose.

### Variables de Entorno (.env)
Copia la plantilla preconfigurada en la raíz del proyecto:
```bash
# En Windows PowerShell o CMD:
copy .env.example .env

# En Linux o macOS:
cp .env.example .env
```

| Variable | Tipo | Descripción | Ejemplo / Valor por Defecto |
| :--- | :--- | :--- | :--- |
| `PORT` | `number` | Puerto de escucha del servidor HTTP Express. | `3000` |
| `NODE_ENV` | `string` | Modo de entorno (`development`, `production`, `test`). | `development` |
| `DATABASE_URL` | `string` | Cadena de conexión PostgreSQL para Prisma. | `postgresql://postgres:postgrespassword@localhost:5432/yogurarte_db?schema=public` |
| `JWT_SECRET` | `string` | Secreto criptográfico para firma de tokens JWT (mínimo 32 caracteres). | `clave_secreta_aleatoria_super_segura_123456789` |
| `JWT_EXPIRES_IN` | `string` | Tiempo de expiración del token JWT. | `1d` |
| `CORS_ORIGIN` | `string` | Orígenes autorizados para peticiones cruzadas. | `http://localhost:5173,http://localhost:3000` |
| `RUN_MIGRATIONS` | `boolean` | Sincroniza el esquema con `prisma db push` al arrancar el contenedor. | `false` |
| `SMTP_HOST` | `string` | Servidor SMTP para envío de correos (opcional). | `smtp.gmail.com` |
| `SMTP_PORT` | `number` | Puerto seguro del servidor SMTP. | `465` (SSL) o `587` (TLS) |
| `SMTP_USER` | `string` | Cuenta de correo emisora de notificaciones. | `seguridad@yogurarte.com` |
| `SMTP_PASS` | `string` | Contraseña de aplicación SMTP. | `token_de_aplicacion` |

---

### Opción A: Entorno de Desarrollo Rápido (Inner Loop - Recomendado)
Este es el flujo diario recomendado para programadores: aprovecha la recarga en caliente instantánea (HMR de Vite en frontend y reinicio rápido de Express con TypeScript) manteniendo la base de datos aislada en Docker.

```bash
# 1. Levantar únicamente el contenedor de PostgreSQL en segundo plano
docker compose up -d postgres

# 2. Instalar dependencias del backend y frontend
npm install
npm --prefix frontend install

# 3. Generar cliente de Prisma y sincronizar el esquema relacional
npx prisma generate
npx prisma db push

# 4. Poblar la base de datos con datos de demostración
npx prisma db seed

# 5. Iniciar servidores de desarrollo en dos terminales separadas:
# Terminal 1 - Backend Express en http://localhost:3000
npm run dev

# Terminal 2 - Frontend Vite HMR en http://localhost:5173
npm run dev:client
```
Accede a la aplicación en **http://localhost:5173** (con proxy automático hacia la API en el puerto 3000).

---

### Opción B: Pila Completa en Docker Compose (Outer Loop)
Ideal para verificar el empaquetado multi-stage, probar la aplicación sin instalar Node.js en la máquina anfitriona o realizar pruebas de aceptación integrales.

```bash
# 1. Construir la imagen multi-stage y levantar la pila completa
docker compose up --build -d

# 2. Monitorear el estado de salud de los contenedores
docker compose ps

# 3. Visualizar los logs de la aplicación en tiempo real
docker compose logs -f app
```

* **Servicios desplegados:**
  * `yogurarte_postgres`: PostgreSQL 16 Alpine en el puerto `5432` con volumen persistente `yogurarte_postgres_data`.
  * `yogurarte_app`: Imagen de producción optimizada en Node 20 Alpine en el puerto `3000` con `dumb-init` y usuario `node`.
* **Para aplicar el semillero demo dentro del contenedor:**
  ```bash
  docker compose exec app npx prisma db seed
  ```
* **Para detener los contenedores:**
  ```bash
  docker compose down
  ```
* **Resolución de problemas en Windows (WSL2):** Si un build previo fue cancelado abruptamente y BuildKit presenta demoras por candados de caché huérfanos, ejecuta:
  ```bash
  docker builder prune -f
  ```

---

### Opción C: Compilación y Ejecución Productiva Local (Node.js)
Para probar el comportamiento idéntico a producción de forma nativa sin Docker:

```bash
# 1. Compilar frontend (Vite en public/) y backend (tsc en dist/)
npm run build

# 2. Iniciar el servidor unificado de producción
npm start
```
El servidor servirá la API REST, los WebSockets y la SPA en **http://localhost:3000**.

---

## 🚢 Despliegue en Remoto y Producción (Render + Neon DB)

### Arquitectura de Producción
* **Base de Datos**: [Neon Serverless PostgreSQL](https://neon.tech/) alojada en AWS `us-east-2`, con escalado a cero, pooling de conexiones integrado y encriptación obligatoria con SSL (`sslmode=require`).
* **Servidor de Aplicación**: [Render PaaS](https://render.com/) desplegado como un **Web Service** basado en Docker.
* **Integración Continua (CI/CD)**: Pipeline automatizado en [GitHub Actions](https://github.com/edier-0/yogurarte-app/actions) (`.github/workflows/ci.yml`).

### Flujo de Despliegue Continuo (CI/CD)
El flujo estricto del proyecto opera mediante la directiva `git-pr-workflow`:

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Desarrollador / Agente
    participant GH as GitHub (develop)
    participant CI as GitHub Actions (CI)
    participant Main as GitHub (main)
    participant Render as Render Webhook (PaaS)
    participant Neon as Neon Serverless DB

    Dev->>GH: Publica rama y abre Pull Request a develop
    GH->>CI: Ejecuta TypeCheck, Vitest (253 tests) y Docker Build
    CI-->>GH: Quality Gates aprobados (Verde)
    Dev->>GH: Fusión del PR en develop (Squash Merge)
    Dev->>Main: Sincronización directa develop ➔ main
    Main->>CI: Validación final en main
    Main->>Render: Disparo automático de Webhook de despliegue
    Render->>Render: Construcción multi-stage autónoma con Dockerfile
    Render->>Neon: Conexión persistente mediante DATABASE_URL con SSL
    Render-->>Dev: Despliegue exitoso con cero tiempo de inactividad
```

### Variables de Entorno en Render
En el panel de configuración de Render (**Environment Variables**), configura las siguientes variables clave:

| Variable | Valor / Formato | Propósito |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Activa optimizaciones de Express y suprime trazas de depuración. |
| `PORT` | `3000` | Puerto interno mapeado por el proxy reverso de Render. |
| `DATABASE_URL` | `postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require` | Cadena de conexión JDBC segura hacia Neon DB. |
| `JWT_SECRET` | Cadena aleatoria de 64 caracteres hex | Firma criptográfica de sesiones de usuario. |
| `JWT_EXPIRES_IN` | `1d` | Duración del token de autenticación. |
| `CORS_ORIGIN` | `https://tu-app-render.onrender.com` | Origen autorizado para peticiones CORS. |
| `RUN_MIGRATIONS` | `false` | Previene que el entrypoint ejecute `db push` descontrolado en reinicios. |

### Dockerfile Multi-Stage Autónomo y Hardened
El archivo [`Dockerfile`](file:///c:/Users/edier/Documents/YOGURES/Dockerfile) está diseñado con arquitectura de dos etapas para máxima seguridad y compatibilidad en la nube:
1. **Etapa 1 (Builder):**
   * Basado en `node:20-alpine` con `openssl`, `libc6-compat` y `npm@11`.
   * **Desacoplado al 100% del host:** No requiere ni asume la existencia de la carpeta `node_modules` local (compatible con clones limpios de Git en Render y GitHub Actions).
   * Instalación determinista y acelerada con `npm ci --no-audit --no-fund --legacy-peer-deps`.
   * Generación autónoma del motor nativo de Prisma (`npx prisma generate`).
   * Compilación de TypeScript (`npx tsc`) y del frontend Vue 3 con Vite.
   * Poda limpia de dependencias de desarrollo (`npm prune --omit=dev`).
2. **Etapa 2 (Runner):**
   * Imagen de ejecución ligera en `node:20-alpine` (< 180 MB).
   * Incorpora `dumb-init` para una adecuada gestión del PID 1 y manejo de señales Unix (`SIGTERM`/`SIGINT`).
   * **Hardening:** Ejecución bajo el usuario sin privilegios `node` (no root).
   * Directorios dedicados con permisos controlados para `/app/baileys_auth_info` (sesión WhatsApp) y `/app/logs`.

---

## 🔑 Credenciales Demo Preconfiguradas

El semillero demo (`npx prisma db seed`) provee las siguientes cuentas para pruebas de los distintos perfiles del sistema:

| Rol | Usuario (`username`) | Correo Electrónico | Contraseña | PIN Rápido | Alcance y Módulos Habilitados |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Administrador General** | `admin` | `admin@yogurarte.com` | `Admin123*` | `1234` | **Acceso Total:** Dashboard directivo, aprobación de gastos, configuración de sabores, tesorería y auditoría. |
| **Operario de Planta** | `planta` | `planta@yogurarte.com` | `Planta123*` | `1234` | **Producción e Inventarios:** Registro de lotes Fase A, envasado Fase B, control de mermeladas y stock de insumos. |
| **Repartidor de Rutas** | `reparto` | `reparto@yogurarte.com` | `Reparto123*` | `1234` | **Operaciones de Entrega:** Vista móvil de rutas de reparto, confirmación de entregas en campo y recaudo de cobros. |
| **Socio Fundador** | `edier` | `edierrobles6@gmail.com` | `edier123` | `1234` | **Control Ejecutivo:** Visualización financiera, métricas de rentabilidad y gestión de obligaciones crediticias. |

---

## 🧪 Comandos de Verificación y Testing

```bash
# Ejecutar la suite completa de pruebas de integración con Vitest (253 tests)
npm test

# Ejecutar pruebas en modo observador interactivo
npm run test:watch

# Ejecutar una suite específica (ej. Pedidos o Lotes)
npx vitest run tests/orders.test.ts
npx vitest run tests/dynamic_packaging_fase_b.test.ts

# Ejecutar las pruebas Golden Master de costeo y lotes
npx vitest run tests/golden_master.test.ts

# Validación estricta de tipos de TypeScript en Backend (cero errores)
npx tsc --noEmit

# Validación de tipos en Frontend y empaquetado Vite
npm --prefix frontend run build
```

---

## 📦 Respaldos y Mantenimiento de Base de Datos

* **Generar respaldo SQL comprimido:**
  ```bash
  npm run backup
  ```
  Extrae un volcado completo de la base de datos y lo almacena con marca de tiempo en la carpeta `backups/`.
* **Auditoría profunda de integridad relacional y saldos:**
  ```bash
  node scripts/audit_neon_db.cjs
  ```
  Inspecciona los pedidos entregados, valida la coincidencia matemática de saldos y detecta cualquier discrepancia de cartera.

---

## 📄 Licencia
Este proyecto es software privado desarrollado para el uso y administración exclusiva de **YogurArte** (Fonseca, La Guajira). Distribuido bajo los términos de la licencia [ISC](https://opensource.org/licenses/ISC).
