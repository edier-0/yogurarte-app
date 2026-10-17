# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- App ERP/CRM en uso: producción (Fase A/B), inventario, pedidos/domicilio, caja bimonetaria, créditos, personal y CRM WhatsApp (Baileys + Socket.IO).
- API canónica en `src/modules/` montada desde `src/app.ts`. Carpetas `src/controllers|routes|schemas` son restos; no son la fuente de verdad.
- Contexto de agentes listo: `AGENTS.md`, `MEMORY.md`, `.cursor/rules/` (español).
- Modales móviles: arquitectura de 3 capas fijas (`header` shrink-0, cuerpo `flex-1 overflow-y-auto`, `footer` shrink-0) en todos los modales del sistema, incluyendo auditorías (`BatchSummaryModal`, `PackagingSummaryModal`, `KardexModal`, `CashAuditBreakdownModal`).
- Auditoría de Fracciones (Fase B): visualización de recaudo efectivo en caja, deuda en la calle y meta neta a recaudar (con descuentos aplicados) por fracción, más badges de pago y saldos por pedido vinculado.
- Lotes y Descuentos: corregido bug de conversión a pre-venta con descuentos; auto-vínculo blindado y balances financieros proporcionales.
- Caja y Socios: registro de socios aportantes en `APORTE_SOCIO`, soporte de egreso `DEVOLUCION_APORTE` vinculado a `StaffMember` (rol `SOCIO`) y control interactivo de saldos de capital.
- Kardex y Stock: edición y eliminación de movimientos de almacén tanto en la pestaña general como en el modal específico por insumo, con recálculo atómico y restablecimiento del stock en BD.
- Directorio de Clientes & CRM: métricas globales reales (deuda en la calle y encargos en proceso sin sesgo de paginación), mensajería inteligente por estado y plantilla rápida `/gracias_pago`.

## Decisiones (y por qué)
- Recaudo y Cartera por Fracción: la meta a recaudar es el neto facturado con descuentos aplicados (`totalSoldRevenue`). El recaudo en caja (`totalPaidAmount`) y la deuda en calle (`totalPendingAmount`) se prorratean por pedido vinculado garantizando consistencia matemática exacta.
- Restablecimiento de stock en Kardex: al eliminar un movimiento se revierte `currentStock = currentStock - deltaQuantity`; al editarlo se aplica la diferencia neta `newDelta - oldDelta`, garantizando stock exacto sin distorsionar el costo promedio histórico.
- Validación de topes en aportes y base: `DEVOLUCION_APORTE` no puede exceder el aporte neto disponible del socio (`APORTE_SOCIO - DEVOLUCION_APORTE`) ni `RETIRO_BASE` la base neta disponible. El modal proyecta el descuento en tiempo real y bloquea montos excedentes.
- Kardex y Donaciones: ajustes de stock de materias primas sobrantes/regaladas no recalculan costo promedio unitario a cero para evitar distorsionar el costo real de producción de yogures.
- Aportes y Devoluciones a Socios: `CashMovement.staffMemberId` traza el socio en aportes de capital y en `DEVOLUCION_APORTE` (egreso no operativo que reduce caja sin inflar gastos del negocio).
- Deuda calculada, no columna: evita saldos desfasados respecto a pagos. Excluye pedidos `CANCELLED` tanto en deuda como en encargos.
- Métricas globales de clientes: computadas a nivel de BD para que los KPIs ("Deuda en la calle", "Encargos") no dependan de la página actual de 12 clientes.
- Mensajería contextual: 4 estados de cliente (Deuda pendiente, Encargo 100% pago, Encargo por cobrar, Saludo/Antojo de yogur) con previsualización editable en CRM antes del envío.
- Canales de pago unificados: solo Efectivo (Caja Menor) y Nequi en toda la interfaz; registros legacy se mapean a Nequi sin romper arqueos históricos.
- Caja por canal (efectivo vs Nequi/banco): refleja arqueos físicos reales. Tesorería acumulada nunca se filtra por fecha.
- Fallback externo WhatsApp: `buildWhatsAppUrl` universal para lidiar con números y LIDs de Baileys.

## Aprendizajes y errores a evitar
- `vue-tsc` corre con `noUnusedLocals: true`: variables o imports no utilizados botan error y rompen el build.
- Cierres de etiquetas en modales: al agregar la capa intermedia `flex-1 overflow-y-auto`, recordar cerrar siempre su `</div>` antes del pie fijo.
- `Expense` y `StaffPayment` tienen IDs autoincrementales independientes: en egresos de caja diferenciar siempre `isStaffPayment`.
- Baileys nunca debe auto-iniciarse en consultas `GET /status` ni dentro de `broadcastStatus()`. Código 440 jamás debe borrar credenciales en deploys.
- Pre-venta en pedidos: no catalogar como pre-venta cuando el lote ya fue seleccionado aunque sus litros libres sean 0 (porque el propio pedido los está consumiendo).
- npm ci en Docker/CI: npm 10.8 en Node 20 falla con bug de Arborist ("Cannot read properties of null (edgesOut)"). Resuelto actualizando a npm@11 en Dockerfile y GitHub Actions.
- Build backend y Prisma: "build:backend" debe ejecutar prisma generate antes de tsc y contar con "postinstall": "prisma generate" para despliegues en la nube.
- Cliente HTTP en frontend: Axios ya incluye baseURL '/api'; nunca invocar endpoints con '/api/...' para evitar rutas duplicadas como '/api/api/staff'.
- Auditoría de dependencias: se blindan dependencias transitivas mediante bloque 'overrides' en package.json para parches de seguridad (proxy-addr, compression, sharp, source-map-js).
- Compatibilidad API clientes: GET /api/customers sin paginate=true retorna array plano para retrocompatibilidad con tests y clientes externos; con paginate=true incluye metrics y pagination.
- Sincronización automática de BD: script start incluye 'npx prisma db push --skip-generate' para que Render sincronice el schema en Neon en cada despliegue.

## Próximos pasos
- Diseñar e implementar el libro flexible de recetas de yogures y mermeladas para estandarizar sabores y rendimiento.
