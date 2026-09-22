import { api } from '../api.js';
import { formatCOP, formatDate, formatDateTime, getTodayLocalDateStr, toColombiaDateStr, showToast, store, buildWhatsAppUrl } from '../store.js';
import { paginateArray, renderPaginationHtml, attachPaginationEvents, PAGE_SIZE } from '../components/pagination.js';

let deliveryCurrentPage = 1;
let deliveryStatusFilter = 'PREPARING_ALL'; // 'PREPARING_ALL' | 'IN_ROUTE' | 'DELIVERED' | 'ALL'
let deliveryTypeFilter = 'DELIVERY_ALL'; // 'DELIVERY_ALL' | 'PROPIO' | 'DOMICILIARIO' | 'LOCAL' | 'ALL'
let deliveryDateScope = 'ALL_PENDING'; // 'ALL_PENDING' | 'TODAY' | 'SPECIFIC_DATE' | 'ALL'
let deliverySpecificDate = getTodayLocalDateStr();
let deliverySearchQuery = '';
let cachedDeliveryOrders = [];

export async function renderDelivery(container) {
  container.innerHTML = `
    <div style="display: flex; justify-content: center; padding: 40px;">
      <span style="color: var(--primary); font-weight: 700;">Cargando entregas y ruta de domicilios... 🛵💨</span>
    </div>
  `;

  try {
    const todayStr = getTodayLocalDateStr();
    const currentUserId = store.authUser?.id;
    const currentUserName = store.authUser?.name || 'Socio';
    const isAdmin = store.isAdmin();

    // Obtener pedidos según el rol
    const params = {};
    if (store.isDelivery() && currentUserId) {
      params.deliveryDriverId = currentUserId;
    }

    cachedDeliveryOrders = (await api.getOrders(params)) || [];

    const overdueOrdersCount = cachedDeliveryOrders.filter((o) => {
      if (o.deliveryStatus === 'DELIVERED') return false;
      const dDate = toColombiaDateStr(o.deliveryDate);
      const oDate = toColombiaDateStr(o.orderDate);
      return (dDate && dDate < todayStr) || (!dDate && oDate && oDate < todayStr);
    }).length;

    // Renderizar la estructura principal (toolbar, filtros, KPIs y contenedor de lista)
    container.innerHTML = `
      <!-- Barra de Herramientas de Entregas -->
      <div class="orders-toolbar-card" style="padding: 16px 20px; margin-bottom: 18px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
          <div>
            <h2 style="font-size: 1.3rem; font-weight: 800; color: var(--primary); margin: 0; display: flex; align-items: center; gap: 8px;">
              <span>🛵</span> ${isAdmin ? 'Entregas y Domicilios (Socios y Repartidores)' : 'Mis Domicilios Asignados'}
            </h2>
            <span style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600;">
              ${isAdmin ? `Hola <strong>${currentUserName}</strong> • Gestionando despachos y entregas de <strong>YogurArte</strong>` : `Hola <strong>${currentUserName}</strong> • Tu ruta de entregas asignada`}
            </span>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <button class="btn btn-outline btn-sm" id="btnRescheduleOverdue" style="font-weight: 700; font-size: 0.82rem; padding: 6px 12px; border-color: ${overdueOrdersCount > 0 ? '#F59E0B' : 'var(--border-color)'}; color: ${overdueOrdersCount > 0 ? '#B45309' : 'var(--text-muted)'}; background: ${overdueOrdersCount > 0 ? 'rgba(245, 158, 11, 0.12)' : 'transparent'};" title="Reprogramar todos los pedidos de días anteriores para entregarse hoy">
              📅 Reprogramar Atrasados a Hoy ${overdueOrdersCount > 0 ? `<span class="badge" style="background: #F59E0B; color: #FFFFFF; margin-left: 4px; padding: 1px 6px; font-size: 0.72rem; border-radius: 999px;">${overdueOrdersCount}</span>` : ''}
            </button>

            <button class="btn btn-outline btn-sm" id="btnRefreshDeliveries" style="font-weight: 700; font-size: 0.82rem; padding: 6px 12px;" title="Actualizar entregas">
              🔄 Actualizar
            </button>
          </div>
        </div>

        <!-- Fila Superior Unificada: Barra de Búsqueda a la izquierda + Selector de Repartidor a la derecha -->
        <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
          <!-- Buscador por Nombre de Cliente, Teléfono, Dirección o Pedido -->
          <div style="position: relative; flex: 1; min-width: 260px;">
            <input
              type="text"
              id="deliverySearchInput"
              class="form-input"
              placeholder="🔍 Buscar por cliente, teléfono, dirección o # pedido..."
              value="${deliverySearchQuery}"
              style="padding-left: 36px; padding-right: 32px; font-weight: 600; font-size: 0.88rem;"
            />
            <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 0.95rem; color: var(--text-muted); pointer-events: none;">🔍</span>
            ${
              deliverySearchQuery
                ? `<button type="button" id="btnClearDeliverySearch" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 0.9rem;" title="Limpiar búsqueda">✕</button>`
                : ''
            }
          </div>

          <!-- Selector de Modalidad / Repartidor -->
          ${
            isAdmin
              ? `
            <select id="selectDeliveryTypeFilter" class="form-select" style="width: auto; padding: 7px 12px; font-weight: 700; font-size: 0.84rem; min-width: 220px;">
              <option value="DELIVERY_ALL" ${deliveryTypeFilter === 'DELIVERY_ALL' ? 'selected' : ''}>🛵 Todos los Domicilios</option>
              <option value="PROPIO" ${deliveryTypeFilter === 'PROPIO' ? 'selected' : ''}>👤 Solo Entregas de Socios</option>
              <option value="DOMICILIARIO" ${deliveryTypeFilter === 'DOMICILIARIO' ? 'selected' : ''}>🛵 Solo Domicilios con Repartidor</option>
              <option value="LOCAL" ${deliveryTypeFilter === 'LOCAL' ? 'selected' : ''}>🏪 Recoge en Local</option>
              <option value="ALL" ${deliveryTypeFilter === 'ALL' ? 'selected' : ''}>📋 Todas las Modalidades</option>
            </select>
          `
              : ''
          }
        </div>

        <div style="height: 1px; background: var(--border-subtle); margin: 12px 0;"></div>

        <!-- Tira de Chips Reducida (4 Estados Operativos con Contadores Dinámicos) -->
        <div class="filter-chip-group" id="deliveryStatusChipsContainer">
          <!-- Se actualiza dinámicamente -->
        </div>
      </div>

      <!-- Resumen de Ruta / Cava (KPIs dinámicos) -->
      <div id="deliveryKpisContainer" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px;">
        <!-- Se actualiza dinámicamente -->
      </div>

      <!-- Lista de Tarjetas de Entregas -->
      <div id="deliveryOrdersList">
        <!-- Se actualiza dinámicamente -->
      </div>
    `;

    attachDeliveryEvents(container);
    filterAndRenderDelivery(container);
  } catch (error) {
    console.error('Error rendering delivery view:', error);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-title">Error al cargar la ruta de domicilios</div>
        <div class="empty-state-text">${error.message || 'Verifica tu conexión con el servidor.'}</div>
      </div>
    `;
  }
}

// Función central para filtrar en memoria y actualizar la vista
function filterAndRenderDelivery(container) {
  const todayStr = getTodayLocalDateStr();
  const currentUserId = store.authUser?.id;
  const isAdmin = store.isAdmin();

  // 1. Filtrar por rol y modalidad de entrega
  let scopedOrders = cachedDeliveryOrders;
  if (store.isDelivery() && currentUserId) {
    scopedOrders = scopedOrders.filter((o) => o.deliveryDriverId === currentUserId && (o.deliveryType || 'PROPIO') !== 'LOCAL');
  } else {
    if (deliveryTypeFilter === 'DELIVERY_ALL') {
      // Excluir recoger en el local para que solo queden domicilios reales (socios + repartidor)
      scopedOrders = scopedOrders.filter((o) => (o.deliveryType || 'PROPIO') !== 'LOCAL');
    } else if (deliveryTypeFilter === 'PROPIO') {
      scopedOrders = scopedOrders.filter((o) => (o.deliveryType || 'PROPIO') === 'PROPIO');
    } else if (deliveryTypeFilter === 'DOMICILIARIO') {
      scopedOrders = scopedOrders.filter((o) => o.deliveryType === 'DOMICILIARIO');
    } else if (deliveryTypeFilter === 'LOCAL') {
      scopedOrders = scopedOrders.filter((o) => o.deliveryType === 'LOCAL');
    }
  }

  // 2. Filtrar por alcance de fecha
  if (deliveryDateScope === 'TODAY') {
    scopedOrders = scopedOrders.filter((o) => {
      const dDate = toColombiaDateStr(o.deliveryDate);
      const oDate = toColombiaDateStr(o.orderDate);
      return dDate === todayStr || (!dDate && oDate === todayStr);
    });
  } else if (deliveryDateScope === 'SPECIFIC_DATE') {
    const targetDate = deliverySpecificDate;
    scopedOrders = scopedOrders.filter((o) => {
      const dDate = toColombiaDateStr(o.deliveryDate);
      const oDate = toColombiaDateStr(o.orderDate);
      return dDate === targetDate || (!dDate && oDate === targetDate);
    });
  } else if (deliveryDateScope === 'ALL_PENDING') {
    // Mostrar todos los pendientes por entregar (sin importar fecha), o los entregados hoy
    scopedOrders = scopedOrders.filter((o) => {
      if (o.deliveryStatus !== 'DELIVERED') return true;
      const dDate = toColombiaDateStr(o.deliveryDate);
      const oDate = toColombiaDateStr(o.orderDate);
      return dDate === todayStr || (!dDate && oDate === todayStr);
    });
  }

  // 3. Filtrar por texto de búsqueda (nombre, teléfono, dirección, # pedido, barrio)
  if (deliverySearchQuery && deliverySearchQuery.trim()) {
    const q = deliverySearchQuery.toLowerCase().trim();
    scopedOrders = scopedOrders.filter((o) => {
      const custName = (o.customer?.fullName || '').toLowerCase();
      const custPhone = (o.customer?.phone || '').toLowerCase();
      const address = (o.deliveryAddress || o.customer?.address || '').toLowerCase();
      const neighborhood = (o.customer?.neighborhood || '').toLowerCase();
      const orderNum = (o.orderNumber || '').toLowerCase();
      const notes = (o.notes || '').toLowerCase();
      const driverName = (o.deliveryDriverName || '').toLowerCase();

      return (
        custName.includes(q) ||
        custPhone.includes(q) ||
        address.includes(q) ||
        neighborhood.includes(q) ||
        orderNum.includes(q) ||
        notes.includes(q) ||
        driverName.includes(q)
      );
    });
  }

  // 4. Contadores de estados reducidos a 4 estados operativos
  const preparingOrders = scopedOrders.filter(
    (o) => o.deliveryStatus === 'PENDING' || o.deliveryStatus === 'PREPARING' || o.deliveryStatus === 'READY_FOR_DISPATCH'
  );
  const inRouteOrders = scopedOrders.filter((o) => o.deliveryStatus === 'IN_ROUTE');
  const deliveredOrders = scopedOrders.filter((o) => o.deliveryStatus === 'DELIVERED');

  const totalLitersInRoute = scopedOrders
    .filter((o) => o.deliveryStatus !== 'DELIVERED')
    .reduce((sum, o) => sum + (o.totalLiters || 0), 0);

  const totalToCollect = scopedOrders
    .filter((o) => o.deliveryStatus !== 'DELIVERED' && o.pendingAmount > 0)
    .reduce((sum, o) => sum + (o.pendingAmount || 0), 0);

  // Recaudado real: sumar únicamente pagos y abonos efectivamente recibidos en la fecha de consulta
  const queryTargetDate = deliveryDateScope === 'SPECIFIC_DATE' ? deliverySpecificDate : todayStr;

  const calculateCollectedForOrders = (orderList) => {
    return orderList.reduce((sum, o) => {
      if (o.payments && o.payments.length > 0) {
        const paymentsOnTarget = o.payments
          .filter((p) => toColombiaDateStr(p.paymentDate) === queryTargetDate)
          .reduce((pSum, p) => pSum + (p.amount || 0), 0);
        if (paymentsOnTarget > 0) {
          return sum + paymentsOnTarget;
        }
      }

      // Si no tiene pagos registrados en esa fecha o no tiene desglose de payments,
      // solo sumar paidAmount si el pedido fue entregado o creado en esa fecha exacta
      const dDate = toColombiaDateStr(o.deliveryDate);
      const oDate = toColombiaDateStr(o.orderDate);
      if (dDate === queryTargetDate || (!dDate && oDate === queryTargetDate)) {
        return sum + (o.paidAmount || 0);
      }
      return sum;
    }, 0);
  };

  const totalCollectedToday = calculateCollectedForOrders(scopedOrders);
  const deliveredPaid = calculateCollectedForOrders(deliveredOrders);
  const inProcessPaid = calculateCollectedForOrders(scopedOrders.filter((o) => o.deliveryStatus !== 'DELIVERED'));

  // 5. Actualizar chips de estado (4 estados operativos con contadores dinámicos)
  const chipsContainer = document.getElementById('deliveryStatusChipsContainer');
  if (chipsContainer) {
    chipsContainer.innerHTML = `
      <button class="filter-chip ${deliveryStatusFilter === 'ALL' ? 'active' : ''}" data-deliv-filter="ALL">
        📋 Todos (${scopedOrders.length})
      </button>
      <button class="filter-chip ${deliveryStatusFilter === 'PREPARING_ALL' ? 'active' : ''}" data-deliv-filter="PREPARING_ALL">
        🥣 En Preparación (${preparingOrders.length})
      </button>
      <button class="filter-chip ${deliveryStatusFilter === 'IN_ROUTE' ? 'active' : ''}" data-deliv-filter="IN_ROUTE">
        🛵 En Camino (${inRouteOrders.length})
      </button>
      <button class="filter-chip ${deliveryStatusFilter === 'DELIVERED' ? 'active' : ''}" data-deliv-filter="DELIVERED">
        ✅ Entregados (${deliveredOrders.length})
      </button>
    `;

    chipsContainer.querySelectorAll('[data-deliv-filter]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        deliveryStatusFilter = e.currentTarget.dataset.delivFilter;
        deliveryCurrentPage = 1;
        filterAndRenderDelivery(container);
      });
    });
  }

  // 6. Actualizar KPIs
  const kpisContainer = document.getElementById('deliveryKpisContainer');
  if (kpisContainer) {
    kpisContainer.innerHTML = `
      <div class="kpi-card" style="padding: 12px 16px; border-left: 4px solid var(--primary); background: var(--bg-card);">
        <div class="kpi-label" style="font-size: 0.75rem;">📦 Litros en Reparto / Pendientes</div>
        <div class="kpi-value" style="font-size: 1.35rem; color: var(--primary);">${totalLitersInRoute} L</div>
        <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; margin-top: 2px;">
          ${preparingOrders.length} por despachar • ${inRouteOrders.length} en moto
        </div>
      </div>
      <div class="kpi-card" style="padding: 12px 16px; border-left: 4px solid #DC2626; background: var(--bg-card);">
        <div class="kpi-label" style="font-size: 0.75rem;">🚨 Saldo Total por Cobrar</div>
        <div class="kpi-value" style="font-size: 1.35rem; color: #DC2626;">${formatCOP(totalToCollect)}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; margin-top: 2px;">
          Dinero pendiente en la calle
        </div>
      </div>
      <div class="kpi-card" style="padding: 12px 16px; border-left: 4px solid #15803D; background: var(--bg-card);">
        <div class="kpi-label" style="font-size: 0.75rem;">✅ Recaudado (Cobrado)</div>
        <div class="kpi-value" style="font-size: 1.35rem; color: #15803D;">${formatCOP(totalCollectedToday)}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; margin-top: 2px;">
          ${deliveredOrders.length} entregados (${formatCOP(deliveredPaid)}) ${inProcessPaid > 0 ? `• +${formatCOP(inProcessPaid)} pagado en ruta/prep.` : ''}
        </div>
      </div>
    `;
  }

  // 7. Filtrar según la pestaña activa de estado
  let displayOrders = scopedOrders;
  if (deliveryStatusFilter === 'PREPARING_ALL') {
    displayOrders = preparingOrders;
  } else if (deliveryStatusFilter === 'IN_ROUTE') {
    displayOrders = inRouteOrders;
  } else if (deliveryStatusFilter === 'DELIVERED') {
    displayOrders = deliveredOrders;
  }

  // Ordenar: primero los de fecha más cercana
  displayOrders.sort((a, b) => {
    const dateA = a.deliveryDate || a.orderDate || '';
    const dateB = b.deliveryDate || b.orderDate || '';
    return dateA.localeCompare(dateB);
  });

  // 8. Renderizar lista de tarjetas con paginación
  const listContainer = document.getElementById('deliveryOrdersList');
  if (listContainer) {
    const { pageItems, totalPages, totalItems, currentPage } = paginateArray(displayOrders, deliveryCurrentPage, 15);
    deliveryCurrentPage = currentPage;

    listContainer.innerHTML = `
      ${renderDeliveryOrdersListHtml(pageItems, todayStr, isAdmin)}
      ${renderPaginationHtml({
        currentPage: deliveryCurrentPage,
        totalPages,
        totalItems,
        pageSize: 15,
        itemName: 'entregas',
        paginationId: 'deliveryPagination',
      })}
    `;
    attachCardActionEvents(listContainer, container);
    attachPaginationEvents(
      listContainer,
      'deliveryPagination',
      (newPage) => {
        deliveryCurrentPage = newPage;
        filterAndRenderDelivery(container);
      },
      listContainer
    );
  }
}

// Renderizar la lista de tarjetas de pedidos
function renderDeliveryOrdersListHtml(orders, todayStr, isAdmin = false) {
  if (!orders || orders.length === 0) {
    return `
      <div class="empty-state" style="padding: 40px 20px; background: #FFFFFF; border-radius: var(--radius-lg); border: 1.5px dashed var(--border-color);">
        <div class="empty-state-icon">🛵</div>
        <div class="empty-state-title">No hay entregas que coincidan</div>
        <div class="empty-state-text">Prueba ajustando el nombre de búsqueda, la fecha o la pestaña de estado.</div>
      </div>
    `;
  }

  return `
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;">
      ${orders
        .map((order) => {
          const isDelivered = order.deliveryStatus === 'DELIVERED';
          const isInRoute = order.deliveryStatus === 'IN_ROUTE';
          const isReady = order.deliveryStatus === 'READY_FOR_DISPATCH';
          const isPending = !isDelivered && !isInRoute && !isReady;

          const isPaid = order.paymentStatus === 'PAID' || order.pendingAmount <= 0;
          const customerPhone = (order.customer?.phone || '').trim();
          const cleanPhone = customerPhone.replace(/\D/g, '');
          const waMessage = `¡Hola ${order.customer?.fullName}! 🥛✨ Te saludamos de *YogurArte*. Tu pedido (#${order.orderNumber}) de yogur artesanal ya va en camino hacia tu dirección (${order.deliveryAddress || 'Fonseca'}). ¡Atento para recibirlo! 🛵💨`;
          const waUrl = buildWhatsAppUrl(customerPhone, waMessage);

          let itemsText = '';
          if (order.items && order.items.length > 0) {
            itemsText = order.items.map((i) => `<strong>${i.quantity}x</strong> ${i.flavor} (${i.bottleSize})`).join(' • ');
          } else {
            itemsText = `<strong>${order.quantityBottles}x</strong> ${order.flavor} (${order.bottleSize})`;
          }

          const deliveryDateStr = order.deliveryDate ? toColombiaDateStr(order.deliveryDate) : '';
          const orderDateStr = order.orderDate ? toColombiaDateStr(order.orderDate) : '';
          const updatedDateStr = order.updatedAt ? toColombiaDateStr(order.updatedAt) : '';

          let updatedBadge = '';
          if (order.updatedAt) {
            const isTodayMod = updatedDateStr === todayStr;
            updatedBadge = `<span style="background: ${isTodayMod ? '#F0FDFA' : '#F8FAFC'}; color: ${isTodayMod ? '#0F766E' : '#64748B'}; border: 1px solid ${isTodayMod ? '#99F6E4' : '#CBD5E1'}; padding: 2px 6px; border-radius: var(--radius-sm); font-weight: 700; font-size: 0.72rem;" title="Última modificación del pedido">✏️ Modificado: ${formatDateTime(order.updatedAt)}</span>`;
          }

          let deliveryDateBadge = '';
          if (deliveryDateStr) {
            if (deliveryDateStr === todayStr) {
              deliveryDateBadge = `<span style="background: #DCFCE7; color: #15803D; border: 1px solid #86EFAC; padding: 3px 8px; border-radius: var(--radius-sm); font-weight: 800; font-size: 0.78rem;">📅 Entrega: HOY (${formatDate(deliveryDateStr)})</span>`;
            } else if (deliveryDateStr < todayStr && !isDelivered) {
              deliveryDateBadge = `<span style="background: #FEE2E2; color: #DC2626; border: 1px solid #FECACA; padding: 3px 8px; border-radius: var(--radius-sm); font-weight: 800; font-size: 0.78rem;">⚠️ Entrega Atrasada (${formatDate(deliveryDateStr)})</span>`;
            } else {
              deliveryDateBadge = `<span style="background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; padding: 3px 8px; border-radius: var(--radius-sm); font-weight: 800; font-size: 0.78rem;">🗓️ Programado (${formatDate(deliveryDateStr)})</span>`;
            }
          } else {
            deliveryDateBadge = `<span style="background: var(--bg-app); color: var(--text-muted); border: 1px solid var(--border-color); padding: 3px 8px; border-radius: var(--radius-sm); font-weight: 700; font-size: 0.78rem;">📅 Pedido: ${formatDate(orderDateStr || todayStr)}</span>`;
          }

          let modeBadge = '';
          if (order.deliveryType === 'LOCAL') {
            modeBadge = `<span class="badge" style="background: #E0E7FF; color: #4338CA; font-weight: 700; font-size: 0.75rem;">🏪 Local</span>`;
          } else if (order.deliveryType === 'DOMICILIARIO') {
            modeBadge = `<span class="badge" style="background: #E0F2FE; color: #0369A1; font-weight: 700; font-size: 0.75rem;">🛵 Repartidor: ${order.deliveryDriverName || 'Sin asignar'}</span>`;
          } else {
            modeBadge = `<span class="badge" style="background: #FEF3C7; color: #92400E; font-weight: 700; font-size: 0.75rem;">👤 Entrega Socios</span>`;
          }

          let statusBadge = '';
          if (isDelivered) {
            statusBadge = `<span class="badge badge-success">✅ Entregado</span>`;
          } else if (isInRoute) {
            statusBadge = `<span class="badge" style="background: var(--primary-light); color: var(--primary); border: 1px solid var(--primary); font-weight: 800;">🛵 En Camino</span>`;
          } else if (isReady) {
            statusBadge = `<span class="badge" style="background: #FEF3C7; color: #D97706; border: 1px solid #FDE68A; font-weight: 800;">📦 Listo Despacho</span>`;
          } else if (order.deliveryStatus === 'PREPARING') {
            statusBadge = `<span class="badge" style="background: #E0E7FF; color: #4338CA; border: 1px solid #C7D2FE; font-weight: 800;">🥣 En Preparación</span>`;
          } else {
            statusBadge = `<span class="badge badge-warning">🕒 Por Preparar</span>`;
          }

          let paymentBadge = '';
          if (isPaid) {
            paymentBadge = `<span class="badge badge-success">🟢 Paz y Salvo ($0)</span>`;
          } else {
            paymentBadge = `<span class="badge" style="background: #FEE2E2; color: #DC2626; border: 1px solid #FECACA; font-weight: 800;">💵 Cobrar: ${formatCOP(order.pendingAmount)}</span>`;
          }

          return `
            <div class="order-card" style="padding: 16px; border: 1.5px solid ${isInRoute ? 'var(--primary)' : isReady ? '#D97706' : 'var(--border-color)'}; background: #FFFFFF; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
                  <div>
                    <span style="font-size: 0.75rem; font-weight: 800; color: var(--text-muted);">
                       #${order.orderNumber}
                    </span>
                    <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--primary); margin: 2px 0 0;">
                      ${order.customer?.fullName || 'Cliente'}
                    </h3>
                  </div>
                  <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                    ${statusBadge}
                    ${paymentBadge}
                  </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;">
                  <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                    ${deliveryDateBadge}
                    ${updatedBadge}
                  </div>
                  ${modeBadge}
                </div>

                <div style="background: var(--bg-app); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 10px; margin-bottom: 12px;">
                  <div style="display: flex; align-items: flex-start; gap: 6px; font-size: 0.88rem; font-weight: 700; color: var(--text-main);">
                    <span>📍</span>
                    <span>${order.deliveryAddress || order.customer?.address || 'Fonseca, La Guajira'}</span>
                  </div>
                  ${
                    order.customer?.neighborhood
                      ? `<div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600; margin-left: 20px; margin-top: 2px;">Barrio: ${order.customer.neighborhood}</div>`
                      : ''
                  }
                  ${
                    order.notes
                      ? `<div style="font-size: 0.78rem; color: #C2410C; font-weight: 700; margin-left: 20px; margin-top: 4px;">📝 Nota: ${order.notes}</div>`
                      : ''
                  }
                </div>

                <div style="font-size: 0.85rem; color: var(--text-main); margin-bottom: 14px;">
                  <span style="color: var(--text-muted); font-weight: 600;">Llevas:</span> ${itemsText}
                  <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 700; margin-top: 2px;">
                    Total: ${order.totalLiters} L • Valor: ${formatCOP(order.totalAmount)}
                    ${order.deliveryFee && Number(order.deliveryFee) > 0 ? `<span style="color: #0284C7; font-weight: 800; margin-left: 6px;">(🛵 Domicilio: ${formatCOP(order.deliveryFee)})</span>` : ''}
                  </div>
                </div>
              </div>

              <div style="display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--border-subtle); padding-top: 12px;">
                <div style="display: flex; gap: 8px;">
                  ${
                    customerPhone
                      ? `
                    <a href="${waUrl}" target="_blank" class="btn" style="flex: 1; background: #25D366; color: white; text-align: center; text-decoration: none; font-weight: 700; font-size: 0.84rem; display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: var(--radius-sm);">
                      <span>💬</span> WhatsApp
                    </a>
                    <a href="tel:${cleanPhone}" class="btn btn-outline" style="padding: 8px 12px; font-size: 0.85rem;" title="Llamar al cliente">
                      📞
                    </a>
                  `
                      : ''
                  }
                </div>

                ${
                  isPending
                    ? `
                  <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                    <button class="btn btn-outline btn-mark-ready" data-order-id="${order.id}" style="flex: 1; min-width: 120px; font-weight: 800; padding: 8px; font-size: 0.8rem; color: #D97706; border-color: #FDE68A; background: #FFFBEB;">
                      📦 Marcar Listo
                    </button>
                    <button class="btn btn-primary btn-start-route" data-order-id="${order.id}" style="flex: 1; min-width: 120px; font-weight: 800; padding: 8px; font-size: 0.8rem;">
                      🛵 Salir a Reparto
                    </button>
                    <button class="btn btn-accent btn-deliver-modal" data-order-id="${order.id}" data-pending="${order.pendingAmount}" data-total="${order.totalAmount}" style="width: 100%; font-weight: 800; padding: 8px; font-size: 0.82rem;">
                      ✅ Entregar y Cobrar
                    </button>
                  </div>
                `
                    : isReady
                    ? `
                  <div style="display: flex; gap: 6px;">
                    <button class="btn btn-primary btn-start-route" data-order-id="${order.id}" style="flex: 2; font-weight: 800; padding: 10px; font-size: 0.84rem;">
                      🛵 Salir a Reparto
                    </button>
                    <button class="btn btn-accent btn-deliver-modal" data-order-id="${order.id}" data-pending="${order.pendingAmount}" data-total="${order.totalAmount}" style="flex: 2; font-weight: 800; padding: 10px; font-size: 0.84rem;">
                      ✅ Entregar
                    </button>
                    <button class="btn btn-outline btn-revert-to-pending" data-order-id="${order.id}" style="flex: 1; font-weight: 700; padding: 8px 10px; font-size: 0.78rem; color: #EA580C; border-color: #FED7AA; background: #FFF7ED;" title="Pasar pedido otra vez a por preparar">
                      ↩️
                    </button>
                  </div>
                `
                    : isInRoute
                    ? `
                  <div style="display: flex; gap: 8px;">
                    <button class="btn btn-accent btn-deliver-modal" data-order-id="${order.id}" data-pending="${order.pendingAmount}" data-total="${order.totalAmount}" style="flex: 2; font-weight: 800; padding: 10px; font-size: 0.84rem;">
                      ✅ Entregar y Cobrar
                    </button>
                    <button class="btn btn-outline btn-revert-to-ready" data-order-id="${order.id}" style="flex: 1; font-weight: 700; padding: 8px 10px; font-size: 0.78rem; color: #D97706; border-color: #FDE68A; background: #FFFBEB;" title="Regresar a listo para despacho">
                      ↩️ Listo
                    </button>
                  </div>
                `
                    : `
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 0.82rem; color: var(--success); font-weight: 800; padding: 4px;">
                      ✨ Entrega completada
                    </div>
                    <button class="btn btn-outline btn-sm btn-revert-to-pending" data-order-id="${order.id}" style="font-size: 0.76rem; color: var(--text-muted); padding: 4px 8px;" title="Pasar pedido otra vez a por entregar">
                      ↩️ Reabrir (Por Entregar)
                    </button>
                  </div>
                `
                }
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

// Conectar eventos globales de la barra de herramientas de entregas
function attachDeliveryEvents(container) {
  const searchInput = document.getElementById('deliverySearchInput');
  const clearBtn = document.getElementById('btnClearDeliverySearch');

  searchInput?.addEventListener('input', (e) => {
    deliverySearchQuery = e.target.value;
    deliveryCurrentPage = 1;
    filterAndRenderDelivery(container);
  });

  clearBtn?.addEventListener('click', () => {
    deliverySearchQuery = '';
    deliveryCurrentPage = 1;
    if (searchInput) searchInput.value = '';
    filterAndRenderDelivery(container);
  });

  document.getElementById('selectDeliveryTypeFilter')?.addEventListener('change', (e) => {
    deliveryTypeFilter = e.target.value;
    deliveryCurrentPage = 1;
    filterAndRenderDelivery(container);
  });

  document.getElementById('btnRefreshDeliveries')?.addEventListener('click', () => {
    renderDelivery(container);
  });

  document.getElementById('btnRescheduleOverdue')?.addEventListener('click', async () => {
    const todayStr = getTodayLocalDateStr();
    const overdueCount = cachedDeliveryOrders.filter(
      (o) =>
        o.deliveryStatus !== 'DELIVERED' &&
        (o.deliveryDate ? toColombiaDateStr(o.deliveryDate) < todayStr : o.orderDate && toColombiaDateStr(o.orderDate) < todayStr)
    ).length;

    if (overdueCount === 0) {
      showToast('No hay pedidos atrasados pendientes de reprogramar 🚀', 'info');
      return;
    }

    if (confirm(`¿Deseas reprogramar ${overdueCount} pedido(s) atrasados para ser entregados hoy (${formatDate(todayStr)})?`)) {
      try {
        const res = await api.rescheduleOverdueOrders();
        showToast(`¡Se reprogramaron ${res.updatedCount} pedidos atrasados para hoy con éxito! 🛵📅`, 'success');
        renderDelivery(container);
      } catch (err) {
        showToast(err.message || 'Error al reprogramar pedidos atrasados', 'danger');
      }
    }
  });
}

// Conectar eventos de acciones en las tarjetas de pedidos
function attachCardActionEvents(listContainer, mainContainer) {
  listContainer.querySelectorAll('.btn-mark-ready').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const orderId = e.currentTarget.dataset.orderId;
      try {
        await api.updateOrderDeliveryStatus(orderId, { deliveryStatus: 'READY_FOR_DISPATCH' });
        showToast('¡Pedido marcado como Listo para Despacho! 📦');
        renderDelivery(mainContainer);
      } catch (err) {
        showToast(err.message || 'Error al actualizar pedido', 'danger');
      }
    });
  });

  listContainer.querySelectorAll('.btn-start-route').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const orderId = e.currentTarget.dataset.orderId;
      try {
        await api.updateOrderDeliveryStatus(orderId, { deliveryStatus: 'IN_ROUTE' });
        showToast('¡Pedido en camino a reparto! 🛵💨');
        renderDelivery(mainContainer);
      } catch (err) {
        showToast(err.message || 'Error al actualizar pedido', 'danger');
      }
    });
  });

  listContainer.querySelectorAll('.btn-revert-to-ready').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const orderId = e.currentTarget.dataset.orderId;
      try {
        await api.updateOrderDeliveryStatus(orderId, { deliveryStatus: 'READY_FOR_DISPATCH' });
        showToast('¡Pedido regresado a Listo para Despacho! 📦');
        renderDelivery(mainContainer);
      } catch (err) {
        showToast(err.message || 'Error al actualizar estado', 'danger');
      }
    });
  });

  listContainer.querySelectorAll('.btn-revert-to-pending').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const orderId = e.currentTarget.dataset.orderId;
      if (confirm('¿Deseas pasar este pedido otra vez al estado "Por Entregar"?')) {
        try {
          await api.updateOrderDeliveryStatus(orderId, { deliveryStatus: 'PENDING' });
          showToast('¡Pedido regresado a Por Entregar! 🕒');
          renderDelivery(mainContainer);
        } catch (err) {
          showToast(err.message || 'Error al actualizar estado', 'danger');
        }
      }
    });
  });

  listContainer.querySelectorAll('.btn-deliver-modal').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const orderId = Number(e.currentTarget.dataset.orderId);
      const order = cachedDeliveryOrders.find((o) => o.id === orderId);
      openDeliveryConfirmModal(orderId, order, mainContainer);
    });
  });
}

// Modal de Confirmación de Entrega y Recaudo
function openDeliveryConfirmModal(orderId, order, parentContainer) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  const currentOrder = order || cachedDeliveryOrders.find((o) => o.id === Number(orderId)) || {};
  const totalAmount = Number(currentOrder.totalAmount) || 0;
  const previousPaid = Number(currentOrder.paidAmount) || 0;
  const pendingAmount = Number(currentOrder.pendingAmount !== undefined ? currentOrder.pendingAmount : (totalAmount - previousPaid)) || 0;
  const customerName = currentOrder.customer?.fullName || currentOrder.customerName || 'Cliente';
  const orderNumber = currentOrder.orderNumber || orderId;
  const existingNotes = currentOrder.notes || '';

  let selectedPaymentOption = pendingAmount > 0 ? 'FULL' : 'NONE'; // 'FULL' | 'PARTIAL' | 'NO_PAYMENT' | 'NONE'

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 480px;">
        <div class="modal-header">
          <h3 class="modal-title" style="display: flex; align-items: center; gap: 8px;">
            <span>🛵</span> Confirmar Entrega de Pedido
          </h3>
          <button class="modal-close-btn" id="btnCloseDeliveryModal">✕</button>
        </div>
        <form id="deliveryConfirmForm">
          <div class="modal-body">
            
            <!-- Resumen del Pedido y Cliente -->
            <div style="background: var(--bg-app); border: 1.5px solid var(--border-color); border-radius: var(--radius-md); padding: 12px 14px; margin-bottom: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 0.8rem; font-weight: 800; color: var(--text-muted);">PEDIDO #${orderNumber}</span>
                <span style="font-size: 0.82rem; font-weight: 700; color: var(--primary);">Total: ${formatCOP(totalAmount)}</span>
              </div>
              ${
                currentOrder.deliveryFee && Number(currentOrder.deliveryFee) > 0
                  ? `<div style="font-size: 0.76rem; color: #0284C7; font-weight: 700; margin-bottom: 4px;">
                       🛵 Incluye ${formatCOP(currentOrder.deliveryFee)} de servicio de domicilio
                     </div>`
                  : ''
              }
              <div style="font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin-bottom: 4px;">
                👤 ${customerName}
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem;">
                <span style="color: var(--text-muted);">Saldo pendiente de cobro:</span>
                <strong style="font-size: 1.05rem; color: ${pendingAmount > 0 ? '#DC2626' : '#16A34A'};">
                  ${pendingAmount > 0 ? formatCOP(pendingAmount) : '✅ Ya pagado ($0)'}
                </strong>
              </div>
            </div>

            ${
              pendingAmount > 0
                ? `
              <!-- Selector de Opciones de Recaudo -->
              <div class="form-group" style="margin-bottom: 12px;">
                <label class="form-label" style="font-weight: 800; margin-bottom: 6px;">
                  💰 ¿Cómo se gestionó el pago en la entrega? *
                </label>
                <div style="display: grid; grid-template-columns: 1fr; gap: 8px;">
                  
                  <!-- Opción 1: Pago Total -->
                  <label class="payment-option-card" id="cardOptFull" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 2px solid #16A34A; background: #F0FDF4; border-radius: var(--radius-md); cursor: pointer; transition: all 0.2s ease;">
                    <input type="radio" name="deliveryPayOption" value="FULL" checked style="accent-color: #16A34A; transform: scale(1.15);" />
                    <div style="flex: 1;">
                      <div style="font-weight: 800; font-size: 0.9rem; color: #15803D;">
                        🟢 Pago Total Recibido (${formatCOP(pendingAmount)})
                      </div>
                      <div style="font-size: 0.74rem; color: #166534;">El cliente pagó la totalidad del saldo contraentrega</div>
                    </div>
                  </label>

                  <!-- Opción 2: Abono Parcial -->
                  <label class="payment-option-card" id="cardOptPartial" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1.5px solid var(--border-color); background: var(--bg-card); border-radius: var(--radius-md); cursor: pointer; transition: all 0.2s ease;">
                    <input type="radio" name="deliveryPayOption" value="PARTIAL" style="accent-color: #D97706; transform: scale(1.15);" />
                    <div style="flex: 1;">
                      <div style="font-weight: 800; font-size: 0.9rem; color: #92400E;">
                        🟡 Abono Parcial (Paga solo una parte)
                      </div>
                      <div style="font-size: 0.74rem; color: #B45309;">El cliente entregó una parte y queda debiendo el resto</div>
                    </div>
                  </label>

                  <!-- Opción 3: Se Entregó Fiado / No Pagó -->
                  <label class="payment-option-card" id="cardOptNoPay" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1.5px solid var(--border-color); background: var(--bg-card); border-radius: var(--radius-md); cursor: pointer; transition: all 0.2s ease;">
                    <input type="radio" name="deliveryPayOption" value="NO_PAYMENT" style="accent-color: #DC2626; transform: scale(1.15);" />
                    <div style="flex: 1;">
                      <div style="font-weight: 800; font-size: 0.9rem; color: #DC2626;">
                        🔴 Se Entregó y NO PAGÓ / NO ABONÓ ($0)
                      </div>
                      <div style="font-size: 0.74rem; color: #991B1B;">Se entregó el producto fiado (queda como saldo por cobrar)</div>
                    </div>
                  </label>

                </div>
              </div>

              <!-- Campo de Monto Abonado (Visible solo si es Abono Parcial) -->
              <div id="containerPartialAmount" class="form-group" style="display: none; margin-bottom: 12px; background: #FFFBEB; border: 1.5px solid #FDE68A; padding: 10px 12px; border-radius: var(--radius-md);">
                <label class="form-label" style="font-weight: 700; color: #92400E;">
                  ¿Cuánto dinero abonó el cliente? ($ COP) *
                </label>
                <input
                  type="number"
                  id="delivPartialAmountInput"
                  class="form-input"
                  min="1"
                  max="${pendingAmount}"
                  placeholder="Ej: 10000"
                  style="font-weight: 800; font-size: 1.05rem; color: #B45309;"
                />
                <small style="font-size: 0.74rem; color: #B45309; margin-top: 3px; display: block;">
                  El saldo restante quedará registrado automáticamente en la cuenta del cliente para cobrárselo después.
                </small>
              </div>

              <!-- Alerta Informativa cuando se selecciona No Pagó -->
              <div id="containerNoPayAlert" style="display: none; margin-bottom: 12px; background: #FEF2F2; border: 1.5px solid #FECACA; padding: 10px 12px; border-radius: var(--radius-md);">
                <div style="font-weight: 800; font-size: 0.85rem; color: #991B1B; display: flex; align-items: center; gap: 6px;">
                  <span>⚠️</span> Entrega registrada sin pago (Fiado)
                </div>
                <div style="font-size: 0.76rem; color: #7F1D1D; margin-top: 2px;">
                  El pedido cambiará al estado <strong>ENTREGADO</strong> y la deuda de <strong>${formatCOP(pendingAmount)}</strong> quedará pendiente en el módulo de Clientes para cobrarle después.
                </div>
              </div>

              <!-- Medio de Pago Recibido (Oculto si No Pagó) -->
              <div id="containerPaymentMethod" class="form-group" style="margin-bottom: 14px;">
                <label class="form-label" style="font-weight: 700;">
                  Medio de Pago Recibido *
                </label>
                <select id="delivPaymentMethod" class="form-select" style="font-weight: 700;">
                  <option value="EFECTIVO" selected>💵 Efectivo (Dinero en mano)</option>
                  <option value="NEQUI">🟣 Transferencia Nequi</option>
                  <option value="BANCOLOMBIA">🟡 Transferencia Bancolombia</option>
                  <option value="TRANSFERENCIA">💳 Otra Transferencia</option>
                </select>
              </div>
            `
                : `
              <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: var(--radius-md); padding: 12px; margin-bottom: 14px; text-align: center;">
                <div style="font-size: 1.2rem;">✨</div>
                <div style="font-weight: 800; color: #15803D; font-size: 0.95rem;">Pedido Pagado con Anterioridad</div>
                <div style="font-size: 0.78rem; color: #166534; margin-top: 2px;">
                  Este pedido ya no tiene saldo pendiente. Solo debes confirmar la entrega física al cliente.
                </div>
              </div>
            `
            }

            <!-- Campo de Nota Opcional -->
            <div class="form-group" style="margin-bottom: 4px;">
              <label class="form-label" style="font-weight: 700; display: flex; justify-content: space-between; align-items: center;">
                <span>📝 Nota u Observación de la Entrega</span>
                <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">(Opcional)</span>
              </label>
              <textarea
                id="delivNotesInput"
                class="form-input"
                rows="2"
                placeholder="Ej: Se entregó en la casa, transfiere en la noche / Paga el viernes / Recibió un familiar..."
                style="font-size: 0.85rem;"
              >${existingNotes}</textarea>
            </div>

          </div>
          <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" class="btn btn-outline" id="btnCancelDeliveryModal">Cancelar</button>
            <button type="submit" class="btn btn-accent" id="btnSubmitDelivery" style="font-weight: 800; padding: 10px 18px;">
              ${pendingAmount > 0 ? `✅ Entregar y Cobrar (${formatCOP(pendingAmount)})` : '✅ Confirmar Entrega'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const cardFull = document.getElementById('cardOptFull');
  const cardPartial = document.getElementById('cardOptPartial');
  const cardNoPay = document.getElementById('cardOptNoPay');
  const containerPartial = document.getElementById('containerPartialAmount');
  const partialInput = document.getElementById('delivPartialAmountInput');
  const containerNoPayAlert = document.getElementById('containerNoPayAlert');
  const containerMethod = document.getElementById('containerPaymentMethod');
  const submitBtn = document.getElementById('btnSubmitDelivery');
  const notesInput = document.getElementById('delivNotesInput');

  const updateOptionStyles = (selected) => {
    selectedPaymentOption = selected;
    if (cardFull) {
      cardFull.style.borderColor = selected === 'FULL' ? '#16A34A' : 'var(--border-color)';
      cardFull.style.background = selected === 'FULL' ? '#F0FDF4' : 'var(--bg-card)';
    }
    if (cardPartial) {
      cardPartial.style.borderColor = selected === 'PARTIAL' ? '#D97706' : 'var(--border-color)';
      cardPartial.style.background = selected === 'PARTIAL' ? '#FFFBEB' : 'var(--bg-card)';
    }
    if (cardNoPay) {
      cardNoPay.style.borderColor = selected === 'NO_PAYMENT' ? '#DC2626' : 'var(--border-color)';
      cardNoPay.style.background = selected === 'NO_PAYMENT' ? '#FEF2F2' : 'var(--bg-card)';
    }

    if (selected === 'FULL') {
      if (containerPartial) containerPartial.style.display = 'none';
      if (containerNoPayAlert) containerNoPayAlert.style.display = 'none';
      if (containerMethod) containerMethod.style.display = 'block';
      if (submitBtn) submitBtn.innerHTML = `✅ Entregar y Cobrar (${formatCOP(pendingAmount)})`;
    } else if (selected === 'PARTIAL') {
      if (containerPartial) containerPartial.style.display = 'block';
      if (containerNoPayAlert) containerNoPayAlert.style.display = 'none';
      if (containerMethod) containerMethod.style.display = 'block';
      if (submitBtn) submitBtn.innerHTML = `✅ Entregar y Registrar Abono`;
      if (partialInput && !partialInput.value) {
        partialInput.focus();
      }
    } else if (selected === 'NO_PAYMENT') {
      if (containerPartial) containerPartial.style.display = 'none';
      if (containerNoPayAlert) containerNoPayAlert.style.display = 'block';
      if (containerMethod) containerMethod.style.display = 'none';
      if (submitBtn) submitBtn.innerHTML = `✅ Entregar Sin Pago (Fiado)`;
      if (notesInput && !notesInput.value) {
        notesInput.placeholder = 'Ej: Paga el viernes / Transfiere más tarde / No estaba la persona encargada...';
      }
    }
  };

  document.querySelectorAll('input[name="deliveryPayOption"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      updateOptionStyles(e.target.value);
    });
  });

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseDeliveryModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelDeliveryModal')?.addEventListener('click', closeModal);

  document.getElementById('deliveryConfirmForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const notesVal = notesInput?.value?.trim() || null;
    const payload = {
      deliveryStatus: 'DELIVERED',
      notes: notesVal,
    };

    if (pendingAmount > 0) {
      if (selectedPaymentOption === 'FULL') {
        payload.paidAmount = totalAmount;
        payload.paymentMethod = document.getElementById('delivPaymentMethod')?.value || 'EFECTIVO';
      } else if (selectedPaymentOption === 'PARTIAL') {
        const partialVal = Number(partialInput?.value) || 0;
        if (partialVal <= 0 || partialVal > pendingAmount) {
          showToast(`Ingresa un valor de abono válido entre $1 y ${formatCOP(pendingAmount)}`, 'danger');
          partialInput?.focus();
          return;
        }
        payload.paidAmount = previousPaid + partialVal;
        payload.paymentMethod = document.getElementById('delivPaymentMethod')?.value || 'EFECTIVO';
      } else if (selectedPaymentOption === 'NO_PAYMENT') {
        payload.paidAmount = previousPaid; // Remains unchanged (e.g. 0)
        payload.paymentMethod = currentOrder.paymentMethod || 'EFECTIVO';
      }
    }

    try {
      await api.updateOrderDeliveryStatus(orderId, payload);
      if (selectedPaymentOption === 'NO_PAYMENT') {
        showToast('¡Entrega confirmada! Quedó registrada con saldo pendiente (fiado) 🛵📝');
      } else {
        showToast('¡Entrega y recaudo confirmados con éxito! 🎉');
      }
      closeModal();
      renderDelivery(parentContainer);
    } catch (err) {
      showToast(err.message || 'Error al confirmar entrega', 'danger');
    }
  });
}
