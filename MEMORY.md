# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- ERP/CRM en producción: Fase A/B, pedidos/domicilio, caja bimonetaria, créditos y WhatsApp.
- Spec 007 completada e implementada al 100%: Lotes y litros disponibles en Dashboard calculados exclusivamente desde Fase B (`BatchPackaging`), chips de multi-presentación (1L, 500ml, 80ml, etc.) limpios y concisos (ej. `[5x 1L]`, `[6x 500ml]`), desglose financiero en Ventas Totales (Ya Pagado vs Con Deuda / Encargos) y estandarización transversal de "botellas" a "envases / unidades".
- Typecheck (`npx tsc --noEmit`), build Vite (`npm --prefix frontend run build`) y tests (`tests/dashboard_phase_b.test.ts`) 100% en verde.
- Rama actual: `fix/dashboard-chips-and-sales-breakdown` (partiendo de `develop`).

## Decisiones (y por qué)
- Segregación estricta Fase A vs Fase B: solo fracciones envasadas con saldo libre (`freeLiters > 0.05`) constituyen producto terminado disponible para venta en Dashboard; fermentaciones base no se mezclan.
- Formateo limpio de chips (`cleanPresentationLabel` & `formatPresentationChip`): suprime prefijos redundantes de catálogo ("Botella", "plástica", "de", "pet") y renderiza `[Nx Label]` en badges visuales, evitando imprimir JSON crudo en la UI.
- Desglose de Ventas Totales: muestra el monto global facturado/encargado y subdivide en "Ya Pagado" (`totalCashCollected`) vs "Con Deuda" (`totalPendingToCollect`).
- Formato volumétrico adaptativo `formatLitersVolume`: suprime decimales para enteros (`4 L`) y preserva hasta 2 decimales para formatos pequeños (`0.08 L`, `4.16 L`).
- Estandarización a "envases / unidades": sustituye el término "botella(s)" en UI y comprobantes WhatsApp sin alterar columnas físicas en BD.

## Aprendizajes y errores a evitar
- Neon Pooler: peticiones secuenciales pesadas pueden reiniciar conexiones inactivas; agrupar aserciones de integración en una sola llamada analítica (`GET /api/dashboard/summary`).
- No imprimir objetos directos en interpolaciones Vue (`{{ chip }}`); usar siempre formateadores auxiliares como `formatPresentationChip(chip)`.
- En Windows PowerShell, encadenar comandos con `cmd.exe /c "..."` o ejecutarlos individualmente.

## Próximos pasos
- Ejecutar ciclo Git de integración: commit, push de rama temática, Pull Request a `develop`, sincronización, merge directo a `main` y solicitud de confirmación para borrar la rama.
