# Plan de Arquitectura — Spec 001: Rendimiento Real en Fraccionamiento y Costeo de Preparaciones

## 1. Archivos y Responsabilidades

| Archivo | Responsabilidad | RFs Cubiertos |
|---|---|---|
| `prisma/schema.prisma` | Agregar campos `baseLitersUsed` y `yieldPercentage` al modelo `BatchPackaging`. | RF-3, RF-7, RF-12 |
| `src/modules/batches/batches.schema.ts` | Extender esquemas Zod (`createBatchPackagingSchema`, `updateBatchPackagingSchema`) para validar `baseLitersUsed` y opcionalmente `sugarGrams`. | RF-3, RF-5, RF-8 |
| `src/modules/batches/batches.service.ts` | Refactorizar `createBatchPackaging`, `updateBatchPackaging` y `deleteBatchPackaging` para descontar `baseLitersUsed` del lote madre (en lugar de `totalPackagingLiters`), calcular costo real y rendimiento porcentual. Blindar `patchBatchVolume`. | RF-1, RF-2, RF-4, RF-6, RF-7, RF-8, RF-9, RF-10, RF-11, RF-12 |
| `src/modules/preparations/preparations.service.ts` | Asegurar cálculo de costo unitario por kilo/litro real neto producido y trazabilidad del rendimiento en la respuesta de preparación. | RF-13, RF-14, RF-15, RF-16 |
| `frontend/src/components/production/PackagingModal.vue` | Incorporar input de `baseLitersUsed` (litros base a extraer del tanque), cálculo reactivo de sugerencia teórica de botellas/litros comerciales, selección de azúcar para natural, ajuste libre de fruta y validación de tope contra la base disponible. | RF-3, RF-4, RF-5, RF-6, RF-7, RF-8 |
| `frontend/src/components/production/PackagingSummaryModal.vue` | Mostrar en el resumen de auditoría de la fracción: litros base consumidos, volumen comercial envasado, % de rendimiento y costo unitario desglosado por botella. | RF-10, RF-11, RF-12 |
| `frontend/src/stores/production.store.ts` | Actualizar tipos TypeScript de `BatchPackagingPayload` y `BatchPackagingItem` con `baseLitersUsed` y `yieldPercentage`. | RF-3, RF-12 |
| `tests/batches.test.ts` | Pruebas de integración automatizadas para envasado con expansión de volumen por fruta y azúcar, validación de stock base y reversibilidad al eliminar fracción. | RF-1 al RF-12 |
| `tests/preparations.test.ts` | Pruebas de integración para preparaciones de mermelada con peso neto superior a la fruta cruda y costeo ponderado. | RF-13 al RF-16 |

---

## 2. Funciones Puras de Dominio

### `calculateFractionYield(commercialLiters: number, baseLitersUsed: number): number`
```typescript
export function calculateFractionYield(commercialLiters: number, baseLitersUsed: number): number {
  if (!baseLitersUsed || baseLitersUsed <= 0) return 100;
  return Math.round((commercialLiters / baseLitersUsed) * 10000) / 100; // Ej: 125.00%
}
```

### `calculatePreparationYield(quantityProduced: number, totalIngredientsWeightKg: number): number`
```typescript
export function calculatePreparationYield(quantityProduced: number, totalIngredientsWeightKg: number): number {
  if (!totalIngredientsWeightKg || totalIngredientsWeightKg <= 0) return 100;
  return Math.round((quantityProduced / totalIngredientsWeightKg) * 10000) / 100;
}
```

### `calculatePreparationCostPerUnit(totalRecipeCost: number, quantityProduced: number): number`
```typescript
export function calculatePreparationCostPerUnit(totalRecipeCost: number, quantityProduced: number): number {
  if (!quantityProduced || quantityProduced <= 0) return 0;
  return Math.round(totalRecipeCost / quantityProduced);
}
```

### `suggestFractionOutput(baseLiters: number, flavor: string, fruitDosageGramsPerLiter: number = 0, sugarGramsPerLiter: number = 0)`
```typescript
export function suggestFractionOutput(baseLiters: number, flavor: string, fruitDosageGramsPerLiter: number = 0, sugarGramsPerLiter: number = 0) {
  // Fruta: asumiendo densidad aprox 1.0 (100g fruta desplaza 100ml)
  // Almíbar azúcar: 100g azúcar disuelto agrega aprox 60ml de volumen
  const fruitVolume = (baseLiters * fruitDosageGramsPerLiter) / 1000;
  const sugarExpansion = (baseLiters * sugarGramsPerLiter * 0.0006);
  const estimatedCommercialLiters = baseLiters + (flavor.toLowerCase() === 'natural' ? sugarExpansion : fruitVolume);
  return {
    estimatedCommercialLiters: Math.round(estimatedCommercialLiters * 100) / 100,
    suggestedFruitKg: Math.round(((baseLiters * fruitDosageGramsPerLiter) / 1000) * 100) / 100,
    suggestedSugarKg: Math.round(((baseLiters * sugarGramsPerLiter) / 1000) * 100) / 100,
  };
}
```

---

## 3. Algoritmo en Pseudocódigo

### Algoritmo: `createBatchPackaging` (Fase B)
```text
1. ENTRADA: batchId, baseLitersUsed, flavor, bottles1L, bottles2L, customContainers, extraItems (azúcar/fruta), empaque...
2. Cargar ProductionBatch con sus packagings existentes y validar isActive.
3. baseDisponible = batch.totalLitersProduced - batch.packagedLiters.
4. SI baseLitersUsed > baseDisponible + 0.05 ENTONCES:
     Lanzar BadRequestError("Stock de base insuficiente. Hay {baseDisponible}L y solicitas {baseLitersUsed}L").
5. comercialLiters = (bottles1L * 1.0) + (bottles2L * 2.0) + sum(customContainers.qty * capacity).
6. Validar stock de botellas, tapas, etiquetas y materias primas (azúcar o fruta).
7. DENTRO DE prisma.$transaction:
     a. Descontar materias primas e insumos de empaque del inventario (RawMaterial.currentStock).
     b. costoBaseFraccion = baseLitersUsed * batch.costPerLiter.
     c. costoEmpaqueYAditivos = suma de costos de ingredientes usados + envases + etiquetas.
     d. costoTotalFraccion = costoBaseFraccion + costoEmpaqueYAditivos.
     e. yieldPorcentaje = (comercialLiters / baseLitersUsed) * 100.
     f. Crear BatchPackaging con:
          - baseLitersUsed = baseLitersUsed
          - totalLiters = comercialLiters
          - packagingCost = costoEmpaqueYAditivos
          - yieldPercentage = yieldPorcentaje
     g. Actualizar ProductionBatch:
          - packagedLiters = batch.packagedLiters + baseLitersUsed
          - bottles1LProduced += bottles1L
          - bottles2LProduced += bottles2L
          - Si batch.status == 'EN_FERMENTACION' -> status = 'DISPONIBLE'
     h. Sincronizar estado bidireccional (AGOTADO si packagedLiters >= totalLitersProduced).
8. RETORNAR BatchPackaging enriquecido.
```

### Algoritmo: `deleteBatchPackaging` (Reversión)
```text
1. ENTRADA: packagingId.
2. DENTRO DE prisma.$transaction:
     a. Obtener BatchPackaging con itemsUsed.
     b. Restaurar stock de cada insumo usado en RawMaterial.
     c. baseARestaurar = pkg.baseLitersUsed > 0 ? pkg.baseLitersUsed : pkg.totalLiters (retrocompatibilidad).
     d. Actualizar ProductionBatch:
          - packagedLiters = max(0, batch.packagedLiters - baseARestaurar)
          - bottles1LProduced -= pkg.bottles1L
          - bottles2LProduced -= pkg.bottles2L
     e. Eliminar BatchPackaging.
     f. Sincronizar estado bidireccional del lote madre.
```

---

## 4. Cambios en Modelos y Esquemas

### Modelo Prisma: `BatchPackaging`
```prisma
model BatchPackaging {
  // ... campos existentes ...
  baseLitersUsed     Float            @default(0) // Litros de base láctea consumidos del lote madre
  yieldPercentage    Float?           @default(100) // Rendimiento comercial: (totalLiters / baseLitersUsed) * 100
  // ... relaciones ...
}
```

### Esquema Zod: `createBatchPackagingSchema`
```typescript
export const createBatchPackagingSchema = z.object({
  baseLitersUsed: z.number().positive('Debes indicar los litros de yogur base a utilizar'),
  flavor: z.string().min(1, 'El sabor es obligatorio'),
  bottles1L: z.number().int().nonnegative().optional().default(0),
  bottles2L: z.number().int().nonnegative().optional().default(0),
  customContainers: z.array(customContainerSchema).optional().default([]),
  extraItems: z.array(extraItemSchema).optional().default([]),
  // ... demás campos existentes ...
});
```

---

## 5. Decisiones Justificadas y Alternativas Descartadas

### Decisión 1: Registro explícito de `baseLitersUsed` en `BatchPackaging`
- **Justificación**: Almacenar el volumen exacto de base láctea consumido desacopla el volumen comercial (que incluye frutas y almíbares) del balance lácteo del lote madre. Garantiza auditorías transparentes y previene desajustes si hay mermas de envasado.
- **Alternativa descartada**: Deducir la base láctea restando la fruta de las botellas producidas. *Descartada porque si el yogurtero reporta mermas o agrega fruta con densidades variables, el cálculo implícito arrojaría saldos irreales en el tanque de base*.

### Decisión 2: Descuento de azúcar directo en Natural sin insumo compuesto
- **Justificación**: El almíbar se prepara en el acto con agua local (sin costo financiero). Tratarlo como un insumo compuesto formal obligaría a registrar una preparación previa en el sistema cada vez que se quiere endulzar, generando fricción innecesaria.
- **Alternativa descartada**: Crear un insumo compuesto obligatorio llamado "Almíbar de Azúcar". *Descartada por sobrecarga burocrática en la planta*.

### Decisión 3: Sugerencia teórica editable en la interfaz
- **Justificación**: El operario recibe una estimación matemática de botellas esperadas al combinar base + fruta, pero tiene el control final para tipear exactamente cuántas botellas se llenaron y sellaron.
- **Alternativa descartada**: Bloquear o forzar que las botellas ingresadas sean matemáticamente idénticas a la fórmula teórica. *Descartada porque en la producción artesanal siempre existen pequeñas variaciones de llenado o espuma*.

---

## 6. Estrategia de Pruebas Automatizadas (`vitest`)

### Suite de Integración: `tests/batches.test.ts`
1. **Test A: Fraccionamiento con Fruta y Expansión de Volumen**:
   - Crear lote madre de 12 L de leche. Pasar a DISPONIBLE con 12 L de base.
   - Envasar fracción Fresa: `baseLitersUsed: 6.0`, fruta: `1.5 kg`, 15 botellas de 500 ml (`7.5 L` comerciales).
   - *Verificar*: 201 Created. Lote madre refleja `packagedLiters: 6.0`, litros disponibles: `6.0 L`. Inventario descuenta 1.5 kg de fruta y 15 envases.
2. **Test B: Bloqueo de Fraccionamiento por Base Insuficiente**:
   - En el lote anterior (con 6.0 L disponibles), intentar envasar fracción con `baseLitersUsed: 7.0`.
   - *Verificar*: 400 Bad Request (`Stock de base insuficiente`).
3. **Test C: Fraccionamiento Natural con Azúcar y Agotamiento**:
   - Envasar los 6.0 L restantes para Natural con 600 g de azúcar rindiendo 6.5 botellas de 1 L.
   - *Verificar*: Lote pasa automáticamente a `AGOTADO` (`packagedLiters: 12.0`). Inventario descuenta 600 g de azúcar. Rendimiento registrado $\approx 108.3\%$.
4. **Test D: Reversión Completa al Eliminar Fracción**:
   - Eliminar la fracción de fruta.
   - *Verificar*: Lote madre reactiva su estado a `DISPONIBLE`, restablece `packagedLiters` a 6.0 L y devuelve el stock de fruta y envases al inventario.

### Suite de Integración: `tests/preparations.test.ts`
5. **Test E: Preparación de Mermelada con Rendimiento Superior**:
   - Registrar preparación: 1.7 kg de Mora ($10.200) + 0.8 kg de Azúcar ($3.200).
   - Cantidad neta producida ingresada: 2.3 kg.
   - *Verificar*: Costo unitario = $\$13.400 / 2.3 = \$5.826$ COP/kg. Stock de mermelada aumenta en 2.3 kg.
