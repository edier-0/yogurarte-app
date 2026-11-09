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
const redeemType = ref<'1L' | '500ML_X2'>('1L');

// Fracción para 1x 1L
const selectedPackaging1L = ref<number | ''>('');

// Fracciones independientes para 2x 500ml (multi-sabor)
const unit1PackagingId = ref<number | ''>('');
const unit2PackagingId = ref<number | ''>('');

const formatCurrency = (val?: number) => '$' + (val || 0).toLocaleString('es-CO');

const isBlockedByDebt = computed(() => {
  return (props.customer?.pendingDebt || 0) > 0;
});

// Cargar fracciones disponibles de Fase B
watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      redeemType.value = '1L';
      selectedPackaging1L.value = '';
      unit1PackagingId.value = '';
      unit2PackagingId.value = '';
      await Promise.all([
        productionStore.fetchAvailablePackagings(),
        productionStore.fetchPresentations(true),
      ]);
    }
  },
  { immediate: true }
);

function matchPresentation(containerName: string, targetCode: string): boolean {
  if (!containerName) return false;
  const c = containerName.toLowerCase().replace(/\s+/g, '');
  const t = targetCode.toLowerCase().replace(/\s+/g, '');
  if (c === t) return true;
  if (t === '1l') return c.includes('1l') || c.includes('1litro');
  if (t === '500ml') return c.includes('500') || c.includes('medio');
  return false;
}

function getFreeUnits(pkg: any, targetSize: string): number {
  if (Array.isArray(pkg.presentations) && pkg.presentations.length > 0) {
    const p = pkg.presentations.find((x: any) => matchPresentation(x.containerName, targetSize));
    if (p) return p.free || 0;
  }
  if (Array.isArray(pkg.containers) && pkg.containers.length > 0) {
    const c = pkg.containers.find((x: any) => matchPresentation(x.containerName, targetSize));
    if (c) return c.quantity || 0;
  }
  if (targetSize === '1L') {
    return pkg.bottles1L !== undefined ? pkg.bottles1L : Math.round(pkg.freeLiters || 0);
  }
  if (targetSize === '500ml') {
    return Math.floor((pkg.freeLiters || 0) / 0.5);
  }
  return 0;
}

// Fracciones disponibles para 1L
const available1LPackagings = computed(() => {
  const source = productionStore.availablePackagings.length > 0
    ? productionStore.availablePackagings
    : productionStore.packagings;

  return source.filter((p) => {
    return getFreeUnits(p, '1L') >= 1;
  });
});

// Fracciones disponibles para 500ml
const available500Packagings = computed(() => {
  const source = productionStore.availablePackagings.length > 0
    ? productionStore.availablePackagings
    : productionStore.packagings;

  return source.filter((p) => {
    return getFreeUnits(p, '500ml') >= 1;
  });
});

const resolvedItems = computed(() => {
  if (redeemType.value === '1L') {
    return [
      {
        packagingId: selectedPackaging1L.value ? Number(selectedPackaging1L.value) : undefined,
        bottleSize: '1L',
        quantity: 1,
      },
    ];
  }
  return [
    {
      packagingId: unit1PackagingId.value ? Number(unit1PackagingId.value) : undefined,
      bottleSize: '500ml',
      quantity: 1,
    },
    {
      packagingId: unit2PackagingId.value ? Number(unit2PackagingId.value) : undefined,
      bottleSize: '500ml',
      quantity: 1,
    },
  ];
});

async function handleSubmit() {
  if (!props.customer || isSubmitting.value || isBlockedByDebt.value) return;

  isSubmitting.value = true;
  try {
    const payload = {
      customerId: props.customer.id,
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
          <!-- Alerta de Bloqueo por Cartera Pendiente (RF-15) -->
          <div
            v-if="isBlockedByDebt"
            class="rounded-2xl border border-rose-300 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
          >
            <div class="flex items-center gap-2 font-black text-rose-900 dark:text-rose-100">
              <AlertCircle class="h-4 w-4 text-rose-600 shrink-0" />
              <span>Cliente con cartera pendiente de pago</span>
            </div>
            <p class="mt-1 text-[11px] leading-relaxed">
              El cliente registra un saldo adeudado de <strong>{{ formatCurrency(customer?.pendingDebt) }}</strong> en pedidos entregados. Debe estar a paz y salvo en cartera para poder redimir premios de fidelización.
            </p>
          </div>

          <!-- Elección de formato de entrega (RF-14: Acotado a 1x 1L o 2x 500ml) -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Formato de Entrega del Obsequio (Exactamente 1.0 Litro)
            </label>
            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                @click="redeemType = '1L'"
                class="flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all"
                :class="
                  redeemType === '1L'
                    ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                "
              >
                <span class="font-extrabold text-sm">1x 1 Litro (1L)</span>
                <span class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">1 Botella estándar (1.0 L)</span>
              </button>

              <button
                type="button"
                @click="redeemType = '500ML_X2'"
                class="flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all"
                :class="
                  redeemType === '500ML_X2'
                    ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                "
              >
                <span class="font-extrabold text-sm">2x 500 ml (Medio Litro)</span>
                <span class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">2 Botellas multi-sabor (1.0 L)</span>
              </button>
            </div>
          </div>

          <!-- Lote de salida para 1x 1L -->
          <div v-if="redeemType === '1L'" class="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/40">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Lote / Fracción de Salida (1L)
            </label>
            <select
              v-model="selectedPackaging1L"
              class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-surface-dark-canvas dark:text-white"
            >
              <option :value="''">-- Descargo general sin lote específico ($0 COP) --</option>
              <option v-for="pkg in available1LPackagings" :key="pkg.id" :value="pkg.id">
                {{ pkg.flavor }} — {{ pkg.packagingCode || `Lote #${pkg.id}` }} ({{ getFreeUnits(pkg, '1L') }} unds disp.)
              </option>
            </select>
          </div>

          <!-- Selectores multi-sabor para 2x 500ml (RF-17) -->
          <div v-else class="space-y-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/40">
            <h4 class="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
              Selección de Sabores y Lotes (2x 500ml)
            </h4>

            <!-- Unidad 1 -->
            <div>
              <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Botella 1 (500 ml)
              </label>
              <select
                v-model="unit1PackagingId"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-surface-dark-canvas dark:text-white"
              >
                <option :value="''">-- Descargo general sin lote ($0 COP) --</option>
                <option v-for="pkg in available500Packagings" :key="pkg.id" :value="pkg.id">
                  {{ pkg.flavor }} — {{ pkg.packagingCode || `Lote #${pkg.id}` }} ({{ getFreeUnits(pkg, '500ml') }} unds disp.)
                </option>
              </select>
            </div>

            <!-- Unidad 2 -->
            <div>
              <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Botella 2 (500 ml)
              </label>
              <select
                v-model="unit2PackagingId"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-surface-dark-canvas dark:text-white"
              >
                <option :value="''">-- Descargo general sin lote ($0 COP) --</option>
                <option v-for="pkg in available500Packagings" :key="pkg.id" :value="pkg.id">
                  {{ pkg.flavor }} — {{ pkg.packagingCode || `Lote #${pkg.id}` }} ({{ getFreeUnits(pkg, '500ml') }} unds disp.)
                </option>
              </select>
            </div>
          </div>

          <!-- Aviso de costo $0 COP -->
          <div class="rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-3 text-center text-xs dark:border-amber-800/40 dark:bg-amber-950/20">
            <span class="font-extrabold text-amber-900 dark:text-amber-200">
              Valor a Cobrar: $0 COP (Premio de Fidelización)
            </span>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Esta entrega descuenta inventario de Fase B sin generar deuda ni cuentas por cobrar.
            </p>
          </div>

          <!-- Botones de Acción -->
          <div class="flex items-center justify-end gap-2 pt-2 border-t border-surface-light-border dark:border-surface-dark-border">
            <button
              type="button"
              @click="handleClose"
              class="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isBlockedByDebt || isSubmitting"
              class="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 transition-all"
              :title="isBlockedByDebt ? 'No se puede redimir: el cliente tiene cartera pendiente de pago' : ''"
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
