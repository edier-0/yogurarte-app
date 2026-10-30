# Spec 007 — Métricas de Fase B, Desglose Multi-Presentación (Cuchareables 80ml/150ml, 500ml, 1L, 2L) y Estandarización Terminológica a "Envases / Unidades"

Estado: lista para aprobación

## Contexto y objetivo
En YogurArte, el modelo productivo y comercial se divide en dos fases con múltiples formatos de empaque:
1. **Fase A (Madre / Fermentación)**: Producción de base láctea líquida a granel en tanques. No constituye producto vendible.
2. **Fase B (Envasado y Fraccionamiento)**: Fraccionamiento por sabor y envasado en presentaciones comerciales físicas: **1 Litro (1.0 L)**, **500 ml (0.5 L)**, **2 Litros (2.0 L)**, y formatos pequeños/cuchareables como **80 ml (0.08 L)**, **150 ml (0.15 L)**, **250 ml (0.25 L)** u otras medidas dinámicas creadas desde el catálogo de presentaciones (`ProductPresentation`).

Actualmente, el sistema presenta tres limitaciones operativas:
1. **Sobreestimación de Stock por Fase A en el Dashboard**: La tarjeta de producción contabiliza lotes de Fase A y el volumen histórico total de leche inoculada, en lugar de mostrar los litros y lotes efectivamente envasados en Fase B listos para la venta.
2. **Invisibilidad de Presentaciones Pequeñas / Cuchareables (80ml, 150ml, 500ml)**:
   - Las tarjetas de auditoría de despacho (**Entregas a Clientes**, **Consumo de Socios** y **Pedidos en Preparación / Ruta**) solo muestran totales en litros agregados o conteos de órdenes/retiros, sin reflejar el desglose físico de envases despachados.
   - En el backend analítico (`salesByBatchAndFlavor` en `finance.service.ts`), las unidades vendidas están acopladas rígidamente a dos campos fijos (`totalBottles1L` y `totalBottles2L`), omitiendo cualquier formato distinto de 1L y 2L.
   - Si se redondean los litros a 1 solo decimal, formatos como 80 ml (0.08 L) sufren distorsión matemática.
3. **Lenguaje Rígido de "Botellas" en Todo el Aplicativo**:
   - Múltiples pantallas, modales, alertas y mensajes de WhatsApp asumen que todo el producto se vende en "botellas" (ej. "Cantidad de botellas", "10 botellas acumuladas", "• 2x Botella 500ml"). Al introducir yogur cuchareable en vasos o tarros de 80 ml / 150 ml, esta terminología es incorrecta.

El objetivo de esta especificación es:
1. Alinear la tarjeta principal de stock del Dashboard para reflejar exclusivamente la **disponibilidad física de Fase B** (fracciones envasadas con saldo libre, litros disponibles y chips de envases en stock).
2. Adaptar todas las tarjetas de despacho (**Entregas a Clientes**, **Consumo de Socios**, **En Preparación / Ruta** y **Ventas Totales**) para calcular volumétricamente con precisión decimal adaptable (hasta 2 decimales) y desglosar las unidades físicas por presentación comercial mediante chips visuales ergonómicos.
3. Desacoplar el backend analítico para soportar desgloses dinámicos de presentaciones y mostrar en la tabla de últimos pedidos el detalle exacto de presentación y sabor.
4. **Estandarización Terminológica Transversal**: Reemplazar en toda la interfaz de usuario, modales, alertas, validaciones y comprobantes de WhatsApp el término restrictivo "botella(s)" por el término genérico y profesional **"envase(s)" / "unidad(es)"**, preservando la integridad del esquema de base de datos sin migraciones destructivas.

---

## Usuarios
- **Administrador / Gerente**: Consulta el Dashboard para conocer en tiempo real el stock físico vendible en bodega y auditar cuántos envases de cada formato (1L, 500ml, vasos 80ml/150ml) se han entregado a clientes o consumido por socios.
- **Operador de Ventas / Despacho**: Revisa el Dashboard para identificar rápidamente qué presentaciones están listas para despacho inmediato y verificar la composición física de los pedidos en curso y entregados.

---

## Historias de usuario
- **HU-1**: Como administrador, quiero que la tarjeta de disponibilidad del Dashboard me muestre los litros envasados listos para vender en Fase B, el número de fracciones activas y los envases en stock por medida (incluyendo cuchareables), para no confundir la leche en fermentación con producto terminado.
- **HU-2**: Como operador, quiero ver en la tarjeta de **Entregas a Clientes** cuántos litros se entregaron y chips visuales con los envases entregados por formato (ej. `[8x 1L] [4x 500ml] [20x 80ml]`), para auditar la salida física de producto del período.
- **HU-3**: Como administrador, quiero que la tarjeta de **Consumo de Socios** compute con exactitud centesimal los litros de retiros de 80 ml, 150 ml, 500 ml o 1L, mostrando chips con el desglose de presentaciones retiradas.
- **HU-4**: Como encargado de despacho, quiero que la tarjeta de **En Preparación / Ruta** me muestre el volumen y los envases por presentación comprometidos en órdenes activas.
- **HU-5**: Como usuario, al hacer clic en la tarjeta de stock del Dashboard, quiero ser redirigido directamente a la pestaña de Fase B (Envasados) en la vista de producción.
- **HU-6**: Como administrador, quiero que la tarjeta de **Ventas Totales** exhiba el total de envases vendidos además de los litros totales comercializados.
- **HU-7**: Como operador, quiero que la lista de **Últimos Pedidos** muestre el desglose exacto de presentación y sabor en cada comanda (ej. `20x 80ml (Cuchareable Mora), 1x 1L (Fresa)`).
- **HU-8**: Como usuario de cualquier vista del ERP (Pedidos, Lotes, CRM, Fidelización y WhatsApp), quiero que el sistema use términos incluyentes como "envases" o "unidades" en lugar de "botellas", reflejando que vendemos tanto botellas como vasos cuchareables.

---

## Definiciones
- **Presentación Comercial**: Formato de envase con capacidad en litros definida (ej. "80ml" = 0.08L, "150ml" = 0.15L, "500ml" = 0.5L, "1L" = 1.0L, "2L" = 2.0L).
- **Litros Libres / Disponibles de Fase B**: Saldo resultante de restar al total envasado de una fracción los litros comprometidos en pedidos vigentes y los litros descargados por retiros de socios (`Litros Libres = Total Envasado - Vendidos/Reservados - Descargados`).
- **Fracción Disponible**: Fraccionamiento de Fase B cuyo saldo libre supera el umbral comercial de agotamiento (0.05 L).
- **Desglose de Presentaciones (`presentationsBreakdown`)**: Colección dinámica de objetos `{ containerName: string, quantity: number, capacityLiters: number, totalLiters: number }` que resume las unidades físicas y volumen de cada medida.

---

## Requisitos funcionales (EARS)

### 1. Disponibilidad de Lotes y Litros en Fase B
- **RF-1 (Cálculo Canónico de Litros Disponibles en Fase B)**:
  CUANDO el usuario consulte el resumen consolidado del Dashboard, EL SISTEMA debe calcular los litros disponibles sumando estrictamente el volumen libre envasado de todas las fracciones activas de Fase B.

- **RF-2 (Conteo de Fracciones Envasadas con Disponibilidad)**:
  CUANDO el usuario consulte el resumen consolidado del Dashboard, EL SISTEMA debe contabilizar la cantidad de fracciones envasadas por sabor de Fase B que mantengan saldo libre superior a 0.05 Litros.

- **RF-3 (Exclusión de Leche en Proceso y Tanques Fase A)**:
  EL SISTEMA no debe incluir en los litros disponibles para venta del Dashboard el volumen en fermentación ni la base líquida en tanque de Fase A sin fraccionar.

- **RF-4 (Soporte Retrocompatible de Lotes Legacy)**:
  SI un lote activo no posee registros en `BatchPackaging` (lote previo a la migración de Fase B), ENTONCES EL SISTEMA debe computar su remanente directo no asignado para preservar la consistencia histórica.

- **RF-5 (Tarjeta de Stock Disponible con Chips de Presentación)**:
  CUANDO se renderice la tarjeta de stock en el Dashboard, EL SISTEMA debe exhibir el título "Lotes Disponibles (Fase B)", la cantidad de fracciones disponibles, los litros libres totales envasados y chips visuales compactos con los envases en stock por medida (ej. `[12x 1L] [13x 500ml] [50x 80ml]`).

- **RF-6 (Navegación Ergonómica a Fase B)**:
  CUANDO el usuario presione el enlace de inspección de la tarjeta de stock en el Dashboard, EL SISTEMA debe abrir la vista de Lotes activando por defecto la pestaña de "Fase B · Lotes Envasados (Fraccionados)".

### 2. Soporte Multi-Presentación (80ml, 150ml, 500ml, 1L, etc.) en Despachos y Ventas
- **RF-7 (Cálculo Volumétrico y Chips en Entregas a Clientes)**:
  CUANDO se calculen y muestren las métricas de pedidos entregados (`clientDeliveries`), EL SISTEMA debe computar los litros totales multiplicando cada ítem por la capacidad real de su presentación (`cantidad * capacityLiters`, ej. 50 vasos de 80ml = 4.0 L) y presentar debajo de la cantidad de pedidos entregados chips visuales compactos con los envases entregados por formato (ej. `[8x 1L] [4x 500ml] [20x 80ml]`).

- **RF-8 (Cálculo Volumétrico y Chips en Consumo de Socios)**:
  CUANDO se calculen y muestren las métricas de retiros de socios (`partnerConsumptions`), EL SISTEMA debe calcular los litros de cada descargo basándose en la capacidad real de la presentación (`bottleSize` o `capacityLiters`, reconociendo 80 ml = 0.08 L, 150 ml = 0.15 L, 500 ml = 0.5 L) y presentar chips visuales compactos con los envases retirados por formato (ej. `[5x 80ml] [2x 500ml]`).

- **RF-9 (Cálculo Volumétrico y Chips en Pedidos en Proceso)**:
  CUANDO se calculen y muestren las métricas de pedidos en preparación o ruta (`inProcessOrders`), EL SISTEMA debe calcular los litros exactos y presentar chips visuales compactos con los envases comprometidos por presentación comercial.

- **RF-10 (Total de Envases en Tarjeta de Ventas Totales)**:
  CUANDO se renderice la tarjeta de "Ventas Totales" (KPI principal), EL SISTEMA debe mostrar el monto total en dinero, la cantidad total de envases vendidos y los litros totales vendidos (ej. `$ 180.000 • 45 envases • 18.5 L vendidos`).

- **RF-11 (Desacoplamiento Dinámico en Backend Analítico)**:
  CUANDO el backend agrupe ventas por lote y sabor (`groupByBatchAndFlavor`), EL SISTEMA debe reemplazar los campos rígidos `totalBottles1L` y `totalBottles2L` por una estructura dinámica (`presentationsBreakdown`) que agrupe y totalice cualquier medida del catálogo (`80ml`, `150ml`, `500ml`, `1L`, `2L`, etc.) sin pérdida de datos.

- **RF-12 (Detalle de Presentación y Sabor en Pedidos Recientes)**:
  CUANDO se listen las órdenes en la sección de "Últimos Pedidos Registrados" del Dashboard, EL SISTEMA debe mostrar el resumen exacto de los ítems con presentación y sabor (ej. `20x 80ml (Cuchareable), 1x 1L (Fresa)`).

- **RF-13 (Precisión Volumétrica Adaptativa)**:
  EL SISTEMA debe formatear las cifras de litros con hasta 2 decimales significativos cuando existan fracciones menores a 100 ml (ej. 80 ml = 0.08 L, 150 ml = 0.15 L $\to$ mostrar `4.08 L` o `12.15 L`), suprimiendo decimales ceros redundantes en volúmenes enteros (ej. `4 L` en vez de `4.00 L`).

### 3. Estandarización Terminológica Integral ("Envases / Unidades")
- **RF-14 (Estandarización de Etiquetas y Modales en Frontend)**:
  EL SISTEMA debe reemplazar la palabra "botella(s)" por "envase(s)" o "unidad(es)" en todas las vistas, tarjetas, tablas, modales y textos de ayuda de la aplicación cliente (Dashboard, Pedidos, Producción/Lotes, Kardex, CRM, Fidelización y Configuración de Presentaciones).

- **RF-15 (Estandarización de Mensajes y Validaciones en Backend)**:
  EL SISTEMA debe actualizar los mensajes de error, advertencias de stock insuficiente y descripciones generadas en el backend sustituyendo "botella(s)" por "envase(s)" (ej. "Stock insuficiente de envases de 1L", "La cantidad de envases debe ser al menos 1").

- **RF-16 (Estandarización en Comprobantes y Notificaciones WhatsApp)**:
  CUANDO se generen mensajes de resumen de pedido o estado de cuenta para WhatsApp, EL SISTEMA debe formular las líneas de producto como `• Cantidad x [Presentación] (Sabor)` (ej. `• 20x 80ml (Cuchareable Mora)` o `• 2x 1L (Melocotón)`), suprimiendo la palabra "Botella".

---

## Requisitos no funcionales
- **RNF-1 (Exactitud Numérica)**: Tolerancia máxima de cálculo de 0.001 L entre el sumatorio de presentaciones y los litros consolidados.
- **RNF-2 (Tiempo de Respuesta)**: El cálculo agregado en `getDashboardSummary` debe completarse en menos de 250 ms en base de datos local.
- **RNF-3 (Diseño Adaptable y Accesibilidad)**: Los chips visuales deben utilizar diseño responsive tipo flex-wrap para no desbordar en pantallas móviles (360px+) ni en modo oscuro.
- **RNF-4 (Seguridad de Base de Datos)**: No se realizarán migraciones destructivas de nombres de columnas en la base de datos de producción (`quantityBottles`, etc.), manteniéndose como nombres internos de persistencia.

---

## Casos límite
- **CL-1 (Cuchareables muy pequeños: 80 ml o menores)**: Al despachar 1 solo vaso de 80 ml, el sistema debe registrar 0.08 L exactos y mostrar `1 envase • 0.08 L`, sin truncar a 0 L ni redondear bruscamente a 0.1 L.
- **CL-2 (Descargos de socios no estándar)**: Si un descargo de socio tiene un tamaño de envase libre o personalizado, EL SISTEMA debe calcular el volumen a partir de `totalLiters` registrado y desglosarlo por su etiqueta sin arrojar error.
- **CL-3 (Pedidos con múltiples presentaciones mixtas)**: Si un pedido contiene 1 botella de 1L, 2 de 500ml y 10 de 80ml, el cálculo de litros debe totalizar exactamente 2.8 L y generar chips para `[1x 1L] [2x 500ml] [10x 80ml]`.
- **CL-4 (Cero envases en el período)**: Si no hay entregas, retiros o stock en un período, el sistema no debe mostrar chips vacíos ni texto roto, manteniendo indicadores numéricos en cero (`0 L`, `0 pedidos`).

---

## Fuera de alcance
- Modificación de nombres de columnas físicas en la base de datos PostgreSQL/Prisma (`prisma/schema.prisma`).
- Alteración de las tarifas monetarias de venta o de los factores de conversión de leche a yogur.

---

## Criterios de finalización
1. La tarjeta de stock del Dashboard exhibe el número de fracciones disponibles de Fase B, los litros libres envasados y los chips con envases libres por medida (`[12x 1L] [13x 500ml] [50x 80ml]`).
2. Al pulsar sobre la tarjeta de stock, el sistema navega a `/produccion/lotes` abriendo la pestaña de Fase B.
3. Las tarjetas de "Entregas a Clientes", "Consumo de Socios" y "En Preparación / Ruta" muestran los litros exactos considerando botellas de 500ml y cuchareables (80ml/150ml), junto a chips visuales con el desglose de envases despachados.
4. La tarjeta de "Ventas Totales" muestra los envases totales comercializados además de los litros.
5. La sección de "Últimos Pedidos Registrados" exhibe el resumen exacto de sabores y presentaciones de cada comanda.
6. El backend (`getDashboardSummary`) elimina el acoplamiento rígido a `totalBottles1L`/`totalBottles2L` en `groupByBatchAndFlavor`.
7. Toda la interfaz de usuario, modales, alertas y mensajes de WhatsApp utilizan "envases" o "unidades" en lugar de "botellas".
8. Pruebas unitarias y de integración pasando al 100% en verde.
9. Verificación de compilación TypeScript (`npx tsc --noEmit`) y empaquetado frontend (`npm --prefix frontend run build`) sin advertencias ni errores.

---

## Decisiones tomadas
- **Contabilización de Lotes/Fracciones**: El conteo principal de lotes refleja las **fracciones envasadas por sabor** con stock físico libre (`freeLiters > 0.05`).
- **Visualización de Presentaciones en Tarjetas de Despacho**: Uso de **cápsulas o chips visuales compactos** (ej. `[8x 1L] [4x 500ml] [20x 80ml]`) para una lectura rápida e intuitiva.
- **Detalle de Envases en Stock**: La tarjeta de Lotes Disponibles (Fase B) incluye los chips de envases libres por medida en almacén.
- **KPI de Ventas Totales**: Incorpora el total de envases físicos vendidos junto al volumen en litros.
- **Detalle en Últimos Pedidos**: Exhibe explícitamente el formato y sabor de cada ítem de comanda (ej. `20x 80ml (Cuchareable), 1x 1L (Fresa)`).
- **Terminología Transversal**: Uso del término **"envases / unidades"** en todo el aplicativo para incluir botellas, vasos y tarros cuchareables, preservando los nombres internos de base de datos sin migraciones de schema.
- **Precisión Volumétrica**: Litros con precisión adaptativa de hasta 2 decimales para evitar pérdidas en formatos pequeños como 80ml (`0.08 L`).

---

## Dudas abiertas
- Ninguna. Todas las dudas han sido clarificadas y aprobadas por el usuario.
