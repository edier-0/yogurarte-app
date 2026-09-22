<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  TabsRoot,
  TabsList,
  TabsTrigger,
  TabsContent,
} from 'reka-ui';
import {
  Users,
  Crown,
  HardHat,
  BadgeDollarSign,
  Plus,
  Settings,
  Receipt,
  Lock,
  PhoneCall,
  Calendar,
  Banknote,
  Smartphone,
  RefreshCw,
  Edit3,
  Search,
  MessageCircle,
  ShieldCheck,
  UserCheck,
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { refDebounced } from '@vueuse/core';
import StaffModal, { type StaffMemberItem } from '@/components/directory/StaffModal.vue';
import StaffPaymentModal from '@/components/directory/StaffPaymentModal.vue';
import NequiConfigModal from '@/components/directory/NequiConfigModal.vue';

interface StaffPaymentItem {
  id: number;
  staffId: number;
  paymentType: string;
  amount: number;
  deductions: number;
  netAmount: number;
  paymentMethod: string;
  paymentDate: string;
  notes?: string | null;
  registeredBy?: string;
  staff?: {
    id: number;
    fullName: string;
    phone?: string | null;
    role?: string | null;
    type: string;
    bankInfo?: string | null;
  };
}

interface UserItem {
  id: number;
  name: string;
  username: string;
  role: string;
  isActive?: boolean;
}

type StaffChip = 'ALL' | 'PARTNERS' | 'EMPLOYEES';

// Estado de datos
const staffList = ref<StaffMemberItem[]>([]);
const paymentsList = ref<StaffPaymentItem[]>([]);
const usersList = ref<UserItem[]>([]);
const isLoading = ref<boolean>(false);

// Navegación de Pestañas
const activeTab = ref<'team' | 'payments' | 'roles'>('team');

// Filtros para Equipo
const activeTeamChip = ref<StaffChip>('ALL');
const searchTeam = ref<string>('');
const debouncedTeamSearch = refDebounced(searchTeam, 300);

// Filtros para Pagos
const searchPayments = ref<string>('');
const debouncedPaymentsSearch = refDebounced(searchPayments, 300);

// Modales reactivos
const isStaffModalOpen = ref(false);
const staffToEdit = ref<StaffMemberItem | null>(null);

const isPaymentModalOpen = ref(false);
const preselectedStaffId = ref<number | null>(null);

const isNequiModalOpen = ref(false);

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

// Carga de datos
async function fetchStaff() {
  try {
    const data = await http.get<StaffMemberItem[]>('/staff', {
      params: { includeInactive: 'false' },
    });
    if (Array.isArray(data)) {
      staffList.value = data;
    }
  } catch {
    // Interceptor global
  }
}

async function fetchPayments() {
  try {
    const data = await http.get<any>('/staff/payments/list');
    if (data && Array.isArray(data.payments)) {
      paymentsList.value = data.payments;
    } else if (Array.isArray(data)) {
      paymentsList.value = data;
    }
  } catch {
    // Interceptor global
  }
}

async function fetchUsers() {
  try {
    // Intentar primero endpoint público o protegido
    const data = await http.get<UserItem[]>('/users/public-list');
    if (Array.isArray(data)) {
      usersList.value = data;
    }
  } catch {
    try {
      const dataAdmin = await http.get<UserItem[]>('/users');
      if (Array.isArray(dataAdmin)) {
        usersList.value = dataAdmin;
      }
    } catch {
      // Ignorar si no tiene permisos
    }
  }
}

async function refreshAll() {
  isLoading.value = true;
  try {
    await Promise.all([fetchStaff(), fetchPayments(), fetchUsers()]);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  refreshAll();
});

// Métricas Superiores
const activePartnersCount = computed(() => {
  return staffList.value.filter((s) => s.type === 'SOCIO').length;
});

const activeEmployeesCount = computed(() => {
  return staffList.value.filter((s) => s.type === 'EMPLEADO').length;
});

const totalLiquidatedAmount = computed(() => {
  return paymentsList.value.reduce((acc, p) => acc + (Number(p.netAmount) || 0), 0);
});

// Conteos por chip
const chipCounts = computed(() => {
  const all = staffList.value.length;
  const partners = activePartnersCount.value;
  const employees = activeEmployeesCount.value;
  return { all, partners, employees };
});

// Integrantes filtrados reactivamente
const filteredStaff = computed(() => {
  let list = staffList.value;

  if (activeTeamChip.value === 'PARTNERS') {
    list = list.filter((s) => s.type === 'SOCIO');
  } else if (activeTeamChip.value === 'EMPLOYEES') {
    list = list.filter((s) => s.type === 'EMPLEADO');
  }

  const q = debouncedTeamSearch.value.trim().toLowerCase();
  if (q) {
    list = list.filter((s) => {
      const name = (s.fullName || '').toLowerCase();
      const phone = (s.phone || '').toLowerCase();
      const role = (s.role || '').toLowerCase();
      const bank = (s.bankInfo || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || role.includes(q) || bank.includes(q);
    });
  }

  return list;
});

// Historial de pagos filtrado
const filteredPayments = computed(() => {
  let list = paymentsList.value;
  const q = debouncedPaymentsSearch.value.trim().toLowerCase();
  if (q) {
    list = list.filter((p) => {
      const name = (p.staff?.fullName || '').toLowerCase();
      const type = (p.paymentType || '').toLowerCase();
      const notes = (p.notes || '').toLowerCase();
      const method = (p.paymentMethod || '').toLowerCase();
      return name.includes(q) || type.includes(q) || notes.includes(q) || method.includes(q);
    });
  }
  return list;
});

// Apertura de modales
function openCreateStaffModal() {
  staffToEdit.value = null;
  isStaffModalOpen.value = true;
}

function openEditStaffModal(member: StaffMemberItem) {
  staffToEdit.value = member;
  isStaffModalOpen.value = true;
}

function openPaymentForMember(staffId: number) {
  preselectedStaffId.value = staffId;
  isPaymentModalOpen.value = true;
}

async function handleSharePaymentWhatsApp(paymentId: number) {
  try {
    const res = await http.get<{ whatsappUrl: string }>(`/staff/payments/${paymentId}/whatsapp`);
    if (res?.whatsappUrl) {
      window.open(res.whatsappUrl, '_blank');
    }
  } catch {
    // Interceptor
  }
}
</script>

<template>
  <div class="space-y-4 sm:space-y-6">
    <!-- Header Principal y Botonera Superior -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Nómina, Personal y Accesos
        </h1>
        <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Control de colaboradores, jornales de producción, liquidaciones y configuración bancaria
        </p>
      </div>

      <!-- Botonera Superior: En móvil cuadrícula compacta de 2 columnas -->
      <div class="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <!-- BOTÓN OBLIGATORIO: Cuenta de Cobro (Nequi) -->
        <button
          type="button"
          @click="isNequiModalOpen = true"
          class="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-purple-300 bg-purple-50 px-3.5 py-2.5 text-xs font-extrabold text-purple-800 shadow-sm transition-transform active:scale-95 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-950/60 sm:col-auto"
        >
          <Settings class="h-4 w-4 stroke-[2]" />
          <span>Cuenta de Cobro (Nequi)</span>
        </button>

        <button
          type="button"
          @click="isPaymentModalOpen = true"
          class="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-xs font-extrabold text-emerald-800 shadow-sm transition-transform active:scale-95 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
        >
          <Receipt class="h-4 w-4 stroke-[2]" />
          <span>+ Liquidación</span>
        </button>

        <button
          type="button"
          @click="openCreateStaffModal"
          class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-hero-gradient px-3 py-2.5 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95"
        >
          <Plus class="h-4 w-4 stroke-[2.5]" />
          <span>+ Integrante</span>
        </button>

        <button
          type="button"
          @click="refreshAll"
          :disabled="isLoading"
          class="hidden sm:inline-flex items-center justify-center rounded-xl border border-surface-light-border bg-surface-light-card p-2.5 text-slate-600 shadow-sm transition-colors hover:bg-slate-50 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800"
          title="Refrescar"
        >
          <RefreshCw class="h-4 w-4 stroke-[2]" :class="{ 'animate-spin': isLoading }" />
        </button>
      </div>
    </div>

    <!-- Métricas Superiores de Personal -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      <!-- Total Equipo Activo -->
      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-500 dark:text-slate-400">Equipo Activo</span>
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-darkText">
            <Users class="h-4 w-4 stroke-[2]" />
          </div>
        </div>
        <div class="mt-2">
          <span class="text-2xl font-black text-slate-900 dark:text-white">
            {{ staffList.length }}
          </span>
          <p class="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Integrantes vinculados
          </p>
        </div>
      </div>

      <!-- Socios / Dueños -->
      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-amber-600 dark:text-amber-400">Socios / Dueños</span>
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <Crown class="h-4 w-4 stroke-[2]" />
          </div>
        </div>
        <div class="mt-2">
          <span class="text-2xl font-black text-amber-600 dark:text-amber-400">
            {{ activePartnersCount }}
          </span>
          <p class="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Socios fundadores
          </p>
        </div>
      </div>

      <!-- Colaboradores & Domicilios -->
      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-natural-600 dark:text-natural-400">Colaboradores</span>
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-natural-50 text-natural-600 dark:bg-natural-950/40 dark:text-natural-400">
            <HardHat class="h-4 w-4 stroke-[2]" />
          </div>
        </div>
        <div class="mt-2">
          <span class="text-2xl font-black text-natural-600 dark:text-natural-400">
            {{ activeEmployeesCount }}
          </span>
          <p class="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Producción y repartos
          </p>
        </div>
      </div>

      <!-- Liquidación Total Registrada -->
      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400">Total Liquidado</span>
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <BadgeDollarSign class="h-4 w-4 stroke-[2]" />
          </div>
        </div>
        <div class="mt-2">
          <span class="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {{ formatCurrency(totalLiquidatedAmount) }}
          </span>
          <p class="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {{ paymentsList.length }} pagos registrados
          </p>
        </div>
      </div>
    </div>

    <!-- Navegación por Sub-pestañas con Reka UI Tabs -->
    <TabsRoot v-model="activeTab" class="w-full space-y-4">
      <TabsList class="inline-flex rounded-2xl border border-surface-light-border bg-surface-light-canvas p-1 shadow-inner dark:border-surface-dark-border dark:bg-surface-dark-canvas">
        <TabsTrigger
          value="team"
          class="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold text-slate-600 transition-all data-[state=active]:bg-white data-[state=active]:text-brand-800 data-[state=active]:shadow-card dark:text-slate-400 dark:data-[state=active]:bg-surface-dark-card dark:data-[state=active]:text-brand-darkText"
        >
          <Users class="h-4 w-4 stroke-[2]" />
          <span>Equipo y Colaboradores</span>
          <span class="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {{ staffList.length }}
          </span>
        </TabsTrigger>

        <TabsTrigger
          value="payments"
          class="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold text-slate-600 transition-all data-[state=active]:bg-white data-[state=active]:text-brand-800 data-[state=active]:shadow-card dark:text-slate-400 dark:data-[state=active]:bg-surface-dark-card dark:data-[state=active]:text-brand-darkText"
        >
          <Receipt class="h-4 w-4 stroke-[2]" />
          <span>Historial de Pagos</span>
          <span class="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {{ paymentsList.length }}
          </span>
        </TabsTrigger>

        <TabsTrigger
          value="roles"
          class="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold text-slate-600 transition-all data-[state=active]:bg-white data-[state=active]:text-brand-800 data-[state=active]:shadow-card dark:text-slate-400 dark:data-[state=active]:bg-surface-dark-card dark:data-[state=active]:text-brand-darkText"
        >
          <Lock class="h-4 w-4 stroke-[2]" />
          <span>Usuarios y Roles</span>
          <span class="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {{ usersList.length }}
          </span>
        </TabsTrigger>
      </TabsList>

      <!-- PESTAÑA 1: EQUIPO Y COLABORADORES -->
      <TabsContent value="team" class="space-y-4 focus:outline-none">
        <!-- Barra de Filtros y Chips -->
        <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-3 sm:p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
          <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div class="relative w-full md:max-w-xs">
              <Search class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
              <input
                v-model="searchTeam"
                type="text"
                placeholder="Buscar por nombre, cargo, teléfono..."
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>

            <!-- Chips de Filtrado: Todos, Socios, Colaboradores -->
            <div class="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              <!-- Todos -->
              <button
                type="button"
                @click="activeTeamChip = 'ALL'"
                class="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
                :class="
                  activeTeamChip === 'ALL'
                    ? 'bg-brand-800 text-white shadow-sm dark:bg-brand-900'
                    : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
                "
              >
                <Users class="h-3.5 w-3.5 stroke-[2]" />
                <span>Todos ({{ chipCounts.all }})</span>
              </button>

              <!-- Socios / Dueños -->
              <button
                type="button"
                @click="activeTeamChip = 'PARTNERS'"
                class="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
                :class="
                  activeTeamChip === 'PARTNERS'
                    ? 'bg-amber-600 text-white shadow-sm dark:bg-amber-600'
                    : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
                "
              >
                <Crown class="h-3.5 w-3.5 stroke-[2]" />
                <span>Socios / Dueños ({{ chipCounts.partners }})</span>
              </button>

              <!-- Colaboradores -->
              <button
                type="button"
                @click="activeTeamChip = 'EMPLOYEES'"
                class="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
                :class="
                  activeTeamChip === 'EMPLOYEES'
                    ? 'bg-natural-600 text-white shadow-sm dark:bg-natural-600'
                    : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
                "
              >
                <HardHat class="h-3.5 w-3.5 stroke-[2]" />
                <span>Colaboradores ({{ chipCounts.employees }})</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Grilla de Tarjetas de Integrantes -->
        <div v-auto-animate class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="member in filteredStaff"
            :key="member.id"
            class="flex flex-col justify-between rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card transition-all hover:border-slate-300 dark:border-surface-dark-border dark:bg-surface-dark-card dark:hover:border-slate-700"
          >
            <div>
              <!-- Cabecera de la Tarjeta -->
              <div class="flex items-start justify-between gap-2">
                <div>
                  <div class="flex items-center gap-1.5">
                    <span
                      class="rounded-lg px-2 py-0.5 text-[10px] font-black uppercase"
                      :class="
                        member.type === 'SOCIO'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-brand-50 text-brand-800 dark:bg-brand-950/60 dark:text-brand-darkText'
                      "
                    >
                      {{ member.type === 'SOCIO' ? 'Socio' : 'Colaborador' }}
                    </span>
                    <span class="text-xs font-bold text-slate-400">
                      {{ member.role || 'Operativo' }}
                    </span>
                  </div>

                  <h3 class="mt-1 text-base font-extrabold text-slate-900 dark:text-white">
                    {{ member.fullName }}
                  </h3>
                </div>

                <button
                  type="button"
                  @click="openEditStaffModal(member)"
                  class="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  title="Editar datos"
                >
                  <Edit3 class="h-4 w-4 stroke-[2]" />
                </button>
              </div>

              <!-- Teléfono -->
              <div v-if="member.phone" class="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <PhoneCall class="h-3.5 w-3.5 stroke-[2] text-slate-400" />
                <a :href="`tel:${member.phone}`" class="font-bold hover:text-brand-800 dark:hover:text-brand-darkText">
                  {{ member.phone }}
                </a>
              </div>

              <!-- Tarifa y Esquema -->
              <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div class="rounded-xl border border-surface-light-border/60 bg-surface-light-canvas/60 p-2.5 dark:border-surface-dark-border/60 dark:bg-surface-dark-canvas/60">
                  <span class="block text-[10px] font-bold uppercase text-slate-400">Esquema</span>
                  <span class="mt-0.5 block font-extrabold text-slate-700 dark:text-slate-200 truncate">
                    {{ member.paymentScheme }}
                  </span>
                </div>

                <div class="rounded-xl border border-surface-light-border/60 bg-surface-light-canvas/60 p-2.5 dark:border-surface-dark-border/60 dark:bg-surface-dark-canvas/60">
                  <span class="block text-[10px] font-bold uppercase text-slate-400">Tarifa Base</span>
                  <span class="mt-0.5 block font-extrabold text-slate-700 dark:text-slate-200">
                    {{ formatCurrency(member.defaultRate) }}
                  </span>
                </div>
              </div>

              <!-- Información Bancaria -->
              <div v-if="member.bankInfo" class="mt-2.5 rounded-xl bg-purple-50/50 p-2 text-[11px] font-semibold text-purple-900 border border-purple-100 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-900/40">
                <span class="font-bold">Pago:</span> {{ member.bankInfo }}
              </div>
            </div>

            <!-- Botón de Liquidación Directa -->
            <div class="mt-4 border-t border-surface-light-border pt-3 dark:border-surface-dark-border">
              <button
                type="button"
                @click="openPaymentForMember(member.id)"
                class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 py-2 text-xs font-extrabold text-emerald-800 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-950/60 transition-colors"
              >
                <Receipt class="h-3.5 w-3.5 stroke-[2]" />
                <span>Liquidar / Registrar Pago</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Estado Vacío Equipo -->
        <div
          v-if="filteredStaff.length === 0"
          class="rounded-2xl border border-surface-light-border bg-surface-light-card p-10 text-center shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card"
        >
          <Users class="mx-auto h-12 w-12 text-slate-400 stroke-[1.5]" />
          <h3 class="mt-3 text-base font-extrabold text-slate-900 dark:text-white">
            No se encontraron integrantes
          </h3>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Añade colaboradores con el botón "+ Integrante".
          </p>
        </div>
      </TabsContent>

      <!-- PESTAÑA 2: HISTORIAL DE PAGOS Y LIQUIDACIONES -->
      <TabsContent value="payments" class="space-y-4 focus:outline-none">
        <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-3 sm:p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
          <div class="relative w-full max-w-sm">
            <Search class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
            <input
              v-model="searchPayments"
              type="text"
              placeholder="Buscar por colaborador, concepto, medio..."
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            />
          </div>
        </div>

        <!-- Listado de Pagos con v-auto-animate -->
        <div v-auto-animate class="space-y-3">
          <div
            v-for="p in filteredPayments"
            :key="p.id"
            class="flex flex-col gap-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card transition-all sm:flex-row sm:items-center sm:justify-between dark:border-surface-dark-border dark:bg-surface-dark-card"
          >
            <!-- Lado Izquierdo con Ícono y Datos -->
            <div class="flex items-center gap-3">
              <div
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                :class="
                  p.paymentMethod === 'EFECTIVO'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                "
              >
                <Banknote v-if="p.paymentMethod === 'EFECTIVO'" class="h-5 w-5 stroke-[2]" />
                <Smartphone v-else class="h-5 w-5 stroke-[2]" />
              </div>

              <div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-extrabold text-slate-900 dark:text-white">
                    {{ p.staff?.fullName || 'Colaborador' }}
                  </span>
                  <span class="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {{ p.paymentType }}
                  </span>
                </div>

                <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span class="flex items-center gap-1 font-semibold">
                    <Calendar class="h-3.5 w-3.5 stroke-[1.75]" />
                    {{ formatDate(p.paymentDate) }}
                  </span>
                  <span class="font-bold text-slate-600 dark:text-slate-300">
                    Medio: {{ p.paymentMethod }}
                  </span>
                  <span v-if="p.notes" class="font-medium text-slate-600 dark:text-slate-300">
                    Detalle: {{ p.notes }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Lado Derecho: Monto Neto y Comprobante WhatsApp -->
            <div class="flex items-center justify-between border-t border-surface-light-border pt-2 sm:border-0 sm:pt-0 sm:text-right gap-3 dark:border-surface-dark-border">
              <div>
                <span class="block text-base font-black text-emerald-600 dark:text-emerald-400">
                  {{ formatCurrency(p.netAmount) }}
                </span>
                <span v-if="p.deductions > 0" class="block text-[11px] font-semibold text-rose-500">
                  Deducciones: {{ formatCurrency(p.deductions) }}
                </span>
              </div>

              <button
                type="button"
                @click="handleSharePaymentWhatsApp(p.id)"
                class="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
                title="Compartir comprobante por WhatsApp"
              >
                <MessageCircle class="h-3.5 w-3.5 stroke-[2]" />
                <span class="hidden sm:inline">Recibo</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Estado Vacío Pagos -->
        <div
          v-if="filteredPayments.length === 0"
          class="rounded-2xl border border-surface-light-border bg-surface-light-card p-10 text-center shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card"
        >
          <Receipt class="mx-auto h-12 w-12 text-slate-400 stroke-[1.5]" />
          <h3 class="mt-3 text-base font-extrabold text-slate-900 dark:text-white">
            Sin liquidaciones registradas
          </h3>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Registra un jornal o retiro de socio usando el botón "+ Liquidación".
          </p>
        </div>
      </TabsContent>

      <!-- PESTAÑA 3: USUARIOS Y ROLES -->
      <TabsContent value="roles" class="space-y-4 focus:outline-none">
        <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-base font-extrabold text-slate-900 dark:text-white">
                Cuentas de Acceso al Sistema
              </h3>
              <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Usuarios autenticados para operar pedidos, inventario, finanzas y reportes
              </p>
            </div>

            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-darkText">
              <ShieldCheck class="h-5 w-5 stroke-[2]" />
            </div>
          </div>

          <!-- Grilla de Usuarios -->
          <div v-auto-animate class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="u in usersList"
              :key="u.id"
              class="flex items-center justify-between rounded-2xl border border-surface-light-border bg-surface-light-canvas p-4 dark:border-surface-dark-border dark:bg-surface-dark-canvas"
            >
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-800 text-white font-black text-xs shadow-xs">
                  {{ (u.name || u.username || 'U').charAt(0).toUpperCase() }}
                </div>
                <div>
                  <h4 class="text-xs font-extrabold text-slate-900 dark:text-white">
                    {{ u.name || u.username }}
                  </h4>
                  <span class="block text-[11px] font-semibold text-slate-400">
                    @{{ u.username }}
                  </span>
                </div>
              </div>

              <div>
                <span
                  class="rounded-lg px-2.5 py-1 text-[10px] font-black uppercase"
                  :class="
                    u.role === 'ADMIN'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-brand-50 text-brand-800 dark:bg-brand-950/60 dark:text-brand-darkText'
                  "
                >
                  {{ u.role }}
                </span>
              </div>
            </div>

            <div
              v-if="usersList.length === 0"
              class="col-span-full py-6 text-center text-xs font-semibold text-slate-400"
            >
              <UserCheck class="mx-auto h-8 w-8 text-slate-300 mb-1" />
              Sesión de acceso administrada por autenticación central
            </div>
          </div>
        </div>
      </TabsContent>
    </TabsRoot>

    <!-- Modales -->
    <StaffModal
      v-model:open="isStaffModalOpen"
      :staff-to-edit="staffToEdit"
      @saved="refreshAll"
    />

    <StaffPaymentModal
      v-model:open="isPaymentModalOpen"
      :staff-list="staffList"
      :preselected-staff-id="preselectedStaffId"
      @saved="refreshAll"
    />

    <NequiConfigModal
      v-model:open="isNequiModalOpen"
      @saved="refreshAll"
    />
  </div>
</template>
