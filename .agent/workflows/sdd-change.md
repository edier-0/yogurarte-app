---
description: Modifica el alcance de una spec en progreso de forma aditiva y controlada, preservando tareas previas completadas en tasks.md y actualizando el plan técnico.
---

# Workflow: Modificación de Alcance en Vuelo (`/sdd-change`)

Este workflow gestiona cambios de requerimientos, ajustes de arquitectura o desbloqueos técnicos cuando una especificación ya se encuentra en estado `en_progreso` (o en revisión tras rechazo en validación).

---

## Principios Fundacionales del Cambio de Alcance

1. **Preservación de Tareas Completadas**:
   - Las tareas ya implementadas y commiteadas (`T1` a `Tn-1`) se **mantienen intactas con su casilla `- [x]`** en `specs/NNN-nombre/tasks.md`. Esto asegura una trazabilidad transparente con los commits atómicos ya existentes en el historial de Git.
2. **Enfoque Aditivo ante Incompatibilidades**:
   - Si el nuevo requerimiento contradice o exige modificar código de tareas completadas, `@planner` **no desmarca las tareas anteriores**.
   - En su lugar, formula nuevas tareas explícitas de refactorización o adaptación (ej. `Tn: Refactorizar contrato de T1 para incorporar nuevo campo`), ubicándolas antes de las tareas de nueva funcionalidad.
3. **La Spec Sigue Mandando**:
   - Queda prohibido escribir código o modificar tests sin haber actualizado primero `spec.md`, luego `plan.md` y finalmente `tasks.md`.

---

## Fase 1: Captura de Nuevos Requerimientos

El Coordinador (o `@planner`) entrevista al usuario para identificar el cambio:
1. ¿Cuál es el nuevo requerimiento o qué comportamiento previo debe modificarse?
2. ¿Por qué surge el cambio (nuevo requerimiento de negocio, bloqueo técnico o ajuste de UI)?
3. ¿Afecta a componentes o contratos ya implementados en tareas anteriores?

---

## Fase 2: Actualización de `specs/NNN-nombre/spec.md`

`@planner` actualiza el documento de especificación funcional:
1. Incorpora los nuevos requerimientos en sintaxis formal EARS (`EL SISTEMA...`, `CUANDO...`, etc.).
2. Modifica los criterios de aceptación afectados.
3. Añade una sección de bitácora en la spec:
   ```markdown
   ## Bitácora de Cambios de Alcance
   - **Fecha**: AAAA-MM-DD
   - **Motivo**: [descripción del cambio solicitado]
   - **Impacto**: [resumen de RFs añadidos o modificados]
   ```
4. Muestra el diff de la spec al usuario para su aprobación explícita.

---

## Fase 3: Ajuste del Plan Técnico y Desglose de Tareas

Tras la aprobación de la spec modificada:
1. **Actualización de `plan.md`**:
   - `@planner` ajusta la arquitectura, contratos de datos y estrategia de pruebas según corresponda.
2. **Re-planificación en `tasks.md`**:
   - Mantiene todas las tareas previas ya marcadas como `- [x]`.
   - Si se requiere ajustar código previo, inserta una tarea aditiva de refactorización con ciclo TDD.
   - Añade las nuevas tareas secuenciales necesarias (respetando siempre el límite global de 10 tareas).
   - Muestra la nueva lista de tareas al usuario.

---

## Fase 4: Confirmación y Retorno a Implementación

1. Tras la confirmación del usuario, asegura que `spec.md` continúe en:
   ```markdown
   - **Estado**: en_progreso
   ```
2. Indica el siguiente paso a ejecutar:
   > *"✅ Alcance actualizado y re-planificado exitosamente. Para continuar la implementación con la siguiente tarea pendiente bajo ciclo TDD, ejecuta `/sdd-implement`."*
