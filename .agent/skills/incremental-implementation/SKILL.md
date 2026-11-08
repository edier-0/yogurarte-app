---
name: incremental-implementation
description: Entrega cambios de forma incremental en rebanadas verticales delgadas y verificables. Usar al implementar features multifile, refactorizaciones o tareas de una spec en YogurArte.
---

# Incremental Implementation — YogurArte

Construye mediante rebanadas verticales delgadas (*thin vertical slices*): implementa una pieza mínima, pruébala, verifícala y solo entonces continúa con la siguiente. Queda terminantemente prohibido implementar una característica completa de extremo a extremo en una sola pasada masiva. Cada incremento debe dejar el sistema en un estado funcional, compilable y testeable.

---

## 1. Cuándo Usar la Implementación Incremental

- Al abordar cualquier tarea (`Tn`) resultante de una especificación SDD (`specs/NNN-nombre/tasks.md`).
- Al realizar cambios que afecten a más de un archivo simultáneamente.
- En refactorizaciones de módulos existentes.
- Cada vez que sientas la tentación de escribir más de 80–100 líneas de código antes de ejecutar una prueba o compilar.

> **Cuándo NO usar:** Cambios atómicos de una sola función en un único archivo donde el alcance ya es microscópico.

---

## 2. El Ciclo del Incremento

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│   Implementar ──► Probar (Vitest) ──► Verificar (tsc)  │
│        ▲                                   │           │
│        │                                   ▼           │
│        └────── Siguiente Rebanada ◄─── Commit          │
│                (Llevar adelante)      Atómico          │
│                                                        │
└────────────────────────────────────────────────────────┘
```

Para cada rebanada delgada:
1. **Implementar:** Escribe el cambio más pequeño posible que agregue valor comprobable.
2. **Probar:** Ejecuta las pruebas del dominio (`npx vitest run tests/<modulo>.test.ts`).
3. **Verificar:** Confirma que el tipado de TypeScript se mantenga impoluto (`npx tsc --noEmit`).
4. **Commit:** Guarda el avance con un commit semántico en español siguiendo `git-pr-workflow` (`feat(ordenes): validar stock minimo en endpoint`).
5. **Avanzar:** Pasa a la siguiente rebanada sin reiniciar el contexto ni dejar cabos sueltos.

---

## 3. Estrategia de Rebanadas Verticales en YogurArte

En nuestro stack (Express + Prisma + Vue 3), la mejor estrategia es construir un camino vertical completo a través de las capas del sistema:

```
Paso 1: Esquema Zod & Contrato de Entrada (src/modules/<modulo>/<modulo>.schema.ts)
   │
   ▼
Paso 2: Lógica de Servicio & Persistencia Prisma (src/modules/<modulo>/<modulo>.service.ts)
   │
   ▼
Paso 3: Controlador Delgado & Rutas Express (src/modules/<modulo>/<modulo>.controller.ts)
   │
   ▼
Paso 4: Pruebas de Integración con Vitest (tests/<modulo>.test.ts)
   │
   ▼
Paso 5: Vista UI o Modal en Vue 3 (frontend/src/views/ o frontend/src/components/)
```

### Ejemplo Práctico: Agregar Fraccionamiento de Presentación en Fase B

- **Rebanada 1 (Validación Zod):**
  Definir el schema `packagingBatchSchema` con Zod en `src/modules/batches/batches.schema.ts`. Validar tipos y rangos de presentación (500 ml, 1 L, 2 L).
  *Verificación:* Test unitario de validación Zod pasando.

- **Rebanada 2 (Servicio & Transacción Prisma):**
  Implementar la función `createPackagingFraction()` dentro de `batches.service.ts` con transacción interactiva `prisma.$transaction`. Descontar la base fermentada del lote madre y crear el registro de fracción.
  *Verificación:* Prueba de integración en `tests/batches.test.ts`.

- **Rebanada 3 (Controlador & Ruta HTTP):**
  Exponer `POST /api/batches/:id/packaging` utilizando el middleware `validateBody(packagingBatchSchema)`.
  *Verificación:* Prueba HTTP con `supertest` verificando respuesta 201 y manejo de `AppError` en 400.

- **Rebanada 4 (Integración UI):**
  Conectar el modal de fraccionamiento en el frontend Vue 3 usando `apiClient` (`frontend/src/api/client.ts`).
  *Verificación:* Compilación de frontend (`npm --prefix frontend run build`).

---

## 4. Reglas Innegociables de Alcance y Disciplina

1. **Cirugía de Precisión:** Modifica exclusivamente los archivos necesarios para la tarea actual. Prohibido "aprovechar" para refactorizar módulos adyacentes o borrar comentarios que no comprendas.
2. **Cero Código Huérfano:** No introduzcas flags booleanas, interfaces o endpoints "por si acaso se necesitan mañana". Si no está en la spec actual, no se implementa.
3. **Preservación del Build Verde:** Si un incremento rompe una suite existente, no continúes hacia la siguiente rebanada. Detén el trabajo y aplica `debugging-and-error-recovery`.
4. **Sincronización con `MEMORY.md`:** Al finalizar cada rebanada o tarea clave de la spec, actualiza el estado en `MEMORY.md`.
