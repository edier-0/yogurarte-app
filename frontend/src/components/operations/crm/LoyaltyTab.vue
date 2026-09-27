<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { refDebounced } from '@vueuse/core';
import {
  Gift,
  Search,
  RefreshCw,
  Send,
  Award,
  TrendingUp,
  Package,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';
import { useCrmStore } from '@/stores/crm.store';

export interface LoyaltyCustomerItem {
  id: number;
  fullName: string;
  phone: string;
  address?: string | null;
  totalOrders: number;
  totalBottles: number;
  redeemedCount: number;
  currentCycleBottles: number;
  rewardsAvailable: number;
  progressPercent: number;
  hasAvailableReward: boolean;
}

export interface LoyaltyResponse {
  customers: LoyaltyCustomerItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

const emit = defineEmits<{
  (e: 'open-chat', customer: { id: number; fullName: string; phone: string }): void;
}>();

const crmStore = useCrmStore();
const customers = ref<LoyaltyCustomerItem[]>([]);
const pagination = ref({
  page: 1,
  limit: 12,
  totalItems: 0,
  totalPages: 1,
});

const searchQuery = ref('');
const debouncedSearch = refDebounced(searchQuery, 350);
const isLoading = ref(false);
const isRedeemingId = ref<number | null>(null);

// Resumen de Métricas Globales
const metrics = computed(() => {
  const totalInProgram = pagination.value.totalItems;
  const totalBottlesSum = customers.value.reduce((acc, c) => acc + c.totalBottles, 0);
  const rewardsAvailableSum = customers.value.reduce((acc, c) => acc + c.rewardsAvailable, 0);
  const totalRedeemedSum = customers.value.reduce((acc, c) => acc + c.redeemedCount, 0);

  return {
    totalInProgram,
    totalBottlesSum,
    rewardsAvailableSum,
    totalRedeemedSum,
  };
});

async function fetchLoyaltyData(page = 1) {
  isLoading.value = true;
  try {
    const params: Record<string, any> = {
      page: String(page),
      limit: String(pagination.value.limit),
    };
    if (debouncedSearch.value.trim()) {
      params.search = debouncedSearch.value.trim();
    }

    const res = await http.get<LoyaltyResponse>('/crm/loyalty', { params });
    if (res && Array.isArray(res.customers)) {
      customers.value = res.customers;
      pagination.value = res.pagination;
    }
  } catch (err: any) {
    toast.error('Error al cargar datos de fidelización');
  } finally {
    isLoading.value = false;
  }
}

// Búsqueda reactiva
import { watch } from 'vue';
watch(debouncedSearch, () => {
  fetchLoyaltyData(1);
});

// Canjear Premio de 1L Gratis
async function handleRedeemReward(cust: LoyaltyCustomerItem) {
  if (cust.rewardsAvailable <= 0) return;

  const confirmed = window.confirm(
    `¿Confirmas la redención de 1 Litro gratis para ${cust.fullName}? Se descontarán 10 botellas acumuladas del saldo promocional.`
  );
  if (!confirmed) return;

  isRedeemingId.value = cust.id;
  try {
    const res = await http.post<{ success: boolean; message: string }>('/crm/loyalty/redeem', {
      customerId: cust.id,
    });

    toast.success(res?.message || `Premio de 1L gratis redimido para ${cust.fullName}`);
    await fetchLoyaltyData(pagination.value.page);
  } catch (err: any) {
    toast.error(err?.response?.data?.error || 'No se pudo redimir el premio');
  } finally {
    isRedeemingId.value = null;
  }
}

// Notificar por WhatsApp institucional
async function handleNotifyWhatsApp(cust: LoyaltyCustomerItem) {
  let textMessage = '';
  if (cust.rewardsAvailable > 0) {
    textMessage = `Estimado/a *${cust.fullName}*, le saludamos de *YogurArte*. Nos complace informarle que en nuestro Programa de Fidelización acumula ${cust.totalBottles} botellas y cuenta con *${cust.rewardsAvailable} botella(s) de 1 Litro GRATIS* lista(s) para reclamar en su próximo pedido. ¡Gracias por su preferencia!`;
  } else {
    const remaining = 10 - cust.currentCycleBottles;
    textMessage = `Estimado/a *${cust.fullName}*, le saludamos de *YogurArte*. Le recordamos que en su tarjeta de fidelización lleva *${cust.currentCycleBottles}/10 botellas*. Le faltan solo *${remaining} botella(s)* para recibir su próximo litro totalmente gratis.`;
  }

  await crmStore.sendSmartWhatsApp({
    phone: cust.phone,
    text: textMessage,
    customerId: cust.id,
    contactName: cust.fullName,
  });

  emit('open-chat', { id: cust.id, fullName: cust.fullName, phone: cust.phone });
}

onMounted(() => {
  fetchLoyaltyData(1);
});
</script>

<template>
  <div class="space-y-5">
    <!-- Métricas del Programa 10+1 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card flex items-center justify-between">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Clientes Inscritos</p>
          <h3 class="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
            {{ pagination.totalItems }}
          </h3>
          <p class="text-[10px] text-slate-500 mt-0.5">En base de datos comercial</p>
        </div>
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <Award class="h-5 w-5 stroke-[2]" />
        </div>
      </div>

      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card flex items-center justify-between">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Botellas Acumuladas</p>
          <h3 class="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
            {{ metrics.totalBottlesSum }}
          </h3>
          <p class="text-[10px] text-slate-500 mt-0.5">En la página actual</p>
        </div>
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-800 dark:bg-brand-950/40 dark:text-brand-darkText">
          <Package class="h-5 w-5 stroke-[2]" />
        </div>
      </div>

      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card flex items-center justify-between">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Premios Listos</p>
          <h3 class="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">
            {{ metrics.rewardsAvailableSum }}
          </h3>
          <p class="text-[10px] text-emerald-600/80 mt-0.5">Por redimir ahora mismo</p>
        </div>
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
          <Gift class="h-5 w-5 stroke-[2]" />
        </div>
      </div>

      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card flex items-center justify-between">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Canjeados Históricos</p>
          <h3 class="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
            {{ metrics.totalRedeemedSum }}
          </h3>
          <p class="text-[10px] text-slate-500 mt-0.5">Litros gratuitos entregados</p>
        </div>
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <TrendingUp class="h-5 w-5 stroke-[2]" />
        </div>
      </div>
    </div>

    <!-- Barra de Filtros y Búsqueda -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
      <div class="relative w-full sm:w-96">
        <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 stroke-[2]" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar cliente por nombre o teléfono..."
          class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
        />
      </div>

      <div class="flex items-center gap-2 self-end sm:self-auto">
        <button
          type="button"
          @click="fetchLoyaltyData(pagination.page)"
          :disabled="isLoading"
          class="inline-flex items-center gap-1.5 rounded-xl border border-surface-light-border bg-surface-light-card px-3 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw class="h-3.5 w-3.5 stroke-[2]" :class="{ 'animate-spin': isLoading }" />
          <span>Actualizar</span>
        </button>
      </div>
    </div>

    <!-- Grid de Tarjetas de Clientes / Fidelización -->
    <div v-if="isLoading" class="py-16 text-center text-xs font-semibold text-slate-400">
      <RefreshCw class="mx-auto h-6 w-6 animate-spin mb-2 text-slate-400" />
      Cargando clientes del programa de fidelización...
    </div>

    <div v-else-if="customers.length === 0" class="rounded-3xl border border-surface-light-border bg-surface-light-card p-12 text-center text-slate-400 dark:border-surface-dark-border dark:bg-surface-dark-card">
      <Gift class="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-2 stroke-[1.5]" />
      <h3 class="text-sm font-extrabold text-slate-700 dark:text-slate-300">No se encontraron clientes</h3>
      <p class="text-xs text-slate-400 mt-1">Los clientes acumulan botellas automáticamente con cada pedido registrado.</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="cust in customers"
        :key="cust.id"
        class="rounded-2xl border bg-surface-light-card p-5 shadow-card transition-all hover:shadow-md dark:bg-surface-dark-card flex flex-col justify-between"
        :class="
          cust.rewardsAvailable > 0
            ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/20'
            : 'border-surface-light-border dark:border-surface-dark-border'
        "
      >
        <!-- Info Superior -->
        <div>
          <div class="flex items-start justify-between gap-2">
            <div>
              <h4 class="text-sm font-extrabold text-slate-900 dark:text-white">
                {{ cust.fullName }}
              </h4>
              <div class="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span class="inline-flex items-center gap-1 font-semibold">
                  <Phone class="h-3 w-3 stroke-[2] text-slate-400" />
                  {{ cust.phone }}
                </span>
                <span v-if="cust.address" class="truncate max-w-[150px] inline-flex items-center gap-1" :title="cust.address">
                  <MapPin class="h-3 w-3 stroke-[2] text-slate-400 shrink-0" />
                  {{ cust.address }}
                </span>
              </div>
            </div>

            <!-- Badge de Premio Disponible -->
            <span
              v-if="cust.rewardsAvailable > 0"
              class="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
            >
              <Gift class="h-3 w-3 stroke-[2.5]" />
              <span>{{ cust.rewardsAvailable }} Premio(s)</span>
            </span>
          </div>

          <!-- Métricas de Botellas -->
          <div class="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-surface-light-canvas/70 p-2.5 text-center dark:bg-surface-dark-canvas/70">
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase">Total</p>
              <p class="text-xs font-black text-slate-800 dark:text-white mt-0.5">
                {{ cust.totalBottles }} unds
              </p>
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase">Ciclo Actual</p>
              <p class="text-xs font-black text-brand-800 dark:text-brand-darkText mt-0.5">
                {{ cust.currentCycleBottles }} / 10
              </p>
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase">Redimidos</p>
              <p class="text-xs font-black text-slate-800 dark:text-white mt-0.5">
                {{ cust.redeemedCount }}
              </p>
            </div>
          </div>

          <!-- Barra de Progreso Reactiva Institucional -->
          <div class="mt-4 space-y-1.5">
            <div class="flex items-center justify-between text-xs font-bold">
              <span class="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <span>Progreso hacia próximo premio</span>
              </span>
              <span
                :class="
                  cust.rewardsAvailable > 0
                    ? 'text-emerald-600 font-extrabold'
                    : 'text-slate-500'
                "
              >
                {{ cust.currentCycleBottles }} de 10 ({{ cust.progressPercent }}%)
              </span>
            </div>

            <!-- Track de la Barra -->
            <div class="h-3 w-full rounded-full bg-slate-100 overflow-hidden dark:bg-slate-800 p-0.5">
              <div
                class="h-full rounded-full transition-all duration-500 ease-out"
                :class="
                  cust.rewardsAvailable > 0
                    ? 'bg-emerald-500'
                    : 'bg-brand-800 dark:bg-brand-600'
                "
                :style="{ width: `${cust.progressPercent}%` }"
              />
            </div>
          </div>
        </div>

        <!-- Acciones Inferiores -->
        <div class="mt-5 pt-3.5 border-t border-surface-light-border dark:border-surface-dark-border flex items-center gap-2">
          <!-- Botón Redimir Premio -->
          <button
            type="button"
            @click="handleRedeemReward(cust)"
            :disabled="cust.rewardsAvailable <= 0 || isRedeemingId === cust.id"
            class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
            :class="
              cust.rewardsAvailable > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
            "
            title="Redimir 1L Gratis"
          >
            <Gift class="h-3.5 w-3.5 stroke-[2.5]" :class="{ 'animate-spin': isRedeemingId === cust.id }" />
            <span>Redimir Premio</span>
          </button>

          <!-- Botón Notificar WhatsApp -->
          <button
            type="button"
            @click="handleNotifyWhatsApp(cust)"
            class="inline-flex items-center justify-center gap-1.5 rounded-xl border border-surface-light-border bg-surface-light-canvas px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-100 dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-slate-200 dark:hover:bg-slate-800 transition-colors shadow-xs"
            title="Notificar saldo de fidelización por WhatsApp"
          >
            <Send class="h-3.5 w-3.5 stroke-[2]" />
            <span class="hidden sm:inline">WhatsApp</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Paginación -->
    <div
      v-if="pagination.totalPages > 1"
      class="flex items-center justify-between rounded-2xl border border-surface-light-border bg-surface-light-card px-4 py-3 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card"
    >
      <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">
        Mostrando página <span class="font-extrabold text-slate-900 dark:text-white">{{ pagination.page }}</span> de <span class="font-extrabold text-slate-900 dark:text-white">{{ pagination.totalPages }}</span> ({{ pagination.totalItems }} clientes)
      </p>

      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="fetchLoyaltyData(pagination.page - 1)"
          :disabled="pagination.page <= 1 || isLoading"
          class="inline-flex items-center gap-1 rounded-xl border border-surface-light-border bg-surface-light-card px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ChevronLeft class="h-4 w-4" />
          <span>Anterior</span>
        </button>

        <button
          type="button"
          @click="fetchLoyaltyData(pagination.page + 1)"
          :disabled="pagination.page >= pagination.totalPages || isLoading"
          class="inline-flex items-center gap-1 rounded-xl border border-surface-light-border bg-surface-light-card px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <span>Siguiente</span>
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>
