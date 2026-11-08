---
name: idea-refine
description: Refina ideas preliminares en conceptos claros y accionables mediante pensamiento divergente y convergente. Usar cuando una idea sea imprecisa o se quieran explorar alternativas antes de redactar una spec SDD en YogurArte.
---

# Idea Refine — YogurArte

Transforma ideas incipientes en conceptos técnicos y operativos sólidos mediante pensamiento divergente (expandir opciones) y convergente (evaluar, descartar y focalizar). Esta skill asegura que antes de escribir especificaciones formales en `sdd`, hayamos elegido la solución más simple, elegante y de mayor impacto para YogurArte.

---

## 1. Cuándo Aplicar Esta Skill

- Cuando se tiene una idea general de negocio pero sin forma técnica (ej. *"cómo manejar promociones para tiendas de barrio"* o *"cómo liquidar jornales de ordeño"*).
- Cuando existen múltiples formas de resolver un problema y se requiere evaluar los trade-offs antes de comprometerse con un plan.
- Al evaluar si una funcionalidad debe construirse internamente o resolverse mediante procesos operativos existentes.
- Frases de activación: *"ayúdame a pensar esta idea"*, *"exploremos opciones para..."*, *"evalúa alternativas para..."*.

---

## 2. El Proceso de Refinamiento en 3 Fases

```
1. EXPANDIR (Divergente)  ──► Explorar 3 variaciones o enfoques radicalmente distintos
2. EVALUAR (Convergente)  ──► Contrastar contra la Constitución de YogurArte y costo/beneficio
3. FOCALIZAR (Sharpen)    ──► Producir un documento de 1 página con el alcance exacto
```

### Fase 1: Expandir (Pensamiento Divergente)
Presenta al menos 3 enfoques posibles:
1. **La Solución Mínima (MVP Pragmático):** ¿Cómo resolver el 80% del dolor con el 20% del esfuerzo sin tocar la base de datos?
2. **La Solución Canónica y Escalable:** Integración completa en el modelo de datos de Prisma y módulos de Express.
3. **La Solución Operativa/Externa:** ¿Se puede resolver con un mensaje automático de WhatsApp o una plantilla sin escribir código nuevo?

### Fase 2: Evaluar y Estresar Suposiciones
Filtra las opciones aplicando los principios de YogurArte:
- ¿Viola algún invariante constitucional (tesorería bimonetaria, deuda dinámica, Fase B)?
- ¿Añade complejidad accidental que un solo desarrollador tendrá que mantener?
- ¿Resuelve el problema del operario en planta de Fonseca o es solo un adorno visual?

### Fase 3: Documento de Síntesis (One-Pager)
El resultado del refinamiento es una propuesta ejecutiva que incluye:
- **Definición del Problema:** Qué dolor real resuelve.
- **Dirección Recomendada:** Enfoque seleccionado y por qué se descartaron los otros.
- **Alcance MVP (Qué entra):** Requisitos nucleares.
- **Fuera de Alcance (Qué NO entra explícitamente):** Para blindar el proyecto.

---

## 3. Transición hacia SDD
Una vez que el usuario aprueba la dirección refinada, la salida de esta skill alimenta directamente la fase de **`sdd`** para redactar formalmente `specs/NNN-nombre/spec.md`.
