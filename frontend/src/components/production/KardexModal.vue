<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from 'reka-ui';
import {
  ArrowUpDown,
  X,
  Package,
  ChevronLeft,
  ChevronRight,
  RotateCw,
} from 'lucide-vue-next';
import { http } from '@/api/client';

export interface KardexMovement {
  id: number;
  rawMaterialId: number;
  type: string;
  previousStock: number;
  newStock: number;
  deltaQuantity: number;
  unit: string;
  unitCost: number;
  totalCostImpact: number;
  reason?: string | null;
  registeredBy?: string | null;
  adjustmentDate: string;
  rawMaterial?: {
    id: number;
    name: string;
    unit: string;
    category?: string;
    code?: string;
    currentStock: number;
    avgCost: number;
  };
}

export interface KardexResponse {
  data: KardexMovement[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const props = defineProps<{
  open: boolean;
  rawMaterialId: number | null;
  materialName?: string;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
}>();

const movements = ref<KardexMovement[]>([]);
const materialInfo = ref<any | null>(null);
const isLoading = ref<boolean>(false);

const currentPage = ref<number>(1);
const totalPages = ref<number>(1);
const totalMovements = ref<number>(0);
const pageSize = 10;

const formatCurrency = (val?: number | null) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
};

const formatQuantity = (val?: number | null, unit?: string) => {
  const num = Number(val || 0);
  const u = (unit || '').toLowerCase();
  const maxDecimals = u === 'kg' || u === 'l' || u === 'litros' ? 3 : 2;
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(num);
};

async function fetchKardex(page = 1) {
  if (!props.rawMaterialId) return;
  isLoading.value = true;
  try {
    const res = await http.get<KardexResponse>('/inventory/movements', {
      params: {
        rawMaterialId: props.rawMaterialId,
        page,
        limit: pageSize,
      },
    });

    if (res && res.data) {
      movements.value = res.data;
      if (res.data.length > 0 && res.data[0].rawMaterial) {
        materialInfo.value = res.data[0].rawMaterial;
      }
      if (res.pagination) {
        currentPage.value = res.pagination.page;
        totalPages.value = res.pagination.totalPages;
        totalMovements.value = res.pagination.total;
      }
    }
  } catch {
    movements.value = [];
  } finally {
    isLoading.value = false;
  }
}

watch(
  () => [props.open, props.rawMaterialId],
  async ([isOpen, id]) => {
    if (isOpen && id) {
      currentPage.value = 1;
      movements.value = [];
      await fetchKardex(1);
    } else {
      movements.value = [];
      materialInfo.value = null;
    }
  },
  { immediate: true }
);

function handleClose() {
  emit('update:open', false);
}
</script>

<template>
  <DialogRoot :open="open" @update:open="(val: boolean) => emit('update:open', val)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity" />

      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-[95%] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-2xl transition-all focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-7 max-h-[90vh] overflow-y-auto"
      >
        <!-- Encabezado del Modal -->
        <div class="flex items-center justify-between border-b border-surface-light-border pb-4 dark:border-surface-dark-border">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-800 dark:bg-purple-950/40 dark:text-purple-300">
              <ArrowUpDown class="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <DialogTitle class="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
                  Kardex y Trazabilidad de Almacén
                </DialogTitle>
                <span
                  v-if="materialName || materialInfo?.name"
                  class="rounded-xl bg-surface-light-canvas px-2.5 py-0.5 font-mono text-xs font-black text-brand-800 border border-slate-200 dark:border-slate-700 dark:bg-surface-dark-canvas dark:text-brand-darkText"
                >
                  {{ materialName || materialInfo?.name }}
                </span>
              </div>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Historial cronológico de variaciones de stock, conteos y mermas (10 registros por página)
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

        <!-- Banner de Stock Actual del Insumo -->
        <div
          v-if="materialInfo"
          class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-surface-light-border bg-surface-light-canvas p-4 dark:border-surface-dark-border dark:bg-surface-dark-canvas"
        >
          <div class="flex items-center gap-2.5">
            <Package class="h-5 w-5 text-brand-800 dark:text-brand-darkText" />
            <div>
              <span class="text-xs font-black text-slate-900 dark:text-white">{{ materialInfo.name }}</span>
              <p class="text-[10px] text-slate-400">
                Unidad: {{ materialInfo.unit }} · Costo Promedio: {{ formatCurrency(materialInfo.avgCost) }}/{{ materialInfo.unit }}
              </p>
            </div>
          </div>

          <div class="text-right">
            <span class="text-[10px] font-bold uppercase text-slate-400">Stock Actual Físico</span>
            <p class="text-lg font-black text-brand-800 dark:text-brand-darkText">
              {{ formatQuantity(materialInfo.currentStock, materialInfo.unit) }} {{ materialInfo.unit }}
            </p>
          </div>
        </div>

        <!-- Indicador de Carga -->
        <div v-if="isLoading" class="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
          <RotateCw class="h-5 w-5 animate-spin text-brand-800" />
          <span>Cargando movimientos de Kardex...</span>
        </div>

        <!-- Estado Vacío -->
        <div
          v-else-if="movements.length === 0"
          class="mt-5 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400 dark:border-slate-700"
        >
          No hay movimientos de Kardex registrados para este insumo.
        </div>

        <!-- Tabla de Movimientos de Kardex -->
        <div v-else class="mt-5 space-y-3">
          <div class="overflow-x-auto rounded-2xl border border-surface-light-border dark:border-surface-dark-border">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  <th class="px-3.5 py-2.5">Fecha</th>
                  <th class="px-3.5 py-2.5">Tipo / Motivo</th>
                  <th class="px-3.5 py-2.5">Responsable</th>
                  <th class="px-3.5 py-2.5 text-right">Variación</th>
                  <th class="px-3.5 py-2.5 text-right">Saldo Resultante</th>
                  <th class="px-3.5 py-2.5 text-right">Impacto $</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800 bg-surface-light-card dark:bg-surface-dark-card font-medium text-slate-700 dark:text-slate-300">
                <tr v-for="m in movements" :key="m.id">
                  <td class="px-3.5 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {{ formatDate(m.adjustmentDate) }}
                  </td>
                  <td class="px-3.5 py-2.5">
                    <div class="flex flex-col gap-0.5">
                      <span
                        class="rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase w-fit"
                        :class="
                          m.deltaQuantity >= 0
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        "
                      >
                        {{ m.type }}
                      </span>
                      <span v-if="m.reason" class="text-[11px] text-slate-500 italic">
                        {{ m.reason }}
                      </span>
                    </div>
                  </td>
                  <td class="px-3.5 py-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {{ m.registeredBy || 'Edier' }}
                  </td>
                  <td
                    class="px-3.5 py-2.5 text-right font-black whitespace-nowrap"
                    :class="m.deltaQuantity >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
                  >
                    {{ m.deltaQuantity >= 0 ? '+' : '' }}{{ formatQuantity(m.deltaQuantity, m.unit) }} {{ m.unit }}
                  </td>
                  <td class="px-3.5 py-2.5 text-right font-extrabold whitespace-nowrap text-slate-800 dark:text-white">
                    {{ formatQuantity(m.newStock, m.unit) }} {{ m.unit }}
                  </td>
                  <td class="px-3.5 py-2.5 text-right font-black whitespace-nowrap">
                    <span :class="m.totalCostImpact >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                      {{ formatCurrency(m.totalCostImpact) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Barra de Paginación Estricta a 10 Registros -->
          <div
            v-if="totalPages > 1 || totalMovements > 0"
            class="flex items-center justify-between border-t border-surface-light-border px-1 pt-3 dark:border-surface-dark-border text-xs text-slate-500"
          >
            <span>
              Página {{ currentPage }} de {{ totalPages }} ({{ totalMovements }} movimientos en total)
            </span>

            <div class="flex items-center gap-1.5">
              <button
                type="button"
                @click="fetchKardex(currentPage - 1)"
                :disabled="currentPage <= 1 || isLoading"
                class="inline-flex items-center gap-1 rounded-xl border border-surface-light-border px-3 py-1.5 font-bold hover:bg-slate-50 disabled:opacity-40 dark:border-surface-dark-border dark:hover:bg-slate-800 dark:text-slate-300"
              >
                <ChevronLeft class="h-3.5 w-3.5" />
                <span>Anterior</span>
              </button>

              <span class="px-2 font-black text-slate-700 dark:text-slate-200">
                {{ currentPage }} / {{ totalPages }}
              </span>

              <button
                type="button"
                @click="fetchKardex(currentPage + 1)"
                :disabled="currentPage >= totalPages || isLoading"
                class="inline-flex items-center gap-1 rounded-xl border border-surface-light-border px-3 py-1.5 font-bold hover:bg-slate-50 disabled:opacity-40 dark:border-surface-dark-border dark:hover:bg-slate-800 dark:text-slate-300"
              >
                <span>Siguiente</span>
                <ChevronRight class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div class="mt-6 flex justify-end border-t border-surface-light-border pt-4 dark:border-surface-dark-border">
          <button
            type="button"
            @click="handleClose"
            class="rounded-xl bg-brand-800 px-5 py-2.5 text-xs font-extrabold text-white transition-transform active:scale-95 dark:bg-brand-500"
          >
            Cerrar Kardex
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
