---
description: Diseña la arquitectura técnica, contratos de interfaz y estrategia de pruebas en specs/NNN-nombre/plan.md garantizando el límite de 10 tareas.
---

# Workflow: Planificación Técnica de Arquitectura (`/sdd-plan`)

Este workflow transforma la especificación funcional clarificada en un plan técnico de arquitectura, contratos de datos y estrategia de verificación en `specs/NNN-nombre/plan.md`. Es ejecutado por `@planner` bajo la supervisión del Coordinador.

---

## Pre-Condiciones

1. `specs/NNN-nombre/spec.md` debe estar aprobada en `Estado: clarificada`.
2. `docs/constitution.md` y `AGENTS.md` deben ser leídos para respetar los límites arquitectónicos del proyecto.

---

## Fase 1: Análisis del Código y Restricciones Técnicas

`@planner` utiliza herramientas de lectura e inspección de código (`read_file`, búsqueda de archivos, grep):
1. **Límites Modulares y Acoplamiento**:
   - Identifica qué capas o módulos serán modificados o creados.
   - Revisa que ningún módulo exponga detalles internos indebidamente.
2. **Contratos de Datos e Interfaces**:
   - Define las estructuras de datos públicas (esquemas Zod, clases Pydantic, interfaces TypeScript, DTOs).
   - Diseña endpoints REST, eventos o métodos públicos con validación estricta de entradas.
3. **Persistencia y Base de Datos**:
   - Si la feature modifica esquemas relacionales o colecciones, garantiza que los cambios sean no destructivos y reversibles (estrategia expand/contract).
4. **Estrategia de Testing**:
   - Determina el enfoque de pruebas para cada componente (unitarias, integración, visual con Chrome DevTools).
   - **Proyectos sin Suite Preexistente**: Si el proyecto carece de runner de pruebas, el plan formula obligatoriamente como primera tarea: `T1: Configurar runner de pruebas básico (ej. vitest, pytest, jest)`. Si el usuario declina instalar un runner, planifica scripts temporales en `.agent/scratch/`.

---

## Fase 2: Control de Alcance (Regla de Máximo 10 Tareas)

Para garantizar tareas atómicas (~20-30 min) y evitar specs monstruosas:
1. `@planner` evalúa el esfuerzo necesario para implementar el plan.
2. **Si el requerimiento requiere más de 10 tareas atómicas**:
   - **DETENERSE Y DIVIDIR**: El plan debe segmentarse obligatoriamente en specs secuenciales por fases (ej. `specs/001-feature-backend/` y `specs/002-feature-frontend/`).
   - La fase 2 se ejecutará única y estrictamente después de que la fase 1 esté implementada, validada y fusionada en la rama base mediante su propio Pull Request.

---

## Fase 3: Redacción de `specs/NNN-nombre/plan.md`

Utilizando la plantilla `templates/specs/plan.md.template`, redacta el documento técnico con las siguientes secciones:

```markdown
# Plan Técnico NNN: [Nombre de la Feature]

## 1. Arquitectura y Límites Modulares
- Componentes afectados y nuevas responsabilidades.
- Reglas de comunicación entre capas.

## 2. Contratos de Interfaz y Esquemas de Datos
- Definición formal de tipos y esquemas de validación.
- Manejo de respuestas y códigos de error.

## 3. Estrategia de Persistencia y Migraciones
- Cambios de esquema requeridos (no destructivos).

## 4. Estrategia de Pruebas y Criterios de Aceptación
- Comandos exactos de ejecución (`TEST_COMMAND`).
- Matriz de cobertura: qué se valida con unit tests, integración o DevTools.

## 5. Estimación y Desglose Preliminar
- Confirmación de alcance: número estimado de tareas (máximo 10).
```

---

## Fase 4: Revisión Humana y Siguiente Paso

1. El Coordinador presenta el plan técnico al usuario en el chat.
2. Tras la aprobación explícita del usuario:
   - El plan queda sellado como contrato técnico de implementación.
   - Recomienda el siguiente paso del ciclo SDD:
     > *"✅ Plan técnico aprobado. Para desglosar las tareas atómicas secuenciales con criterio TDD y checkpoints, ejecuta `/sdd-tasks`."*
