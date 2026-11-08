---
name: planning-and-task-breakdown
description: Descompone requerimientos y especificaciones en planes de arquitectura y tareas ordenadas y verificables (20-30 min). Usar al pasar de la spec al plan en SDD en YogurArte.
---

# Planning & Task Breakdown — YogurArte

Descompone especificaciones y requisitos aprobados en planes de arquitectura ejecutables (`plan.md`) y tareas granulares y ordenadas (`tasks.md`). Una planificación meticulosa marca la diferencia entre un desarrollo ágil y sin regresiones y una implementación caótica.

---

## 1. Cuándo Aplicar Esta Skill

- Al completar y aprobar una especificación funcional en **`sdd`** (`specs/NNN-nombre/spec.md`).
- Cuando un requerimiento se sienta demasiado grande o ambiguo para empezar a codificar.
- Para estimar el alcance técnico y la secuencia de dependencias entre base de datos, backend y frontend.

> **Regla de Oro:** **Cero Código durante la Planificación.** En esta fase opera en modo lectura/diseño. La salida son los documentos `plan.md` y `tasks.md`, nunca código de producción.

---

## 2. Elaboración del Plan Técnico (`plan.md`)

El plan define el **CÓMO** técnico, mapeando responsabilidades y reduciendo riesgos:

1. **Archivos y Responsabilidades:**
   - Listado exacto de archivos a crear o modificar en `src/modules/`, `prisma/schema.prisma` o `frontend/src/`.
2. **Grafo de Dependencias:**
   ```
   Modelo Prisma / Migración
        │
        ▼
   Esquema Zod y Tipos TypeScript
        │
        ▼
   Servicio de Dominio (Transacciones e Invariantes)
        │
        ▼
   Controlador y Rutas Express
        │
        ▼
   Pruebas de Integración con Vitest
        │
        ▼
   Vistas y Componentes Vue 3 (Frontend)
   ```
3. **Decisiones Técnicas Justificadas:**
   - Registrar la alternativa elegida y por qué se descartaron las demás (ej. cálculo en base de datos vs. en memoria).
4. **Estrategia de Pruebas:**
   - Casos límite identificados que se cubrirán en `tests/<dominio>.test.ts`.

---

## 3. Descomposición de Tareas (`tasks.md`)

Las tareas deben cumplir los siguientes estándares innegociables:

1. **Tamaño Atómico:** Cada tarea debe poder implementarse, probarse y verificarse en **20 a 30 minutos**.
2. **Límite de Tareas:** Si una spec genera más de 8 a 10 tareas, la funcionalidad debe dividirse en dos specs consecutivas.
3. **Criterio de Aceptación Verificable:** Cada tarea debe contener una condición exacta de finalización (*Hecho cuando...*).

### Plantilla de Tareas:
```markdown
# Tareas: Spec NNN — Nombre de la Característica

- [ ] **T1. Diseñar esquema Zod y tipos TypeScript.** RF-1, RF-2
  - Archivos: `src/modules/orders/orders.schema.ts`
  - Hecho cuando: Las pruebas unitarias del esquema validen campos obligatorios y rechacen cantidades negativas.

- [ ] **T2. Implementar servicio con transacción Prisma.** RF-3
  - Archivos: `src/modules/orders/orders.service.ts`
  - Hecho cuando: `tests/orders.test.ts` verifique la persistencia y el descuento de stock atómico en verde.

- [ ] **T3. Exponer endpoint y controlador delgado.** RF-1, RF-4
  - Archivos: `src/modules/orders/orders.controller.ts`, `src/modules/orders/orders.routes.ts`
  - Hecho cuando: Supertest confirme HTTP 201 en payload válido y HTTP 400 ante datos incorrectos.

- [ ] **T4. Integrar modal comercial en Vue 3.** RF-5
  - Archivos: `frontend/src/components/orders/OrderModal.vue`
  - Hecho cuando: El modal cumpla la estructura de 3 capas y `npm --prefix frontend run build` compile sin errores.
```

---

## 4. Transición a la Implementación
Una vez que el usuario aprueba `plan.md` y `tasks.md`, se inicia la codificación tarea por tarea utilizando obligatoriamente **`incremental-implementation`** y **`test-driven-development`**.
