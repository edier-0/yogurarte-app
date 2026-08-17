import { api } from '../api.js';
import { formatCOP, formatDate, getTodayLocalDateStr, showToast, store } from '../store.js';

let currentFilters = {
  search: '',
  paymentStatus: 'ALL',
  deliveryStatus: 'ALL',
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

export async function renderOrders(container) {
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

          <button class="btn btn-accent" id="btnOpenNewOrderModal">
            <span>+</span> Nuevo Pedido
          </button>
        </div>
      </div>

      <!-- Fila Secundaria: Filtros Rápidos de Fecha, Estados de Entrega y Pago -->
      <div class="orders-filters-sub-row">
        <div class="orders-filter-chips">
          <button class="filter-chip ${currentFilters.dateRange === 'ALL' && !currentFilters.specificDate && !currentFilters.month ? 'active' : ''}" data-date="ALL">Todos</button>
          <button class="filter-chip ${currentFilters.dateRange === 'TODAY' ? 'active' : ''}" data-date="TODAY">Hoy</button>
          <button class="filter-chip ${currentFilters.dateRange === 'TOMORROW' ? 'active' : ''}" data-date="TOMORROW">Mañana</button>
          <button class="filter-chip ${currentFilters.dateRange === 'WEEK' ? 'active' : ''}" data-date="WEEK">Esta Semana</button>
        </div>

        <div class="orders-selects-group">
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

  // Listeners de la barra de herramientas
  const searchInput = container.querySelector('#orderSearchInput');
  let debounceTimeout;
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      currentFilters.search = e.target.value;
      loadOrdersList(container);
    }, 250);
  });

  const specificDateInput = container.querySelector('#selectSpecificDateFilter');
  specificDateInput?.addEventListener('change', (e) => {
    const val = e.target.value;
    currentFilters.specificDate = val;
    currentFilters.dateRange = val ? 'CUSTOM' : 'ALL';
    currentFilters.month = '';
    container.querySelectorAll('[data-date]').forEach((b) => b.classList.remove('active'));
    renderOrders(container);
  });

  container.querySelector('#btnClearSpecificDate')?.addEventListener('click', () => {
    currentFilters.specificDate = '';
    currentFilters.dateRange = 'ALL';
    renderOrders(container);
  });

  const monthSelect = container.querySelector('#selectMonthFilter');
  monthSelect?.addEventListener('change', (e) => {
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
      currentFilters.dateRange = e.target.dataset.date;
      currentFilters.specificDate = '';
      currentFilters.month = '';
      if (monthSelect) monthSelect.value = '';
      if (specificDateInput) specificDateInput.value = '';
      loadOrdersList(container);
    });
  });

  const paymentSelect = container.querySelector('#selectPaymentFilter');
  paymentSelect?.addEventListener('change', (e) => {
    currentFilters.paymentStatus = e.target.value;
    loadOrdersList(container);
  });

  const deliverySelect = container.querySelector('#selectDeliveryFilter');
  deliverySelect?.addEventListener('change', (e) => {
    currentFilters.deliveryStatus = e.target.value;
    loadOrdersList(container);
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
      paymentStatus: currentFilters.paymentStatus,
      deliveryStatus: currentFilters.deliveryStatus,
      month: currentFilters.month,
    };

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
          <div class="empty-state-text">No hay pedidos registrados con los filtros de fecha o búsqueda aplicados.</div>
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
    `;

    // Asignar eventos a las tarjetas de pedidos
    attachOrderCardEvents(listContainer);
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

function createOrderCardHtml(o) {
  let payBadge = '<span class="badge badge-pending">🔴 Pendiente de Pago</span>';
  if (o.paymentStatus === 'PAID') {
    payBadge = '<span class="badge badge-paid">🟢 Totalmente Pagado</span>';
  } else if (o.paymentStatus === 'PARTIAL') {
    payBadge = `<span class="badge badge-partial">🟡 Abonó ${formatCOP(o.paidAmount)}</span>`;
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

  return `
    <div class="order-card" data-id="${o.id}">
      <div class="order-card-header">
        <div>
          <span class="order-number">${o.orderNumber}</span>
          <div class="order-date" style="display: flex; flex-direction: column; gap: 2px;">
            <span>📅 Pedido: <strong>${formatDate(o.orderDate)}</strong></span>
            ${o.deliveryDate ? `<span style="color: var(--primary); font-weight: 800; font-size: 0.78rem;">🛵 Entrega: ${formatDate(o.deliveryDate)}</span>` : ''}
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
        </div>
        <div class="order-debt-info">
          ${
            o.pendingAmount > 0
              ? `<span style="font-size: 0.75rem; color: var(--danger); font-weight: 700;">Saldo Pendiente:</span>
                 <div class="order-debt-amount">${formatCOP(o.pendingAmount)}</div>`
              : `<span style="font-size: 0.8rem; color: var(--success); font-weight: 700;">¡Paz y Salvo! ✨</span>`
          }
        </div>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted);">Estado Entrega:</span>
        <select class="form-select select-delivery-status" data-id="${o.id}" style="width: auto; padding: 4px 10px; font-size: 0.82rem;">
          <option value="PENDING" ${o.deliveryStatus === 'PENDING' ? 'selected' : ''}>🕒 Pendiente</option>
          <option value="PREPARING" ${o.deliveryStatus === 'PREPARING' ? 'selected' : ''}>🥣 En Preparación</option>
          <option value="IN_ROUTE" ${o.deliveryStatus === 'IN_ROUTE' ? 'selected' : ''}>🛵 En Ruta</option>
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
        <button class="btn btn-whatsapp btn-sm btn-whatsapp-action" data-id="${o.id}" title="Enviar mensaje por WhatsApp">
          <span>📲 WhatsApp</span>
        </button>

        ${
          o.pendingAmount > 0
            ? `<button class="btn btn-primary btn-sm btn-payment-action" data-id="${o.id}" data-total="${o.totalAmount}" data-paid="${o.paidAmount}" data-pending="${o.pendingAmount}" title="Registrar abono o pago">
                <span>💵 Abonar</span>
               </button>`
            : ''
        }

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
      try {
        const res = await api.getWhatsAppLink(id);
        if (res.whatsappUrl) {
          window.open(res.whatsappUrl, '_blank');
        }
      } catch (err) {
        showToast('Error al generar enlace de WhatsApp', 'danger');
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
        showToast('Estado de entrega actualizado con éxito ✅');
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
  let selectedCustomerId = orderData?.customerId || null;

  // Cargar clientes existentes para selector rápido
  let existingCustomers = [];
  try {
    existingCustomers = await api.getCustomers();
  } catch (e) {
    console.error('Error fetching customers for modal:', e);
  }

  // Lista inicial de ítems
  let initialItems = [
    { bottleSize: '1L', flavor: 'Natural', quantity: 1, unitPrice: 10000 },
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
        flavor: orderData.flavor || 'Natural',
        quantity: orderData.quantityBottles || 1,
        unitPrice: orderData.unitPrice || 10000,
      },
    ];
  }

  modalOverlay.innerHTML = `
    <div class="modal-overlay active" id="orderModal">
      <div class="modal-card" style="max-width: 560px;">
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
              <div class="form-group">
                <label class="form-label">Teléfono o @Usuario de WhatsApp *</label>
                <input 
                  type="text" 
                  id="custPhone" 
                  class="form-input" 
                  placeholder="Ej: 3014964250 o @usuario_wa" 
                  value="${defaultPhone}" 
                  required 
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Dirección de Entrega (Fonseca) *</label>
              <input type="text" id="custAddress" class="form-input" placeholder="Ej: Calle 12 # 15-40, Barrio San Agustín" value="${defaultAddress}" required />
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
                <label class="form-label">Total a Cobrar ($ COP) *</label>
                <input type="number" id="orderTotalAmount" class="form-input" value="10000" required style="font-weight: 800; color: var(--primary);" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Monto Abonado / Pagado ($ COP)</label>
                <input type="number" id="orderPaidAmount" class="form-input" value="${defaultPaid}" min="0" placeholder="0 si no ha pagado" />
              </div>

              <div class="form-group">
                <label class="form-label">Saldo Pendiente Calculado</label>
                <input type="text" id="orderPendingDisplay" class="form-input" value="$10.000 COP" disabled style="background: var(--bg-subtle); font-weight: 800; color: var(--danger);" />
              </div>
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
  const modalBody = modalOverlay.querySelector('.modal-body');

  // Función para renderizar una fila de producto
  function addProductRow(item = { bottleSize: '1L', flavor: 'Natural', quantity: 1, unitPrice: 10000 }) {
    const row = document.createElement('div');
    row.className = 'order-item-row';
    row.style.cssText = 'display: flex; gap: 6px; align-items: center; background: #FFFFFF; padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);';

    row.innerHTML = `
      <select class="form-select item-size" style="flex: 1.3; font-size: 0.82rem; padding: 6px 8px;">
        <option value="1L" ${item.bottleSize === '1L' ? 'selected' : ''}>1 Litro ($10.000)</option>
        <option value="2L" ${item.bottleSize === '2L' ? 'selected' : ''}>2 Litros ($20.000)</option>
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
        ${formatCOP((item.quantity || 1) * (item.unitPrice || 10000))}
      </span>

      <button type="button" class="btn btn-outline btn-sm btn-remove-item" style="color: var(--danger); padding: 4px 8px; font-size: 0.85rem;" title="Quitar producto">
        ✕
      </button>
    `;

    const sizeSelect = row.querySelector('.item-size');
    const qtyInput = row.querySelector('.item-qty');
    const removeBtn = row.querySelector('.btn-remove-item');

    const updateRow = () => {
      recalculateOrderTotals();
    };

    sizeSelect.addEventListener('change', updateRow);
    qtyInput.addEventListener('input', updateRow);

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

  // Recalcular todos los productos
  function recalculateOrderTotals() {
    let sumLiters = 0;
    let sumTotal = 0;

    itemsContainer.querySelectorAll('.order-item-row').forEach((row) => {
      const size = row.querySelector('.item-size').value;
      const qty = Number(row.querySelector('.item-qty').value) || 1;
      const unitPrice = size === '2L' ? 20000 : 10000;
      const rowTotal = qty * unitPrice;
      const rowLiters = size === '2L' ? qty * 2 : qty * 1;

      sumLiters += rowLiters;
      sumTotal += rowTotal;

      const subDisplay = row.querySelector('.item-subtotal-display');
      if (subDisplay) subDisplay.textContent = formatCOP(rowTotal);
    });

    totalLitersDisplay.value = `${sumLiters} Litro(s)`;
    totalInput.value = sumTotal;

    const paid = Number(paidInput.value) || 0;
    const pending = Math.max(0, sumTotal - paid);
    pendingDisplay.value = formatCOP(pending);
  }

  // Inicializar filas existentes
  initialItems.forEach((it) => addProductRow(it));

  // Botón para agregar más productos
  document.getElementById('btnAddOrderItem')?.addEventListener('click', () => {
    addProductRow({ bottleSize: '1L', flavor: 'Natural', quantity: 1, unitPrice: 10000 });
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

  // Autocomplete interactivo en tiempo real al escribir en Nombre y Apellido
  const nameInput = document.getElementById('custFullName');
  const suggestionsBox = document.getElementById('customerSuggestions');
  const phoneInput = document.getElementById('custPhone');
  const addressInput = document.getElementById('custAddress');

  const renderSuggestions = (query) => {
    if (!query || query.trim().length < 1 || !existingCustomers || existingCustomers.length === 0) {
      suggestionsBox.innerHTML = '';
      suggestionsBox.classList.remove('active');
      return;
    }

    const q = query.toLowerCase().trim();
    const matches = existingCustomers.filter(
      (c) => c.fullName.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
    );

    if (matches.length === 0) {
      suggestionsBox.innerHTML = '';
      suggestionsBox.classList.remove('active');
      return;
    }

    suggestionsBox.innerHTML = matches
      .slice(0, 6)
      .map(
        (c) => `
        <div class="autocomplete-item" data-id="${c.id}" data-name="${c.fullName}" data-phone="${c.phone}" data-address="${c.address || ''}">
          <span class="autocomplete-item-name">👤 ${c.fullName}</span>
          <span class="autocomplete-item-details">📞 ${c.phone} • 📍 ${c.address || 'Fonseca'}</span>
        </div>
      `
      )
      .join('');

    suggestionsBox.classList.add('active');

    suggestionsBox.querySelectorAll('.autocomplete-item').forEach((item) => {
      item.addEventListener('click', () => {
        nameInput.value = item.dataset.name;
        phoneInput.value = item.dataset.phone;
        addressInput.value = item.dataset.address;
        selectedCustomerId = Number(item.dataset.id);
        suggestionsBox.innerHTML = '';
        suggestionsBox.classList.remove('active');
        showToast(`Cliente seleccionado: ${item.dataset.name} 👤`, 'info');
      });
    });
  };

  nameInput?.addEventListener('input', (e) => {
    selectedCustomerId = null; // Si sigue escribiendo libremente, es un cliente nuevo o modificado
    renderSuggestions(e.target.value);
  });

  nameInput?.addEventListener('focus', (e) => {
    if (e.target.value.trim().length > 0) {
      renderSuggestions(e.target.value);
    }
  });

  // Cerrar sugerencias si hace clic fuera
  const handleOutsideClick = (e) => {
    if (!nameInput?.contains(e.target) && !suggestionsBox?.contains(e.target)) {
      suggestionsBox?.classList.remove('active');
    }
  };
  document.addEventListener('click', handleOutsideClick);

  // Autocompletar datos si es nuevo y el cliente ya existe al escribir teléfono
  if (!isEditing) {
    phoneInput?.addEventListener('blur', async () => {
      const phone = phoneInput.value.trim();
      if (phone.length >= 7) {
        const foundCust = existingCustomers.find((c) => c.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''));
        if (foundCust) {
          nameInput.value = foundCust.fullName;
          addressInput.value = foundCust.address;
          selectedCustomerId = foundCust.id;
          showToast(`Cliente encontrado: ${foundCust.fullName}`, 'info');
        }
      }
    });
  }

  const closeModal = () => {
    modalOverlay.innerHTML = '';
  };

  document.getElementById('btnCloseOrderModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelOrderModal')?.addEventListener('click', closeModal);

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Recoger todos los ítems de las filas
    const items = [];
    itemsContainer.querySelectorAll('.order-item-row').forEach((row) => {
      const size = row.querySelector('.item-size').value;
      const flavor = row.querySelector('.item-flavor').value;
      const qty = Number(row.querySelector('.item-qty').value) || 1;
      const unitPrice = size === '2L' ? 20000 : 10000;
      items.push({
        bottleSize: size,
        flavor,
        quantity: qty,
        unitPrice,
      });
    });

    const total = Number(totalInput.value) || 10000;
    const paid = Number(paidInput.value) || 0;

    const orderPayload = {
      customerId: selectedCustomerId || undefined,
      customerName: document.getElementById('custFullName').value,
      customerPhone: document.getElementById('custPhone').value,
      customerAddress: document.getElementById('custAddress').value,
      items,
      totalAmount: total,
      paidAmount: paid,
      deliveryStatus: document.getElementById('orderDeliveryStatus').value,
      orderDate: document.getElementById('orderDateInput').value,
      deliveryDate: document.getElementById('orderDeliveryDateInput').value || null,
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

// Modal de Abono / Pago rápido
export function openPaymentModal(orderId, totalAmount, currentPaid, currentPending, onSuccess = null) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 420px;">
        <div class="modal-header">
          <h3 class="modal-title">💵 Registrar Abono o Pago</h3>
          <button class="modal-close-btn" id="btnClosePaymentModal">✕</button>
        </div>
        <form id="paymentForm">
          <div class="modal-body">
            <div style="background: var(--bg-app); padding: 14px; border-radius: var(--radius-md); margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="color: var(--text-muted);">Total del Pedido:</span>
                <strong>${formatCOP(totalAmount)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="color: var(--text-muted);">Abonado Anteriormente:</span>
                <strong style="color: var(--success);">${formatCOP(currentPaid)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--danger); font-weight: 700;">Saldo Pendiente:</span>
                <strong style="color: var(--danger);">${formatCOP(currentPending)}</strong>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">¿Cuánto va a abonar o pagar ahora? ($ COP) *</label>
              <input type="number" id="newPaymentAmount" class="form-input" min="1" max="${currentPending}" value="${currentPending}" required />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btnCancelPaymentModal">Cancelar</button>
            <button type="submit" class="btn btn-success">Confirmar Pago</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnClosePaymentModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelPaymentModal')?.addEventListener('click', closeModal);

  document.getElementById('paymentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const additionalPaid = Number(document.getElementById('newPaymentAmount').value);
    const newTotalPaid = currentPaid + additionalPaid;

    try {
      await api.updateOrder(orderId, { paidAmount: newTotalPaid });
      showToast('Abono registrado correctamente');
      closeModal();
      if (onSuccess) {
        onSuccess();
      } else {
        const contentContainer = document.getElementById('contentContainer');
        if (contentContainer) renderOrders(contentContainer);
      }
    } catch (err) {
      showToast('Error al registrar abono', 'danger');
    }
  });
}
