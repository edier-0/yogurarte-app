# Spec 013 — Flexibilidad Integral Multi-Presentación en Pedidos, Suscripciones Recurrentes, Auditoría y Fidelización

Estado: lista para aprobación

## Contexto y objetivo
El negocio de YogurArte comercializa yogur artesanal en diversas presentaciones comerciales activas en su catálogo (actualmente 500 ml, 1 Litro y 2 Litros, con capacidad de agregar nuevos formatos como vasos de 80 ml / 150 ml, botellas de 250 ml o galones).

Aunque las especificaciones previas (Spec 004, Spec 010 y Spec 011) introdujeron el catálogo dinámico y el fraccionamiento mono-presentación en Fase B, persistían cuellos de botella operativos:
1. **Asignación de lotes en pedidos sin discriminación de presentación**: En el formulario de pedidos, el selector de fracciones envasadas exhibía etiquetas rígidas de "0 de 1L / 0 de 2L" para productos envasados en 500 ml, y permitía vincular ítems de una medida a lotes envasados en otra medida diferente o con stock insuficiente.
2. **Suscripciones recurrentes bloqueadas a 1L y 2L**: El módulo de clientes recurrentes rechazaba a nivel de validación cualquier presentación distinta de 1L y 2L, impidiendo que clientes frecuentes programaran entregas periódicas de 500 ml u otras medidas, calculando precios y volúmenes fijos ($12.000 / $22.000) y limitando la orden a un solo ítem mono-producto.
3. **Segregación estricta de fases de producción**: De acuerdo con el Artículo 5.5 de la Constitución, el Lote Madre (Fase A) permanece estrictamente reservado para el balance de base láctea a granel y litros transferidos, mientras que las botellas, salidas y entregas comerciales pertenecen exclusivamente a las fracciones envasadas (Fase B).
4. **Vinculación masiva de pedidos sin filtro de presentación**: Al enlazar comandas en pre-venta a fracciones de Fase B, el sistema solo verificaba coincidencia de sabor y volumen en litros, permitiendo que un pedido de 500 ml se descontara indebidamente de una fracción envasada en botellas de 1L.
5. **Regla clara de canje de fidelización (10+1)**: El beneficio de 10+1 debe quedar formalizado y acotado estrictamente a la entrega de 1 envase de 1 Litro o 2 envases de 500 ml (pudiendo ser de sabores diferentes), sin superar bajo ninguna circunstancia 1.0 Litro total.

El objetivo de esta especificación es **desacoplar de raíz cualquier condicional rígido de 1L/2L en todo el ERP/CRM**, garantizando consistencia física estricta entre pedidos y lotes tanto en interfaz como en backend, permitiendo suscripciones recurrentes multi-ítem con precios actualizados del catálogo, blindando transaccionalmente el canje de fidelización con validación de cartera al día y alineando la auditoría de producción con la Constitución.

---

## Usuarios
- **Operador de Ventas / Mostrador**: Registra comandas directas y pre-ventas, requiriendo que al seleccionar una presentación solo se puedan asociar fracciones envasadas en esa misma medida física con stock real suficiente para satisfacer la cantidad solicitada.
- **Administrador de CRM / Fidelización**: Gestiona las suscripciones periódicas de clientes frecuentes con canastas mixtas de presentaciones y sabores, y entrega premios de fidelización de hasta 1L a clientes a paz y salvo en cartera.
- **Jefe de Producción / Administrador**: Supervisa balances de inventario y auditorías de lotes, requiriendo que todas las salidas y existencias reflejen dinámicamente las unidades exactas por formato en Fase B y el balance a granel en Fase A.

---

## Historias de usuario
- **HU-1**: Como operador de ventas, al elegir una presentación (ej. 500 ml) en una fila de pedido, quiero que el selector de lotes me muestre únicamente las fracciones de Fase B envasadas en esa presentación exacta con sus unidades disponibles (`freeUnits >= 1`), para no mezclar envases de tamaños diferentes en el inventario.
- **HU-2**: Como operador de ventas, si la cantidad solicitada en un ítem supera las unidades disponibles de un lote, quiero que el sistema me advierta y me impida asignarlo si no alcanza para la cantidad completa, guiándome a seleccionar otro lote con stock suficiente o a dividir en dos pedidos separados para no bloquear entregas de ítems listos.
- **HU-3**: Como operador de ventas, al editar una comanda previa cuyo lote asignado ya no tiene stock libre en almacén, quiero que el sistema preserve visible la opción como "Asignación Actual" sin forzar su degradación a pre-venta.
- **HU-4**: Como administrador de CRM, quiero crear y editar suscripciones periódicas para clientes frecuentes que contengan canastas mixtas de productos (ej. 2x 1L Fresa + 2x 500ml Melocotón), compartiendo una fecha concisa de entrega y cotizando siempre al precio vigente del catálogo.
- **HU-5**: Como operador, al generar o despachar un pedido desde una suscripción recurrente periódica, quiero que la comanda comercial se cree con el desglose exacto de todos sus ítems al precio oficial vigente del catálogo al momento de la generación, deteniendo el proceso si algún producto fue descontinuado.
- **HU-6**: Como cliente y administrador de fidelización, al acumular 10 litros equivalentes de compra entregada y pagada y estando al día en cartera, quiero redimir mi recompensa eligiendo estrictamente entre 1 envase de 1 Litro o 2 envases de 500 ml (pudiendo elegir dos sabores distintos a costo $0 COP), descargando el producto de la fracción correspondiente de forma atómica y consistente.
- **HU-7**: Como jefe de producción, al consultar la auditoría del Lote Madre (Fase A), quiero ver el balance lácteo crudo, la base a granel obtenida y la lista de fracciones envasadas con su formato mono-presentación y litros transferidos, sin mezclar columnas fijas de botellas comerciales en la tina de fermentación.
- **HU-8**: Como operador, al vincular pedidos en pre-venta a una fracción de Fase B, quiero que el sistema liste únicamente los pedidos pendientes que soliciten el sabor y la presentación comercial exacta de dicha fracción.

---

## Definiciones
- **Presentación Comercial (`ProductPresentation`)**: Formato físico en el que se comercializa el producto (ej. "500ml", "1L", "2L"), con capacidad volumétrica en litros (`capacityLiters`), precio predeterminado (`defaultPrice`) e insumo de envase asociado.
- **Lote de Fase B Mono-Presentación**: Fracción envasada (`BatchPackaging`) producida en un único formato de envase comercial.
- **Unidades Físicas Libres (`freeUnits`)**: Cantidad de envases disponibles en una fracción envasada de Fase B, calculada como $\text{unidades producidas} - \text{unidades vendidas} - \text{unidades retiradas}$.
- **Validación Estricta de Asignación y Capacidad**: Regla bidireccional (frontend y backend) que prohíbe asociar un ítem de pedido a una fracción envasada si sus presentaciones comerciales difieren o si la cantidad solicitada supera las unidades físicas libres disponibles ($\text{cantidad} > \text{freeUnits}$).
- **Suscripción Recurrente Mixta**: Programación periódica de abastecimiento para un cliente que contiene una colección de uno o más ítems con cantidades, presentaciones y sabores independientes, compartiendo una única periodicidad (`frequencyDays`) y próxima fecha (`nextDate`).
- **Acumulador de Fidelización Proporcional**: Contador de avance hacia la meta de fidelización calculado en base a botellas de 1 L equivalentes ($\sum \text{totalLiters} / 1.0$), donde cada presentación aporta exactamente su volumen comercial en litros (1L aporta 1.0, 500ml aporta 0.5, 2L aporta 2.0 y 150ml aporta 0.15 unidades equivalentes), en estricto apego al Artículo 7.2 de la Constitución.
- **Canje de Recompensa 10+1**: Entrega a $0 COP de producto terminado que cumple estrictamente la regla autorizada: 1 unidad de 1 Litro (1.0 L) o 2 unidades de 500 ml (1.0 L, admitiendo sabores iguales o distintos), condicionada a que el cliente no tenga cartera en mora.

---

## Requisitos funcionales (EARS)

### 1. Coherencia Estricta entre Presentación de Pedido y Lote en Fase B
- **RF-1 (Filtrado de Lotes por Presentación Idéntica)**:
  CUANDO el usuario seleccione o cambie la presentación comercial de un ítem en el formulario de pedidos, EL SISTEMA debe filtrar las opciones de lote disponible mostrando exclusivamente las fracciones de Fase B cuya presentación coincida de forma idéntica con la presentación seleccionada y cuenten con al menos una unidad física libre ($\text{freeUnits} \ge 1$).
- **RF-2 (Rotulado de Unidades Físicas Reales)**:
  CUANDO el usuario consulte el listado de lotes en el selector del ítem de pedido, EL SISTEMA debe rotular cada opción indicando el sabor, código de fracción y las unidades físicas libres en esa presentación específica (ej. `Fresa — LOTE-20261108-01-F01 (24 unds disponibles)`), suprimiendo cualquier texto rígido que asuma conteos de 1L o 2L.
- **RF-3 (Restricción Determinista a Pre-venta)**:
  SI para la presentación seleccionada no existen fracciones envasadas de Fase B con al menos una unidad física disponible ($\text{freeUnits} < 1$), ENTONCES EL SISTEMA debe restringir la asignación para nuevos ítems exclusivamente a la opción de pre-venta (`Pre-venta: Encargo anticipado sin lote`).
- **RF-4 (Validación de Stock Suficiente en Asignación en UI)**:
  CUANDO el usuario intente asignar una fracción de Fase B a un ítem cuya cantidad solicitada supere las unidades físicas libres del lote ($\text{cantidad} > \text{freeUnits}$), EL SISTEMA debe alertar al operador de que el lote no alcanza para cubrir la cantidad solicitada e impedir la asignación, indicando que seleccione otro lote con saldo suficiente o divida la solicitud en dos pedidos separados (uno para entrega inmediata con el lote actual y otro en pre-venta a la espera de un nuevo lote), para cumplir la regla de bloqueo de entrega de pedidos con pre-ventas (Spec 005).
- **RF-5 (Preservación de Lote y Control de Incremento en Edición Histórica)**:
  SI se edita una comanda existente que ya poseía una fracción asignada cuyo saldo libre sea actualmente cero ($\text{freeUnits} = 0$), ENTONCES EL SISTEMA debe preservar dicha fracción visible y seleccionada bajo la categoría "Asignación Actual". SI el usuario incrementa la cantidad solicitada en ese ítem, EL SISTEMA debe validar que el incremento neto no supere las unidades libres actuales del lote ($\text{nuevaCantidad} - \text{cantidadOriginal} \le \text{freeUnits}$), impidiendo registrar el exceso en ese lote si no hay existencias libres adicionales.
- **RF-6 (Cambio Reactivo de Presentación en Ítem con Lote)**:
  CUANDO el usuario cambie la presentación comercial de un ítem que ya tenía una fracción envasada asignada, EL SISTEMA debe desvincular automáticamente el lote asignado, reestablecer el estado del ítem a pre-venta sin lote y actualizar el precio unitario sugerido al precio predeterminado de la nueva presentación en el catálogo.
- **RF-7 (Validación de Integridad y Stock en Backend)**:
  CUANDO se procese el guardado o actualización de un pedido comercial en el servidor (`orders.service.ts`), EL SISTEMA debe validar rigurosamente:
  1. Que ningún ítem quede asociado a una fracción de Fase B cuya presentación difiera de la registrada en el ítem.
  2. Que la cantidad asignada no supere las unidades físicas libres de la fracción ($\text{cantidad} \le \text{freeUnits}$ para nuevas asignaciones, o $\Delta \le \text{freeUnits}$ en aumentos de cantidad).
  SI se detecta discrepancia de presentación o déficit de stock, ENTONCES EL SISTEMA debe rechazar la transacción con error HTTP 400 descriptivo.
- **RF-8 (Resolución Dinámica de Precios y Volúmenes)**:
  EL SISTEMA debe resolver el volumen en litros (`litersPerUnit`) y el precio unitario sugerido (`unitPrice`) consultando directamente la capacidad (`capacityLiters`) y precio oficial (`defaultPrice`) del catálogo activo de presentaciones, normalizando la búsqueda sin distinción de mayúsculas o espacios marginales.

### 2. Suscripciones Recurrentes Mixtas y Dinámicas
- **RF-9 (Estructura Multi-Ítem de Suscripción Mixta)**:
  EL SISTEMA debe permitir que una suscripción recurrente contenga uno o múltiples ítems configurables (canasta mixta), donde cada ítem especifique: sabor (del catálogo de sabores activos), presentación comercial (del catálogo de presentaciones activas) y cantidad de envases ($\ge 1$).
- **RF-10 (Cardinalidad y Periodicidad Concisa por Suscripción)**:
  EL SISTEMA debe permitir que un mismo cliente tenga una o múltiples suscripciones recurrentes activas simultáneamente en el módulo CRM (ej. una entrega semanal para un local comercial y una quincenal para el hogar). Cada suscripción aplicará su propia periodicidad en días (`frequencyDays`), próxima fecha de entrega (`nextDate`) y canasta de productos independiente.
- **RF-11 (Esquema Zod Dinámico)**:
  EL SISTEMA debe validar el campo de presentación en suscripciones recurrentes como una cadena no vacía correspondiente a un identificador activo del catálogo de presentaciones, eliminando la enumeración rígida `z.enum(['1L', '2L'])`.
- **RF-12 (Cotización con Precio Vigente del Catálogo)**:
  CUANDO se visualice una suscripción recurrente o se genere una comanda comercial desde la misma, EL SISTEMA debe cotizar cada ítem adoptando automáticamente el precio oficial vigente en el catálogo de presentaciones (`defaultPrice`) al momento de la consulta o generación, asegurando que las órdenes periódicas adopten las tarifas vigentes del negocio.
- **RF-13 (Generación de Comandas y Pausa ante Productos Descontinuados)**:
  CUANDO se procese el despacho periódico o se ejecute la acción manual de "Generar Comanda" desde una suscripción recurrente, EL SISTEMA debe verificar la vigencia de todos los sabores y presentaciones de la canasta.
  SI uno o más productos fueron desactivados en el catálogo (`isActive: false`), ENTONCES EL SISTEMA debe detener la creación automática de la orden comercial, alertar al operador indicando exactamente qué producto está descontinuado y requerir la actualización de la canasta en CRM antes de despachar.
  SI todos los productos están activos, EL SISTEMA debe crear un pedido comercial con estado `PENDING`, copiando cada ítem con precios vigentes en modalidad de pre-venta.

### 3. Regla Estricta de Canje de Fidelización (10+1)
- **RF-14 (Cálculo Proporcional de Fidelización por Litros Equivalentes)**:
  EL SISTEMA debe acumular el progreso de fidelización dividiendo los litros totales entregados y pagados del cliente entre 1.0 Litro ($\sum \text{totalLiters} / 1.0$). Cada envase aportará de acuerdo a su capacidad volumétrica real en litros (ej. 1L aporta 1.0, 500 ml aporta 0.5, 2L aporta 2.0 y 150 ml aporta 0.15 unidades equivalentes).
- **RF-15 (Habilitación de Canje Condicionada a Paz y Salvo en Cartera)**:
  CUANDO un cliente alcance al menos 10.0 unidades equivalentes acumuladas Y no registre saldo pendiente de pago en sus pedidos entregados (deuda de cartera = $0 COP), EL SISTEMA debe habilitar la opción de canje de recompensa.
  SI el cliente registra facturas o pedidos entregados con saldo pendiente de pago ($\text{pendingAmount} > 0$), ENTONCES EL SISTEMA debe bloquear el canje e indicar de forma visible que el cliente debe estar a paz y salvo en cartera para recibir el premio a $0 COP.
- **RF-16 (Opciones de Canje Exclusivas y Cerradas)**:
  CUANDO se registre la redención de una recompensa de fidelización, EL SISTEMA debe restringir la selección a dos modalidades autorizadas:
  1. `1 envase de 1 Litro (1.0 L)`
  2. `2 envases de 500 ml (1.0 L)`
- **RF-17 (Soporte Multi-Sabor y Validación Atómica en Canje de 500 ml)**:
  CUANDO el usuario seleccione la opción de "2 envases de 500 ml", EL SISTEMA debe permitir seleccionar el mismo sabor o dos sabores diferentes, validando que ambas fracciones de Fase B cuenten con al menos 1 unidad física libre disponible ($\text{freeUnits} \ge 1$). SI cualquiera de las dos fracciones seleccionadas carece de saldo libre en el momento exacto de la confirmación, ENTONCES EL SISTEMA debe abortar la transacción completa atómicamente y notificar al operador cuál sabor o fracción carece de existencias.
- **RF-18 (Bloqueo de Excesos y Combinaciones Inválidas)**:
  SI la selección de canje supera 1.0 Litro total o no corresponde a una de las dos modalidades autorizadas, ENTONCES EL SISTEMA debe inhabilitar la confirmación y alertar que la recompensa no puede exceder 1.0 Litro.
- **RF-19 (Descargo Transaccional y Preservación de Remanente)**:
  CUANDO se confirme la entrega del premio de fidelización dentro de una transacción interactiva (`prisma.$transaction`), EL SISTEMA debe:
  1. Descontar las unidades físicas de las fracciones envasadas de Fase B seleccionadas a valor $0 COP con motivo explícito `PREMIO_FIDELIZACION`.
  2. Incrementar el contador de canjes del cliente (`loyaltyRedeemedCount += 1`).
  3. Preservar en el acumulador el remanente fraccionario excedente (ej. si acumulaba 10.4 unidades equivalentes, conserva 0.4 para el siguiente ciclo).

### 4. Trazabilidad y Segregación Constitucional de Fases de Producción
- **RF-20 (Vinculación Masiva Filtrada por Presentación y Sabor)**:
  CUANDO se listen pedidos pendientes para vinculación masiva a una fracción de Fase B (`PackagingSummaryModal` o servicio `linkOrdersToPackaging`), EL SISTEMA debe listar y vincular exclusivamente aquellas órdenes cuyos ítems coincidan simultáneamente en **sabor** y en la **presentación comercial exacta** de dicha fracción.
- **RF-21 (Auditoría del Lote Madre Reservada a Granel - Constitución Art. 5.5)**:
  EL SISTEMA debe mantener la auditoría del Lote Madre (Fase A en `BatchSummaryModal`) dedicada con exclusividad al balance de materia prima cruda (leche/cultivo), base líquida producida y litros transferidos a Fase B. La tabla de fracciones envasadas exhibirá el código, fecha, sabor, presentación y litros de base transferidos, prohibiendo la inclusión de columnas fijas de botellas comerciales en la auditoría de fermentación.
- **RF-22 (Auditoría Dinámica Exclusiva de Fase B)**:
  EL SISTEMA debe concentrar la auditoría de envases producidos, vendidos, retirados y disponibles exclusivamente en el modal de auditoría de Fase B (`PackagingSummaryModal`), reflejando con exactitud centesimal el balance unitario de su formato comercial.

### 5. Descargos y Retiros de Socios
- **RF-23 (Cálculo Económico por Presentación)**:
  CUANDO se registre un consumo de socio o baja sobre una fracción envasada en Fase B, EL SISTEMA debe adoptar automáticamente la capacidad volumétrica y el precio oficial de la presentación de dicha fracción para calcular el impacto financiero exacto.
- **RF-24 (Prohibición de Retiro Directo en Fase A)**:
  EL SISTEMA debe rechazar cualquier intento de registrar retiros de producto terminado o consumos de socios directamente sobre un Lote Madre de fermentación (Fase A), canalizando todo retiro sobre fracciones envasadas de Fase B.

---

## Requisitos no funcionales
- **RNF-1 (Integridad Transaccional)**: La creación de pedidos, la generación de comandas periódicas y el canje de fidelización deben ejecutarse dentro de transacciones interactivas atómicas (`prisma.$transaction`).
- **RNF-2 (Compatibilidad de Esquema y Persistencia No Destructiva)**: La persistencia de datos debe preservar los nombres de columnas físicas existentes (`bottleSize`, etc.) para no requerir migraciones DDL destructivas ni afectar registros históricos, implementando modelos o campos aditivos para ítems recurrentes múltiples.
- **RNF-3 (Precisión Numérica Adaptativa)**: Todo cálculo volumétrico derivado de presentaciones debe redondearse a 2 decimales significativos, soportando con exactitud formatos pequeños (ej. 80 ml = 0.08 L).
- **RNF-4 (Usabilidad Móvil y Desktop)**: Los formularios de pedidos y suscripciones recurrentes deben construirse bajo la arquitectura de modales de 3 capas fijas estipulada en el Artículo 10.2 de la Constitución.

---

## Casos límite
- **CL-1**: Pedido con ítems donde un lote tiene saldo parcial insuficiente (ej. solicita 5 de 500ml pero el lote solo tiene 3 libres): el sistema bloquea la asignación tanto en la UI como en el backend con HTTP 400 y orienta al operador a seleccionar otro lote con disponibilidad suficiente o a dividir la comanda en dos pedidos independientes para poder entregar el primero sin violar la restricción de pre-ventas (Spec 005).
- **CL-2**: Cliente con 20 litros acumulados de fidelización (2 premios disponibles): el sistema permite redimir un premio (1L o 2x 500ml) manteniendo disponible el segundo premio para un canje posterior.
- **CL-3**: Redención de fidelización en 2 envases de 500 ml con sabores mixtos donde una fracción se agota concurrentemente: el sistema aborta la transacción sin cambios en inventario e informa con precisión qué sabor carece de existencias.
- **CL-4**: Edición de un pedido histórico que tenía asignado un lote y se incrementa la cantidad solicitada: el sistema valida que el incremento neto no supere las unidades libres actuales del lote ($\Delta \le \text{freeUnits}$). Si no alcanza, bloquea el guardado del exceso en ese lote y orienta a registrar las unidades adicionales como un nuevo ítem en pre-venta.
- **CL-5**: Fracción envasada en formato no tradicional (ej. vaso cuchareable de 80 ml): el sistema permite registrar comandas, controlar stock unitario y auditar el lote sin requerir conversiones manuales.
- **CL-6**: Suscripción recurrente mixta al generarse cuando el precio de catálogo ha cambiado: el pedido comercial se genera con el precio actualizado oficial del catálogo para cada presentación.
- **CL-7**: Intento de asociar un ítem a un lote con diferente presentación vía API directa: el backend rechaza la solicitud con HTTP 400 de integridad de catálogo.
- **CL-8**: Cliente con 10L acumulados pero con pedidos entregados pendientes de pago: el sistema bloquea el botón de canje en CRM y muestra la cartera pendiente requerida para desbloquear el premio a $0 COP.
- **CL-9**: Cliente con múltiples suscripciones recurrentes activas simultáneamente: el sistema las lista y gestiona de forma independiente con sus respectivas frecuencias y fechas de próximo despacho.
- **CL-10**: Suscripción recurrente con un sabor o presentación descontinuada en el catálogo: la generación automática se detiene y notifica al operador para coordinar la actualización de la canasta en CRM.

---

## Fuera de alcance
- Modificación de la base monetaria de precios oficiales o costos promedio de insumos.
- Creación de pasarelas de pago automatizadas para suscripciones recurrentes.
- Modificación de los algoritmos de fermentación o tiempos de inoculación de Fase A.

---

## Criterios de finalización
1. En el formulario de pedidos, al elegir una presentación, el selector de lotes muestra únicamente las fracciones de esa presentación con al menos una unidad física libre (`freeUnits >= 1`).
2. El sistema impide asignar una fracción si la cantidad solicitada supera sus unidades libres disponibles, tanto en UI como en backend (HTTP 400), evitando stock negativo y bloqueos de entrega de pre-ventas.
3. Al cambiar la presentación de un ítem con lote asignado, el sistema desvincula el lote y coloca el ítem en pre-venta con el precio sugerido de la nueva presentación.
4. Es imposible vincular un ítem de 500ml a un lote de 1L (o viceversa), tanto desde la creación de pedidos como desde la vinculación masiva en auditoría de Fase B.
5. El módulo de suscripciones recurrentes admite múltiples suscripciones activas por cliente con canastas mixtas (incluyendo 500ml), calculando subtotales y generando pedidos comerciales en estado `PENDING` con precios actualizados del catálogo, deteniendo la generación si hay productos descontinuados.
6. La redención de fidelización restringe el canje exclusivamente a 1 de 1L o 2 de 500ml (admitiendo sabores mixtos), exigiendo que el cliente esté a paz y salvo en cartera, descontando las unidades a $0 COP de forma atómica y preservando el remanente en el acumulador.
7. La auditoría del Lote Madre se mantiene limpia de columnas fijas de botellas comerciales, respetando estrictamente el Artículo 5.5 de la Constitución.
8. La suite completa de pruebas unitarias y de integración (`npm test`) se ejecuta 100% en verde sin regresiones.
9. La compilación TypeScript (`npx tsc --noEmit`) y empaquetado de producción (`npm --prefix frontend run build`) pasan limpios.

---

## Dudas abiertas
*No hay dudas abiertas; todas las decisiones operativas, de negocio y constitucionales han sido clarificadas y aprobadas por el usuario.*
