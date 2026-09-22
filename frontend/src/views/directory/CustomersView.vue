<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  Users,
  AlertCircle,
  Calendar,
  ShieldCheck,
  Plus,
  Search,
  RefreshCw,
  PhoneCall,
  MapPin,
  MessageCircle,
  Edit3,
  ShoppingBag,
  Milk,
  ChevronDown,
  ChevronUp,
} from 'lucide-vue-next';
import {
  useDirectoryStore,
  type CustomerItem,
} from '@/stores/directory.store';
import CustomerModal from '@/components/directory/CustomerModal.vue';

const router = useRouter();
const directoryStore = useDirectoryStore();

// Estado modal
const isCustomerModalOpen = ref(false);
const customerToEdit = ref<CustomerItem | null>(null);

// Acordeón de historial por tarjeta de cliente
const expandedCustomerHistory = ref<Record<number, boolean>>({});

function toggleHistory(id: number) {
  expandedCustomerHistory.value[id] = !expandedCustomerHistory.value[id];
}

onMounted(() => {
  directoryStore.fetchCustomers();
});

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
};

// Abre modal para nuevo cliente
function openCreateModal() {
  customerToEdit.value = null;
  isCustomerModalOpen.value = true;
}

// Abre modal para editar
function openEditModal(customer: CustomerItem) {
  customerToEdit.value = customer;
  isCustomerModalOpen.value = true;
}

// WhatsApp inteligente: CRM si es @username, enlace externo si es número
function handleSmartWhatsApp(customer: CustomerItem) {
  const contact = (customer.phone || '').trim();
  if (contact.startsWith('@') || /[a-zA-Z]/.test(contact)) {
    // Redirección al CRM omnicanal interno
    router.push({
      path: '/operaciones/crm',
      query: { contact: contact.replace(/^@/, '') },
    });
  } else {
    // Enlace externo directo a WhatsApp
    const digits = contact.replace(/\D/g, '');
    const phoneWithCountry = digits.startsWith('57') ? digits : `57${digits}`;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(
      `Hola ${customer.fullName}, te saludamos desde YogurArte.`
    )}`;
    window.open(url, '_blank');
  }
}
</script>

<template>
  <div class="space-y-4 sm:space-y-6">
    <!-- Header Principal -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Directorio de Clientes
        </h1>
        <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Base de contactos frecuentes, saldos deudores, historial de pedidos y fidelización
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="directoryStore.fetchCustomers"
          :disabled="directoryStore.isLoading"
          class="inline-flex items-center gap-1.5 rounded-xl border border-surface-light-border bg-surface-light-card px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800"
          title="Actualizar clientes"
        >
          <RefreshCw class="h-4 w-4 stroke-[2]" :class="{ 'animate-spin': directoryStore.isLoading }" />
          <span class="hidden sm:inline">Refrescar</span>
        </button>

        <button
          type="button"
          @click="openCreateModal"
          class="inline-flex items-center gap-2 rounded-xl bg-hero-gradient px-4 py-2.5 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95"
        >
          <Plus class="h-4 w-4 stroke-[2.5]" />
          <span>Nuevo Cliente</span>
        </button>
      </div>
    </div>

    <!-- Métricas Superiores de Clientes -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      <!-- Clientes Totales -->
      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-4 sm:p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-500 dark:text-slate-400">Clientes Totales</span>
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-darkText">
            <Users class="h-4 w-4 stroke-[2]" />
          </div>
        </div>
        <div class="mt-2">
          <span class="text-2xl font-black text-slate-900 dark:text-white">
            {{ directoryStore.customers.length }}
          </span>
          <p class="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Contactos activos registrados en YogurArte
          </p>
        </div>
      </div>

      <!-- Cartera / Saldo en Deuda -->
      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-4 sm:p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-rose-600 dark:text-rose-400">Cartera en Deuda</span>
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            <AlertCircle class="h-4 w-4 stroke-[2]" />
          </div>
        </div>
        <div class="mt-2">
          <span class="text-2xl font-black text-rose-600 dark:text-rose-400">
            {{ formatCurrency(directoryStore.totalDebtAmount) }}
          </span>
          <p class="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {{ directoryStore.chipCounts.debt }} clientes con pedidos entregados pendientes
          </p>
        </div>
      </div>

      <!-- Encargos Activos en Proceso -->
      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-4 sm:p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-amber-600 dark:text-amber-400">Encargos en Proceso</span>
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <Calendar class="h-4 w-4 stroke-[2]" />
          </div>
        </div>
        <div class="mt-2">
          <span class="text-2xl font-black text-amber-600 dark:text-amber-400">
            {{ directoryStore.chipCounts.orders }}
          </span>
          <p class="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Clientes con pedidos pendientes de entrega
          </p>
        </div>
      </div>
    </div>

    <!-- Contenedor Compacto de Filtros en Móviles (<= 768px: p-[10px_12px]) -->
    <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-[10px_12px] sm:p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
      <div class="flex flex-col gap-2.5 sm:gap-3 md:flex-row md:items-center md:justify-between">
        <!-- Buscador Universal de Ancho Completo con debounce de 300 ms -->
        <div class="relative w-full md:max-w-md">
          <Search class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
          <input
            v-model="directoryStore.searchQuery"
            type="text"
            placeholder="Buscar por nombre, alias (@usuario), teléfono o dirección..."
            class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2 sm:py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
          />
        </div>

        <!-- Tira de 4 Chips Táctiles con Contadores e Íconos Lucide (Scrollbar None) -->
        <div class="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 [scrollbar-width:none]">
          <!-- Todos -->
          <button
            type="button"
            @click="directoryStore.activeChip = 'ALL'"
            class="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
            :class="
              directoryStore.activeChip === 'ALL'
                ? 'bg-brand-800 text-white shadow-sm dark:bg-brand-900'
                : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
            "
          >
            <Users class="h-3.5 w-3.5 stroke-[2]" />
            <span>Todos ({{ directoryStore.chipCounts.all }})</span>
          </button>

          <!-- Con Deuda -->
          <button
            type="button"
            @click="directoryStore.activeChip = 'DEBT'"
            class="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
            :class="
              directoryStore.activeChip === 'DEBT'
                ? 'bg-rose-600 text-white shadow-sm dark:bg-rose-600'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-950/60'
            "
          >
            <AlertCircle class="h-3.5 w-3.5 stroke-[2]" />
            <span>Con Deuda ({{ directoryStore.chipCounts.debt }})</span>
          </button>

          <!-- Encargos -->
          <button
            type="button"
            @click="directoryStore.activeChip = 'ORDERS'"
            class="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
            :class="
              directoryStore.activeChip === 'ORDERS'
                ? 'bg-amber-600 text-white shadow-sm dark:bg-amber-600'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:hover:bg-amber-950/60'
            "
          >
            <Calendar class="h-3.5 w-3.5 stroke-[2]" />
            <span>Encargos ({{ directoryStore.chipCounts.orders }})</span>
          </button>

          <!-- Al Día -->
          <button
            type="button"
            @click="directoryStore.activeChip = 'UP_TO_DATE'"
            class="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
            :class="
              directoryStore.activeChip === 'UP_TO_DATE'
                ? 'bg-emerald-600 text-white shadow-sm dark:bg-emerald-600'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/60'
            "
          >
            <ShieldCheck class="h-3.5 w-3.5 stroke-[2]" />
            <span>Al Día ({{ directoryStore.chipCounts.upToDate }})</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Grilla de Tarjetas de Cliente con v-auto-animate -->
    <div v-auto-animate class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
      <div
        v-for="c in directoryStore.filteredCustomers"
        :key="c.id"
        class="flex flex-col justify-between rounded-2xl border bg-surface-light-card p-4 sm:p-5 shadow-card transition-all hover:border-slate-300 dark:bg-surface-dark-card dark:hover:border-slate-700"
        :class="
          c.deliveredPendingDebt > 0
            ? 'border-rose-400/60 bg-rose-50/15 dark:border-rose-900/50 dark:bg-rose-950/10'
            : c.inProcessPendingAmount > 0
            ? 'border-amber-400/50 bg-amber-50/15 dark:border-amber-900/40 dark:bg-amber-950/10'
            : 'border-surface-light-border dark:border-surface-dark-border'
        "
      >
        <!-- Información Superior -->
        <div>
          <!-- Nombre y Badge de Estado Financiero -->
          <div class="flex items-start justify-between gap-2">
            <div>
              <h3 class="text-base font-extrabold text-slate-900 dark:text-white">
                {{ c.fullName }}
              </h3>

              <!-- Teléfono con enlace rápido para llamada tel: -->
              <div class="mt-1 flex items-center gap-1.5">
                <a
                  :href="c.phone && !c.phone.startsWith('@') ? `tel:${c.phone}` : undefined"
                  class="inline-flex items-center gap-1 text-xs font-bold text-slate-600 transition-colors hover:text-brand-800 dark:text-slate-300 dark:hover:text-brand-darkText"
                  :title="c.phone && !c.phone.startsWith('@') ? 'Llamar a cliente' : 'Contacto'"
                >
                  <PhoneCall class="h-3.5 w-3.5 stroke-[2] text-slate-400" />
                  <span>{{ c.phone || 'Sin teléfono' }}</span>
                </a>
              </div>
            </div>

            <!-- Badge de Saldo / Deuda -->
            <div>
              <span
                v-if="c.deliveredPendingDebt > 0"
                class="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-black text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
              >
                <AlertCircle class="h-3 w-3 stroke-[2.5]" />
                <span>Debe {{ formatCurrency(c.deliveredPendingDebt) }}</span>
              </span>
              <span
                v-else-if="c.inProcessPendingAmount > 0"
                class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
              >
                <Calendar class="h-3 w-3 stroke-[2]" />
                <span>Encargo {{ formatCurrency(c.inProcessPendingAmount) }}</span>
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
              >
                <ShieldCheck class="h-3 w-3 stroke-[2]" />
                <span>Al Día</span>
              </span>
            </div>
          </div>

          <!-- Ubicación / Dirección -->
          <div class="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <MapPin class="h-3.5 w-3.5 shrink-0 stroke-[1.75] text-slate-400" />
            <span class="truncate">
              {{ c.address || 'Fonseca' }}{{ c.neighborhood ? ` (${c.neighborhood})` : '' }}
            </span>
          </div>

          <!-- Resumen de Consumo -->
          <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div class="rounded-xl border border-surface-light-border/60 bg-surface-light-canvas/60 p-2 dark:border-surface-dark-border/60 dark:bg-surface-dark-canvas/60">
              <span class="block text-[10px] font-bold uppercase text-slate-400">Pedidos Totales</span>
              <div class="mt-0.5 flex items-center gap-1 font-black text-slate-800 dark:text-slate-200">
                <ShoppingBag class="h-3.5 w-3.5 stroke-[2] text-brand-800 dark:text-brand-darkText" />
                <span>{{ c.totalOrders }}</span>
              </div>
            </div>

            <div class="rounded-xl border border-surface-light-border/60 bg-surface-light-canvas/60 p-2 dark:border-surface-dark-border/60 dark:bg-surface-dark-canvas/60">
              <span class="block text-[10px] font-bold uppercase text-slate-400">Litros Consumidos</span>
              <div class="mt-0.5 flex items-center gap-1 font-black text-slate-800 dark:text-slate-200">
                <Milk class="h-3.5 w-3.5 stroke-[2] text-natural-600 dark:text-natural-400" />
                <span>{{ c.totalLiters }} L</span>
              </div>
            </div>
          </div>

          <!-- Acordeón / Desplegable de Notas e Historial Rápido -->
          <div v-if="c.notes || c.latestOrderNotes || c.latestOrderDate" class="mt-2.5">
            <button
              type="button"
              @click="toggleHistory(c.id)"
              class="inline-flex w-full items-center justify-between text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <span>{{ expandedCustomerHistory[c.id] ? 'Ocultar detalles' : 'Ver notas e historial' }}</span>
              <ChevronUp v-if="expandedCustomerHistory[c.id]" class="h-3.5 w-3.5" />
              <ChevronDown v-else class="h-3.5 w-3.5" />
            </button>

            <div
              v-if="expandedCustomerHistory[c.id]"
              class="mt-1.5 space-y-1.5 rounded-xl bg-surface-light-canvas p-2.5 text-[11px] text-slate-600 dark:bg-surface-dark-canvas dark:text-slate-300 border border-surface-light-border dark:border-surface-dark-border"
            >
              <div v-if="c.notes" class="font-medium">
                <span class="font-bold text-slate-400">Preferencia:</span> {{ c.notes }}
              </div>
              <div v-if="c.latestOrderNotes" class="font-medium">
                <span class="font-bold text-slate-400">Último pedido:</span> {{ c.latestOrderNotes }}
              </div>
              <div v-if="c.latestOrderDate" class="text-[10px] text-slate-400">
                Última compra: {{ formatDate(c.latestOrderDate) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Botonera de Acción de la Tarjeta -->
        <div class="mt-4 flex items-center gap-2 border-t border-surface-light-border pt-3 dark:border-surface-dark-border">
          <!-- Botón de WhatsApp Inteligente -->
          <button
            type="button"
            @click="handleSmartWhatsApp(c)"
            class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-300/80 bg-emerald-50 px-2.5 py-2 text-xs font-extrabold text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
            :title="c.phone && c.phone.startsWith('@') ? 'Abrir chat CRM' : 'Abrir WhatsApp'"
          >
            <MessageCircle class="h-4 w-4 stroke-[2]" />
            <span>{{ c.phone && c.phone.startsWith('@') ? 'Chat CRM' : 'WhatsApp' }}</span>
          </button>

          <!-- Botón de Edición -->
          <button
            type="button"
            @click="openEditModal(c)"
            class="inline-flex items-center justify-center rounded-xl border border-surface-light-border bg-surface-light-canvas p-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800"
            title="Editar cliente"
          >
            <Edit3 class="h-4 w-4 stroke-[2]" />
          </button>
        </div>
      </div>
    </div>

    <!-- Estado Vacío -->
    <div
      v-if="directoryStore.filteredCustomers.length === 0"
      class="rounded-2xl border border-surface-light-border bg-surface-light-card p-10 text-center shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card"
    >
      <Users class="mx-auto h-12 w-12 text-slate-400 stroke-[1.5]" />
      <h3 class="mt-3 text-base font-extrabold text-slate-900 dark:text-white">
        No se encontraron clientes
      </h3>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Prueba ajustando el texto de búsqueda o el chip de filtro seleccionado.
      </p>
    </div>

    <!-- Modal Accesible de Registro y Edición -->
    <CustomerModal
      v-model:open="isCustomerModalOpen"
      :customer-to-edit="customerToEdit"
      @saved="directoryStore.fetchCustomers"
    />
  </div>
</template>
