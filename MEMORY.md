# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- ERP/CRM en producción: Fase A/B, pedidos/domicilio, caja bimonetaria, créditos y WhatsApp.
- Constitución (v1.4.0) y `AGENTS.md` actualizados:
  - Directiva Git: aislamiento en ramas dedicadas, cero merges locales a ramas base, integración vía PR.
  - Protocolo de consultas: preguntar antes de abrir PR y antes de fusionarlo (salvo instrucción explícita de ejecutar todo).
  - El agente crea y fusiona el PR; confirmación obligatoria para eliminar ramas (local/remoto).
- Spec 010 completada (T1 a T6), fusionada en `develop` y `main`.
- Spec 011: optimización Docker Multi-Stage híbrida verificada con simulación CI completa. Contenedores `healthy` y tests 27/27 pasando.
- Rama activa: `fix/docker-build-optimization`.

## Decisiones (y por qué)
- Dockerfile Multi-Stage Autónomo e Híbrido:
  - Usa `--mount=type=cache,target=/root/.npm` y `--ignore-scripts` para acelerar instalaciones y evitar descargas lentas en WSL2.
  - Generación de Prisma condicional: si el host proveyó `node_modules/.prisma` lo reutiliza; si es CI en limpio (GitHub Actions), genera de forma autónoma.
  - Poda limpia con `npm prune --omit=dev` para generar imagen final hardened sin devDependencies.
- Eliminación de `sharp` de overrides: dependencia C++ huérfana de 35MB que congelaba la descarga.
- Entrypoint sin `db push` forzado: evita bloqueos de runtime; migraciones controladas.

## Aprendizajes y errores a evitar
- NUNCA usar cadenas de conexión reales como fallback en scripts o pruebas; requerir variables en `.env`.
- No ejecutar scripts de postinstall descontrolados (`@prisma/engines` intentaba descargar binarios al vuelo en npm ci; solucionado con `--ignore-scripts`).
- Siempre preguntar antes de abrir PR, antes de fusionar y antes de borrar ramas.

## Próximos pasos
- Solicitar aprobación del usuario para abrir PR de `fix/docker-build-optimization` contra `develop`.
