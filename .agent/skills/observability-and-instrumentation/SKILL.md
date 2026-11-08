---
name: observability-and-instrumentation
description: Instrumenta el código con registros estructurados y métricas de diagnóstico. Usar al crear endpoints, integrar WhatsApp o auditar flujos críticos en YogurArte.
---

# Observability & Instrumentation — YogurArte

El código que no puedes observar es código que no puedes operar. La observabilidad es la capacidad de responder *"¿qué está haciendo el sistema y por qué?"* desde el exterior, mediante los registros, eventos y métricas que emite la aplicación. La instrumentación no es un accesorio posterior al lanzamiento; se escribe a la par que la funcionalidad.

---

## 1. Cuándo Aplicar Esta Skill

- Al construir nuevos endpoints o flujos de negocio que correrán en producción.
- Al implementar integraciones externas asíncronas (como la conexión de WhatsApp con Baileys o Socket.IO).
- Al procesar operaciones financieras sensibles (arqueos de caja, liquidaciones de socios o cobro de pedidos).
- Cuando un incidente en producción haya tomado demasiado tiempo en diagnosticarse por falta de información en los logs.

---

## 2. Los Tres Pilares de Observabilidad en YogurArte

### A. Registros Estructurados (*Structured Logs*)
Los logs no son simples cadenas de texto con `console.log('aquí')`. Deben ser objetos contextualizados:

```typescript
// ✅ CORRECTO: Registro estructurado con contexto accionable
console.info(JSON.stringify({
  level: 'info',
  event: 'ORDER_STATUS_CHANGED',
  orderId: order.id,
  previousStatus: 'PREPARING',
  newStatus: 'IN_ROUTE',
  courierId: req.user?.id,
  timestamp: new Date().toISOString()
}));
```

### B. Trazabilidad de Auditoría de Negocio (Kardex y Caja)
En YogurArte, la auditoría más crítica no vive solo en stdout, sino en base de datos:
- Cada alteración de inventario debe emitir un registro inmutable en `KardexMovement` (`deltaQuantity`, `previousStock`, `newStock`, `reason`).
- Cada ingreso o egreso de dinero debe persistirse en `CashMovement` o `OrderPayment` con su canal explícito (`EFECTIVO`, `NEQUI`, `BANCOLOMBIA`).

### C. Supervisión de Ciclo de Vida de WhatsApp (Baileys)
La conexión de WhatsApp es propensa a fluctuaciones de red. Los logs deben distinguir con precisión:
- `401 Unauthorized`: Sesión cerrada en el teléfono (requiere nuevo QR).
- `440 / 515`: Caída transitoria de socket (reconexión automática; **prohibido borrar credenciales**).

---

## 3. Manejo y Registro Centralizado de Errores en Express

Toda excepción no controlada debe canalizarse por el middleware de error en `src/shared/middlewares/error.ts`:
- Registra el error completo en el servidor (`console.error` estructurado con stack trace y payload).
- Responde al cliente de forma saneada con `AppError` en español, **sin filtrar nunca contraseñas, tokens ni trazas de Prisma**.
