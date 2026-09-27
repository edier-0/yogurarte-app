<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  CalendarClock,
  Search,
  Plus,
  RefreshCw,
  ShoppingBag,
  Edit2,
  Trash2,
  Calendar,
  Milk,
  Clock,
  Phone,
  MapPin,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Receipt,
  AlertCircle,
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';
import RecurringEditModal, { RecurringScheduleData } from './RecurringEditModal.vue';
import OrderFormModal from '@/components/operations/OrderFormModal.vue';
import CollectDebtModal, { type CustomerDebtData, type DebtOrderInfo } from './CollectDebtModal.vue';

export interface RecurringScheduleItem {
  id: number;
  customerId: number;
  customer: {
    id: number;
    fullName: string;
    phone: string;
    address?: string | null;
    pendingDebt?: number;
    pendingOrders?: DebtOrderInfo[];
  };
  frequencyDays: number;
  preferredFlavor: string;
  bottleSize: '1L' | '2L';
  quantity: number;
  nextDate: string;
  lastOrderDate?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const schedules = ref<RecurringScheduleItem[]>([]);
const searchQuery = ref('');
const activeFilter = ref<'ALL' | 'TODAY' | 'UPCOMING' | 'ACTIVE' | 'PAUSED'>('ALL');
const isLoading = ref(false);
const isGeneratingOrderId = ref<number | null>(null);

const isModalOpen = ref(false);
const scheduleToEdit = ref<RecurringScheduleData | null>(null);

const isOrderModalOpen = ref(false);
const orderToPrefill = ref<any>(null);

function handleQuickCreateOrder(schedule: RecurringScheduleItem) {
  const unitPrice = schedule.bottleSize === '2L' ? 22000 : 12000;
  const quantity = schedule.quantity || 1;
  orderToPrefill.value = {
    customerId: schedule.customerId,
    customerName: schedule.customer.fullName,
    customerPhone: schedule.customer.phone,
    customerAddress: schedule.customer.address || '',
    items: [
      {
        batchId: null,
        bottleSize: schedule.bottleSize || '1L',
        flavor: schedule.preferredFlavor || 'Natural',
        quantity,
        unitPrice,
        totalPrice: quantity * unitPrice,
      },
    ],
    notes: schedule.notes ? `Cliente Frecuente: ${schedule.notes}` : 'Pedido programado recurrente',
  };
  isOrderModalOpen.value = true;
}

const isDebtModalOpen = ref(false);
const customerToCollect = ref<CustomerDebtData | null>(null);

function handleOpenCollectDebt(schedule: RecurringScheduleItem) {
  customerToCollect.value = {
    id: schedule.customer.id,
    fullName: schedule.customer.fullName,
    phone: schedule.customer.phone,
    address: schedule.customer.address,
    pendingDebt: schedule.customer.pendingDebt ?? 0,
    pendingOrders: schedule.customer.pendingOrders ?? [],
  };
  isDebtModalOpen.value = true;
}

const formatCurrency = (val?: number | null) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

// Paginación estricta a 12 registros por página
const currentPage = ref<number>(1);
const pageSize = 12;
const totalPages = ref<number>(1);
const totalSchedules = ref<number>(0);

async function loadSchedules(page = 1) {
  currentPage.value = page;
  isLoading.value = true;
  try {
    const params: Record<string, string> = {
      page: String(page),
      limit: String(pageSize),
      paginate: 'true',
    };
    if (activeFilter.value !== 'ALL') {
      params.filter = activeFilter.value;
    }
    if (searchQuery.value.trim()) {
      params.search = searchQuery.value.trim();
    }

    const res = await http.get<any>('/crm/recurring', { params });
    if (res && res.data && Array.isArray(res.data)) {
      schedules.value = res.data;
      if (res.pagination) {
        currentPage.value = res.pagination.page;
        totalPages.value = res.pagination.totalPages;
        totalSchedules.value = res.pagination.totalItems || res.pagination.total || 0;
      }
    } else if (Array.isArray(res)) {
      schedules.value = res;
      totalSchedules.value = res.length;
      totalPages.value = Math.ceil(res.length / pageSize) || 1;
    }
  } catch (err: any) {
    toast.error('Error al cargar programaciones recurrentes');
  } finally {
    isLoading.value = false;
  }
}


function handleOpenCreate() {
  scheduleToEdit.value = null;
  isModalOpen.value = true;
}

function handleOpenEdit(schedule: RecurringScheduleItem) {
  scheduleToEdit.value = { ...schedule };
  isModalOpen.value = true;
}

// Generar pedido de hoy a partir de la recurrencia
async function handleGenerateOrder(schedule: RecurringScheduleItem) {
  const confirmed = window.confirm(
    `¿Deseas generar la comanda oficial de hoy para ${schedule.customer.fullName} (${schedule.quantity}x ${schedule.preferredFlavor} ${schedule.bottleSize})?`
  );
  if (!confirmed) return;

  isGeneratingOrderId.value = schedule.id;
  try {
    const res = await http.post<{ success: boolean; message: string; order: any }>(
      `/crm/recurring/${schedule.id}/create-order`
    );

    const orderNum = res?.order?.orderNumber || '';
    toast.success(`Comanda ${orderNum} generada exitosamente`);
    await loadSchedules();
  } catch (err: any) {
    toast.error(err?.response?.data?.error || 'Error al generar el pedido');
  } finally {
    isGeneratingOrderId.value = null;
  }
}

// Pausar / Reactivar recurrencia
async function handleToggleStatus(schedule: RecurringScheduleItem) {
  const newStatus = !schedule.isActive;
  try {
    await http.put(`/crm/recurring/${schedule.id}`, { isActive: newStatus });
    toast.success(newStatus ? 'Programación reactivada' : 'Programación puesta en pausa');
    schedule.isActive = newStatus;
  } catch (err: any) {
    toast.error(err?.response?.data?.error || 'Error al actualizar estado');
  }
}

async function handleDelete(schedule: RecurringScheduleItem) {
  const confirmed = window.confirm(
    `¿Confirmas la eliminación de la programación recurrente de ${schedule.customer.fullName}?`
  );
  if (!confirmed) return;

  try {
    await http.delete(`/crm/recurring/${schedule.id}`);
    toast.success('Programación eliminada');
    await loadSchedules();
  } catch (err: any) {
    toast.error(err?.response?.data?.error || 'No se pudo eliminar la programación');
  }
}

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return 'Sin fecha';
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
};

const isToday = (dateStr?: string | null) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

const isPast = (dateStr?: string | null) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return d < now;
};

onMounted(() => {
  loadSchedules();
});
</script>

<template>
  <div class="space-y-5">
    <!-- Barra Superior: Buscador, Filtros de Estado y Nueva Recurrencia -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto flex-1">
        <div class="relative w-full sm:w-80">
          <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 stroke-[2]" />
          <input
            v-model="searchQuery"
            @keyup.enter="loadSchedules(1)"
            type="text"
            placeholder="Buscar por cliente o sabor..."
            class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
          />
        </div>

        <!-- Filtros Rápidos -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:none]">
          <button
            type="button"
            @click="activeFilter = 'ALL'; loadSchedules(1)"
            class="shrink-0 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
            :class="
              activeFilter === 'ALL'
                ? 'bg-brand-800 text-white shadow-xs dark:bg-brand-900'
                : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
            "
          >
            Todas
          </button>
          <button
            type="button"
            @click="activeFilter = 'TODAY'; loadSchedules(1)"
            class="shrink-0 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
            :class="
              activeFilter === 'TODAY'
                ? 'bg-brand-800 text-white shadow-xs dark:bg-brand-900'
                : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
            "
          >
            Entregas Hoy
          </button>
          <button
            type="button"
            @click="activeFilter = 'UPCOMING'; loadSchedules(1)"
            class="shrink-0 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
            :class="
              activeFilter === 'UPCOMING'
                ? 'bg-brand-800 text-white shadow-xs dark:bg-brand-900'
                : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
            "
          >
            Próximos 3 Días
          </button>
          <button
            type="button"
            @click="activeFilter = 'ACTIVE'; loadSchedules(1)"
            class="shrink-0 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
            :class="
              activeFilter === 'ACTIVE'
                ? 'bg-brand-800 text-white shadow-xs dark:bg-brand-900'
                : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
            "
          >
            Activas
          </button>
          <button
            type="button"
            @click="activeFilter = 'PAUSED'; loadSchedules(1)"
            class="shrink-0 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
            :class="
              activeFilter === 'PAUSED'
                ? 'bg-brand-800 text-white shadow-xs dark:bg-brand-900'
                : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
            "
          >
            En Pausa
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2 self-end sm:self-auto shrink-0">
        <button
          type="button"
          @click="loadSchedules(1)"
          :disabled="isLoading"
          class="inline-flex items-center justify-center rounded-xl border border-surface-light-border bg-surface-light-card p-2 text-slate-600 shadow-xs hover:bg-slate-50 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800"
          title="Refrescar"
        >
          <RefreshCw class="h-4 w-4 stroke-[2]" :class="{ 'animate-spin': isLoading }" />
        </button>

        <button
          type="button"
          @click="handleOpenCreate"
          class="inline-flex items-center gap-1.5 rounded-xl bg-hero-gradient px-4 py-2 text-xs font-extrabold text-white shadow-xs transition-transform active:scale-95"
        >
          <Plus class="h-4 w-4 stroke-[2.5]" />
          <span>Nueva Recurrencia</span>
        </button>
      </div>
    </div>

    <!-- Estado de Carga -->
    <div v-if="isLoading" class="py-16 text-center text-xs font-semibold text-slate-400">
      <RefreshCw class="mx-auto h-6 w-6 animate-spin mb-2 text-slate-400" />
      Cargando programaciones habituales...
    </div>

    <!-- Estado Vacío -->
    <div
      v-else-if="schedules.length === 0"
      class="rounded-3xl border border-surface-light-border bg-surface-light-card p-12 text-center text-slate-400 dark:border-surface-dark-border dark:bg-surface-dark-card"
    >
      <CalendarClock class="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-2 stroke-[1.5]" />
      <h3 class="text-sm font-extrabold text-slate-700 dark:text-slate-300">No hay programaciones recurrentes</h3>
      <p class="text-xs text-slate-400 mt-1">Configura entregas fijas periódicas (semanales, quincenales) para tus clientes regulares.</p>
      <button
        type="button"
        @click="handleOpenCreate"
        class="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-hero-gradient px-4 py-2 text-xs font-extrabold text-white shadow-xs"
      >
        <Plus class="h-4 w-4 stroke-[2.5]" />
        <span>Programar Compra</span>
      </button>
    </div>

    <!-- Grid de Compras Recurrentes -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="sch in schedules"
        :key="sch.id"
        class="rounded-2xl border bg-surface-light-card p-5 shadow-card transition-all hover:shadow-md dark:bg-surface-dark-card flex flex-col justify-between"
        :class="
          !sch.isActive
            ? 'opacity-70 border-dashed border-slate-300 dark:border-slate-700'
            : isToday(sch.nextDate)
            ? 'border-brand-800 dark:border-brand-600 ring-2 ring-brand-800/10'
            : 'border-surface-light-border dark:border-surface-dark-border'
        "
      >
        <div>
          <!-- Cabecera de la Tarjeta -->
          <div class="flex items-start justify-between gap-2">
            <div>
              <h4 class="text-sm font-extrabold text-slate-900 dark:text-white">
                {{ sch.customer.fullName }}
              </h4>
              <div class="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span class="inline-flex items-center gap-1 font-semibold">
                  <Phone class="h-3 w-3 stroke-[2] text-slate-400" />
                  {{ sch.customer.phone }}
                </span>
                <span v-if="sch.customer.address" class="truncate max-w-[130px] inline-flex items-center gap-1" :title="sch.customer.address">
                  <MapPin class="h-3 w-3 stroke-[2] text-slate-400 shrink-0" />
                  {{ sch.customer.address }}
                </span>
              </div>
            </div>

            <!-- Badges Superiores: Deuda + Estado -->
            <div class="flex items-center gap-1.5 shrink-0">
              <!-- Badge de Deuda si tiene saldo pendiente -->
              <span
                v-if="(sch.customer.pendingDebt || 0) > 0"
                class="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900/60"
                :title="`Deuda acumulada: ${formatCurrency(sch.customer.pendingDebt)}`"
              >
                <AlertCircle class="h-3 w-3 text-rose-500" />
                <span>Deuda: {{ formatCurrency(sch.customer.pendingDebt) }}</span>
              </span>

              <!-- Badge de Estado Activo / En Pausa -->
              <span
                class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black"
                :class="
                  sch.isActive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                "
              >
                <span
                  class="h-1.5 w-1.5 rounded-full"
                  :class="sch.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'"
                />
                <span>{{ sch.isActive ? 'Activo' : 'En Pausa' }}</span>
              </span>
            </div>
          </div>

          <!-- Detalles del Pedido Recurrente -->
          <div class="mt-4 rounded-xl bg-surface-light-canvas/70 p-3 dark:bg-surface-dark-canvas/70 space-y-2 border border-surface-light-border/60 dark:border-surface-dark-border/60">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Milk class="h-3.5 w-3.5 text-brand-800 dark:text-brand-darkText" />
                <span>Producto Habitual:</span>
              </span>
              <span class="font-black text-slate-900 dark:text-white">
                {{ sch.quantity }}x {{ sch.preferredFlavor }} ({{ sch.bottleSize }})
              </span>
            </div>

            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Clock class="h-3.5 w-3.5 text-slate-400" />
                <span>Frecuencia:</span>
              </span>
              <span class="font-extrabold text-slate-700 dark:text-slate-300">
                Cada {{ sch.frequencyDays }} días
              </span>
            </div>

            <div class="flex items-center justify-between text-xs pt-1 border-t border-surface-light-border/40 dark:border-surface-dark-border/40">
              <span class="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar class="h-3.5 w-3.5 text-slate-400" />
                <span>Próxima Entrega:</span>
              </span>
              <span
                class="font-black"
                :class="
                  isToday(sch.nextDate)
                    ? 'text-brand-800 dark:text-brand-darkText underline'
                    : isPast(sch.nextDate)
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-800 dark:text-slate-200'
                "
              >
                {{ formatDate(sch.nextDate) }}
                {{ isToday(sch.nextDate) ? ' · ¡HOY!' : '' }}
              </span>
            </div>
          </div>

          <!-- Notas si existen -->
          <p v-if="sch.notes" class="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2">
            Nota: "{{ sch.notes }}"
          </p>
        </div>

        <!-- Acciones Inferiores -->
        <div class="mt-4 space-y-2 border-t border-surface-light-border pt-3.5 dark:border-surface-dark-border">
          <!-- Fila 1: Crear Pedido y Cobrar Deuda en proporción simétrica -->
          <div class="grid gap-2" :class="(sch.customer.pendingDebt || 0) > 0 ? 'grid-cols-2' : 'grid-cols-1'">
            <button
              type="button"
              @click="handleQuickCreateOrder(sch)"
              class="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-brand-800 hover:bg-brand-900 px-2.5 text-xs font-extrabold text-white shadow-xs transition-transform active:scale-95 dark:bg-brand-700 dark:hover:bg-brand-600 truncate"
              title="Crear un pedido a medida para este cliente frecuente con sus preferencias prellenadas"
            >
              <Plus class="h-3.5 w-3.5 shrink-0 stroke-[2.5]" />
              <span class="truncate">Crear Pedido</span>
            </button>

            <button
              v-if="(sch.customer.pendingDebt || 0) > 0"
              type="button"
              @click="handleOpenCollectDebt(sch)"
              class="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-2 text-xs font-black text-white shadow-xs transition-transform active:scale-95 ring-1 ring-amber-500/20 truncate"
              :title="`Cobrar ${formatCurrency(sch.customer.pendingDebt)} de pedidos con saldo pendiente`"
            >
              <Receipt class="h-3.5 w-3.5 shrink-0 stroke-[2.5]" />
              <span class="truncate">Cobrar ({{ formatCurrency(sch.customer.pendingDebt) }})</span>
            </button>
          </div>

          <!-- Fila 2: Generar Hoy y Controles de Programación -->
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              @click="handleGenerateOrder(sch)"
              :disabled="isGeneratingOrderId === sch.id"
              class="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-hero-gradient px-3 text-xs font-extrabold text-white shadow-xs transition-transform active:scale-95 disabled:opacity-50 truncate"
              title="Generar comanda oficial de hoy a partir de esta recurrencia"
            >
              <ShoppingBag class="h-3.5 w-3.5 shrink-0 stroke-[2.5]" :class="{ 'animate-bounce': isGeneratingOrderId === sch.id }" />
              <span class="truncate">Generar Hoy</span>
            </button>

            <!-- Toggle Pausa / Reactivar -->
            <button
              type="button"
              @click="handleToggleStatus(sch)"
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-surface-light-border bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              :title="sch.isActive ? 'Poner en pausa' : 'Reactivar'"
            >
              <Pause v-if="sch.isActive" class="h-4 w-4" />
              <Play v-else class="h-4 w-4 text-emerald-600" />
            </button>

            <!-- Botón Editar -->
            <button
              type="button"
              @click="handleOpenEdit(sch)"
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-surface-light-border bg-surface-light-canvas text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              title="Editar programación"
            >
              <Edit2 class="h-4 w-4" />
            </button>

            <!-- Botón Eliminar -->
            <button
              type="button"
              @click="handleDelete(sch)"
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 dark:hover:text-rose-300 transition-colors"
              title="Eliminar programación"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- Barra de Paginación Estricta a 12 Registros -->
      <div
        v-if="totalPages > 1 || totalSchedules > 0"
        class="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-surface-light-border px-2 pt-4 dark:border-surface-dark-border"
      >
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Página {{ currentPage }} de {{ totalPages }} • {{ totalSchedules }} programaciones en total
        </span>

        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="loadSchedules(currentPage - 1)"
            :disabled="currentPage <= 1 || isLoading"
            class="inline-flex items-center gap-1 rounded-xl border border-surface-light-border bg-surface-light-card px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ChevronLeft class="h-4 w-4" />
            <span>Anterior</span>
          </button>

          <span class="text-xs font-bold text-slate-700 dark:text-slate-300 px-2">
            {{ currentPage }} / {{ totalPages }}
          </span>

          <button
            type="button"
            @click="loadSchedules(currentPage + 1)"
            :disabled="currentPage >= totalPages || isLoading"
            class="inline-flex items-center gap-1 rounded-xl border border-surface-light-border bg-surface-light-card px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <span>Siguiente</span>
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Editar / Crear Programación Recurrente -->
    <RecurringEditModal
      v-model:open="isModalOpen"
      :schedule-to-edit="scheduleToEdit"
      @saved="loadSchedules"
    />

    <!-- Modal Rápido de Creación de Pedido para Cliente Frecuente -->
    <OrderFormModal
      v-model:open="isOrderModalOpen"
      :order-to-edit="orderToPrefill"
      @saved="() => loadSchedules(currentPage)"
    />

    <!-- Modal Cobrar Pedidos con Deuda para Cliente Frecuente -->
    <CollectDebtModal
      v-model:open="isDebtModalOpen"
      :customer="customerToCollect"
      @saved="() => loadSchedules(currentPage)"
    />
  </div>
</template>
