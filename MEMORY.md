# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- ERP/CRM en producción: Fase A/B, pedidos/domicilio, caja bimonetaria, créditos y WhatsApp.
- Constitución (v1.5.0) y `AGENTS.md` consagran el principio de rendimiento volumétrico por adición de mermeladas en Fase B y elaboraciones compuestas de inventario.
- Rama de trabajo activa: `feat/modal-dinamico-envasado-fase-b`.
- Spec 011 aprobada formalmente tras 3 rondas completas de revisión QA `/sdd-clarify` (`specs/011-modal-dinamico-envasado-fase-b/spec.md`).
- Plan de Arquitectura (`plan.md`) y desglose de Tareas (`tasks.md`) aprobados.
- Tarea T1 completada al 100%: suite de pruebas base `tests/dynamic_packaging_fase_b.test.ts` creada y esquemas Zod actualizados con `gramsPerBottle` y precios $\ge 0$.
- Tarea T2 completada al 100%: creación mono-presentación de Fase B en `batches.service.ts` con consumo en kg derivado de `gramsPerBottle`, rendimiento volumétrico $> 100\%$, vinculación estricta de pedidos por presentación y validación estricta de stock.
- Tarea T3 completada al 100%: edición e inmutabilidad en `updateBatchPackaging` con ajuste diferencial neto ($\text{newDelta} - \text{oldDelta}$) en Kardex, guardado con $\Delta = 0$ sin exigir stock adicional, y bloqueo estricto si $\text{nuevasBotellas} < \text{botellasEntregadas}$.
- Tareas T4, T5 y T6 completadas al 100%: rediseño de `PackagingModal.vue` a 3 capas fijas, pestañas interactivas mono-presentación con catálogo activo, campo de botellas único, base láctea reactiva (`isBaseLitersManual`), rendimiento expandido $> 100\%$, dosificación por botella (`gramsPerBottle`), pre-ventas filtradas con saldo libre remanente y banner de auditoría en fracciones mixtas históricas.
- Tarea T7 completada al 100%: 12/12 pruebas de la Spec 011 en verde, 41/41 pruebas de regresión en verde, `tsc` limpio y build Vite empaquetado sin errores.

## Decisiones (y por qué)
- Mono-presentación por fraccionamiento de Fase B: cada lote de Fase B (`BatchPackaging`) se envasa en un solo formato activo (100% 500ml, 1L, etc.) para simplificar costos unitarios, trazabilidad de lote y empaque.
- Rendimiento volumétrico por mermeladas (Constitución Art. 5.6): la base láctea queda fija según lo extraído del tanque de Fase A, pero el volumen envasado en botellas puede ser mayor por el aporte de mermeladas y almíbares (rendimiento > 100%). Prohibido forzar igualdad o sobrescribir la base del operario.
- Edición con pedidos entregados: se permite editar botellas producidas siempre que $\text{nuevasBotellas} \ge \text{botellasEntregadas}$, emitiendo advertencia si se afecta la cobertura de pedidos en preparación o integridad de inventario.
- Pre-ventas: saldo dinámico remanente; se bloquea vincular pedidos acumulados que superen las botellas libres del lote; cambiar de pestaña reinicia la selección; en pedidos mixtos solo se vincula la presentación activa.
- Preselección de 1 Litro (1L): activo por defecto al abrir el modal por rotación histórica (o la de menor capacidad si 1L estuviese inactiva).
- Bloqueo estricto por falta de stock: no permitir guardar si envases, etiquetas o fruta superan el stock registrado en inventario, protegiendo Kardex contra saldos negativos.
- Permitir precio $0 COP: válido para lotes destinados a degustación, muestras comerciales o donación.
- Cumplimiento constitucional: Art. 5.4 (`containers` como fuente única de verdad), Art. 6.2 (ajuste diferencial neto en Kardex; $\Delta = 0$ no exige stock adicional), Art. 9.2 (transacción atómica) y Art. 10.2 (modal de 3 capas fijas).

## Aprendizajes y errores a evitar
- No forzar que los litros envasados sean iguales a la base láctea cuando se adicionan mermeladas o fruta (balance de masa).
- Respetar siempre el valor fijado por el operario en `baseLitersUsed`.
- Cumplir estrictamente `git-pr-workflow`: nunca mergear directo a develop/main; pedir autorización antes de abrir y antes de fusionar PRs.

## Próximos pasos
- Solicitar autorización del usuario para abrir el Pull Request hacia `develop` conforme a `git-pr-workflow`.
