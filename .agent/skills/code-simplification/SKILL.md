---
name: code-simplification
description: Simplifica el código reduciendo la complejidad innecesaria mientras preserva exactamente el comportamiento. Usar al refactorizar código denso, difícil de mantener o tras pasar las pruebas en YogurArte.
---

# Code Simplification — YogurArte

Simplifica el código reduciendo la complejidad cognitiva mientras preservas exactamente el comportamiento funcional. El objetivo no es simplemente tener menos líneas de código; el objetivo es tener código que sea más fácil de leer, entender, depurar y extender por cualquier otro desarrollador o agente de IA.

> **La Pregunta de Oro de la Simplificación:**  
> *"¿Un nuevo ingeniero de software entendería esta implementación más rápido y con menos esfuerzo que la versión original?"*

---

## 1. Cuándo Usar la Simplificación

- Tras completar la fase verde de TDD (`test-driven-development`), cuando la funcionalidad ya opera pero la implementación se siente más pesada de lo necesario.
- Durante la revisión de código (`code-review-and-quality`) si se detectan anidamientos excesivos o nombres confusos.
- Al encontrarse con funciones demasiado largas (>40 líneas) o con múltiples responsabilidades cruzadas.
- Al consolidar lógica duplicada o dispersa en varios archivos.

> **Cuándo NO usar:**  
> - Si el código ya es claro y legible: no simplifiques por mero afán estético.  
> - Si aún no comprendes al 100% lo que hace el código: primero comprende, luego simplifica.  
> - Si estás a punto de rediseñar o reemplazar el módulo por completo.

---

## 2. Los Cinco Principios Fundamentales

```
┌────────────────────────────────────────────────────────┐
│             PRINCIPIOS DE SIMPLIFICACIÓN               │
├────────────────────────────────────────────────────────┤
│ 1. Preservar Comportamiento Exacto (Cero Regresiones) │
│ 2. Alinear con las Convenciones del Repositorio        │
│ 3. Reducir la Carga Cognitiva (Early Returns)          │
│ 4. Eliminar Indirecciones Prematuras e Innecesarias    │
│ 5. Purgar Código Muerto y Comentarios Obsoletos       │
└────────────────────────────────────────────────────────┘
```

### Principio 1: Preservar el Comportamiento Exacto
La simplificación cambia el *cómo*, nunca el *qué*. Todas las entradas, salidas, efectos secundarios, transacciones y excepciones (`AppError`) deben permanecer idénticas.
- **Lista de Verificación:**
  - ¿Produce la misma respuesta ante entradas válidas e inválidas?
  - ¿Mantiene los mismos códigos de error HTTP (400, 401, 404)?
  - ¿Siguen pasando todos los tests existentes sin modificar una sola línea de aserción?

### Principio 2: Alinear con las Convenciones de YogurArte
- Imports ESM obligatorios con extensión `.js` (`./orders.service.js`).
- Errores de API en español y canalizados por `AppError`.
- No alterar la arquitectura Controller $\rightarrow$ Service $\rightarrow$ Prisma.

### Principio 3: Reducir Carga Cognitiva mediante Cláusulas de Guarda
Reemplaza escaleras profundas de `if / else` por salidas tempranas (*early returns*):

```typescript
// ❌ ANTES: Anidamiento profundo y difícil de seguir mentalmente
async function processBatchPackaging(batchId: string, quantity: number) {
  const batch = await prisma.productionBatch.findUnique({ where: { id: batchId } });
  if (batch) {
    if (batch.status === 'FERMENTED') {
      if (batch.availableLiters >= quantity) {
        return await executePackaging(batch, quantity);
      } else {
        throw new AppError('Litros disponibles insuficientes', 400);
      }
    } else {
      throw new AppError('El lote madre no ha completado fermentación', 400);
    }
  } else {
    throw new AppError('Lote de producción no encontrado', 404);
  }
}

// ✅ DESPUÉS: Cláusulas de guarda lineales, planas y claras
async function processBatchPackaging(batchId: string, quantity: number) {
  const batch = await prisma.productionBatch.findUnique({ where: { id: batchId } });
  if (!batch) {
    throw new AppError('Lote de producción no encontrado', 404);
  }

  if (batch.status !== 'FERMENTED') {
    throw new AppError('El lote madre no ha completado fermentación', 400);
  }

  if (batch.availableLiters < quantity) {
    throw new AppError('Litros disponibles insuficientes', 400);
  }

  return executePackaging(batch, quantity);
}
```

### Principio 4: Eliminar Indirecciones Prematuras
- No crees funciones auxiliares de 1 sola línea utilizadas en un único lugar si solo fragmentan la lectura.
- No construyas interfaces genéricas o factorías dinámicas abstractas si solo existe una sola implementación real en el sistema.

### Principio 5: Purgar Código Muerto y Huérfano
- Eliminar variables no utilizadas (`const _temp`).
- Eliminar bloques de código comentado (`// const oldLogic = ...`).
- Eliminar `console.log` de depuración temporal.

---

## 3. Protocolo de Verificación Obligatorio

Cada sesión de simplificación debe seguir esta secuencia estricta:

```bash
# 1. Comprobar que el estado previo esté en verde
npx vitest run tests/<modulo>.test.ts
npx tsc --noEmit

# 2. Aplicar la simplificación de forma quirúrgica en el archivo

# 3. Comprobar que el estado posterior siga en verde exacto
npx vitest run tests/<modulo>.test.ts
npx tsc --noEmit
```

Si cualquier prueba falla o el tipado arroja error, **la simplificación fue defectuosa o alteró el comportamiento**. Reviértela de inmediato (`git checkout <archivo>`) o corrige la discrepancia antes de continuar.
