<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useOperationsStore, type Order, type OrderFilterChip, type DeliveryStatus } from '@/stores/operations.store';
import OrderFormModal from '@/components/operations/OrderFormModal.vue';
import PaymentModal from '@/components/operations/PaymentModal.vue';
import {
  ShoppingBag,
  Search,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Bike,
  Plus,
  User,
  Phone,
  MessageCircle,
  BadgeDollarSign,
  Package,
  Edit2,
  MapPin,
  ClipboardList,
  Clock,
  Milk
} from 'lucide-vue-next';

const store = useOperationsStore();

// Modales
const isFormModalOpen = ref(false);
const orderToEdit = ref<Order | null>(null);

const isPaymentModalOpen = ref(false);
const orderForPayment = ref<Order | null>(null);

onMounted(() => {
  if (store.orders.length === 0) {
    store.fetchOrders();
  }
  if (store.drivers.length === 0) {
    store.fetchDrivers();
  }
  if (store.customers.length === 0) {
    store.fetchCustomers();
  }
});

const openNewOrder = () => {
  orderToEdit.value = null;
  isFormModalOpen.value = true;
};

const openEditOrder = (order: Order) => {
  orderToEdit.value = order;
  isFormModalOpen.value = true;
};

const openPayment = (order: Order) => {
  orderForPayment.value = order;
  isPaymentModalOpen.value = true;
};

const onDeliveryStatusChange = async (order: Order, newStatus: DeliveryStatus) => {
  await store.updateDeliveryStatus(order.id, { deliveryStatus: newStatus });
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

const chips = [
  { id: 'ALL' as OrderFilterChip, label: 'Todos', icon: ClipboardList, countKey: 'totalOrdersCount' as const },
  { id: 'ENCARGOS' as OrderFilterChip, label: 'Encargos', icon: Clock, countKey: 'countEncargos' as const },
  { id: 'CON_DEUDA' as OrderFilterChip, label: 'Con Deuda', icon: AlertCircle, countKey: 'countWithDebt' as const },
  { id: 'AL_DIA' as OrderFilterChip, label: 'Al Día', icon: CheckCircle2, countKey: 'countAlDia' as const },
];

const getStatusBadge = (status: DeliveryStatus) => {
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
      return { label: 'Por Entregar', class: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400' };
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- Top Action Bar & Metrics -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Pedidos y Ventas
        </h1>
        <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Comandas activas, control de cartera y estado de entregas en tiempo real.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="store.fetchOrders()"
          :disabled="store.isLoading"
          class="inline-flex items-center gap-2 rounded-xl border border-surface-light-border bg-surface-light-card px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-200 dark:hover:bg-slate-800"
          title="Refrescar lista"
        >
          <RotateCw class="h-4 w-4 stroke-[1.75]" :class="{ 'animate-spin': store.isLoading }" />
          <span class="hidden sm:inline">Actualizar</span>
        </button>

        <button
          type="button"
          @click="openNewOrder"
          class="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 text-xs font-extrabold text-white shadow-accent transition-transform active:scale-95 hover:bg-accent-600"
        >
          <Plus class="h-4 w-4 stroke-[2.5]" />
          <span>Nuevo Pedido</span>
        </button>
      </div>
    </div>

    <!-- Quick Metric Cards -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <span class="text-xs font-bold text-slate-500 dark:text-slate-400">Total Pedidos</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-2xl font-extrabold text-slate-900 dark:text-white">{{ store.totalOrdersCount }}</span>
          <ShoppingBag class="h-5 w-5 text-brand-800 dark:text-brand-darkText stroke-[1.75]" />
        </div>
      </div>

      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <span class="text-xs font-bold text-amber-600 dark:text-amber-400">Cartera Pendiente</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-xl font-extrabold text-amber-600 dark:text-amber-400 sm:text-2xl">
            {{ formatCurrency(store.totalPendingDebt) }}
          </span>
          <AlertCircle class="h-5 w-5 text-amber-500 stroke-[1.75]" />
        </div>
      </div>

      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <span class="text-xs font-bold text-dairy-500">Encargos Activos</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-2xl font-extrabold text-dairy-500">{{ store.countEncargos }}</span>
          <Bike class="h-5 w-5 text-dairy-500 stroke-[1.75]" />
        </div>
      </div>

      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <span class="text-xs font-bold text-natural-500">Pagos al Día</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-2xl font-extrabold text-natural-500">{{ store.countAlDia }}</span>
          <CheckCircle2 class="h-5 w-5 text-natural-500 stroke-[1.75]" />
        </div>
      </div>
    </div>

    <!-- Search & Filter Bar -->
    <div class="flex flex-col gap-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-3 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card sm:flex-row sm:items-center sm:justify-between">
      <!-- Search Input with Debounce -->
      <div class="relative flex-1">
        <Search class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[1.75]" />
        <input
          type="text"
          v-model="store.searchQuery"
          placeholder="Buscar por código (PED-...), cliente, teléfono, dirección o notas..."
          class="w-full rounded-xl border border-slate-200 bg-surface-light-canvas py-2 pl-10 pr-4 text-xs font-semibold text-slate-800 placeholder-slate-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-surface-dark-canvas dark:text-slate-100"
        />
      </div>

      <!-- Tira horizontal de 4 chips semánticos con Lucide Icons -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        <button
          v-for="chip in chips"
          :key="chip.id"
          type="button"
          @click="store.setFilterChip(chip.id)"
          class="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95"
          :class="[
            store.filterChip === chip.id
              ? 'bg-brand-800 text-white shadow-sm dark:bg-brand-500'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          ]"
        >
          <component :is="chip.icon" class="h-3.5 w-3.5 stroke-[1.75]" />
          <span>{{ chip.label }}</span>
          <span
            class="rounded-full px-1.5 py-0.2 text-[10px] font-extrabold"
            :class="store.filterChip === chip.id ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'"
          >
            {{ store[chip.countKey] }}
          </span>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="store.isLoading && store.orders.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
      <RotateCw class="h-8 w-8 animate-spin text-brand-800 dark:text-brand-darkText stroke-[1.75]" />
      <p class="mt-3 text-sm font-bold text-slate-500">Cargando pedidos...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="store.filteredOrders.length === 0" class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-surface-light-card/50 py-16 text-center dark:border-slate-700 dark:bg-surface-dark-card/50">
      <Package class="h-12 w-12 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
      <h3 class="mt-4 text-base font-extrabold text-slate-700 dark:text-slate-300">
        No se encontraron pedidos
      </h3>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Intenta ajustar los filtros de búsqueda o crea un nuevo pedido para empezar.
      </p>
      <button
        type="button"
        @click="openNewOrder"
        class="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-accent-500 px-4 py-2 text-xs font-bold text-white shadow-accent"
      >
        <Plus class="h-4 w-4 stroke-[2]" /> Crear Primer Pedido
      </button>
    </div>

    <!-- Orders Grid con v-auto-animate -->
    <div
      v-else
      v-auto-animate
      class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      <div
        v-for="order in store.filteredOrders"
        :key="order.id"
        class="group relative flex flex-col justify-between rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card transition-all hover:shadow-elevated dark:border-surface-dark-border dark:bg-surface-dark-card"
      >
        <!-- Header: Code & Status Badges -->
        <div>
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono text-xs font-black text-brand-800 dark:text-brand-darkText">
              {{ order.orderCode || `PED-#${order.orderNumber || order.id}` }}
            </span>

            <div class="flex items-center gap-1.5">
              <!-- Delivery Status Badge -->
              <span
                class="rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase"
                :class="getStatusBadge(order.deliveryStatus).class"
              >
                {{ getStatusBadge(order.deliveryStatus).label }}
              </span>

              <!-- Payment Status Badge -->
              <span
                class="rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase"
                :class="{
                  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400': store.getPendingBalance(order) <= 0 || order.paymentStatus === 'PAID',
                  'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400': store.getPendingBalance(order) > 0 && (order.paidAmount || order.totalPaid || 0) > 0,
                  'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400': store.getPendingBalance(order) > 0 && !(order.paidAmount || order.totalPaid),
                }"
              >
                {{ store.getPendingBalance(order) <= 0 ? 'Pagado' : (order.paidAmount || order.totalPaid || 0) > 0 ? 'Abonado' : 'Deuda' }}
              </span>
            </div>
          </div>

          <!-- Customer Info -->
          <div class="mt-3 flex items-start gap-2.5">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <User class="h-4 w-4 stroke-[1.75]" />
            </div>
            <div class="min-w-0 flex-1">
              <h4 class="truncate text-sm font-extrabold text-slate-900 dark:text-white">
                {{ order.customer?.fullName || order.customerName || 'Cliente Ocasional' }}
              </h4>
              <p class="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <Phone class="h-3 w-3 inline shrink-0 stroke-[1.75]" />
                <span>{{ order.customer?.phone || order.customerPhone || 'Sin número' }}</span>
              </p>
              <p v-if="order.customerAddress || order.customer?.address" class="flex items-center gap-1 text-[11px] text-slate-400 truncate mt-0.5">
                <MapPin class="h-3 w-3 inline shrink-0 stroke-[1.75]" />
                <span>{{ order.customerAddress || order.customer?.address }}</span>
              </p>
            </div>
          </div>

          <!-- Order Items Snippet with Milk icon -->
          <div v-if="order.items && order.items.length > 0" class="mt-3 rounded-xl bg-surface-light-canvas p-2.5 dark:bg-surface-dark-canvas">
            <ul class="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <li v-for="item in order.items" :key="item.id || item.flavor" class="flex items-center justify-between">
                <span class="flex items-center gap-1.5">
                  <Milk class="h-3.5 w-3.5 text-brand-800 dark:text-brand-darkText stroke-[1.75]" />
                  <span>{{ item.quantity }}x {{ item.flavor }} ({{ item.bottleSize }})</span>
                </span>
                <span class="font-bold text-slate-900 dark:text-white">{{ formatCurrency(item.totalPrice) }}</span>
              </li>
            </ul>
          </div>

          <!-- Notes Snippet -->
          <div v-if="order.notes && order.notes.trim()" class="mt-2 rounded-lg bg-amber-50/70 border-l-2 border-amber-400 px-2.5 py-1 text-[11px] text-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
            <strong>Nota:</strong> {{ order.notes.trim() }}
          </div>
        </div>

        <!-- Footer: Balances & Touch Actions -->
        <div class="mt-4 border-t border-surface-light-border pt-3 dark:border-surface-dark-border space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <span class="block text-[10px] font-bold uppercase text-slate-400">Total</span>
              <span class="text-sm font-extrabold text-slate-900 dark:text-white">
                {{ formatCurrency(order.totalAmount) }}
              </span>
            </div>

            <div class="text-right">
              <span class="block text-[10px] font-bold uppercase text-slate-400">Saldo Pendiente</span>
              <span
                class="text-sm font-extrabold"
                :class="store.getPendingBalance(order) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'"
              >
                {{ formatCurrency(store.getPendingBalance(order)) }}
              </span>
            </div>
          </div>

          <!-- Acciones directas por tarjeta (Touch targets >= 40px) -->
          <div class="grid grid-cols-3 gap-1.5 pt-1">
            <!-- Botón Inteligente WhatsApp -->
            <button
              type="button"
              @click="store.dispatchWhatsApp(order.id)"
              class="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-2 text-xs font-bold text-emerald-700 transition-all active:scale-95 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
              title="Notificar por WhatsApp"
            >
              <MessageCircle class="h-4 w-4 stroke-[1.75]" />
              <span>WhatsApp</span>
            </button>

            <!-- Botón Cobro / Abono Rápido -->
            <button
              type="button"
              @click="openPayment(order)"
              class="flex h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-bold transition-all active:scale-95"
              :class="store.getPendingBalance(order) > 0 ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'"
              title="Registrar Abono"
            >
              <BadgeDollarSign class="h-4 w-4 stroke-[1.75]" />
              <span>{{ store.getPendingBalance(order) > 0 ? 'Abonar' : 'Historial' }}</span>
            </button>

            <!-- Botón Editar Comanda -->
            <button
              type="button"
              @click="openEditOrder(order)"
              class="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-surface-light-card px-2 text-xs font-bold text-slate-700 transition-all active:scale-95 hover:bg-slate-100 dark:border-slate-700 dark:bg-surface-dark-card dark:text-slate-200 dark:hover:bg-slate-800"
              title="Editar comanda"
            >
              <Edit2 class="h-3.5 w-3.5 stroke-[1.75]" />
              <span>Editar</span>
            </button>
          </div>

          <!-- Selector rápido de Estado de Entrega (Sin emojis) -->
          <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
            <span class="text-[11px] font-bold text-slate-400">Estado:</span>
            <select
              :value="order.deliveryStatus"
              @change="onDeliveryStatusChange(order, ($event.target as HTMLSelectElement).value as DeliveryStatus)"
              class="rounded-lg border border-slate-200 bg-surface-light-canvas py-1 px-2 text-[11px] font-bold text-slate-800 transition-colors focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-surface-dark-canvas dark:text-slate-200"
            >
              <option value="PENDING">Por Entregar</option>
              <option value="PREPARING">En Preparación</option>
              <option value="READY_FOR_DISPATCH">Listo Despacho</option>
              <option value="IN_ROUTE">En Camino</option>
              <option value="DELIVERED">Entregado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Creación / Edición de Pedidos (Reka UI) -->
    <OrderFormModal
      v-model:open="isFormModalOpen"
      :order-to-edit="orderToEdit"
      @saved="store.fetchOrders()"
    />

    <!-- Modal de Abono / Pago Rápido (Reka UI) -->
    <PaymentModal
      v-model:open="isPaymentModalOpen"
      :order="orderForPayment"
      @saved="store.fetchOrders()"
    />
  </div>
</template>
