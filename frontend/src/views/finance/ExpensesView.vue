<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { refDebounced } from '@vueuse/core';
import {
  TabsRoot,
  TabsList,
  TabsTrigger,
  TabsContent,
} from 'reka-ui';
import {
  ReceiptText,
  CreditCard,
  Receipt,
  Fuel,
  Zap,
  Boxes,
  Search,
  Plus,
  Trash2,
  RefreshCw,
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';
import ExpenseModal from '@/components/finance/ExpenseModal.vue';

interface ExpenseItem {
  id: number;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
  paymentMethod: string;
  notes?: string | null;
  registeredBy?: string;
}

interface CreditPayment {
  id: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  installmentNumber: number;
  justification?: string | null;
}

interface CreditItem {
  id: number;
  title: string;
  category: string;
  creditor: string;
  principalAmount: number;
  interestRate: number;
  totalAmount: number;
  initialPayment: number;
  remainingBalance: number;
  paymentType: string;
  frequency: string;
  installmentAmount: number;
  totalInstallments: number | null;
  paidInstallments: number;
  startDate: string;
  nextDueDate: string | null;
  status: 'ACTIVO' | 'PAGADO_TOTAL' | string;
  notes?: string | null;
  registeredBy: string;
  payments?: CreditPayment[];
}

const activeTab = ref<'expenses' | 'credits'>('expenses');
const isExpenseModalOpen = ref(false);
const isLoading = ref(false);

// Estado de Gastos
const expenses = ref<ExpenseItem[]>([]);
const activeChip = ref<'ALL' | 'FUEL' | 'SERVICES' | 'OPERATIVE'>('ALL');
const searchQuery = ref('');
const debouncedSearch = refDebounced(searchQuery, 300);

// Estado de Créditos
const credits = ref<CreditItem[]>([]);
const totalDebtFinanced = ref(0);
const totalRemainingBalance = ref(0);
const totalPaidSoFar = ref(0);

// Formateador de moneda en pesos colombianos
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

// Formateador de fecha
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
};

// Cargar Gastos desde la API
async function fetchExpenses() {
  try {
    const data = await http.get<{ totalAmount: number; count: number; expenses: ExpenseItem[] }>(
      '/expenses'
    );
    if (data && Array.isArray(data.expenses)) {
      expenses.value = data.expenses;
    } else if (Array.isArray(data)) {
      expenses.value = data;
    }
  } catch {
    // Interceptor maneja errores
  }
}

// Cargar Créditos desde la API
async function fetchCredits() {
  try {
    const data = await http.get<any>('/credits');
    if (data) {
      credits.value = Array.isArray(data.credits) ? data.credits : Array.isArray(data) ? data : [];
      totalDebtFinanced.value = Number(data.totalDebtFinanced) || 0;
      totalRemainingBalance.value = Number(data.totalRemainingBalance) || 0;
      totalPaidSoFar.value = Number(data.totalPaidSoFar) || 0;
    }
  } catch {
    // Interceptor maneja errores
  }
}

async function loadData() {
  isLoading.value = true;
  try {
    await Promise.all([fetchExpenses(), fetchCredits()]);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  loadData();
});

// Función de mapeo de categoría a chip
function isFuelCategory(cat: string): boolean {
  const c = (cat || '').toUpperCase();
  return c.includes('COMBUSTIBLE') || c.includes('GASOLINA') || c.includes('DOMICILIO') || c.includes('FLETE');
}

function isServicesCategory(cat: string): boolean {
  const c = (cat || '').toUpperCase();
  return (
    c.includes('SERVICIO') ||
    c.includes('MANTENIMIENTO') ||
    c.includes('INFRAESTRUCTURA') ||
    c.includes('LUZ') ||
    c.includes('AGUA') ||
    c.includes('PLANTA')
  );
}

function isOperativeCategory(cat: string): boolean {
  return !isFuelCategory(cat) && !isServicesCategory(cat);
}

// Conteos de los 4 chips
const chipCounts = computed(() => {
  const all = expenses.value.length;
  const fuel = expenses.value.filter((e) => isFuelCategory(e.category)).length;
  const services = expenses.value.filter((e) => isServicesCategory(e.category)).length;
  const operative = expenses.value.filter((e) => isOperativeCategory(e.category)).length;
  return { all, fuel, services, operative };
});

// Gastos filtrados por Chip y por Buscador
const filteredExpenses = computed(() => {
  let result = expenses.value;

  // 1. Filtrar por chip de categoría
  if (activeChip.value === 'FUEL') {
    result = result.filter((e) => isFuelCategory(e.category));
  } else if (activeChip.value === 'SERVICES') {
    result = result.filter((e) => isServicesCategory(e.category));
  } else if (activeChip.value === 'OPERATIVE') {
    result = result.filter((e) => isOperativeCategory(e.category));
  }

  // 2. Filtrar por buscador en vivo con debounce de 300ms
  const q = debouncedSearch.value.trim().toLowerCase();
  if (q) {
    result = result.filter((e) => {
      const desc = (e.description || '').toLowerCase();
      const resp = (e.registeredBy || '').toLowerCase();
      const notes = (e.notes || '').toLowerCase();
      const method = (e.paymentMethod || '').toLowerCase();
      const cat = (e.category || '').toLowerCase();
      return desc.includes(q) || resp.includes(q) || notes.includes(q) || method.includes(q) || cat.includes(q);
    });
  }

  return result;
});

// Métrica Dinámica: Total Acumulado Filtrado
const totalFilteredAmount = computed(() => {
  return filteredExpenses.value.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
});

// Eliminar un gasto
async function deleteExpense(id: number) {
  if (!window.confirm('¿Seguro que deseas eliminar este gasto?')) return;
  try {
    await http.delete(`/expenses/${id}`);
    toast.success('Gasto Eliminado', {
      description: 'El egreso fue removido del libro de compras y gastos.',
    });
    fetchExpenses();
  } catch {
    // Interceptor maneja errores
  }
}

// Pagar cuota de un crédito
async function payInstallment(credit: CreditItem) {
  const defaultAmount = credit.installmentAmount || Math.min(credit.remainingBalance, 50000);
  const inputVal = window.prompt(
    `Ingresa el valor del abono/cuota para "${credit.title}" (Saldo: ${formatCurrency(credit.remainingBalance)}):`,
    String(defaultAmount)
  );
  if (!inputVal) return;

  const parsed = Number(inputVal);
  if (isNaN(parsed) || parsed <= 0) {
    toast.error('Monto Inválido', { description: 'Ingresa un valor numérico positivo.' });
    return;
  }

  try {
    await http.post(`/credits/${credit.id}/pay`, {
      amount: parsed,
      paymentMethod: 'EFECTIVO',
      paymentDate: new Date().toISOString().split('T')[0],
      justification: 'Pago de cuota de crédito',
    });
    toast.success('¡Abono Asentado!', {
      description: `Se abonaron ${formatCurrency(parsed)} a "${credit.title}".`,
    });
    fetchCredits();
  } catch {
    // Manejado por interceptor
  }
}

// Eliminar obligación de crédito
async function deleteCredit(id: number) {
  if (!window.confirm('¿Seguro que deseas eliminar este crédito u obligación financiada?')) return;
  try {
    await http.delete(`/credits/${id}`);
    toast.success('Crédito Eliminado', {
      description: 'La obligación a cuotas fue cancelada y archivada.',
    });
    fetchCredits();
  } catch {
    // Manejado por interceptor
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Encabezado de la Vista -->
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Gastos e Inversión
        </h1>
        <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Control de egresos operativos, fletes de domicilios, servicios públicos y compras a cuotas.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="loadData"
          :disabled="isLoading"
          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-surface-light-card px-3 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all active:scale-95 hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-dark-card dark:text-slate-200"
          title="Actualizar listados"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
          <span class="hidden sm:inline">Refrescar</span>
        </button>

        <button
          type="button"
          @click="isExpenseModalOpen = true"
          class="inline-flex items-center gap-2 rounded-xl bg-hero-gradient px-4 py-2.5 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95"
        >
          <Plus class="h-4 w-4 stroke-[2.5]" />
          <span>Registrar Gasto</span>
        </button>
      </div>
    </div>

    <!-- Navegación por Sub-pestañas (Reka UI Tabs) -->
    <TabsRoot v-model="activeTab" class="space-y-6">
      <TabsList
        class="inline-flex h-12 items-center gap-1.5 rounded-2xl border border-surface-light-border bg-surface-light-card p-1 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card"
      >
        <!-- Tab 1: Gastos Operativos -->
        <TabsTrigger
          value="expenses"
          class="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all data-[state=active]:bg-brand-800 data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-brand-500 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ReceiptText class="h-4 w-4 stroke-[1.75]" />
          <span>Gastos Operativos e Infraestructura</span>
        </TabsTrigger>

        <!-- Tab 2: Compras a Cuotas y Créditos -->
        <TabsTrigger
          value="credits"
          class="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all data-[state=active]:bg-brand-800 data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-brand-500 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <CreditCard class="h-4 w-4 stroke-[1.75]" />
          <span>Compras a Cuotas y Créditos</span>
          <span
            v-if="credits.filter((c) => c.status === 'ACTIVO').length > 0"
            class="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-black text-white"
          >
            {{ credits.filter((c) => c.status === 'ACTIVO').length }}
          </span>
        </TabsTrigger>
      </TabsList>

      <!-- CONTENIDO PESTAÑA 1: GASTOS OPERATIVOS -->
      <TabsContent value="expenses" class="space-y-6 focus:outline-none">
        <!-- Tarjeta de Resumen Superior: Total Acumulado Filtrado -->
        <div class="rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-7">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                  <Receipt class="h-3.5 w-3.5 stroke-[2]" />
                  Total Acumulado Filtrado
                </span>
                <span class="text-xs font-bold text-slate-400">
                  {{ filteredExpenses.length }} {{ filteredExpenses.length === 1 ? 'registro' : 'registros' }}
                </span>
              </div>
              <div class="mt-2 text-3xl font-black text-slate-900 dark:text-white sm:text-4xl">
                {{ formatCurrency(totalFilteredAmount) }}
              </div>
            </div>

            <!-- Buscador en Vivo con Debounce de 300 ms -->
            <div class="relative w-full sm:w-80">
              <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Buscar descripción, responsable..."
                class="w-full rounded-2xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>
          </div>
        </div>

        <!-- Tira de 4 Chips Consolidados con Lucide Icons -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <!-- 1. [Receipt Todos los Gastos] -->
          <button
            type="button"
            @click="activeChip = 'ALL'"
            class="inline-flex items-center gap-2 whitespace-nowrap rounded-2xl px-4 py-2 text-xs font-extrabold transition-all"
            :class="
              activeChip === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                : 'border border-surface-light-border bg-surface-light-card text-slate-600 hover:bg-slate-100 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-300'
            "
          >
            <Receipt class="h-4 w-4 stroke-[1.75]" />
            <span>Todos los Gastos ({{ chipCounts.all }})</span>
          </button>

          <!-- 2. [Fuel Domicilio y Gasolina] -->
          <button
            type="button"
            @click="activeChip = 'FUEL'"
            class="inline-flex items-center gap-2 whitespace-nowrap rounded-2xl px-4 py-2 text-xs font-extrabold transition-all"
            :class="
              activeChip === 'FUEL'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'border border-surface-light-border bg-surface-light-card text-slate-600 hover:bg-slate-100 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-300'
            "
          >
            <Fuel class="h-4 w-4 stroke-[1.75]" />
            <span>Domicilio y Gasolina ({{ chipCounts.fuel }})</span>
          </button>

          <!-- 3. [Zap Servicios e Infraestructura] -->
          <button
            type="button"
            @click="activeChip = 'SERVICES'"
            class="inline-flex items-center gap-2 whitespace-nowrap rounded-2xl px-4 py-2 text-xs font-extrabold transition-all"
            :class="
              activeChip === 'SERVICES'
                ? 'bg-dairy-500 text-white shadow-sm'
                : 'border border-surface-light-border bg-surface-light-card text-slate-600 hover:bg-slate-100 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-300'
            "
          >
            <Zap class="h-4 w-4 stroke-[1.75]" />
            <span>Servicios e Infraestructura ({{ chipCounts.services }})</span>
          </button>

          <!-- 4. [Boxes Operativos y Varios] -->
          <button
            type="button"
            @click="activeChip = 'OPERATIVE'"
            class="inline-flex items-center gap-2 whitespace-nowrap rounded-2xl px-4 py-2 text-xs font-extrabold transition-all"
            :class="
              activeChip === 'OPERATIVE'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'border border-surface-light-border bg-surface-light-card text-slate-600 hover:bg-slate-100 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-300'
            "
          >
            <Boxes class="h-4 w-4 stroke-[1.75]" />
            <span>Operativos y Varios ({{ chipCounts.operative }})</span>
          </button>
        </div>

        <!-- Renderizado de Tarjetas de Gasto con v-auto-animate -->
        <div v-auto-animate class="space-y-3">
          <!-- Estado Vacío -->
          <div
            v-if="filteredExpenses.length === 0"
            class="rounded-3xl border border-dashed border-surface-light-border bg-surface-light-card p-10 text-center dark:border-surface-dark-border dark:bg-surface-dark-card"
          >
            <Receipt class="mx-auto h-12 w-12 text-slate-400 stroke-[1.5]" />
            <h3 class="mt-3 text-base font-extrabold text-slate-900 dark:text-white">
              No se encontraron gastos
            </h3>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              No hay registros que coincidan con la categoría o término de búsqueda.
            </p>
          </div>

          <!-- Tarjetas de Gasto -->
          <div
            v-for="expense in filteredExpenses"
            :key="expense.id"
            class="flex flex-col gap-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 transition-all hover:border-slate-300 dark:border-surface-dark-border dark:bg-surface-dark-card sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="flex items-center gap-3.5">
              <!-- Icono dinámico según categoría -->
              <div
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                :class="
                  isFuelCategory(expense.category)
                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                    : isServicesCategory(expense.category)
                    ? 'bg-dairy-50 text-dairy-500 dark:bg-blue-950/40 dark:text-blue-400'
                    : 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400'
                "
              >
                <Fuel v-if="isFuelCategory(expense.category)" class="h-5 w-5 stroke-[1.75]" />
                <Zap v-else-if="isServicesCategory(expense.category)" class="h-5 w-5 stroke-[1.75]" />
                <Boxes v-else class="h-5 w-5 stroke-[1.75]" />
              </div>

              <!-- Detalle -->
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-extrabold text-slate-900 dark:text-white">
                    {{ expense.description }}
                  </span>
                  <span
                    class="rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider"
                    :class="
                      isFuelCategory(expense.category)
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                        : isServicesCategory(expense.category)
                        ? 'bg-dairy-100 text-dairy-800 dark:bg-blue-900/40 dark:text-blue-300'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                    "
                  >
                    {{ expense.category }}
                  </span>
                </div>

                <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>{{ formatDate(expense.expenseDate) }}</span>
                  <span>•</span>
                  <span class="font-bold text-slate-700 dark:text-slate-300">
                    {{ expense.paymentMethod }}
                  </span>
                  <span v-if="expense.registeredBy">• Por: {{ expense.registeredBy }}</span>
                </div>

                <p v-if="expense.notes" class="mt-1 text-xs italic text-slate-400">
                  "{{ expense.notes }}"
                </p>
              </div>
            </div>

            <!-- Monto y Acción Eliminar -->
            <div class="flex items-center justify-between sm:justify-end gap-4 border-t border-surface-light-border pt-2.5 sm:border-t-0 sm:pt-0 dark:border-surface-dark-border">
              <span class="text-base font-black text-rose-600 dark:text-rose-400 sm:text-lg">
                {{ formatCurrency(expense.amount) }}
              </span>

              <button
                type="button"
                @click="deleteExpense(expense.id)"
                class="rounded-xl p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                title="Eliminar gasto"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </TabsContent>

      <!-- CONTENIDO PESTAÑA 2: COMPRAS A CUOTAS Y CRÉDITOS -->
      <TabsContent value="credits" class="space-y-6 focus:outline-none">
        <!-- Métricas de Créditos -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <!-- Total Financiado -->
          <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Deuda Financiada
            </span>
            <div class="mt-2 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
              {{ formatCurrency(totalDebtFinanced) }}
            </div>
          </div>

          <!-- Total Pagado -->
          <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
            <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Total Pagado a la Fecha
            </span>
            <div class="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400 sm:text-3xl">
              {{ formatCurrency(totalPaidSoFar) }}
            </div>
          </div>

          <!-- Saldo Pendiente Activo -->
          <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
            <span class="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Saldo Pendiente Activo
            </span>
            <div class="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400 sm:text-3xl">
              {{ formatCurrency(totalRemainingBalance) }}
            </div>
          </div>
        </div>

        <!-- Listado de Obligaciones a Cuotas con v-auto-animate -->
        <div v-auto-animate class="space-y-4">
          <!-- Estado Vacío -->
          <div
            v-if="credits.length === 0"
            class="rounded-3xl border border-dashed border-surface-light-border bg-surface-light-card p-10 text-center dark:border-surface-dark-border dark:bg-surface-dark-card"
          >
            <CreditCard class="mx-auto h-12 w-12 text-slate-400 stroke-[1.5]" />
            <h3 class="mt-3 text-base font-extrabold text-slate-900 dark:text-white">
              No hay compras a cuotas registradas
            </h3>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Registra compras financiadas o créditos de maquinaria activando la casilla en el modal de gasto.
            </p>
          </div>

          <!-- Tarjetas de Crédito -->
          <div
            v-for="credit in credits"
            :key="credit.id"
            class="rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-card transition-all hover:border-slate-300 dark:border-surface-dark-border dark:bg-surface-dark-card"
          >
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <!-- Información Principal -->
              <div>
                <div class="flex items-center gap-2.5">
                  <span class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                    {{ credit.title }}
                  </span>
                  <span
                    class="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
                    :class="
                      credit.status === 'ACTIVO'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                    "
                  >
                    {{ credit.status === 'ACTIVO' ? 'Crédito Activo' : 'Paz y Salvo' }}
                  </span>
                </div>

                <div class="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span class="font-bold text-slate-700 dark:text-slate-300">
                    Acreedor: {{ credit.creditor }}
                  </span>
                  <span>•</span>
                  <span>Frecuencia: {{ credit.frequency }}</span>
                  <span v-if="credit.nextDueDate">• Próx. Vencimiento: {{ formatDate(credit.nextDueDate) }}</span>
                </div>
              </div>

              <!-- Saldo Pendiente y Botones -->
              <div class="flex flex-col sm:items-end">
                <span class="text-xs font-bold text-slate-400">Saldo Pendiente:</span>
                <span class="text-xl font-black text-rose-600 dark:text-rose-400 sm:text-2xl">
                  {{ formatCurrency(credit.remainingBalance) }}
                </span>

                <div class="mt-2.5 flex items-center gap-2">
                  <button
                    v-if="credit.remainingBalance > 0"
                    type="button"
                    @click="payInstallment(credit)"
                    class="rounded-xl bg-hero-gradient px-3.5 py-1.5 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95"
                  >
                    Abonar Cuota
                  </button>
                  <button
                    type="button"
                    @click="deleteCredit(credit.id)"
                    class="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                    title="Eliminar crédito"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Barra de Progreso de Pago -->
            <div class="mt-5 space-y-2 border-t border-surface-light-border pt-4 dark:border-surface-dark-border">
              <div class="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>
                  Progreso:
                  {{
                    Math.round(
                      ((credit.totalAmount - credit.remainingBalance) / (credit.totalAmount || 1)) * 100
                    )
                  }}%
                </span>
                <span>
                  Cuota: {{ formatCurrency(credit.installmentAmount) }}
                  <span v-if="credit.totalInstallments">
                    ({{ credit.paidInstallments }} / {{ credit.totalInstallments }} cuotas)
                  </span>
                </span>
              </div>

              <div class="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="credit.remainingBalance <= 0 ? 'bg-emerald-500' : 'bg-brand-800 dark:bg-brand-500'"
                  :style="{
                    width: `${Math.min(
                      100,
                      Math.round(
                        ((credit.totalAmount - credit.remainingBalance) / (credit.totalAmount || 1)) * 100
                      )
                    )}%`,
                  }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>
    </TabsRoot>

    <!-- Modal de Registro de Gasto / Cuotas -->
    <ExpenseModal
      v-model:open="isExpenseModalOpen"
      @saved="loadData"
    />
  </div>
</template>

<style scoped>
.scrollbar-none {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
</style>
