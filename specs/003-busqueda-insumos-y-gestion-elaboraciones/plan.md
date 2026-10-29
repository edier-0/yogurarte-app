# Plan de Arquitectura — Spec 003: Búsqueda Inteligente de Insumos y Gestión de Elaboraciones

## 1. Archivos y Responsabilidades

### Frontend (Vue 3 + TypeScript + Tailwind)
- `frontend/src/utils/searchUtils.ts`:
  - **Responsabilidad**: Función pura `filterSelectOptions` que normaliza cadenas (remueve tildes/acentos, pasa a minúsculas) y filtra opciones por coincidencia en `name`, `code` o `category`. Cubre **RF-1**, **RF-5**.
- `frontend/src/components/common/SearchableSelect.vue`:
  - **Responsabilidad**: Componente reutilizable de selección predictiva con entrada de texto, menú flotante de sugerencias, navegación por teclado, badges de stock y botón de limpieza. Cubre **RF-1**, **RF-2**, **RF-3**, **RF-4**, **RF-5**, **RNF-1**, **RNF-4**.
- `frontend/src/components/production/EditPreparationModal.vue`:
  - **Responsabilidad**: Modal de 3 capas fijas para editar metadatos de una elaboración (`preparationDate`, `notes`, `registeredBy`). Cubre **RF-12**, **RF-13**, **RNF-4**.
- `frontend/src/views/production/InventoryView.vue`:
  - **Responsabilidad**: Integrar la nueva pestaña *"Elaboraciones"* con su tabla/tarjetas responsivas, desglose de ingredientes consumidos, y botones para invocar edición y anulación con confirmación. Cubre **RF-6**, **RF-7**, **RF-8**, **RF-11**.
- **Modales a actualizar con `SearchableSelect`**:
  - `frontend/src/components/production/PrepareCompoundModal.vue`
  - `frontend/src/components/production/PurchaseStockModal.vue`
  - `frontend/src/components/production/InventoryMovementModal.vue`
  - `frontend/src/components/production/MaterialModal.vue`
  - `frontend/src/components/production/PackagingModal.vue`

### Backend (Node.js + Express + Prisma)
- `src/modules/preparations/preparations.schema.ts`:
  - **Responsabilidad**: Esquema Zod `updatePreparationSchema` para validar la edición de metadatos. Cubre **RF-12**.
- `src/modules/preparations/preparations.service.ts`:
  - **Responsabilidad**:
    - `updatePreparation(id, data)`: actualizar campos descriptivos y fecha sin alterar existencias. Cubre **RF-12**, **RF-13**.
    - `deletePreparation(id)`: verificar que `outputMaterial.currentStock >= quantityProduced` antes de revertir (evitando stock negativo). Si es válido, ejecutar reversión atómica de stock en Prisma. Cubre **RF-9**, **RF-10**, **RNF-3**.
- `src/modules/preparations/preparations.controller.ts`:
  - **Responsabilidad**: Controladores delgados para `updatePreparation` y `deletePreparation`.
- `src/modules/preparations/preparations.routes.ts`:
  - **Responsabilidad**: Exponer `PUT /api/preparations/:id` con validación Zod y autenticación.

---

## 2. Funciones Puras y Algoritmos

### 2.1 Filtrado de Insumos (`filterSelectOptions`)
```typescript
export interface SelectOption {
  id: number | string;
  name: string;
  code?: string;
  category?: string;
  stock?: number;
  unit?: string;
  disabled?: boolean;
}

/**
 * Normaliza y elimina diacríticos (tildes, diéresis)
 */
export function normalizeText(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Filtra opciones buscando coincidencia en nombre, código o categoría
 */
export function filterSelectOptions(options: SelectOption[], query: string): SelectOption[] {
  const q = normalizeText(query);
  if (!q) return options;

  return options.filter((opt) => {
    const nameMatch = normalizeText(opt.name).includes(q);
    const codeMatch = opt.code ? normalizeText(opt.code).includes(q) : false;
    const catMatch = opt.category ? normalizeText(opt.category).includes(q) : false;
    return nameMatch || codeMatch || catMatch;
  });
}
```

### 2.2 Reversión con Salvaguarda de Stock Negativo (`deletePreparation`)
```typescript
// Pseudocódigo del servicio de reversión
async function deletePreparation(id: number) {
  return prisma.$transaction(async (tx) => {
    const prep = await tx.supplyPreparation.findUnique({
      where: { id },
      include: { outputMaterial: true, ingredients: true },
    });
    if (!prep) throw new NotFoundError('Elaboración no encontrada');

    // Salvaguarda RF-10: evitar stock negativo en el producto obtenido
    if (prep.outputMaterial) {
      if (prep.outputMaterial.currentStock < prep.quantityProduced) {
        throw new BadRequestError(
          `No es posible anular la elaboración: el stock actual (${prep.outputMaterial.currentStock} ${prep.outputMaterial.unit}) ` +
          `es menor a lo producido (${prep.quantityProduced} ${prep.outputMaterial.unit}) debido a consumos posteriores.`
        );
      }

      await tx.rawMaterial.update({
        where: { id: prep.outputMaterialId },
        data: {
          currentStock: prep.outputMaterial.currentStock - prep.quantityProduced,
        },
      });
    }

    // Devolución exacta a cada ingrediente consumido
    for (const ing of prep.ingredients) {
      const mat = await tx.rawMaterial.findUnique({ where: { id: ing.rawMaterialId } });
      if (mat) {
        await tx.rawMaterial.update({
          where: { id: mat.id },
          data: {
            currentStock: mat.currentStock + ing.quantityUsed,
          },
        });
      }
    }

    // Eliminación del registro
    await tx.supplyPreparation.delete({ where: { id } });
    return { success: true };
  });
}
```

---

## 3. Decisiones Justificadas y Alternativas Descartadas

1. **Componente nativo vs Librería externa de Combobox**:
   - *Decisión*: Construir `SearchableSelect.vue` personalizado con Tailwind y Composition API.
   - *Alternativa descartada*: Depender de librerías pesadas como `vue-select` o configuraciones complejas de Headless UI que añaden dependencias y complican el modo oscuro y el responsive móvil de 3 capas.
   - *Justificación*: Tenemos control total sobre el área táctil móvil (44px), la presentación del stock disponible en bodega, la navegación por teclado y el estilizado idéntico al resto del ERP.

2. **Pestaña en `InventoryView.vue` vs Modal flotante**:
   - *Decisión*: Ubicar el historial de elaboraciones como una pestaña primaria en la vista de Inventario (junto a Insumos y Kardex).
   - *Alternativa descartada*: Dejarlo oculto dentro del modal `PrepareCompoundModal.vue`.
   - *Justificación*: El usuario necesita auditar las elaboraciones como parte del control diario de planta, igual que consulta el Kardex de movimientos de almacén.

3. **Eliminación con reversión vs Borrado lógico**:
   - *Decisión*: Al anular, se revierte el stock físico y se elimina el registro de preparación (`supplyPreparation.delete`), restaurando el inventario de forma limpia. Si el insumo ya fue utilizado en Fase B, se bloquea la anulación para impedir saldos negativos.
   - *Justificación*: Cumple con el Artículo 6 de la Constitución (reversibilidad exacta).

---

## 4. Estrategia de Pruebas

- **Pruebas Unitarias (`tests/searchUtils.test.ts`)**:
  - Filtrado con tildes (ej. "azúcar" encuentra "Azucar").
  - Filtrado por código y categoría.
  - Comportamiento ante lista vacía o texto no coincidente.
- **Pruebas de Integración (`tests/preparations.test.ts`)**:
  - `GET /api/preparations`: obtener lista ordenada de elaboraciones.
  - `PUT /api/preparations/:id`: actualizar notas y fecha sin variar stock.
  - `DELETE /api/preparations/:id` (éxito): devolver stock a insumos y restar stock al producto compuesto.
  - `DELETE /api/preparations/:id` (fallo RF-10): rechazar anulación si el stock del producto compuesto es menor al elaborado.
