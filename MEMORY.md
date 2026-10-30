# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- App ERP/CRM en producción: Fase A/B, inventario, pedidos/domicilio, caja bimonetaria, créditos, personal y CRM WhatsApp.
- Specs 001 a 006 completadas e implementadas al 100%. 210/210 pruebas pasando en verde.
- Neon DB Producción: Compras de hoy reparadas (Purchase #77 y #78 en Nequi); stock restablecido (6 und de 1L y 15 und de 500ml); gastos #25 y #26 normalizados a `INSUMOS_EXTRA`.
- Spec 006 completada: Unificación canónica en `INSUMOS_EXTRA`, erradicación de `COMPRA_INSUMO`, sincronización atómica bidireccional entre `Expense` y `Purchase` en `$transaction`, blindaje de caja sin duplicaciones. Rama `fix/sync-expenses-purchases-cash` lista para PR.

## Decisiones (y por qué)
- Un solo identificador canónico `INSUMOS_EXTRA`: erradicar el alias `COMPRA_INSUMO` elimina la ambigüedad en todo el sistema y evita bugs de sobreescritura de categoría.
- Sincronización atómica `Expense` $\leftrightarrow$ `Purchase`: al editar canal de pago (ej. Efectivo a Nequi), monto o proveedor en un gasto de insumos, se actualiza la compra respectiva dentro de `$transaction`.
- Preservación de stock en reversiones de egreso: solo descontar de `RawMaterial` cuando se elimine conscientemente una compra, y borrar atómicamente el gasto asociado.

## Aprendizajes y errores a evitar
- Nunca usar etiquetas visuales formateadas (`categoryLabel`) como valor del campo `category` en modales ni persistencia.
- `periodUnexpensedPurchases` debe basarse en la categoría canónica `INSUMOS_EXTRA` y no en strings de visualización.
- `getColombiaStartOfDay` y `getColombiaEndOfDay` requieren strings en formato `YYYY-MM-DD`; si se tiene un objeto `Date`, formatear antes con `getColombiaDateStr`.

## Próximos pasos
- Ejecutar ciclo Git de integración: push de `fix/sync-expenses-purchases-cash`, PR a `develop`, fusión a `main`, y solicitar autorización al usuario para borrar la rama temática.
