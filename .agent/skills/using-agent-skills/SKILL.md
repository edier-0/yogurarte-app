---
name: using-agent-skills
description: Enrutador y meta-skill maestro. Gobierna cómo los agentes descubren, secuencian y aplican todas las skills del proyecto YogurArte según la fase del ciclo de vida de desarrollo.
---

# Using Agent Skills — Enrutador Maestro de YogurArte

Colección orquestada de flujos de trabajo de ingeniería organizados por fases de desarrollo. Cada skill codifica un proceso riguroso que siguen los ingenieros de software senior y DevOps. Esta meta-skill guía a los agentes de IA para descubrir, secuenciar y aplicar la habilidad adecuada para cada tarea, evitando la improvisación y garantizando el cumplimiento de la Constitución de YogurArte.

---

## 1. Árbol de Decisión y Descubrimiento de Skills

Cuando llegue una solicitud o tarea, identifica la fase de desarrollo y activa la skill correspondiente:

```text
Llega una Tarea o Requerimiento
    │
    ├── ¿La petición es ambigua o falta contexto de negocio? ──► interview-me
    ├── ¿Idea incipiente y necesitas explorar alternativas? ────► idea-refine
    ├── ¿Nueva funcionalidad, cambio o refactor mayor? ─────────► sdd (Spec-Driven Development)
    ├── ¿Falta fijar la barra de calidad o reglas técnicas? ────► constraint-driven-development
    ├── ¿Tienes la spec aprobada y requieres tareas? ───────────► planning-and-task-breakdown
    │
    ├── IMPLEMENTACIÓN DE CÓDIGO
    │   ├── ¿Estrategia de entrega en rebanadas delgadas? ──────► incremental-implementation
    │   ├── ¿Cargar contexto y afinar archivos relevantes? ──────► context-engineering
    │   ├── ¿Validar sintaxis contra versión en package.json? ──► source-driven-development
    │   ├── ¿Diseño de UI, vistas, modales y accesibilidad? ────► frontend-ui-engineering
    │   ├── ¿Catálogo de estilos, paletas o gráficos UI/UX? ────► ui-ux-pro-max
    │   ├── ¿Endpoints REST, esquemas Zod o contratos de API? ──► api-and-interface-design
    │   ├── ¿Decisiones de alto riesgo o lógica contable? ───────► doubt-driven-development
    │   └── ¿Instrumentar logs estructurados o auditoría? ──────► observability-and-instrumentation
    │
    ├── PRUEBAS Y VERIFICACIÓN
    │   ├── ¿Nueva lógica, cambio de regla o bugfix? ───────────► test-driven-development
    │   ├── ¿Inspección del DOM, consola o viewport móvil? ─────► browser-testing-with-devtools
    │   └── ¿Falló un test, build roto o bug en runtime? ────────► debugging-and-error-recovery
    │
    ├── REVISIÓN Y AFINAMIENTO
    │   ├── ¿Auditoría multiaxial antes de integrar? ───────────► code-review-and-quality
    │   ├── ¿Código denso o con anidamientos excesivos? ────────► code-simplification
    │   ├── ¿Secretos, cero fallbacks y auditoría de paquetes? ──► devsecops
    │   └── ¿Problemas de lentitud, queries N+1 o bundle? ──────► performance-optimization
    │
    └── CONTROL DE VERSIONES Y DESPLIEGUE
        ├── ¿Ramas dedicadas, commits y ciclo de PR remoto? ────► git-pr-workflow
        ├── ¿Contenedores multi-stage, BuildKit y Alpine? ──────► docker-hardening
        ├── ¿Compuertas de CI/CD en GitHub Actions? ─────────────► ci-cd-and-automation
        ├── ¿Retiro de código legacy o migración de esquema? ────► deprecation-and-migration
        ├── ¿Registrar el porqué de una decisión técnica? ──────► documentation-and-adrs
        └── ¿Checklist pre-lanzamiento y pase a producción? ────► shipping-and-launch
```

---

## 2. Comportamientos Operativos No Negociables

Estos principios aplican en todo momento para cualquier agente en YogurArte:

### 1. Hacer Explícitas las Suposiciones (*Surface Assumptions*)
Antes de implementar cualquier tarea no trivial, explicita tus asunciones:
```text
SUPOSICIONES QUE ESTOY ASUMIENDO:
1. [Suposición sobre reglas de negocio]
2. [Suposición sobre arquitectura o base de datos]
3. [Suposición sobre alcance]
→ Si alguna es incorrecta, corrígeme antes de proceder.
```
Rellenar silenciosamente requisitos ambiguos es la causa principal de retrabajo.

### 2. Gestionar la Confusión Activamente
Si encuentras contradicciones entre la spec, la Constitución o el código existente:
1. **DETENTE.** No avances conjeturando.
2. Identifica con exactitud la discrepancia.
3. Plantea la pregunta de clarificación al usuario y espera su respuesta.

### 3. Cuestionar cuando Sea Necesario (*Push Back*)
No seas una máquina complaciente que dice *"¡Por supuesto!"* a todo. Si un enfoque solicitado introduce vulnerabilidades de seguridad, rompe la caja bimonetaria o viola los invariantes de Fase B:
- Señala el riesgo técnico de forma directa.
- Cuantifica el impacto negativo.
- Propón una alternativa sólida alineada con la Constitución de YogurArte.

### 4. Imponer Simplicidad (*Enforce Simplicity*)
La tendencia natural es sobrecomplicar. Resístela activamente:
- ¿Se puede resolver en menos líneas de código?
- ¿Estas abstracciones justifican su costo de mantenimiento?
- Prefiere la solución obvia, robusta y testeable.

### 5. Disciplina Quirúrgica de Alcance
Modifica exclusivamente los archivos requeridos para la tarea en curso. **Prohibido:**
- Borrar comentarios que no entiendas.
- "Limpiar" o refactorizar archivos no relacionados con la tarea.
- Agregar funcionalidades no solicitadas en la spec porque "parecen útiles".

### 6. Verificar con Pruebas, Jamás Asumir
Una tarea no está terminada hasta que la verificación automatizada aprueba. "Parece que funciona" no es evidencia; se requieren pruebas pasando en verde (`vitest`), compilación limpia (`tsc --noEmit`) y empaquetado exitoso.

---

## 3. Secuencia Típica del Ciclo de Vida de una Característica

Para el desarrollo completo de una nueva funcionalidad en YogurArte, el orden canónico de invocación es:

```text
1.  interview-me                → Clarificar la necesidad real de negocio
2.  idea-refine                 → Evaluar alternativas y definir el alcance inicial
3.  constraint-driven-development → Establecer la barra de calidad e invariantes
4.  sdd                         → Redactar la especificación en EARS (specs/NNN/spec.md)
5.  planning-and-task-breakdown → Diseñar plan.md y descomponer en tareas tasks.md
6.  context-engineering         → Cargar el contexto quirúrgico del módulo
7.  source-driven-development   → Validar contratos contra las versiones de package.json
8.  incremental-implementation  → Construir rebanada vertical por rebanada
9.  ui-ux-pro-max               → Aplicar paletas y componentes visuales consistentes
10. frontend-ui-engineering     → Construir vistas y modales de 3 capas fijas
11. api-and-interface-design    → Diseñar endpoints REST y esquemas Zod
12. observability-and-instrumentation → Instrumentar logs estructurados y trazabilidad
13. doubt-driven-development    → Someter decisiones financieras y críticas a examen
14. test-driven-development     → Ciclo Red-Green-Refactor con Vitest
15. browser-testing-with-devtools → Validar el renderizado en navegador y viewport móvil
16. code-review-and-quality     → Auditoría multiaxial antes de integrar
17. code-simplification         → Purgar complejidad manteniendo comportamiento exacto
18. devsecops                   → Escaneo de secretos, cero fallbacks y npm audit
19. git-pr-workflow             → Rama temática, Quality Gates y ciclo de PR remoto
20. docker-hardening            → Validar build de contenedor multi-stage híbrido
21. documentation-and-adrs      → Registrar el porqué de la solución en MEMORY.md o ADR
22. deprecation-and-migration   → Retirar endpoints o columnas legacy de forma segura
23. shipping-and-launch         → Checklist final pre-lanzamiento y sincronización a main
```

---

## 4. Tabla de Referencia Rápida de las 26 Skills

| Fase | Skill | Resumen Operativo de una Línea |
| :--- | :--- | :--- |
| **Definir** | `interview-me` | Entrevista socrática de 1 pregunta a la vez hasta 95% de certeza. |
| **Definir** | `idea-refine` | Expande y converge ideas incipientes en propuestas concretas. |
| **Definir** | `constraint-driven-development` | Establece y defiende invariantes y restricciones técnicas. |
| **Definir** | `sdd` | Metodología oficial de YogurArte (EARS, specs, planes y tareas). |
| **Planear** | `planning-and-task-breakdown` | Descompone en `plan.md` y tareas atómicas de 20–30 min. |
| **Construir**| `incremental-implementation` | Construye en rebanadas verticales delgadas y testeables. |
| **Construir**| `context-engineering` | Carga el contexto preciso en el momento exacto; evita saturación. |
| **Construir**| `source-driven-development` | Fundamenta el código en documentación oficial y versiones reales. |
| **Construir**| `frontend-ui-engineering` | Componentes Vue 3, Tailwind y modales de 3 capas fijas. |
| **Construir**| `ui-ux-pro-max` | Catálogo de diseño, paletas de color y directrices UX. |
| **Construir**| `api-and-interface-design` | Endpoints REST, controladores delgados y esquemas Zod. |
| **Construir**| `doubt-driven-development` | Examen adversarial de decisiones críticas y financieras. |
| **Construir**| `observability-and-instrumentation` | Logs estructurados JSON y trazabilidad de Kardex y caja. |
| **Verificar**| `test-driven-development` | Escribe el test que falla antes de implementar (Patrón Prove-It). |
| **Verificar**| `browser-testing-with-devtools` | Verificación en vivo del DOM, consola y móvil con Chrome MCP. |
| **Verificar**| `debugging-and-error-recovery` | Triaje en 5 pasos y regla innegociable de Parar la Línea. |
| **Revisar**  | `code-review-and-quality` | Auditoría en 5 ejes (corrección, estilo, capas, seguridad, BD). |
| **Revisar**  | `code-simplification` | Reduce carga cognitiva y anidamientos preservando comportamiento. |
| **Revisar**  | `devsecops` | Prohibición total de fallbacks, escaneo de secretos y npm audit. |
| **Revisar**  | `performance-optimization` | Erradicación de N+1 en Prisma, agregaciones SQL y lazy loading. |
| **Publicar** | `git-pr-workflow` | Ramas temáticas, 3 checkpoints humanos y PR remoto exclusivo. |
| **Publicar** | `docker-hardening` | Contenedores multi-stage híbridos (WSL2/CI), Alpine y dumb-init. |
| **Publicar** | `ci-cd-and-automation` | Pipeline de GitHub Actions (`ci.yml`) con validación en 2 jobs. |
| **Publicar** | `documentation-and-adrs` | Registra el *por qué* de las decisiones en ADRs y `MEMORY.md`. |
| **Publicar** | `deprecation-and-migration` | Retiro seguro de código legacy y patrón Expand & Contract. |
| **Publicar** | `shipping-and-launch` | Checklist pre-lanzamiento, rollback y sincronización a `main`. |

---

## 5. Descubrimiento de Capacidades Externas Bajo Demanda (`find-skills`)

Para evitar saturar el repositorio instalando paquetes prescindibles, cualquier requerimiento especializado futuro se consulta al vuelo mediante el CLI de `skills.sh`:

1. **Búsqueda interactiva:** `npx skills find <término>` (ej. `npx skills find redis`, `npx skills find playwright`).
2. **Evaluación de madurez:** Solo considerar skills con **más de 1.000 instalaciones** y de fuentes oficiales/reconocidas.
3. **Uso efímero:** `npx skills use <paquete>@<skill>` para ejecuciones puntuales sin alterar la estructura local de archivos.
