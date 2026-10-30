# Spec 006 — Unificación Canónica de Insumos (`INSUMOS_EXTRA`), Sincronización de Gastos/Compras y Blindaje de Caja

Estado: implementada

## Contexto y objetivo
En YogurArte, la compra de insumos operativos y materias primas (tales como botellas plásticas de 1L, botellas de 500ml, frutas, leche, azúcar, etiquetas) se registra típicamente desde el módulo de Inventario (`PurchaseStockModal`), generando de forma simultánea un registro en la tabla `Purchase` (que incrementa las existencias físicas en `RawMaterial`) y un registro en la tabla `Expense` con categoría `INSUMOS_EXTRA` (que asienta la salida de dinero en la caja o banco según el método de pago).

Históricamente, existía una inconsistencia en el sistema:
- La base de datos y la mayoría de los módulos usaban la categoría técnica oficial **`INSUMOS_EXTRA`**.
- Sin embargo, en el servicio de finanzas (`finance.service.ts`) se introdujo de manera artificial el alias **`COMPRA_INSUMO`** y la etiqueta `"🥛 Compra Insumo"` al listar los egresos en el Historial de Caja (`CashView.vue`).

Al editar un egreso desde la interfaz de Caja (por ejemplo, para corregir el canal de pago de `EFECTIVO` a `NEQUI`):
1. El modal de edición envió el alias decorativo `"🥛 Compra Insumo"` o `COMPRA_INSUMO` al backend, corrompiendo la categoría real en la base de datos.
2. El algoritmo del libro de caja (`periodUnexpensedPurchases`), que busca compras huérfanas bajo `INSUMOS_EXTRA`, dejó de reconocer el gasto asociado y duplicó la transacción (mostrando una fila por Nequi y otra por Efectivo).
3. Al eliminar la fila duplicada en Efectivo, el sistema revirtió y descontó las unidades de `RawMaterial`, dejando la caja descontada por Nequi pero el inventario en cero.

El objetivo de esta especificación es:
1. **Unificación Canónica Total**: Erradicar el alias `COMPRA_INSUMO` de todo el sistema y estandarizar **`INSUMOS_EXTRA`** como el único identificador oficial en base de datos, backend y frontend.
2. **Sincronización Bidireccional Atómica**: Sincronizar en una sola transacción Prisma (`$transaction`) cualquier modificación de método de pago, monto o proveedor entre `Expense` y `Purchase`.
3. **Blindaje Anti-duplicados y Eliminación Consistente**: Garantizar que el libro de caja no duplique compras que ya tienen gasto, y que las reversiones de stock solo ocurran cuando se elimine conscientemente una compra.

---

## Usuarios
- **Administrador / Operador de Caja**: Administra arqueos de caja, registra gastos diarios y concilia transacciones en efectivo y canales digitales (Nequi / Bancolombia).
- **Encargado de Producción e Inventario**: Registra entradas de insumos y verifica el stock de envases y materias primas en el catálogo de inventario.

---

## Historias de usuario
- **HU-1**: Como operador de caja, quiero poder cambiar el método de pago (o cualquier otro campo) de una compra de insumos desde el Historial de Caja sin que la transacción se duplique en pantalla.
- **HU-2**: Como usuario, al editar el método de pago de un gasto de compra (ej. de Efectivo a Nequi), quiero que la compra original en inventario se actualice en sincronía con el mismo método de pago.
- **HU-3**: Como yogurtero o administrador, quiero que las existencias de insumos en inventario permanezcan firmes y no se resten de forma inadvertida por anomalías de sincronización en el historial de caja.

---

## Definiciones
- **`INSUMOS_EXTRA`**: Único identificador canónico para compras y gastos de materias primas, envases y consumibles en la tabla `Expense`.
- **Compra de Insumo (`Purchase`)**: Entrada física de materia prima o empaque que suma existencias a `RawMaterial` y registra costo unitario y total.
- **Libro Diario de Caja**: Vista unificada en `CashView.vue` que consolida entradas de ventas, aportes, retiros y egresos clasificados en canales bimonetarios (`EFECTIVO` y `NEQUI`/`BANCOLOMBIA`).

---

## Requisitos funcionales (EARS)

- **RF-1 (Estandarización Canónica y Erradicación de `COMPRA_INSUMO`)**:
  EL SISTEMA debe utilizar únicamente `INSUMOS_EXTRA` como identificador de categoría para compras de materia prima e insumos en todos los modelos, controladores, rutas, esquemas Zod, tiendas Pinia y componentes; EL SISTEMA debe eliminar cualquier asignación o dependencia de `'COMPRA_INSUMO'` en el backend (`finance.service.ts`) y frontend (`finance.store.ts`).

- **RF-2 (Sanitización Forzada en Backend)**:
  CUANDO se cree o actualice un gasto en `POST /api/expenses` o `PUT /api/expenses/:id`, SI el payload contiene una categoría que coincida con o contenga `'COMPRA_INSUMO'`, `'Compra Insumo'` o variantes con emojis, ENTONCES EL SISTEMA debe convertir automáticamente el campo `category` al valor canónico `'INSUMOS_EXTRA'` antes de persistirlo.

- **RF-3 (Preservación de Categoría en API de Flujo de Caja)**:
  CUANDO el backend construya el desglose de flujo de caja en `GET /api/finance/dashboard/summary` (o balances de caja), EL SISTEMA debe asignar en la propiedad `category` el valor real de base de datos (`INSUMOS_EXTRA`), y ubicar la etiqueta visual enriquecida (`'🥛 Compra Insumo'` o `'Materia Prima / Insumos'`) exclusivamente en la propiedad `categoryLabel`.

- **RF-4 (Saneamiento Defensivo en Frontend)**:
  CUANDO se prepare la edición de un egreso en `CashView.vue` (`openEditExpense`) o en `ExpenseFormModal.vue`, EL SISTEMA debe asegurar que `category` sea siempre un identificador canónico válido (`INSUMOS_EXTRA`, `COMBUSTIBLE`, `SERVICIOS_PUBLICOS`, `MANTENIMIENTO`, `OPERATIVO`, `NOMINA`, `RETIRO_SOCIO`, `OTRO`), impidiendo que etiquetas de visualización se propaguen al formulario.

- **RF-5 (Sincronización Bidireccional Atómica `Expense` $\leftrightarrow$ `Purchase` al Editar)**:
  CUANDO se actualice un gasto de categoría `INSUMOS_EXTRA` mediante `PUT /api/expenses/:id`, EL SISTEMA debe buscar la compra asociada en `Purchase` (por coincidencia de fecha en el mismo día y monto, o vinculación directa) y actualizar dentro de la misma transacción Prisma (`$transaction`) su `paymentMethod`, `supplier` y `totalCost`, manteniendo la consistencia de canales de pago entre caja y compras.

- **RF-6 (Blindaje del Detector de Compras no Asentadas `periodUnexpensedPurchases`)**:
  CUANDO el backend evalúe si una compra ya tiene un gasto registrado en el período, EL SISTEMA debe cotejar la compra contra los gastos verificando la categoría `INSUMOS_EXTRA` (y de forma tolerante cualquier registro histórico remanente), garantizando que jamás se duplique una compra que ya tiene un gasto registrado en el libro de caja.

- **RF-7 (Eliminación Segura y Atómica de Egresos)**:
  CUANDO se elimine un egreso mediante `deleteExpense`, SI el registro corresponde a una compra en `Purchase`, EL SISTEMA debe revertir el stock en inventario y eliminar atómicamente el gasto asociado; SI se elimina desde `Expense`, EL SISTEMA debe verificar si existe una compra asociada y sincronizar su eliminación de forma integral sin dejar datos huérfanos.

---

## Requisitos no funcionales
- **RNF-1 (Integridad y Transaccionalidad)**: Toda sincronización entre `Expense`, `Purchase` y `RawMaterial` debe ejecutarse en transacciones Prisma (`prisma.$transaction`).
- **RNF-2 (Consistencia Global)**: No deben existir discrepancias en los reportes de saldo entre el flujo de caja diario y el libro contable de gastos.
- **RNF-3 (Rigor en Pruebas)**: Cada flujo de normalización, edición sincronizada y no duplicación debe contar con cobertura automatizada en `tests/expenses.test.ts`.

---

## Casos límite
- **Edición exclusiva del método de pago**: Cambiar de `EFECTIVO` a `NEQUI` sin modificar monto ni proveedor debe actualizar `Purchase.paymentMethod` atómicamente y no generar duplicados.
- **Gastos operativos que no son compras**: Gastos de servicios, transporte o nómina no deben buscar ni alterar la tabla `Purchase`.
- **Múltiples compras en el mismo día**: La sincronización debe ser precisa por coincidencia exacta de fecha y monto.

---

## Fuera de alcance
- Modificar el costeo de lotes de yogur en Fase A o Fase B.
- Modificar el esquema de arqueos de caja o cuentas de usuario.

---

## Criterios de finalización
- [x] Pruebas automatizadas en `tests/expenses.test.ts` que validen:
  - Normalización forzada de categorías visuales o alias a `INSUMOS_EXTRA`.
  - Sincronización atómica de `paymentMethod` hacia `Purchase` al editar un gasto de insumos.
  - No duplicación de registros en el flujo de caja (`cashFlow.outflows`).
- [x] Eliminación completa de `COMPRA_INSUMO` en `finance.service.ts` y `finance.store.ts`.
- [x] Ajuste defensivo en `CashView.vue`, `ExpenseFormModal.vue` y `ExpensesView.vue`.
- [x] Suite completa de pruebas (`npx vitest run tests/expenses.test.ts`), `npx tsc --noEmit` y build frontend 100% en verde.
