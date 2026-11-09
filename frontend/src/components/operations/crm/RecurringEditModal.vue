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
  FileText,
  Check,
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { useProductionStore } from '@/stores/production.store';
import { getDeviceLocalDate, toInputDateFormat, getDeviceTimestamp } from '@/utils/dateUtils';
import { toast } from 'vue-sonner';

export interface RecurringItemData {
  flavor: string;
  bottleSize: string;
  quantity: number;
}

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
  bottleSize: string;
  quantity: number;
  items?: RecurringItemData[] | null;
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
  items: RecurringItemData[];
  nextDate: string;
  notes: string;
  isActive: boolean;
}>({
  customerId: null,
  customerName: '',
  frequencyDays: 15,
  items: [{ flavor: 'Fresa', bottleSize: '1L', quantity: 1 }],
  nextDate: getDeviceLocalDate(),
  notes: '',
  isActive: true,
});


const availablePresentations = computed(() => {
  if (productionStore.activePresentations.length > 0) {
    return productionStore.activePresentations.map((p) => ({
      name: p.name,
      label: `${p.name} (${p.capacityLiters}L)`,
    }));
  }
  return [
    { name: '1L', label: '1 Litro (1L)' },
    { name: '2L', label: '2 Litros (2L)' },
    { name: '500ml', label: '500 ml' },
  ];
});

function addItem() {
  const defaultFlavor = availableFlavors.value[0] || 'Fresa';
  const defaultSize = availablePresentations.value[0]?.name || '1L';
  form.value.items.push({
    flavor: defaultFlavor,
    bottleSize: defaultSize,
    quantity: 1,
  });
}

function removeItem(index: number) {
  if (form.value.items.length > 1) {
    form.value.items.splice(index, 1);
  }
}

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
    const res = await http.get<any>('/customers', { params: { paginate: 'false' } });
    if (res && Array.isArray(res)) {
      customerList.value = res;
    } else if (res && Array.isArray(res.items)) {
      customerList.value = res.items;
    } else if (res && Array.isArray(res.customers)) {
      customerList.value = res.customers;
    }
  } catch {
    // silently fail
  } finally {
    isSearchingCustomers.value = false;
  }
}

const filteredCustomers = computed(() => {
  const q = customerSearch.value.trim().toLowerCase();
  if (!q) return customerList.value.slice(0, 15);
  const cleanQ = q.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return customerList.value
    .filter((c) => {
      const name = (c.fullName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const phone = c.phone || '';
      const address = (c.address || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return name.includes(cleanQ) || phone.includes(q) || address.includes(cleanQ);
    })
    .slice(0, 15);
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
      if (productionStore.presentations.length === 0) {
        productionStore.fetchPresentations();
      }
      loadCustomers();

      if (props.scheduleToEdit) {
        const d = props.scheduleToEdit;
        const formattedDate = d.nextDate ? toInputDateFormat(d.nextDate) : '';

        let parsedItems: RecurringItemData[] = [];
        if (d.items && Array.isArray(d.items) && d.items.length > 0) {
          parsedItems = d.items.map((it: any) => ({
            flavor: it.flavor || 'Fresa',
            bottleSize: it.bottleSize || '1L',
            quantity: Number(it.quantity) || 1,
          }));
        } else {
          parsedItems = [
            {
              flavor: d.preferredFlavor || 'Fresa',
              bottleSize: d.bottleSize || '1L',
              quantity: d.quantity || 1,
            },
          ];
        }

        form.value = {
          id: d.id,
          customerId: d.customerId,
          customerName: d.customer?.fullName ? `${d.customer.fullName} (${d.customer.phone})` : '',
          frequencyDays: d.frequencyDays || 15,
          items: parsedItems,
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
          items: [
            {
              flavor: availableFlavors.value[0] || 'Fresa',
              bottleSize: availablePresentations.value[0]?.name || '1L',
              quantity: 1,
            },
          ],
          nextDate: getDeviceLocalDate(nextWeek),
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
  if (!form.value.items || form.value.items.length === 0) {
    toast.error('Debes incluir al menos un producto en la suscripción');
    return;
  }
  for (const it of form.value.items) {
    if (!it.quantity || it.quantity < 1) {
      toast.error('La cantidad mínima de cada envase es 1');
      return;
    }
  }

  isSaving.value = true;
  try {
    const totalQty = form.value.items.reduce((sum: number, i: RecurringItemData) => sum + (Number(i.quantity) || 1), 0);
    const firstItem = form.value.items[0];
    const isSingle = form.value.items.length === 1;

    const payload = {
      customerId: form.value.customerId,
      frequencyDays: Number(form.value.frequencyDays),
      preferredFlavor: isSingle ? firstItem.flavor : 'MIXTO',
      bottleSize: isSingle ? firstItem.bottleSize : 'MIXTO',
      quantity: totalQty,
      items: form.value.items,
      nextDate: getDeviceTimestamp(form.value.nextDate),
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

          <!-- Canasta de Productos (Suscripción Mixta) -->
          <div class="rounded-2xl border border-surface-light-border bg-surface-light-canvas/60 p-3.5 dark:border-surface-dark-border dark:bg-surface-dark-canvas/60 space-y-3">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                Productos de la Suscripción
              </label>
              <button
                type="button"
                @click="addItem"
                class="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-1 text-[11px] font-bold text-brand-800 hover:bg-brand-100 dark:bg-brand-950/60 dark:text-brand-darkText dark:hover:bg-brand-900/60 transition-colors"
              >
                + Agregar Producto
              </button>
            </div>

            <div class="space-y-2">
              <div
                v-for="(item, idx) in form.items"
                :key="idx"
                class="flex items-center gap-2 bg-surface-light-card p-2 rounded-xl border border-surface-light-border dark:bg-surface-dark-card dark:border-surface-dark-border"
              >
                <!-- Sabor -->
                <div class="flex-1">
                  <select
                    v-model="item.flavor"
                    class="w-full rounded-lg border border-surface-light-border bg-surface-light-canvas py-1.5 px-2 text-xs font-semibold dark:border-surface-dark-border dark:bg-surface-dark-canvas"
                  >
                    <option v-for="fl in availableFlavors" :key="fl" :value="fl">{{ fl }}</option>
                  </select>
                </div>

                <!-- Presentación -->
                <div class="w-32">
                  <select
                    v-model="item.bottleSize"
                    class="w-full rounded-lg border border-surface-light-border bg-surface-light-canvas py-1.5 px-2 text-xs font-semibold dark:border-surface-dark-border dark:bg-surface-dark-canvas"
                  >
                    <option v-for="sz in availablePresentations" :key="sz.name" :value="sz.name">{{ sz.name }}</option>
                  </select>
                </div>

                <!-- Cantidad -->
                <div class="w-20">
                  <input
                    type="number"
                    min="1"
                    v-model.number="item.quantity"
                    class="w-full rounded-lg border border-surface-light-border bg-surface-light-canvas py-1.5 px-2 text-center text-xs font-bold dark:border-surface-dark-border dark:bg-surface-dark-canvas"
                  />
                </div>

                <!-- Eliminar -->
                <button
                  v-if="form.items.length > 1"
                  type="button"
                  @click="removeItem(idx)"
                  class="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                  title="Eliminar producto"
                >
                  <X class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- Frecuencia de Pedido -->
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
