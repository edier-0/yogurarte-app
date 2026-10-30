# Constitución del Software — YogurArte

> **Documento Rector del Sistema Operativo, Contable y CRM**  
> **Versión:** 1.3.0  
> **Ámbito:** Todos los módulos, specs, planes y cambios de código en YogurArte.  
> **Principio de Supremacía:** Ninguna especificación (`spec.md`), plan de arquitectura (`plan.md`) o línea de código puede contradecir los artículos de esta Constitución sin una enmienda explícita aprobada por el usuario.

---

## Preámbulo

YogurArte es un sistema integral de misión crítica para la digitalización operativa de una fábrica artesanal de yogures y derivados lácteos ubicada en Fonseca, La Guajira. Este documento establece los principios de diseño innegociables, los invariantes contables y de dominio, y las normas metodológicas que garantizan que el software permanezca exacto, predecible, auditable y mantenible en el tiempo.

---

## TÍTULO I: Principios Fundamentales del Sistema

### Artículo 1: Verdad Única y Desacoplamiento
1. La base de datos relacional (PostgreSQL) y el modelo canónico en Prisma (`src/modules/`) constituyen la única fuente de verdad operativa y financiera del sistema.
2. Queda prohibida la persistencia redundante o duplicada de información que dependa matemáticamente de registros de detalle.
3. El código debe diseñarse bajo responsabilidad única y desacoplamiento de capas: Controladores delgados $\rightarrow$ Servicios de dominio $\rightarrow$ Modelos Prisma.

### Artículo 2: Separación entre Cuentas y Colaboradores (`User` $\neq$ `StaffMember`)
1. **`User`**: Representa exclusivamente credenciales de autenticación y permisos de acceso al software (JWT, roles del sistema). No posee claves foráneas operativas.
2. **`StaffMember`**: Representa a la persona física en la estructura del negocio (trabajador, domicilio, jornalero, socio capitalista). Es la entidad vinculada a pagos de nómina, jornales, aportes de capital y retiros de utilidades.

---

## TÍTULO II: Invariantes Innegociables de Dominio

### Artículo 3: Integridad de Cartera y Deuda
1. **Inexistencia de columna de deuda**: La deuda de un cliente jamás debe ser una columna estática persistida en la tabla `Customer`.
2. **Cálculo de cartera**: La deuda real de un cliente o pedido se computa dinámicamente como la diferencia exacta entre los pedidos entregados facturados y la suma de sus abonos o pagos registrados (`OrderPayment`).
3. **Exclusión de anulaciones**: Los pedidos con estado `CANCELLED` quedan rigurosamente excluidos del cálculo de deuda, ventas netas y métricas de cartera.

### Artículo 4: Tesorería Bimonetaria y Disciplina de Caja
1. **Separación estricta de canales**: El efectivo físico (`EFECTIVO` / Caja Menor) y los fondos electrónicos (`NEQUI` / `BANCOLOMBIA`) son independientes. Jamás deben mezclarse, fusionarse ni consolidarse en un arqueo único físico.
2. **Topes en movimientos de capital**:
   - `DEVOLUCION_APORTE` solo puede aplicarse a un `StaffMember` con rol `SOCIO` y bajo ninguna circunstancia puede superar el aporte neto disponible del socio ($\text{Aportes} - \text{Devoluciones previas}$).
   - `RETIRO_BASE` no puede superar la base de efectivo neta disponible en el turno o período de caja.
3. **Consistencia acumulada**: Los saldos de tesorería y arqueos globales acumulados reflejan el flujo histórico real y nunca deben truncarse arbitrariamente por filtros de fecha.

### Artículo 5: Trazabilidad de Producción en Dos Fases
1. **Fase A (`ProductionBatch`)**: Comprende la recepción láctea cruda, calentamiento, siembra del cultivo termófilo, fermentación controlada y enfriamiento del yogur base.
2. **Fase B (`BatchPackaging`)**: Comprende el fraccionamiento de la base, incorporación de mermeladas o endulzantes, y envasado en presentaciones comerciales (1 L, 2 L, porciones).
3. **Descuento de inventario en envasado**: El consumo de envases, tapas, etiquetas y mermeladas se ejecuta atómicamente en la Fase B. Ningún lote puede considerarse terminado sin el correspondiente descargo de insumos de almacén.
4. **Auditoría Dinámica de Presentaciones en Fase B**: Las fracciones envasadas operan sobre un catálogo dinámico y extensible de presentaciones comerciales (500 ml, 1 L, 2 L o cualquier formato futuro). Queda prohibido hardcodear columnas fijas de botellas en los balances de stock, rentabilidad o auditorías de Fase B.
5. **Segregación Estricta de Entregas y Salidas**: Las entregas a clientes, ventas y salidas de producto terminado (incluyendo premios de fidelización y consumo de socios) pertenecen y se auditan exclusivamente a nivel de **Fase B** (`BatchPackaging`). La auditoría del Lote Madre (Fase A) permanece estrictamente reservada para el balance de materia prima cruda (leche/cultivo) y base láctea fermentada a granel consumida por las fracciones.

### Artículo 6: Inventario, Kardex y Costeo Promedio
1. **Trazabilidad atómica**: Cada entrada, salida o ajuste en el inventario debe generar un movimiento auditable en el Kardex.
2. **Reversibilidad exacta**: La anulación de un movimiento revierte el stock físico (`currentStock = currentStock - deltaQuantity`). La edición aplica el diferencial neto (`newDelta - oldDelta`).
3. **Protección del costo promedio**: Donaciones, sobrantes o ajustes de inventario de materia prima sin factura no deben forzar el costo unitario a cero si distorsionan el costo real del litro producido.

### Artículo 7: Ciclo Logístico y Fidelización
1. **Ciclo de vida del pedido**: Toda orden transita de manera unidireccional y verificable: `PREPARING` $\rightarrow$ `IN_ROUTE` $\rightarrow$ `DELIVERED` (o `CANCELLED`).
2. **Regla de fidelización 10+1**: El beneficio se acumula únicamente por cada 10 unidades de botellas de 1 L entregadas y pagadas. Queda prohibido manipular o incrementar contadores de fidelización manualmente sin respaldo de pedidos reales.
3. **Flujo de Notificación y Canje de Fidelización**: La redención y descargo de inventario del premio de fidelización se gestiona a través del módulo CRM a valor de \$0 COP (`PREMIO_FIDELIZACION`). En el flujo de toma de pedidos comerciales, el sistema debe alertar proactivamente la disponibilidad del beneficio al seleccionar un cliente calificado, proveyendo un enlace o acción directa para redimirlo en CRM sin fricción. Todo premio entregado debe auditarse de forma visible y diferenciada en la fracción envasada de Fase B de donde se extrajo el producto.

### Artículo 8: Zona Horaria y Precisión Temporal
1. El sistema opera canónicamente bajo la hora legal de Colombia (`UTC-5`, `America/Bogota`).
2. Se prohíbe el uso de cadenas ambiguas `.split('T')[0]` o `.slice(0, 10)` en interfaces móviles y controladores que provoquen saltos de fecha después de las 7:00 PM locales. Los filtros de inicio y fin de jornada deben utilizar helpers de zona horaria explícitos (`getColombiaStartOfDay` / `EndOfDay`).

---

## TÍTULO III: Estándares de Arquitectura y Calidad Técnica

### Artículo 9: Capa Backend y Transacciones
1. Toda nueva funcionalidad debe ubicarse en `src/modules/<dominio>/` con su controlador, servicio, rutas y esquema de validación Zod.
2. Las operaciones que afecten simultáneamente pedidos, stock y movimientos de caja deben encapsularse obligatoriamente dentro de una transacción interactiva de Prisma (`prisma.$transaction`).
3. Todos los errores deben canalizarse mediante la clase `AppError` y middleware centralizado de Express.

### Artículo 10: Capa Frontend y Modales
1. Las vistas y componentes deben construirse en Vue 3 con Composition API (`<script setup lang="ts">`) y TypeScript estricto.
2. **Arquitectura de modales**: Todo modal debe cumplir la estructura de 3 capas fijas para garantizar usabilidad móvil sin saltos ni desbordamientos:
   - Cabecera fija (`header` con `shrink-0`).
   - Cuerpo desplazable (`div` con `flex-1 overflow-y-auto min-h-0`).
   - Pie de acción fijo (`footer` con `shrink-0`).
3. La comunicación con la API se realiza única y exclusivamente mediante el cliente Axios centralizado (`frontend/src/api/client.ts`).

### Artículo 11: Integración con WhatsApp y Tiempo Real
1. La conexión con Baileys debe ser resiliente a desconexiones transitorias. Queda prohibido borrar o reiniciar sesiones de autenticación sin confirmación de desvinculación explícita (diferenciar 401 de 440/515).
2. Los eventos de socket deben emitirse tras confirmarse la persistencia en base de datos, nunca de manera especulativa.

---

## TÍTULO IV: Metodología de Desarrollo Dirigido por Especificación (SDD)

### Artículo 12: Flujo Canónico Obligatorio
Todo cambio, corrección mayor o nueva funcionalidad en el sistema debe recorrer estrictamente el siguiente flujo:
$$\text{Constitución} \longrightarrow \text{Spec} \longrightarrow \text{Clarificación} \longrightarrow \text{Plan} \longrightarrow \text{Tareas} \longrightarrow \text{Implementación} \longrightarrow \text{Validación} \longrightarrow \text{Cambio}$$

### Artículo 13: La Supremacía de la Spec
1. **La spec manda**: Si una característica no está documentada y aprobada en `specs/NNN-nombre/spec.md`, no existe para el código ni se implementa.
2. Si surge una duda o caso límite imprevisto durante el diseño o la codificación, es obligatorio detenerse y consultar al usuario antes de asumir comportamientos.

### Artículo 14: Formato EARS en Requisitos Funcionales
Los requisitos funcionales de cada spec deben redactarse en español empleando la sintaxis EARS:
- `CUANDO <evento>, EL SISTEMA <respuesta>.`
- `SI <condición no deseada/error>, ENTONCES EL SISTEMA <respuesta>.`
- `MIENTRAS <estado>, EL SISTEMA <respuesta>.`
- `EL SISTEMA <comportamiento permanente>.`

### Artículo 15: Implementación Atómica y Pruebas
1. Las tareas se implementan una a la vez, con un alcance estimado de 20 a 30 minutos por tarea.
2. Se sigue el ciclo Red-Green-Refactor: pruebas primero en rojo, código de implementación, verificación en verde (`vitest` / `npx tsc --noEmit`), actualización de la tarea y parada para revisión.
3. Al finalizar cada fase o tarea, se actualiza obligatoriamente `MEMORY.md`.

---

## TÍTULO V: Ciclo de Vida Git y Gestión de Ramas

### Artículo 16: Ramas Permanentes, Integración vía Pull Requests y Eliminación Controlada
1. Las únicas ramas permanentes en el repositorio son `develop` (desarrollo e integración) y `main` (producción). Queda prohibido el commit directo en cualquiera de ellas.
2. Para cada cambio, corrección o nueva funcionalidad se crea una rama temática (`feat/<kebab-case>`, `fix/<kebab-case>`, `refactor/<kebab-case>`, `docs/<kebab-case>`) partiendo siempre de `develop`.
3. **Verificación local obligatoria**: Previo a la publicación remota, deben ejecutarse y aprobarse sin errores la compilación y tipos del backend (`npx tsc --noEmit`), el empaquetado del frontend (`npm --prefix frontend run build`) y las pruebas unitarias e integración (`vitest`).
4. **Ciclo de integración remota vía Pull Requests**:
   - Se publica la rama temática en el repositorio remoto (`git push origin <rama>`).
   - Se crea un Pull Request (PR) de la rama temática hacia `develop` en GitHub y se aprueba y fusiona.
   - Se crea un Pull Request (PR) de `develop` hacia `main` en GitHub y se aprueba y fusiona para sincronizar producción.
   - Se sincroniza el entorno local actualizando ambas ramas permanentes desde el remoto (`git pull origin develop` y `git pull origin main`).
5. **Eliminación y Cláusula de Salvaguarda**:
   - Una vez fusionada con éxito en `develop` y `main`, la rama temática debe eliminarse tanto localmente (`git branch -d`) como en el repositorio remoto (`git push origin --delete`).
   - Queda terminantemente prohibido borrar cualquier rama (local o remota) sin formular la pregunta y obtener la autorización explícita previa del usuario.

---

## TÍTULO VI: Enmiendas y Actualizaciones

### Artículo 17: Procedimiento de Enmienda
1. Esta Constitución solo puede modificarse mediante solicitud o aprobación expresa del usuario.
2. Toda enmienda debe registrarse en el historial de revisiones del documento y documentarse en `MEMORY.md` bajo la sección de decisiones de arquitectura.

---

### Historial de Enmiendas y Revisiones
- **v1.0.0**: Promulgación inicial de los Títulos I al VI (Principios, Invariantes, Arquitectura, SDD, Git y Enmiendas).
- **v1.1.0**: Incorporación de reglas de auditoría y seguridad de dependencias en producción.
- **v1.2.0**: Estandarización del ciclo de vida Git mediante Pull Requests remotos (PR rama temática $\rightarrow$ `develop` $\rightarrow$ `main`, sincronización local y borrado remoto/local con salvaguarda).
- **v1.3.0**: Enmienda a los Artículos 5 y 7: Trazabilidad y auditoría dinámica de presentaciones en Fase B (prohibición de 1L/2L fijos), segregación estricta de entregas y salidas exclusivamente en Fase B, y flujo proactivo de alerta de fidelización desde pedidos hacia CRM con auditoría visible en la fracción envasada.
