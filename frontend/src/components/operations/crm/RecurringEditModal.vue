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
  X,
  Repeat,
  Save,
  User,
  Calendar,
  Package,
  Milk,
  FileText,
  Check,
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { useProductionStore } from '@/stores/production.store';
import { toast } from 'vue-sonner';

export interface RecurringScheduleData {
  id?: number;
  customerId: number;
  customer?: {
    id: number;
    fullName: string;
    phone: string;
    address?: string | null;
  } | null;
  frequencyDays: number;
  preferredFlavor: string;
  bottleSize: '1L' | '2L';
  quantity: number;
  nextDate: string;
  notes?: string | null;
  isActive?: boolean;
}

export interface CustomerOption {
  id: number;
  fullName: string;
  phone: string;
  address?: string | null;
}

const props = defineProps<{
  open: boolean;
  scheduleToEdit?: RecurringScheduleData | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'saved'): void;
}>();

const productionStore = useProductionStore();

const form = ref<{
  id?: number;
  customerId: number | null;
  customerName: string;
  frequencyDays: number;
  preferredFlavor: string;
  bottleSize: '1L' | '2L';
  quantity: number;
  nextDate: string;
  notes: string;
  isActive: boolean;
}>({
  customerId: null,
  customerName: '',
  frequencyDays: 15,
  preferredFlavor: 'Fresa',
  bottleSize: '1L',
  quantity: 1,
  nextDate: new Date().toISOString().split('T')[0],
  notes: '',
  isActive: true,
});

const isSaving = ref(false);
const customerSearch = ref('');
const customerList = ref<CustomerOption[]>([]);
const isSearchingCustomers = ref(false);
const showCustomerDropdown = ref(false);

const availableFlavors = computed(() => {
  if (productionStore.flavors.length > 0) {
    return productionStore.activeFlavors.map((f) => f.name);
  }
  return ['Fresa', 'Mora', 'Melocotón', 'Guanábana', 'Arequipe', 'Maracuyá', 'Natural'];
});

async function loadCustomers() {
  isSearchingCustomers.value = true;
  try {
    const res = await http.get<any>('/customers', { params: { limit: '50' } });
    if (res && Array.isArray(res.customers)) {
      customerList.value = res.customers;
    } else if (Array.isArray(res)) {
      customerList.value = res;
    }
  } catch {
    // silently fail
  } finally {
    isSearchingCustomers.value = false;
  }
}

const filteredCustomers = computed(() => {
  const q = customerSearch.value.trim().toLowerCase();
  if (!q) return customerList.value.slice(0, 10);
  return customerList.value
    .filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.address && c.address.toLowerCase().includes(q))
    )
    .slice(0, 10);
});

function selectCustomer(cust: CustomerOption) {
  form.value.customerId = cust.id;
  form.value.customerName = `${cust.fullName} (${cust.phone})`;
  customerSearch.value = cust.fullName;
  showCustomerDropdown.value = false;
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      if (productionStore.flavors.length === 0) {
        productionStore.fetchFlavors();
      }
      loadCustomers();

      if (props.scheduleToEdit) {
        const d = props.scheduleToEdit;
        const formattedDate = d.nextDate ? new Date(d.nextDate).toISOString().split('T')[0] : '';

        form.value = {
          id: d.id,
          customerId: d.customerId,
          customerName: d.customer?.fullName ? `${d.customer.fullName} (${d.customer.phone})` : '',
          frequencyDays: d.frequencyDays || 15,
          preferredFlavor: d.preferredFlavor || 'Fresa',
          bottleSize: d.bottleSize || '1L',
          quantity: d.quantity || 1,
          nextDate: formattedDate,
          notes: d.notes || '',
          isActive: d.isActive !== false,
        };
        customerSearch.value = d.customer?.fullName || '';
      } else {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        form.value = {
          customerId: null,
          customerName: '',
          frequencyDays: 15,
          preferredFlavor: availableFlavors.value[0] || 'Fresa',
          bottleSize: '1L',
          quantity: 1,
          nextDate: nextWeek.toISOString().split('T')[0],
          notes: '',
          isActive: true,
        };
        customerSearch.value = '';
      }
      showCustomerDropdown.value = false;
    }
  }
);

async function handleSave() {
  if (!form.value.customerId) {
    toast.error('Debes seleccionar un cliente registrado');
    return;
  }
  if (!form.value.nextDate) {
    toast.error('La fecha de la próxima entrega es requerida');
    return;
  }
  if (form.value.quantity < 1) {
    toast.error('La cantidad mínima de botellas es 1');
    return;
  }

  isSaving.value = true;
  try {
    const payload = {
      customerId: form.value.customerId,
      frequencyDays: Number(form.value.frequencyDays),
      preferredFlavor: form.value.preferredFlavor,
      bottleSize: form.value.bottleSize,
      quantity: Number(form.value.quantity),
      nextDate: form.value.nextDate,
      notes: form.value.notes.trim() || undefined,
      isActive: form.value.isActive,
    };

    if (form.value.id) {
      await http.put(`/crm/recurring/${form.value.id}`, payload);
      toast.success('Programación de compra recurrente actualizada');
    } else {
      await http.post('/crm/recurring', payload);
      toast.success('Compra recurrente programada exitosamente');
    }

    emit('saved');
    emit('update:open', false);
  } catch (err: any) {
    toast.error(err?.response?.data?.error || 'Error al guardar la compra recurrente');
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <DialogRoot :open="open" @update:open="(val: boolean) => emit('update:open', val)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity" />

      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-[95%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-2xl transition-all focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-7 max-h-[92vh] overflow-y-auto"
      >
        <div class="flex items-center justify-between border-b border-surface-light-border pb-4 dark:border-surface-dark-border">
          <div class="flex items-center gap-2.5">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-darkText">
              <Repeat class="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                {{ form.id ? 'Editar Compra Recurrente' : 'Nueva Compra Recurrente' }}
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Automatiza entregas periódicas para clientes frecuentes
              </DialogDescription>
            </div>
          </div>

          <button
            type="button"
            @click="emit('update:open', false)"
            class="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <form @submit.prevent="handleSave" novalidate class="mt-5 space-y-4">
          <!-- Selector de Cliente con Autocomplete -->
          <div class="relative">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Cliente Habitual
            </label>
            <div class="relative">
              <User class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                v-model="customerSearch"
                type="text"
                @focus="showCustomerDropdown = true"
                placeholder="Buscar cliente por nombre o teléfono..."
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2 pl-9 pr-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                :required="!form.customerId"
              />
            </div>

            <!-- Dropdown Flotante de Resultados de Clientes -->
            <div
              v-if="showCustomerDropdown && filteredCustomers.length > 0"
              class="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-surface-light-border bg-surface-light-card p-1 shadow-lg dark:border-surface-dark-border dark:bg-surface-dark-card"
            >
              <div
                v-for="c in filteredCustomers"
                :key="c.id"
                @mousedown.prevent="selectCustomer(c)"
                class="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 text-xs"
                :class="{ 'bg-brand-50/60 dark:bg-brand-950/40 font-bold': form.customerId === c.id }"
              >
                <div>
                  <p class="font-extrabold text-slate-900 dark:text-white">{{ c.fullName }}</p>
                  <p class="text-[10px] text-slate-400">{{ c.phone }} · {{ c.address || 'Sin dirección' }}</p>
                </div>
                <Check v-if="form.customerId === c.id" class="h-3.5 w-3.5 text-brand-800 dark:text-brand-darkText" />
              </div>
            </div>
          </div>

          <!-- Sabor Preferido y Presentación -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Sabor Preferido
              </label>
              <div class="relative">
                <Milk class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <select
                  v-model="form.preferredFlavor"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2 pl-9 pr-3 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                >
                  <option v-for="flv in availableFlavors" :key="flv" :value="flv">
                    {{ flv }}
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Presentación de Botella
              </label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  @click="form.bottleSize = '1L'"
                  class="rounded-xl border py-2 text-xs font-extrabold transition-all"
                  :class="
                    form.bottleSize === '1L'
                      ? 'border-brand-800 bg-brand-800 text-white shadow-xs'
                      : 'border-surface-light-border bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-slate-300'
                  "
                >
                  1 Litro ($12k)
                </button>
                <button
                  type="button"
                  @click="form.bottleSize = '2L'"
                  class="rounded-xl border py-2 text-xs font-extrabold transition-all"
                  :class="
                    form.bottleSize === '2L'
                      ? 'border-brand-800 bg-brand-800 text-white shadow-xs'
                      : 'border-surface-light-border bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-slate-300'
                  "
                >
                  2 Litros ($22k)
                </button>
              </div>
            </div>
          </div>

          <!-- Cantidad y Frecuencia -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Cantidad de Botellas
              </label>
              <div class="relative">
                <Package class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  v-model.number="form.quantity"
                  type="number"
                  min="0"
                  step="any"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2 pl-9 pr-3 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Frecuencia de Pedido
              </label>
              <select
                v-model.number="form.frequencyDays"
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2 px-3 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              >
                <option :value="7">Semanal (Cada 7 días)</option>
                <option :value="10">Cada 10 días</option>
                <option :value="15">Quincenal (Cada 15 días)</option>
                <option :value="21">Cada 3 semanas (21 días)</option>
                <option :value="30">Mensual (Cada 30 días)</option>
              </select>
            </div>
          </div>

          <!-- Próxima Fecha y Estado Activo -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Próxima Fecha de Entrega
              </label>
              <div class="relative">
                <Calendar class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  v-model="form.nextDate"
                  type="date"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2 pl-9 pr-3 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Estado de la Programación
              </label>
              <div class="flex items-center gap-2 pt-2">
                <input
                  id="isActiveToggle"
                  v-model="form.isActive"
                  type="checkbox"
                  class="h-4 w-4 rounded border-slate-300 text-brand-800 focus:ring-brand-800 dark:border-slate-700"
                />
                <label for="isActiveToggle" class="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  {{ form.isActive ? 'Activo (Generar pedidos)' : 'En Pausa (Suspendido temporalmente)' }}
                </label>
              </div>
            </div>
          </div>

          <!-- Notas -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Notas u Observaciones Operativas
            </label>
            <div class="relative">
              <FileText class="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
              <textarea
                v-model="form.notes"
                rows="2"
                placeholder="Ej: Entregar después de las 3:00 PM en la oficina..."
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2 pl-9 pr-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              ></textarea>
            </div>
          </div>

          <!-- Botones de Acción -->
          <div class="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-surface-light-border dark:border-surface-dark-border">
            <button
              type="button"
              @click="emit('update:open', false)"
              class="rounded-xl border border-surface-light-border bg-surface-light-card px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isSaving"
              class="inline-flex items-center gap-1.5 rounded-xl bg-hero-gradient px-4 py-2 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95 disabled:opacity-50"
            >
              <Save class="h-3.5 w-3.5" :class="{ 'animate-pulse': isSaving }" />
              <span>{{ isSaving ? 'Guardando...' : 'Guardar Programación' }}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
