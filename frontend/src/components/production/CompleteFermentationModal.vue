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
  CheckCircle2,
  X,
  AlertCircle,
  Scale,
  Sparkles,
  CheckSquare,
  Square,
  TrendingDown,
  TrendingUp,
} from 'lucide-vue-next';
import {
  useProductionStore,
  type BatchItem,
  type DynamicBatchItem,
} from '@/stores/production.store';
import { formatStockQuantity } from '@/utils/formatters';
import { http } from '@/api/client';

const props = defineProps<{
  open: boolean;
  batch: BatchItem | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'completed'): void;
}>();

const productionStore = useProductionStore();

const finalLiters = ref<number | ''>(0);
const notes = ref<string>('');
const isSubmitting = ref<boolean>(false);
const errorMessage = ref<string | null>(null);

// Insumos candidatos para adición al finalizar fermentación
interface MaterialItem {
  id: number;
  name: string;
  code: string;
  unit: string;
  currentStock: number;
  avgCost: number;
  category: string;
}

interface FermentationChecklistItem {
  rawMaterialId: number;
  name: string;
  unit: string;
  currentStock: number;
  avgCost: number;
  selected: boolean;
  dosage: number | '';
}

const candidateMaterials = ref<FermentationChecklistItem[]>([]);
const isLoadingMaterials = ref<boolean>(false);

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

function getItemCalc(item: FermentationChecklistItem) {
  const isKg = isKgUnit(item.unit);
  const dose = typeof item.dosage === 'number' && !isNaN(item.dosage) ? item.dosage : 0;
  const liters = typeof finalLiters.value === 'number' ? finalLiters.value : 0;

  if (isKg) {
    const totalGrams = Math.round(dose * liters);
    const quantityUsedKg = Math.round(totalGrams) / 1000;
    const totalCost = Math.round(quantityUsedKg * (item.avgCost || 0));
    const isStockInsufficient = quantityUsedKg > (item.currentStock || 0);

    return {
      isKg: true,
      totalGrams,
      quantityUsed: quantityUsedKg,
      totalCost,
      isStockInsufficient,
      displayText: totalGrams > 0 ? `${totalGrams.toLocaleString('es-CO')} g (${quantityUsedKg.toFixed(3)} kg)` : '0 g',
    };
  } else {
    const qty = dose;
    const totalCost = Math.round(qty * (item.avgCost || 0));
    const isStockInsufficient = qty > (item.currentStock || 0);

    return {
      isKg: false,
      totalGrams: 0,
      quantityUsed: qty,
      totalCost,
      isStockInsufficient,
      displayText: `${qty} ${item.unit}`,
    };
  }
}

async function loadCandidateMaterials() {
  isLoadingMaterials.value = true;
  try {
    const res = await http.get<MaterialItem[]>('/inventory/materials');
    if (Array.isArray(res)) {
      const candidates = res.filter((m) => {
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

      candidateMaterials.value = candidates.map((m) => ({
        rawMaterialId: m.id,
        name: m.name,
        unit: m.unit,
        currentStock: m.currentStock,
        avgCost: m.avgCost,
        selected: false,
        dosage: '',
      }));
    }
  } catch {
    candidateMaterials.value = [];
  } finally {
    isLoadingMaterials.value = false;
  }
}

function toggleItemSelection(item: FermentationChecklistItem) {
  item.selected = !item.selected;
  if (item.selected && (!item.dosage || item.dosage <= 0)) {
    if (isKgUnit(item.unit)) {
      const lower = item.name.toLowerCase();
      if (lower.includes('almíbar') || lower.includes('almibar')) {
        item.dosage = 50;
      } else if (lower.includes('azúcar') || lower.includes('azucar')) {
        item.dosage = 100;
      } else {
        item.dosage = 10;
      }
    } else {
      item.dosage = 1;
    }
  }
}

watch(
  () => [props.open, props.batch],
  async ([isOpen, currentBatch]) => {
    if (isOpen && currentBatch) {
      const b = currentBatch as BatchItem;
      finalLiters.value = Number(b.totalLitersProduced) || Number(b.milkUsedLiters) || 0;
      notes.value = '';
      errorMessage.value = null;
      await loadCandidateMaterials();
    }
  },
  { immediate: true }
);

const milkLiters = computed(() => Number(props.batch?.milkUsedLiters) || 0);

const resolvedVolume = computed(() => {
  return typeof finalLiters.value === 'number' && !isNaN(finalLiters.value) ? finalLiters.value : 0;
});

const calculatedYield = computed(() => {
  if (milkLiters.value <= 0) return 100;
  return Math.round((resolvedVolume.value / milkLiters.value) * 1000) / 10;
});

const volumeVariation = computed(() => {
  if (resolvedVolume.value > milkLiters.value) return 'EXPANSION';
  if (resolvedVolume.value < milkLiters.value) return 'MERMA';
  return 'EQUAL';
});

const hasInsufficientStock = computed(() => {
  return candidateMaterials.value.some((item) => {
    if (!item.selected) return false;
    const calc = getItemCalc(item);
    return calc.isStockInsufficient;
  });
});

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

const isValid = computed(() => {
  return (
    typeof finalLiters.value === 'number' &&
    finalLiters.value > 0 &&
    !hasInsufficientStock.value &&
    !isSubmitting.value
  );
});

function handleClose() {
  emit('update:open', false);
}

async function handleSubmit() {
  if (!isValid.value || !props.batch) return;

  isSubmitting.value = true;
  errorMessage.value = null;

  try {
    const selectedDynamicItems: DynamicBatchItem[] = candidateMaterials.value
      .filter((it) => it.selected)
      .map((it) => {
        const calc = getItemCalc(it);
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

    await productionStore.patchBatchVolume(
      props.batch.id,
      Number(finalLiters.value),
      notes.value.trim() || undefined,
      'DISPONIBLE',
      selectedDynamicItems.length > 0 ? selectedDynamicItems : undefined
    );

    emit('completed');
    handleClose();
  } catch (err: any) {
    errorMessage.value =
      err?.response?.data?.error || err?.message || 'Error al completar la fermentación';
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
        class="fixed left-1/2 top-1/2 z-50 w-[95%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-2xl transition-all focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-7 max-h-[92vh] overflow-y-auto"
      >
        <!-- Cabecera del Modal -->
        <div class="flex items-center justify-between border-b border-surface-light-border pb-4 dark:border-surface-dark-border">
          <div class="flex items-center gap-2.5">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 class="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                Terminar Fermentación
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Confirmar volumen real y pasar lote a Listo / Disponible
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

        <form v-if="batch" @submit.prevent="handleSubmit" class="mt-5 space-y-4">
          <!-- Resumen de Leche Inoculada -->
          <div class="rounded-2xl border border-surface-light-border bg-slate-50/70 p-3.5 dark:border-surface-dark-border dark:bg-surface-dark-canvas">
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs font-black text-brand-800 dark:text-brand-darkText">
                  #{{ batch.batchCode }}
                </span>
                <span class="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-black text-purple-800 dark:bg-purple-950/50 dark:text-purple-300">
                  {{ batch.flavor }}
                </span>
              </div>
              <div>
                <span class="text-slate-400">Leche Inoculada:</span>
                <span class="ml-1 font-black text-slate-800 dark:text-slate-200">
                  {{ milkLiters }} Litros
                </span>
              </div>
            </div>
          </div>

          <!-- Input Destacado: Volumen Final Resultante -->
          <div>
            <label class="block text-xs font-extrabold text-slate-800 dark:text-white mb-1.5">
              Volumen Final Resultante (Litros) *
            </label>
            <div class="relative">
              <input
                v-model.number="finalLiters"
                type="number"
                min="0.1"
                step="0.1"
                required
                placeholder="Ej. 26 (almíbar) o 11 (griego)"
                class="w-full rounded-2xl border-2 border-emerald-500/80 bg-surface-light-canvas px-4 py-3 text-lg font-black text-slate-900 focus:border-emerald-600 focus:outline-none dark:border-emerald-600/70 dark:bg-surface-dark-canvas dark:text-white pr-20 shadow-sm"
              />
              <span class="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-400">
                Litros Totales
              </span>
            </div>
            <p class="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Tope físico disponible para fraccionar y envasar en botellas de 1L y 2L.
            </p>
          </div>

          <!-- Indicador de Variación de Rendimiento -->
          <div
            class="flex items-center justify-between rounded-xl p-3 text-xs font-semibold"
            :class="
              volumeVariation === 'MERMA'
                ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 border border-amber-200 dark:border-amber-800/40'
                : volumeVariation === 'EXPANSION'
                ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/40'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            "
          >
            <div class="flex items-center gap-1.5">
              <TrendingDown v-if="volumeVariation === 'MERMA'" class="h-4 w-4 text-amber-600" />
              <TrendingUp v-else-if="volumeVariation === 'EXPANSION'" class="h-4 w-4 text-emerald-600" />
              <Scale v-else class="h-4 w-4 text-slate-500" />
              <span>
                {{
                  volumeVariation === 'MERMA'
                    ? 'Merma por Desuerado (Yogur Griego)'
                    : volumeVariation === 'EXPANSION'
                    ? 'Expansión de Rendimiento (Almíbar añadido)'
                    : 'Rendimiento Estándar (1:1)'
                }}
              </span>
            </div>
            <span class="font-black text-sm">
              {{ calculatedYield }}% Rendimiento
            </span>
          </div>

          <!-- Bloque Opcional: Insumos agregados al finalizar fermentación -->
          <div class="space-y-2 rounded-2xl border border-surface-light-border bg-surface-light-card p-3.5 dark:border-surface-dark-border dark:bg-surface-dark-card">
            <div class="flex items-center justify-between">
              <label class="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-white">
                <Sparkles class="h-3.5 w-3.5 text-purple-500" />
                <span>Insumos agregados al finalizar fermentación</span>
              </label>
              <span class="text-[10px] text-slate-400">Opcional</span>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              Selecciona si adicionaste almíbar base, azúcar o estabilizante para descontar de almacén y acumular al costo base.
            </p>

            <div v-if="isLoadingMaterials" class="py-2 text-center text-xs text-slate-400">
              Cargando catálogo...
            </div>

            <div v-else-if="candidateMaterials.length === 0" class="text-xs text-slate-400 py-1 italic">
              No hay insumos adicionales disponibles.
            </div>

            <div v-else class="max-h-48 space-y-2 overflow-y-auto pr-1">
              <div
                v-for="item in candidateMaterials"
                :key="item.rawMaterialId"
                class="flex flex-col gap-1.5 rounded-xl border p-2.5 transition-all text-xs"
                :class="
                  item.selected
                    ? 'border-purple-300 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20'
                    : 'border-slate-200/70 bg-white dark:border-slate-800 dark:bg-surface-dark-canvas'
                "
              >
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 cursor-pointer min-w-0 flex-1" @click="toggleItemSelection(item)">
                    <button type="button" class="text-purple-600 shrink-0">
                      <CheckSquare v-if="item.selected" class="h-4 w-4" />
                      <Square v-else class="h-4 w-4 text-slate-400" />
                    </button>
                    <div class="min-w-0 truncate">
                      <span class="font-bold text-slate-900 dark:text-white">{{ item.name }}</span>
                      <span class="ml-1.5 text-[10px] text-slate-400">
                        (Stock: {{ formatStockQuantity(item.currentStock, item.unit) }} {{ item.unit }})
                      </span>
                    </div>
                  </div>

                  <!-- Campo de entrada de dosis o cantidad si está seleccionado -->
                  <div v-if="item.selected" class="flex items-center gap-1.5 shrink-0">
                    <div class="relative w-28">
                      <input
                        v-model.number="item.dosage"
                        type="number"
                        min="0.01"
                        step="any"
                        :placeholder="isKgUnit(item.unit) ? 'g/L' : 'Cant.'"
                        class="w-full rounded-lg border border-purple-200 bg-white px-2 py-1 text-xs font-black text-slate-900 focus:border-purple-600 focus:outline-none dark:border-purple-800 dark:bg-slate-900 dark:text-white text-right pr-8"
                      />
                      <span class="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">
                        {{ isKgUnit(item.unit) ? 'g/L' : item.unit }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Desglose de pesaje y costo si está seleccionado -->
                <div v-if="item.selected" class="flex items-center justify-between border-t border-purple-100 pt-1 text-[10px] dark:border-purple-900/40">
                  <span class="font-bold text-purple-700 dark:text-purple-300">
                    {{ getItemCalc(item).displayText }}
                  </span>
                  <span class="font-black text-slate-700 dark:text-slate-300">
                    Costo: {{ formatCurrency(getItemCalc(item).totalCost) }}
                  </span>
                </div>

                <!-- Alerta por stock insuficiente de este insumo -->
                <div
                  v-if="item.selected && getItemCalc(item).isStockInsufficient"
                  class="flex items-center gap-1 rounded bg-rose-50 p-1.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                >
                  <AlertCircle class="h-3 w-3 shrink-0" />
                  <span>Stock insuficiente en bodega (Disponible: {{ formatStockQuantity(item.currentStock, item.unit) }} {{ item.unit }}).</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Notas Opcionales -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Notas de Finalización <span class="font-normal text-slate-400">(Opcional)</span>
            </label>
            <input
              v-model="notes"
              type="text"
              placeholder="Ej. Textura espesa óptima, acidez balanceada, refrigerado a 4°C"
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            />
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
              <CheckCircle2 class="h-4 w-4 stroke-[2.5]" />
              <span v-if="isSubmitting">Finalizando...</span>
              <span v-else>Confirmar y Pasar a Disponible</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
