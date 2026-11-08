# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- ERP/CRM en producción: Fase A/B, pedidos/domicilio, caja bimonetaria, créditos y WhatsApp.
- Constitución (v1.5.0) y AGENTS.md consagran el principio de rendimiento volumétrico por adición de mermeladas en Fase B y elaboraciones compuestas de inventario.
- Rama activa: develop (sincronizada con main tras merge del PR #29).
- Spec 011 completada al 100%: modal dinámico mono-presentación de Fase B, cálculo de kg por gramsPerBottle, ajuste diferencial en Kardex, pre-ventas con saldo remanente y modo edición seguro.
- 12/12 tests de Spec 011 en verde, 41/41 tests de regresión en verde, tsc con 0 errores y build Vite limpio en 5.78s.

## Decisiones (y por qué)
- Mono-presentación por fraccionamiento de Fase B: cada lote de Fase B (BatchPackaging) se envasa en un solo formato activo (100% 500ml, 1L, etc.) para simplificar costos unitarios, trazabilidad de lote y empaque.
- Rendimiento volumétrico por mermeladas (Constitución Art. 5.6): la base láctea queda fija según lo extraído del tanque de Fase A, pero el volumen envasado en botellas puede ser mayor por el aporte de mermeladas y almíbares (rendimiento > 100%). Prohibido forzar igualdad o sobrescribir la base del operario.
- Edición con pedidos entregados: se permite editar botellas producidas siempre que nuevasBotellas >= botellasEntregadas, emitiendo advertencia si se afecta la cobertura de pedidos en preparación o integridad de inventario.
- Pre-ventas: saldo dinámico remanente; se bloquea vincular pedidos acumulados que superen las botellas libres del lote; cambiar de pestaña reinicia la selección; en pedidos mixtos solo se vincula la presentación activa.
- Preselección de 1 Litro (1L): activo por defecto al abrir el modal por rotación histórica (o la de menor capacidad si 1L estuviese inactiva).
- Bloqueo estricto por falta de stock: no permitir guardar si envases, etiquetas o fruta superan el stock registrado en inventario, protegiendo Kardex contra saldos negativos.
- Permitir precio $0 COP: válido para lotes destinados a degustación, muestras comerciales o donación.
- Cumplimiento constitucional: Art. 5.4 (containers como fuente única de verdad), Art. 6.2 (ajuste diferencial neto en Kardex; delta = 0 no exige stock adicional), Art. 9.2 (transacción atómica) y Art. 10.2 (modal de 3 capas fijas).

## Aprendizajes y errores a evitar
- No forzar que los litros envasados sean iguales a la base láctea cuando se adicionan mermeladas o fruta (balance de masa).
- Respetar siempre el valor fijado por el operario en baseLitersUsed.
- Cumplir estrictamente git-pr-workflow: nunca mergear directo a develop/main; pedir autorización antes de abrir PR, fusionar PR y borrar ramas.

## Próximos pasos
- Spec 011 finalizada y cerrada al 100%. Sistema listo en develop y main para nuevas características o requerimientos de negocio.
