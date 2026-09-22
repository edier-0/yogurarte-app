<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useOperationsStore, type Order, type DeliveryFilterChip, type DeliveryStatus } from '@/stores/operations.store';
import PaymentModal from '@/components/operations/PaymentModal.vue';
import {
  Bike,
  ChefHat,
  Search,
  RotateCw,
  PhoneCall,
  MessageCircle,
  CheckCircle2,
  MapPin,
  CalendarCheck,
  BadgeDollarSign,
  PackageCheck,
  Package,
  ClipboardList,
  Milk
} from 'lucide-vue-next';

const store = useOperationsStore();

const isPaymentModalOpen = ref(false);
const orderForPayment = ref<Order | null>(null);

onMounted(() => {
  if (store.orders.length === 0) {
    store.fetchOrders();
  }
  if (store.drivers.length === 0) {
    store.fetchDrivers();
  }
});

const deliveryChips = [
  { id: 'ALL' as DeliveryFilterChip, label: 'Todos', icon: ClipboardList, countKey: 'totalOrdersCount' as const },
  { id: 'PREPARING' as DeliveryFilterChip, label: 'En Preparación', icon: ChefHat, countKey: 'countDeliveriesPreparing' as const },
  { id: 'IN_ROUTE' as DeliveryFilterChip, label: 'En Camino', icon: Bike, countKey: 'countDeliveriesInRoute' as const },
  { id: 'DELIVERED' as DeliveryFilterChip, label: 'Entregados', icon: CheckCircle2, countKey: 'countDeliveriesDelivered' as const },
];

const advanceStatus = async (order: Order) => {
  if (order.deliveryStatus === 'PENDING' || order.deliveryStatus === 'PREPARING' || order.deliveryStatus === 'READY_FOR_DISPATCH') {
    await store.updateDeliveryStatus(order.id, { deliveryStatus: 'IN_ROUTE' });
  } else if (order.deliveryStatus === 'IN_ROUTE') {
    if (store.getPendingBalance(order) > 0) {
      orderForPayment.value = order;
      isPaymentModalOpen.value = true;
    } else {
      await store.updateDeliveryStatus(order.id, { deliveryStatus: 'DELIVERED' });
    }
  }
};

const markAsDelivered = async (order: Order) => {
  if (store.getPendingBalance(order) > 0) {
    orderForPayment.value = order;
    isPaymentModalOpen.value = true;
  } else {
    await store.updateDeliveryStatus(order.id, { deliveryStatus: 'DELIVERED' });
  }
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

const getDeliveryBadge = (status: DeliveryStatus) => {
  switch (status) {
    case 'DELIVERED':
      return { label: 'Entregado', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' };
    case 'IN_ROUTE':
      return { label: 'En Camino', class: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400' };
    case 'READY_FOR_DISPATCH':
      return { label: 'Listo Despacho', class: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400' };
    case 'PREPARING':
      return { label: 'En Preparación', class: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400' };
    case 'CANCELLED':
      return { label: 'Cancelado', class: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400' };
    case 'PENDING':
    default:
      return { label: 'Pendiente', class: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400' };
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header Repartos -->
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Mis Domicilios de Hoy
        </h1>
        <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Ruta móvil, contacto directo con clientes y gestión ágil de cobros en calle.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <!-- Botón Reprogramar Vencidos -->
        <button
          type="button"
          @click="store.rescheduleOverdue()"
          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-surface-light-card px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all active:scale-95 hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-dark-card dark:text-slate-200"
          title="Reprogramar pedidos vencidos de días anteriores para hoy"
        >
          <CalendarCheck class="h-4 w-4 text-brand-800 dark:text-brand-darkText stroke-[1.75]" />
          <span>Reprogramar</span>
        </button>

        <!-- Botón Refrescar -->
        <button
          type="button"
          @click="store.fetchOrders()"
          :disabled="store.isLoading"
          class="inline-flex items-center gap-1.5 rounded-xl bg-hero-gradient px-3.5 py-2 text-xs font-bold text-white shadow-card transition-all active:scale-95 disabled:opacity-50"
          title="Actualizar lista"
        >
          <RotateCw class="h-4 w-4 stroke-[1.75]" :class="{ 'animate-spin': store.isLoading }" />
          <span class="hidden sm:inline">Refrescar</span>
        </button>
      </div>
    </div>

    <!-- Fila Superior Unificada: Buscador + Selector de Repartidor -->
    <div class="flex flex-col gap-2.5 rounded-2xl border border-surface-light-border bg-surface-light-card p-3 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card sm:flex-row sm:items-center">
      <!-- Buscador Rápido -->
      <div class="relative flex-1">
        <Search class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[1.75]" />
        <input
          type="text"
          v-model="store.deliverySearchQuery"
          placeholder="Buscar por cliente, dirección o comanda..."
          class="w-full rounded-xl border border-slate-200 bg-surface-light-canvas py-2 pl-10 pr-4 text-xs font-semibold text-slate-800 placeholder-slate-400 transition-colors focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-surface-dark-canvas dark:text-slate-100"
        />
      </div>

      <!-- Selector Compacto de Repartidor (Sin emojis sueltos) -->
      <div class="w-full sm:w-64">
        <select
          :value="store.deliveryDriverFilter"
          @change="store.setDeliveryDriverFilter(($event.target as HTMLSelectElement).value)"
          class="w-full rounded-xl border border-slate-200 bg-surface-light-canvas py-2 px-3 text-xs font-bold text-slate-800 transition-colors focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-surface-dark-canvas dark:text-slate-200"
        >
          <option value="ALL">Todos los Repartidores</option>
          <option value="UNASSIGNED">Sin Repartidor Asignado</option>
          <option v-for="d in store.drivers" :key="d.id" :value="String(d.id)">
            {{ d.fullName }}
          </option>
        </select>
      </div>
    </div>

    <!-- Tira Táctil de 4 Chips Operativos con Lucide Icons -->
    <div class="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
      <button
        v-for="chip in deliveryChips"
        :key="chip.id"
        type="button"
        @click="store.setDeliveryChip(chip.id)"
        class="inline-flex shrink-0 items-center gap-2 rounded-2xl px-3.5 py-2.5 text-xs font-extrabold transition-all active:scale-95"
        :class="[
          store.deliveryChip === chip.id
            ? 'bg-dairy-500 text-white shadow-elevated'
            : 'border border-slate-200 bg-surface-light-card text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800'
        ]"
      >
        <component :is="chip.icon" class="h-4 w-4 stroke-[1.75]" />
        <span>{{ chip.label }}</span>
        <span
          class="rounded-full px-2 py-0.5 text-[10px] font-black"
          :class="store.deliveryChip === chip.id ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'"
        >
          {{ store[chip.countKey] }}
        </span>
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-if="store.filteredDeliveries.length === 0"
      class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-surface-light-card/50 py-16 text-center dark:border-slate-700 dark:bg-surface-dark-card/50"
    >
      <Package class="h-12 w-12 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
      <h3 class="mt-4 text-base font-extrabold text-slate-700 dark:text-slate-300">
        No hay domicilios para este filtro
      </h3>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Revisa los filtros de repartidor o el estado de entrega seleccionado.
      </p>
    </div>

    <!-- Grilla de Entregas Táctiles con v-auto-animate -->
    <div
      v-else
      v-auto-animate
      class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      <div
        v-for="order in store.filteredDeliveries"
        :key="order.id"
        class="group relative flex flex-col justify-between rounded-3xl border border-surface-light-border bg-surface-light-card p-5 shadow-card transition-all hover:shadow-elevated dark:border-surface-dark-border dark:bg-surface-dark-card"
      >
        <div>
          <!-- Header: Order Code & Delivery Badge -->
          <div class="flex items-center justify-between">
            <span class="font-mono text-xs font-black text-brand-800 dark:text-brand-darkText">
              {{ order.orderCode }}
            </span>
            <span
              class="rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide"
              :class="getDeliveryBadge(order.deliveryStatus).class"
            >
              {{ getDeliveryBadge(order.deliveryStatus).label }}
            </span>
          </div>

          <!-- Customer & Address (Destacado para el Repartidor) -->
          <div class="mt-3">
            <h3 class="text-base font-black text-slate-900 dark:text-white">
              {{ order.customer?.fullName || order.customerName || 'Cliente' }}
            </h3>

            <div class="mt-2 flex items-start gap-2 rounded-xl bg-surface-light-canvas p-3 dark:bg-surface-dark-canvas">
              <MapPin class="h-4 w-4 shrink-0 text-accent-500 mt-0.5 stroke-[1.75]" />
              <div class="text-xs font-bold text-slate-700 dark:text-slate-200">
                <span>{{ order.customerAddress || order.customer?.address || 'Sin dirección registrada' }}</span>
                <span v-if="order.customer?.neighborhood" class="block text-[11px] font-semibold text-slate-400">
                  Barrio: {{ order.customer.neighborhood }}
                </span>
              </div>
            </div>
          </div>

          <!-- Products summary with Milk icon -->
          <div v-if="order.items && order.items.length > 0" class="mt-3 space-y-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <div v-for="it in order.items" :key="it.id || it.flavor" class="flex items-center justify-between">
              <span class="flex items-center gap-1.5">
                <Milk class="h-3.5 w-3.5 text-dairy-500 stroke-[1.75]" />
                <span>{{ it.quantity }}x {{ it.flavor }} ({{ it.bottleSize }})</span>
              </span>
              <span class="font-bold">{{ formatCurrency(it.totalPrice) }}</span>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="order.notes && order.notes.trim()" class="mt-2 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
            <strong>Instrucciones:</strong> {{ order.notes }}
          </div>
        </div>

        <!-- Footer: Cobro & Botones de Un Solo Toque (Touch Target >= 44px) -->
        <div class="mt-5 border-t border-surface-light-border pt-3.5 dark:border-surface-dark-border space-y-3">
          <!-- Balance Summary -->
          <div class="flex items-center justify-between">
            <div class="text-xs text-slate-400">
              <span>Total: </span>
              <span class="font-bold text-slate-700 dark:text-slate-200">{{ formatCurrency(order.totalAmount) }}</span>
            </div>

            <div class="text-right">
              <span class="text-xs font-bold text-slate-400">Cobrar al Cliente: </span>
              <span
                class="text-sm font-black"
                :class="store.getPendingBalance(order) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'"
              >
                {{ store.getPendingBalance(order) > 0 ? formatCurrency(store.getPendingBalance(order)) : 'Paz y Salvo' }}
              </span>
            </div>
          </div>

          <!-- Fila de Botones de Un Solo Toque (Touch Area >= 44x44 px) -->
          <div class="grid grid-cols-3 gap-2">
            <!-- 1. Botón Llamar (tel:) con PhoneCall -->
            <a
              v-if="order.customer?.phone || order.customerPhone"
              :href="`tel:${order.customer?.phone || order.customerPhone}`"
              class="flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-slate-100 text-xs font-black text-slate-800 transition-all active:scale-90 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              title="Llamar al cliente"
            >
              <PhoneCall class="h-4 w-4 text-dairy-500 stroke-[1.75]" />
              <span>Llamar</span>
            </a>
            <div v-else class="flex h-11 items-center justify-center rounded-2xl bg-slate-50 text-xs text-slate-400 dark:bg-slate-800/40">
              Sin Tel.
            </div>

            <!-- 2. Botón WhatsApp Inteligente con MessageCircle -->
            <button
              type="button"
              @click="store.dispatchWhatsApp(order.id)"
              class="flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-emerald-50 text-xs font-black text-emerald-700 transition-all active:scale-90 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
              title="Enviar mensaje de entrega por WhatsApp"
            >
              <MessageCircle class="h-4 w-4 stroke-[1.75]" />
              <span>WhatsApp</span>
            </button>

            <!-- 3. Botón de Cobro Rápido / Entregar con BadgeDollarSign / CheckCircle2 -->
            <button
              type="button"
              @click="markAsDelivered(order)"
              class="flex h-11 items-center justify-center gap-1.5 rounded-2xl px-2 text-xs font-black text-white shadow-card transition-all active:scale-90"
              :class="order.deliveryStatus === 'DELIVERED' ? 'bg-slate-600' : store.getPendingBalance(order) > 0 ? 'bg-accent-500 hover:bg-accent-600 shadow-accent' : 'bg-natural-500 hover:bg-natural-600'"
              title="Cobrar o registrar entrega"
            >
              <BadgeDollarSign v-if="store.getPendingBalance(order) > 0" class="h-4 w-4 stroke-[1.75]" />
              <CheckCircle2 v-else class="h-4 w-4 stroke-[1.75]" />
              <span>{{ order.deliveryStatus === 'DELIVERED' ? 'Entregado' : store.getPendingBalance(order) > 0 ? 'Cobrar' : 'Entregar' }}</span>
            </button>
          </div>

          <!-- Acción Rápida de Avance de Estado -->
          <div v-if="order.deliveryStatus !== 'DELIVERED' && order.deliveryStatus !== 'CANCELLED'" class="pt-1">
            <button
              type="button"
              @click="advanceStatus(order)"
              class="flex w-full h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-surface-light-card text-xs font-extrabold text-slate-700 transition-all active:scale-95 hover:bg-slate-100 dark:border-slate-700 dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Bike v-if="order.deliveryStatus !== 'IN_ROUTE'" class="h-4 w-4 text-dairy-500 stroke-[1.75]" />
              <PackageCheck v-else class="h-4 w-4 text-natural-500 stroke-[1.75]" />
              <span>
                {{ order.deliveryStatus === 'IN_ROUTE' ? 'Finalizar Entrega' : 'Iniciar Ruta de Domicilio' }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Cobro / Abono (Reka UI) -->
    <PaymentModal
      v-model:open="isPaymentModalOpen"
      :order="orderForPayment"
      @saved="store.fetchOrders()"
    />
  </div>
</template>
