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
  FlaskConical,
  X,
  AlertCircle,
  Plus,
  Save,
  Clock,
  Coins,
  CheckSquare,
  Square,
} from 'lucide-vue-next';
import { useProductionStore, type BatchItem } from '@/stores/production.store';
import { getTodayDateBogota } from '@/stores/finance.store';
import { http } from '@/api/client';

const props = defineProps<{
  open: boolean;
  batchToEdit?: BatchItem | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'saved'): void;
}>();

const productionStore = useProductionStore();

const isEditMode = computed(() => !!props.batchToEdit);

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

const cultureTypes = [
  'Cultivo Termófilo Tradicional (Streptococcus thermophilus + Lactobacillus bulgaricus)',
  'Probiótico Activo (Bifidobacterium + Lactobacillus acidophilus)',
  'Cultivo Artesanal de Cepas Vivas Liofilizadas',
];

const batchCode = ref('');
const baseFlavor = ref('Natural');
const flavorVariant = ref('');
const customFlavorName = ref('');

const resolvedFlavor = computed(() => {
  if (baseFlavor.value === 'Personalizado') {
    return customFlavorName.value.trim() || 'Artesanal';
  }
  const variant = flavorVariant.value.trim();
  return variant ? `${baseFlavor.value} ${variant}` : baseFlavor.value;
});

const milkUsedLiters = ref<number | ''>(50);
const expectedLiters = ref<number | ''>(48);
const cultureType = ref(cultureTypes[0]);
const fermentationHours = ref<number>(8);
const preparationDate = ref(getTodayDateBogota());
const status = ref<'EN_FERMENTACION' | 'DISPONIBLE'>('EN_FERMENTACION');
const notes = ref('');

// Insumos de Inventario para Checklist Dinámico
interface InventoryMaterialItem {
  id: number;
  name: string;
  code: string;
  category: string;
  unit: string;
  currentStock: number;
  avgCost: number;
}

interface DynamicChecklistItem {
  rawMaterialId: number;
  code: string;
  name: string;
  unit: string;
  currentStock: number;
  avgCost: number;
  selected: boolean;
  dosage: number | '';
}

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

function getItemCalculations(item: DynamicChecklistItem) {
  const isKg = isKgUnit(item.unit);
  const dosage = typeof item.dosage === 'number' && !isNaN(item.dosage) ? item.dosage : 0;
  const milkLiters = Number(milkUsedLiters.value) || 0;

  if (isKg) {
    // Dosis en g/L, leche en L -> gramos totales = Math.round(dosis * litros)
    const totalGrams = Math.round(dosage * milkLiters);
    const quantityUsedKg = Number((totalGrams / 1000).toFixed(4));
    const totalCost = quantityUsedKg * (item.avgCost || 0);

    return {
      isKg: true,
      totalGrams,
      quantityUsed: quantityUsedKg,
      totalCost,
      displayText:
        totalGrams > 0
          ? `Consumo total: ${totalGrams.toLocaleString('es-CO')} g (${quantityUsedKg.toFixed(2)} kg)`
          : '0 g',
    };
  } else {
    // Unidades enteras
    const totalUnits = Math.round(dosage);
    const totalCost = totalUnits * (item.avgCost || 0);

    return {
      isKg: false,
      totalGrams: 0,
      quantityUsed: totalUnits,
      totalCost,
      displayText:
        totalUnits > 0 ? `Consumo total: ${totalUnits} ${item.unit}` : `0 ${item.unit}`,
    };
  }
}

const rawMaterials = ref<InventoryMaterialItem[]>([]);
const dynamicItems = ref<DynamicChecklistItem[]>([]);
const milkAvgCost = ref<number>(2800);
const isLoadingMaterials = ref(false);

const isSubmitting = ref(false);
const errorMessage = ref('');

// Cargar insumos de inventario y filtrar materias primas no-envases
async function loadInventoryMaterials() {
  isLoadingMaterials.value = true;
  try {
    const res = await http.get<InventoryMaterialItem[]>('/inventory/materials');
    if (Array.isArray(res)) {
      rawMaterials.value = res;

      // Buscar costo promedio de leche cruda/entera
      const milkMat = res.find(
        (m) =>
          m.code === 'LECHE' ||
          m.code === 'LECHE_TEST' ||
          m.name.toLowerCase().includes('leche cruda') ||
          m.name.toLowerCase().includes('leche entera')
      );
      if (milkMat && milkMat.avgCost > 0) {
        milkAvgCost.value = milkMat.avgCost;
      }

      // Filtrar materiales candidatos para el checklist (excluir envases, botellas, tapas, etiquetas)
      const candidateMaterials = res.filter((m) => {
        const cat = (m.category || '').toUpperCase();
        const code = (m.code || '').toUpperCase();
        const name = (m.name || '').toLowerCase();
        const isPackaging =
          cat === 'EMPAQUE' ||
          cat === 'ENVASES' ||
          code === 'BOTELLA_1L' ||
          code === 'BOTELLA_2L' ||
          code === 'TAPA' ||
          code === 'ETIQUETA' ||
          name.includes('botella') ||
          name.includes('tapa') ||
          name.includes('etiqueta');
        const isMilk =
          code === 'LECHE' ||
          code === 'LECHE_TEST' ||
          name.includes('leche cruda') ||
          name.includes('leche entera');
        return !isPackaging && !isMilk;
      });

      // Mapear al checklist
      dynamicItems.value = candidateMaterials.map((m) => {
        let preSelected = false;
        let preDosage: number | '' = '';
        if (props.batchToEdit && Array.isArray((props.batchToEdit as any).itemsUsed)) {
          const used = (props.batchToEdit as any).itemsUsed.find((u: any) => u.rawMaterialId === m.id);
          if (used) {
            preSelected = true;
            const isKg = isKgUnit(m.unit);
            const milk = Number(props.batchToEdit.milkUsedLiters) || Number(milkUsedLiters.value) || 1;
            if (isKg) {
              // used.quantityUsed está en kg -> convertir a dosis g/L
              preDosage = Math.round(((used.quantityUsed * 1000) / milk) * 1000) / 1000;
            } else {
              preDosage = used.quantityUsed;
            }
          }
        }
        return {
          rawMaterialId: m.id,
          code: m.code,
          name: m.name,
          unit: m.unit,
          currentStock: m.currentStock,
          avgCost: m.avgCost,
          selected: preSelected,
          dosage: preDosage,
        };
      });
    }
  } catch {
    dynamicItems.value = [];
  } finally {
    isLoadingMaterials.value = false;
  }
}

function toggleItemSelection(item: DynamicChecklistItem) {
  item.selected = !item.selected;
  if (item.selected && (!item.dosage || item.dosage <= 0)) {
    if (isKgUnit(item.unit)) {
      const lower = item.name.toLowerCase();
      if (lower.includes('azúcar') || lower.includes('azucar')) {
        item.dosage = 108.333;
      } else if (lower.includes('polvo')) {
        item.dosage = 30;
      } else {
        item.dosage = 10;
      }
    } else {
      item.dosage = 1;
    }
  }
}

// Cargar correlativo inteligente
async function syncNextBatchCode() {
  if (isEditMode.value) return;
  const res = await productionStore.fetchNextBatchCode(preparationDate.value);
  if (res && res.nextBatchCode) {
    batchCode.value = res.nextBatchCode;
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      productionStore.fetchFlavors(true);
      errorMessage.value = '';

      if (props.batchToEdit) {
        // Modo Edición
        const b = props.batchToEdit;
        batchCode.value = b.batchCode;
        baseFlavor.value = flavors.value.includes(b.flavor) ? b.flavor : 'Personalizado';
        if (baseFlavor.value === 'Personalizado') {
          customFlavorName.value = b.flavor;
        } else {
          customFlavorName.value = '';
        }
        flavorVariant.value = '';
        milkUsedLiters.value = b.milkUsedLiters;
        expectedLiters.value = b.totalLitersProduced;
        cultureType.value = b.cultureType || cultureTypes[0];
        fermentationHours.value = (b as any).fermentationHours || 8;
        preparationDate.value = b.preparationDate ? b.preparationDate.split('T')[0] : getTodayDateBogota();
        status.value = (b.status as any) || 'EN_FERMENTACION';
        notes.value = b.notes || '';
      } else {
        // Modo Creación
        baseFlavor.value = 'Natural';
        flavorVariant.value = '';
        customFlavorName.value = '';
        milkUsedLiters.value = 50;
        expectedLiters.value = 48;
        cultureType.value = cultureTypes[0];
        fermentationHours.value = 8;
        preparationDate.value = getTodayDateBogota();
        status.value = 'EN_FERMENTACION';
        notes.value = '';
        await syncNextBatchCode();
      }

      await loadInventoryMaterials();
    }
  },
  { immediate: true }
);

watch(preparationDate, () => {
  if (props.open && !isEditMode.value) {
    syncNextBatchCode();
  }
});

// Rendimiento esperado
const expectedYield = computed(() => {
  if (!milkUsedLiters.value || !expectedLiters.value) return 96;
  return Math.round((Number(expectedLiters.value) / Number(milkUsedLiters.value)) * 1000) / 10;
});

// Proyección Financiera en Tiempo Real (Fase A)
const financialProjection = computed(() => {
  const milkLiters = Number(milkUsedLiters.value) || 0;
  const milkCost = milkLiters * milkAvgCost.value;

  const itemsCost = dynamicItems.value
    .filter((it) => it.selected)
    .reduce((sum, it) => {
      const calc = getItemCalculations(it);
      return sum + calc.totalCost;
    }, 0);

  const totalCost = milkCost + itemsCost;
  const yieldLiters = Number(expectedLiters.value) || milkLiters || 1;
  const costPerLiter = yieldLiters > 0 ? Math.round(totalCost / yieldLiters) : 0;

  return {
    milkCost,
    itemsCost,
    totalCost,
    costPerLiter,
  };
});

const formatCOP = (val: number) => `$ ${Math.round(val).toLocaleString('es-CO')}`;

const isFormValid = computed(() => {
  return (
    typeof milkUsedLiters.value === 'number' &&
    milkUsedLiters.value > 0 &&
    resolvedFlavor.value.trim().length > 0 &&
    fermentationHours.value > 0
  );
});

function handleClose() {
  emit('update:open', false);
  errorMessage.value = '';
}

async function handleSubmit() {
  if (!isFormValid.value || typeof milkUsedLiters.value !== 'number') {
    errorMessage.value = 'Por favor ingresa los litros de leche, horas de fermentación y sabor.';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    const selectedDynamicItems = dynamicItems.value
      .filter((it) => it.selected)
      .map((it) => {
        const calc = getItemCalculations(it);
        const isKg = isKgUnit(it.unit);
        return {
          rawMaterialId: it.rawMaterialId,
          quantityUsed: calc.quantityUsed,
          unitCost: it.avgCost || 0,
          dosagePerLiter: isKg && typeof it.dosage === 'number' ? it.dosage : undefined,
          dosageUnit: isKg ? 'g/L' : it.unit,
        };
      })
      .filter((it) => it.quantityUsed > 0);

    if (isEditMode.value && props.batchToEdit) {
      await productionStore.updateBatch(props.batchToEdit.id, {
        flavor: resolvedFlavor.value.trim(),
        cultureType: cultureType.value,
        fermentationHours: Number(fermentationHours.value),
        milkUsedLiters: milkUsedLiters.value,
        totalLitersProduced: expectedLiters.value ? Number(expectedLiters.value) : milkUsedLiters.value,
        preparationDate: preparationDate.value,
        notes: notes.value.trim() || undefined,
        status: status.value,
        dynamicItems: selectedDynamicItems,
      });
    } else {
      await productionStore.createBatch({
        batchCode: batchCode.value || undefined,
        flavor: resolvedFlavor.value.trim(),
        cultureType: cultureType.value,
        fermentationHours: Number(fermentationHours.value),
        milkUsedLiters: milkUsedLiters.value,
        totalLitersProduced: expectedLiters.value ? Number(expectedLiters.value) : milkUsedLiters.value,
        preparationDate: preparationDate.value,
        notes: notes.value.trim() || undefined,
        status: status.value,
        useSugar: false,
        usePowderedMilk: false,
        dynamicItems: selectedDynamicItems,
      });
    }

    emit('saved');
    handleClose();
  } catch (err: any) {
    errorMessage.value = err?.message || 'Error al guardar el lote de producción';
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
        <div class="flex items-center justify-between border-b border-surface-light-border pb-4 dark:border-surface-dark-border">
          <div class="flex items-center gap-2.5">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
              <FlaskConical class="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                {{ isEditMode ? 'Editar Lote Madre (Fase A)' : 'Iniciar Lote de Producción (Fase A)' }}
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Inoculación, tiempo en horas, insumos de fermentación y costos
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
          <!-- Banner Informativo Fase A -->
          <div class="rounded-2xl border border-purple-200 bg-purple-50/70 p-3.5 text-xs text-purple-900 dark:border-purple-800/40 dark:bg-purple-950/30 dark:text-purple-300">
            <div class="flex items-start gap-2.5">
              <FlaskConical class="h-4 w-4 shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
              <div>
                <p class="font-extrabold text-xs">Fase A · Fermentación del Lote Base</p>
                <p class="mt-0.5 text-[11px] leading-relaxed opacity-90">
                  Descuenta únicamente la leche e insumos base seleccionados. El fraccionamiento por sabores, botellas (1L y 2L), tapas y etiquetas se realiza en la Fase B al envasar.
                </p>
              </div>
            </div>
          </div>

          <!-- Código de Lote Inteligente y Sabor Base -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Código de Lote
              </label>
              <div class="relative">
                <input
                  v-model="batchCode"
                  type="text"
                  :readonly="isEditMode"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-extrabold text-purple-800 dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-purple-300"
                  :class="{ 'cursor-not-allowed': isEditMode }"
                />
                <span class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded bg-purple-100 dark:bg-purple-900/60 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                  {{ isEditMode ? 'Existente' : 'Correlativo Libre' }}
                </span>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Sabor Base *
              </label>
              <select
                v-model="baseFlavor"
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              >
                <option v-for="fl in flavors" :key="fl" :value="fl">
                  {{ fl }}
                </option>
              </select>
            </div>
          </div>

          <!-- Variante de Sabor / Personalizado y Vista Previa -->
          <div class="rounded-2xl border border-surface-light-border bg-slate-50/60 p-3.5 dark:border-surface-dark-border dark:bg-surface-dark-canvas">
            <div v-if="baseFlavor === 'Personalizado'" class="space-y-1.5">
              <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                Nombre del Sabor Artesanal *
              </label>
              <input
                v-model="customFlavorName"
                type="text"
                required
                placeholder="Ej. Vainilla Moka, Frutos del Bosque..."
                class="w-full rounded-xl border border-slate-200 bg-surface-light-card px-3.5 py-2 text-xs font-bold text-slate-900 placeholder-slate-400 focus:border-brand-800 focus:outline-none dark:border-slate-700 dark:bg-surface-dark-card dark:text-white"
              />
            </div>

            <div v-else class="space-y-1.5">
              <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                Variante o Especificación <span class="font-normal text-slate-400">(Opcional)</span>
              </label>
              <input
                v-model="flavorVariant"
                type="text"
                placeholder="Ej. bajo en azúcar, con stevia, tradicional..."
                class="w-full rounded-xl border border-slate-200 bg-surface-light-card px-3.5 py-2 text-xs font-bold text-slate-900 placeholder-slate-400 focus:border-brand-800 focus:outline-none dark:border-slate-700 dark:bg-surface-dark-card dark:text-white"
              />
            </div>

            <!-- Previsualización del Sabor Final que se guardará -->
            <div class="mt-2.5 flex items-center justify-between border-t border-slate-200/60 pt-2 dark:border-slate-700/60">
              <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Sabor Registrado para Pedidos:
              </span>
              <span class="inline-flex items-center rounded-lg bg-brand-50 px-2 py-0.5 text-xs font-black text-brand-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                {{ resolvedFlavor }}
              </span>
            </div>
          </div>

          <!-- Litros de Leche y Rendimiento Estimado -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Litros de Leche Inoculados *
              </label>
              <div class="relative">
                <input
                  v-model.number="milkUsedLiters"
                  type="number"
                  min="1"
                  step="any"
                  placeholder="50"
                  required
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-sm font-extrabold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  Litros
                </span>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Volumen Real Obtenido / Final (L)
              </label>
              <div class="relative">
                <input
                  v-model.number="expectedLiters"
                  type="number"
                  min="0.1"
                  step="any"
                  placeholder="48"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-sm font-extrabold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  Litros
                </span>
              </div>
            </div>
          </div>

          <!-- Indicador de Rendimiento Estimado -->
          <div class="flex flex-col gap-1 rounded-xl bg-natural-50/50 p-2.5 text-xs text-natural-700 dark:bg-emerald-950/20 dark:text-emerald-300">
            <div class="flex items-center justify-between">
              <span class="font-bold">Rendimiento proyectado del lote:</span>
              <span class="font-black">{{ expectedYield }}%</span>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">
              Merma por desuerado (ej. 11L en yogur griego) o expansión por almíbar (ej. 26L). Define el tope envasable en Fase B.
            </p>
          </div>

          <!-- Tiempo de Fermentación en Horas -->
          <div class="rounded-2xl border border-surface-light-border bg-slate-50/40 p-3.5 dark:border-surface-dark-border dark:bg-surface-dark-canvas/50">
            <div class="flex items-center justify-between mb-1.5">
              <label class="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Clock class="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span>Tiempo de Fermentación *</span>
              </label>
              <span class="text-[11px] font-extrabold text-purple-700 dark:text-purple-300">
                {{ fermentationHours }} Horas
              </span>
            </div>
            <div class="flex items-center gap-3">
              <div class="relative flex-1">
                <input
                  v-model.number="fermentationHours"
                  type="number"
                  min="1"
                  max="72"
                  step="0.5"
                  required
                  class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-slate-700 dark:bg-surface-dark-card dark:text-white"
                />
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  h
                </span>
              </div>
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  @click="fermentationHours = 6"
                  class="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-dark-card dark:text-slate-300"
                >
                  6h
                </button>
                <button
                  type="button"
                  @click="fermentationHours = 8"
                  class="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-dark-card dark:text-slate-300"
                >
                  8h
                </button>
                <button
                  type="button"
                  @click="fermentationHours = 12"
                  class="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-dark-card dark:text-slate-300"
                >
                  12h
                </button>
              </div>
            </div>
            <p class="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              Estándar recomendado: 8 horas continuas en incubación (42°C - 44°C).
            </p>
          </div>

          <!-- Checklist Dinámico de Materias Primas / Insumos de Fermentación -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-slate-700 dark:text-slate-300">
                Insumos de Fermentación Adicionales
              </label>
              <span class="text-[11px] text-slate-400">
                Dosificación en g/L con cálculo de pesaje exacto
              </span>
            </div>

            <div v-if="isLoadingMaterials" class="p-4 text-center text-xs text-slate-400">
              Cargando catálogo de materias primas...
            </div>

            <div
              v-else-if="dynamicItems.length === 0"
              class="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-700"
            >
              No hay materias primas adicionales registradas en inventario.
            </div>

            <div v-else class="max-h-56 space-y-2.5 overflow-y-auto rounded-2xl border border-surface-light-border bg-slate-50/40 p-2.5 dark:border-surface-dark-border dark:bg-surface-dark-canvas/50">
              <div
                v-for="item in dynamicItems"
                :key="item.rawMaterialId"
                class="flex flex-col gap-2 rounded-xl border p-3 transition-all"
                :class="
                  item.selected
                    ? 'border-purple-300 bg-purple-50/50 dark:border-purple-800/80 dark:bg-purple-950/20'
                    : 'border-slate-200/80 bg-white dark:border-slate-800 dark:bg-surface-dark-card'
                "
              >
                <div class="flex items-start justify-between gap-3">
                  <!-- Checkbox, Nombre, Stock y Total calculado -->
                  <div class="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0" @click="toggleItemSelection(item)">
                    <button type="button" class="mt-0.5 text-purple-600 dark:text-purple-400 shrink-0">
                      <CheckSquare v-if="item.selected" class="h-4 w-4" />
                      <Square v-else class="h-4 w-4 text-slate-400" />
                    </button>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-xs font-bold text-slate-900 dark:text-white">
                          {{ item.name }}
                        </span>
                        <span class="text-[10px] text-slate-400">
                          Stock: {{ item.currentStock }} {{ item.unit }}
                        </span>
                      </div>
                      <!-- Despliegue de pesaje calculado -->
                      <div v-if="item.selected && getItemCalculations(item).quantityUsed > 0" class="mt-1 flex items-center gap-1.5 text-[11px] font-extrabold text-purple-700 dark:text-purple-300">
                        <span>{{ getItemCalculations(item).displayText }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Campo de dosificación y costo a la derecha -->
                  <div v-if="item.selected" class="flex flex-col items-end gap-1 shrink-0">
                    <div class="flex items-center gap-2">
                      <div class="relative w-32">
                        <input
                          v-if="isKgUnit(item.unit)"
                          v-model.number="item.dosage"
                          type="number"
                          min="0.001"
                          step="0.001"
                          placeholder="Dosis g/L"
                          class="w-full rounded-lg border border-purple-200 bg-white px-2.5 py-1 text-xs font-black text-slate-900 focus:border-purple-600 focus:outline-none dark:border-purple-800 dark:bg-slate-900 dark:text-white text-right pr-9"
                        />
                        <input
                          v-else
                          v-model.number="item.dosage"
                          type="number"
                          min="1"
                          step="1"
                          placeholder="Cant."
                          class="w-full rounded-lg border border-purple-200 bg-white px-2.5 py-1 text-xs font-black text-slate-900 focus:border-purple-600 focus:outline-none dark:border-purple-800 dark:bg-slate-900 dark:text-white text-right pr-9"
                        />
                        <span class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">
                          {{ isKgUnit(item.unit) ? 'g/L' : item.unit }}
                        </span>
                      </div>
                      <span class="text-[11px] font-black text-slate-700 dark:text-slate-300 min-w-16 text-right">
                        {{ formatCOP(getItemCalculations(item).totalCost) }}
                      </span>
                    </div>
                    <span v-if="isKgUnit(item.unit)" class="text-[10px] text-slate-400">
                      Dosis por litro
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tipo de Cultivo / Fermento -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tipo de Cultivo / Fermento
            </label>
            <select
              v-model="cultureType"
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            >
              <option v-for="c in cultureTypes" :key="c" :value="c">
                {{ c }}
              </option>
            </select>
          </div>

          <!-- Tarjeta Financiera Proyectada en Tiempo Real (Fase A) -->
          <div class="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-800/40 dark:bg-emerald-950/20">
            <div class="flex items-center justify-between border-b border-emerald-200/60 pb-2 dark:border-emerald-800/60">
              <span class="flex items-center gap-1.5 text-xs font-extrabold text-emerald-900 dark:text-emerald-300">
                <Coins class="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Proyección Financiera Base (Fase A)</span>
              </span>
              <span class="rounded bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:text-emerald-200">
                $0 en Botellas / Tapas
              </span>
            </div>

            <div class="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div>
                <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400">Leche Inoculada</span>
                <p class="font-extrabold text-slate-900 dark:text-white">
                  {{ formatCOP(financialProjection.milkCost) }}
                </p>
              </div>
              <div>
                <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400">Insumos Fermentación</span>
                <p class="font-extrabold text-slate-900 dark:text-white">
                  {{ formatCOP(financialProjection.itemsCost) }}
                </p>
              </div>
              <div>
                <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400">Costo Total Base</span>
                <p class="font-black text-emerald-700 dark:text-emerald-300">
                  {{ formatCOP(financialProjection.totalCost) }}
                </p>
              </div>
              <div>
                <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400">Costo / Litro Proyectado</span>
                <p class="font-black text-brand-900 dark:text-white">
                  {{ formatCOP(financialProjection.costPerLiter) }} / L
                </p>
              </div>
            </div>
          </div>

          <!-- Fecha de Inoculación y Estado Inicial -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Fecha de Inoculación
              </label>
              <input
                v-model="preparationDate"
                type="date"
                required
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Estado del Lote
              </label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  @click="status = 'EN_FERMENTACION'"
                  class="rounded-xl border p-2 text-xs font-extrabold transition-all"
                  :class="
                    status === 'EN_FERMENTACION'
                      ? 'border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-400 dark:bg-purple-950/40 dark:text-purple-300'
                      : 'border-surface-light-border bg-surface-light-canvas text-slate-600 dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-slate-400'
                  "
                >
                  En Fermentación
                </button>

                <button
                  type="button"
                  @click="status = 'DISPONIBLE'"
                  class="rounded-xl border p-2 text-xs font-extrabold transition-all"
                  :class="
                    status === 'DISPONIBLE'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'border-surface-light-border bg-surface-light-canvas text-slate-600 dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-slate-400'
                  "
                >
                  Listo / Disponible
                </button>
              </div>
            </div>
          </div>

          <!-- Notas de Inoculación -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Notas de Inoculación & pH (Opcional)
            </label>
            <input
              v-model="notes"
              type="text"
              placeholder="Ej: pH inicial 6.6, tina 1, temperatura incubación 42°C..."
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            />
          </div>

          <!-- Error Alert -->
          <div
            v-if="errorMessage"
            class="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
          >
            <AlertCircle class="h-4 w-4 shrink-0" />
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Botones de Acción -->
          <div class="flex items-center justify-end gap-2.5 pt-3">
            <button
              type="button"
              @click="handleClose"
              class="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="!isFormValid || isSubmitting"
              class="inline-flex items-center gap-2 rounded-xl bg-hero-gradient px-5 py-2.5 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95 disabled:opacity-50"
            >
              <Save v-if="isEditMode" class="h-4 w-4 stroke-[2.5]" />
              <Plus v-else class="h-4 w-4 stroke-[2.5]" />
              <span>
                {{ isSubmitting ? 'Guardando...' : (isEditMode ? 'Guardar Cambios' : 'Iniciar Lote') }}
              </span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
