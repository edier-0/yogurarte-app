---
name: api-and-interface-design
description: Guía el diseño de APIs REST y contratos de interfaz estables. Usar al diseñar endpoints, esquemas Zod, contratos entre módulos o límites entre backend y frontend en YogurArte.
---

# API & Interface Design — YogurArte

Guía canónica para el diseño de APIs REST, contratos de datos y límites modulares en YogurArte. Un buen diseño de interfaz hace que la acción correcta sea intuitiva y la acción errónea sea imposible. Esta skill establece los estándares para controladores, servicios, esquemas Zod y comunicación cliente-servidor.

---

## 1. Cuándo Aplicar Esta Skill

- Al crear nuevos endpoints REST o actualizar rutas existentes en `src/modules/<dominio>/`.
- Al definir esquemas de validación Zod (`<dominio>.schema.ts`).
- Al diseñar contratos entre la API y el cliente Axios (`frontend/src/api/client.ts`).
- Al modelar DTOs o tipos compartidos entre frontend y backend.
- Al modificar firmas públicas de servicios de dominio.

---

## 2. Principios Fundamentales de Diseño

### A. Ley de Hyrum
> *"Con un número suficiente de usuarios de una API, todos los comportamientos observables de tu sistema terminarán siendo dependencias para alguien, sin importar lo que prometa el contrato escrito."*

- **Exposición Intencional:** Expón únicamente los campos que el frontend realmente necesita (`select` en Prisma). No filtres hashes de contraseñas ni metadatos internos.
- **Estabilidad de Errores:** Emplea códigos HTTP semánticos y mensajes de error en español coherentes a través de la clase `AppError`.

### B. Contrato Primero (Contract-First)
Diseña el contrato antes de escribir la lógica del servicio:
1. Define el esquema Zod de entrada (`req.body`, `req.query`, `req.params`).
2. Define la interfaz TypeScript del resultado (DTO).
3. Implementa el controlador y el servicio para satisfacer ese contrato.

---

## 3. Estructura Modular Canónica en Backend

Toda API en YogurArte se ubica en `src/modules/<dominio>/` con responsabilidad única por archivo:

```
src/modules/orders/
  ├── orders.routes.ts      # Enrutamiento Express, middlewares de auth y validación Zod
  ├── orders.controller.ts  # Controlador delgado: extrae inputs, llama servicio, next(error)
  ├── orders.service.ts     # Lógica de dominio, transacciones Prisma y reglas de negocio
  └── orders.schema.ts      # Esquemas de validación Zod y tipos inferidos
```

### A. Esquemas Zod y Validación de Entradas (`orders.schema.ts`)
```typescript
import { z } from 'zod';

export const createOrderSchema = z.object({
  customerId: z.string().uuid('ID de cliente inválido'),
  deliveryDate: z.string().datetime().optional(),
  items: z.array(
    z.object({
      packagingId: z.string().uuid('ID de presentación inválido'),
      quantity: z.number().int().positive('La cantidad debe ser mayor a 0'),
      unitPrice: z.number().positive('El precio debe ser positivo')
    })
  ).min(1, 'El pedido debe incluir al menos una presentación comercial')
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
```

### B. Controlador Delgado (`orders.controller.ts`)
El controlador no realiza cálculos ni consultas Prisma directas; solo coordina HTTP:
```typescript
import { Request, Response, NextFunction } from 'express';
import { orderService } from './orders.service.js';

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await orderService.createOrder(req.body, req.user?.id);
    return res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};
```

### C. Enrutamiento y Middlewares (`orders.routes.ts`)
```typescript
import { Router } from 'express';
import { createOrder } from './orders.controller.js';
import { createOrderSchema } from './orders.schema.js';
import { validateBody } from '../../shared/middlewares/validate.js';
import { requireAuth, requireRole } from '../../shared/middlewares/auth.js';

const router = Router();

router.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'OPERADOR'),
  validateBody(createOrderSchema),
  createOrder
);

export default router;
```

---

## 4. Estándar de Respuestas y Manejo de Errores

### A. Respuestas Exitosas
```json
{
  "success": true,
  "data": {
    "id": "e2b1...",
    "orderNumber": "PED-1042",
    "total": 45000,
    "status": "PREPARING"
  }
}
```

### B. Respuestas de Error (Canalizadas por `AppError`)
```json
{
  "success": false,
  "error": "Stock insuficiente en la presentación de 1 L para satisfacer el pedido",
  "statusCode": 400
}
```

### C. Códigos de Estado HTTP en YogurArte
- `200 OK`: Consulta o actualización exitosa.
- `201 Created`: Recurso creado satisfactoriamente.
- `400 Bad Request`: Error de validación Zod o regla de negocio violada.
- `401 Unauthorized`: Falta de token JWT o sesión expirada.
- `403 Forbidden`: Rol insuficiente (RBAC).
- `404 Not Found`: Recurso no encontrado.
- `409 Conflict`: Conflicto de unicidad o concurrencia.
- `500 Internal Server Error`: Error no controlado (capturado por el middleware global).

---

## 5. Reglas Innegociables de API en YogurArte

1. **Conservar Alias de Rutas:** Mantener compatibilidad con rutas legadas o duales (`/api/auth` y `/api/users`, `/api/customers` y `/api/clientes`).
2. **Cero `any` o Cuerpos Crudos:** Prohibido pasar `req.body` directo a Prisma sin parsear previamente por Zod.
3. **Consumo Centralizado en Frontend:** El frontend solo consume la API mediante `frontend/src/api/client.ts`. Prohibido instanciar llamadas `fetch()` o instancias Axios independientes en componentes.
4. **Zona Horaria Explícita:** Fechas y timestamps se transmiten en formato ISO 8601 y se procesan bajo la hora legal de Colombia (`UTC-5`).
