# Plan Maestro de Implementación — agent-core

Sistema base, portable y agnóstico a cualquier stack tecnológico para la orquestación de agentes de IA mediante Spec-Driven Development (SDD), Test-Driven Development (TDD), flujos controlados de Git/PR, DevSecOps y subagentes especializados. Fundamentado en la metodología oficial de Harness Engineering, Context Engineering y Sistemas Multiagente.

---

## 1. Visión y Finalidad Real de `agent-core`

### ¿Cuál es la finalidad real de este repositorio?
`agent-core` es una **Fábrica de Software Agéntica Portátil (*Portable Agentic Software Factory*)**. Su propósito es convertir cualquier repositorio nuevo o existente (sin importar si es Python, Node, Rust, Go, web, backend o monorrepo) en un entorno de desarrollo profesional con arneses y guardarraíles (*Harness Engineering*) donde:

1. **Se elimina el *Vibe Coding* descontrolado**: Ningún agente escribe una sola línea de código sin una especificación formal aprobada por el humano (`spec.md` en sintaxis EARS), un plan técnico (`plan.md`) y tareas verificables (`tasks.md`).
2. **Rige el rigor de la Ingeniería de Software**: TDD estricto (test primero en rojo, código en verde), revisión de QA imparcial RF por RF, tolerancia cero a secretos hardcodeados (DevSecOps) y control de versiones con compuertas de calidad.
3. **Es 100% agnóstico al agente**: Se auto-adapta nativamente a los 4 agentes principales (**OpenCode**, **Antigravity**, **Claude Code**, **Codex**) y proporciona un prompt universal de auto-adopción para cualquier otro agente (Cursor, Windsurf, Aider, etc.).
4. **Modo de ejecución dual transparente**:
   - **En herramientas multiagente (OpenCode, Antigravity)**: Despliega subagentes reales en sesiones/hilos aislados (`@planner`, `@implementer`, `@reviewer`) coordinados por `@coordinator`.
   - **En herramientas monohilo (Claude Code, Cursor, Codex)**: El agente asume el rol de Coordinador en su único hilo y transiciona secuencialmente entre roles anunciando explícitamente el cambio de rol en el chat.

---

## 2. Arquitectura del Repositorio `agent-core`

```text
C:\Users\edier\Documents\EDIER\agent-core\
├── README.md                          # Guía maestra, arquitectura y Protocolo Universal de Adopción
├── plan.md                            # Plan maestro vivo de diseño y ejecución
│
├── agents/                            # Los 4 subagentes especializados (formato híbrido OpenCode/Universal)
│   ├── coordinator.md                 # Orquestador del flujo SDD, enlace con el usuario
│   ├── planner.md                     # Redactor de specs (EARS), planes y tareas (solo lectura fuera de specs)
│   ├── implementer.md                 # Ejecutor atómico de tareas bajo TDD (acceso total a código/shell)
│   └── reviewer.md                    # QA de specs y validador RF por RF (solo lectura de archivos)
│
├── mcp/                               # Catálogo, verificación y fallback de MCPs
│   └── recommended-mcps.md            # Catálogo de MCPs recomendados (GitHub, Context7, Chrome DevTools) y fallback
│
├── workflows/                         # Workflows ejecutables / Custom Commands
│   ├── init.md                        # Bootstrap del proyecto en .agent/ (auditoría o greenfield)
│   ├── adopt.md                       # Auto-adopción nativa según el agente activo (Claude, OpenCode, Codex, etc.)
│   ├── sdd-constitution.md            # Creación/auditoría de docs/constitution.md (6 principios, máx 15 líneas)
│   ├── sdd-spec.md                    # Entrevista de spec (EARS, máx 5 preguntas)
│   ├── sdd-clarify.md                 # Bucle QA de clarificación de spec
│   ├── sdd-plan.md                    # Plan de arquitectura y estrategia de tests
│   ├── sdd-tasks.md                   # Tareas atómicas con "Hecho cuando:" (máx 10 tareas)
│   ├── sdd-implement.md               # Implementación atómica con TDD (tests en rojo primero)
│   ├── sdd-validate.md                # Validación de implementación RF por RF (tests + DevTools)
│   ├── sdd-change.md                  # Gestión de cambio (spec -> plan/tasks -> código)
│   ├── sdd-status.md                  # Estado actual de la spec y siguiente comando exacto
│   └── review-and-pr.md               # Validación de CI/local y apertura/merge de PR
│
├── templates/                         # Plantillas base universales y adaptadores por agente
│   ├── AGENTS.md.template             # Plantilla de AGENTS.md (~30-40 líneas)
│   ├── AGENTS-monorepo-root.template  # Plantilla raíz para monorrepositorios (opcional por escala)
│   ├── AGENTS-monorepo-module.template # Plantilla para submódulos de monorrepositorios
│   ├── MEMORY.md.template             # Memoria viva estándar (~50 líneas: Estado, Decisiones, Errores, Próximos)
│   ├── MEMORY-module.template         # Memoria especializada para submódulos o dominios complejos
│   ├── constitution.md.template       # Principios innegociables del proyecto (máx 6 principios)
│   ├── adapters/                      # Adaptadores nativos para los principales agentes
│   │   ├── CLAUDE.md.template         # Conector nativo para Claude Code
│   │   ├── CODEX.md.template          # Conector nativo para OpenAI Codex
│   │   ├── opencode.json.template     # Conector nativo para OpenCode
│   │   └── generic-agent.md.template  # Directiva universal para Cursor, Windsurf y otros
│   └── specs/                         # Plantillas para specs/NNN-nombre/ (centralizadas en raíz)
│       ├── spec.md.template           # Especificación funcional con sintaxis EARS
│       ├── plan.md.template           # Plan de arquitectura y testing
│       └── tasks.md.template          # Tareas atómicas verificables con "Hecho cuando:"
│
└── skills/                            # Batería modular de ~25 skills categorizadas
    ├── router/                        # Meta-enrutador maestro
    │   └── using-agent-skills/        # Enrutador con mapa integral de navegación
    ├── methodology/                   # Fundamentos metodológicos
    │   ├── sdd/                       # Spec-Driven Development canónico
    │   ├── test-driven-development/   # TDD estricto (Red-Green-Refactor, Prove-It)
    │   ├── source-driven-development/ # Anclaje estricto en documentación oficial
    │   ├── idea-refine/               # Refinamiento y stress-testing de ideas
    │   ├── interview-me/              # Entrevista socrática de requerimientos
    │   └── planning-and-task-breakdown/ # Desglose en tareas atómicas (20-30 min)
    ├── quality/                       # Calidad de código y auditoría
    │   ├── code-review-and-quality/   # Revisión multidimensional de código
    │   ├── code-simplification/       # Refactorización y reducción de complejidad
    │   ├── debugging-and-error-recovery/ # Depuración sistemática de causa raíz
    │   └── deprecation-and-migration/ # Deprecación segura y migraciones
    ├── architecture/                  # Diseño y arquitectura de software
    │   ├── api-and-interface-design/  # Contratos e interfaces estables
    │   ├── documentation-and-adrs/    # Registro de decisiones de arquitectura
    │   ├── observability-and-instrumentation/ # Logs estructurados y métricas
    │   ├── performance-optimization/  # Rendimiento y optimización de consultas
    │   ├── incremental-implementation/# Entrega en rebanadas verticales delgadas
    │   └── context-engineering/       # Optimización de carga de contexto
    ├── delivery/                      # Entrega, DevOps y seguridad
    │   ├── git-pr-workflow/           # Flujo Git, ramas temáticas, gates y PRs
    │   ├── devsecops/                 # Cero credenciales en código y auditoría
    │   ├── docker-hardening/          # Buenas prácticas de Docker y multi-stage
    │   ├── ci-cd-and-automation/      # Pipelines de CI/CD y compuertas de calidad
    │   └── shipping-and-launch/       # Listas de verificación y planes de rollback
    └── frontend/                      # Especialización de interfaz de usuario
        ├── frontend-ui-engineering/   # Ingeniería de interfaces y accesibilidad
        ├── browser-testing-with-devtools/ # Pruebas visuales y de consola en navegador
        └── ui-ux-pro-max/             # Catálogo de diseño, paletas y directrices UX
```

---

## 3. Resoluciones de Diseño y Reglas Innegociables

### A. Guardrails y Permisos de los Subagentes
- **`implementer.md` (Acceso total a consola y código con bloqueo estricto de spec y memoria)**:
  - Dispone de **acceso completo a consola (`shell: * allow`)** para ejecutar compiladores, tests, linters, migraciones y gestores de paquetes.
  - Bloqueo explícito en OpenCode YAML tanto sobre la spec como sobre `MEMORY.md`:
    ```yaml
    permissions:
      - action: edit
        resource: "*"
        effect: allow
      - action: edit
        resource: "specs/**/spec.md"
        effect: deny
      - action: edit
        resource: "specs/**/plan.md"
        effect: deny
      - action: edit
        resource: "docs/constitution.md"
        effect: deny
      - action: edit
        resource: "MEMORY.md"
        effect: deny
      - action: edit
        resource: ".agent/**"
        effect: deny
      - action: edit
        resource: ".opencode/**"
        effect: deny
      - action: shell
        resource: "*"
        effect: allow
      - action: webfetch
        resource: "*"
        effect: deny
      - action: subagent
        resource: "*"
        effect: deny
    ```
  - *Evaluación Secuencial de Permisos en OpenCode:* Las reglas se evalúan secuencialmente donde las reglas posteriores prevalecen. Al colocar la regla general `edit: * allow` primero y las denegaciones específicas después (`specs/**/spec.md`, `specs/**/plan.md`, `docs/constitution.md`, `MEMORY.md`, `.agent/**` y `.opencode/**`), se garantiza técnicamente que el comodín general no sobreescriba los bloqueos de gobernanza ni altere los arneses del sistema. Adicionalmente, el contrato de comportamiento en Markdown refuerza este límite como guardarraíl dual.
  - *Delimitación de `webfetch: * deny`:* Bloquea la navegación externa del LLM sin interferir con la consola (`shell: * allow`), permitiendo interactuar con `localhost` o registries de dependencias.
  - *Alcance de edición y Tooling Raíz:* Se limita exclusivamente a implementar el código de la tarea asignada y marcarla en `specs/**/tasks.md`. Tiene terminantemente prohibido alterar archivos de gobernanza (`constitution.md`, `spec.md`, `plan.md`, `MEMORY.md`) o componentes del arnés (`.agent/**`, `.opencode/**`). Modificaciones a archivos de tooling o configuración en la raíz (`package.json`, `tsconfig.json`, `Dockerfile`, `.gitignore`) **solo están permitidas si la tarea activa o el plan técnico lo declaran de forma explícita** (ej. *'T1: Instalar dependencia X y configurar tsconfig'*).
  - *Protocolo ante Bloqueo Técnico en Implementación:* Si durante una tarea el `@implementer` detecta un bloqueo técnico insalvable (incompatibilidad de dependencias, contradicción en el plan técnico o lógica imposible), se detiene de inmediato y emite un informe estructurado (`BLOQUEO TÉCNICO: <motivo>`). El `@coordinator` presenta la alerta al usuario con dos opciones: (1) ajustar o resolver manualmente, o (2) invocar a `@planner` para reformular el plan técnico de esa tarea específica mediante `/sdd-change`. El agente tiene terminantemente prohibido improvisar soluciones o cambiar la arquitectura sin autorización humana explícita.
- **`planner.md` (Edición exclusiva de specs y memoria con herramientas de lectura)**:
  - En OpenCode se define `edit: * deny`, `edit: specs/** allow`, `edit: MEMORY.md allow` y `shell: * deny` (principio de mínimos privilegios estricto, idéntico a los apuntes oficiales del curso).
  - Consulta el repositorio mediante herramientas nativas de lectura del entorno (`read_file`, inspección de símbolos, búsqueda de archivos). Tiene terminantemente prohibido modificar código fuera de `specs/` y `MEMORY.md`.
- **`reviewer.md` (Doble Modo Estricto y Solo Lectura de Archivos)**:
  - En OpenCode se define `edit: * deny` y `shell: * allow`, con restricción contractual: **solo ejecuta comandos de solo lectura** (`git diff`, `git status`, linters y `TEST_COMMAND`).
  - **Mecanismo de Cambio de Modo y Formato de Veredictos**: El coordinador inyecta obligatoriamente el modo en el mensaje:
    - `[MODO: CLARIFICACION_SPEC]`: Revisa la spec como QA funcional (ambigüedades, contradicciones, casos límite y constitución).
      - Si detecta problemas: Encabeza obligatoriamente con `VEREDICTO: CAMBIOS NECESARIOS` seguido de la lista numerada clasificada en (1) ambigüedades, (2) contradicciones, (3) casos límite no cubiertos, (4) conflictos con constitution.md (solo detecta, sin soluciones).
      - **Resolución de Hallazgos en Clarificación (Bucle Acotado a 2 Rondas)**: Ante `VEREDICTO: CAMBIOS NECESARIOS`, el coordinador procesa los hallazgos:
        1. Las ambigüedades de sintaxis, formato EARS o inconsistencias textuales evidentes son corregidas directamente por `@planner`.
        2. Los vacíos de requerimientos de negocio, casos límite no definidos o conflictos con `constitution.md` se presentan al usuario en una entrevista directa (máximo 5 preguntas concretas, con opciones recomendadas A/B).
        3. Con las respuestas del usuario, `@planner` actualiza `spec.md` y solicita una nueva revisión a `@reviewer`.
        4. El bucle admite un máximo de 2 rondas de clarificación; si tras la segunda pasada persiste el veredicto de cambios necesarios, el coordinador se detiene y solicita alineación humana para desbloquear la spec.
      - Si la spec cumple el 100% del checklist sin hallazgos: Emite `VEREDICTO: APROBADO`, habilitando al coordinador a solicitar aprobación humana.
    - `[MODO: VALIDACION_IMPLEMENTACION]`: Valida el código implementado RF por RF contra tests, DevTools y `git diff`.
      - Emite `VEREDICTO: APROBADO` o `VEREDICTO: CAMBIOS NECESARIOS` con lista numerada `archivo:línea`, qué incumple y qué se espera.
- **`coordinator.md` (Lectura Nativa, Orquestación de Subagentes y Cierre)**:
  - Dispone de herramientas nativas de lectura de archivos (`read_file`) sin requerir shell ni edición (`edit: * deny`, `shell: * deny`).
  - **Delegación de Operaciones Git a Workflows Ejecutables**: El coordinador mantiene `shell: * deny` estricto (fiel al diseño del arnés en OpenCode). Las operaciones de consola Git a nivel de feature (comprobación de árbol limpio `git status`, ramificación temprana `git checkout -b <tipo>/<NNN-nombre>` en modo `branch_pr` al iniciar el requerimiento, abortar rebases residuales `git rebase --abort`, sincronización y limpieza post-merge) son ejecutadas exclusivamente por los workflows ejecutables / custom commands (`/sdd-spec` que inicializa la rama temática aislando spec, plan y código en `branch_pr` o permanece en `main` en modo `trunk`, y `/review-and-pr` que gestiona sincronización, PR y limpieza tras autorización del usuario). El coordinador únicamente orienta la secuencia e indica al usuario/agente principal cuándo invocar cada comando.
  - **Fase 7 (Cierre y Validación Humana)**: Tras el `VEREDICTO: APROBADO` final emitido por `@reviewer`, el coordinador presenta el balance al usuario y solicita confirmación previa al PR. Si el usuario aprueba, el coordinador invoca a `@planner` para que actualice `specs/NNN-nombre/spec.md` a `Estado: completada` y registre el resumen en `MEMORY.md`.
  - **Protocolo ante Rechazo Humano tras Aprobación Técnica de QA**: Si el usuario no confirma la entrega a pesar del `VEREDICTO: APROBADO` de QA:
    - *Por Desajuste Menor de Implementación*: Si el usuario señala una observación técnica o de UI dentro de los criterios ya contemplados en la spec, el coordinador reasigna a `@implementer` con el feedback puntual bajo disciplina TDD, tras lo cual `@reviewer` re-valida los cambios.
    - *Por Nuevos Requerimientos o Modificación de Alcance*: Si las observaciones implican funcionalidades o reglas no redactadas en la spec original, el coordinador detiene la validación e invoca `/sdd-change` para que `@planner` actualice `spec.md`, presente el diff y re-planifique las tareas pertinentes.
- **Deslinde de Secuencialidad de Código vs Paralelismo en Revisión**:
  - **Implementación de Código (Secuencial Estricto)**: Dentro de una misma spec, las tareas de código se ejecutan estrictamente de forma secuencial (`T1 -> T2 -> ... -> Tn`). Cada tarea compila, escribe tests en rojo, implementa código en verde y realiza su commit atómico. Esto evita condiciones de carrera, colisiones en ramas compartidas y estados rotos en disco.
  - **Paralelismo Multiagente (Revisión y Specs Independientes)**: El paralelismo se reserva para: (1) Lanzar múltiples `@reviewer` en paralelo sobre una misma spec con diferentes enfoques (ej. un revisor de tests, un revisor de UI con Chrome DevTools y un revisor de seguridad/constitución, consolidando sus hallazgos en un informe único), o (2) Despachar specs independientes en ramas y procesos de trabajo separados.
- **Deslinde de Roles en Bootstrap y Gobernanza**:
  - `coordinator.md` se reserva exclusivamente para orquestar el ciclo SDD de features.
  - Los workflows fundacionales `workflows/init.md` (bootstrap del repositorio) y `workflows/sdd-constitution.md` (creación y auditoría de `docs/constitution.md`) son ejecutados directamente por el **agente principal / root**, ya que la constitución define el contrato de gobernanza rector de todo el software y no debe ser manipulada por subagentes aislados de features.
- **Aislamiento de Comunicación vs Lectura de Archivos**:
  - Los subagentes (`planner`, `implementer`, `reviewer`) **NO se comunican entre sí** ni comparten historial de conversación.
  - El **Coordinador actúa como mensajero y orquestador exclusivo**, inyectando en cada fase los objetivos, decisiones del usuario y resultados previos.
  - Cada subagente tiene **permiso de lectura directo en el espacio de trabajo** para consultar `constitution.md`, `AGENTS.md`, `MEMORY.md` y código fuente.
- **Estándar Universal de Encuestas y Preguntas al Usuario (Tarjetas con Opción Libre)**:
  - Para eliminar la fricción de preguntas abiertas o textos densos que sobrecargan al usuario, toda encuesta, entrevista técnica (`/init`), clarificación de spec (`/sdd-clarify`) o captura de requerimientos (`/sdd-spec`, `interview-me`) debe estructurarse como **tarjetas de selección**:
    1. Si el entorno admite herramientas interactivas nativas (ej. `ask_question`), se invoca obligatoriamente proporcionando opciones sin numerar, la recomendación de primero con `(Recommended)` y aprovechando la opción nativa "Other" para respuesta libre.
    2. Si el entorno opera exclusivamente en chat / Markdown plano, se renderizan tarjetas visuales `[A] (Recomendada)`, `[B]`, etc., y la opción obligatoria `[O] Escribir otra respuesta` para entrada libre.
    3. Queda prohibido formular preguntas abiertas difusas o listados densos sin opciones predefinidas.
- **Framework de Entrevista Exhaustiva de Arquitectura e Ingeniería (Día 0 / Greenfield)**:
  - Al iniciar un proyecto desde cero, queda prohibido conformarse con preguntas superficiales de alto nivel. El agente recorre obligatoriamente los **8 Ejes Técnicos** para definir la primera versión con nivel de producción y cero cabos sueltos:
    1. *Dominio y Roles*: Problema central, métricas de éxito, roles RBAC y superficie de consumo (API REST + SPA, SSR, CLI, headless).
    2. *Stack y Runtimes*: Lenguaje, runtime (Node/TS estricto, Python/FastAPI, Rust/Axum, Go), estándares de compilación y framework frontend si aplica (Vue 3, React, Next.js).
    3. *Arquitectura y Modularidad*: Monolito modular por dominio (`src/modules/<dominio>/` en vertical slices), validación estricta de contratos en runtime (Zod / Pydantic v2 en body/query/params) y manejo centralizado de excepciones (`AppError` + middleware global).
    4. *Persistencia y Migraciones*: Motor (PostgreSQL 16+ relacional ACID, SQLite, etc.), ORM declarativo con migraciones versionadas (Prisma, Drizzle, SQLAlchemy) y transacciones atómicas para mutaciones complejas.
    5. *Seguridad y DevSecOps*: Autenticación (JWT con rotación o sesiones seguras), RBAC declarativo, blindaje estricto de credenciales (cero fallbacks en código) y variables requeridas desde `.env`.
    6. *Testing y Calidad (TDD)*: Runner determinista de terminación única (Vitest, Pytest, Cargo test), suite aislada en localhost blindada contra producción, y comandos `TEST_COMMAND`, `TYPECHECK_COMMAND`, `LINT_COMMAND`.
    7. *Empaquetado e Infraestructura*: Docker multi-stage build optimizado en Alpine con BuildKit, usuario no-root y observabilidad con logs JSON.
    8. *Gobernanza Git*: Modo `branch_pr` con ramas dedicadas y PRs obligatorios validados por CI, y confirmación humana requerida para apertura/merge/borrado de ramas.

### B. Mapeo para los 4 Agentes Principales y Motor de Auto-Adopción
- **Entornos Multiagente Nativos vs Monohilo (Diferenciación de Despacho)**:
  - **En plataformas con soporte multiagente en hilos/sesiones separadas (OpenCode, Antigravity)**:
    - El agente principal opera como orquestador nativo despachando y delegando tareas a subagentes reales que corren en sus propios hilos aislados (`@planner`, `@implementer`, `@reviewer`) definidos en `.agent/agents/` (o `.opencode/agents/`).
    - El coordinador no necesita emular identidades en el chat principal; delega la tarea con el contexto necesario, espera la respuesta del subagente y retoma el control.
  - **En herramientas y terminales monohilo sin soporte de subagentes en hilos aislados (Claude Code, Cursor, Codex, Windsurf, Aider)**:
    - Dado que el entorno no puede abrir sesiones separadas, el agente único **asume internamente el rol de Coordinador** en ese único hilo de conversación.
    - Orquesta el flujo ejecutando secuencialmente cada fase y **anuncia de forma explícita cada transición de rol en el chat** (ej. `[CAMBIO DE ROL: @planner]`, `[CAMBIO DE ROL: @implementer]`, `[CAMBIO DE ROL: @reviewer]`) para delimitar estrictamente el contexto y las responsabilidades activas.
    - **Desacoplamiento de Contexto en Disco**: En herramientas monohilo, el avance del flujo no depende del historial acumulado en la conversación sino de los archivos vivos en disco (`specs/NNN/spec.md`, `plan.md`, `tasks.md`). Cada invocación de tarea (`/sdd-implement T1`) es atómica; si la conversación se extiende, el agente o el usuario pueden compactar (`/compact`) o reanudar en una nueva sesión apuntando a `tasks.md` sin perder el progreso ni violar el plan.
- **Arquitectura de Adaptadores No Destructivos**:
  - La fuente de la verdad (`AGENTS.md`, `MEMORY.md`, `docs/constitution.md`, `specs/`, `.agent/skills/`, `.agent/workflows/`) permanece inmutable y compartida.
  - El workflow `workflows/adopt.md` y el prompt universal del `README.md` permiten que cualquier agente auto-configure su entorno nativo:
    1. **OpenCode**: Genera `.opencode/agents/` y `.opencode/commands/` mediante **copia física de archivos (o generación directa desde plantillas)** a partir de `.agent/agents/` y `.agent/workflows/`, evitando enlaces simbólicos (*symlinks*) que fallan en Windows sin privilegios elevados. Asimismo, configura `opencode.json` a partir de `templates/adapters/opencode.json.template`.
    2. **Antigravity**: Configura `AGENTS.md` en raíz con registro de skills en `.agent/skills/` y reglas correspondientes.
    3. **Claude Code**: Genera `CLAUDE.md` en la raíz con el mapeo de directivas y protocolo de cambio de rol para su arquitectura monohilo, y adicionalmente genera los comandos personalizados en `.claude/commands/sdd-*.md` a partir de `.agent/workflows/`, permitiendo autocompletado y ejecución nativa de comandos slash (`/sdd-spec`, `/sdd-implement`, etc.) en el CLI.
    4. **Codex**: Genera `CODEX.md` en la raíz referenciando las convenciones del repositorio.
    5. **Cualquier otro Agente (Cursor, Windsurf, Aider)**: Genera su archivo de reglas respectivo (ej. `.cursor/rules/agent-core.mdc`) a partir de `templates/adapters/generic-agent.md.template`.

- **Especificación del Prompt Universal de Adopción (README.md)**:
  El `README.md` incluirá el siguiente bloque canónico para copiar y pegar en cualquier agente:

  ```markdown
  Eres el AGENTE PRINCIPAL operando en este repositorio.
  Tu objetivo es activar el flujo de ingeniería de software SDD + TDD de agent-core.

  Sigue ESTRICTAMENTE este protocolo en orden:

  0. DETECCIÓN Y REORGANIZACIÓN QUIRÚRGICA DE ÁRBOL EXPUESTO (Cero Basura en Raíz):
     - Verifica si las carpetas del arnés (`agents/`, `workflows/`, `skills/`, `templates/`, `mcp/`) se encuentran expuestas directamente en la raíz del proyecto (típico cuando este repositorio fue clonado directamente para iniciar el proyecto):
       * SI ESTÁN EXPUESTAS EN LA RAÍZ:
         1. Crea el directorio canónico `.agent/` si no existe.
         2. Mueve quirúrgicamente las carpetas del arnés a `.agent/`:
            - `agents/` -> `.agent/agents/`
            - `workflows/` -> `.agent/workflows/`
            - `skills/` -> `.agent/skills/`
            - `templates/` -> `.agent/templates/`
            - `mcp/` -> `.agent/mcp/`
         3. Reubica la documentación del arnés para no contaminar la raíz:
            - Si existe `README.md` y pertenece al arnés (contiene `# agent-core`), muévelo a `.agent/README.md` y genera en la raíz un `README.md` limpio e inicial para el nuevo proyecto.
            - Si existe `plan.md` en la raíz (plan de construcción de agent-core), muévelo a `.agent/docs/history/agent-core-plan.md` para evitar colisiones con los planes del proyecto (`specs/NNN-.../plan.md`).
       * SI YA ESTÁN EN `.agent/`:
         - No muevas nada; la estructura ya está canónicamente aislada.

  1. EVALÚA EL ESTADO DEL REPOSITORIO (Día 0 vs Día N):
     - Revisa si existen en la raíz o en docs/ los siguientes archivos: `AGENTS.md`, `MEMORY.md`, `docs/constitution.md`.
     - CASO A: REPOSITORIO NUEVO (DÍA 0 - No existen `AGENTS.md` ni `constitution.md`):
       - Tu primera tarea es ejecutar el proceso de inicialización (Bootstrap).
       - Consulta la plantilla y guía en `.agent/workflows/init.md` (o `workflows/init.md` si estás dentro de agent-core).
       - Conduce la entrevista técnica minuciosa al usuario mediante tarjetas de selección interactiva (Framework de los 8 Ejes: Dominio/Roles, Stack/Runtimes, Arquitectura/Modularidad, Base de Datos/Persistencia, Seguridad/DevSecOps, Testing/TDD, Docker/Infraestructura y Gobernanza Git), presentando opciones fundamentadas objetivamente con la recomendada de primero y opción abierta para redactar otra respuesta libre.
       - Genera los archivos fundacionales del repositorio:
         * `AGENTS.md` (resumen conciso de stack, comandos y límites innegociables).
         * `docs/constitution.md` (máximo 6 principios rectores de arquitectura).
         * `MEMORY.md` (estado inicial del proyecto).
         * `.env.example` (plantilla con variables requeridas documentadas sin credenciales reales).
       - Una vez creados y validados con el usuario, procede al Paso 2.
     - CASO B: REPOSITORIO EXISTENTE COMPLETO (DÍA N - Ya existen `AGENTS.md`, `MEMORY.md` y `docs/constitution.md`):
       - Lee `AGENTS.md` para conocer el stack, los comandos exactos y los límites innegociables.
       - Lee `docs/constitution.md` para asimilar los principios innegociables de arquitectura.
       - Lee `MEMORY.md` para conocer el estado actual y decisiones tomadas.
       - NO modifiques ni muevas la estructura de código preexistente del proyecto.
       - Procede al Paso 2.
     - CASO C: REPOSITORIO EN ESTADO PARCIAL (Existe algún archivo base pero faltan otros):
       - Identifica cuáles archivos faltan (`AGENTS.md`, `docs/constitution.md` o `MEMORY.md`).
       - Genera exclusivamente los archivos faltantes a partir de las plantillas en `.agent/templates/` respetando los archivos ya existentes sin sobrescribirlos.
       - Procede al Paso 2.

  2. GENERA TU ADAPTADOR NATIVO (Sin mover la fuente canónica de la verdad):
     - Identifica qué tipo de agente eres (Claude Code, Cursor, OpenCode, Codex, Antigravity, etc.).
     - Si no tienes configurado tu archivo nativo de instrucciones, genéralo a partir de las plantillas en `.agent/templates/adapters/` (o `.agent/workflows/adopt.md`):
       * Si eres Claude Code: crea/actualiza `CLAUDE.md`.
       * Si eres Codex: crea/actualiza `CODEX.md`.
       * Si eres OpenCode: verifica `.opencode/agents/` y `.opencode/commands/`.
       * Si eres Cursor / otro: crea la regla nativa correspondiente (ej. `.cursor/rules/agent-core.mdc`).
     - Asegura que tu adaptador apunte a las skills en `.agent/skills/` y comandos en `.agent/workflows/`.

  3. MODO DE ORQUESTACIÓN Y EJECUCIÓN:
     - Revisa tus capacidades de ejecución:
       * SI TU ENTORNO ADMITE SUBAGENTES EN HILOS/SESIONES AISLADAS (ej. OpenCode, Antigravity):
         Opera como Coordinador despachando tareas a los subagentes especializados (`@planner`, `@implementer`, `@reviewer`) ubicados en `.agent/agents/`.
       * SI TU ENTORNO ES MONOHILO / SIN SOPORTE DE HILOS SEPARADOS (ej. Claude Code, Cursor, Codex, Windsurf):
         Asume tú mismo el rol de Coordinador en este hilo de conversación y ejecuta el flujo secuencialmente adoptando cada rol según la fase activa, anunciándolo explícitamente en el chat:
         - `[CAMBIO DE ROL: @planner]` para redactar y refinar specs, planes y tareas.
         - `[CAMBIO DE ROL: @implementer]` para escribir tests en rojo, código y ponerlos en verde.
         - `[CAMBIO DE ROL: @reviewer]` para QA funcional de specs y validación RF por RF con tests.

  4. CONFIRMACIÓN FINAL:
     - Confirma al usuario en una sola línea que el entorno está listo, indicando el agente detectado, el modo de ejecución (multiagente nativo o monohilo coordinado) y ofreciendo iniciar con `/sdd-spec` o el siguiente requerimiento.
  ```

### C. Protocolo de Testing en Proyectos sin Suite Preexistente, Pre-Condiciones y DevSecOps
1. **Comprobación de Línea Base (*Baseline Check*) y Variables de Entorno de Test**:
   - Antes de implementar una tarea, `@implementer` corre el comando de prueba base.
   - **Requisito Obligatorio de Terminación Única en `TEST_COMMAND`**: El comando de pruebas configurado en `AGENTS.md` debe ser estrictamente de ejecución única, no interactivo y con terminación determinista (ej. `vitest run`, `pytest`, `cargo test`, `npm test -- --watchAll=false`). Quedan prohibidos modos interactivos o de observación continua (*watch mode*) que suspendan la consola del subagente indefinidamente. El workflow `workflows/init.md` audita y añade automáticamente los flags de ejecución única durante la configuración inicial.
   - **Comandos de Prueba en Proyectos Políglotas o Heterogéneos**: En repositorios con múltiples tecnologías (ej. backend en Python y frontend en Vue sin ser monorrepo formal), `AGENTS.md` define en `TEST_COMMAND` la ejecución global unificada o encadenada (`pytest && npm test`), y permite documentar opcionalmente variables de ámbito (`BACKEND_TEST_COMMAND`, `FRONTEND_TEST_COMMAND`). Durante `/sdd-implement`, el implementador corre la suite acotada al componente tocado por la tarea para agilizar el ciclo TDD, reservando el `TEST_COMMAND` global para la validación integral de `@reviewer` en `/sdd-validate`.
   - Si la suite requiere variables de entorno locales, el proyecto debe contar con un `.env.test` seguro (apuntando a bases de datos o mocks locales en `localhost`, nunca credenciales reales de producción).
   - **Regla estricta**: Si los tests ya están fallando antes de tocar código (*failing baseline*), el implementador **DEBE DETENERSE** y notificar al coordinador/usuario. Está prohibido construir código sobre una suite rota.
2. **Paso prioritario**: Ante un proyecto sin tests, `@planner` formula en el plan la tarea `T1: Configurar runner de pruebas básico (ej. vitest, jest, pytest)`.
   - **Exención de Línea Base en Tareas de Inicialización de Runner (Día 0 / Greenfield)**: Si el proyecto carece de suite previa y la tarea activa está explícitamente formulada como configuración del runner (ej. *'T1: Configurar runner de pruebas'*), la comprobación previa de línea base se exime de forma natural para esa tarea inicial. Al concluir la implementación de T1, `@implementer` verifica obligatoriamente que el runner recién configurado ejecute con éxito una prueba de sanidad mínima antes de marcar la tarea como completada.
3. **Alternativa con scripts temporales (si el usuario rechaza instalar runner)**:
   - Si el usuario declina configurar un runner formal, el implementador validará la funcionalidad mediante scripts temporales de prueba.
   - **Ubicación Canónica y Aislamiento en `.agent/scratch/`**: Los scripts temporales de prueba se generan obligatoriamente dentro del directorio transitorio `.agent/scratch/` (ignorado en `.gitignore`), impidiendo la dispersión de archivos en la raíz o carpetas de código fuente del proyecto y evitando su inclusión accidental en el control de versiones.
   - **Protocolo de doble confirmación**:
     - Solicita autorización explícita al usuario **antes de crear el script de prueba temporal**.
     - Tras completar la verificación y validar la tarea, solicita autorización explícita **antes de eliminar o archivar dicho script**.
4. **Exención para tareas no ejecutables y proyectos sin frontend**:
   - Si la tarea consiste exclusivamente en modificar archivos estáticos o no ejecutables (documentación en Markdown, imágenes/assets SVG o estilos CSS puros sin lógica), no se requiere crear scripts de prueba. La verificación se realiza mediante inspección de diff o validación visual con Chrome DevTools.
   - **Proyectos sin Interfaz Visual o Entornos Headless (APIs puras, CLI, librerías, servidores/Docker sin GUI)**: La validación mediante Chrome DevTools MCP solo se activa si la spec impacta componentes UI Y la variable `DEV_SERVER_URL` está configurada con una URL válida en `AGENTS.md`. Si el proyecto es puramente backend, CLI o carece de interfaz gráfica, el `@reviewer` omite automáticamente las pruebas de navegador y valida el 100% de los requerimientos mediante la suite automatizada (`TEST_COMMAND`), linters y diff de git.
5. **Configuración de Chrome DevTools MCP**:
   - La URL base se lee de la variable `DEV_SERVER_URL` definida en `AGENTS.md` (ej. `http://localhost:5173` o `http://localhost:3000`).
   - **Comprobación Pasiva de Servidor Activo (Cero Procesos Demonio en Subagentes)**: Al iniciar la validación visual, `@reviewer` comprueba si `DEV_SERVER_URL` está respondiendo. Si no está activo, el subagente se detiene y solicita al usuario iniciarlo en su consola (`START_DEV_COMMAND`) antes de continuar con la inspección en Chrome DevTools. Esto mantiene a `@reviewer` 100% fiel a su restricción de comandos de solo lectura e impide la acumulación de procesos demonio huérfanos o puertos bloqueados (`EADDRINUSE`) en el sistema operativo.
6. **Inyección Segura de Credenciales para MCPs (Cero Secretos en Repositorio)**:
   - Ningún adaptador ni archivo de configuración (`opencode.json`, plantillas, etc.) debe contener tokens ni secretos hardcodeados.
   - Las plantillas y documentación de MCPs emplean exclusivamente referencias dinámicas a variables de entorno (ej. `{env:GITHUB_PERSONAL_ACCESS_TOKEN}`).
   - En local, los tokens se configuran en el entorno del sistema operativo o en un archivo `.env` que debe estar estrictamente ignorado en `.gitignore`.

### D. Límite de 10 Tareas, Descomposición en Fases y Centralización de Specs
- **Criterio de Numeración de Specs (Secuencial con Override Manual)**:
  - El comando `/sdd-spec` escanea el directorio `specs/` en la rama actual y asigna por defecto el identificador incremental `max(NNN) + 1` (ej. si existen `001-auth` y `002-dashboard`, sugiere automáticamente `003-<nombre>`).
  - Si el usuario o equipo requiere forzar un número específico (para sincronizar con un issue de GitHub, ticket de Jira o rama paralela), `/sdd-spec` admite el argumento explícito (ej. `/sdd-spec 005-nueva-feature`), sobreescribiendo la asignación secuencial automática sin conflictos.
  - **Resolución Automática de Colisiones Numéricas en Pre-PR**: Si dos o más ramas temáticas concurrentes asignaron el mismo número correlativo `max(NNN) + 1` desde una rama base común, durante la fase de sincronización pre-PR en `/review-and-pr`, el sistema detecta si la carpeta `specs/NNN-*` ya fue creada e integrada en la rama base por otro PR previo. En tal caso, `@planner` renombra automáticamente la carpeta local `specs/NNN-*` y actualiza las referencias del identificador en `spec.md`, `plan.md` y `tasks.md` al siguiente correlativo disponible (`max(NNN) + 1`). Asimismo, en modo `branch_pr`, `/review-and-pr` renombra concurrentemente la rama local de Git (`git branch -m <tipo>/<NNN_nuevo>-<nombre>`) antes de realizar el push o abrir el PR, garantizando trazabilidad y alineación 1:1 entre el nombre de la rama, el Pull Request y la carpeta de la spec.
- **Centralización Innegociable de Specs en Raíz (`specs/`)**:
  - Incluso en monorrepositorios con múltiples aplicaciones o librerías (`packages/*`, `libs/*`), las especificaciones residen **siempre y exclusivamente centralizadas en la carpeta raíz `specs/NNN-nombre/`**. Esto evita la fragmentación del contexto, previene desincronizaciones entre paquetes y garantiza un único registro histórico cronológico de todas las features del software.
- **Para mantener tareas atómicas (~20-30 min) y evitar specs monolíticas**:
  - Si un requerimiento técnico exige más de 10 tareas atómicas, `@planner` divide el trabajo en **specs secuenciales por fases** (ej. `specs/001-feature-backend/` y `specs/002-feature-frontend/`).
  - **Secuencialidad Estricta sobre Rama Base**: La spec de la fase 2 (`specs/002-...`) se inicia **únicamente después de que la spec de la fase 1 (`specs/001-...`) ha sido implementada, validada por QA y fusionada en la rama base remota (`develop` o `main`) mediante su propio PR**. La fase 2 se ramifica siempre desde la rama base ya actualizada.
- **Concurrencia de Especificaciones Independientes**:
  - Se permite el desarrollo concurrente de requerimientos completamente independientes entre sí, siempre que cada uno se ejecute en su propia rama temática (`feature/001-login`, `feature/002-notificaciones`).
  - La regla de secuencialidad estricta rige **exclusivamente para fases dependientes de un mismo requerimiento** (ej. Fase 1 backend → Fase 2 frontend) o cuando el proyecto opera en modo `trunk` (desarrollo lineal sobre `main`).

### E. Distribución Canónica en `.agent/`, Bootstrap y Plantillas de Entorno
- En proyectos destino, todos los artefactos de orquestación residen canónicamente en `.agent/`:
  - `.agent/skills/` (batería de skills metodológicas).
  - `.agent/agents/` (los 4 subagentes en formato portable).
  - `.agent/workflows/` (workflows ejecutables / custom commands).
  - `.agent/templates/` (plantillas de configuración, agentes y adaptadores).
  - `.agent/mcp/` (catálogo y schemas de servidores MCP recomendados).
  - `.agent/README.md` (documentación offline de referencia del arnés).
- **Protocolo de Reorganización Quirúrgica y Cero Basura en Raíz (Detección de Árbol Expuesto)**:
  - Cuando un desarrollador clona directamente `agent-core` para iniciar un nuevo proyecto (o bifurca el repositorio base), los directorios del arnés (`agents/`, `workflows/`, `skills/`, `templates/`, `mcp/`) se encuentran inicialmente expuestos en la raíz.
  - En lugar de exigir borrados manuales al usuario o generar basura en el repositorio destino, el sistema aplica reorganización automática y quirúrgica al primer contacto (`/init`, `/adopt` o prompt universal):
    1. Si detecta las carpetas del arnés en la raíz, crea `.agent/` si no existe y traslada de inmediato:
       - `agents/` -> `.agent/agents/`
       - `workflows/` -> `.agent/workflows/`
       - `skills/` -> `.agent/skills/`
       - `templates/` -> `.agent/templates/`
       - `mcp/` -> `.agent/mcp/`
    2. Reubica la documentación del arnés fuera de la raíz:
       - Si `README.md` corresponde a `agent-core` (contiene `# agent-core`), lo mueve a `.agent/README.md` (preservando el manual de consulta offline) y crea un nuevo `README.md` limpio para el proyecto del usuario.
       - Si existe `plan.md` en la raíz (plan de construcción de agent-core), lo mueve a `.agent/docs/history/agent-core-plan.md` para evitar colisiones con los planes del proyecto (`specs/NNN-.../plan.md`).
    3. Garantiza que la raíz quede 100% limpia y reservada exclusivamente para los artefactos de software del usuario (`src/`, `AGENTS.md`, `MEMORY.md`, `docs/constitution.md`, `.env.example`, etc.).
- **Auditoría y Soporte Greenfield en `init.md` (Git y Entorno)**:
  - **Comprobación de Repositorio Git**: Si `init.md` detecta que el directorio no cuenta con control de versiones (`.git` no existe), solicita confirmación al usuario para inicializarlo de inmediato (`git init && git checkout -b main`) y generar el commit inicial, garantizando que las compuertas de commit y baseline de TDD funcionen correctamente.
  - **Generación de `.env.example`**: Si el proyecto requiere variables de entorno y carece de `.env.example`, `init.md` genera automáticamente una plantilla documentada con valores de ejemplo (sin secretos reales).
- `workflows/init.md` opera bajo la política **Local-First (Offline)**:
  - Admite el parámetro opcional `--source <ruta>`. Si no se especifica y no existe la ruta por defecto `~/.agent-core`, consulta interactivamente al usuario si cuenta con el repositorio clonado en otra ruta local (ej. `C:/Users/edier/Documents/EDIER/agent-core`) antes de intentar `git clone` desde GitHub, garantizando operatividad 100% offline.
  - Si detecta la ruta local, copia directamente plantillas y skills para máxima velocidad y trabajo offline.
  - Si no existe copia local en un equipo nuevo con internet, ofrece clonarlo desde GitHub (`git clone <repo> ~/.agent-core`).
- **Política de Actualización No Destructiva (`init.md --update`)**:
  - Al ejecutar `init.md --update` para sincronizar con mejoras del repositorio `agent-core`:
    1. Compara las skills, subagentes y workflows locales de `.agent/` contra las plantillas actualizadas.
    2. Si detecta personalizaciones o modificaciones locales en algún archivo, genera un respaldo preventivo en `.agent/backup-<timestamp>/` y solicita confirmación explícita al usuario antes de sobrescribir el archivo modificado.
    3. **Blindaje de Archivos Fundacionales**: `AGENTS.md`, `MEMORY.md`, `docs/constitution.md` y archivos `.env*` **jamás se sobrescriben** durante el proceso de actualización.
    4. **Sincronización Automática de Adaptadores OpenCode (`.opencode/`)**: Si el proyecto fue adaptado para OpenCode y existe el directorio `.opencode/`, `init.md --update` sincroniza automáticamente las plantillas y workflows actualizados desde `.agent/agents/` y `.agent/workflows/` hacia `.opencode/agents/` y `.opencode/commands/`, aplicando el mismo protocolo de respaldo preventivo si detecta personalizaciones locales.

### F. Jerarquía Condicional, Workspaces y Escalabilidad Dinámica (`AGENTS.md` y `MEMORY.md`)
- **Regla estándar de síntesis**:
  - `AGENTS.md`: Máximo **30-40 líneas**. Contiene Stack, Comandos, Convenciones, Reglas de dominio/trampas, Forma de trabajar, Límites (Siempre / Pregunta antes / Nunca) y Verificación.
  - `MEMORY.md`: Máximo **~50 líneas**. Contiene Estado actual, Decisiones (y por qué), Aprendizajes y errores a evitar, y Próximos pasos.
  - **Política de Poda Activa**: Al actualizar `MEMORY.md`, resumir o eliminar lo que ya no aporte. Si algo se convierte en regla permanente, proponer moverlo a `AGENTS.md`.
- **Criterio de activación jerárquica**: Solo se subdivide si el proyecto es un monorrepositorio grande preexistente o si `AGENTS.md` supera las ~60 líneas por divergencia de reglas entre submódulos.
- **Compuerta de Build en Paquetes Compartidos de Monorrepos**:
  - Si el proyecto define `BUILD_COMMAND` en `AGENTS.md` y la tarea modifica librerías o paquetes compartidos (`packages/*`, `libs/*`), `@implementer` ejecuta `BUILD_COMMAND` antes de ejecutar las pruebas de los servicios consumidores.
- **Comando Estandarizado de Workspaces (`PKG_ADD_COMMAND`)**:
  - En proyectos monorrepo que utilicen workspaces (pnpm, yarn, npm, cargo), `AGENTS.md` incluye explícitamente `PKG_ADD_COMMAND` (ej. `pnpm add <pkg> --filter <modulo>` o `npm install <pkg> -w <modulo>`), prohibiendo comandos directos en subcarpetas que corrompan el lockfile raíz.
- **Cadencia y Alcance de Testing en Monorrepositorios (Enfoque Dual)**:
  - En proyectos monorrepo, para evitar iteraciones lentas durante el ciclo TDD, rige una estrategia de pruebas en dos niveles:
    1. **En Implementación de Tarea (`/sdd-implement`)**: `@implementer` ejecuta el comando de pruebas acotado al paquete o submódulo modificado (declarado en la tarea de `tasks.md` o en el `AGENTS.md` del submódulo, ej. `pnpm test --filter <modulo>`), permitiendo ciclos rápidos Red-Green-Refactor.
    2. **En Validación Integral de Spec (`/sdd-validate`)**: `@reviewer` ejecuta la suite de integración global definida en el `AGENTS.md` raíz (`TEST_COMMAND`), garantizando la ausencia de regresiones cruzadas entre paquetes antes de emitir su veredicto.

### G. Coherencia en Commits TDD, Política de Push y Reversión
- **Compuertas de Calidad Pre-Commit (TDD + DevSecOps)**:
  - Mientras `@implementer` trabaja en una tarea, los cambios permanecen uncommitted localmente.
  - Antes de realizar el commit atómico de la tarea:
    1. Los tests deben estar en verde (`TEST_COMMAND`).
    2. Si el proyecto define linter o chequeo de tipos (`LINT_COMMAND`, `TYPECHECK_COMMAND`), deben ejecutarse sobre los archivos modificados en la tarea y pasar sin introducir nuevos errores. Si surgen advertencias o fallos de formato/tipado introducidos por la tarea, el `@implementer` los resuelve de forma autónoma dentro del ciclo 'Refactor' de TDD antes de proceder al commit (solo si un error de tipos evidencia una incompatibilidad estructural insalvable, se detiene y reporta como `BLOQUEO TÉCNICO`).
    3. **Auditoría DevSecOps Híbrida (Tooling + LLM)**:
       - Si el proyecto define `SECURITY_CHECK_COMMAND` en `AGENTS.md` o linters de seguridad (ej. `gitleaks`, `trufflehog`), se ejecutan sobre los archivos de la tarea.
       - Como comprobación base obligatoria, el agente inspecciona el diff en staged buscando credenciales hardcodeadas, claves API, tokens de autenticación o fallbacks en código (`||'postgresql://...'`). Si se detecta cualquier secreto, el commit se **ABORTA** de inmediato.
  - **Delimitación Quirúrgica del Staging (`git add`)**: Antes de crear el commit de la tarea, `@implementer` añade al área de preparación exclusivamente los archivos modificados o creados para la tarea activa (`git add <ruta1> <ruta2>`). Queda estrictamente prohibido el uso indiscriminado de `git add .` o `git add -A`, evitando la inclusión accidental de archivos temporales, logs o cambios residuales ajenos a la tarea.
  - **Formato Convencional Estricto de Commits por Tarea**: Cada commit atómico se redacta obligatoriamente bajo el formato: `<tipo>(<NNN>): <Tn> - <descripción en español>` (ejemplo: `feat(001): T1 - inicializar modelos y tests unitarios`, `test(002): T3 - añadir pruebas de integración`, `fix(001): T4 - corregir validación de esquema`). Tipos admitidos: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`. Esto garantiza trazabilidad directa entre Git, la spec y la tarea.
- **Recuperación tras Interrupción Abrupta de Sesión a Mitad de Tarea**:
  - Si `/sdd-implement` detecta cambios no comiteados residuales en el árbol de trabajo (`git status --porcelain`) al iniciar una tarea, consulta al usuario: *"Se detectaron cambios residuales no comiteados de una sesión previa en esta tarea. ¿Deseas (1) reanudar el trabajo sobre estos archivos existentes, o (2) descartarlos (`git checkout . && git clean -fd`) para reiniciar la tarea desde el último commit limpio?"*.
- **Prohibición de `git push` Intermedio durante Tareas**:
  - Está **prohibido hacer `git push` a la rama remota tras cada tarea individual**. Los commits se acumulan limpiamente en la rama temática local. El push remoto ocurre **exclusivamente cuando la spec completa está implementada y lista para validación/PR**. Esto garantiza que una reversión local nunca corrompa el historial remoto.
- **Cadencia de Validación y Protocolo de Reversión en Fase 5 (2 Vueltas de Corrección)**:
  - **Auto-validación en Tarea (Fase 4)**: Mientras `@implementer` ejecuta cada tarea individual, se auto-valida obligatoriamente con la suite de pruebas (`TEST_COMMAND`); no puede dar una tarea por terminada ni marcarla en `tasks.md` si los tests están en rojo.
  - **QA Integral al Cierre (Fase 5)**: El `@reviewer` interviene formalmente al completar todas las tareas de la spec, validando la implementación completa RF por RF contra tests, DevTools y `git diff`.
  - **Bucle de 2 Vueltas en Fase 5**: Si el `@reviewer` detecta fallos, emite `VEREDICTO: CAMBIOS NECESARIOS` con la lista de discrepancias → Vuelta 1 de corrección con `@implementer` → `@reviewer` re-valida. Si persiste el fallo → Vuelta 2 de corrección con `@implementer` → `@reviewer` re-valida. Si tras la vuelta 2 sigue fallando:
    - El coordinador **NO** borra el código automáticamente; preserva el árbol de trabajo sucio con el diff visible.
    - Se detiene y consulta al usuario: *"¿Deseas intentar un enfoque alternativo, revertir la feature completa al estado inicial limpio de la rama, o ajustar manualmente?"*.
    - Si el usuario opta por revertir:
      1. Limpieza total de árbol de trabajo y reset de commits al estado base original:
         ```bash
         git checkout .
         git clean -fd
         git submodule update --init --recursive 2>/dev/null || true
         # En modo branch_pr con remoto origin:
         git reset --hard origin/<base_branch>
         # En modo branch_pr local-only (sin remoto configurado):
         # git reset --hard <base_branch>
         # En modo trunk: descarta los commits locales volviendo al último commit sincronizado
         # git reset --hard origin/main
         # En modo trunk local-only (sin remoto configurado):
         # git reset --hard <commit_base_inicio_spec>
         ```
      2. **Sincronización de Dependencias**: Si la tarea fallida incluyó la instalación o modificación de paquetes (`package.json`, lockfiles, `requirements.txt`), se ejecuta el comando de restauración del gestor de dependencias (`PKG_RESTORE_COMMAND` o `npm install` / `pip install -r`) para que los directorios ignorados (`node_modules/`, `.venv/`) queden 100% consistentes con el manifiesto limpio restaurado.
      3. **Alerta de Base de Datos**: Si la tarea incluyó migraciones de esquema, el agente emite una alerta destacada solicitando al usuario resetear o revertir su base de datos local según su flujo habitual, evitando ejecutar comandos destructivos automatizados en la base de datos.

### H. Modos de Git (Ramas vs Trunk), Soporte Multiversión y Ramas Protegidas
- **Modos de Flujo Git (`GIT_WORKFLOW_MODE`) en `AGENTS.md`**:
  - `branch_pr` (por defecto): Toda tarea se desarrolla en su rama temática `<tipo>/<NNN-nombre>` y pasa por Pull Request mediador.
  - `trunk`: Para prototipos o proyectos unipersonales directos, las tareas se implementan con TDD y validación RF por RF realizando commits atómicos directos sobre la rama principal (`main`), omitiendo `git checkout -b` y la creación de PRs.
  - **Política de Push en Modo Trunk (Blindaje Local)**: Al igual que en `branch_pr`, está **terminantemente prohibido hacer `git push` tras cada commit de tarea individual**. Los commits atómicos permanecen en el `main` local hasta que la spec completa esté 100% implementada, validada en verde por el `@reviewer` y confirmada por el usuario. En ese momento, y tras autorización explícita, se ejecuta `git push origin main`. Esto garantiza que cualquier fallo persistente o reversión intermedia se ejecute limpiamente en local sin haber ensuciado el historial remoto.
- **Comprobación de Árbol Limpio Pre-Ramificación y Estado Residual de Git**:
  - **Árbol Limpio Pre-Ramificación (`git status --porcelain`)**: Al invocar `/sdd-spec`, el sistema verifica si existen archivos modificados o staged sin commitear en la rama base (`develop` o `main`). Si el árbol está sucio, se **DETIENE** y solicita al usuario commitear, descartar o guardar en stash (`git stash`) antes de crear la rama temática, impidiendo arrastrar cambios no relacionados a la nueva feature.
  - **Procesos Residuales**: Antes de inicializar cualquier rama o tarea, si detecta un proceso colgado (`REBASE-APPLY`, `MERGE_HEAD`), aborta la operación residual (`git rebase --abort` / `git merge --abort`) para partir de un árbol de trabajo 100% limpio.
- **Nomenclatura y Sanitización de Ramas (`<tipo>/<NNN-nombre>`)**:
  - En modo `branch_pr`: `<tipo>/<NNN-nombre>` (ej. `feature/001-login`, `fix/002-jwt-expiry`).
  - **Determinación del Prefijo `<tipo>`**: `/sdd-spec` asigna por defecto el prefijo `feature` (ej. `feature/001-login`). Si el usuario invoca el comando con un tipo explícito (ej. `/sdd-spec fix/002-jwt-expiry`) o indica en la entrevista técnica que se trata de una corrección, refactorización o tarea de mantenimiento, adopta automáticamente el prefijo correspondiente (`fix/`, `refactor/`, `chore/`, `docs/`, `test/`).
  - **Regla Estricta de Sanitización del Slug**: La cadena `<nombre>` debe normalizarse obligatoriamente a minúsculas y formato *kebab-case*: convertir a minúsculas, sustituir espacios por guiones simples (`-`), suprimir tildes/diacríticos y eliminar caracteres no alfanuméricos (`[a-z0-9-]`), con longitud máxima recomendada de 30 caracteres. Esto previene fallos de sintaxis en `git checkout -b` en consolas de Windows, Linux o macOS.
- **Persistencia en `AGENTS.md` y Soporte Multiversión (LTS)**:
  - `PR_TARGET_BRANCH`: Rama base remota por defecto (`develop` o `main`).
  - **Sobrescritura por Spec**: Si una feature va dirigida a una versión específica o rama de mantenimiento (ej. `v1.x-maintenance`), la spec declara en su encabezado `Rama Base: <nombre-rama>`, la cual tiene precedencia sobre el valor por defecto de `AGENTS.md`.
  - `AGENT_CAN_MERGE`: Permiso booleano (`true` o `false` para solo crear PR y dejar la fusión a revisión humana).
- **Protocolo de Resolución de Conflictos Git Pre-PR y Sincronización Concurrente**:
  - Antes de abrir el PR o cuando la rama remota base recibe cambios de otros PRs concurrentes mientras la spec está abierta:
    - Si existe remoto `origin`: se sincroniza con la rama base remota (`git fetch origin && git rebase origin/<base_branch>` o `git merge`).
    - Si el repositorio opera en local-only / offline (sin remoto configurado): la sincronización se realiza directamente contra la rama base local (`git rebase <base_branch>`), omitiendo `git fetch` y notificando al usuario que opera en modo local-first.
    - **Resolución Asistida**: Si surgen conflictos mecánicos triviales (ej. orden de imports, líneas adyacentes o formato en archivos compartidos como rutas o manifiestos), el agente los resuelve y ejecuta los tests (`TEST_COMMAND`) para verificar que sigan en verde.
    - **Parada Obligatoria en Conflicto de Negocio**: Si el conflicto toca reglas de negocio, lógica no contemplada en la spec o decisiones de diseño, el agente **SE DETIENE** de inmediato, muestra las líneas en conflicto y solicita al usuario resolver el conflicto manualmente.
- **Sincronización Asistida a Producción (`main`) en GitFlow y Manejo de Ramas Protegidas**:
  - Si la rama base del PR es `develop`, una vez fusionado el PR en `develop`, el agente consulta al usuario: *"¿Deseas sincronizar estos cambios a producción (`main`) ahora?"*.
  - Si el usuario autoriza:
    - Intenta fusionar y publicar en `main`.
    - **Protección de `main`**: Si GitHub rechaza el push directo por reglas de protección de rama (`protected branch hook`), crea automáticamente un Pull Request de Release (`compare: develop -> base: main`), reporta el enlace al usuario y solicita su aprobación en la interfaz de GitHub.
- **Estrategia de Apertura de PRs en 3 Niveles (Degradación Elegante)**:
  - Al abrir cualquier Pull Request (tanto de feature branch en `review-and-pr.md` como de Release hacia `main`), el sistema aplica degradación en 3 capas:
    1. **Nivel 1 (GitHub MCP)**: Si el servidor `github` MCP está disponible y autenticado, invoca la herramienta nativa `create_pull_request`.
    2. **Nivel 2 (GitHub CLI)**: Si GitHub CLI (`gh`) está instalado en la consola del sistema, ejecuta `gh pr create --base <base> --head <head> --title <titulo> --body <cuerpo>`.
    3. **Nivel 3 (Enlace Web Directo)**: Si no hay MCP ni CLI disponible, genera e imprime la URL web directa de GitHub (`https://github.com/<owner>/<repo>/compare/<base>...<head>?expand=1`) para apertura manual asistida con un solo clic.
- **Protocolo Estricto de Limpieza Post-Merge**:
  - Tras confirmarse la integración del PR en la rama base:
  - **REGLA MANDATORIA**: El agente **debe solicitar siempre autorización explícita al usuario** antes de eliminar cualquier rama temática, tanto en local (`git branch -d <rama>`) como en remoto (`git push origin --delete <rama>`).

### I. Checklist de Clarificación de Specs y Máquina de Estados (`sdd-status.md`)
- **Checklist de Clarificación (Criterio Objetivo de Parada)**:
  1. Cero adjetivos vagos sin métrica verificable.
  2. 100% de requerimientos funcionales en sintaxis formal EARS (`CUANDO...`, `SI... ENTONCES...`, `MIENTRAS...`, `EL SISTEMA...`).
  3. Casos límite, fallos y estados de error documentados.
  4. Criterios de aceptación medibles y testeables.
  5. Emisión de `VEREDICTO: APROBADO` por parte de `@reviewer`.

- **Máquina de Estados de la Spec (Tabla Canónica de Transiciones para `/sdd-status`)**:
  | Estado | Condición de Entrada | Siguiente Comando Recomendado |
  | :--- | :--- | :--- |
  | `borrador` | `spec.md` creada por `/sdd-spec`, pendiente de revisión QA | `/sdd-clarify` |
  | `clarificada` | `spec.md` aprobada por QA y usuario; `plan.md` aún no generado | `/sdd-plan` |
  | `clarificada` | `plan.md` generado y aprobado por el usuario; `tasks.md` pendiente | `/sdd-tasks` |
  | `planificada` | `plan.md` y `tasks.md` generados y aprobados por el usuario | `/sdd-implement` (o `/sdd-implement T1`) |
  | `en_progreso` | Tareas T1..Tn en desarrollo con tests bajo ciclo TDD | `/sdd-implement` (siguiente tarea pendiente) o `/sdd-validate` |
  | `validada` | 100% tareas marcadas y `@reviewer` emitió `VEREDICTO: APROBADO` RF por RF | `/review-and-pr` |
  | `completada` | PR integrado en rama base o feature cerrada, registrada en `MEMORY.md` | Ninguno (spec finalizada) |
  | `descartada` | Spec cancelada explícitamente por el usuario | Ninguno (spec archivada) |

- **Inferencia Automática de Tarea en `/sdd-implement`**:
  - `/sdd-implement` admite de forma opcional el identificador explícito de la tarea (ej. `/sdd-implement T2`).
  - Si se invoca sin argumentos (`/sdd-implement`), el comando escanea `tasks.md` en la spec activa y selecciona automáticamente la primera tarea pendiente con casilla `- [ ]` en orden secuencial, reportando al usuario la tarea que entra en ejecución. Si todas las tareas están completadas (`- [x]`), `/sdd-status` y `/sdd-implement` indican al usuario que el siguiente paso es `/sdd-validate`.

- **Protocolo de Modificación de Alcance en Progreso (`/sdd-change`)**:
  - Si los requerimientos cambian mientras la spec está en estado `en_progreso`:
    1. Las tareas ya completadas y commiteadas (`T1` a `Tn-1`) se preservan intactas con su marca `- [x]` para mantener la trazabilidad de los commits en el historial de Git.
    2. `/sdd-change` invoca a `@planner` para actualizar `spec.md` con los nuevos requerimientos en sintaxis formal EARS, mostrando el diff al usuario.
    3. **Enfoque Aditivo ante Incompatibilidad con Tareas Previas**: Si el nuevo requerimiento contradice o exige modificar código o contratos ya implementados en tareas completadas, `@planner` **no desmarca las tareas anteriores**; formula explícitamente nuevas tareas secuenciales de refactorización o adaptación (ej. `Tn: Refactorizar contrato de T1 para adaptar al nuevo requerimiento`) que se ubican antes de las tareas de nueva funcionalidad, asegurando que los tests se ajusten bajo el ciclo Red-Green-Refactor de TDD sin desordenar el historial.
    4. Tras la aprobación humana del diff y de la re-planificación, `@planner` ajusta `plan.md` y re-planifica las tareas en `tasks.md`, manteniendo el estado `en_progreso` sin resetear el trabajo ya verificado.

- **Protocolo ante Specs Canceladas o Descartadas (`descartada`)**:
  - Si el usuario decide cancelar un requerimiento:
    1. `@planner` (o el usuario/agente en monohilo) actualiza el encabezado de `specs/NNN-nombre/spec.md` con `Estado: descartada`, registrando la fecha y una justificación breve del motivo.
    2. **En modo `branch_pr`**:
       - El comando ejecutable `/sdd-status` (o el agente principal en entornos monohilo) realiza el commit local de cierre en la rama temática (`docs(NNN): archivar spec descartada`).
       - Devuelve el árbol de trabajo a la rama base (`git checkout develop` o `main`), preservando el aislamiento de permisos (`shell: * deny` en `@coordinator` y `@planner`).
       - Solicita confirmación explícita al usuario antes de eliminar o archivar la rama temática. La carpeta `specs/NNN-nombre/` permanece en el historial de Git para trazabilidad y auditoría de decisiones.
    3. **En modo `trunk` (Limpieza Estricta de `main`)**:
       - Dado que no existe rama temática y los commits locales unpushed de tareas intermedias (`T1..Tn`) residen directamente en `main`, el sistema ejecuta un reset al estado base inicial antes de la spec (`git reset --hard origin/main` o el commit base de partida de la spec).
       - Inmediatamente después, genera un commit único y limpio de archivo en `main`: `docs(NNN): archivar spec descartada`, dejando `main` 100% libre de código parcial o a medio implementar, con el registro histórico de la spec preservado en `specs/NNN-nombre/spec.md`.

### J. Normalización Universal de Rutas Multiplataforma
- Toda referencia a archivos en documentación, skills, plantillas y llamadas a herramientas debe emplear exclusivamente **barras diagonales directas (`/`)** como separador universal de rutas (ejemplo: `src/modules/orders/orders.service.ts`), garantizando compatibilidad idéntica entre Windows, Linux y macOS sin fallos de escape.

### K. Gestión de Contexto en Archivos Masivos y Sintaxis de Checkpoints
- **Inspección Quirúrgica por Rangos**:
  - Prohibido el volcado completo de archivos masivos a la ventana de contexto.
  - Los subagentes deben emplear herramientas de búsqueda selectiva (`grep`, offsets de línea, búsqueda de símbolos) para leer exclusivamente las funciones o bloques afectados.
- **Desglose de Tareas Masivas**:
  - Si durante la implementación se detecta que una tarea exige modificar múltiples archivos grandes que arriesgan la saturación del contexto, el `@implementer` se detiene y solicita al coordinador que `@planner` sub-divida la tarea en dos tareas más delgadas y atómicas.
- **Sintaxis Rígida de Checkpoints en `tasks.md`**:
  - Para evitar romper el reconocimiento de casillas booleanas (`- [ ]`), los checkpoints se escriben **estrictamente como sub-viñetas indentadas** debajo de la tarea:
    ```markdown
    - [ ] T2: Implementar módulo de pagos
      - *Checkpoint*: Tests unitarios redactados en rojo en `tests/payment.test.ts`. Código pendiente en `src/payment.ts`.
    ```
  - La casilla principal permanece intacta como `- [ ]` hasta que la tarea completa esté en verde y verificada, momento en el cual se marca `- [x]` y se remueve o consolida la sub-viñeta.

### L. Convención Lingüística Estricta (Exclusivo en Español)
- Todo el ecosistema de `agent-core` (instrucciones y prompts de subagentes, workflows ejecutables `/sdd-*`, plantillas base, sintaxis formal EARS `CUANDO... / SI... ENTONCES... / MIENTRAS... / EL SISTEMA...`, mensajes de commit y veredictos de QA) opera exclusivamente en **español**.
- Esto garantiza uniformidad absoluta en la interpretación semántica de los requerimientos, consistencia con los principios de `docs/constitution.md` y alineación con la metodología oficial de los apuntes de clase.

---

## 4. Fases de Construcción

- [x] **Fase 1: Subagentes Base (`agents/`)**: Redactar `coordinator.md`, `planner.md`, `implementer.md`, `reviewer.md` en formato híbrido (OpenCode + Markdown universal) incorporando los guardrails de shell/edit.
- [x] **Fase 2: Catálogo y Configuración de MCPs (`mcp/`)**: Crear `recommended-mcps.md` con el catálogo de MCPs (GitHub, Context7, Chrome DevTools), esquemas de configuración JSON y degradación elegante.
- [x] **Fase 3: Plantillas Base y Adaptadores por Agente (`templates/`)**: Generar `AGENTS.md.template`, plantillas monorepo opcionales, `MEMORY.md.template`, `constitution.md.template`, plantillas de `specs/` y los adaptadores en `templates/adapters/` (`CLAUDE.md`, `CODEX.md`, `opencode.json`, `generic-agent.md`).
- [x] **Fase 4: Workflows Ejecutables / Custom Commands (`workflows/`)**: Escribir `init.md`, `adopt.md`, `sdd-constitution.md`, `sdd-spec.md`, `sdd-clarify.md`, `sdd-plan.md`, `sdd-tasks.md`, `sdd-implement.md`, `sdd-validate.md`, `sdd-change.md`, `sdd-status.md` y `review-and-pr.md`. Eliminar `init-agents.md` de la raíz.
- [x] **Fase 5: Generalización y Categorización de Skills (`skills/`)**: Portar y desacoplar las ~25 skills en sus 6 subcarpetas temáticas, actualizando el enrutador `using-agent-skills`.
- [x] **Fase 6: Documentación Maestra y Protocolo de Adopción (`README.md`)**: Redactar la guía completa de uso, instalación desde Git / local, arquitectura, ejemplos de adopción y el prompt universal de auto-adopción condicional (Día 0 vs Día N).
- [x] **Fase 7: Verificación Integral**: Auditar la consistencia entre agentes, adaptadores, workflows, plantillas y skills.
