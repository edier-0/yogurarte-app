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
  Layers,
  Plus,
  Trash2,
  Power,
  X,
  Search,
  Loader2,
  CheckCircle2,
  PauseCircle,
  Edit3,
  Package,
  RotateCcw,
} from 'lucide-vue-next';
import { useProductionStore, type ProductPresentation } from '@/stores/production.store';
import { useConfirm } from '@/composables/useConfirm';
import { formatCurrency } from '@/utils/formatters';
import { http } from '@/api/client';

interface RawMaterialOption {
  id: number;
  name: string;
  unit: string;
  stock: number;
}

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
}>();

const productionStore = useProductionStore();
const { confirm } = useConfirm();

// Formulario reactivo
const isEditing = ref(false);
const editingId = ref<number | null>(null);
const formName = ref('');
const formLabel = ref('');
const formCapacity = ref<number | ''>(0.5);
const formPrice = ref<number | ''>(8000);
const formRawMaterialId = ref<number | null>(null);

const rawMaterials = ref<RawMaterialOption[]>([]);
const isLoadingMaterials = ref(false);
const searchQuery = ref('');
const isSubmitting = ref(false);
const actionInProgressId = ref<number | null>(null);

// Cargar presentaciones e insumos de envase al abrir el modal
watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      resetForm();
      searchQuery.value = '';
      await Promise.all([
        productionStore.fetchPresentations(),
        loadRawMaterials(),
      ]);
    }
  },
  { immediate: true }
);

async function loadRawMaterials() {
  isLoadingMaterials.value = true;
  try {
    const list = await http.get<RawMaterialOption[]>('/inventory/materials');
    rawMaterials.value = Array.isArray(list) ? list : [];
  } catch {
    rawMaterials.value = [];
  } finally {
    isLoadingMaterials.value = false;
  }
}

function resetForm() {
  isEditing.value = false;
  editingId.value = null;
  formName.value = '';
  formLabel.value = '';
  formCapacity.value = '';
  formPrice.value = '';
  formRawMaterialId.value = null;
}

function startEdit(pres: ProductPresentation) {
  isEditing.value = true;
  editingId.value = pres.id;
  formName.value = pres.name;
  formLabel.value = pres.label;
  formCapacity.value = pres.capacityLiters;
  formPrice.value = pres.defaultPrice;
  formRawMaterialId.value = pres.rawMaterialId ?? null;
}

const filteredPresentations = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return productionStore.presentations;
  return productionStore.presentations.filter(
    (p) => p.name.toLowerCase().includes(q) || p.label.toLowerCase().includes(q)
  );
});

const activeCount = computed(() => productionStore.presentations.filter((p) => p.isActive).length);
const totalCount = computed(() => productionStore.presentations.length);

async function handleSubmit() {
  if (isSubmitting.value) return;

  const capacity = Number(formCapacity.value);
  const price = Number(formPrice.value);

  if (isNaN(capacity) || capacity <= 0) return;
  if (isNaN(price) || price < 0) return;

  isSubmitting.value = true;
  try {
    if (isEditing.value && editingId.value) {
      await productionStore.updatePresentation(editingId.value, {
        label: formLabel.value.trim() || undefined,
        capacityLiters: capacity,
        defaultPrice: price,
        rawMaterialId: formRawMaterialId.value ? Number(formRawMaterialId.value) : null,
      });
      resetForm();
    } else {
      const name = formName.value.trim();
      if (!name) return;
      const label = formLabel.value.trim() || name;
      const created = await productionStore.createPresentation({
        name,
        label,
        capacityLiters: capacity,
        defaultPrice: price,
        rawMaterialId: formRawMaterialId.value ? Number(formRawMaterialId.value) : null,
      });
      if (created) {
        resetForm();
      }
    }
  } finally {
    isSubmitting.value = false;
  }
}

async function handleToggle(pres: ProductPresentation) {
  if (actionInProgressId.value !== null) return;
  actionInProgressId.value = pres.id;
  try {
    await productionStore.togglePresentation(pres.id);
  } finally {
    actionInProgressId.value = null;
  }
}

async function handleDelete(pres: ProductPresentation) {
  if (actionInProgressId.value !== null) return;
  const ok = await confirm({
    title: 'Eliminar Presentación',
    message: `¿Deseas eliminar la presentación "${pres.label || pres.name}"? Si no tiene registros vinculados en lotes o pedidos se eliminará definitivamente; si tiene historial, se desactivará automáticamente para preservar la trazabilidad.`,
    confirmText: 'Eliminar Presentación',
    cancelText: 'Cancelar',
    variant: 'danger',
  });
  if (!ok) return;

  actionInProgressId.value = pres.id;
  try {
    await productionStore.deletePresentation(pres.id);
  } finally {
    actionInProgressId.value = null;
  }
}

function handleClose() {
  emit('update:open', false);
}
</script>

<template>
  <DialogRoot :open="open" @update:open="(val: boolean) => emit('update:open', val)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity" />

      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-[95%] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-2xl transition-all focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-7 max-h-[90vh] flex flex-col"
      >
        <!-- Encabezado -->
        <div class="flex items-center justify-between border-b border-surface-light-border pb-4 dark:border-surface-dark-border">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <Layers class="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                Catálogo de Presentaciones
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {{ activeCount }} de {{ totalCount }} presentaciones activas en pedidos y envasado
              </DialogDescription>
            </div>
          </div>

          <button
            type="button"
            @click="handleClose"
            class="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Formulario: Crear o Editar Presentación -->
        <form @submit.prevent="handleSubmit" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700/80 dark:bg-slate-900/60">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-bold text-slate-700 dark:text-slate-300">
              {{ isEditing ? 'Editar Presentación' : 'Registrar Nueva Presentación' }}
            </span>
            <button
              v-if="isEditing"
              type="button"
              @click="resetForm"
              class="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              <RotateCcw class="h-3 w-3" />
              Cancelar edición
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Identificador (ej. 500ml, 1L, 250ml)
              </label>
              <input
                v-model="formName"
                type="text"
                placeholder="Identificador único..."
                :disabled="isEditing || isSubmitting"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:opacity-50"
                required
              />
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Etiqueta / Nombre Visible
              </label>
              <input
                v-model="formLabel"
                type="text"
                placeholder="ej. 500 ml (Medio Litro)..."
                :disabled="isSubmitting"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Capacidad en Litros
              </label>
              <input
                v-model="formCapacity"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="ej. 0.5"
                :disabled="isSubmitting"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Precio Sugerido ($ COP)
              </label>
              <input
                v-model="formPrice"
                type="number"
                step="100"
                min="0"
                placeholder="ej. 8000"
                :disabled="isSubmitting"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>

            <div class="sm:col-span-2">
              <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Insumo de Envase Asociado (Opcional para descontar inventario en Fase B)
              </label>
              <select
                v-model="formRawMaterialId"
                :disabled="isSubmitting"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option :value="null">-- Ninguno / Seleccionar manualmente al envasar --</option>
                <option v-for="mat in rawMaterials" :key="mat.id" :value="mat.id">
                  {{ mat.name }} (Stock: {{ mat.stock }} {{ mat.unit }})
                </option>
              </select>
            </div>
          </div>

          <div class="mt-3 flex justify-end">
            <button
              type="submit"
              :disabled="isSubmitting"
              class="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              <Loader2 v-if="isSubmitting" class="h-4 w-4 animate-spin" />
              <template v-else>
                <Plus v-if="!isEditing" class="h-4 w-4 stroke-[2.5]" />
                <Edit3 v-else class="h-4 w-4" />
                <span>{{ isEditing ? 'Guardar Cambios' : 'Agregar Presentación' }}</span>
              </template>
            </button>
          </div>
        </form>

        <!-- Barra de búsqueda rápida -->
        <div class="mt-3 relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Filtrar presentaciones..."
            class="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder-slate-500"
          />
        </div>

        <!-- Listado interactivo -->
        <div class="mt-3 flex-1 overflow-y-auto pr-1">
          <div v-if="productionStore.isLoadingPresentations" class="py-12 text-center">
            <Loader2 class="mx-auto h-6 w-6 animate-spin text-indigo-500" />
            <p class="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Cargando presentaciones...</p>
          </div>

          <div
            v-else-if="filteredPresentations.length === 0"
            class="py-10 text-center rounded-2xl border border-dashed border-surface-light-border dark:border-surface-dark-border"
          >
            <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">
              No se encontraron presentaciones coincidentes
            </p>
          </div>

          <ul v-else class="space-y-2.5">
            <li
              v-for="pres in filteredPresentations"
              :key="pres.id"
              class="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all dark:border-slate-700/80 dark:bg-slate-800/90 hover:border-indigo-300 dark:hover:border-indigo-500/40 gap-3"
            >
              <div class="flex items-start gap-3">
                <span
                  class="mt-1 flex h-3 w-3 shrink-0 rounded-full"
                  :class="pres.isActive ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-slate-400 dark:bg-slate-600'"
                />
                <div>
                  <div class="flex items-center gap-2">
                    <p class="font-bold text-sm text-slate-900 dark:text-white">
                      {{ pres.label || pres.name }}
                    </p>
                    <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {{ pres.capacityLiters }} L
                    </span>
                  </div>
                  <div class="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span class="font-bold text-indigo-600 dark:text-indigo-400">
                      {{ formatCurrency(pres.defaultPrice) }}
                    </span>
                    <span v-if="pres.rawMaterial" class="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                      <Package class="h-3 w-3 text-slate-400" />
                      {{ pres.rawMaterial.name }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2 self-end sm:self-center">
                <!-- Badge Estado -->
                <span
                  class="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold"
                  :class="
                    pres.isActive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20'
                  "
                >
                  <CheckCircle2 v-if="pres.isActive" class="h-3 w-3" />
                  <PauseCircle v-else class="h-3 w-3" />
                  {{ pres.isActive ? 'Activa' : 'Pausada' }}
                </span>

                <!-- Botón Editar -->
                <button
                  type="button"
                  @click="startEdit(pres)"
                  title="Editar presentación"
                  class="rounded-xl p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300 transition-colors"
                >
                  <Edit3 class="h-4 w-4" />
                </button>

                <!-- Botón Alternar Estado (Toggle) -->
                <button
                  type="button"
                  @click="handleToggle(pres)"
                  :disabled="actionInProgressId === pres.id"
                  :title="pres.isActive ? 'Pausar presentación' : 'Activar presentación'"
                  class="rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/70 dark:hover:text-white transition-colors disabled:opacity-40"
                >
                  <Loader2 v-if="actionInProgressId === pres.id" class="h-4 w-4 animate-spin" />
                  <Power v-else class="h-4 w-4" :class="pres.isActive ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'" />
                </button>

                <!-- Botón Eliminar -->
                <button
                  type="button"
                  @click="handleDelete(pres)"
                  :disabled="actionInProgressId === pres.id"
                  title="Eliminar presentación"
                  class="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 transition-colors disabled:opacity-40"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </li>
          </ul>
        </div>

        <!-- Footer informativo -->
        <div class="mt-3 pt-3 border-t border-surface-light-border dark:border-surface-dark-border text-center">
          <p class="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Las presentaciones activas se cargan automáticamente en pedidos, ventas y fraccionamiento de lotes.
          </p>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
