---
name: context-engineering
description: Optimiza la carga y gestión de contexto para agentes de IA. Usar al iniciar sesiones, cuando la calidad de respuesta decaiga o al alternar entre módulos en YogurArte.
---

# Context Engineering — YogurArte

Alimenta a los agentes con la información precisa en el momento oportuno. El contexto es la palanca más determinante en la calidad y exactitud del código generado: muy poco contexto produce alucinaciones; demasiado contexto satura la ventana de atención y genera pérdida de foco o desobediencia a las reglas.

---

## 1. La Jerarquía de Contexto en YogurArte

Estructura el contexto desde lo más persistente hasta lo más transitorio:

```
┌────────────────────────────────────────────────────────┐
│ 1. REGLAS PERMANENTES: AGENTS.md y docs/constitution.md│ ← Siempre activas en el repositorio
├────────────────────────────────────────────────────────┤
│ 2. MEMORIA DE SESIONES: MEMORY.md                      │ ← Estado actual, decisiones y errores a evitar
├────────────────────────────────────────────────────────┤
│ 3. ESPECIFICACIÓN ACTIVA: specs/NNN-nombre/            │ ← spec.md, plan.md y tasks.md de la tarea
├────────────────────────────────────────────────────────┤
│ 4. CÓDIGO DEL DOMINIO: src/modules/<dominio>/          │ ← Solo los archivos relevantes del módulo actual
├────────────────────────────────────────────────────────┤
│ 5. EVIDENCIA DE EJECUCIÓN: Errores tsc y Vitest        │ ← Logs quirúrgicos de fallos
└────────────────────────────────────────────────────────┘
```

---

## 2. Buenas Prácticas de Ingeniería de Contexto

1. **Leer `MEMORY.md` al Iniciar:** Antes de cualquier cambio, consulta el estado actual y las decisiones previas para no repetir errores pasados.
2. **Carga Quirúrgica de Archivos:**
   - Si estás trabajando en pedidos, carga `src/modules/orders/` y su respectivo test en `tests/orders.test.ts`.
   - No leas archivos masivos no relacionados (como controladores legacy o backups) que solo agotan los tokens del modelo.
3. **Manejo de Saturación de Contexto:**
   - Si una sesión de chat supera las 40–50 interacciones y notas que el modelo empieza a ignorar convenciones (ej. escribiendo imports sin `.js` o commiteando directo), utiliza el comando `/compact` para resumir el historial y refrescar la atención.
4. **Actualización Continua de `MEMORY.md`:**
   - Mantén `MEMORY.md` conciso (máximo ~50 líneas). Al finalizar una tarea o spec, resume lo implementado y elimina lo que ya no aporte valor futuro.
