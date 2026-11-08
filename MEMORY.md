# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- ERP/CRM en producción: Fase A/B, pedidos/domicilio, caja bimonetaria, créditos y WhatsApp.
- Constitución (v1.5.0) y AGENTS.md consagran el principio de rendimiento volumétrico por adición de mermeladas en Fase B y elaboraciones compuestas de inventario.
- Spec 011 completada al 100% y fusionada en develop y main (modal dinámico mono-presentación de Fase B, cálculo de kg por gramsPerBottle, ajuste diferencial en Kardex).
- Spec 012 completada al 100%: optimización Docker Multi-Stage híbrida verificada con simulación CI completa. Contenedores `healthy` y tests en verde.
- Rama activa: `fix/docker-build-optimization`.

## Decisiones (y por qué)
- Mono-presentación por fraccionamiento de Fase B: cada lote de Fase B (BatchPackaging) se envasa en un solo formato activo (100% 500ml, 1L, etc.) para simplificar costos unitarios, trazabilidad y empaque.
- Rendimiento volumétrico por mermeladas (Constitución Art. 5.6): base láctea fija, rendimiento comercial > 100%.
- Dockerfile Multi-Stage Autónomo e Híbrido:
  - Usa BuildKit cache mounts y `--ignore-scripts` para acelerar instalaciones y evitar descargas lentas en WSL2.
  - Generación de Prisma condicional: si el host proveyó `node_modules/.prisma` lo reutiliza (0.3s); si es CI en limpio (GitHub Actions), genera de forma autónoma.
  - Poda limpia con `npm prune --omit=dev` para generar imagen final hardened sin devDependencies.
- Eliminación de `sharp` de overrides: dependencia C++ huérfana de 35MB que congelaba la descarga.
- Entrypoint sin `db push` forzado: evita bloqueos de runtime; migraciones controladas.

## Aprendizajes y errores a evitar
- NUNCA usar cadenas de conexión reales como fallback en scripts o pruebas; requerir variables en `.env`.
- No ejecutar scripts de postinstall descontrolados (`@prisma/engines` intentaba descargar binarios al vuelo en npm ci; solucionado con `--ignore-scripts`).
- Siempre preguntar antes de abrir PR, antes de fusionar y antes de borrar ramas.

## Próximos pasos
- Solicitar aprobación del usuario para abrir PR de `fix/docker-build-optimization` contra `develop`.
