<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { refDebounced } from '@vueuse/core';
import {
  TabsRoot,
  TabsList,
  TabsTrigger,
  TabsContent,
} from 'reka-ui';
import {
  Boxes,
  AlertTriangle,
  ArrowUpDown,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Search,
  RefreshCw,
  Layers,
  ClipboardList,
  Milk,
  Sparkles,
  PackageCheck,
  CheckCircle2,
  Calendar,
  User,
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { formatStockQuantity } from '@/utils/formatters';
import InventoryMovementModal from '@/components/production/InventoryMovementModal.vue';
import PurchaseStockModal from '@/components/production/PurchaseStockModal.vue';

export interface MaterialItem {
  id: number;
  code: string;
  name: string;
  category: string;
  unit: string;
  minStockAlert: number;
  avgCost: number;
  currentStock: number;
  isLowStock?: boolean;
  isActive?: boolean;
}

export interface AdjustmentItem {
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
  registeredBy?: string;
  adjustmentDate: string;
  createdAt?: string;
  rawMaterial?: {
    code: string;
    name: string;
    unit: string;
    category: string;
  };
}

export type MaterialCategoryChip = 'ALL' | 'DAIRY' | 'PACKAGING' | 'FRUIT' | 'CRITICAL';

// Estado de datos
const materials = ref<MaterialItem[]>([]);
const adjustments = ref<AdjustmentItem[]>([]);
const isLoading = ref<boolean>(false);

// Navegación de pestañas
const activeTab = ref<'materials' | 'kardex'>('materials');

// Filtros para Catálogo de Insumos
const selectedCategoryChip = ref<MaterialCategoryChip>('ALL');
const searchMaterial = ref<string>('');
const debouncedMaterialSearch = refDebounced(searchMaterial, 300);

// Filtros para Kardex
const searchKardex = ref<string>('');
const debouncedKardexSearch = refDebounced(searchKardex, 300);

// Formateadores de moneda y números
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
};

// Carga de Insumos y Kardex
async function fetchMaterials() {
  try {
    const res = await http.get<any>('/inventory/materials');
    if (Array.isArray(res)) {
      materials.value = res;
    } else if (res && Array.isArray(res.items)) {
      materials.value = res.items;
    }
  } catch {
    // Manejado por interceptor global
  }
}

async function fetchAdjustments() {
  try {
    const res = await http.get<AdjustmentItem[]>('/inventory/adjustments');
    if (Array.isArray(res)) {
      adjustments.value = res;
    }
  } catch {
    // Manejado por interceptor global
  }
}

async function refreshAll() {
  isLoading.value = true;
  try {
    await Promise.all([fetchMaterials(), fetchAdjustments()]);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  refreshAll();
});

// Métricas Superiores
const totalInventoryValue = computed(() => {
  return materials.value.reduce((acc, m) => acc + (Number(m.currentStock || 0) * Number(m.avgCost || 0)), 0);
});

const criticalStockMaterials = computed(() => {
  return materials.value.filter((m) => Number(m.currentStock || 0) <= Number(m.minStockAlert || 0));
});

const totalAdjustmentsCount = computed(() => {
  return adjustments.value.length;
});

// Lógica de clasificación por categoría
function matchesCategory(m: MaterialItem, chip: MaterialCategoryChip): boolean {
  if (chip === 'ALL') return true;
  if (chip === 'CRITICAL') return Number(m.currentStock || 0) <= Number(m.minStockAlert || 0);

  const cat = (m.category || '').toUpperCase();
  const name = (m.name || '').toUpperCase();

  if (chip === 'DAIRY') {
    return (
      cat.includes('LACT') ||
      cat.includes('LECHE') ||
      cat.includes('MATERIA') ||
      name.includes('LECHE') ||
      name.includes('CULTIVO')
    );
  }
  if (chip === 'PACKAGING') {
    return (
      cat.includes('EMPAQUE') ||
      cat.includes('ENVASE') ||
      cat.includes('TAPA') ||
      cat.includes('ETIQUETA') ||
      name.includes('BOTELLA') ||
      name.includes('TAPA') ||
      name.includes('ETIQUETA')
    );
  }
  if (chip === 'FRUIT') {
    return (
      cat.includes('FRUTA') ||
      cat.includes('MERMELADA') ||
      cat.includes('SABOR') ||
      cat.includes('PULPA') ||
      name.includes('MORA') ||
      name.includes('FRESA') ||
      name.includes('MELOCOTON') ||
      name.includes('FRUTA')
    );
  }
  return true;
}

// Conteos por chip
const chipCounts = computed(() => {
  const all = materials.value.length;
  const dairy = materials.value.filter((m) => matchesCategory(m, 'DAIRY')).length;
  const packaging = materials.value.filter((m) => matchesCategory(m, 'PACKAGING')).length;
  const fruit = materials.value.filter((m) => matchesCategory(m, 'FRUIT')).length;
  const critical = criticalStockMaterials.value.length;
  return { all, dairy, packaging, fruit, critical };
});

// Insumos filtrados reactivamente
const filteredMaterials = computed(() => {
  let result = materials.value;

  // 1. Filtrar por chip de categoría
  result = result.filter((m) => matchesCategory(m, selectedCategoryChip.value));

  // 2. Filtrar por buscador
  const q = debouncedMaterialSearch.value.trim().toLowerCase();
  if (q) {
    result = result.filter((m) => {
      const name = (m.name || '').toLowerCase();
      const code = (m.code || '').toLowerCase();
      const cat = (m.category || '').toLowerCase();
      return name.includes(q) || code.includes(q) || cat.includes(q);
    });
  }

  return result;
});

// Kardex filtrado reactivamente
const filteredAdjustments = computed(() => {
  let result = adjustments.value;
  const q = debouncedKardexSearch.value.trim().toLowerCase();
  if (q) {
    result = result.filter((adj) => {
      const reason = (adj.reason || '').toLowerCase();
      const matName = (adj.rawMaterial?.name || '').toLowerCase();
      const reg = (adj.registeredBy || '').toLowerCase();
      const type = (adj.type || '').toLowerCase();
      return reason.includes(q) || matName.includes(q) || reg.includes(q) || type.includes(q);
    });
  }
  return result;
});

// Modal de Movimiento de Kardex y Compra
const isMovementModalOpen = ref<boolean>(false);
const isPurchaseModalOpen = ref<boolean>(false);
const preselectedMaterialId = ref<number | null>(null);

function openPurchaseModal(materialId?: number) {
  preselectedMaterialId.value = materialId || null;
  isPurchaseModalOpen.value = true;
}

// Apertura del modal de Kardex
function openMovementModal(materialId?: number) {
  preselectedMaterialId.value = materialId || null;
  isMovementModalOpen.value = true;
}

function handleMovementSaved() {
  refreshAll();
}

// Opciones de insumo para el modal
const materialOptions = computed<any[]>(() => {
  return materials.value.map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    unit: m.unit,
    currentStock: m.currentStock,
    minStockAlert: m.minStockAlert,
    avgCost: m.avgCost,
    code: m.code,
  }));
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header Principal -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Inventario y Materias Primas
        </h1>
        <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Control físico de existencias, envases, frutas, leche y trazabilidad de Kardex
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="refreshAll"
          :disabled="isLoading"
          class="inline-flex items-center gap-1.5 rounded-xl border border-surface-light-border bg-surface-light-card px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800"
          title="Actualizar datos"
        >
          <RefreshCw class="h-4 w-4 stroke-[2]" :class="{ 'animate-spin': isLoading }" />
          <span class="hidden sm:inline">Refrescar</span>
        </button>

        <button
          type="button"
          @click="openMovementModal()"
          class="inline-flex items-center gap-1.5 rounded-xl border border-surface-light-border bg-surface-light-card px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-200 dark:hover:bg-slate-800"
          title="Ajuste o regularización física de inventario"
        >
          <ArrowUpDown class="h-4 w-4 stroke-[2]" />
          <span>Ajuste / Kardex</span>
        </button>

        <button
          type="button"
          @click="openPurchaseModal()"
          class="inline-flex items-center gap-2 rounded-xl bg-hero-gradient px-4 py-2.5 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95"
        >
          <Plus class="h-4 w-4 stroke-[2.5]" />
          <span>Registrar Compra / Entrada</span>
        </button>
      </div>
    </div>

    <!-- Métricas Superiores de Almacén -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <!-- Valor Total en Almacén -->
      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-500 dark:text-slate-400">Valor Total de Inventario</span>
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-darkText">
            <PackageCheck class="h-4 w-4 stroke-[2]" />
          </div>
        </div>
        <div class="mt-2">
          <span class="text-2xl font-black text-slate-900 dark:text-white">
            {{ formatCurrency(totalInventoryValue) }}
          </span>
          <p class="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {{ materials.length }} insumos registrados a costo promedio
          </p>
        </div>
      </div>

      <!-- Insumos en Alerta Crítica -->
      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-amber-600 dark:text-amber-400">Insumos con Stock Bajo</span>
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <AlertTriangle class="h-4 w-4 stroke-[2]" />
          </div>
        </div>
        <div class="mt-2">
          <span class="text-2xl font-black text-amber-600 dark:text-amber-400">
            {{ criticalStockMaterials.length }}
          </span>
          <p class="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Existencias por debajo o al límite del stock mínimo
          </p>
        </div>
      </div>

      <!-- Movimientos Registrados en Kardex -->
      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-natural-600 dark:text-natural-400">Trazabilidad Kardex</span>
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-natural-50 text-natural-600 dark:bg-natural-950/40 dark:text-natural-400">
            <ArrowUpDown class="h-4 w-4 stroke-[2]" />
          </div>
        </div>
        <div class="mt-2">
          <span class="text-2xl font-black text-natural-600 dark:text-natural-400">
            {{ totalAdjustmentsCount }}
          </span>
          <p class="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Ajustes físicos, entradas y consumos asentados
          </p>
        </div>
      </div>
    </div>

    <!-- Navegación por Sub-pestañas con Reka UI -->
    <TabsRoot v-model="activeTab" class="w-full space-y-4">
      <TabsList class="inline-flex rounded-2xl border border-surface-light-border bg-surface-light-canvas p-1 shadow-inner dark:border-surface-dark-border dark:bg-surface-dark-canvas">
        <TabsTrigger
          value="materials"
          class="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold text-slate-600 transition-all data-[state=active]:bg-white data-[state=active]:text-brand-800 data-[state=active]:shadow-card dark:text-slate-400 dark:data-[state=active]:bg-surface-dark-card dark:data-[state=active]:text-brand-darkText"
        >
          <Boxes class="h-4 w-4 stroke-[2]" />
          <span>Catálogo de Insumos y Envases</span>
          <span class="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {{ materials.length }}
          </span>
        </TabsTrigger>

        <TabsTrigger
          value="kardex"
          class="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold text-slate-600 transition-all data-[state=active]:bg-white data-[state=active]:text-brand-800 data-[state=active]:shadow-card dark:text-slate-400 dark:data-[state=active]:bg-surface-dark-card dark:data-[state=active]:text-brand-darkText"
        >
          <ClipboardList class="h-4 w-4 stroke-[2]" />
          <span>Kardex y Movimientos de Entrada/Salida</span>
          <span class="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {{ adjustments.length }}
          </span>
        </TabsTrigger>
      </TabsList>

      <!-- PESTAÑA 1: CATÁLOGO DE INSUMOS -->
      <TabsContent value="materials" class="space-y-4 focus:outline-none">
        <!-- Barra de Filtros y Chips -->
        <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
          <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <!-- Buscador -->
            <div class="relative w-full md:max-w-xs">
              <Search class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
              <input
                v-model="searchMaterial"
                type="text"
                placeholder="Buscar por nombre, código..."
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>

            <!-- Tira Horizontal de 5 Chips Táctiles -->
            <div class="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              <!-- Todos -->
              <button
                type="button"
                @click="selectedCategoryChip = 'ALL'"
                class="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
                :class="
                  selectedCategoryChip === 'ALL'
                    ? 'bg-brand-800 text-white shadow-sm dark:bg-brand-900'
                    : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
                "
              >
                <Boxes class="h-3.5 w-3.5 stroke-[2]" />
                <span>Todos ({{ chipCounts.all }})</span>
              </button>

              <!-- Materia Prima / Leche -->
              <button
                type="button"
                @click="selectedCategoryChip = 'DAIRY'"
                class="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
                :class="
                  selectedCategoryChip === 'DAIRY'
                    ? 'bg-brand-800 text-white shadow-sm dark:bg-brand-900'
                    : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
                "
              >
                <Milk class="h-3.5 w-3.5 stroke-[2]" />
                <span>Materia Prima / Leche ({{ chipCounts.dairy }})</span>
              </button>

              <!-- Envases y Tapas -->
              <button
                type="button"
                @click="selectedCategoryChip = 'PACKAGING'"
                class="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
                :class="
                  selectedCategoryChip === 'PACKAGING'
                    ? 'bg-brand-800 text-white shadow-sm dark:bg-brand-900'
                    : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
                "
              >
                <Layers class="h-3.5 w-3.5 stroke-[2]" />
                <span>Envases y Tapas ({{ chipCounts.packaging }})</span>
              </button>

              <!-- Frutas y Mermeladas -->
              <button
                type="button"
                @click="selectedCategoryChip = 'FRUIT'"
                class="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
                :class="
                  selectedCategoryChip === 'FRUIT'
                    ? 'bg-brand-800 text-white shadow-sm dark:bg-brand-900'
                    : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
                "
              >
                <Sparkles class="h-3.5 w-3.5 stroke-[2]" />
                <span>Frutas y Mermeladas ({{ chipCounts.fruit }})</span>
              </button>

              <!-- Stock Crítico -->
              <button
                type="button"
                @click="selectedCategoryChip = 'CRITICAL'"
                class="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
                :class="
                  selectedCategoryChip === 'CRITICAL'
                    ? 'bg-amber-600 text-white shadow-sm dark:bg-amber-600'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:hover:bg-amber-950/60'
                "
              >
                <AlertTriangle class="h-3.5 w-3.5 stroke-[2]" />
                <span>Stock Crítico ({{ chipCounts.critical }})</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Grilla de Tarjetas de Insumos -->
        <div v-auto-animate class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="mat in filteredMaterials"
            :key="mat.id"
            class="flex flex-col justify-between rounded-2xl border bg-surface-light-card p-5 shadow-card transition-all hover:border-slate-300 dark:bg-surface-dark-card dark:hover:border-slate-700"
            :class="
              mat.currentStock <= mat.minStockAlert
                ? 'border-amber-400/60 bg-amber-50/20 dark:border-amber-500/40 dark:bg-amber-950/10'
                : 'border-surface-light-border dark:border-surface-dark-border'
            "
          >
            <!-- Cabecera de la Tarjeta -->
            <div>
              <div class="flex items-start justify-between gap-2">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {{ mat.code }}
                    </span>
                    <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {{ mat.category }}
                    </span>
                  </div>
                  <h3 class="mt-1 text-base font-extrabold text-slate-900 dark:text-white">
                    {{ mat.name }}
                  </h3>
                </div>

                <!-- Badge de Alerta -->
                <span
                  v-if="mat.currentStock <= mat.minStockAlert"
                  class="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                >
                  <AlertTriangle class="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>Crítico</span>
                </span>
                <span
                  v-else
                  class="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                >
                  <CheckCircle2 class="h-3.5 w-3.5 stroke-[2]" />
                  <span>Normal</span>
                </span>
              </div>

              <!-- Nivel y Barra de Stock -->
              <div class="mt-4 rounded-xl border border-surface-light-border bg-surface-light-canvas p-3 dark:border-surface-dark-border dark:bg-surface-dark-canvas">
                <div class="flex items-baseline justify-between">
                  <span class="text-xs font-bold text-slate-500 dark:text-slate-400">Stock Actual</span>
                  <div class="flex items-baseline gap-1">
                    <span
                      class="text-2xl font-black"
                      :class="
                        mat.currentStock <= mat.minStockAlert
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-900 dark:text-white'
                      "
                    >
                      {{ formatStockQuantity(mat.currentStock, mat.unit) }}
                    </span>
                    <span class="text-xs font-extrabold text-slate-400">
                      {{ mat.unit }}
                    </span>
                  </div>
                </div>

                <!-- Barra visual de nivel -->
                <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    class="h-full rounded-full transition-all"
                    :class="
                      mat.currentStock <= mat.minStockAlert
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    "
                    :style="{
                      width: `${Math.min(100, Math.max(10, mat.minStockAlert > 0 ? (mat.currentStock / (mat.minStockAlert * 2)) * 100 : 100))}%`
                    }"
                  />
                </div>

                <div class="mt-2 flex items-center justify-between text-[11px] font-bold text-slate-400">
                  <span>Mínimo requerido:</span>
                  <span class="text-slate-600 dark:text-slate-300">
                    {{ formatStockQuantity(mat.minStockAlert, mat.unit) }} {{ mat.unit }}
                  </span>
                </div>
              </div>

              <!-- Costos y Valorización -->
              <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div class="rounded-xl border border-surface-light-border/60 bg-surface-light-canvas/60 p-2.5 dark:border-surface-dark-border/60 dark:bg-surface-dark-canvas/60">
                  <span class="block text-[10px] font-bold uppercase text-slate-400">Costo Promedio</span>
                  <span class="mt-0.5 block font-extrabold text-slate-700 dark:text-slate-200">
                    {{ formatCurrency(mat.avgCost) }}
                  </span>
                </div>

                <div class="rounded-xl border border-surface-light-border/60 bg-surface-light-canvas/60 p-2.5 dark:border-surface-dark-border/60 dark:bg-surface-dark-canvas/60">
                  <span class="block text-[10px] font-bold uppercase text-slate-400">Valor en Almacén</span>
                  <span class="mt-0.5 block font-extrabold text-slate-700 dark:text-slate-200">
                    {{ formatCurrency(mat.currentStock * mat.avgCost) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Botón de Acción -->
            <div class="mt-5 grid grid-cols-2 gap-2 border-t border-surface-light-border pt-4 dark:border-surface-dark-border">
              <button
                type="button"
                @click="openPurchaseModal(mat.id)"
                class="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-50 py-2 text-xs font-extrabold text-brand-800 transition-colors hover:bg-brand-100 dark:bg-brand-900/40 dark:text-brand-darkText dark:hover:bg-brand-900/60"
                title="Registrar compra de este insumo"
              >
                <Plus class="h-3.5 w-3.5 stroke-[2.5]" />
                <span>Comprar</span>
              </button>

              <button
                type="button"
                @click="openMovementModal(mat.id)"
                class="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-surface-light-border bg-surface-light-canvas py-2 text-xs font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100 dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-slate-200 dark:hover:bg-slate-800"
                title="Ajuste o regularización física de stock"
              >
                <ArrowUpDown class="h-3.5 w-3.5 stroke-[2]" />
                <span>Kardex</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Estado Vacío -->
        <div
          v-if="filteredMaterials.length === 0"
          class="rounded-2xl border border-surface-light-border bg-surface-light-card p-10 text-center shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card"
        >
          <Boxes class="mx-auto h-12 w-12 text-slate-400 stroke-[1.5]" />
          <h3 class="mt-3 text-base font-extrabold text-slate-900 dark:text-white">
            No se encontraron insumos
          </h3>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Intenta ajustando el filtro de categoría o el texto del buscador.
          </p>
        </div>
      </TabsContent>

      <!-- PESTAÑA 2: KARDEX Y MOVIMIENTOS -->
      <TabsContent value="kardex" class="space-y-4 focus:outline-none">
        <!-- Buscador de Kardex -->
        <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
          <div class="relative w-full max-w-sm">
            <Search class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
            <input
              v-model="searchKardex"
              type="text"
              placeholder="Buscar por motivo, insumo, responsable..."
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            />
          </div>
        </div>

        <!-- Listado Cronológico de Movimientos -->
        <div v-auto-animate class="space-y-3">
          <div
            v-for="adj in filteredAdjustments"
            :key="adj.id"
            class="flex flex-col gap-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card transition-all sm:flex-row sm:items-center sm:justify-between dark:border-surface-dark-border dark:bg-surface-dark-card"
          >
            <!-- Detalle Izquierdo con Ícono -->
            <div class="flex items-center gap-3">
              <div
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                :class="
                  adj.deltaQuantity >= 0
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                "
              >
                <ArrowUpRight v-if="adj.deltaQuantity >= 0" class="h-5 w-5 stroke-[2.5]" />
                <ArrowDownLeft v-else class="h-5 w-5 stroke-[2.5]" />
              </div>

              <div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-extrabold text-slate-900 dark:text-white">
                    {{ adj.rawMaterial?.name || 'Insumo' }}
                  </span>
                  <span
                    class="rounded-lg px-2 py-0.5 text-[10px] font-black uppercase"
                    :class="
                      adj.deltaQuantity >= 0
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                    "
                  >
                    {{ adj.deltaQuantity >= 0 ? 'Entrada' : 'Salida' }} ({{ adj.type }})
                  </span>
                </div>

                <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span class="flex items-center gap-1 font-semibold">
                    <Calendar class="h-3.5 w-3.5 stroke-[1.75]" />
                    {{ formatDate(adj.adjustmentDate || adj.createdAt || '') }}
                  </span>
                  <span v-if="adj.registeredBy" class="flex items-center gap-1 font-semibold">
                    <User class="h-3.5 w-3.5 stroke-[1.75]" />
                    {{ adj.registeredBy }}
                  </span>
                  <span v-if="adj.reason" class="font-medium text-slate-600 dark:text-slate-300">
                    Motivo: {{ adj.reason }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Detalle Derecho de Stock y Variación -->
            <div class="flex items-center justify-between border-t border-surface-light-border pt-2 sm:border-0 sm:pt-0 sm:text-right dark:border-surface-dark-border">
              <div>
                <span
                  class="block text-base font-black"
                  :class="adj.deltaQuantity >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
                >
                  {{ adj.deltaQuantity >= 0 ? '+' : '' }}{{ formatStockQuantity(adj.deltaQuantity, adj.unit) }} {{ adj.unit }}
                </span>
                <span class="block text-[11px] font-bold text-slate-400">
                  {{ formatStockQuantity(adj.previousStock, adj.unit) }} ➔ {{ formatStockQuantity(adj.newStock, adj.unit) }} {{ adj.unit }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Estado Vacío Kardex -->
        <div
          v-if="filteredAdjustments.length === 0"
          class="rounded-2xl border border-surface-light-border bg-surface-light-card p-10 text-center shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card"
        >
          <ClipboardList class="mx-auto h-12 w-12 text-slate-400 stroke-[1.5]" />
          <h3 class="mt-3 text-base font-extrabold text-slate-900 dark:text-white">
            Sin movimientos registrados
          </h3>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Registra una entrada o salida usando el botón "+ Movimiento de Kardex".
          </p>
        </div>
      </TabsContent>
    </TabsRoot>

    <!-- Modal de Movimiento de Kardex -->
    <InventoryMovementModal
      v-model:open="isMovementModalOpen"
      :materials="materialOptions"
      :preselected-material-id="preselectedMaterialId"
      @saved="handleMovementSaved"
    />

    <!-- Modal de Compra / Entrada de Stock -->
    <PurchaseStockModal
      v-model:open="isPurchaseModalOpen"
      :materials="materialOptions"
      :preselected-material-id="preselectedMaterialId"
      @saved="refreshAll"
    />
  </div>
</template>
