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
  X,
  FileText,
  Save,
  Tag,
  Hash,
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';

export interface QuickReplyData {
  id?: number;
  shortcut: string;
  title: string;
  category: 'VENTAS' | 'PAGOS' | 'GENERAL' | 'INFO' | string;
  content: string;
  mediaUrl?: string | null;
}

const props = defineProps<{
  open: boolean;
  replyToEdit?: QuickReplyData | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'saved'): void;
}>();

const form = ref<QuickReplyData>({
  shortcut: '',
  title: '',
  category: 'VENTAS',
  content: '',
});

const isSaving = ref(false);
const contentTextarea = ref<HTMLTextAreaElement | null>(null);

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      if (props.replyToEdit) {
        form.value = {
          id: props.replyToEdit.id,
          shortcut: props.replyToEdit.shortcut || '',
          title: props.replyToEdit.title || '',
          category: props.replyToEdit.category || 'VENTAS',
          content: props.replyToEdit.content || '',
          mediaUrl: props.replyToEdit.mediaUrl || null,
        };
      } else {
        form.value = {
          shortcut: '/',
          title: '',
          category: 'VENTAS',
          content: '',
          mediaUrl: null,
        };
      }
    }
  }
);

function insertVariable(variableKey: string) {
  const el = contentTextarea.value;
  if (!el) {
    form.value.content += `{{${variableKey}}}`;
    return;
  }

  const start = el.selectionStart || form.value.content.length;
  const end = el.selectionEnd || form.value.content.length;
  const text = form.value.content;
  const insertion = `{{${variableKey}}}`;

  form.value.content = text.substring(0, start) + insertion + text.substring(end);

  setTimeout(() => {
    el.focus();
    el.selectionStart = el.selectionEnd = start + insertion.length;
  }, 0);
}

async function handleSave() {
  if (!form.value.shortcut.trim()) {
    toast.error('El atajo es obligatorio (ej: /bienvenida)');
    return;
  }
  if (!form.value.title.trim()) {
    toast.error('El título de la plantilla es obligatorio');
    return;
  }
  if (!form.value.content.trim()) {
    toast.error('El contenido de la plantilla no puede estar vacío');
    return;
  }

  // Asegurar formato de atajo comenzando con /
  let shortcutFormatted = form.value.shortcut.trim();
  if (!shortcutFormatted.startsWith('/')) {
    shortcutFormatted = `/${shortcutFormatted}`;
  }

  isSaving.value = true;
  try {
    const payload = {
      shortcut: shortcutFormatted,
      title: form.value.title.trim(),
      category: form.value.category,
      content: form.value.content.trim(),
    };

    if (form.value.id) {
      await http.put(`/crm/quick-replies/${form.value.id}`, payload);
      toast.success('Plantilla actualizada exitosamente');
    } else {
      await http.post('/crm/quick-replies', payload);
      toast.success('Plantilla creada exitosamente');
    }

    emit('saved');
    emit('update:open', false);
  } catch (err: any) {
    toast.error(err?.response?.data?.error || 'Error al guardar la plantilla');
  } finally {
    isSaving.value = false;
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
        <div class="flex items-center justify-between border-b border-surface-light-border pb-4 dark:border-surface-dark-border">
          <div class="flex items-center gap-2.5">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-darkText">
              <FileText class="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                {{ form.id ? 'Editar Plantilla Rápida' : 'Nueva Plantilla Rápida' }}
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Respuesta institucional predefinida con variables automáticas
              </DialogDescription>
            </div>
          </div>

          <button
            type="button"
            @click="emit('update:open', false)"
            class="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <form @submit.prevent="handleSave" class="mt-5 space-y-4">
          <!-- Atajo y Categoría -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Atajo de Teclado
              </label>
              <div class="relative">
                <Hash class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  v-model="form.shortcut"
                  type="text"
                  placeholder="/bienvenida"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2 pl-9 pr-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                  required
                />
              </div>
              <p class="text-[10px] text-slate-400 mt-0.5">Ej: /sabores, /pago, /saldo</p>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Categoría
              </label>
              <div class="relative">
                <Tag class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <select
                  v-model="form.category"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2 pl-9 pr-3 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                >
                  <option value="VENTAS">Ventas</option>
                  <option value="PAGOS">Pagos</option>
                  <option value="GENERAL">General</option>
                  <option value="INFO">Información</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Título -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Título Descriptivo
            </label>
            <input
              v-model="form.title"
              type="text"
              placeholder="Catálogo de Sabores y Precios"
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2 px-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              required
            />
          </div>

          <!-- Contenido y Variables -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Texto del Mensaje
              </label>
              <span class="text-[10px] font-bold text-slate-400">
                {{ form.content.length }} caracteres
              </span>
            </div>

            <!-- Chips de Variables Dinámicas -->
            <div class="mb-2 flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2 border border-surface-light-border dark:border-surface-dark-border">
              <span class="text-[10px] font-extrabold text-slate-500 uppercase mr-1">Insertar:</span>
              <button
                type="button"
                @click="insertVariable('cliente')"
                class="rounded-lg bg-surface-light-card px-2 py-1 text-[11px] font-bold text-brand-800 border border-brand-200 hover:bg-brand-50 dark:bg-surface-dark-card dark:text-brand-darkText dark:border-brand-800 dark:hover:bg-brand-950/40 transition-colors"
                title="Inserta el nombre del cliente activo"
              >
                + {{ '{' + '{' }}cliente{{ '}' + '}' }}
              </button>
              <button
                type="button"
                @click="insertVariable('total')"
                class="rounded-lg bg-surface-light-card px-2 py-1 text-[11px] font-bold text-brand-800 border border-brand-200 hover:bg-brand-50 dark:bg-surface-dark-card dark:text-brand-darkText dark:border-brand-800 dark:hover:bg-brand-950/40 transition-colors"
                title="Inserta el total o saldo del pedido"
              >
                + {{ '{' + '{' }}total{{ '}' + '}' }}
              </button>
              <button
                type="button"
                @click="insertVariable('sabores')"
                class="rounded-lg bg-surface-light-card px-2 py-1 text-[11px] font-bold text-brand-800 border border-brand-200 hover:bg-brand-50 dark:bg-surface-dark-card dark:text-brand-darkText dark:border-brand-800 dark:hover:bg-brand-950/40 transition-colors"
                title="Inserta la lista de sabores del día"
              >
                + {{ '{' + '{' }}sabores{{ '}' + '}' }}
              </button>
            </div>

            <textarea
              ref="contentTextarea"
              v-model="form.content"
              rows="5"
              placeholder="Escribe el mensaje institucional..."
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas p-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white leading-relaxed"
              required
            ></textarea>
          </div>

          <!-- Botones de Acción -->
          <div class="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-surface-light-border dark:border-surface-dark-border">
            <button
              type="button"
              @click="emit('update:open', false)"
              class="rounded-xl border border-surface-light-border bg-surface-light-card px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isSaving"
              class="inline-flex items-center gap-1.5 rounded-xl bg-hero-gradient px-4 py-2 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95 disabled:opacity-50"
            >
              <Save class="h-3.5 w-3.5" :class="{ 'animate-pulse': isSaving }" />
              <span>{{ isSaving ? 'Guardando...' : 'Guardar Plantilla' }}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
