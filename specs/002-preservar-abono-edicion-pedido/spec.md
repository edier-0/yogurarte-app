# Spec 002 — Preservación de Abono en Edición de Pedidos

Estado: implementada

## Contexto y objetivo
Al editar un pedido existente desde cualquier vista del sistema (por ejemplo, para actualizar notas de cobro, dirección de entrega o fecha de entrega), el formulario debe precargar y respetar el monto previamente abonado por el cliente. Actualmente, si el formulario no inicializa dicho valor, al presionar "Guardar Cambios" se envía un abono en cero ($0), eliminando de forma inadvertida el recaudo previo del cliente y alterando erróneamente los saldos de tesorería y cuentas digitales (como Nequi o Efectivo).

El objetivo es garantizar que la edición de cualquier pedido conserve fielmente el abono registrado a menos que el usuario decida modificarlo explícitamente.

## Usuarios
- Administradores y operadores de ventas que gestionan y actualizan pedidos en curso.

## Historias de usuario
- **HU-1**: Como operador, quiero que al abrir la ventana de edición de un pedido se muestre el valor exacto que el cliente ya tiene abonado, para evitar reescribirlo y prevenir la pérdida accidental de información contable.
- **HU-2**: Como operador, quiero poder ajustar intencionalmente el monto abonado si es necesario, visualizando en tiempo real la actualización del saldo pendiente por cobrar.

## Requisitos funcionales (EARS)
- **RF-1**: CUANDO el usuario abre la edición de un pedido existente, EL SISTEMA precargará en el campo de abono el monto acumulado que el cliente ya tiene pagado en dicho pedido.
- **RF-2**: CUANDO el usuario guarda los cambios de un pedido sin modificar el campo de abono, EL SISTEMA mantendrá el monto abonado original sin sobrescribirlo en cero ni distorsionar los balances de caja o bancos.
- **RF-3**: CUANDO el usuario modifica manualmente el valor del abono durante la edición, EL SISTEMA recalculará de forma inmediata el saldo pendiente como la diferencia no negativa entre el monto total a pagar y el nuevo abono ingresado.
- **RF-4**: SI el pedido a editar no cuenta con pagos o abonos previos, ENTONCES EL SISTEMA inicializará el campo de abono en cero ($0) y fijará el saldo pendiente en el total de la venta.
- **RF-5**: EL SISTEMA garantizará la coherencia entre el monto pagado del pedido y el balance disponible en tesorería (efectivo y bancos digitales).

## Requisitos no funcionales
- **RNF-1 (Integridad)**: Modificar campos no financieros (notas, dirección, teléfono, domiciliario asignado, fecha) no debe alterar bajo ninguna circunstancia el monto abonado ni su método de pago.
- **RNF-2 (Reactividad)**: El cálculo del saldo pendiente en pantalla debe ser inmediato ante cualquier cambio de valor numérico en el formulario.

## Casos límite
- Pedido totalmente pagado (`paidAmount == totalAmount`): El campo de abono muestra el monto completo y el saldo pendiente es $0.
- Pedido con abono parcial (`0 < paidAmount < totalAmount`): El campo muestra la fracción pagada y el saldo pendiente exacto.
- Pedido sin abonos (`paidAmount == 0`): El campo muestra $0 y el saldo pendiente equivale al total facturado.
- Edición únicamente de notas (ej. "paga el 30"): El abono previo se conserva intacto al guardar.

## Fuera de alcance
- Reestructuración del flujo de arqueo general de caja o del módulo de domicilios.
- Integración de pasarelas de pago automatizadas.

## Criterios de finalización
- Al abrir la edición de un pedido con abono existente, el campo de abono refleja su valor real.
- Guardar modificaciones de notas u otros campos preserva el valor abonado y los saldos en tesorería.
- Validación funcional y pruebas de interfaz superadas satisfactoriamente.

## Dudas abiertas
- No hay dudas abiertas detectadas.
