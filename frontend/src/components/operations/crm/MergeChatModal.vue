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
  X,
  GitMerge,
  Search,
  Phone,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from 'lucide-vue-next';
import { refDebounced } from '@vueuse/core';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';

export interface CustomerOption {
  id: number;
  fullName: string;
  phone: string;
  address?: string | null;
  neighborhood?: string | null;
  orders?: Array<{ id: number }>;
}

const props = defineProps<{
  open: boolean;
  sourceChat: any | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'merged', targetConversation: any): void;
}>();

const searchQuery = ref('');
const debouncedSearch = refDebounced(searchQuery, 300);
const customers = ref<CustomerOption[]>([]);
const isLoadingCustomers = ref(false);
const selectedCustomerId = ref<number | null>(null);
const isMerging = ref(false);

const has579Prefix = computed(() => {
  if (!props.sourceChat) return false;
  const jid = props.sourceChat.remoteJid || '';
  const phone = props.sourceChat.phoneNumber || '';
  return jid.startsWith('5793') || phone.startsWith('5793');
});

const suggestedCanonicalJid = computed(() => {
  if (!props.sourceChat) return '';
  const jid = props.sourceChat.remoteJid || '';
  if (jid.includes('@')) {
    const [user, domain] = jid.split('@');
    const [userNumber, device] = user.split(':');
    const cleanUser = userNumber.replace(/^579(3\d{9})$/, '57$1');
    return `${cleanUser}${device ? ':' + device : ''}@${domain}`;
  }
  const cleanPhone = (props.sourceChat.phoneNumber || '').replace(/\D/g, '');
  const normalized = cleanPhone.replace(/^579(3\d{9})$/, '57$1');
  return `${normalized}@s.whatsapp.net`;
});

async function loadCustomers() {
  isLoadingCustomers.value = true;
  try {
    const q = debouncedSearch.value.trim();
    const params: any = { limit: '25' };
    if (q) params.search = q;
    const res = await http.get<any>('/customers', { params });
    if (res && Array.isArray(res.customers)) {
      customers.value = res.customers;
    } else if (Array.isArray(res)) {
      customers.value = res;
    }
  } catch (err: any) {
    console.error('Error cargando clientes:', err);
  } finally {
    isLoadingCustomers.value = false;
  }
}

watch(debouncedSearch, () => {
  if (props.open) {
    loadCustomers();
  }
});

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      selectedCustomerId.value = props.sourceChat?.customerId || null;
      searchQuery.value = '';
      loadCustomers();
    }
  }
);

const selectedCustomer = computed(() => {
  if (!selectedCustomerId.value) return null;
  return customers.value.find((c) => c.id === selectedCustomerId.value) || null;
});

async function handleMerge() {
  if (!props.sourceChat || !selectedCustomerId.value || isMerging.value) return;
  isMerging.value = true;
  try {
    const res = await http.post<any>('/crm/chats/merge', {
      sourceChatId: props.sourceChat.id,
      targetClientId: selectedCustomerId.value,
      canonicalJid: suggestedCanonicalJid.value || undefined,
    });

    toast.success('Chat unificado exitosamente', {
      description: 'Los mensajes se han consolidado en el hilo canónico en orden cronológico.',
    });

    emit('merged', res);
    emit('update:open', false);
  } catch (err: any) {
    toast.error('Error al unificar chat', {
      description: err?.response?.data?.error || err.message,
    });
  } finally {
    isMerging.value = false;
  }
}
</script>

<template>
  <DialogRoot :open="open" @update:open="(val: boolean) => emit('update:open', val)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity" />

      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-[95%] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-2xl transition-all focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-7 max-h-[92vh] flex flex-col"
      >
        <!-- Cabecera del Modal -->
        <div class="flex items-center justify-between border-b border-surface-light-border pb-4 dark:border-surface-dark-border shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-hero-gradient text-white shadow-xs">
              <GitMerge class="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                Cambiar o Unificar Cliente
              </DialogTitle>
              <DialogDescription class="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Fusiona hilos bifurcados de WhatsApp o asigna este chat a un cliente registrado
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            @click="emit('update:open', false)"
            class="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto py-4 space-y-4 pr-1">
          <!-- Card de Chat Origen Actual -->
          <div class="rounded-2xl border border-surface-light-border bg-surface-light-canvas/60 p-3.5 dark:border-surface-dark-border dark:bg-surface-dark-canvas/50">
            <div class="flex items-center justify-between gap-2">
              <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Chat Actual (Origen)
              </span>
              <span class="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-black text-brand-800 dark:bg-brand-950/60 dark:text-brand-darkText">
                ID #{{ sourceChat?.id }}
              </span>
            </div>
            <div class="mt-2 flex items-center gap-3">
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-xs font-black text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                {{ ((sourceChat?.contactName || sourceChat?.phoneNumber || 'C').charAt(0)).toUpperCase() }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {{ sourceChat?.contactName || 'Sin nombre de contacto' }}
                </p>
                <p class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {{ sourceChat?.phoneNumber }} &bull; <span class="font-mono text-[10px]">{{ sourceChat?.remoteJid }}</span>
                </p>
              </div>
            </div>

            <!-- Alerta informativa de prefijo 579 -->
            <div
              v-if="has579Prefix"
              class="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900"
            >
              <AlertTriangle class="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div class="text-[11px] leading-relaxed">
                <span class="font-bold">Prefijo de carrier móvil (579) detectado:</span>
                Este hilo proviene de una variación de prefijo en Colombia. Al unificar, se consolidará bajo el JID canónico
                <span class="font-mono font-bold">{{ suggestedCanonicalJid }}</span>.
              </div>
            </div>
          </div>

          <!-- Buscador de Cliente Destino -->
          <div>
            <label class="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
              Seleccionar Cliente Destino para la Fusión
            </label>
            <div class="relative w-full">
              <Search class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 stroke-[2]" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Buscar cliente por nombre o teléfono..."
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-card py-2 pl-9 pr-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-white"
              />
            </div>
          </div>

          <!-- Listado de Clientes con Scroll -->
          <div class="rounded-2xl border border-surface-light-border dark:border-surface-dark-border overflow-hidden bg-surface-light-card dark:bg-surface-dark-card">
            <div class="p-2 border-b border-surface-light-border dark:border-surface-dark-border bg-surface-light-canvas/40 dark:bg-surface-dark-canvas/40 flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>Clientes Registrados</span>
              <span v-if="isLoadingCustomers" class="flex items-center gap-1 text-[10px] text-slate-400">
                <RefreshCw class="h-3 w-3 animate-spin" /> Buscando...
              </span>
            </div>

            <div class="max-h-56 overflow-y-auto divide-y divide-surface-light-border/60 dark:divide-surface-dark-border/60">
              <div
                v-for="c in customers"
                :key="c.id"
                @click="selectedCustomerId = c.id"
                class="p-3 cursor-pointer transition-colors flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                :class="{
                  'bg-brand-50/70 dark:bg-brand-950/40 border-l-4 border-l-brand-800 dark:border-l-brand-400':
                    selectedCustomerId === c.id,
                }"
              >
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <p class="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                      {{ c.fullName }}
                    </p>
                    <span
                      v-if="sourceChat?.customerId === c.id"
                      class="rounded-md bg-slate-100 px-1.5 py-0.2 text-[9px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    >
                      Actual
                    </span>
                  </div>
                  <div class="mt-1 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                    <span class="flex items-center gap-1 font-semibold">
                      <Phone class="h-3 w-3" />
                      {{ c.phone }}
                    </span>
                    <span v-if="c.address" class="flex items-center gap-1 truncate max-w-[200px]">
                      <MapPin class="h-3 w-3" />
                      {{ c.address }}
                    </span>
                  </div>
                </div>

                <div class="shrink-0 flex items-center gap-2">
                  <span
                    v-if="c.orders && c.orders.length > 0"
                    class="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                  >
                    {{ c.orders.length }} pedidos
                  </span>

                  <!-- Radio indicador de selección -->
                  <div
                    class="flex h-5 w-5 items-center justify-center rounded-full border transition-all"
                    :class="
                      selectedCustomerId === c.id
                        ? 'border-brand-800 bg-brand-800 text-white dark:border-brand-400 dark:bg-brand-400 dark:text-slate-900'
                        : 'border-slate-300 dark:border-slate-600'
                    "
                  >
                    <CheckCircle2 v-if="selectedCustomerId === c.id" class="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                </div>
              </div>

              <div
                v-if="!isLoadingCustomers && customers.length === 0"
                class="p-6 text-center text-xs font-semibold text-slate-400"
              >
                No se encontraron clientes para "{{ searchQuery }}".
              </div>
            </div>
          </div>

          <!-- Resumen de la acción a ejecutar -->
          <div
            v-if="selectedCustomer"
            class="rounded-2xl border border-brand-200 bg-brand-50/40 p-3.5 dark:border-brand-900/60 dark:bg-brand-950/30 text-xs text-brand-900 dark:text-brand-darkText"
          >
            <div class="flex items-center gap-2 font-bold mb-1">
              <Sparkles class="h-4 w-4 text-brand-800 dark:text-brand-darkText" />
              <span>Resultado de la Unificación:</span>
            </div>
            <p class="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
              Todos los mensajes enviados y recibidos en este chat se fusionarán de forma segura con el cliente
              <strong class="text-slate-900 dark:text-white">{{ selectedCustomer.fullName }}</strong>.
              El historial se ordenará cronológicamente y no se perderá ninguna conversación previa.
            </p>
          </div>
        </div>

        <!-- Botones de Acción (shrink-0) -->
        <div class="flex items-center justify-end gap-2.5 border-t border-surface-light-border pt-4 dark:border-surface-dark-border shrink-0">
          <button
            type="button"
            @click="emit('update:open', false)"
            :disabled="isMerging"
            class="rounded-xl border border-surface-light-border bg-surface-light-card px-4 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            @click="handleMerge"
            :disabled="!selectedCustomerId || isMerging"
            class="inline-flex items-center gap-2 rounded-xl bg-hero-gradient px-4 py-2 text-xs font-extrabold text-white shadow-card transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw v-if="isMerging" class="h-3.5 w-3.5 animate-spin" />
            <GitMerge v-else class="h-3.5 w-3.5 stroke-[2.5]" />
            <span>{{ isMerging ? 'Fusionando Chats...' : 'Confirmar y Fusionar' }}</span>
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
