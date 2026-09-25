<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from 'reka-ui';
import {
  PackageCheck,
  X,
  AlertCircle,
  ShoppingCart,
  Sparkles,
  Milk,
  Layers,
  Scale,
  DollarSign,
} from 'lucide-vue-next';
import {
  useProductionStore,
  type BatchItem,
  type BatchPackagingItem,
  type BatchPackagingPayload,
} from '@/stores/production.store';
import { getTodayDateBogota } from '@/stores/finance.store';
import { http } from '@/api/client';

const props = defineProps<{
  open: boolean;
  batch: BatchItem | null;
  packagingToEdit?: BatchPackagingItem | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'packaged'): void;
}>();

const productionStore = useProductionStore();

// Estado del formulario
const baseFlavor = ref<string>('Natural');
const customFlavorName = ref<string>('');
const flavorVariant = ref<string>('');
const bottles1L = ref<number>(0);
const bottles2L = ref<number>(0);
const useLabels = ref<boolean>(true);
const fruitRawMaterialId = ref<number | null>(null);
const fruitDosageGramsPerLiter = ref<number | ''>('');
const fruitQuantityUsed = ref<number | ''>('');
const notes = ref<string>('');
const packagedBy = ref<string>('Edier');
const packagedAt = ref<string>(getTodayDateBogota());

// Pre-ventas
const pendingOrders = ref<any[]>([]);
const selectedOrderIds = ref<number[]>([]);
const isLoadingOrders = ref<boolean>(false);

// Materiales de inventario
interface MaterialItem {
  id: number;
  name: string;
  code: string;
  unit: string;
  currentStock: number;
  avgCost: number;
  category: string;
}
const allMaterials = ref<MaterialItem[]>([]);
const fruitMaterials = ref<MaterialItem[]>([]);
const isLoadingMaterials = ref<boolean>(false);

// Control de envío
const isSubmitting = ref<boolean>(false);
const errorMessage = ref<string | null>(null);

// Sabores disponibles
const flavors = computed(() => {
  const activeNames = productionStore.activeFlavors.map((f) => f.name);
  if (activeNames.length === 0) {
    return [
      'Natural',
      'Fresa',
      'Melocotón',
      'Mora',
      'Frutos Rojos',
      'Maracuyá',
      'Guanábana',
      'Arequipe',
      'Piña',
      'Personalizado',
    ];
  }
  return [...activeNames, 'Personalizado'];
});

// Sabor resuelto
const resolvedFlavor = computed(() => {
  if (baseFlavor.value === 'Personalizado') {
    return customFlavorName.value.trim() || 'Artesanal';
  }
  if (flavorVariant.value.trim()) {
    return `${baseFlavor.value} (${flavorVariant.value.trim()})`;
  }
  return baseFlavor.value;
});

const isEditMode = computed(() => !!props.packagingToEdit);

// Litros requeridos por las botellas
const requiredLiters = computed(() => {
  const b1 = Number(bottles1L.value) || 0;
  const b2 = Number(bottles2L.value) || 0;
  return b1 * 1.0 + b2 * 2.0;
});

const totalBottles = computed(() => {
  return (Number(bottles1L.value) || 0) + (Number(bottles2L.value) || 0);
});

// Litros sin envasar del lote (sumando el volumen actual del fraccionamiento si estamos editando)
const unpackagedLiters = computed(() => {
  if (!props.batch) return 0;
  const total = Number(props.batch.totalLitersProduced) || Number(props.batch.milkUsedLiters) || 0;
  const packaged = Number(props.batch.packagedLiters) || 0;
  const alreadyInThisPkg = props.packagingToEdit
    ? Number(props.packagingToEdit.bottles1L) * 1.0 + Number(props.packagingToEdit.bottles2L) * 2.0
    : 0;
  return Math.max(0, Math.round((total - packaged + alreadyInThisPkg) * 100) / 100);
});

// Validación de capacidad
const exceedsVolume = computed(() => {
  return requiredLiters.value > unpackagedLiters.value + 0.05;
});

// Helper para detectar unidad kilogramos
function isKgUnit(unit?: string): boolean {
  if (!unit) return false;
  const u = unit.trim().toUpperCase();
  return (
    u === 'KG' ||
    u === 'KILOGRAMO' ||
    u === 'KILOGRAMOS' ||
    u === 'KGS' ||
    u === 'KILO' ||
    u === 'KILOS'
  );
}

// Insumo de fruta seleccionado
const selectedFruitMaterial = computed(() => {
  return fruitMaterials.value.find((m) => m.id === fruitRawMaterialId.value);
});

const isFruitKg = computed(() => {
  return isKgUnit(selectedFruitMaterial.value?.unit);
});

// Pesaje exacto con redondeo al gramo entero más cercano:
// Gramos Totales = Math.round(Dosis (g/L) * Litros a Envasar)
const totalFruitGrams = computed(() => {
  if (!isFruitKg.value) return 0;
  const dose =
    typeof fruitDosageGramsPerLiter.value === 'number' && !isNaN(fruitDosageGramsPerLiter.value)
      ? fruitDosageGramsPerLiter.value
      : 0;
  return Math.round(dose * requiredLiters.value);
});

const calculatedFruitKg = computed(() => {
  return Math.round(totalFruitGrams.value) / 1000;
});

// Cantidad efectiva a descontar del inventario
const effectiveFruitQuantityUsed = computed(() => {
  if (!selectedFruitMaterial.value) return 0;
  if (isFruitKg.value) {
    return calculatedFruitKg.value;
  }
  return typeof fruitQuantityUsed.value === 'number' ? fruitQuantityUsed.value : 0;
});

// Validación de stock de fruta
const fruitStockInsufficient = computed(() => {
  if (!selectedFruitMaterial.value) return false;
  const needed = effectiveFruitQuantityUsed.value;
  return needed > (selectedFruitMaterial.value.currentStock || 0);
});

// Materiales de empaque encontrados
const bottle1LMaterial = computed(() =>
  allMaterials.value.find(
    (m) => m.code === 'BOTELLA_1L' || m.name.toLowerCase().includes('1 litro')
  )
);
const bottle2LMaterial = computed(() =>
  allMaterials.value.find(
    (m) => m.code === 'BOTELLA_2L' || m.name.toLowerCase().includes('2 litro')
  )
);
const capMaterial = computed(() =>
  allMaterials.value.find(
    (m) => m.code === 'TAPA' || m.name.toLowerCase().includes('tapa')
  )
);
const labelMaterial = computed(() =>
  allMaterials.value.find(
    (m) => m.code === 'ETIQUETA' || m.name.toLowerCase().includes('etiqueta')
  )
);

// Costos desglosados para proyección financiera
const bottlesCost = computed(() => {
  const b1Cost = bottle1LMaterial.value?.avgCost || 650;
  const b2Cost = bottle2LMaterial.value?.avgCost || 1100;
  return (Number(bottles1L.value) || 0) * b1Cost + (Number(bottles2L.value) || 0) * b2Cost;
});

const capsCost = computed(() => {
  const capCost = capMaterial.value?.avgCost || 120;
  return totalBottles.value * capCost;
});

const labelsCost = computed(() => {
  if (!useLabels.value) return 0;
  const lblCost = labelMaterial.value?.avgCost || 200;
  return totalBottles.value * lblCost;
});

const fruitTotalCost = computed(() => {
  if (!selectedFruitMaterial.value) return 0;
  return Math.round(effectiveFruitQuantityUsed.value * (selectedFruitMaterial.value.avgCost || 0));
});

const projectedPackagingCost = computed(() => {
  return bottlesCost.value + capsCost.value + labelsCost.value + fruitTotalCost.value;
});

const packagingCostPerLiter = computed(() => {
  if (requiredLiters.value <= 0) return 0;
  return Math.round(projectedPackagingCost.value / requiredLiters.value);
});

// Validación global del formulario
const isValid = computed(() => {
  const hasBottles = requiredLiters.value > 0;
  const notExceeds = !exceedsVolume.value;
  const hasFlavor = resolvedFlavor.value.trim().length > 0;
  const fruitOk = !fruitStockInsufficient.value;
  return hasBottles && notExceeds && hasFlavor && fruitOk && !isSubmitting.value;
});

// Total de litros requeridos por las órdenes pre-seleccionadas
const selectedOrdersTotalLiters = computed(() => {
  return pendingOrders.value
    .filter((o) => selectedOrderIds.value.includes(o.id))
    .reduce((sum, o) => sum + (Number(o.totalLiters) || 0), 0);
});

// Formateador de moneda
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

// Cargar insumos de inventario
async function loadInventoryMaterials() {
  if (allMaterials.value.length > 0) return;
  isLoadingMaterials.value = true;
  try {
    const list = await http.get<MaterialItem[]>('/inventory/materials');
    if (Array.isArray(list)) {
      allMaterials.value = list;
      fruitMaterials.value = list.filter(
        (m) =>
          m.category === 'INSUMO' ||
          m.category === 'MATERIA_PRIMA' ||
          m.name.toLowerCase().includes('mermelada') ||
          m.name.toLowerCase().includes('fruta') ||
          m.name.toLowerCase().includes('pulpa')
      );
    }
  } catch {
    allMaterials.value = [];
    fruitMaterials.value = [];
  } finally {
    isLoadingMaterials.value = false;
  }
}

// Cargar pedidos pre-venta para el sabor
async function loadPendingOrders(flavor: string) {
  isLoadingOrders.value = true;
  try {
    const res = await productionStore.fetchPendingOrders(flavor);
    pendingOrders.value = res.orders || [];
    selectedOrderIds.value = selectedOrderIds.value.filter((id) =>
      pendingOrders.value.some((o) => o.id === id)
    );
  } catch {
    pendingOrders.value = [];
  } finally {
    isLoadingOrders.value = false;
  }
}

function toggleOrderSelection(orderId: number) {
  const idx = selectedOrderIds.value.indexOf(orderId);
  if (idx >= 0) {
    selectedOrderIds.value.splice(idx, 1);
  } else {
    selectedOrderIds.value.push(orderId);
  }
}

function toggleAllOrders() {
  if (selectedOrderIds.value.length === pendingOrders.value.length) {
    selectedOrderIds.value = [];
  } else {
    selectedOrderIds.value = pendingOrders.value.map((o) => o.id);
  }
}

// Observador cuando cambia el modal o el fraccionamiento a editar
watch(
  () => [props.open, props.batch, props.packagingToEdit],
  async ([isOpen, currentBatch, currentPkg]) => {
    if (isOpen && currentBatch) {
      errorMessage.value = null;

      if (currentPkg) {
        const pkg = currentPkg as BatchPackagingItem;
        baseFlavor.value = flavors.value.includes(pkg.flavor) ? pkg.flavor : 'Personalizado';
        if (baseFlavor.value === 'Personalizado') {
          customFlavorName.value = pkg.flavor;
        } else {
          customFlavorName.value = '';
        }
        flavorVariant.value = '';
        bottles1L.value = pkg.bottles1L;
        bottles2L.value = pkg.bottles2L;
        useLabels.value = (pkg as any).useLabels !== false;
        fruitRawMaterialId.value = pkg.fruitRawMaterialId || null;
        notes.value = pkg.notes || '';
        packagedBy.value = pkg.packagedBy || 'Edier';
        packagedAt.value = pkg.packagedAt ? pkg.packagedAt.split('T')[0] : getTodayDateBogota();
        selectedOrderIds.value = [];

        await loadInventoryMaterials();

        if (pkg.fruitQuantityUsed && pkg.totalLiters > 0) {
          const mat = fruitMaterials.value.find((m) => m.id === pkg.fruitRawMaterialId);
          if (mat && isKgUnit(mat.unit)) {
            fruitDosageGramsPerLiter.value =
              Math.round(((pkg.fruitQuantityUsed * 1000) / pkg.totalLiters) * 1000) / 1000;
            fruitQuantityUsed.value = '';
          } else {
            fruitQuantityUsed.value = pkg.fruitQuantityUsed;
            fruitDosageGramsPerLiter.value = '';
          }
        } else {
          fruitDosageGramsPerLiter.value = '';
          fruitQuantityUsed.value = '';
        }
      } else {
        baseFlavor.value = (currentBatch as BatchItem).flavor || 'Natural';
        customFlavorName.value = '';
        flavorVariant.value = '';
        bottles1L.value = 0;
        bottles2L.value = 0;
        useLabels.value = true;
        fruitRawMaterialId.value = null;
        fruitDosageGramsPerLiter.value = '';
        fruitQuantityUsed.value = '';
        notes.value = '';
        packagedBy.value = 'Edier';
        packagedAt.value = getTodayDateBogota();
        selectedOrderIds.value = [];

        await loadInventoryMaterials();
      }

      await loadPendingOrders(resolvedFlavor.value);
    }
  },
  { immediate: true }
);

// Observador al cambiar el sabor para refrescar las pre-ventas
watch(resolvedFlavor, (newFlavor) => {
  if (props.open && newFlavor) {
    loadPendingOrders(newFlavor);
  }
});

function handleClose() {
  emit('update:open', false);
}

async function handleSubmit() {
  if (!isValid.value || !props.batch) return;

  isSubmitting.value = true;
  errorMessage.value = null;

  try {
    const payload: BatchPackagingPayload = {
      flavor: resolvedFlavor.value,
      bottles1L: Number(bottles1L.value) || 0,
      bottles2L: Number(bottles2L.value) || 0,
      fruitRawMaterialId: fruitRawMaterialId.value ? Number(fruitRawMaterialId.value) : undefined,
      fruitQuantityUsed:
        effectiveFruitQuantityUsed.value > 0 ? effectiveFruitQuantityUsed.value : undefined,
      fruitDosageGramsPerLiter:
        typeof fruitDosageGramsPerLiter.value === 'number' && fruitDosageGramsPerLiter.value > 0
          ? fruitDosageGramsPerLiter.value
          : undefined,
      useLabels: useLabels.value,
      notes: notes.value ? notes.value.trim() : undefined,
      packagedBy: packagedBy.value ? packagedBy.value.trim() : 'Edier',
      packagedAt: packagedAt.value || getTodayDateBogota(),
      linkOrderIds: selectedOrderIds.value.length > 0 ? selectedOrderIds.value : undefined,
    };

    if (isEditMode.value && props.packagingToEdit) {
      await productionStore.updateBatchPackaging(props.packagingToEdit.id, payload);
    } else {
      await productionStore.packageBatch(props.batch.id, payload);
    }
    emit('packaged');
    handleClose();
  } catch (err: any) {
    errorMessage.value = err?.message || 'Error al guardar el envasado';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <DialogRoot :open="open" @update:open="(val: boolean) => emit('update:open', val)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity" />

      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-[95%] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-2xl transition-all focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-7 max-h-[92vh] overflow-y-auto"
      >
        <!-- Cabecera del Diálogo -->
        <div class="flex items-center justify-between border-b border-surface-light-border pb-4 dark:border-surface-dark-border">
          <div class="flex items-center gap-2.5">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <PackageCheck class="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                {{ isEditMode ? 'Editar Fraccionamiento de Lote' : 'Envasar y Fraccionar Lote' }}
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Fase B · Dosificación por litro, envases y vinculación de pre-ventas
              </DialogDescription>
            </div>
          </div>

          <button
            type="button"
            @click="handleClose"
            class="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="mt-5 space-y-4">
          <!-- Resumen del Lote Madre -->
          <div v-if="batch" class="rounded-2xl border border-surface-light-border bg-slate-50/70 p-3.5 dark:border-surface-dark-border dark:bg-surface-dark-canvas">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs font-black text-brand-800 dark:text-brand-darkText">
                  #{{ batch.batchCode }}
                </span>
                <span class="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-black text-purple-800 dark:bg-purple-950/50 dark:text-purple-300">
                  {{ batch.flavor }}
                </span>
              </div>

              <div class="flex items-center gap-3 text-xs">
                <div>
                  <span class="text-slate-400">Total Lote:</span>
                  <span class="ml-1 font-extrabold text-slate-700 dark:text-slate-300">
                    {{ batch.totalLitersProduced }} L
                  </span>
                </div>
                <div>
                  <span class="text-slate-400">Saldo sin Envasar:</span>
                  <span
                    class="ml-1 rounded-md px-1.5 py-0.5 font-black"
                    :class="
                      unpackagedLiters > 0
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                    "
                  >
                    {{ unpackagedLiters }} L
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Selección del Sabor de la Fracción -->
          <div class="space-y-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 dark:border-surface-dark-border dark:bg-surface-dark-card">
            <div class="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-white">
              <Sparkles class="h-4 w-4 text-purple-500" />
              <span>Sabor de la Fracción a Envasar</span>
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Catálogo de Sabores *
                </label>
                <select
                  v-model="baseFlavor"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                >
                  <option v-for="fl in flavors" :key="fl" :value="fl">
                    {{ fl }}
                  </option>
                </select>
              </div>

              <!-- Variante o Manual -->
              <div v-if="baseFlavor === 'Personalizado'">
                <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Sabor Artesanal *
                </label>
                <input
                  v-model="customFlavorName"
                  type="text"
                  required
                  placeholder="Ej. Frutos Silvestres"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
              </div>

              <div v-else>
                <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Variante <span class="font-normal text-slate-400">(Opcional)</span>
                </label>
                <input
                  v-model="flavorVariant"
                  type="text"
                  placeholder="Ej. bajo en azúcar, con stevia..."
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
              </div>
            </div>

            <!-- Previsualización del Sabor Final -->
            <div class="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Sabor Final Registrado:
              </span>
              <span class="rounded-lg bg-purple-50 px-2 py-0.5 text-xs font-black text-purple-800 dark:bg-purple-950/40 dark:text-purple-300">
                {{ resolvedFlavor }}
              </span>
            </div>
          </div>

          <!-- Botellas a Envasar (1L y 2L) -->
          <div class="space-y-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 dark:border-surface-dark-border dark:bg-surface-dark-card">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-white">
                <Milk class="h-4 w-4 text-emerald-500" />
                <span>Fraccionamiento en Envases</span>
              </div>
              <div class="text-right text-xs">
                <span class="text-slate-400">Volumen requerido:</span>
                <span
                  class="ml-1 font-black"
                  :class="exceedsVolume ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'"
                >
                  {{ requiredLiters }} L
                </span>
                <span class="text-slate-400"> / {{ unpackagedLiters }} L libres</span>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Botellas de 1 Litro
                </label>
                <div class="relative">
                  <input
                    v-model.number="bottles1L"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-sm font-extrabold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                  />
                  <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Unds (1L)
                  </span>
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Botellas de 2 Litros
                </label>
                <div class="relative">
                  <input
                    v-model.number="bottles2L"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-sm font-extrabold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                  />
                  <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Unds (2L)
                  </span>
                </div>
              </div>
            </div>

            <!-- Insumos de Empaque: Tapas y Etiquetas -->
            <div class="rounded-xl border border-slate-100 bg-surface-light-canvas p-3 dark:border-slate-800 dark:bg-surface-dark-canvas">
              <div class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300">
                  <Layers class="h-3.5 w-3.5 text-brand-700 dark:text-brand-darkText" />
                  <span>Tapas (1 por botella):</span>
                  <span class="font-extrabold text-slate-900 dark:text-white">{{ totalBottles }} und</span>
                </div>
                <span class="text-[11px] text-slate-400">
                  Disponibles: {{ capMaterial?.currentStock || 0 }} und
                </span>
              </div>

              <div class="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
                <label class="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    v-model="useLabels"
                    class="h-4 w-4 rounded border-slate-300 text-brand-800 focus:ring-brand-800 dark:border-slate-700"
                  />
                  <span class="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Aplicar etiquetas corporativas (1 por botella)
                  </span>
                </label>
                <span class="text-[11px] text-slate-400">
                  Disponibles: {{ labelMaterial?.currentStock || 0 }} und
                </span>
              </div>
            </div>

            <!-- Advertencia si excede el saldo libre -->
            <div
              v-if="exceedsVolume"
              class="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/80 p-2.5 text-xs font-semibold text-rose-800 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-300"
            >
              <AlertCircle class="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>
                El volumen requerido ({{ requiredLiters }}L) supera el saldo disponible sin envasar del lote ({{ unpackagedLiters }}L). Reduce las unidades.
              </span>
            </div>
          </div>

          <!-- Dosificación Dinámica de Fruta / Mermelada -->
          <div class="space-y-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 dark:border-surface-dark-border dark:bg-surface-dark-card">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-white">
                <Scale class="h-4 w-4 text-purple-500" />
                <span>Fruta o Mermelada Utilizada</span>
                <span class="font-normal text-slate-400">(Opcional)</span>
              </div>
              <span class="text-[11px] text-slate-400">Dosificación industrial y pesaje exacto</span>
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Insumo de Fruta / Pulpa / Mermelada
                </label>
                <select
                  v-model.number="fruitRawMaterialId"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                >
                  <option :value="null">-- Ninguna / Sabor natural --</option>
                  <option v-for="mat in fruitMaterials" :key="mat.id" :value="mat.id">
                    {{ mat.name }} (Stock: {{ mat.currentStock }} {{ mat.unit }} | Costo: {{ formatCurrency(mat.avgCost) }})
                  </option>
                </select>
              </div>

              <!-- Dosis en g/L si la unidad es Kilogramos -->
              <div v-if="selectedFruitMaterial && isFruitKg">
                <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Dosis en Gramos por Litro (g/L) *
                </label>
                <div class="relative">
                  <input
                    v-model.number="fruitDosageGramsPerLiter"
                    type="number"
                    min="0"
                    step="0.001"
                    placeholder="Ej. 120 (g/L)"
                    class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2 text-xs font-extrabold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                  />
                  <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    g / L
                  </span>
                </div>
              </div>

              <!-- Cantidad libre si la unidad es distinta de Kg -->
              <div v-else-if="selectedFruitMaterial">
                <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Cantidad a Consumir ({{ selectedFruitMaterial.unit }}) *
                </label>
                <input
                  v-model.number="fruitQuantityUsed"
                  type="number"
                  min="0.01"
                  step="any"
                  :placeholder="`Cantidad en ${selectedFruitMaterial.unit}`"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
              </div>
            </div>

            <!-- Panel de Pesaje Exacto al Gramo Entero -->
            <div
              v-if="selectedFruitMaterial && isFruitKg"
              class="rounded-xl border border-purple-100 bg-purple-50/50 p-3 text-xs dark:border-purple-900/40 dark:bg-purple-950/20"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span class="block text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400">
                    Pesaje en Báscula (Gramo Entero)
                  </span>
                  <span class="text-sm font-black text-purple-950 dark:text-purple-200">
                    {{ totalFruitGrams.toLocaleString('es-CO') }} g
                  </span>
                </div>

                <div class="text-right">
                  <span class="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                    Descuento de Almacén
                  </span>
                  <span class="font-extrabold text-slate-800 dark:text-slate-200">
                    {{ calculatedFruitKg }} kg
                  </span>
                  <span class="text-[11px] text-slate-400">
                    / {{ selectedFruitMaterial.currentStock }} kg disponibles
                  </span>
                </div>
              </div>
            </div>

            <!-- Alerta por stock insuficiente de fruta -->
            <div
              v-if="fruitStockInsufficient"
              class="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/80 p-2.5 text-xs font-semibold text-rose-800 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-300"
            >
              <AlertCircle class="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>
                Stock insuficiente de {{ selectedFruitMaterial?.name }}. Requieres {{ effectiveFruitQuantityUsed }} {{ selectedFruitMaterial?.unit }} y dispones de {{ selectedFruitMaterial?.currentStock }} {{ selectedFruitMaterial?.unit }}.
              </span>
            </div>
          </div>

          <!-- Desglose Financiero de Envasado -->
          <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-4 dark:border-surface-dark-border dark:bg-surface-dark-card">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
              <div class="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-white">
                <DollarSign class="h-4 w-4 text-brand-700 dark:text-brand-darkText" />
                <span>Costo Financiero de la Fracción</span>
              </div>
              <span class="text-[11px] font-bold text-slate-400">
                Agrega al costo del lote
              </span>
            </div>

            <div class="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div class="rounded-xl border border-surface-light-border/60 bg-surface-light-canvas/60 p-2 dark:border-surface-dark-border/60 dark:bg-surface-dark-canvas/60">
                <span class="block text-[10px] font-bold text-slate-400 uppercase">Envases</span>
                <span class="font-extrabold text-slate-700 dark:text-slate-300">
                  {{ formatCurrency(bottlesCost) }}
                </span>
              </div>

              <div class="rounded-xl border border-surface-light-border/60 bg-surface-light-canvas/60 p-2 dark:border-surface-dark-border/60 dark:bg-surface-dark-canvas/60">
                <span class="block text-[10px] font-bold text-slate-400 uppercase">Tapas</span>
                <span class="font-extrabold text-slate-700 dark:text-slate-300">
                  {{ formatCurrency(capsCost) }}
                </span>
              </div>

              <div class="rounded-xl border border-surface-light-border/60 bg-surface-light-canvas/60 p-2 dark:border-surface-dark-border/60 dark:bg-surface-dark-canvas/60">
                <span class="block text-[10px] font-bold text-slate-400 uppercase">Etiquetas</span>
                <span class="font-extrabold text-slate-700 dark:text-slate-300">
                  {{ formatCurrency(labelsCost) }}
                </span>
              </div>

              <div class="rounded-xl border border-surface-light-border/60 bg-surface-light-canvas/60 p-2 dark:border-surface-dark-border/60 dark:bg-surface-dark-canvas/60">
                <span class="block text-[10px] font-bold text-slate-400 uppercase">Fruta</span>
                <span class="font-extrabold text-slate-700 dark:text-slate-300">
                  {{ formatCurrency(fruitTotalCost) }}
                </span>
              </div>
            </div>

            <div class="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs dark:border-slate-800">
              <div>
                <span class="font-bold text-slate-500 dark:text-slate-400">Costo Total Fraccionamiento:</span>
                <span class="ml-1.5 font-black text-brand-800 dark:text-brand-darkText">
                  {{ formatCurrency(projectedPackagingCost) }}
                </span>
              </div>
              <div v-if="requiredLiters > 0" class="text-right">
                <span class="text-slate-400">Costo agregado:</span>
                <span class="ml-1 font-extrabold text-slate-900 dark:text-white">
                  {{ formatCurrency(packagingCostPerLiter) }} / L
                </span>
              </div>
            </div>
          </div>

          <!-- Pre-ventas Pendientes por Sabor -->
          <div class="space-y-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 dark:border-surface-dark-border dark:bg-surface-dark-card">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-white">
                <ShoppingCart class="h-4 w-4 text-brand-700 dark:text-brand-darkText" />
                <span>Pre-ventas Disponibles para Vincular</span>
                <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {{ pendingOrders.length }}
                </span>
              </div>

              <button
                v-if="pendingOrders.length > 0"
                type="button"
                @click="toggleAllOrders"
                class="text-[11px] font-bold text-brand-800 hover:underline dark:text-brand-darkText"
              >
                {{ selectedOrderIds.length === pendingOrders.length ? 'Deseleccionar todas' : 'Vincular todas' }}
              </button>
            </div>

            <!-- Listado de Pre-ventas -->
            <div v-if="isLoadingOrders" class="py-4 text-center text-xs text-slate-400">
              Consultando pedidos en pre-venta...
            </div>

            <div
              v-else-if="pendingOrders.length === 0"
              class="rounded-xl border border-dashed border-slate-200 p-3.5 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400"
            >
              No hay encargos en pre-venta registrados para el sabor {{ resolvedFlavor }}.
            </div>

            <div v-else class="max-h-44 space-y-2 overflow-y-auto pr-1">
              <div
                v-for="order in pendingOrders"
                :key="order.id"
                @click="toggleOrderSelection(order.id)"
                class="flex cursor-pointer items-center justify-between rounded-xl border p-2.5 transition-all"
                :class="
                  selectedOrderIds.includes(order.id)
                    ? 'border-emerald-500 bg-emerald-50/50 dark:border-emerald-700/60 dark:bg-emerald-950/20'
                    : 'border-slate-200 bg-surface-light-canvas hover:border-slate-300 dark:border-slate-700 dark:bg-surface-dark-canvas'
                "
              >
                <div class="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    :checked="selectedOrderIds.includes(order.id)"
                    class="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                    @click.stop="toggleOrderSelection(order.id)"
                  />
                  <div>
                    <div class="flex items-center gap-1.5">
                      <span class="font-mono text-xs font-bold text-brand-800 dark:text-brand-darkText">
                        #{{ order.orderNumber || order.orderCode || order.id }}
                      </span>
                      <span class="text-xs font-extrabold text-slate-800 dark:text-white">
                        {{ order.customer?.fullName || 'Cliente' }}
                      </span>
                    </div>
                    <p class="text-[11px] text-slate-400">
                      {{ order.customer?.phone || 'Sin teléfono' }}
                    </p>
                  </div>
                </div>

                <div class="text-right text-xs">
                  <span class="font-bold text-emerald-600 dark:text-emerald-400">
                    {{ order.totalLiters }} L
                  </span>
                  <p class="text-[10px] text-slate-400">
                    {{ formatCurrency(order.totalAmount || 0) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Resumen de pre-ventas seleccionadas -->
            <div
              v-if="selectedOrderIds.length > 0"
              class="flex items-center justify-between border-t border-slate-100 pt-2 text-xs dark:border-slate-800"
            >
              <span class="text-slate-500">
                {{ selectedOrderIds.length }} pedido(s) seleccionado(s)
              </span>
              <span class="font-bold text-slate-700 dark:text-slate-300">
                Compromete: {{ selectedOrdersTotalLiters }} L
              </span>
            </div>
          </div>

          <!-- Fecha, Responsable y Notas -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Fecha de Envasado
              </label>
              <input
                v-model="packagedAt"
                type="date"
                required
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Responsable
              </label>
              <input
                v-model="packagedBy"
                type="text"
                placeholder="Edier"
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Notas del Envasado <span class="font-normal text-slate-400">(Opcional)</span>
            </label>
            <textarea
              v-model="notes"
              rows="2"
              placeholder="Detalles de la preparación, textura o recomendaciones..."
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white resize-none"
            ></textarea>
          </div>

          <!-- Mensaje de Error si aplica -->
          <div
            v-if="errorMessage"
            class="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs font-semibold text-rose-800 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-300"
          >
            <AlertCircle class="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Acciones del Modal -->
          <div class="flex items-center justify-end gap-2.5 border-t border-surface-light-border pt-4 dark:border-surface-dark-border">
            <button
              type="button"
              @click="handleClose"
              class="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>

            <button
              type="submit"
              :disabled="!isValid || isSubmitting"
              class="inline-flex items-center gap-2 rounded-xl bg-hero-gradient px-5 py-2.5 text-xs font-extrabold text-white shadow-card transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PackageCheck class="h-4 w-4 stroke-[2.5]" />
              <span v-if="isSubmitting">{{ isEditMode ? 'Guardando...' : 'Registrando...' }}</span>
              <span v-else>{{ isEditMode ? 'Guardar Cambios' : 'Confirmar Envasado' }} ({{ requiredLiters }}L)</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
