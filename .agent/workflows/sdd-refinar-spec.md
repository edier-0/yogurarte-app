---
description: "SDD · Aplica hallazgos de clarificación en la spec, garantiza coherencia total y pregunta lo pendiente"
---

Toma los hallazgos detectados en la revisión/clarificación previa sobre `specs/$1/spec.md` y ejecuta este flujo utilizando la skill `sdd`:

1. **Integración y coherencia interna:**
   - Modifica `specs/$1/spec.md` para resolver todas las contradicciones, ambigüedades evidentes y conflictos con `docs/constitution.md` que ya tengan una solución clara según el contexto del proyecto.
   - Asegura que cada requisito funcional, regla de negocio y criterio de aceptación quede 100% coherente entre sí y sea verificable (sin contradicciones ni redacciones vagas).
   - No inventes reglas de negocio críticas ni asumas decisiones de arquitectura que no estén respaldadas por el código existente o `docs/constitution.md`.

2. **Preguntas para cerrar brechas:**
   - Para los hallazgos, casos límite o ambigüedades donde existan múltiples caminos válidos o falte definición de negocio, no adivines.
   - Formula una lista numerada, directa y concreta con las preguntas exactas que necesito responder para terminar de pulir `specs/$1/spec.md` al 100%.
   - Cuando sea útil, ofrece opciones recomendadas (A/B) basadas en la arquitectura actual para agilizar mis respuestas.

3. **Resumen de control:**
   - Muestra brevemente qué secciones de `specs/$1/spec.md` modificaste antes de listar las preguntas pendientes.