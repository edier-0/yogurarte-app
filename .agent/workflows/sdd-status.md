---
description: Consulta el estado de la spec activa en la máquina de estados SDD, recomienda el siguiente comando y gestiona el archivado seguro de specs descartadas.
---

# Workflow: Estado del Ciclo SDD y Gestión de Specs (`/sdd-status`)

Este workflow inspecciona la especificación activa en `specs/`, evalúa su estado actual dentro de la máquina de estados formal de SDD, informa del progreso de tareas y recomienda con exactitud el siguiente comando a ejecutar. También gestiona la cancelación y archivado seguro de specs descartadas.

---

## Modos de Invocación

1. **Consulta de Estado (`/sdd-status`)**: Inspecciona la spec activa y sugiere el siguiente paso.
2. **Descarte / Cancelación (`/sdd-status --cancel`)**: Cancela de forma limpia y segura la spec activa.

---

## PARTE 1: Inspección de Estado

### Fase 1: Detección de Spec Activa
1. Identifica la spec activa a partir de la rama Git actual (ej. `feature/001-login` -> `specs/001-login/`), o escaneando la última carpeta en `specs/`.
2. Lee `spec.md`, `plan.md` (si existe) y `tasks.md` (si existe).

---

### Fase 2: Evaluación en la Máquina de Estados Canónica

| Estado | Condición Detectada | Siguiente Comando Recomendado |
| :--- | :--- | :--- |
| **`borrador`** | `spec.md` creada por `/sdd-spec`, pendiente de clarificación de QA | `/sdd-clarify` |
| **`clarificada`** | `spec.md` aprobada; `plan.md` aún no generado | `/sdd-plan` |
| **`clarificada`** | `plan.md` aprobado; `tasks.md` aún no generado | `/sdd-tasks` |
| **`planificada`** | `plan.md` y `tasks.md` listos; tareas pendientes de iniciar | `/sdd-implement` (o `/sdd-implement T1`) |
| **`en_progreso`** | Tareas en desarrollo con tests bajo ciclo TDD | `/sdd-implement` (siguiente tarea pendiente) |
| **`en_progreso`** | 100% de tareas completadas (`- [x]`) pero sin QA integral | `/sdd-validate` |
| **`validada`** | `@reviewer` emitió `VEREDICTO: APROBADO` RF por RF | `/review-and-pr` |
| **`completada`** | PR integrado en rama base y registrado en `MEMORY.md` | *(Ninguno — spec finalizada)* |
| **`descartada`** | Spec cancelada explícitamente y archivada | *(Ninguno — spec archivada)* |

---

### Fase 3: Emisión del Informe de Estado

Presenta al usuario un reporte estructurado y conciso:
```markdown
### Estado de la Especificación Activa
- **Spec**: specs/NNN-slug/
- **Rama Actual**: feature/NNN-slug
- **Estado SDD**: [borrador | clarificada | planificada | en_progreso | validada | completada]
- **Avance de Tareas**: X / Y tareas completadas ([X/Y]%)
- **Próximo Comando Recomendado**: `/<comando-recomendado>`
```

---

## PARTE 2: Protocolo de Cancelación y Descarte (`--cancel`)

Si el usuario decide cancelar o descartar un requerimiento:

1. **Actualización de Metadatos**:
   - `@planner` actualiza el encabezado de `specs/NNN-nombre/spec.md`:
     ```markdown
     - **Estado**: descartada
     - **Fecha de Cancelación**: AAAA-MM-DD
     - **Motivo**: [descripción o justificación del descarte]
     ```
2. **Tratamiento según el Modo de Git**:

   #### En modo `branch_pr`:
   - Realiza un commit local de archivado en la rama temática:
     ```bash
     git add specs/NNN-nombre/spec.md
     git commit -m "docs(NNN): archivar spec descartada"
     ```
   - Devuelve el árbol de trabajo a la rama base:
     ```bash
     git checkout <base_branch>
     ```
   - Solicita confirmación explícita al usuario antes de eliminar o mantener la rama temática en Git:
     > *"La spec ha sido archivada como descartada. ¿Deseas eliminar la rama local `feature/NNN-slug` (`git branch -d`) o conservarla para historial?"*

   #### En modo `trunk` (Limpieza Estricta de `main`):
   - Dado que los commits intermedios de tareas inconclusas residen localmente en `main`, ejecuta un reset al estado base sincronizado previo a la spec:
     ```bash
     git reset --hard origin/main
     ```
   - Inmediatamente después, genera un único commit limpio de archivado en `main`:
     ```bash
     git add specs/NNN-nombre/spec.md
     git commit -m "docs(NNN): archivar spec descartada"
     ```
   - Esto deja `main` 100% libre de código parcial o a medio implementar, preservando la justificación histórica de la cancelación en `specs/NNN-nombre/spec.md`.
