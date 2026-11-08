---
name: documentation-and-adrs
description: Registra decisiones de arquitectura (ADRs) y documentación técnica de soporte. Usar al tomar decisiones estructurales, elegir librerías o cambiar APIs en YogurArte.
---

# Documentation & ADRs — YogurArte

Documenta las decisiones y sus motivos, no solo el código resultante. La documentación más valiosa explica el **por qué** (*why*) —el contexto de negocio, las restricciones operativas y las alternativas descartadas—. El código muestra qué se construyó; la documentación explica por qué se construyó de esa forma y previene que futuros desarrolladores o agentes reviertan decisiones intencionales por desconocimiento.

---

## 1. Dónde Residen las Decisiones en YogurArte

En nuestro proyecto, las decisiones se documentan según su nivel de permanencia e impacto:

| Tipo de Decisión | Destino Canónico | Propósito |
| :--- | :--- | :--- |
| **Principios e Invariantes Supremos** | `docs/constitution.md` | Invariantes contables, de tesorería y metodológicos (Títulos I al VI). |
| **Decisiones Operativas entre Sesiones** | `MEMORY.md` | Estado activo, aprendizajes y errores a evitar (máx ~50 líneas). |
| **Decisiones Técnicas de una Spec** | `specs/NNN-nombre/plan.md` | Justificación técnica de archivos, pseudocódigo y alternativas descartadas. |
| **Decisiones de Arquitectura Mayores (ADR)** | `docs/adr/NNN-titulo.md` | Cambios estructurales irreversibles (ej. Docker multi-stage híbrido, separación de `User` y `StaffMember`). |

---

## 2. Estructura Canónica de un ADR (`docs/adr/NNN-titulo.md`)

```markdown
# ADR-NNN: [Título Corto y Descriptivo]

- **Estado:** Propuesto | Aceptado | Deprecado | Reemplazado por ADR-XXX
- **Fecha:** AAAA-MM-DD
- **Autores:** [Nombres o Roles]

## Contexto y Planteamiento del Problema
¿Qué situación operativa o técnica motivó esta decisión? ¿Cuáles eran las restricciones del entorno (ej. saturación de red en WSL2, requerimiento de auditoría en Fase B)?

## Alternativas Consideradas
1. **Alternativa A (Descartada):** Descripción y por qué no es viable.
2. **Alternativa B (Elegida):** Descripción del enfoque seleccionado.

## Decisión Adoptada
Explicación concisa del cambio y de la solución técnica acordada.

## Consecuencias y Trade-offs
- **Positivas:** Qué beneficios inmediatos y a largo plazo se obtienen.
- **Negativas / Compromisos:** Qué complejidad adicional se asume y cómo se mitigará.
```

---

## 3. Reglas de Documentación
1. **No documentes lo evidente:** Prohibido agregar comentarios que solo repitan la sintaxis del código (`// incrementa i en 1`).
2. **Comentarios de Código en Español:** Toda explicación de lógica no trivial dentro de `.ts` o `.vue` debe estar redactada en español claro.
3. **Actualización de `MEMORY.md`:** Cada vez que se cierre un ADR o se adopte una decisión importante, refléjala en `MEMORY.md` bajo `## Decisiones (y por qué)`.
