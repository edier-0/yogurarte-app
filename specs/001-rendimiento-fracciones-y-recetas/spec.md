# Spec 001 — Rendimiento Real en Fraccionamiento de Yogures y Costeo de Preparaciones

Estado: lista para aprobación

## Contexto y objetivo
Actualmente, el sistema asume erróneamente que la expansión de volumen generada por el almíbar de azúcar o por las pulpas/mermeladas de fruta se debe calcular o registrar al finalizar la fermentación (Fase A).

En la realidad operativa de YogurArte:
1. **La fermentación (Fase A)** produce yogur base puro sin sabor. Si se fermentan 12 litros de leche, se obtienen 12 litros de base de yogur (salvo variaciones menores por desuerado anotadas en la finalización).
2. **El rendimiento real ocurre en el fraccionamiento (Fase B)**:
   - Al fraccionar para **Yogur Natural**, se añade azúcar disuelta en agua (almíbar casero). El volumen del azúcar disuelto expande el volumen final obtenido (ej. 6 L de yogur base + azúcar rinden 6.5 L o más de yogur natural terminado).
   - Al fraccionar para **Yogures con Fruta**, el producto final combina yogur base con mermelada/pulpa. Por ejemplo, en una presentación de 500 ml donde 100 ml corresponden a fruta y 400 ml a yogur base, 6 litros de yogur base rinden 15 botellas de 500 ml (7.5 litros comerciales), consumiendo 6 L de base láctea y 1.5 kg de mermelada.
3. **Las preparaciones de insumos compuestos (ej. Mermeladas)**: Parten de una fruta base (ej. 1700 g), pero con el azúcar y demás ingredientes producen un volumen/peso final mayor al peso de la fruta inicial.

El objetivo de esta especificación es corregir el modelo operativo para que:
- El lote de fermentación conserve sus litros reales de yogur base sin inflar artificialmente su volumen antes de tiempo.
- En el fraccionamiento, el yogurtero seleccione cuántos litros de base extrae del lote madre y los ingredientes añadidos, recibiendo una sugerencia teórica pero pudiendo confirmar/escribir las unidades reales finales obtenidas.
- El stock del lote madre descuente los litros de base láctea realmente asignados, sin bloquear el envasado por la expansión de volumen.
- El costo unitario y la rentabilidad se calculen con precisión matemática considerando la base láctea consumida, los ingredientes agregados y el material de empaque.
- Las preparaciones de mermelada calculen su rendimiento neto real y su costo unitario exacto por kilogramo producido.

---

## Usuarios
- **Maestro Yogurtero / Administrador de Producción**: Responsable de registrar la finalización de fermentación, la preparación de mermeladas y el fraccionamiento envasado por sabores.
- **Administrador Financiero**: Consulta la rentabilidad real de cada lote, fracción y producto terminado, asegurando que los costos unitarios reflejen el rendimiento físico exacto.

---

## Historias de usuario
- **HU-1**: Como maestro yogurtero, quiero que un lote en fermentación mantenga exactamente los litros de base láctea producida, para no tener que proyectar aumentos de volumen antes de decidir los sabores.
- **HU-2**: Como maestro yogurtero, quiero seleccionar cuántos litros de yogur base tomo del lote madre para una fracción y cuántos ingredientes agrego, recibiendo una sugerencia del rendimiento comercial pero pudiendo ingresar las botellas reales finales que salieron.
- **HU-3**: Como maestro yogurtero, quiero que al envasar yogur natural solo seleccione los gramos de azúcar utilizados (sin exigir un insumo compuesto de almíbar), y que al envasar fruta pueda ajustar manualmente la cantidad de mermelada a utilizar a partir de una sugerencia proporcional.
- **HU-4**: Como administrador de producción, quiero que al elaborar mermeladas pueda ingresar la fruta y demás ingredientes, y registrar la cantidad final neta obtenida, para que el costo unitario de la mermelada se calcule dividiendo el costo total entre los kilos reales producidos.
- **HU-5**: Como administrador financiero, quiero ver la rentabilidad y costo unitario real de cada fracción por sabor, reflejando el costo del yogur base consumido más los insumos agregados y el empaque sobre las botellas reales producidas.

---

## Definiciones
- **Yogur Base**: Masa fermentada pura sin azúcar añadida ni frutas, resultante directa de la Fase A de fermentación.
- **Fracción (Fase B)**: División operativa de un lote madre en un sabor específico (Natural, Fresa, Mora, Melocotón, etc.) y en presentaciones comerciales definidas.
- **Litros de Base Consumidos**: Volumen de yogur base puro que se extrae del lote madre para elaborar una fracción.
- **Volumen Comercial Envasado**: Suma de las capacidades de los recipientes envasados (ej. 15 botellas de 500 ml = 7.5 L comerciales).
- **Rendimiento de Fracción**: Relación porcentual entre el volumen comercial envasado y los litros de base consumidos: $(\text{Volumen Comercial Envasado} / \text{Litros de Base Consumidos}) \times 100$.
- **Preparación (Insumo Compuesto)**: Transformación en cocina de materias primas (fruta cruda, azúcar, pectina) en un insumo listo para envasado (ej. Mermelada artesanal).

---

## Requisitos funcionales

### Fase A: Finalización de Lote Madre
- **RF-1**: CUANDO un lote pasa de fermentación a estado disponible, EL SISTEMA establece su volumen base disponible como igual a los litros de leche utilizados, a menos que el usuario indique una merma o variación real por desuerado/enfriamiento en la nota de finalización.
- **RF-2**: EL SISTEMA prohíbe exigir o solicitar la adición de almíbar o pulpas durante la finalización del lote madre de fermentación.

### Fase B: Fraccionamiento y Rendimiento por Sabor
- **RF-3**: CUANDO el usuario inicia el envasado de una fracción, EL SISTEMA solicita los litros de yogur base a extraer del lote madre.
- **RF-4**: CUANDO el usuario selecciona el sabor y los insumos adicionales, EL SISTEMA calcula y muestra una sugerencia teórica de la cantidad de fruta o azúcar requerida y del número de botellas/litros comerciales estimados.
- **RF-5**: SI el sabor seleccionado es Natural, EL SISTEMA permite registrar la cantidad de azúcar utilizada en gramos o kilogramos y descuenta directamente dicho insumo del inventario de materias primas.
- **RF-6**: SI el sabor seleccionado es de fruta, EL SISTEMA sugiere una cantidad de mermelada/pulpa proporcional al volumen envasado y permite que el usuario ajuste manualmente la cantidad exacta utilizada.
- **RF-7**: CUANDO el usuario confirma las presentaciones y botellas reales obtenidas, EL SISTEMA descuenta del lote madre únicamente los litros de base láctea seleccionados, independientemente de que el volumen comercial envasado sea mayor por efecto de los ingredientes agregados.
- **RF-8**: SI los litros de yogur base seleccionados superan los litros de base disponibles en el lote madre, ENTONCES EL SISTEMA bloquea el registro e informa el saldo de base disponible versus el solicitado.
- **RF-9**: CUANDO se guarda la fracción, EL SISTEMA descuenta de inventario la cantidad exacta de ingredientes saborizantes (azúcar, mermelada), envases, tapas y etiquetas utilizados.
- **RF-10**: EL SISTEMA calcula el costo total de la fracción sumando: $(\text{Litros de base consumidos} \times \text{Costo por litro de base}) + \text{Costo de insumos saborizantes} + \text{Costo de materiales de empaque}$.
- **RF-11**: EL SISTEMA calcula el costo unitario de cada presentación dividiendo el costo total atribuible entre el número real de unidades obtenidas de esa presentación.
- **RF-12**: EL SISTEMA calcula y muestra el porcentaje de rendimiento de la fracción como: $(\text{Volumen Comercial Envasado} / \text{Litros de Base Consumidos}) \times 100$.

### Preparaciones de Mermeladas e Insumos Compuestos
- **RF-13**: CUANDO el usuario registra la elaboración de una preparación (mermelada), EL SISTEMA descuenta del inventario las materias primas consumidas (fruta, azúcar, aditivos).
- **RF-14**: CUANDO se completa la preparación, EL SISTEMA solicita y registra la cantidad final neta producida (peso o volumen real obtenido) especificada por el usuario.
- **RF-15**: EL SISTEMA calcula el costo unitario del insumo compuesto dividiendo el costo total de todos los ingredientes consumidos entre la cantidad neta final producida.
- **RF-16**: EL SISTEMA incrementa el stock de inventario del insumo compuesto con la cantidad neta producida y actualiza su costo promedio ponderado en el Kardex.

---

## Requisitos no funcionales
- **RNF-1 (Precisión Matemática)**: Todos los cálculos de volumen y costos deben redondearse como máximo a 4 decimales en operaciones intermedias y mostrarse a 2 decimales en moneda y volúmenes para el usuario.
- **RNF-2 (Integridad Atómica)**: Toda operación de fraccionamiento o preparación debe ejecutarse en una transacción atómica de base de datos; si falla cualquier descuento de stock o validación, se revierte la totalidad del cambio.
- **RNF-3 (Compatibilidad)**: Las fracciones y preparaciones históricas previamente registradas en el sistema deben permanecer inalteradas en su auditoría contable.

---

## Casos límite
1. **Lote 100% natural sin aumento**: Si no se añade azúcar ni almíbar, 1 litro de base = 1 litro comercial (rendimiento 100%).
2. **Uso de múltiples presentaciones en la misma fracción**: Una fracción puede envasarse simultáneamente en botellas de 1 L y botellas de 500 ml. El sistema calcula el total de envases y descuenta el yogur base global asignado.
3. **Mermelada con evaporación alta**: Si por cocción el peso final es menor al peso inicial de ingredientes, el sistema registra el peso real final sin forzar rendimientos mínimos, recalculando el costo por kilo hacia arriba.

---

## Fuera de alcance
- Modificación del catálogo de precios de venta al cliente final.
- Liquidación de comisiones de venta para domiciliarios o vendedores.
- Integración de balanzas electrónicas por hardware (la captura de peso sigue siendo manual en pantalla).

---

## Criterios de finalización
- [ ] Un lote de 12 litros en fermentación pasa a listo con 12 litros exactos de base disponible.
- [ ] Al envasar una fracción indicando 6.0 L de base y fruta para 15 botellas de 500 ml (7.5 L comerciales), el sistema descuenta exactamente 6.0 L de yogur base del lote y 1.5 kg de fruta de almacén.
- [ ] El lote madre refleja 6.0 L restantes sin errores de "volumen insuficiente".
- [ ] Al envasar yogur natural con azúcar, se descuenta el azúcar de inventario y se descuentan los litros base indicados del lote.
- [ ] La fracción muestra su costo real desglosado (base + ingredientes + envases), costo unitario por botella y porcentaje de rendimiento.
- [ ] La preparación de mermelada registra los ingredientes consumidos, recibe la cantidad final neta producida y establece el costo promedio exacto del insumo compuesto.
- [ ] La suite de pruebas de integración (`vitest`) pasa en verde sin regresiones.

---

## Decisiones de clarificación acordadas
1. **Flujo de fraccionamiento**: El usuario define cuántos litros de base extrae del lote madre y los ingredientes utilizados. El sistema proporciona una sugerencia teórica del rendimiento, pero el usuario ingresa la cantidad real final de botellas que salieron.
2. **Yogur Natural**: El almíbar no es un ítem de inventario; se maneja seleccionando directamente la cantidad de azúcar utilizada en gramos o kilos.
3. **Dosificación de fruta**: El sistema calcula una dosificación sugerida proporcional, pero el yogurtero puede ajustarla manualmente en cada fraccionamiento según sea necesario.
