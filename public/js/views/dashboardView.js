import { api } from '../api.js';
import { formatCOP, formatDate, formatDateTime, getTodayLocalDateStr, showToast } from '../store.js';
import { openPaymentModal } from './ordersView.js';

let dashboardFilters = {
  period: 'all',
  specificDate: '',
  startDate: '',
  endDate: '',
  month: '',
};

export async function renderDashboard(container) {
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
    <div style="display: flex; justify-content: center; padding: 40px;">
      <span style="color: var(--primary); font-weight: 700;">Cargando métricas de YogurArte... 🥛</span>
    </div>
  `;

  try {
    const params = {};
    if (dashboardFilters.specificDate) {
      params.date = dashboardFilters.specificDate;
    } else if (dashboardFilters.startDate || dashboardFilters.endDate) {
      if (dashboardFilters.startDate) params.startDate = dashboardFilters.startDate;
      if (dashboardFilters.endDate) params.endDate = dashboardFilters.endDate;
    } else if (dashboardFilters.month) {
      params.month = dashboardFilters.month;
    } else {
      params.period = dashboardFilters.period;
    }

    const data = await api.getDashboardSummary(params);
    const { kpis, deliveredStats, inProcessStats, paymentBreakdown, deliveryBreakdown, lowStockAlerts, recentOrders, periodOrders } = data;
    const ordersList = periodOrders || recentOrders || [];

    let lowStockHtml = '';
    if (lowStockAlerts && lowStockAlerts.length > 0) {
      lowStockHtml = `
        <div class="stock-alert-banner" style="margin-bottom: 20px;">
          <div class="stock-alert-icon">⚠️</div>
          <div class="stock-alert-content">
            <div class="stock-alert-title">¡Atención! Insumos con bajo inventario:</div>
            <div class="stock-alert-list">
              ${lowStockAlerts
                .map((m) => `<strong>${m.name}</strong>: quedan ${m.currentStock} ${m.unit} (Mínimo sugerido: ${m.minStockAlert})`)
                .join(' • ')}
            </div>
          </div>
          <button class="btn btn-outline btn-sm" id="btnGoToInventory">Reabastecer</button>
        </div>
      `;
    }

    // Sección de pedidos entregados que aún no se han pagado
    let deliveredUnpaidSection = '';
    if (deliveredStats && deliveredStats.deliveredUnpaidOrders && deliveredStats.deliveredUnpaidOrders.length > 0) {
      deliveredUnpaidSection = `
        <div class="table-container" style="padding: 20px; margin-bottom: 24px; border: 1.5px solid #F87171; background: #FFFDFD; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.08);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.3rem;">🚨</span>
              <div>
                <h3 style="font-size: 1.15rem; font-weight: 800; color: #DC2626; margin: 0;">
                  Cobros Pendientes de Pedidos Entregados
                </h3>
                <span style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600;">
                  Estos productos ya están en manos del cliente y tienen saldo por recaudar (${deliveredStats.deliveredUnpaidCount} pedidos)
                </span>
              </div>
            </div>
            <div style="background: #FEE2E2; color: #DC2626; padding: 6px 14px; border-radius: var(--radius-md); font-weight: 800; font-size: 1rem; border: 1px solid #FECACA;">
              Total por Cobrar: ${formatCOP(deliveredStats.deliveredPendingToCollect)}
            </div>
          </div>

          <div style="overflow-x: auto;">
            <table class="app-table">
              <thead>
                <tr>
                  <th>Pedido #</th>
                  <th>Cliente</th>
                  <th>Dirección</th>
                  <th>Total</th>
                  <th>Abonado</th>
                  <th>Saldo a Cobrar</th>
                  <th style="text-align: right;">Acciones de Cobro</th>
                </tr>
              </thead>
              <tbody>
                ${deliveredStats.deliveredUnpaidOrders
                  .map((o) => {
                    const isUsername = o.customerPhone && (o.customerPhone.startsWith('@') || /[a-zA-Z]/.test(o.customerPhone));
                    const contactDisplay = isUsername && !o.customerPhone.startsWith('@') ? `@${o.customerPhone}` : o.customerPhone;

                    return `
                    <tr>
                      <td><strong style="color: var(--primary);">${o.orderNumber}</strong></td>
                      <td>
                        <strong>${o.customerName}</strong>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">
                          <span>${isUsername ? '💬' : '📞'}</span> ${contactDisplay || 'Sin contacto'}
                        </div>
                      </td>
                      <td><small>📍 ${o.deliveryAddress}</small></td>
                      <td><strong>${formatCOP(o.totalAmount)}</strong></td>
                      <td style="color: var(--success); font-weight: 600;">${formatCOP(o.paidAmount)}</td>
                      <td><strong style="color: var(--danger); font-size: 0.95rem;">${formatCOP(o.pendingAmount)}</strong></td>
                      <td style="text-align: right;">
                        <div style="display: inline-flex; gap: 6px;">
                          <button class="btn btn-whatsapp btn-sm btn-dash-whatsapp" data-id="${o.id}" title="Enviar recordatorio por WhatsApp">
                            📲 WhatsApp
                          </button>
                          <button class="btn btn-primary btn-sm btn-dash-pay" data-id="${o.id}" data-total="${o.totalAmount}" data-paid="${o.paidAmount}" data-pending="${o.pendingAmount}" title="Registrar pago recibido">
                            💵 Cobrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else {
      deliveredUnpaidSection = `
        <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: var(--radius-lg); padding: 16px 20px; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; box-shadow: var(--shadow-sm);">
          <span style="font-size: 1.4rem;">✨</span>
          <div>
            <strong style="color: #16A34A; font-size: 0.95rem;">¡Paz y Salvo en Entregas!</strong>
            <div style="font-size: 0.82rem; color: #15803D;">Todos los pedidos entregados han sido cobrados en su totalidad.</div>
          </div>
        </div>
      `;
    }

    // Texto de periodo activo
    let activeFilterLabel = 'Histórico Total';
    if (dashboardFilters.specificDate) {
      activeFilterLabel = `Día específico: ${formatDate(dashboardFilters.specificDate)}`;
    } else if (dashboardFilters.startDate || dashboardFilters.endDate) {
      activeFilterLabel = `Rango: ${dashboardFilters.startDate ? formatDate(dashboardFilters.startDate) : 'Inicio'} al ${dashboardFilters.endDate ? formatDate(dashboardFilters.endDate) : 'Hoy'}`;
    } else if (dashboardFilters.month) {
      const matchMonth = monthOptions.find((m) => m.val === dashboardFilters.month);
      activeFilterLabel = matchMonth ? matchMonth.label : dashboardFilters.month;
    } else if (dashboardFilters.period === 'today') {
      activeFilterLabel = 'Ventas de Hoy';
    } else if (dashboardFilters.period === 'yesterday') {
      activeFilterLabel = 'Ventas de Ayer';
    } else if (dashboardFilters.period === 'tomorrow') {
      activeFilterLabel = 'Entregas Programadas de Mañana';
    } else if (dashboardFilters.period === 'week') {
      activeFilterLabel = 'Ventas de Esta Semana';
    } else if (dashboardFilters.period === 'month') {
      activeFilterLabel = 'Ventas de Este Mes';
    }

    container.innerHTML = `
      <!-- Selector de Periodo y Calendario del Dashboard -->
      <div class="orders-toolbar-card" style="padding: 14px 18px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <!-- Pastillas Rápidas -->
            <div class="filter-chip-group">
              <button class="filter-chip ${dashboardFilters.period === 'all' && !dashboardFilters.specificDate && !dashboardFilters.startDate && !dashboardFilters.month ? 'active' : ''}" data-period="all">Histórico Total</button>
              <button class="filter-chip ${dashboardFilters.period === 'yesterday' && !dashboardFilters.specificDate && !dashboardFilters.startDate && !dashboardFilters.month ? 'active' : ''}" data-period="yesterday">Ayer</button>
              <button class="filter-chip ${dashboardFilters.period === 'today' && !dashboardFilters.specificDate && !dashboardFilters.startDate && !dashboardFilters.month ? 'active' : ''}" data-period="today">Hoy</button>
              <button class="filter-chip ${dashboardFilters.period === 'tomorrow' && !dashboardFilters.specificDate && !dashboardFilters.startDate && !dashboardFilters.month ? 'active' : ''}" data-period="tomorrow">Mañana</button>
              <button class="filter-chip ${dashboardFilters.period === 'week' && !dashboardFilters.specificDate && !dashboardFilters.startDate && !dashboardFilters.month ? 'active' : ''}" data-period="week">Esta Semana</button>
              <button class="filter-chip ${dashboardFilters.period === 'month' && !dashboardFilters.specificDate && !dashboardFilters.startDate && !dashboardFilters.month ? 'active' : ''}" data-period="month">Este Mes</button>
            </div>

            <!-- Selector de Calendario por Día Específico -->
            <div class="orders-calendar-picker ${dashboardFilters.specificDate ? 'has-date' : ''}">
              <label for="dashSpecificDate" style="font-size: 0.84rem; font-weight: 700; color: var(--primary); display: flex; align-items: center; gap: 4px; margin: 0; cursor: pointer;">
                <span>📅 Ver Día:</span>
              </label>
              <input 
                type="date" 
                id="dashSpecificDate" 
                value="${dashboardFilters.specificDate || ''}" 
                title="Selecciona una fecha en el calendario para ver las métricas de ese día específico"
              />
              ${
                dashboardFilters.specificDate
                  ? `<button type="button" id="btnClearDashDate" style="border: none; background: transparent; cursor: pointer; color: var(--danger); font-weight: 800; font-size: 0.9rem; padding: 0 4px;" title="Quitar filtro de fecha">✕</button>`
                  : ''
              }
            </div>

            <!-- Rango Personalizado Desde - Hasta -->
            <div style="display: flex; align-items: center; gap: 6px; background: var(--bg-app); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 4px 8px;">
              <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">Desde:</span>
              <input type="date" id="dashStartDate" value="${dashboardFilters.startDate || ''}" style="border: none; background: transparent; font-size: 0.8rem; font-weight: 600; color: var(--text-main); width: 120px;" />
              <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">Hasta:</span>
              <input type="date" id="dashEndDate" value="${dashboardFilters.endDate || ''}" style="border: none; background: transparent; font-size: 0.8rem; font-weight: 600; color: var(--text-main); width: 120px;" />
              <button class="btn btn-primary btn-sm" id="btnApplyDateRange" style="padding: 3px 8px; font-size: 0.76rem; font-weight: 700;">Filtrar</button>
            </div>

            <!-- Selector de Meses -->
            <select id="dashMonthSelect" class="orders-select-item" style="height: 38px;">
              <option value="">📅 Por Mes</option>
              ${monthOptions
                .map((m) => `<option value="${m.val}" ${dashboardFilters.month === m.val ? 'selected' : ''}>${m.label}</option>`)
                .join('')}
            </select>
          </div>

          <div style="background: var(--primary-light); color: var(--primary); padding: 6px 12px; border-radius: var(--radius-md); font-size: 0.85rem; font-weight: 800; border: 1px solid var(--border-color);">
            📌 ${activeFilterLabel} (${kpis.totalOrdersCount} ventas • ${kpis.totalLitersAll || 0} L)
          </div>
        </div>
      </div>

      ${lowStockHtml}

      <!-- KPI Grid Principal con Desglose de Recaudos -->
      <div class="kpi-grid" style="margin-bottom: 24px;">
        
        <!-- KPI 1: Por Cobrar de Entregados (Cobro Inmediato) -->
        <div class="kpi-card ${deliveredStats.deliveredPendingToCollect > 0 ? 'kpi-warning' : 'kpi-success'}" style="border: 1.5px solid ${deliveredStats.deliveredPendingToCollect > 0 ? '#F87171' : '#86EFAC'};">
          <div class="kpi-header">
            <span class="kpi-title" style="color: ${deliveredStats.deliveredPendingToCollect > 0 ? '#DC2626' : 'var(--text-main)'}; font-weight: 800;">
              🚨 Por Cobrar (Ya Entregados)
            </span>
            <div class="kpi-icon" style="background: #FEE2E2; color: #DC2626;">🛵</div>
          </div>
          <div class="kpi-value" style="color: #DC2626;">${formatCOP(deliveredStats.deliveredPendingToCollect)}</div>
          <div class="kpi-subtitle">
            ${deliveredStats.deliveredUnpaidCount} pedido(s) entregados sin pagar
          </div>
        </div>

        <!-- KPI 2: Total Recaudado / Cobrado -->
        <div class="kpi-card kpi-success">
          <div class="kpi-header">
            <span class="kpi-title">Total Recaudado (Cobrado)</span>
            <div class="kpi-icon" style="background: var(--success-light); color: var(--success);">💰</div>
          </div>
          <div class="kpi-value">${formatCOP(kpis.totalCashCollected)}</div>
          <div class="kpi-subtitle">Ventas totales: ${formatCOP(kpis.totalSalesAmount)}</div>
        </div>

        <!-- KPI 3: Por Cobrar de Pedidos en Proceso -->
        <div class="kpi-card kpi-warning">
          <div class="kpi-header">
            <span class="kpi-title">Por Cobrar (En Proceso)</span>
            <div class="kpi-icon" style="background: var(--warning-light); color: var(--warning);">🥣</div>
          </div>
          <div class="kpi-value" style="color: var(--accent);">${formatCOP(inProcessStats.inProcessPendingToCollect)}</div>
          <div class="kpi-subtitle">${inProcessStats.inProcessOrdersCount} pedidos por entregar / en ruta</div>
        </div>

        <!-- KPI 4: Litros Vendidos (Ya Entregados) -->
        <div class="kpi-card kpi-accent">
          <div class="kpi-header">
            <span class="kpi-title" style="color: var(--accent); font-weight: 800;">🥛 Litros Vendidos (Entregados)</span>
            <div class="kpi-icon" style="background: var(--accent-light); color: var(--accent);">✅</div>
          </div>
          <div class="kpi-value">${kpis.deliveredLiters || 0} L</div>
          <div class="kpi-subtitle">${deliveryBreakdown.delivered} pedido(s) entregados con éxito</div>
        </div>

        <!-- KPI 5: Litros Encargados (En Proceso) -->
        <div class="kpi-card" style="border: 1.5px solid var(--border-color); background: #FAF7FC;">
          <div class="kpi-header">
            <span class="kpi-title" style="color: var(--primary); font-weight: 800;">🥣 Litros Encargados (En Proceso)</span>
            <div class="kpi-icon" style="background: var(--primary-light); color: var(--primary);">⏳</div>
          </div>
          <div class="kpi-value" style="color: var(--primary);">${kpis.inProcessLiters || 0} L</div>
          <div class="kpi-subtitle">Total demanda: ${kpis.totalLitersAll || 0} L (${kpis.totalOrdersCount} pedidos)</div>
        </div>

        <!-- KPI 6: Gastos Totales -->
        <div class="kpi-card kpi-info">
          <div class="kpi-header">
            <span class="kpi-title">Gastos Totales</span>
            <div class="kpi-icon" style="background: var(--info-light); color: var(--info);">🧾</div>
          </div>
          <div class="kpi-value">${formatCOP(kpis.totalExpenses)}</div>
          <div class="kpi-subtitle">Insumos: ${formatCOP(kpis.totalRawMaterialPurchases)} | Otros: ${formatCOP(kpis.totalGeneralExpenses)}</div>
        </div>

        <!-- KPI 7: Ganancia Neta Real -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">Ganancia Neta Real</span>
            <div class="kpi-icon" style="background: var(--primary-light); color: var(--primary);">📈</div>
          </div>
          <div class="kpi-value" style="color: ${kpis.netProfit >= 0 ? 'var(--success)' : 'var(--danger)'};">
            ${formatCOP(kpis.netProfit)}
          </div>
          <div class="kpi-subtitle">Dinero cobrado menos gastos totales</div>
        </div>

      </div>

      <!-- Sección de Cobros Pendientes de Entregados -->
      ${deliveredUnpaidSection}

      <!-- Resumen Operativo y Producción -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 24px;">
        
        <!-- Estado de Pedidos y Entregas -->
        <div class="order-card" style="padding: 22px;">
          <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--primary); margin-bottom: 16px;">
            📊 Desglose de Entregas, Litros y Pagos
          </h3>
          
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">🛵 Pedidos Entregados:</span>
              <strong style="font-size: 1rem; color: var(--text-main);">${deliveryBreakdown.delivered} pedido(s) • ${kpis.deliveredLiters || 0} L (${formatCOP(deliveredStats.deliveredTotalSales)})</strong>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-left: 14px; font-size: 0.85rem;">
              <span style="color: var(--success); font-weight: 700;">• Cobrado de entregados:</span>
              <strong style="color: var(--success);">${formatCOP(deliveredStats.deliveredPaidAmount)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-left: 14px; font-size: 0.85rem;">
              <span style="color: var(--danger); font-weight: 700;">• Saldo por cobrar de entregados:</span>
              <strong style="color: var(--danger);">${formatCOP(deliveredStats.deliveredPendingToCollect)}</strong>
            </div>

            <div style="height: 1px; background: var(--border-subtle); margin: 4px 0;"></div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">🥣 Pedidos en Preparación / Ruta:</span>
              <strong style="font-size: 1rem; color: var(--accent);">${deliveryBreakdown.pendingDelivery} pedido(s) • ${kpis.inProcessLiters || 0} L (${formatCOP(inProcessStats.inProcessTotalSales)})</strong>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-left: 14px; font-size: 0.85rem;">
              <span style="color: var(--text-muted); font-weight: 700;">• Saldo que se cobrará al entregar:</span>
              <strong style="color: var(--accent);">${formatCOP(inProcessStats.inProcessPendingToCollect)}</strong>
            </div>
          </div>
        </div>

        <!-- Producción Acumulada del Mes -->
        <div class="order-card" style="padding: 22px; background: linear-gradient(135deg, #FFFDF9 0%, #F5ECF9 100%);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
            <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--primary);">
              🍶 Producción Artesanal
            </h3>
            <span class="badge" style="background: var(--primary-light); color: var(--primary); font-weight: 800;">
              ${new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(new Date()).toUpperCase()}
            </span>
          </div>
          
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">
            Litros de yogur fermentados y envasados este mes.
          </p>

          <div style="margin-bottom: 8px;">
            <div style="font-size: 2.2rem; font-weight: 900; color: var(--primary); line-height: 1;">
              ${kpis.totalLitersProducedThisMonth || 0} <span style="font-size: 1.2rem; font-weight: 700;">Litros este Mes</span>
            </div>
            <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 6px;">
              ${kpis.totalBatchesCountThisMonth || 0} lote(s) producidos este mes • Histórico total: <strong>${kpis.totalLitersProducedAllTime || 0} L</strong>
            </div>
          </div>

          <button class="btn btn-primary btn-sm" id="btnGoToBatches" style="margin-top: auto; align-self: flex-start;">
            + Registrar Lote de Yogur
          </button>
        </div>

      </div>

      <!-- Listado de Ventas del Periodo Seleccionado -->
      <div class="table-container" style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--primary); margin: 0;">
              📋 Ventas del Periodo: ${activeFilterLabel}
            </h3>
            <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">
              Mostrando ${ordersList.length} venta(s) • Total: ${formatCOP(ordersList.reduce((s, o) => s + (o.totalAmount || 0), 0))} (${ordersList.reduce((s, o) => s + (o.totalLiters || 0), 0)} L)
            </span>
          </div>
          <button class="btn btn-outline btn-sm" id="btnGoToOrders">Ir a Gestión de Pedidos ➡️</button>
        </div>

        ${
          ordersList && ordersList.length > 0
            ? `
          <div style="overflow-x: auto;">
            <table class="app-table">
              <thead>
                <tr>
                  <th>Pedido #</th>
                  <th>Cliente & Teléfono</th>
                  <th>Lote / Sabor</th>
                  <th>Litros / Envases</th>
                  <th>Total Venta</th>
                  <th>Pago & Cobro</th>
                  <th>Entrega</th>
                  <th>Fecha</th>
                  <th style="text-align: right;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${ordersList
                  .map((o) => {
                    let payBadge = '<span class="badge badge-pending">🔴 Pendiente</span>';
                    if (o.paymentStatus === 'PAID') payBadge = '<span class="badge badge-paid">🟢 Pagado</span>';
                    if (o.paymentStatus === 'PARTIAL')
                      payBadge = `<span class="badge badge-partial">🟡 Abono: ${formatCOP(o.paidAmount)}</span>`;

                    const isUsername = o.customer?.phone && (o.customer.phone.startsWith('@') || /[a-zA-Z]/.test(o.customer.phone));
                    const contactDisplay = isUsername && !o.customer.phone.startsWith('@') ? `@${o.customer.phone}` : (o.customer?.phone || '');

                    return `
                    <tr>
                      <td>
                        <strong style="color: var(--primary);">${o.orderNumber}</strong>
                      </td>
                      <td>
                        <div><strong>${o.customer?.fullName || 'Cliente'}</strong></div>
                        <small style="color: var(--text-muted);">${contactDisplay ? `📞 ${contactDisplay}` : ''}</small>
                      </td>
                      <td>
                        ${
                          o.batch
                            ? `<span class="badge" style="background: #FAF5FF; color: var(--primary); border: 1px solid #DDD6FE; font-weight: 800; font-size: 0.72rem;">🍶 ${o.batch.batchCode}</span>
                               <div style="font-size: 0.75rem; color: var(--accent); font-weight: 700;">${o.batch.flavor}</div>`
                            : `<small style="color: var(--text-muted);">${o.flavor || 'Estándar'}</small>`
                        }
                      </td>
                      <td>
                        <strong>${o.totalLiters} L</strong>
                        <div style="font-size: 0.72rem; color: var(--text-muted);">${o.bottleSize || '1L'} • ${o.quantityBottles || 1} bot</div>
                      </td>
                      <td>
                        <strong style="color: var(--primary); font-size: 0.95rem;">${formatCOP(o.totalAmount)}</strong>
                      </td>
                      <td>
                        <div>${payBadge}</div>
                        ${o.pendingAmount > 0 ? `<div style="font-size: 0.73rem; color: var(--danger); font-weight: 700; margin-top: 2px;">Debe: ${formatCOP(o.pendingAmount)}</div>` : ''}
                      </td>
                      <td>
                        <span class="badge ${o.deliveryStatus === 'DELIVERED' ? 'badge-delivered' : 'badge-preparing'}">
                          ${o.deliveryStatus === 'DELIVERED' ? '✅ Entregado' : (o.deliveryStatus === 'IN_ROUTE' ? '🛵 En Ruta' : '🕒 Pendiente')}
                        </span>
                      </td>
                      <td>
                        <div style="font-size: 0.8rem; font-weight: 600;">${formatDate(o.orderDate)}</div>
                        ${o.deliveryDate ? `<div style="font-size: 0.72rem; color: var(--primary); font-weight: 700;">🛵 ${formatDate(o.deliveryDate)}</div>` : ''}
                      </td>
                      <td style="text-align: right;">
                        <div style="display: inline-flex; gap: 4px;">
                          <button class="btn btn-whatsapp btn-sm btn-dash-whatsapp" data-id="${o.id}" style="padding: 3px 6px; font-size: 0.75rem;" title="WhatsApp">
                            📲
                          </button>
                          ${
                            o.pendingAmount > 0
                              ? `<button class="btn btn-primary btn-sm btn-dash-pay" data-id="${o.id}" data-total="${o.totalAmount}" data-paid="${o.paidAmount}" data-pending="${o.pendingAmount}" style="padding: 3px 8px; font-size: 0.75rem;" title="Registrar Cobro">
                                  💵 Cobrar
                                 </button>`
                              : ''
                          }
                        </div>
                      </td>
                    </tr>
                  `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>
        `
            : `
          <div class="empty-state" style="padding: 30px 20px;">
            <div class="empty-state-icon">📅</div>
            <div class="empty-state-title">No hay ventas registradas para este periodo</div>
            <div class="empty-state-text">Selecciona otra fecha o rango en la barra superior o registra un nuevo pedido.</div>
            <button class="btn btn-accent" id="btnNewOrderFromDash" style="margin-top: 10px;">+ Registrar Pedido</button>
          </div>
        `
        }
      </div>
    `;

    // Listeners del selector de pastillas rápidas
    container.querySelectorAll('[data-period]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        dashboardFilters.period = e.currentTarget.dataset.period;
        dashboardFilters.specificDate = '';
        dashboardFilters.startDate = '';
        dashboardFilters.endDate = '';
        dashboardFilters.month = '';
        renderDashboard(container);
      });
    });

    // Selector de fecha específica de calendario
    const dateInput = container.querySelector('#dashSpecificDate');
    dateInput?.addEventListener('change', (e) => {
      dashboardFilters.specificDate = e.target.value;
      dashboardFilters.startDate = '';
      dashboardFilters.endDate = '';
      dashboardFilters.period = 'custom';
      dashboardFilters.month = '';
      renderDashboard(container);
    });

    container.querySelector('#btnClearDashDate')?.addEventListener('click', () => {
      dashboardFilters.specificDate = '';
      dashboardFilters.startDate = '';
      dashboardFilters.endDate = '';
      dashboardFilters.period = 'all';
      renderDashboard(container);
    });

    // Selector de Rango Desde - Hasta
    container.querySelector('#btnApplyDateRange')?.addEventListener('click', () => {
      const s = container.querySelector('#dashStartDate')?.value;
      const e = container.querySelector('#dashEndDate')?.value;
      if (!s && !e) {
        showToast('Selecciona al menos una fecha de inicio o fin', 'warning');
        return;
      }
      dashboardFilters.startDate = s || '';
      dashboardFilters.endDate = e || '';
      dashboardFilters.specificDate = '';
      dashboardFilters.month = '';
      dashboardFilters.period = 'custom';
      renderDashboard(container);
    });

    // Selector de Mes
    const monthSelect = container.querySelector('#dashMonthSelect');
    monthSelect?.addEventListener('change', (e) => {
      dashboardFilters.month = e.target.value;
      dashboardFilters.specificDate = '';
      dashboardFilters.startDate = '';
      dashboardFilters.endDate = '';
      dashboardFilters.period = 'custom';
      renderDashboard(container);
    });

    // Listeners de WhatsApp en pedidos
    container.querySelectorAll('.btn-dash-whatsapp').forEach((btn) => {
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

    // Listeners de cobro rápido en pedidos
    container.querySelectorAll('.btn-dash-pay').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const { id, total, paid, pending } = e.currentTarget.dataset;
        openPaymentModal(id, Number(total), Number(paid), Number(pending), () => {
          renderDashboard(container);
        });
      });
    });

    // Event listeners para botones de navegación
    container.querySelector('#btnGoToInventory')?.addEventListener('click', () => {
      document.querySelector('[data-tab="inventory"]')?.click();
    });
    container.querySelector('#btnGoToBatches')?.addEventListener('click', () => {
      document.querySelector('[data-tab="batches"]')?.click();
    });
    container.querySelector('#btnGoToOrders')?.addEventListener('click', () => {
      document.querySelector('[data-tab="orders"]')?.click();
    });
    container.querySelector('#btnNewOrderFromDash')?.addEventListener('click', () => {
      document.getElementById('btnNewOrderGlobal')?.click();
    });
  } catch (error) {
    console.error('Error rendering dashboard:', error);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-title">Error al cargar datos del dashboard</div>
        <div class="empty-state-text">Verifica que el servidor esté activo y la base de datos conectada.</div>
      </div>
    `;
  }
}
