# Spec 011 — Modal Dinámico de Envasado en Fase B, Mono-Presentación y Dosificación por Envase

Estado: aprobada (revisión QA completada y clarificación finalizada)

## Contexto y objetivo
En el flujo productivo de YogurArte, el envasado y fraccionamiento (Fase B) convierte la base láctea fermentada en tanque (Fase A) en producto terminado comercializable.

Actualmente, el modal de creación y registro de envasado (`PackagingModal.vue`):
1. **Interfaz rígida de 1L y 2L**: Mantiene columnas fijas para botellas de 1 Litro y 2 Litros, mientras que presentaciones modernas como 500 ml (y formatos como 80 ml, 150 ml o galones) se relegan a un botón manual secundario de "Agregar presentación personalizada / Desde catálogo".
2. **Mezcla multi-presentación en un solo lote**: Permite digitar cantidades de múltiples presentaciones en el mismo registro de fraccionamiento (`BatchPackaging`), lo que dificulta la trazabilidad unitaria, distorsiona los costos unitarios de envase y etiqueta, y complica el balance de inventario por presentación.
3. **Inconsistencia en el cálculo de insumos (fruta/almíbar) en fracciones de litro**: El cálculo de insumos extras se formula con una dosificación por litro (`dosagePerLiter` en g/L). Cuando el operario envasa botellas de 500 ml o cantidades impares (ej. 3 botellas de 500 ml = 1.5 L, o 5 botellas = 2.5 L), la dosificación por litro obliga a cálculos matemáticos innecesarios para el operario y genera desfases en bodega frente a recetas artesanales formuladas por envase físico.
4. **Filtro ambiguo de pre-ventas**: La sección de pedidos pendientes a vincular no discrimina por la presentación que se está envasando, lo que induce a vincular órdenes de formatos diferentes al lote que se está empacando.

El objetivo de esta especificación es:
1. **Modelo Mono-Presentación por Fraccionamiento**: Establecer que cada registro de envasado en Fase B (`BatchPackaging`) corresponda exclusivamente a una única presentación comercial activa (ej. 100% de 500 ml, o 100% de 1 L). Si de un mismo lote de fermentación (Fase A) se envasan distintos tamaños, se crearán fraccionamientos separados (`F01`, `F02`), cada uno con su propio costo unitario exacto, código y trazabilidad limpia.
2. **Modal Dinámico e Intuitivo sin Botones Manuales**: Eliminar el botón "Agregar nueva presentación" y sustituirlo por un selector interactivo de pestañas con las presentaciones activas en el catálogo (`ProductPresentation` con `isActive = true`, actualmente 500 ml, 1 L y 2 L). Preseleccionar por defecto la presentación estándar de 1 Litro (1L) o, en su defecto, la presentación activa con menor capacidad en litros.
3. **Dosificación Exacta por Envase**: Permitir que los insumos extras en peso (fruta, almíbar, dulce) se dosifiquen en **gramos por botella** (`gramsPerBottle`) según la presentación seleccionada (ej. 75 g por botella de 500 ml, 150 g por botella de 1 L), calculando de forma exacta el consumo en kilogramos a descontar de inventario:
   $$\text{Cantidad Usada (kg)} = \frac{\text{Dosis por Botella (g)} \times \text{Cantidad de Botellas}}{1000}$$
4. **Principio de Rendimiento y Expansión Volumétrica (Constitución Art. 5.6)**: La base láctea extraída del lote madre (`baseLitersUsed`) permanece fija según lo extraído del tanque de fermentación. El volumen envasado en botellas puede legítimamente superar la base láctea debido a la masa y volumen que aportan las mermeladas, frutas y almíbares (rendimiento volumétrico $> 100\%$). El sistema no sobrescribirá arbitrariamente la base láctea fijada por el maestro yogurtero.
5. **Pre-ventas Filtradas con Saldo Dinámico Remanente**: Filtrar los pedidos pendientes por sabor y presentación (discriminando atómicamente ítems en pedidos multisabor o multipresentación). Controlar acumulativamente en tiempo real que la suma de pedidos seleccionados no exceda las botellas envasadas en la fracción.
6. **Alineación Constitucional y Retrocompatibilidad**:
   - Respetar el Artículo 5.4 (`containers` como fuente única de verdad sin depender de columnas fijas de botellas).
   - Respetar el Artículo 6.2 (ajuste diferencial exacto `newDelta - oldDelta` en Kardex al editar; si $\Delta = 0$, no se exige stock adicional en almacén).
   - Respetar el Artículo 9.2 (transaccionalidad interactiva atómica `prisma.$transaction`).
   - Respetar el Artículo 10.2 (arquitectura de 3 capas fijas en modales).
   - Modo solo lectura/auditoría para fracciones históricas multi-presentación heredadas.

---

## Usuarios
- **Maestro Yogurtero / Operador de Producción**: Registra los fraccionamientos en Fase B. Necesita un formulario ágil donde elija la presentación activa y solo digite el número de botellas y los gramos de fruta por botella.
- **Administrador / Jefe de Planta**: Supervisa el rendimiento, costeo unitario y existencias en bodega, requiriendo trazabilidad 1:1 entre cada fracción de lote y su formato físico de envase.

---

## Historias de usuario
- **HU-1**: Como maestro yogurtero, al abrir el modal de envasado en Fase B, quiero que se carguen directamente las presentaciones activas en pestañas interactivas (iniciando en 1 L por defecto, o la menor si 1L está inactiva), para seleccionar el formato en el que voy a empacar sin botones manuales de agregar.
- **HU-2**: Como maestro yogurtero, al seleccionar una presentación (ej. 500 ml), quiero que el modal configure automáticamente la capacidad, el insumo de botella asignado con su stock en bodega y el precio sugerido, para solo digitar cuántas botellas envasé.
- **HU-3**: Como maestro yogurtero, al añadir fruta o dulce al lote, quiero escribir los gramos que lleva cada botella (ej. 75 g por botella de 500 ml), para que el sistema calcule los kilogramos exactos a descontar de bodega sin requerir cálculos sobre litros enteros.
- **HU-4**: Como maestro yogurtero, al envasar yogur sabor 'Natural', quiero poder guardar la fracción sin tener que agregar filas de insumos extras obligatorias.
- **HU-5**: Como operador, al consultar pedidos pendientes para vincular (pre-ventas), quiero ver únicamente las órdenes que soliciten el sabor y la presentación exacta que estoy envasando, con un control de saldo dinámico que impida seleccionar pedidos acumulados que superen las botellas del lote.
- **HU-6**: Como administrador, quiero que cada fraccionamiento de Fase B sea mono-presentación con su propio código correlativo y que se visualice e identifique con claridad su presentación en la auditoría dinámica y listas del sistema.

---

## Definiciones
- **Lote de Fase B Mono-Presentación**: Registro en `BatchPackaging` configurado exclusivamente para un único formato comercial (`ProductPresentation`).
- **Presentación Activa**: Registro en `ProductPresentation` con `isActive: true` (ej. 500 ml con 0.5 L, 1 L con 1.0 L, 2 L con 2.0 L).
- **Dosificación por Envase (`gramsPerBottle`)**: Gramos de insumo extra (fruta, dulce) asignados a cada botella individual de la presentación seleccionada.
- **Insumo de Envase Vinculado**: Materia prima en inventario (`rawMaterialId`) asociada a la presentación en el catálogo para el descuento automático de botellas/tarros.
- **Rendimiento Volumétrico**: Porcentaje resultante de dividir el volumen comercial total envasado entre la base láctea líquida consumida del tanque de Fase A.
- **Saldo Remanente de Pre-ventas**: Cantidad de botellas del lote que permanecen disponibles para vincular tras restar las unidades de los pedidos ya marcados en la lista.

---

## Requisitos funcionales (EARS)

### 1. Selección Dinámica de Presentación Activa
- **RF-1 (Carga y Preselección Determinista de Presentación)**:
  CUANDO el usuario abra el modal de registro de envasado de Fase B (`PackagingModal.vue`), EL SISTEMA debe cargar las presentaciones activas (`activePresentations`). Si la presentación de **1 Litro (1L)** está activa, debe preseleccionarla por defecto; SI 1L estuviese inactiva, ENTONCES EL SISTEMA debe preseleccionar deterministamente la presentación activa con menor capacidad en litros (`capacityLiters` ascendente).

- **RF-2 (Eliminación de Botón de Adición Manual)**:
  EL SISTEMA no debe incluir el botón "Agregar nueva presentación" ni botones secundarios de creación de formatos manuales dentro del modal de envasado.

- **RF-3 (Configuración Dinámica al Seleccionar Formato)**:
  CUANDO el usuario seleccione una presentación activa mediante el selector de pestañas, EL SISTEMA debe configurar dinámicamente:
  1. La capacidad unitaria en litros (`capacityLiters`).
  2. El precio unitario sugerido (`defaultPrice`), admitiendo valores $\ge 0$ (permitiendo \$0 para muestras/degustación).
  3. El insumo de envase vinculado configurado en el catálogo (`rawMaterialId`).
  4. La consulta reactiva del stock disponible del envase en bodega.

- **RF-4 (Modelo Mono-Presentación por Fracción)**:
  EL SISTEMA debe registrar cada fraccionamiento de Fase B para una única presentación comercial por registro, estructurando su información en `containers` con un único formato.

### 2. Captura y Cálculos de Envasado
- **RF-5 (Captura de Unidades, Validación de Mínimo y Cálculo Volumétrico)**:
  CUANDO el usuario ingrese la cantidad de botellas a envasar, EL SISTEMA debe:
  1. Validar que la cantidad sea un número entero estrictamente mayor a cero ($\text{botellas} \ge 1$), bloqueando el botón de guardado si está vacío o en cero.
  2. Calcular el volumen comercial total envasado, redondeado a 2 decimales:
     $$\text{Litros Envasados} = \text{round}(\text{Cantidad de Botellas} \times \text{Capacidad en Litros}, 2)$$
  3. Proponer los litros de base láctea sugeridos a descontar del lote madre mediante una bandera reactiva de edición manual (`isBaseLitersManual`):
     - MIENTRAS `isBaseLitersManual = false`, la base láctea sugerida se mantendrá sincronizada con los litros envasados.
     - SI el operario edita manualmente el valor de base láctea (evento `input`), se marcará `isBaseLitersManual = true` y dicho valor no se sobrescribirá al alterar botellas, en estricto cumplimiento del Artículo 5.6 de la Constitución.
     - Si el campo queda vacío o en cero, el guardado permanecerá deshabilitado (`validBase = false`).
  4. Calcular la cantidad de etiquetas requeridas (1 etiqueta por botella envasada de forma automática, permitiendo ajuste manual o desmarque).
  5. Calcular y exhibir el porcentaje de rendimiento volumétrico en tiempo real:
     $$\text{Rendimiento \%} = \text{baseLitersUsed} > 0 ? \text{round}\left(\frac{\text{Litros Envasados}}{\text{baseLitersUsed}} \times 100, 1\right) : 0$$
     evitando divisiones por cero (`0%` si base es 0) y permitiendo rendimientos superiores al 100% sin generar advertencias de error falso.

- **RF-6 (Validación de Stock de Envases y Etiquetas)**:
  CUANDO se ingrese la cantidad de botellas a envasar, EL SISTEMA debe verificar en tiempo real si la cantidad requerida supera el stock disponible del envase y de las etiquetas:
  - Si el stock de envases es insuficiente, debe mostrar una alerta visual roja y deshabilitar el guardado (`stockOk = false`).
  - Si el usuario mantiene activas las etiquetas (`useLabels = true`) y el stock es insuficiente, debe alertar en rojo y deshabilitar el guardado.
  - SI el usuario desmarca el uso de etiquetas (`useLabels = false`), ENTONCES EL SISTEMA debe omitir la validación de stock de etiquetas y permitir el guardado.

- **RF-7 (Flexibilidad de Envase Alternativo y Catálogo sin Envase)**:
  SI el operario necesita usar un insumo de envase diferente, o SI la presentación activa en catálogo tiene `rawMaterialId = null`, ENTONCES EL SISTEMA debe permitir seleccionar manualmente el insumo de botella desde el listado de empaque sin bloquear el modal.

### 3. Dosificación Exacta de Insumos Extras
- **RF-8 (Opcionalidad de Insumos Extras y Dosificación en Gramos)**:
  EL SISTEMA debe permitir guardar la fracción sin insumos extras si el yogur es sabor 'Natural' o no requiere adiciones. CUANDO el usuario agregue un insumo extra cuya unidad de inventario sea en peso (kg/g, como fruta, pulpa o almíbar), EL SISTEMA debe solicitar la dosificación en **gramos por botella** (`gramsPerBottle`), rotulando el campo de forma contextual con la presentación activa (ej. `g / botella (500ml)`).

- **RF-9 (Cálculo Automático de Kilogramos Totales y Validación de Stock de Insumos)**:
  CUANDO el usuario digite los gramos por botella de un insumo pesable, EL SISTEMA debe calcular en tiempo real:
  $$\text{Cantidad Usada (kg)} = \text{round}\left(\frac{\text{Gramos por Botella} \times \text{Cantidad de Botellas}}{1000}, 3\right)$$
  actualizando el costo total del insumo. Si la cantidad requerida supera el stock disponible en almacén, el sistema alertará visualmente en rojo y deshabilitará el botón de guardado (`hasInsufficientStock = true`).

- **RF-10 (Soporte y Validación de Insumos no Pesables)**:
  SI el insumo agregado posee una unidad distinta a peso (ej. unidades, paquetes, sobres), ENTONCES EL SISTEMA debe permitir ingresar directamente la cantidad total utilizada, validando igualmente que la cantidad no exceda el stock registrado en almacén.

- **RF-11 (Limpieza de Dosis al Cambiar de Pestaña)**:
  CUANDO el usuario cambie la pestaña de presentación en el modal habiendo digitado una dosis de insumo pesable, EL SISTEMA debe limpiar el campo `gramsPerBottle` de las filas de insumos en peso para que el operario digite conscientemente la dosis adecuada al nuevo formato.

### 4. Pre-ventas y Vinculación de Órdenes
- **RF-12 (Filtro por Sabor y Presentación en Pedidos Pendientes)**:
  CUANDO se liste la sección de pre-ventas (pedidos pendientes a vincular), EL SISTEMA debe filtrar exclusivamente las órdenes comerciales que coincidan en sabor con la fracción Y que contengan ítems solicitados en la presentación seleccionada (descartando ítems de otros sabores o presentaciones en pedidos combinados).

- **RF-13 (Saldo Dinámico Remanente y Bloqueo de Sobreventa Acumulada)**:
  CUANDO el operario seleccione pedidos en pre-ventas, EL SISTEMA debe recalcular en tiempo real el saldo remanente de botellas libres ($\text{Saldo Libre} = \text{Botellas Lote} - \sum \text{Botellas Pedidos Seleccionados}$). SI un pedido no seleccionado solicita más botellas que el saldo libre remanente, EL SISTEMA debe deshabilitar su casilla de selección con la etiqueta "Saldo insuficiente en lote", impidiendo que la suma total de órdenes vinculadas supere las unidades producidas.

- **RF-14 (Visualización de Subtotal Específico en Pedidos Mixtos)**:
  CUANDO se liste un pedido que contenga múltiples presentaciones o sabores en pre-ventas, EL SISTEMA debe exhibir en la tarjeta de preventa únicamente las botellas y el subtotal monetario correspondientes al ítem de la presentación y sabor activo (`cantidad * precio_unitario`). Al guardar, el `packagingId` se asociará exclusivamente a dichos ítems.

- **RF-15 (Limpieza de Órdenes Seleccionadas al Cambiar de Pestaña)**:
  CUANDO el usuario cambie la pestaña de presentación activa habiendo seleccionado pedidos en pre-ventas, EL SISTEMA debe reiniciar la selección de órdenes (`selectedOrderIds = []`) para evitar vinculaciones incongruentes con la nueva presentación.

### 5. Persistencia, Arquitectura y Retrocompatibilidad
- **RF-16 (Estructuración Canónica del Payload - Constitución Art. 5.4)**:
  CUANDO se envíe la solicitud de creación de fraccionamiento (`POST /api/batches/:id/packaging`), EL SISTEMA debe persistir en `BatchPackaging`:
  - `containers`: arreglo JSON como fuente canónica única con el objeto representativo de la presentación:
    `[{ containerName, capacityLiters, quantity, price, rawMaterialId }]`
  - Insumos consumidos en `BatchPackagingItem` con `quantityUsed` en kg y `dosagePerLiter` calculado como respaldo equivalente:
    $$\text{dosagePerLiter} = \text{round}\left(\frac{\text{gramsPerBottle}}{\text{capacityLiters}}, 2\right)$$
  - Poblado pasivo de retrocompatibilidad: si la presentación es `1L`, `bottles1L = quantity`; si es `2L`, `bottles2L = quantity`; de lo contrario, `0`.

- **RF-17 (Modo Solo Lectura para Fracciones Históricas Mixtas)**:
  SI el usuario abre en modo edición un registro histórico de `BatchPackaging` que contenga simultáneamente más de una presentación (ej. botellas de 1L y 2L combinadas en la misma fracción), ENTONCES EL SISTEMA debe presentar sus datos en modo de auditoría/solo lectura con un distintivo informativo, permitiendo desvincular pedidos o eliminar la fracción, pero bloqueando la re-edición combinada.

- **RF-18 (Ajuste Diferencial y Rehidratación en Edición Mono-Presentación - Constitución Art. 6.2)**:
  SI se edita una fracción mono-presentación existente:
  1. La presentación comercial envasada permanecerá fija/inmutable (pestaña bloqueada para evitar corromper pedidos y descargos).
  2. Los gramos por botella se rehidratarán unívocamente a partir del inventario consumido:
     $$\text{gramsPerBottle} = \text{round}\left(\frac{\text{quantityUsed (kg)} \times 1000}{\text{unidades}}, 1\right)$$
  3. Los ajustes de inventario de botellas, etiquetas y fruta se aplicarán en Kardex como el diferencial neto ($\text{newDelta} - \text{oldDelta}$). Si la fruta o envases no sufrieron alteración ($\Delta = 0$), el guardado se completará sin exigir stock adicional en bodega aunque el saldo actual del insumo sea cero.
  4. Los litros de base láctea (`baseLitersUsed`) podrán ajustarse aplicando el diferencial neto contra el saldo disponible del lote madre de Fase A.
  5. Se permite editar la cantidad de botellas producidas siempre que la nueva cantidad sea igual o superior a las botellas ya entregadas a clientes ($\text{nuevasBotellas} \ge \text{botellasEntregadas}$). Si la cantidad propuesta es inferior a las botellas ya entregadas o comprometidas en pedidos, el guardado se bloqueará; y si la modificación reduce el saldo disponible afectando la cobertura de pedidos en preparación o demanda insumos adicionales en inventario, el sistema desplegará una advertencia visual clara sobre la integridad de los datos.

---

## Requisitos no funcionales
- **RNF-1 (Arquitectura de 3 Capas Fijas - Constitución Art. 10.2)**:
  El modal de envasado debe mantener estrictamente la estructura de 3 capas fijas:
  - Cabecera fija (`header` con `shrink-0`).
  - Cuerpo desplazable (`div` con `flex-1 min-h-0 overflow-y-auto`).
  - Pie de acción fijo (`footer` con `shrink-0`).
  El selector dinámico de pestañas debe ubicarse dentro del contenedor sin provocar desbordamientos horizontales ni saltos de pantalla en dispositivos móviles.
- **RNF-2 (Transaccionalidad Atómica Indivisible - Constitución Art. 9.2)**:
  La creación o edición de la fracción de envasado, el descargo de envases, etiquetas, insumos extras en Kardex y la vinculación de pedidos deben ejecutarse estrictamente dentro de un bloque `prisma.$transaction`. Ante cualquier fallo o falta de saldo, se aplicará rollback integral.
- **RNF-3 (Reactividad Inmediata)**: Al alternar entre presentaciones activas en el modal, la actualización de la capacidad, stock de envases y precios debe ejecutarse en menos de 50 ms en el cliente sin peticiones de red redundantes.
- **RNF-4 (Precisión Decimal y Redondeo)**: Los cálculos volumétricos deben redondearse a 2 decimales para capacidades pequeñas (ej. 80 ml = 0.08 L), los descuentos de envases/etiquetas en números enteros y los insumos en peso con precisión de 3 decimales (kg).
- **RNF-5 (Manejo de Estado Vacío)**: Si en la base de datos no existe ninguna presentación activa (`activePresentations.length === 0`), el modal debe mostrar un mensaje instructivo con acceso directo a la configuración de presentaciones sin romper la interfaz.

---

## Casos límite
- **CL-1 (Cambio de pestaña con botellas ya digitadas)**: Si el operario escribe 20 botellas en la pestaña de 500 ml ($10.0\text{ L}$) y cambia a 1 L, el sistema mantiene las 20 botellas pero recalcula inmediatamente el volumen ($20.0\text{ L}$), verifica el stock de envases de 1 L y limpia la dosis de fruta conforme al RF-11. Si el nuevo volumen supera el yogur base disponible en el tanque de Fase A, debe activarse la alerta de sobrecupo y deshabilitarse el botón de guardado.
- **CL-2 (Presentación activa sin envase vinculado en catálogo)**: Si la presentación activa tiene `rawMaterialId = null`, el selector de envases debe mostrarse habilitado para selección manual sin bloquear el modal.
- **CL-3 (Volumen superior a la base láctea disponible)**: Si los litros de base láctea requeridos superan el saldo de yogur base disponible en el tanque de Fase A, el sistema debe alertar visualmente el sobrecupo y deshabilitar el botón de guardado.
- **CL-4 (Cambio de pestañas con órdenes pendientes seleccionadas)**: Al alternar pestañas, `selectedOrderIds` se restablece a arreglo vacío para evitar vincular productos de distinta medida.
- **CL-5 (Rendimiento superior al 100% por fruta)**: Si con 10 L de base láctea y adición de mermelada se envasan 24 botellas de 500 ml ($12.0\text{ L}$ comerciales, rendimiento 120%), el sistema lo procesa como una operación válida y legítima conforme al Art. 5.6 de la Constitución.
- **CL-6 (Edición sin cambios en insumos con stock cero en almacén)**: Si se edita una nota o el operario de una fracción existente cuyos insumos tienen stock 0 en bodega, al ser $\Delta = 0$ la transacción de inventario no exige unidades adicionales y permite guardar exitosamente.

---

## Fuera de alcance
- Modificaciones al esquema físico de base de datos (`prisma/schema.prisma`), dado que `containers Json?` y las relaciones existentes satisfacen plenamente los requerimientos.
- Modificaciones en la fermentación e inoculación de Fase A.
- Cambios en las reglas de acumulación o redención de fidelización en CRM.

---

## Criterios de finalización
- El botón de "agregar presentación manual" ha sido eliminado del modal de Fase B.
- El modal permite seleccionar directamente las presentaciones activas en pestañas dinámicas (500 ml, 1 L, 2 L), iniciando en 1 L.
- Al seleccionar una presentación, se precarga automáticamente su envase asignado, stock y precio sugerido.
- La dosificación de fruta y dulces se realiza por botella, calculando de forma exacta los kilogramos consumidos.
- Se consagra el rendimiento volumétrico por adición de mermeladas en Fase B y elaboraciones en inventario (Constitución Art. 5.6).
- Las pre-ventas se filtran por sabor y por la presentación elegida, controlando reactivamente el saldo remanente libre y limpiando la selección al cambiar de pestaña.
- Las fracciones históricas mixtas se presentan en modo auditoría/solo lectura seguro.
- La suite de pruebas de backend y frontend pasa al 100% en verde.
