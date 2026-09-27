<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Gift,
  User,
  Phone,
  MapPin,
  CalendarClock,
  GitMerge,
  UserX,
  Plus,
  ShoppingBag,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-vue-next';
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from 'reka-ui';

export interface ClientChatInfoProps {
  conversation: any;
  showCloseButton?: boolean;
}

const props = defineProps<ClientChatInfoProps>();

const emit = defineEmits<{
  (e: 'open-recurring', customer: any): void;
  (e: 'open-merge', conversation: any): void;
  (e: 'unlink', conversation: any): void;
  (e: 'create-order', customer: any): void;
  (e: 'close'): void;
}>();

const isUnlinkModalOpen = ref(false);

const customer = computed(() => props.conversation?.customer || null);

const loyalty = computed(() => {
  const c = customer.value;
  if (!c) return null;
  if (c.loyaltySummary) return c.loyaltySummary;

  const totalBottles = c.orders?.reduce((sum: number, o: any) => sum + (o.quantityBottles || 1), 0) || 0;
  const redeemed = c.loyaltyRedeemedCount || 0;
  const netBottles = Math.max(0, totalBottles - redeemed * 10);
  const currentCycle = netBottles % 10;
  const rewardsAvailable = Math.floor(netBottles / 10);
  const progressPercent = Math.min(100, Math.round((currentCycle / 10) * 100));
  const bottlesNeeded = Math.max(0, 10 - currentCycle);

  return {
    totalBottles,
    redeemedCount: redeemed,
    currentCycleBottles: currentCycle,
    rewardsAvailable,
    progressPercent,
    bottlesNeeded,
  };
});

const recentOrders = computed(() => {
  return customer.value?.orders || [];
});

function formatCurrency(val?: number | null) {
  if (val == null) return '$0';
  return `$${new Intl.NumberFormat('es-CO').format(val)}`;
}

function formatOrderDate(dateStr?: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
  }).format(d);
}

function handleConfirmUnlink() {
  isUnlinkModalOpen.value = false;
  emit('unlink', props.conversation);
}
</script>

<template>
  <div class="flex flex-col h-full min-h-0 bg-surface-light-card dark:bg-surface-dark-card overflow-hidden">
    <!-- Header del Panel Lateral -->
    <div class="shrink-0 p-3.5 border-b border-surface-light-border dark:border-surface-dark-border flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <User class="h-4 w-4 text-brand-800 dark:text-brand-darkText stroke-[2.5]" />
        <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
          Información del Cliente
        </h3>
      </div>
      <button
        v-if="showCloseButton"
        type="button"
        @click="emit('close')"
        class="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title="Cerrar panel"
      >
        <X class="h-4 w-4" />
      </button>
    </div>

    <!-- Contenido Scrollable -->
    <div class="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 [scrollbar-width:thin]">
      <!-- ============================================== -->
      <!-- 1. CARD DE FIDELIZACIÓN (10 + 1 GRATIS)         -->
      <!-- ============================================== -->
      <div
        v-if="customer && loyalty"
        class="rounded-2xl border border-surface-light-border bg-hero-gradient-subtle dark:border-surface-dark-border dark:bg-brand-950/20 p-4 relative overflow-hidden shadow-xs"
      >
        <div class="flex items-center justify-between gap-2 mb-2">
          <div class="flex items-center gap-1.5">
            <Gift class="h-4 w-4 text-brand-800 dark:text-brand-darkText stroke-[2.5]" />
            <h4 class="text-xs font-black text-slate-900 dark:text-white">
              Fidelización 10+1
            </h4>
          </div>
          <span class="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-black text-brand-800 dark:bg-brand-900/50 dark:text-brand-darkText">
            {{ loyalty.currentCycleBottles }} / 10 Botellas
          </span>
        </div>

        <!-- Barra de Progreso Visual -->
        <div class="mt-2.5">
          <div class="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              class="h-full rounded-full bg-hero-gradient transition-all duration-500 shadow-xs"
              :style="{ width: `${loyalty.progressPercent}%` }"
            />
          </div>
          <div class="mt-1 flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
            <span>Progreso del ciclo</span>
            <span>{{ loyalty.progressPercent }}%</span>
          </div>
        </div>

        <!-- Banner de Recompensa Disponible o Texto de Incentivo -->
        <div
          v-if="loyalty.rewardsAvailable > 0"
          class="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2 text-emerald-800 dark:text-emerald-300"
        >
          <Sparkles class="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span class="text-[11px] font-extrabold">
            ¡{{ loyalty.rewardsAvailable }} botella(s) gratis disponible(s) para canje!
          </span>
        </div>
        <div
          v-else
          class="mt-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 leading-snug"
        >
          Faltan <strong class="text-brand-800 dark:text-brand-darkText font-black">{{ loyalty.bottlesNeeded }} botellas</strong> para reclamar la botella de yogur gratis.
        </div>

        <!-- Mini Métricas Acumuladas -->
        <div class="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-brand-100 dark:border-brand-900/40 text-[11px]">
          <div>
            <span class="text-[10px] text-slate-400 block font-bold">Total Botellas:</span>
            <span class="font-extrabold text-slate-800 dark:text-slate-200">{{ loyalty.totalBottles }}</span>
          </div>
          <div>
            <span class="text-[10px] text-slate-400 block font-bold">Redimidas:</span>
            <span class="font-extrabold text-slate-800 dark:text-slate-200">{{ loyalty.redeemedCount }}</span>
          </div>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- 2. CARD DE DATOS DEL CLIENTE                   -->
      <!-- ============================================== -->
      <div class="rounded-2xl border border-surface-light-border bg-surface-light-canvas/40 dark:border-surface-dark-border dark:bg-surface-dark-canvas/40 p-4 space-y-2.5">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Datos Registrados
          </span>
          <span
            v-if="customer"
            class="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-black text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
          >
            <CheckCircle2 class="h-2.5 w-2.5" /> Vinculado
          </span>
          <span
            v-else
            class="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-black text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
          >
            <AlertCircle class="h-2.5 w-2.5" /> Sin Vincular
          </span>
        </div>

        <div>
          <h4 class="text-xs font-black text-slate-900 dark:text-white">
            {{ customer?.fullName || conversation?.contactName || 'Contacto de WhatsApp' }}
          </h4>
          <p class="text-[11px] font-mono text-slate-400">
            {{ conversation?.remoteJid }}
          </p>
        </div>

        <div class="space-y-1.5 pt-1 text-xs text-slate-600 dark:text-slate-300">
          <div class="flex items-center gap-2">
            <Phone class="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <a
              :href="`tel:${customer?.phone || conversation?.phoneNumber}`"
              class="font-bold hover:text-brand-800 dark:hover:text-brand-darkText"
            >
              {{ customer?.phone || conversation?.phoneNumber }}
            </a>
          </div>

          <div v-if="customer?.address" class="flex items-start gap-2">
            <MapPin class="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span class="leading-tight text-[11px]">
              {{ customer.address }}
              <span v-if="customer.neighborhood" class="text-slate-400 font-semibold block">
                ({{ customer.neighborhood }})
              </span>
            </span>
          </div>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- 3. BOTONERA DE ACCIONES RÁPIDAS                 -->
      <!-- ============================================== -->
      <div class="space-y-2">
        <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block px-1">
          Acciones Rápidas
        </span>

        <div class="grid grid-cols-1 gap-2">
          <!-- Botón Programar Frecuente -->
          <button
            type="button"
            @click="emit('open-recurring', customer)"
            :disabled="!customer"
            class="w-full inline-flex items-center justify-between rounded-xl border border-surface-light-border bg-surface-light-card px-3.5 py-2.5 text-xs font-extrabold text-slate-800 hover:bg-slate-50 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-200 dark:hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-40"
          >
            <div class="flex items-center gap-2">
              <CalendarClock class="h-4 w-4 text-brand-800 dark:text-brand-darkText stroke-[2]" />
              <span>Programar Frecuente</span>
            </div>
            <ExternalLink class="h-3.5 w-3.5 text-slate-400" />
          </button>

          <!-- Botón Cambiar o Unificar -->
          <button
            type="button"
            @click="emit('open-merge', conversation)"
            class="w-full inline-flex items-center justify-between rounded-xl border border-surface-light-border bg-surface-light-card px-3.5 py-2.5 text-xs font-extrabold text-slate-800 hover:bg-slate-50 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-200 dark:hover:bg-slate-800 transition-colors shadow-xs"
          >
            <div class="flex items-center gap-2">
              <GitMerge class="h-4 w-4 text-indigo-600 dark:text-indigo-400 stroke-[2]" />
              <span>{{ customer ? 'Cambiar o Unificar' : 'Vincular a Cliente' }}</span>
            </div>
            <ExternalLink class="h-3.5 w-3.5 text-slate-400" />
          </button>

          <!-- Botón Desvincular Cliente -->
          <button
            v-if="customer"
            type="button"
            @click="isUnlinkModalOpen = true"
            class="w-full inline-flex items-center justify-between rounded-xl border border-rose-200/80 bg-rose-50/40 px-3.5 py-2.5 text-xs font-extrabold text-rose-700 hover:bg-rose-100/60 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300 dark:hover:bg-rose-950/40 transition-colors shadow-xs"
          >
            <div class="flex items-center gap-2">
              <UserX class="h-4 w-4 text-rose-600 dark:text-rose-400 stroke-[2]" />
              <span>Desvincular Chat</span>
            </div>
          </button>

          <!-- Botón Rápido Crear Pedido -->
          <button
            type="button"
            @click="emit('create-order', customer)"
            class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-hero-gradient px-3.5 py-2.5 text-xs font-black text-white shadow-card transition-transform active:scale-95"
          >
            <Plus class="h-4 w-4 stroke-[2.5]" />
            <span>Crear Pedido para Cliente</span>
          </button>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- 4. ÚLTIMOS PEDIDOS DEL CLIENTE                 -->
      <!-- ============================================== -->
      <div v-if="customer" class="space-y-2 pt-2">
        <div class="flex items-center justify-between px-1">
          <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Últimos Pedidos
          </span>
          <span class="text-[10px] font-bold text-slate-400">
            ({{ recentOrders.length }})
          </span>
        </div>

        <div v-if="recentOrders.length > 0" class="space-y-2">
          <div
            v-for="order in recentOrders"
            :key="order.id"
            class="rounded-xl border border-surface-light-border bg-surface-light-card p-3 dark:border-surface-dark-border dark:bg-surface-dark-card shadow-xs text-xs space-y-1"
          >
            <div class="flex items-center justify-between gap-1">
              <span class="font-extrabold text-slate-900 dark:text-white">
                #{{ order.orderNumber }}
              </span>
              <span class="text-[10px] font-bold text-slate-400">
                {{ formatOrderDate(order.orderDate) }}
              </span>
            </div>

            <div class="flex items-center justify-between gap-1 pt-1">
              <span class="font-black text-slate-800 dark:text-slate-200">
                {{ formatCurrency(order.totalAmount) }}
              </span>

              <!-- Badge de Pago -->
              <span
                class="rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase"
                :class="
                  order.paymentStatus === 'PAID'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : order.paymentStatus === 'PARTIAL'
                    ? 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300'
                    : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                "
              >
                {{ order.paymentStatus === 'PAID' ? 'Pagado' : order.paymentStatus === 'PARTIAL' ? 'Parcial' : 'Pendiente' }}
              </span>
            </div>
          </div>
        </div>

        <div
          v-else
          class="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs font-semibold text-slate-400 dark:border-slate-800"
        >
          <ShoppingBag class="mx-auto h-5 w-5 text-slate-300 dark:text-slate-700 mb-1" />
          Sin pedidos registrados aún.
        </div>
      </div>
    </div>

    <!-- Modal de Confirmación de Desvinculación -->
    <DialogRoot :open="isUnlinkModalOpen" @update:open="(val: boolean) => isUnlinkModalOpen = val">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity" />
        <DialogContent
          class="fixed left-1/2 top-1/2 z-50 w-[95%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-2xl transition-all focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
              <UserX class="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white">
                ¿Desvincular Cliente del Chat?
              </DialogTitle>
              <DialogDescription class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                El chat pasará a estado no vinculado
              </DialogDescription>
            </div>
          </div>

          <p class="mt-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Se desvinculará a <strong>{{ customer?.fullName }}</strong> de este chat. Todos los mensajes permanecerán intactos en el historial cronológico y podrás volver a vincularlo en cualquier momento.
          </p>

          <div class="mt-6 flex items-center justify-end gap-2.5">
            <button
              type="button"
              @click="isUnlinkModalOpen = false"
              class="rounded-xl border border-surface-light-border bg-surface-light-card px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              @click="handleConfirmUnlink"
              class="rounded-xl bg-rose-600 px-4 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-rose-700 active:scale-95"
            >
              Confirmar Desvinculación
            </button>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </div>
</template>
