import { api } from '../api.js';
import { formatCOP, formatDate, formatDateTime, formatStock, getTodayLocalDateStr, showToast } from '../store.js';
import { openPaymentModal } from './ordersView.js';
import { openCashMovementModal } from './expensesView.js';

const WA_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="display: inline-block; vertical-align: -2px; margin-right: 4px;"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>`;

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
    const { kpis, deliveredStats, inProcessStats, paymentBreakdown, deliveryBreakdown, lowStockAlerts, recentOrders, periodOrders, creditSummary } = data;
    const ordersList = periodOrders || recentOrders || [];

    let creditAlertHtml = '';
    if (creditSummary && creditSummary.activeCreditsCount > 0) {
      const activeList = creditSummary.activeCredits || [];
      const nextDue = activeList.find((c) => c.nextDueDate);

      creditAlertHtml = `
        <div style="background: #EFF6FF; border: 1.5px solid #BFDBFE; border-radius: var(--radius-md); padding: 12px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; box-shadow: var(--shadow-sm);">
          <div style="display: flex; gap: 10px; align-items: center;">
            <span style="font-size: 1.5rem;">💳</span>
            <div>
              <div style="font-weight: 800; font-size: 0.92rem; color: #1E40AF;">
                Compras a Cuotas Activas (${creditSummary.activeCreditsCount}) • Deuda Pendiente: <strong style="color: #DC2626;">${formatCOP(creditSummary.totalRemainingDebt)}</strong>
              </div>
              <div style="font-size: 0.76rem; color: #1E40AF;">
                ${nextDue ? `Próximo pago: <strong>${formatDate(nextDue.nextDueDate)}</strong> (${formatCOP(nextDue.installmentAmount || nextDue.remainingBalance)} - ${nextDue.title})` : 'Créditos y cuotas al día'}
              </div>
            </div>
          </div>
          <button class="btn btn-primary btn-sm" id="btnDashGoToCredits" style="font-weight: 800; font-size: 0.8rem;">
            Gestionar Cuotas ↗
          </button>
        </div>
      `;
    }

    let lowStockHtml = '';
    if (lowStockAlerts && lowStockAlerts.length > 0) {
      lowStockHtml = `
        <div class="stock-alert-banner" style="margin-bottom: 20px;">
          <div class="stock-alert-icon">⚠️</div>
          <div class="stock-alert-content">
            <div class="stock-alert-title">¡Atención! Insumos con bajo inventario:</div>
            <div class="stock-alert-list">
              ${lowStockAlerts
                .map((m) => `<strong>${m.name}</strong>: quedan ${formatStock(m.currentStock, 2)} ${m.unit} (Mínimo sugerido: ${formatStock(m.minStockAlert, 2)})`)
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
                            ${WA_ICON_SVG} WhatsApp
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
      <div class="orders-toolbar-card dash-toolbar-card">
        <div class="dash-toolbar-content">
          
          <div class="dash-filters-wrap">
            <!-- Pastillas Rápidas -->
            <div class="filter-chip-group dash-filter-chips">
              <button class="filter-chip ${dashboardFilters.period === 'all' && !dashboardFilters.specificDate && !dashboardFilters.startDate && !dashboardFilters.month ? 'active' : ''}" data-period="all">Histórico Total</button>
              <button class="filter-chip ${dashboardFilters.period === 'yesterday' && !dashboardFilters.specificDate && !dashboardFilters.startDate && !dashboardFilters.month ? 'active' : ''}" data-period="yesterday">Ayer</button>
              <button class="filter-chip ${dashboardFilters.period === 'today' && !dashboardFilters.specificDate && !dashboardFilters.startDate && !dashboardFilters.month ? 'active' : ''}" data-period="today">Hoy</button>
              <button class="filter-chip ${dashboardFilters.period === 'tomorrow' && !dashboardFilters.specificDate && !dashboardFilters.startDate && !dashboardFilters.month ? 'active' : ''}" data-period="tomorrow">Mañana</button>
              <button class="filter-chip ${dashboardFilters.period === 'week' && !dashboardFilters.specificDate && !dashboardFilters.startDate && !dashboardFilters.month ? 'active' : ''}" data-period="week">Esta Semana</button>
              <button class="filter-chip ${dashboardFilters.period === 'month' && !dashboardFilters.specificDate && !dashboardFilters.startDate && !dashboardFilters.month ? 'active' : ''}" data-period="month">Este Mes</button>
            </div>

            <div class="dash-sub-filters">
              <!-- Selector de Calendario por Día Específico -->
              <div class="orders-calendar-picker ${dashboardFilters.specificDate ? 'has-date' : ''} dash-picker">
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
              <div class="dash-date-range-box">
                <div class="dash-date-field">
                  <span class="dash-date-label">Desde:</span>
                  <input type="date" id="dashStartDate" class="dash-date-input" value="${dashboardFilters.startDate || ''}" />
                </div>
                <div class="dash-date-field">
                  <span class="dash-date-label">Hasta:</span>
                  <input type="date" id="dashEndDate" class="dash-date-input" value="${dashboardFilters.endDate || ''}" />
                </div>
                <button class="btn btn-primary btn-sm" id="btnApplyDateRange" style="padding: 4px 10px; font-size: 0.78rem; font-weight: 700; height: 32px; white-space: nowrap;">Filtrar</button>
              </div>

              <!-- Selector de Meses -->
              <select id="dashMonthSelect" class="orders-select-item dash-month-select">
                <option value="">📅 Por Mes</option>
                ${monthOptions
                  .map((m) => `<option value="${m.val}" ${dashboardFilters.month === m.val ? 'selected' : ''}>${m.label}</option>`)
                  .join('')}
              </select>
            </div>
          </div>

          <div class="dash-active-filter-badge">
            📌 ${activeFilterLabel} (${kpis.totalOrdersCount} ventas • ${kpis.totalLitersAll || 0} L)
          </div>
        </div>
      </div>

      ${creditAlertHtml}
      ${lowStockHtml}

      <!-- KPI Grid Principal con Desglose de Recaudos y Clic Interactivo -->
      <div class="kpi-grid" style="margin-bottom: 24px;">
        
        <!-- KPI 1: Dinero en Caja (Saldo Disponible Real) -->
        <div class="kpi-card ${kpis.cashBalance >= 0 ? 'kpi-success' : 'kpi-warning'} kpi-clickable" id="kpiCashBalanceCard" style="cursor: pointer; position: relative; transition: all 0.2s ease; border: 2px solid ${kpis.cashBalance >= 0 ? '#10B981' : '#F59E0B'}; background: ${kpis.cashBalance >= 0 ? '#F0FDF4' : '#FFFBEB'};" title="🔍 Haz clic para ver el arqueo de caja y flujo de dinero">
          <div class="kpi-header">
            <span class="kpi-title" style="color: ${kpis.cashBalance >= 0 ? '#065F46' : '#92400E'}; font-weight: 800;">
              💵 Dinero en Caja (Saldo) 🔍
            </span>
            <div class="kpi-icon" style="background: ${kpis.cashBalance >= 0 ? '#D1FAE5' : '#FEF3C7'}; color: ${kpis.cashBalance >= 0 ? '#059669' : '#D97706'};">💵</div>
          </div>
          <div class="kpi-value" style="color: ${kpis.cashBalance >= 0 ? '#047857' : '#D97706'}; font-weight: 900;">
            ${formatCOP(kpis.cashBalance)}
          </div>
          <div class="kpi-subtitle" style="display: flex; justify-content: space-between; align-items: center; font-weight: 700;">
            <span style="font-size: 0.76rem; color: ${kpis.cashBalance >= 0 ? '#065F46' : '#92400E'};">
              🟢 +${formatCOP(kpis.totalCashCollected)} • 🔴 -${formatCOP(kpis.totalOutflow || kpis.totalExpenses)}
            </span>
            <span style="font-size: 0.72rem; color: ${kpis.cashBalance >= 0 ? '#059669' : '#D97706'}; font-weight: 800;">Ver arqueo ↗</span>
          </div>
        </div>

        <!-- KPI 2: Por Cobrar de Entregados (Cobro Inmediato) -->
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

        <!-- KPI 3: Total Recaudado / Cobrado (Clicable para Desglose por Lote/Sabor) -->
        <div class="kpi-card kpi-success kpi-clickable" id="kpiTotalCollectedCard" style="cursor: pointer; position: relative; transition: all 0.2s ease;" title="🔍 Haz clic para ver el desglose por lote, sabor y ventas por cobrar">
          <div class="kpi-header">
            <span class="kpi-title">Total Recaudado (Cobrado) 🔍</span>
            <div class="kpi-icon" style="background: var(--success-light); color: var(--success);">💰</div>
          </div>
          <div class="kpi-value">${formatCOP(kpis.totalCashCollected)}</div>
          <div class="kpi-subtitle" style="display: flex; justify-content: space-between; align-items: center;">
            <span>Ventas totales: ${formatCOP(kpis.totalSalesAmount)}</span>
            <span style="font-size: 0.72rem; color: var(--success); font-weight: 800;">Ver desglose ↗</span>
          </div>
        </div>

        <!-- KPI 3: Por Cobrar de Pedidos en Proceso (Clicable para ver clientes y lotes) -->
        <div class="kpi-card kpi-warning kpi-clickable" id="kpiInProcessPendingCard" style="cursor: pointer; position: relative; transition: all 0.2s ease;" title="🔍 Haz clic para ver los clientes y saldos pendientes por lote/sabor">
          <div class="kpi-header">
            <span class="kpi-title">Por Cobrar (En Proceso) 🔍</span>
            <div class="kpi-icon" style="background: var(--warning-light); color: var(--warning);">🥣</div>
          </div>
          <div class="kpi-value" style="color: var(--accent);">${formatCOP(inProcessStats.inProcessPendingToCollect)}</div>
          <div class="kpi-subtitle" style="display: flex; justify-content: space-between; align-items: center;">
            <span>${inProcessStats.inProcessOrdersCount} pedidos por entregar</span>
            <span style="font-size: 0.72rem; color: var(--accent); font-weight: 800;">Ver clientes ↗</span>
          </div>
        </div>

        <!-- KPI 4: Litros Vendidos (Ya Entregados) (Clicable para ver clientes y lotes) -->
        <div class="kpi-card kpi-accent kpi-clickable" id="kpiDeliveredLitersCard" style="cursor: pointer; position: relative; transition: all 0.2s ease;" title="🔍 Haz clic para ver los clientes y litros entregados por lote">
          <div class="kpi-header">
            <span class="kpi-title" style="color: var(--accent); font-weight: 800;">🥛 Litros Vendidos (Entregados) 🔍</span>
            <div class="kpi-icon" style="background: var(--accent-light); color: var(--accent);">✅</div>
          </div>
          <div class="kpi-value">${kpis.deliveredLiters || 0} L</div>
          <div class="kpi-subtitle" style="display: flex; justify-content: space-between; align-items: center;">
            <span>${deliveryBreakdown.delivered} pedido(s) entregados</span>
            <span style="font-size: 0.72rem; color: var(--accent); font-weight: 800;">Ver detalle ↗</span>
          </div>
        </div>

        <!-- KPI 5: Litros Encargados (En Proceso) (Clicable para ver cola por lote) -->
        <div class="kpi-card kpi-clickable" id="kpiInProcessLitersCard" style="border: 1.5px solid var(--border-color); background: #FAF7FC; cursor: pointer; position: relative; transition: all 0.2s ease;" title="🔍 Haz clic para ver la lista de espera y pedidos encargados">
          <div class="kpi-header">
            <span class="kpi-title" style="color: var(--primary); font-weight: 800;">🥣 Litros Encargados (En Proceso) 🔍</span>
            <div class="kpi-icon" style="background: var(--primary-light); color: var(--primary);">⏳</div>
          </div>
          <div class="kpi-value" style="color: var(--primary);">${kpis.inProcessLiters || 0} L</div>
          <div class="kpi-subtitle" style="display: flex; justify-content: space-between; align-items: center;">
            <span>Demanda en cola (${inProcessStats.inProcessOrdersCount} pedidos)</span>
            <span style="font-size: 0.72rem; color: var(--primary); font-weight: 800;">Ver lista ↗</span>
          </div>
        </div>

        <!-- KPI 6: Gastos Totales (Clicable para ver Desglose por Fechas e Insumos/Nómina/Retiros) -->
        <div class="kpi-card kpi-info kpi-clickable" id="kpiTotalExpensesCard" style="cursor: pointer; position: relative; transition: all 0.2s ease;" title="🔍 Haz clic para ver el desglose de compras, infraestructura, nómina y retiros">
          <div class="kpi-header">
            <span class="kpi-title">Gastos Totales 🔍</span>
            <div class="kpi-icon" style="background: var(--info-light); color: var(--info);">🧾</div>
          </div>
          <div class="kpi-value">${formatCOP(kpis.totalExpenses)}</div>
          <div class="kpi-subtitle" style="display: flex; justify-content: space-between; align-items: center;">
            <span>Insumos, nómina y otros</span>
            <span style="font-size: 0.72rem; color: var(--info); font-weight: 800;">Ver egresos ↗</span>
          </div>
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
                          <button class="btn btn-whatsapp btn-sm btn-dash-whatsapp" data-id="${o.id}" style="padding: 3px 6px; font-size: 0.75rem;" title="Enviar WhatsApp">
                            ${WA_ICON_SVG}
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

    // Clics en KPIs para abrir Modales Interactivos
    const detailedData = data.detailedBreakdowns || {};

    // 0. Clic en Dinero en Caja (Saldo)
    container.querySelector('#kpiCashBalanceCard')?.addEventListener('click', () => {
      openCashBalanceModal(detailedData.cashFlow || {}, kpis, activeFilterLabel);
    });

    // 1. Clic en Gastos Totales
    container.querySelector('#kpiTotalExpensesCard')?.addEventListener('click', () => {
      openExpensesBreakdownModal(detailedData.expenses || {}, kpis, activeFilterLabel);
    });

    // 2. Clic en Total Recaudado / Cobrado
    container.querySelector('#kpiTotalCollectedCard')?.addEventListener('click', () => {
      openSalesBreakdownModal(detailedData.salesByBatchAndFlavor || {}, kpis, activeFilterLabel);
    });

    // 3. Clic en Por Cobrar (En Proceso)
    container.querySelector('#kpiInProcessPendingCard')?.addEventListener('click', () => {
      openInProcessPendingModal(detailedData.salesByBatchAndFlavor || {}, inProcessStats, activeFilterLabel);
    });

    // 4. Clic en Litros Vendidos (Entregados)
    container.querySelector('#kpiDeliveredLitersCard')?.addEventListener('click', () => {
      openDeliveredLitersModal(detailedData.salesByBatchAndFlavor || {}, kpis, activeFilterLabel);
    });

    // 5. Clic en Litros Encargados (En Proceso)
    container.querySelector('#kpiInProcessLitersCard')?.addEventListener('click', () => {
      openInProcessLitersModal(detailedData.salesByBatchAndFlavor || {}, kpis, activeFilterLabel);
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
    container.querySelector('#btnDashGoToCredits')?.addEventListener('click', () => {
      document.querySelector('[data-tab="expenses"]')?.click();
      setTimeout(() => {
        document.getElementById('btnSubTabCredits')?.click();
      }, 100);
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

// ----------------------------------------------------
// MODALES DE DESGLOSE INTERACTIVO AL HACER CLIC EN KPIS
// ----------------------------------------------------

// 1. Modal de Desglose de Gastos Totales
function openExpensesBreakdownModal(expensesData, kpis, periodLabel) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  const rawMaterials = expensesData.rawMaterials || [];
  const generalExpenses = expensesData.generalExpenses || [];
  const payroll = expensesData.payroll || [];
  const ownerDraws = expensesData.ownerDraws || [];

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 720px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">🧾 Desglose Detallado de Gastos</h3>
            <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">
              Periodo: <strong>${periodLabel}</strong> • Total Egresos: <strong style="color: var(--danger);">${formatCOP(kpis.totalExpenses)}</strong>
            </span>
          </div>
          <button class="modal-close-btn" id="btnCloseExpModal">✕</button>
        </div>
        <div class="modal-body" style="max-height: 75vh; overflow-y: auto;">

          <!-- Tarjetas Resumen de Categorías -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin-bottom: 16px;">
            <div style="background: #FFF7ED; padding: 10px; border-radius: var(--radius-md); border: 1px solid #FFEDD5; text-align: center;">
              <span style="font-size: 0.72rem; font-weight: 700; color: #C2410C;">🥛 Insumos</span>
              <div style="font-size: 0.95rem; font-weight: 900; color: #EA580C;">${formatCOP(kpis.totalRawMaterialPurchases)}</div>
            </div>

            <div style="background: #F0FDF4; padding: 10px; border-radius: var(--radius-md); border: 1px solid #DCFCE7; text-align: center;">
              <span style="font-size: 0.72rem; font-weight: 700; color: #15803D;">👥 Nómina</span>
              <div style="font-size: 0.95rem; font-weight: 900; color: #16A34A;">${formatCOP(kpis.totalPayrollExpenses || 0)}</div>
            </div>

            <div style="background: #F8FAFC; padding: 10px; border-radius: var(--radius-md); border: 1px solid #E2E8F0; text-align: center;">
              <span style="font-size: 0.72rem; font-weight: 700; color: #475569;">⚙️ Otros Gastos</span>
              <div style="font-size: 0.95rem; font-weight: 900; color: #334155;">${formatCOP(kpis.totalGeneralExpenses)}</div>
            </div>

            <div style="background: #FAF5FF; padding: 10px; border-radius: var(--radius-md); border: 1px solid #DDD6FE; text-align: center;">
              <span style="font-size: 0.72rem; font-weight: 700; color: #6D28D9;">👑 Retiros Socios</span>
              <div style="font-size: 0.95rem; font-weight: 900; color: #7C3AED;">${formatCOP(kpis.totalOwnerDraws || 0)}</div>
            </div>
          </div>

          <!-- 1. Compras de Insumos -->
          <div style="margin-bottom: 18px;">
            <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--primary); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
              <span>🥛 Compras de Materia Prima e Insumos</span>
              <span class="badge" style="font-size: 0.72rem;">${rawMaterials.length}</span>
            </h4>
            ${
              rawMaterials.length > 0
                ? `
              <div class="table-responsive">
                <table class="app-table" style="font-size: 0.82rem;">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Insumo</th>
                      <th>Cantidad</th>
                      <th>Proveedor</th>
                      <th style="text-align: right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rawMaterials
                      .map(
                        (r) => `
                      <tr>
                        <td>${formatDate(r.date)}</td>
                        <td><strong>${r.name}</strong></td>
                        <td>${r.quantity} ${r.unit}</td>
                        <td><small>${r.supplier}</small></td>
                        <td style="text-align: right; font-weight: 800; color: var(--danger);">${formatCOP(r.totalCost)}</td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
            `
                : `<p style="font-size: 0.8rem; color: var(--text-muted); font-style: italic; margin-left: 8px;">No hay compras de insumos en este periodo.</p>`
            }
          </div>

          <!-- 2. Pagos de Nómina -->
          <div style="margin-bottom: 18px;">
            <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--primary); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
              <span>👥 Pagos de Nómina y Mano de Obra</span>
              <span class="badge" style="font-size: 0.72rem;">${payroll.length}</span>
            </h4>
            ${
              payroll.length > 0
                ? `
              <div class="table-responsive">
                <table class="app-table" style="font-size: 0.82rem;">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Colaborador</th>
                      <th>Concepto</th>
                      <th>Método</th>
                      <th style="text-align: right;">Neto Pagado</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${payroll
                      .map(
                        (p) => `
                      <tr>
                        <td>${formatDate(p.date)}</td>
                        <td><strong>${p.staffName}</strong> <small style="color: var(--text-muted);">(${p.role})</small></td>
                        <td><small>${p.calculationDetails}</small></td>
                        <td><span class="badge" style="font-size: 0.7rem;">${p.paymentMethod}</span></td>
                        <td style="text-align: right; font-weight: 800; color: #16A34A;">${formatCOP(p.netAmount)}</td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
            `
                : `<p style="font-size: 0.8rem; color: var(--text-muted); font-style: italic; margin-left: 8px;">No hay pagos de nómina en este periodo.</p>`
            }
          </div>

          <!-- 3. Gastos Generales / Infraestructura -->
          <div style="margin-bottom: 18px;">
            <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--primary); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
              <span>⚙️ Infraestructura y Gastos Generales</span>
              <span class="badge" style="font-size: 0.72rem;">${generalExpenses.length}</span>
            </h4>
            ${
              generalExpenses.length > 0
                ? `
              <div class="table-responsive">
                <table class="app-table" style="font-size: 0.82rem;">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Categoría</th>
                      <th>Descripción</th>
                      <th style="text-align: right;">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${generalExpenses
                      .map(
                        (g) => `
                      <tr>
                        <td>${formatDate(g.date)}</td>
                        <td><span class="badge" style="font-size: 0.7rem;">${g.category}</span></td>
                        <td>${g.description}</td>
                        <td style="text-align: right; font-weight: 800; color: var(--danger);">${formatCOP(g.amount)}</td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
            `
                : `<p style="font-size: 0.8rem; color: var(--text-muted); font-style: italic; margin-left: 8px;">No hay gastos generales en este periodo.</p>`
            }
          </div>

          <!-- 4. Retiros de Socios -->
          ${
            ownerDraws.length > 0
              ? `
            <div style="margin-bottom: 10px;">
              <h4 style="font-size: 0.95rem; font-weight: 800; color: #6D28D9; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                <span>👑 Retiros de Socios / Anticipos de Ganancia</span>
                <span class="badge" style="background: #EDE9FE; color: #6D28D9; font-size: 0.72rem;">${ownerDraws.length}</span>
              </h4>
              <div class="table-responsive">
                <table class="app-table" style="font-size: 0.82rem;">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Socio</th>
                      <th>Concepto / Liquidación</th>
                      <th>Método</th>
                      <th style="text-align: right;">Neto Retirado</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${ownerDraws
                      .map(
                        (od) => `
                      <tr>
                        <td>${formatDate(od.date)}</td>
                        <td><strong>${od.staffName}</strong></td>
                        <td><small>${od.calculationDetails}</small></td>
                        <td><span class="badge" style="font-size: 0.7rem;">${od.paymentMethod}</span></td>
                        <td style="text-align: right; font-weight: 800; color: #7C3AED;">${formatCOP(od.netAmount)}</td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `
              : ''
          }

        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" id="btnOkExpModal">Cerrar</button>
        </div>
      </div>
    </div>
  `;

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseExpModal')?.addEventListener('click', closeModal);
  document.getElementById('btnOkExpModal')?.addEventListener('click', closeModal);
}

// 2. Modal de Desglose de Recaudo por Sabor y Lote
function openSalesBreakdownModal(salesData, kpis, periodLabel) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  const delivered = salesData.delivered || [];
  const inProcess = salesData.inProcess || [];

  // Extraer todos los clientes con compras entregadas
  const allDeliveredCustomers = [];
  delivered.forEach((g) => {
    (g.customers || []).forEach((c) => {
      allDeliveredCustomers.push({
        ...c,
        batchCode: g.batchCode,
        flavor: g.flavor,
      });
    });
  });

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 740px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">💰 Desglose de Recaudo por Lote y Sabor</h3>
            <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">
              Periodo: <strong>${periodLabel}</strong> • Total Recaudado (Cobrado): <strong style="color: var(--success);">${formatCOP(kpis.totalCashCollected)}</strong>
            </span>
          </div>
          <button class="modal-close-btn" id="btnCloseSalesModal">✕</button>
        </div>
        <div class="modal-body" style="max-height: 75vh; overflow-y: auto;">
          
          <!-- TABLA 1: Resumen de Recaudo por Lote y Sabor -->
          <div style="margin-bottom: 20px;">
            <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--primary); margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
              <span>✅ 1. Resumen de Ventas Entregadas y Cobradas</span>
              <span style="font-size: 0.85rem; color: var(--success); font-weight: 800;">${formatCOP(kpis.deliveredPaidAmount)} (${kpis.deliveredLiters} L)</span>
            </h4>

            ${
              delivered.length > 0
                ? `
              <div class="table-responsive">
                <table class="app-table" style="font-size: 0.82rem;">
                  <thead>
                    <tr>
                      <th>Lote</th>
                      <th>Sabor</th>
                      <th>Litros</th>
                      <th>Envases</th>
                      <th>Pedidos</th>
                      <th style="text-align: right;">Total Cobrado</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${delivered
                      .map(
                        (g) => `
                      <tr>
                        <td><span class="badge" style="background: #DCFCE7; color: #15803D; font-weight: 800; font-size: 0.74rem;">🍶 ${g.batchCode}</span></td>
                        <td><strong>${g.flavor}</strong></td>
                        <td><strong>${g.totalLiters} L</strong></td>
                        <td><small>${g.totalBottles1L} de 1L • ${g.totalBottles2L} de 2L</small></td>
                        <td>${g.ordersCount}</td>
                        <td style="text-align: right; font-weight: 800; color: var(--success);">${formatCOP(g.paidAmount)}</td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                  <tfoot>
                    <tr style="background: var(--bg-subtle); font-weight: 800;">
                      <td colspan="2">TOTAL RECAUDADO</td>
                      <td>${kpis.deliveredLiters || 0} L</td>
                      <td>-</td>
                      <td>${delivered.reduce((s, g) => s + g.ordersCount, 0)}</td>
                      <td style="text-align: right; color: var(--success); font-size: 0.95rem;">${formatCOP(kpis.deliveredPaidAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            `
                : `<p style="font-size: 0.82rem; color: var(--text-muted); font-style: italic;">No hay ventas entregadas en este periodo.</p>`
            }
          </div>

          <!-- TABLA 2: Detalle de Clientes que Compraron -->
          ${
            allDeliveredCustomers.length > 0
              ? `
            <div style="margin-bottom: 20px;">
              <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--primary); margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <span>👥 2. Clientes y Pagos Recibidos</span>
                <span class="badge" style="font-size: 0.72rem;">${allDeliveredCustomers.length} cliente(s)</span>
              </h4>
              <div class="table-responsive">
                <table class="app-table" style="font-size: 0.82rem;">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Lote / Sabor</th>
                      <th>Litros / Envases</th>
                      <th style="text-align: right;">Monto Pagado</th>
                      <th>Fecha Entrega</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${allDeliveredCustomers
                      .map(
                        (c) => `
                      <tr>
                        <td>
                          <strong>${c.customerName}</strong>
                          <div style="font-size: 0.72rem; color: var(--text-muted);">📞 ${c.customerPhone || 'Sin teléfono'}</div>
                        </td>
                        <td><small>🍶 ${c.batchCode} • ${c.flavor}</small></td>
                        <td><strong>${c.liters} L</strong> <small>(${c.bottlesSummary})</small></td>
                        <td style="text-align: right; font-weight: 800; color: var(--success);">${formatCOP(c.paidAmount)}</td>
                        <td><small>${formatDate(c.deliveryDate || c.orderDate)}</small></td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `
              : ''
          }

          <!-- TABLA 3: Proyección de Recaudo Pendiente de Pedidos en Proceso -->
          <div style="background: #FFFBEB; border: 1.5px solid #FDE68A; border-radius: var(--radius-md); padding: 14px;">
            <h4 style="font-size: 0.95rem; font-weight: 800; color: #B45309; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
              <span>🥣 3. Saldo por Recaudar (Pedidos Encargados en Proceso)</span>
              <strong style="font-size: 1rem; color: #D97706;">${formatCOP(kpis.inProcessPendingToCollect)}</strong>
            </h4>
            <p style="font-size: 0.78rem; color: #92400E; margin-bottom: 10px;">
              Dinero que se cobrará directamente al cliente al momento de entregar su pedido:
            </p>

            ${
              inProcess.length > 0
                ? `
              <div class="table-responsive">
                <table class="app-table" style="font-size: 0.82rem; background: #FFFFFF;">
                  <thead>
                    <tr>
                      <th>Lote</th>
                      <th>Sabor</th>
                      <th>Litros</th>
                      <th>Pedidos</th>
                      <th style="text-align: right;">Por Cobrar al Entregar</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${inProcess
                      .map(
                        (g) => `
                      <tr>
                        <td><span class="badge" style="font-size: 0.74rem;">🍶 ${g.batchCode}</span></td>
                        <td><strong>${g.flavor}</strong></td>
                        <td><strong>${g.totalLiters} L</strong></td>
                        <td>${g.ordersCount} pedidos</td>
                        <td style="text-align: right; font-weight: 800; color: #D97706;">${formatCOP(g.pendingAmount)}</td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                  <tfoot>
                    <tr style="background: #FEF3C7; font-weight: 800;">
                      <td colspan="2">TOTAL POR RECAUDAR</td>
                      <td>${kpis.inProcessLiters || 0} L</td>
                      <td>${inProcess.reduce((s, g) => s + g.ordersCount, 0)}</td>
                      <td style="text-align: right; color: #D97706; font-size: 0.95rem;">${formatCOP(kpis.inProcessPendingToCollect)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            `
                : `<span style="font-size: 0.8rem; color: #92400E; font-style: italic;">No hay pedidos en proceso pendientes de cobro.</span>`
            }
          </div>

        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" id="btnOkSalesModal">Cerrar</button>
        </div>
      </div>
    </div>
  `;

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseSalesModal')?.addEventListener('click', closeModal);
  document.getElementById('btnOkSalesModal')?.addEventListener('click', closeModal);
}

// 3. Modal de Saldos Por Cobrar (En Proceso) con Lista de Personas
function openInProcessPendingModal(salesData, inProcessStats, periodLabel) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  const inProcess = salesData.inProcess || [];

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 720px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">🥣 Saldos por Cobrar (Pedidos en Proceso)</h3>
            <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">
              Periodo: <strong>${periodLabel}</strong> • Total a Recaudar: <strong style="color: var(--accent);">${formatCOP(inProcessStats.inProcessPendingToCollect)}</strong>
            </span>
          </div>
          <button class="modal-close-btn" id="btnClosePendingModal">✕</button>
        </div>
        <div class="modal-body" style="max-height: 75vh; overflow-y: auto;">
          
          ${
            inProcess.length > 0
              ? `
            <div style="display: flex; flex-direction: column; gap: 16px;">
              ${inProcess
                .map(
                  (g) => `
                <div style="background: #FFFDF9; border: 1.5px solid var(--border-color); border-radius: var(--radius-md); padding: 14px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 6px;">
                    <div>
                      <span class="badge" style="background: var(--primary-light); color: var(--primary); font-weight: 800; font-size: 0.78rem;">🍶 ${g.batchCode}</span>
                      <strong style="color: var(--text-main); font-size: 1rem; margin-left: 6px;">${g.flavor}</strong>
                      <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 8px;">(${g.totalLiters} Litros • ${g.ordersCount} pedidos)</span>
                    </div>
                    <div style="background: #FEF3C7; color: #B45309; padding: 4px 10px; border-radius: var(--radius-sm); font-weight: 800; font-size: 0.95rem;">
                      Falta cobrar: ${formatCOP(g.pendingAmount)}
                    </div>
                  </div>

                  <div class="table-responsive">
                    <table class="app-table" style="font-size: 0.82rem;">
                      <thead>
                        <tr>
                          <th>Cliente</th>
                          <th>Contacto</th>
                          <th>Envases</th>
                          <th style="text-align: right;">Saldo a Cobrar</th>
                          <th>Fecha Entrega</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${g.customers
                          .map(
                            (c) => `
                          <tr>
                            <td>
                              <strong>${c.customerName}</strong>
                              <div style="font-size: 0.72rem; color: var(--text-muted);">📍 ${c.address}</div>
                            </td>
                            <td><small>📞 ${c.customerPhone || 'Sin teléfono'}</small></td>
                            <td><strong>${c.liters} L</strong> <small>(${c.bottlesSummary})</small></td>
                            <td style="text-align: right;"><strong style="color: var(--danger); font-size: 0.9rem;">${formatCOP(c.pendingAmount)}</strong></td>
                            <td><small style="color: var(--primary); font-weight: 700;">🛵 ${c.deliveryDate ? formatDate(c.deliveryDate) : 'Programada'}</small></td>
                          </tr>
                        `
                          )
                          .join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          `
              : `
            <div class="empty-state" style="padding: 30px;">
              <div class="empty-state-icon">✨</div>
              <div class="empty-state-title">No hay saldos pendientes en proceso</div>
              <div class="empty-state-text">Todos los pedidos en preparación o ruta ya están pagos o no hay pedidos en curso.</div>
            </div>
          `
          }

        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" id="btnOkPendingModal">Cerrar</button>
        </div>
      </div>
    </div>
  `;

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnClosePendingModal')?.addEventListener('click', closeModal);
  document.getElementById('btnOkPendingModal')?.addEventListener('click', closeModal);
}

// 4. Modal de Litros Vendidos y Entregados
function openDeliveredLitersModal(salesData, kpis, periodLabel) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  const delivered = salesData.delivered || [];

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 720px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">🥛 Detalle de Litros Vendidos y Entregados</h3>
            <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">
              Periodo: <strong>${periodLabel}</strong> • Total Entregado: <strong style="color: var(--accent);">${kpis.deliveredLiters} Litros</strong>
            </span>
          </div>
          <button class="modal-close-btn" id="btnCloseDelModal">✕</button>
        </div>
        <div class="modal-body" style="max-height: 75vh; overflow-y: auto;">
          
          ${
            delivered.length > 0
              ? `
            <div style="display: flex; flex-direction: column; gap: 14px;">
              ${delivered
                .map(
                  (g) => `
                <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: var(--radius-md); padding: 14px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                    <div>
                      <span class="badge" style="background: #DCFCE7; color: #15803D; font-weight: 800; font-size: 0.78rem;">🍶 ${g.batchCode}</span>
                      <strong style="color: var(--text-main); font-size: 1rem; margin-left: 6px;">${g.flavor}</strong>
                    </div>
                    <strong style="color: #15803D; font-size: 1.05rem;">${g.totalLiters} L Entregados</strong>
                  </div>

                  <div class="table-responsive">
                    <table class="app-table" style="font-size: 0.82rem;">
                      <thead>
                        <tr>
                          <th>Cliente</th>
                          <th>Envases</th>
                          <th style="text-align: right;">Monto Pagado</th>
                          <th>Fecha Entrega</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${g.customers
                          .map(
                            (c) => `
                          <tr>
                            <td>
                              <strong>${c.customerName}</strong>
                              <div style="font-size: 0.72rem; color: var(--text-muted);">📞 ${c.customerPhone || ''}</div>
                            </td>
                            <td><strong>${c.liters} L</strong> <small>(${c.bottlesSummary})</small></td>
                            <td style="text-align: right; color: var(--success); font-weight: 700;">${formatCOP(c.paidAmount)}</td>
                            <td><small>${formatDate(c.deliveryDate || c.orderDate)}</small></td>
                          </tr>
                        `
                          )
                          .join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          `
              : `
            <div class="empty-state" style="padding: 30px;">
              <div class="empty-state-icon">🥛</div>
              <div class="empty-state-title">No hay litros entregados en este periodo</div>
              <div class="empty-state-text">Selecciona otro rango o fecha en el panel superior.</div>
            </div>
          `
          }

        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" id="btnOkDelModal">Cerrar</button>
        </div>
      </div>
    </div>
  `;

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseDelModal')?.addEventListener('click', closeModal);
  document.getElementById('btnOkDelModal')?.addEventListener('click', closeModal);
}

// 5. Modal de Litros Encargados en Proceso (Demanda en Cola)
function openInProcessLitersModal(salesData, kpis, periodLabel) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  const inProcess = salesData.inProcess || [];

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 720px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">⏳ Detalle de Litros Encargados (En Proceso)</h3>
            <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">
              Periodo: <strong>${periodLabel}</strong> • Demanda en Preparación/Ruta: <strong style="color: var(--primary);">${kpis.inProcessLiters} Litros</strong>
            </span>
          </div>
          <button class="modal-close-btn" id="btnCloseQueueModal">✕</button>
        </div>
        <div class="modal-body" style="max-height: 75vh; overflow-y: auto;">
          
          ${
            inProcess.length > 0
              ? `
            <div style="display: flex; flex-direction: column; gap: 14px;">
              ${inProcess
                .map(
                  (g) => `
                <div style="background: #FAF7FC; border: 1.5px solid var(--border-color); border-radius: var(--radius-md); padding: 14px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                    <div>
                      <span class="badge" style="background: var(--primary-light); color: var(--primary); font-weight: 800; font-size: 0.78rem;">🍶 ${g.batchCode}</span>
                      <strong style="color: var(--text-main); font-size: 1rem; margin-left: 6px;">${g.flavor}</strong>
                    </div>
                    <strong style="color: var(--primary); font-size: 1.05rem;">${g.totalLiters} L Encargados</strong>
                  </div>

                  <div class="table-responsive">
                    <table class="app-table" style="font-size: 0.82rem;">
                      <thead>
                        <tr>
                          <th>Cliente</th>
                          <th>Envases</th>
                          <th>Fecha Entrega</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${g.customers
                          .map(
                            (c) => `
                          <tr>
                            <td>
                              <strong>${c.customerName}</strong>
                              <div style="font-size: 0.72rem; color: var(--text-muted);">📞 ${c.customerPhone || ''} • 📍 ${c.address}</div>
                            </td>
                            <td><strong>${c.liters} L</strong> <small>(${c.bottlesSummary})</small></td>
                            <td><strong style="color: var(--primary);">${c.deliveryDate ? formatDate(c.deliveryDate) : 'Programada'}</strong></td>
                            <td>
                              <span class="badge ${c.deliveryStatus === 'IN_ROUTE' ? 'badge-partial' : 'badge-pending'}">
                                ${c.deliveryStatus === 'IN_ROUTE' ? '🛵 En Ruta' : '🥣 En Preparación'}
                              </span>
                            </td>
                          </tr>
                        `
                          )
                          .join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          `
              : `
            <div class="empty-state" style="padding: 30px;">
              <div class="empty-state-icon">✨</div>
              <div class="empty-state-title">No hay pedidos encargados en cola</div>
              <div class="empty-state-text">Todos los pedidos han sido entregados o no hay pedidos pendientes.</div>
            </div>
          `
          }

        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" id="btnOkQueueModal">Cerrar</button>
        </div>
      </div>
    </div>
  `;

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseQueueModal')?.addEventListener('click', closeModal);
  document.getElementById('btnOkQueueModal')?.addEventListener('click', closeModal);
}

// 6. Modal de Arqueo y Dinero en Caja
// 6. Modal de Arqueo y Dinero en Caja
function openCashBalanceModal(cashFlowData, kpis, periodLabel) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  const totalInjections = Number(cashFlowData.totalInjections !== undefined ? cashFlowData.totalInjections : (kpis.totalInjections || 0)) || 0;
  const totalSalesCollected = Number(cashFlowData.totalSalesCollected !== undefined ? cashFlowData.totalSalesCollected : (kpis.totalCashCollected || 0)) || 0;
  const totalInflow = Number(cashFlowData.totalInflow !== undefined ? cashFlowData.totalInflow : (totalInjections + totalSalesCollected)) || 0;
  const totalOutflow = Number(cashFlowData.totalOutflow !== undefined ? cashFlowData.totalOutflow : (kpis.totalOutflow || kpis.totalExpenses)) || 0;
  const cashBalance = Number(cashFlowData.cashBalance !== undefined ? cashFlowData.cashBalance : kpis.cashBalance) || 0;

  const inflows = cashFlowData.inflows || [];
  const outflows = cashFlowData.outflows || [];

  const baseMovements = inflows.filter((i) => i.isCashMovement);
  const salesMovements = inflows.filter((i) => !i.isCashMovement);

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 820px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">💵 Arqueo y Dinero en Caja</h3>
            <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">
              Periodo: <strong>${periodLabel}</strong> • Flujo Real de Dinero en Mano
            </span>
          </div>
          <button class="modal-close-btn" id="btnCloseCashModal">✕</button>
        </div>
        <div class="modal-body" style="max-height: 75vh; overflow-y: auto;">

          <!-- Botones de Acción Rápida para Base / Aportes -->
          <div style="display: flex; justify-content: space-between; align-items: center; background: #F8FAFC; border: 1.5px solid var(--border-color); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
            <div>
              <strong style="color: var(--primary); font-size: 0.92rem;">🏦 Gestión de Base en Caja</strong>
              <div style="font-size: 0.76rem; color: var(--text-muted);">Registra sencillo para dar cambio o dinero de tu bolsillo para compras</div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button type="button" class="btn btn-primary btn-sm" id="btnDashAddBase">
                ➕ Ingresar Base / Aporte
              </button>
              <button type="button" class="btn btn-outline btn-sm" id="btnDashWithdrawBase" style="color: #DC2626; border-color: #FECACA;">
                ➖ Retirar Base
              </button>
            </div>
          </div>

          <!-- Tarjetas Resumen de Caja -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin-bottom: 18px;">
            
            <div style="background: #F0FDF4; padding: 12px; border-radius: var(--radius-md); border: 1.5px solid #BBF7D0; text-align: center;">
              <span style="font-size: 0.72rem; font-weight: 800; color: #166534;">🏦 Base y Aportes</span>
              <div style="font-size: 1.15rem; font-weight: 900; color: #15803D; margin-top: 2px;">+${formatCOP(totalInjections)}</div>
              <small style="font-size: 0.7rem; color: #166534; font-weight: 600;">${baseMovements.length} inyección(es) de capital</small>
            </div>

            <div style="background: #F0FDF4; padding: 12px; border-radius: var(--radius-md); border: 1.5px solid #BBF7D0; text-align: center;">
              <span style="font-size: 0.72rem; font-weight: 800; color: #166534;">📥 Ventas Cobradas</span>
              <div style="font-size: 1.15rem; font-weight: 900; color: #15803D; margin-top: 2px;">+${formatCOP(totalSalesCollected)}</div>
              <small style="font-size: 0.7rem; color: #166534; font-weight: 600;">${salesMovements.length} cobro(s) de pedidos</small>
            </div>

            <div style="background: #FEF2F2; padding: 12px; border-radius: var(--radius-md); border: 1.5px solid #FECACA; text-align: center;">
              <span style="font-size: 0.72rem; font-weight: 800; color: #991B1B;">📤 Egresos Pagados</span>
              <div style="font-size: 1.15rem; font-weight: 900; color: #DC2626; margin-top: 2px;">-${formatCOP(totalOutflow)}</div>
              <small style="font-size: 0.7rem; color: #991B1B; font-weight: 600;">${outflows.length} compras / gastos / nómina</small>
            </div>

            <div style="background: ${cashBalance >= 0 ? '#ECFDF5' : '#FFFBEB'}; padding: 12px; border-radius: var(--radius-md); border: 2px solid ${cashBalance >= 0 ? '#10B981' : '#F59E0B'}; text-align: center;">
              <span style="font-size: 0.72rem; font-weight: 800; color: ${cashBalance >= 0 ? '#065F46' : '#92400E'};">💰 Dinero en Caja Disponible</span>
              <div style="font-size: 1.25rem; font-weight: 900; color: ${cashBalance >= 0 ? '#047857' : '#D97706'}; margin-top: 2px;">${formatCOP(cashBalance)}</div>
              <small style="font-size: 0.7rem; color: ${cashBalance >= 0 ? '#065F46' : '#92400E'}; font-weight: 700;">${cashBalance >= 0 ? '✅ Saldo a favor en caja' : '⚠️ Inversión supera lo recaudado'}</small>
            </div>
          </div>

          <!-- Pestañas de Filtrado de Movimientos -->
          <div style="display: flex; gap: 8px; margin-bottom: 14px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; flex-wrap: wrap;">
            <button type="button" class="btn btn-sm btn-primary" id="btnTabAllCash">📊 Todos (${inflows.length + outflows.length})</button>
            <button type="button" class="btn btn-sm btn-outline" id="btnTabBaseCash" style="color: #0369A1; border-color: #BAE6FD;">🏦 Base / Aportes (${baseMovements.length})</button>
            <button type="button" class="btn btn-sm btn-outline" id="btnTabInflows" style="color: #15803D; border-color: #BBF7D0;">📥 Ventas Cobradas (${salesMovements.length})</button>
            <button type="button" class="btn btn-sm btn-outline" id="btnTabOutflows" style="color: #DC2626; border-color: #FECACA;">📤 Salidas (-${formatCOP(totalOutflow)})</button>
          </div>

          <!-- Tablas de Movimientos -->
          <div id="cashInflowsSection" style="margin-bottom: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <strong style="color: #15803D; font-size: 0.88rem;">📥 Entradas de Dinero (Bases, Aportes y Ventas)</strong>
              <span style="font-size: 0.76rem; color: var(--text-muted); font-weight: 700;">Total: +${formatCOP(totalInflow)}</span>
            </div>
            ${
              inflows.length > 0
                ? `
              <div class="table-responsive">
                <table class="app-table" style="font-size: 0.82rem;">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo / N°</th>
                      <th>Origen / Cliente</th>
                      <th>Detalle / Concepto</th>
                      <th style="text-align: right;">Ingreso a Caja</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${inflows
                      .map(
                        (i) => `
                      <tr class="cash-row ${i.isCashMovement ? 'row-base' : 'row-sale'}">
                        <td><small>${formatDate(i.date)}</small></td>
                        <td>
                          <span class="badge" style="background: ${i.isCashMovement ? '#E0F2FE' : '#DCFCE7'}; color: ${i.isCashMovement ? '#0369A1' : '#15803D'}; font-weight: 800; font-size: 0.72rem;">
                            ${i.orderNumber}
                          </span>
                        </td>
                        <td><strong>${i.customerName}</strong></td>
                        <td>${i.isCashMovement ? `<strong>${i.flavor}</strong>` : `${i.liters}L (${i.flavor})`}</td>
                        <td style="text-align: right; color: #15803D; font-weight: 800;">+${formatCOP(i.amount)}</td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
            `
                : `<div style="font-size: 0.8rem; color: var(--text-muted); padding: 10px; text-align: center; background: #F8FAFC; border-radius: var(--radius-sm);">No hay ingresos registrados en este periodo</div>`
            }
          </div>

          <div id="cashOutflowsSection" style="margin-bottom: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <strong style="color: #DC2626; font-size: 0.88rem;">📤 Salidas de Dinero (Compras, Nómina y Gastos)</strong>
              <span style="font-size: 0.76rem; color: var(--text-muted); font-weight: 700;">Total: -${formatCOP(totalOutflow)}</span>
            </div>
            ${
              outflows.length > 0
                ? `
              <div class="table-responsive">
                <table class="app-table" style="font-size: 0.82rem;">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Descripción / Proveedor</th>
                      <th style="text-align: right;">Pagado de Caja</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${outflows
                      .map(
                        (o) => `
                      <tr>
                        <td><small>${formatDate(o.date)}</small></td>
                        <td><span class="badge" style="background: var(--bg-subtle); color: var(--text-main); font-size: 0.72rem;">${o.categoryLabel || o.category}</span></td>
                        <td>
                          <strong>${o.description}</strong>
                          ${o.supplier ? `<div style="font-size: 0.72rem; color: var(--text-muted);">🏢 ${o.supplier}</div>` : ''}
                          ${o.notes ? `<div style="font-size: 0.72rem; color: var(--text-muted);">📝 ${o.notes}</div>` : ''}
                        </td>
                        <td style="text-align: right; color: #DC2626; font-weight: 800;">-${formatCOP(o.amount)}</td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
            `
                : `<div style="font-size: 0.8rem; color: var(--text-muted); padding: 10px; text-align: center; background: #F8FAFC; border-radius: var(--radius-sm);">No hay salidas de dinero registradas en este periodo</div>`
            }
          </div>

          <div style="background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: var(--radius-sm); padding: 10px 14px; font-size: 0.76rem; color: #0369A1;">
            💡 <strong>¿Cómo funciona el Dinero en Caja?</strong> Suma la Base Inicial y Aportes propios + Todo el dinero cobrado de ventas - Todas las compras, gastos y nómina pagados en el período.
          </div>

        </div>
        <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
          <button type="button" class="btn btn-primary" id="btnGoToCashControl" style="font-weight: 800;">
            💵 Ir a Control de Caja Completo ↗
          </button>
          <button type="button" class="btn btn-outline" id="btnOkCashModal">Cerrar</button>
        </div>
      </div>
    </div>
  `;

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseCashModal')?.addEventListener('click', closeModal);
  document.getElementById('btnOkCashModal')?.addEventListener('click', closeModal);
  document.getElementById('btnGoToCashControl')?.addEventListener('click', () => {
    closeModal();
    document.querySelector('.sidebar .nav-item[data-tab="cashControl"]')?.click();
  });

  // Acciones rápidas de Base
  document.getElementById('btnDashAddBase')?.addEventListener('click', () => {
    openCashMovementModal(() => {
      closeModal();
      renderDashboard(document.getElementById('contentContainer'));
    }, 'BASE_INICIAL');
  });

  document.getElementById('btnDashWithdrawBase')?.addEventListener('click', () => {
    openCashMovementModal(() => {
      closeModal();
      renderDashboard(document.getElementById('contentContainer'));
    }, 'RETIRO_BASE');
  });

  // Filtros de pestañas
  const tabAll = document.getElementById('btnTabAllCash');
  const tabBase = document.getElementById('btnTabBaseCash');
  const tabIn = document.getElementById('btnTabInflows');
  const tabOut = document.getElementById('btnTabOutflows');
  const secIn = document.getElementById('cashInflowsSection');
  const secOut = document.getElementById('cashOutflowsSection');

  const rows = modalOverlay.querySelectorAll('.cash-row');

  tabAll?.addEventListener('click', () => {
    tabAll.className = 'btn btn-sm btn-primary';
    tabBase.className = 'btn btn-sm btn-outline';
    tabIn.className = 'btn btn-sm btn-outline';
    tabOut.className = 'btn btn-sm btn-outline';
    if (secIn) secIn.style.display = 'block';
    if (secOut) secOut.style.display = 'block';
    rows.forEach((r) => (r.style.display = ''));
  });

  tabBase?.addEventListener('click', () => {
    tabBase.className = 'btn btn-sm btn-primary';
    tabAll.className = 'btn btn-sm btn-outline';
    tabIn.className = 'btn btn-sm btn-outline';
    tabOut.className = 'btn btn-sm btn-outline';
    if (secIn) secIn.style.display = 'block';
    if (secOut) secOut.style.display = 'none';
    rows.forEach((r) => {
      r.style.display = r.classList.contains('row-base') ? '' : 'none';
    });
  });

  tabIn?.addEventListener('click', () => {
    tabIn.className = 'btn btn-sm btn-primary';
    tabAll.className = 'btn btn-sm btn-outline';
    tabBase.className = 'btn btn-sm btn-outline';
    tabOut.className = 'btn btn-sm btn-outline';
    if (secIn) secIn.style.display = 'block';
    if (secOut) secOut.style.display = 'none';
    rows.forEach((r) => {
      r.style.display = r.classList.contains('row-sale') ? '' : 'none';
    });
  });

  tabOut?.addEventListener('click', () => {
    tabOut.className = 'btn btn-sm btn-primary';
    tabAll.className = 'btn btn-sm btn-outline';
    tabBase.className = 'btn btn-sm btn-outline';
    tabIn.className = 'btn btn-sm btn-outline';
    if (secIn) secIn.style.display = 'none';
    if (secOut) secOut.style.display = 'block';
  });
}


