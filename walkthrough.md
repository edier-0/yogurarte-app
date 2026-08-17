# Resumen de Actualizaciones y Mejoras - YogurArte

## 1. 🧹 Limpieza y Reinicio de la Base de Datos
- Se eliminaron todos los registros de prueba previos (pedidos, clientes, lotes, compras y gastos).
- Se configuraron los **2 únicos usuarios autorizados**:
  - 👤 **Edier** (Usuario: `edier` | Contraseña: `edier123`)
  - 👤 **Yeilin** (Usuario: `yeilin` | Contraseña: `yeilin123`)
- Se inicializaron los 4 insumos base en stock 0: *Leche Entera Cruda, Botella 1 Litro, Botella 2 Litros y Etiquetas Adhesivas*.

## 2. 🔐 Pantalla de Inicio de Sesión (Login) y Seguridad
- Nueva pantalla de bloqueo y autenticación con identidad visual de YogurArte.
- Opción de seleccionar el usuario (`Edier` o `Yeilin`) e ingresar la contraseña correspondiente con botón para ver/ocultar contraseña (👁️/🙈).
- Persistencia de sesión en el navegador con opción de **Cerrar Sesión (🚪)** tanto en el panel lateral (escritorio) como en la barra superior (móvil y tablet).

## 3. 📝 Visualización de Notas en Tarjetas de Pedidos
- Las tarjetas de pedidos ahora muestran una caja destacada con la nota ingresada (ej: *"Entregar después de las 3:00 PM"*). Si el pedido no tiene nota, no ocupa espacio innecesario.

## 4. 🛒 Pedidos con Múltiples Productos en 1 Sola Orden
- Soporte para agregar múltiples presentaciones y sabores en un mismo pedido:
  - Botón `+ Agregar Otro Producto`.
  - Permite combinar botellas de 1L y 2L de diferentes sabores en la misma orden.
  - Cálculo automático de litros totales y monto acumulado.
  - Desglose detallado por producto tanto en la tarjeta como en el mensaje automático de WhatsApp.

## 5. ✏️ Edición Completa de Pedidos
- Botón `✏️ Editar` en cada tarjeta de pedido.
- Permite modificar datos del cliente, cambiar o agregar productos, actualizar montos y estados de entrega en tiempo real.

## 6. 🍶 Registro de Producción por Lotes Simplificado
- Deducción 100% automática del inventario de leche, botellas de 1L, botellas de 2L y etiquetas (1 por botella).
- Opción simple para insumos adicionales (frutas / azúcar) con desplazamiento fluido.
- Botón "Guardar Lote" siempre visible y accesible.
