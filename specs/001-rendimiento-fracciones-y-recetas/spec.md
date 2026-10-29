# Spec 001 — Rendimiento Real en Fraccionamiento de Yogures y Costeo de Preparaciones

Estado: borrador

## Contexto y objetivo
Actualmente, el sistema asume erróneamente que la expansión de volumen generada por el almíbar de azúcar o por las pulpas/mermeladas de fruta se debe calcular o registrar al finalizar la fermentación (Fase A). 

En la realidad operativa de YogurArte:
1. **La fermentación (Fase A)** produce yogur base puro sin sabor. Si se fermentan 12 litros de leche, se obtienen 12 litros de base de yogur (salvo variaciones menores por desuerado anotadas en la finalización).
2. **El rendimiento real ocurre en el fraccionamiento (Fase B)**:
   - Al fraccionar para **Yogur Natural**, se añade almíbar de azúcar. El volumen del azúcar disuelto expande el volumen final obtenido (ej. 6 L de yogur base + almíbar rinden 6.5 L o más de yogur natural terminado).
   - Al fraccionar para **Yogures con Fruta**, el producto final combina yogur base con mermelada/pulpa. Por ejemplo, en una presentación de 500 ml donde 100 ml corresponden a fruta y 400 ml a yogur base, 6 litros de yogur base permiten envasar 15 botellas de 500 ml (7.5 litros comerciales), consumiendo 6 L de base láctea y 1.5 kg/L de mermelada.
3. **Las preparaciones de insumos compuestos (ej. Mermeladas)**: Parten de una fruta base (ej. 1700 g), pero con el azúcar y demás ingredientes producen un volumen/peso final mayor al peso de la fruta inicial.

El objetivo de esta especificación es corregir el modelo operativo para que:
- El lote de fermentación conserve sus litros reales de yogur base sin inflar artificialmente su volumen antes de tiempo.
- Cada fracción registre cuántos litros de base consume del lote madre, cuántos insumos (fruta, almíbar) incorpora y cuántas unidades/litros comerciales terminados rinde.
- El costo unitario y la rentabilidad se calculen con precisión matemática considerando la base láctea consumida, los ingredientes agregados y el material de empaque.
- Las preparaciones de mermelada calculen su rendimiento neto real y su costo unitario exacto por kilogramo producido.

---

## Usuarios
- **Maestro Yogurtero / Administrador de Producción**: Responsable de registrar la finalización de fermentación, la preparación de mermeladas y el fraccionamiento envasado por sabores.
- **Administrador Financiero**: Consulta la rentabilidad real de cada lote, fracción y producto terminado, asegurando que los costos unitarios reflejen el rendimiento físico exacto.

---

## Historias de usuario
- **HU-1**: Como maestro yogurtero, quiero que un lote en fermentación mantenga exactamente los litros de base láctea producida, para no tener que proyectar aumentos de volumen antes de decidir los sabores.
- **HU-2**: Como maestro yogurtero, quiero que al envasar una fracción de sabor (fruta o natural con almíbar), el sistema me permita registrar el volumen de yogur base que consumo del lote y las unidades comerciales que obtengo gracias a los agregados, para que el stock de base láctea se descuente con exactitud sin bloquear el envasado.
- **HU-3**: Como administrador de producción, quiero que al elaborar mermeladas pueda ingresar la fruta y demás ingredientes, y registrar la cantidad final neta obtenida, para que el costo unitario de la mermelada se calcule dividiendo el costo total entre los kilos reales producidos.
- **HU-4**: Como administrador financiero, quiero ver la rentabilidad y costo unitario real de cada fracción por sabor, reflejando el costo del yogur base consumido más los insumos agregados y el empaque.

---

## Definiciones
- **Yogur Base**: Masa fermentada pura sin azúcar añadida ni frutas, resultante directa de la Fase A de fermentación.
- **Fracción (Fase B)**: División operativa de un lote madre en un sabor específico (Natural con almíbar, Fresa, Mora, Melocotón, etc.) y en presentaciones comerciales definidas.
- **Litros de Base Consumidos**: Volumen de yogur base puro que se extrae del lote madre para elaborar una fracción.
- **Volumen Comercial Envasado**: Suma de las capacidades de los recipientes envasados (ej. 15 botellas de 500 ml = 7.5 L comerciales).
- **Factor de Expansión / Desplazamiento**: Diferencia positiva entre el volumen comercial envasado y los litros de base consumidos, originada por la adición de almíbar o pulpa de fruta.
- **Preparación (Insumo Compuesto)**: Transformación en cocina de materias primas (fruta cruda, azúcar, pectina) en un insumo listo para envasado (ej. Mermelada artesanal).

---

## Requisitos funcionales

### Fase A: Finalización de Lote Madre
- **RF-1**: CUANDO un lote pasa de fermentación a estado disponible, EL SISTEMA establece su volumen base disponible como igual a los litros de leche utilizados, a menos que el usuario indique una merma o volumen medido real en la nota de finalización.
- **RF-2**: EL SISTEMA prohíbe exigir la adición de almíbar o pulpas durante la finalización del lote madre de fermentación.

### Fase B: Fraccionamiento y Rendimiento por Sabor
- **RF-3**: CUANDO el usuario registra un fraccionamiento de sabor natural, EL SISTEMA calcula el volumen de yogur base consumido descontando el volumen aportado por el almíbar del volumen comercial total envasado.
- **RF-4**: CUANDO el usuario registra un fraccionamiento con fruta/mermelada, EL SISTEMA descuenta del lote madre únicamente la porción correspondiente a yogur base por botella (ej. capacidad de envase menos contenido de fruta) multiplicada por el número de unidades envasadas.
- **RF-5**: SI la suma de litros de yogur base requeridos por una fracción supera los litros de base disponibles en el lote madre, ENTONCES EL SISTEMA bloquea el registro e informa los litros de base disponibles versus los solicitados.
- **RF-6**: CUANDO se guarda la fracción, EL SISTEMA descuenta de inventario la cantidad exacta de fruta, almíbar, envases, tapas y etiquetas utilizados.
- **RF-7**: EL SISTEMA calcula el costo total de la fracción sumando: (Litros de base consumidos $\times$ Costo por litro de base) + Costo de insumos saborizantes + Costo de materiales de empaque.
- **RF-8**: EL SISTEMA calcula el costo unitario de cada presentación dividiendo el costo total atribuible entre el número de unidades obtenidas de esa presentación.
- **RF-9**: EL SISTEMA calcula el porcentaje de rendimiento de la fracción como: $(\text{Volumen Comercial Envasado} / \text{Litros de Base Consumidos}) \times 100$.

### Preparaciones de Mermeladas e Insumos Compuestos
- **RF-10**: CUANDO el usuario registra la elaboración de una preparación (mermelada), EL SISTEMA descuenta del inventario las materias primas consumidas (fruta, azúcar, aditivos).
- **RF-11**: CUANDO se completa la preparación, EL SISTEMA registra la cantidad final neta producida (peso o volumen real obtenido) especificada por el usuario.
- **RF-12**: EL SISTEMA calcula el costo unitario del insumo compuesto dividiendo el costo total de todos los ingredientes consumidos entre la cantidad neta final producida.
- **RF-13**: EL SISTEMA incrementa el stock de inventario del insumo compuesto con la cantidad neta producida y actualiza su costo promedio ponderado.

---

## Requisitos no funcionales
- **RNF-1 (Precisión Matemática)**: Todos los cálculos de volumen y costos deben redondearse como máximo a 4 decimales en operaciones intermedias y mostrarse a 2 decimales en moneda y volúmenes para el usuario.
- **RNF-2 (Integridad Atómica)**: Ninguna fracción ni preparación puede actualizar stock o costos si falla cualquiera de las operaciones de validación o inserción en la base de datos.
- **RNF-3 (Compatibilidad)**: Las fracciones y preparaciones históricas previamente registradas en el sistema deben permanecer inalteradas en su auditoría contable.

---

## Casos límite
1. **Lote 100% natural sin aumento**: Si no se añade almíbar ni azúcar extra, 1 litro de base = 1 litro comercial.
2. **Uso de múltiples presentaciones en la misma fracción**: Una fracción puede envasarse simultáneamente en botellas de 1 L y botellas de 500 ml. El sistema debe calcular el yogur base y la fruta total sumando cada tipo de envase.
3. **Mermelada con evaporación alta**: Si por cocción el peso final es menor a la fruta inicial, el sistema debe permitir registrar el peso real final sin forzar rendimientos mínimos, recalculando el costo por kilo hacia arriba.

---

## Fuera de alcance
- Modificación del catálogo de precios de venta al cliente final.
- Liquidación de comisiones de venta para domiciliarios o vendedores.
- Integración de balanzas electrónicas por hardware (la captura de peso sigue siendo manual en pantalla).

---

## Criterios de finalización
- [ ] Un lote de 12 litros en fermentación pasa a listo con 12 litros exactos de base disponible.
- [ ] Al envasar 15 botellas de 500 ml con 100 ml de fruta c/u (7.5 L comerciales), el sistema descuenta exactamente 6.0 L de yogur base del lote y 1.5 kg de fruta de almacén.
- [ ] El lote madre refleja 6.0 L restantes sin errores de "volumen insuficiente".
- [ ] La fracción muestra su costo real desglosado (base + fruta + envases) y costo unitario por botella.
- [ ] La preparación de mermelada registra los ingredientes consumidos, recibe la cantidad final producida y establece el costo promedio exacto del insumo compuesto.
- [ ] Las pruebas automáticas validan estos escenarios y la suite de regresión (`vitest`) pasa en verde.

---

## Dudas abiertas
- [NECESITA ACLARACIÓN] En la pantalla de envasar fracción, ¿prefieres que el usuario indique cuántos litros de base toma del lote (ej. "Tomo 6L de base") y el sistema sugiera cuántas botellas salen según la receta de fruta/almíbar, o prefieres que el usuario ingrese la cantidad de botellas terminadas (ej. "Envasé 15 botellas de 500 ml") y el sistema deduzca automáticamente cuántos litros de base y fruta se consumieron?
- [NECESITA ACLARACIÓN] Para el yogur natural con almíbar: ¿el almíbar se prepara previamente como un insumo compuesto en almacén con su propio stock, o se añade azúcar directamente en grano durante el fraccionamiento indicando los gramos de azúcar por litro?
- [NECESITA ACLARACIÓN] En las botellas con fruta (ej. 500 ml con 100 ml de fruta): ¿la proporción de fruta por envase (ej. 100 ml por cada 500 ml = 20%) está predeterminada por sabor o el yogurtero debe poder ajustar la cantidad exacta de fruta utilizada en cada fraccionamiento?
