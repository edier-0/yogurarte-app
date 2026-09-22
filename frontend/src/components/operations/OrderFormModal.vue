<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from 'reka-ui';
import {
  X,
  Plus,
  Trash2,
  User,
  Phone,
  MapPin,
  Sparkles,
  ShoppingBag,
  Search
} from 'lucide-vue-next';
import { useOperationsStore, type Order, type OrderItem } from '@/stores/operations.store';

const props = defineProps<{
  open: boolean;
  orderToEdit?: Order | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'saved'): void;
}>();

const store = useOperationsStore();

const isEditing = computed(() => Boolean(props.orderToEdit));

// Sabores y presentaciones oficiales de YogurArte
const FLAVORS = [
  'Fresa',
  'Melocotón',
  'Mora',
  'Frutos Rojos',
  'Maracuyá',
  'Guanábana',
  'Arequipe',
  'Piña',
  'Natural',
];

const BOTTLE_SIZES = [
  { label: '1 Litro (1L)', value: '1L', defaultPrice: 12000 },
  { label: '2 Litros (2L)', value: '2L', defaultPrice: 22000 },
];

// Estado del formulario
const customerId = ref<number | null>(null);
const customerName = ref('');
const customerPhone = ref('');
const customerAddress = ref('');
const deliveryType = ref<'PROPIO' | 'DOMICILIARIO' | 'LOCAL'>('PROPIO');
const deliveryDriverId = ref<number | null>(null);
const deliveryFee = ref<number>(0);
const paidAmount = ref<number>(0);
const paymentMethod = ref('EFECTIVO');
const notes = ref('');
const isSubmitting = ref(false);
const customerSearch = ref('');
const showSuggestions = ref(false);

const items = ref<OrderItem[]>([
  {
    bottleSize: '1L',
    flavor: 'Fresa',
    quantity: 1,
    unitPrice: 12000,
    totalPrice: 12000,
  },
]);

// Sugerencias predictivas de clientes
const customerSuggestions = computed(() => {
  const q = customerSearch.value.trim().toLowerCase();
  if (!q) return [];
  return store.customers
    .filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q))
    )
    .slice(0, 5);
});

// Selección de cliente predictivo
const selectCustomer = (c: { id: number; fullName: string; phone: string; address?: string | null }) => {
  customerId.value = c.id;
  customerName.value = c.fullName;
  customerPhone.value = c.phone || '';
  customerAddress.value = c.address || '';
  customerSearch.value = '';
  showSuggestions.value = false;
};

// Items helpers
const addItem = () => {
  items.value.push({
    bottleSize: '1L',
    flavor: 'Fresa',
    quantity: 1,
    unitPrice: 12000,
    totalPrice: 12000,
  });
};

const removeItem = (idx: number) => {
  if (items.value.length > 1) {
    items.value.splice(idx, 1);
  }
};

const onItemChange = (item: OrderItem) => {
  const sizeObj = BOTTLE_SIZES.find((s) => s.value === item.bottleSize);
  if (sizeObj && !item.unitPrice) {
    item.unitPrice = sizeObj.defaultPrice;
  }
  item.totalPrice = (item.quantity || 1) * (item.unitPrice || 0);
};

// Totales automáticos
const itemsSubtotal = computed(() => {
  return items.value.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);
});

const grandTotal = computed(() => {
  return itemsSubtotal.value + Number(deliveryFee.value || 0);
});

const pendingBalance = computed(() => {
  return Math.max(0, grandTotal.value - Number(paidAmount.value || 0));
});

// Inicialización / Reset
watch(
  () => props.open,
  (val) => {
    if (val) {
      if (store.customers.length === 0) store.fetchCustomers();
      if (store.drivers.length === 0) store.fetchDrivers();

      if (props.orderToEdit) {
        const o = props.orderToEdit;
        customerId.value = o.customerId || o.customer?.id || null;
        customerName.value = o.customerName || o.customer?.fullName || '';
        customerPhone.value = o.customerPhone || o.customer?.phone || '';
        customerAddress.value = o.customerAddress || o.customer?.address || '';
        deliveryType.value = (o.deliveryType as any) || 'PROPIO';
        deliveryDriverId.value = o.deliveryDriverId || null;
        deliveryFee.value = o.deliveryFee || 0;
        paidAmount.value = o.paidAmount || o.totalPaid || 0;
        notes.value = o.notes || '';
        if (o.items && o.items.length > 0) {
          items.value = o.items.map((it) => ({
            id: it.id,
            bottleSize: it.bottleSize || '1L',
            flavor: it.flavor || 'Fresa',
            quantity: it.quantity || 1,
            unitPrice: it.unitPrice || 12000,
            totalPrice: it.totalPrice || (it.quantity || 1) * 12000,
          }));
        }
      } else {
        // Reset a nuevo pedido
        customerId.value = null;
        customerName.value = '';
        customerPhone.value = '';
        customerAddress.value = '';
        deliveryType.value = 'PROPIO';
        deliveryDriverId.value = null;
        deliveryFee.value = 0;
        paidAmount.value = 0;
        paymentMethod.value = 'EFECTIVO';
        notes.value = '';
        items.value = [
          {
            bottleSize: '1L',
            flavor: 'Fresa',
            quantity: 1,
            unitPrice: 12000,
            totalPrice: 12000,
          },
        ];
      }
    }
  },
  { immediate: true }
);

const handleClose = () => {
  emit('update:open', false);
};

const handleSubmit = async () => {
  if (!customerName.value.trim()) {
    alert('Ingresa el nombre del cliente');
    return;
  }

  isSubmitting.value = true;
  try {
    const payload = {
      customerId: customerId.value || undefined,
      customerName: customerName.value.trim(),
      customerPhone: customerPhone.value.trim(),
      customerAddress: customerAddress.value.trim(),
      deliveryType: deliveryType.value,
      deliveryDriverId: deliveryType.value === 'DOMICILIARIO' ? deliveryDriverId.value : null,
      deliveryFee: Number(deliveryFee.value) || 0,
      totalAmount: grandTotal.value,
      paidAmount: Number(paidAmount.value) || 0,
      paymentMethod: paymentMethod.value,
      notes: notes.value.trim() || undefined,
      items: items.value.map((it) => ({
        bottleSize: it.bottleSize,
        flavor: it.flavor,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      })),
    };

    if (isEditing.value && props.orderToEdit) {
      await store.updateOrder(props.orderToEdit.id, payload);
    } else {
      await store.createOrder(payload);
    }

    emit('saved');
    handleClose();
  } catch (err: any) {
    console.error(err);
  } finally {
    isSubmitting.value = false;
  }
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
};
</script>

<template>
  <DialogRoot :open="open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity"
      />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-elevated focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-8 max-h-[92vh] overflow-y-auto"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-surface-light-border pb-4 dark:border-surface-dark-border">
          <div class="flex items-center gap-2.5">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-hero-gradient text-white shadow-card">
              <ShoppingBag class="h-5 w-5" />
            </div>
            <div>
              <DialogTitle class="text-lg font-extrabold text-slate-900 dark:text-white">
                {{ isEditing ? 'Editar Pedido' : 'Nuevo Pedido Artesanal' }}
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {{ isEditing ? 'Actualiza los datos y productos de la comanda' : 'Registra la comanda de venta con abono y entrega' }}
              </DialogDescription>
            </div>
          </div>

          <DialogClose
            @click="handleClose"
            class="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X class="h-5 w-5" />
          </DialogClose>
        </div>

        <form @submit.prevent="handleSubmit" class="mt-6 space-y-6">
          <!-- 1. Sección Cliente -->
          <div class="rounded-2xl bg-surface-light-canvas p-4 dark:bg-surface-dark-canvas space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-extrabold uppercase tracking-wide text-brand-800 dark:text-brand-darkText">
                1. Información del Cliente
              </span>
              <span v-if="customerId" class="inline-flex items-center gap-1 rounded-full bg-natural-50 px-2 py-0.5 text-[10px] font-extrabold text-natural-500 dark:bg-emerald-950/40">
                <Sparkles class="h-3 w-3" /> Cliente Frecuente
              </span>
            </div>

            <!-- Buscador predictivo de clientes -->
            <div class="relative">
              <Search class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[1.75]" />
              <input
                type="text"
                v-model="customerSearch"
                @focus="showSuggestions = true"
                placeholder="Buscar cliente existente por nombre o teléfono..."
                class="w-full rounded-xl border border-slate-200 bg-surface-light-card pl-10 pr-3.5 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-surface-dark-card dark:text-slate-100"
              />

              <!-- Suggestions Dropdown -->
              <div
                v-if="showSuggestions && customerSuggestions.length > 0"
                class="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-surface-light-card p-1 shadow-lg dark:border-slate-700 dark:bg-surface-dark-card"
              >
                <button
                  v-for="c in customerSuggestions"
                  :key="c.id"
                  type="button"
                  @click="selectCustomer(c)"
                  class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span class="font-bold text-slate-900 dark:text-white">{{ c.fullName }}</span>
                  <span class="text-slate-500">{{ c.phone }}</span>
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Nombre Completo *</label>
                <div class="relative">
                  <User class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    v-model="customerName"
                    placeholder="Ej. Carmen Ortiz"
                    class="w-full rounded-xl border border-slate-200 bg-surface-light-card py-2 pl-9 pr-3 text-xs font-semibold text-slate-800 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-surface-dark-card dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Teléfono / WhatsApp *</label>
                <div class="relative">
                  <Phone class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    v-model="customerPhone"
                    placeholder="Ej. 3024581882 o @usuario"
                    class="w-full rounded-xl border border-slate-200 bg-surface-light-card py-2 pl-9 pr-3 text-xs font-semibold text-slate-800 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-surface-dark-card dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Dirección / Punto de Entrega</label>
              <div class="relative">
                <MapPin class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  v-model="customerAddress"
                  placeholder="Ej. Calle 12 # 15-20 Barrio El Prado"
                  class="w-full rounded-xl border border-slate-200 bg-surface-light-card py-2 pl-9 pr-3 text-xs font-semibold text-slate-800 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-surface-dark-card dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          <!-- 2. Sección Productos / Ítems -->
          <div class="rounded-2xl bg-surface-light-canvas p-4 dark:bg-surface-dark-canvas space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-extrabold uppercase tracking-wide text-brand-800 dark:text-brand-darkText">
                2. Productos y Sabores de Yogur
              </span>
              <button
                type="button"
                @click="addItem"
                class="inline-flex items-center gap-1 text-xs font-bold text-accent-500 hover:text-accent-600"
              >
                <Plus class="h-3.5 w-3.5" /> Agregar Sabor
              </button>
            </div>

            <div class="space-y-3">
              <div
                v-for="(item, idx) in items"
                :key="idx"
                class="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-surface-light-card p-3 dark:border-slate-700 dark:bg-surface-dark-card sm:flex-nowrap"
              >
                <!-- Sabor -->
                <div class="w-full sm:flex-1">
                  <label class="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Sabor</label>
                  <select
                    v-model="item.flavor"
                    class="w-full rounded-lg border border-slate-200 bg-surface-light-canvas py-1.5 px-2 text-xs font-semibold dark:border-slate-700 dark:bg-surface-dark-canvas"
                  >
                    <option v-for="fl in FLAVORS" :key="fl" :value="fl">{{ fl }}</option>
                  </select>
                </div>

                <!-- Envase -->
                <div class="w-32">
                  <label class="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Presentación</label>
                  <select
                    v-model="item.bottleSize"
                    @change="onItemChange(item)"
                    class="w-full rounded-lg border border-slate-200 bg-surface-light-canvas py-1.5 px-2 text-xs font-semibold dark:border-slate-700 dark:bg-surface-dark-canvas"
                  >
                    <option v-for="sz in BOTTLE_SIZES" :key="sz.value" :value="sz.value">{{ sz.label }}</option>
                  </select>
                </div>

                <!-- Cantidad -->
                <div class="w-20">
                  <label class="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    v-model.number="item.quantity"
                    @input="onItemChange(item)"
                    class="w-full rounded-lg border border-slate-200 bg-surface-light-canvas py-1.5 px-2 text-center text-xs font-bold dark:border-slate-700 dark:bg-surface-dark-canvas"
                  />
                </div>

                <!-- Precio Unitario -->
                <div class="w-28">
                  <label class="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Precio Unit.</label>
                  <input
                    type="number"
                    step="500"
                    v-model.number="item.unitPrice"
                    @input="onItemChange(item)"
                    class="w-full rounded-lg border border-slate-200 bg-surface-light-canvas py-1.5 px-2 text-xs font-bold dark:border-slate-700 dark:bg-surface-dark-canvas"
                  />
                </div>

                <!-- Subtotal Item -->
                <div class="w-24 text-right">
                  <span class="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Subtotal</span>
                  <span class="text-xs font-extrabold text-slate-900 dark:text-white">
                    {{ formatCurrency(item.totalPrice) }}
                  </span>
                </div>

                <!-- Botón Eliminar -->
                <button
                  type="button"
                  @click="removeItem(idx)"
                  class="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40"
                  title="Quitar producto"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- 3. Entrega & Flete -->
          <div class="rounded-2xl bg-surface-light-canvas p-4 dark:bg-surface-dark-canvas space-y-4">
            <span class="text-xs font-extrabold uppercase tracking-wide text-brand-800 dark:text-brand-darkText">
              3. Modalidad de Entrega
            </span>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Tipo de Entrega</label>
                <select
                  v-model="deliveryType"
                  class="w-full rounded-xl border border-slate-200 bg-surface-light-card py-2 px-3 text-xs font-semibold dark:border-slate-700 dark:bg-surface-dark-card"
                >
                  <option value="PROPIO">Entrega Propia (Socios)</option>
                  <option value="DOMICILIARIO">Domiciliario</option>
                  <option value="LOCAL">Retiro en Tienda</option>
                </select>
              </div>

              <div v-if="deliveryType === 'DOMICILIARIO'">
                <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Repartidor Asignado</label>
                <select
                  v-model="deliveryDriverId"
                  class="w-full rounded-xl border border-slate-200 bg-surface-light-card py-2 px-3 text-xs font-semibold dark:border-slate-700 dark:bg-surface-dark-card"
                >
                  <option :value="null">Sin asignar aún</option>
                  <option v-for="d in store.drivers" :key="d.id" :value="d.id">{{ d.fullName }}</option>
                </select>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Flete de Domicilio ($)</label>
                <input
                  type="number"
                  step="500"
                  min="0"
                  v-model.number="deliveryFee"
                  placeholder="0"
                  class="w-full rounded-xl border border-slate-200 bg-surface-light-card py-2 px-3 text-xs font-semibold dark:border-slate-700 dark:bg-surface-dark-card"
                />
              </div>
            </div>
          </div>

          <!-- 4. Pago y Totales -->
          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40 space-y-4">
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Abono Inicial ($)</label>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  v-model.number="paidAmount"
                  placeholder="0"
                  class="w-full rounded-xl border border-slate-200 bg-surface-light-card py-2 px-3 text-xs font-bold text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-surface-dark-card dark:text-white"
                />
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Método de Abono</label>
                <select
                  v-model="paymentMethod"
                  class="w-full rounded-xl border border-slate-200 bg-surface-light-card py-2 px-3 text-xs font-semibold dark:border-slate-700 dark:bg-surface-dark-card"
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="NEQUI">Nequi</option>
                  <option value="BANCOLOMBIA">Bancolombia</option>
                  <option value="DAVIPLATA">Daviplata</option>
                </select>
              </div>
            </div>

            <!-- Resumen Total y Saldo -->
            <div class="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
              <div>
                <span class="block text-[11px] font-bold uppercase text-slate-400">Total Comanda</span>
                <span class="text-xl font-black text-slate-900 dark:text-white">
                  {{ formatCurrency(grandTotal) }}
                </span>
              </div>

              <div class="text-right">
                <span class="block text-[11px] font-bold uppercase text-slate-400">Saldo Pendiente</span>
                <span
                  class="text-xl font-black"
                  :class="pendingBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'"
                >
                  {{ formatCurrency(pendingBalance) }}
                </span>
              </div>
            </div>
          </div>

          <!-- 5. Notas -->
          <div>
            <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Notas de la Comanda</label>
            <textarea
              v-model="notes"
              rows="2"
              placeholder="Instrucciones especiales de entrega, horario o preferencias..."
              class="w-full rounded-xl border border-slate-200 bg-surface-light-canvas p-3 text-xs dark:border-slate-700 dark:bg-surface-dark-canvas"
            ></textarea>
          </div>

          <!-- Botones de Acción -->
          <div class="flex items-center justify-end gap-3 border-t border-surface-light-border pt-4 dark:border-surface-dark-border">
            <button
              type="button"
              @click="handleClose"
              class="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-6 py-2.5 text-xs font-extrabold text-white shadow-accent transition-transform active:scale-95 hover:bg-accent-600 disabled:opacity-50"
            >
              <Sparkles class="h-4 w-4" />
              <span>{{ isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar Pedido' : 'Crear Pedido' }}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
