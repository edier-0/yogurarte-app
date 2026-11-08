---
name: source-driven-development
description: Fundamenta las decisiones de implementación en la documentación oficial y versiones exactas de las librerías. Usar al trabajar con Prisma, Vue 3, Express, TypeScript o Baileys en YogurArte.
---

# Source-Driven Development — YogurArte

Fundamenta cada decisión de diseño y código en la documentación oficial y en las versiones exactas instaladas en el repositorio. Los datos de entrenamiento de los modelos de IA se desfasan, las APIs cambian y las mejores prácticas evolucionan. Esta skill garantiza que el código sea fidedigno, moderno y libre de patrones obsoletos o deprecados.

---

## 1. Cuándo Aplicar Esta Skill

- Al utilizar librerías centrales del stack donde la versión específica altera el comportamiento:
  - **Prisma 5.19:** Transacciones interactivas, motores binarios Alpine y `binaryTargets`.
  - **TypeScript 5.6 + NodeNext:** Imports ESM con terminación explícita `.js`.
  - **Vue 3 + Vite 5:** Composition API con `<script setup lang="ts">` y macros (`defineProps`, `defineEmits`).
  - **Baileys:** Protocolo de conexión WebSocket de WhatsApp y reconexión ante caídas.
- Al configurar o modificar herramientas de build (Vite, Docker, BuildKit, Vitest).
- Al implementar patrones que se replicarán como plantilla en otros módulos del sistema.

> **Cuándo NO usar:** Lógica pura de JavaScript/TypeScript que opera idéntico en cualquier versión (bucles, comparaciones matemáticas, estructuras de datos básicas).

---

## 2. El Proceso en 4 Pasos

```
1. DETECTAR   ──► Identificar versiones exactas en package.json (raíz y frontend)
2. CONSULTAR  ──► Verificar sintaxis y buenas prácticas en documentación oficial
3. IMPLEMENTAR──► Aplicar el patrón recomendado para esa versión exacta
4. CITAR      ──► Justificar la decisión técnica en el código o en la spec
```

### Paso 1: Detección de Versiones Reales
Antes de escribir código conjetural, inspecciona las dependencias del proyecto:
- Backend: `package.json` (`"type": "module"`, `"typescript": "^5.6.0"`, `"@prisma/client": "^5.19.0"`).
- Frontend: `frontend/package.json` (`"vue": "^3.4.0"`, `"vite": "^5.4.0"`, `"tailwindcss": "^3.4.0"`).

### Paso 2: Validación contra Documentación Oficial
- **Prohibido adivinar:** Si una función de Prisma o Vue 3 no es familiar, valida su firma en la documentación oficial o archivos de tipos `.d.ts`.
- **Imports ESM:** TypeScript con resolución `NodeNext` exige sufijo `.js` en imports relativos (`import { fn } from './service.js'`), a pesar de que el archivo en disco sea `.ts`.

### Paso 3: Aplicación de Patrones Canónicos
- **En Vue 3:** Utilizar exclusivamente Composition API moderna con `<script setup>`. Prohibido introducir sintaxis arcaica de Options API (`data()`, `methods:`, `this.$emit`).
- **En Prisma:** Usar transacciones interactivas `prisma.$transaction(async (tx) => { ... })` con control de aislamiento.

---

## 3. Checklist de Verificación
- [ ] La sintaxis empleada corresponde a la versión real de `package.json`.
- [ ] No se utilizaron APIs marcadas como deprecadas en las versiones instaladas.
- [ ] Se evitaron "hacks" o soluciones parcheadas de foros obsoletos que contradigan los manuales oficiales.
