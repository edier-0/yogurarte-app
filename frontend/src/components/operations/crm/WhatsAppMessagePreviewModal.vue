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
  MessageSquare,
  Send,
  X,
  User,
  Phone,
  Radio,
  ExternalLink,
  CheckCheck,
  Edit3,
  Sparkles,
} from 'lucide-vue-next';
import { useCrmStore } from '@/stores/crm.store';

const crmStore = useCrmStore();

const editableText = ref('');
const isSubmitting = ref(false);

watch(
  () => crmStore.messagePreview.isOpen,
  (isOpen) => {
    if (isOpen) {
      editableText.value = crmStore.messagePreview.text || '';
      isSubmitting.value = false;
    }
  }
);

const characterCount = computed(() => editableText.value.length);
const lineCount = computed(() => (editableText.value ? editableText.value.split('\n').length : 0));

const currentTime = computed(() => {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
});

function handleClose() {
  crmStore.closeMessagePreview();
}

async function handleConfirm() {
  if (!editableText.value.trim()) return;
  isSubmitting.value = true;
  try {
    await crmStore.confirmAndSendPreview(editableText.value.trim());
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <DialogRoot :open="crmStore.messagePreview.isOpen" @update:open="(val: boolean) => !val && handleClose()">
    <DialogPortal to="body">
      <DialogOverlay class="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm transition-opacity" />

      <DialogContent
        class="fixed left-1/2 top-1/2 z-[9999] w-[95%] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl transition-all focus:outline-none dark:border-slate-800 dark:bg-slate-900 sm:p-6 max-h-[90vh] flex flex-col"
      >
        <!-- Header del Modal -->
        <div class="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
              <MessageSquare class="h-5 w-5" />
            </div>
            <div>
              <DialogTitle class="text-base font-black tracking-tight text-slate-900 dark:text-white sm:text-lg">
                {{ crmStore.messagePreview.title || 'Previsualización de Mensaje' }}
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Edit3 class="h-3.5 w-3.5 text-slate-400" />
                <span>Revisa y ajusta el contenido antes de despachar a WhatsApp</span>
              </DialogDescription>
            </div>
          </div>

          <button
            type="button"
            @click="handleClose"
            class="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            title="Cerrar"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Contenido Desplazable -->
        <div class="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          <!-- Tarjeta de Destinatario y Estado del Canal -->
          <div class="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <div class="h-9 w-9 rounded-xl bg-white dark:bg-slate-700 shadow-xs flex items-center justify-center text-slate-600 dark:text-slate-300">
                <User class="h-4 w-4" />
              </div>
              <div>
                <p class="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  {{ crmStore.messagePreview.contactName || 'Destinatario sin nombre' }}
                </p>
                <p class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Phone class="h-3 w-3" />
                  <span>{{ crmStore.messagePreview.phone || 'Sin número' }}</span>
                </p>
              </div>
            </div>

            <!-- Canal de Envío (Baileys vs Externo) -->
            <div>
              <span
                v-if="crmStore.isWhatsAppConnected"
                class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/20"
              >
                <span class="relative flex h-2 w-2">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Radio class="h-3 w-3" />
                <span>Envío Directo (Baileys)</span>
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-500/20"
              >
                <ExternalLink class="h-3 w-3" />
                <span>WhatsApp Web / Enlace</span>
              </span>
            </div>
          </div>

          <!-- Editor de Texto -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <label for="preview-message-input">Mensaje editable:</label>
              <span class="text-[11px] font-medium text-slate-400">
                {{ characterCount }} caracteres • {{ lineCount }} líneas
              </span>
            </div>
            <textarea
              id="preview-message-input"
              v-model="editableText"
              rows="6"
              class="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs sm:text-sm font-medium leading-relaxed text-slate-900 transition-all focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:bg-slate-800"
              placeholder="Escribe o edita el mensaje a enviar..."
            ></textarea>
          </div>

          <!-- Previsualización en Vivo estilo WhatsApp -->
          <div class="space-y-1.5">
            <p class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles class="h-3.5 w-3.5 text-emerald-500" />
              <span>Vista previa en WhatsApp:</span>
            </p>

            <div class="rounded-2xl border border-emerald-200/60 bg-[#e7f8e8]/70 p-4 shadow-inner dark:border-emerald-900/60 dark:bg-[#07362b]/60">
              <div class="relative max-w-[92%] ml-auto rounded-2xl rounded-tr-sm bg-[#DCF8C6] p-3 text-xs sm:text-sm text-slate-900 shadow-sm dark:bg-[#054640] dark:text-slate-100">
                <p class="whitespace-pre-wrap break-words leading-relaxed">
                  {{ editableText || 'El mensaje aparecerá aquí en tiempo real...' }}
                </p>
                <div class="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-500 dark:text-emerald-200/70 font-semibold">
                  <span>{{ currentTime }}</span>
                  <CheckCheck class="h-3.5 w-3.5 text-sky-500 inline" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer / Acciones -->
        <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            @click="handleClose"
            :disabled="isSubmitting"
            class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>

          <button
            type="button"
            @click="handleConfirm"
            :disabled="!editableText.trim() || isSubmitting"
            class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
          >
            <Send v-if="!isSubmitting" class="h-4 w-4 stroke-[2.5]" />
            <span v-else class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            <span>Confirmar y Enviar</span>
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
