# Plan de Arquitectura — Spec 002: Preservación de Abono en Edición de Pedidos

## 1. Archivos y responsabilidades

- `frontend/src/components/operations/OrderFormModal.vue`:
  - Componente modal encargado de la captura y edición de pedidos.
  - Responsabilidad: Al recibir `props.orderToEdit`, inicializar reactivamente el campo `paidAmount` con el valor exacto pagado previamente por el cliente, garantizando que no se reinicie en 0 ni se pierda al guardar. (Cubre RF-1, RF-2, RF-3, RF-4).

- `frontend/src/utils/orderUtils.ts` (o función auxiliar pura):
  - Responsabilidad: Función pura `resolveOrderPaidAmount` para extraer con certeza el monto pagado de un pedido proveniente de cualquier endpoint. (Cubre RF-1, RF-4).

- `tests/orders.test.ts`:
  - Responsabilidad: Suite de pruebas de integración para asegurar que la actualización de un pedido vía `PUT /api/orders/:id` preserve el `paidAmount` y la consistencia de cartera y tesorería. (Cubre RF-2, RF-5).

## 2. Función pura de extracción de abono

```typescript
export function resolveOrderPaidAmount(order?: {
  paidAmount?: number | null;
  totalPaid?: number | null;
  payments?: Array<{ amount?: number | null }>;
} | null): number {
  if (!order) return 0;
  if (order.paidAmount !== undefined && order.paidAmount !== null) {
    return Math.max(0, Number(order.paidAmount) || 0);
  }
  if (order.totalPaid !== undefined && order.totalPaid !== null) {
    return Math.max(0, Number(order.totalPaid) || 0);
  }
  if (Array.isArray(order.payments) && order.payments.length > 0) {
    const sum = order.payments.reduce((acc, p) => acc + (Number(p?.amount) || 0), 0);
    return Math.max(0, sum);
  }
  return 0;
}
```

## 3. Algoritmo en pseudocódigo

### En `OrderFormModal.vue` (`watch props.open`):
```text
SI open == true:
  SI props.orderToEdit existe:
    o = props.orderToEdit
    ... (cargar cliente, dirección, fecha, notas, items)
    paidAmount.value = resolveOrderPaidAmount(o)
    pendingBalance se recalcula reactivamente: max(0, grandTotal - paidAmount)
  SINO:
    paidAmount.value = 0
```

### Al guardar (`onSubmit`):
```text
payload = {
  ...
  paidAmount: Math.max(0, Number(paidAmount.value) || 0),
  ...
}
SI isEditing:
  store.updateOrder(props.orderToEdit.id, payload)
SINO:
  store.createOrder(payload)
```

## 4. Decisiones justificadas

- **Decisión 1: Extracción multicapa del abono**:
  - *Justificación*: Algunos componentes y vistas consumen el objeto `Order` donde el valor pagado puede venir tipado como `paidAmount`, `totalPaid` o desglosado en el arreglo `payments`. Evaluar las tres propiedades en cascada evita que variaciones en la serialización de la API dejen el campo en cero.
  - *Alternativa descartada*: Leer únicamente `o.paidAmount`. Descartada porque si en alguna vista el backend devuelve el pedido agrupado con `totalPaid`, fallaría silenciosamente.

- **Decisión 2: Preservación de reactividad en `pendingBalance`**:
  - *Justificación*: El campo computado `pendingBalance` ya escucha `grandTotal` y `paidAmount`. Al inicializar `paidAmount` correctamente, la UI muestra de inmediato el saldo pendiente real sin necesidad de lógica adicional en la plantilla.

## 5. Estrategia de pruebas

1. **Test unitario de la función pura**:
   - `resolveOrderPaidAmount` con `paidAmount` directo.
   - `resolveOrderPaidAmount` con `totalPaid`.
   - `resolveOrderPaidAmount` con lista de `payments`.
   - `resolveOrderPaidAmount` con objeto vacío o nulo (retorna 0).
2. **Test de integración backend (`vitest run tests/orders.test.ts`)**:
   - Verificar que al enviar `PUT /api/orders/:id` con `paidAmount` conservado, la orden mantenga su estado `PARTIAL` y el `pendingAmount` exacto.
3. **Build del Frontend (`npm --prefix frontend run build`)**:
   - Validar que no existan errores de tipos con `vue-tsc` ni imports no utilizados (`noUnusedLocals`).
