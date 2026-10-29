# Spec 003 — Búsqueda Inteligente de Insumos e Historial de Elaboraciones con Reversión

Estado: borrador

## Contexto y objetivo
A medida que la fábrica amplía su catálogo de materias primas, insumos y preparaciones (envases, tapas, pulpas, mermeladas, etiquetas y cultivos), los menús desplegables estáticos generan fricción operativa y lentitud, obligando al usuario a desplazarse por listas extensas.

Por otro lado, la transformación interna de materias primas en insumos compuestos (como la preparación de mermeladas artesanas) descuenta existencias en bodega de forma inmediata. Si el usuario comete un error al preparar una tanda o necesita cancelar la acción, actualmente carece de una interfaz visible para consultar el histórico de lo preparado y revertir o anular la operación, viéndose obligado a intervenir la base de datos o realizar ajustes manuales desarticulados.

El objetivo de esta especificación es:
1. Dotar al módulo de inventario de una pestaña de histórico de elaboraciones internas (similar al Kardex de movimientos), con detalle de materias primas consumidas y capacidad de anular/deshacer la preparación con devolución íntegra del stock.
2. Implementar selectores con búsqueda predictiva y filtrado en tiempo real en todos los formularios de inventario y producción para agilizar la selección de insumos.

## Usuarios
- **Operador de Producción / Administrador**: Registra preparaciones de mermeladas, compras y ajustes de almacén, y necesita localizar insumos con rapidez y corregir o deshacer preparaciones erróneas.

## Historias de usuario
- **HU-1**: Como operador, quiero escribir el nombre o código de un insumo en una caja de búsqueda para encontrarlo y seleccionarlo inmediatamente sin hacer scroll por una lista larga.
- **HU-2**: Como operador, quiero ver el stock actual y la unidad de medida de cada insumo dentro de las sugerencias de búsqueda para saber si tengo disponibilidad antes de seleccionarlo.
- **HU-3**: Como operador, quiero tener una pestaña de historial de elaboraciones en el inventario para auditar qué mermeladas o preparados se han fabricado, cuándo y con qué materias primas.
- **HU-4**: Como operador, quiero anular o deshacer una elaboración de insumo compuesto para que el sistema devuelva automáticamente las materias primas al almacén y descuente el preparado elaborado.
- **HU-5**: Como operador, quiero editar la fecha u observaciones de una elaboración existente sin alterar el stock si los insumos no variaron.

## Definiciones
- **Insumo Compuesto**: Aquel insumo elaborado internamente en planta mediante una receta que combina otras materias primas (ej. Mermelada = Fruta + Azúcar).
- **Elaboración / Preparación**: Registro operativo que formaliza la transformación de ingredientes en un insumo compuesto, descontando materias primas del almacén y sumando el stock del producto resultante.
- **Reversión Atómica**: Proceso en el cual, de forma indivisible, se restaura el stock de todos los insumos consumidos y se resta el insumo obtenido, garantizando que el almacén quede exactamente en su estado previo.

## Requisitos funcionales (EARS)

### Selección de Insumos con Búsqueda en Tiempo Real
- **RF-1**: MIENTRAS el usuario escribe en un campo de selección de insumo, EL SISTEMA debe filtrar en tiempo real las opciones que coincidan por nombre, código o categoría, ignorando mayúsculas, minúsculas y tildes.
- **RF-2**: EL SISTEMA debe mostrar en cada sugerencia desplegada el nombre completo del insumo, su categoría y su existencia disponible actual formateada con su unidad de medida.
- **RF-3**: CUANDO el usuario presione las flechas arriba/abajo y la tecla Enter o haga clic sobre una sugerencia, EL SISTEMA debe seleccionar dicho insumo, cerrar el menú desplegable y reflejar su nombre en el campo.
- **RF-4**: CUANDO un insumo ya esté seleccionado, EL SISTEMA debe mostrar un botón para limpiar la selección con un solo clic y permitir una nueva búsqueda.
- **RF-5**: SI la búsqueda del usuario no arroja ninguna coincidencia, ENTONCES EL SISTEMA debe mostrar un mensaje claro indicando "No se encontraron insumos coincidentes".

### Historial de Elaboraciones de Insumos
- **RF-6**: EL SISTEMA debe proveer en la pantalla de inventario una pestaña o vista dedicada al "Historial de Elaboraciones", ordenada cronológicamente de la más reciente a la más antigua.
- **RF-7**: EL SISTEMA debe mostrar en cada registro de elaboración: código de preparación, fecha de fabricación, insumo elaborado, cantidad neta obtenida, costo total acumulado, costo unitario resultante, usuario responsable y desglose desplegable de cada materia prima utilizada con su cantidad descontada.
- **RF-8**: SI no existen elaboraciones registradas en el sistema, ENTONCES EL SISTEMA debe mostrar un estado vacío informativo que invite a preparar el primer insumo compuesto.

### Anulación y Deshacer de Elaboraciones
- **RF-9**: CUANDO el usuario solicite anular una elaboración y confirme la advertencia de seguridad, EL SISTEMA debe revertir la preparación de forma atómica:
  1. Devolver exactamente la cantidad consumida a cada una de las materias primas utilizadas.
  2. Restar la cantidad producida del stock del insumo compuesto elaborado.
  3. Eliminar o marcar como inactiva la elaboración para que no afecte auditorías ni balances.
- **RF-10**: SI el insumo elaborado ya no tiene suficiente stock disponible en bodega (por ejemplo, porque ya fue envasado y consumido en fracciones de yogur), ENTONCES EL SISTEMA debe impedir la anulación y mostrar un mensaje de error indicando que el stock actual no cubre la cantidad a revertir.
- **RF-11**: CUANDO una elaboración sea anulada exitosamente, EL SISTEMA debe emitir una notificación confirmando la restauración de las materias primas y actualizar de inmediato las existencias visibles en pantalla.

## Requisitos no funcionales
- **RNF-1 (Usabilidad móvil y táctil)**: Las listas de sugerencias deben tener áreas de toque confortables (mínimo 44px de altura por ítem) y scroll táctil fluido sin solaparse con teclados virtuales.
- **RNF-2 (Rendimiento)**: El filtrado de opciones en el selector de insumos debe responder en menos de 50 ms para un catálogo de hasta 500 insumos locales.
- **RNF-3 (Integridad transaccional)**: La reversión de una preparación debe realizarse bajo una transacción única de base de datos (`prisma.$transaction`), impidiendo inconsistencias parciales de inventario.
- **RNF-4 (Consistencia de Diseño)**: El selector y la pestaña de elaboraciones deben mantener el diseño de la aplicación (Tailwind, Dark Mode, Reka UI y bordes suaves).

## Casos límite
1. **Insumo con stock fraccionario**: Insumos medidos en decimales (ej. 0.4 Kg de azúcar o 1.72 Kg de fresa) deben restaurarse con precisión exacta de decimales sin redondeos distorsionados.
2. **Insumo eliminado o desactivado**: Si una materia prima utilizada en una elaboración pasada fue desactivada del catálogo, la anulación debe ser capaz de devolverle el stock sin fallar por validación de estado activo.
3. **Cierre de desplegable por desenfoque (blur / click outside)**: Si el usuario hace clic fuera del menú de sugerencias o presiona la tecla `Escape`, el menú flotante debe cerrarse sin alterar el valor seleccionado previamente.
4. **Edición con receta modificada**: Si la receta del insumo compuesto cambió con posterioridad a la elaboración, la anulación debe basarse estrictamente en las cantidades registradas en el histórico de esa elaboración particular, nunca en la receta actual.

## Fuera de alcance
- Reversión automática de preparaciones cuyos productos terminados ya hayan sido entregados o facturados a clientes.
- Creación de nuevas materias primas al vuelo desde el selector de búsqueda (se mantiene en su modal dedicado de insumos).

## Criterios de finalización
- [ ] Selector con autocompletado implementado y verificado en todos los modales de insumos (`PrepareCompoundModal`, `PurchaseStockModal`, `InventoryMovementModal`, `MaterialModal`, `PackagingModal`).
- [ ] Pestaña de Historial de Elaboraciones visible y operativa en Inventario.
- [ ] Reversión de elaboraciones probada mediante tests unitarios y de integración con restablecimiento exacto del stock.
- [ ] Cero errores en `npx tsc --noEmit` y `npm --prefix frontend run build`.
- [ ] Aprobación de la spec, plan y tareas por parte del usuario.

## Dudas abiertas
- [NECESITA ACLARACIÓN] En la pestaña de elaboraciones, además de "Anular / Deshacer" (que devuelve el 100% de los insumos y borra la preparación), ¿deseas también un botón de "Editar" para modificar únicamente la fecha y notas de la preparación, o prefieres que cualquier cambio de cantidades se gestione anulando y volviendo a preparar?
