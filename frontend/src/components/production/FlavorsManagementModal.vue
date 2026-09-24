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
  Sparkles,
  Plus,
  Trash2,
  Power,
  X,
  Search,
  Loader2,
  CheckCircle2,
  PauseCircle,
} from 'lucide-vue-next';
import { useProductionStore, type ProductFlavor } from '@/stores/production.store';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
}>();

const productionStore = useProductionStore();

const newFlavorName = ref('');
const searchQuery = ref('');
const isSubmitting = ref(false);
const actionInProgressId = ref<number | null>(null);

// Cargar sabores al abrir el modal
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      newFlavorName.value = '';
      searchQuery.value = '';
      productionStore.fetchFlavors();
    }
  },
  { immediate: true }
);

// Filtrado de sabores en el modal
const filteredFlavors = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return productionStore.flavors;
  return productionStore.flavors.filter((f) => f.name.toLowerCase().includes(q));
});

const activeCount = computed(() => productionStore.flavors.filter((f) => f.isActive).length);
const totalCount = computed(() => productionStore.flavors.length);

async function handleAddFlavor() {
  const name = newFlavorName.value.trim();
  if (!name || isSubmitting.value) return;

  isSubmitting.value = true;
  try {
    const created = await productionStore.createFlavor(name);
    if (created) {
      newFlavorName.value = '';
    }
  } finally {
    isSubmitting.value = false;
  }
}

async function handleToggle(flavor: ProductFlavor) {
  if (actionInProgressId.value !== null) return;
  actionInProgressId.value = flavor.id;
  try {
    await productionStore.toggleFlavor(flavor.id);
  } finally {
    actionInProgressId.value = null;
  }
}

async function handleDelete(flavor: ProductFlavor) {
  if (actionInProgressId.value !== null) return;
  if (!window.confirm(`¿Confirmas la eliminación o desactivación del sabor "${flavor.name}"?`)) return;

  actionInProgressId.value = flavor.id;
  try {
    await productionStore.deleteFlavor(flavor.id);
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
        class="fixed left-1/2 top-1/2 z-50 w-[95%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-2xl transition-all focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-7 max-h-[90vh] flex flex-col"
      >
        <!-- Encabezado -->
        <div class="flex items-center justify-between border-b border-surface-light-border pb-4 dark:border-surface-dark-border">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
              <Sparkles class="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                Catálogo de Sabores
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {{ activeCount }} de {{ totalCount }} sabores activos en producción y ventas
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

        <!-- Formulario: Registrar nuevo sabor -->
        <form @submit.prevent="handleAddFlavor" class="mt-4 flex gap-2">
          <input
            v-model="newFlavorName"
            type="text"
            placeholder="Nuevo sabor (ej. Café Mocaccino, Arequipe Coco)..."
            maxlength="50"
            :disabled="isSubmitting"
            class="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 placeholder-slate-400 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-white dark:placeholder-slate-500"
          />
          <button
            type="submit"
            :disabled="!newFlavorName.trim() || isSubmitting"
            class="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Loader2 v-if="isSubmitting" class="h-4 w-4 animate-spin" />
            <Plus v-else class="h-4 w-4 stroke-[2.5]" />
            <span>Agregar</span>
          </button>
        </form>

        <!-- Barra de búsqueda rápida -->
        <div class="mt-3 relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Filtrar sabores existentes..."
            class="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-purple-500 focus:outline-none dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder-slate-500"
          />
        </div>

        <!-- Listado interactivo con v-auto-animate -->
        <div class="mt-4 flex-1 overflow-y-auto pr-1">
          <div v-if="productionStore.isLoadingFlavors" class="py-12 text-center">
            <Loader2 class="mx-auto h-6 w-6 animate-spin text-purple-500" />
            <p class="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Cargando sabores...</p>
          </div>

          <div
            v-else-if="filteredFlavors.length === 0"
            class="py-10 text-center rounded-2xl border border-dashed border-surface-light-border dark:border-surface-dark-border"
          >
            <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">
              No se encontraron sabores coincidentes
            </p>
          </div>

          <ul v-else v-auto-animate class="space-y-2.5">
            <li
              v-for="flavor in filteredFlavors"
              :key="flavor.id"
              class="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all dark:border-slate-700/80 dark:bg-slate-800/90 hover:border-purple-300 dark:hover:border-purple-500/40"
            >
              <div class="flex items-center gap-3">
                <span
                  class="flex h-3 w-3 rounded-full"
                  :class="flavor.isActive ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-slate-400 dark:bg-slate-600'"
                />
                <div>
                  <p class="font-bold text-base text-slate-900 dark:text-white">
                    {{ flavor.name }}
                  </p>
                  <p class="text-xs text-slate-500 dark:text-slate-400">
                    {{ flavor.isActive ? 'Disponible en selección' : 'En pausa' }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <!-- Badge Estado -->
                <span
                  class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold"
                  :class="
                    flavor.isActive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20'
                  "
                >
                  <CheckCircle2 v-if="flavor.isActive" class="h-3.5 w-3.5" />
                  <PauseCircle v-else class="h-3.5 w-3.5" />
                  {{ flavor.isActive ? 'Activo' : 'Inactivo' }}
                </span>

                <!-- Botón Alternar Estado (Toggle) -->
                <button
                  type="button"
                  @click="handleToggle(flavor)"
                  :disabled="actionInProgressId === flavor.id"
                  :title="flavor.isActive ? 'Pausar sabor' : 'Activar sabor'"
                  class="rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/70 dark:hover:text-white transition-colors disabled:opacity-40"
                >
                  <Loader2 v-if="actionInProgressId === flavor.id" class="h-4 w-4 animate-spin" />
                  <Power v-else class="h-4 w-4" :class="flavor.isActive ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'" />
                </button>

                <!-- Botón Eliminar / Desactivar -->
                <button
                  type="button"
                  @click="handleDelete(flavor)"
                  :disabled="actionInProgressId === flavor.id"
                  title="Eliminar sabor del catálogo"
                  class="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 transition-colors disabled:opacity-40"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </li>
          </ul>
        </div>

        <!-- Footer informativo -->
        <div class="mt-4 pt-3 border-t border-surface-light-border dark:border-surface-dark-border text-center">
          <p class="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Los sabores activos estarán disponibles inmediatamente en creación de lotes y pre-ventas.
          </p>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
