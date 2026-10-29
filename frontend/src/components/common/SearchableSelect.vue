<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { Search, ChevronDown, X, Check, Package } from 'lucide-vue-next';
import { onClickOutside } from '@vueuse/core';
import { filterSelectOptions, SelectOption } from '@/utils/searchUtils';
import { formatStockQuantity } from '@/utils/formatters';

const props = withDefaults(
  defineProps<{
    modelValue?: number | string | null;
    options: SelectOption[];
    placeholder?: string;
    label?: string;
    disabled?: boolean;
    required?: boolean;
    clearable?: boolean;
    error?: string;
    id?: string;
  }>(),
  {
    modelValue: null,
    placeholder: 'Buscar o seleccionar insumo...',
    disabled: false,
    required: false,
    clearable: true,
    error: '',
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', val: number | string | null): void;
  (e: 'change', option: SelectOption | null): void;
}>();

const containerRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);

const isOpen = ref(false);
const searchQuery = ref('');
const highlightedIndex = ref(-1);

// Opción actualmente seleccionada según modelValue
const selectedOption = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined || props.modelValue === '') {
    return null;
  }
  return props.options.find((o) => String(o.id) === String(props.modelValue)) || null;
});

// Opciones filtradas en tiempo real
const filteredOptions = computed(() => {
  return filterSelectOptions(props.options, searchQuery.value);
});

// Sincronizar texto cuando cambia la opción seleccionada externamente
watch(
  () => selectedOption.value,
  (opt) => {
    if (!isOpen.value) {
      searchQuery.value = opt ? opt.name : '';
    }
  },
  { immediate: true }
);

// Cerrar al hacer clic afuera
onClickOutside(containerRef, () => {
  closeDropdown();
});

function openDropdown() {
  if (props.disabled) return;
  isOpen.value = true;
  highlightedIndex.value = -1;
  // Si ya hay opción seleccionada, dejar el query para que el usuario pueda ver o limpiar
  if (selectedOption.value) {
    searchQuery.value = '';
  }
  nextTick(() => {
    inputRef.value?.focus();
  });
}

function closeDropdown() {
  isOpen.value = false;
  highlightedIndex.value = -1;
  // Restaurar el texto del input al nombre de la opción seleccionada
  searchQuery.value = selectedOption.value ? selectedOption.value.name : '';
}

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement;
  searchQuery.value = target.value;
  if (!isOpen.value) {
    isOpen.value = true;
  }
  highlightedIndex.value = 0;
}

function selectOption(opt: SelectOption) {
  if (opt.disabled) return;
  emit('update:modelValue', opt.id);
  emit('change', opt);
  searchQuery.value = opt.name;
  isOpen.value = false;
  highlightedIndex.value = -1;
}

function handleClear(e?: MouseEvent) {
  if (e) e.stopPropagation();
  emit('update:modelValue', null);
  emit('change', null);
  searchQuery.value = '';
  highlightedIndex.value = -1;
  if (isOpen.value) {
    inputRef.value?.focus();
  }
}

// Navegación por teclado
function handleKeyDown(e: KeyboardEvent) {
  if (props.disabled) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (!isOpen.value) {
      openDropdown();
      return;
    }
    if (filteredOptions.value.length === 0) return;
    highlightedIndex.value =
      highlightedIndex.value < filteredOptions.value.length - 1 ? highlightedIndex.value + 1 : 0;
    scrollHighlightedIntoView();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (!isOpen.value) {
      openDropdown();
      return;
    }
    if (filteredOptions.value.length === 0) return;
    highlightedIndex.value =
      highlightedIndex.value > 0 ? highlightedIndex.value - 1 : filteredOptions.value.length - 1;
    scrollHighlightedIntoView();
  } else if (e.key === 'Enter') {
    if (isOpen.value && highlightedIndex.value >= 0 && highlightedIndex.value < filteredOptions.value.length) {
      e.preventDefault();
      selectOption(filteredOptions.value[highlightedIndex.value]);
    }
  } else if (e.key === 'Escape') {
    closeDropdown();
  } else if (e.key === 'Tab') {
    closeDropdown();
  }
}

function scrollHighlightedIntoView() {
  nextTick(() => {
    const el = containerRef.value?.querySelector(`[data-index="${highlightedIndex.value}"]`);
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  });
}
</script>

<template>
  <div ref="containerRef" class="relative w-full">
    <!-- Label opcional -->
    <label
      v-if="label"
      :for="id"
      class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
    >
      {{ label }}
      <span v-if="required" class="text-rose-500">*</span>
    </label>

    <!-- Contenedor del Input -->
    <div
      class="relative flex items-center rounded-xl border transition-colors"
      :class="[
        disabled
          ? 'bg-slate-100 opacity-60 dark:bg-slate-800/40 cursor-not-allowed'
          : 'bg-surface-light-canvas dark:bg-surface-dark-canvas cursor-text',
        error
          ? 'border-rose-400 focus-within:border-rose-600'
          : isOpen
          ? 'border-brand-800 ring-1 ring-brand-800 dark:border-brand-500'
          : 'border-surface-light-border dark:border-surface-dark-border hover:border-slate-400 dark:hover:border-slate-500',
      ]"
      @click="openDropdown"
    >
      <!-- Icono de Búsqueda -->
      <Search class="ml-3 h-4 w-4 shrink-0 text-slate-400 stroke-[2]" />

      <!-- Input de Texto Predictivo -->
      <input
        ref="inputRef"
        :id="id"
        type="text"
        :value="isOpen ? searchQuery : (selectedOption ? selectedOption.name : '')"
        :placeholder="selectedOption ? selectedOption.name : placeholder"
        :disabled="disabled"
        :required="required && !modelValue"
        autocomplete="off"
        @focus="openDropdown"
        @input="handleInput"
        @keydown="handleKeyDown"
        class="w-full bg-transparent px-2.5 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
      />

      <!-- Botón de Limpiar Selección -->
      <button
        v-if="clearable && selectedOption && !disabled"
        type="button"
        @click.stop="handleClear"
        title="Limpiar selección"
        class="mr-1 rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
      >
        <X class="h-3.5 w-3.5 stroke-[2.5]" />
      </button>

      <!-- Flecha Desplegable -->
      <button
        type="button"
        tabindex="-1"
        @click.stop="isOpen ? closeDropdown() : openDropdown()"
        class="mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
      >
        <ChevronDown
          class="h-4 w-4 transition-transform duration-200"
          :class="{ 'rotate-180': isOpen }"
        />
      </button>
    </div>

    <!-- Mensaje de Error -->
    <p v-if="error" class="mt-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
      {{ error }}
    </p>

    <!-- Dropdown Flotante de Resultados -->
    <div
      v-if="isOpen"
      class="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-2xl border border-surface-light-border bg-surface-light-card p-1.5 shadow-xl transition-all dark:border-surface-dark-border dark:bg-surface-dark-card touch-pan-y overscroll-contain"
    >
      <!-- Sin resultados -->
      <div
        v-if="filteredOptions.length === 0"
        class="flex flex-col items-center justify-center p-4 text-center text-xs text-slate-400 dark:text-slate-500"
      >
        <Package class="h-6 w-6 stroke-[1.5] mb-1 opacity-50" />
        <span>No se encontraron insumos que coincidan con "{{ searchQuery }}"</span>
      </div>

      <!-- Lista de Opciones -->
      <div
        v-for="(opt, idx) in filteredOptions"
        :key="opt.id"
        :data-index="idx"
        @mousedown.prevent="selectOption(opt)"
        class="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-xs transition-colors cursor-pointer"
        :class="[
          opt.disabled
            ? 'opacity-40 cursor-not-allowed'
            : highlightedIndex === idx
            ? 'bg-brand-50 text-brand-900 dark:bg-brand-950/60 dark:text-brand-darkText font-bold'
            : String(opt.id) === String(modelValue)
            ? 'bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-900 dark:text-white'
            : 'text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/50',
        ]"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="truncate font-extrabold">{{ opt.name }}</span>
            <span
              v-if="opt.code"
              class="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            >
              {{ opt.code }}
            </span>
          </div>
          <div v-if="opt.category || opt.extraInfo" class="mt-0.5 text-[10px] text-slate-400 truncate">
            {{ opt.category }} {{ opt.extraInfo ? `· ${opt.extraInfo}` : '' }}
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <!-- Badge de Stock si está disponible -->
          <span
            v-if="opt.stock !== undefined"
            class="rounded-full px-2 py-0.5 text-[10px] font-black"
            :class="
              opt.stock > 0
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            "
          >
            {{ formatStockQuantity(opt.stock, opt.unit || '') }} {{ opt.unit || '' }}
          </span>

          <!-- Check si es la opción seleccionada -->
          <Check
            v-if="String(opt.id) === String(modelValue)"
            class="h-4 w-4 text-brand-800 dark:text-brand-darkText stroke-[2.5]"
          />
        </div>
      </div>
    </div>
  </div>
</template>
