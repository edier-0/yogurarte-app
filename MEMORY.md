# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- Specs 001 a 014 completadas y sincronizadas en `main` y `develop`.
- Calidad en verde: `tsc` y build de frontend exitosos sin errores.
- Incidente de semillero resuelto al 100%:
  - Servidor MCP `@neondatabase/mcp-server-neon` configurado e instalado a nivel global con `NEON_API_KEY`.
  - Rama Time Travel (PITR) creada en Neon a las 18:00 UTC (13:00 COT).
  - Limpieza de datos demo residuales completada en producción.
  - Sincronización exacta completada: 41 pedidos, 35 pagos, 47 ítems, 17 movimientos de caja, 26 gastos, 1 crédito y 158 clientes restaurados con fidelidad total.
  - 9 plantillas oficiales de WhatsApp de Spec 014 preservadas intactas en `SystemWhatsAppTemplate`.

## Decisiones (y por qué)
- Instalación global de Neon MCP (`@neondatabase/mcp-server-neon`) en `mcp_config.json`: permite control programático de ramas y bases de datos desde el agente.
- Restauración selectiva con `restore_pitr.mjs`: reinserta entidades históricas respetando IDs, fechas y FKs mientras preserva nuevas tablas y plantillas sin alterar URLs de despliegue.
- Blindaje permanente en `prisma/seed.ts`: aborta toda llamada a `deleteMany` o inserción de pedidos demo cuando se detecte un entorno remoto/nube (`neon.tech`, `aws`, etc.).

## Aprendizajes y errores a evitar
- NUNCA correr scripts de semillero destructivos sobre bases de datos de producción.
- Usar siempre branches PITR en Neon para recuperar estados exactos previos a cualquier incidente sin tiempo de inactividad.

## Próximos pasos
- El usuario puede inspeccionar la vista de pedidos, caja y clientes en la aplicación para verificar la normalidad operativa.
