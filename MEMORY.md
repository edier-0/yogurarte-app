# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- Specs 001 a 014 completadas y sincronizadas en `main` y `develop`.
- Calidad en verde: `tsc`, build Vite y pruebas unitarias de schemas pasando 5/5.
- Fix de conmutación de disparo asistido (`autoTrigger`):
  - Error resuelto: `Invalid input: expected string, received undefined`.
  - Causa: `updateSystemTemplateSchema` requería obligatoriamente `content` como string no nulo, provocando fallo de validación Zod al enviar únicamente `{ autoTrigger: true/false }` desde la tarjeta de plantilla.
  - Solución: `content` ahora es opcional en `crm.schema.ts` (con validación de al menos un campo) y `TemplatesTab.vue` envía contexto completo `{ content: tpl.content, autoTrigger: nextVal }`.

## Decisiones (y por qué)
- Esquema Zod `updateSystemTemplateSchema` flexible: soporta actualización parcial REST permitiendo actualizar `content`, `autoTrigger` o ambos sin forzar payloads redundantes.

## Aprendizajes y errores a evitar
- Los esquemas Zod de actualización parcial (`PUT`/`PATCH`) deben permitir que sus campos sean opcionales y usar `.refine` para exigir al menos un campo, evitando rechazar peticiones con `received undefined`.

## Próximos pasos
- Abrir Pull Request con el fix de conmutación de disparo asistido, fusionar a `develop` y sincronizar a `main`.
