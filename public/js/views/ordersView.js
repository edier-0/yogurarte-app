import { api } from '../api.js';
import { formatCOP, formatDate, formatDateTime, getTodayLocalDateStr, showToast, store } from '../store.js';
import { paginateArray, renderPaginationHtml, attachPaginationEvents, PAGE_SIZE } from '../components/pagination.js';

let ordersCurrentPage = 1;

let currentFilters = {
  search: '',
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

export async function renderOrders(container) {
  // Cargar lotes disponibles y repartidores para el filtro
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
    <!-- Toolbar de Búsqueda y Filtros Optimizada para PC -->
    <div class="orders-toolbar-card">
      <!-- Fila Principal: Búsqueda, Selector de Calendario y Acciones Principales -->
      <div class="orders-toolbar-main-row">
        <div class="orders-search-group">
          <div class="search-box input-with-icon">
            <span class="input-icon">🔍</span>
            <input 
              type="text" 
              id="orderSearchInput" 
              class="form-input" 
              placeholder="Buscar por cliente, teléfono o dirección..." 
              value="${currentFilters.search}"
            />
          </div>

          <!-- Selector de Calendario por Día Específico -->
          <div class="orders-calendar-picker ${currentFilters.specificDate ? 'has-date' : ''}">
            <label for="selectSpecificDateFilter" style="font-size: 0.84rem; font-weight: 700; color: var(--primary); display: flex; align-items: center; gap: 4px; margin: 0; cursor: pointer;">
              <span>📅 Ver Día:</span>
            </label>
            <input 
              type="date" 
              id="selectSpecificDateFilter" 
              value="${currentFilters.specificDate || ''}" 
              title="Selecciona una fecha en el calendario para ver los pedidos programados para ese día"
            />
            ${
              currentFilters.specificDate
                ? `<button type="button" id="btnClearSpecificDate" style="border: none; background: transparent; cursor: pointer; color: var(--danger); font-weight: 800; font-size: 0.9rem; padding: 0 4px;" title="Quitar filtro de fecha">✕</button>`
                : ''
            }
          </div>
        </div>

        <div class="orders-toolbar-actions">
          <!-- Toggle de Vista: Lista vs Calendario Mensual -->
          <div class="orders-view-toggle">
            <button 
              type="button"
              class="btn ${currentFilters.viewMode === 'list' ? 'btn-primary' : 'btn-outline'}" 
              id="btnToggleListView" 
              title="Ver pedidos en lista de tarjetas"
            >
              📋 Lista
            </button>
            <button 
              type="button"
              class="btn ${currentFilters.viewMode === 'calendar' ? 'btn-primary' : 'btn-outline'}" 
              id="btnToggleCalendarView" 
              title="Ver calendario mensual de entregas"
            >
              📅 Calendario
            </button>
          </div>

          <button class="btn btn-outline" id="btnRescheduleOverdueOrders" style="border-color: #F59E0B; color: #B45309; background: #FEF3C7; font-weight: 700; font-size: 0.85rem;" title="Reprogramar todos los pedidos de días anteriores para entregarse hoy">
            📅 Reprogramar Atrasados a Hoy
          </button>

          <button class="btn btn-accent" id="btnOpenNewOrderModal">
            <span>+</span> Nuevo Pedido
          </button>
        </div>
      </div>

      <!-- Fila de Filtros Jerárquicos de Cobro / Deuda y Orden Rápido -->
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-subtle); align-items: center;">
        <button class="filter-chip ${currentFilters.debtCategory === 'ALL' && currentFilters.sortBy !== 'UPDATED_DESC' ? 'active' : ''}" data-debt-cat="ALL">
          📋 Todos
        </button>
        <button class="filter-chip ${currentFilters.debtCategory === 'DELIVERED_DEBT' ? 'active' : ''}" data-debt-cat="DELIVERED_DEBT" style="${currentFilters.debtCategory === 'DELIVERED_DEBT' ? 'background: #DC2626; color: white;' : 'border-color: #FECACA; color: #DC2626; font-weight: 700;'}">
          🚨 Entregados por Cobrar
        </button>
        <button class="filter-chip ${currentFilters.debtCategory === 'PAID_NOT_DELIVERED' ? 'active' : ''}" data-debt-cat="PAID_NOT_DELIVERED" style="${currentFilters.debtCategory === 'PAID_NOT_DELIVERED' ? 'background: #059669; color: white;' : 'border-color: #A7F3D0; color: #059669; font-weight: 700;'}">
          🟢🥣 Pagados por Entregar
        </button>
        <button class="filter-chip ${currentFilters.debtCategory === 'IN_PROCESS' ? 'active' : ''}" data-debt-cat="IN_PROCESS" style="${currentFilters.debtCategory === 'IN_PROCESS' ? 'background: var(--primary); color: white;' : 'border-color: #DDD6FE; color: var(--primary); font-weight: 700;'}">
          🥣 Encargos por Entregar
        </button>
        <button class="filter-chip ${currentFilters.debtCategory === 'PAID' ? 'active' : ''}" data-debt-cat="PAID" style="${currentFilters.debtCategory === 'PAID' ? 'background: var(--success); color: white;' : 'border-color: #BBF7D0; color: #15803D; font-weight: 700;'}">
          🟢 Totalmente Pagados
        </button>
        <button class="filter-chip ${currentFilters.sortBy === 'UPDATED_DESC' ? 'active' : ''}" id="btnQuickSortUpdated" style="${currentFilters.sortBy === 'UPDATED_DESC' ? 'background: #0f766e; color: white; border-color: #0f766e;' : 'border-color: #99f6e4; color: #0f766e; font-weight: 700;'}" title="Ordenar pedidos desde el más recientemente modificado al más antiguo">
          🔄 Últimos Actualizados
        </button>
      </div>

      <!-- Fila Secundaria: Filtros Rápidos de Fecha, Estados de Entrega, Pago y Ordenamiento -->
      <div class="orders-filters-sub-row" style="margin-top: 10px;">
        <div class="orders-filter-chips">
          <button class="filter-chip ${currentFilters.dateRange === 'ALL' && !currentFilters.specificDate && !currentFilters.month ? 'active' : ''}" data-date="ALL">Todos los Días</button>
          <button class="filter-chip ${currentFilters.dateRange === 'TODAY' ? 'active' : ''}" data-date="TODAY">Hoy</button>
          <button class="filter-chip ${currentFilters.dateRange === 'TOMORROW' ? 'active' : ''}" data-date="TOMORROW">Mañana</button>
          <button class="filter-chip ${currentFilters.dateRange === 'WEEK' ? 'active' : ''}" data-date="WEEK">Esta Semana</button>
        </div>

        <div class="orders-selects-group">
          <!-- Selector de Reparto / Repartidor -->
          <select id="selectDriverFilter" class="orders-select-item" style="font-weight: 700; color: #0284C7;">
            <option value="ALL" ${currentFilters.driverFilter === 'ALL' ? 'selected' : ''}>🛵 Todos los Repartos</option>
            <option value="PROPIO" ${currentFilters.driverFilter === 'PROPIO' ? 'selected' : ''}>👤 Entrega Propia (Socios)</option>
            <option value="LOCAL" ${currentFilters.driverFilter === 'LOCAL' ? 'selected' : ''}>🏪 Recoge en Local</option>
            <option value="UNASSIGNED" ${currentFilters.driverFilter === 'UNASSIGNED' ? 'selected' : ''}>⚠️ Sin Repartidor Asignado</option>
            ${availableDrivers
              .map(
                (d) => `
              <option value="DRIVER_${d.id}" ${currentFilters.driverFilter === `DRIVER_${d.id}` ? 'selected' : ''}>
                🛵 Repartidor: ${d.name}
              </option>
            `
              )
              .join('')}
          </select>

          <!-- Selector de Lote de Producción -->
          <select id="selectBatchFilter" class="orders-select-item" style="font-weight: 700; color: var(--primary);">
            <option value="ALL" ${currentFilters.batchId === 'ALL' ? 'selected' : ''}>🍶 Todos los Lotes</option>
            ${availableBatches
              .map(
                (b) => `
              <option value="${b.id}" ${String(currentFilters.batchId) === String(b.id) ? 'selected' : ''}>
                🍶 ${b.batchCode} - ${b.flavor} ${b.status === 'EN_PROCESO' ? '(En proceso)' : ''}
              </option>
            `
              )
              .join('')}
          </select>

          <!-- Selector de Ordenamiento -->
          <select id="selectOrderSort" class="orders-select-item" style="font-weight: 700; color: var(--primary);">
            <option value="PRIORITY_DEBT" ${currentFilters.sortBy === 'PRIORITY_DEBT' ? 'selected' : ''}>🎯 Prioridad: Deudas de primero</option>
            <option value="UPDATED_DESC" ${currentFilters.sortBy === 'UPDATED_DESC' ? 'selected' : ''}>🔄 Últimos Actualizados (Reciente a antiguo)</option>
            <option value="DATE_DESC" ${currentFilters.sortBy === 'DATE_DESC' ? 'selected' : ''}>📅 Fecha de Entrega (Más reciente)</option>
            <option value="DATE_ASC" ${currentFilters.sortBy === 'DATE_ASC' ? 'selected' : ''}>📅 Fecha de Entrega (Más antigua)</option>
          </select>

          <!-- Selector de Meses -->
          <select id="selectMonthFilter" class="orders-select-item">
            <option value="">📅 Por Mes</option>
            ${monthOptions
              .map((m) => `<option value="${m.val}" ${currentFilters.month === m.val ? 'selected' : ''}>${m.label}</option>`)
              .join('')}
          </select>

          <!-- Filtro por Estado de Entrega -->
          <select id="selectDeliveryFilter" class="orders-select-item">
            <option value="ALL" ${currentFilters.deliveryStatus === 'ALL' ? 'selected' : ''}>🛵 Todas las entregas</option>
            <option value="PENDING" ${currentFilters.deliveryStatus === 'PENDING' ? 'selected' : ''}>🕒 Pendientes</option>
            <option value="PREPARING" ${currentFilters.deliveryStatus === 'PREPARING' ? 'selected' : ''}>🥣 En Preparación</option>
            <option value="READY_FOR_DISPATCH" ${currentFilters.deliveryStatus === 'READY_FOR_DISPATCH' ? 'selected' : ''}>📦 Listos para Despacho</option>
            <option value="IN_ROUTE" ${currentFilters.deliveryStatus === 'IN_ROUTE' ? 'selected' : ''}>🛵 En Ruta</option>
            <option value="DELIVERED" ${currentFilters.deliveryStatus === 'DELIVERED' ? 'selected' : ''}>✅ Entregados</option>
          </select>

          <!-- Filtro por Estado de Pago -->
          <select id="selectPaymentFilter" class="orders-select-item">
            <option value="ALL" ${currentFilters.paymentStatus === 'ALL' ? 'selected' : ''}>💰 Todos los pagos</option>
            <option value="PAID" ${currentFilters.paymentStatus === 'PAID' ? 'selected' : ''}>🟢 Totalmente Pagados</option>
            <option value="PARTIAL" ${currentFilters.paymentStatus === 'PARTIAL' ? 'selected' : ''}>🟡 Con Abono Parcial</option>
            <option value="PENDING" ${currentFilters.paymentStatus === 'PENDING' ? 'selected' : ''}>🔴 Pendientes de Pago</option>
          </select>

          <!-- Botón Limpiar Filtros -->
          <button class="btn btn-sm btn-outline" id="btnClearOrderFilters" style="color: var(--text-muted); border-color: var(--border-color); font-weight: 700; display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; height: 38px; border-radius: var(--radius-sm);" title="Restablecer todos los filtros de pedidos">
            <span>🧹</span> Limpiar Filtros
          </button>
        </div>
      </div>
    </div>

    <!-- Contenedor del Calendario Mensual (si está activo) -->
    <div id="calendarViewSection" style="${currentFilters.viewMode === 'calendar' ? 'display: block;' : 'display: none;'}"></div>

    <!-- Banner informativo de fecha seleccionada -->
    <div id="activeDateBanner"></div>

    <!-- Lista de Pedidos -->
    <div id="ordersListContainer">
      <div style="text-align: center; padding: 30px; color: var(--text-muted);">
        Cargando pedidos... 🥛
      </div>
    </div>
  `;

  // Listener para limpiar filtros
  container.querySelector('#btnClearOrderFilters')?.addEventListener('click', () => {
    currentFilters = {
      search: '',
      debtCategory: 'ALL',
      paymentStatus: 'ALL',
      deliveryStatus: 'ALL',
      driverFilter: 'ALL',
      batchId: 'ALL',
      sortBy: 'PRIORITY_DEBT',
      month: '',
      specificDate: '',
      dateRange: 'ALL',
      minLiters: '',
      viewMode: 'list',
    };
    ordersCurrentPage = 1;
    renderOrders(container);
  });

  // Listeners de la barra de herramientas
  const searchInput = container.querySelector('#orderSearchInput');
  let debounceTimeout;
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      ordersCurrentPage = 1;
      currentFilters.search = e.target.value;
      loadOrdersList(container);
    }, 250);
  });

  // Listeners de filtro de categoría de deuda
  container.querySelectorAll('[data-debt-cat]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      container.querySelectorAll('[data-debt-cat]').forEach((b) => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      ordersCurrentPage = 1;
      currentFilters.debtCategory = e.currentTarget.dataset.debtCat;
      loadOrdersList(container);
    });
  });

  const specificDateInput = container.querySelector('#selectSpecificDateFilter');
  specificDateInput?.addEventListener('change', (e) => {
    const val = e.target.value;
    ordersCurrentPage = 1;
    currentFilters.specificDate = val;
    currentFilters.dateRange = val ? 'CUSTOM' : 'ALL';
    currentFilters.month = '';
    container.querySelectorAll('[data-date]').forEach((b) => b.classList.remove('active'));
    renderOrders(container);
  });

  container.querySelector('#btnClearSpecificDate')?.addEventListener('click', () => {
    ordersCurrentPage = 1;
    currentFilters.specificDate = '';
    currentFilters.dateRange = 'ALL';
    renderOrders(container);
  });

  const monthSelect = container.querySelector('#selectMonthFilter');
  monthSelect?.addEventListener('change', (e) => {
    ordersCurrentPage = 1;
    currentFilters.month = e.target.value;
    if (currentFilters.month) {
      currentFilters.dateRange = 'CUSTOM';
      currentFilters.specificDate = '';
      container.querySelectorAll('[data-date]').forEach((b) => b.classList.remove('active'));
    }
    renderOrders(container);
  });

  container.querySelectorAll('[data-date]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      container.querySelectorAll('[data-date]').forEach((b) => b.classList.remove('active'));
      e.target.classList.add('active');
      ordersCurrentPage = 1;
      currentFilters.dateRange = e.target.dataset.date;
      currentFilters.specificDate = '';
      currentFilters.month = '';
      if (monthSelect) monthSelect.value = '';
      if (specificDateInput) specificDateInput.value = '';
      loadOrdersList(container);
    });
  });

  const driverSelect = container.querySelector('#selectDriverFilter');
  driverSelect?.addEventListener('change', (e) => {
    ordersCurrentPage = 1;
    currentFilters.driverFilter = e.target.value;
    loadOrdersList(container);
  });

  const batchSelect = container.querySelector('#selectBatchFilter');
  batchSelect?.addEventListener('change', (e) => {
    ordersCurrentPage = 1;
    currentFilters.batchId = e.target.value;
    loadOrdersList(container);
  });

  const paymentSelect = container.querySelector('#selectPaymentFilter');
  paymentSelect?.addEventListener('change', (e) => {
    ordersCurrentPage = 1;
    currentFilters.paymentStatus = e.target.value;
    loadOrdersList(container);
  });

  const deliverySelect = container.querySelector('#selectDeliveryFilter');
  deliverySelect?.addEventListener('change', (e) => {
    ordersCurrentPage = 1;
    currentFilters.deliveryStatus = e.target.value;
    loadOrdersList(container);
  });

  const sortSelect = container.querySelector('#selectOrderSort');
  sortSelect?.addEventListener('change', (e) => {
    ordersCurrentPage = 1;
    currentFilters.sortBy = e.target.value;
    const quickBtn = container.querySelector('#btnQuickSortUpdated');
    if (quickBtn) {
      if (currentFilters.sortBy === 'UPDATED_DESC') {
        quickBtn.classList.add('active');
        quickBtn.style.background = '#0f766e';
        quickBtn.style.color = 'white';
      } else {
        quickBtn.classList.remove('active');
        quickBtn.style.background = '';
        quickBtn.style.color = '#0f766e';
      }
    }
    loadOrdersList(container);
  });

  container.querySelector('#btnQuickSortUpdated')?.addEventListener('click', () => {
    ordersCurrentPage = 1;
    if (currentFilters.sortBy === 'UPDATED_DESC') {
      currentFilters.sortBy = 'PRIORITY_DEBT';
    } else {
      currentFilters.sortBy = 'UPDATED_DESC';
    }
    if (sortSelect) sortSelect.value = currentFilters.sortBy;
    renderOrders(container);
  });

  // Toggles de vista
  container.querySelector('#btnToggleListView')?.addEventListener('click', () => {
    currentFilters.viewMode = 'list';
    renderOrders(container);
  });

  container.querySelector('#btnToggleCalendarView')?.addEventListener('click', () => {
    currentFilters.viewMode = 'calendar';
    renderOrders(container);
  });

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

  container.querySelector('#btnOpenNewOrderModal')?.addEventListener('click', () => {
    openOrderModal();
  });

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

    const orders = await api.getOrders(params);
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
          <div style="background: var(--primary-light); border: 1.5px solid var(--primary); padding: 12px 16px; border-radius: var(--radius-md); margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: gap; gap: 10px;">
            <div>
              <div style="color: var(--primary); font-size: 1rem; font-weight: 800; text-transform: capitalize;">
                📅 Entregas Programadas: ${formattedTitle}
              </div>
              <div style="font-size: 0.84rem; color: var(--text-main); margin-top: 2px;">
                Total: <strong>${orders.length} pedido(s)</strong> • <strong>${totalLiters} Litros</strong> • Total a recaudar: <strong>${formatCOP(totalCOP)}</strong>
              </div>
            </div>
            <button class="btn btn-outline btn-sm" id="btnResetDayFilter" style="background: #FFFFFF; font-size: 0.8rem; font-weight: 700;">
              Ver Todos los Pedidos
            </button>
          </div>
        `;

        activeDateBanner.querySelector('#btnResetDayFilter')?.addEventListener('click', () => {
          currentFilters.specificDate = '';
          currentFilters.dateRange = 'ALL';
          renderOrders(container);
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

    const { pageItems, totalPages, totalItems, currentPage } = paginateArray(orders, ordersCurrentPage, 15);
    ordersCurrentPage = currentPage;

    listContainer.innerHTML = `
      <div class="orders-grid">
        ${pageItems.map((o) => createOrderCardHtml(o)).join('')}
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
    renderOrders(mainContainer);
  });

  calendarContainer.querySelectorAll('.calendar-day-cell[data-day]').forEach((cell) => {
    cell.addEventListener('click', () => {
      const selectedDay = cell.dataset.day;
      currentFilters.specificDate = selectedDay;
      currentFilters.dateRange = 'CUSTOM';
      currentFilters.month = '';
      renderOrders(mainContainer);
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
  let waBtnText = `${WA_ICON_SVG} WhatsApp`;
  let waBtnClass = 'btn-whatsapp';

  if (isDeliveredDebt) {
    cardBorder = 'border: 1.5px solid #F87171; background: #FFFDFD; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.08);';
    payBadge = `<span class="badge" style="background: #FEE2E2; color: #DC2626; font-weight: 800; font-size: 0.78rem;">🚨 Entregado • Deuda: ${formatCOP(o.pendingAmount)}</span>`;
    waBtnText = `${WA_ICON_SVG} Recordar Pago`;
  } else if (isPaidNotDelivered) {
    cardBorder = 'border: 1.5px solid #34D399; background: #F0FDF4; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.08);';
    payBadge = `<span class="badge" style="background: #DCFCE7; color: #059669; font-weight: 800; font-size: 0.78rem;">🟢🥣 Pagado • Por Entregar 🛵</span>`;
    waBtnText = `${WA_ICON_SVG} Agradecer Pago`;
    waBtnClass = 'btn-whatsapp';
  } else if (isInProcessPending) {
    cardBorder = 'border: 1.5px solid #DDD6FE; background: #FAF7FC; box-shadow: 0 4px 14px rgba(109, 40, 217, 0.05);';
    if (o.paidAmount > 0) {
      payBadge = `<span class="badge badge-partial">🟡 Encargo (Abonó ${formatCOP(o.paidAmount)})</span>`;
    } else {
      payBadge = `<span class="badge" style="background: #EDE9FE; color: var(--primary); font-weight: 800; font-size: 0.78rem;">🥣 Encargo • Por Entregar</span>`;
    }
    waBtnText = `${WA_ICON_SVG} Info Pedido`;
    waBtnClass = 'btn-primary';
  } else {
    payBadge = '<span class="badge badge-paid">🟢 Totalmente Pagado</span>';
  }

  // Renderizar detalle de ítems múltiples si existen
  let itemsHtml = '';
  if (o.items && o.items.length > 0) {
    itemsHtml = o.items
      .map(
        (i) => `
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-app); padding: 4px 8px; border-radius: var(--radius-sm); font-size: 0.82rem; margin-bottom: 4px;">
          <span>🥛 <strong>${i.quantity}x</strong> Botella ${i.bottleSize} (${i.flavor})</span>
          <strong style="color: var(--primary);">${formatCOP(i.totalPrice)}</strong>
        </div>
      `
      )
      .join('');
  } else {
    itemsHtml = `
      <div class="order-product-badge-group">
        <span class="order-product-liters">🥛 ${o.totalLiters} Litro(s)</span>
        <span class="order-product-flavor">${o.flavor}</span>
        <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">(Envase ${o.bottleSize})</span>
      </div>
    `;
  }

  // Insignia de modalidad de entrega y repartidor
  let deliveryBadge = '';
  if (o.deliveryType === 'LOCAL') {
    deliveryBadge = `<span class="badge" style="background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; font-weight: 800; font-size: 0.73rem; padding: 2px 6px;">🏪 Recoge en Local</span>`;
  } else if (o.deliveryType === 'DOMICILIARIO') {
    if (o.deliveryDriverName) {
      deliveryBadge = `<span class="badge" style="background: #E0F2FE; color: #0369A1; border: 1px solid #BAE6FD; font-weight: 800; font-size: 0.73rem; padding: 2px 6px;">🛵 Repartidor: ${o.deliveryDriverName}</span>`;
    } else {
      deliveryBadge = `<span class="badge" style="background: #FEE2E2; color: #DC2626; border: 1px solid #FECACA; font-weight: 800; font-size: 0.73rem; padding: 2px 6px;">⚠️ Sin Repartidor Asignado</span>`;
    }
  } else {
    deliveryBadge = `<span class="badge" style="background: #EDE9FE; color: #6D28D9; border: 1px solid #DDD6FE; font-weight: 800; font-size: 0.73rem; padding: 2px 6px;">👤 Entrega Propia (Socios)</span>`;
  }

  let deliveryFeeBadge = '';
  if (o.deliveryFee && Number(o.deliveryFee) > 0) {
    deliveryFeeBadge = `<span class="badge" style="background: #E0F2FE; color: #0369A1; border: 1px solid #BAE6FD; font-weight: 800; font-size: 0.73rem; padding: 2px 6px;">🛵 Domicilio: ${formatCOP(o.deliveryFee)}</span>`;
  }

  return `
    <div class="order-card" data-id="${o.id}" style="${cardBorder}">
      <div class="order-card-header">
        <div>
          <span class="order-number">${o.orderNumber}</span>
          <div class="order-date" style="display: flex; flex-direction: column; gap: 2px;">
            <span>📅 Pedido: <strong>${formatDate(o.orderDate)}</strong></span>
            ${o.deliveryDate ? `<span style="color: var(--primary); font-weight: 800; font-size: 0.78rem;">🛵 Entrega: ${formatDate(o.deliveryDate)}</span>` : ''}
            ${o.updatedAt ? `<span style="color: #0f766e; font-size: 0.73rem; font-weight: 700; background: #f0fdfa; padding: 1px 5px; border-radius: 4px; border: 1px solid #ccfbf1; display: inline-block; width: fit-content; margin-top: 2px;" title="Última modificación">🔄 Modificado: ${formatDateTime(o.updatedAt)}</span>` : ''}
          </div>
        </div>
        <div>
          ${payBadge}
        </div>
      </div>

      <div class="order-customer-info">
        <div class="order-customer-name">${o.customer.fullName}</div>
        <div class="order-customer-phone">
          <span>${o.customer.phone && (o.customer.phone.startsWith('@') || /[a-zA-Z]/.test(o.customer.phone)) ? '💬' : '📞'}</span> 
          ${o.customer.phone && (o.customer.phone.startsWith('@') || /[a-zA-Z]/.test(o.customer.phone)) && !o.customer.phone.startsWith('@') ? '@' + o.customer.phone : o.customer.phone}
        </div>
        <div class="order-customer-address">
          <span>📍</span> ${o.deliveryAddress || o.customer.address || 'Fonseca'}
        </div>
        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; align-items: center;">
          ${
            o.batch
              ? `<span class="badge" style="background: #FAF5FF; color: var(--primary); border: 1px solid #DDD6FE; font-size: 0.73rem; font-weight: 800; padding: 2px 6px;">
                  🍶 Lote: ${o.batch.batchCode} (${o.batch.flavor})
                 </span>`
              : `<span class="badge" style="background: #FFFBEB; color: #92400E; border: 1px solid #FCD34D; font-size: 0.73rem; font-weight: 800; padding: 2px 6px;">
                  🥣 Encargo Preventa (Sin lote aún)
                 </span>`
          }
          ${deliveryBadge}
          ${deliveryFeeBadge}
        </div>
      </div>

      <div style="margin: 8px 0;">
        <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">
          Productos (${o.totalLiters}L en total):
        </div>
        ${itemsHtml}
      </div>

      <div class="order-finance-box">
        <div>
          <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Total:</span>
          <div class="order-total-price">${formatCOP(o.totalAmount)}</div>
          ${o.deliveryFee && Number(o.deliveryFee) > 0 ? `<div style="font-size: 0.72rem; color: #0284C7; font-weight: 700;">Incluye ${formatCOP(o.deliveryFee)} de domicilio</div>` : ''}
        </div>
        <div class="order-debt-info">
          ${
            o.pendingAmount > 0
              ? `<span style="font-size: 0.75rem; color: ${isDeliveredDebt ? '#DC2626' : 'var(--primary)'}; font-weight: 700;">${isDeliveredDebt ? '🚨 Saldo Deuda:' : '🥣 Saldo Pendiente:'}</span>
                 <div class="order-debt-amount" style="color: ${isDeliveredDebt ? '#DC2626' : 'var(--primary)'};">${formatCOP(o.pendingAmount)}</div>`
              : `<span style="font-size: 0.8rem; color: var(--success); font-weight: 700;">¡Paz y Salvo! ✨</span>`
          }
        </div>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted);">Estado Entrega:</span>
        <select class="form-select select-delivery-status" data-id="${o.id}" style="width: auto; padding: 4px 10px; font-size: 0.82rem; font-weight: 700;">
          <option value="PENDING" ${o.deliveryStatus === 'PENDING' ? 'selected' : ''}>🕒 Por Entregar (Pendiente)</option>
          <option value="PREPARING" ${o.deliveryStatus === 'PREPARING' ? 'selected' : ''}>🥣 En Preparación</option>
          <option value="READY_FOR_DISPATCH" ${o.deliveryStatus === 'READY_FOR_DISPATCH' ? 'selected' : ''}>📦 Listo para Despacho</option>
          <option value="IN_ROUTE" ${o.deliveryStatus === 'IN_ROUTE' ? 'selected' : ''}>🛵 En Camino (En Ruta)</option>
          <option value="DELIVERED" ${o.deliveryStatus === 'DELIVERED' ? 'selected' : ''}>✅ Entregado</option>
        </select>
      </div>

      ${
        o.notes && o.notes.trim()
          ? `
        <div style="background: var(--bg-app); border-left: 3px solid var(--accent); padding: 6px 10px; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; font-size: 0.82rem; color: var(--text-main); margin-top: 6px;">
          <strong style="color: var(--accent);">📝 Nota:</strong> ${o.notes.trim()}
        </div>
      `
          : ''
      }

      <div class="order-actions">
        ${
          isPaidNotDelivered
            ? `<button class="btn btn-whatsapp btn-sm btn-whatsapp-action" data-id="${o.id}" data-type="THANK_PAYMENT" title="Notificar recepción del pago y agradecer al estilo YogurArte">
                 <span>${WA_ICON_SVG} Agradecer Pago</span>
               </button>
               <button class="btn btn-outline btn-sm btn-whatsapp-action" data-id="${o.id}" data-type="ORDER_INFO" style="color: var(--primary); border-color: var(--primary); font-weight: 700;" title="Enviar información completa y estado actual del pedido">
                 <span>${WA_ICON_SVG} Info Pedido</span>
               </button>`
            : `<button class="btn ${waBtnClass} btn-sm btn-whatsapp-action" data-id="${o.id}" title="Enviar mensaje por WhatsApp">
                 <span>${waBtnText}</span>
               </button>`
        }

        ${
          o.pendingAmount > 0
            ? `<button class="btn ${isDeliveredDebt ? 'btn-accent' : 'btn-outline'} btn-sm btn-payment-action" data-id="${o.id}" data-total="${o.totalAmount}" data-paid="${o.paidAmount}" data-pending="${o.pendingAmount}" title="${isDeliveredDebt ? 'Cobrar saldo de pedido entregado' : 'Registrar abono a encargo'}">
                <span>💵 ${isDeliveredDebt ? 'Cobrar' : 'Abonar'}</span>
               </button>`
            : ''
        }

        <button class="btn btn-outline btn-sm btn-assign-driver-action" data-id="${o.id}" title="Asignar repartidor o cambiar modo de entrega" style="color: #0284C7; border-color: #BAE6FD; font-weight: 700;">
          🛵 Reparto
        </button>

        <button class="btn btn-outline btn-sm btn-edit-order" data-id="${o.id}" title="Editar pedido">
          ✏️ Editar
        </button>

        <button class="btn btn-outline btn-sm btn-delete-order" data-id="${o.id}" title="Eliminar pedido" style="margin-left: auto; color: var(--danger);">
          🗑️
        </button>
      </div>
    </div>
  `;
}

function attachOrderCardEvents(container) {
  // WhatsApp Direct Click
  container.querySelectorAll('.btn-whatsapp-action').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      const type = e.currentTarget.dataset.type || '';
      try {
        const res = await api.getWhatsAppLink(id, type);
        if (res.whatsappUrl) {
          window.open(res.whatsappUrl, '_blank');
        }
      } catch (err) {
        showToast('Error al generar enlace de WhatsApp', 'danger');
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
          renderOrders(document.getElementById('contentContainer'));
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

  const defaultDeliveryType = isEditing ? (orderData.deliveryType || 'PROPIO') : 'PROPIO';
  const defaultDeliveryDriverId = isEditing ? (orderData.deliveryDriverId || '') : '';
  const defaultDeliveryFee = isEditing ? (orderData.deliveryFee || 0) : 0;

  // Función para encontrar el mejor lote activo disponible para un sabor con stock disponible
  const findBestBatchForFlavor = (targetFlavor) => {
    if (!targetFlavor || !availableBatches || availableBatches.length === 0) return null;
    const tf = targetFlavor.toLowerCase().trim();

    // Prioridad: Lote del mismo sabor con litros disponibles (> 0) y no agotado/descartado
    const withLiters = availableBatches.filter(
      (b) => (b.flavor || '').toLowerCase().trim() === tf &&
             b.status !== 'AGOTADO' &&
             b.status !== 'DESCARTADO' &&
             (b.remainingAvailableLiters === undefined || b.remainingAvailableLiters > 0)
    );
    if (withLiters.length > 0) return withLiters[0];

    // Si no hay lotes con litros disponibles, retornar null para que quede como preventa
    return null;
  };

  const initialBatchId = orderData?.batchId || (orderData?.batch?.id) || '';
  let initialBatchObj = availableBatches.find((b) => b.id === Number(initialBatchId));

  // Si no es edición y no se pasó un lote específico, auto-seleccionar solo si hay un lote con litros disponibles
  if (!isEditing && !initialBatchId && availableBatches.length > 0) {
    const firstAvailable = availableBatches.find(
      (b) => b.status !== 'AGOTADO' && b.status !== 'DESCARTADO' && (b.remainingAvailableLiters === undefined || b.remainingAvailableLiters > 0)
    );
    if (firstAvailable) {
      initialBatchObj = findBestBatchForFlavor(firstAvailable.flavor) || firstAvailable;
    }
  }

  const effectiveInitialBatchId = initialBatchObj ? String(initialBatchObj.id) : (initialBatchId ? String(initialBatchId) : '');
  let currentBatchPrice1L = initialBatchObj?.price1L || (orderData?.batch?.price1L) || 10000;
  let currentBatchPrice2L = initialBatchObj?.price2L || (orderData?.batch?.price2L) || 20000;

  // Lista inicial de ítems
  let initialItems = [
    { bottleSize: '1L', flavor: initialBatchObj?.flavor || 'Natural', quantity: 1, unitPrice: currentBatchPrice1L },
  ];

  if (isEditing && orderData.items && orderData.items.length > 0) {
    initialItems = orderData.items.map((i) => ({
      bottleSize: i.bottleSize,
      flavor: i.flavor,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    }));
  } else if (isEditing) {
    initialItems = [
      {
        bottleSize: orderData.bottleSize || '1L',
        flavor: orderData.flavor || (initialBatchObj?.flavor || 'Natural'),
        quantity: orderData.quantityBottles || 1,
        unitPrice: orderData.unitPrice || currentBatchPrice1L,
      },
    ];
  }

  modalOverlay.innerHTML = `
    <div class="modal-overlay active" id="orderModal">
      <div class="modal-card" style="max-width: 580px;">
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

            <!-- Modalidad de Entrega, Asignación de Repartidor y Valor del Domicilio -->
            <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: var(--radius-md); padding: 12px; margin-bottom: 14px;">
              <div class="form-row" style="margin-bottom: 8px;">
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

              <!-- Campo para el valor del servicio de domicilio -->
              <div class="form-group" id="deliveryFeeGroup" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 0.84rem; font-weight: 800; color: #0369A1; display: flex; justify-content: space-between; align-items: center;">
                  <span>🛵 Valor del Domicilio ($ COP)</span>
                  <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">(Si aplica, se suma al total a cobrar)</span>
                </label>
                <input 
                  type="number" 
                  id="orderDeliveryFee" 
                  class="form-input" 
                  min="0" 
                  step="any" 
                  value="${defaultDeliveryFee}" 
                  placeholder="0 si es gratis o entrega en local" 
                  style="font-weight: 800; font-size: 0.95rem; color: #0369A1;" 
                />
              </div>
            </div>

            <!-- Selector de Lote de Producción (Opcional/Recomendado) -->
            <div style="background: #FAF5FF; border: 1.5px solid #DDD6FE; border-radius: var(--radius-md); padding: 10px 12px; margin-bottom: 14px;">
              <label class="form-label" style="font-size: 0.85rem; font-weight: 800; color: var(--primary); margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center;">
                <span>🍶 Lote de Producción (Escoge de dónde vendes)</span>
                <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">Auto-asignado por sabor</span>
              </label>
              <select id="orderBatchSelect" class="form-select" style="font-size: 0.85rem; font-weight: 700; color: var(--text-main);">
                <option value="" data-price1l="10000" data-price2l="20000" data-flavor="">-- 🥣 Encargo Preventa (Sin lote aún - Se vinculará al producir) --</option>
                ${availableBatches
                  .map(
                    (b) => {
                      const litersText = b.remainingAvailableLiters !== undefined ? ` • ${b.remainingAvailableLiters}L disp.` : '';
                      const isSelected = String(effectiveInitialBatchId) === String(b.id);
                      return `
                  <option value="${b.id}" data-price1l="${b.price1L || 10000}" data-price2l="${b.price2L || 20000}" data-flavor="${b.flavor}" ${isSelected ? 'selected' : ''}>
                    🍶 ${b.batchCode} • ${b.flavor}${litersText} (1L: ${formatCOP(b.price1L || 10000)} • 2L: ${formatCOP(b.price2L || 20000)}) ${b.status === 'AGOTADO' ? '⚠️ Agotado' : '✅'}
                  </option>
                `;
                    }
                  )
                  .join('')}
              </select>
              <div id="batchHintDisplay" style="font-size: 0.75rem; color: ${effectiveInitialBatchId ? '#15803D' : 'var(--text-muted)'}; margin-top: 4px;">
                ${effectiveInitialBatchId && initialBatchObj ? `✨ Vinculado automáticamente a: <strong>${initialBatchObj.batchCode} (${initialBatchObj.flavor}${initialBatchObj.remainingAvailableLiters !== undefined ? ` • ${initialBatchObj.remainingAvailableLiters}L disp.` : ''})</strong>` : '💡 Al seleccionar o cambiar el sabor, se vinculará automáticamente al lote activo con litros disponibles.'}
              </div>
            </div>

            <!-- Sección de Múltiples Productos en el Pedido -->
            <div style="background: var(--bg-app); border: 1.5px solid var(--border-color); border-radius: var(--radius-md); padding: 12px; margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <label style="font-size: 0.9rem; font-weight: 800; color: var(--primary); margin: 0;">
                  🛒 Productos en este Pedido
                </label>
                <button type="button" class="btn btn-outline btn-sm" id="btnAddOrderItem" style="font-size: 0.78rem; padding: 4px 10px;">
                  + Agregar Otro Producto
                </button>
              </div>

              <div id="orderItemsContainer" style="display: flex; flex-direction: column; gap: 8px;"></div>
            </div>

            <!-- Resumen Financiero y Litros -->
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Total Litros</label>
                <input type="text" id="orderTotalLitersDisplay" class="form-input" value="1 Litro" disabled style="background: var(--bg-subtle); font-weight: 800; color: var(--primary);" />
              </div>

              <div class="form-group">
                <label class="form-label" style="display: flex; justify-content: space-between; align-items: center;">
                  <span>Total a Cobrar ($ COP) *</span>
                  <span id="orderSubtotalBreakdown" style="font-size: 0.73rem; color: var(--primary); font-weight: 700;"></span>
                </label>
                <input type="number" id="orderTotalAmount" class="form-input" value="${(initialItems.reduce((s, i) => s + (i.quantity * i.unitPrice), 0) + defaultDeliveryFee) || 10000}" required style="font-weight: 800; color: var(--primary); font-size: 1.05rem;" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Monto Abonado / Pagado ($ COP)</label>
                <input type="number" id="orderPaidAmount" class="form-input" value="${defaultPaid}" min="0" placeholder="0 si no ha pagado" />
              </div>

              <div class="form-group">
                <label class="form-label">Modalidad de Pago</label>
                <select id="orderPaymentMethod" class="form-select" style="font-weight: 700;">
                  <option value="EFECTIVO" ${defaultPaymentMethod === 'EFECTIVO' ? 'selected' : ''}>💵 Efectivo</option>
                  <option value="NEQUI" ${defaultPaymentMethod === 'NEQUI' ? 'selected' : ''}>🟣 Transferencia Nequi</option>
                  <option value="BANCOLOMBIA" ${defaultPaymentMethod === 'BANCOLOMBIA' ? 'selected' : ''}>🟡 Transferencia Bancolombia</option>
                  <option value="TRANSFERENCIA" ${defaultPaymentMethod === 'TRANSFERENCIA' ? 'selected' : ''}>💳 Otra Transferencia</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Saldo Pendiente Calculado</label>
              <input type="text" id="orderPendingDisplay" class="form-input" value="$10.000 COP" disabled style="background: var(--bg-subtle); font-weight: 800; color: var(--danger);" />
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
  const totalLitersDisplay = document.getElementById('orderTotalLitersDisplay');
  const totalInput = document.getElementById('orderTotalAmount');
  const paidInput = document.getElementById('orderPaidAmount');
  const pendingDisplay = document.getElementById('orderPendingDisplay');
  const batchSelect = document.getElementById('orderBatchSelect');
  const batchHintDisplay = document.getElementById('batchHintDisplay');
  const deliveryTypeSelect = document.getElementById('orderDeliveryType');
  const driverSelectGroup = document.getElementById('driverSelectGroup');
  const driverSelect = document.getElementById('orderDeliveryDriver');
  const deliveryFeeInput = document.getElementById('orderDeliveryFee');
  const subtotalBreakdownDisplay = document.getElementById('orderSubtotalBreakdown');
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
    recalculateOrderTotals();
  });

  // Función para renderizar una fila de producto
  function addProductRow(item = { bottleSize: '1L', flavor: 'Natural', quantity: 1, unitPrice: currentBatchPrice1L }) {
    const row = document.createElement('div');
    row.className = 'order-item-row';
    row.style.cssText = 'display: flex; gap: 6px; align-items: center; background: #FFFFFF; padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);';

    const itemPrice = item.bottleSize === '2L' ? currentBatchPrice2L : currentBatchPrice1L;

    row.innerHTML = `
      <select class="form-select item-size" style="flex: 1.4; font-size: 0.82rem; padding: 6px 8px;">
        <option value="1L" ${item.bottleSize === '1L' ? 'selected' : ''}>1 Litro (${formatCOP(currentBatchPrice1L)})</option>
        <option value="2L" ${item.bottleSize === '2L' ? 'selected' : ''}>2 Litros (${formatCOP(currentBatchPrice2L)})</option>
      </select>

      <select class="form-select item-flavor" style="flex: 1.4; font-size: 0.82rem; padding: 6px 8px;">
        <option value="Natural" ${item.flavor === 'Natural' ? 'selected' : ''}>Natural</option>
        <option value="Fresa" ${item.flavor === 'Fresa' ? 'selected' : ''}>Fresa</option>
        <option value="Melocotón" ${item.flavor === 'Melocotón' ? 'selected' : ''}>Melocotón</option>
        <option value="Mora" ${item.flavor === 'Mora' ? 'selected' : ''}>Mora</option>
        <option value="Maracuyá" ${item.flavor === 'Maracuyá' ? 'selected' : ''}>Maracuyá</option>
      </select>

      <input type="number" class="form-input item-qty" min="1" value="${item.quantity || 1}" style="width: 55px; text-align: center; font-weight: 700; padding: 6px 4px;" title="Cantidad de botellas" />

      <span class="item-subtotal-display" style="font-size: 0.82rem; font-weight: 800; color: var(--primary); min-width: 65px; text-align: right;">
        ${formatCOP((item.quantity || 1) * itemPrice)}
      </span>

      <button type="button" class="btn btn-outline btn-sm btn-remove-item" style="color: var(--danger); padding: 4px 8px; font-size: 0.85rem;" title="Quitar producto">
        ✕
      </button>
    `;

    const sizeSelect = row.querySelector('.item-size');
    const flavorSelect = row.querySelector('.item-flavor');
    const qtyInput = row.querySelector('.item-qty');
    const removeBtn = row.querySelector('.btn-remove-item');

    const updateRow = () => {
      recalculateOrderTotals();
    };

    sizeSelect.addEventListener('change', updateRow);
    qtyInput.addEventListener('input', updateRow);

    // Auto-vincular lote cuando el usuario cambia el sabor del producto
    flavorSelect.addEventListener('change', (e) => {
      const selectedFlavor = e.target.value;
      
      const allRows = itemsContainer.querySelectorAll('.order-item-row');
      const allFlavors = Array.from(allRows).map((r) => r.querySelector('.item-flavor')?.value);
      const isSingleFlavor = allFlavors.every((f) => f === selectedFlavor);

      if (isSingleFlavor || allRows.length === 1) {
        const bestBatch = findBestBatchForFlavor(selectedFlavor);
        if (bestBatch) {
          batchSelect.value = String(bestBatch.id);
          currentBatchPrice1L = Number(bestBatch.price1L) || 10000;
          currentBatchPrice2L = Number(bestBatch.price2L) || 20000;

          // Actualizar etiquetas de tamaño en todas las filas
          itemsContainer.querySelectorAll('.order-item-row').forEach((r) => {
            const sz = r.querySelector('.item-size');
            if (sz) {
              const opt1 = sz.querySelector('option[value="1L"]');
              const opt2 = sz.querySelector('option[value="2L"]');
              if (opt1) opt1.textContent = `1 Litro (${formatCOP(currentBatchPrice1L)})`;
              if (opt2) opt2.textContent = `2 Litros (${formatCOP(currentBatchPrice2L)})`;
            }
          });

          if (batchHintDisplay) {
            const litersInfo = bestBatch.remainingAvailableLiters !== undefined ? ` • ${bestBatch.remainingAvailableLiters}L disponibles` : '';
            batchHintDisplay.innerHTML = `✨ Lote cambiado automáticamente a: <strong>${bestBatch.batchCode} (${bestBatch.flavor}${litersInfo})</strong>. Si deseas otro lote, puedes cambiarlo arriba.`;
            batchHintDisplay.style.color = '#15803D';
          }
          showToast(`🍶 Lote asignado: ${bestBatch.batchCode} (${bestBatch.flavor})`, 'info');
        } else {
          batchSelect.value = '';
          if (batchHintDisplay) {
            batchHintDisplay.innerHTML = `🥣 No hay lotes activos con litros disponibles de sabor <strong>${selectedFlavor}</strong>. Quedará registrado como encargo preventa.`;
            batchHintDisplay.style.color = 'var(--text-muted)';
          }
        }
      }
      recalculateOrderTotals();
    });

    removeBtn.addEventListener('click', () => {
      const allRows = itemsContainer.querySelectorAll('.order-item-row');
      if (allRows.length > 1) {
        row.remove();
        recalculateOrderTotals();
      } else {
        showToast('El pedido debe tener al menos 1 producto', 'warning');
      }
    });

    itemsContainer.appendChild(row);
    recalculateOrderTotals();
  }

  // Recalcular todos los productos y costo de domicilio
  function recalculateOrderTotals() {
    let sumLiters = 0;
    let sumProductsTotal = 0;

    itemsContainer.querySelectorAll('.order-item-row').forEach((row) => {
      const size = row.querySelector('.item-size').value;
      const qty = Number(row.querySelector('.item-qty').value) || 1;
      const unitPrice = size === '2L' ? currentBatchPrice2L : currentBatchPrice1L;
      const rowTotal = qty * unitPrice;
      const rowLiters = size === '2L' ? qty * 2 : qty * 1;

      sumLiters += rowLiters;
      sumProductsTotal += rowTotal;

      const subDisplay = row.querySelector('.item-subtotal-display');
      if (subDisplay) subDisplay.textContent = formatCOP(rowTotal);
    });

    const fee = Number(deliveryFeeInput?.value) || 0;
    const grandTotal = sumProductsTotal + fee;

    totalLitersDisplay.value = `${sumLiters} Litro(s)`;
    totalInput.value = grandTotal;

    if (subtotalBreakdownDisplay) {
      if (fee > 0) {
        subtotalBreakdownDisplay.textContent = `(Prod: ${formatCOP(sumProductsTotal)} + Dom: ${formatCOP(fee)})`;
      } else {
        subtotalBreakdownDisplay.textContent = `(Solo productos)`;
      }
    }

    const paid = Number(paidInput.value) || 0;
    const pending = Math.max(0, grandTotal - paid);
    pendingDisplay.value = formatCOP(pending);

    // Validar capacidad de lote en tiempo real en el hint
    if (batchSelect && batchSelect.value && batchHintDisplay) {
      const selectedOpt = batchSelect.selectedOptions[0];
      const chosenBatch = availableBatches.find((b) => b.id === Number(batchSelect.value));
      if (chosenBatch && chosenBatch.totalLitersProduced !== undefined) {
        const isSameBatch = isEditing && String(orderData?.batchId) === String(batchSelect.value);
        const previousOrderLiters = isSameBatch ? (orderData?.totalLiters || 0) : 0;
        const remainingLiters = chosenBatch.remainingAvailableLiters !== undefined ? chosenBatch.remainingAvailableLiters : chosenBatch.totalLitersProduced;
        const availableLitersForOrder = Math.max(0, remainingLiters + previousOrderLiters);

        if (sumLiters > availableLitersForOrder) {
          batchHintDisplay.innerHTML = `🚨 <strong>Capacidad excedida:</strong> El lote tiene ${availableLitersForOrder}L disponibles, pero este pedido requiere ${sumLiters}L (máximo producido: ${chosenBatch.totalLitersProduced}L).`;
          batchHintDisplay.style.color = '#DC2626';
        } else {
          batchHintDisplay.innerHTML = `✅ Lote seleccionado: <strong>${selectedOpt ? selectedOpt.text.replace(/^[🍶\s]*/, '') : ''}</strong>. Precios: 1L: ${formatCOP(currentBatchPrice1L)} • 2L: ${formatCOP(currentBatchPrice2L)}`;
          batchHintDisplay.style.color = '#15803D';
        }
      }
    }
  }

  // Listener para cambio de lote de producción
  batchSelect?.addEventListener('change', (e) => {
    const selectedOpt = e.target.selectedOptions[0];
    if (selectedOpt && selectedOpt.value) {
      currentBatchPrice1L = Number(selectedOpt.dataset.price1l) || 10000;
      currentBatchPrice2L = Number(selectedOpt.dataset.price2l) || 20000;
      const batchFlavor = selectedOpt.dataset.flavor;

      // Actualizar texto en los select de tamaño
      itemsContainer.querySelectorAll('.order-item-row').forEach((row) => {
        const sizeSelect = row.querySelector('.item-size');
        if (sizeSelect) {
          const opt1L = sizeSelect.querySelector('option[value="1L"]');
          const opt2L = sizeSelect.querySelector('option[value="2L"]');
          if (opt1L) opt1L.textContent = `1 Litro (${formatCOP(currentBatchPrice1L)})`;
          if (opt2L) opt2L.textContent = `2 Litros (${formatCOP(currentBatchPrice2L)})`;
        }

        // Si el lote tiene un sabor específico y el ítem está en Natural, sugerir el sabor del lote
        if (batchFlavor) {
          const flavorSelect = row.querySelector('.item-flavor');
          if (flavorSelect && (flavorSelect.value === 'Natural' || itemsContainer.querySelectorAll('.order-item-row').length === 1)) {
            flavorSelect.value = batchFlavor;
          }
        }
      });
    } else {
      if (batchHintDisplay) {
        batchHintDisplay.innerHTML = `💡 Al seleccionar un lote, se aplicarán automáticamente sus precios de venta configurados.`;
        batchHintDisplay.style.color = 'var(--text-muted)';
      }
    }
    recalculateOrderTotals();
  });

  // Inicializar filas existentes
  initialItems.forEach((it) => addProductRow(it));

  // Botón para agregar más productos
  document.getElementById('btnAddOrderItem')?.addEventListener('click', () => {
    const selectedBatchFlavor = batchSelect?.selectedOptions[0]?.dataset?.flavor || 'Natural';
    addProductRow({ bottleSize: '1L', flavor: selectedBatchFlavor, quantity: 1, unitPrice: currentBatchPrice1L });
    if (modalBody) {
      setTimeout(() => {
        modalBody.scrollTo({ top: modalBody.scrollHeight / 2, behavior: 'smooth' });
      }, 50);
    }
  });

  paidInput?.addEventListener('input', () => {
    const total = Number(totalInput.value) || 0;
    const paid = Number(paidInput.value) || 0;
    const pending = Math.max(0, total - paid);
    pendingDisplay.value = formatCOP(pending);
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
      // Retardo pequeño para permitir que el clic en una sugerencia se procese primero
      setTimeout(() => {
        const phone = (phoneInput.value || '').trim();
        // Solo autocompletar si el campo de nombre aún está vacío Y es una coincidencia exacta inequívoca
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

    let selectedBatchId = batchSelect?.value || null;

    // Recoger todos los ítems de las filas
    const items = [];
    itemsContainer.querySelectorAll('.order-item-row').forEach((row) => {
      const size = row.querySelector('.item-size').value;
      const flavor = row.querySelector('.item-flavor').value;
      const qty = Number(row.querySelector('.item-qty').value) || 1;
      const unitPrice = size === '2L' ? currentBatchPrice2L : currentBatchPrice1L;
      items.push({
        batchId: selectedBatchId ? Number(selectedBatchId) : null,
        bottleSize: size,
        flavor,
        quantity: qty,
        unitPrice,
      });
    });

    // Validar concordancia de sabor entre el lote seleccionado y los productos
    if (selectedBatchId) {
      const chosenBatch = availableBatches.find((b) => b.id === Number(selectedBatchId));
      if (chosenBatch && chosenBatch.flavor) {
        const batchFlavorNorm = (chosenBatch.flavor || '').toLowerCase().trim();
        const itemFlavors = items.map((it) => (it.flavor || '').toLowerCase().trim());
        const isMismatched = itemFlavors.length > 0 && itemFlavors.every((f) => f !== batchFlavorNorm);

        if (isMismatched) {
          const productFlavorsStr = Array.from(new Set(items.map((it) => it.flavor))).join(', ');
          const correctBatch = findBestBatchForFlavor(items[0].flavor);
          if (correctBatch) {
            selectedBatchId = String(correctBatch.id);
            if (batchSelect) batchSelect.value = selectedBatchId;
            items.forEach((it) => { it.batchId = Number(selectedBatchId); });
            showToast(`⚠️ El lote se ajustó a "${correctBatch.batchCode} (${correctBatch.flavor})" para coincidir con el sabor (${productFlavorsStr}).`, 'info');
          } else {
            // Pasar a preventa sin lote
            selectedBatchId = null;
            if (batchSelect) batchSelect.value = '';
            items.forEach((it) => { it.batchId = null; });
            showToast(`🥣 Como no hay lotes con stock de "${productFlavorsStr}", el pedido se registrará como Encargo Preventa (Sin lote).`, 'info');
          }
        }
      }
    }

    // Validar capacidad máxima del lote seleccionado (solo si tiene lote asignado)
    if (selectedBatchId) {
      const chosenBatch = availableBatches.find((b) => b.id === Number(selectedBatchId));
      if (chosenBatch && chosenBatch.totalLitersProduced !== undefined) {
        const orderLiters = items.reduce((sum, it) => sum + (it.bottleSize === '2L' ? it.quantity * 2 : it.quantity * 1), 0);
        const isSameBatch = isEditing && String(orderData?.batchId) === String(selectedBatchId);
        const previousOrderLiters = isSameBatch ? (orderData?.totalLiters || 0) : 0;
        const remainingLiters = chosenBatch.remainingAvailableLiters !== undefined ? chosenBatch.remainingAvailableLiters : chosenBatch.totalLitersProduced;
        const availableLitersForOrder = Math.max(0, remainingLiters + previousOrderLiters);

        if (orderLiters > availableLitersForOrder) {
          showToast(`⚠️ Capacidad excedida: El lote "${chosenBatch.batchCode}" solo tiene ${availableLitersForOrder}L disponibles (este pedido requiere ${orderLiters}L). Selecciona otro lote o déjalo en Encargo Preventa.`, 'warning');
          return;
        }
      }
    } else {
      // Asegurar que todos los ítems tengan batchId null si es preventa
      items.forEach((it) => { it.batchId = null; });
    }

    const total = Number(totalInput.value) || 10000;
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
      batchId: selectedBatchId ? Number(selectedBatchId) : null,
      items,
      totalAmount: total,
      paidAmount: paid,
      paymentMethod: document.getElementById('orderPaymentMethod')?.value || 'EFECTIVO',
      deliveryType,
      deliveryDriverId: deliveryType === 'DOMICILIARIO' ? driverIdVal : null,
      deliveryDriverName: deliveryType === 'DOMICILIARIO' ? driverNameVal : null,
      deliveryFee: Number(document.getElementById('orderDeliveryFee')?.value) || 0,
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
      renderOrders(document.getElementById('contentContainer'));
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
      if (contentContainer) renderOrders(contentContainer);
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
                <input type="number" id="newPaymentAmount" class="form-input" min="100" max="${currentPending}" value="${currentPending}" required style="font-weight: 800; font-size: 1.05rem;" />
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
        if (contentContainer) renderOrders(contentContainer);
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


