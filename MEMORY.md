# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- ERP/CRM en producción: Fase A/B, pedidos/domicilio, caja bimonetaria, créditos y WhatsApp.
- Spec 007 completada e implementada al 100%: Lotes y litros disponibles en Dashboard calculados exclusivamente desde Fase B (`BatchPackaging`), chips de multi-presentación (1L, 500ml, 80ml, etc.) en despachos y stock, y estandarización transversal de "botellas" a "envases / unidades".
- Typecheck (`npx tsc --noEmit`) y empaquetado (`npm --prefix frontend run build`) 100% limpios. Suite de integración `tests/dashboard_phase_b.test.ts` y `tests/orders.test.ts` pasando en verde.
- Rama actual: `feat/dashboard-phase-b-stock-presentations`. Lista para confirmación de commit y ciclo Git (PR -> develop -> merge -> main).

## Decisiones (y por qué)
- Segregación estricta Fase A vs Fase B: solo las fracciones envasadas con saldo libre (`freeLiters > 0.05`) constituyen producto terminado disponible para la venta en el Dashboard; los tanques de fermentación base no se mezclan como stock para la venta.
- Formato volumétrico adaptativo `formatLitersVolume`: suprime decimales innecesarios para enteros (`4 L`) y preserva hasta 2 decimales para formatos pequeños (`0.08 L`, `4.16 L`).
- Estandarización a "envases / unidades": sustituye el término "botella(s)" en UI, modales, alertas y comprobantes de WhatsApp, manteniendo compatibilidad de columnas en la BD.
- Despacho multi-formato: desgloses en chips visuales (`[12x 1L] [13x 500ml] [50x 80ml]`) para entregas a clientes, consumo de socios y pedidos en curso.

## Aprendizajes y errores a evitar
- Neon Pooler: peticiones secuenciales pesadas pueden reiniciar conexiones inactivas; agrupar aserciones de integración en una sola llamada analítica (`GET /api/dashboard/summary`).
- No alterar nombres de columnas físicas de Prisma (`quantityBottles`, `bottles1LProduced`) para no comprometer la base de datos de producción.

## Próximos pasos
- Solicitar autorización del usuario para proceder con el commit, push y ciclo de Pull Request a `develop` y fusión a `main`.
