# Spec 004 — Presentaciones Flexibles de Producto, Pedidos Dinámicos y Fidelización Proporcional

Estado: lista para aprobación

## Contexto y objetivo
Actualmente, el sistema ERP/CRM de YogurArte se encuentra acoplado rígidamente a dos presentaciones fijas de 1 Litro (\$12.000 COP) y 2 Litros (\$24.000 COP). Aunque el fraccionamiento de Fase B introdujo envases personalizados de forma manual, el flujo integral de pedidos (pre-ventas, comandas y asignación de stock) está bloqueado por valores quemados en código:
1. En el modal de pedidos (`OrderFormModal.vue`), el selector de tamaños solo ofrece `1L` y `2L` con precios rígidos.
2. En el backend (`orders.service.ts`), la conversión de volumen está limitada a una condición binaria `size === '2L' ? 2.0 : 1.0`, lo que ocasiona que una presentación como `500ml` compute erróneamente 1.0 L en lugar de 0.5 L, duplicando los litros vendidos y falseando el inventario disponible.
3. El negocio requiere lanzar comercialmente la presentación de **500 ml a \$8.000 COP** para todos los sabores, así como tener la libertad de incorporar o pausar cualquier presentación futura (ej. 250 ml, Galón 3.8L, etc.) de manera fluida y configurable.
4. En el programa de **Fidelización 10+1**, las botellas de 500 ml deben acumular de forma proporcional (2 botellas de 500 ml = 1 botella de 1L en el acumulador hacia las 10 botellas). Al completar el ciclo de 10 botellas, el cliente puede reclamar su premio eligiendo presentaciones que sumen hasta 1 Litro (ej. 1 de 1L o 2 de 500 ml), descontando el producto de la fracción correspondiente y registrando la entrega formal a \$0 en el historial.

El objetivo de esta especificación es implementar un **Catálogo Centralizado de Presentaciones** (`ProductPresentation`), hacer dinámicos los formularios de pedidos y envasado, garantizar cálculos volumétricos exactos en el backend y permitir la entrega auditable de recompensas de fidelización.

---

## Usuarios
- **Vendedor / Operador de Pedidos**: Registra pedidos en pre-venta o venta directa seleccionando presentaciones dinámicas activas con precios sugeridos y capacidad de ajuste manual.
- **Maestro Yogurtero / Administrador de Producción**: Registra el envasado en Fase B seleccionando las presentaciones comerciales producidas y vinculando pre-ventas de forma exacta.
- **Administrador de CRM / Fidelización**: Monitorea el acumulador de fidelización proporcional y entrega las recompensas de hasta 1L seleccionando el lote de origen.
- **Administrador del Sistema**: Gestiona el catálogo de presentaciones (precios por defecto, capacidades en litros, insumo de envase asociado y estado activo/inactivo).

---

## Historias de usuario
- **HU-1**: Como vendedor, quiero poder seleccionar la presentación de 500 ml al crear un pedido para cualquier sabor de yogur, con un precio sugerido de \$8.000 COP que pueda ajustar manualmente si es necesario.
- **HU-2**: Como administrador, quiero un catálogo de presentaciones donde pueda registrar, editar y pausar presentaciones (ej. 250 ml, 500 ml, 1 L, 2 L), definiendo su nombre, capacidad en litros, precio de venta oficial y material de empaque asociado.
- **HU-3**: Como maestro yogurtero, quiero que al envasar un lote en Fase B pueda registrar las unidades obtenidas en cada presentación (ej. 10 de 500 ml y 5 de 1L), calculando el volumen total extraído y descontando los envases del inventario.
- **HU-4**: Como operador, quiero que los cálculos de litros de los pedidos y de los ítems de comanda sean exactos según la capacidad de cada presentación (`cantidad * capacidadLiters`), evitando descuadres en los balances de litros producidos vs. vendidos.
- **HU-5**: Como cliente y administrador de CRM, quiero que las botellas de 500 ml sumen 0.5 unidades hacia la meta de 10 botellas de fidelización, y que al reclamar el premio el cliente pueda elegir presentaciones hasta 1 Litro total, descargando el stock del lote a costo \$0.

---

## Definiciones
- **Presentación de Producto (`ProductPresentation`)**: Formato físico y comercial en el que se envasa y vende el yogur (ej. 500 ml, 1 Litro, 2 Litros), caracterizado por un código identificador, etiqueta visible, capacidad en litros, precio de venta predeterminado y empaque asociado.
- **Capacidad en Litros (`capacityLiters`)**: Volumen neto en litros que contiene una unidad de la presentación (ej. 0.5 para 500 ml, 1.0 para 1L, 2.0 para 2L).
- **Precio por Defecto (`defaultPrice`)**: Tarifa base sugerida de venta para la presentación en pesos colombianos (\$ COP), modificable en cada comanda.
- **Acumulador de Fidelización Proporcional**: Total de litros comercializados convertidos a base de botellas de 1L ($\sum (\text{cantidad} \times \text{capacityLiters})$). Cada 10 litros equivalen a un ciclo completo de 10 botellas para reclamar 1 litro de premio.
- **Entrega de Recompensa de Fidelización**: Registro de salida de inventario a \$0 de una comanda o fracción envasada, justificado bajo el concepto de fidelización 10+1.

---

## Requisitos funcionales

### Catálogo de Presentaciones (`ProductPresentation`)
- **RF-1**: EL SISTEMA mantendrá una entidad `ProductPresentation` con los campos: `name` (identificador único, ej. "500ml"), `label` (etiqueta visible, ej. "500 ml (Medio Litro)"), `capacityLiters` (volumen en litros > 0), `defaultPrice` (precio sugerido $\ge 0$), `rawMaterialId` (opcional, ID del insumo de envase/empaque en inventario), `isActive` (booleano) y marcas temporales.
- **RF-2**: EL SISTEMA inicializará el catálogo con tres presentaciones predeterminadas:
  1. `1L`: "1 Litro (1L)", `capacityLiters: 1.0`, `defaultPrice: 12000`, `isActive: true`.
  2. `2L`: "2 Litros (2L)", `capacityLiters: 2.0`, `defaultPrice: 24000`, `isActive: true`.
  3. `500ml`: "500 ml (Medio Litro)", `capacityLiters: 0.5`, `defaultPrice: 8000`, `isActive: true`.
- **RF-3**: CUANDO un administrador gestione el catálogo de presentaciones en la interfaz, EL SISTEMA permitirá:
  - Listar todas las presentaciones (activas e inactivas).
  - Crear una nueva presentación validando que el identificador sea único y la capacidad en litros sea estrictamente positiva.
  - Editar la etiqueta, el precio predeterminado y el insumo de envase asociado.
  - Activar o pausar una presentación (`isActive`).
- **RF-4**: SI una presentación ya tiene historial de pedidos o lotes envasados, EL SISTEMA prohibirá eliminarla físicamente y permitirá únicamente su desactivación (`isActive = false`) para preservar la integridad histórica.

### Formulario y Motor de Pedidos (Pre-ventas y Ventas)
- **RF-5**: CUANDO el usuario abra el formulario de creación o edición de pedidos (`OrderFormModal.vue`), EL SISTEMA cargará dinámicamente las presentaciones activas del catálogo en los selectores de presentación de los productos.
- **RF-6**: CUANDO el usuario seleccione una presentación en una fila de producto, EL SISTEMA auto-asignará en el campo de precio unitario el `defaultPrice` de esa presentación, permitiendo al usuario modificar dicho valor manualmente si requiere aplicar una tarifa personalizada.
- **RF-7**: CUANDO el usuario ingrese la cantidad y presentación de un ítem, EL SISTEMA computará el subtotal del ítem como $\text{cantidad} \times \text{unitPrice}$ y el volumen del ítem como $\text{cantidad} \times \text{capacityLiters}$.
- **RF-8**: EL SISTEMA almacenará en `OrderItem` el identificador de la presentación en `bottleSize`, su capacidad unitaria en `litersPerUnit`, los litros totales en `totalLiters`, el precio unitario en `unitPrice` y el total en `totalPrice`.
- **RF-9**: EL SISTEMA actualizará en la cabecera de la orden (`Order`) el resumen de presentaciones en `bottleSize` (el nombre de la presentación si todos los ítems coinciden, o `'MIXTO'` si contiene múltiples presentaciones distintas), la suma total de unidades físicas en `quantityBottles` y la suma de litros en `totalLiters`.
- **RF-10**: SI el usuario asocia un ítem a una fracción envasada de Fase B, EL SISTEMA validará que la fracción cuente con unidades o litros suficientes para satisfacer la presentación solicitada antes de confirmar la vinculación.

### Envasado y Fraccionamiento en Fase B
- **RF-11**: CUANDO el usuario configure el envasado de una fracción en `PackagingModal.vue`, EL SISTEMA presentará las opciones de presentaciones disponibles en el catálogo para registrar las cantidades de botellas obtenidas de cada formato (ej. 1L, 2L, 500ml).
- **RF-12**: CUANDO una presentación seleccionada tenga configurado un insumo de envase asociado (`rawMaterialId`), EL SISTEMA pre-seleccionará automáticamente dicho insumo para el consumo de inventario, permitiendo al usuario modificarlo manualmente si utilizó un envase alternativo.
- **RF-13**: EL SISTEMA calculará el volumen comercial total envasado sumando $\sum (\text{cantidad}_i \times \text{capacityLiters}_i)$ de todas las presentaciones registradas en la fracción.
- **RF-14**: CUANDO se listen pedidos pendientes de pre-venta para vincular a una fracción, EL SISTEMA desglosará con claridad las cantidades y presentaciones solicitadas por cada cliente (ej. "2x 500ml, 1x 1L").
- **RF-15**: EL SISTEMA actualizará la función `computePackagingPresentations` para que el cruce de pedidos vendidos vs. stock disponible en la fracción se realice con base en la capacidad exacta (`capacityLiters`) y el identificador de presentación estandarizado.

### Fidelización Proporcional y Entrega de Premios (10+1)
- **RF-16**: EL SISTEMA calculará el avance de fidelización acumulando los litros de pedidos entregados y pagados del cliente divididos entre 1.0 L ($\sum \text{totalLiters}$ de pedidos válidos). Cada botella de 500 ml aportará exactamente 0.5 botellas equivalentes al acumulador de 10.
- **RF-17**: CUANDO un cliente complete 10 unidades equivalentes (10 L acumulados), EL SISTEMA habilitará la disponibilidad de reclamar una recompensa de fidelización.
- **RF-18**: CUANDO se registre el canje de la recompensa de fidelización, EL SISTEMA permitirá seleccionar presentaciones que en conjunto no superen 1.0 Litro (ejemplo: una botella de 1L, o dos botellas de 500 ml).
- **RF-19**: CUANDO se confirme la entrega del premio de fidelización, EL SISTEMA:
  - Solicitará la fracción o lote del cual se extrae el producto obsequiado.
  - Registrará la salida de inventario a valor \$0 COP con motivo explícito `PREMIO_FIDELIZACION` (o descargo correspondiente).
  - Incrementará el contador de canjes de fidelización del cliente (`loyaltyRedeemedCount += 1`).
  - Reflejará el movimiento en el historial del cliente y del lote sin generar cuentas por cobrar ni deuda pendiente.

---

## Criterios de Aceptación (Gherkin)

### Escenario 1: Creación de pedido con presentación de 500 ml
```gherkin
DADO que la presentación "500ml" está activa en el catálogo con capacidad 0.5L y precio por defecto $8.000 COP
CUANDO el operador crea un pedido seleccionando 2 unidades de sabor "Fresa" en presentación "500ml"
ENTONCES el precio unitario sugerido es $8.000 COP
Y el subtotal del ítem es $16.000 COP
Y los litros totales del ítem se registran exactamente como 1.0 Litro (2 * 0.5L)
Y la orden refleja quantityBottles = 2 y totalLiters = 1.0
```

### Escenario 2: Acumulación proporcional de fidelización
```gherkin
DADO que un cliente compra un pedido con 2 botellas de 500 ml (1.0 L) y 1 botella de 1L (1.0 L)
CUANDO el pedido es entregado y pagado en su totalidad
ENTONCES el acumulador de fidelización del cliente incrementa exactamente en 2.0 botellas equivalentes
Y el porcentaje de avance hacia las 10 botellas se calcula sobre esa base proporcional
```

### Escenario 3: Canje y entrega de premio de fidelización
```gherkin
DADO que un cliente tiene disponible 1 canje de fidelización (al menos 10 botellas acumuladas netas)
CUANDO el operador registra la entrega del premio seleccionando dos botellas de 500 ml (1.0 L total) de un lote de Fresa
ENTONCES el sistema valida que el volumen no supere 1.0 Litro
Y descuenta 2 botellas de 500 ml del lote seleccionado
Y registra la comanda/salida con monto a pagar $0 COP
Y el contador loyaltyRedeemedCount del cliente se incrementa en 1
```

### Escenario 4: Adición de nueva presentación dinámica en el catálogo
```gherkin
DADO que un administrador accede al catálogo de presentaciones
CUANDO registra una presentación "250ml", etiqueta "250 ml (Porción personal)", capacidad 0.25L y precio $4.500 COP
ENTONCES la presentación queda inmediatamente disponible en el modal de creación de pedidos
Y los nuevos pedidos con 250 ml calculan 0.25 L por unidad automáticamente
```

---

## Invariantes y No-Requisitos
1. **Invariante de Cartera**: La entrega de premios de fidelización a \$0 COP jamás generará saldo pendiente ni afectará las métricas de cartera de clientes.
2. **Invariante de Lote Madre (Fase A)**: La Fase A continúa midiendo únicamente el volumen líquido de yogur base fermentado. El registro de presentaciones se realiza de forma exclusiva en la Fase B (fraccionamiento y envasado).
3. **No-Requisito**: La gestión y edición de plantillas de mensajes del sistema de WhatsApp queda expresamente excluida de esta especificación y será implementada en la **Spec 005**.
