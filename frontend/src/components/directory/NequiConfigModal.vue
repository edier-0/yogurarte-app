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
  Smartphone,
  Save,
  X,
  AlertCircle,
  Copy,
  Check,
  Building,
  CreditCard,
  Instagram,
  FileText,
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'saved'): void;
}>();

// Campos de configuración
const nequiNumber = ref('');
const bankName = ref('Nequi / Bancolombia');
const bankHolder = ref('Edier / YogurArte');
const paymentInstructions = ref('Transferencias vía Nequi o Bancolombia a la mano');
const bancolombiaAccount = ref('');
const instagramUrl = ref('');

const isLoading = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref('');
const copiedField = ref<string | null>(null);

async function loadSettings() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const res = await http.get<Record<string, string>>('/settings');
    if (res && typeof res === 'object') {
      nequiNumber.value = res.nequiNumber || '3024581882';
      bankName.value = res.bankName || 'Nequi / Bancolombia';
      bankHolder.value = res.bankHolder || 'Edier / YogurArte';
      paymentInstructions.value = res.paymentInstructions || 'Transferencias vía Nequi o Bancolombia';
      bancolombiaAccount.value = res.bancolombiaAccount || '';
      instagramUrl.value = res.instagramUrl || '';
    }
  } catch (err: any) {
    errorMessage.value = err?.message || 'Error al cargar la configuración de cuenta';
  } finally {
    isLoading.value = false;
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      loadSettings();
    }
  }
);

function handleClose() {
  emit('update:open', false);
  errorMessage.value = '';
}

async function copyToClipboard(text: string, field: string) {
  try {
    await navigator.clipboard.writeText(text);
    copiedField.value = field;
    toast.success('Copiado al portapapeles', { description: text });
    setTimeout(() => {
      if (copiedField.value === field) copiedField.value = null;
    }, 2000);
  } catch {
    toast.error('No se pudo copiar');
  }
}

async function handleSubmit() {
  isSubmitting.value = true;
  errorMessage.value = '';
  try {
    await http.put('/settings', {
      nequiNumber: nequiNumber.value.trim(),
      bankName: bankName.value.trim(),
      bankHolder: bankHolder.value.trim(),
      paymentInstructions: paymentInstructions.value.trim(),
      bancolombiaAccount: bancolombiaAccount.value.trim(),
      instagramUrl: instagramUrl.value.trim(),
    });

    toast.success('Configuración Nequi Guardada', {
      description: 'Los datos bancarios del negocio se han actualizado correctamente.',
    });
    emit('saved');
    handleClose();
  } catch (err: any) {
    errorMessage.value = err?.message || 'Error al guardar la configuración';
  } finally {
    isSubmitting.value = false;
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
        <!-- Cabecera -->
        <div class="flex items-center justify-between border-b border-surface-light-border pb-4 dark:border-surface-dark-border">
          <div class="flex items-center gap-2.5">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
              <Smartphone class="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                Cuenta de Cobro y Datos Bancarios (Nequi)
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Parámetros oficiales del negocio para transferencias y QR
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

        <!-- Preview de la Cuenta de Cobro Oficial -->
        <div class="mt-4 rounded-2xl border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-900/50 dark:bg-purple-950/20">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="rounded-lg bg-purple-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                Nequi Principal
              </span>
              <span class="text-xs font-bold text-purple-900 dark:text-purple-200">
                {{ bankHolder || 'Titular del Negocio' }}
              </span>
            </div>

            <button
              v-if="nequiNumber"
              type="button"
              @click="copyToClipboard(nequiNumber, 'nequi')"
              class="inline-flex items-center gap-1 rounded-lg border border-purple-300 bg-white px-2 py-1 text-[11px] font-bold text-purple-700 shadow-xs hover:bg-purple-50 dark:border-purple-800 dark:bg-slate-900 dark:text-purple-300"
              title="Copiar número"
            >
              <Check v-if="copiedField === 'nequi'" class="h-3 w-3 stroke-[2.5] text-emerald-600" />
              <Copy v-else class="h-3 w-3 stroke-[2]" />
              <span>{{ copiedField === 'nequi' ? 'Copiado' : 'Copiar' }}</span>
            </button>
          </div>

          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-2xl font-black text-purple-950 dark:text-purple-100 tracking-wider">
              {{ nequiNumber || 'Sin configurar' }}
            </span>
          </div>

          <p class="mt-1 text-[11px] font-medium text-purple-800/80 dark:text-purple-300/80">
            {{ paymentInstructions || 'Indica este número a los clientes para transferencias directas.' }}
          </p>
        </div>

        <!-- Formulario de Configuración -->
        <form @submit.prevent="handleSubmit" class="mt-4 space-y-3.5">
          <!-- Número Nequi y Entidad -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Número Nequi Oficial *
              </label>
              <div class="relative">
                <Smartphone class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
                <input
                  v-model="nequiNumber"
                  type="text"
                  placeholder="3024581882"
                  required
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-extrabold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Entidad / Banco
              </label>
              <div class="relative">
                <Building class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
                <input
                  v-model="bankName"
                  type="text"
                  placeholder="Nequi / Bancolombia"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
              </div>
            </div>
          </div>

          <!-- Titular de la Cuenta -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nombre del Titular *
            </label>
            <input
              v-model="bankHolder"
              type="text"
              placeholder="Edier / YogurArte"
              required
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            />
          </div>

          <!-- Instrucciones de Pago -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Instrucciones para Clientes
            </label>
            <div class="relative">
              <FileText class="absolute left-3.5 top-3 h-4 w-4 text-slate-400 stroke-[2]" />
              <textarea
                v-model="paymentInstructions"
                rows="2"
                placeholder="Indica al cliente enviar comprobante por WhatsApp..."
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-medium text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>
          </div>

          <!-- Cuenta Bancolombia / A la Mano -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Cuenta Bancolombia / A la Mano
            </label>
            <div class="relative">
              <CreditCard class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
              <input
                v-model="bancolombiaAccount"
                type="text"
                placeholder="Número de cuenta o tarjeta Bancolombia"
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>
          </div>

          <!-- Instagram / Enlace Comercial -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Perfil de Instagram del Negocio
            </label>
            <div class="relative">
              <Instagram class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
              <input
                v-model="instagramUrl"
                type="url"
                placeholder="https://www.instagram.com/yogurartesanalfonseca"
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>
          </div>

          <!-- Error Alert -->
          <div
            v-if="errorMessage"
            class="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
          >
            <AlertCircle class="h-4 w-4 shrink-0" />
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Botones de Acción -->
          <div class="flex items-center justify-end gap-2.5 pt-3">
            <button
              type="button"
              @click="handleClose"
              class="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cerrar
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="inline-flex items-center gap-2 rounded-xl bg-hero-gradient px-5 py-2.5 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95 disabled:opacity-50"
            >
              <Save class="h-4 w-4 stroke-[2.5]" />
              <span>{{ isSubmitting ? 'Guardando...' : 'Guardar Cuenta Nequi' }}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
