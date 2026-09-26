<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  BookOpen,
  Search,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Edit2,
  Trash2,
  Hash,
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';
import TemplateEditModal, { QuickReplyData } from './TemplateEditModal.vue';

export interface QuickReplyItem {
  id: number;
  shortcut: string;
  title: string;
  content: string;
  category: 'VENTAS' | 'PAGOS' | 'GENERAL' | 'INFO' | string;
  mediaUrl?: string | null;
}

const templates = ref<QuickReplyItem[]>([]);
const searchQuery = ref('');
const selectedCategory = ref<string>('ALL');
const isLoading = ref(false);

const isModalOpen = ref(false);
const templateToEdit = ref<QuickReplyData | null>(null);
const copiedId = ref<number | null>(null);

async function loadTemplates() {
  isLoading.value = true;
  try {
    const data = await http.get<QuickReplyItem[]>('/crm/quick-replies');
    if (Array.isArray(data)) {
      templates.value = data;
    }
  } catch (err: any) {
    toast.error('Error al cargar plantillas rápidas');
  } finally {
    isLoading.value = false;
  }
}

const filteredTemplates = computed(() => {
  let list = templates.value;

  if (selectedCategory.value !== 'ALL') {
    list = list.filter((t) => t.category === selectedCategory.value);
  }

  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    list = list.filter((t) => {
      const shortcut = (t.shortcut || '').toLowerCase();
      const title = (t.title || '').toLowerCase();
      const content = (t.content || '').toLowerCase();
      return shortcut.includes(q) || title.includes(q) || content.includes(q);
    });
  }

  return list;
});

function handleOpenCreate() {
  templateToEdit.value = null;
  isModalOpen.value = true;
}

function handleOpenEdit(template: QuickReplyItem) {
  templateToEdit.value = { ...template };
  isModalOpen.value = true;
}

async function handleDelete(template: QuickReplyItem) {
  const confirmed = window.confirm(
    `¿Estás seguro de eliminar la plantilla "${template.title}" (${template.shortcut})?`
  );
  if (!confirmed) return;

  try {
    await http.delete(`/crm/quick-replies/${template.id}`);
    toast.success('Plantilla eliminada exitosamente');
    await loadTemplates();
  } catch (err: any) {
    toast.error(err?.response?.data?.error || 'No se pudo eliminar la plantilla');
  }
}

async function handleCopy(template: QuickReplyItem) {
  try {
    await navigator.clipboard.writeText(template.content);
    copiedId.value = template.id;
    toast.success(`Plantilla "${template.shortcut}" copiada`);
    setTimeout(() => {
      if (copiedId.value === template.id) {
        copiedId.value = null;
      }
    }, 2000);
  } catch {
    toast.error('No se pudo copiar al portapapeles');
  }
}

onMounted(() => {
  loadTemplates();
});
</script>

<template>
  <div class="space-y-5">
    <!-- Barra Superior: Buscador, Categorías y Crear Plantilla -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto flex-1">
        <div class="relative w-full sm:w-80">
          <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 stroke-[2]" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar por atajo, título o contenido..."
            class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
          />
        </div>

        <!-- Chips de Categoría -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:none]">
          <button
            type="button"
            @click="selectedCategory = 'ALL'"
            class="shrink-0 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
            :class="
              selectedCategory === 'ALL'
                ? 'bg-brand-800 text-white shadow-xs dark:bg-brand-900'
                : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
            "
          >
            Todas ({{ templates.length }})
          </button>
          <button
            type="button"
            @click="selectedCategory = 'VENTAS'"
            class="shrink-0 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
            :class="
              selectedCategory === 'VENTAS'
                ? 'bg-brand-800 text-white shadow-xs dark:bg-brand-900'
                : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
            "
          >
            Ventas
          </button>
          <button
            type="button"
            @click="selectedCategory = 'PAGOS'"
            class="shrink-0 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
            :class="
              selectedCategory === 'PAGOS'
                ? 'bg-brand-800 text-white shadow-xs dark:bg-brand-900'
                : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
            "
          >
            Pagos
          </button>
          <button
            type="button"
            @click="selectedCategory = 'GENERAL'"
            class="shrink-0 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
            :class="
              selectedCategory === 'GENERAL'
                ? 'bg-brand-800 text-white shadow-xs dark:bg-brand-900'
                : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
            "
          >
            General
          </button>
          <button
            type="button"
            @click="selectedCategory = 'INFO'"
            class="shrink-0 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
            :class="
              selectedCategory === 'INFO'
                ? 'bg-brand-800 text-white shadow-xs dark:bg-brand-900'
                : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
            "
          >
            Información
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2 self-end sm:self-auto shrink-0">
        <button
          type="button"
          @click="loadTemplates"
          :disabled="isLoading"
          class="inline-flex items-center justify-center rounded-xl border border-surface-light-border bg-surface-light-card p-2 text-slate-600 shadow-xs hover:bg-slate-50 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800"
          title="Refrescar"
        >
          <RefreshCw class="h-4 w-4 stroke-[2]" :class="{ 'animate-spin': isLoading }" />
        </button>

        <button
          type="button"
          @click="handleOpenCreate"
          class="inline-flex items-center gap-1.5 rounded-xl bg-hero-gradient px-4 py-2 text-xs font-extrabold text-white shadow-xs transition-transform active:scale-95"
        >
          <Plus class="h-4 w-4 stroke-[2.5]" />
          <span>Nueva Plantilla</span>
        </button>
      </div>
    </div>

    <!-- Estado de Carga -->
    <div v-if="isLoading" class="py-16 text-center text-xs font-semibold text-slate-400">
      <RefreshCw class="mx-auto h-6 w-6 animate-spin mb-2 text-slate-400" />
      Cargando plantillas institucionales...
    </div>

    <!-- Estado Vacío -->
    <div
      v-else-if="filteredTemplates.length === 0"
      class="rounded-3xl border border-surface-light-border bg-surface-light-card p-12 text-center text-slate-400 dark:border-surface-dark-border dark:bg-surface-dark-card"
    >
      <BookOpen class="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-2 stroke-[1.5]" />
      <h3 class="text-sm font-extrabold text-slate-700 dark:text-slate-300">No hay plantillas disponibles</h3>
      <p class="text-xs text-slate-400 mt-1">Crea tu primera respuesta rápida con atajo y variables automáticas.</p>
      <button
        type="button"
        @click="handleOpenCreate"
        class="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-hero-gradient px-4 py-2 text-xs font-extrabold text-white shadow-xs"
      >
        <Plus class="h-4 w-4 stroke-[2.5]" />
        <span>Crear Plantilla</span>
      </button>
    </div>

    <!-- Grid de Plantillas -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="tpl in filteredTemplates"
        :key="tpl.id"
        class="rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card transition-all hover:shadow-md dark:border-surface-dark-border dark:bg-surface-dark-card flex flex-col justify-between"
      >
        <div>
          <!-- Cabecera de la Tarjeta -->
          <div class="flex items-start justify-between gap-2">
            <div>
              <span class="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-0.5 text-xs font-black text-brand-800 dark:bg-brand-950/40 dark:text-brand-darkText border border-brand-200 dark:border-brand-800">
                <Hash class="h-3 w-3 stroke-[2.5]" />
                <span>{{ tpl.shortcut }}</span>
              </span>
              <h4 class="mt-2 text-sm font-extrabold text-slate-900 dark:text-white">
                {{ tpl.title }}
              </h4>
            </div>

            <!-- Badge de Categoría -->
            <span
              class="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold"
              :class="
                tpl.category === 'VENTAS'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : tpl.category === 'PAGOS'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                  : tpl.category === 'INFO'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                  : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
              "
            >
              {{ tpl.category }}
            </span>
          </div>

          <!-- Contenido del Mensaje con Resaltado de Variables -->
          <div class="mt-3.5 rounded-xl bg-surface-light-canvas p-3 border border-surface-light-border/70 dark:bg-surface-dark-canvas dark:border-surface-dark-border/70">
            <p class="text-xs whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
              {{ tpl.content }}
            </p>
          </div>
        </div>

        <!-- Acciones Inferiores -->
        <div class="mt-4 pt-3 border-t border-surface-light-border dark:border-surface-dark-border flex items-center justify-between">
          <button
            type="button"
            @click="handleCopy(tpl)"
            class="inline-flex items-center gap-1.5 rounded-xl border border-surface-light-border bg-surface-light-card px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            title="Copiar texto"
          >
            <Check v-if="copiedId === tpl.id" class="h-3.5 w-3.5 text-emerald-600" />
            <Copy v-else class="h-3.5 w-3.5" />
            <span>{{ copiedId === tpl.id ? 'Copiado' : 'Copiar' }}</span>
          </button>

          <div class="flex items-center gap-1">
            <button
              type="button"
              @click="handleOpenEdit(tpl)"
              class="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              title="Editar plantilla"
            >
              <Edit2 class="h-4 w-4" />
            </button>
            <button
              type="button"
              @click="handleDelete(tpl)"
              class="rounded-xl p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 transition-colors"
              title="Eliminar plantilla"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para Crear / Editar Plantilla -->
    <TemplateEditModal
      v-model:open="isModalOpen"
      :reply-to-edit="templateToEdit"
      @saved="loadTemplates"
    />
  </div>
</template>
