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
  PackageCheck,
  X,
  AlertCircle,
  AlertTriangle,
  ShoppingCart,
  Sparkles,
  Milk,
  Scale,
  DollarSign,
  Plus,
  Trash2,
  Tag,
  TrendingUp,
  CheckCircle2,
  Lock,
} from 'lucide-vue-next';
import {
  useProductionStore,
  type BatchItem,
  type BatchPackagingItem,
  type BatchPackagingPayload,
  type UpdateBatchPackagingPayload,
  type ProductPresentation,
} from '@/stores/production.store';
import { getTodayDateBogota, toInputDateFormat, getDeviceTimestamp } from '@/stores/finance.store';
import { http } from '@/api/client';
import { formatStockQuantity } from '@/utils/formatters';
import SearchableSelect from '@/components/common/SearchableSelect.vue';

const props = defineProps<{
  open: boolean;
  batch: BatchItem | null;
  packagingToEdit?: BatchPackagingItem | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'packaged'): void;
}>();

const productionStore = useProductionStore();

// Materiales de inventario
interface MaterialItem {
  id: number;
  name: string;
  code: string;
  unit: string;
  currentStock: number;
  avgCost: number;
  category: string;
}
const allMaterials = ref<MaterialItem[]>([]);
const isLoadingMaterials = ref<boolean>(false);

// Estado de la presentación activa y selección mono-presentación
const selectedPresentationId = ref<number | null>(null);

// Unidades a envasar de la presentación seleccionada
const bottles = ref<number | ''>('');

// Precio de venta unitario ($ COP)
const unitPrice = ref<number | ''>(12000);

// Envase vinculado a la presentación
const selectedBottleMaterialId = ref<number | ''>('');

// Estado del formulario
const baseFlavor = ref<string>('Natural');
const customFlavorName = ref<string>('');
const flavorVariant = ref<string>('');
const selectedLabelId = ref<number | ''>('');
const labelQuantity = ref<number | ''>('');
const isLabelQtyManual = ref<boolean>(false);
const notes = ref<string>('');
const packagedBy = ref<string>('Edier');
const packagedAt = ref<string>(getTodayDateBogota());

// Rendimiento y litros de base láctea utilizados (Fase B)
const baseLitersUsed = ref<number | ''>('');
const isBaseLitersManual = ref<boolean>(false);

// Insumos extras multi-fila (Pulpas, Almíbar, etc.)
export interface ExtraItemRow {
  rawMaterialId: number | '';
  gramsPerBottle: number | '';
  quantityUsed: number | '';
  dosagePerLiter?: number | '';
}
const extraItems = ref<ExtraItemRow[]>([]);

// Pre-ventas
const pendingOrders = ref<any[]>([]);
const selectedOrderIds = ref<number[]>([]);
const isLoadingOrders = ref<boolean>(false);

// Control de envío y errores
const isSubmitting = ref<boolean>(false);
const errorMessage = ref<string | null>(null);

// Botellas entregadas en pedidos vinculados (para modo edición)
const deliveredBottlesCount = ref<number>(0);

// Helper para detectar unidad kilogramos
function isKgUnit(unit?: string): boolean {
  if (!unit) return false;
  const u = unit.trim().toUpperCase();
  return (
    u === 'KG' ||
    u === 'KILOGRAMO' ||
    u === 'KILOGRAMOS' ||
    u === 'KGS' ||
    u === 'KILO' ||
    u === 'KILOS'
  );
}

// Presentaciones activas ordenadas por capacidad ascendente
const sortedActivePresentations = computed<ProductPresentation[]>(() => {
  return [...productionStore.activePresentations].sort(
    (a, b) => (Number(a.capacityLiters) || 0) - (Number(b.capacityLiters) || 0)
  );
});

// Presentación activa seleccionada
const activePresentation = computed<ProductPresentation | null>(() => {
  if (selectedPresentationId.value) {
    const found = sortedActivePresentations.value.find(
      (p) => p.id === selectedPresentationId.value
    );
    if (found) return found;
  }
  // Por defecto 1L si existe
  const default1L = sortedActivePresentations.value.find(
    (p) => p.name === '1L' || Math.abs(Number(p.capacityLiters) - 1.0) < 0.001
  );
  if (default1L) return default1L;
  return sortedActivePresentations.value[0] || null;
});

// Modo edición y detección de fracciones históricas mixtas (RF-12)
const isEditMode = computed(() => !!props.packagingToEdit);

const isLegacyMixedEdit = computed(() => {
  if (!props.packagingToEdit) return false;
  const pkg = props.packagingToEdit;
  const has1L = Number(pkg.bottles1L) > 0;
  const has2L = Number(pkg.bottles2L) > 0;
  if (has1L && has2L) return true;
  if (Array.isArray(pkg.containers) && pkg.containers.length > 1) {
    const activeCount = pkg.containers.filter((c: any) => Number(c.quantity) > 0).length;
    if (activeCount > 1) return true;
  }
  return false;
});

// Sabores disponibles
const flavors = computed(() => {
  const activeNames = productionStore.activeFlavors.map((f) => f.name);
  if (activeNames.length === 0) {
    return [
      'Natural',
      'Fresa',
      'Melocotón',
      'Mora',
      'Frutos Rojos',
      'Maracuyá',
      'Guanábana',
      'Arequipe',
      'Piña',
      'Personalizado',
    ];
  }
  return [...activeNames, 'Personalizado'];
});

// Sabor resuelto
const resolvedFlavor = computed(() => {
  if (baseFlavor.value === 'Personalizado') {
    return customFlavorName.value.trim() || 'Artesanal';
  }
  if (flavorVariant.value.trim()) {
    return `${baseFlavor.value} (${flavorVariant.value.trim()})`;
  }
  return baseFlavor.value;
});

// Litros comerciales totales de la fracción
const requiredLiters = computed(() => {
  const b = Number(bottles.value) || 0;
  const cap = activePresentation.value ? Number(activePresentation.value.capacityLiters) || 1 : 1;
  return Math.round(b * cap * 100) / 100;
});

const totalBottles = computed(() => {
  return Number(bottles.value) || 0;
});

// Litros de base láctea efectivos a descontar
const effectiveBaseLiters = computed(() => {
  if (
    typeof baseLitersUsed.value === 'number' &&
    !isNaN(baseLitersUsed.value) &&
    baseLitersUsed.value > 0
  ) {
    return Math.round(baseLitersUsed.value * 100) / 100;
  }
  return requiredLiters.value;
});

// Porcentaje de rendimiento en tiempo real (Constitución Art. 5.6)
const yieldPercentage = computed(() => {
  const base = effectiveBaseLiters.value;
  const commercial = requiredLiters.value;
  if (base > 0 && commercial > 0) {
    return Math.round((commercial / base) * 1000) / 10;
  }
  return 0;
});

// Saldo sin envasar del lote madre
const unpackagedLiters = computed(() => {
  if (!props.batch) return 0;
  const total = Number(props.batch.totalLitersProduced) || Number(props.batch.milkUsedLiters) || 0;
  const packaged = Number(props.batch.packagedLiters) || 0;
  const alreadyInThisPkg = props.packagingToEdit
    ? Number(
        props.packagingToEdit.baseLitersUsed ??
        props.packagingToEdit.totalLiters ??
        (Number(props.packagingToEdit.bottles1L) * 1.0 + Number(props.packagingToEdit.bottles2L) * 2.0)
      )
    : 0;
  return Math.max(0, Math.round((total - packaged + alreadyInThisPkg) * 100) / 100);
});

// Validación de capacidad de base láctea contra el tanque madre
const exceedsVolume = computed(() => {
  return effectiveBaseLiters.value > unpackagedLiters.value + 0.05;
});

// Materiales de tipo envase
const containerMaterials = computed(() => {
  return allMaterials.value.filter((m) => {
    const cat = (m.category || '').toUpperCase();
    const code = (m.code || '').toUpperCase();
    const name = (m.name || '').toLowerCase();
    return (
      cat === 'EMPAQUE' ||
      cat === 'ENVASES' ||
      code.includes('BOTELLA') ||
      code.includes('ENVASE') ||
      name.includes('botella') ||
      name.includes('envase') ||
      name.includes('galon') ||
      name.includes('galón')
    );
  });
});

// Insumo del envase actualmente seleccionado
const currentBottleMat = computed(() => {
  if (selectedBottleMaterialId.value) {
    return allMaterials.value.find((m) => m.id === selectedBottleMaterialId.value) || null;
  }
  if (activePresentation.value?.rawMaterialId) {
    return allMaterials.value.find((m) => m.id === activePresentation.value?.rawMaterialId) || null;
  }
  return null;
});

// Alerta de stock de envases
const isBottleInsufficient = computed(() => {
  const needed = totalBottles.value;
  if (needed <= 0) return false;
  const available = currentBottleMat.value?.currentStock ?? 0;
  return needed > available;
});

// Insumos de etiquetas
const labelMaterials = computed(() => {
  return allMaterials.value.filter((m) => {
    const cat = (m.category || '').toUpperCase();
    const code = (m.code || '').toUpperCase();
    const name = (m.name || '').toLowerCase();
    return (
      code === 'ETIQUETA' ||
      code.startsWith('ETIQ') ||
      cat === 'ETIQUETAS' ||
      name.includes('etiqueta') ||
      (cat === 'EMPAQUE' && name.includes('etiqueta'))
    );
  });
});

const currentLabelMat = computed(() => {
  if (!selectedLabelId.value) return null;
  return allMaterials.value.find((m) => m.id === selectedLabelId.value) || null;
});

const isLabelsInsufficient = computed(() => {
  if (!currentLabelMat.value) return false;
  const needed = Number(labelQuantity.value) || 0;
  if (needed <= 0) return false;
  const available = currentLabelMat.value?.currentStock ?? 0;
  return needed > available;
});

// Insumos candidatos para adiciones extras (frutas, pulpas, esencias)
const candidateMaterials = computed(() => {
  return allMaterials.value.filter((m) => {
    const cat = (m.category || '').toUpperCase();
    const code = (m.code || '').toUpperCase();
    const name = (m.name || '').toLowerCase();
    const isPackaging =
      cat === 'EMPAQUE' ||
      cat === 'ENVASES' ||
      cat === 'ETIQUETAS' ||
      code.includes('BOTELLA') ||
      code.includes('TAPA') ||
      code.includes('ETIQUETA') ||
      name.includes('botella') ||
      name.includes('tapa') ||
      name.includes('etiqueta') ||
      name.includes('envase');
    const isMilk =
      code === 'LECHE' ||
      name.includes('leche cruda') ||
      name.includes('leche entera');
    return !isPackaging && !isMilk;
  });
});

const containerSelectOptions = computed(() => {
  return containerMaterials.value.map((m) => ({
    id: m.id,
    name: m.name,
    code: m.code,
    category: m.category,
    stock: m.currentStock,
    unit: 'und',
  }));
});

const labelSelectOptions = computed(() => {
  return labelMaterials.value.map((m) => ({
    id: m.id,
    name: m.name,
    code: m.code,
    category: m.category,
    stock: m.currentStock,
    unit: 'und',
    extraInfo: `Costo: ${formatCurrency(m.avgCost)}`,
  }));
});

const candidateSelectOptions = computed(() => {
  return candidateMaterials.value.map((m) => ({
    id: m.id,
    name: m.name,
    code: m.code,
    category: m.category,
    stock: m.currentStock,
    unit: m.unit,
    extraInfo: `Costo: ${formatCurrency(m.avgCost)}`,
  }));
});

// Métodos de insumos extras multi-fila
function addExtraItem() {
  extraItems.value.push({
    rawMaterialId: '',
    gramsPerBottle: '',
    quantityUsed: '',
  });
}

function removeExtraItem(index: number) {
  extraItems.value.splice(index, 1);
}

// Helper para cálculo y validación de cada fila de insumo extra
function getExtraItemCalc(row: ExtraItemRow) {
  if (!row.rawMaterialId) return null;
  const mat = allMaterials.value.find((m) => m.id === row.rawMaterialId);
  if (!mat) return null;
  const isKg = isKgUnit(mat.unit);
  const b = totalBottles.value;

  if (isKg) {
    const gramsDose =
      typeof row.gramsPerBottle === 'number' && !isNaN(row.gramsPerBottle)
        ? row.gramsPerBottle
        : 0;
    const totalGrams = Math.round(gramsDose * b);
    const quantityUsedKg = Math.round(totalGrams) / 1000;
    const totalCost = Math.round(quantityUsedKg * (mat.avgCost || 0));
    const isStockInsufficient = quantityUsedKg > (mat.currentStock || 0);

    return {
      material: mat,
      isKg: true,
      totalGrams,
      quantityUsed: quantityUsedKg,
      unitCost: mat.avgCost || 0,
      totalCost,
      isStockInsufficient,
      displayText:
        totalGrams > 0
          ? `${totalGrams.toLocaleString('es-CO')} g (${quantityUsedKg.toFixed(3)} kg)`
          : '0 g',
    };
  } else {
    const qty =
      typeof row.quantityUsed === 'number' && !isNaN(row.quantityUsed)
        ? row.quantityUsed
        : 0;
    const totalCost = Math.round(qty * (mat.avgCost || 0));
    const isStockInsufficient = qty > (mat.currentStock || 0);

    return {
      material: mat,
      isKg: false,
      totalGrams: 0,
      quantityUsed: qty,
      unitCost: mat.avgCost || 0,
      totalCost,
      isStockInsufficient,
      displayText: `${qty} ${mat.unit}`,
    };
  }
}

const extraItemsTotalCost = computed(() => {
  return extraItems.value.reduce((sum, row) => {
    const calc = getExtraItemCalc(row);
    return sum + (calc ? calc.totalCost : 0);
  }, 0);
});

const hasInsufficientStock = computed(() => {
  return extraItems.value.some((row) => {
    const calc = getExtraItemCalc(row);
    return calc ? calc.isStockInsufficient : false;
  });
});

// Costos desglosados para proyección financiera
const bottlesCost = computed(() => {
  const bCost = currentBottleMat.value?.avgCost || 600;
  return totalBottles.value * bCost;
});

const labelsCost = computed(() => {
  if (!currentLabelMat.value) return 0;
  const qty = Number(labelQuantity.value) || 0;
  return Math.round(qty * (currentLabelMat.value.avgCost || 0));
});

const projectedPackagingCost = computed(() => {
  return bottlesCost.value + labelsCost.value + extraItemsTotalCost.value;
});

const baseMilkCost = computed(() => {
  const costPerLiter = Number(props.batch?.costPerLiter) || 2800;
  return Math.round(effectiveBaseLiters.value * costPerLiter);
});

const totalBatchFractionCost = computed(() => {
  return baseMilkCost.value + projectedPackagingCost.value;
});

const totalCostPerLiter = computed(() => {
  if (requiredLiters.value <= 0) return 0;
  return Math.round(totalBatchFractionCost.value / requiredLiters.value);
});

const projectedRevenue = computed(() => {
  const b = totalBottles.value;
  const price = typeof unitPrice.value === 'number' && !isNaN(unitPrice.value) ? unitPrice.value : 0;
  return b * price;
});

const projectedGrossMargin = computed(() => {
  return projectedRevenue.value - totalBatchFractionCost.value;
});

const projectedGrossMarginPercent = computed(() => {
  if (projectedRevenue.value <= 0) return 0;
  return Math.round((projectedGrossMargin.value / projectedRevenue.value) * 1000) / 10;
});

// Pre-ventas: Filtrar por sabor y presentación activa
interface OrderPresentationMatch {
  order: any;
  matchingBottles: number;
  matchingLiters: number;
  matchingAmount: number;
}

const filteredOrders = computed<OrderPresentationMatch[]>(() => {
  if (!activePresentation.value) return [];
  const presCap = Number(activePresentation.value.capacityLiters) || 1;
  const presName = activePresentation.value.name.toLowerCase();

  const matches: OrderPresentationMatch[] = [];

  for (const ord of pendingOrders.value) {
    let orderBottles = 0;
    let orderLiters = 0;
    let orderAmount = 0;

    if (Array.isArray(ord.items) && ord.items.length > 0) {
      for (const it of ord.items) {
        const itemCap = Number(it.litersPerUnit) || 1;
        const itemSize = (it.bottleSize || '').toLowerCase();
        const matchesCap = Math.abs(itemCap - presCap) < 0.001;
        const matchesName = itemSize.includes(presName) || (presCap === 0.5 && itemSize.includes('500'));

        if (matchesCap || matchesName) {
          const q = Number(it.quantity) || 0;
          orderBottles += q;
          orderLiters += Number(it.totalLiters) || (q * presCap);
          orderAmount += Number(it.totalPrice) || (q * (Number(it.unitPrice) || 0));
        }
      }
    } else {
      // Pedido legacy sin items desglosados
      const ordCap = Number(ord.totalLiters) / (Number(ord.quantityBottles) || 1);
      const ordSize = (ord.bottleSize || '').toLowerCase();
      if (Math.abs(ordCap - presCap) < 0.001 || ordSize.includes(presName)) {
        orderBottles = Number(ord.quantityBottles) || 0;
        orderLiters = Number(ord.totalLiters) || 0;
        orderAmount = Number(ord.totalAmount) || 0;
      }
    }

    if (orderBottles > 0) {
      matches.push({
        order: ord,
        matchingBottles: orderBottles,
        matchingLiters: Math.round(orderLiters * 100) / 100,
        matchingAmount: orderAmount,
      });
    }
  }

  return matches;
});

// Botellas comprometidas por las órdenes seleccionadas
const selectedOrdersBottles = computed(() => {
  return filteredOrders.value
    .filter((m) => selectedOrderIds.value.includes(m.order.id))
    .reduce((sum, m) => sum + m.matchingBottles, 0);
});

const selectedOrdersLiters = computed(() => {
  return filteredOrders.value
    .filter((m) => selectedOrderIds.value.includes(m.order.id))
    .reduce((sum, m) => sum + m.matchingLiters, 0);
});

// Saldo de botellas remanentes no comprometidas (RF-10)
const remainingFreeBottles = computed(() => {
  return Math.max(0, totalBottles.value - selectedOrdersBottles.value);
});

function isOrderSelectable(match: OrderPresentationMatch): boolean {
  if (selectedOrderIds.value.includes(match.order.id)) return true;
  return match.matchingBottles <= remainingFreeBottles.value;
}

function toggleOrderSelection(match: OrderPresentationMatch) {
  const ordId = match.order.id;
  const idx = selectedOrderIds.value.indexOf(ordId);
  if (idx >= 0) {
    selectedOrderIds.value.splice(idx, 1);
  } else {
    if (isOrderSelectable(match)) {
      selectedOrderIds.value.push(ordId);
    }
  }
}

function toggleAllOrders() {
  const selectableMatches = filteredOrders.value.filter((m) => isOrderSelectable(m));
  if (selectedOrderIds.value.length === selectableMatches.length && selectableMatches.length > 0) {
    selectedOrderIds.value = [];
  } else {
    // Vincular codiciosamente hasta agotar el saldo
    let currentFree = totalBottles.value;
    const newSelected: number[] = [];
    for (const m of filteredOrders.value) {
      if (m.matchingBottles <= currentFree) {
        newSelected.push(m.order.id);
        currentFree -= m.matchingBottles;
      }
    }
    selectedOrderIds.value = newSelected;
  }
}

// Alerta en edición si reduce cobertura o viola pedidos entregados
const isReducingDeliveredOrders = computed(() => {
  if (!isEditMode.value) return false;
  return totalBottles.value < deliveredBottlesCount.value;
});

// Validación global del formulario
const isValid = computed(() => {
  if (isLegacyMixedEdit.value) return false;
  const hasBottles = totalBottles.value > 0;
  const notExceeds = !exceedsVolume.value;
  const hasFlavor = resolvedFlavor.value.trim().length > 0;
  const stockOk = !hasInsufficientStock.value && !isBottleInsufficient.value && !isLabelsInsufficient.value;
  const priceOk = typeof unitPrice.value === 'number' && !isNaN(unitPrice.value) && unitPrice.value >= 0;
  const validBase = effectiveBaseLiters.value > 0;
  const deliveredOk = !isReducingDeliveredOrders.value;

  return (
    hasBottles &&
    notExceeds &&
    hasFlavor &&
    stockOk &&
    priceOk &&
    validBase &&
    deliveredOk &&
    !isSubmitting.value
  );
});

// Formateador de moneda
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

// Cargar insumos de inventario
async function loadInventoryMaterials() {
  if (allMaterials.value.length > 0) return;
  isLoadingMaterials.value = true;
  try {
    const list = await http.get<MaterialItem[]>('/inventory/materials');
    if (Array.isArray(list)) {
      allMaterials.value = list;
    }
  } catch {
    allMaterials.value = [];
  } finally {
    isLoadingMaterials.value = false;
  }
}

// Cargar pre-ventas
async function loadPendingOrders(flavor: string) {
  isLoadingOrders.value = true;
  try {
    const res = await productionStore.fetchPendingOrders(flavor);
    pendingOrders.value = res.orders || [];
    selectedOrderIds.value = selectedOrderIds.value.filter((id) =>
      pendingOrders.value.some((o) => o.id === id)
    );
  } catch {
    pendingOrders.value = [];
  } finally {
    isLoadingOrders.value = false;
  }
}

// Seleccionar pestaña de presentación
function selectPresentation(pres: ProductPresentation) {
  if (isEditMode.value) return; // Inmutable en edición
  if (selectedPresentationId.value === pres.id) return;

  selectedPresentationId.value = pres.id;
  selectedBottleMaterialId.value = pres.rawMaterialId || '';
  unitPrice.value = pres.defaultPrice ?? 12000;

  // RF-10: Reiniciar pre-ventas seleccionadas al cambiar presentación
  selectedOrderIds.value = [];

  // RF-11: Limpiar dosis de insumos extras al cambiar presentación
  for (const row of extraItems.value) {
    row.gramsPerBottle = '';
    row.quantityUsed = '';
  }
}

// Observador de sincronización de base láctea
watch(requiredLiters, (newVol) => {
  if (!isBaseLitersManual.value) {
    baseLitersUsed.value = newVol > 0 ? newVol : '';
  }
});

// Observador para sincronizar etiquetas con botellas si no ha sido modificado manualmente
watch(totalBottles, (newTotal) => {
  if (selectedLabelId.value && !isLabelQtyManual.value) {
    labelQuantity.value = newTotal;
  }
});

watch(selectedLabelId, (newLabelId) => {
  if (!newLabelId) {
    labelQuantity.value = '';
    isLabelQtyManual.value = false;
  } else {
    if (!isLabelQtyManual.value || !labelQuantity.value) {
      labelQuantity.value = totalBottles.value;
    }
  }
});

// Observador principal al abrir el modal o cambiar el fraccionamiento
watch(
  () => [props.open, props.batch, props.packagingToEdit],
  async ([isOpen, currentBatch, currentPkg]) => {
    if (isOpen && currentBatch) {
      errorMessage.value = null;
      await loadInventoryMaterials();
      if (productionStore.presentations.length === 0) {
        await productionStore.fetchPresentations();
      }

      if (currentPkg) {
        // MODO EDICIÓN
        const pkg = currentPkg as BatchPackagingItem;
        baseFlavor.value = flavors.value.includes(pkg.flavor) ? pkg.flavor : 'Personalizado';
        if (baseFlavor.value === 'Personalizado') {
          customFlavorName.value = pkg.flavor;
        } else {
          customFlavorName.value = '';
        }
        flavorVariant.value = '';

        // Identificar presentación del fraccionamiento a editar
        let presMatch: ProductPresentation | null = null;
        let pkgBottles = 0;
        let pkgPrice = 12000;
        let pkgRawMatId: number | '' = '';

        if (Array.isArray(pkg.containers) && pkg.containers.length > 0) {
          const c0 = pkg.containers[0];
          pkgBottles = Number(c0.quantity) || 0;
          pkgPrice = Number(c0.price) || 12000;
          pkgRawMatId = c0.rawMaterialId ? Number(c0.rawMaterialId) : '';
          const cap = Number(c0.capacityLiters) || 1;
          presMatch =
            sortedActivePresentations.value.find(
              (p) => Math.abs(Number(p.capacityLiters) - cap) < 0.001
            ) || null;
        } else if (Number(pkg.bottles1L) > 0) {
          pkgBottles = Number(pkg.bottles1L);
          pkgPrice = pkg.price1L ?? 12000;
          pkgRawMatId = (pkg as any).bottle1LRawMaterialId || '';
          presMatch =
            sortedActivePresentations.value.find(
              (p) => p.name === '1L' || Math.abs(Number(p.capacityLiters) - 1.0) < 0.001
            ) || null;
        } else if (Number(pkg.bottles2L) > 0) {
          pkgBottles = Number(pkg.bottles2L);
          pkgPrice = pkg.price2L ?? 24000;
          pkgRawMatId = (pkg as any).bottle2LRawMaterialId || '';
          presMatch =
            sortedActivePresentations.value.find(
              (p) => p.name === '2L' || Math.abs(Number(p.capacityLiters) - 2.0) < 0.001
            ) || null;
        }

        if (presMatch) {
          selectedPresentationId.value = presMatch.id;
        } else if (sortedActivePresentations.value.length > 0) {
          selectedPresentationId.value = sortedActivePresentations.value[0].id;
        }

        bottles.value = pkgBottles;
        unitPrice.value = pkgPrice;
        selectedBottleMaterialId.value = pkgRawMatId;

        // Base láctea
        baseLitersUsed.value = pkg.baseLitersUsed ?? (pkg.totalLiters || '');
        isBaseLitersManual.value = true;

        notes.value = pkg.notes || '';
        packagedBy.value = pkg.packagedBy || 'Edier';
        packagedAt.value = pkg.packagedAt
          ? toInputDateFormat(pkg.packagedAt)
          : getTodayDateBogota();
        selectedOrderIds.value = [];

        // Etiquetas
        if ((pkg as any).labelRawMaterialId) {
          selectedLabelId.value = (pkg as any).labelRawMaterialId;
          labelQuantity.value = (pkg as any).labelQuantity ?? pkgBottles;
          isLabelQtyManual.value = true;
        } else if ((pkg as any).useLabels === false) {
          selectedLabelId.value = '';
          labelQuantity.value = '';
          isLabelQtyManual.value = false;
        } else {
          selectedLabelId.value = labelMaterials.value[0]?.id || '';
          labelQuantity.value = pkgBottles;
          isLabelQtyManual.value = false;
        }

        // Rehidratar insumos extras con gramsPerBottle
        if (pkg.itemsUsed && pkg.itemsUsed.length > 0) {
          extraItems.value = pkg.itemsUsed
            .filter((it) => {
              const mat = allMaterials.value.find((m) => m.id === it.rawMaterialId);
              return mat && mat.category !== 'EMPAQUE';
            })
            .map((it) => {
              const mat = allMaterials.value.find((m) => m.id === it.rawMaterialId);
              const isKg = isKgUnit(mat?.unit);
              const gPerBottle =
                isKg && pkgBottles > 0
                  ? Math.round(((Number(it.quantityUsed) * 1000) / pkgBottles) * 10) / 10
                  : '';
              return {
                rawMaterialId: it.rawMaterialId,
                gramsPerBottle: gPerBottle,
                quantityUsed: isKg ? '' : it.quantityUsed,
                dosagePerLiter: it.dosagePerLiter || '',
              };
            });
        } else {
          extraItems.value = [];
        }

        // Consultar órdenes entregadas asociadas si están disponibles
        deliveredBottlesCount.value = (pkg as any).deliveredBottles || 0;
      } else {
        // MODO CREACIÓN
        baseFlavor.value = (currentBatch as BatchItem).flavor || 'Natural';
        customFlavorName.value = '';
        flavorVariant.value = '';

        // Preselección por defecto: 1 Litro (1L) o menor capacidad
        const default1L = sortedActivePresentations.value.find(
          (p) => p.name === '1L' || Math.abs(Number(p.capacityLiters) - 1.0) < 0.001
        );
        const initialPres = default1L || sortedActivePresentations.value[0] || null;

        if (initialPres) {
          selectedPresentationId.value = initialPres.id;
          selectedBottleMaterialId.value = initialPres.rawMaterialId || '';
          unitPrice.value = initialPres.defaultPrice ?? 12000;
        }

        bottles.value = '';
        baseLitersUsed.value = '';
        isBaseLitersManual.value = false;
        extraItems.value = [];
        notes.value = '';
        packagedBy.value = 'Edier';
        packagedAt.value = getTodayDateBogota();
        selectedOrderIds.value = [];
        deliveredBottlesCount.value = 0;

        // Etiqueta sugerida
        selectedLabelId.value = labelMaterials.value[0]?.id || '';
        labelQuantity.value = 0;
        isLabelQtyManual.value = false;
      }

      await loadPendingOrders(resolvedFlavor.value);
    }
  },
  { immediate: true }
);

// Observador al cambiar el sabor para refrescar las pre-ventas
watch(resolvedFlavor, (newFlavor) => {
  if (props.open && newFlavor) {
    loadPendingOrders(newFlavor);
  }
});

function handleClose() {
  emit('update:open', false);
}

async function handleSubmit() {
  if (!isValid.value || !props.batch || !activePresentation.value) return;

  isSubmitting.value = true;
  errorMessage.value = null;

  try {
    const pres = activePresentation.value;
    const b = totalBottles.value;
    const cap = Number(pres.capacityLiters) || 1;
    const price = typeof unitPrice.value === 'number' && !isNaN(unitPrice.value) ? unitPrice.value : 0;
    const bottleMatId = selectedBottleMaterialId.value ? Number(selectedBottleMaterialId.value) : (pres.rawMaterialId || undefined);

    // Mapear insumos extras
    const resolvedExtraItems = extraItems.value
      .filter((r) => r.rawMaterialId)
      .map((r) => {
        const calc = getExtraItemCalc(r)!;
        return {
          rawMaterialId: Number(r.rawMaterialId),
          quantityUsed: calc.quantityUsed,
          gramsPerBottle: calc.isKg && typeof r.gramsPerBottle === 'number' ? r.gramsPerBottle : undefined,
          dosagePerLiter: calc.isKg && cap > 0 && typeof r.gramsPerBottle === 'number'
            ? Math.round((r.gramsPerBottle / cap) * 100) / 100
            : undefined,
          dosageUnit: calc.isKg ? 'g/L' : calc.material.unit,
          unitCost: calc.unitCost,
        };
      })
      .filter((it) => it.quantityUsed > 0);

    // Estructurar containers canónicos mono-presentación
    const customContainersPayload = [
      {
        containerName: pres.name,
        capacityLiters: cap,
        quantity: b,
        price,
        rawMaterialId: bottleMatId || 0,
      },
    ];

    const payload: BatchPackagingPayload = {
      flavor: resolvedFlavor.value,
      bottles1L: Math.abs(cap - 1.0) < 0.001 ? b : 0,
      bottles2L: Math.abs(cap - 2.0) < 0.001 ? b : 0,
      price1L: Math.abs(cap - 1.0) < 0.001 ? price : undefined,
      price2L: Math.abs(cap - 2.0) < 0.001 ? price : undefined,
      baseLitersUsed:
        typeof baseLitersUsed.value === 'number' &&
        !isNaN(baseLitersUsed.value) &&
        baseLitersUsed.value > 0
          ? baseLitersUsed.value
          : undefined,
      bottle1LRawMaterialId: Math.abs(cap - 1.0) < 0.001 ? bottleMatId : undefined,
      bottle2LRawMaterialId: Math.abs(cap - 2.0) < 0.001 ? bottleMatId : undefined,
      labelRawMaterialId: selectedLabelId.value ? Number(selectedLabelId.value) : null,
      labelQuantity: selectedLabelId.value ? Number(labelQuantity.value) || 0 : 0,
      customContainers: customContainersPayload,
      extraItems: resolvedExtraItems.length > 0 ? resolvedExtraItems : undefined,
      fruitRawMaterialId: resolvedExtraItems[0]?.rawMaterialId,
      fruitQuantityUsed: resolvedExtraItems[0]?.quantityUsed,
      useLabels: !!selectedLabelId.value,
      notes: notes.value ? notes.value.trim() : undefined,
      packagedBy: packagedBy.value ? packagedBy.value.trim() : 'Edier',
      packagedAt: getDeviceTimestamp(packagedAt.value),
      linkOrderIds: selectedOrderIds.value.length > 0 ? selectedOrderIds.value : undefined,
    };

    if (isEditMode.value && props.packagingToEdit) {
      await productionStore.updateBatchPackaging(
        props.packagingToEdit.id,
        payload as UpdateBatchPackagingPayload
      );
    } else {
      await productionStore.packageBatch(props.batch.id, payload);
    }
    emit('packaged');
    handleClose();
  } catch (err: any) {
    errorMessage.value = err?.message || 'Error al guardar el envasado';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <DialogRoot :open="open" @update:open="(val: boolean) => emit('update:open', val)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity" />

      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-3xl border border-surface-light-border bg-surface-light-card shadow-2xl transition-all focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card overflow-hidden"
      >
        <!-- 1. Cabecera del Diálogo (Capa Fija Superior) -->
        <div class="flex shrink-0 items-center justify-between border-b border-surface-light-border p-5 sm:p-6 dark:border-surface-dark-border">
          <div class="flex items-center gap-2.5">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <PackageCheck class="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                {{ isEditMode ? 'Editar Fraccionamiento de Lote' : 'Envasar y Fraccionar Lote' }}
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Fase B · Mono-presentación, dosificación por botella, rendimiento lácteo y pre-ventas
              </DialogDescription>
            </div>
          </div>

          <button
            type="button"
            @click="handleClose"
            class="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Formulario con Cuerpo Scrollable -->
        <form @submit.prevent="handleSubmit" novalidate class="flex flex-1 flex-col min-h-0 overflow-hidden">
          
          <!-- 2. Cuerpo Scrollable Central (Capa Desplazable) -->
          <div class="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 overscroll-contain touch-pan-y">
            
            <!-- Banner de Auditoría: Registro Histórico Mixto en Modo Edición (RF-12) -->
            <div
              v-if="isLegacyMixedEdit"
              class="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
            >
              <AlertTriangle class="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p class="font-extrabold text-sm">Fracción Histórica Mixta (Solo Lectura)</p>
                <p class="mt-1 font-medium">
                  Este fraccionamiento contiene múltiples formatos simultáneos (1L + 2L o formatos personalizados). Conforme a la arquitectura mono-presentación de Fase B, este registro histórico se preserva intacto para auditoría y no puede ser alterado en lote mixto.
                </p>
              </div>
            </div>

            <!-- Resumen del Lote Madre -->
            <div v-if="batch" class="rounded-2xl border border-surface-light-border bg-slate-50/70 p-3.5 dark:border-surface-dark-border dark:bg-surface-dark-canvas">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span class="font-mono text-xs font-black text-brand-800 dark:text-brand-darkText">
                    #{{ batch.batchCode }}
                  </span>
                  <span class="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-black text-purple-800 dark:bg-purple-950/50 dark:text-purple-300">
                    {{ batch.flavor }}
                  </span>
                </div>

                <div class="flex items-center gap-3 text-xs">
                  <div>
                    <span class="text-slate-400">Volumen Lote:</span>
                    <span class="ml-1 font-extrabold text-slate-700 dark:text-slate-300">
                      {{ batch.totalLitersProduced }} L
                    </span>
                  </div>
                  <div>
                    <span class="text-slate-400">Saldo en Tanque:</span>
                    <span
                      class="ml-1 rounded-md px-1.5 py-0.5 font-black"
                      :class="
                        unpackagedLiters > 0
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                      "
                    >
                      {{ unpackagedLiters }} L
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Selector de Presentación Activa (Pestañas Dinámicas Mono-Presentación) -->
            <div class="space-y-2.5 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 dark:border-surface-dark-border dark:bg-surface-dark-card">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-white">
                  <PackageCheck class="h-4 w-4 text-emerald-500" />
                  <span>Presentación de la Fracción *</span>
                </div>
                <span v-if="isEditMode" class="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                  <Lock class="h-3 w-3" />
                  <span>Presentación Fija</span>
                </span>
                <span v-else class="text-[11px] font-bold text-slate-400">
                  Mono-presentación por fracción
                </span>
              </div>

              <!-- Pestañas de presentaciones activas -->
              <div class="flex flex-wrap gap-2 pt-1">
                <button
                  v-for="pres in sortedActivePresentations"
                  :key="pres.id"
                  type="button"
                  :disabled="isEditMode && selectedPresentationId !== pres.id"
                  @click="selectPresentation(pres)"
                  class="flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-extrabold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  :class="
                    selectedPresentationId === pres.id
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : 'border-surface-light-border bg-surface-light-canvas text-slate-700 hover:border-slate-300 dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-slate-300'
                  "
                >
                  <CheckCircle2
                    v-if="selectedPresentationId === pres.id"
                    class="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                  />
                  <span>{{ pres.label || pres.name }}</span>
                  <span class="rounded-md bg-black/5 px-1.5 py-0.5 text-[10px] font-black text-slate-500 dark:bg-white/10 dark:text-slate-300">
                    {{ pres.capacityLiters }}L
                  </span>
                </button>
              </div>
            </div>

            <!-- Unidades, Envase y Precio de Venta -->
            <div class="space-y-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 dark:border-surface-dark-border dark:bg-surface-dark-card">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-white">
                  <Tag class="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Envase, Unidades y Precio ({{ activePresentation?.name || '1L' }})</span>
                </div>
                <div class="text-right text-xs">
                  <span class="text-slate-400">Volumen Comercial:</span>
                  <span class="ml-1 font-black text-emerald-600 dark:text-emerald-400">
                    {{ requiredLiters }} L
                  </span>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <!-- Cantidad de Botellas -->
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Botellas a Envasar *
                    </label>
                    <span
                      class="text-[11px]"
                      :class="isBottleInsufficient ? 'font-bold text-rose-500 dark:text-rose-400' : 'text-slate-400'"
                    >
                      Stock envases: {{ formatStockQuantity(currentBottleMat?.currentStock ?? 0, 'und') }}
                    </span>
                  </div>
                  <div class="relative">
                    <input
                      v-model.number="bottles"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="0"
                      class="w-full rounded-xl border bg-surface-light-canvas px-3.5 py-2.5 text-sm font-extrabold focus:border-brand-800 focus:outline-none dark:bg-surface-dark-canvas"
                      :class="
                        isBottleInsufficient
                          ? 'border-rose-500 bg-rose-500/10 text-rose-500 dark:border-rose-500 dark:bg-rose-950/30 dark:text-rose-400'
                          : 'border-surface-light-border text-slate-900 dark:border-surface-dark-border dark:text-white'
                      "
                    />
                    <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Botellas
                    </span>
                  </div>
                  <p v-if="isBottleInsufficient" class="mt-1 text-[11px] font-bold text-rose-500 dark:text-rose-400">
                    Stock insuficiente de envases en bodega (Disponible: {{ formatStockQuantity(currentBottleMat?.currentStock ?? 0, 'und') }})
                  </p>
                  <p v-if="isReducingDeliveredOrders" class="mt-1 text-[11px] font-bold text-rose-500 dark:text-rose-400">
                    No puedes reducir a menos de {{ deliveredBottlesCount }} botellas porque ya fueron entregadas a clientes.
                  </p>
                </div>

                <!-- Precio Unitario de Venta -->
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Precio de Venta ($ COP) *
                    </label>
                    <span class="text-[10px] text-slate-400">
                      Admite $0 (degustación/muestra)
                    </span>
                  </div>
                  <div class="relative">
                    <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                    <input
                      v-model.number="unitPrice"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="12000"
                      class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-8 pr-3.5 text-sm font-extrabold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <!-- Selector de Insumo de Envase Vinculado -->
              <div class="border-t border-slate-100 pt-3 dark:border-slate-800">
                <SearchableSelect
                  v-model="selectedBottleMaterialId"
                  :options="containerSelectOptions"
                  :label="`Insumo de Envase de Almacén (${activePresentation?.name})`"
                  placeholder="Seleccionar envase de inventario..."
                  :required="true"
                />
              </div>
            </div>

            <!-- Sabor de la Fracción -->
            <div class="space-y-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 dark:border-surface-dark-border dark:bg-surface-dark-card">
              <div class="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-white">
                <Sparkles class="h-4 w-4 text-purple-500" />
                <span>Sabor de la Fracción a Envasar</span>
              </div>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Catálogo de Sabores *
                  </label>
                  <select
                    v-model="baseFlavor"
                    class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                  >
                    <option v-for="fl in flavors" :key="fl" :value="fl">
                      {{ fl }}
                    </option>
                  </select>
                </div>

                <!-- Variante o Manual -->
                <div v-if="baseFlavor === 'Personalizado'">
                  <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Sabor Artesanal *
                  </label>
                  <input
                    v-model="customFlavorName"
                    type="text"
                    required
                    placeholder="Ej. Frutos Silvestres"
                    class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                  />
                </div>

                <div v-else>
                  <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Variante <span class="font-normal text-slate-400">(Opcional)</span>
                  </label>
                  <input
                    v-model="flavorVariant"
                    type="text"
                    placeholder="Ej. bajo en azúcar, con stevia..."
                    class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                  />
                </div>
              </div>

              <div class="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Sabor Final Registrado:
                </span>
                <span class="rounded-lg bg-purple-50 px-2 py-0.5 text-xs font-black text-purple-800 dark:bg-purple-950/40 dark:text-purple-300">
                  {{ resolvedFlavor }}
                </span>
              </div>
            </div>

            <!-- Base Láctea y Rendimiento Volumétrico (Fase B & Constitución Art. 5.6) -->
            <div class="space-y-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 dark:border-surface-dark-border dark:bg-surface-dark-card">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-white">
                  <Milk class="h-4 w-4 text-brand-700 dark:text-brand-darkText" />
                  <span>Base Láctea del Lote & Rendimiento</span>
                </div>
                <div class="flex items-center gap-2">
                  <span
                    class="rounded-full px-2.5 py-0.5 text-[11px] font-black"
                    :class="
                      yieldPercentage > 100
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : yieldPercentage > 0 && yieldPercentage < 100
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    "
                  >
                    Rendimiento: {{ yieldPercentage }}%
                  </span>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Litros de Base a Extraer del Lote (L) *
                    </label>
                    <span class="text-[11px] text-slate-400">
                      Disponible: {{ unpackagedLiters }} L
                    </span>
                  </div>
                  <div class="relative">
                    <input
                      v-model.number="baseLitersUsed"
                      type="number"
                      min="0"
                      step="any"
                      @input="isBaseLitersManual = true"
                      :placeholder="`Sugerido: ${requiredLiters || unpackagedLiters} L`"
                      class="w-full rounded-xl border bg-surface-light-canvas px-3.5 py-2.5 text-sm font-extrabold focus:border-brand-800 focus:outline-none dark:bg-surface-dark-canvas"
                      :class="
                        exceedsVolume
                          ? 'border-rose-500 bg-rose-500/10 text-rose-500 dark:border-rose-500 dark:bg-rose-950/30 dark:text-rose-400'
                          : 'border-surface-light-border text-slate-900 dark:border-surface-dark-border dark:text-white'
                      "
                    />
                    <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Litros Base
                    </span>
                  </div>
                  <div class="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                    <button
                      type="button"
                      @click="baseLitersUsed = unpackagedLiters; isBaseLitersManual = true"
                      class="font-bold text-brand-700 hover:underline dark:text-brand-darkText"
                    >
                      Usar todo el saldo ({{ unpackagedLiters }} L)
                    </button>
                    <button
                      type="button"
                      @click="baseLitersUsed = requiredLiters; isBaseLitersManual = false"
                      class="text-slate-500 hover:underline dark:text-slate-400"
                    >
                      Sincronizar con volumen ({{ requiredLiters }} L)
                    </button>
                  </div>
                </div>

                <!-- Resumen Comparativo de Balance y Rendimiento -->
                <div class="rounded-xl border border-surface-light-border/60 bg-slate-50/70 p-3 text-xs dark:border-surface-dark-border/60 dark:bg-surface-dark-canvas/70 space-y-1.5">
                  <div class="flex items-center justify-between text-[11px]">
                    <span class="text-slate-500">Base láctea a extraer:</span>
                    <span class="font-extrabold text-slate-800 dark:text-slate-200">{{ effectiveBaseLiters }} L</span>
                  </div>
                  <div class="flex items-center justify-between text-[11px]">
                    <span class="text-slate-500">Volumen comercial envasado:</span>
                    <span class="font-extrabold text-emerald-600 dark:text-emerald-400">{{ requiredLiters }} L</span>
                  </div>
                  <div class="flex items-center justify-between text-[11px] border-t border-slate-200/60 pt-1 dark:border-slate-700/60">
                    <span class="text-slate-500">Expansión por adición:</span>
                    <span
                      class="font-black"
                      :class="requiredLiters >= effectiveBaseLiters ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'"
                    >
                      {{ requiredLiters >= effectiveBaseLiters ? '+' : '' }}{{ (Math.round((requiredLiters - effectiveBaseLiters) * 100) / 100) }} L
                    </span>
                  </div>
                  <p v-if="yieldPercentage > 100" class="text-[10px] text-emerald-700 dark:text-emerald-400">
                    Rendimiento expandido: El volumen de botellas supera la base láctea debido al aporte de mermelada y adiciones.
                  </p>
                </div>
              </div>

              <!-- Advertencia si excede el saldo en tanque -->
              <div
                v-if="exceedsVolume"
                class="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/80 p-2.5 text-xs font-semibold text-rose-800 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-300"
              >
                <AlertCircle class="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>
                  La base láctea a extraer ({{ effectiveBaseLiters }} L) supera el saldo disponible sin envasar del lote ({{ unpackagedLiters }} L). Reduce la base a extraer o las botellas.
                </span>
              </div>
            </div>

            <!-- Insumos Extras Multi-Fila (Dosificación por Botella en Gramos) -->
            <div class="space-y-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 dark:border-surface-dark-border dark:bg-surface-dark-card">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-white">
                  <Scale class="h-4 w-4 text-purple-500" />
                  <span>Insumos Extras & Adiciones (Pulpas, Almíbar, Fruta)</span>
                </div>
                <button
                  type="button"
                  @click="addExtraItem"
                  class="inline-flex items-center gap-1 rounded-xl bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/50 transition-colors"
                >
                  <Plus class="h-3.5 w-3.5" />
                  <span>Agregar Insumo</span>
                </button>
              </div>

              <div
                v-if="extraItems.length === 0"
                class="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400"
              >
                No se han agregado insumos adicionales. Opcional para sabor 'Natural'. Si la fracción lleva pulpa o almíbar, presiona [+ Agregar Insumo].
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="(item, idx) in extraItems"
                  :key="idx"
                  class="rounded-xl border border-surface-light-border bg-slate-50/50 p-3 text-xs dark:border-surface-dark-border dark:bg-surface-dark-canvas/50 space-y-2.5"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1">
                      <SearchableSelect
                        v-model="item.rawMaterialId"
                        :options="candidateSelectOptions"
                        :label="`Insumo / Adición #${idx + 1}`"
                        placeholder="Buscar insumo de almacén..."
                        :required="true"
                      />
                    </div>

                    <button
                      type="button"
                      @click="removeExtraItem(idx)"
                      class="mt-6 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
                      title="Eliminar insumo"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </div>

                  <!-- Campo de Dosificación por Botella -->
                  <div v-if="item.rawMaterialId" class="grid grid-cols-1 gap-2 sm:grid-cols-2 items-center">
                    <!-- Si es pesable (KG) -> Dosificación g / botella -->
                    <div v-if="getExtraItemCalc(item)?.isKg">
                      <label class="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                        Dosis en Gramos por Botella (g / {{ activePresentation?.name || 'botella' }}) *
                      </label>
                      <div class="relative">
                        <input
                          v-model.number="item.gramsPerBottle"
                          type="number"
                          min="0"
                          step="any"
                          placeholder="Ej. 75"
                          class="w-full rounded-xl border bg-surface-light-canvas px-3 py-1.5 text-xs font-extrabold focus:border-brand-800 focus:outline-none dark:bg-surface-dark-canvas pr-16"
                          :class="
                            getExtraItemCalc(item)?.isStockInsufficient
                              ? 'border-rose-500 bg-rose-500/10 text-rose-500 dark:border-rose-500 dark:bg-rose-950/30 dark:text-rose-400'
                              : 'border-surface-light-border text-slate-900 dark:border-surface-dark-border dark:text-white'
                          "
                        />
                        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                          g / bot
                        </span>
                      </div>
                    </div>

                    <!-- Si es otra unidad -> Cantidad directa -->
                    <div v-else>
                      <label class="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                        Cantidad Total Utilizada ({{ getExtraItemCalc(item)?.material.unit }}) *
                      </label>
                      <input
                        v-model.number="item.quantityUsed"
                        type="number"
                        min="0"
                        step="any"
                        :placeholder="`Cant. en ${getExtraItemCalc(item)?.material.unit}`"
                        class="w-full rounded-xl border bg-surface-light-canvas px-3 py-1.5 text-xs font-extrabold focus:border-brand-800 focus:outline-none dark:bg-surface-dark-canvas"
                        :class="
                          getExtraItemCalc(item)?.isStockInsufficient
                            ? 'border-rose-500 bg-rose-500/10 text-rose-500 dark:border-rose-500 dark:bg-rose-950/30 dark:text-rose-400'
                            : 'border-surface-light-border text-slate-900 dark:border-surface-dark-border dark:text-white'
                        "
                      />
                    </div>

                    <!-- Costo de la fila -->
                    <div class="flex items-center justify-between sm:justify-end gap-2 text-right">
                      <div>
                        <span class="block text-[10px] text-slate-400 uppercase">Costo Insumo</span>
                        <span class="font-extrabold text-slate-800 dark:text-white">
                          {{ formatCurrency(getExtraItemCalc(item)?.totalCost || 0) }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Panel de Báscula y Descuento en Almacén -->
                  <div
                    v-if="item.rawMaterialId && getExtraItemCalc(item)?.isKg"
                    class="rounded-lg border border-purple-100 bg-purple-50/60 p-2 text-xs dark:border-purple-900/40 dark:bg-purple-950/20"
                  >
                    <div class="flex flex-wrap items-center justify-between gap-1.5">
                      <div>
                        <span class="block text-[9px] font-black uppercase text-purple-700 dark:text-purple-300">
                          Pesaje en Báscula (Gramos)
                        </span>
                        <span class="text-xs font-black text-purple-950 dark:text-purple-100">
                          {{ (getExtraItemCalc(item)?.totalGrams || 0).toLocaleString('es-CO') }} g
                        </span>
                      </div>

                      <div class="text-right">
                        <span class="block text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400">
                          Descuento Almacén
                        </span>
                        <span class="font-extrabold text-slate-800 dark:text-slate-200">
                          {{ getExtraItemCalc(item)?.quantityUsed }} kg
                        </span>
                        <span class="text-[10px] text-slate-400">
                          / {{ formatStockQuantity(getExtraItemCalc(item)?.material.currentStock ?? 0, 'kg') }} kg disp.
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Alerta de stock insuficiente -->
                  <div
                    v-if="item.rawMaterialId && getExtraItemCalc(item)?.isStockInsufficient"
                    class="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] font-semibold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
                  >
                    <AlertCircle class="h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>
                      Stock insuficiente en bodega (Disponible: {{ formatStockQuantity(getExtraItemCalc(item)?.material.currentStock ?? 0, getExtraItemCalc(item)?.material.unit ?? '') }}).
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Etiquetas Adhesivas Dinámicas -->
            <div
              class="rounded-2xl border p-4 space-y-3"
              :class="
                isLabelsInsufficient
                  ? 'border-rose-200 bg-rose-50/20 dark:border-rose-900/50 dark:bg-rose-950/10'
                  : 'border-surface-light-border bg-surface-light-card dark:border-surface-dark-border dark:bg-surface-dark-card'
              "
            >
              <div class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-1.5 font-extrabold text-slate-800 dark:text-white">
                  <Tag class="h-4 w-4 text-brand-700 dark:text-brand-darkText" />
                  <span>Rotulado y Etiquetas Adhesivas</span>
                </div>
                <span
                  v-if="currentLabelMat"
                  class="text-[11px]"
                  :class="isLabelsInsufficient ? 'font-bold text-rose-500 dark:text-rose-400' : 'text-slate-400'"
                >
                  Stock disponible: {{ formatStockQuantity(currentLabelMat.currentStock ?? 0, 'und') }} und
                </span>
              </div>

              <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div>
                  <SearchableSelect
                    v-model="selectedLabelId"
                    :options="labelSelectOptions"
                    label="Insumo de Etiqueta"
                    placeholder="[Sin etiqueta / A granel] o buscar..."
                    :clearable="true"
                  />
                </div>

                <div v-if="selectedLabelId">
                  <div class="flex items-center justify-between mb-1">
                    <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      Unidades de Etiqueta a Descontar *
                    </label>
                    <span class="text-[10px] text-slate-400">Sugerido: {{ totalBottles }} und</span>
                  </div>
                  <div class="relative">
                    <input
                      v-model.number="labelQuantity"
                      type="number"
                      min="0"
                      step="any"
                      @input="isLabelQtyManual = true"
                      placeholder="0"
                      class="w-full rounded-xl border bg-surface-light-canvas px-3.5 py-2 text-xs font-extrabold focus:border-brand-800 focus:outline-none dark:bg-surface-dark-canvas"
                      :class="
                        isLabelsInsufficient
                          ? 'border-rose-500 bg-rose-500/10 text-rose-500 dark:border-rose-500 dark:bg-rose-950/30 dark:text-rose-400'
                          : 'border-surface-light-border text-slate-900 dark:border-surface-dark-border dark:text-white'
                      "
                    />
                    <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      und
                    </span>
                  </div>
                  <p v-if="isLabelsInsufficient" class="mt-1 text-[11px] font-bold text-rose-500 dark:text-rose-400">
                    Stock insuficiente en bodega (Disponible: {{ formatStockQuantity(currentLabelMat?.currentStock ?? 0, 'und') }})
                  </p>
                </div>
                <div v-else class="flex items-center text-xs text-slate-400 italic">
                  La fracción se registrará sin rotulado corporativo ni deducción de etiquetas de bodega.
                </div>
              </div>
            </div>

            <!-- Desglose Financiero Integral de la Fracción -->
            <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-4 dark:border-surface-dark-border dark:bg-surface-dark-card space-y-3">
              <div class="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                <div class="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-white">
                  <DollarSign class="h-4 w-4 text-brand-700 dark:text-brand-darkText" />
                  <span>Desglose Financiero Integral de la Fracción</span>
                </div>
                <span class="text-[11px] font-bold text-slate-400">
                  Inversión y margen proyectado
                </span>
              </div>

              <div class="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div class="rounded-xl border border-surface-light-border/60 bg-surface-light-canvas/60 p-2 dark:border-surface-dark-border/60 dark:bg-surface-dark-canvas/60">
                  <span class="block text-[9px] font-bold text-slate-400 uppercase">Base Láctea ({{ effectiveBaseLiters }}L)</span>
                  <span class="font-extrabold text-slate-700 dark:text-slate-300">
                    {{ formatCurrency(baseMilkCost) }}
                  </span>
                </div>

                <div class="rounded-xl border border-surface-light-border/60 bg-surface-light-canvas/60 p-2 dark:border-surface-dark-border/60 dark:bg-surface-dark-canvas/60">
                  <span class="block text-[9px] font-bold text-slate-400 uppercase">Envases</span>
                  <span class="font-extrabold text-slate-700 dark:text-slate-300">
                    {{ formatCurrency(bottlesCost) }}
                  </span>
                </div>

                <div class="rounded-xl border border-surface-light-border/60 bg-surface-light-canvas/60 p-2 dark:border-surface-dark-border/60 dark:bg-surface-dark-canvas/60">
                  <span class="block text-[9px] font-bold text-slate-400 uppercase">Etiquetas</span>
                  <span class="font-extrabold text-slate-700 dark:text-slate-300">
                    {{ formatCurrency(labelsCost) }}
                  </span>
                </div>

                <div class="rounded-xl border border-surface-light-border/60 bg-surface-light-canvas/60 p-2 dark:border-surface-dark-border/60 dark:bg-surface-dark-canvas/60">
                  <span class="block text-[9px] font-bold text-slate-400 uppercase">Insumos Extras</span>
                  <span class="font-extrabold text-slate-700 dark:text-slate-300">
                    {{ formatCurrency(extraItemsTotalCost) }}
                  </span>
                </div>
              </div>

              <!-- Resumen Total y Proyección de Margen -->
              <div class="grid grid-cols-1 gap-2 pt-2 border-t border-slate-100 sm:grid-cols-3 text-xs dark:border-slate-800">
                <div>
                  <span class="text-slate-500 dark:text-slate-400">Costo Total Fracción:</span>
                  <p class="font-black text-brand-800 dark:text-brand-darkText text-sm">
                    {{ formatCurrency(totalBatchFractionCost) }}
                    <span v-if="requiredLiters > 0" class="text-[11px] font-medium text-slate-400">
                      ({{ formatCurrency(totalCostPerLiter) }}/L)
                    </span>
                  </p>
                </div>

                <div>
                  <span class="text-slate-500 dark:text-slate-400">Facturación Estimada:</span>
                  <p class="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                    {{ formatCurrency(projectedRevenue) }}
                  </p>
                </div>

                <div>
                  <span class="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <TrendingUp class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Margen Bruto Proyectado:</span>
                  </span>
                  <p
                    class="font-black text-sm"
                    :class="projectedGrossMargin >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'"
                  >
                    {{ formatCurrency(projectedGrossMargin) }}
                    <span class="text-[11px] font-bold">({{ projectedGrossMarginPercent }}%)</span>
                  </p>
                </div>
              </div>
            </div>

            <!-- Pre-ventas Disponibles para Vincular (Filtradas por Presentación y Sabor) -->
            <div class="space-y-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 dark:border-surface-dark-border dark:bg-surface-dark-card">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-white">
                  <ShoppingCart class="h-4 w-4 text-brand-700 dark:text-brand-darkText" />
                  <span>Pre-ventas Disponibles ({{ activePresentation?.name || '1L' }})</span>
                  <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {{ filteredOrders.length }}
                  </span>
                </div>

                <button
                  v-if="filteredOrders.length > 0"
                  type="button"
                  @click="toggleAllOrders"
                  class="text-[11px] font-bold text-brand-800 hover:underline dark:text-brand-darkText"
                >
                  {{ selectedOrderIds.length > 0 ? 'Deseleccionar todas' : 'Vincular sugeridas' }}
                </button>
              </div>

              <!-- Listado de Pre-ventas -->
              <div v-if="isLoadingOrders" class="py-4 text-center text-xs text-slate-400">
                Consultando pedidos en pre-venta...
              </div>

              <div
                v-else-if="filteredOrders.length === 0"
                class="rounded-xl border border-dashed border-slate-200 p-3.5 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400"
              >
                No hay encargos en pre-venta registrados para {{ resolvedFlavor }} en presentación {{ activePresentation?.name || '1L' }}.
              </div>

              <div v-else class="max-h-48 space-y-2 overflow-y-auto pr-1">
                <div
                  v-for="match in filteredOrders"
                  :key="match.order.id"
                  @click="toggleOrderSelection(match)"
                  class="flex cursor-pointer items-center justify-between rounded-xl border p-2.5 transition-all"
                  :class="[
                    selectedOrderIds.includes(match.order.id)
                      ? 'border-emerald-500 bg-emerald-50/50 dark:border-emerald-700/60 dark:bg-emerald-950/20'
                      : 'border-slate-200 bg-surface-light-canvas hover:border-slate-300 dark:border-slate-700 dark:bg-surface-dark-canvas',
                    !isOrderSelectable(match) && !selectedOrderIds.includes(match.order.id)
                      ? 'opacity-40 cursor-not-allowed'
                      : ''
                  ]"
                >
                  <div class="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      :checked="selectedOrderIds.includes(match.order.id)"
                      :disabled="!isOrderSelectable(match) && !selectedOrderIds.includes(match.order.id)"
                      class="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                      @click.stop="toggleOrderSelection(match)"
                    />
                    <div>
                      <div class="flex items-center gap-1.5">
                        <span class="font-mono text-xs font-bold text-brand-800 dark:text-brand-darkText">
                          #{{ match.order.orderNumber || match.order.orderCode || match.order.id }}
                        </span>
                        <span class="text-xs font-extrabold text-slate-800 dark:text-white">
                          {{ match.order.customer?.fullName || 'Cliente' }}
                        </span>
                      </div>
                      <p class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                        Requiere: {{ match.matchingBottles }} botellas ({{ match.matchingLiters }}L)
                      </p>
                      <p class="text-[10px] text-slate-400">
                        {{ match.order.customer?.phone || 'Sin teléfono' }}
                      </p>
                    </div>
                  </div>

                  <div class="text-right text-xs">
                    <span class="font-bold text-emerald-600 dark:text-emerald-400">
                      {{ formatCurrency(match.matchingAmount) }}
                    </span>
                    <p v-if="!isOrderSelectable(match) && !selectedOrderIds.includes(match.order.id)" class="text-[10px] font-bold text-rose-500">
                      Excede saldo libre
                    </p>
                  </div>
                </div>
              </div>

              <!-- Saldo Remanente Libre de la Fracción (RF-10) -->
              <div class="flex items-center justify-between border-t border-slate-100 pt-2 text-xs dark:border-slate-800">
                <span class="text-slate-500">
                  {{ selectedOrderIds.length }} pedido(s) vinculado(s) ({{ selectedOrdersBottles }} botellas · {{ selectedOrdersLiters }}L)
                </span>
                <span class="font-black" :class="remainingFreeBottles > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'">
                  Saldo Libre: {{ remainingFreeBottles }} botellas
                </span>
              </div>
            </div>

            <!-- Fecha, Responsable y Notas -->
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Fecha de Envasado *
                </label>
                <input
                  v-model="packagedAt"
                  type="date"
                  required
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Responsable
                </label>
                <input
                  v-model="packagedBy"
                  type="text"
                  placeholder="Edier"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Notas del Envasado <span class="font-normal text-slate-400">(Opcional)</span>
              </label>
              <textarea
                v-model="notes"
                rows="2"
                placeholder="Detalles del envasado, lote de fruta, dosificación o textura..."
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white resize-none"
              ></textarea>
            </div>

            <!-- Mensaje de Error si aplica -->
            <div
              v-if="errorMessage"
              class="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs font-semibold text-rose-800 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-300"
            >
              <AlertCircle class="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{{ errorMessage }}</span>
            </div>

          </div>

          <!-- 3. Acciones del Modal Fijas en el Fondo (Capa Fija Inferior) -->
          <div class="flex shrink-0 items-center justify-end gap-2.5 border-t border-surface-light-border bg-surface-light-card p-4 sm:p-6 dark:border-surface-dark-border dark:bg-surface-dark-card">
            <button
              type="button"
              @click="handleClose"
              class="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>

            <button
              type="submit"
              :disabled="!isValid || isSubmitting"
              class="inline-flex items-center gap-2 rounded-xl bg-hero-gradient px-5 py-2.5 text-xs font-extrabold text-white shadow-card transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PackageCheck class="h-4 w-4 stroke-[2.5]" />
              <span v-if="isSubmitting">{{ isEditMode ? 'Guardando...' : 'Registrando...' }}</span>
              <span v-else>{{ isEditMode ? 'Guardar Cambios' : 'Confirmar Envasado' }} ({{ requiredLiters }}L)</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
