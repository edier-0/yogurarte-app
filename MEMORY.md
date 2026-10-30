# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- App ERP/CRM en producción: Fase A/B, inventario, pedidos/domicilio, caja bimonetaria, créditos, personal y CRM WhatsApp.
- API canónica en `src/modules/` montada desde `src/app.ts`. `src/controllers|routes|schemas` son restos legacy.
- Spec 001, 002 y 003 completadas y verificadas al 100%. Auditoría de dependencias: 0 vulnerabilidades en producción.
- Spec 004 completada al 100% en `feat/dynamic-product-presentations`: tareas T1 a T9 finalizadas y verificadas (typecheck limpio, frontend build limpio y 100% pruebas en verde).
- Se implementaron presentaciones dinámicas (1L $12k, 2L $24k, 500ml $8k), modal administrativo, pedidos reactivos, fraccionamiento en Fase B y fidelización proporcional con canje flexible hasta 1.0L a $0 COP.

## Decisiones (y por qué)
- Catálogo en DB `ProductPresentation`: permite agregar formatos nuevos (ej. 500 ml a $8.000) con envase opcional sin modificar código.
- Fidelización proporcional: botellas de 500 ml aportan 0.5 botellas equivalentes; canje flexible de hasta 1.0 L con salida $0 COP y descargo en lote (`PREMIO_FIDELIZACION`).
- Fase A puramente líquida; el envasado y presentaciones operan exclusivamente en Fase B.
- Plantillas de WhatsApp diferidas a Spec 005 para mantener entregas atómicas según SDD.
- Prisma en Neon DB: usar `select` específico en vez de `include` anidado para evitar timeouts con pooler PgBouncer.
- Deuda calculada, no columna: evita saldos desfasados respecto a pagos. Excluye pedidos `CANCELLED`.

## Aprendizajes y errores a evitar
- Prisma DataLoader con `findUnique` en transacciones contra Neon: usar `select` puntual para evitar timeouts y conexión rota.
- En mensajes de validación de volumen, conservar el prefijo `Volumen insuficiente:` para mantener compatibilidad con las aserciones de la suite de pruebas.
- En `updateBatchPackaging`: si no se envía `baseLitersUsed` explícito, mantener la proporción de rendimiento previo o 1:1.
- `vue-tsc` corre con `noUnusedLocals: true`: variables o imports no utilizados botan error y rompen el build.

## Próximos pasos
- Iniciar Spec 005 (Plantillas Centralizadas y Automatizadas de WhatsApp) bajo metodología SDD.



