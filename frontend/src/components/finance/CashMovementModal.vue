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
  PiggyBank,
  Scale,
  ArrowDownLeft,
  X,
  AlertCircle,
  Plus,
  Pencil,
  CheckCircle2,
  Calculator,
} from 'lucide-vue-next';
import { useFinanceStore, getTodayDateBogota } from '@/stores/finance.store';
import { http } from '@/api/client';

export type MovementMode = 'BASE' | 'ADJUST' | 'WITHDRAW' | 'EDIT';

export interface PartnerCapitalBalance {
  partnerId: number;
  fullName: string;
  role: string;
  type: string;
  isActive: boolean;
  totalContributed: number;
  totalReturned: number;
  available: number;
}

export interface CapitalBalancesResponse {
  base: {
    totalInjected: number;
    totalWithdrawn: number;
    available: number;
  };
  partners: PartnerCapitalBalance[];
}

const props = defineProps<{
  open: boolean;
  mode: MovementMode;
  movementToEdit?: any | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'saved'): void;
}>();

const financeStore = useFinanceStore();

const movementType = ref<string>('BASE_INICIAL');

const amount = ref<number | ''>('');
const paymentMethod = ref<string>('EFECTIVO');
const concept = ref<string>('');
const movementDate = ref<string>(getTodayDateBogota());
const notes = ref<string>('');
const selectedPartnerId = ref<number | ''>('');
const partnersList = ref<Array<{ id: number; fullName: string; role: string; type: string }>>([]);
const isLoadingPartners = ref<boolean>(false);
const capitalBalances = ref<CapitalBalancesResponse | null>(null);
const isLoadingBalances = ref<boolean>(false);
const isSubmitting = ref<boolean>(false);
const errorMessage = ref<string>('');

async function fetchPartners() {
  if (partnersList.value.length > 0) return;
  isLoadingPartners.value = true;
  try {
    const res = await http.get('/staff');
    const allStaff = Array.isArray(res) ? res : Array.isArray((res as any)?.data) ? (res as any).data : [];
    partnersList.value = allStaff.filter((s: any) => s.type === 'SOCIO' || s.role === 'SOCIO');
  } catch (err) {
    console.error('Error al cargar socios:', err);
  } finally {
    isLoadingPartners.value = false;
  }
}

async function fetchBalances() {
  isLoadingBalances.value = true;
  try {
    const res = await http.get<CapitalBalancesResponse>('/cash-movements/capital-balances');
    if (res && res.base && Array.isArray(res.partners)) {
      capitalBalances.value = res;
    }
  } catch (err) {
    console.error('Error al cargar balances de capital:', err);
  } finally {
    isLoadingBalances.value = false;
  }
}

// Sincronizar defaults según el modo o datos a editar
watch(
  () => [props.open, props.mode, props.movementToEdit],
  () => {
    if (!props.open) return;

    fetchPartners();
    fetchBalances();

    if (props.mode === 'EDIT' && props.movementToEdit) {
      const m = props.movementToEdit;
      amount.value = Math.abs(Number(m.amount) || 0);
      concept.value = m.concept || m.description || '';
      const rawMethod = (m.paymentMethod || 'EFECTIVO').toUpperCase().trim();
      paymentMethod.value = rawMethod === 'EFECTIVO' ? 'EFECTIVO' : 'NEQUI';
      const rawDate = m.date || m.movementDate || '';
      movementDate.value = rawDate ? String(rawDate).slice(0, 10) : getTodayDateBogota();
      notes.value = m.notes || '';
      movementType.value = m.type || m.movementType || (m.flowType === 'OUTFLOW' ? 'EGRESO' : 'INGRESO');
      selectedPartnerId.value = m.staffMemberId || m.staffMember?.id || '';
    } else if (props.mode === 'BASE') {
      movementType.value = 'BASE_INICIAL';
      concept.value = 'Base inicial de caja menor';
      paymentMethod.value = 'EFECTIVO';
      amount.value = '';
      notes.value = '';
      selectedPartnerId.value = '';
      movementDate.value = getTodayDateBogota();
    } else if (props.mode === 'WITHDRAW') {
      movementType.value = 'RETIRO_BASE';
      concept.value = 'Retiro de base de caja menor';
      paymentMethod.value = 'EFECTIVO';
      amount.value = '';
      notes.value = '';
      selectedPartnerId.value = '';
      movementDate.value = getTodayDateBogota();
    } else if (props.mode === 'ADJUST') {
      movementType.value = 'AJUSTE_CAJA';
      concept.value = 'Ajuste de arqueo / cuadre de caja';
      paymentMethod.value = 'EFECTIVO';
      amount.value = '';
      notes.value = '';
      selectedPartnerId.value = '';
      movementDate.value = getTodayDateBogota();
    }
  },
  { immediate: true }
);

// Ajustar concepto al cambiar de tipo
watch(movementType, (newType) => {
  if (props.mode === 'EDIT') return;
  if (newType === 'APORTE_SOCIO') {
    if (!concept.value || concept.value === 'Base inicial de caja menor') {
      concept.value = 'Aporte extraordinario de socio';
    }
  } else if (newType === 'BASE_INICIAL') {
    if (!concept.value || concept.value === 'Aporte extraordinario de socio') {
      concept.value = 'Base inicial de caja menor';
    }
  } else if (newType === 'DEVOLUCION_APORTE') {
    if (!concept.value || concept.value === 'Retiro de base de caja menor') {
      concept.value = 'Devolución de aporte a socio';
    }
  } else if (newType === 'RETIRO_BASE') {
    if (!concept.value || concept.value === 'Devolución de aporte a socio') {
      concept.value = 'Retiro de base de caja menor';
    }
  }
});

const modalTitle = computed(() => {
  if (props.mode === 'EDIT') return 'Editar Movimiento de Caja';
  if (props.mode === 'BASE') return 'Base / Aporte a Caja';
  if (props.mode === 'WITHDRAW') return 'Retiro / Devolución de Aporte';
  return 'Ajustar / Cuadrar Caja';
});

const modalDescription = computed(() => {
  if (props.mode === 'EDIT') return 'Corrige monto, medio de pago, fecha, tipo o notas del movimiento';
  if (props.mode === 'BASE') return 'Inyección de dinero físico o aporte de socios para operar';
  if (props.mode === 'WITHDRAW') return 'Salida de dinero de la base o devolución de aporte a socio';
  return 'Conciliación de diferencias por 4x1000, comisiones o descuadre físico';
});

const requiresPartner = computed(() => {
  return movementType.value === 'APORTE_SOCIO' || movementType.value === 'DEVOLUCION_APORTE';
});

// Balance del socio seleccionado (considerando el movimiento en edición si aplica)
const currentPartnerBalance = computed(() => {
  if (!capitalBalances.value || !selectedPartnerId.value) return null;
  const pId = Number(selectedPartnerId.value);
  const found = capitalBalances.value.partners.find((p) => p.partnerId === pId);
  if (!found) return null;

  let adjustedAvailable = found.available;
  let adjustedReturned = found.totalReturned;

  if (
    props.mode === 'EDIT' &&
    props.movementToEdit &&
    props.movementToEdit.type === 'DEVOLUCION_APORTE' &&
    (props.movementToEdit.staffMemberId === pId || props.movementToEdit.staffMember?.id === pId)
  ) {
    const originalAmount = Math.abs(Number(props.movementToEdit.amount) || 0);
    adjustedAvailable += originalAmount;
    adjustedReturned = Math.max(0, adjustedReturned - originalAmount);
  }

  return {
    ...found,
    available: adjustedAvailable,
    totalReturned: adjustedReturned,
  };
});

// Balance de la base de caja (considerando el movimiento en edición si aplica)
const currentBaseBalance = computed(() => {
  if (!capitalBalances.value) return null;
  const b = capitalBalances.value.base;
  let adjustedAvailable = b.available;
  let adjustedWithdrawn = b.totalWithdrawn;

  if (
    props.mode === 'EDIT' &&
    props.movementToEdit &&
    props.movementToEdit.type === 'RETIRO_BASE'
  ) {
    const originalAmount = Math.abs(Number(props.movementToEdit.amount) || 0);
    adjustedAvailable += originalAmount;
    adjustedWithdrawn = Math.max(0, adjustedWithdrawn - originalAmount);
  }

  return {
    totalInjected: b.totalInjected,
    totalWithdrawn: adjustedWithdrawn,
    available: adjustedAvailable,
  };
});

// Monto numérico digitado en tiempo real
const parsedAmount = computed(() => {
  return typeof amount.value === 'number' && !isNaN(amount.value) ? Math.max(0, amount.value) : 0;
});

// Cálculo dinámico para DEVOLUCION_APORTE
const partnerReturnCalc = computed(() => {
  if (movementType.value !== 'DEVOLUCION_APORTE' || !currentPartnerBalance.value) {
    return null;
  }
  const available = currentPartnerBalance.value.available;
  const withdraw = parsedAmount.value;
  const remaining = available - withdraw;
  const isExceeded = withdraw > available;

  return {
    totalContributed: currentPartnerBalance.value.totalContributed,
    totalReturned: currentPartnerBalance.value.totalReturned,
    available,
    withdraw,
    remaining,
    isExceeded,
    partnerName: currentPartnerBalance.value.fullName,
  };
});

// Cálculo dinámico para RETIRO_BASE
const baseWithdrawCalc = computed(() => {
  if (movementType.value !== 'RETIRO_BASE' || !currentBaseBalance.value) {
    return null;
  }
  const available = currentBaseBalance.value.available;
  const withdraw = parsedAmount.value;
  const remaining = available - withdraw;
  const isExceeded = withdraw > available;

  return {
    totalInjected: currentBaseBalance.value.totalInjected,
    totalWithdrawn: currentBaseBalance.value.totalWithdrawn,
    available,
    withdraw,
    remaining,
    isExceeded,
  };
});

// Indicador reactivo de si el monto actual supera el tope permitido
const isAmountExceeded = computed(() => {
  if (movementType.value === 'DEVOLUCION_APORTE' && partnerReturnCalc.value) {
    return partnerReturnCalc.value.isExceeded;
  }
  if (movementType.value === 'RETIRO_BASE' && baseWithdrawCalc.value) {
    return baseWithdrawCalc.value.isExceeded;
  }
  return false;
});

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

function applyMaxAmount(maxVal: number) {
  amount.value = Math.max(0, maxVal);
}

const isFormValid = computed(() => {
  const basic = typeof amount.value === 'number' && amount.value > 0 && concept.value.trim().length > 0;
  if (!basic) return false;
  if (requiresPartner.value && !selectedPartnerId.value) {
    return false;
  }
  if (isAmountExceeded.value) {
    return false;
  }
  return true;
});

function handleClose() {
  emit('update:open', false);
  errorMessage.value = '';
}

async function handleSubmit() {
  if (!isFormValid.value || typeof amount.value !== 'number') {
    if (requiresPartner.value && !selectedPartnerId.value) {
      errorMessage.value = 'Por favor selecciona el socio correspondiente para este movimiento.';
      return;
    }
    if (isAmountExceeded.value) {
      if (movementType.value === 'DEVOLUCION_APORTE' && partnerReturnCalc.value) {
        errorMessage.value = `El monto no puede ser mayor al aporte disponible del socio (${formatCurrency(partnerReturnCalc.value.available)}).`;
      } else if (movementType.value === 'RETIRO_BASE' && baseWithdrawCalc.value) {
        errorMessage.value = `El monto no puede ser mayor a la base disponible en caja (${formatCurrency(baseWithdrawCalc.value.available)}).`;
      } else {
        errorMessage.value = 'El monto a retirar excede el saldo permitido.';
      }
      return;
    }
    errorMessage.value = 'Por favor ingresa un monto válido mayor a 0 y un concepto.';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    const payloadStaffId = requiresPartner.value && selectedPartnerId.value ? Number(selectedPartnerId.value) : null;

    if (props.mode === 'EDIT' && props.movementToEdit) {
      const targetId = props.movementToEdit.rawId || props.movementToEdit.id;
      await financeStore.updateCashMovement(targetId, {
        type: movementType.value,
        amount: amount.value,
        concept: concept.value.trim(),
        description: concept.value.trim(),
        paymentMethod: paymentMethod.value,
        movementDate: movementDate.value,
        date: movementDate.value,
        notes: notes.value.trim() || null,
        staffMemberId: payloadStaffId,
      });
    } else {
      await financeStore.createCashMovement({
        type: movementType.value,
        amount: amount.value,
        concept: concept.value.trim(),
        paymentMethod: paymentMethod.value,
        movementDate: movementDate.value,
        notes: notes.value.trim() || null,
        staffMemberId: payloadStaffId,
      });
    }

    amount.value = '';
    notes.value = '';
    selectedPartnerId.value = '';
    emit('saved');
    handleClose();
  } catch (err: any) {
    errorMessage.value = err?.message || 'Error al procesar el movimiento de caja';
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
        class="fixed left-1/2 top-1/2 z-50 flex max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-surface-light-border bg-surface-light-card shadow-2xl transition-all focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card"
      >
        <!-- Header Fijo -->
        <div class="flex shrink-0 items-center justify-between border-b border-surface-light-border p-5 dark:border-surface-dark-border sm:p-6">
          <div class="flex items-center gap-2.5">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl"
              :class="
                mode === 'EDIT'
                  ? 'bg-brand-50 text-brand-800 dark:bg-brand-950/40 dark:text-brand-400'
                  : mode === 'BASE'
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : mode === 'WITHDRAW'
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                  : 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400'
              "
            >
              <Pencil v-if="mode === 'EDIT'" class="h-5 w-5 stroke-[2]" />
              <PiggyBank v-else-if="mode === 'BASE'" class="h-5 w-5 stroke-[2]" />
              <ArrowDownLeft v-else-if="mode === 'WITHDRAW'" class="h-5 w-5 stroke-[2]" />
              <Scale v-else class="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                {{ modalTitle }}
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {{ modalDescription }}
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

        <form @submit.prevent="handleSubmit" novalidate class="flex flex-1 flex-col min-h-0 overflow-hidden">
          <!-- Cuerpo Scrollable -->
          <div class="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 overscroll-contain touch-pan-y">
          <!-- Selector de Tipo en Modo EDICIÓN -->
          <div v-if="mode === 'EDIT'">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tipo de Movimiento *
            </label>
            <select
              v-model="movementType"
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            >
              <option value="INGRESO">Ingreso Directo (+)</option>
              <option value="EGRESO">Egreso Directo (-)</option>
              <option value="BASE_INICIAL">Base Inicial de Caja (+)</option>
              <option value="APORTE_SOCIO">Aporte de Socio (+)</option>
              <option value="RETIRO_BASE">Retiro de Base (-)</option>
              <option value="DEVOLUCION_APORTE">Devolución de Aporte a Socio (-)</option>
              <option value="AJUSTE_CAJA">Ajuste General de Cuadre</option>
              <option value="AJUSTE_SOBRANTE">Sobrante de Caja (+)</option>
              <option value="AJUSTE_FALTANTE">Faltante de Caja / 4x1000 (-)</option>
              <option value="TRASLADO_EFECTIVO_A_BANCO">Traslado Efectivo a Banco</option>
              <option value="TRASLADO_BANCO_A_EFECTIVO">Traslado Banco a Efectivo</option>
            </select>
          </div>

          <!-- Selector de Subtipo según Modo BASE -->
          <div v-else-if="mode === 'BASE'">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tipo de Inyección *
            </label>
            <select
              v-model="movementType"
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            >
              <option value="BASE_INICIAL">Base Inicial de Caja</option>
              <option value="APORTE_SOCIO">Aporte Extraordinario de Socio</option>
            </select>
          </div>

          <!-- Selector de Subtipo según Modo WITHDRAW -->
          <div v-else-if="mode === 'WITHDRAW'">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tipo de Egreso *
            </label>
            <select
              v-model="movementType"
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            >
              <option value="RETIRO_BASE">Retiro de Base de Caja</option>
              <option value="DEVOLUCION_APORTE">Devolución / Reintegro de Aporte a Socio</option>
            </select>
          </div>

          <div v-else-if="mode === 'ADJUST'">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Naturaleza del Ajuste *
            </label>
            <select
              v-model="movementType"
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            >
              <option value="AJUSTE_CAJA">Ajuste General de Cuadre</option>
              <option value="AJUSTE_SOBRANTE">Sobrante de Caja (Ingreso a favor)</option>
              <option value="AJUSTE_FALTANTE">Faltante de Caja (Egreso / Pérdida / 4x1000)</option>
            </select>
          </div>

          <!-- Selector de Socio si es Aporte o Devolución -->
          <div v-if="requiresPartner" class="rounded-2xl border border-brand-200 bg-brand-50/50 p-3.5 dark:border-brand-900/50 dark:bg-brand-950/20">
            <label class="block text-xs font-extrabold text-brand-900 dark:text-brand-300 mb-1.5">
              {{ movementType === 'APORTE_SOCIO' ? 'Socio que realiza el aporte *' : 'Socio al que se le reintegra el aporte *' }}
            </label>
            <div v-if="isLoadingPartners" class="text-xs font-semibold text-slate-500">
              Cargando lista de socios...
            </div>
            <select
              v-else
              v-model="selectedPartnerId"
              required
              class="w-full rounded-xl border border-brand-300 bg-surface-light-card px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-brand-800 dark:bg-surface-dark-card dark:text-white"
            >
              <option value="" disabled>Selecciona el socio correspondiente...</option>
              <option v-for="partner in partnersList" :key="partner.id" :value="partner.id">
                {{ partner.fullName }} ({{ partner.role || 'Socio' }})
              </option>
            </select>
            <p class="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {{ movementType === 'APORTE_SOCIO' ? 'Quedará registrado en la trazabilidad de aportes de capital.' : 'Se asentará como devolución formal del aporte de capital.' }}
            </p>
          </div>

          <!-- Resumen y Cálculo Interactivo de Devolución de Aporte -->
          <div
            v-if="movementType === 'DEVOLUCION_APORTE' && selectedPartnerId && currentPartnerBalance"
            class="space-y-3 rounded-2xl border p-4 transition-all"
            :class="
              partnerReturnCalc?.isExceeded
                ? 'border-rose-300 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/30'
                : 'border-brand-200/80 bg-brand-50/40 dark:border-brand-900/40 dark:bg-brand-950/20'
            "
          >
            <div class="flex items-center justify-between border-b pb-2" :class="partnerReturnCalc?.isExceeded ? 'border-rose-200 dark:border-rose-900/40' : 'border-brand-100 dark:border-brand-900/40'">
              <div class="flex items-center gap-2">
                <Calculator class="h-4 w-4" :class="partnerReturnCalc?.isExceeded ? 'text-rose-600' : 'text-brand-800 dark:text-brand-400'" />
                <span class="text-xs font-black" :class="partnerReturnCalc?.isExceeded ? 'text-rose-900 dark:text-rose-200' : 'text-brand-950 dark:text-brand-200'">
                  Aportes de {{ currentPartnerBalance.fullName }}
                </span>
              </div>
              <button
                v-if="currentPartnerBalance.available > 0"
                type="button"
                @click="applyMaxAmount(currentPartnerBalance.available)"
                class="rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider transition-colors"
                :class="
                  partnerReturnCalc?.isExceeded
                    ? 'bg-rose-200 text-rose-800 hover:bg-rose-300 dark:bg-rose-900 dark:text-rose-200'
                    : 'bg-brand-100 text-brand-800 hover:bg-brand-200 dark:bg-brand-900/60 dark:text-brand-200'
                "
              >
                Retirar Todo ({{ formatCurrency(currentPartnerBalance.available) }})
              </button>
            </div>

            <!-- 3 Métricas: Aporte Total, Ya Devuelto, Saldo Disponible -->
            <div class="grid grid-cols-3 gap-2 text-center">
              <div class="rounded-xl bg-surface-light-card p-2 shadow-xs dark:bg-surface-dark-card border border-slate-100 dark:border-slate-800">
                <span class="block text-[10px] font-bold text-slate-500 dark:text-slate-400">Total Aportado</span>
                <span class="text-xs font-extrabold text-brand-900 dark:text-brand-300">
                  {{ formatCurrency(currentPartnerBalance.totalContributed) }}
                </span>
              </div>
              <div class="rounded-xl bg-surface-light-card p-2 shadow-xs dark:bg-surface-dark-card border border-slate-100 dark:border-slate-800">
                <span class="block text-[10px] font-bold text-slate-500 dark:text-slate-400">Ya Devuelto</span>
                <span class="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  {{ formatCurrency(currentPartnerBalance.totalReturned) }}
                </span>
              </div>
              <div
                class="rounded-xl p-2 shadow-xs border"
                :class="
                  currentPartnerBalance.available > 0
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                    : 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700'
                "
              >
                <span class="block text-[10px] font-bold">Disponible</span>
                <span class="text-xs font-black">
                  {{ formatCurrency(currentPartnerBalance.available) }}
                </span>
              </div>
            </div>

            <!-- Proyección Interactiva según el Monto a Retirar -->
            <div v-if="parsedAmount > 0" class="pt-1">
              <!-- Caso Error: Excede lo aportado -->
              <div
                v-if="partnerReturnCalc?.isExceeded"
                class="flex items-start gap-2 rounded-xl bg-rose-100/80 p-2.5 text-xs text-rose-900 dark:bg-rose-900/40 dark:text-rose-200 border border-rose-200 dark:border-rose-800"
              >
                <AlertCircle class="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <div class="flex-1">
                  <p class="font-extrabold">No puede retirar más de lo que aportó</p>
                  <p class="text-[11px] mt-0.5">
                    El socio solo tiene <strong>{{ formatCurrency(partnerReturnCalc?.available || 0) }}</strong> disponibles de saldo de aportes. Estás intentando retirar {{ formatCurrency(parsedAmount) }}.
                  </p>
                </div>
              </div>

              <!-- Caso Válido: Mostrando cálculo de descuento -->
              <div
                v-else
                class="flex items-center justify-between rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-200 border border-emerald-200/70 dark:border-emerald-800/60"
              >
                <div class="flex items-center gap-1.5">
                  <CheckCircle2 class="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Descontando: <strong>-{{ formatCurrency(parsedAmount) }}</strong></span>
                </div>
                <div class="text-right">
                  <span class="text-[10px] block text-emerald-700 dark:text-emerald-400 font-semibold">Le quedará al socio</span>
                  <span class="font-black text-xs text-emerald-800 dark:text-emerald-300">
                    {{ formatCurrency(partnerReturnCalc?.remaining || 0) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Resumen y Cálculo Interactivo de Retiro de Base -->
          <div
            v-if="movementType === 'RETIRO_BASE' && currentBaseBalance"
            class="space-y-3 rounded-2xl border p-4 transition-all"
            :class="
              baseWithdrawCalc?.isExceeded
                ? 'border-rose-300 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/30'
                : 'border-amber-200/80 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20'
            "
          >
            <div class="flex items-center justify-between border-b pb-2" :class="baseWithdrawCalc?.isExceeded ? 'border-rose-200 dark:border-rose-900/40' : 'border-amber-100 dark:border-amber-900/40'">
              <div class="flex items-center gap-2">
                <Calculator class="h-4 w-4" :class="baseWithdrawCalc?.isExceeded ? 'text-rose-600' : 'text-amber-700 dark:text-amber-400'" />
                <span class="text-xs font-black" :class="baseWithdrawCalc?.isExceeded ? 'text-rose-900 dark:text-rose-200' : 'text-amber-950 dark:text-amber-200'">
                  Disponibilidad de Base en Caja
                </span>
              </div>
              <button
                v-if="currentBaseBalance.available > 0"
                type="button"
                @click="applyMaxAmount(currentBaseBalance.available)"
                class="rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider transition-colors"
                :class="
                  baseWithdrawCalc?.isExceeded
                    ? 'bg-rose-200 text-rose-800 hover:bg-rose-300 dark:bg-rose-900 dark:text-rose-200'
                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/60 dark:text-amber-200'
                "
              >
                Retirar Todo ({{ formatCurrency(currentBaseBalance.available) }})
              </button>
            </div>

            <!-- 3 Métricas: Base Inyectada, Retirada Previa, Disponible -->
            <div class="grid grid-cols-3 gap-2 text-center">
              <div class="rounded-xl bg-surface-light-card p-2 shadow-xs dark:bg-surface-dark-card border border-slate-100 dark:border-slate-800">
                <span class="block text-[10px] font-bold text-slate-500 dark:text-slate-400">Base Inyectada</span>
                <span class="text-xs font-extrabold text-amber-800 dark:text-amber-300">
                  {{ formatCurrency(currentBaseBalance.totalInjected) }}
                </span>
              </div>
              <div class="rounded-xl bg-surface-light-card p-2 shadow-xs dark:bg-surface-dark-card border border-slate-100 dark:border-slate-800">
                <span class="block text-[10px] font-bold text-slate-500 dark:text-slate-400">Retiros Previos</span>
                <span class="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  {{ formatCurrency(currentBaseBalance.totalWithdrawn) }}
                </span>
              </div>
              <div
                class="rounded-xl p-2 shadow-xs border"
                :class="
                  currentBaseBalance.available > 0
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                    : 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700'
                "
              >
                <span class="block text-[10px] font-bold">Base Disponible</span>
                <span class="text-xs font-black">
                  {{ formatCurrency(currentBaseBalance.available) }}
                </span>
              </div>
            </div>

            <!-- Proyección Interactiva de Retiro de Base -->
            <div v-if="parsedAmount > 0" class="pt-1">
              <!-- Caso Error: Excede la base disponible -->
              <div
                v-if="baseWithdrawCalc?.isExceeded"
                class="flex items-start gap-2 rounded-xl bg-rose-100/80 p-2.5 text-xs text-rose-900 dark:bg-rose-900/40 dark:text-rose-200 border border-rose-200 dark:border-rose-800"
              >
                <AlertCircle class="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <div class="flex-1">
                  <p class="font-extrabold">No puede retirar más de la base disponible</p>
                  <p class="text-[11px] mt-0.5">
                    La caja solo dispone de <strong>{{ formatCurrency(baseWithdrawCalc?.available || 0) }}</strong> de base. Estás intentando retirar {{ formatCurrency(parsedAmount) }}.
                  </p>
                </div>
              </div>

              <!-- Caso Válido: Mostrando cálculo de descuento de base -->
              <div
                v-else
                class="flex items-center justify-between rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-200 border border-emerald-200/70 dark:border-emerald-800/60"
              >
                <div class="flex items-center gap-1.5">
                  <CheckCircle2 class="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Descontando de base: <strong>-{{ formatCurrency(parsedAmount) }}</strong></span>
                </div>
                <div class="text-right">
                  <span class="text-[10px] block text-emerald-700 dark:text-emerald-400 font-semibold">Quedará en caja</span>
                  <span class="font-black text-xs text-emerald-800 dark:text-emerald-300">
                    {{ formatCurrency(baseWithdrawCalc?.remaining || 0) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Resumen de Aporte Extraordinario de Socio (Inyección) -->
          <div
            v-if="movementType === 'APORTE_SOCIO' && selectedPartnerId && currentPartnerBalance"
            class="rounded-2xl border border-brand-200/70 bg-brand-50/30 p-3.5 text-xs dark:border-brand-900/40 dark:bg-brand-950/20 space-y-1.5"
          >
            <div class="flex items-center justify-between">
              <span class="font-bold text-slate-600 dark:text-slate-400">Aportes acumulados activos del socio:</span>
              <span class="font-extrabold text-brand-900 dark:text-brand-300">
                {{ formatCurrency(currentPartnerBalance.available) }}
              </span>
            </div>
            <div v-if="parsedAmount > 0" class="flex items-center justify-between pt-1 border-t border-brand-100 dark:border-brand-900/40 text-[11px]">
              <span class="text-emerald-700 dark:text-emerald-400 font-bold">Nuevo saldo aportado proyectado:</span>
              <span class="font-black text-emerald-800 dark:text-emerald-300">
                {{ formatCurrency(currentPartnerBalance.available + parsedAmount) }}
              </span>
            </div>
          </div>

          <!-- Monto y Medio de Pago -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Monto ($ COP) *
                </label>
                <!-- Atajos rápidos si hay tope disponible -->
                <button
                  v-if="movementType === 'DEVOLUCION_APORTE' && currentPartnerBalance && currentPartnerBalance.available > 0"
                  type="button"
                  @click="applyMaxAmount(currentPartnerBalance.available)"
                  class="text-[10px] font-bold text-brand-800 hover:underline dark:text-brand-400"
                >
                  Máx: {{ formatCurrency(currentPartnerBalance.available) }}
                </button>
                <button
                  v-else-if="movementType === 'RETIRO_BASE' && currentBaseBalance && currentBaseBalance.available > 0"
                  type="button"
                  @click="applyMaxAmount(currentBaseBalance.available)"
                  class="text-[10px] font-bold text-amber-700 hover:underline dark:text-amber-400"
                >
                  Máx: {{ formatCurrency(currentBaseBalance.available) }}
                </button>
              </div>

              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                <input
                  v-model.number="amount"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="50000"
                  required
                  class="w-full rounded-xl border bg-surface-light-canvas py-2.5 pl-8 pr-3 text-sm font-extrabold placeholder-slate-400 focus:outline-none dark:bg-surface-dark-canvas"
                  :class="
                    isAmountExceeded
                      ? 'border-rose-400 text-rose-900 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 dark:border-rose-700 dark:text-rose-200'
                      : 'border-surface-light-border text-slate-900 focus:border-brand-800 dark:border-surface-dark-border dark:text-white'
                  "
                />
              </div>

              <!-- Mensaje de Alerta bajo el input -->
              <p v-if="isAmountExceeded" class="mt-1 text-[11px] font-extrabold text-rose-600 dark:text-rose-400">
                ⚠️ El monto supera el saldo disponible permitido.
              </p>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Canal / Medio de Pago
              </label>
              <select
                v-model="paymentMethod"
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              >
                <option value="EFECTIVO">Efectivo (Caja Menor)</option>
                <option value="NEQUI">Nequi</option>
              </select>
            </div>
          </div>

          <!-- Concepto y Fecha -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Concepto / Motivo *
              </label>
              <input
                v-model="concept"
                type="text"
                placeholder="Ej: Base para cambio de mañana..."
                required
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Fecha del Movimiento
              </label>
              <input
                v-model="movementDate"
                type="date"
                required
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>
          </div>

          <!-- Notas -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Notas Adicionales (Opcional)
            </label>
            <input
              v-model="notes"
              type="text"
              placeholder="Ej: Autorizado por Edier"
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            />
          </div>

          <!-- Error Alert -->
          <div
            v-if="errorMessage"
            class="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
          >
            <AlertCircle class="h-4 w-4 shrink-0" />
            <span>{{ errorMessage }}</span>
          </div>

          </div>

          <!-- Botones de Acción Fijos en el Fondo -->
          <div class="flex shrink-0 items-center justify-end gap-2.5 border-t border-surface-light-border bg-surface-light-card p-4 sm:p-6 dark:border-surface-dark-border dark:bg-surface-dark-card">
            <button
              type="button"
              @click="handleClose"
              class="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="!isFormValid || isSubmitting"
              class="inline-flex items-center gap-2 rounded-xl bg-hero-gradient px-5 py-2.5 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95 disabled:opacity-50"
            >
              <Pencil v-if="mode === 'EDIT'" class="h-4 w-4 stroke-[2.5]" />
              <Plus v-else class="h-4 w-4 stroke-[2.5]" />
              <span>{{ isSubmitting ? 'Guardando...' : mode === 'EDIT' ? 'Guardar Cambios' : 'Asentar Movimiento' }}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
