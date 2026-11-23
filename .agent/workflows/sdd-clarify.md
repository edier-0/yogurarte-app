---
description: Audita y refina specs/NNN-nombre/spec.md mediante QA funcional con @reviewer en [MODO: CLARIFICACION_SPEC], eliminando ambigüedades y contradicciones antes del plan.
---

# Workflow: Clarificación Funcional de la Especificación (`/sdd-clarify`)

Este workflow audita la calidad técnica y funcional de `specs/NNN-nombre/spec.md`. El Coordinador convoca a `@reviewer` en modo QA de requerimientos para garantizar que no existan ambigüedades, contradicciones, casos límite huérfanos ni conflictos con la constitución antes de pasar a la fase de planificación arquitectónica.

---

## Pre-Condiciones

1. La spec debe existir en `specs/NNN-nombre/spec.md` con `Estado: borrador` (o en revisión tras `/sdd-change`).
2. El archivo `docs/constitution.md` debe estar disponible en la raíz o en `docs/`.

---

## Fase 1: Invocación de `@reviewer` en Modo Clarificación

El Coordinador inyecta obligatoriamente el siguiente mensaje al subagente revisor:

> `[MODO: CLARIFICACION_SPEC]`  
> Audita la especificación ubicada en `specs/NNN-nombre/spec.md` contrastándola contra `docs/constitution.md`.  
> Aplica estrictamente el Checklist de Clarificación. Si detectas fallos, lista exclusivamente los hallazgos sin proponer soluciones ni inventar reglas de negocio.

### Checklist Objetivo de Parada de QA:
1. **Cero Adjetivos Vagos**: Ningún término ambiguo (*rápido, intuitivo, seguro, flexible*) sin una métrica medible y testeable.
2. **Sintaxis Formal EARS al 100%**: Todo requerimiento funcional debe seguir una de las 5 formas EARS (`EL SISTEMA...`, `CUANDO...`, `MIENTRAS...`, `SI... ENTONCES...`, `MIENTRAS... CUANDO...`).
3. **Casos Límite y Manejo de Errores**: Validaciones de entrada, fallos de red, valores nulos/vacíos y límites de concurrencia documentados.
4. **Criterios de Aceptación Medibles**: Cada criterio debe tener una condición observable y binaria de éxito (pasa o falla).
5. **Alineación Constitucional**: Ningún requerimiento puede violar los principios innegociables de `docs/constitution.md`.

---

## Fase 2: Evaluación de Veredicto

### Caso A: `VEREDICTO: CAMBIOS NECESARIOS`

`@reviewer` emite el veredicto estructurado:
```markdown
VEREDICTO: CAMBIOS NECESARIOS

1. Ambigüedades restantes:
   - [archivo:línea] [descripción]
2. Contradicciones internas:
   - [descripción]
3. Casos límite no cubiertos:
   - [descripción]
4. Conflictos con docs/constitution.md:
   - [descripción]
```

#### Protocolo de Resolución (Máximo 2 Rondas):
1. **Separación de Responsabilidades**:
   - **Correcciones Textuales / Formato EARS**: `@planner` corrige directamente las faltas de redacción o formato en `spec.md`.
   - **Brechas de Negocio / Casos Límite no Definidos**: El Coordinador presenta una encuesta al usuario estructurada bajo el **Estándar de Tarjetas de Selección con Opción Libre** (máximo 5 preguntas concretas):
     - Mediante la herramienta interactiva `ask_question` si está soportada, con opciones sin numerar y la recomendada de primero con `(Recommended)`.
     - O mediante tarjetas visuales en Markdown:
       > **Para cerrar el caso límite detectado en la línea X, ¿cuál debe ser el comportamiento esperado?:**  
       > - **[A] (Recomendada)**: [Explicación técnica fundamentada]  
       > - **[B]**: [Opción alternativa]  
       > - **[O] Escribir otra respuesta**: (Escribe tu alternativa personalizada si aplica).
2. **Actualización de la Spec**:
   - Con las respuestas del usuario, `@planner` actualiza `specs/NNN-nombre/spec.md`.
3. **Segunda Pasada de QA**:
   - El Coordinador re-envía a `@reviewer` en `[MODO: CLARIFICACION_SPEC]`.
   - Si tras la segunda vuelta persisten los hallazgos, el Coordinador **se detiene** y solicita alineación humana directa antes de continuar.

---

### Caso B: `VEREDICTO: APROBADO`

Cuando `@reviewer` verifica que el 100% del checklist se cumple sin observaciones, emite:
```markdown
VEREDICTO: APROBADO
La especificación cumple íntegramente los estándares funcionales, sintaxis EARS y principios constitucionales.
```

---

## Fase 3: Validación Humana y Transición de Estado

1. El Coordinador presenta un resumen ejecutivo al usuario y solicita aprobación final de la spec.
2. Tras la confirmación del usuario:
   - `@planner` actualiza el encabezado de `specs/NNN-nombre/spec.md`:
     ```markdown
     - **Estado**: clarificada
     ```
3. Indica el siguiente paso del ciclo SDD:
   > *"✅ Especificación clarificada y aprobada. Para diseñar la arquitectura técnica, contratos y estrategia de testing, ejecuta `/sdd-plan`."*
