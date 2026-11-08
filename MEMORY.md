# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- ERP/CRM en producción: Fase A/B, pedidos/domicilio, caja bimonetaria, créditos y WhatsApp.
- Constitución (v1.5.0) y AGENTS.md consagran el principio de rendimiento volumétrico por adición de mermeladas en Fase B y elaboraciones compuestas de inventario.
- Spec 011 y Spec 012 completadas al 100% y fusionadas en develop y main.
- Rama activa: `develop` (sincronizada con `main` tras merge del PR #30).
- Dockerfile Multi-Stage autónomo y resiliente: construcción rápida (<10s con caché), compatible con WSL2 y GitHub Actions. Contenedores `healthy` y tests 39/39 en verde.

## Decisiones (y por qué)
- Mono-presentación por fraccionamiento de Fase B: cada lote de Fase B (BatchPackaging) se envasa en un solo formato activo (100% 500ml, 1L, etc.) para simplificar costos unitarios, trazabilidad y empaque.
- Rendimiento volumétrico por mermeladas (Constitución Art. 5.6): base láctea fija, rendimiento comercial > 100%.
- Dockerfile Multi-Stage Autónomo e Híbrido:
  - Usa BuildKit cache mounts y `--ignore-scripts` para acelerar instalaciones y evitar bloqueos en WSL2.
  - Generación de Prisma condicional: reutiliza motor nativo en local si existe (0.3s) y genera de forma autónoma en CI/remoto.
  - Poda limpia con `npm prune --omit=dev` para generar imagen final hardened sin devDependencies.
- Eliminación de `sharp` de overrides: dependencia C++ huérfana de 35MB que congelaba la descarga.
- Entrypoint sin `db push` forzado: evita bloqueos de runtime; migraciones controladas.

## Aprendizajes y errores a evitar
- NUNCA usar cadenas de conexión reales como fallback en scripts o pruebas; requerir variables en `.env`.
- No ejecutar scripts de postinstall descontrolados (`@prisma/engines` intentaba descargar binarios al vuelo en npm ci; solucionado con `--ignore-scripts`).
- Siempre preguntar antes de abrir PR, antes de fusionar y antes de borrar ramas.

## Próximos pasos
- Consultar al usuario para autorización de limpieza de la rama `fix/docker-build-optimization` (local y remota).
