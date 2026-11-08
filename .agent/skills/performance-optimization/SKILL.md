---
name: performance-optimization
description: Optimiza el rendimiento de la aplicación en backend, consultas Prisma, base de datos PostgreSQL y frontend Vue 3. Usar ante problemas de lentitud, consultas N+1 o regresiones de carga en YogurArte.
---

# Performance Optimization — YogurArte

Guía de optimización de rendimiento para el stack de YogurArte (PostgreSQL 16, Prisma ORM, Node.js y Vue 3). Establece el principio fundamental: **Mide primero, optimiza solo lo comprobado**. La optimización prematura sin métricas introduce complejidad innecesaria sin mejorar la experiencia real de los usuarios.

---

## 1. El Flujo Sistemático de Optimización

```
1. MEDIR      ──► Establecer línea base con datos reales (tiempos de respuesta, queries)
2. IDENTIFICAR──► Localizar el cuello de botella exacto (ej. consulta N+1 o loop en frontend)
3. RESOLVER   ──► Aplicar la corrección focalizada en la capa correcta
4. VERIFICAR  ──► Medir nuevamente; conservar el cambio solo si la mejora es medible
5. BLINDAR    ──► Proteger contra regresiones con índices o tests de carga
```

---

## 2. Optimización de Base de Datos y Prisma ORM (Backend)

La gran mayoría de problemas de rendimiento en un ERP provienen de patrones deficientes de acceso a datos.

### A. Erradicación del Problema N+1
Nunca ejecutes consultas dentro de un bucle iterativo:

```typescript
// ❌ INEFICIENTE (N+1): Ejecuta 1 query inicial + N queries adicionales en base de datos
const orders = await prisma.order.findMany();
for (const order of orders) {
  order.payments = await prisma.orderPayment.findMany({ where: { orderId: order.id } });
}

// ✅ ÓPTIMO: Una sola consulta relacional eficiente mediante JOIN en Prisma
const orders = await prisma.order.findMany({
  include: {
    payments: true,
    items: {
      include: {
        packaging: true
      }
    }
  }
});
```

### B. Agregaciones en Base de Datos vs. Memoria de Node
Deja que PostgreSQL calcule los totales matemáticos en lugar de saturar la memoria RAM de Node:

```typescript
// ❌ INEFICIENTE: Descarga 10.000 pagos para sumarlos en memoria
const payments = await prisma.orderPayment.findMany({ where: { customerId } });
const total = payments.reduce((acc, p) => acc + p.amount, 0);

// ✅ ÓPTIMO: Agregación nativa instantánea en PostgreSQL
const aggregate = await prisma.orderPayment.aggregate({
  where: { customerId },
  _sum: { amount: true }
});
const total = aggregate._sum.amount ?? 0;
```

### C. Higiene en Transacciones Interactivas (`prisma.$transaction`)
Las transacciones interactúan bloqueando conexiones y filas. **Prohibido realizar llamadas de red externas adentro de una transacción**:

```typescript
// ❌ PELIGROSO: La llamada de WhatsApp mantiene abierta la transacción de base de datos
await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ ... });
  await sendWhatsAppNotification(order); // Si la red tarda 5s, bloquea la BD
});

// ✅ CORRECTO: Persistir primero la transacción; emitir eventos externos después
const order = await prisma.$transaction(async (tx) => {
  return await tx.order.create({ ... });
});
// Evento asíncrono desacoplado
sendWhatsAppNotification(order).catch(console.error);
```

### D. Índices Estratégicos en `prisma/schema.prisma`
Asegurar índices en campos frecuentemente filtrados u ordenados:
- `Order`: `@@index([customerId])`, `@@index([status])`, `@@index([createdAt])`.
- `ProductionBatch`: `@@index([status])`, `@@index([createdAt])`.
- `KardexMovement`: `@@index([rawMaterialId])`, `@@index([createdAt])`.

---

## 3. Optimización de Frontend (Vue 3 + Vite)

### A. Carga Diferida por Rutas (*Route-level Lazy Loading*)
Cada vista debe cargarse bajo demanda mediante importación dinámica para mantener el bundle inicial por debajo de 200 KB:

```typescript
// frontend/src/router/routes.ts
const routes = [
  {
    path: '/pedidos',
    name: 'Orders',
    component: () => import('@/views/OrdersView.vue') // Chunk separado
  },
  {
    path: '/produccion',
    name: 'Production',
    component: () => import('@/views/ProductionView.vue')
  }
];
```

### B. Paginación y Poda de Listas
En vistas con cientos de registros (historial de pedidos, auditorías de inventario):
- Aplicar paginación o límites en servidor (`take: 50, skip: page * 50`).
- No renderizar miles de nodos DOM sin paginar.

---

## 4. Checklist de Aprobación de Rendimiento
- [ ] No existen bucles `await prisma...` dentro de `for` o `map` (cero N+1).
- [ ] Las consultas pesadas aplican `select` específico para no traer columnas innecesarias.
- [ ] Los cálculos financieros (`_sum`, `_count`) se delegan al motor de PostgreSQL.
- [ ] Cero operaciones I/O lentas (WhatsApp, uploads) dentro de `prisma.$transaction`.
- [ ] Bundle de frontend verificado sin paquetes huérfanos pesados (`npm --prefix frontend run build`).
