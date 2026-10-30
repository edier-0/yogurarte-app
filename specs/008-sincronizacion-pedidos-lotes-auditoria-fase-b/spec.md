# Spec 008 — Sincronización Integral de Pedidos, Lotes y Auditoría de Fase B
Estado: implementada

## Contexto y objetivo
Actualmente existe una discrepancia operativa entre las comandas comerciales y los lotes/fracciones envasadas:
1. En la auditoría del lote madre (Fase A), el volumen de litros vendidos descuenta correctamente los litros de los productos entregados o en preparación, pero en la lista de pedidos vinculados no aparecen las comandas si estas agrupan productos de múltiples lotes o si están asociadas a fracciones envasadas (Fase B).
2. Al editar una comanda comercial existente en el sistema, la proyección de la API omite la fracción envasada (`packagingId`), lo que provoca que el formulario degrade el ítem a preventa sin lote o asocie una fracción incorrecta. Al guardar, se desvinculan los productos de la fracción envasada de fresa (o del sabor correspondiente), haciendo que el pedido desaparezca de la auditoría de la fracción y que la cantidad disponible de stock no se actualice de forma reactiva en la interfaz.
3. El objetivo es garantizar la coherencia absoluta entre el stock disponible envasado, la visibilidad de los pedidos vinculados en todas las auditorías (Lote Madre y Fracción) y el refresco inmediato de los indicadores de stock tras cualquier edición, reconciliando además los pedidos históricos huérfanos en la base de datos.

## Usuarios
- **Operador / Vendedor**: Crea y edita comandas comerciales en mostrador y entregas a domicilio, requiriendo que la asignación de lote y fracción se mantenga intacta al editar cantidades o notas.
- **Administrador / Jefe de Producción**: Supervisa la auditoría de litros de fermentación (Fase A) y fraccionamiento (Fase B), requiriendo ver exactamente qué pedidos consumieron los litros producidos de cada sabor (especialmente Fresa).

## Historias de usuario
- **HU-1**: Como administrador de producción, quiero ver en la auditoría del lote madre todos los pedidos que han consumido litros de ese lote (ya sea directamente o mediante sus fracciones envasadas), para tener trazabilidad total de quién compró cada litro producido.
- **HU-2**: Como operador de ventas, quiero que al editar cualquier comanda se preserve la fracción envasada y el lote original asignado a cada producto, para que no se conviertan por error en preventas ni se altere el inventario real.
- **HU-3**: Como operador, quiero que al editar las cantidades o sabores de un pedido, el stock visible de los lotes y fracciones se refresque inmediatamente en pantalla sin tener que recargar el navegador.
- **HU-4**: Como administrador, quiero que los pedidos existentes en el sistema que tengan ítems de fresa (u otros sabores) desvinculados de su fracción se reconcilien de forma segura en la base de datos, para reflejar el balance real de inventario.

## Definiciones
- **Lote Madre (Fase A)**: Tanque de fermentación base (`ProductionBatch`).
- **Fracción Envasada (Fase B)**: Fraccionamiento con sabor, mermeladas y presentaciones comerciales específicas (`BatchPackaging`).
- **Pedido Vinculado**: Comanda comercial con al menos un ítem asociado al lote o a alguna de sus fracciones envasadas.

## Requisitos funcionales (EARS)
- **RF-1**: CUANDO un cliente o usuario consulte el listado general de pedidos (`GET /api/orders`), EL SISTEMA debe incluir obligatoriamente en cada producto el identificador de fracción envasada (`packagingId`) y los datos básicos de la fracción (`packaging`).
- **RF-2**: CUANDO se abra el modal de edición de una comanda existente, EL SISTEMA debe preservar la selección de la fracción envasada original asignada a cada ítem, validando la correspondencia exacta por sabor y presentación incluso si la fracción tiene saldo libre igual a cero.
- **RF-3**: SI un pedido contiene productos fraccionados en Fase B, ENTONCES EL SISTEMA debe asociar y persistir atómicamente el `packagingId` y su correspondiente `batchId` en cada registro de detalle (`OrderItem`).
- **RF-4**: CUANDO se consulte la auditoría y resumen de un lote madre (`getBatchSummary`), EL SISTEMA debe consolidar y listar en `linkedOrders` todos los pedidos comerciales que contengan al menos un producto perteneciente al lote madre o a cualquiera de sus fracciones envasadas.
- **RF-5**: CUANDO se complete la creación, actualización o eliminación de una comanda comercial, EL SISTEMA en el cliente debe invalidar y recargar inmediatamente los saldos de lotes y fracciones envasadas (`availablePackagings`, `packagings`, `batches` y `dashboard`).
- **RF-6**: CUANDO el formulario de pedido emita el evento de guardado exitoso, EL SISTEMA en la vista principal (Dashboard) debe refrescar de forma reactiva los indicadores y desgloses de stock.
- **RF-7**: EL SISTEMA debe proveer un proceso de reconciliación segura de base de datos que detecte pedidos activos con ítems de sabores correspondientes a fracciones envasadas existentes sin `packagingId` y los vincule de manera atómica sin alterar valores financieros ni duplicar descargos.

## Requisitos no funcionales
- **RNF-1 (Integridad Transaccional)**: Toda actualización de ítems y sincronización de estado de lote debe ejecutarse dentro de una transacción interactiva de base de datos.
- **RNF-2 (Rendimiento)**: La consolidación de pedidos en la auditoría del lote debe realizarse mediante índices relacionales sin provocar bloqueos ni consultas N+1 en bases de datos remotas.
- **RNF-3 (Compatibilidad)**: No alterar nombres de columnas físicas existentes en la base de datos de producción.

## Casos límite
- Pedido con ítems mixtos donde un producto es de un lote y otro producto es de un lote diferente: el pedido debe aparecer en la auditoría de ambos lotes, mostrando en cada auditoría los ítems correspondientes.
- Fracción con saldo libre 0L (totalmente vendida): al editar el pedido que consumió el último litro, la opción de esa fracción debe permanecer visible y seleccionada como "Asignación Actual" en el selector.
- Pedidos anulados (`CANCELLED`): deben excluirse de los litros vendidos y de la lista de auditoría del lote.

## Fuera de alcance
- Modificación del flujo de caja bimonetaria o registro de pagos.
- Creación de nuevas presentaciones o cambios al modelo físico de la base de datos (migraciones DDL de Prisma).

## Criterios de finalización
- La consulta de pedidos retorna `packagingId` en todos los ítems.
- Al editar un pedido asignado a una fracción envasada (ej. Fresa), no se degrada a preventa y mantiene su fracción.
- La auditoría del lote madre muestra el 100% de los pedidos que aportaron al total de litros vendidos.
- Al guardar cambios en un pedido, el stock visible en la vista de lotes y en el dashboard se actualiza inmediatamente.
- La base de datos queda reconciliada, enlazando pedidos de fresa huérfanos a su fracción correspondiente.
- Suite de pruebas de integración pasando en verde y empaquetado sin errores de tipado.

## Dudas abiertas
*No hay dudas abiertas; los requisitos y comportamientos esperados están claramente definidos.*
