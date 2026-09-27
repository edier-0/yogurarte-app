# 🥛 YogurArte - Sistema de Gestión Operativa, Trazabilidad y CRM

[![CI / CD Pipeline](https://github.com/edier-0/yogurarte-app/actions/workflows/ci.yml/badge.svg)](https://github.com/edier-0/yogurarte-app/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Vue 3](https://img.shields.io/badge/Vue.js-3.5-4FC08D?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.19-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

Sistema integral de planeación de recursos y ejecución operativa (ERP artesanal & CRM) diseñado y construido a medida para **YogurArte** (Fonseca, La Guajira). La plataforma digitaliza y optimiza el ciclo de vida completo de la producción láctea artesanal: desde la recepción de materia prima cruda, fermentación térmica controlada y fraccionamiento por sabores, hasta la logística de rutas de entrega de última milla, CRM interactivo sobre WhatsApp oficial vía WebSockets y control financiero bimonetario con gestión flexible de obligaciones crediticias.

---

## 📑 Tabla de Contenidos
1. [Visión General del Sistema](#-visión-general-del-sistema)
2. [Stack Tecnológico de Vanguardia](#-stack-tecnológico-de-vanguardia)
3. [Estructura del Proyecto y Módulos](#-estructura-del-proyecto-y-módulos)
4. [Lógica de Negocio y Flujos Operativos](#-lógica-de-negocio-y-flujos-operativos)
   - [Producción en Dos Fases (Fase A & Fase B)](#1-producción-en-dos-fases-fase-a--fase-b)
   - [Ciclo de Vida de Pedidos y Cartera Dinámica](#2-ciclo-de-vida-de-pedidos-y-cartera-dinámica)
   - [CRM WhatsApp con Baileys & Sockets](#3-crm-whatsapp-con-baileys--sockets-en-vivo)
   - [Tesorería Bimonetaria y Créditos Flexibles](#4-tesorería-bimonetaria-y-compras-a-crédito-flexibles)
   - [Programa de Fidelización 10+1](#5-programa-de-fidelización-101)
5. [Guía de Puesta en Marcha (Local Onboarding)](#-guía-de-puesta-en-marcha-local-onboarding)
6. [Credenciales Demo Preconfiguradas](#-credenciales-demo-preconfiguradas)
7. [Variables de Entorno (.env)](#-variables-de-entorno-env)
8. [Despliegue, CI/CD y Mantenimiento](#-despliegue-cicd-y-mantenimiento)

---

## 🌟 Visión General del Sistema

YogurArte opera con una arquitectura orientada a servicios ligeros y altamente reactiva:
* **Trazabilidad Láctea de Precisión**: Monitoreo estricto del rendimiento lácteo (\(\%\)), consumo de cultivo termófilo, horas de fermentación y costeo unitario por presentación (1 Litro y 2 Litros).
* **Gestión de Insumos Compuestos**: Soporte para recetas multinivel (ej. Mermeladas artesanales a base de fruta fresca y azúcar) con descuento automático de inventario al envasar.
* **Cartera Cero-Redundancia**: Eliminación de campos estáticos desincronizados. La deuda de cada cliente y el saldo pendiente de cada pedido se computan matemáticamente en tiempo real a partir del historial atómico de pagos y abonos.
* **Centro de Control CRM**: Terminal de mensajería bidireccional conectada a WhatsApp mediante la librería `@whiskeysockets/baileys`, con soporte para respuestas rápidas, detección de comprobantes bancarios, pedidos recurrentes y re-suscripción transparente de sockets sin pérdida de contexto.
* **Finanzas Bimonetarias y Créditos Abiertos**: Control independiente de Efectivo físico (caja menor para vueltos y mostrador) y Bancos digitales (Nequi / Bancolombia), junto con un módulo de amortización para adquisiciones a crédito bajo la modalidad de **Abonos Libres (Frecuencia Flexible)**.

---

## 🛠️ Stack Tecnológico de Vanguardia

### Backend
* **Runtime**: [Node.js](https://nodejs.org/) (v20+ LTS) con soporte nativo para módulos ES.
* **Framework Web**: [Express](https://expressjs.com/) v4.x con arquitectura de controladores desacoplados, middlewares y servicios de dominio.
* **Base de Datos & ORM**: PostgreSQL (compatible con [Neon Serverless DB](https://neon.tech/)) gestionado mediante [Prisma ORM](https://www.prisma.io/) v5.19.
* **Motor WhatsApp**: [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) v7.x con persistencia de sesiones de autenticación multi-dispositivo y reconexión automática anti-desincronización (códigos 401 vs 440).
* **Eventos en Tiempo Real**: [Socket.IO](https://socket.io/) v4.x para transmisión instantánea de chats, cambios de estado en pedidos y alertas de producción hacia el navegador.
* **Seguridad y Validación**: [Zod](https://zod.dev/) v3/v4 para esquemas de validación de entrada, [Bcrypt.js](https://www.npmjs.com/package/bcryptjs) para hashing salteado de contraseñas y PINs, [JSON Web Tokens (JWT)](https://jwt.io/) para sesiones autenticadas stateless y [Helmet](https://helmetjs.github.io/) con Rate Limiting para protección perimetral.

### Frontend
* **Core & Reactividad**: [Vue 3](https://vuejs.org/) (Composition API, `<script setup lang="ts">`) y TypeScript 5.6.
* **Bundler & Tooling**: [Vite 5](https://vitejs.dev/) con división de código (`code-splitting`) por rutas y compresión optimizada para producción.
* **Componentes & UI**: [Tailwind CSS 3.4](https://tailwindcss.com/) para diseño utilitario y responsivo (optimizado para terminales móviles de domiciliarios y pantallas táctiles de planta), componentes accesibles sin estilo vía [Reka UI](https://reka-ui.com/), iconos vectoriales con [Lucide Icons](https://lucide.dev/) y notificaciones toast con [Vue Sonner](https://vue-sonner.vercel.app/).
* **Estado Global y Enrutamiento**: [Pinia](https://pinia.vuejs.org/) con persistencia de tokens de sesión y [Vue Router 4](https://router.vuejs.org/) con navegación declarativa y guardas de seguridad (`Navigation Guards`).

### Infraestructura & DevOps
* **Contenedores**: [Docker](https://www.docker.com/) con compilación multi-etapa (`multi-stage build`) reduciendo el peso de la imagen final a menos de 180 MB.
* **Orquestación Local**: [Docker Compose](https://docs.docker.com/compose/) con aprovisionamiento automático de PostgreSQL y red aislada.
* **Integración Continua (CI/CD)**: [GitHub Actions](https://github.com/features/actions) con verificación estricta de compilación TypeScript (`tsc --noEmit`), auditoría de seguridad de paquetes, pruebas unitarias e integración en [Vitest](https://vitest.dev/) sobre base de datos Postgres efímera, y validación de Docker build.
* **Despliegue Productivo**: Alojado en Render PaaS conectado a Neon Serverless PostgreSQL en AWS `us-east-2`.

---

## 📂 Estructura del Proyecto y Módulos

```text
yogurarte-app/
├── .github/
│   └── workflows/
│       └── ci.yml               # Pipeline de CI/CD automatizado en GitHub Actions
├── prisma/
│   ├── migrations/              # Historial cronológico de migraciones relacionales
│   ├── schema.prisma            # Definición canónica de modelos relacionales Prisma
│   └── seed.ts                  # Semillero interactivo de onboarding local con datos demo
├── scripts/
│   ├── audit_neon_db.cjs        # Auditoría profunda de saldos y esquema en Neon DB
│   ├── backup_cloud.cjs         # Extracción de volcados SQL y respaldos automáticos
│   ├── backup_db.bat            # Respaldo rápido local para sistemas Windows
│   └── sync_neon_to_local.cjs   # Sincronización selectiva entre nube y desarrollo local
├── src/                         # Código fuente del Backend (Node.js + Express + TS)
│   ├── controllers/             # Controladores REST para la capa HTTP
│   ├── middlewares/             # Autenticación JWT, verificación de roles y rate limit
│   ├── modules/                 # Módulos de dominio desacoplados (auth, crm, etc.)
│   │   ├── auth/                # Lógica de login, hash bcrypt y emisión de tokens
│   │   └── crm/                 # Gestor Baileys, sincronización y sockets WhatsApp
│   ├── routes/                  # Definición y mapeo de endpoints REST
│   ├── schemas/                 # Validación de payloads de entrada con Zod
│   ├── services/                # Reglas de negocio (lotes, inventario, pedidos, caja)
│   ├── shared/                  # Clases compartidas, helpers y manejador de errores
│   ├── utils/                   # Formateadores, logger Pino y helpers auxiliares
│   ├── app.ts                   # Ensamblado del servidor Express, CORS y middlewares
│   └── server.ts                # Entrypoint de arranque HTTP y enlace Socket.IO
├── frontend/                    # Aplicación cliente SPA (Vue 3 + TypeScript + Vite)
│   ├── public/                  # Favicon institucional, manifest y logos vectoriales
│   └── src/
│       ├── api/                 # Clientes Axios tipados para consumir la API REST
│       ├── components/          # Componentes reutilizables (TopBar, BottomNav, Modales)
│       ├── composables/         # Hooks reutilizables (useAuth, useSocket, useCurrency)
│       ├── layouts/             # Plantilla visual con navegación adaptativa (Desktop/Móvil)
│       ├── router/              # Configuración de rutas y guardas de autenticación
│       ├── stores/              # Stores Pinia (auth, batches, orders, crm, finance)
│       ├── styles/              # Configuración base de Tailwind CSS y animaciones
│       ├── types/               # Definiciones e interfaces TypeScript del cliente
│       ├── utils/               # Formateador de moneda COP, fechas y helpers
│       ├── views/               # Vistas principales: Dashboard, Lotes, Pedidos,
│       │                        # Rutas de Reparto, CRM, Inventario, Caja y Gastos
│       ├── App.vue              # Componente raíz con contenedor de toasts
│       └── main.ts              # Entrypoint de inicialización de la app Vue 3
├── Dockerfile                   # Construcción multi-stage de producción optimizada
├── docker-compose.yml           # Pila completa de contenedores para ejecución local
├── package.json                 # Dependencias raíz, scripts de build y ejecución
├── tsconfig.json                # Configuración del compilador TypeScript para backend
└── vitest.config.ts             # Configuración del runner de pruebas unitarias/integración
```

---

## ⚙️ Lógica de Negocio y Flujos Operativos

```mermaid
flowchart TD
    subgraph S1["1. Fase A: Fermentación"]
        A1["Recepción de Leche Cruda + Cultivo"] --> A2["Monitoreo Térmico 6 - 8h"]
        A2 --> A3["Lote Base Completado (Batch)"]
    end

    subgraph S2["2. Fase B: Envasado y Fraccionamiento"]
        A3 --> B1["Fracción Sabor Fresa (Mermelada + Botellas 1L)"]
        A3 --> B2["Fracción Sabor Natural (Botellas 1L / 2L)"]
        B1 --> B3["Deducción Automática de Insumos y Empaques"]
        B2 --> B3
    end

    subgraph S3["3. Comercialización y Pedidos"]
        B3 --> C1["Pedido Registrado (Vía Web o CRM WhatsApp)"]
        C1 --> C2["Despacho: PREPARING ➔ IN_ROUTE ➔ DELIVERED"]
    end

    subgraph S4["4. Tesorería Bimonetaria y Cartera"]
        C2 --> D1{"¿Pago Inmediato?"}
        D1 -- "Sí: Efectivo / Nequi" --> D2["Ingreso Directo a Caja Menor / Banco"]
        D1 -- "No: Entrega a Crédito" --> D3["Cartera Dinámica Activa (Saldo Pendiente)"]
        D3 --> D4["Cobro Posterior en CRM / Ruta de Domicilio"]
        D4 --> D2
    end
```

### 1. Producción en Dos Fases (Fase A & Fase B)
* **Fase A (Fermentación Térmica / `ProductionBatch`):**
  Transforma la leche cruda fresca mediante pasteurización e inoculación de cultivo termófilo. Se supervisa el rendimiento térmico (\(\text{Rendimiento \%} = \frac{\text{Litros Producidos}}{\text{Leche Utilizada}} \times 100\)), las horas de fermentación y los costos indirectos.
* **Fase B (Fraccionamiento y Envasado / `BatchPackaging`):**
  Un lote base puede dividirse en múltiples fracciones independientes por sabor y presentación (ej. 15 Litros en sabor Fresa y 10 Litros en Natural). Al fraccionar, el sistema descuenta automáticamente los envases PET, tapas de seguridad, etiquetas y los insumos compuestos (como mermeladas artesanales calculadas a partir de sus recetas).

### 2. Ciclo de Vida de Pedidos y Cartera Dinámica
* **Estados de Entrega:** `PREPARING` (en alistamiento en planta) $\rightarrow$ `IN_ROUTE` (asignado a domiciliario en ruta) $\rightarrow$ `DELIVERED` (entregado exitosamente al cliente) o `CANCELLED`.
* **Cálculo Matemático de Deuda:** No existen columnas desincronizadas en la tabla `Customer`. La deuda de un cliente se evalúa dinámicamente sumando:
  $$\text{Deuda Total} = \sum_{\text{Pedidos Entregados}} (\text{totalAmount} - \text{paidAmount})$$
  Cada pago registrado (`OrderPayment`) impacta de inmediato el balance del pedido y genera el correspondiente asiento en la caja seleccionada.

### 3. CRM WhatsApp con Baileys & Sockets en Vivo
* **Conexión Resistente:** Implementa `@whiskeysockets/baileys` con discriminación de errores de socket:
  * Error `401 (loggedOut)`: Limpieza controlada de credenciales e invocación inmediata de un nuevo código QR.
  * Error `440 / 515 (restartRequired)`: Reconexión transparente de socket sin invalidar la sesión existente.
* **Omnicanalidad Reactiva:** Todo mensaje entrante o saliente, imagen o actualización de estado de lectura es emitido vía Socket.IO hacia la interfaz Vue 3, permitiendo una experiencia de atención al cliente fluida y en tiempo real.
* **Respuestas Rápidas (`QuickReplies`):** Atajos integrados para `/sabores`, `/precios`, `/pago` y `/domicilio`.

### 4. Tesorería Bimonetaria y Compras a Crédito Flexibles
* **Canales Bimonetarios:** Separación estricta entre **Efectivo** (dinero en caja física para gastos de ruta y cambio) y **Nequi / Bancolombia** (recaudos por transferencias digitales).
* **Créditos con Frecuencia Flexible:** El sistema permite registrar compras de maquinaria, equipos o suministros mayores bajo obligaciones crediticias (`CreditObligation`) de tipo `FLEXIBLE` (abonos libres). En esta modalidad no se fuerzan cuotas periódicas fijas, permitiendo amortizar saldo variable conforme a la disponibilidad del flujo de caja diario.

### 5. Programa de Fidelización 10+1
* Cada cliente acumula botellas de 1L compradas en pedidos completados (`bottlesTowardsReward`).
* Al acumular 10 botellas, la interfaz resalta el derecho a reclamar 1 Litro de yogur de obsequio, reiniciando el ciclo tras la redención sin alterar el histórico contable.

---

## 🚀 Guía de Puesta en Marcha (Local Onboarding)

### Prerrequisitos
* **Node.js**: v20.12.0 o superior ([Descargar Node.js](https://nodejs.org/)).
* **npm**: v10.x o superior.
* **PostgreSQL**: Instancia local instalada o servicio en Docker (puerto `5432`).

### Paso 1: Clonar el Repositorio
```bash
git clone https://github.com/edier-0/yogurarte-app.git
cd yogurarte-app
```

### Paso 2: Configurar Variables de Entorno
Copia la plantilla preconfigurada para desarrollo:
```bash
# En Windows PowerShell o CMD:
copy .env.example .env

# En Linux o macOS:
cp .env.example .env
```
Asegúrate de que la variable `DATABASE_URL` apunte a tu PostgreSQL local (ej. `postgresql://postgres:postgrespassword@localhost:5432/yogurarte_db?schema=public`).

### Paso 3: Instalar Dependencias del Backend y Frontend
```bash
# Instalar dependencias raíz del Backend
npm install

# Instalar dependencias de la SPA Frontend
npm --prefix frontend install
```

### Paso 4: Sincronizar Esquema de Base de Datos
Genera el cliente Prisma y crea la estructura relacional en tu base de datos:
```bash
npx prisma generate
npx prisma db push
```

### Paso 5: Poblar con el Semillero Demo (`prisma/seed.ts`)
Ejecuta el script de demostración interactiva:
```bash
npx prisma db seed
```
> **¿Qué crea este comando?**
> * 4 Usuarios con roles RBAC (Admin, Operario de Planta, Repartidor, Socio) con credenciales seguras hasheadas con Bcrypt.
> * 8 Sabores institucionales y catálogo de insumos base (Leche, Azúcar, Cultivo, Envases PET, Tapas, Etiquetas).
> * Receta Maestra de insumo compuesto: **Mermelada de Fresa Artesanal** (con proporciones automáticas de fruta y azúcar).
> * 2 Lotes de producción: 1 lote en incubación térmica (`LOTE-DEMO-INCUBATING`) y 1 lote completado (`LOTE-DEMO-COMPLETED`) fraccionado en 15L Fresa y 10L Natural.
> * 6 Clientes estratégicos: clientes al día, clientes con deudas por cobrar ($24.000 COP), clientes con abonos parciales ($12.000 COP abonados y $12.000 COP pendientes) y cliente con fidelización 8/10.
> * 6 Pedidos demo abarcando todo el ciclo de entrega (`PREPARING`, `IN_ROUTE`, `DELIVERED`).
> * Movimientos de apertura de caja bimonetaria (Efectivo y Nequi), gasto operativo y compra de maquinaria a crédito con **frecuencia flexible (abonos libres)**.
> * Conversaciones de prueba en CRM WhatsApp con plantillas de respuestas rápidas y pedidos recurrentes.

### Paso 6: Iniciar la Aplicación en Modo Desarrollo
En terminales separadas (o utilizando los scripts del proyecto):

```bash
# Terminal 1 - Servidor Backend (API Express + WebSockets en http://localhost:3000)
npm run dev

# Terminal 2 - Servidor Frontend (Vite HMR en http://localhost:5173)
npm run dev:client
```
Abre tu navegador en **http://localhost:5173** (o en **http://localhost:3000** si compilaste para producción).

---

## 🔑 Credenciales Demo Preconfiguradas

El semillero demo provee los siguientes perfiles de acceso para probar todos los roles del sistema:

| Rol | Usuario (`username`) | Correo Electrónico | Contraseña | PIN Rápido | Alcance y Módulos Habilitados |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Administrador General** | `admin` | `admin@yogurarte.com` | `Admin123*` | `1234` | **Acceso Total:** Dashboard directivo, aprobación de gastos, configuración de sabores, tesorería y auditoría. |
| **Operario de Planta** | `planta` | `planta@yogurarte.com` | `Planta123*` | `1234` | **Producción e Inventarios:** Registro de lotes Fase A, envasado Fase B, control de mermeladas y stock de insumos. |
| **Repartidor de Rutas** | `reparto` | `reparto@yogurarte.com` | `Reparto123*` | `1234` | **Operaciones de Entrega:** Vista móvil de rutas de reparto, confirmación de entregas en campo y recaudo de cobros. |
| **Socio Fundador** | `edier` | `edierrobles6@gmail.com` | `edier123` | `1234` | **Control Ejecutivo:** Visualización financiera, métricas de rentabilidad y gestión de obligaciones crediticias. |

---

## 🔐 Variables de Entorno (.env)

| Variable | Tipo | Descripción | Ejemplo / Valor por Defecto |
| :--- | :--- | :--- | :--- |
| `PORT` | `number` | Puerto de escucha del servidor HTTP Express. | `3000` |
| `NODE_ENV` | `string` | Modo de entorno (`development`, `production`, `test`). | `development` |
| `DATABASE_URL` | `string` | Cadena de conexión JDBC/PostgreSQL para Prisma. | `postgresql://user:pass@localhost:5432/yogurarte_db?schema=public` |
| `JWT_SECRET` | `string` | Secreto criptográfico para firma y validación de tokens JWT. | `clave_secreta_aleatoria_minimo_32_caracteres` |
| `JWT_EXPIRES_IN` | `string` | Tiempo de vida de la sesión JWT. | `1d` (1 día) |
| `CORS_ORIGIN` | `string` | Origen autorizado para peticiones CORS (separado por comas). | `http://localhost:5173,http://localhost:3000` |
| `SMTP_HOST` | `string` | Servidor SMTP para envío de correos de recuperación de PIN/clave. | `smtp.gmail.com` |
| `SMTP_PORT` | `number` | Puerto seguro del servidor SMTP. | `465` (SSL) o `587` (TLS) |
| `SMTP_SECURE` | `boolean` | Define si la conexión al servidor de correo usa TLS/SSL directo. | `true` |
| `SMTP_USER` | `string` | Cuenta de correo emisora de notificaciones. | `seguridad@yogurarte.com` |
| `SMTP_PASS` | `string` | Contraseña de aplicación o token de autenticación SMTP. | `contraseña_de_aplicacion_gmail` |
| `SMTP_FROM` | `string` | Cabecera "From" de los correos emitidos. | `"YogurArte Seguridad <seguridad@yogurarte.com>"` |

---

## 🚢 Despliegue, CI/CD y Mantenimiento

### Despliegue con Docker Compose
Para levantar la solución completa en un servidor de producción o contenedor local sin dependencias previas:
```bash
docker compose up --build -d
```
Esto inicializa:
1. Contenedor de base de datos PostgreSQL con volumen persistente `postgres_data`.
2. Contenedor de la aplicación YogurArte con build multi-stage optimizado y servidor Express activo en el puerto `3000`.

### Compilación Unificada para Producción
```bash
# Compila la SPA Vue 3 con Vite y el backend con TypeScript en dist/
npm run build

# Iniciar servidor compilado en producción
npm start
```

### Ejecución de Pruebas Automatizadas
```bash
# Ejecutar suite de pruebas con Vitest
npm test

# Modo interactivo / observador
npm run test:watch
```

### Respaldos y Auditoría de Datos
* **Respaldo en la Nube / Local:**
  ```bash
  npm run backup
  ```
  Genera un archivo comprimido SQL con el volcado completo de la base de datos en la carpeta `backups/`.
* **Auditoría de Deudas y Balances:**
  ```bash
  node scripts/audit_neon_db.cjs
  ```
  Inspecciona la integridad relacional de los pedidos y verifica que ningún balance contable presente discrepancias de redondeo o datos huérfanos.

---

## 📄 Licencia
Este proyecto es software privado desarrollado para el uso y administración exclusiva de **YogurArte**. Distribuido bajo los términos de la licencia [ISC](https://opensource.org/licenses/ISC).
