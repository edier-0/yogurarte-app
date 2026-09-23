<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { http } from '@/api/client';
import {
  LayoutDashboard,
  ShoppingBag,
  Wallet,
  FlaskConical,
  AlertCircle,
  Banknote,
  Smartphone,
  Plus,
  ArrowRight,
  Boxes,
  Receipt,
  RotateCw,
  Clock,
  Sparkles,
} from 'lucide-vue-next';
import OrderFormModal from '@/components/operations/OrderFormModal.vue';
import ExpenseModal from '@/components/finance/ExpenseModal.vue';
import TransferModal from '@/components/finance/TransferModal.vue';

const router = useRouter();

type PeriodOption = 'today' | 'this_week' | 'this_month' | 'all';
const selectedPeriod = ref<PeriodOption>('today');
const isLoading = ref<boolean>(false);

// Modales de acciones rápidas
const isOrderModalOpen = ref(false);
const isExpenseModalOpen = ref(false);
const isTransferModalOpen = ref(false);

interface DashboardData {
  kpis: {
    totalSalesAmount: number;
    totalSalesLiters: number;
    cashBalance: number;
    cashInHand: number;
    digitalBank: number;
    totalExpenses: number;
    netProfit: number;
    deliveredPendingToCollect: number;
    ordersCount?: number;
    totalBatchesCount?: number;
    totalLitersInProcess?: number;
  };
  periodBatches: Array<{
    id: number;
    code: string;
    flavor: string;
    totalLiters: number;
    status: string;
    efficiencyRate?: number;
  }>;
  allActiveBatches: Array<{
    id: number;
    code: string;
    flavor: string;
    status: string;
    totalLiters: number;
    availableBottles?: number;
  }>;
  lowStockAlerts: Array<{
    id: number;
    name: string;
    code: string;
    currentStock: number;
    minStockAlert: number;
    unit: string;
  }>;
  creditSummary: {
    totalRemainingDebt: number;
    activeCreditsCount: number;
  };
  recentOrders: Array<{
    id: number;
    orderNumber: string;
    customerName?: string;
    total: number;
    totalAmount?: number;
    status: string;
    deliveryStatus: string;
  }>;
}

const dashboardData = ref<DashboardData>({
  kpis: {
    totalSalesAmount: 0,
    totalSalesLiters: 0,
    cashBalance: 0,
    cashInHand: 0,
    digitalBank: 0,
    totalExpenses: 0,
    netProfit: 0,
    deliveredPendingToCollect: 0,
    ordersCount: 0,
    totalBatchesCount: 0,
    totalLitersInProcess: 0,
  },
  periodBatches: [],
  allActiveBatches: [],
  lowStockAlerts: [],
  creditSummary: {
    totalRemainingDebt: 0,
    activeCreditsCount: 0,
  },
  recentOrders: [],
});

async function loadDashboard() {
  isLoading.value = true;
  try {
    const res = await http.get<any>('/dashboard/summary', {
      params: { period: selectedPeriod.value },
    });
    if (res && res.kpis) {
      const kpis = res.kpis || {};
      dashboardData.value = {
        kpis: {
          totalSalesAmount: Number(kpis.totalSalesAmount ?? 0),
          totalSalesLiters: Number(
            kpis.totalSalesLiters ??
            kpis.totalLitersSold ??
            kpis.deliveredLiters ??
            kpis.totalLitersAll ??
            0
          ),
          cashBalance: Number(kpis.cashBalance ?? 0),
          cashInHand: Number(kpis.cashInHand ?? 0),
          digitalBank: Number(kpis.digitalBank ?? 0),
          totalExpenses: Number(kpis.totalExpenses ?? 0),
          netProfit: Number(kpis.netProfit ?? 0),
          deliveredPendingToCollect: Number(kpis.deliveredPendingToCollect ?? 0),
          ordersCount: Number(kpis.totalOrdersCount ?? 0),
          totalBatchesCount: Number(kpis.totalBatchesCountAllTime ?? kpis.totalBatchesCountPeriod ?? 0),
          totalLitersInProcess: Number(kpis.inProcessLiters ?? kpis.totalLitersProducedPeriod ?? 0),
        },
        periodBatches: Array.isArray(res.periodBatches) ? res.periodBatches : [],
        allActiveBatches: Array.isArray(res.allActiveBatches) ? res.allActiveBatches : [],
        lowStockAlerts: Array.isArray(res.lowStockAlerts) ? res.lowStockAlerts : [],
        creditSummary: {
          totalRemainingDebt: Number(res.creditSummary?.totalRemainingDebt ?? 0),
          activeCreditsCount: Number(res.creditSummary?.activeCreditsCount ?? 0),
        },
        recentOrders: Array.isArray(res.recentOrders)
          ? res.recentOrders.map((o: any) => ({
              id: o.id,
              orderNumber: o.orderNumber || 'PED-000',
              customerName: o.customer?.fullName || o.customerName || 'Cliente mostrador',
              total: Number(o.totalAmount ?? o.total ?? 0),
              totalAmount: Number(o.totalAmount ?? o.total ?? 0),
              status: o.paymentStatus || o.status || 'PENDING',
              deliveryStatus: o.deliveryStatus || 'PENDING',
            }))
          : [],
      };
    }
  } catch (err) {
    console.error('Error al cargar datos del dashboard:', err);
  } finally {
    isLoading.value = false;
  }
}

function changePeriod(p: PeriodOption) {
  selectedPeriod.value = p;
  loadDashboard();
}

function formatCurrency(val?: number | null): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(val) || 0);
}

onMounted(() => {
  loadDashboard();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header del Dashboard -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-hero-gradient text-white shadow-card">
          <LayoutDashboard class="h-6 w-6 stroke-[2.2]" />
        </div>
        <div>
          <h1 class="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Panel Analítico & Control General
          </h1>
          <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Métricas ejecutivas en tiempo real • YogurArte Artesanal
          </p>
        </div>
      </div>

      <!-- Selector de Períodos y Botón de Recarga -->
      <div class="flex items-center gap-2">
        <div class="flex items-center rounded-xl border border-surface-light-border bg-surface-light-card p-1 shadow-xs dark:border-surface-dark-border dark:bg-surface-dark-card">
          <button
            type="button"
            @click="changePeriod('today')"
            class="rounded-lg px-2.5 py-1 text-xs font-bold transition-all"
            :class="selectedPeriod === 'today' ? 'bg-hero-gradient text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'"
          >
            Hoy
          </button>
          <button
            type="button"
            @click="changePeriod('this_week')"
            class="rounded-lg px-2.5 py-1 text-xs font-bold transition-all"
            :class="selectedPeriod === 'this_week' ? 'bg-hero-gradient text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'"
          >
            Semana
          </button>
          <button
            type="button"
            @click="changePeriod('this_month')"
            class="rounded-lg px-2.5 py-1 text-xs font-bold transition-all"
            :class="selectedPeriod === 'this_month' ? 'bg-hero-gradient text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'"
          >
            Mes
          </button>
          <button
            type="button"
            @click="changePeriod('all')"
            class="rounded-lg px-2.5 py-1 text-xs font-bold transition-all"
            :class="selectedPeriod === 'all' ? 'bg-hero-gradient text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'"
          >
            Histórico
          </button>
        </div>

        <button
          type="button"
          @click="loadDashboard"
          class="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-light-border bg-surface-light-card text-slate-600 transition-colors hover:bg-slate-100 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800"
          :title="'Actualizar datos'"
        >
          <RotateCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
        </button>
      </div>
    </div>

    <!-- Barra de Acciones Rápidas -->
    <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      <button
        type="button"
        @click="isOrderModalOpen = true"
        class="flex items-center justify-center gap-2 rounded-2xl border border-brand-200 bg-brand-50/70 p-3 text-xs font-extrabold text-brand-900 shadow-xs transition-all hover:bg-brand-100 active:scale-95 dark:border-brand-900/50 dark:bg-brand-950/30 dark:text-brand-300"
      >
        <Plus class="h-4 w-4 stroke-[2.5]" />
        <span>Nuevo Pedido</span>
      </button>

      <button
        type="button"
        @click="router.push('/produccion/lotes')"
        class="flex items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-3 text-xs font-extrabold text-indigo-900 shadow-xs transition-all hover:bg-indigo-100 active:scale-95 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-300"
      >
        <FlaskConical class="h-4 w-4 stroke-[2.2]" />
        <span>Registrar Lote</span>
      </button>

      <button
        type="button"
        @click="isExpenseModalOpen = true"
        class="flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/70 p-3 text-xs font-extrabold text-rose-900 shadow-xs transition-all hover:bg-rose-100 active:scale-95 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
      >
        <Receipt class="h-4 w-4 stroke-[2.2]" />
        <span>Registrar Gasto</span>
      </button>

      <button
        type="button"
        @click="isTransferModalOpen = true"
        class="flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs font-extrabold text-emerald-900 shadow-xs transition-all hover:bg-emerald-100 active:scale-95 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
      >
        <Wallet class="h-4 w-4 stroke-[2.2]" />
        <span>Traslado de Caja</span>
      </button>
    </div>

    <!-- 4 Tarjetas de Métricas Principales (KPI Cards) -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <!-- 1. Ventas del Período -->
      <div class="rounded-3xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Ventas Totales
          </span>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
            <ShoppingBag class="h-4 w-4 stroke-[2.2]" />
          </div>
        </div>
        <div class="mt-3">
          <p class="text-2xl font-black text-slate-900 dark:text-white">
            {{ formatCurrency(dashboardData.kpis?.totalSalesAmount) }}
          </p>
          <div class="mt-1 flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>{{ (dashboardData.kpis?.totalSalesLiters ?? 0).toFixed(1) }} L vendidos</span>
            <span class="text-slate-300 dark:text-slate-600">•</span>
            <span class="text-emerald-600 dark:text-emerald-400">Utilidad: {{ formatCurrency(dashboardData.kpis?.netProfit) }}</span>
          </div>
        </div>
      </div>

      <!-- 2. Liquidez Real y Arqueo -->
      <div class="rounded-3xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Saldo Real en Caja
          </span>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Wallet class="h-4 w-4 stroke-[2.2]" />
          </div>
        </div>
        <div class="mt-3">
          <p class="text-2xl font-black text-slate-900 dark:text-white">
            {{ formatCurrency(dashboardData.kpis?.cashBalance) }}
          </p>
          <div class="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-surface-light-canvas p-1.5 text-[11px] font-bold dark:bg-surface-dark-canvas">
            <div class="flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <Banknote class="h-3 w-3 text-amber-600" />
              <span>{{ formatCurrency(dashboardData.kpis?.cashInHand) }}</span>
            </div>
            <div class="flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <Smartphone class="h-3 w-3 text-purple-600" />
              <span>{{ formatCurrency(dashboardData.kpis?.digitalBank) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Producción Activa -->
      <div class="rounded-3xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Lotes Activos
          </span>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
            <FlaskConical class="h-4 w-4 stroke-[2.2]" />
          </div>
        </div>
        <div class="mt-3">
          <p class="text-2xl font-black text-slate-900 dark:text-white">
            {{ (dashboardData.allActiveBatches && dashboardData.allActiveBatches.length > 0) ? dashboardData.allActiveBatches.length : (dashboardData.kpis?.totalBatchesCount || 0) }} Lotes
          </p>
          <div class="mt-1 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>
              {{
                (dashboardData.allActiveBatches && dashboardData.allActiveBatches.length > 0)
                  ? dashboardData.allActiveBatches.reduce((sum, b) => sum + (b.totalLiters || 0), 0)
                  : (dashboardData.kpis?.totalLitersInProcess || 0)
              }} L en proceso
            </span>
            <RouterLink
              to="/produccion/lotes"
              class="inline-flex items-center gap-0.5 text-brand-800 hover:underline dark:text-brand-darkText"
            >
              <span>Ver planta</span>
              <ArrowRight class="h-3 w-3" />
            </RouterLink>
          </div>
        </div>
      </div>

      <!-- 4. Cartera & Deuda Pendiente -->
      <div class="rounded-3xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Por Cobrar a Clientes
          </span>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertCircle class="h-4 w-4 stroke-[2.2]" />
          </div>
        </div>
        <div class="mt-3">
          <p class="text-2xl font-black text-amber-600 dark:text-amber-400">
            {{ formatCurrency(dashboardData.kpis?.deliveredPendingToCollect) }}
          </p>
          <div class="mt-1 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>Cartera en calle</span>
            <RouterLink
              to="/directorio/clientes"
              class="inline-flex items-center gap-0.5 text-brand-800 hover:underline dark:text-brand-darkText"
            >
              <span>Cobrar</span>
              <ArrowRight class="h-3 w-3" />
            </RouterLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Sección Inferior: Alertas Tempranas y Pedidos Recientes -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Tarjeta Alertas Tempranas (Materia Prima bajo mínimo) -->
      <div class="rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <div class="flex items-center justify-between border-b border-surface-light-border pb-4 dark:border-surface-dark-border">
          <div class="flex items-center gap-2.5">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              <Boxes class="h-4 w-4 stroke-[2.2]" />
            </div>
            <div>
              <h2 class="text-sm font-extrabold text-slate-900 dark:text-white">
                Alertas de Stock & Insumos Críticos
              </h2>
              <p class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Materias primas por debajo o cerca del stock mínimo
              </p>
            </div>
          </div>
          <span
            class="rounded-full px-2.5 py-0.5 text-[11px] font-extrabold"
            :class="(dashboardData.lowStockAlerts || []).length > 0 ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'"
          >
            {{ (dashboardData.lowStockAlerts || []).length }} alertas
          </span>
        </div>

        <div v-if="!dashboardData.lowStockAlerts || dashboardData.lowStockAlerts.length === 0" class="flex flex-col items-center justify-center py-8 text-center">
          <Sparkles class="h-8 w-8 text-emerald-500" />
          <p class="mt-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            Niveles de inventario óptimos
          </p>
          <p class="text-[11px] text-slate-400">
            No hay materias primas en nivel crítico actualmente.
          </p>
        </div>

        <div v-else class="mt-4 space-y-2.5">
          <div
            v-for="item in (dashboardData.lowStockAlerts || [])"
            :key="item.id"
            class="flex items-center justify-between rounded-2xl border border-rose-100 bg-rose-50/50 p-3 dark:border-rose-900/30 dark:bg-rose-950/20"
          >
            <div>
              <span class="text-xs font-extrabold text-slate-900 dark:text-white">
                {{ item.name }}
              </span>
              <p class="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                Stock actual: {{ item.currentStock }} {{ item.unit }} (Mín: {{ item.minStockAlert }} {{ item.unit }})
              </p>
            </div>
            <RouterLink
              to="/produccion/inventario"
              class="rounded-xl border border-rose-300 bg-white px-2.5 py-1 text-xs font-bold text-rose-700 shadow-xs hover:bg-rose-50 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300"
            >
              Abastecer
            </RouterLink>
          </div>
        </div>
      </div>

      <!-- Tarjeta Actividad y Pedidos Recientes -->
      <div class="rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <div class="flex items-center justify-between border-b border-surface-light-border pb-4 dark:border-surface-dark-border">
          <div class="flex items-center gap-2.5">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300">
              <Clock class="h-4 w-4 stroke-[2.2]" />
            </div>
            <div>
              <h2 class="text-sm font-extrabold text-slate-900 dark:text-white">
                Últimos Pedidos Registrados
              </h2>
              <p class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Flujo reciente de pedidos en punto de venta y reparto
              </p>
            </div>
          </div>
          <RouterLink
            to="/operaciones/pedidos"
            class="inline-flex items-center gap-1 text-xs font-bold text-brand-800 hover:underline dark:text-brand-darkText"
          >
            <span>Ver todos</span>
            <ArrowRight class="h-3 w-3" />
          </RouterLink>
        </div>

        <div v-if="!dashboardData.recentOrders || dashboardData.recentOrders.length === 0" class="flex flex-col items-center justify-center py-8 text-center">
          <ShoppingBag class="h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p class="mt-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            Sin pedidos en este período
          </p>
        </div>

        <div v-else class="mt-4 space-y-2">
          <div
            v-for="order in (dashboardData.recentOrders || [])"
            :key="order.id"
            class="flex items-center justify-between rounded-2xl border border-surface-light-border bg-surface-light-canvas p-3 dark:border-surface-dark-border dark:bg-surface-dark-canvas"
          >
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-black text-slate-900 dark:text-white">
                  {{ order.orderNumber }}
                </span>
                <span class="rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-300">
                  {{ order.deliveryStatus }}
                </span>
              </div>
              <p class="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {{ order.customerName || 'Cliente mostrador' }}
              </p>
            </div>
            <span class="text-xs font-black text-slate-900 dark:text-white">
              {{ formatCurrency(order.totalAmount ?? order.total ?? 0) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Modales de Acción Rápida -->
    <OrderFormModal
      v-if="isOrderModalOpen"
      :open="isOrderModalOpen"
      @update:open="isOrderModalOpen = $event"
      @order-created="loadDashboard"
    />

    <ExpenseModal
      v-if="isExpenseModalOpen"
      :open="isExpenseModalOpen"
      @update:open="isExpenseModalOpen = $event"
      @saved="loadDashboard"
    />

    <TransferModal
      v-if="isTransferModalOpen"
      :open="isTransferModalOpen"
      @update:open="isTransferModalOpen = $event"
      @transferred="loadDashboard"
    />
  </div>
</template>
