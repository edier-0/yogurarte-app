# agent-core

> **Software Factory Portátil y Arnés de Ingeniería de Software para Agentes de IA**  
> *Desarrollo Guiado por Especificaciones (SDD) · Desarrollo Guiado por Pruebas (TDD) · Flujo de Ramas y PRs Protegidos · DevSecOps Estricto · Subagentes Especializados*

[![GitHub](https://img.shields.io/badge/GitHub-edier--0%2Fagent--core-blue?logo=github)](https://github.com/edier-0/agent-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Metodología](https://img.shields.io/badge/Metodología-SDD%20%2B%20TDD-orange)](https://github.com/edier-0/agent-core)
[![Seguridad](https://img.shields.io/badge/Seguridad-DevSecOps%20Cero%20Fallbacks-red)](https://github.com/edier-0/agent-core)

---

## Índice

1. [¿Qué es `agent-core` y qué problema resuelve?](#1-qué-es-agent-core-y-qué-problema-resuelve)
2. [¿Para qué sirve este repositorio?](#2-para-qué-sirve-este-repositorio)
3. [Cómo utilizar este repositorio Paso a Paso](#3-cómo-utilizar-este-repositorio-paso-a-paso)
   - [Escenario A: Iniciar un proyecto nuevo desde cero (Día 0 / Greenfield)](#escenario-a-iniciar-un-proyecto-nuevo-desde-cero-día-0--greenfield)
   - [Escenario B: Equipar un proyecto ya existente (Día N / Brownfield)](#escenario-b-equipar-un-proyecto-ya-existente-día-n--brownfield)
4. [El Prompt Universal de Auto-Adopción (Copiar y Pegar)](#4-el-prompt-universal-de-auto-adopción-copiar-y-pegar)
5. [El Ciclo de Vida de Desarrollo Diario (SDD + TDD)](#5-el-ciclo-de-vida-de-desarrollo-diario-sdd--tdd)
6. [Los 4 Subagentes Especializados y sus Guardarraíles](#6-los-4-subagentes-especializados-y-sus-guardarraíles)
7. [El Framework de los 8 Ejes Técnicos (Entrevista Minuciosa)](#7-el-framework-de-los-8-ejes-técnicos-entrevista-minuciosa)
8. [Estructura del Repositorio y Catálogo de Componentes](#8-estructura-del-repositorio-y-catálogo-de-componentes)
9. [Matriz de Compatibilidad por Agente de IA](#9-matriz-de-compatibilidad-por-agente-de-ia)
10. [Reglas Innegociables de Gobernanza y Seguridad](#10-reglas-innegociables-de-gobernanza-y-seguridad)
11. [Preguntas Frecuentes (FAQ)](#11-preguntas-frecuentes-faq)

---

## 1. ¿Qué es `agent-core` y qué problema resuelve?

### El Fin del *Vibe Coding*
La mayoría de los agentes de Inteligencia Artificial (como Claude Code, Cursor, Windsurf, OpenCode, Codex o Antigravity) tienden por defecto a programar de forma intuitiva y desordenada (*"Vibe Coding"*):
- Escriben cientos de líneas de código sin una especificación previa.
- Asumen reglas de negocio que nadie les pidió y adivinan contratos de datos.
- Modifican archivos indiscriminadamente, rompen dependencias y dejan código sin tests.
- Queman contraseñas, secretos o fallbacks inseguros en código (`|| 'postgresql://...'`).
- Hacen commits masivos y directos sobre ramas principales sin pasar por un proceso de revisión ni compuertas de integración continua (CI).

### ¿Qué es un Arnés de Ingeniería (Software Factory Harness)?
`agent-core` es un **arnés portátil, modular y agnóstico al lenguaje de programación** que se instala en cualquier repositorio para transformar al agente de IA en un equipo completo de ingeniería de software senior:

```text
              ┌─────────────────────────────────────────────────────────┐
              │                   AGENTE DE IA ACTIVO                   │
              │   (Claude Code, OpenCode, Cursor, Codex, Antigravity)   │
              └────────────────────────────┬────────────────────────────┘
                                           │
                                           ▼
              ┌─────────────────────────────────────────────────────────┐
              │                   ARNÉS AGENT-CORE                      │
              │                                                         │
              │   1. Gobernanza Suprema (docs/constitution.md)          │
              │   2. Convenciones & Límites (AGENTS.md)                 │
              │   3. Memoria Viva del Proyecto (MEMORY.md)              │
              │   4. Batería de 27 Skills Metodológicas                 │
              │   5. 12 Workflows Ejecutables (Comandos Slash /sdd-*)   │
              │   6. 4 Subagentes Especializados (Planner, Dev, QA)     │
              └────────────────────────────┬────────────────────────────┘
                                           │
                                           ▼
              ┌─────────────────────────────────────────────────────────┐
              │                 SOFTWARE DEL USUARIO                    │
              │   Código limpio, modular, probado bajo TDD (100% verde),│
              │   sin credenciales y versionado en PRs protegidos.      │
              └─────────────────────────────────────────────────────────┘
```

---

## 2. ¿Para qué sirve este repositorio?

1. **Para construir aplicaciones desde cero con arquitectura de nivel de producción**: Conduce una entrevista técnica minuciosa que define arquitectura, stack, base de datos, seguridad, Docker y testing sin dejar cabos sueltos.
2. **Para gobernar repositorios existentes**: Audita comandos, runners de test y reglas de negocio sin alterar ni desordenar el código que ya tienes construido.
3. **Para imponer rigor metodológico**: Separa estrictamente el **QUÉ** (especificaciones funcionales formales EARS en `spec.md`), del **CÓMO** (planes técnicos en `plan.md`) y de la **EJECUCIÓN** (tareas atómicas verificables bajo TDD en `tasks.md`).
4. **Para garantizar seguridad absoluta (DevSecOps)**: Aplica una política estricta de cero credenciales quemadas en código y blindaje total contra alteraciones de bases de datos remotas o de producción.
5. **Para operar con cualquier stack tecnológico**: Funciona exactamente igual de riguroso en Node.js/TypeScript, Python, Go, Rust, Java, C# / .NET, PHP o arquitecturas políglotas.

---

## 3. Cómo utilizar este repositorio Paso a Paso

El arnés opera bajo el principio innegociable de **Contenedor Limpio y Cero Basura en Raíz**: toda la maquinaria, agentes, workflows y skills residen dentro de la carpeta `.agent/` del proyecto destino. La raíz del proyecto (`root`) queda 100% limpia para tu código fuente (`src/`, `AGENTS.md`, `MEMORY.md`, etc.).

---

### Escenario A: Iniciar un proyecto nuevo desde cero (Día 0 / Greenfield)

Utiliza este camino cuando vayas a crear una aplicación, API, microservicio o herramienta desde una hoja en blanco.

#### Paso 1: Clonar el arnés como base de tu nuevo proyecto
```bash
git clone https://github.com/edier-0/agent-core.git mi-nuevo-proyecto
cd mi-nuevo-proyecto
```

#### Paso 2: Abrir tu Agente de IA favorito
Abre el directorio en tu entorno de desarrollo habitual:
- **Claude Code**: Ejecuta `claude` en la terminal dentro de la carpeta.
- **OpenCode**: Ejecuta `opencode` en la terminal.
- **Cursor / Windsurf**: Abre la carpeta en el editor.
- **Antigravity**: Abre el workspace en Antigravity.

#### Paso 3: Pegar el Prompt Universal de Auto-Adopción
Copia el bloque completo de la [Sección 4](#4-el-prompt-universal-de-auto-adopción-copiar-y-pegar) y pégalo en el chat de tu agente.

#### Paso 4: Reorganización Quirúrgica Automática
El agente detectará que las carpetas del arnés (`agents/`, `workflows/`, `skills/`, etc.) están en la raíz y de forma automática:
1. Las trasladará limpiamente dentro de `.agent/`.
2. Moverá este manual de instrucciones a `.agent/README.md` (para que te sirva de consulta offline permanente).
3. Moverá el plan de construcción a `.agent/docs/history/agent-core-plan.md`.
4. Creará un `README.md` nuevo y limpio exclusivo para tu nueva aplicación.

#### Paso 5: La Entrevista Minuciosa de los 8 Ejes Técnicos
El agente conducirá una entrevista técnica exhaustiva (utilizando tarjetas interactivas de clic con opción para redactar respuestas libres) para definir con precisión:
- El dominio del negocio y los roles de usuario (RBAC).
- El stack tecnológico fundamentado (Backend, Frontend, Runtimes).
- La arquitectura modular (monolito modular por dominio en vertical slices, contratos Zod/Pydantic, `AppError`).
- La base de datos, ORM y estrategia de migraciones (PostgreSQL, Prisma, transacciones).
- La seguridad DevSecOps y política de secretos.
- El runner de pruebas determinista para TDD (Vitest, Pytest, Cargo test).
- El empaquetado en contenedores (Docker multi-stage con Alpine).
- El flujo de trabajo en Git (`branch_pr` con ramas protegidas).

#### Paso 6: Generación de Archivos Fundacionales
El agente generará y validará contigo los 5 archivos maestros:
- `AGENTS.md`: Comandos exactos, stack y límites innegociables (~30-40 líneas).
- `docs/constitution.md`: Los 6 principios rectores supremos de arquitectura (~10-15 líneas).
- `MEMORY.md`: Estado vivo, decisiones tomadas y aprendizajes (~50 líneas).
- `.env.example`: Plantilla de variables de entorno documentada sin secretos.
- `README.md`: Documentación inicial limpia de tu software.

#### Paso 7: Iniciar el Desarrollo Guiado por Especificaciones
¡Tu entorno está listo! Comienza redactando tu primer requerimiento con:
```bash
/sdd-spec 001-setup-inicial
```

---

### Escenario B: Equipar un proyecto ya existente (Día N / Brownfield)

Utiliza este camino si ya tienes un proyecto con código escrito y quieres dotarlo de toda la disciplina, subagentes y skills de `agent-core`.

#### Paso 1: Inyectar la carpeta del arnés en tu proyecto
Copia la carpeta de `agent-core` dentro de tu proyecto en el directorio `.agent/`:

```bash
# Opción 1: Clonar directamente dentro de .agent/
git clone https://github.com/edier-0/agent-core.git .agent

# Opción 2: Copiar desde una carpeta local
mkdir -p .agent
cp -r /ruta/a/agent-core/* .agent/
```

#### Paso 2: Pegar el Prompt Universal en tu Agente
Pega el bloque de la [Sección 4](#4-el-prompt-universal-de-auto-adopción-copiar-y-pegar) en el chat de tu agente.

#### Paso 3: Auditoría y Adaptación No Destructiva
1. El agente detectará que se trata de un **Proyecto Existente (Día N)**.
2. **NO tocará ni moverá tu código fuente**.
3. Inspeccionará tus dependencias (`package.json`, `requirements.txt`, etc.), linters y suites de tests.
4. Te hará entre 3 y 4 preguntas clave sobre reglas de dominio y comandos críticos mediante tarjetas interactivas.
5. Generará los adaptadores nativos requeridos por tu plataforma (ej. `CLAUDE.md`, `.claude/commands/`, `opencode.json`, `.opencode/`, etc.).
6. Generará `AGENTS.md`, `docs/constitution.md` y `MEMORY.md` respetando estrictamente tu arquitectura actual.

---

## 4. El Prompt Universal de Auto-Adopción (Copiar y Pegar)

Copia y pega el siguiente bloque textual en el chat de **cualquier agente de IA** para activar el sistema de inmediato:

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
       * `AGENTS.md` (resumen conciso de stack, comandos y límites innegociables de ~30-40 líneas).
       * `docs/constitution.md` (máximo 6 principios rectores de arquitectura en ~10-15 líneas).
       * `MEMORY.md` (estado inicial del proyecto en ~25-50 líneas).
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

2. GENERA TU ADAPTADOR NATIVO (Sin mover la fuente canónica de la verdad en .agent/):
   - Identifica qué tipo de agente eres (Claude Code, Cursor, OpenCode, Codex, Antigravity, etc.).
   - Si no tienes configurado tu archivo nativo de instrucciones, genéralo a partir de las plantillas en `.agent/templates/adapters/` (o `.agent/workflows/adopt.md`):
     * Si eres Claude Code: crea/actualiza `CLAUDE.md` y genera los comandos en `.claude/commands/`.
     * Si eres Codex: crea/actualiza `CODEX.md`.
     * Si eres OpenCode: copia físicamente agentes a `.opencode/agents/` y comandos a `.opencode/commands/`, y configura `opencode.json`.
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

---

## 5. El Ciclo de Vida de Desarrollo Diario (SDD + TDD)

Una vez inicializado el entorno, todo desarrollo se ejecuta a través de los **comandos slash ejecutables**:

```text
  /sdd-spec ──► /sdd-clarify ──► /sdd-plan ──► /sdd-tasks ──► /sdd-implement ──► /sdd-validate ──► /review-and-pr
 (Definición)   (QA Funcional)  (Arquitectura) (10 Tareas)    (TDD Rojo-Verde)  (QA Integral)     (Sync & PR)
```

| Comando | Fase | Rol Principal | Qué Hace Exactamente |
| :--- | :--- | :--- | :--- |
| **`/sdd-spec [slug]`** | Fase 1 | `@coordinator` + `@planner` | Comprueba que el árbol de Git esté limpio. Crea una rama temática `<tipo>/<NNN-slug>` en modo `branch_pr`. Entrevista al usuario y genera `specs/NNN-slug/spec.md` en sintaxis formal EARS en español. |
| **`/sdd-clarify`** | Fase 2 | `@reviewer` [QA Spec] | Audita la spec contra un checklist estricto (cero adjetivos vagos, 100% EARS, casos límite cubiertos y sin contradicciones con `constitution.md`). Máximo 2 rondas de resolución. |
| **`/sdd-plan`** | Fase 3 | `@planner` | Diseña la arquitectura técnica en `specs/NNN-slug/plan.md`: contratos de interfaz, esquemas de validación Zod/Pydantic, persistencia y estrategia de pruebas. |
| **`/sdd-tasks`** | Fase 3 | `@planner` | Desglosa el plan en un máximo estricto de **10 tareas atómicas (~20-30 min)** en `specs/NNN-slug/tasks.md` con checkpoints y criterios *"Hecho cuando:"*. |
| **`/sdd-implement [Tn]`** | Fase 4 | `@implementer` | Toma la tarea activa. Verifica la línea base de tests. Aplica el ciclo TDD innegociable: **Escribe el test primero en rojo $\rightarrow$ Implementa el código mínimo para ponerlo en verde $\rightarrow$ Refactoriza con linters**. Staging quirúrgico y commit atómico. Cero push intermedio. |
| **`/sdd-validate`** | Fase 5 | `@reviewer` [QA Code] | Audita la feature completa RF por RF contra la suite completa de pruebas (`TEST_COMMAND`), `git diff`, Chrome DevTools MCP (en UIs web) y compuertas de seguridad. |
| **`/sdd-change`** | Control | `@planner` | Protocolo aditivo para modificar requerimientos en progreso sin desmarcar tareas ya completadas ni romper trazabilidad. |
| **`/sdd-status`** | Soporte | `@coordinator` | Consulta la máquina de estados SDD, sugiere el siguiente paso y gestiona el archivo seguro de specs canceladas. |
| **`/review-and-pr`** | Fase 6 | `@coordinator` | Sincroniza con rebase sobre la rama base, resuelve colisiones numéricas correlativas, abre el PR en GitHub (degradación en 3 niveles: MCP $\rightarrow$ `gh` $\rightarrow$ Web URL), sincroniza release a `main` y elimina ramas tras autorización humana explícita. |

---

## 6. Los 4 Subagentes Especializados y sus Guardarraíles

Para evitar que un solo prompt con superpoderes cometa errores, `agent-core` distribuye el trabajo en **4 roles estrictamente delimitados por permisos de ejecución**:

```text
               ┌────────────────────────────────────────────────┐
               │           @coordinator (Solo Lectura)          │
               │   shell: deny · edit: deny · subagent: allow   │
               │   Único interlocutor directo con el usuario.   │
               └───────┬────────────────┬───────────────┬───────┘
                       │                │               │
        ┌──────────────┴───┐     ┌──────┴──────┐     ┌──┴─────────────┐
        ▼                  │     ▼             │     ▼                │
┌───────────────────────┐  │  ┌─────────────┐  │  ┌──────────────────┐
│ @planner (Arquitecto) │  │  │@implementer │  │  │ @reviewer (QA)   │
│ edit: specs/** allow  │  │  │(Artesano)   │  │  │ edit: deny       │
│ edit: MEMORY.md allow │  │  │shell: allow │  │  │ shell: read-only │
│ shell: deny           │  │  │edit: src/** │  │  │ Doble modo de QA │
└───────────────────────┘  │  └─────────────┘  │  └──────────────────┘
                           └───────────────────┘
```

1. **`@coordinator` (El Director de Orquesta)**:
   - **Permisos**: `shell: deny`, `edit: deny`.
   - **Función**: Es el único que interactúa con el usuario. Guía la máquina de estados SDD, despacha tareas a los especialistas y solicita autorizaciones humanas. No toca código ni ejecuta scripts en la consola.
2. **`@planner` (El Arquitecto de Software)**:
   - **Permisos**: `edit: specs/** allow`, `edit: MEMORY.md allow`, `shell: deny`.
   - **Función**: Entrevista al usuario, redacta especificaciones funcionales formales EARS, planes técnicos y listas atómicas de tareas (máximo 10). Tiene prohibido tocar código en `src/`.
3. **`@implementer` (El Artesano TDD)**:
   - **Permisos**: `edit: src/** allow`, `shell: allow` (restringido a compilación, tests y commits de tareas).
   - **Función**: Ejecuta las tareas estrictamente en orden (`T1 -> T2 -> ... -> Tn`). Aplica siempre el ciclo Red-Green-Refactor: primero escribe el test en rojo que demuestre la necesidad del cambio, escribe el código mínimo para pasarlo en verde y refactoriza. Tiene terminantemente prohibido editar archivos en `specs/` o comitear secretos.
4. **`@reviewer` (El Auditor Inflexible de Calidad)**:
   - **Permisos**: `edit: deny`, `shell: allow` (exclusivamente para comandos de solo lectura: `git diff`, `git status`, linters y `TEST_COMMAND`).
   - **Función**: Opera en dos modos aislados:
     - `[MODO: CLARIFICACION_SPEC]`: QA de la spec antes del código. Detecta ambigüedades, contradicciones y casos límite huérfanos.
     - `[MODO: VALIDACION_IMPLEMENTACION]`: QA del código terminado. Audita la implementación RF por RF contra tests automatizados, DevTools y seguridad.

---

## 7. El Framework de los 8 Ejes Técnicos (Entrevista Minuciosa)

Cuando un proyecto comienza desde cero (Día 0 / Greenfield), `agent-core` ejecuta una entrevista exhaustiva para que la arquitectura nazca con los estándares más altos de escalabilidad, seguridad y mantenibilidad:

1. **Eje 1: Propósito de Negocio, Dominio y Roles**:
   - Definición del problema medular y métricas operativas de éxito.
   - Modelo de acceso RBAC granular (`ADMIN`, `OPERADOR`, `CLIENTE`), multi-tenant o roles por organización.
   - Superficie de consumo (API REST modular + Web SPA, Full-Stack SSR, CLI o Headless).
2. **Eje 2: Stack Tecnológico Completo y Runtimes**:
   - Backend runtime y lenguaje (Node.js 20+ con TypeScript estricto, Python 3.11+ con FastAPI, Rust con Axum, Go).
   - Tipado estricto (`strict: true`, `"type": "module"` en ESM).
   - Frontend reactivo si aplica (Vue 3 `<script setup lang="ts">` + Vite + Tailwind, React + Vite, Next.js).
3. **Eje 3: Arquitectura de Software, Modularidad y Manejo de Errores**:
   - Organización en Monolito Modular desacoplado por dominio (`src/modules/<dominio>/` en vertical slices con routes, controller, service y schemas Zod/Pydantic).
   - Validación estricta de contratos en runtime en límites de API (`body`, `query`, `params`).
   - Manejo centralizado de excepciones mediante clase `AppError` y middleware global con salida JSON estructurada.
4. **Eje 4: Persistencia, Base de Datos y Modelo de Datos**:
   - Motor de base de datos (PostgreSQL 16+ relacional ACID con JSONB, SQLite local-first, MongoDB).
   - ORM / Capa de acceso declarativa con migraciones versionadas en código (Prisma ORM, Drizzle, SQLAlchemy 2.0).
   - Transacciones atómicas obligatorias para mutaciones de múltiples entidades.
5. **Eje 5: Seguridad, Autenticación y DevSecOps desde el Día 0**:
   - Autenticación con JWT de corta expiración en cookies HttpOnly o Bearer headers con rotación de refresh tokens.
   - Middleware declarativo de roles (`authorizeRole`).
   - Blindaje de secretos: prohibición total de credenciales en código (`|| 'postgresql://...'`), validación Zod de `.env` al arranque y `.env.example`.
6. **Eje 6: Estrategia de Testing (TDD) y Comandos Deterministas**:
   - Runner determinista de terminación única (Vitest run, Pytest, Cargo test).
   - Aislamiento de base de datos de test en localhost con triple blindaje contra entornos de producción.
   - Registro de comandos obligatorios: `TEST_COMMAND`, `TYPECHECK_COMMAND`, `LINT_COMMAND`.
7. **Eje 7: Empaquetado, Contenedores (Docker) e Infraestructura**:
   - Docker multi-stage build optimizado en Alpine con BuildKit, usuario no-root y caché granular de dependencias.
   - Observabilidad inicial: logs estructurados JSON con correlation ID de petición.
8. **Eje 8: Flujo de Trabajo en Git y Gobernanza del Repositorio**:
   - Estrategia `branch_pr` con ramas dedicadas (`feature/*`, `fix/*`) y Pull Requests validados por compuertas de CI en verde.
   - Rama base `develop` pre-producción y `main` protegida para producción.
   - Salvaguarda humana: confirmación requerida para abrir PR, fusionar PR y borrar ramas.

---

## 8. Estructura del Repositorio y Catálogo de Componentes

```text
agent-core/
├── agents/                       # 4 Subagentes especializados portables
│   ├── coordinator.md            # Orquestador del ciclo SDD (shell: deny, edit: deny)
│   ├── planner.md                # Arquitecto (specs/** allow, MEMORY.md allow, shell: deny)
│   ├── implementer.md            # Artesano TDD (src/** allow, shell: allow)
│   └── reviewer.md               # Auditor QA (edit: deny, shell: read-only)
│
├── workflows/                    # 12 Workflows ejecutables / Comandos slash
│   ├── init.md                   # Bootstrap del repositorio (Día 0 o actualización no destructiva)
│   ├── adopt.md                  # Auto-adopción y generación de conectores nativos por agente
│   ├── sdd-constitution.md       # Creación y auditoría de docs/constitution.md
│   ├── sdd-spec.md               # Captura de requerimientos, árbol limpio y rama temática
│   ├── sdd-clarify.md            # QA funcional con @reviewer [MODO: CLARIFICACION_SPEC]
│   ├── sdd-plan.md               # Arquitectura técnica, contratos y límite de 10 tareas
│   ├── sdd-tasks.md              # Desglose en tareas atómicas (~20-30 min) y checkpoints
│   ├── sdd-implement.md          # Implementación atómica bajo ciclo TDD Red-Green-Refactor
│   ├── sdd-validate.md           # Validación integral con @reviewer [MODO: VALIDACION_IMPLEMENTACION]
│   ├── sdd-change.md             # Modificación de alcance en vuelo aditiva y controlada
│   ├── sdd-status.md             # Consulta de máquina de estados y archivado de canceladas
│   └── review-and-pr.md          # Sincronización, rebase, PR en 3 niveles y eliminación autorizada
│
├── skills/                       # Batería de 27 skills agrupadas en 6 categorías
│   ├── router/                   # using-agent-skills (Enrutador maestro del ecosistema)
│   ├── methodology/              # sdd, test-driven-development, source-driven-development, idea-refine,
│   │                             # interview-me, planning-and-task-breakdown, constraint-driven-development,
│   │                             # doubt-driven-development
│   ├── architecture/             # api-and-interface-design, incremental-implementation, context-engineering,
│   │                             # documentation-and-adrs, observability-and-instrumentation, performance-optimization
│   ├── quality/                  # code-review-and-quality, code-simplification, debugging-and-error-recovery,
│   │                             # deprecation-and-migration
│   ├── delivery/                 # git-pr-workflow, devsecops, docker-hardening, ci-cd-and-automation,
│   │                             # shipping-and-launch
│   └── frontend/                 # frontend-ui-engineering, browser-testing-with-devtools, ui-ux-pro-max
│
├── templates/                    # 13 Plantillas universales y adaptadores por plataforma
│   ├── AGENTS.md.template        # Resumen conciso de stack y reglas (~30-40 líneas)
│   ├── AGENTS-monorepo-root.template
│   ├── AGENTS-monorepo-module.template
│   ├── MEMORY.md.template        # Memoria viva de decisiones y aprendizajes (~50 líneas)
│   ├── MEMORY-module.template
│   ├── constitution.md.template # Principios supremos innegociables (máx 6 principios)
│   ├── adapters/                 # Adaptadores nativos (CLAUDE.md, CODEX.md, opencode.json, etc.)
│   └── specs/                    # Plantillas para spec.md (EARS), plan.md y tasks.md
│
└── mcp/                          # Catálogo y configuración de MCPs recomendados
    └── recommended-mcps.md       # GitHub, Context7, Chrome DevTools y degradación en 3 niveles
```

---

## 9. Matriz de Compatibilidad por Agente de IA

`agent-core` detecta automáticamente en qué entorno está operando y configura el conector correspondiente:

| Agente / Plataforma | Archivos Generados en Adopción | Cómo se Conecta con `agent-core` | Modo de Orquestación |
| :--- | :--- | :--- | :--- |
| **OpenCode** | `.opencode/agents/`<br>`.opencode/commands/`<br>`opencode.json` | Copia física de subagentes y comandos desde `.agent/` (sin enlaces simbólicos que fallen en Windows). | **Multiagente nativo**: Despacha subagentes reales (`@planner`, `@implementer`, `@reviewer`) en sesiones aisladas. |
| **Claude Code** | `CLAUDE.md`<br>`.claude/commands/sdd-*.md` | Comandos slash nativos autocompletables en la terminal (`/sdd-spec`, `/sdd-implement`, etc.). | **Monohilo coordinado**: El agente anuncia visiblemente en el chat cada transición de rol (`[CAMBIO DE ROL: @agente]`). |
| **OpenAI Codex** | `CODEX.md` | Convenciones, límites contractuales y comandos exactos de verificación vinculados a `.agent/`. | **Monohilo coordinado**. |
| **Google Antigravity** | `AGENTS.md`<br>`.agent/skills/` | Registro canónico de skills en `.agent/skills/` y reglas de proyecto. | **Multiagente nativo** mediante `invoke_subagent`. |
| **Cursor / Windsurf / Aider** | `.cursor/rules/agent-core.mdc`<br>`.windsurfrules` | Reglas de contexto que anclan el ciclo SDD + TDD y guían la ejecución paso a paso. | **Monohilo coordinado**. |

---

## 10. Reglas Innegociables de Gobernanza y Seguridad

1. **La Spec Manda**: Queda terminantemente prohibido escribir código de producción sin una especificación (`spec.md`), plan (`plan.md`) y tareas (`tasks.md`) aprobadas previamente por el usuario humano.
2. **TDD Innegociable (Patrón Prove-It)**: Escribe siempre primero el test que falle en rojo, implementa el código mínimo para ponerlo en verde y refactoriza. Queda prohibido escribir código sin test previo.
3. **Cero Credenciales en Código (DevSecOps)**: Prohibido hardcodear contraseñas, claves API, tokens o cadenas de conexión (`|| 'postgresql://...'`). Todo script exige variables desde `.env` y falla de inmediato si no están presentes.
4. **Blindaje de Bases de Datos de Producción**: Queda terminantemente prohibido ejecutar pruebas automatizadas o semilleros alteradores contra bases de datos remotas o de producción.
5. **Gobernanza Git y Pull Requests**: La rama base nunca recibe merges directos locales; toda integración se realiza mediante Pull Request validado por compuertas de CI en verde.
6. **Salvaguarda Humana de Ramas**: El agente debe solicitar siempre autorización explícita al usuario **antes de abrir un PR, antes de fusionar un PR y antes de borrar cualquier rama local o remota**.
7. **Estándar de Encuestas en Tarjetas con Opción Libre**: Toda pregunta, entrevista o clarificación dirigida al usuario debe formularse como tarjetas de selección interactivas (con la opción recomendada al inicio y la opción obligatoria para redactar otra respuesta libre), prohibiendo preguntas abiertas difusas.
8. **Normalización Universal de Rutas**: Toda referencia a archivos en documentación, scripts y llamadas a herramientas utiliza obligatoriamente **barras diagonales directas (`/`)**.
9. **Convención Lingüística**: Toda la documentación, prompts, especificaciones, comentarios de código y mensajes de error operan exclusivamente en **español**.

---

## 11. Preguntas Frecuentes (FAQ)

#### ¿Por qué todos los archivos del arnés se mueven a `.agent/`?
Para preservar la pureza de tu repositorio. En tu proyecto, la raíz pertenece a tu software (`src/`, `package.json`, etc.). Al aislar el arnés en `.agent/`, evitas contaminar tu repositorio con herramientas de IA y facilitas actualizar el arnés a futuro con `/init --update`.

#### ¿Puedo usar `agent-core` con cualquier lenguaje y framework?
Sí. `agent-core` es 100% agnóstico. Funciona con Node.js, TypeScript, Python, Go, Rust, Java, C#, PHP o cualquier otra tecnología. La disciplina de especificación (EARS) y pruebas (TDD) es universal.

#### ¿Qué ocurre si mi proyecto ya tiene código pero no tiene pruebas?
Durante el proceso de adopción (`/adopt`), el agente auditará tu proyecto y te ayudará a registrar el comando de pruebas base en `AGENTS.md`. A partir de ese momento, cada nueva feature o corrección de bug se construirá bajo TDD estricto, aumentando gradualmente la cobertura sin romper lo existente.

#### ¿El agente puede fusionar o borrar ramas sin mi permiso?
**No, nunca**. El arnés tiene reglas inviolables de salvaguarda: el agente tiene contractualmente prohibido abrir PRs, fusionar PRs o eliminar ramas locales o remotas sin tu aprobación explícita en el chat.

---

## Licencia

Distribuido bajo la Licencia **MIT**. Consulta el archivo `LICENSE` para más información.

Diseñado para potenciar el desarrollo de software confiable, mantenible y de nivel de producción asistido por Inteligencia Artificial.
