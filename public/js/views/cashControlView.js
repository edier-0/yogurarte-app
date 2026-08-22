import { api } from '../api.js';
import { formatCOP, formatDate, formatDateTime, getTodayLocalDateStr, showToast, store } from '../store.js';
import { openExpenseModal, openCashMovementModal } from './expensesView.js';
import { openPaymentModal } from './ordersView.js';

let cashFilters = {
  period: 'all',
  specificDate: '',
  startDate: '',
  endDate: '',
  month: '',
};

let activeMovementTab = 'ALL'; // 'ALL' | 'BASE' | 'SALES' | 'PURCHASES' | 'EXPENSES' | 'PAYROLL' | 'TRANSFERS'
let searchFilter = '';
let currentCashData = null;

export async function renderCashControl(container) {
  // Generar opciones de meses anteriores
  const monthOptions = [];
  const currDate = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(currDate.getFullYear(), currDate.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(d);
    monthOptions.push({ val, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }

  container.innerHTML = `
    <!-- Barra de Filtros de Período y Acciones -->
    <div class="orders-toolbar-card" style="margin-bottom: 20px;">
      
      <!-- Fila Superior: Botones Rápidos de Período y Acciones -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 14px;">
        
        <!-- Píldoras de Período -->
        <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
          <span style="font-size: 0.8rem; font-weight: 800; color: var(--text-muted); margin-right: 4px;">📅 Período:</span>
          <button class="btn btn-sm ${cashFilters.period === 'all' ? 'btn-primary' : 'btn-outline'}" data-period="all">Todo el Historial</button>
          <button class="btn btn-sm ${cashFilters.period === 'today' ? 'btn-primary' : 'btn-outline'}" data-period="today">Hoy</button>
          <button class="btn btn-sm ${cashFilters.period === 'yesterday' ? 'btn-primary' : 'btn-outline'}" data-period="yesterday">Ayer</button>
          <button class="btn btn-sm ${cashFilters.period === 'this_week' ? 'btn-primary' : 'btn-outline'}" data-period="this_week">Esta Semana</button>
          <button class="btn btn-sm ${cashFilters.period === 'this_month' ? 'btn-primary' : 'btn-outline'}" data-period="this_month">Este Mes</button>
          <button class="btn btn-sm ${cashFilters.period === 'custom_date' ? 'btn-primary' : 'btn-outline'}" data-period="custom_date">Día Exacto</button>
          <button class="btn btn-sm ${cashFilters.period === 'custom_range' ? 'btn-primary' : 'btn-outline'}" data-period="custom_range">Rango Fechas</button>
          <button class="btn btn-sm ${cashFilters.period === 'custom_month' ? 'btn-primary' : 'btn-outline'}" data-period="custom_month">Por Mes</button>
        </div>

        <!-- Botones de Acción Rápida -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-primary" id="btnCashAddBase" style="font-weight: 800;">
            <span>➕</span> Base / Aporte
          </button>
          <button class="btn btn-outline" id="btnCashWithdrawBase" style="color: #DC2626; border-color: #FECACA; font-weight: 800;">
            <span>➖</span> Retirar Base
          </button>
          <button class="btn btn-outline" id="btnCashTransfer" style="color: #2563EB; border-color: #BFDBFE; font-weight: 800;">
            <span>🔄</span> Traslado Efectivo / Banco
          </button>
          <button class="btn btn-accent" id="btnCashAddExpense" style="font-weight: 800;">
            <span>🧾</span> Registrar Gasto
          </button>
        </div>

      </div>

      <!-- Controles de Fecha Personalizada (Visibles según filtro) -->
      <div id="cashCustomFiltersRow" style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center; padding-top: 10px; border-top: 1px dashed var(--border-color); ${cashFilters.period.startsWith('custom_') ? '' : 'display: none;'}">
        
        <div id="cashSpecificDateGroup" style="display: ${cashFilters.period === 'custom_date' ? 'flex' : 'none'}; gap: 8px; align-items: center;">
          <label style="font-size: 0.82rem; font-weight: 700; color: var(--text-main);">Seleccionar Día:</label>
          <input type="date" id="cashSpecificDateInput" class="form-input" style="padding: 6px 10px; font-size: 0.85rem;" value="${cashFilters.specificDate || getTodayLocalDateStr()}" />
          <button class="btn btn-sm btn-primary" id="btnApplyCashSpecificDate">Filtrar Día</button>
        </div>

        <div id="cashRangeDateGroup" style="display: ${cashFilters.period === 'custom_range' ? 'flex' : 'none'}; gap: 8px; align-items: center; flex-wrap: wrap;">
          <label style="font-size: 0.82rem; font-weight: 700; color: var(--text-main);">Desde:</label>
          <input type="date" id="cashStartDateInput" class="form-input" style="padding: 6px 10px; font-size: 0.85rem;" value="${cashFilters.startDate || ''}" />
          <label style="font-size: 0.82rem; font-weight: 700; color: var(--text-main);">Hasta:</label>
          <input type="date" id="cashEndDateInput" class="form-input" style="padding: 6px 10px; font-size: 0.85rem;" value="${cashFilters.endDate || ''}" />
          <button class="btn btn-sm btn-primary" id="btnApplyCashRange">Filtrar Rango</button>
        </div>

        <div id="cashMonthGroup" style="display: ${cashFilters.period === 'custom_month' ? 'flex' : 'none'}; gap: 8px; align-items: center;">
          <label style="font-size: 0.82rem; font-weight: 700; color: var(--text-main);">Seleccionar Mes:</label>
          <select id="cashMonthSelect" class="form-select" style="padding: 6px 10px; font-size: 0.85rem;">
            ${monthOptions
              .map(
                (m) => `
              <option value="${m.val}" ${cashFilters.month === m.val ? 'selected' : ''}>${m.label}</option>
            `
              )
              .join('')}
          </select>
          <button class="btn btn-sm btn-primary" id="btnApplyCashMonth">Filtrar Mes</button>
        </div>

      </div>

    </div>

    <!-- Contenedor Dinámico de Métricas y Tabla -->
    <div id="cashControlMainContent">
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        Cargando libro de caja... 💵
      </div>
    </div>
  `;

  // Listeners de período
  container.querySelectorAll('[data-period]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const p = e.target.dataset.period;
      cashFilters.period = p;

      const customRow = container.querySelector('#cashCustomFiltersRow');
      const grpDate = container.querySelector('#cashSpecificDateGroup');
      const grpRange = container.querySelector('#cashRangeDateGroup');
      const grpMonth = container.querySelector('#cashMonthGroup');

      if (p === 'custom_date') {
        customRow.style.display = 'flex';
        grpDate.style.display = 'flex';
        grpRange.style.display = 'none';
        grpMonth.style.display = 'none';
      } else if (p === 'custom_range') {
        customRow.style.display = 'flex';
        grpDate.style.display = 'none';
        grpRange.style.display = 'flex';
        grpMonth.style.display = 'none';
      } else if (p === 'custom_month') {
        customRow.style.display = 'flex';
        grpDate.style.display = 'none';
        grpRange.style.display = 'none';
        grpMonth.style.display = 'flex';
      } else {
        customRow.style.display = 'none';
        grpDate.style.display = 'none';
        grpRange.style.display = 'none';
        grpMonth.style.display = 'none';
        loadCashData(container);
      }

      container.querySelectorAll('[data-period]').forEach((b) => {
        b.className = b.dataset.period === p ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline';
      });
    });
  });

  container.querySelector('#btnApplyCashSpecificDate')?.addEventListener('click', () => {
    cashFilters.specificDate = container.querySelector('#cashSpecificDateInput').value;
    loadCashData(container);
  });

  container.querySelector('#btnApplyCashRange')?.addEventListener('click', () => {
    cashFilters.startDate = container.querySelector('#cashStartDateInput').value;
    cashFilters.endDate = container.querySelector('#cashEndDateInput').value;
    loadCashData(container);
  });

  container.querySelector('#btnApplyCashMonth')?.addEventListener('click', () => {
    cashFilters.month = container.querySelector('#cashMonthSelect').value;
    loadCashData(container);
  });

  // Acciones Rápidas
  container.querySelector('#btnCashAddBase')?.addEventListener('click', () => {
    openCashMovementModal(() => loadCashData(container), 'BASE_INICIAL');
  });

  container.querySelector('#btnCashWithdrawBase')?.addEventListener('click', () => {
    openCashMovementModal(() => loadCashData(container), 'RETIRO_BASE');
  });

  container.querySelector('#btnCashTransfer')?.addEventListener('click', () => {
    openCashTransferModal(() => loadCashData(container));
  });

  container.querySelector('#btnCashAddExpense')?.addEventListener('click', () => {
    openExpenseModal(() => loadCashData(container));
  });

  await loadCashData(container);
}

async function loadCashData(container) {
  const mainContent = container.querySelector('#cashControlMainContent');
  if (!mainContent) return;

  try {
    const data = await api.getDashboardSummary(cashFilters);
    currentCashData = data;
    const { detailedBreakdowns } = data;
    const cashFlow = detailedBreakdowns?.cashFlow || {};

    const inflows = cashFlow.inflows || [];
    const outflows = cashFlow.outflows || [];
    const transfers = cashFlow.transfers || [];

    // Combinar todos los movimientos cronológicamente con metadatos extendidos
    const allMovements = [
      ...inflows.map((i) => ({
        ...i,
        flowType: 'INFLOW',
        displayAmount: i.amount,
        tabCategory: i.isCashMovement ? 'BASE' : 'SALES',
      })),
      ...outflows.map((o) => ({
        ...o,
        flowType: 'OUTFLOW',
        displayAmount: -o.amount,
        tabCategory:
          o.category === 'COMPRA_INSUMO'
            ? 'PURCHASES'
            : o.category === 'NOMINA' || o.category === 'RETIRO_SOCIO'
            ? 'PAYROLL'
            : o.category === 'RETIRO_BASE'
            ? 'BASE'
            : 'EXPENSES',
      })),
      ...transfers.map((t) => ({
        ...t,
        flowType: 'TRANSFER',
        displayAmount: t.amount,
        tabCategory: 'TRANSFERS',
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Conteo por categorías
    const countAll = allMovements.filter((m) => m.flowType !== 'TRANSFER').length;
    const countBase = allMovements.filter((m) => m.tabCategory === 'BASE').length;
    const countSales = allMovements.filter((m) => m.tabCategory === 'SALES').length;
    const countPurchases = allMovements.filter((m) => m.tabCategory === 'PURCHASES').length;
    const countExpenses = allMovements.filter((m) => m.tabCategory === 'EXPENSES').length;
    const countPayroll = allMovements.filter((m) => m.tabCategory === 'PAYROLL').length;
    const countTransfers = allMovements.filter((m) => m.tabCategory === 'TRANSFERS').length;

    mainContent.innerHTML = `
      <!-- Tarjetas KPIs Dinámicas que se actualizan según el filtro -->
      <div id="cashDynamicKpisGrid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 24px;">
        <!-- Inyectado dinámicamente -->
      </div>

      <!-- Pestañas de Filtrado del Libro de Caja -->
      <div class="expenses-category-pills" style="margin-bottom: 16px;">
        <button class="expense-pill ${activeMovementTab === 'ALL' ? 'active' : ''}" data-mtab="ALL">
          📊 Todos los Movimientos (${countAll})
        </button>
        <button class="expense-pill ${activeMovementTab === 'BASE' ? 'active' : ''}" data-mtab="BASE">
          🏦 Bases y Aportes (${countBase})
        </button>
        <button class="expense-pill ${activeMovementTab === 'SALES' ? 'active' : ''}" data-mtab="SALES">
          🥛 Cobros de Ventas (${countSales})
        </button>
        <button class="expense-pill ${activeMovementTab === 'PURCHASES' ? 'active' : ''}" data-mtab="PURCHASES">
          🥛 Compras de Insumos (${countPurchases})
        </button>
        <button class="expense-pill ${activeMovementTab === 'EXPENSES' ? 'active' : ''}" data-mtab="EXPENSES">
          ⚙️ Gastos Operativos (${countExpenses})
        </button>
        <button class="expense-pill ${activeMovementTab === 'PAYROLL' ? 'active' : ''}" data-mtab="PAYROLL">
          👥 Nómina y Retiros (${countPayroll})
        </button>
        <button class="expense-pill ${activeMovementTab === 'TRANSFERS' ? 'active' : ''}" data-mtab="TRANSFERS">
          🔄 Transferencias y Traslados (${countTransfers})
        </button>
      </div>

      <!-- Buscador y Tabla del Libro Diario -->
      <div class="table-container" style="padding: 20px;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin: 0;">
              📖 Libro Diario de Caja
            </h3>
            <span style="font-size: 0.78rem; color: var(--text-muted);">
              Registro cronológico de ingresos, egresos y arqueo del negocio
            </span>
          </div>

          <div style="display: flex; gap: 10px; align-items: center;">
            <input type="text" id="cashSearchInput" class="form-input" style="width: 260px; padding: 6px 12px; font-size: 0.85rem;" placeholder="🔍 Buscar por concepto, cliente..." value="${searchFilter}" />
          </div>
        </div>

        <!-- Banner Superior con el Total Filtrado Actual -->
        <div id="cashFilteredBanner" style="margin-bottom: 16px; padding: 12px 16px; border-radius: var(--radius-sm); font-size: 0.88rem; font-weight: 700; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <!-- Inyectado dinámicamente -->
        </div>

        <div id="cashTableWrapper">
          <!-- Tabla renderizada por updateViewWithFilters -->
        </div>

      </div>
    `;

    // Listeners de pestañas
    mainContent.querySelectorAll('[data-mtab]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        mainContent.querySelectorAll('[data-mtab]').forEach((b) => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        activeMovementTab = e.currentTarget.dataset.mtab;
        updateViewWithFilters(mainContent, allMovements, container);
      });
    });

    // Buscador en vivo
    const searchInput = mainContent.querySelector('#cashSearchInput');
    searchInput?.addEventListener('input', (e) => {
      searchFilter = e.target.value.toLowerCase().trim();
      updateViewWithFilters(mainContent, allMovements, container);
    });

    updateViewWithFilters(mainContent, allMovements, container);
  } catch (error) {
    console.error('Error loading cash data:', error);
    mainContent.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--danger); font-weight: 700;">
        Error al cargar los datos de caja: ${error.message}
      </div>
    `;
  }
}

// Helper para clasificar medios de pago
function isCash(method) {
  if (!method) return true;
  const m = String(method).toUpperCase().trim();
  return m === 'EFECTIVO';
}

// Actualiza KPIs, Banner de Total y Tabla dinámicamente según la pestaña activa
function updateViewWithFilters(mainContent, allMovements, mainContainer) {
  const kpisGrid = mainContent.querySelector('#cashDynamicKpisGrid');
  const banner = mainContent.querySelector('#cashFilteredBanner');
  const tableWrapper = mainContent.querySelector('#cashTableWrapper');

  if (!kpisGrid || !banner || !tableWrapper) return;

  const { kpis } = currentCashData || { kpis: {} };

  // 1. Filtrar lista según pestaña activa
  let filtered = allMovements;

  if (activeMovementTab === 'ALL') {
    // En todos los movimientos mostramos todas las entradas y salidas reales del negocio
    filtered = filtered.filter((m) => m.flowType !== 'TRANSFER');
  } else {
    filtered = filtered.filter((m) => m.tabCategory === activeMovementTab);
  }

  // Filtrar por texto de búsqueda si el usuario escribe
  if (searchFilter) {
    filtered = filtered.filter((m) => {
      const text = `${m.orderNumber || ''} ${m.customerName || ''} ${m.flavor || ''} ${m.description || ''} ${m.supplier || ''} ${m.notes || ''} ${m.category || ''} ${m.categoryLabel || ''} ${m.paymentMethod || ''}`.toLowerCase();
      return text.includes(searchFilter);
    });
  }

  // 2. Cálculos específicos de lo filtrado
  const totalInflowsSum = filtered.filter((m) => m.flowType === 'INFLOW').reduce((sum, m) => sum + m.amount, 0);
  const totalOutflowsSum = filtered.filter((m) => m.flowType === 'OUTFLOW').reduce((sum, m) => sum + m.amount, 0);
  const netFilteredBalance = totalInflowsSum - totalOutflowsSum;

  const totalInjections = Number(kpis.totalInjections || 0);
  const totalWithdrawals = Number(kpis.totalWithdrawals || 0);
  const totalSalesCollected = Number(kpis.totalCashCollected || 0);

  // 3. Renderizar KPIs según pestaña activa con interactividad
  if (activeMovementTab === 'ALL') {
    // PESTAÑA PRINCIPAL: Todos los Movimientos
    kpisGrid.innerHTML = `
      <!-- Dinero en Caja (Saldo Real) -->
      <div class="kpi-clickable-card" id="kpiAllBalance" style="cursor: pointer; background: ${netFilteredBalance >= 0 ? '#ECFDF5' : '#FFFBEB'}; padding: 18px; border-radius: var(--radius-md); border: 2.5px solid ${netFilteredBalance >= 0 ? '#10B981' : '#F59E0B'}; transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver el desglose completo del saldo de caja">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: ${netFilteredBalance >= 0 ? '#065F46' : '#92400E'};">💰 DINERO EN CAJA (SALDO REAL) 🔍</span>
          <span style="font-size: 1.2rem;">💵</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: ${netFilteredBalance >= 0 ? '#047857' : '#D97706'}; margin: 6px 0;">
          ${formatCOP(netFilteredBalance)}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: ${netFilteredBalance >= 0 ? '#065F46' : '#92400E'}; font-weight: 700;">
          <span>${netFilteredBalance >= 0 ? '✅ Efectivo y dinero disponible en caja' : '⚠️ Egresos superan lo recaudado'}</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver origen ➔</span>
        </div>
      </div>

      <!-- Total Ingresos -->
      <div class="kpi-clickable-card" id="kpiAllInflows" style="cursor: pointer; background: #F0FDF4; padding: 18px; border-radius: var(--radius-md); border: 1.5px solid #BBF7D0; transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver de dónde entraron los ingresos">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: #166534;">🟢 TOTAL INGRESOS 🔍</span>
          <span style="font-size: 1.2rem;">📥</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: #15803D; margin: 6px 0;">
          +${formatCOP(totalInflowsSum)}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #166534; font-weight: 600;">
          <span>🏦 Base: +${formatCOP(totalInjections)} • 🥛 Ventas: +${formatCOP(totalSalesCollected)}</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver detalle ➔</span>
        </div>
      </div>

      <!-- Total Egresos -->
      <div class="kpi-clickable-card" id="kpiAllOutflows" style="cursor: pointer; background: #FEF2F2; padding: 18px; border-radius: var(--radius-md); border: 1.5px solid #FECACA; transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver en qué se gastó el dinero">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: #991B1B;">🔴 TOTAL EGRESOS 🔍</span>
          <span style="font-size: 1.2rem;">📤</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: #DC2626; margin: 6px 0;">
          -${formatCOP(totalOutflowsSum)}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #991B1B; font-weight: 600;">
          <span>Compras, insumos, gastos, nómina y retiros</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver detalle ➔</span>
        </div>
      </div>

      <!-- Base / Aportes Propios -->
      <div class="kpi-clickable-card" id="kpiAllBase" style="cursor: pointer; background: #F8FAFC; padding: 18px; border-radius: var(--radius-md); border: 1.5px solid var(--border-color); transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver las bases y aportes propios">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: var(--text-main);">🏦 BASE / APORTES PROPIOS 🔍</span>
          <span style="font-size: 1.2rem;">💼</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: var(--primary); margin: 6px 0;">
          ${formatCOP(totalInjections - totalWithdrawals)}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: var(--text-muted); font-weight: 600;">
          <span>Inyectado: +${formatCOP(totalInjections)} • Retirado: -${formatCOP(totalWithdrawals)}</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver aportes ➔</span>
        </div>
      </div>
    `;

    // Listeners interactivos para la pestaña ALL
    kpisGrid.querySelector('#kpiAllBalance')?.addEventListener('click', () => {
      openCashKpiDetailModal({
        title: '💰 Balance de Dinero en Caja (Saldo Real)',
        subtitle: 'Ingresos totales recaudados menos egresos pagados en este período',
        totalAmount: netFilteredBalance,
        badgeText: 'SALDO NETO REAL',
        items: allMovements.filter((m) => m.flowType !== 'TRANSFER'),
        isNet: true,
      });
    });

    kpisGrid.querySelector('#kpiAllInflows')?.addEventListener('click', () => {
      openCashKpiDetailModal({
        title: '🟢 Desglose de Todos los Ingresos',
        subtitle: 'Ventas cobradas de clientes y bases/aportes inyectados a la caja',
        totalAmount: totalInflowsSum,
        badgeText: 'TOTAL INGRESOS',
        items: allMovements.filter((m) => m.flowType === 'INFLOW'),
      });
    });

    kpisGrid.querySelector('#kpiAllOutflows')?.addEventListener('click', () => {
      openCashKpiDetailModal({
        title: '🔴 Desglose de Todos los Egresos',
        subtitle: 'Compras de insumos, gastos operativos, nómina y retiros de socios',
        totalAmount: totalOutflowsSum,
        badgeText: 'TOTAL EGRESOS',
        items: allMovements.filter((m) => m.flowType === 'OUTFLOW'),
      });
    });

    kpisGrid.querySelector('#kpiAllBase')?.addEventListener('click', () => {
      openCashKpiDetailModal({
        title: '🏦 Desglose de Bases y Aportes Propios',
        subtitle: 'Bases para dar vuelto, aportes de bolsillo y devoluciones',
        totalAmount: totalInjections - totalWithdrawals,
        badgeText: 'BASE NETA',
        items: allMovements.filter((m) => m.tabCategory === 'BASE'),
        isNet: true,
      });
    });

    banner.style.background = '#F0F9FF';
    banner.style.border = '1.5px solid #BAE6FD';
    banner.style.color = '#0369A1';
    banner.innerHTML = `
      <div>
        <span>📊 Mostrando <strong>${filtered.length} movimientos</strong> en este período</span>
      </div>
      <div style="display: flex; gap: 12px; align-items: center;">
        <span style="color: #15803D;">Entradas: <strong>+${formatCOP(totalInflowsSum)}</strong></span>
        <span style="color: #DC2626;">Salidas: <strong>-${formatCOP(totalOutflowsSum)}</strong></span>
        <span style="background: #0284C7; color: #FFF; padding: 4px 10px; border-radius: 20px; font-weight: 800;">
          Saldo Neto: ${formatCOP(netFilteredBalance)}
        </span>
      </div>
    `;
  } else if (activeMovementTab === 'TRANSFERS') {
    // PESTAÑA DEDICADA: Transferencias, Traslados y Desglose de Cuentas
    const cashInHand = Number(kpis.cashInHand || 0);
    const digitalBank = Number(kpis.digitalBank || 0);
    const totalCash = Number(kpis.cashBalance || (cashInHand + digitalBank));

    const transfersCashToBank = filtered.filter((m) => m.type === 'TRASLADO_EFECTIVO_A_BANCO').reduce((sum, m) => sum + m.amount, 0);
    const transfersBankToCash = filtered.filter((m) => m.type === 'TRASLADO_BANCO_A_EFECTIVO').reduce((sum, m) => sum + m.amount, 0);

    kpisGrid.innerHTML = `
      <!-- Dinero Total Global -->
      <div class="kpi-clickable-card" id="kpiTransfersTotal" style="cursor: pointer; background: #ECFDF5; padding: 18px; border-radius: var(--radius-md); border: 2.5px solid #10B981; transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver de dónde salió y entró todo el dinero">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: #065F46;">💰 DINERO TOTAL EN CAJA 🔍</span>
          <span style="font-size: 1.2rem;">💵</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: #047857; margin: 6px 0;">
          ${formatCOP(totalCash)}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #065F46; font-weight: 700;">
          <span>Total acumulado entre efectivo y banco</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver todo ➔</span>
        </div>
      </div>

      <!-- En Efectivo Físico -->
      <div class="kpi-clickable-card" id="kpiTransfersCashInHand" style="cursor: pointer; background: #F0FDF4; padding: 18px; border-radius: var(--radius-md); border: 1.5px solid #BBF7D0; transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver todos los cobros, compras y traslados en efectivo">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: #166534;">💵 EN EFECTIVO (EN MANO) 🔍</span>
          <span style="font-size: 1.2rem;">🪙</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: #15803D; margin: 6px 0;">
          ${formatCOP(cashInHand)}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #166534; font-weight: 600;">
          <span>Billetes y monedas físicas</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver detalle ➔</span>
        </div>
      </div>

      <!-- En Transferencias / Cuentas -->
      <div class="kpi-clickable-card" id="kpiTransfersDigitalBank" style="cursor: pointer; background: #FAF5FF; padding: 18px; border-radius: var(--radius-md); border: 1.5px solid #E9D5FF; transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver todos los pagos y cobros por transferencia">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: #6B21A8;">🟣 EN TRANSFERENCIA (NEQUI / BANCO) 🔍</span>
          <span style="font-size: 1.2rem;">📱</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: #7E22CE; margin: 6px 0;">
          ${formatCOP(digitalBank)}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #6B21A8; font-weight: 600;">
          <span>Cuentas digitales y aplicaciones</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver detalle ➔</span>
        </div>
      </div>

      <!-- Total Traslados -->
      <div class="kpi-clickable-card" id="kpiTransfersCount" style="cursor: pointer; background: #EFF6FF; padding: 18px; border-radius: var(--radius-md); border: 1.5px solid #BFDBFE; transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver la lista de traslados internos">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: #1E40AF;">🔄 TRASLADOS REGISTRADOS 🔍</span>
          <span style="font-size: 1.2rem;">🏦</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: #2563EB; margin: 6px 0;">
          ${filtered.length}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #1E40AF; font-weight: 600;">
          <span>Movimientos entre efectivo y cuenta</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver traslados ➔</span>
        </div>
      </div>
    `;

    // Listeners interactivos para la pestaña TRANSFERS
    kpisGrid.querySelector('#kpiTransfersTotal')?.addEventListener('click', () => {
      openCashKpiDetailModal({
        title: '💰 Dinero Total Global en Caja y Cuentas',
        subtitle: 'Todos los cobros de ventas, compras, gastos, nómina y aportes del negocio',
        totalAmount: totalCash,
        badgeText: 'TOTAL DINERO EN CAJA',
        items: allMovements,
        isNet: true,
      });
    });

    kpisGrid.querySelector('#kpiTransfersCashInHand')?.addEventListener('click', () => {
      const cashItems = [
        ...allMovements.filter((m) => m.flowType === 'INFLOW' && isCash(m.paymentMethod)),
        ...allMovements.filter((m) => m.flowType === 'TRANSFER' && m.type === 'TRASLADO_BANCO_A_EFECTIVO').map((t) => ({ ...t, flowType: 'INFLOW', categoryLabel: '🔄 Retiro de Banco a Efectivo' })),
        ...allMovements.filter((m) => m.flowType === 'OUTFLOW' && isCash(m.paymentMethod)),
        ...allMovements.filter((m) => m.flowType === 'TRANSFER' && m.type === 'TRASLADO_EFECTIVO_A_BANCO').map((t) => ({ ...t, flowType: 'OUTFLOW', categoryLabel: '🔄 Consignación de Efectivo a Banco' })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      openCashKpiDetailModal({
        title: '💵 Desglose de Dinero en Efectivo (En Mano)',
        subtitle: 'Todos los pagos y cobros que entraron o salieron en billetes y monedas físicas',
        totalAmount: cashInHand,
        badgeText: 'SALDO TOTAL EN EFECTIVO',
        items: cashItems,
        isNet: true,
      });
    });

    kpisGrid.querySelector('#kpiTransfersDigitalBank')?.addEventListener('click', () => {
      const bankItems = [
        ...allMovements.filter((m) => m.flowType === 'INFLOW' && !isCash(m.paymentMethod)),
        ...allMovements.filter((m) => m.flowType === 'TRANSFER' && m.type === 'TRASLADO_EFECTIVO_A_BANCO').map((t) => ({ ...t, flowType: 'INFLOW', categoryLabel: '🔄 Consignación desde Efectivo' })),
        ...allMovements.filter((m) => m.flowType === 'OUTFLOW' && !isCash(m.paymentMethod)),
        ...allMovements.filter((m) => m.flowType === 'TRANSFER' && m.type === 'TRASLADO_BANCO_A_EFECTIVO').map((t) => ({ ...t, flowType: 'OUTFLOW', categoryLabel: '🔄 Retiro hacia Efectivo' })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      openCashKpiDetailModal({
        title: '🟣 Desglose de Fondos en Transferencia (Nequi / Banco)',
        subtitle: 'Todos los cobros digitales, pagos por cuenta y traslados bancarios',
        totalAmount: digitalBank,
        badgeText: 'SALDO TOTAL EN TRANSFERENCIA',
        items: bankItems,
        isNet: true,
      });
    });

    kpisGrid.querySelector('#kpiTransfersCount')?.addEventListener('click', () => {
      openCashKpiDetailModal({
        title: '🔄 Historial de Traslados de Fondos',
        subtitle: 'Movimientos internos entre efectivo y cuentas bancarias digitales',
        totalAmount: transfersCashToBank + transfersBankToCash,
        badgeText: 'TOTAL TRASLADADO',
        items: filtered,
      });
    });

    banner.style.background = '#EFF6FF';
    banner.style.border = '1.5px solid #BFDBFE';
    banner.style.color = '#1E40AF';
    banner.innerHTML = `
      <div>
        <span>🔄 Desglose de Modalidades: <strong>💵 Efectivo: ${formatCOP(cashInHand)}</strong> | <strong>🟣 Transferencia: ${formatCOP(digitalBank)}</strong></span>
      </div>
      <div style="display: flex; gap: 12px; align-items: center;">
        <span>Consignado: <strong>+${formatCOP(transfersCashToBank)}</strong></span>
        <span>Retirado a efectivo: <strong>+${formatCOP(transfersBankToCash)}</strong></span>
        <span style="background: #2563EB; color: #FFF; padding: 4px 10px; border-radius: 20px; font-weight: 800;">
          Total: ${formatCOP(totalCash)}
        </span>
      </div>
    `;
  } else if (activeMovementTab === 'BASE') {
    const baseInjections = filtered.filter((m) => m.flowType === 'INFLOW').reduce((sum, m) => sum + m.amount, 0);
    const baseWithdrawals = filtered.filter((m) => m.flowType === 'OUTFLOW').reduce((sum, m) => sum + m.amount, 0);
    const netBase = baseInjections - baseWithdrawals;

    kpisGrid.innerHTML = `
      <div class="kpi-clickable-card" id="kpiBaseNet" style="cursor: pointer; background: ${netBase >= 0 ? '#ECFDF5' : '#FFFBEB'}; padding: 18px; border-radius: var(--radius-md); border: 2.5px solid ${netBase >= 0 ? '#10B981' : '#F59E0B'}; transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver el balance de capital aportado y retirado">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: ${netBase >= 0 ? '#065F46' : '#92400E'};">🏦 BASE NETA ACTIVA 🔍</span>
          <span style="font-size: 1.2rem;">💼</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: ${netBase >= 0 ? '#047857' : '#D97706'}; margin: 6px 0;">
          ${formatCOP(netBase)}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: ${netBase >= 0 ? '#065F46' : '#92400E'}; font-weight: 700;">
          <span>${netBase >= 0 ? 'Fondo disponible en caja' : 'Retiros superiores a aportes'}</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver balance ➔</span>
        </div>
      </div>

      <div class="kpi-clickable-card" id="kpiBaseInjections" style="cursor: pointer; background: #F0FDF4; padding: 18px; border-radius: var(--radius-md); border: 1.5px solid #BBF7D0; transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver todos los aportes de bolsillo y sencillo inyectados">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: #166534;">🟢 BASES Y APORTES INYECTADOS 🔍</span>
          <span style="font-size: 1.2rem;">➕</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: #15803D; margin: 6px 0;">
          +${formatCOP(baseInjections)}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #166534; font-weight: 600;">
          <span>${filtered.filter((m) => m.flowType === 'INFLOW').length} aportes de capital y sencillo</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver aportes ➔</span>
        </div>
      </div>

      <div class="kpi-clickable-card" id="kpiBaseWithdrawals" style="cursor: pointer; background: #FEF2F2; padding: 18px; border-radius: var(--radius-md); border: 1.5px solid #FECACA; transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver los retiros de base realizados">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: #991B1B;">🔴 RETIROS DE BASE 🔍</span>
          <span style="font-size: 1.2rem;">➖</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: #DC2626; margin: 6px 0;">
          -${formatCOP(baseWithdrawals)}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #991B1B; font-weight: 600;">
          <span>${filtered.filter((m) => m.flowType === 'OUTFLOW').length} retiros / devoluciones de dinero</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver retiros ➔</span>
        </div>
      </div>

      <div class="kpi-clickable-card" id="kpiBaseCount" style="cursor: pointer; background: #F8FAFC; padding: 18px; border-radius: var(--radius-md); border: 1.5px solid var(--border-color); transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver todos los registros de base">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: var(--text-main);">📑 TOTAL MOVIMIENTOS BASE 🔍</span>
          <span style="font-size: 1.2rem;">🏦</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: var(--primary); margin: 6px 0;">
          ${filtered.length}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: var(--text-muted); font-weight: 600;">
          <span>Registros de capital propio</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver historial ➔</span>
        </div>
      </div>
    `;

    // Listeners interactivos para la pestaña BASE
    kpisGrid.querySelector('#kpiBaseNet')?.addEventListener('click', () => {
      openCashKpiDetailModal({
        title: '🏦 Desglose de Base Neta y Capital de Socios',
        subtitle: 'Aportes propios inyectados a la caja menos devoluciones y retiros',
        totalAmount: netBase,
        badgeText: 'BASE NETA ACTIVA',
        items: filtered,
        isNet: true,
      });
    });

    kpisGrid.querySelector('#kpiBaseInjections')?.addEventListener('click', () => {
      openCashKpiDetailModal({
        title: '🟢 Bases y Aportes Inyectados a Caja',
        subtitle: 'Dinero propio puesto para dar vuelto, compras de emergencia o capital de trabajo',
        totalAmount: baseInjections,
        badgeText: 'TOTAL INYECTADO',
        items: filtered.filter((m) => m.flowType === 'INFLOW'),
      });
    });

    kpisGrid.querySelector('#kpiBaseWithdrawals')?.addEventListener('click', () => {
      openCashKpiDetailModal({
        title: '🔴 Retiros y Devoluciones de Base',
        subtitle: 'Dinero retirado de la caja como devolución de aportes o excedentes de sencillo',
        totalAmount: baseWithdrawals,
        badgeText: 'TOTAL RETIRADO',
        items: filtered.filter((m) => m.flowType === 'OUTFLOW'),
      });
    });

    kpisGrid.querySelector('#kpiBaseCount')?.addEventListener('click', () => {
      openCashKpiDetailModal({
        title: '📑 Historial Completo de Bases y Aportes',
        subtitle: 'Todos los registros de capital propio y caja chica',
        totalAmount: netBase,
        badgeText: 'HISTORIAL DE CAPITAL',
        items: filtered,
        isNet: true,
      });
    });

    banner.style.background = '#ECFDF5';
    banner.style.border = '1.5px solid #A7F3D0';
    banner.style.color = '#065F46';
    banner.innerHTML = `
      <div>
        <span>🏦 Filtrando: <strong>Bases y Aportes de Bolsillo</strong> (${filtered.length} registros)</span>
      </div>
      <div style="display: flex; gap: 12px; align-items: center;">
        <span style="color: #15803D;">Inyectado: <strong>+${formatCOP(baseInjections)}</strong></span>
        <span style="color: #DC2626;">Retirado: <strong>-${formatCOP(baseWithdrawals)}</strong></span>
        <span style="background: #059669; color: #FFF; padding: 4px 10px; border-radius: 20px; font-weight: 800;">
          Base Neta: ${formatCOP(netBase)}
        </span>
      </div>
    `;
  } else if (activeMovementTab === 'SALES') {
    const salesSum = filtered.reduce((sum, m) => sum + m.amount, 0);
    const salesLiters = filtered.reduce((sum, m) => sum + (m.liters || 0), 0);

    kpisGrid.innerHTML = `
      <div class="kpi-clickable-card" id="kpiSalesSum" style="cursor: pointer; background: #F0FDF4; padding: 18px; border-radius: var(--radius-md); border: 2.5px solid #10B981; transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver el detalle de cobros de ventas">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: #166534;">🥛 TOTAL COBRADO EN VENTAS 🔍</span>
          <span style="font-size: 1.2rem;">💰</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: #15803D; margin: 6px 0;">
          +${formatCOP(salesSum)}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #166534; font-weight: 700;">
          <span>Dinero efectivamente recibido de clientes</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver cobros ➔</span>
        </div>
      </div>

      <div class="kpi-clickable-card" id="kpiSalesLiters" style="cursor: pointer; background: #EFF6FF; padding: 18px; border-radius: var(--radius-md); border: 1.5px solid #BFDBFE; transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver litros cobrados">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: #1E40AF;">🍶 LITROS COBRADOS 🔍</span>
          <span style="font-size: 1.2rem;">🥛</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: #2563EB; margin: 6px 0;">
          ${salesLiters.toLocaleString('es-CO')} L
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #1E40AF; font-weight: 600;">
          <span>Volumen total cobrado</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver detalle ➔</span>
        </div>
      </div>

      <div class="kpi-clickable-card" id="kpiSalesCount" style="cursor: pointer; background: #FAF5FF; padding: 18px; border-radius: var(--radius-md); border: 1.5px solid #E9D5FF; transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver pedidos cobrados">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: #6B21A8;">📦 PEDIDOS COBRADOS 🔍</span>
          <span style="font-size: 1.2rem;">✅</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: #7E22CE; margin: 6px 0;">
          ${filtered.length}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #6B21A8; font-weight: 600;">
          <span>Cobros procesados</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver pedidos ➔</span>
        </div>
      </div>

      <div class="kpi-clickable-card" id="kpiSalesAvg" style="cursor: pointer; background: #F8FAFC; padding: 18px; border-radius: var(--radius-md); border: 1.5px solid var(--border-color); transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver promedio por cobro">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: var(--text-main);">💵 PROMEDIO POR COBRO 🔍</span>
          <span style="font-size: 1.2rem;">📊</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: var(--primary); margin: 6px 0;">
          ${formatCOP(filtered.length > 0 ? salesSum / filtered.length : 0)}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: var(--text-muted); font-weight: 600;">
          <span>Ticket promedio de cobro</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver detalle ➔</span>
        </div>
      </div>
    `;

    // Listeners interactivos para la pestaña SALES
    kpisGrid.querySelector('#kpiSalesSum')?.addEventListener('click', () => {
      openCashKpiDetailModal({
        title: '🥛 Cobros de Ventas Recaudados',
        subtitle: 'Todos los pagos recibidos de pedidos de clientes',
        totalAmount: salesSum,
        badgeText: 'TOTAL COBRADO',
        items: filtered,
      });
    });

    kpisGrid.querySelector('#kpiSalesLiters')?.addEventListener('click', () => {
      openCashKpiDetailModal({
        title: '🍶 Litros de Yogur Cobrados',
        subtitle: 'Detalle de pedidos y litros cobrados por sabor',
        totalAmount: salesSum,
        badgeText: `${salesLiters} LITROS TOTALES`,
        items: filtered,
      });
    });

    kpisGrid.querySelector('#kpiSalesCount')?.addEventListener('click', () => {
      openCashKpiDetailModal({
        title: '📦 Pedidos con Pago Recaudado',
        subtitle: 'Listado de todas las órdenes cobradas en este período',
        totalAmount: salesSum,
        badgeText: `${filtered.length} PEDIDOS COBRADOS`,
        items: filtered,
      });
    });

    kpisGrid.querySelector('#kpiSalesAvg')?.addEventListener('click', () => {
      openCashKpiDetailModal({
        title: '💵 Promedio por Cobro de Venta',
        subtitle: 'Detalle de cobros realizados a clientes',
        totalAmount: filtered.length > 0 ? salesSum / filtered.length : 0,
        badgeText: 'TICKET PROMEDIO',
        items: filtered,
      });
    });

    banner.style.background = '#F0FDF4';
    banner.style.border = '1.5px solid #BBF7D0';
    banner.style.color = '#166534';
    banner.innerHTML = `
      <div>
        <span>🥛 Filtrando: <strong>Cobros de Ventas</strong> (${filtered.length} pedidos cobrados)</span>
      </div>
      <div style="display: flex; gap: 12px; align-items: center;">
        <span>Litros: <strong>${salesLiters} L</strong></span>
        <span style="background: #16A34A; color: #FFF; padding: 4px 10px; border-radius: 20px; font-weight: 800;">
          Total Cobrado: +${formatCOP(salesSum)}
        </span>
      </div>
    `;
  } else if (activeMovementTab === 'PURCHASES') {
    const purchasesSum = filtered.reduce((sum, m) => sum + m.amount, 0);
    const uniqueSuppliers = new Set(filtered.map((m) => m.supplier).filter(Boolean)).size;

    kpisGrid.innerHTML = `
      <div class="kpi-clickable-card" id="kpiPurchasesSum" style="cursor: pointer; background: #FEF3C7; padding: 18px; border-radius: var(--radius-md); border: 2.5px solid #F59E0B; transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver compras de insumos">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: #92400E;">🥛 TOTAL COMPRAS INSUMOS 🔍</span>
          <span style="font-size: 1.2rem;">🛒</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: #D97706; margin: 6px 0;">
          -${formatCOP(purchasesSum)}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #92400E; font-weight: 700;">
          <span>Leche, envases, etiquetas, azúcar y fruta</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver compras ➔</span>
        </div>
      </div>

      <div class="kpi-clickable-card" id="kpiPurchasesCount" style="cursor: pointer; background: #FFFBEB; padding: 18px; border-radius: var(--radius-md); border: 1.5px solid #FDE68A; transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver lista de compras">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: #B45309;">📦 N° DE COMPRAS 🔍</span>
          <span style="font-size: 1.2rem;">🧾</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: #D97706; margin: 6px 0;">
          ${filtered.length}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #B45309; font-weight: 600;">
          <span>Facturas y compras registradas</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver detalle ➔</span>
        </div>
      </div>

      <div class="kpi-clickable-card" id="kpiPurchasesSuppliers" style="cursor: pointer; background: #F8FAFC; padding: 18px; border-radius: var(--radius-md); border: 1.5px solid var(--border-color); transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver compras por proveedor">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: var(--text-main);">🏢 PROVEEDORES 🔍</span>
          <span style="font-size: 1.2rem;">🤝</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: var(--primary); margin: 6px 0;">
          ${uniqueSuppliers}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: var(--text-muted); font-weight: 600;">
          <span>Proveedores locales activos</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver detalle ➔</span>
        </div>
      </div>

      <div class="kpi-clickable-card" id="kpiPurchasesAvg" style="cursor: pointer; background: #F8FAFC; padding: 18px; border-radius: var(--radius-md); border: 1.5px solid var(--border-color); transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver costo medio de compra">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: var(--text-main);">📊 COMPRA PROMEDIO 🔍</span>
          <span style="font-size: 1.2rem;">💵</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: var(--text-main); margin: 6px 0;">
          ${formatCOP(filtered.length > 0 ? purchasesSum / filtered.length : 0)}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: var(--text-muted); font-weight: 600;">
          <span>Costo medio por adquisición</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver detalle ➔</span>
        </div>
      </div>
    `;

    // Listeners interactivos para la pestaña PURCHASES
    kpisGrid.querySelector('#kpiPurchasesSum')?.addEventListener('click', () => {
      openCashKpiDetailModal({
        title: '🥛 Compras de Materia Prima e Insumos',
        subtitle: 'Adquisición de leche, fruta, envases, etiquetas y azúcar',
        totalAmount: purchasesSum,
        badgeText: 'TOTAL COMPRAS',
        items: filtered,
      });
    });

    kpisGrid.querySelector('#kpiPurchasesCount')?.addEventListener('click', () => {
      openCashKpiDetailModal({
        title: '📦 Facturas y Compras de Insumos',
        subtitle: 'Listado completo de adquisiciones para producción',
        totalAmount: purchasesSum,
        badgeText: `${filtered.length} COMPRAS`,
        items: filtered,
      });
    });

    kpisGrid.querySelector('#kpiPurchasesSuppliers')?.addEventListener('click', () => {
      openCashKpiDetailModal({
        title: '🏢 Compras por Proveedor Local',
        subtitle: 'Adquisiciones organizadas por proveedor de la región',
        totalAmount: purchasesSum,
        badgeText: `${uniqueSuppliers} PROVEEDORES`,
        items: filtered,
      });
    });

    kpisGrid.querySelector('#kpiPurchasesAvg')?.addEventListener('click', () => {
      openCashKpiDetailModal({
        title: '📊 Promedio por Compra de Insumos',
        subtitle: 'Costo medio de pedidos de materia prima',
        totalAmount: filtered.length > 0 ? purchasesSum / filtered.length : 0,
        badgeText: 'COMPRA PROMEDIO',
        items: filtered,
      });
    });

    banner.style.background = '#FFFBEB';
    banner.style.border = '1.5px solid #FDE68A';
    banner.style.color = '#92400E';
    banner.innerHTML = `
      <div>
        <span>🥛 Filtrando: <strong>Compras de Insumos y Materia Prima</strong> (${filtered.length} compras)</span>
      </div>
      <div style="display: flex; gap: 12px; align-items: center;">
        <span style="background: #D97706; color: #FFF; padding: 4px 10px; border-radius: 20px; font-weight: 800;">
          Total Compras: -${formatCOP(purchasesSum)}
        </span>
      </div>
    `;
  } else if (activeMovementTab === 'EXPENSES') {
    const expensesSum = filtered.reduce((sum, m) => sum + m.amount, 0);

    kpisGrid.innerHTML = `
      <div class="kpi-clickable-card" id="kpiExpensesSum" style="cursor: pointer; background: #FEF2F2; padding: 18px; border-radius: var(--radius-md); border: 2.5px solid #EF4444; transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver gastos operativos">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: #991B1B;">⚙️ TOTAL GASTOS OPERATIVOS 🔍</span>
          <span style="font-size: 1.2rem;">🧾</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: #DC2626; margin: 6px 0;">
          -${formatCOP(expensesSum)}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #991B1B; font-weight: 700;">
          <span>Equipos, servicios, gas, gasolina y publicidad</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver gastos ➔</span>
        </div>
      </div>

      <div class="kpi-clickable-card" id="kpiExpensesCount" style="cursor: pointer; background: #FFF1F2; padding: 18px; border-radius: var(--radius-md); border: 1.5px solid #FECDD3; transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver lista de gastos">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: #9F1239;">📋 N° DE GASTOS REGISTRADOS 🔍</span>
          <span style="font-size: 1.2rem;">📑</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: #E11D48; margin: 6px 0;">
          ${filtered.length}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #9F1239; font-weight: 600;">
          <span>Salidas de dinero operativas</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver detalle ➔</span>
        </div>
      </div>

      <div class="kpi-clickable-card" id="kpiExpensesAvg" style="cursor: pointer; background: #F8FAFC; padding: 18px; border-radius: var(--radius-md); border: 1.5px solid var(--border-color); transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver gasto promedio">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: var(--text-main);">💵 GASTO PROMEDIO 🔍</span>
          <span style="font-size: 1.2rem;">📊</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: var(--primary); margin: 6px 0;">
          ${formatCOP(filtered.length > 0 ? expensesSum / filtered.length : 0)}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: var(--text-muted); font-weight: 600;">
          <span>Costo medio por gasto</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver detalle ➔</span>
        </div>
      </div>

      <div class="kpi-clickable-card" id="kpiExpensesUsers" style="cursor: pointer; background: #F8FAFC; padding: 18px; border-radius: var(--radius-md); border: 1.5px solid var(--border-color); transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver responsables">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: var(--text-main);">👤 REGISTRADOS POR 🔍</span>
          <span style="font-size: 1.2rem;">👥</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: var(--primary); margin: 6px 0;">
          ${new Set(filtered.map((m) => m.registeredBy).filter(Boolean)).size || 1}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: var(--text-muted); font-weight: 600;">
          <span>Usuarios responsables</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver detalle ➔</span>
        </div>
      </div>
    `;

    // Listeners interactivos para la pestaña EXPENSES
    kpisGrid.querySelector('#kpiExpensesSum')?.addEventListener('click', () => {
      openCashKpiDetailModal({
        title: '⚙️ Gastos Operativos e Infraestructura',
        subtitle: 'Pagos de servicios, gas, transporte, publicidad y herramientas',
        totalAmount: expensesSum,
        badgeText: 'TOTAL GASTOS',
        items: filtered,
      });
    });

    kpisGrid.querySelector('#kpiExpensesCount')?.addEventListener('click', () => {
      openCashKpiDetailModal({
        title: '📋 Registros de Gastos Operativos',
        subtitle: 'Listado completo de facturas y recibos de servicios y mantenimiento',
        totalAmount: expensesSum,
        badgeText: `${filtered.length} GASTOS`,
        items: filtered,
      });
    });

    kpisGrid.querySelector('#kpiExpensesAvg')?.addEventListener('click', () => {
      openCashKpiDetailModal({
        title: '💵 Promedio de Gastos Operativos',
        subtitle: 'Costo medio por cada gasto registrado',
        totalAmount: filtered.length > 0 ? expensesSum / filtered.length : 0,
        badgeText: 'GASTO PROMEDIO',
        items: filtered,
      });
    });

    kpisGrid.querySelector('#kpiExpensesUsers')?.addEventListener('click', () => {
      openCashKpiDetailModal({
        title: '👤 Gastos por Usuario Responsable',
        subtitle: 'Desglose de gastos registrados por cada persona del equipo',
        totalAmount: expensesSum,
        badgeText: 'RESPONSABLES',
        items: filtered,
      });
    });

    banner.style.background = '#FEF2F2';
    banner.style.border = '1.5px solid #FECACA';
    banner.style.color = '#991B1B';
    banner.innerHTML = `
      <div>
        <span>⚙️ Filtrando: <strong>Gastos Operativos e Infraestructura</strong> (${filtered.length} gastos)</span>
      </div>
      <div style="display: flex; gap: 12px; align-items: center;">
        <span style="background: #DC2626; color: #FFF; padding: 4px 10px; border-radius: 20px; font-weight: 800;">
          Total Gastos: -${formatCOP(expensesSum)}
        </span>
      </div>
    `;
  } else if (activeMovementTab === 'PAYROLL') {
    const payrollOnly = filtered.filter((m) => m.category === 'NOMINA').reduce((sum, m) => sum + m.amount, 0);
    const drawsOnly = filtered.filter((m) => m.category === 'RETIRO_SOCIO').reduce((sum, m) => sum + m.amount, 0);
    const totalPayroll = payrollOnly + drawsOnly;

    kpisGrid.innerHTML = `
      <div class="kpi-clickable-card" id="kpiPayrollTotal" style="cursor: pointer; background: #FAF5FF; padding: 18px; border-radius: var(--radius-md); border: 2.5px solid #A855F7; transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver nómina y retiros">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: #6B21A8;">👥 TOTAL NÓMINA Y RETIROS 🔍</span>
          <span style="font-size: 1.2rem;">💼</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: #7E22CE; margin: 6px 0;">
          -${formatCOP(totalPayroll)}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #6B21A8; font-weight: 700;">
          <span>Mano de obra y retiros de socios</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver pagos ➔</span>
        </div>
      </div>

      <div class="kpi-clickable-card" id="kpiPayrollStaff" style="cursor: pointer; background: #EDE9FE; padding: 18px; border-radius: var(--radius-md); border: 1.5px solid #DDD6FE; transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver nómina del personal">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: #5B21B6;">👥 NÓMINA PERSONAL 🔍</span>
          <span style="font-size: 1.2rem;">🧑‍🍳</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: #6D28D9; margin: 6px 0;">
          -${formatCOP(payrollOnly)}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #5B21B6; font-weight: 600;">
          <span>${filtered.filter((m) => m.category === 'NOMINA').length} pagos de producción/mano de obra</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver detalle ➔</span>
        </div>
      </div>

      <div class="kpi-clickable-card" id="kpiPayrollDraws" style="cursor: pointer; background: #FDF2F8; padding: 18px; border-radius: var(--radius-md); border: 1.5px solid #FBCFE8; transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver retiros de socios">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: #9D174D;">💼 RETIROS DE SOCIOS 🔍</span>
          <span style="font-size: 1.2rem;">🤝</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: #BE185D; margin: 6px 0;">
          -${formatCOP(drawsOnly)}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #9D174D; font-weight: 600;">
          <span>${filtered.filter((m) => m.category === 'RETIRO_SOCIO').length} retiros de ganancias</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver retiros ➔</span>
        </div>
      </div>

      <div class="kpi-clickable-card" id="kpiPayrollCount" style="cursor: pointer; background: #F8FAFC; padding: 18px; border-radius: var(--radius-md); border: 1.5px solid var(--border-color); transition: transform 0.15s ease, box-shadow 0.15s ease;" title="🔍 Haz clic para ver total pagos">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: var(--text-main);">📑 TOTAL PAGOS 🔍</span>
          <span style="font-size: 1.2rem;">👥</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: var(--primary); margin: 6px 0;">
          ${filtered.length}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: var(--text-muted); font-weight: 600;">
          <span>Pagos procesados</span>
          <span style="text-decoration: underline; font-size: 0.72rem;">Ver historial ➔</span>
        </div>
      </div>
    `;

    // Listeners interactivos para la pestaña PAYROLL
    kpisGrid.querySelector('#kpiPayrollTotal')?.addEventListener('click', () => {
      openCashKpiDetailModal({
        title: '👥 Total Nómina y Retiros de Socios',
        subtitle: 'Todos los pagos de mano de obra y retiros de utilidades',
        totalAmount: totalPayroll,
        badgeText: 'TOTAL PAGOS',
        items: filtered,
      });
    });

    kpisGrid.querySelector('#kpiPayrollStaff')?.addEventListener('click', () => {
      openCashKpiDetailModal({
        title: '🧑‍🍳 Nómina y Pagos al Personal',
        subtitle: 'Mano de obra en producción de yogures y domicilios',
        totalAmount: payrollOnly,
        badgeText: 'NÓMINA PERSONAL',
        items: filtered.filter((m) => m.category === 'NOMINA'),
      });
    });

    kpisGrid.querySelector('#kpiPayrollDraws')?.addEventListener('click', () => {
      openCashKpiDetailModal({
        title: '💼 Retiros de Ganancias de Socios',
        subtitle: 'Retiros realizados por Edier y Yeilin',
        totalAmount: drawsOnly,
        badgeText: 'RETIROS SOCIOS',
        items: filtered.filter((m) => m.category === 'RETIRO_SOCIO'),
      });
    });

    kpisGrid.querySelector('#kpiPayrollCount')?.addEventListener('click', () => {
      openCashKpiDetailModal({
        title: '📑 Historial de Pagos de Personal y Socios',
        subtitle: 'Comprobantes de pago de nómina y retiros',
        totalAmount: totalPayroll,
        badgeText: `${filtered.length} PAGOS`,
        items: filtered,
      });
    });

    banner.style.background = '#FAF5FF';
    banner.style.border = '1.5px solid #E9D5FF';
    banner.style.color = '#6B21A8';
    banner.innerHTML = `
      <div>
        <span>👥 Filtrando: <strong>Nómina y Retiros de Socios</strong> (${filtered.length} pagos)</span>
      </div>
      <div style="display: flex; gap: 12px; align-items: center;">
        <span>Nómina: <strong>-${formatCOP(payrollOnly)}</strong></span>
        <span>Retiros: <strong>-${formatCOP(drawsOnly)}</strong></span>
        <span style="background: #7E22CE; color: #FFF; padding: 4px 10px; border-radius: 20px; font-weight: 800;">
          Total: -${formatCOP(totalPayroll)}
        </span>
      </div>
    `;
  }

  // 4. Renderizar la tabla de movimientos filtrados
  if (filtered.length === 0) {
    tableWrapper.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💵</div>
        <div class="empty-state-title">No hay movimientos en esta vista</div>
        <div class="empty-state-text">Prueba cambiando el período de fecha o seleccionando otra pestaña.</div>
      </div>
    `;
    return;
  }

  tableWrapper.innerHTML = `
    <div class="table-responsive">
      <table class="app-table" style="font-size: 0.85rem;">
        <thead>
          <tr>
            <th>Fecha Pago / Movimiento</th>
            <th>Tipo / Origen</th>
            <th>Concepto / Detalle</th>
            <th>Modalidad / Medio</th>
            <th>Responsable / Cliente</th>
            <th style="text-align: right;">Monto</th>
            <th style="text-align: right;">Acción</th>
          </tr>
        </thead>
        <tbody>
          ${filtered
            .map((m) => {
              const isPositive = m.flowType === 'INFLOW';
              const isTransfer = m.flowType === 'TRANSFER';

              let badgeBg = '#F1F5F9';
              let badgeColor = '#475569';
              let typeLabel = m.orderNumber || m.categoryLabel || m.category || 'MOVIMIENTO';

              if (isTransfer) {
                badgeBg = '#DBEAFE';
                badgeColor = '#1E40AF';
                typeLabel = m.type === 'TRASLADO_EFECTIVO_A_BANCO' ? '🔄 Efectivo ➔ Banco' : '🔄 Banco ➔ Efectivo';
              } else if (m.tabCategory === 'BASE') {
                badgeBg = isPositive ? '#E0F2FE' : '#FEE2E2';
                badgeColor = isPositive ? '#0369A1' : '#DC2626';
              } else if (m.tabCategory === 'SALES') {
                badgeBg = '#DCFCE7';
                badgeColor = '#15803D';
              } else if (m.tabCategory === 'PURCHASES') {
                badgeBg = '#FEF3C7';
                badgeColor = '#D97706';
              } else if (m.tabCategory === 'PAYROLL') {
                badgeBg = '#EDE9FE';
                badgeColor = '#7C3AED';
              } else if (m.tabCategory === 'EXPENSES') {
                badgeBg = '#FEE2E2';
                badgeColor = '#DC2626';
              }

              const description = m.isCashMovement
                ? m.flavor || 'Movimiento de Base'
                : isTransfer
                ? m.description || m.concept || 'Traslado de fondos'
                : m.flavor
                ? `${m.liters}L (${m.flavor})`
                : m.description || 'Detalle';

              const person = m.customerName || m.supplier || m.registeredBy || m.staffName || 'Edier';

              let methodBadge = `<span class="badge" style="background: #F1F5F9; color: #475569; font-weight: 700; font-size: 0.72rem;">💵 EFECTIVO</span>`;
              if (isTransfer) {
                methodBadge = `<span class="badge" style="background: #EFF6FF; color: #2563EB; font-weight: 700; font-size: 0.72rem;">🔄 TRASLADO</span>`;
              } else if (!isCash(m.paymentMethod)) {
                methodBadge = `<span class="badge" style="background: #FAF5FF; color: #7E22CE; font-weight: 700; font-size: 0.72rem;">🟣 ${m.paymentMethod || 'TRANSFERENCIA'}</span>`;
              }

              return `
              <tr>
                <td><small style="color: var(--text-muted); font-weight: 600;">${formatDate(m.date)}</small></td>
                <td>
                  <span class="badge" style="background: ${badgeBg}; color: ${badgeColor}; font-weight: 800; font-size: 0.72rem;">
                    ${typeLabel}
                  </span>
                </td>
                <td>
                  <strong>${description}</strong>
                  ${m.supplier ? `<div style="font-size: 0.72rem; color: var(--text-muted);">🏢 ${m.supplier}</div>` : ''}
                  ${m.notes ? `<div style="font-size: 0.72rem; color: var(--text-muted);">📝 ${m.notes}</div>` : ''}
                </td>
                <td>
                  ${methodBadge}
                </td>
                <td>
                  <span style="font-weight: 600;">${person}</span>
                </td>
                <td style="text-align: right;">
                  <strong style="color: ${isTransfer ? '#2563EB' : isPositive ? '#15803D' : '#DC2626'}; font-size: 1.05rem; font-weight: 900;">
                    ${isTransfer ? '🔄 ' : isPositive ? '+' : '-'}${formatCOP(Math.abs(m.displayAmount !== undefined ? m.displayAmount : m.amount))}
                  </strong>
                </td>
                <td style="text-align: right; white-space: nowrap;">
                  ${
                    m.isCashMovement || isTransfer || m.category === 'RETIRO_BASE'
                      ? `
                        <button class="btn btn-outline btn-sm btn-edit-cash-item" data-id="${m.rawId}" style="color: var(--primary); margin-right: 4px; padding: 4px 8px;" title="Editar registro de base / aporte / traslado">✏️</button>
                        <button class="btn btn-outline btn-sm btn-del-cash-item" data-type="cash" data-id="${m.rawId}" style="color: var(--danger); padding: 4px 8px;" title="Eliminar movimiento">🗑️</button>
                      `
                      : m.flowType === 'INFLOW' && !m.isCashMovement
                      ? `
                        <button class="btn btn-outline btn-sm btn-manage-sale-payment" data-order-id="${m.rawId}" data-total="${m.totalAmount}" data-paid="${m.amount}" data-pending="${m.pendingAmount}" style="color: var(--primary); margin-right: 4px; padding: 4px 8px;" title="Gestionar / Editar abonos de este pedido">💵</button>
                        <button class="btn btn-outline btn-sm btn-del-sale-payment" data-order-id="${m.rawId}" data-payment-id="${m.paymentId || ''}" data-amount="${m.amount}" data-cust="${m.customerName || 'Cliente'}" style="color: var(--danger); padding: 4px 8px;" title="Eliminar este abono o cobro duplicado">🗑️</button>
                      `
                      : m.category && m.category !== 'COMPRA_INSUMO' && m.category !== 'NOMINA' && m.category !== 'RETIRO_SOCIO'
                      ? `<button class="btn btn-outline btn-sm btn-del-cash-item" data-type="expense" data-id="${m.rawId}" style="color: var(--danger);" title="Eliminar gasto">🗑️</button>`
                      : `<span style="font-size: 0.72rem; color: var(--text-muted);">🔒 Auto</span>`
                  }
                </td>
              </tr>
            `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `;

  // Listeners para gestionar abonos de pedidos desde el Libro de Caja
  tableWrapper.querySelectorAll('.btn-manage-sale-payment').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const orderId = Number(e.currentTarget.dataset.orderId);
      const total = Number(e.currentTarget.dataset.total);
      const paid = Number(e.currentTarget.dataset.paid);
      const pending = Number(e.currentTarget.dataset.pending);
      openPaymentModal(orderId, total, paid, pending, () => {
        loadCashData(mainContainer);
      });
    });
  });

  // Listeners para eliminar abonos individuales de ventas desde el Libro de Caja
  tableWrapper.querySelectorAll('.btn-del-sale-payment').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const orderId = Number(e.currentTarget.dataset.orderId);
      const paymentId = e.currentTarget.dataset.paymentId;
      const amount = Number(e.currentTarget.dataset.amount);
      const cust = e.currentTarget.dataset.cust;

      if (!paymentId) {
        showToast('Abre el gestor de abonos 💵 para seleccionar el pago a eliminar', 'warning');
        openPaymentModal(orderId, 0, 0, 0, () => loadCashData(mainContainer));
        return;
      }

      if (confirm(`¿Estás seguro de eliminar este abono de ${formatCOP(amount)} de ${cust}?\nEsto reajustará el saldo de caja y el estado del pedido inmediatamente.`)) {
        try {
          await api.deleteOrderPayment(orderId, paymentId);
          showToast(`¡Abono de ${formatCOP(amount)} eliminado exitosamente! 🗑️`);
          loadCashData(mainContainer);
        } catch (err) {
          showToast(err.message || 'Error al eliminar abono', 'danger');
        }
      }
    });
  });

  // Listeners de edición de movimientos de caja
  tableWrapper.querySelectorAll('.btn-edit-cash-item').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = Number(e.currentTarget.dataset.id);
      const movement = filtered.find((m) => Number(m.rawId) === id);
      if (movement) {
        const toEdit = movement.rawMovement || {
          id: movement.rawId,
          type: movement.movementType || movement.type || 'BASE_INICIAL',
          amount: Math.abs(movement.amount || movement.displayAmount),
          concept: movement.flavor || movement.concept || movement.description,
          paymentMethod: movement.paymentMethod || 'EFECTIVO',
          movementDate: movement.date,
          notes: movement.notes,
        };
        openCashMovementModal(() => loadCashData(mainContainer), toEdit.type || 'BASE_INICIAL', toEdit);
      }
    });
  });

  // Listeners de eliminación
  tableWrapper.querySelectorAll('.btn-del-cash-item').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const type = e.currentTarget.dataset.type;
      const id = e.currentTarget.dataset.id;

      if (type === 'cash') {
        if (confirm('¿Deseas eliminar este registro de caja / traslado?')) {
          try {
            await api.deleteCashMovement(id);
            showToast('Movimiento de caja eliminado exitosamente');
            loadCashData(mainContainer);
          } catch (err) {
            showToast('Error al eliminar movimiento', 'danger');
          }
        }
      } else if (type === 'expense') {
        if (confirm('¿Deseas eliminar este registro de gasto?')) {
          try {
            await api.deleteExpense(id);
            showToast('Gasto eliminado exitosamente');
            loadCashData(mainContainer);
          } catch (err) {
            showToast('Error al eliminar gasto', 'danger');
          }
        }
      }
    });
  });
}

// -----------------------------------------------------------------
// MODAL PARA TRASLADO ENTRE EFECTIVO Y TRANSFERENCIA / BANCO
// -----------------------------------------------------------------
export function openCashTransferModal(onSaved) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 480px;">
        <div class="modal-header">
          <h3 class="modal-title">🔄 Traslado de Fondos entre Cuentas</h3>
          <button class="modal-close-btn" id="btnCloseCashTransModal">✕</button>
        </div>
        <form id="cashTransferForm">
          <div class="modal-body">
            
            <div class="form-group">
              <label class="form-label">Dirección del Traslado *</label>
              <select id="cashTransType" class="form-select" required style="font-weight: 700;">
                <option value="TRASLADO_EFECTIVO_A_BANCO" selected>💵 Efectivo ➔ 🟣 Transferencia / Nequi / Bancolombia (Consignación)</option>
                <option value="TRASLADO_BANCO_A_EFECTIVO">🟣 Transferencia / Nequi / Bancolombia ➔ 💵 Efectivo (Retiro de cajero)</option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Monto a Trasladar ($ COP) *</label>
                <input type="number" id="cashTransAmount" class="form-input" min="1" step="any" placeholder="Ej: 50000" required style="font-weight: 800; font-size: 1.05rem; color: var(--primary);" />
              </div>

              <div class="form-group">
                <label class="form-label">Fecha del Traslado</label>
                <input type="date" id="cashTransDate" class="form-input" value="${getTodayLocalDateStr()}" required />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Concepto / Motivo *</label>
              <input type="text" id="cashTransConcept" class="form-input" placeholder="Ej: Consignación a Nequi de cobros en efectivo..." value="Consignación de ventas en efectivo a cuenta digital" required />
            </div>

            <div class="form-group">
              <label class="form-label">Notas Adicionales (Opcional)</label>
              <input type="text" id="cashTransNotes" class="form-input" placeholder="Ej: Comprobante Nequi #..." />
            </div>

            <div style="background: #EFF6FF; border: 1.5px solid #BFDBFE; border-radius: var(--radius-md); padding: 12px; font-size: 0.8rem; color: #1E40AF;">
              💡 <strong>Nota:</strong> Este movimiento ajusta los saldos de Efectivo y Transferencia sin alterar el dinero global disponible en tu negocio.
            </div>

          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btnCancelCashTransModal">Cancelar</button>
            <button type="submit" class="btn btn-primary" style="font-weight: 800;">Confirmar Traslado</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseCashTransModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelCashTransModal')?.addEventListener('click', closeModal);

  document.getElementById('cashTransferForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = document.getElementById('cashTransType').value;
    const amount = Number(document.getElementById('cashTransAmount').value);
    const concept = document.getElementById('cashTransConcept').value;
    const movementDate = document.getElementById('cashTransDate').value;
    const notes = document.getElementById('cashTransNotes').value;

    const payload = {
      type,
      amount,
      concept,
      paymentMethod: type === 'TRASLADO_EFECTIVO_A_BANCO' ? 'TRANSFERENCIA' : 'EFECTIVO',
      movementDate,
      notes,
      registeredBy: store.currentUser,
    };

    try {
      await api.createCashMovement(payload);
      showToast('¡Traslado de fondos registrado con éxito! 🔄');
      closeModal();
      if (typeof onSaved === 'function') onSaved();
    } catch (err) {
      showToast(err.message || 'Error al registrar traslado', 'danger');
    }
  });
}

// -----------------------------------------------------------------
// MODAL DE DESGLOSE INTERACTIVO DE KPIS (ORIGEN DE PAGOS Y FONDOS)
// -----------------------------------------------------------------
export function openCashKpiDetailModal({
  title,
  subtitle = '',
  totalAmount = 0,
  badgeText = 'TOTAL',
  items = [],
  isNet = false,
}) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  const isPositive = totalAmount >= 0;

  // Renderizar modal inicial
  const renderContent = (filterText = '') => {
    const normalizedFilter = filterText.toLowerCase().trim();
    const filteredItems = items
      .filter((item) => {
        if (!normalizedFilter) return true;
        const desc = (item.concept || item.description || item.flavor || item.orderNumber || '').toLowerCase();
        const person = (item.customerName || item.supplier || item.registeredBy || item.staffName || '').toLowerCase();
        const notes = (item.notes || '').toLowerCase();
        const method = (item.paymentMethod || '').toLowerCase();
        const cat = (item.categoryLabel || item.category || item.type || '').toLowerCase();
        return desc.includes(normalizedFilter) || person.includes(normalizedFilter) || notes.includes(normalizedFilter) || method.includes(normalizedFilter) || cat.includes(normalizedFilter);
      })
      .sort((a, b) => new Date(b.date || b.paymentDate || b.movementDate || 0).getTime() - new Date(a.date || a.paymentDate || a.movementDate || 0).getTime());

    const listHtml =
      filteredItems.length === 0
        ? `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
          <div style="font-size: 2rem; margin-bottom: 8px;">🔍</div>
          <div style="font-weight: 700; font-size: 0.95rem;">No se encontraron movimientos</div>
          <div style="font-size: 0.8rem;">No hay registros que coincidan con el filtro en este desglose.</div>
        </div>
      `
        : `
        <div class="table-responsive" style="max-height: 48vh; overflow-y: auto;">
          <table class="app-table" style="font-size: 0.82rem; margin-bottom: 0;">
            <thead style="position: sticky; top: 0; background: var(--bg-card); z-index: 2;">
              <tr>
                <th>Fecha</th>
                <th>Tipo / Origen</th>
                <th>Detalle / Concepto</th>
                <th>Medio</th>
                <th>Responsable / Tercero</th>
                <th style="text-align: right;">Monto</th>
              </tr>
            </thead>
            <tbody>
              ${filteredItems
                .map((item) => {
                  const isTransfer = item.flowType === 'TRANSFER' || item.type?.startsWith('TRASLADO_');
                  const itemIsPos = item.flowType === 'INFLOW' || (!isTransfer && (item.displayAmount !== undefined ? item.displayAmount > 0 : item.amount > 0));
                  const itemAmount = Math.abs(item.displayAmount !== undefined ? item.displayAmount : item.amount);
                  const dateStr = item.date ? formatDate(item.date) : item.movementDate ? formatDate(item.movementDate) : 'N/A';
                  const desc = item.concept || item.description || item.flavor || item.orderNumber || 'Movimiento';
                  const person = item.customerName || item.supplier || item.registeredBy || item.staffName || '—';

                  let typeBadgeBg = '#F1F5F9';
                  let typeBadgeColor = '#475569';
                  let typeLabel = item.categoryLabel || item.orderNumber || item.type || item.category || 'MOVIMIENTO';

                  if (item.type === 'BASE_INICIAL') {
                    typeBadgeBg = '#E0F2FE';
                    typeBadgeColor = '#0369A1';
                    typeLabel = '🏦 BASE INICIAL';
                  } else if (item.type === 'APORTE_SOCIO') {
                    typeBadgeBg = '#E0F2FE';
                    typeBadgeColor = '#0369A1';
                    typeLabel = '💼 APORTE SOCIO';
                  } else if (item.type === 'RETIRO_BASE') {
                    typeBadgeBg = '#FEE2E2';
                    typeBadgeColor = '#DC2626';
                    typeLabel = '🔴 RETIRO BASE';
                  } else if (item.type === 'AJUSTE_CAJA') {
                    typeBadgeBg = '#FEF3C7';
                    typeBadgeColor = '#D97706';
                    typeLabel = '⚖️ AJUSTE CAJA';
                  } else if (item.type === 'TRASLADO_EFECTIVO_A_BANCO' || item.categoryLabel?.includes('Efectivo a Banco') || item.categoryLabel?.includes('desde Efectivo')) {
                    typeBadgeBg = '#DBEAFE';
                    typeBadgeColor = '#1E40AF';
                    typeLabel = '🔄 Efectivo ➔ Banco';
                  } else if (item.type === 'TRASLADO_BANCO_A_EFECTIVO' || item.categoryLabel?.includes('Banco a Efectivo') || item.categoryLabel?.includes('hacia Efectivo')) {
                    typeBadgeBg = '#DBEAFE';
                    typeBadgeColor = '#1E40AF';
                    typeLabel = '🔄 Banco ➔ Efectivo';
                  } else if (item.category === 'COMPRA_INSUMO') {
                    typeBadgeBg = '#FEF3C7';
                    typeBadgeColor = '#D97706';
                    typeLabel = '🛒 COMPRA INSUMO';
                  } else if (item.category === 'NOMINA') {
                    typeBadgeBg = '#EDE9FE';
                    typeBadgeColor = '#7C3AED';
                    typeLabel = '👥 NÓMINA';
                  } else if (item.category === 'RETIRO_SOCIO') {
                    typeBadgeBg = '#FDF2F8';
                    typeBadgeColor = '#BE185D';
                    typeLabel = '💼 RETIRO SOCIO';
                  } else if (item.tabCategory === 'SALES' || item.orderNumber?.startsWith('ORD-')) {
                    typeBadgeBg = '#DCFCE7';
                    typeBadgeColor = '#15803D';
                    typeLabel = '🥛 VENTA COBRADA';
                  } else if (item.tabCategory === 'EXPENSES' || (!item.isCashMovement && item.category)) {
                    typeBadgeBg = '#FEE2E2';
                    typeBadgeColor = '#DC2626';
                    typeLabel = '⚙️ GASTO OPERATIVO';
                  }

                  let methodBadge = `<span class="badge" style="background: #F1F5F9; color: #475569; font-size: 0.7rem; font-weight: 700;">💵 Efectivo</span>`;
                  if (isTransfer) {
                    methodBadge = `<span class="badge" style="background: #EFF6FF; color: #2563EB; font-size: 0.7rem; font-weight: 700;">🔄 Traslado</span>`;
                  } else if (!isCash(item.paymentMethod)) {
                    methodBadge = `<span class="badge" style="background: #FAF5FF; color: #7E22CE; font-size: 0.7rem; font-weight: 700;">🟣 ${item.paymentMethod || 'Transf'}</span>`;
                  }

                  return `
                    <tr>
                      <td><small style="color: var(--text-muted); font-weight: 600;">${dateStr}</small></td>
                      <td>
                        <span class="badge" style="background: ${typeBadgeBg}; color: ${typeBadgeColor}; font-weight: 800; font-size: 0.72rem;">
                          ${typeLabel}
                        </span>
                      </td>
                      <td>
                        <strong>${desc}</strong>
                        ${item.notes ? `<div style="font-size: 0.72rem; color: var(--text-muted);">📝 ${item.notes}</div>` : ''}
                      </td>
                      <td>${methodBadge}</td>
                      <td>
                        <span style="font-weight: 600; color: var(--text-main);">${person}</span>
                      </td>
                      <td style="text-align: right;">
                        <strong style="color: ${isTransfer ? '#2563EB' : itemIsPos ? '#15803D' : '#DC2626'}; font-weight: 900; font-size: 0.95rem;">
                          ${isTransfer ? '🔄 ' : itemIsPos ? '+' : '-'}${formatCOP(itemAmount)}
                        </strong>
                      </td>
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      `;

    return listHtml;
  };

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 780px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title" style="margin: 0;">${title}</h3>
            ${subtitle ? `<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">${subtitle}</div>` : ''}
          </div>
          <button class="modal-close-btn" id="btnCloseKpiDetailModal">✕</button>
        </div>
        <div class="modal-body" style="padding-top: 14px;">
          
          <!-- Resumen Superior del KPI -->
          <div style="background: ${isPositive ? '#F0FDF4' : '#FEF2F2'}; border: 1.5px solid ${isPositive ? '#BBF7D0' : '#FECACA'}; border-radius: var(--radius-md); padding: 14px 18px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <span style="font-size: 0.75rem; font-weight: 800; color: ${isPositive ? '#166534' : '#991B1B'}; text-transform: uppercase;">${badgeText}</span>
              <div style="font-size: 1.6rem; font-weight: 900; color: ${isPositive ? '#15803D' : '#DC2626'};">
                ${isNet ? (totalAmount >= 0 ? '+' : '') : ''}${formatCOP(totalAmount)}
              </div>
            </div>
            <div style="text-align: right;">
              <span class="badge" style="background: ${isPositive ? '#DCFCE7' : '#FEE2E2'}; color: ${isPositive ? '#15803D' : '#DC2626'}; font-weight: 800; font-size: 0.82rem; padding: 4px 10px;">
                ${items.length} movimiento(s)
              </span>
            </div>
          </div>

          <!-- Barra de Búsqueda Rápida en el Desglose -->
          ${
            items.length > 3
              ? `
            <div style="margin-bottom: 12px;">
              <input type="text" id="kpiDetailSearchInput" class="form-input" placeholder="🔍 Buscar por concepto, responsable, tercero o medio..." style="font-size: 0.85rem; padding: 8px 12px;" />
            </div>
          `
              : ''
          }

          <!-- Contenedor de la Tabla -->
          <div id="kpiDetailListContainer">
            ${renderContent()}
          </div>

        </div>
        <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.75rem; color: var(--text-muted);">💡 Haz clic en cualquier otro KPI para ver sus respectivos orígenes</span>
          <button type="button" class="btn btn-outline" id="btnCancelKpiDetailModal">Cerrar</button>
        </div>
      </div>
    </div>
  `;

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseKpiDetailModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelKpiDetailModal')?.addEventListener('click', closeModal);

  const searchInput = document.getElementById('kpiDetailSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const container = document.getElementById('kpiDetailListContainer');
      if (container) {
        container.innerHTML = renderContent(e.target.value);
      }
    });
  }
}

