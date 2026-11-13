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
  Sliders,
  Zap,
  RotateCcw,
  ToggleLeft,
  ToggleRight,
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';
import { useAuthStore } from '@/stores/auth.store';
import TemplateEditModal, { QuickReplyData } from './TemplateEditModal.vue';
import SystemTemplateEditModal from './SystemTemplateEditModal.vue';

export interface QuickReplyItem {
  id: number;
  shortcut: string;
  title: string;
  content: string;
  category: 'VENTAS' | 'PAGOS' | 'GENERAL' | 'INFO' | string;
  mediaUrl?: string | null;
}

export interface SystemTemplateItem {
  id: number;
  code: string;
  title: string;
  category: 'PEDIDOS' | 'DOMICILIOS' | 'CARTERA' | 'FIDELIZACION';
  description: string;
  content: string;
  defaultContent: string;
  availableVariables: string[];
  autoTrigger: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const authStore = useAuthStore();

// Sub-pestañas: 'SYSTEM' (Plantillas del Sistema) vs 'QUICK' (Respuestas Rápidas)
const activeSubTab = ref<'SYSTEM' | 'QUICK'>('SYSTEM');

// ==========================================
// ESTADO: PLANTILLAS DEL SISTEMA (Spec 014)
// ==========================================
const systemTemplates = ref<SystemTemplateItem[]>([]);
const systemSearchQuery = ref('');
const selectedSystemCategory = ref<string>('ALL');
const isLoadingSystem = ref(false);
const isSystemModalOpen = ref(false);
const systemTemplateToEdit = ref<SystemTemplateItem | null>(null);
const copiedSystemId = ref<number | null>(null);

// Catálogo de plantillas con disparo asistido por evento operativo
const OPERATIONAL_TEMPLATE_CODES = new Set([
  'DELIVERY_IN_ROUTE_SHORT',
  'DELIVERY_IN_ROUTE_FULL',
  'DELIVERED_PAID',
  'DELIVERED_UNPAID',
  'PAID_NOT_DELIVERED',
]);

async function loadSystemTemplates() {
  isLoadingSystem.value = true;
  try {
    const data = await http.get<SystemTemplateItem[]>('/crm/system-templates');
    if (Array.isArray(data)) {
      systemTemplates.value = data;
    }
  } catch (err: any) {
    toast.error('Error al cargar plantillas del sistema');
  } finally {
    isLoadingSystem.value = false;
  }
}

const filteredSystemTemplates = computed(() => {
  let list = systemTemplates.value;

  if (selectedSystemCategory.value !== 'ALL') {
    list = list.filter((t) => t.category === selectedSystemCategory.value);
  }

  const q = systemSearchQuery.value.trim().toLowerCase();
  if (q) {
    list = list.filter((t) => {
      const code = (t.code || '').toLowerCase();
      const title = (t.title || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      const content = (t.content || '').toLowerCase();
      return code.includes(q) || title.includes(q) || desc.includes(q) || content.includes(q);
    });
  }

  return list;
});

function handleOpenEditSystem(template: SystemTemplateItem) {
  systemTemplateToEdit.value = { ...template };
  isSystemModalOpen.value = true;
}

function handleSystemSaved(updated: SystemTemplateItem) {
  const index = systemTemplates.value.findIndex((t) => t.id === updated.id);
  if (index !== -1) {
    systemTemplates.value[index] = updated;
  }
}

async function handleToggleAutoTrigger(tpl: SystemTemplateItem) {
  if (!authStore.isAdmin) {
    toast.error('Solo los administradores pueden cambiar la configuración de disparo asistido');
    return;
  }

  const previous = tpl.autoTrigger;
  const nextVal = !previous;
  tpl.autoTrigger = nextVal;

  try {
    await http.put(`/crm/system-templates/${tpl.id}`, {
      content: tpl.content,
      autoTrigger: nextVal,
    });
    toast.success(`Disparo asistido ${nextVal ? 'activado' : 'desactivado'} para "${tpl.title}"`);
  } catch (err: any) {
    tpl.autoTrigger = previous;
    toast.error(err?.response?.data?.error || 'No se pudo actualizar el disparo asistido');
  }
}

async function handleResetSystemTemplate(tpl: SystemTemplateItem) {
  if (!authStore.isAdmin) return;
  const confirmed = window.confirm(
    `¿Deseas restablecer la plantilla "${tpl.title}" a su contenido original de fábrica?\nSe perderán las modificaciones personalizadas.`
  );
  if (!confirmed) return;

  try {
    const res = await http.post<SystemTemplateItem>(`/crm/system-templates/${tpl.id}/reset`);
    tpl.content = res.content;
    toast.success(`Plantilla "${tpl.title}" restablecida a valores de fábrica`);
  } catch (err: any) {
    toast.error('No se pudo restablecer la plantilla');
  }
}

async function handleCopySystemContent(template: SystemTemplateItem) {
  try {
    await navigator.clipboard.writeText(template.content);
    copiedSystemId.value = template.id;
    toast.success(`Contenido de "${template.title}" copiado`);
    setTimeout(() => {
      if (copiedSystemId.value === template.id) {
        copiedSystemId.value = null;
      }
    }, 2000);
  } catch {
    toast.error('No se pudo copiar al portapapeles');
  }
}

// ==========================================
// ESTADO: RESPUESTAS RÁPIDAS (Atajos de Chat)
// ==========================================
const quickTemplates = ref<QuickReplyItem[]>([]);
const quickSearchQuery = ref('');
const selectedQuickCategory = ref<string>('ALL');
const isLoadingQuick = ref(false);
const isQuickModalOpen = ref(false);
const quickTemplateToEdit = ref<QuickReplyData | null>(null);
const copiedQuickId = ref<number | null>(null);

async function loadQuickTemplates() {
  isLoadingQuick.value = true;
  try {
    const data = await http.get<QuickReplyItem[]>('/crm/quick-replies');
    if (Array.isArray(data)) {
      quickTemplates.value = data;
    }
  } catch (err: any) {
    toast.error('Error al cargar respuestas rápidas');
  } finally {
    isLoadingQuick.value = false;
  }
}

const filteredQuickTemplates = computed(() => {
  let list = quickTemplates.value;

  if (selectedQuickCategory.value !== 'ALL') {
    list = list.filter((t) => t.category === selectedQuickCategory.value);
  }

  const q = quickSearchQuery.value.trim().toLowerCase();
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

function handleOpenCreateQuick() {
  quickTemplateToEdit.value = null;
  isQuickModalOpen.value = true;
}

function handleOpenEditQuick(template: QuickReplyItem) {
  quickTemplateToEdit.value = { ...template };
  isQuickModalOpen.value = true;
}

async function handleDeleteQuick(template: QuickReplyItem) {
  const confirmed = window.confirm(
    `¿Estás seguro de eliminar la respuesta rápida "${template.title}" (${template.shortcut})?`
  );
  if (!confirmed) return;

  try {
    await http.delete(`/crm/quick-replies/${template.id}`);
    toast.success('Respuesta rápida eliminada exitosamente');
    await loadQuickTemplates();
  } catch (err: any) {
    toast.error(err?.response?.data?.error || 'No se pudo eliminar');
  }
}

async function handleCopyQuickContent(template: QuickReplyItem) {
  try {
    await navigator.clipboard.writeText(template.content);
    copiedQuickId.value = template.id;
    toast.success(`Respuesta "${template.shortcut}" copiada`);
    setTimeout(() => {
      if (copiedQuickId.value === template.id) {
        copiedQuickId.value = null;
      }
    }, 2000);
  } catch {
    toast.error('No se pudo copiar al portapapeles');
  }
}

onMounted(() => {
  loadSystemTemplates();
  loadQuickTemplates();
});
</script>

<template>
  <div class="space-y-6">
    <!-- ========================================== -->
    <!-- SELECTOR DE SUB-PESTAÑAS (Spec 014, RF-3)  -->
    <!-- ========================================== -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-surface-light-border pb-4 dark:border-surface-dark-border">
      <div class="flex items-center gap-1.5 p-1 bg-surface-light-canvas dark:bg-surface-dark-canvas rounded-2xl border border-surface-light-border dark:border-surface-dark-border shadow-xs">
        <button
          type="button"
          @click="activeSubTab = 'SYSTEM'"
          class="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all"
          :class="
            activeSubTab === 'SYSTEM'
              ? 'bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
          "
        >
          <Sliders class="h-4 w-4 stroke-[2]" />
          <span>Plantillas del Sistema</span>
          <span
            class="rounded-full px-1.5 py-0.2 text-[10px] font-bold"
            :class="activeSubTab === 'SYSTEM' ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'"
          >
            {{ systemTemplates.length }}
          </span>
        </button>

        <button
          type="button"
          @click="activeSubTab = 'QUICK'"
          class="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all"
          :class="
            activeSubTab === 'QUICK'
              ? 'bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
          "
        >
          <Zap class="h-4 w-4 stroke-[2]" />
          <span>Respuestas Rápidas (Chat)</span>
          <span
            class="rounded-full px-1.5 py-0.2 text-[10px] font-bold"
            :class="activeSubTab === 'QUICK' ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'"
          >
            {{ quickTemplates.length }}
          </span>
        </button>
      </div>

      <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">
        {{
          activeSubTab === 'SYSTEM'
            ? 'Mensajes institucionales enviados automáticamente o por botón en pedidos y entregas.'
            : 'Atajos tipo /sabores o /precios para autocompletar en el chat del CRM.'
        }}
      </p>
    </div>

    <!-- ========================================== -->
    <!-- SUB-PESTAÑA 1: PLANTILLAS DEL SISTEMA      -->
    <!-- ========================================== -->
    <div v-if="activeSubTab === 'SYSTEM'" class="space-y-5">
      <!-- Barra Superior: Buscador, Categorías y Refrescar -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto flex-1">
          <div class="relative w-full sm:w-80">
            <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 stroke-[2]" />
            <input
              v-model="systemSearchQuery"
              type="text"
              placeholder="Buscar por código, título o texto..."
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            />
          </div>

          <!-- Filtro por Categorías -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:none]">
            <button
              type="button"
              @click="selectedSystemCategory = 'ALL'"
              class="shrink-0 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
              :class="
                selectedSystemCategory === 'ALL'
                  ? 'bg-brand-800 text-white shadow-xs dark:bg-brand-900'
                  : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
              "
            >
              Todas ({{ systemTemplates.length }})
            </button>
            <button
              type="button"
              @click="selectedSystemCategory = 'PEDIDOS'"
              class="shrink-0 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
              :class="
                selectedSystemCategory === 'PEDIDOS'
                  ? 'bg-brand-800 text-white shadow-xs dark:bg-brand-900'
                  : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
              "
            >
              Pedidos
            </button>
            <button
              type="button"
              @click="selectedSystemCategory = 'DOMICILIOS'"
              class="shrink-0 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
              :class="
                selectedSystemCategory === 'DOMICILIOS'
                  ? 'bg-brand-800 text-white shadow-xs dark:bg-brand-900'
                  : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
              "
            >
              Domicilios
            </button>
            <button
              type="button"
              @click="selectedSystemCategory = 'CARTERA'"
              class="shrink-0 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
              :class="
                selectedSystemCategory === 'CARTERA'
                  ? 'bg-brand-800 text-white shadow-xs dark:bg-brand-900'
                  : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
              "
            >
              Cartera
            </button>
            <button
              type="button"
              @click="selectedSystemCategory = 'FIDELIZACION'"
              class="shrink-0 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
              :class="
                selectedSystemCategory === 'FIDELIZACION'
                  ? 'bg-brand-800 text-white shadow-xs dark:bg-brand-900'
                  : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
              "
            >
              Fidelización
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            type="button"
            @click="loadSystemTemplates"
            :disabled="isLoadingSystem"
            class="inline-flex items-center justify-center rounded-xl border border-surface-light-border bg-surface-light-card p-2 text-slate-600 shadow-xs hover:bg-slate-50 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800"
            title="Refrescar plantillas"
          >
            <RefreshCw class="h-4 w-4 stroke-[2]" :class="{ 'animate-spin': isLoadingSystem }" />
          </button>
        </div>
      </div>

      <!-- Estado de Carga -->
      <div v-if="isLoadingSystem" class="py-16 text-center text-xs font-semibold text-slate-400">
        <RefreshCw class="mx-auto h-6 w-6 animate-spin mb-2 text-slate-400" />
        Cargando plantillas canónicas de WhatsApp...
      </div>

      <!-- Grid de Tarjetas de Plantillas del Sistema (RF-4) -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="tpl in filteredSystemTemplates"
          :key="tpl.id"
          class="rounded-3xl border border-surface-light-border bg-surface-light-card p-5 shadow-card transition-all hover:shadow-md dark:border-surface-dark-border dark:bg-surface-dark-card flex flex-col justify-between"
        >
          <div>
            <!-- Cabecera de la Tarjeta: Badge de Categoría + Código -->
            <div class="flex items-start justify-between gap-2">
              <span
                class="rounded-lg px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border"
                :class="
                  tpl.category === 'PEDIDOS'
                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                    : tpl.category === 'DOMICILIOS'
                    ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                    : tpl.category === 'CARTERA'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                "
              >
                {{ tpl.category }}
              </span>

              <span class="font-mono text-[10px] text-slate-400">
                #{{ tpl.code }}
              </span>
            </div>

            <!-- Título y Descripción Funcional -->
            <h4 class="mt-2.5 text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
              {{ tpl.title }}
            </h4>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              {{ tpl.description }}
            </p>

            <!-- Previsualización del Contenido -->
            <div class="mt-3.5 rounded-2xl bg-surface-light-canvas p-3.5 border border-surface-light-border/70 dark:bg-surface-dark-canvas dark:border-surface-dark-border/70 max-h-48 overflow-y-auto">
              <p class="text-xs whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                {{ tpl.content }}
              </p>
            </div>

            <!-- Interruptor Disparo Asistido (autoTrigger) -->
            <div class="mt-4 pt-3 border-t border-surface-light-border dark:border-surface-dark-border flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Disparo asistido
                </span>
                <span
                  v-if="!OPERATIONAL_TEMPLATE_CODES.has(tpl.code)"
                  class="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  title="Esta plantilla se invoca exclusivamente mediante clic manual en el botón de WhatsApp"
                >
                  Manual (clic)
                </span>
              </div>

              <!-- Switch para plantillas operativas -->
              <button
                v-if="OPERATIONAL_TEMPLATE_CODES.has(tpl.code)"
                type="button"
                @click="handleToggleAutoTrigger(tpl)"
                class="inline-flex items-center gap-1.5 text-xs font-black transition-colors"
                :class="tpl.autoTrigger ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'"
                :title="tpl.autoTrigger ? 'Desactivar apertura automática del modal' : 'Activar apertura automática del modal tras el evento'"
              >
                <ToggleRight v-if="tpl.autoTrigger" class="h-6 w-6 text-emerald-600 fill-emerald-600/20" />
                <ToggleLeft v-else class="h-6 w-6 text-slate-400" />
                <span class="text-[11px]">{{ tpl.autoTrigger ? 'Automático' : 'Manual' }}</span>
              </button>

              <!-- Indicador inactivo para manuales -->
              <span v-else class="text-[11px] font-medium text-slate-400">
                Por demanda
              </span>
            </div>
          </div>

          <!-- Acciones Inferiores: Copiar, Modificar y Restablecer -->
          <div class="mt-4 pt-3 border-t border-surface-light-border dark:border-surface-dark-border flex items-center justify-between">
            <button
              type="button"
              @click="handleCopySystemContent(tpl)"
              class="inline-flex items-center gap-1.5 rounded-xl border border-surface-light-border bg-surface-light-card px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              title="Copiar texto de la plantilla"
            >
              <Check v-if="copiedSystemId === tpl.id" class="h-3.5 w-3.5 text-emerald-600" />
              <Copy v-else class="h-3.5 w-3.5" />
              <span>{{ copiedSystemId === tpl.id ? 'Copiado' : 'Copiar' }}</span>
            </button>

            <div class="flex items-center gap-1.5">
              <!-- Botón Restablecer (si fue modificada) -->
              <button
                v-if="authStore.isAdmin && tpl.content.trim() !== tpl.defaultContent.trim()"
                type="button"
                @click="handleResetSystemTemplate(tpl)"
                class="rounded-xl p-1.5 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40 transition-colors"
                title="Restablecer plantilla al texto original de fábrica"
              >
                <RotateCcw class="h-4 w-4" />
              </button>

              <!-- Botón Editar / Modificar -->
              <button
                type="button"
                @click="handleOpenEditSystem(tpl)"
                class="inline-flex items-center gap-1.5 rounded-xl bg-hero-gradient px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:opacity-95 transition-opacity active:scale-95"
              >
                <Edit2 class="h-3.5 w-3.5" />
                <span>Modificar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- SUB-PESTAÑA 2: RESPUESTAS RÁPIDAS (Atajos) -->
    <!-- ========================================== -->
    <div v-else-if="activeSubTab === 'QUICK'" class="space-y-5">
      <!-- Barra Superior: Buscador, Categorías y Crear Plantilla -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto flex-1">
          <div class="relative w-full sm:w-80">
            <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 stroke-[2]" />
            <input
              v-model="quickSearchQuery"
              type="text"
              placeholder="Buscar por atajo, título o contenido..."
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            />
          </div>

          <!-- Chips de Categoría -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:none]">
            <button
              type="button"
              @click="selectedQuickCategory = 'ALL'"
              class="shrink-0 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
              :class="
                selectedQuickCategory === 'ALL'
                  ? 'bg-brand-800 text-white shadow-xs dark:bg-brand-900'
                  : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
              "
            >
              Todas ({{ quickTemplates.length }})
            </button>
            <button
              type="button"
              @click="selectedQuickCategory = 'VENTAS'"
              class="shrink-0 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
              :class="
                selectedQuickCategory === 'VENTAS'
                  ? 'bg-brand-800 text-white shadow-xs dark:bg-brand-900'
                  : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
              "
            >
              Ventas
            </button>
            <button
              type="button"
              @click="selectedQuickCategory = 'PAGOS'"
              class="shrink-0 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
              :class="
                selectedQuickCategory === 'PAGOS'
                  ? 'bg-brand-800 text-white shadow-xs dark:bg-brand-900'
                  : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
              "
            >
              Pagos
            </button>
            <button
              type="button"
              @click="selectedQuickCategory = 'GENERAL'"
              class="shrink-0 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
              :class="
                selectedQuickCategory === 'GENERAL'
                  ? 'bg-brand-800 text-white shadow-xs dark:bg-brand-900'
                  : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
              "
            >
              General
            </button>
            <button
              type="button"
              @click="selectedQuickCategory = 'INFO'"
              class="shrink-0 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
              :class="
                selectedQuickCategory === 'INFO'
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
            @click="loadQuickTemplates"
            :disabled="isLoadingQuick"
            class="inline-flex items-center justify-center rounded-xl border border-surface-light-border bg-surface-light-card p-2 text-slate-600 shadow-xs hover:bg-slate-50 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800"
            title="Refrescar"
          >
            <RefreshCw class="h-4 w-4 stroke-[2]" :class="{ 'animate-spin': isLoadingQuick }" />
          </button>

          <button
            type="button"
            @click="handleOpenCreateQuick"
            class="inline-flex items-center gap-1.5 rounded-xl bg-hero-gradient px-4 py-2 text-xs font-extrabold text-white shadow-xs transition-transform active:scale-95"
          >
            <Plus class="h-4 w-4 stroke-[2.5]" />
            <span>Nueva Respuesta</span>
          </button>
        </div>
      </div>

      <!-- Estado de Carga -->
      <div v-if="isLoadingQuick" class="py-16 text-center text-xs font-semibold text-slate-400">
        <RefreshCw class="mx-auto h-6 w-6 animate-spin mb-2 text-slate-400" />
        Cargando respuestas rápidas...
      </div>

      <!-- Estado Vacío -->
      <div
        v-else-if="filteredQuickTemplates.length === 0"
        class="rounded-3xl border border-surface-light-border bg-surface-light-card p-12 text-center text-slate-400 dark:border-surface-dark-border dark:bg-surface-dark-card"
      >
        <BookOpen class="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-2 stroke-[1.5]" />
        <h3 class="text-sm font-extrabold text-slate-700 dark:text-slate-300">No hay respuestas rápidas disponibles</h3>
        <p class="text-xs text-slate-400 mt-1">Crea atajos de chat (ej: /sabores, /precios) para respuestas instantáneas.</p>
        <button
          type="button"
          @click="handleOpenCreateQuick"
          class="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-hero-gradient px-4 py-2 text-xs font-extrabold text-white shadow-xs"
        >
          <Plus class="h-4 w-4 stroke-[2.5]" />
          <span>Crear Respuesta Rápida</span>
        </button>
      </div>

      <!-- Grid de Respuestas Rápidas -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="tpl in filteredQuickTemplates"
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

            <!-- Contenido del Mensaje -->
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
              @click="handleCopyQuickContent(tpl)"
              class="inline-flex items-center gap-1.5 rounded-xl border border-surface-light-border bg-surface-light-card px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              title="Copiar texto"
            >
              <Check v-if="copiedQuickId === tpl.id" class="h-3.5 w-3.5 text-emerald-600" />
              <Copy v-else class="h-3.5 w-3.5" />
              <span>{{ copiedQuickId === tpl.id ? 'Copiado' : 'Copiar' }}</span>
            </button>

            <div class="flex items-center gap-1">
              <button
                type="button"
                @click="handleOpenEditQuick(tpl)"
                class="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                title="Editar respuesta rápida"
              >
                <Edit2 class="h-4 w-4" />
              </button>
              <button
                type="button"
                @click="handleDeleteQuick(tpl)"
                class="rounded-xl p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 transition-colors"
                title="Eliminar respuesta rápida"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para Modificar Plantilla del Sistema (Spec 014) -->
    <SystemTemplateEditModal
      v-model:open="isSystemModalOpen"
      :template-to-edit="systemTemplateToEdit"
      @saved="handleSystemSaved"
    />

    <!-- Modal para Crear / Editar Respuesta Rápida -->
    <TemplateEditModal
      v-model:open="isQuickModalOpen"
      :reply-to-edit="quickTemplateToEdit"
      @saved="loadQuickTemplates"
    />
  </div>
</template>
