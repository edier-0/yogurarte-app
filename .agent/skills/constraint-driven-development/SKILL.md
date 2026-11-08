---
name: constraint-driven-development
description: Establece y defiende las restricciones de calidad e invariantes técnicos del proyecto. Impide la degradación silenciosa del estándar (supresiones @ts-ignore, tests saltados o rebajas de umbrales) en YogurArte.
---

# Constraint-Driven Development — YogurArte

Establece la barra de calidad del proyecto como un contrato explícito e impide que los agentes o desarrolladores la degraden silenciosamente para dar por terminada una tarea. En proyectos de desarrollo asistido por IA, los agentes escriben código a gran velocidad; esta skill garantiza que no se silencien errores con trucos rápidos (`@ts-ignore`, `eslint-disable`, `test.skip` o eliminación de aserciones).

---

## 1. La Barra de Calidad Innegociable en YogurArte

En nuestro repositorio, las restricciones fundamentales emanan de la **Constitución del Software** (`docs/constitution.md`) y la sección de límites de `AGENTS.md`:

```
┌────────────────────────────────────────────────────────┐
│            RESTRICCIONES TÉCNICAS SUPREMAS             │
├────────────────────────────────────────────────────────┤
│ 1. Cero Supresiones de Tipos (@ts-ignore / any)        │
│ 2. Cero Tests Saltados o Comentados (it.skip / // it)  │
│ 3. Cero Fallbacks de Credenciales (|| 'postgresql://')│
│ 4. Respeto Estricto de Invariantes de Dominio          │
│    - Deuda dinámica (sin columna en Customer)          │
│    - Separación bimonetaria de caja                    │
│    - Salidas de producto exclusivas en Fase B          │
│ 5. Control de Cambios Vía PR (Sin merges a develop)    │
└────────────────────────────────────────────────────────┘
```

---

## 2. Detección de Degradación de la Barra de Calidad (*Anti-Cheating Guard*)

Al revisar cualquier diferencial de código (`git diff`), el agente debe verificar que **no** se haya introducido ninguna de las siguientes trampas:

| Patrón Sospechoso | Intento Tramposo Típico | Veredicto |
| :--- | :--- | :--- |
| `// @ts-ignore` o `// @ts-nocheck` | Ocultar un error de tipos de TypeScript en vez de tipar el modelo. | 🔴 Prohibido. Tipar correctamente con Zod o interfaces. |
| `it.skip(...)` o `test.skip(...)` | Apagar un test que falló para que el pipeline se marque en verde. | 🔴 Prohibido. Corregir la regresión de raíz. |
| `as any` en llamadas a Prisma | Saltear las restricciones de columnas o relaciones relacionales. | 🔴 Prohibido. Usar tipos generados por Prisma Client. |
| Reducción de aserciones en tests | Eliminar `expect(total).toBe(...)` dejando solo `expect(res).toBeDefined()`. | 🔴 Prohibido. Toda prueba debe evaluar valores exactos. |
| Fallbacks permisivos silenciosos | `try { ... } catch (e) { return null; }` | 🔴 Prohibido. Canalizar excepciones con `AppError`. |

---

## 3. Protocolo de Defensa de Restricciones

1. **Si un test falla:** Aplica `debugging-and-error-recovery` y soluciona la causa raíz; **nunca** deshabilites la prueba.
2. **Si TypeScript arroja error:** Ajusta la firma de la función o el esquema Zod; **nunca** uses `@ts-ignore`.
3. **Si una regla de negocio se complica:** Detente y consulta al usuario; **nunca** asumas atajos que violen los invariantes de la Constitución.
