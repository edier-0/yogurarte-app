import { api } from '../api.js';
import { formatCOP, formatDate, formatDateTime, getTodayLocalDateStr, showToast, store, escapeHtml } from '../store.js';
import { dispatchSmartWhatsApp } from '../utils/whatsappDispatch.js';
import { paginateArray, renderPaginationHtml, attachPaginationEvents, PAGE_SIZE } from '../components/pagination.js';

let ordersCurrentPage = 1;

let currentFilters = {
  search: '',
  chip: 'ALL', // 'ALL' | 'TO_DELIVER' | 'IN_PROCESS' | 'DELIVERED_DEBT' | 'PAID' | 'UPDATED_DESC' | 'TODAY' | 'TOMORROW'
  debtCategory: 'ALL', // 'ALL' | 'DELIVERED_DEBT' | 'PAID_NOT_DELIVERED' | 'IN_PROCESS' | 'PAID'
  paymentStatus: 'ALL',
  deliveryStatus: 'ALL',
  driverFilter: 'ALL', // 'ALL' | 'PROPIO' | 'LOCAL' | 'UNASSIGNED' | 'DRIVER_1'
  batchId: 'ALL',
  sortBy: 'PRIORITY_DEBT', // 'PRIORITY_DEBT' | 'UPDATED_DESC' | 'DATE_DESC' | 'DATE_ASC'
  month: '', // YYYY-MM
  specificDate: '', // YYYY-MM-DD
  dateRange: 'ALL', // TODAY, TOMORROW, WEEK, ALL, CUSTOM
  minLiters: '',
  viewMode: 'list', // 'list' | 'calendar'
};

let calendarState = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(), // 0-11
};

let cachedOrders = [];
let availableBatches = [];
let availableDrivers = [];

function getActiveSecondaryFiltersCount() {
  let count = 0;
  if (currentFilters.driverFilter !== 'ALL') count++;
  if (currentFilters.batchId !== 'ALL') count++;
  if (currentFilters.paymentStatus !== 'ALL') count++;
  if (currentFilters.deliveryStatus !== 'ALL' && currentFilters.deliveryStatus !== 'TO_DELIVER') count++;
  if (currentFilters.specificDate) count++;
  if (currentFilters.month) count++;
  if (currentFilters.sortBy !== 'PRIORITY_DEBT' && currentFilters.sortBy !== 'UPDATED_DESC') count++;
  return count;
}

function updateChipUi(container) {
  container.querySelectorAll('[data-order-chip]').forEach((btn) => {
    if (btn.dataset.orderChip === currentFilters.chip) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function renderActiveFilterTags(container) {
  const banner = container.querySelector('#activeFilterTagsBanner');
  const countBadge = container.querySelector('#ordersFilterBadgeCount');
  if (!banner) return;

  const count = getActiveSecondaryFiltersCount();
  if (countBadge) {
    if (count > 0) {
      countBadge.textContent = String(count);
      countBadge.style.display = 'inline-flex';
    } else {
      countBadge.style.display = 'none';
    }
  }

  const tags = [];
  if (currentFilters.specificDate) {
    tags.push({ key: 'specificDate', label: `📅 ${formatDate(currentFilters.specificDate)}` });
  }
  if (currentFilters.driverFilter !== 'ALL') {
    let dLabel = '🛵 Repartidor';
    if (currentFilters.driverFilter === 'PROPIO') dLabel = '👤 Entrega Propia';
    else if (currentFilters.driverFilter === 'LOCAL') dLabel = '🏪 En Local';
    else if (currentFilters.driverFilter === 'UNASSIGNED') dLabel = '⚠️ Sin Asignar';
    else {
      const dObj = availableDrivers.find((d) => `DRIVER_${d.id}` === currentFilters.driverFilter);
      if (dObj) dLabel = `🛵 ${dObj.name}`;
    }
    tags.push({ key: 'driverFilter', label: dLabel });
  }
  if (currentFilters.batchId !== 'ALL') {
    const bObj = availableBatches.find((b) => String(b.id) === String(currentFilters.batchId));
    tags.push({ key: 'batchId', label: bObj ? `🍶 ${bObj.batchCode}` : '🍶 Lote' });
  }
  if (currentFilters.deliveryStatus !== 'ALL' && currentFilters.deliveryStatus !== 'TO_DELIVER') {
    const statusLabels = {
      PENDING: '🕒 Pendiente',
      PREPARING: '🥣 En Prep.',
      READY_FOR_DISPATCH: '📦 Listo',
      IN_ROUTE: '🛵 En Ruta',
      DELIVERED: '✅ Entregado',
    };
    tags.push({ key: 'deliveryStatus', label: statusLabels[currentFilters.deliveryStatus] || currentFilters.deliveryStatus });
  }
  if (currentFilters.paymentStatus !== 'ALL') {
    const payLabels = { PAID: '🟢 Pagado', PARTIAL: '🟡 Parcial', PENDING: '🔴 Pend. Pago' };
    tags.push({ key: 'paymentStatus', label: payLabels[currentFilters.paymentStatus] || currentFilters.paymentStatus });
  }
  if (currentFilters.month) {
    tags.push({ key: 'month', label: `📅 Mes: ${currentFilters.month}` });
  }

  if (tags.length === 0) {
    banner.innerHTML = '';
    banner.style.display = 'none';
    return;
  }

  banner.style.display = 'flex';
  banner.innerHTML = `
    <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); display: inline-flex; align-items: center;">Filtros:</span>
    ${tags
      .map(
        (t) => `
      <span class="badge" style="background: var(--bg-card); color: var(--primary); border: 1px solid var(--border-color); font-weight: 700; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: var(--radius-sm);">
        ${t.label}
        <button type="button" data-clear-tag="${t.key}" style="border: none; background: none; cursor: pointer; color: var(--danger); font-weight: 800; font-size: 0.85rem; padding: 0 2px;" title="Quitar filtro">✕</button>
      </span>
    `
      )
      .join('')}
    <button type="button" id="btnClearAllOrderFilters" style="border: none; background: none; cursor: pointer; color: var(--accent); font-weight: 700; font-size: 0.78rem; text-decoration: underline; padding: 2px 6px;">
      Limpiar filtros
    </button>
  `;

  banner.querySelectorAll('[data-clear-tag]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const key = e.currentTarget.dataset.clearTag;
      if (key === 'specificDate') {
        currentFilters.specificDate = '';
        currentFilters.dateRange = 'ALL';
      } else if (key === 'driverFilter') {
        currentFilters.driverFilter = 'ALL';
      } else if (key === 'batchId') {
        currentFilters.batchId = 'ALL';
      } else if (key === 'deliveryStatus') {
        currentFilters.deliveryStatus = 'ALL';
      } else if (key === 'paymentStatus') {
        currentFilters.paymentStatus = 'ALL';
      } else if (key === 'month') {
        currentFilters.month = '';
      }
      ordersCurrentPage = 1;
      renderActiveFilterTags(container);
      loadOrdersList(container);
    });
  });

  banner.querySelector('#btnClearAllOrderFilters')?.addEventListener('click', () => {
    currentFilters.specificDate = '';
    currentFilters.driverFilter = 'ALL';
    currentFilters.batchId = 'ALL';
    currentFilters.deliveryStatus = 'ALL';
    currentFilters.paymentStatus = 'ALL';
    currentFilters.month = '';
    currentFilters.chip = 'ALL';
    currentFilters.debtCategory = 'ALL';
    ordersCurrentPage = 1;
    updateChipUi(container);
    renderActiveFilterTags(container);
    loadOrdersList(container);
  });
}

export async function renderOrders(container) {
  // Cargar lotes disponibles y repartidores para los filtros
  try {
    const [batchesRes, usersRes] = await Promise.all([
      api.getBatches({ lite: 'true' }),
      api.getUsers(),
    ]);
    availableBatches = batchesRes || [];
    availableDrivers = (usersRes || []).filter((u) => u.role === 'DOMICILIARIO' && u.isActive !== false);
  } catch (err) {
    console.error('Error fetching batches or drivers for filter:', err);
    availableBatches = [];
    availableDrivers = [];
  }

  // Generar opciones de meses anteriores dinámicamente
  const monthOptions = [];
  const currDate = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(currDate.getFullYear(), currDate.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(d);
    monthOptions.push({ val, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }

  container.innerHTML = `
    <!-- Toolbar de Búsqueda y Filtros Optimizada para Móvil y Desktop -->
    <div class="orders-toolbar-card">
      <!-- Fila 1: Buscador Integrado con Botón de Filtros Avanzados en una Sola Fila -->
      <div class="orders-search-integrated-row">
        <div class="search-box input-with-icon">
          <span class="input-icon">🔍</span>
          <input 
            type="text" 
            id="orderSearchInput" 
            data-key="order-search"
            class="form-input" 
            placeholder="Buscar por cliente, teléfono, @usuario, sabor..." 
            value="${escapeHtml(currentFilters.search)}"
            autocomplete="off"
          />
        </div>

        <!-- Botón Drawer / Bottom Sheet de Filtros Secundarios integrado en la misma fila -->
        <button type="button" class="filter-action-btn" id="btnOpenOrdersFilterSheet" title="Abrir filtros avanzados (fechas, repartidores, lotes)">
          <span>⚙️ Filtros</span>
          <span class="filter-badge-count" id="ordersFilterBadgeCount" style="display: none;">0</span>
        </button>
      </div>

      <!-- Fila 2: Tira de Chips Horizontales fluida sin márgenes muertos -->
      <div class="orders-chips-wrapper">
        <div class="horizontal-chip-scroll" id="ordersChipBar">
          <button class="filter-chip ${currentFilters.chip === 'ALL' ? 'active' : ''}" data-order-chip="ALL">
            📋 Todos
          </button>
          <button class="filter-chip ${currentFilters.chip === 'TO_DELIVER' ? 'active' : ''}" data-order-chip="TO_DELIVER" style="border-color: #38BDF8; color: #0284C7; font-weight: 700;">
            🛵 Por Entregar
          </button>
          <button class="filter-chip ${currentFilters.chip === 'IN_PROCESS' ? 'active' : ''}" data-order-chip="IN_PROCESS" style="border-color: #DDD6FE; color: var(--primary); font-weight: 700;">
            🟡 Encargos
          </button>
          <button class="filter-chip ${currentFilters.chip === 'DELIVERED_DEBT' ? 'active' : ''}" data-order-chip="DELIVERED_DEBT" style="border-color: #FECACA; color: #DC2626; font-weight: 700;">
            🚨 Con Deuda
          </button>
          <button class="filter-chip ${currentFilters.chip === 'PAID' ? 'active' : ''}" data-order-chip="PAID" style="border-color: #BBF7D0; color: #15803D; font-weight: 700;">
            🟢 Pagados
          </button>
          <button class="filter-chip ${currentFilters.chip === 'UPDATED_DESC' ? 'active' : ''}" data-order-chip="UPDATED_DESC" style="border-color: #99F6E4; color: #0F766E; font-weight: 700;">
            🔄 Recientes
          </button>
          <button class="filter-chip ${currentFilters.chip === 'TODAY' ? 'active' : ''}" data-order-chip="TODAY">
            📅 Hoy
          </button>
          <button class="filter-chip ${currentFilters.chip === 'TOMORROW' ? 'active' : ''}" data-order-chip="TOMORROW">
            📅 Mañana
          </button>
        </div>

        <!-- Banner de Filtros Secundarios Activos con Tags Removibles -->
        <div id="activeFilterTagsBanner" style="display: none; gap: 6px; flex-wrap: wrap; align-items: center; margin-top: 6px;"></div>
      </div>

      <!-- Fila 3: Controles Secundarios de Vista y Acciones -->
      <div class="orders-toolbar-secondary-row">
        <!-- Toggle de Vista: Lista vs Calendario Mensual -->
        <div class="orders-view-toggle">
          <button 
            type="button"
            class="btn ${currentFilters.viewMode === 'list' ? 'btn-primary' : 'btn-outline'}" 
            id="btnToggleListView" 
            title="Ver pedidos en lista"
          >
            📋 Lista
          </button>
          <button 
            type="button"
            class="btn ${currentFilters.viewMode === 'calendar' ? 'btn-primary' : 'btn-outline'}" 
            id="btnToggleCalendarView" 
            title="Ver calendario mensual"
          >
            📅 Calendario
          </button>
        </div>

        <div class="orders-secondary-actions-group">
          <button class="btn btn-outline" id="btnRescheduleOverdueOrders" title="Reprogramar pedidos atrasados de días anteriores a hoy">
            📅 Reprogramar
          </button>

          <button class="btn btn-accent orders-desktop-new-btn" id="btnOpenNewOrderModal">
            <span>+</span> Nuevo Pedido
          </button>
        </div>
      </div>
    </div>

    <!-- Contenedor del Calendario Mensual (si está activo) -->
    <div id="calendarViewSection" style="${currentFilters.viewMode === 'calendar' ? 'display: block;' : 'display: none;'}"></div>

    <!-- Banner informativo de fecha seleccionada -->
    <div id="activeDateBanner"></div>

    <!-- Lista de Pedidos (Único contenedor refrescado al buscar o filtrar para no destruir el input) -->
    <div id="ordersListContainer">
      <div style="text-align: center; padding: 30px; color: var(--text-muted);">
        Cargando pedidos... 🥛
      </div>
    </div>

    <!-- Bottom Sheet / Drawer de Filtros Avanzados para Móvil y Desktop -->
    <div class="bottom-sheet-overlay" id="ordersFilterSheetOverlay">
      <div class="bottom-sheet-card" id="ordersFilterSheetCard">
        <div class="bottom-sheet-header">
          <div class="bottom-sheet-title">⚙️ Filtros Avanzados de Pedidos</div>
          <button type="button" class="bottom-sheet-close" id="btnCloseOrdersFilterSheet" title="Cerrar filtros">✕</button>
        </div>
        <div class="bottom-sheet-body">
          <div class="form-group">
            <label class="form-label">📅 Fecha Específica de Entrega</label>
            <input type="date" id="sheetOrderSpecificDate" class="form-input" value="${currentFilters.specificDate || ''}" />
          </div>

          <div class="form-group">
            <label class="form-label">🛵 Repartidor / Modalidad</label>
            <select id="sheetOrderDriver" class="form-select" style="font-weight: 700;">
              <option value="ALL" ${currentFilters.driverFilter === 'ALL' ? 'selected' : ''}>🛵 Todos los Repartos</option>
              <option value="PROPIO" ${currentFilters.driverFilter === 'PROPIO' ? 'selected' : ''}>👤 Entrega Propia (Socios)</option>
              <option value="LOCAL" ${currentFilters.driverFilter === 'LOCAL' ? 'selected' : ''}>🏪 Recoge en Local</option>
              <option value="UNASSIGNED" ${currentFilters.driverFilter === 'UNASSIGNED' ? 'selected' : ''}>⚠️ Sin Repartidor Asignado</option>
              ${availableDrivers
                .map(
                  (d) => `
                <option value="DRIVER_${d.id}" ${currentFilters.driverFilter === `DRIVER_${d.id}` ? 'selected' : ''}>
                  🛵 Repartidor: ${escapeHtml(d.name)}
                </option>
              `
                )
                .join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">🍶 Lote de Producción</label>
            <select id="sheetOrderBatch" class="form-select" style="font-weight: 700;">
              <option value="ALL" ${currentFilters.batchId === 'ALL' ? 'selected' : ''}>🍶 Todos los Lotes</option>
              ${availableBatches
                .map(
                  (b) => `
                <option value="${b.id}" ${String(currentFilters.batchId) === String(b.id) ? 'selected' : ''}>
                  🍶 ${escapeHtml(b.batchCode)} - ${escapeHtml(b.flavor)} ${b.status === 'EN_PROCESO' ? '(En proceso)' : ''}
                </option>
              `
                )
                .join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">📦 Estado de Entrega</label>
            <select id="sheetOrderDelivery" class="form-select">
              <option value="ALL" ${currentFilters.deliveryStatus === 'ALL' ? 'selected' : ''}>Todas las entregas</option>
              <option value="PENDING" ${currentFilters.deliveryStatus === 'PENDING' ? 'selected' : ''}>🕒 Pendientes</option>
              <option value="PREPARING" ${currentFilters.deliveryStatus === 'PREPARING' ? 'selected' : ''}>🥣 En Preparación</option>
              <option value="READY_FOR_DISPATCH" ${currentFilters.deliveryStatus === 'READY_FOR_DISPATCH' ? 'selected' : ''}>📦 Listos para Despacho</option>
              <option value="IN_ROUTE" ${currentFilters.deliveryStatus === 'IN_ROUTE' ? 'selected' : ''}>🛵 En Ruta</option>
              <option value="DELIVERED" ${currentFilters.deliveryStatus === 'DELIVERED' ? 'selected' : ''}>✅ Entregados</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">💰 Estado de Pago</label>
            <select id="sheetOrderPayment" class="form-select">
              <option value="ALL" ${currentFilters.paymentStatus === 'ALL' ? 'selected' : ''}>Todos los pagos</option>
              <option value="PAID" ${currentFilters.paymentStatus === 'PAID' ? 'selected' : ''}>🟢 Totalmente Pagados</option>
              <option value="PARTIAL" ${currentFilters.paymentStatus === 'PARTIAL' ? 'selected' : ''}>🟡 Con Abono Parcial</option>
              <option value="PENDING" ${currentFilters.paymentStatus === 'PENDING' ? 'selected' : ''}>🔴 Pendientes de Pago</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">🎯 Criterio de Orden</label>
            <select id="sheetOrderSort" class="form-select">
              <option value="PRIORITY_DEBT" ${currentFilters.sortBy === 'PRIORITY_DEBT' ? 'selected' : ''}>🎯 Prioridad: Deudas de primero</option>
              <option value="UPDATED_DESC" ${currentFilters.sortBy === 'UPDATED_DESC' ? 'selected' : ''}>🔄 Últimos Actualizados (Recientes)</option>
              <option value="DATE_DESC" ${currentFilters.sortBy === 'DATE_DESC' ? 'selected' : ''}>📅 Fecha de Entrega (Más reciente)</option>
              <option value="DATE_ASC" ${currentFilters.sortBy === 'DATE_ASC' ? 'selected' : ''}>📅 Fecha de Entrega (Más antigua)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">📅 Historial por Mes</label>
            <select id="sheetOrderMonth" class="form-select">
              <option value="">Todos los meses</option>
              ${monthOptions
                .map((m) => `<option value="${m.val}" ${currentFilters.month === m.val ? 'selected' : ''}>${m.label}</option>`)
                .join('')}
            </select>
          </div>
        </div>
        <div class="bottom-sheet-footer">
          <button type="button" class="btn btn-outline" id="btnResetFilterSheet">🧹 Limpiar Filtros</button>
          <button type="button" class="btn btn-primary" id="btnApplyFilterSheet">Aplicar Filtros</button>
        </div>
      </div>
    </div>
  `;

  // Listeners de la barra de búsqueda universal con debounce de 300 ms (sin redibujar toolbar)
  const searchInput = container.querySelector('#orderSearchInput');
  let debounceTimeout;
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      ordersCurrentPage = 1;
      currentFilters.search = e.target.value.trim();
      loadOrdersList(container);
    }, 300);
  });

  // Listeners de chips horizontales rápidos
  container.querySelectorAll('[data-order-chip]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const chip = e.currentTarget.dataset.orderChip;
      currentFilters.chip = chip;
      ordersCurrentPage = 1;

      // Restablecer estados básicos
      currentFilters.debtCategory = 'ALL';
      currentFilters.deliveryStatus = 'ALL';
      currentFilters.dateRange = 'ALL';
      currentFilters.specificDate = '';

      if (chip === 'ALL') {
        currentFilters.sortBy = 'PRIORITY_DEBT';
      } else if (chip === 'TO_DELIVER') {
        currentFilters.deliveryStatus = 'TO_DELIVER';
      } else if (chip === 'IN_PROCESS') {
        currentFilters.debtCategory = 'IN_PROCESS';
      } else if (chip === 'DELIVERED_DEBT') {
        currentFilters.debtCategory = 'DELIVERED_DEBT';
      } else if (chip === 'PAID') {
        currentFilters.debtCategory = 'PAID';
      } else if (chip === 'UPDATED_DESC') {
        currentFilters.sortBy = 'UPDATED_DESC';
      } else if (chip === 'TODAY') {
        currentFilters.dateRange = 'TODAY';
      } else if (chip === 'TOMORROW') {
        currentFilters.dateRange = 'TOMORROW';
      }

      updateChipUi(container);
      renderActiveFilterTags(container);
      loadOrdersList(container);
    });
  });

  // Drawer / Bottom Sheet de Filtros Secundarios
  const filterSheetOverlay = container.querySelector('#ordersFilterSheetOverlay');
  const openSheet = () => {
    filterSheetOverlay?.classList.add('active');
    document.body.style.overflow = 'hidden';
  };
  const closeSheet = () => {
    filterSheetOverlay?.classList.remove('active');
    document.body.style.overflow = '';
  };

  container.querySelector('#btnOpenOrdersFilterSheet')?.addEventListener('click', openSheet);
  container.querySelector('#btnCloseOrdersFilterSheet')?.addEventListener('click', closeSheet);
  filterSheetOverlay?.addEventListener('click', (e) => {
    if (e.target === filterSheetOverlay) closeSheet();
  });

  // Aplicar filtros avanzados desde el bottom sheet
  container.querySelector('#btnApplyFilterSheet')?.addEventListener('click', () => {
    const sDate = container.querySelector('#sheetOrderSpecificDate')?.value || '';
    const driver = container.querySelector('#sheetOrderDriver')?.value || 'ALL';
    const batch = container.querySelector('#sheetOrderBatch')?.value || 'ALL';
    const delivery = container.querySelector('#sheetOrderDelivery')?.value || 'ALL';
    const payment = container.querySelector('#sheetOrderPayment')?.value || 'ALL';
    const sort = container.querySelector('#sheetOrderSort')?.value || 'PRIORITY_DEBT';
    const month = container.querySelector('#sheetOrderMonth')?.value || '';

    currentFilters.specificDate = sDate;
    if (sDate) {
      currentFilters.dateRange = 'CUSTOM';
      currentFilters.chip = '';
    }
    currentFilters.driverFilter = driver;
    currentFilters.batchId = batch;
    currentFilters.deliveryStatus = delivery;
    currentFilters.paymentStatus = payment;
    currentFilters.sortBy = sort;
    currentFilters.month = month;
    if (month) {
      currentFilters.chip = '';
    }

    ordersCurrentPage = 1;
    closeSheet();
    updateChipUi(container);
    renderActiveFilterTags(container);
    loadOrdersList(container);
  });

  // Limpiar filtros desde el bottom sheet
  container.querySelector('#btnResetFilterSheet')?.addEventListener('click', () => {
    currentFilters.specificDate = '';
    currentFilters.dateRange = 'ALL';
    currentFilters.driverFilter = 'ALL';
    currentFilters.batchId = 'ALL';
    currentFilters.deliveryStatus = 'ALL';
    currentFilters.paymentStatus = 'ALL';
    currentFilters.sortBy = 'PRIORITY_DEBT';
    currentFilters.month = '';
    currentFilters.chip = 'ALL';
    currentFilters.debtCategory = 'ALL';

    const sDateInput = container.querySelector('#sheetOrderSpecificDate');
    const driverSel = container.querySelector('#sheetOrderDriver');
    const batchSel = container.querySelector('#sheetOrderBatch');
    const delSel = container.querySelector('#sheetOrderDelivery');
    const paySel = container.querySelector('#sheetOrderPayment');
    const sortSel = container.querySelector('#sheetOrderSort');
    const monthSel = container.querySelector('#sheetOrderMonth');

    if (sDateInput) sDateInput.value = '';
    if (driverSel) driverSel.value = 'ALL';
    if (batchSel) batchSel.value = 'ALL';
    if (delSel) delSel.value = 'ALL';
    if (paySel) paySel.value = 'ALL';
    if (sortSel) sortSel.value = 'PRIORITY_DEBT';
    if (monthSel) monthSel.value = '';

    ordersCurrentPage = 1;
    closeSheet();
    updateChipUi(container);
    renderActiveFilterTags(container);
    loadOrdersList(container);
  });

  // Toggles de vista lista vs calendario
  container.querySelector('#btnToggleListView')?.addEventListener('click', () => {
    currentFilters.viewMode = 'list';
    const calSec = container.querySelector('#calendarViewSection');
    if (calSec) calSec.style.display = 'none';
    container.querySelector('#btnToggleListView')?.classList.add('btn-primary');
    container.querySelector('#btnToggleListView')?.classList.remove('btn-outline');
    container.querySelector('#btnToggleCalendarView')?.classList.add('btn-outline');
    container.querySelector('#btnToggleCalendarView')?.classList.remove('btn-primary');
    loadOrdersList(container);
  });

  container.querySelector('#btnToggleCalendarView')?.addEventListener('click', () => {
    currentFilters.viewMode = 'calendar';
    const calSec = container.querySelector('#calendarViewSection');
    if (calSec) calSec.style.display = 'block';
    container.querySelector('#btnToggleCalendarView')?.classList.add('btn-primary');
    container.querySelector('#btnToggleCalendarView')?.classList.remove('btn-outline');
    container.querySelector('#btnToggleListView')?.classList.add('btn-outline');
    container.querySelector('#btnToggleListView')?.classList.remove('btn-primary');
    loadOrdersList(container);
  });

  // Reprogramar atrasados a hoy
  container.querySelector('#btnRescheduleOverdueOrders')?.addEventListener('click', async () => {
    const todayStr = getTodayLocalDateStr();
    if (confirm(`¿Deseas reprogramar todos los pedidos atrasados de días anteriores para ser entregados hoy (${formatDate(todayStr)})?`)) {
      try {
        const res = await api.rescheduleOverdueOrders();
        if (res.updatedCount === 0) {
          showToast('No hay pedidos atrasados pendientes de reprogramar 🚀', 'info');
        } else {
          showToast(`¡Se reprogramaron ${res.updatedCount} pedidos atrasados para hoy con éxito! 🛵📅`, 'success');
        }
        await loadOrdersList(container);
      } catch (err) {
        showToast(err.message || 'Error al reprogramar pedidos', 'danger');
      }
    }
  });

  // Botón Nuevo Pedido
  container.querySelector('#btnOpenNewOrderModal')?.addEventListener('click', () => {
    openOrderModal();
  });

  renderActiveFilterTags(container);

  await loadOrdersList(container);
}

async function loadOrdersList(container) {
  const listContainer = container.querySelector('#ordersListContainer');
  const activeDateBanner = container.querySelector('#activeDateBanner');
  const calendarSection = container.querySelector('#calendarViewSection');
  if (!listContainer) return;

  try {
    const params = {
      search: currentFilters.search,
      debtCategory: currentFilters.debtCategory,
      paymentStatus: currentFilters.paymentStatus,
      deliveryStatus: currentFilters.deliveryStatus,
      sortBy: currentFilters.sortBy,
      month: currentFilters.month,
      batchId: currentFilters.batchId,
    };

    if (currentFilters.driverFilter === 'PROPIO') {
      params.deliveryType = 'PROPIO';
    } else if (currentFilters.driverFilter === 'LOCAL') {
      params.deliveryType = 'LOCAL';
    } else if (currentFilters.driverFilter === 'UNASSIGNED') {
      params.deliveryType = 'DOMICILIARIO';
      params.deliveryDriverId = 'null';
    } else if (currentFilters.driverFilter && currentFilters.driverFilter.startsWith('DRIVER_')) {
      params.deliveryDriverId = currentFilters.driverFilter.replace('DRIVER_', '');
    }

    if (currentFilters.specificDate) {
      params.date = currentFilters.specificDate;
    } else if (currentFilters.dateRange === 'TODAY') {
      params.date = getTodayLocalDateStr();
    } else if (currentFilters.dateRange === 'TOMORROW') {
      const tmrw = new Date();
      tmrw.setDate(tmrw.getDate() + 1);
      params.date = `${tmrw.getFullYear()}-${String(tmrw.getMonth() + 1).padStart(2, '0')}-${String(tmrw.getDate()).padStart(2, '0')}`;
    } else if (currentFilters.dateRange === 'WEEK') {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diff);
      params.startDate = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      params.endDate = `${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth() + 1).padStart(2, '0')}-${String(endOfWeek.getDate()).padStart(2, '0')}`;
    }

    const queryParams = {
      ...params,
      page: ordersCurrentPage,
      limit: 15,
      paginate: 'true',
    };

    const res = await api.getOrders(queryParams);
    let orders = [];
    let totalPages = 1;
    let totalItems = 0;
    let currentPage = ordersCurrentPage;

    if (res && res.items && res.pagination) {
      orders = res.items;
      totalPages = res.pagination.totalPages;
      totalItems = res.pagination.totalItems;
      currentPage = res.pagination.currentPage;
    } else if (Array.isArray(res)) {
      const pag = paginateArray(res, ordersCurrentPage, 15);
      orders = pag.pageItems;
      totalPages = pag.totalPages;
      totalItems = pag.totalItems;
      currentPage = pag.currentPage;
    }
    cachedOrders = orders || [];

    // Renderizar Calendario si la vista está activa
    if (currentFilters.viewMode === 'calendar' && calendarSection) {
      await renderDeliveryCalendarWidget(calendarSection, container);
    }

    // Renderizar Banner informativo si hay fecha activa
    if (activeDateBanner) {
      if (params.date) {
        const dateParts = params.date.split('-');
        const dObj = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
        const formattedTitle = new Intl.DateTimeFormat('es-CO', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(dObj);

        const totalLiters = orders.reduce((sum, o) => sum + (o.totalLiters || 0), 0);
        const totalCOP = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        activeDateBanner.innerHTML = `
          <div style="background: var(--primary-light); border: 1.5px solid var(--primary); padding: 12px 16px; border-radius: var(--radius-md); margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <div style="color: var(--primary); font-size: 1rem; font-weight: 800; text-transform: capitalize;">
                📅 Entregas Programadas: ${formattedTitle}
              </div>
              <div style="font-size: 0.84rem; color: var(--text-main); margin-top: 2px;">
                Mostrando: <strong>${totalItems || orders.length} pedido(s)</strong> • <strong>${totalLiters} Litros</strong> • Total: <strong>${formatCOP(totalCOP)}</strong>
              </div>
            </div>
            <button class="btn btn-outline btn-sm" id="btnResetDayFilter" style="background: var(--bg-card); font-size: 0.8rem; font-weight: 700;">
              Ver Todos los Pedidos
            </button>
          </div>
        `;

        activeDateBanner.querySelector('#btnResetDayFilter')?.addEventListener('click', () => {
          currentFilters.specificDate = '';
          currentFilters.dateRange = 'ALL';
          currentFilters.chip = 'ALL';
          updateChipUi(container);
          renderActiveFilterTags(container);
          loadOrdersList(container);
        });
      } else {
        activeDateBanner.innerHTML = '';
      }
    }

    if (!orders || orders.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-title">No se encontraron pedidos</div>
          <div class="empty-state-text">No hay pedidos registrados con los filtros de búsqueda o categoría aplicados.</div>
          <button class="btn btn-accent" id="btnNewOrderEmpty">+ Crear Nuevo Pedido</button>
        </div>
      `;
      listContainer.querySelector('#btnNewOrderEmpty')?.addEventListener('click', () => openOrderModal());
      return;
    }

    listContainer.innerHTML = `
      <div class="orders-grid">
        ${orders.map((o) => createOrderCardHtml(o)).join('')}
      </div>
      ${renderPaginationHtml({
        currentPage: ordersCurrentPage,
        totalPages,
        totalItems,
        pageSize: 15,
        itemName: 'pedidos',
        paginationId: 'ordersPagination',
      })}
    `;

    // Asignar eventos a las tarjetas de pedidos
    attachOrderCardEvents(listContainer);
    attachPaginationEvents(
      listContainer,
      'ordersPagination',
      (newPage) => {
        ordersCurrentPage = newPage;
        loadOrdersList(container);
      },
      listContainer
    );
  } catch (error) {
    console.error('Error loading orders:', error);
    listContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-title">Error al cargar pedidos</div>
        <div class="empty-state-text">${error.message || 'Inténtalo de nuevo'}</div>
      </div>
    `;
  }
}

// Widget de Calendario Mensual Interactivo de Entregas
async function renderDeliveryCalendarWidget(calendarContainer, mainContainer) {
  const year = calendarState.year;
  const month = calendarState.month;
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  // Obtener pedidos del mes
  let monthOrders = [];
  try {
    monthOrders = await api.getOrders({ month: monthStr });
  } catch (e) {
    console.error('Error loading month orders for calendar:', e);
  }

  // Agrupar pedidos por fecha (deliveryDate o en su defecto orderDate)
  const ordersByDate = {};
  monthOrders.forEach((o) => {
    const rawDate = o.deliveryDate || o.orderDate;
    if (rawDate) {
      const dateKey = String(rawDate).split('T')[0];
      if (!ordersByDate[dateKey]) {
        ordersByDate[dateKey] = {
          count: 0,
          liters: 0,
          pending: 0,
          delivered: 0,
        };
      }
      ordersByDate[dateKey].count++;
      ordersByDate[dateKey].liters += o.totalLiters || 0;
      if (o.deliveryStatus === 'DELIVERED') {
        ordersByDate[dateKey].delivered++;
      } else {
        ordersByDate[dateKey].pending++;
      }
    }
  });

  const monthLabel = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(new Date(year, month, 1));
  const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Dom, 1 = Lun...
  const startingDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Ajustar a Lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const todayStr = getTodayLocalDateStr();

  let daysHtml = '';
  // Celdas vacías antes del primer día
  for (let i = 0; i < startingDay; i++) {
    daysHtml += `<div class="calendar-day-cell other-month"></div>`;
  }

  // Celdas de cada día del mes
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const info = ordersByDate[dayStr];
    const isToday = dayStr === todayStr;
    const isSelected = currentFilters.specificDate === dayStr;

    let badgeHtml = '';
    if (info) {
      const badgeClass = info.pending > 0 ? 'pending' : 'delivered';
      badgeHtml = `
        <div class="calendar-day-badge ${badgeClass}" title="${info.count} pedido(s) programados para hoy">
          🛵 ${info.count} ped (${info.liters}L)
        </div>
      `;
    }

    daysHtml += `
      <div class="calendar-day-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" data-day="${dayStr}">
        <div class="calendar-day-num">${d}</div>
        ${badgeHtml}
      </div>
    `;
  }

  calendarContainer.innerHTML = `
    <div class="delivery-calendar-container">
      <div class="calendar-header">
        <div class="calendar-month-title">
          <span>📅 Calendario de Entregas:</span>
          <strong>${capitalizedMonth}</strong>
        </div>
        <div style="display: flex; gap: 6px; align-items: center;">
          <button class="btn btn-outline btn-sm" id="btnCalPrevMonth">◀ Mes Anterior</button>
          <button class="btn btn-outline btn-sm" id="btnCalToday">Hoy</button>
          <button class="btn btn-outline btn-sm" id="btnCalNextMonth">Siguiente Mes ▶</button>
        </div>
      </div>

      <div class="calendar-grid">
        <div class="calendar-weekday">Lun</div>
        <div class="calendar-weekday">Mar</div>
        <div class="calendar-weekday">Mié</div>
        <div class="calendar-weekday">Jue</div>
        <div class="calendar-weekday">Vie</div>
        <div class="calendar-weekday">Sáb</div>
        <div class="calendar-weekday">Dom</div>
        ${daysHtml}
      </div>
    </div>
  `;

  calendarContainer.querySelector('#btnCalPrevMonth')?.addEventListener('click', () => {
    calendarState.month--;
    if (calendarState.month < 0) {
      calendarState.month = 11;
      calendarState.year--;
    }
    renderDeliveryCalendarWidget(calendarContainer, mainContainer);
  });

  calendarContainer.querySelector('#btnCalNextMonth')?.addEventListener('click', () => {
    calendarState.month++;
    if (calendarState.month > 11) {
      calendarState.month = 0;
      calendarState.year++;
    }
    renderDeliveryCalendarWidget(calendarContainer, mainContainer);
  });

  calendarContainer.querySelector('#btnCalToday')?.addEventListener('click', () => {
    const n = new Date();
    calendarState.year = n.getFullYear();
    calendarState.month = n.getMonth();
    currentFilters.specificDate = todayStr;
    currentFilters.dateRange = 'CUSTOM';
    currentFilters.month = '';
    currentFilters.chip = 'TODAY';
    updateChipUi(mainContainer);
    renderActiveFilterTags(mainContainer);
    loadOrdersList(mainContainer);
  });

  calendarContainer.querySelectorAll('.calendar-day-cell[data-day]').forEach((cell) => {
    cell.addEventListener('click', () => {
      const selectedDay = cell.dataset.day;
      currentFilters.specificDate = selectedDay;
      currentFilters.dateRange = 'CUSTOM';
      currentFilters.month = '';
      currentFilters.chip = '';
      updateChipUi(mainContainer);
      renderActiveFilterTags(mainContainer);
      loadOrdersList(mainContainer);
    });
  });
}

const WA_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="display: inline-block; vertical-align: -2px; margin-right: 4px;"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>`;

function createOrderCardHtml(o) {
  const isDeliveredDebt = o.deliveryStatus === 'DELIVERED' && (o.pendingAmount || 0) > 0;
  const isPaidNotDelivered = o.deliveryStatus !== 'DELIVERED' && (o.paymentStatus === 'PAID' || (o.pendingAmount || 0) <= 0);
  const isInProcessPending = o.deliveryStatus !== 'DELIVERED' && (o.pendingAmount || 0) > 0;

  let cardBorder = '';
  let payBadge = '';
  let waBtnLabel = 'WhatsApp';

  if (isDeliveredDebt) {
    cardBorder = 'border: 1.5px solid #F87171; background: #FFFDFD; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.08);';
    payBadge = `<span class="badge" style="background: #FEE2E2; color: #DC2626; font-weight: 800; font-size: 0.78rem; border: 1px solid #FCA5A5;">🚨 Deuda: ${formatCOP(o.pendingAmount)}</span>`;
    waBtnLabel = 'Recordar Pago';
  } else if (isPaidNotDelivered) {
    cardBorder = 'border: 1.5px solid #34D399; background: #F0FDF4; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.08);';
    payBadge = `<span class="badge" style="background: #DCFCE7; color: #059669; font-weight: 800; font-size: 0.78rem; border: 1px solid #86EFAC;">🟢🥣 Pagado • Por Entregar 🛵</span>`;
    waBtnLabel = 'Agradecer Pago';
  } else if (isInProcessPending) {
    cardBorder = 'border: 1.5px solid #DDD6FE; background: #FAF7FC; box-shadow: 0 4px 14px rgba(109, 40, 217, 0.05);';
    if (o.paidAmount > 0) {
      payBadge = `<span class="badge badge-partial">🟡 Encargo (Abonó ${formatCOP(o.paidAmount)})</span>`;
    } else {
      payBadge = `<span class="badge" style="background: #EDE9FE; color: var(--primary); font-weight: 800; font-size: 0.78rem; border: 1px solid #DDD6FE;">🥣 Encargo • Por Entregar</span>`;
    }
    waBtnLabel = 'Info Pedido';
  } else {
    payBadge = '<span class="badge badge-paid" style="border: 1px solid #86EFAC;">🟢 Totalmente Pagado</span>';
  }

  // Insignia scannable de Estado de Entrega
  let deliveryBadgePill = '';
  if (o.deliveryStatus === 'DELIVERED') {
    deliveryBadgePill = '<span class="badge" style="background: #DCFCE7; color: #15803D; font-weight: 800; font-size: 0.76rem; border: 1px solid #86EFAC;">✅ Entregado</span>';
  } else if (o.deliveryStatus === 'IN_ROUTE') {
    deliveryBadgePill = '<span class="badge" style="background: #E0F2FE; color: #0369A1; font-weight: 800; font-size: 0.76rem; border: 1px solid #7DD3FC;">🛵 En Camino</span>';
  } else if (o.deliveryStatus === 'READY_FOR_DISPATCH') {
    deliveryBadgePill = '<span class="badge" style="background: #FEF3C7; color: #92400E; font-weight: 800; font-size: 0.76rem; border: 1px solid #FCD34D;">📦 Listo Despacho</span>';
  } else if (o.deliveryStatus === 'PREPARING') {
    deliveryBadgePill = '<span class="badge" style="background: #FAF5FF; color: #7E22CE; font-weight: 800; font-size: 0.76rem; border: 1px solid #DDD6FE;">🥣 En Preparación</span>';
  } else {
    deliveryBadgePill = '<span class="badge" style="background: #F1F5F9; color: #475569; font-weight: 800; font-size: 0.76rem; border: 1px solid #CBD5E1;">🕒 Por Entregar</span>';
  }

  // Teléfono o Usuario de WhatsApp y botón de llamada directa
  const rawPhone = o.customer.phone || '';
  const phoneDigits = rawPhone.replace(/\D/g, '');
  const hasPhoneDigits = phoneDigits.length >= 7;
  const isUsernameOnly = rawPhone.startsWith('@') || (!hasPhoneDigits && /[a-zA-Z]/.test(rawPhone));

  // Renderizar detalle de ítems múltiples si existen
  let itemsHtml = '';
  if (o.items && o.items.length > 0) {
    const consolidatedMap = new Map();
    for (const i of o.items) {
      const batchTag = i.batch ? `${i.batch.batchCode}` : (i.batchId ? `LOT-${i.batchId}` : '');
      const key = `${i.bottleSize}_${i.flavor}_${i.unitPrice}_${batchTag}`;
      if (consolidatedMap.has(key)) {
        const existing = consolidatedMap.get(key);
        existing.quantity += (Number(i.quantity) || 1);
        existing.totalPrice += (Number(i.totalPrice) || 0);
      } else {
        consolidatedMap.set(key, {
          ...i,
          batchTag,
          quantity: Number(i.quantity) || 1,
          totalPrice: Number(i.totalPrice) || (i.quantity * i.unitPrice),
        });
      }
    }
    const displayItems = Array.from(consolidatedMap.values());

    itemsHtml = displayItems
      .map(
        (i) => `
        <div class="order-item-row">
          <span>🥛 <strong>${i.quantity}x</strong> Botella ${i.bottleSize} (${escapeHtml(i.flavor)}) ${i.batchTag ? `<span class="badge" style="font-size: 0.72rem; background: #FAF5FF; color: var(--primary); border: 1px solid #DDD6FE; font-weight: 800; padding: 1px 5px; margin-left: 4px;">🍶 ${i.batchTag}</span>` : ''} ${i.unitPrice ? `<span style="font-size: 0.75rem; color: #0284C7; font-weight: 700; background: #E0F2FE; padding: 1px 5px; border-radius: 4px; margin-left: 4px;">@ ${formatCOP(i.unitPrice)}</span>` : ''}</span>
          <strong style="color: var(--primary); font-size: 0.88rem;">${formatCOP(i.totalPrice)}</strong>
        </div>
      `
      )
      .join('');
  } else {
    itemsHtml = `
      <div class="order-item-row">
        <span>🥛 <strong>${o.totalLiters}L</strong> • Envase ${o.bottleSize} (${escapeHtml(o.flavor || 'Natural')})</span>
        <strong style="color: var(--primary); font-size: 0.88rem;">${formatCOP(o.totalAmount)}</strong>
      </div>
    `;
  }

  // Insignia de modalidad de entrega y repartidor
  let deliveryBadge = '';
  if (o.deliveryType === 'LOCAL') {
    deliveryBadge = `<span class="badge" style="background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; font-weight: 800; font-size: 0.73rem; padding: 2px 6px;">🏪 Recoge en Local</span>`;
  } else if (o.deliveryType === 'DOMICILIARIO') {
    if (o.deliveryDriverName) {
      deliveryBadge = `<span class="badge" style="background: #E0F2FE; color: #0369A1; border: 1px solid #BAE6FD; font-weight: 800; font-size: 0.73rem; padding: 2px 6px;">🛵 Repartidor: ${escapeHtml(o.deliveryDriverName)}</span>`;
    } else {
      deliveryBadge = `<span class="badge" style="background: #FEE2E2; color: #DC2626; border: 1px solid #FECACA; font-weight: 800; font-size: 0.73rem; padding: 2px 6px;">⚠️ Sin Repartidor</span>`;
    }
  } else {
    deliveryBadge = `<span class="badge" style="background: #EDE9FE; color: #6D28D9; border: 1px solid #DDD6FE; font-weight: 800; font-size: 0.73rem; padding: 2px 6px;">👤 Entrega Propia (Socios)</span>`;
  }

  let deliveryFeeBadge = '';
  if (o.deliveryFee && Number(o.deliveryFee) > 0) {
    deliveryFeeBadge = `<span class="badge" style="background: #E0F2FE; color: #0369A1; border: 1px solid #BAE6FD; font-weight: 800; font-size: 0.73rem; padding: 2px 6px;">🛵 Domicilio: ${formatCOP(o.deliveryFee)}</span>`;
  }

  let discountBadge = '';
  if (o.discount && Number(o.discount) > 0) {
    discountBadge = `<span class="badge" style="background: #FEE2E2; color: #DC2626; border: 1px solid #FECACA; font-weight: 800; font-size: 0.73rem; padding: 2px 6px;">🏷️ Descuento: -${formatCOP(o.discount)}</span>`;
  }

  // Insignia de Lote(s) de producción o Preventa
  const distinctBatchCodes = Array.from(new Set(
    (o.items || [])
      .map((it) => it.batch ? `${it.batch.batchCode}` : (it.batchId ? `LOT-${it.batchId}` : null))
      .filter(Boolean)
  ));

  let batchBadgeHtml = '';
  if (distinctBatchCodes.length > 1) {
    batchBadgeHtml = `
      <span class="badge" style="background: #FDF4FF; color: #86198F; border: 1px solid #F5D0FE; font-size: 0.73rem; font-weight: 800; padding: 2px 6px;">
        🔀 Multi-Lote (${distinctBatchCodes.join(', ')})
      </span>
    `;
  } else if (o.batch || distinctBatchCodes.length === 1) {
    const code = o.batch ? o.batch.batchCode : distinctBatchCodes[0];
    const flv = o.batch?.flavor ? ` (${o.batch.flavor})` : '';
    batchBadgeHtml = `
      <span class="badge" style="background: #FAF5FF; color: var(--primary); border: 1px solid #DDD6FE; font-size: 0.73rem; font-weight: 800; padding: 2px 6px;">
        🍶 Lote: ${code}${flv}
      </span>
    `;
  } else {
    batchBadgeHtml = `
      <span class="badge" style="background: #FFFBEB; color: #92400E; border: 1px solid #FCD34D; font-size: 0.73rem; font-weight: 800; padding: 2px 6px;">
        🥣 Encargo Preventa (Sin lote aún)
      </span>
    `;
  }

  // Botón rápido de 1 toque de cambio de estado en ruta para repartidores
  let quickStatusBtnHtml = '';
  if (o.deliveryStatus === 'IN_ROUTE') {
    quickStatusBtnHtml = `
      <button type="button" class="btn-touch-action btn-touch-delivered btn-quick-status" data-id="${o.id}" data-target-status="DELIVERED" title="Marcar como entregado con un solo toque">
        ✅ Entregar
      </button>
    `;
  } else if (o.deliveryStatus !== 'DELIVERED') {
    quickStatusBtnHtml = `
      <button type="button" class="btn-touch-action btn-touch-route btn-quick-status" data-id="${o.id}" data-target-status="IN_ROUTE" title="Marcar en camino de reparto con un solo toque">
        🛵 En Camino
      </button>
    `;
  }

  return `
    <div class="order-card" data-id="${o.id}" style="${cardBorder}">
      <!-- Encabezado Claro: Consecutivo, Estados de Entrega y Pago -->
      <div class="order-card-header">
        <div class="order-header-top">
          <div class="order-consecutive-tag">
            🥛 ${o.orderNumber}
          </div>
          <div class="order-status-pills">
            ${deliveryBadgePill}
            ${payBadge}
          </div>
        </div>
        <div class="order-date-row">
          <span>📅 Pedido: <strong>${formatDate(o.orderDate)}</strong></span>
          ${o.deliveryDate ? `<span style="color: var(--primary); font-weight: 800;">🛵 Entrega: ${formatDate(o.deliveryDate)}</span>` : ''}
          ${o.updatedAt ? `<span style="color: #0f766e; font-size: 0.72rem; font-weight: 700; background: #f0fdfa; padding: 1px 5px; border-radius: 4px; border: 1px solid #ccfbf1;" title="Última modificación">🔄 ${formatDateTime(o.updatedAt)}</span>` : ''}
        </div>
      </div>

      <!-- Datos Clave del Cliente a Simple Vista -->
      <div class="order-customer-box">
        <div class="order-customer-title-row">
          <div class="order-customer-name">${escapeHtml(o.customer.fullName)}</div>
          ${hasPhoneDigits ? `<a href="tel:${phoneDigits}" class="btn-touch-action btn-touch-call" style="min-height: 36px; padding: 4px 10px; font-size: 0.8rem;" title="Llamar a ${escapeHtml(o.customer.fullName)}">📞 Llamar</a>` : ''}
        </div>

        <div class="order-customer-contact">
          <span>${isUsernameOnly ? '💬' : '📞'}</span> 
          <span>${isUsernameOnly && !rawPhone.startsWith('@') ? '@' + rawPhone : (rawPhone || 'Sin teléfono')}</span>
        </div>

        <div class="order-address-box">
          <span class="order-address-icon">📍</span>
          <div>${escapeHtml(o.deliveryAddress || o.customer.address || 'Fonseca, La Guajira')}</div>
        </div>

        <div class="order-metadata-pills">
          ${batchBadgeHtml}
          ${deliveryBadge}
          ${deliveryFeeBadge}
          ${discountBadge}
        </div>
      </div>

      <!-- Desglose Compacto de Productos -->
      <div class="order-items-compact">
        <div style="font-size: 0.74rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 2px;">
          Productos (${o.totalLiters}L total):
        </div>
        ${itemsHtml}
      </div>

      <!-- Resumen Financiero Claro -->
      <div class="order-finance-box">
        <div>
          <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Total:</span>
          <div class="order-total-price">${formatCOP(o.totalAmount)}</div>
          ${o.deliveryFee && Number(o.deliveryFee) > 0 ? `<div style="font-size: 0.72rem; color: #0284C7; font-weight: 700;">Incluye ${formatCOP(o.deliveryFee)} de domicilio</div>` : ''}
          ${o.discount && Number(o.discount) > 0 ? `<div style="font-size: 0.72rem; color: #DC2626; font-weight: 700;">Descuento: -${formatCOP(o.discount)}</div>` : ''}
        </div>
        <div class="order-debt-info">
          ${
            o.pendingAmount > 0
              ? `<span style="font-size: 0.75rem; color: ${isDeliveredDebt ? '#DC2626' : 'var(--primary)'}; font-weight: 800;">${isDeliveredDebt ? '🚨 Deuda Pendiente:' : '🥣 Saldo Pendiente:'}</span>
                 <div class="order-debt-amount" style="color: ${isDeliveredDebt ? '#DC2626' : 'var(--primary)'};">${formatCOP(o.pendingAmount)}</div>`
              : `<span style="font-size: 0.8rem; color: var(--success); font-weight: 800;">¡Paz y Salvo! ✨</span>`
          }
        </div>
      </div>

      ${
        o.notes && o.notes.trim()
          ? `
        <div style="background: var(--bg-app); border-left: 3px solid var(--accent); padding: 6px 10px; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; font-size: 0.82rem; color: var(--text-main);">
          <strong style="color: var(--accent);">📝 Nota:</strong> ${escapeHtml(o.notes.trim())}
        </div>
      `
          : ''
      }

      <!-- Acciones Primarias Táctiles (Hit Target >= 44px) -->
      <div class="order-primary-actions">
        ${
          isPaidNotDelivered
            ? `<button type="button" class="btn-touch-action btn-touch-wa btn-whatsapp-action" data-id="${o.id}" data-type="THANK_PAYMENT" title="Agradecer pago por WhatsApp">
                 ${WA_ICON_SVG} <span>Agradecer Pago</span>
               </button>`
            : `<button type="button" class="btn-touch-action btn-touch-wa btn-whatsapp-action" data-id="${o.id}" title="${escapeHtml(waBtnLabel)}">
                 ${WA_ICON_SVG} <span>${escapeHtml(waBtnLabel)}</span>
               </button>`
        }

        ${quickStatusBtnHtml}

        ${
          o.pendingAmount > 0
            ? `<button type="button" class="btn-touch-action btn-touch-pay btn-payment-action" data-id="${o.id}" data-total="${o.totalAmount}" data-paid="${o.paidAmount}" data-pending="${o.pendingAmount}" title="${isDeliveredDebt ? 'Cobrar saldo de pedido entregado' : 'Registrar abono a encargo'}">
                 💵 ${isDeliveredDebt ? 'Cobrar' : 'Abonar'}
               </button>`
            : ''
        }
      </div>

      <!-- Acciones Secundarias Agrupadas (Layout Equilibrado) -->
      <div class="order-secondary-actions">
        <div class="order-status-change-group">
          <span class="order-status-label">Estado:</span>
          <select class="form-select select-delivery-status" data-id="${o.id}" aria-label="Cambiar estado de entrega">
            <option value="PENDING" ${o.deliveryStatus === 'PENDING' ? 'selected' : ''}>🕒 Por Entregar</option>
            <option value="PREPARING" ${o.deliveryStatus === 'PREPARING' ? 'selected' : ''}>🥣 En Preparación</option>
            <option value="READY_FOR_DISPATCH" ${o.deliveryStatus === 'READY_FOR_DISPATCH' ? 'selected' : ''}>📦 Listo Despacho</option>
            <option value="IN_ROUTE" ${o.deliveryStatus === 'IN_ROUTE' ? 'selected' : ''}>🛵 En Camino</option>
            <option value="DELIVERED" ${o.deliveryStatus === 'DELIVERED' ? 'selected' : ''}>✅ Entregado</option>
          </select>
        </div>

        <div class="order-secondary-buttons">
          <button type="button" class="btn btn-outline btn-secondary-action btn-assign-driver-action" data-id="${o.id}" title="Asignar repartidor o cambiar modo de entrega" style="color: #0284C7; border-color: #BAE6FD;">
            🛵 Reparto
          </button>
          <button type="button" class="btn btn-outline btn-secondary-action btn-edit-order" data-id="${o.id}" title="Editar pedido">
            ✏️ Editar
          </button>
          <button type="button" class="btn btn-outline btn-secondary-action btn-delete-order" data-id="${o.id}" title="Eliminar pedido" style="color: var(--danger);">
            🗑️ Eliminar
          </button>
        </div>
      </div>
    </div>
  `;
}

function attachOrderCardEvents(container) {
  // Acción rápida de un solo toque para cambiar estado a En Ruta o Entregado
  container.querySelectorAll('.btn-quick-status').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      const targetStatus = e.currentTarget.dataset.targetStatus;
      try {
        btn.disabled = true;
        await api.updateOrder(id, { deliveryStatus: targetStatus });
        const msg = targetStatus === 'DELIVERED'
          ? '¡Pedido marcado como Entregado! ✅'
          : '¡Pedido marcado En Camino a reparto! 🛵💨';
        showToast(msg);
        const mainContainer = document.getElementById('contentContainer');
        if (mainContainer) {
          await loadOrdersList(mainContainer);
        }
      } catch (err) {
        showToast('Error al actualizar estado', 'danger');
        btn.disabled = false;
      }
    });
  });

  // WhatsApp Direct Click (Enrutamiento Inteligente por Rol: CRM oficial o WhatsApp Personal)
  container.querySelectorAll('.btn-whatsapp-action').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      const type = e.currentTarget.dataset.type || '';
      try {
        const res = await api.getWhatsAppLink(id, type);
        if (res) {
          await dispatchSmartWhatsApp({
            phone: res.phone,
            text: res.rawMessage,
            contactName: res.customerName,
            customerId: res.customerId,
            fallbackUrl: res.whatsappUrl,
            successToast: '✅ Notificación enviada por WhatsApp oficial',
          });
        }
      } catch (err) {
        showToast('Error al enviar mensaje de WhatsApp', 'danger');
      }
    });
  });

  // Asignar Repartidor / Cambiar Modalidad de Entrega Rápido
  container.querySelectorAll('.btn-assign-driver-action').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = Number(e.currentTarget.dataset.id);
      const order = cachedOrders.find((o) => o.id === id);
      if (order) {
        openAssignDriverModal(order, availableDrivers);
      }
    });
  });

  // Cambio de estado de entrega
  container.querySelectorAll('.select-delivery-status').forEach((select) => {
    select.addEventListener('change', async (e) => {
      const id = e.target.dataset.id;
      const deliveryStatus = e.target.value;
      try {
        await api.updateOrder(id, { deliveryStatus });
        let statusMsg = 'Estado de entrega actualizado con éxito ✅';
        if (deliveryStatus === 'PENDING') {
          statusMsg = '¡Pedido regresado a Por Entregar (Pendiente)! 🕒';
        } else if (deliveryStatus === 'PREPARING') {
          statusMsg = '¡Pedido marcado En Preparación! 🥣';
        } else if (deliveryStatus === 'READY_FOR_DISPATCH') {
          statusMsg = '¡Pedido marcado como Listo para Despacho! 📦';
        } else if (deliveryStatus === 'IN_ROUTE') {
          statusMsg = '¡Pedido marcado En Camino a reparto! 🛵💨';
        } else if (deliveryStatus === 'DELIVERED') {
          statusMsg = '¡Pedido marcado como Entregado! ✅';
        }
        showToast(statusMsg);
        const mainContainer = document.getElementById('contentContainer');
        if (mainContainer) {
          await loadOrdersList(mainContainer);
        }
      } catch (err) {
        showToast('Error al actualizar estado', 'danger');
      }
    });
  });

  // Modal de Abono / Pago rápido
  container.querySelectorAll('.btn-payment-action').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const { id, total, paid, pending } = e.currentTarget.dataset;
      openPaymentModal(id, Number(total), Number(paid), Number(pending));
    });
  });

  // Editar Pedido
  container.querySelectorAll('.btn-edit-order').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = Number(e.currentTarget.dataset.id);
      const order = cachedOrders.find((o) => o.id === id);
      if (order) {
        openOrderModal(order);
      }
    });
  });

  // Eliminar pedido
  container.querySelectorAll('.btn-delete-order').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      if (confirm('¿Estás seguro de eliminar este pedido?')) {
        try {
          await api.deleteOrder(id);
          showToast('Pedido eliminado correctamente');
          const contentContainer = document.getElementById('contentContainer');
          if (contentContainer?.querySelector('#ordersListContainer')) {
            loadOrdersList(contentContainer);
          } else if (contentContainer) {
            renderOrders(contentContainer);
          }
        } catch (err) {
          showToast('Error al eliminar pedido', 'danger');
        }
      }
    });
  });
}

// Modal de Nuevo / Editar Pedido con Múltiples Productos
export async function openOrderModal(orderData = null) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  const isEditing = orderData && !orderData.isNewForCustomer;
  const modalTitle = isEditing ? `✏️ Editar Pedido (${orderData.orderNumber})` : '🥛 Nuevo Pedido - YogurArte';
  const submitButtonText = isEditing ? 'Guardar Cambios del Pedido' : 'Guardar y Confirmar Pedido';

  // Datos del cliente
  const defaultName = orderData?.customer?.fullName || '';
  const defaultPhone = orderData?.customer?.phone || '';
  const defaultAddress = orderData?.deliveryAddress || orderData?.customer?.address || '';
  const defaultDate = isEditing && orderData.orderDate
    ? String(orderData.orderDate).split('T')[0]
    : getTodayLocalDateStr();
  const defaultDeliveryDate = isEditing && orderData.deliveryDate
    ? String(orderData.deliveryDate).split('T')[0]
    : '';
  const defaultNotes = isEditing ? (orderData.notes || '') : '';
  const defaultDeliveryStatus = isEditing ? orderData.deliveryStatus : 'PENDING';
  const defaultPaid = isEditing ? orderData.paidAmount : 0;
  const defaultPaymentMethod = isEditing ? (orderData.paymentMethod || 'EFECTIVO') : 'EFECTIVO';
  let selectedCustomerId = orderData?.customerId || null;

  // Cargar clientes existentes en modo ultraligero para autocomplete
  let existingCustomers = [];
  try {
    existingCustomers = await api.getCustomers({ lite: 'true' });
  } catch (e) {
    console.error('Error fetching customers for modal:', e);
  }

  // Cargar lotes de producción y repartidores disponibles en modo ligero
  let availableBatches = [];
  let modalDrivers = [];
  try {
    const [fetchedBatches, fetchedUsers] = await Promise.all([
      api.getBatches({ includeInactive: 'false', lite: 'true' }),
      api.getUsers(),
    ]);
    availableBatches = (fetchedBatches || []).filter((b) => b.status !== 'DESCARTADO');
    modalDrivers = (fetchedUsers || []).filter((u) => u.role === 'DOMICILIARIO' && u.isActive !== false);
  } catch (e) {
    console.error('Error fetching batches or drivers for modal:', e);
  }

  // Asegurar que si estamos editando, los lotes de los ítems existentes estén presentes en la lista
  const allBatchesForModal = [...availableBatches];
  if (isEditing) {
    if (orderData.batch && !allBatchesForModal.some((b) => b.id === orderData.batch.id)) {
      allBatchesForModal.push(orderData.batch);
    }
    (orderData.items || []).forEach((it) => {
      if (it.batch && !allBatchesForModal.some((b) => b.id === it.batch.id)) {
        allBatchesForModal.push(it.batch);
      }
    });
  }

  const defaultDeliveryType = isEditing ? (orderData.deliveryType || 'PROPIO') : 'PROPIO';
  const defaultDeliveryDriverId = isEditing ? (orderData.deliveryDriverId || '') : '';
  const defaultDeliveryFee = isEditing ? (orderData.deliveryFee || 0) : 0;

  // Lista inicial de ítems
  let initialItems = [];

  if (isEditing && orderData.items && orderData.items.length > 0) {
    initialItems = orderData.items.map((it) => {
      const bId = it.batchId !== undefined && it.batchId !== null ? it.batchId : (orderData.batchId || null);
      const matchingBatch = allBatchesForModal.find((b) => b.id === Number(bId));
      const defPrice = it.bottleSize === '2L' ? (matchingBatch?.price2L || 24000) : (matchingBatch?.price1L || 12000);
      const itPrice = it.unitPrice !== undefined && !isNaN(Number(it.unitPrice)) && Number(it.unitPrice) >= 0
        ? Number(it.unitPrice)
        : defPrice;
      return {
        batchId: bId,
        bottleSize: it.bottleSize || '1L',
        flavor: it.flavor || (matchingBatch?.flavor || orderData.flavor || 'Natural'),
        quantity: Number(it.quantity) || 1,
        unitPrice: itPrice,
      };
    });
  } else if (isEditing) {
    const bId = orderData.batchId || null;
    const matchingBatch = allBatchesForModal.find((b) => b.id === Number(bId));
    const defPrice = orderData.bottleSize === '2L' ? (matchingBatch?.price2L || 24000) : (matchingBatch?.price1L || 12000);
    initialItems = [
      {
        batchId: bId,
        bottleSize: orderData.bottleSize || '1L',
        flavor: orderData.flavor || (matchingBatch?.flavor || 'Natural'),
        quantity: orderData.quantityBottles || 1,
        unitPrice: orderData.unitPrice || defPrice,
      },
    ];
  } else {
    // Para pedido nuevo: auto-seleccionar el primer lote activo con litros disponibles si existe
    const firstAvailable = allBatchesForModal.find(
      (b) => b.status !== 'AGOTADO' && b.status !== 'DESCARTADO' && (b.remainingAvailableLiters === undefined || b.remainingAvailableLiters > 0)
    );
    initialItems = [
      {
        batchId: firstAvailable ? firstAvailable.id : null,
        bottleSize: '1L',
        flavor: firstAvailable ? firstAvailable.flavor : 'Natural Artesanal',
        quantity: 1,
        unitPrice: firstAvailable ? (firstAvailable.price1L || 12000) : 12000,
      },
    ];
  }

  modalOverlay.innerHTML = `
    <div class="modal-overlay active" id="orderModal">
      <div class="modal-card" style="max-width: 620px;">
        <div class="modal-header">
          <h3 class="modal-title">${modalTitle}</h3>
          <button class="modal-close-btn" id="btnCloseOrderModal">✕</button>
        </div>
        <form id="newOrderForm">
          <div class="modal-body">
            
            <!-- Datos del Cliente -->
            <div class="form-row">
              <div class="form-group autocomplete-wrapper">
                <label class="form-label">Nombre y Apellido del Cliente *</label>
                <input 
                  type="text" 
                  id="custFullName" 
                  class="form-input" 
                  placeholder="Escribe el nombre (sugiere existentes)..." 
                  value="${defaultName}" 
                  autocomplete="off"
                  required 
                />
                <div id="customerSuggestions" class="autocomplete-dropdown"></div>
              </div>
              <div class="form-group autocomplete-wrapper">
                <label class="form-label">Teléfono o @Usuario de WhatsApp *</label>
                <input 
                  type="text" 
                  id="custPhone" 
                  class="form-input" 
                  placeholder="Ej: 3014964250 o @usuario_wa" 
                  value="${defaultPhone}" 
                  autocomplete="off"
                  required 
                />
                <div id="phoneSuggestions" class="autocomplete-dropdown"></div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Dirección de Entrega (Fonseca) *</label>
              <input type="text" id="custAddress" class="form-input" placeholder="Ej: Calle 12 # 15-40, Barrio San Agustín" value="${defaultAddress}" required />
            </div>

            <!-- Modalidad de Entrega y Asignación de Repartidor -->
            <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: var(--radius-md); padding: 12px; margin-bottom: 14px;">
              <div class="form-row" style="margin-bottom: 0;">
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-size: 0.84rem; font-weight: 800; color: #15803D;">Modalidad de Entrega *</label>
                  <select id="orderDeliveryType" class="form-select" style="font-weight: 700; font-size: 0.85rem;">
                    <option value="PROPIO" ${defaultDeliveryType === 'PROPIO' ? 'selected' : ''}>👤 Entrega Propia (Socios)</option>
                    <option value="DOMICILIARIO" ${defaultDeliveryType === 'DOMICILIARIO' ? 'selected' : ''}>🛵 Domicilio con Repartidor</option>
                    <option value="LOCAL" ${defaultDeliveryType === 'LOCAL' ? 'selected' : ''}>🏪 Recoge en Local / Tienda</option>
                  </select>
                </div>

                <div class="form-group" id="driverSelectGroup" style="margin-bottom: 0; ${defaultDeliveryType === 'DOMICILIARIO' ? '' : 'display: none;'}">
                  <label class="form-label" style="font-size: 0.84rem; font-weight: 800; color: #0369A1;">Repartidor Asignado</label>
                  <select id="orderDeliveryDriver" class="form-select" style="font-weight: 700; font-size: 0.85rem;">
                    <option value="">-- Sin asignar aún --</option>
                    ${modalDrivers
                      .map(
                        (d) => `
                      <option value="${d.id}" data-name="${d.name}" ${String(defaultDeliveryDriverId) === String(d.id) ? 'selected' : ''}>
                        🛵 ${d.name}
                      </option>
                    `
                      )
                      .join('')}
                  </select>
                </div>
              </div>
            </div>

            <!-- Información / Banner de Lotes Flexibles -->
            <div style="background: #FAF5FF; border: 1.5px solid #DDD6FE; border-radius: var(--radius-md); padding: 10px 12px; margin-bottom: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                <span style="font-size: 0.84rem; font-weight: 800; color: var(--primary);">🍶 Lotes de Producción y Sabores Flexibles</span>
                <span style="font-size: 0.72rem; color: #6D28D9; font-weight: 800; background: #EDE9FE; padding: 2px 7px; border-radius: 4px;">Multi-Lote Activo</span>
              </div>
              <div id="batchHintDisplay" style="font-size: 0.76rem; color: #5B21B6; line-height: 1.35;">
                💡 Puedes combinar productos de diferentes lotes (ej: Natural Artesanal y Bajo en Azúcar) o preventas en un solo pedido.
              </div>
            </div>

            <!-- Sección de Múltiples Productos en el Pedido -->
            <div style="background: var(--bg-app); border: 1.5px solid var(--border-color); border-radius: var(--radius-md); padding: 12px; margin-bottom: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label style="font-size: 0.92rem; font-weight: 800; color: var(--primary); margin: 0;">
                  🛒 Productos del Pedido
                </label>
                <button type="button" class="btn btn-outline btn-sm" id="btnAddOrderItem" style="font-size: 0.78rem; padding: 4px 10px; font-weight: 700;">
                  + Agregar Producto
                </button>
              </div>

              <!-- Cabecera de columnas -->
              <div style="display: flex; gap: 6px; font-size: 0.72rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; padding: 0 4px; margin-bottom: 6px;">
                <span style="width: 75px;">Envase</span>
                <span style="flex: 1.6; min-width: 140px;">Lote de Origen / Sabor</span>
                <span style="width: 44px; text-align: center;">Cant.</span>
                <span style="width: 80px; text-align: right;">Precio ($)</span>
                <span style="width: 68px; text-align: right;">Subtotal</span>
                <span style="width: 24px;"></span>
              </div>

              <div id="orderItemsContainer" style="display: flex; flex-direction: column; gap: 8px;"></div>
            </div>

            <!-- Resumen Financiero y Contable del Pedido -->
            <div style="background: #F8FAFC; border: 1.5px solid #CBD5E1; border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px dashed #CBD5E1; padding-bottom: 8px;">
                <span style="font-size: 0.88rem; font-weight: 800; color: var(--primary);">💰 Resumen Contable y Cobro</span>
                <span id="orderTotalLitersBadge" style="background: #EDE9FE; color: var(--primary); font-weight: 800; font-size: 0.78rem; padding: 2px 8px; border-radius: 6px;">🥛 1 Litro</span>
              </div>

              <div class="form-row" style="margin-bottom: 10px;">
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-size: 0.78rem; margin-bottom: 2px;">Subtotal Productos ($ COP)</label>
                  <input type="text" id="orderSubtotalDisplay" class="form-input" value="$12.000 COP" disabled style="background: #FFFFFF; font-weight: 700; color: var(--text-main); font-size: 0.9rem;" />
                </div>

                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-size: 0.78rem; margin-bottom: 2px; color: #0369A1;">🛵 Domicilio ($ COP)</label>
                  <input type="number" inputmode="numeric" id="orderDeliveryFee" class="form-input" min="0" step="500" value="${defaultDeliveryFee}" placeholder="0 si es gratis" style="font-weight: 700; color: #0369A1;" />
                </div>
              </div>

              <div class="form-row" style="margin-bottom: 10px;">
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-size: 0.78rem; margin-bottom: 2px; color: #DC2626;">🏷️ Descuento Global ($ COP)</label>
                  <input type="number" inputmode="numeric" id="orderDiscount" class="form-input" min="0" step="500" value="${orderData?.discount || 0}" placeholder="0 si no hay rebaja" style="font-weight: 700; color: #DC2626;" />
                </div>

                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-size: 0.82rem; font-weight: 800; color: #15803D; margin-bottom: 2px;">💵 TOTAL A COBRAR ($ COP) *</label>
                  <input type="number" inputmode="numeric" id="orderTotalAmount" class="form-input" value="${(initialItems.reduce((s, i) => s + (i.quantity * i.unitPrice), 0) + defaultDeliveryFee - (orderData?.discount || 0)) || 12000}" required style="font-weight: 800; color: #15803D; font-size: 1.05rem; background: #F0FDF4; border: 1.5px solid #86EFAC;" />
                </div>
              </div>

              <div class="form-row" style="border-top: 1px dashed #CBD5E1; padding-top: 10px; margin-bottom: 0;">
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-size: 0.78rem; margin-bottom: 2px;">Monto Pagado / Abonado ($)</label>
                  <input type="number" inputmode="numeric" id="orderPaidAmount" class="form-input" min="0" step="500" value="${defaultPaid}" placeholder="0 si no ha pagado" style="font-weight: 700;" />
                </div>

                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-size: 0.78rem; margin-bottom: 2px;">Saldo Pendiente de Cobro</label>
                  <input type="text" id="orderPendingDisplay" class="form-input" value="$0 COP" disabled style="background: #FFFFFF; font-weight: 800; color: var(--danger);" />
                </div>
              </div>
            </div>

            <!-- Modalidad de Pago -->
            <div class="form-group">
              <label class="form-label">Modalidad de Pago</label>
              <select id="orderPaymentMethod" class="form-select" style="font-weight: 700;">
                <option value="EFECTIVO" ${defaultPaymentMethod === 'EFECTIVO' ? 'selected' : ''}>💵 Efectivo</option>
                <option value="NEQUI" ${defaultPaymentMethod === 'NEQUI' ? 'selected' : ''}>🟣 Transferencia Nequi</option>
                <option value="BANCOLOMBIA" ${defaultPaymentMethod === 'BANCOLOMBIA' ? 'selected' : ''}>🟡 Transferencia Bancolombia</option>
                <option value="TRANSFERENCIA" ${defaultPaymentMethod === 'TRANSFERENCIA' ? 'selected' : ''}>💳 Otra Transferencia</option>
              </select>
            </div>

            <!-- Fechas de Pedido y Entrega Programada -->
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">📅 Fecha del Pedido *</label>
                <input type="date" id="orderDateInput" class="form-input" value="${defaultDate}" required />
              </div>

              <div class="form-group">
                <label class="form-label">🛵 Fecha Programada de Entrega</label>
                <input type="date" id="orderDeliveryDateInput" class="form-input" value="${defaultDeliveryDate}" placeholder="Ej: Para mañana o pasado mañana" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Estado de Entrega</label>
              <select id="orderDeliveryStatus" class="form-select">
                <option value="PENDING" ${defaultDeliveryStatus === 'PENDING' ? 'selected' : ''}>🕒 Pendiente</option>
                <option value="PREPARING" ${defaultDeliveryStatus === 'PREPARING' ? 'selected' : ''}>🥣 En Preparación</option>
                <option value="READY_FOR_DISPATCH" ${defaultDeliveryStatus === 'READY_FOR_DISPATCH' ? 'selected' : ''}>📦 Listo para Despacho</option>
                <option value="IN_ROUTE" ${defaultDeliveryStatus === 'IN_ROUTE' ? 'selected' : ''}>🛵 En Ruta</option>
                <option value="DELIVERED" ${defaultDeliveryStatus === 'DELIVERED' ? 'selected' : ''}>✅ Entregado</option>
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Notas Adicionales (Opcional)</label>
              <input type="text" id="orderNotes" class="form-input" placeholder="Ej: Entregar después de las 3:00 PM..." value="${defaultNotes}" />
            </div>

          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btnCancelOrderModal">Cancelar</button>
            <button type="submit" class="btn btn-accent" style="padding: 10px 22px;">${submitButtonText}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const form = document.getElementById('newOrderForm');
  const itemsContainer = document.getElementById('orderItemsContainer');
  const subtotalDisplay = document.getElementById('orderSubtotalDisplay');
  const totalLitersBadge = document.getElementById('orderTotalLitersBadge');
  const totalInput = document.getElementById('orderTotalAmount');
  const paidInput = document.getElementById('orderPaidAmount');
  const pendingDisplay = document.getElementById('orderPendingDisplay');
  const batchHintDisplay = document.getElementById('batchHintDisplay');
  const deliveryTypeSelect = document.getElementById('orderDeliveryType');
  const driverSelectGroup = document.getElementById('driverSelectGroup');
  const driverSelect = document.getElementById('orderDeliveryDriver');
  const deliveryFeeInput = document.getElementById('orderDeliveryFee');
  const discountInput = document.getElementById('orderDiscount');
  const modalBody = modalOverlay.querySelector('.modal-body');

  deliveryTypeSelect?.addEventListener('change', (e) => {
    if (e.target.value === 'DOMICILIARIO') {
      if (driverSelectGroup) driverSelectGroup.style.display = 'block';
    } else {
      if (driverSelectGroup) driverSelectGroup.style.display = 'none';
      if (driverSelect) driverSelect.value = '';
    }
  });

  deliveryFeeInput?.addEventListener('input', () => {
    recalculateOrderTotals('FEE');
  });

  discountInput?.addEventListener('input', () => {
    recalculateOrderTotals('DISCOUNT');
  });

  totalInput?.addEventListener('input', () => {
    recalculateOrderTotals('TOTAL_DIRECT');
  });

  paidInput?.addEventListener('input', () => {
    recalculateOrderTotals('PAID');
  });

  // Lista de sabores predeterminados para preventa
  const standardFlavors = [
    'Natural Artesanal',
    'Natural Bajo en Azúcar',
    'Natural Sin Azúcar (Stevia)',
    'Fresa',
    'Melocotón',
    'Mora',
    'Maracuyá',
    'Guanábana',
    'Arequipe',
  ];

  // Función para renderizar una fila de producto individual con selección de lote/sabor
  function addProductRow(item = { bottleSize: '1L', flavor: 'Natural Artesanal', quantity: 1, unitPrice: 12000, batchId: null }) {
    const row = document.createElement('div');
    row.className = 'order-item-row';
    row.style.cssText = 'display: flex; gap: 6px; align-items: center; background: #FFFFFF; padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); flex-wrap: wrap;';

    const itemBatchId = item.batchId ? Number(item.batchId) : null;
    const matchingBatch = itemBatchId ? allBatchesForModal.find((b) => b.id === itemBatchId) : null;
    const defaultPriceForSize = item.bottleSize === '2L'
      ? (matchingBatch?.price2L || 24000)
      : (matchingBatch?.price1L || 12000);

    const itemPrice = item.unitPrice !== undefined && !isNaN(Number(item.unitPrice)) && Number(item.unitPrice) >= 0
      ? Number(item.unitPrice)
      : defaultPriceForSize;

    // Determinar valor inicial del selector de lote/fuente
    let initialSourceValue = '';
    let isCustomFlavor = false;

    if (itemBatchId && matchingBatch) {
      initialSourceValue = `BATCH_${matchingBatch.id}`;
    } else {
      const matchStd = standardFlavors.find((f) => f.toLowerCase() === (item.flavor || '').toLowerCase());
      if (matchStd) {
        initialSourceValue = `PRE_${matchStd}`;
      } else if (item.flavor) {
        initialSourceValue = 'PRE_CUSTOM';
        isCustomFlavor = true;
      } else {
        initialSourceValue = 'PRE_Natural Artesanal';
      }
    }

    // Construir opciones de Lotes Activos
    const activeBatchOptions = allBatchesForModal
      .map((b) => {
        const remaining = b.remainingAvailableLiters !== undefined ? b.remainingAvailableLiters : Math.max(0, b.totalLitersProduced - (b.totalSoldLiters || 0) - (b.totalDischargedLiters || 0));
        const isFull = remaining <= 0 && b.id !== itemBatchId;
        const litersText = ` • ${remaining.toFixed(1)}L disp.`;
        const val = `BATCH_${b.id}`;
        const isSelected = initialSourceValue === val;
        const statusIcon = isFull ? '🔴' : (b.status === 'AGOTADO' ? '⚠️' : '✅');
        return `
          <option value="${val}" data-batch-id="${b.id}" data-flavor="${escapeHtml(b.flavor)}" data-price1l="${b.price1L || 12000}" data-price2l="${b.price2L || 24000}" data-remaining="${remaining}" ${isSelected ? 'selected' : ''}>
            ${statusIcon} ${b.batchCode} • ${b.flavor}${litersText}
          </option>
        `;
      })
      .join('');

    // Construir opciones de Preventa
    const preOptions = standardFlavors
      .map((f) => {
        const val = `PRE_${f}`;
        const isSelected = initialSourceValue === val;
        return `<option value="${val}" data-flavor="${escapeHtml(f)}" data-price1l="12000" data-price2l="24000" ${isSelected ? 'selected' : ''}>🥣 Preventa: ${f}</option>`;
      })
      .join('');

    row.innerHTML = `
      <select class="form-select item-size" style="width: 75px; font-size: 0.82rem; padding: 6px 4px;" title="Tamaño de envase">
        <option value="1L" ${item.bottleSize === '1L' ? 'selected' : ''}>1 Litro</option>
        <option value="2L" ${item.bottleSize === '2L' ? 'selected' : ''}>2 Litros</option>
      </select>

      <div style="flex: 1.6; min-width: 140px; display: flex; flex-direction: column; gap: 4px;">
        <select class="form-select item-batch-source" style="font-size: 0.82rem; padding: 6px 6px; font-weight: 700;" title="Lote de producción o Preventa">
          <optgroup label="🍶 Lotes de Producción">
            ${activeBatchOptions}
          </optgroup>
          <optgroup label="🥣 Encargos Preventa (Sin Lote Aún)">
            ${preOptions}
            <option value="PRE_CUSTOM" ${isCustomFlavor ? 'selected' : ''}>✨ Preventa: Otro Sabor Personalizado...</option>
          </optgroup>
        </select>
        <input 
          type="text" 
          class="form-input item-custom-flavor" 
          placeholder="Escribe el sabor personalizado..." 
          value="${isCustomFlavor ? escapeHtml(item.flavor) : ''}" 
          style="font-size: 0.8rem; padding: 4px 6px; display: ${isCustomFlavor ? 'block' : 'none'}; border-color: #A855F7; background: #FAF5FF;" 
        />
      </div>

      <input type="number" inputmode="numeric" class="form-input item-qty" min="1" value="${item.quantity || 1}" style="width: 44px; text-align: center; font-weight: 700; padding: 6px 2px;" title="Cantidad de botellas" placeholder="Cant." />

      <div style="display: flex; align-items: center; gap: 2px; width: 80px;" title="Precio unitario por botella (Modificable para precios especiales)">
        <input type="number" inputmode="numeric" class="form-input item-price" min="0" step="500" value="${itemPrice}" style="font-size: 0.82rem; font-weight: 800; padding: 6px 4px; text-align: right; color: #0369A1; background: #F0F9FF; width: 100%;" placeholder="Precio" />
      </div>

      <span class="item-subtotal-display" style="font-size: 0.85rem; font-weight: 800; color: var(--primary); width: 68px; text-align: right;">
        ${formatCOP((item.quantity || 1) * itemPrice)}
      </span>

      <button type="button" class="btn btn-outline btn-sm btn-remove-item" style="color: var(--danger); padding: 4px 6px; font-size: 0.85rem; width: 24px; text-align: center;" title="Quitar producto">
        ✕
      </button>
    `;

    const sizeSelect = row.querySelector('.item-size');
    const sourceSelect = row.querySelector('.item-batch-source');
    const customFlavorInput = row.querySelector('.item-custom-flavor');
    const qtyInput = row.querySelector('.item-qty');
    const priceInput = row.querySelector('.item-price');
    const removeBtn = row.querySelector('.btn-remove-item');

    let isPriceManuallyEdited = item.unitPrice !== undefined && Number(item.unitPrice) !== defaultPriceForSize;

    const getRowStandardPrice = () => {
      const selectedOpt = sourceSelect.selectedOptions[0];
      const is2L = sizeSelect.value === '2L';
      if (selectedOpt) {
        return is2L
          ? (Number(selectedOpt.dataset.price2l) || 24000)
          : (Number(selectedOpt.dataset.price1l) || 12000);
      }
      return is2L ? 24000 : 12000;
    };

    const updateRow = () => {
      recalculateOrderTotals('ITEMS');
    };

    sizeSelect.addEventListener('change', () => {
      if (!isPriceManuallyEdited) {
        priceInput.value = getRowStandardPrice();
      }
      updateRow();
    });

    sourceSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'PRE_CUSTOM') {
        customFlavorInput.style.display = 'block';
        customFlavorInput.focus();
      } else {
        customFlavorInput.style.display = 'none';
      }

      if (!isPriceManuallyEdited) {
        priceInput.value = getRowStandardPrice();
      }
      updateRow();
    });

    customFlavorInput.addEventListener('input', updateRow);

    priceInput.addEventListener('input', () => {
      isPriceManuallyEdited = true;
      updateRow();
    });

    qtyInput.addEventListener('input', updateRow);

    removeBtn.addEventListener('click', () => {
      const allRows = itemsContainer.querySelectorAll('.order-item-row');
      if (allRows.length > 1) {
        row.remove();
        recalculateOrderTotals('ITEMS');
      } else {
        showToast('El pedido debe tener al menos 1 producto', 'warning');
      }
    });

    itemsContainer.appendChild(row);
    recalculateOrderTotals('ITEMS');
  }

  let isInternalRecalculating = false;

  function recalculateOrderTotals(source = 'ITEMS') {
    if (isInternalRecalculating) return;
    isInternalRecalculating = true;

    const rows = itemsContainer.querySelectorAll('.order-item-row');
    let sumLiters = 0;
    let sumProductsTotal = 0;

    const fee = Number(deliveryFeeInput?.value) || 0;
    let discount = Number(discountInput?.value) || 0;

    if (source === 'TOTAL_DIRECT') {
      const enteredTotal = Number(totalInput?.value) || 0;
      if (rows.length === 1) {
        const row = rows[0];
        const qty = Number(row.querySelector('.item-qty')?.value) || 1;
        const derivedUnitPrice = Math.max(0, Math.round((enteredTotal - fee + discount) / qty));
        const priceInput = row.querySelector('.item-price');
        if (priceInput) priceInput.value = derivedUnitPrice;
      } else if (rows.length > 1) {
        let currentItemsTotal = 0;
        rows.forEach((r) => {
          const qty = Number(r.querySelector('.item-qty')?.value) || 1;
          const priceInput = r.querySelector('.item-price');
          const unitPrice = priceInput && priceInput.value !== '' ? Number(priceInput.value) : 12000;
          currentItemsTotal += qty * unitPrice;
        });
        const diff = (currentItemsTotal + fee) - enteredTotal;
        discount = Math.max(0, diff);
        if (discountInput) discountInput.value = discount;
      }
    }

    // Mapa para consolidar consumo de litros por lote individual
    const batchUsageMap = new Map();

    // Calcular subtotales por fila
    rows.forEach((row) => {
      const size = row.querySelector('.item-size')?.value || '1L';
      const qty = Number(row.querySelector('.item-qty')?.value) || 1;
      const sourceSelect = row.querySelector('.item-batch-source');
      const selectedOpt = sourceSelect?.selectedOptions[0];
      const defaultPrice = size === '2L' ? (Number(selectedOpt?.dataset.price2l) || 24000) : (Number(selectedOpt?.dataset.price1l) || 12000);
      const priceInput = row.querySelector('.item-price');
      const unitPrice = priceInput && priceInput.value !== '' ? Number(priceInput.value) : defaultPrice;
      const rowTotal = qty * unitPrice;
      const rowLiters = size === '2L' ? qty * 2 : qty * 1;

      sumLiters += rowLiters;
      sumProductsTotal += rowTotal;

      // Agrupar litros por lote si proviene de un lote activo
      if (selectedOpt && selectedOpt.value.startsWith('BATCH_')) {
        const bId = Number(selectedOpt.dataset.batchId);
        batchUsageMap.set(bId, (batchUsageMap.get(bId) || 0) + rowLiters);
      }

      const subDisplay = row.querySelector('.item-subtotal-display');
      if (subDisplay) subDisplay.textContent = formatCOP(rowTotal);
    });

    const grandTotal = source === 'TOTAL_DIRECT'
      ? (Number(totalInput?.value) || 0)
      : Math.max(0, sumProductsTotal + fee - discount);

    if (source !== 'TOTAL_DIRECT' && totalInput) {
      totalInput.value = grandTotal;
    }

    if (subtotalDisplay) {
      subtotalDisplay.value = formatCOP(sumProductsTotal);
    }
    if (totalLitersBadge) {
      totalLitersBadge.textContent = `🥛 ${sumLiters} Litro(s)`;
    }

    const paid = Number(paidInput?.value) || 0;
    const pending = Math.max(0, grandTotal - paid);
    if (pendingDisplay) {
      pendingDisplay.value = formatCOP(pending);
    }

    // Validar capacidad en tiempo real por cada lote utilizado
    if (batchHintDisplay) {
      const capacityErrors = [];
      const batchSummaries = [];

      for (const [bId, litersRequired] of batchUsageMap.entries()) {
        const chosenBatch = allBatchesForModal.find((b) => b.id === bId);
        if (chosenBatch && chosenBatch.totalLitersProduced !== undefined) {
          // Litros que ya tenía asignados este pedido en el lote antes de editar
          let prevOrderLitersForThisBatch = 0;
          if (isEditing && orderData?.items) {
            prevOrderLitersForThisBatch = orderData.items
              .filter((it) => (it.batchId || orderData.batchId) === bId)
              .reduce((s, it) => s + (it.bottleSize === '2L' ? it.quantity * 2 : it.quantity * 1), 0);
          } else if (isEditing && orderData?.batchId === bId) {
            prevOrderLitersForThisBatch = orderData.totalLiters || 0;
          }

          const remaining = chosenBatch.remainingAvailableLiters !== undefined ? chosenBatch.remainingAvailableLiters : chosenBatch.totalLitersProduced;
          const availableForOrder = Math.max(0, remaining + prevOrderLitersForThisBatch);

          if (litersRequired > availableForOrder) {
            capacityErrors.push(`🚨 <strong>Capacidad excedida en ${chosenBatch.batchCode} (${chosenBatch.flavor}):</strong> Requiere ${litersRequired}L pero solo hay ${availableForOrder}L disponibles.`);
          } else {
            batchSummaries.push(`🍶 <strong>${chosenBatch.batchCode} (${chosenBatch.flavor}):</strong> ${litersRequired}L asignados (${(availableForOrder - litersRequired).toFixed(1)}L quedarán disp.)`);
          }
        }
      }

      if (capacityErrors.length > 0) {
        batchHintDisplay.innerHTML = `${capacityErrors.join('<br/>')}<br/><span style="font-size:0.75rem; color:#991B1B;">💡 Tip: Reduce la cantidad o selecciona la opción de <strong>"🥣 Preventa"</strong> para esos litros.</span>`;
        batchHintDisplay.style.color = '#DC2626';
      } else if (batchSummaries.length > 0) {
        batchHintDisplay.innerHTML = `✅ ${batchSummaries.join(' • ')}`;
        batchHintDisplay.style.color = '#15803D';
      } else {
        batchHintDisplay.innerHTML = `🥣 <strong>Encargo Preventa (Sin Lote):</strong> Los productos quedarán registrados para vincularse al lote que prepares posteriormente.`;
        batchHintDisplay.style.color = '#B45309';
      }
    }

    isInternalRecalculating = false;
  }

  // Inicializar filas existentes
  initialItems.forEach((it) => addProductRow(it));

  // Botón para agregar más productos
  document.getElementById('btnAddOrderItem')?.addEventListener('click', () => {
    // Tomar por defecto el lote del último producto o primer disponible
    const lastRowSource = itemsContainer.querySelector('.order-item-row:last-child .item-batch-source')?.value;
    let newBatchId = null;
    let newFlavor = 'Natural Artesanal';
    let newPrice = 12000;

    if (lastRowSource && lastRowSource.startsWith('BATCH_')) {
      const lastBId = Number(lastRowSource.replace('BATCH_', ''));
      const bObj = allBatchesForModal.find((b) => b.id === lastBId);
      if (bObj) {
        newBatchId = bObj.id;
        newFlavor = bObj.flavor;
        newPrice = bObj.price1L || 12000;
      }
    }

    addProductRow({ bottleSize: '1L', flavor: newFlavor, quantity: 1, unitPrice: newPrice, batchId: newBatchId });
    if (modalBody) {
      setTimeout(() => {
        modalBody.scrollTo({ top: modalBody.scrollHeight / 2, behavior: 'smooth' });
      }, 50);
    }
  });

  // Autocomplete interactivo seguro para Nombre y Teléfono/@Usuario
  const nameInput = document.getElementById('custFullName');
  const suggestionsBox = document.getElementById('customerSuggestions');
  const phoneInput = document.getElementById('custPhone');
  const phoneSuggestionsBox = document.getElementById('phoneSuggestions');
  const addressInput = document.getElementById('custAddress');

  const selectCustomer = (c) => {
    nameInput.value = c.fullName;
    phoneInput.value = c.phone;
    addressInput.value = c.address || '';
    selectedCustomerId = Number(c.id);
    if (suggestionsBox) {
      suggestionsBox.innerHTML = '';
      suggestionsBox.classList.remove('active');
    }
    if (phoneSuggestionsBox) {
      phoneSuggestionsBox.innerHTML = '';
      phoneSuggestionsBox.classList.remove('active');
    }
    showToast(`Cliente seleccionado: ${c.fullName} 👤`, 'info');
  };

  const renderNameSuggestions = (query) => {
    if (!suggestionsBox) return;
    if (!query || query.trim().length < 1 || !existingCustomers || existingCustomers.length === 0) {
      suggestionsBox.innerHTML = '';
      suggestionsBox.classList.remove('active');
      return;
    }

    const q = query.toLowerCase().trim();
    const matches = existingCustomers.filter((c) => {
      const nameMatch = c.fullName && c.fullName.toLowerCase().includes(q);
      const phoneMatch = c.phone && c.phone.toLowerCase().includes(q);
      return nameMatch || phoneMatch;
    });

    if (matches.length === 0) {
      suggestionsBox.innerHTML = '';
      suggestionsBox.classList.remove('active');
      return;
    }

    suggestionsBox.innerHTML = matches
      .slice(0, 5)
      .map(
        (c) => `
        <div class="autocomplete-item" data-id="${c.id}">
          <span class="autocomplete-item-name">👤 ${c.fullName}</span>
          <span class="autocomplete-item-details">📞 ${c.phone} • 📍 ${c.address || 'Fonseca'}</span>
        </div>
      `
      )
      .join('');

    suggestionsBox.classList.add('active');

    suggestionsBox.querySelectorAll('.autocomplete-item').forEach((item) => {
      item.addEventListener('click', () => {
        const id = Number(item.dataset.id);
        const c = existingCustomers.find((cust) => cust.id === id);
        if (c) selectCustomer(c);
      });
    });
  };

  const renderPhoneSuggestions = (query) => {
    if (!phoneSuggestionsBox) return;
    if (!query || query.trim().length < 2 || !existingCustomers || existingCustomers.length === 0) {
      phoneSuggestionsBox.innerHTML = '';
      phoneSuggestionsBox.classList.remove('active');
      return;
    }

    const rawQ = query.trim().toLowerCase();
    const isUsername = rawQ.startsWith('@') || /[a-zA-Z]/.test(rawQ);
    const cleanQ = rawQ.replace(/^@/, '');
    const cleanDigits = rawQ.replace(/\D/g, '');

    const matches = existingCustomers.filter((c) => {
      if (!c.phone) return false;
      const cPhoneLower = c.phone.toLowerCase();
      if (isUsername) {
        return cPhoneLower.includes(cleanQ) || (c.fullName && c.fullName.toLowerCase().includes(cleanQ));
      } else {
        const cDigits = c.phone.replace(/\D/g, '');
        return (cleanDigits && cDigits.includes(cleanDigits)) || (c.fullName && c.fullName.toLowerCase().includes(rawQ));
      }
    });

    if (matches.length === 0) {
      phoneSuggestionsBox.innerHTML = '';
      phoneSuggestionsBox.classList.remove('active');
      return;
    }

    phoneSuggestionsBox.innerHTML = matches
      .slice(0, 5)
      .map(
        (c) => `
        <div class="autocomplete-item" data-id="${c.id}">
          <span class="autocomplete-item-name">📞 ${c.phone}</span>
          <span class="autocomplete-item-details">👤 ${c.fullName} • 📍 ${c.address || 'Fonseca'}</span>
        </div>
      `
      )
      .join('');

    phoneSuggestionsBox.classList.add('active');

    phoneSuggestionsBox.querySelectorAll('.autocomplete-item').forEach((item) => {
      item.addEventListener('click', () => {
        const id = Number(item.dataset.id);
        const c = existingCustomers.find((cust) => cust.id === id);
        if (c) selectCustomer(c);
      });
    });
  };

  nameInput?.addEventListener('input', (e) => {
    selectedCustomerId = null;
    renderNameSuggestions(e.target.value);
  });

  nameInput?.addEventListener('focus', (e) => {
    if (e.target.value.trim().length > 0) {
      renderNameSuggestions(e.target.value);
    }
  });

  phoneInput?.addEventListener('input', (e) => {
    selectedCustomerId = null;
    renderPhoneSuggestions(e.target.value);
  });

  phoneInput?.addEventListener('focus', (e) => {
    if (e.target.value.trim().length > 1) {
      renderPhoneSuggestions(e.target.value);
    }
  });

  const handleOutsideClick = (e) => {
    if (!nameInput?.contains(e.target) && !suggestionsBox?.contains(e.target)) {
      suggestionsBox?.classList.remove('active');
    }
    if (!phoneInput?.contains(e.target) && !phoneSuggestionsBox?.contains(e.target)) {
      phoneSuggestionsBox?.classList.remove('active');
    }
  };
  document.addEventListener('click', handleOutsideClick);

  if (!isEditing) {
    phoneInput?.addEventListener('blur', async () => {
      setTimeout(() => {
        const phone = (phoneInput.value || '').trim();
        if (!nameInput.value.trim() && phone.length >= 4) {
          const isUsername = phone.startsWith('@') || /[a-zA-Z]/.test(phone);
          let foundCust = null;

          if (isUsername) {
            const cleanU = phone.toLowerCase().replace(/^@/, '').trim();
            if (cleanU.length >= 3) {
              foundCust = existingCustomers.find((c) => {
                const cU = (c.phone || '').toLowerCase().replace(/^@/, '').trim();
                return cU === cleanU;
              });
            }
          } else {
            const digits = phone.replace(/\D/g, '');
            if (digits.length >= 10) {
              foundCust = existingCustomers.find((c) => {
                const cDigits = (c.phone || '').replace(/\D/g, '');
                return cDigits === digits;
              });
            }
          }

          if (foundCust) {
            selectCustomer(foundCust);
          }
        }
      }, 200);
    });
  }

  const deliveryStatusSelect = document.getElementById('orderDeliveryStatus');
  const deliveryDateInput = document.getElementById('orderDeliveryDateInput');

  // Si se cambia a ENTREGADO, asegurar que la fecha de entrega sea la fecha de hoy
  deliveryStatusSelect?.addEventListener('change', (e) => {
    if (e.target.value === 'DELIVERED') {
      const todayStr = getTodayLocalDateStr();
      if (!deliveryDateInput.value || deliveryDateInput.value !== todayStr) {
        deliveryDateInput.value = todayStr;
        showToast(`📅 Fecha de entrega establecida automáticamente como hoy (${todayStr})`, 'info');
      }
    }
  });

  const closeModal = () => {
    modalOverlay.innerHTML = '';
  };

  document.getElementById('btnCloseOrderModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelOrderModal')?.addEventListener('click', closeModal);

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Recoger todos los ítems de las filas con sus lotes respectivos
    const items = [];
    const batchUsageMap = new Map();

    const rows = itemsContainer.querySelectorAll('.order-item-row');
    for (const row of rows) {
      const size = row.querySelector('.item-size').value;
      const sourceSelect = row.querySelector('.item-batch-source');
      const customFlavorInput = row.querySelector('.item-custom-flavor');
      const selectedOpt = sourceSelect.selectedOptions[0];

      let itemBatchId = null;
      let flavor = 'Natural Artesanal';

      if (sourceSelect.value.startsWith('BATCH_')) {
        itemBatchId = Number(sourceSelect.value.replace('BATCH_', ''));
        flavor = selectedOpt?.dataset?.flavor || (allBatchesForModal.find((b) => b.id === itemBatchId)?.flavor || 'Natural');
      } else if (sourceSelect.value === 'PRE_CUSTOM') {
        itemBatchId = null;
        flavor = (customFlavorInput?.value || 'Natural Personalizado').trim() || 'Natural Personalizado';
      } else if (sourceSelect.value.startsWith('PRE_')) {
        itemBatchId = null;
        flavor = selectedOpt?.dataset?.flavor || sourceSelect.value.replace('PRE_', '');
      }

      const qty = Number(row.querySelector('.item-qty').value) || 1;
      const priceInput = row.querySelector('.item-price');
      const defaultPrice = size === '2L' ? (Number(selectedOpt?.dataset.price2l) || 24000) : (Number(selectedOpt?.dataset.price1l) || 12000);
      const unitPrice = priceInput && priceInput.value !== '' ? Number(priceInput.value) : defaultPrice;

      items.push({
        batchId: itemBatchId,
        bottleSize: size,
        flavor,
        quantity: qty,
        unitPrice,
      });

      if (itemBatchId) {
        const itemLiters = size === '2L' ? qty * 2 : qty * 1;
        batchUsageMap.set(itemBatchId, (batchUsageMap.get(itemBatchId) || 0) + itemLiters);
      }
    }

    if (items.length === 0) {
      showToast('El pedido debe tener al menos 1 producto', 'warning');
      return;
    }

    // Validar capacidad de cada lote individualmente antes de enviar
    for (const [bId, litersRequired] of batchUsageMap.entries()) {
      const chosenBatch = allBatchesForModal.find((b) => b.id === bId);
      if (chosenBatch && chosenBatch.totalLitersProduced !== undefined) {
        let prevOrderLitersForThisBatch = 0;
        if (isEditing && orderData?.items) {
          prevOrderLitersForThisBatch = orderData.items
            .filter((it) => (it.batchId || orderData.batchId) === bId)
            .reduce((s, it) => s + (it.bottleSize === '2L' ? it.quantity * 2 : it.quantity * 1), 0);
        } else if (isEditing && orderData?.batchId === bId) {
          prevOrderLitersForThisBatch = orderData.totalLiters || 0;
        }

        const remaining = chosenBatch.remainingAvailableLiters !== undefined ? chosenBatch.remainingAvailableLiters : chosenBatch.totalLitersProduced;
        const availableForOrder = Math.max(0, remaining + prevOrderLitersForThisBatch);

        if (litersRequired > availableForOrder) {
          showToast(`⚠️ Capacidad excedida: El lote "${chosenBatch.batchCode} (${chosenBatch.flavor})" solo tiene ${availableForOrder}L disponibles (este pedido requiere ${litersRequired}L).`, 'warning');
          return;
        }
      }
    }

    // Si todos los ítems comparten el mismo batchId, se pasa como batchId global; si hay mezcla o preventa, se pasa null
    const uniqueBatchIds = Array.from(new Set(items.map((it) => it.batchId).filter((b) => b !== null && b !== undefined)));
    const finalOrderBatchId = (uniqueBatchIds.length === 1)
      ? Number(uniqueBatchIds[0])
      : null;

    const total = Number(totalInput.value) || 12000;
    const paid = Number(paidInput.value) || 0;

    const deliveryType = deliveryTypeSelect?.value || 'PROPIO';
    const driverIdVal = driverSelect?.value ? Number(driverSelect.value) : null;
    const selectedDriverOpt = driverSelect?.selectedOptions[0];
    const driverNameVal = driverIdVal ? (selectedDriverOpt?.dataset?.name || selectedDriverOpt?.text?.replace(/^🛵\s*/, '')) : null;

    const statusVal = document.getElementById('orderDeliveryStatus').value;
    let finalDeliveryDateVal = document.getElementById('orderDeliveryDateInput').value || null;
    if (statusVal === 'DELIVERED' && !finalDeliveryDateVal) {
      finalDeliveryDateVal = getTodayLocalDateStr();
    }

    const orderPayload = {
      customerId: selectedCustomerId || undefined,
      customerName: document.getElementById('custFullName').value,
      customerPhone: document.getElementById('custPhone').value,
      customerAddress: document.getElementById('custAddress').value,
      batchId: finalOrderBatchId,
      items,
      totalAmount: total,
      paidAmount: paid,
      paymentMethod: document.getElementById('orderPaymentMethod')?.value || 'EFECTIVO',
      deliveryType,
      deliveryDriverId: deliveryType === 'DOMICILIARIO' ? driverIdVal : null,
      deliveryDriverName: deliveryType === 'DOMICILIARIO' ? driverNameVal : null,
      deliveryFee: Number(document.getElementById('orderDeliveryFee')?.value) || 0,
      discount: Number(document.getElementById('orderDiscount')?.value) || 0,
      deliveryStatus: statusVal,
      orderDate: document.getElementById('orderDateInput').value,
      deliveryDate: finalDeliveryDateVal,
      notes: document.getElementById('orderNotes').value,
      registeredBy: store.currentUser,
    };

    try {
      if (isEditing) {
        await api.updateOrder(orderData.id, orderPayload);
        showToast(`¡Pedido ${orderData.orderNumber} actualizado correctamente! 🥛`);
      } else {
        const newOrder = await api.createOrder(orderPayload);
        showToast(`¡Pedido ${newOrder.orderNumber} registrado con éxito! 🥛`);
      }
      closeModal();
      const contentContainer = document.getElementById('contentContainer');
      if (contentContainer?.querySelector('#ordersListContainer')) {
        loadOrdersList(contentContainer);
      } else if (contentContainer) {
        renderOrders(contentContainer);
      }
    } catch (err) {
      showToast(err.message || 'Error al guardar pedido', 'danger');
    }
  });
}

// Modal de Asignación Rápida de Repartidor / Modalidad de Entrega
export function openAssignDriverModal(order, availableDrivers = []) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  const currentType = order.deliveryType || 'PROPIO';
  const currentDriverId = order.deliveryDriverId || '';

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 440px;">
        <div class="modal-header">
          <h3 class="modal-title">🛵 Modalidad de Entrega: ${order.orderNumber}</h3>
          <button class="modal-close-btn" id="btnCloseAssignModal">✕</button>
        </div>
        <form id="assignDriverForm">
          <div class="modal-body">
            
            <div style="background: var(--bg-app); padding: 12px; border-radius: var(--radius-md); margin-bottom: 14px;">
              <div style="font-weight: 800; color: var(--primary); font-size: 0.95rem;">👤 ${order.customer?.fullName || 'Cliente'}</div>
              <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 2px;">📍 ${order.deliveryAddress || order.customer?.address || 'Fonseca'}</div>
              <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 2px;">🥛 <strong>${order.totalLiters || 1}L</strong> • Saldo a cobrar: <strong style="color: var(--danger);">${formatCOP(order.pendingAmount)}</strong></div>
            </div>

            <div class="form-group">
              <label class="form-label">Modalidad de Entrega *</label>
              <select id="quickDeliveryType" class="form-select" style="font-weight: 700;">
                <option value="PROPIO" ${currentType === 'PROPIO' ? 'selected' : ''}>👤 Entrega Propia (Socios Edier / Yeilin)</option>
                <option value="DOMICILIARIO" ${currentType === 'DOMICILIARIO' ? 'selected' : ''}>🛵 Domicilio con Repartidor</option>
                <option value="LOCAL" ${currentType === 'LOCAL' ? 'selected' : ''}>🏪 Recoge en Local / Tienda</option>
              </select>
            </div>

            <div class="form-group" id="quickDriverGroup" style="${currentType === 'DOMICILIARIO' ? '' : 'display: none;'}">
              <label class="form-label">Repartidor Asignado</label>
              <select id="quickDeliveryDriver" class="form-select" style="font-weight: 700;">
                <option value="">-- Sin asignar (Por definir) --</option>
                ${availableDrivers
                  .map(
                    (d) => `
                  <option value="${d.id}" data-name="${d.name}" ${String(currentDriverId) === String(d.id) ? 'selected' : ''}>
                    🛵 ${d.name} ${d.phone ? `(${d.phone})` : ''}
                  </option>
                `
                  )
                  .join('')}
              </select>
            </div>

          </div>
          <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" class="btn btn-outline" id="btnCancelAssignModal">Cancelar</button>
            <button type="submit" class="btn btn-accent" style="font-weight: 800; padding: 8px 18px;">
              Guardar Modalidad
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseAssignModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelAssignModal')?.addEventListener('click', closeModal);

  const typeSelect = document.getElementById('quickDeliveryType');
  const driverGroup = document.getElementById('quickDriverGroup');
  const driverSelect = document.getElementById('quickDeliveryDriver');

  typeSelect?.addEventListener('change', (e) => {
    if (e.target.value === 'DOMICILIARIO') {
      if (driverGroup) driverGroup.style.display = 'block';
    } else {
      if (driverGroup) driverGroup.style.display = 'none';
      if (driverSelect) driverSelect.value = '';
    }
  });

  document.getElementById('assignDriverForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = typeSelect.value;
    const driverId = driverSelect.value ? Number(driverSelect.value) : null;
    const selectedOpt = driverSelect.selectedOptions[0];
    const driverName = driverId ? (selectedOpt.dataset.name || selectedOpt.text.replace(/^🛵\s*/, '')) : null;

    try {
      if (type === 'DOMICILIARIO' && driverId) {
        await api.assignOrderDriver(order.id, driverId, driverName);
      } else {
        await api.updateOrder(order.id, {
          deliveryType: type,
          deliveryDriverId: type === 'DOMICILIARIO' ? driverId : null,
          deliveryDriverName: type === 'DOMICILIARIO' ? driverName : null,
        });
      }
      showToast('¡Modalidad de entrega actualizada con éxito! 🛵');
      closeModal();
      const contentContainer = document.getElementById('contentContainer');
      if (contentContainer?.querySelector('#ordersListContainer')) {
        loadOrdersList(contentContainer);
      } else if (contentContainer) {
        renderOrders(contentContainer);
      }
    } catch (err) {
      showToast(err.message || 'Error al actualizar modalidad de entrega', 'danger');
    }
  });
}

// Modal de Abono / Pago rápido con desglose individual de medios de pago, edición y anulación
export async function openPaymentModal(orderId, totalAmount, currentPaid, currentPending, onSuccess = null) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  let freshOrder = null;
  let existingPayments = [];
  try {
    freshOrder = await api.getOrderById(orderId);
    if (freshOrder) {
      if (Array.isArray(freshOrder.payments)) {
        existingPayments = freshOrder.payments;
      }
      totalAmount = freshOrder.totalAmount;
      currentPaid = freshOrder.paidAmount;
      currentPending = freshOrder.pendingAmount;
    }
  } catch (e) {
    console.warn('Could not fetch fresh order payments:', e);
  }

  const getMethodBadge = (m) => {
    if (m === 'NEQUI') return '<span class="badge" style="background: #EDE9FE; color: #6D28D9; font-weight: 800; font-size: 0.72rem;">🟣 Nequi</span>';
    if (m === 'BANCOLOMBIA') return '<span class="badge" style="background: #FEF08A; color: #854D0E; font-weight: 800; font-size: 0.72rem;">🟡 Bancolombia</span>';
    if (m === 'TRANSFERENCIA') return '<span class="badge" style="background: #E0F2FE; color: #0369A1; font-weight: 800; font-size: 0.72rem;">💳 Transferencia</span>';
    return '<span class="badge" style="background: #DCFCE7; color: #15803D; font-weight: 800; font-size: 0.72rem;">💵 Efectivo</span>';
  };

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 460px;">
        <div class="modal-header">
          <h3 class="modal-title">💵 Control de Abonos y Pagos</h3>
          <button class="modal-close-btn" id="btnClosePaymentModal">✕</button>
        </div>
        <form id="paymentForm">
          <div class="modal-body">
            
            <!-- Resumen Financiero del Pedido -->
            <div style="background: var(--bg-app); padding: 14px; border-radius: var(--radius-md); margin-bottom: 16px; border: 1px solid var(--border-color);">
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.9rem;">
                <span style="color: var(--text-muted);">Total del Pedido:</span>
                <strong>${formatCOP(totalAmount)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.9rem;">
                <span style="color: var(--text-muted);">Abonado Acumulado:</span>
                <strong style="color: var(--success);">${formatCOP(currentPaid)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.95rem; border-top: 1px dashed var(--border-color); padding-top: 6px; margin-top: 6px;">
                <span style="color: var(--danger); font-weight: 800;">Saldo Pendiente:</span>
                <strong style="color: var(--danger);">${formatCOP(currentPending)}</strong>
              </div>
            </div>

            <!-- Historial de Abonos Realizados con Botones de Edición y Eliminación -->
            ${
              existingPayments.length > 0
                ? `
              <div style="margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); margin: 0;">
                    📋 Historial de Abonos (${existingPayments.length}):
                  </label>
                  <span style="font-size: 0.72rem; color: var(--text-muted);">Puedes editar o anular duplicados</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px; max-height: 160px; overflow-y: auto; background: #FFFFFF; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px;">
                  ${existingPayments
                    .map(
                      (p, idx) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; padding: 6px; border-radius: var(--radius-sm); background: #F8FAFC; border-bottom: ${idx < existingPayments.length - 1 ? '1px dashed #E2E8F0' : 'none'};">
                      <div style="display: flex; flex-direction: column; gap: 2px;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                          ${getMethodBadge(p.paymentMethod)}
                          <strong style="color: var(--text-main);">${formatCOP(p.amount)}</strong>
                        </div>
                        <span style="color: var(--text-muted); font-size: 0.72rem;">📅 ${formatDate(p.paymentDate)} ${p.notes ? `• ${p.notes}` : ''}</span>
                      </div>
                      <div style="display: flex; gap: 4px; align-items: center;">
                        <button type="button" class="btn btn-outline btn-sm btn-edit-order-payment" data-payment-id="${p.id}" data-amount="${p.amount}" data-method="${p.paymentMethod}" data-date="${p.paymentDate ? new Date(p.paymentDate).toISOString().split('T')[0] : ''}" data-notes="${p.notes || ''}" style="padding: 3px 6px; font-size: 0.75rem; color: var(--primary);" title="Editar este abono">✏️</button>
                        <button type="button" class="btn btn-outline btn-sm btn-delete-order-payment" data-payment-id="${p.id}" data-amount="${p.amount}" style="padding: 3px 6px; font-size: 0.75rem; color: var(--danger);" title="Eliminar / Anular este abono">🗑️</button>
                      </div>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              </div>
            `
                : ''
            }

            ${
              currentPending > 0
                ? `
              <div class="form-group">
                <label class="form-label" style="font-weight: 700;">¿Cuánto va a abonar o pagar ahora? ($ COP) *</label>
                <input type="number" inputmode="numeric" id="newPaymentAmount" class="form-input" min="100" max="${currentPending}" value="${currentPending}" required style="font-weight: 800; font-size: 1.05rem;" />
              </div>

              <div class="form-group">
                <label class="form-label" style="font-weight: 700;">Modalidad / Medio de este Pago *</label>
                <select id="newPaymentMethod" class="form-select" required style="font-weight: 700;">
                  <option value="EFECTIVO">💵 Efectivo (Caja Física)</option>
                  <option value="NEQUI" selected>🟣 Transferencia Nequi</option>
                  <option value="BANCOLOMBIA">🟡 Transferencia Bancolombia</option>
                  <option value="TRANSFERENCIA">💳 Otra Transferencia</option>
                </select>
              </div>
            `
                : `
              <div style="background: #F0FDF4; border: 1px solid #BBF7D0; color: #15803D; padding: 12px; border-radius: var(--radius-md); text-align: center; font-weight: 700; font-size: 0.88rem;">
                ✅ ¡Este pedido ya se encuentra totalmente cancelado y al día!
              </div>
            `
            }

          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btnCancelPaymentModal">Cerrar</button>
            ${
              currentPending > 0
                ? `
              <button type="submit" class="btn btn-success" id="btnSubmitPayment" style="font-weight: 800;">
                💰 Confirmar Abono
              </button>
            `
                : ''
            }
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnClosePaymentModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelPaymentModal')?.addEventListener('click', closeModal);

  // Listener para Eliminar Abono
  modalOverlay.querySelectorAll('.btn-delete-order-payment').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const pId = e.currentTarget.dataset.paymentId;
      const amt = Number(e.currentTarget.dataset.amount);
      if (confirm(`¿Estás seguro de eliminar este abono de ${formatCOP(amt)}?\nEsto recalculará el saldo pendiente y el estado del pedido inmediatamente.`)) {
        try {
          await api.deleteOrderPayment(orderId, pId);
          showToast(`¡Abono de ${formatCOP(amt)} eliminado exitosamente! 🗑️`);
          // Re-abrir modal con los datos frescos
          openPaymentModal(orderId, totalAmount, currentPaid, currentPending, onSuccess);
          if (onSuccess) onSuccess();
        } catch (err) {
          showToast(err.message || 'Error al eliminar abono', 'danger');
        }
      }
    });
  });

  // Listener para Editar Abono con Modal Completo
  modalOverlay.querySelectorAll('.btn-edit-order-payment').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pId = Number(e.currentTarget.dataset.paymentId);
      const currAmount = Number(e.currentTarget.dataset.amount) || 0;
      const currMethod = e.currentTarget.dataset.method || 'EFECTIVO';
      const currDate = e.currentTarget.dataset.date || '';
      const currNotes = e.currentTarget.dataset.notes || '';

      openEditOrderPaymentModal(
        orderId,
        { id: pId, amount: currAmount, paymentMethod: currMethod, paymentDate: currDate, notes: currNotes },
        () => {
          openPaymentModal(orderId, totalAmount, currentPaid, currentPending, onSuccess);
          if (onSuccess) onSuccess();
        }
      );
    });
  });

  document.getElementById('paymentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const additionalPaid = Number(document.getElementById('newPaymentAmount')?.value);
    const paymentMethod = document.getElementById('newPaymentMethod')?.value || 'EFECTIVO';
    const submitBtn = document.getElementById('btnSubmitPayment');

    if (!additionalPaid || additionalPaid <= 0) return;

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando... ⏳';
      }

      await api.addOrderPayment(orderId, {
        amount: additionalPaid,
        paymentMethod,
        notes: 'Abono registrado',
      });

      showToast(`¡Abono de ${formatCOP(additionalPaid)} registrado con éxito! 💵✨`);
      closeModal();
      if (onSuccess) {
        onSuccess();
      } else {
        const contentContainer = document.getElementById('contentContainer');
        if (contentContainer?.querySelector('#ordersListContainer')) {
          loadOrdersList(contentContainer);
        } else if (contentContainer) {
          renderOrders(contentContainer);
        }
      }
    } catch (err) {
      showToast(err.message || 'Error al registrar abono', 'danger');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '💰 Confirmar Abono';
      }
    }
  });
}

// Modal dedicado para editar un pago / abono individual de venta (Monto, Medio, Fecha, Notas)
export function openEditOrderPaymentModal(orderId, payment, onDone = null) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  const currentAmount = payment.amount || '';
  const currentMethod = payment.paymentMethod || 'EFECTIVO';
  const currentDate = payment.paymentDate
    ? String(payment.paymentDate).slice(0, 10)
    : getTodayLocalDateStr();
  const currentNotes = payment.notes || '';

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 440px;">
        <div class="modal-header">
          <h3 class="modal-title" style="display: flex; align-items: center; gap: 8px;">
            <span>✏️</span> Editar Pago / Abono de Venta
          </h3>
          <button class="modal-close-btn" id="btnCloseEditPaymentModal">✕</button>
        </div>
        <form id="editPaymentForm">
          <div class="modal-body">
            
            <div class="form-group">
              <label class="form-label" style="font-weight: 700;">Monto del Pago ($ COP) *</label>
              <input type="number" id="editPaymentAmount" class="form-input" min="1" step="any" value="${currentAmount}" required style="font-weight: 800; font-size: 1.1rem;" />
            </div>

            <div class="form-group">
              <label class="form-label" style="font-weight: 700;">Medio / Modalidad de Pago *</label>
              <select id="editPaymentMethod" class="form-select" required style="font-weight: 700;">
                <option value="EFECTIVO" ${currentMethod === 'EFECTIVO' ? 'selected' : ''}>💵 Efectivo (Caja Física)</option>
                <option value="NEQUI" ${currentMethod === 'NEQUI' ? 'selected' : ''}>🟣 Transferencia Nequi</option>
                <option value="BANCOLOMBIA" ${currentMethod === 'BANCOLOMBIA' ? 'selected' : ''}>🟡 Transferencia Bancolombia</option>
                <option value="TRANSFERENCIA" ${currentMethod === 'TRANSFERENCIA' ? 'selected' : ''}>💳 Otra Transferencia</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" style="font-weight: 700;">Fecha del Pago *</label>
              <input type="date" id="editPaymentDate" class="form-input" value="${currentDate}" required />
            </div>

            <div class="form-group">
              <label class="form-label" style="font-weight: 700;">Notas / Observación</label>
              <input type="text" id="editPaymentNotes" class="form-input" placeholder="Ej: Pago total contraentrega / Abono inicial..." value="${currentNotes}" />
            </div>

          </div>
          <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" class="btn btn-outline" id="btnCancelEditPaymentModal">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="btnSubmitEditPayment" style="font-weight: 800;">
              💾 Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseEditPaymentModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelEditPaymentModal')?.addEventListener('click', closeModal);

  document.getElementById('editPaymentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newAmount = Number(document.getElementById('editPaymentAmount').value);
    const newMethod = document.getElementById('editPaymentMethod').value;
    const newDate = document.getElementById('editPaymentDate').value;
    const newNotes = document.getElementById('editPaymentNotes').value;

    if (isNaN(newAmount) || newAmount <= 0) {
      showToast('Ingresa un monto válido mayor a 0', 'danger');
      return;
    }

    const submitBtn = document.getElementById('btnSubmitEditPayment');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Guardando... ⏳';
    }

    try {
      await api.updateOrderPayment(orderId, payment.id, {
        amount: newAmount,
        paymentMethod: newMethod,
        paymentDate: newDate,
        notes: newNotes,
      });
      showToast('¡Pago actualizado correctamente! ✏️✨');
      closeModal();
      if (typeof onDone === 'function') onDone();
    } catch (err) {
      showToast(err.message || 'Error al actualizar pago', 'danger');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '💾 Guardar Cambios';
      }
    }
  });
}


