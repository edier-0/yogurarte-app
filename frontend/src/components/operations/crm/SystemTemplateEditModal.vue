<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from 'reka-ui';
import {
  X,
  Save,
  RotateCcw,
  Sliders,
  Check,
  Info,
  Sparkles,
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';
import { useAuthStore } from '@/stores/auth.store';
import type { SystemTemplateItem } from './TemplatesTab.vue';

const props = defineProps<{
  open: boolean;
  templateToEdit: SystemTemplateItem | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'saved', updated: SystemTemplateItem): void;
}>();

const authStore = useAuthStore();
const content = ref('');
const isSaving = ref(false);
const isResetting = ref(false);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

// Mock determinista para previsualización en vivo (RF-8)
const MOCK_PREVIEW_DATA: Record<string, string> = {
  cliente: 'Carlos Mendoza',
  pedido: 'PED-1024',
  estado: '🥣 En preparación',
  productos: '• 2x 1L (Fresa) - $24.000 COP\n• 1x 500ml (Maracuyá) - $8.000 COP',
  total: '$32.000 COP',
  saldo_pendiente: '$10.000 COP',
  abono: '$22.000 COP',
  direccion: 'Calle 15 # 12-34, Fonseca',
  nequi: '3024581882',
  banco: 'Nequi / Bancolombia',
  instagram: 'https://www.instagram.com/yogurartesanalfonseca',
  botellas_acumuladas: '8.5',
  botellas_restantes: '1.5',
  premios_disponibles: '1',
};

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.templateToEdit) {
      content.value = props.templateToEdit.content || '';
    }
  }
);

// Previsualización interpolada en tiempo real
const previewText = computed(() => {
  if (!content.value) return '';
  return content.value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(MOCK_PREVIEW_DATA, key)) {
      return MOCK_PREVIEW_DATA[key];
    }
    return match;
  });
});

const isModifiedFromDefault = computed(() => {
  if (!props.templateToEdit) return false;
  return content.value.trim() !== props.templateToEdit.defaultContent.trim();
});

// Inserción de variable en la posición del cursor
function insertVariable(varName: string) {
  const token = `{{${varName}}}`;
  const textarea = textareaRef.value;
  if (!textarea) {
    content.value += token;
    return;
  }

  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || 0;
  const current = content.value;

  content.value = current.substring(0, start) + token + current.substring(end);

  // Reposicionar el cursor tras la inserción
  setTimeout(() => {
    textarea.focus();
    const newPos = start + token.length;
    textarea.setSelectionRange(newPos, newPos);
  }, 0);
}

// Guardar cambios
async function handleSave() {
  if (!props.templateToEdit) return;
  if (!content.value.trim()) {
    toast.error('El contenido de la plantilla no puede estar vacío');
    return;
  }

  isSaving.value = true;
  try {
    const updated = await http.put<SystemTemplateItem>(
      `/crm/system-templates/${props.templateToEdit.id}`,
      {
        content: content.value.trim(),
      }
    );
    toast.success('Plantilla actualizada exitosamente');
    emit('saved', updated);
    emit('update:open', false);
  } catch (err: any) {
    toast.error(err?.response?.data?.error || 'No se pudo guardar la plantilla');
  } finally {
    isSaving.value = false;
  }
}

// Restablecer a fábrica (RF-11, RF-12)
async function handleResetToDefault() {
  if (!props.templateToEdit) return;
  const confirmed = window.confirm(
    `¿Deseas descartar todas las modificaciones y restablecer la plantilla "${props.templateToEdit.title}" a su contenido original de fábrica?`
  );
  if (!confirmed) return;

  isResetting.value = true;
  try {
    const reset = await http.post<SystemTemplateItem>(
      `/crm/system-templates/${props.templateToEdit.id}/reset`
    );
    content.value = reset.content;
    toast.success('Plantilla restablecida a valores de fábrica');
    emit('saved', reset);
  } catch (err: any) {
    toast.error(err?.response?.data?.error || 'No se pudo restablecer la plantilla');
  } finally {
    isResetting.value = false;
  }
}
</script>

<template>
  <DialogRoot :open="open" @update:open="(val: boolean) => emit('update:open', val)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-4xl h-[90vh] max-h-[780px] rounded-3xl border border-surface-light-border bg-surface-light-card shadow-2xl flex flex-col overflow-hidden focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card"
      >
        <!-- ==================================================== -->
        <!-- CAPA 1: CABECERA FIJA (Art. 10 Constitución)         -->
        <!-- ==================================================== -->
        <div class="shrink-0 flex items-center justify-between border-b border-surface-light-border px-6 py-4 dark:border-surface-dark-border bg-surface-light-card dark:bg-surface-dark-card">
          <div class="flex items-center gap-3 min-w-0">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-800 dark:bg-brand-950/50 dark:text-brand-darkText">
              <Sliders class="h-5 w-5 stroke-[2]" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <DialogTitle class="text-base font-extrabold text-slate-900 truncate dark:text-white">
                  {{ templateToEdit?.title || 'Editar Plantilla del Sistema' }}
                </DialogTitle>
                <span class="rounded-md bg-brand-100/70 px-2 py-0.5 text-[10px] font-black uppercase text-brand-900 dark:bg-brand-950 dark:text-brand-darkText">
                  {{ templateToEdit?.code }}
                </span>
              </div>
              <DialogDescription class="text-xs text-slate-500 dark:text-slate-400 truncate">
                Personaliza el mensaje y variables automáticas para este evento de WhatsApp.
              </DialogDescription>
            </div>
          </div>

          <button
            type="button"
            @click="emit('update:open', false)"
            class="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- ==================================================== -->
        <!-- CAPA 2: CUERPO SCROLLABLE (Art. 10 Constitución)     -->
        <!-- ==================================================== -->
        <div class="flex-1 min-h-0 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Columna Izquierda: Editor y Variables (7 cols en desktop) -->
          <div class="lg:col-span-7 flex flex-col space-y-4">
            <!-- Cuadro de Explicación Funcional -->
            <div class="rounded-2xl border border-blue-200/60 bg-blue-50/60 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/20 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
              <Info class="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <div>
                <p class="font-bold">¿Cuándo se envía este mensaje?</p>
                <p class="mt-0.5 text-[11px] leading-relaxed text-blue-800/90 dark:text-blue-300/90">
                  {{ templateToEdit?.description }}
                </p>
              </div>
            </div>

            <!-- Chips de Variables Compatibles -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles class="h-3.5 w-3.5 text-amber-500" />
                  <span>Variables disponibles (clic para insertar)</span>
                </label>
                <span class="text-[10px] text-slate-400">Inserta en posición del cursor</span>
              </div>
              <div class="flex flex-wrap gap-1.5 p-2 rounded-xl bg-surface-light-canvas dark:bg-surface-dark-canvas border border-surface-light-border dark:border-surface-dark-border max-h-36 overflow-y-auto">
                <button
                  v-for="v in templateToEdit?.availableVariables || []"
                  :key="v"
                  type="button"
                  @click="insertVariable(v)"
                  class="inline-flex items-center gap-1 rounded-lg bg-surface-light-card px-2 py-1 text-[11px] font-bold text-brand-800 border border-brand-200/80 hover:bg-brand-50 hover:border-brand-300 dark:bg-surface-dark-card dark:text-brand-darkText dark:border-brand-800 dark:hover:bg-brand-950/50 transition-all active:scale-95 shadow-2xs"
                  :title="`Insertar {{${v}}}`"
                >
                  <span class="text-slate-400 font-mono">{{ '{' }}</span>
                  <span>{{ v }}</span>
                  <span class="text-slate-400 font-mono">{{ '}' }}</span>
                </button>
              </div>
            </div>

            <!-- Editor de Texto -->
            <div class="flex-1 flex flex-col min-h-[220px]">
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Texto del Mensaje
                </label>
                <span class="text-[10px] text-slate-400">
                  {{ content.length }} caracteres
                </span>
              </div>
              <textarea
                ref="textareaRef"
                v-model="content"
                rows="9"
                placeholder="Escribe el texto de la plantilla..."
                class="w-full flex-1 rounded-2xl border border-surface-light-border bg-surface-light-card p-3.5 text-xs font-mono font-medium leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-white resize-none"
              ></textarea>
              <p class="mt-1.5 text-[10px] text-slate-400">
                Tip: Puedes usar formato de WhatsApp: *negrita*, _cursiva_, ~tachado~.
              </p>
            </div>
          </div>

          <!-- Columna Derecha: Previsualización en Vivo WhatsApp (5 cols en desktop) -->
          <div class="lg:col-span-5 flex flex-col">
            <label class="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
              <span>Previsualización en vivo</span>
              <span class="text-[10px] font-normal text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check class="h-3 w-3" /> Datos de ejemplo
              </span>
            </label>

            <!-- Teléfono / Chat Mock estilo WhatsApp -->
            <div class="flex-1 rounded-2xl bg-[#E5DDD5] dark:bg-[#0B141A] p-4 flex flex-col justify-end border border-slate-300 dark:border-slate-800 min-h-[320px] shadow-inner relative overflow-hidden">
              <!-- Fondo con patrón sutil de WhatsApp -->
              <div class="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none bg-repeat" style="background-image: radial-gradient(#000 1px, transparent 1px); background-size: 16px 16px;"></div>

              <!-- Globo de Mensaje Saliente (Verde WhatsApp) -->
              <div class="relative z-10 max-w-[92%] self-end rounded-2xl rounded-tr-xs bg-[#E7FFDB] dark:bg-[#005C4B] p-3 shadow-md text-slate-900 dark:text-slate-100">
                <p class="text-xs whitespace-pre-line leading-relaxed font-sans select-text">
                  {{ previewText || 'Escribe tu mensaje para verlo aquí...' }}
                </p>
                <div class="mt-1 flex items-center justify-end gap-1 text-[9px] text-slate-500 dark:text-slate-300">
                  <span>10:30 a. m.</span>
                  <span class="text-sky-500 font-bold">✓✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ==================================================== -->
        <!-- CAPA 3: PIE FIJO DE ACCIONES (Art. 10 Constitución)   -->
        <!-- ==================================================== -->
        <div class="shrink-0 flex items-center justify-between border-t border-surface-light-border px-6 py-4 dark:border-surface-dark-border bg-surface-light-card dark:bg-surface-dark-card">
          <!-- Acción Izquierda: Restablecer a Valores de Fábrica (RF-11, RF-12) -->
          <div>
            <button
              v-if="authStore.isAdmin"
              type="button"
              @click="handleResetToDefault"
              :disabled="isResetting || !isModifiedFromDefault"
              class="inline-flex items-center gap-1.5 rounded-xl border border-surface-light-border bg-surface-light-canvas px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              title="Descarta las modificaciones y restaura el texto original"
            >
              <RotateCcw class="h-3.5 w-3.5" :class="{ 'animate-spin': isResetting }" />
              <span>Restablecer plantilla original</span>
            </button>
          </div>

          <!-- Acciones Derecha: Cancelar y Guardar -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="emit('update:open', false)"
              class="rounded-xl border border-surface-light-border bg-surface-light-card px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              @click="handleSave"
              :disabled="!content.trim() || isSaving"
              class="inline-flex items-center gap-1.5 rounded-xl bg-hero-gradient px-4 py-2 text-xs font-extrabold text-white shadow-xs transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save class="h-4 w-4 stroke-[2]" :class="{ 'animate-spin': isSaving }" />
              <span>{{ isSaving ? 'Guardando...' : 'Guardar Cambios' }}</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
