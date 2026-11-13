# Plan de Arquitectura — Spec 014: Plantillas Centralizadas y Disparo Asistido de WhatsApp

## Resumen Ejecutivo
Este plan define la arquitectura técnica para centralizar, editar, restablecer y sugerir las 9 plantillas institucionales de WhatsApp de YogurArte. La solución abarca:
1. Modelo persistente en PostgreSQL mediante Prisma (`SystemWhatsAppTemplate`).
2. Motor de compilación e interpolación segura de variables con fallback inmutable en memoria.
3. Endpoints REST protegidos bajo RBAC (`ADMIN`) en `src/modules/crm/`.
4. Refactorización de servicios generadores en `orders.service.ts`, `customers` y `crm` para consumir las plantillas dinámicas.
5. Nueva interfaz en CRM con navegación por sub-pestañas (*Plantillas del Sistema* vs *Respuestas Rápidas*), tarjetas de evento, interruptores de disparo asistido y modal interactivo de edición con inserción de variables y previsualización estilo WhatsApp.
6. Lógica de disparo asistido en `DeliveryConfirmModal.vue`, `PaymentModal.vue`, `DeliveryView.vue` y `OrdersView.vue`.

---

## Archivos y Responsabilidades

```
backend/
├── prisma/
│   ├── schema.prisma                       # Modelo SystemWhatsAppTemplate con índices por code y category
│   └── seed.ts                             # Carga inicial inmutable de las 9 plantillas canónicas de YogurArte
├── src/
│   ├── modules/
│   │   ├── crm/
│   │   │   ├── crm.schema.ts               # Validaciones Zod para actualización y consulta de plantillas
│   │   │   ├── crm.service.ts              # CRUD de plantillas, motor de interpolación y fallback en memoria
│   │   │   ├── crm.controller.ts           # Controladores delgados para los 3 endpoints de plantillas
│   │   │   └── crm.routes.ts               # Rutas protegidas bajo /api/crm/system-templates (RBAC ADMIN)
│   │   └── orders/
│   │       └── orders.service.ts           # Conexión de getWhatsAppLink con el compilador dinámico de plantillas
frontend/
├── src/
│   ├── api/
│   │   └── client.ts                       # Comunicación HTTP con endpoints de plantillas
│   ├── components/
│   │   └── operations/
│   │       ├── crm/
│   │       │   ├── TemplatesTab.vue        # Sub-pestañas: Plantillas del Sistema vs Respuestas Rápidas
│   │       │   ├── SystemTemplateEditModal.vue # Modal de edición, barra de variables y previsualización WhatsApp
│   │       │   ├── WhatsAppMessagePreviewModal.vue # Manejo de Baileys desconectado y @usuario
│   │       │   └── LoyaltyTab.vue          # Despacho de LOYALTY_PROGRESS y LOYALTY_REWARD_CLAIM
│   │       ├── DeliveryConfirmModal.vue    # Disparo asistido de DELIVERED_PAID o DELIVERED_UNPAID al entregar
│   │       └── PaymentModal.vue            # Disparo asistido de DELIVERED_PAID al liquidar deuda a $0
│   └── views/
│       └── operations/
│           ├── DeliveryView.vue            # Disparo asistido de DELIVERY_IN_ROUTE_SHORT al salir a reparto
│           └── OrdersView.vue              # Disparo de DELIVERY_IN_ROUTE_FULL y botón bloqueado en CANCELLED
tests/
└── system_templates.test.ts                # Pruebas de integración: CRUD, RBAC, validaciones, fallback y variables
```

---

## Modelo de Datos Prisma

```prisma
model SystemWhatsAppTemplate {
  id                 Int      @id @default(autoincrement())
  code               String   @unique // ORDER_STATUS_TRACKING, DELIVERY_IN_ROUTE_SHORT, etc.
  title              String
  category           String   // PEDIDOS, DOMICILIOS, CARTERA, FIDELIZACION
  description        String   @db.Text
  content            String   @db.Text
  defaultContent     String   @db.Text
  availableVariables String   @db.Text // JSON string: ["cliente", "pedido", ...]
  autoTrigger        Boolean  @default(false)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @default(now()) @updatedAt

  @@index([category])
  @@index([code])
}
```

---

## Algoritmo e Interpolación Pura de Variables

### Función Pura de Compilación (`interpolateTemplate`)
```typescript
interface TemplateContext {
  cliente?: string;
  pedido?: string;
  estado?: string;
  productos?: string;
  total?: string;
  saldo_pendiente?: string;
  abono?: string;
  direccion?: string;
  nequi?: string;
  banco?: string;
  instagram?: string;
  botellas_acumuladas?: string | number;
  botellas_restantes?: string | number;
  premios_disponibles?: string | number;
}

export function interpolateTemplate(rawTemplate: string, context: TemplateContext): string {
  let output = rawTemplate;

  // Sustitución literal sin riesgo de RegExp Injection
  const replacements: Record<string, string> = {
    '{{cliente}}': context.cliente || 'Cliente',
    '{{pedido}}': context.pedido || '',
    '{{estado}}': context.estado || '',
    '{{productos}}': context.productos || '',
    '{{total}}': context.total || '$0 COP',
    '{{saldo_pendiente}}': context.saldo_pendiente || '$0 COP (Paz y Salvo)',
    '{{abono}}': context.abono || '$0 COP',
    '{{direccion}}': context.direccion || 'Entrega en punto de venta / Sin dirección registrada',
    '{{nequi}}': context.nequi || '3024581882',
    '{{banco}}': context.banco || 'Nequi / Bancolombia',
    '{{instagram}}': context.instagram || 'https://www.instagram.com/yogurartesanalfonseca',
    '{{botellas_acumuladas}}': context.botellas_acumuladas !== undefined ? formatBottles(context.botellas_acumuladas) : '0',
    '{{botellas_restantes}}': context.botellas_restantes !== undefined ? formatBottles(context.botellas_restantes) : '10',
    '{{premios_disponibles}}': context.premios_disponibles !== undefined ? String(context.premios_disponibles) : '0',
  };

  for (const [key, value] of Object.entries(replacements)) {
    output = output.split(key).join(value);
  }

  return output;
}

function formatBottles(val: string | number): string {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '0';
  return Number.isInteger(num) ? num.toString() : num.toFixed(1);
}
```

---

## Interfaz de Usuario y Flujo de Interacción

### 1. Pestaña CRM "Plantillas" (`TemplatesTab.vue`)
- Cabecera con selector de sub-pestañas:
  - **Plantillas del Sistema (9)**
  - **Respuestas Rápidas (Atajos de chat)**
- Grid responsivo de tarjetas de plantillas del sistema:
  - Badge de categoría con color (`PEDIDOS` $\rightarrow$ Azul, `DOMICILIOS` $\rightarrow$ Naranja, `CARTERA` $\rightarrow$ Rojo/Ámbar, `FIDELIZACION` $\rightarrow$ Verde).
  - Título y descripción explicativa del evento.
  - Vista previa de texto en caja estilizada.
  - Interruptor (`autoTrigger`):
    - Plantillas con evento: Switch accesible con toggle optimista que actualiza el servidor.
    - Plantillas manuales: Badge sutil *"Solo invocación manual"*.
  - Acciones: Botón *"Editar Plantilla"* y botón *"Restablecer"* (despliega confirmación nativa o diálogo).

### 2. Modal de Edición (`SystemTemplateEditModal.vue`)
- Estructura de 3 capas fijas (Art. 10 Constitución):
  - **Cabecera**: Título de la plantilla y descripción del evento.
  - **Cuerpo con Scroll**:
    - Barra horizontal con chips de variables dinámicas permitidas según la plantilla (`RF-6`).
    - Al hacer clic en un chip: se inserta la etiqueta en la posición exacta del cursor (`selectionStart` / `selectionEnd`) y se devuelve el foco al textarea.
    - Textarea ajustable para redactar el mensaje.
    - Contenedor de previsualización en vivo estilo WhatsApp con fondo `#e7f8e8`, burbuja verde `#DCF8C6`, hora actual de Colombia (`America/Bogota`) y doble check azul.
  - **Pie de Acción Fijo**: Botón *"Cancelar"* y botón *"Guardar Plantilla"*.

---

## Decisiones Justificadas

| Decisión de Arquitectura | Justificación | Alternativa Descartada |
| :--- | :--- | :--- |
| **Separación en 9 plantillas independientes** | Evita añadir motores de plantillas condicionales complejos (`Handlebars`, `EJS`) en texto plano de WhatsApp, garantizando mensajes limpios y deterministas. | Plantilla única con lógica condicional o expresiones regulares complejas. |
| **Sustitución con `split(key).join(val)`** | 100% inmune a inyecciones de expresiones regulares cuando los mensajes contienen caracteres reservados (`$`, `*`, `{}`, `\`). | `new RegExp(key, 'g')` o `replace` con expresiones regulares que pueden fallar ante `$`. |
| **Fallback en memoria inmutable** | Si la base de datos se reinicia, no ha corrido el seed o experimenta lentitud transitoria, los botones de WhatsApp de la aplicación siguen funcionando sin botar error 500. | Fallar con `500 Internal Server Error` ante ausencia de registro en BD. |
| **Persistencia `defaultContent` en columna de BD** | Permite restablecer en caliente a nivel de API con un solo clic y auditar la versión base de YogurArte. | Hardcodear el texto original exclusivamente en el frontend o requerir migraciones para restaurar. |
| **Control de acceso exclusivo para `ADMIN`** | Protege la integridad de las cuentas bancarias de cobro (Nequi/Bancolombia) y el tono institucional de la marca. | Permitir edición a cualquier rol de operador o domiciliario. |

---

## Estrategia de Pruebas (TDD con Vitest)

1. **`tests/system_templates.test.ts` (Pruebas de Backend)**:
   - **TDD Rojo $\rightarrow$ Verde**:
     - `GET /api/crm/system-templates` sin token $\rightarrow$ 401.
     - `PUT /api/crm/system-templates/:id` con rol `OPERADOR` $\rightarrow$ 403 Forbidden.
     - `PUT /api/crm/system-templates/:id` con rol `ADMIN` y contenido vacío $\rightarrow$ 400 Bad Request.
     - `PUT /api/crm/system-templates/:id` con rol `ADMIN` y texto válido $\rightarrow$ 200 y actualiza `content` y `autoTrigger`.
     - `POST /api/crm/system-templates/:id/reset` $\rightarrow$ 200 y restaura `content = defaultContent`.
     - Compilador de plantillas: prueba unitaria verificando resolución con datos reales, fallback a `"Cliente"`, formateo de `{{estado}}` y cálculo dinámico de cartera (Art. 3).
2. **`tests/orders.test.ts` (Integración de Pedidos y WhatsApp)**:
   - Verificar que `GET /api/orders/:id/whatsapp` devuelve el mensaje resuelto consumiendo la plantilla de la base de datos para entregados pagados, entregados fiados y en camino.
3. **Quality Gates**:
   - `npx tsc --noEmit` $\rightarrow$ 0 errores.
   - `npm --prefix frontend run build` $\rightarrow$ 0 errores (`vue-tsc` limpio y Vite empaquetado).
