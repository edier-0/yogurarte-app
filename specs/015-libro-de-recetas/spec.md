# Spec 015 — Libro de Recetas y Estandarización de Producción

Estado: aprobada

## Contexto y objetivo
En **YogurArte**, la calidad, textura y sabor característico de los productos lácteos dependen del cumplimiento estricto de formulaciones, proporciones exactas de fruta fresca en mermeladas y parámetros críticos de proceso (temperaturas de inoculación, tiempos de fermentación y puntos de corte). Actualmente, parte de este conocimiento reside en la memoria de los maestros yogurteros, lo que genera riesgo operativo ante rotación o ausencia de personal.

El objetivo de esta especificación es crear el **Libro de Recetas (Recetario Maestro)** centralizado en el sistema. Este módulo actuará como el **Manual de Procedimientos Estandarizados (SOP)** interactivo de la fábrica, permitiendo:
1. Documentar y estandarizar las recetas maestras de Elaboraciones (mermeladas con merma por cocción), Fase A (Fermentación) y Fase B (Saborización desacoplada de la presentación física).
2. Definir en Fase B una formulación por sabor (proporciones de base láctea y mermelada) con un **simulador dinámico de rentabilidad por presentación**, que permite seleccionar cualquier formato (500 ml, 1 L, 2 L) para incorporar automáticamente sus insumos de empaque convencionales (`BOTELLA_*`, `ETIQUETA_*`, recordando que la tapa viene integrada en el envase) y ver la ganancia proyectada en tiempo real.
3. Escalar dinámicamente las cantidades de insumos para cualquier tamaño de lote que se vaya a preparar, manteniendo fijos los tiempos biológicos y de fermentación.
4. Proporcionar guías paso a paso estructuradas con tiempos, temperaturas y puntos de control de calidad para garantizar calidad consistente.
5. Proteger la confidencialidad financiera del negocio, permitiendo al operario consultar toda la técnica operativa pero manteniendo los costos y márgenes estrictamente ocultos desde el backend.
6. Cargar recetas como plantillas de 1 clic en los flujos de elaboración y envasado de planta sin alterar las recetas maestras originales, admitiendo múltiples formulaciones activas para un mismo sabor (ej. Tradicional vs. Light).

---

## Usuarios
* **Administrador General (`ADMIN`) y Socios (`SOCIO`):** Gestionan el catálogo de recetas (crear, modificar, archivar), definen ingredientes, pasos y controles de calidad, y monitorean costos teóricos y márgenes de rentabilidad proyectados por presentación.
* **Operario de Planta (`PRODUCCION`):** Consulta el recetario, utiliza el escalador para saber cuánto pesar de cada insumo, sigue los pasos de elaboración con sus tiempos y temperaturas, y carga recetas en la producción diaria (con costos y márgenes estrictamente censurados por backend y frontend).
* **Domiciliarios (`DOMICILIARIO`):** Sin acceso a este módulo.

---

## Historias de usuario
* **HU-1 (Consulta Técnica Operativa):** Como operario de planta, quiero consultar la ficha técnica de una receta con sus ingredientes, tiempos y temperaturas para elaborar el producto con la calidad estándar de YogurArte sin depender de otra persona.
* **HU-2 (Escalador Dinámico de Lotes):** Como operario de planta, quiero ingresar la cantidad de litros o kilogramos que voy a preparar hoy para que el sistema recalcule automáticamente las cantidades exactas de cada ingrediente.
* **HU-3 (Formulación Universal por Sabor y Simulación de Presentación):** Como administrador o socio, quiero definir una receta de sabor en Fase B una sola vez y poder seleccionar cualquier presentación comercial (500 ml, 1 L, 2 L) en la ficha técnica para visualizar el costo de empaque, la ganancia proyectada en COP y el margen de rentabilidad de esa presentación.
* **HU-4 (Confidencialidad Financiera):** Como administrador, quiero que los operarios puedan ver las cantidades y el procedimiento pero no los costos de los insumos ni los márgenes de ganancia de la empresa.
* **HU-5 (Precarga en Producción y Variantes):** Como operario, quiero seleccionar entre las recetas activas disponibles (ej. Fresa Tradicional o Fresa Light) directamente en el envasado de Fase B para precargar sus proporciones automáticamente y agilizar el registro operativo sin alterar la receta maestra.
* **HU-6 (Ficha Limpia para Planta):** Como operario o administrador, quiero visualizar o imprimir una ficha técnica limpia y optimizada (con soporte `@media print` y vista de pantalla completa) para tenerla plastificada o visible en la mesa de trabajo de la planta.

---

## Definiciones
* **Elaboración (Insumo Compuesto):** Preparación previa que transforma materias primas simples (ej. fresa fresca + azúcar) en un insumo compuesto (ej. mermelada artesanal). El rendimiento base de mermelada cocida contempla la merma por evaporación de agua.
* **Receta de Fase A (Base Láctea):** Formulación de fermentación a granel que indica litros de leche entera, tipo y gramos de cultivo, temperatura de inoculación y horas de incubación para obtener la base madre líquida.
* **Receta de Fase B (Saborización Universal):** Formulación a nivel de sabor que define las proporciones líquidas/semisólidas (litros de base láctea + kilos de mermelada artesanal) requeridas por cada litro de producto terminado, desacoplada de la botella física.
* **Simulador de Rentabilidad por Presentación:** Herramienta interactiva en la ficha técnica de Fase B que, al seleccionar una presentación del catálogo dinámico (`ProductPresentation`), suma el costo de sus empaques específicos (`BOTELLA_*`, `ETIQUETA_*`) al costo del líquido y calcula la ganancia neta y margen bruto frente al precio de venta oficial.
* **Rendimiento Base:** Volumen (L), masa (kg) o cantidad de unidades estándar para el cual se definió originalmente la receta en el sistema.
* **Factor de Escala:** Multiplicador resultante de dividir la cantidad deseada entre el rendimiento base ($\text{Factor} = \text{Cantidad Objetivo} / \text{Rendimiento Base}$).
* **Costo Teórico Unitario:** Costo proyectado de producir una unidad o litro de receta, calculado a partir del costo promedio (`avgCost`) vigente de cada insumo en el inventario y el costo de la base láctea de Fase A.
* **Margen Bruto de Ganancia:** Porcentaje de rentabilidad proyectada sobre el precio de venta comercial: $\frac{\text{PVP} - \text{Costo Teórico}}{\text{PVP}} \times 100$.

---

## Requisitos funcionales (EARS)

### 1. Catálogo y Tipos de Receta
* **RF-1:** EL SISTEMA clasificará toda receta en una de tres categorías operativas exclusivas: `ELABORACION` (insumos compuestos/mermeladas), `FASE_A` (base láctea en fermentación) o `FASE_B` (saborización universal de yogur).
* **RF-2:** CUANDO el usuario consulte el catálogo de recetas, EL SISTEMA mostrará la lista filtrable por categoría, sabor y estado (activa/archivada), con búsqueda reactiva por nombre.
* **RF-3:** EL SISTEMA mantendrá para cada receta los atributos generales: nombre descriptivo, código identificador único (ej. `REC-MERM-FRESA`, `REC-FASEA-BASE`, `REC-FASEB-FRESA-TRAD`), categoría, sabor asociado (obligatorio para `FASE_B`, opcional para `ELABORACION`, opcional/nulo para `FASE_A`), insumo de salida vinculado (`outputMaterialId`, obligatorio para `ELABORACION` apuntando al insumo compuesto resultante en `RawMaterial`), rendimiento base, unidad de medida base (`Litros`, `Kilogramos`, `Unidades`), descripción general y estado (`ACTIVA` o `ARCHIVADA`). Se permitirá la existencia de múltiples recetas activas asociadas a un mismo sabor o elaboración (ej. variantes Tradicional y Light).

### 2. Ingredientes, Mermas y Componentes Especiales
* **RF-4:** CUANDO se configure una receta, EL SISTEMA permitirá asociar uno o más insumos registrados en el inventario (`RawMaterial`), indicando para cada uno: insumo seleccionado, cantidad base y unidad de medida.
* **RF-5:** En recetas de categoría `FASE_B`, EL SISTEMA exigirá declarar la **Base Láctea** como componente principal obligatorio (`baseLiters > 0`). Para formulaciones de yogur natural puro, se admitirá que la lista de ingredientes de almacén (`RecipeIngredient`) esté vacía, siendo la Base Láctea su único componente base. El costo de referencia por litro de base láctea se determinará bajo la siguiente jerarquía unívoca:
  1. Costo por litro (`costPerLiter`) del último lote de Fase A con estado `COMPLETADO` en el sistema.
  2. En caso de no existir lotes completados, el costo teórico unitario de la receta activa de Fase A.
  3. En caso de no existir tampoco una receta activa de Fase A, se computará \$0 COP con advertencia informativa visible para el administrador.
* **RF-5.1:** En recetas de categoría `ELABORACION` (mermeladas), EL SISTEMA permitirá ingresar las materias primas crudas (fruta, azúcar) y definir explícitamente el `rendimientoBase` final obtenido de mermelada cocida, calculando el costo real por kilogramo terminado considerando la merma por evaporación: $\text{Costo/kg} = \text{Costo Total Insumos Crudos} / \text{Rendimiento Base}$.
* **RF-6:** EL SISTEMA calculará el costo teórico total de la receta sumando el costo de la base láctea (en recetas de Fase B) y el costo de cada insumo ($\text{cantidad} \times \text{costoUnitario}$). Para insumos compuestos (mermeladas) utilizados en Fase B con `avgCost == 0`, EL SISTEMA tomará el costo unitario (`costPerUnit`) de la última preparación registrada (`SupplyPreparation`) de esa mermelada; si no existen preparaciones previas ni costo promedio, computará costo cero y se alertará informativamente al usuario con rol administrativo. El costo teórico unitario ($\text{Costo/L}$ o $\text{Costo/kg}$) se calculará unívocamente dividiendo el costo teórico total del lote entre el `rendimientoBase`, reflejando fielmente la merma en elaboraciones y la expansión en yogures.

### 3. Procedimiento Operativo Estándar (Pasos, Tiempos y Temperaturas)
* **RF-7:** CUANDO se configure una receta, EL SISTEMA permitirá registrar de forma opcional una secuencia ordenada de pasos de preparación (Paso 1, Paso 2, ... Paso N). Si una receta no posee pasos registrados, EL SISTEMA mostrará una etiqueta visual informativa *"Procedimiento pendiente"* en su tarjeta sin bloquear el uso de la receta.
* **RF-8:** Para cada paso del procedimiento, EL SISTEMA registrará en campos estructurados:
  1. `stepNumber`: Número secuencial entero positivo.
  2. `title`: Título corto obligatorio (máximo 100 caracteres).
  3. `description`: Instrucción detallada de la acción (máximo 1000 caracteres).
  4. `estimatedMinutes`: Tiempo estimado en minutos (entero positivo opcional).
  5. `temperatureTarget`: Temperatura objetivo en °C (número decimal opcional) y/o rango térmico de tolerancia (`temperatureMin` y `temperatureMax`). Si coexisten ambos, `temperatureTarget` define la consigna nominal y el rango define la tolerancia admisible; en la UI y ficha de impresión se mostrará en formato compuesto (ej. `42 °C [40 °C - 44 °C]`).
  6. `qualityCheck`: Punto de control de calidad o advertencia crítica opcional (máximo 300 caracteres).
* **RF-9:** EL SISTEMA presentará los pasos en orden secuencial con insignias visuales de tiempo, temperatura y advertencias de calidad.

### 4. Escalador Dinámico de Lotes
* **RF-10:** CUANDO el usuario visualice una receta e ingrese un valor en el campo "Cantidad a Preparar", EL SISTEMA recalculará en tiempo real las cantidades exactas de todos los ingredientes requeridos multiplicando la cantidad base por el factor de escala ($\text{Cantidad Objetivo} / \text{Rendimiento Base}$).
* **RF-11:** SI el usuario ingresa un valor menor o igual a cero en el escalador, ENTONCES EL SISTEMA restablecerá el cálculo al rendimiento base original sin mostrar errores ni valores negativos.
* **RF-12:** EL SISTEMA mostrará las cantidades escaladas redondeadas a 2 decimales para insumos de categoría `MATERIA_PRIMA` e `INSUMO`. Para insumos de categoría `EMPAQUE` (botellas, etiquetas) presentes en la receta o proyectados en el simulador de rentabilidad y la orden de envasado, se redondeará estrictamente hacia arriba al entero más cercano (`Math.ceil`).
* **RF-12.1:** EL SISTEMA mantendrá los tiempos de proceso (fermentación, incubación, enfriamiento) fijos e inalterados durante el escalado, dado que responden a parámetros biológicos y cinéticos estandarizados independientes del volumen de lote.

### 5. Costeo y Simulador de Rentabilidad por Presentación
* **RF-13:** MIENTRAS el usuario posea rol `ADMIN` o `SOCIO`, EL SISTEMA mostrará en la ficha de la receta:
  1. Costo unitario proyectado de cada ingrediente.
  2. Costo teórico total del lote base.
  3. Costo teórico por unidad de medida base (por litro o por kilogramo).
* **RF-13.1:** Para recetas de categoría `FASE_B`, EL SISTEMA dispondrá de un **Simulador Interactivo de Presentación Comercial** conectado al catálogo dinámico `ProductPresentation`. EL SISTEMA filtrará automáticamente del simulador toda presentación comercial con `isActive = false` o con capacidad nula o negativa (`capacityLiters <= 0`).
* **RF-13.2:** CUANDO el usuario con rol `ADMIN` o `SOCIO` seleccione una presentación en el simulador (ej. *1 Litro*, *2 Litros*, *500 ml*), EL SISTEMA calculará y mostrará en tiempo real:
  1. **Costo de líquido proporcional:** Costo de la mezcla (base láctea + mermelada) correspondiente a la capacidad en litros de la presentación.
  2. **Insumos de empaque asignados:** Dado que los envases comerciales en YogurArte vienen con su tapa integrada de fábrica (no se gestiona tapa por separado), EL SISTEMA resolverá automáticamente los empaques buscando en `RawMaterial` los ítems con categoría `EMPAQUE` cuyos códigos coincidan con la convención normalizada en mayúsculas sin espacios: buscará primero el código canónico `BOTELLA_<PRESENTACION>` (y si no existe, el alternativo `ENVASE_<PRESENTACION>`), y el código `ETIQUETA_<PRESENTACION>` (ej. *"500 ml"* $\rightarrow$ `BOTELLA_500ML` y `ETIQUETA_500ML`; *"1 Litro"* o *"1L"* $\rightarrow$ `BOTELLA_1L` y `ETIQUETA_1L`), sumando su costo promedio vigente (`avgCost`). Si algún insumo no existe en el catálogo, computará costo \$0 con alerta informativa sin bloquear el cálculo.
  3. **Costo teórico total por unidad envasada:** $\text{Costo Líquido Proporcional} + \text{Costo Empaques}$.
  4. **Precio de venta oficial (`defaultPrice`):** Precio de lista de la presentación en el sistema.
  5. **Utilidad bruta proyectada en COP:** $\text{defaultPrice} - \text{Costo Total Unidad}$.
  6. **Margen de rentabilidad bruta en porcentaje:** $\frac{\text{defaultPrice} - \text{Costo Total Unidad}}{\text{defaultPrice}} \times 100$ con semáforo visual: verde $\ge 40\%$, amarillo $25\% - 39.9\%$, rojo $< 25\%$.
* **RF-13.3:** Para recetas de categoría `ELABORACION` y `FASE_A`, EL SISTEMA mostrará la indicación *"Uso interno en producción / No comercial"* en lugar de métricas de margen de venta.
* **RF-14:** MIENTRAS el usuario posea rol `PRODUCCION` (operario de planta), EL SISTEMA omitirá de manera estricta desde la API en el backend (serialización segura) y en la UI todo dato de costo de insumo, costo total, costo unitario, costo de empaque, precio de venta, utilidad y margen de ganancia.

### 6. Integración con la Producción Diaria e Inmutabilidad
* **RF-15:** CUANDO el operario inicie el registro de una preparación en el módulo de Inventario/Elaboraciones (`PrepareCompoundModal.vue`), EL SISTEMA ofrecerá un selector para cargar una receta de categoría `ELABORACION`, autoseleccionando de inmediato el insumo compuesto de salida (`outputMaterialId`) y precargando las materias primas crudas escaladas reactivamente según los kilos a producir.
* **RF-16:** CUANDO el operario inicie un envasado en Fase B (`BatchPackaging`), EL SISTEMA ofrecerá un selector de recetas activas de Fase B (permitiendo elegir la variante específica si existen múltiples recetas para el sabor, ej. Tradicional o Light); al seleccionarla, EL SISTEMA precargará inmediatamente el sabor, los litros de base láctea y la proporción de mermelada requerida, y al ingresar o editar las cantidades de botellas por presentación en el formulario, los empaques se calcularán reactivamente. SI la receta contiene al menos un insumo inactivo en el inventario (`isActive: false`), ENTONCES EL SISTEMA bloqueará la precarga y mostrará una alerta descriptiva indicando el insumo inactivo.
* **RF-16.1:** SI en el momento de envasar en Fase B no existen lotes de Fase A con estado `COMPLETADO` o con litros disponibles, ENTONCES EL SISTEMA bloqueará la confirmación del lote conforme al Artículo 5 de la Constitución, informando al operario que debe completar previamente un lote de fermentación.
* **RF-17:** EL SISTEMA permitirá al operario ajustar interactivamente las cantidades de insumos directamente en el modal de preparación de elaboraciones (`PrepareCompoundModal.vue`) y en el de envasado (`BatchModal.vue`) antes de confirmar la fabricación (pudiendo modificar los gramos o kilos reales pesados en la paila, o agregar/quitar insumos de esa tanda puntual). Dichos ajustes aplicarán exclusivamente a la orden/lote puntual en curso, descontando del inventario exactamente lo utilizado físicamente sin obligar al usuario a editar previamente la receta del insumo en el catálogo de almacén y manteniendo la receta maestra del Libro de Recetas completamente inmutable.

### 7. Formato Limpio de Impresión / Ficha de Planta
* **RF-18:** CUANDO el usuario active la opción "Ficha de Planta / Imprimir", EL SISTEMA abrirá una vista optimizada con soporte nativo `@media print`, ocultando navegación, barras laterales y botones de edición, conteniendo únicamente: título, sabor, rendimiento base o escalado, tabla de ingredientes y tabla de pasos con tiempos, temperaturas y controles de calidad con tipografía de alto contraste.

### 8. Gestión, Ciclo de Vida y Auditoría
* **RF-19:** CUANDO un usuario con rol `ADMIN` o `SOCIO` cree o edite una receta, EL SISTEMA validará que el nombre no esté vacío, el código sea único y el rendimiento base sea estrictamente positivo. Para recetas de `ELABORACION` y `FASE_A`, exigirá al menos un ingrediente válido en `RecipeIngredient`; para recetas de `FASE_B`, exigirá `baseLiters > 0`, `flavor` obligatorio y `baseYield >= baseLiters` (admitiendo lista de ingredientes de almacén vacía para formulaciones puras de yogur natural), garantizando coherencia con el principio de expansión volumétrica del Artículo 5.6 de la Constitución.
* **RF-20:** SI una receta posee registros históricos vinculados en lotes o preparaciones pasadas, ENTONCES EL SISTEMA no permitirá su eliminación física definitiva (`DELETE`), ofreciendo en su lugar la acción de `ARCHIVAR` (`status: ARCHIVADA`) para preservarla en el historial sin que aparezca en los selectores activos de producción diaria.
* **RF-21:** Las modificaciones a una receta maestra no alterarán retroactivamente los costos, insumos ni registros de lotes o elaboraciones cerradas en fechas previas.
* **RF-22:** Toda creación o modificación de receta registrará la autoría en la cuenta de acceso del usuario (`User.id`), respetando la separación entre usuarios y colaboradores (`StaffMember`) según el Artículo 2 de la Constitución.
* **RF-23:** Toda operación de creación, actualización o versionado de una receta junto con sus ingredientes (`RecipeIngredient`) y pasos (`RecipeStep`) se ejecutará obligatoriamente dentro de una transacción interactiva atómica de base de datos (`prisma.$transaction`), conforme al Artículo 9 Numeral 2 de la Constitución.

---

## Requisitos no funcionales
* **RNF-1 (Rendimiento del Escalador y Simulador):** El cálculo reactivo de cantidades e insumos en el escalador y en el simulador de presentaciones debe ejecutarse en el cliente de forma instantánea ($< 50$ ms).
* **RNF-2 (Seguridad RBAC en Backend):** La omisión de datos de costos para usuarios con rol `PRODUCCION` debe ser forzada desde el backend en los serializadores y servicios de la API, no únicamente oculta por CSS o condicionales de Vue.
* **RNF-3 (Compatibilidad UI/UX):** La vista del Libro de Recetas debe ser completamente adaptable a dispositivos móviles, tablets de planta y computadores de escritorio, con tipografía de alto contraste legible en condiciones de iluminación de fábrica.
* **RNF-4 (Trazabilidad y Constitución):** La autoría de las recetas se registrará estrictamente con `User.id` (cuenta de usuario) y marca de tiempo de última actualización.

---

## Casos límite
1. **Insumo con costo cero o sin compras previas:** Si una materia prima tiene `avgCost = 0` en inventario, el sistema calcula el costo con cero sin arrojar error por división y muestra una alerta informativa al administrador indicando que el insumo no tiene costo promedio asignado.
2. **Presentación eliminada o modificada:** Si una presentación de Fase B (`ProductPresentation`) cambia de precio o capacidad, el simulador de rentabilidad se recalcula dinámicamente con los nuevos parámetros del catálogo sin corromper datos históricos de lotes cerrados.
3. **Escalado a decimales en empaque:** Las cantidades escaladas de insumos con categoría `EMPAQUE` (tapas, botellas, etiquetas) se redondean con `Math.ceil` hacia arriba para evitar fracciones de botellas en órdenes de trabajo de planta.
4. **Receta sin pasos definidos:** Si una receta tiene solo ingredientes pero no tiene pasos detallados, el sistema permite guardarla y muestra una advertencia visual *"Procedimiento pendiente"* en la tarjeta para incentivar la documentación completa sin bloquear la operación.
5. **Insumo desactivado en inventario:** Si una materia prima asignada a una receta es desactivada en el almacén (`isActive: false`), la receta se muestra con una advertencia visual *"Insumo inactivo en inventario"* y se bloquea la precarga en producción hasta que se actualice la fórmula o se reactive el insumo.
6. **Ausencia de base láctea para envasar:** Si no hay lotes de Fase A completados con saldo disponible, el simulador teórico permite consultar costos en el recetario, pero bloquea el registro de envasado en planta.
7. **Presentaciones comerciales inactivas o con capacidad inválida:** Se filtran y ocultan automáticamente del simulador de rentabilidad de Fase B sin generar cálculos erróneos, divisiones por cero ni valores `NaN`/`Infinity`.
8. **Incoherencia de volumen en Fase B (`baseYield < baseLiters`):** El validador Zod rechaza la creación o edición con error 400 descriptivo: *"El rendimiento final del yogur no puede ser menor a los litros de base láctea extraídos"*.
9. **Eliminación de materias primas vinculadas a recetas:** Si un usuario intenta eliminar físicamente un `RawMaterial` que está referenciado como ingrediente en una receta existente, el sistema bloquea la eliminación garantizando la integridad referencial y emite error 400: *"No se puede eliminar el insumo porque está siendo utilizado en recetas maestras"*.
10. **Unicidad global de código de receta:** La restricción de unicidad del campo `code` aplica globalmente en la base de datos; si se intenta crear una receta con un código existente (incluso si pertenece a una receta archivada), el sistema rechaza la solicitud exigiendo un código identificador único.
11. **Ajuste in situ de materias primas en elaboraciones:** Si en una tanda de mermelada el operario utiliza cantidades reales de fruta o azúcar distintas a la fórmula teórica (ej. 3.8 kg en vez de 3.2 kg calculados), el sistema descuenta del Kardex las cantidades reales ingresadas y recalcula el costo unitario de la preparación sin alterar la fórmula guardada en la receta maestra ni en el insumo de inventario.

---

## Fuera de alcance
* Control automatizado por hardware, válvulas o sensores IoT en pailas y marmitas (el operario lee y registra las temperaturas manualmente con termómetro de inmersión).
* Facturación electrónica o emisión de órdenes de compra automáticas a proveedores (cubierto en otros módulos).

---

## Criterios de finalización
- [ ] Modelo de datos en Prisma (`Recipe`, `RecipeIngredient`, `RecipeStep`) implementado y migrado.
- [ ] Endpoints REST canónicos en `src/modules/recipes/` para CRUD, escalado y fichas técnicas protegidos con RBAC.
- [ ] Serialización segura: exclusión garantizada de costos y márgenes para usuarios con rol `PRODUCCION` en backend y frontend.
- [ ] Componente del Libro de Recetas en el frontend con vista de tarjetas, filtros por categoría (Elaboraciones, Fase A, Fase B) y buscador.
- [ ] Modal de detalle de receta con escalador dinámico en vivo, pasos con tiempos/temperaturas estructurados y controles de calidad.
- [ ] Simulador interactivo de rentabilidad por presentación para administradores en recetas de Fase B (con cálculo automático de empaque `BOTELLA_*` y `ETIQUETA_*`, precio oficial y margen bruto).
- [ ] Modo limpio de impresión / ficha de planta con soporte `@media print`.
- [ ] Precarga de recetas con 1 clic en modales de Elaboraciones y Fase B manteniendo inmutable la receta maestra.
- [ ] Pruebas unitarias y de integración pasando al 100% en `vitest`.
- [ ] Compilación TypeScript (`tsc`) y build de Vite en verde.

---

## Dudas abiertas
*Ninguna (todas las decisiones de dominio y negocio fueron resueltas y blindadas al 100%).*
