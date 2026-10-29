# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- App ERP/CRM en producción: Fase A/B, inventario, pedidos/domicilio, caja bimonetaria, créditos, personal y CRM WhatsApp.
- API canónica en `src/modules/` montada desde `src/app.ts`. `src/controllers|routes|schemas` son restos legacy.
- Spec 001 completada (T1 a T8): Rendimiento real en fraccionamiento (`baseLitersUsed`, `yieldPercentage`) y costeo neto de mermeladas implementados y verificados al 100% en backend y frontend.
- Auditoría de dependencias: 0 vulnerabilidades en producción tras blindar overrides (`body-parser`, `zod`, `follow-redirects`, `qs`, `nodemailer`).
- Auditoría de Fracciones (Fase B): visualización de base consumida, volumen comercial, rendimiento %, costo unitario real por botella y recaudo/cartera.

## Decisiones (y por qué)
- SDD y Rendimiento Real (Spec 001): `baseLitersUsed` desacopla los litros consumidos del tanque de los litros comerciales envasados. Fraccionamiento con almíbar o pulpa rinde más sin falsos bloqueos de capacidad.
- Costeo unitario exacto: la fracción calcula el costo lácteo solo sobre la base extraída (`baseLitersUsed * costPerLiter`) y suma envases y pulpas; el costo unitario por botella prorratea según capacidad.
- Mermeladas netas: la elaboración con fruta cruda y azúcar rinde una cantidad neta final mayor; el costo unitario por gramo se calcula dividiendo la inversión total entre el rendimiento real obtenido.
- Prisma en Neon DB: usar `findFirst` en vez de `findUnique` en operaciones críticas dentro de transacciones para evitar deadlocks de 20s y desconexiones `ConnectionReset` (error 10054 / P1017) del DataLoader.
- SDD y Constitución: `docs/constitution.md` fija supremacía de la spec, invariantes y ciclo Git (ramas temáticas desde develop -> develop -> main, y borrado con autorización previa).
- Zona Horaria y Hora del Dispositivo: formulaciones envían `getDeviceTimestamp` y unifican filtros en Colombia (`America/Bogota`), eliminando saltos nocturnos tras las 7:00 PM.
- Deuda calculada, no columna: evita saldos desfasados respecto a pagos. Excluye pedidos `CANCELLED`.
- Canales de pago unificados: solo Efectivo y Nequi en toda la interfaz para conciliar con arqueos físicos.

## Aprendizajes y errores a evitar
- Prisma DataLoader con `findUnique` en transacciones contra Neon: usar `findFirst` para evitar timeouts y conexión rota.
- En mensajes de validación de volumen, conservar el prefijo `Volumen insuficiente:` para mantener compatibilidad con las aserciones de la suite de pruebas.
- En `updateBatchPackaging`: si no se envía `baseLitersUsed` explícito, mantener la proporción de rendimiento previo o 1:1 para evitar congelar la base en un valor estático si se agregan más botellas.
- `vue-tsc` corre con `noUnusedLocals: true`: variables o imports no utilizados botan error y rompen el build.
- Auditoría de seguridad: parches de dependencias transitivas en producción se blindan mediante `overrides` en `package.json`.

## Próximos pasos
- Iniciar la especificación del libro de recetas bajo metodología SDD.
