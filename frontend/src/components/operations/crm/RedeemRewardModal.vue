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
  Gift,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-vue-next';
import { useProductionStore } from '@/stores/production.store';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';
import type { LoyaltyCustomerItem } from './LoyaltyTab.vue';

const props = defineProps<{
  open: boolean;
  customer: LoyaltyCustomerItem | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'redeemed'): void;
}>();

const productionStore = useProductionStore();

const isSubmitting = ref(false);
const selectedPackagingId = ref<number | ''>('');
const redeemType = ref<'1L' | '500ML_X2' | 'CUSTOM'>('1L');
const customBottleSize = ref('1L');
const customQuantity = ref(1);

// Cargar lotes disponibles al abrir
watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      selectedPackagingId.value = '';
      redeemType.value = '1L';
      customBottleSize.value = '1L';
      customQuantity.value = 1;
      await Promise.all([
        productionStore.fetchPackagings(1),
        productionStore.fetchPresentations(true),
      ]);
    }
  },
  { immediate: true }
);

const availablePackagings = computed(() => {
  return productionStore.packagings.filter(
    (p) => p.status === 'DISPONIBLE' || (p.freeLiters !== undefined && p.freeLiters > 0)
  );
});

const resolvedItems = computed(() => {
  if (redeemType.value === '1L') {
    return [{ bottleSize: '1L', quantity: 1 }];
  }
  if (redeemType.value === '500ML_X2') {
    return [{ bottleSize: '500ml', quantity: 2 }];
  }
  return [{ bottleSize: customBottleSize.value, quantity: customQuantity.value }];
});

const resolvedTotalLiters = computed(() => {
  return resolvedItems.value.reduce((sum, it) => {
    const pres = productionStore.activePresentations.find(
      (p) => p.name.toLowerCase() === it.bottleSize.toLowerCase()
    );
    const cap = pres ? pres.capacityLiters : it.bottleSize === '2L' ? 2.0 : it.bottleSize === '500ml' ? 0.5 : 1.0;
    return sum + it.quantity * cap;
  }, 0);
});

const isLitersValid = computed(() => {
  return resolvedTotalLiters.value > 0 && resolvedTotalLiters.value <= 1.05;
});

async function handleSubmit() {
  if (!props.customer || isSubmitting.value || !isLitersValid.value) return;

  isSubmitting.value = true;
  try {
    const payload = {
      customerId: props.customer.id,
      packagingId: selectedPackagingId.value ? Number(selectedPackagingId.value) : undefined,
      items: resolvedItems.value,
    };

    const res = await http.post<{ success: boolean; message: string }>('/crm/loyalty/redeem', payload);
    toast.success('¡Recompensa Entregada!', {
      description: res?.message || `Premio de fidelización registrado exitosamente para ${props.customer.fullName}.`,
    });
    emit('redeemed');
    emit('update:open', false);
  } catch (err: any) {
    toast.error('Error al redimir', {
      description: err?.response?.data?.error || 'No se pudo registrar la entrega del premio.',
    });
  } finally {
    isSubmitting.value = false;
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
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <Gift class="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                Canjear Premio 10+1
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Cliente: <strong class="text-slate-800 dark:text-slate-200">{{ customer?.fullName }}</strong> ({{ customer?.rewardsAvailable }} disponible(s))
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

        <form @submit.prevent="handleSubmit" class="mt-4 space-y-4 flex-1 overflow-y-auto pr-1">
          <!-- Elección de formato de entrega -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Formato de Entrega del Obsequio (Hasta 1.0 Litro total)
            </label>
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                type="button"
                @click="redeemType = '1L'"
                class="flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all"
                :class="
                  redeemType === '1L'
                    ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800'
                "
              >
                <span class="font-extrabold text-sm">1x 1 Litro</span>
                <span class="text-[10px] text-slate-500 dark:text-slate-400">1 Envase (1.0 L)</span>
              </button>

              <button
                type="button"
                @click="redeemType = '500ML_X2'"
                class="flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all"
                :class="
                  redeemType === '500ML_X2'
                    ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800'
                "
              >
                <span class="font-extrabold text-sm">2x 500 ml</span>
                <span class="text-[10px] text-slate-500 dark:text-slate-400">2 Envases (1.0 L)</span>
              </button>

              <button
                type="button"
                @click="redeemType = 'CUSTOM'"
                class="col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all"
                :class="
                  redeemType === 'CUSTOM'
                    ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800'
                "
              >
                <span class="font-extrabold text-sm">Personalizado</span>
                <span class="text-[10px] text-slate-500 dark:text-slate-400">Otra presentación</span>
              </button>
            </div>
          </div>

          <!-- Selector personalizado si eligió CUSTOM -->
          <div v-if="redeemType === 'CUSTOM'" class="grid grid-cols-2 gap-3 p-3 rounded-2xl border border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/60">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Presentación
              </label>
              <select
                v-model="customBottleSize"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
              >
                <option v-for="pres in productionStore.activePresentations" :key="pres.id" :value="pres.name">
                  {{ pres.label || pres.name }} ({{ pres.capacityLiters }}L)
                </option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Cantidad
              </label>
              <input
                v-model.number="customQuantity"
                type="number"
                min="1"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <!-- Validación de litros -->
          <div
            class="flex items-center justify-between p-3 rounded-2xl text-xs font-semibold"
            :class="
              isLitersValid
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800'
            "
          >
            <div class="flex items-center gap-2">
              <CheckCircle2 v-if="isLitersValid" class="h-4 w-4 shrink-0 text-emerald-600" />
              <AlertCircle v-else class="h-4 w-4 shrink-0 text-rose-600" />
              <span>Volumen a entregar: {{ resolvedTotalLiters.toFixed(2) }} L</span>
            </div>
            <span class="text-[11px] font-bold">Máximo permitido: 1.0 L</span>
          </div>

          <!-- Lote o Fracción de la que se extrae -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Fracción / Lote Envasado de Salida (Opcional pero recomendado para descontar stock)
            </label>
            <select
              v-model="selectedPackagingId"
              class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option :value="''">-- Entrega general sin lote específico ($0 COP) --</option>
              <option v-for="pkg in availablePackagings" :key="pkg.id" :value="pkg.id">
                {{ pkg.flavor }} — {{ pkg.packagingCode || `Fracción #${pkg.id}` }} (Disp: {{ pkg.freeLiters ?? pkg.totalLiters }} L)
              </option>
            </select>
            <p class="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Al seleccionar un lote, se creará automáticamente un descargo de inventario por $0 COP con motivo PREMIO_FIDELIZACION.
            </p>
          </div>

          <!-- Aviso de costo $0 COP -->
          <div class="rounded-2xl border border-dashed border-amber-200 bg-amber-50/50 p-3 text-center text-xs dark:border-amber-800/40 dark:bg-amber-950/20">
            <span class="font-extrabold text-amber-900 dark:text-amber-200">
              Valor a Cobrar: $0 COP
            </span>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Esta entrega no genera cuentas por cobrar ni afecta el saldo de cartera del cliente.
            </p>
          </div>

          <!-- Botones de Acción -->
          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              @click="handleClose"
              class="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="!isLitersValid || isSubmitting"
              class="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 transition-all"
            >
              <Loader2 v-if="isSubmitting" class="h-4 w-4 animate-spin" />
              <Gift v-else class="h-4 w-4" />
              <span>Confirmar Entrega de Recompensa</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
