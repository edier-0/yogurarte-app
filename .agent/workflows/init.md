---
description: Inicializa agent-core en un repositorio (Día 0 o existente), desplegando o reorganizando quirúrgicamente los archivos en .agent/ y configurando AGENTS.md, docs/constitution.md, MEMORY.md y .env.example.
---

# Workflow: Inicialización del Repositorio (Bootstrap y Reorganización Quirúrgica)

Este workflow configura los cimientos de gobernanza y arnés técnico de `agent-core` en el repositorio destino. Es ejecutado directamente por el **agente principal / root** (no por subagentes aislados).

Opera bajo la política **Local-First (Offline)** y el principio de **Cero Basura en la Raíz**: todo el arnés de agentes reside estrictamente dentro de `.agent/`, dejando la raíz del proyecto 100% limpia para el código de la aplicación del usuario.

---

## Modos de Ejecución

1. **Inicialización Estándar (`/init` o `/init --source <ruta>`)**:
   - Para proyectos nuevos (Greenfield) o proyectos existentes sin arnés de agentes.
   - Detecta si `agent-core` fue clonado directamente en la raíz y reorganiza los archivos quirúrgicamente.
2. **Actualización No Destructiva (`/init --update` o `/init --update --source <ruta>`)**:
   - Para repositorios que ya tienen `.agent/` y desean sincronizar skills, subagentes o workflows actualizados desde `agent-core` sin perder configuraciones locales.

---

## PARTE 1: Inicialización y Reorganización Quirúrgica

### Fase 1: Detección de Despliegue y Reorganización Quirúrgica

Antes de cualquier entrevista o generación de archivos, el agente analiza la estructura del directorio actual:

#### Escenario 1: Clonado Directo de `agent-core` (Árbol Expuesto en la Raíz)
Si el repositorio actual contiene carpetas como `agents/`, `workflows/`, `skills/`, `templates/` o `mcp/` expuestas directamente en la raíz:
1. **Reorganización Automática hacia `.agent/`**:
   - Crea el contenedor canónico `.agent/`.
   - Mueve `agents/` $\rightarrow$ `.agent/agents/`.
   - Mueve `workflows/` $\rightarrow$ `.agent/workflows/`.
   - Mueve `skills/` $\rightarrow$ `.agent/skills/`.
   - Mueve `mcp/` $\rightarrow$ `.agent/mcp/`.
   - Mueve `templates/` $\rightarrow$ `.agent/templates/`.
2. **Tratamiento de `README.md` de `agent-core`**:
   - Si el `README.md` en la raíz corresponde a la documentación de `agent-core`, muévelo a `.agent/README.md`.
   - Esto preserva el manual del arnés completo dentro de `.agent/` para consulta offline y libera la raíz para el `README.md` propio de la aplicación del usuario.
3. **Tratamiento de `plan.md` de `agent-core`**:
   - Si existe `plan.md` en la raíz (plan interno de construcción de `agent-core`), muévelo a `.agent/docs/history/agent-core-plan.md`.
   - La raíz no debe contener un `plan.md` huérfano, ya que las características del proyecto se gestionarán exclusivamente dentro de `specs/NNN-nombre/plan.md`.
4. **Resultado**: La raíz queda 100% libre de residuos del núcleo.

#### Escenario 2: Instalación desde Fuente Externa (`/init --source <ruta>` o `~/.agent-core`)
Si se ejecuta en un proyecto destino independiente:
1. Copia directamente desde la fuente hacia `.agent/`:
   - `.agent/agents/`
   - `.agent/workflows/`
   - `.agent/skills/`
   - `.agent/mcp/`
   - `.agent/templates/`
   - `.agent/README.md` (como documentación del arnés)
2. **PROHIBICIÓN ESTRICTA**: Prohibido copiar `plan.md` o el `README.md` de `agent-core` a la raíz del proyecto destino.

---

### Fase 2: Comprobación de Git

1. **Auditoría de Git**:
   - Comprueba si el directorio actual cuenta con control de versiones (`.git`).
   - Si `.git` **NO existe**:
     - Solicita confirmación explícita al usuario para inicializar Git:
       ```bash
       git init && git checkout -b main
       ```
     - Realiza un commit inicial vacío o con los archivos base para habilitar compuertas de Git y baseline de TDD.

---

### Fase 3: Identificación del Contexto del Proyecto

1. Comprueba si el directorio actual contiene código fuente, dependencias (`package.json`, `requirements.txt`, `pyproject.toml`, `Cargo.toml`, `go.mod`, etc.) o commits previos.
2. Determina el escenario:
   - **Escenario A: Proyecto Existente (Día N)**: Auditar el código actual, linters, runners de pruebas y convenciones.
   - **Escenario B: Proyecto Desde Cero (Día 0 / Greenfield)**: Entrevistar al usuario para definir stack, arquitectura y comandos.

---

### Fase 4: Auditoría o Entrevista Técnica Minuciosa (Tarjetas de Selección con Opción Libre)

**Estándar Obligatorio de Formulación**: Todas las preguntas de esta fase deben presentarse obligatoriamente bajo el formato de **tarjetas de selección con opción libre**:
- Si la plataforma dispone de herramienta interactiva nativa (ej. `ask_question`), invocarla enviando las opciones sin numerar con `(Recommended)` en la sugerencia preferente según el análisis técnico objetivo (la UI despliega tarjetas interactivas de clic y la opción automática para escribir texto libre).
- Si opera en texto plano / Markdown, estructurar cada pregunta como tarjetas visuales de selección con opciones `[A] (Recomendada)`, `[B]` y la opción explícita `[O] Escribir otra respuesta`.
- Queda prohibido formular preguntas abiertas difusas en texto plano sin opciones preconfiguradas y fundamentadas técnicamente.

---

#### Escenario A: Repositorio Existente (Día N)
1. Inspecciona los archivos clave del repositorio (árbol de directorios, manifiestos de dependencias, scripts de test, docker-compose, linters, schemas de base de datos).
2. Formula un cuestionario técnico acotado (máximo 4 preguntas en tarjetas) sobre lo que **no se puede deducir del código**:
   - ¿Qué flujo de Git prefieres utilizar? (`(Recommended) branch_pr con ramas dedicadas y PRs`, `trunk con desarrollo directo en main`).
   - ¿Cuáles son las reglas de dominio o trampas críticas que ningún agente debe romper?
   - ¿Qué acciones o módulos están estrictamente prohibidos tocar o cambiar (guardrails de seguridad)?
   - ¿Qué comando exacto de test consideras indispensable y cuál es tu servidor de desarrollo local (`DEV_SERVER_URL`)?

---

#### Escenario B: Proyecto Desde Cero (Día 0 / Greenfield) — El Framework de los 8 Ejes Técnicos
Para garantizar cimientos de ingeniería de software de nivel de producción desde el inicio, el agente conduce una **entrevista minuciosa y estructurada** recorriendo de forma sistemática los 8 ejes de decisión técnica. Cada pregunta presenta opciones objetivas con los pros/contras arquitectónicos y una alternativa recomendada:

1. **Eje 1: Propósito de Negocio, Dominio y Usuarios / Roles**:
   - *Objetivo y Problema*: ¿Qué problema central resuelve el sistema y cuál es la métrica de éxito operativa?
   - *Actores y Roles*: ¿Qué tipos de usuarios interactuarán con la plataforma? (`(Recommended) Modelo RBAC granular (ej. ADMIN, OPERADOR, CLIENTE)`, `Solo autenticados vs públicos`, `Multi-inquilino / Multi-tenant con organizaciones`).
   - *Superficie de Consumo*: ¿Cuál es la interfaz primaria de la aplicación? (`(Recommended) API REST modular + Frontend Web SPA`, `API REST pura / Backend headless`, `Full-Stack con Server-Side Rendering (SSR)`, `CLI / Herramienta de terminal`).

2. **Eje 2: Stack Tecnológico y Lenguajes (Frontend / Backend / Runtimes)**:
   - *Backend Runtime & Lenguaje*: ¿Cuál será el motor principal del backend?
     - `(Recommended) Node.js 20+ con TypeScript estricto ("strict": true, ESM "type": "module") y Express/Fastify` (Máxima portabilidad, tipado end-to-end, ecosistema rico).
     - `Python 3.11+ con FastAPI y Pydantic v2` (Ideal para alto rendimiento asíncrono, IA y pipelines de datos).
     - `Rust con Axum / Actix` (Máxima seguridad de memoria, rendimiento extremo y bajo consumo).
     - `Go con Chi / Gin` (Simplicidad operacional, concurrencia ligera y binarios autocontenidos).
   - *Frontend (si aplica)*:
     - `(Recommended) Vue 3 con Composition API (<script setup lang="ts">), Vite y Tailwind CSS` (Reactividad granular, DX rápida y excelente mantenibilidad).
     - `React 18+ con TypeScript, Vite y Tailwind CSS` (Ecosistema masivo y amplia compatibilidad de componentes).
     - `Next.js App Router con SSR` (Para aplicaciones con requerimientos intensivos de SEO público).
     - `Sin frontend en fase inicial (Backend puro / API first)`.

3. **Eje 3: Arquitectura de Software, Modularidad y Manejo de Errores**:
   - *Patrón de Organización*:
     - `(Recommended) Monolito Modular Desacoplado por Dominio (Vertical Slices en src/modules/<dominio>/ conteniendo routes, controller, service y schemas)`: Evita el espagueti de capas horizontales y permite escalar o extraer microservicios a futuro sin reescribir.
     - `Clean Architecture / Arquitectura Hexagonal estricta` (Dominio, Casos de Uso, Adaptadores e Infraestructura): Para sistemas con lógica de negocio altamente compleja.
     - `Arquitectura en Capas Tradicional (controllers/, services/, models/)`: Solo para utilidades o prototipos muy pequeños.
   - *Validación de Contratos y Tipado en Runtime*:
     - `(Recommended) Esquemas Zod (o Pydantic v2) en límites de la API`: Validación estricta en runtime de `body`, `query` y `params` antes de que los datos alcancen el controlador, desacoplando tipos de TypeScript/Python inferidos automáticamente.
   - *Manejo de Errores y Excepciones*:
     - `(Recommended) Clase AppError desacoplada con códigos HTTP semánticos y middleware global de excepciones`: Prohíbe bloques `try/catch` vacíos o descontrolados y estandariza la salida JSON de errores (`{ status: "error", message: string, code?: string }`).

4. **Eje 4: Persistencia, Base de Datos y Modelo de Datos**:
   - *Motor de Persistencia*:
     - `(Recommended) PostgreSQL 16+`: Transacciones ACID rigurosas, soporte relacional robusto, integridad referencial y columnas JSONB para esquemas semi-estructurados.
     - `SQLite / LibSQL`: Para aplicaciones de escritorio, herramientas embebidas o desarrollo local ágil.
     - `MongoDB`: Si el dominio requiere almacenamiento de documentos altamente dinámicos sin relaciones complejas.
   - *Capa de Acceso a Datos / ORM*:
     - `(Recommended) Prisma ORM`: Esquema declarativo unificado, migraciones automáticas versionadas (`prisma migrate`), generación de cliente tipado seguro y soporte transaccional nativo `$transaction`.
     - `Drizzle ORM`: Tipado SQL nativo ultraligero y máximo control de rendimiento sin abstracciones pesadas.
     - `SQLAlchemy 2.0`: Para proyectos Python con soporte exhaustivo de sesiones y migraciones Alembic.
   - *Invariante de Integridad*: Toda mutación de estado que involucre más de una tabla debe encapsularse en una transacción atómica; cero cambios destructivos en base de datos sin migración reversible previa.

5. **Eje 5: Seguridad, Autenticación y DevSecOps desde el Día 0**:
   - *Autenticación y Sesiones*:
     - `(Recommended) JWT firmado (HS256/RS256) con expiración corta (15 min) en headers Bearer o cookies HttpOnly con rotación de refresh tokens`.
     - `Sesiones stateful basadas en cookies seguras respaldadas en Redis`.
     - `Autenticación Delegada (OAuth2 / OIDC con Google/GitHub/Auth0)`.
   - *Control de Acceso (RBAC)*: Middleware declarativo de roles (`authorizeRole(['ADMIN', 'OPERADOR'])`) que intercepta las rutas protegidas antes de la ejecución de lógica de negocio.
   - *Política Estricta de Secretos (Blindaje DevSecOps)*:
     - `(Recommended) Cero fallbacks de credenciales en código`: Prohibido hardcodear contraseñas o conexiones (`|| 'postgresql://...'`).
     - Validación obligatoria de variables requeridas desde `.env` al arranque mediante schema tipado; si falta una variable crítica, el proceso aborta inmediatamente con mensaje explícito.
     - Generación obligatoria de `.env.example` con valores de ejemplo y documentación clara.

6. **Eje 6: Estrategia de Pruebas (TDD) y Comandos Deterministas**:
   - *Runner de Pruebas*:
     - `(Recommended) Vitest run`: Compatibilidad nativa ESM, velocidad extrema en Node.js/TypeScript y APIs compatibles con Jest.
     - `Pytest`: Estándar indiscutible en Python con fixtures modulares.
     - `Cargo test`: Runner nativo integrado de Rust.
   - *Comandos Obligatorios de Terminación Determinista (sin watch mode)*:
     - `TEST_COMMAND`: Comando de suite de pruebas que ejecuta una sola vez y sale con código 0 o 1 (ej. `npx vitest run`, `pytest`, `cargo test`).
     - `TYPECHECK_COMMAND`: Chequeo estático de tipos sin emitir código (ej. `npx tsc --noEmit`, `mypy .`).
     - `LINT_COMMAND`: Linter de formato y sintaxis (ej. `npm run lint`, `ruff check .`).
   - *Aislamiento de Pruebas*: Base de datos de test local dedicada (`DATABASE_URL_TEST` en `localhost`), blindada contractualmente contra bases de datos remotas o de producción.

7. **Eje 7: Empaquetado, Contenedores (Docker) e Infraestructura**:
   - *Dockerización*:
     - `(Recommended) Docker multi-stage build optimizado en Alpine con BuildKit`: Separa la fase de compilación (deps + build) de la imagen de producción final, ejecuta bajo usuario no-root por seguridad y maximiza la caché de capas.
     - `Despliegue bare-metal o PaaS (Railway / Render / Fly.io)` con scripts de arranque directos (`npm run build && npm start`).
   - *Observabilidad Inicial*: Logs estructurados en formato JSON para backend (`pino`, `winston` o `loguru`) con correlación de request ID.

8. **Eje 8: Flujo de Trabajo en Git y Gobernanza del Repositorio**:
   - *Estrategia de Ramas*:
     - `(Recommended) branch_pr`: Todo desarrollo ocurre en ramas dedicadas (`feature/*`, `fix/*`, `chore/*`) y se integra a la rama base exclusivamente mediante Pull Request validado por CI.
     - `trunk`: Commits atómicos directos en la rama principal `main` (solo para proyectos unipersonales muy pequeños).
   - *Rama Base de Integración*:
     - `(Recommended) develop`: Rama de integración activa pre-producción con sincronización periódica a `main` protegida.
     - `main`: Rama única de despliegue continuo.
   - *Regla de Salvaguarda Humana*: Autorización explícita requerida antes de abrir PR, fusionar PR y eliminar ramas locales o remotas.

---

### Fase 5: Auditoría Obligatoria de `TEST_COMMAND`

El comando de pruebas registrado en `AGENTS.md` debe ser **estrictamente de ejecución única, no interactivo y con terminación determinista**.

1. Revisa que el comando sugerido no active modo interactivo ni observador continuo (*watch mode*).
2. Ajusta automáticamente según el gestor:
   - Jest: `npm test -- --watchAll=false`
   - Vitest: `npx vitest run`
   - Pytest: `pytest`
   - Cargo: `cargo test`
   - Go: `go test ./...`
3. Prohibido registrar comandos como `npm test` si por defecto inician Vitest o Jest en modo interactivo/watch.

---

### Fase 6: Propuesta y Validación de Archivos Fundacionales

Antes de escribir en disco, presenta al usuario el borrador completo de los siguientes archivos para su aprobación:

#### 1. `AGENTS.md` (Raíz del proyecto, 30-40 líneas)
Utiliza como base `.agent/templates/AGENTS.md.template`. Debe contener:
- **Stack y estructura**: componentes principales y directorios canónicos.
- **Comandos**: comandos exactos de dev, build, lint, typecheck y `TEST_COMMAND` de terminación única.
- **Variables de arnés**:
  - `DEV_SERVER_URL`: URL del servidor local de desarrollo (o vacío si es backend/CLI).
  - `GIT_WORKFLOW_MODE`: `branch_pr` o `trunk`.
  - `PR_TARGET_BRANCH`: `develop` o `main`.
  - `AGENT_CAN_MERGE`: `false` (por defecto) o `true`.
- **Convenciones**: idioma, estilos y reglas de importación.
- **Reglas de dominio / trampas conocidas**: advertencias críticas de negocio.
- **Forma de trabajar**: referencia a SDD + TDD y skills en `.agent/`.
- **Límites**: ✅ Siempre / ⚠️ Pregunta antes / 🚫 Nunca.
- **Verificación**: suite y linters de cierre.

#### 2. `docs/constitution.md` (Máximo 6 principios innegociables, ~10-15 líneas)
Utiliza como base `.agent/templates/constitution.md.template`. Define los invariantes arquitecturales del proyecto (ej. cero credenciales en código, cobertura de pruebas previa, contratos estrictos, inmutabilidad de esquemas sin migración).

#### 3. `MEMORY.md` (Raíz del proyecto, ~25-50 líneas)
Utiliza como base `.agent/templates/MEMORY.md.template`. Inicializa el estado actual, decisiones arquitectónicas iniciales y próximos pasos.

#### 4. `.env.example` (Plantilla documentada sin secretos)
Si el proyecto utiliza variables de entorno, genera `.env.example` documentando cada clave requerida con valores dummy/ejemplo.
- **Regla estricta DevSecOps**: Cero contraseñas reales, tokens o claves de API.
- Asegura que `.env` esté listado en `.gitignore`.

#### 5. `README.md` del Proyecto
Si el proyecto es nuevo o no tenía `README.md`, genera un archivo limpio para la aplicación del usuario:
```markdown
# [Nombre del Proyecto]

> [Descripción breve de la aplicación]

## Requisitos y Comandos
Consulta `AGENTS.md` para conocer los comandos de desarrollo, pruebas y ejecución.
```

---

### Fase 7: Confirmación y Activación del Adaptador

Tras la confirmación explícita del usuario:
1. Escribe los archivos fundacionales validados (`AGENTS.md`, `docs/constitution.md`, `MEMORY.md`, `.env.example`, `README.md`).
2. Crea el directorio transitorio `.agent/scratch/` y añade la regla correspondiente a `.gitignore`.
3. Normaliza todas las rutas a barras directas (`/`).
4. Invoca automáticamente el workflow `/adopt` para configurar los conectores del agente activo en el entorno.

---

## PARTE 2: Actualización No Destructiva (`/init --update`)

Si se ejecuta con el modificador `--update`:

1. **Inspección de Diferencias**:
   - Compara los subagentes en `.agent/agents/`, workflows en `.agent/workflows/` y skills en `.agent/skills/` contra las plantillas fuente en `agent-core`.
2. **Detección de Personalizaciones y Respaldo Preventivo**:
   - Si un archivo en `.agent/` tiene modificaciones locales respecto a la versión upstream:
     - Crea un respaldo preventivo en `.agent/backup-<timestamp>/<archivo>`.
     - Notifica al usuario mostrando el diff y solicita confirmación explícita antes de sobrescribirlo.
3. **Blindaje Total de Archivos de Gobernanza**:
   - **PROHIBIDO SOBRESCRIBIR**: `AGENTS.md`, `MEMORY.md`, `docs/constitution.md`, `README.md` (de la raíz) y archivos de entorno (`.env*`). Estos archivos son sagrados y pertenecen al repositorio destino.
4. **Sincronización de Adaptadores OpenCode (`.opencode/`)**:
   - Si existe el directorio `.opencode/`, sincroniza las actualizaciones desde `.agent/agents/` y `.agent/workflows/` hacia `.opencode/agents/` y `.opencode/commands/` mediante copia física de archivos, aplicando el mismo protocolo de respaldo preventivo.
5. Emite un informe final con los archivos actualizados y los respaldos generados.
