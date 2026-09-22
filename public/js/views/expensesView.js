import { api } from '../api.js';
import { formatCOP, formatDate, formatPaymentBadge, getTodayLocalDateStr, showToast, store } from '../store.js';
import { renderCredits } from './creditsView.js';
import { paginateArray, renderPaginationHtml, attachPaginationEvents, PAGE_SIZE } from '../components/pagination.js';

let expensesCurrentPage = 1;
let activeCategory = 'ALL'; // 'ALL' | 'TRANSPORTE' | 'SERVICES_INFRA' | 'OPERATIONS_OTHER'
let activeMainTab = 'EXPENSES'; // 'EXPENSES' | 'CREDITS'
let expensesSearchQuery = '';
let expensesSearchTimer = null;
let cachedExpensesList = [];

export async function renderExpenses(container) {
  container.innerHTML = `
    <!-- Barra de Pestañas Superiores (Gastos vs Compras a Cuotas) -->
    <div style="display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 2px solid var(--border-color); padding-bottom: 8px; flex-wrap: wrap;">
      <button class="btn ${activeMainTab === 'EXPENSES' ? 'btn-primary' : 'btn-outline'}" id="btnSubTabExpenses" style="font-weight: 800; font-size: 0.95rem;">
        🧾 Gastos Operativos e Infraestructura
      </button>
      <button class="btn ${activeMainTab === 'CREDITS' ? 'btn-primary' : 'btn-outline'}" id="btnSubTabCredits" style="font-weight: 800; font-size: 0.95rem;">
        💳 Compras a Cuotas y Créditos
      </button>
    </div>

    <!-- Contenedor del contenido dinámico -->
    <div id="expensesSubViewContainer"></div>
  `;

  const subContainer = container.querySelector('#expensesSubViewContainer');
  const btnExpenses = container.querySelector('#btnSubTabExpenses');
  const btnCredits = container.querySelector('#btnSubTabCredits');

  btnExpenses?.addEventListener('click', () => {
    activeMainTab = 'EXPENSES';
    btnExpenses.className = 'btn btn-primary';
    btnCredits.className = 'btn btn-outline';
    renderExpensesContent(subContainer);
  });

  btnCredits?.addEventListener('click', () => {
    activeMainTab = 'CREDITS';
    btnCredits.className = 'btn btn-primary';
    btnExpenses.className = 'btn btn-outline';
    renderCredits(subContainer);
  });

  if (activeMainTab === 'CREDITS') {
    renderCredits(subContainer);
  } else {
    renderExpensesContent(subContainer);
  }
}

async function renderExpensesContent(subContainer) {
  subContainer.innerHTML = `
    <!-- Barra de Filtros y Acción -->
    <div class="toolbar-container" style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
      <div class="toolbar-left">
        <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--primary); margin: 0;">
          🧾 Gastos Registrados de Contado
        </h3>
        <span style="font-size: 0.78rem; color: var(--text-muted);">
          Control de pagos inmediatos de servicios, transporte, gas y gastos operativos
        </span>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-accent" id="btnOpenExpenseModal">
          <span>+</span> Registrar Gasto
        </button>
      </div>
    </div>

    <!-- Fila Unificada: Buscador Ágil y 4 Chips Consolidados -->
    <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 16px;">
      <!-- Buscador Ágil con Debounce (300ms) -->
      <div style="position: relative; min-width: 260px; flex: 1; max-width: 380px;">
        <input
          type="text"
          id="expensesSearchInput"
          class="form-input"
          placeholder="🔍 Buscar por descripción o responsable..."
          value="${expensesSearchQuery}"
          style="padding-left: 36px; padding-right: 32px; font-size: 0.88rem; font-weight: 600;"
        />
        <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 0.95rem; color: var(--text-muted); pointer-events: none;">🔍</span>
        ${
          expensesSearchQuery
            ? `<button type="button" id="btnClearExpenseSearch" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 0.9rem;" title="Limpiar búsqueda">✕</button>`
            : ''
        }
      </div>

      <!-- Tira Reducida a 4 Chips Directos -->
      <div class="filter-chip-group" id="expensesCategoryChips">
        <button class="filter-chip ${activeCategory === 'ALL' ? 'active' : ''}" data-cat="ALL">
          📋 Todos los Gastos
        </button>
        <button class="filter-chip ${activeCategory === 'TRANSPORTE' ? 'active' : ''}" data-cat="TRANSPORTE">
          🛵 Domicilio y Gasolina
        </button>
        <button class="filter-chip ${activeCategory === 'SERVICES_INFRA' ? 'active' : ''}" data-cat="SERVICES_INFRA">
          💡 Servicios e Infraestructura
        </button>
        <button class="filter-chip ${activeCategory === 'OPERATIONS_OTHER' ? 'active' : ''}" data-cat="OPERATIONS_OTHER">
          📦 Operativos y Varios
        </button>
      </div>
    </div>

    <!-- Tabla de Gastos -->
    <div class="table-container" style="padding: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
        <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin: 0;">
          Listado de Gastos Registrados
        </h3>
        <div id="totalExpensesSumDisplay" style="font-size: 1.1rem; font-weight: 800; color: var(--danger);">
          Total: $0
        </div>
      </div>

      <div id="expensesTableContainer">
        <div style="text-align: center; padding: 20px; color: var(--text-muted);">
          Cargando gastos... 🧾
        </div>
      </div>
    </div>
  `;

  const searchInput = subContainer.querySelector('#expensesSearchInput');
  const clearSearchBtn = subContainer.querySelector('#btnClearExpenseSearch');

  searchInput?.addEventListener('input', (e) => {
    expensesSearchQuery = e.target.value;
    clearTimeout(expensesSearchTimer);
    expensesSearchTimer = setTimeout(() => {
      expensesCurrentPage = 1;
      filterAndRenderExpensesTable(subContainer);
    }, 300);
  });

  clearSearchBtn?.addEventListener('click', () => {
    expensesSearchQuery = '';
    if (searchInput) searchInput.value = '';
    expensesCurrentPage = 1;
    filterAndRenderExpensesTable(subContainer);
  });

  subContainer.querySelectorAll('#expensesCategoryChips .filter-chip').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      subContainer.querySelectorAll('#expensesCategoryChips .filter-chip').forEach((b) => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      activeCategory = e.currentTarget.dataset.cat;
      expensesCurrentPage = 1;
      filterAndRenderExpensesTable(subContainer);
    });
  });

  subContainer.querySelector('#btnOpenExpenseModal')?.addEventListener('click', () => {
    openExpenseModal(() => loadExpensesList(subContainer));
  });

  await loadExpensesList(subContainer);
}

async function loadExpensesList(container) {
  try {
    const data = await api.getExpenses({});
    cachedExpensesList = data.expenses || [];
    filterAndRenderExpensesTable(container);
  } catch (error) {
    console.error('Error loading expenses:', error);
    const tableContainer = container.querySelector('#expensesTableContainer');
    if (tableContainer) {
      tableContainer.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--danger); font-weight: 700;">
          Error al cargar los gastos: ${error.message}
        </div>
      `;
    }
  }
}

function filterAndRenderExpensesTable(container) {
  const tableContainer = container.querySelector('#expensesTableContainer');
  const sumDisplay = container.querySelector('#totalExpensesSumDisplay');
  if (!tableContainer) return;

  let filtered = cachedExpensesList || [];

  // 1. Filtrar por categoría consolidada
  if (activeCategory === 'TRANSPORTE') {
    filtered = filtered.filter((e) => e.category === 'TRANSPORTE');
  } else if (activeCategory === 'SERVICES_INFRA') {
    filtered = filtered.filter((e) => e.category === 'SERVICIOS' || e.category === 'INFRAESTRUCTURA');
  } else if (activeCategory === 'OPERATIONS_OTHER') {
    filtered = filtered.filter((e) => e.category === 'PUBLICIDAD' || e.category === 'INSUMOS_EXTRA' || e.category === 'OTRO');
  }

  // 2. Filtrar por texto de búsqueda (descripción, responsable, notas)
  if (expensesSearchQuery && expensesSearchQuery.trim()) {
    const q = expensesSearchQuery.toLowerCase().trim();
    filtered = filtered.filter((e) => {
      const desc = (e.description || '').toLowerCase();
      const notes = (e.notes || '').toLowerCase();
      const resp = (e.registeredBy || '').toLowerCase();
      return desc.includes(q) || notes.includes(q) || resp.includes(q);
    });
  }

  const filteredTotal = filtered.reduce((sum, e) => sum + (e.amount || 0), 0);
  if (sumDisplay) {
    sumDisplay.textContent = `Total Filtrado: ${formatCOP(filteredTotal)}`;
  }

  if (filtered.length === 0) {
    tableContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🧾</div>
        <div class="empty-state-title">No hay gastos que coincidan</div>
        <div class="empty-state-text">Prueba ajustando el término de búsqueda o la categoría seleccionada.</div>
        <button class="btn btn-primary" id="btnNewExpenseEmpty">+ Registrar Gasto</button>
      </div>
    `;
    tableContainer.querySelector('#btnNewExpenseEmpty')?.addEventListener('click', () => {
      openExpenseModal(() => loadExpensesList(container));
    });
    return;
  }

  const categoryLabels = {
    INFRAESTRUCTURA: '🏗️ Infraestructura / Equipos',
    SERVICIOS: '💡 Servicios Públicos',
    TRANSPORTE: '🛵 Domicilio y Gasolina',
    PUBLICIDAD: '📢 Publicidad',
    INSUMOS_EXTRA: '🍓 Insumos Extra',
    OTRO: '📦 Otro',
  };

  const { pageItems, totalPages, totalItems, currentPage } = paginateArray(filtered, expensesCurrentPage, 15);
  expensesCurrentPage = currentPage;

  tableContainer.innerHTML = `
    <div class="table-responsive">
      <table class="app-table">
        <thead>
          <tr>
            <th>Categoría</th>
            <th>Descripción</th>
            <th>Monto</th>
            <th>Medio de Pago</th>
            <th>Fecha</th>
            <th>Notas</th>
            <th>Responsable</th>
            <th style="text-align: right;">Acción</th>
          </tr>
        </thead>
        <tbody>
          ${pageItems
            .map(
              (e) => `
            <tr>
              <td>
                <span class="badge" style="background: var(--bg-subtle); color: var(--primary);">
                  ${categoryLabels[e.category] || e.category}
                </span>
              </td>
              <td><strong>${e.description}</strong></td>
              <td><strong style="color: var(--danger); font-size: 1rem;">${formatCOP(e.amount)}</strong></td>
              <td>${formatPaymentBadge(e.paymentMethod)}</td>
              <td>${formatDate(e.expenseDate)}</td>
              <td><small style="color: var(--text-muted);">${e.notes || '-'}</small></td>
              <td><small>${e.registeredBy || 'Edier'}</small></td>
              <td style="text-align: right;">
                <button class="btn btn-outline btn-sm btn-delete-expense" data-id="${e.id}" style="color: var(--danger);" title="Eliminar gasto">
                  🗑️
                </button>
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
    ${renderPaginationHtml({
      currentPage: expensesCurrentPage,
      totalPages,
      totalItems,
      pageSize: 15,
      itemName: 'gastos',
      paginationId: 'expensesPagination',
    })}
  `;

  attachPaginationEvents(
    tableContainer,
    'expensesPagination',
    (newPage) => {
      expensesCurrentPage = newPage;
      filterAndRenderExpensesTable(container);
    },
    tableContainer
  );

  tableContainer.querySelectorAll('.btn-delete-expense').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      if (confirm('¿Estás seguro de que deseas eliminar este registro de gasto?')) {
        try {
          await api.deleteExpense(id);
          showToast('Gasto eliminado correctamente 🗑️', 'success');
          loadExpensesList(container);
        } catch (err) {
          showToast(err.message || 'Error al eliminar el gasto', 'danger');
        }
      }
    });
  });
}

// -----------------------------------------------------------------
// MODAL PARA REGISTRAR GASTO
// -----------------------------------------------------------------
export function openExpenseModal(onSaved) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">🧾 Registrar Gasto o Inversión</h3>
          <button class="modal-close-btn" id="btnCloseExpenseModal">✕</button>
        </div>
        <form id="newExpenseForm">
          <div class="modal-body">
            
            <div class="form-group">
              <label class="form-label">Categoría del Gasto *</label>
              <select id="expenseCategory" class="form-select" required>
                <option value="INFRAESTRUCTURA">🏗️ Infraestructura / Equipos (Nevera, Ollas, Termómetros)</option>
                <option value="SERVICIOS">💡 Servicios Públicos (Gas, Luz, Agua)</option>
                <option value="TRANSPORTE">🛵 Transporte / Domicilios / Gasolina</option>
                <option value="PUBLICIDAD">📢 Publicidad / Volantes / Impresiones</option>
                <option value="INSUMOS_EXTRA">🍓 Insumos Extra / Empaques adicionales</option>
                <option value="OTRO" selected>📦 Otro Gasto General</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Descripción del Gasto *</label>
              <input type="text" id="expenseDescription" class="form-input" placeholder="Ej: Compra de pipa de gas / Olla de acero 30L" required />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Monto ($ COP) *</label>
                <input type="number" id="expenseAmount" class="form-input" min="1" step="any" placeholder="Ej: 85000" required />
              </div>

              <div class="form-group">
                <label class="form-label">Medio de Pago</label>
                <select id="expensePaymentMethod" class="form-select" style="font-weight: 700;">
                  <option value="EFECTIVO" selected>💵 Efectivo (Dinero en Mano)</option>
                  <option value="NEQUI">🟣 Transferencia Nequi</option>
                  <option value="BANCOLOMBIA">🟡 Transferencia Bancolombia</option>
                  <option value="TRANSFERENCIA">💳 Otra Transferencia</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Fecha</label>
                <input type="date" id="expenseDate" class="form-input" value="${getTodayLocalDateStr()}" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Notas Adicionales (Opcional)</label>
              <input type="text" id="expenseNotes" class="form-input" placeholder="Ej: Factura #1234..." />
            </div>

          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btnCancelExpenseModal">Cancelar</button>
            <button type="submit" class="btn btn-accent">Guardar Gasto</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseExpenseModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelExpenseModal')?.addEventListener('click', closeModal);

  document.getElementById('newExpenseForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      category: document.getElementById('expenseCategory').value,
      description: document.getElementById('expenseDescription').value,
      amount: Number(document.getElementById('expenseAmount').value),
      paymentMethod: document.getElementById('expensePaymentMethod')?.value || 'EFECTIVO',
      expenseDate: document.getElementById('expenseDate').value,
      notes: document.getElementById('expenseNotes').value,
      registeredBy: store.currentUser,
    };

    try {
      await api.createExpense(payload);
      showToast('Gasto registrado con éxito 🧾');
      closeModal();
      if (typeof onSaved === 'function') onSaved();
    } catch (err) {
      showToast('Error al registrar gasto', 'danger');
    }
  });
}

// -----------------------------------------------------------------
// MODAL PARA REGISTRAR / EDITAR BASE EN CAJA, APORTE, RETIRO O AJUSTE DE CUADRE
// -----------------------------------------------------------------
export function openCashMovementModal(onSaved, defaultType = 'BASE_INICIAL', movementToEdit = null) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  const isEdit = !!movementToEdit;
  let currentType = isEdit ? (movementToEdit.type || movementToEdit.movementType || defaultType) : defaultType;
  if (currentType === 'AJUSTE_CAJA') {
    currentType = 'AJUSTE_FALTANTE'; // Por defecto faltante (el caso más común: 4x1000 o comisiones)
  }

  const currentAmount = isEdit ? (movementToEdit.amount !== undefined ? Math.abs(movementToEdit.amount) : '') : '';
  const currentConcept = isEdit ? (movementToEdit.concept || movementToEdit.flavor || movementToEdit.description || '') : '';
  const currentMethod = isEdit ? (movementToEdit.paymentMethod || 'NEQUI') : (currentType.startsWith('AJUSTE') ? 'NEQUI' : 'EFECTIVO');
  const currentDate = isEdit
    ? (movementToEdit.movementDate ? String(movementToEdit.movementDate).slice(0, 10) : movementToEdit.date ? String(movementToEdit.date).slice(0, 10) : getTodayLocalDateStr())
    : getTodayLocalDateStr();
  const currentNotes = isEdit ? (movementToEdit.notes || '') : '';

  const isAdjustment = currentType === 'AJUSTE_FALTANTE' || currentType === 'AJUSTE_SOBRANTE' || currentType === 'AJUSTE_CAJA';

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 580px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title" id="cashModalTitle">
              ${isEdit ? '✏️ Editar Movimiento' : (isAdjustment ? '⚖️ Ajuste / Cuadre de Caja o Banco' : '🏦 Movimiento de Caja')}
            </h3>
            <span style="font-size: 0.76rem; color: var(--text-muted); font-weight: 600;">
              ${isAdjustment ? 'Ajusta diferencias por 4x1000, comisiones o descuadres físicos/digitales' : 'Registra bases, aportes de bolsillo o retiros'}
            </span>
          </div>
          <button class="modal-close-btn" id="btnCloseCashMovModal">✕</button>
        </div>
        <form id="cashMovementForm">
          <div class="modal-body">
            
            <!-- Selector de Operación Principal -->
            <div class="form-group">
              <label class="form-label" style="font-weight: 700;">Tipo de Operación *</label>
              <select id="cashMovType" class="form-select" required style="font-weight: 700; font-size: 0.95rem;">
                <option value="AJUSTE_FALTANTE" ${currentType === 'AJUSTE_FALTANTE' ? 'selected' : ''}>⚖️ Ajuste Faltante / 4x1000 / Comisión (Disminuye saldo -)</option>
                <option value="AJUSTE_SOBRANTE" ${currentType === 'AJUSTE_SOBRANTE' ? 'selected' : ''}>⚖️ Ajuste Sobrante / Excedente (Aumenta saldo +)</option>
                <option value="BASE_INICIAL" ${currentType === 'BASE_INICIAL' ? 'selected' : ''}>🟢 Base Inicial (Sencillo para dar vueltos)</option>
                <option value="APORTE_SOCIO" ${currentType === 'APORTE_SOCIO' ? 'selected' : ''}>💼 Aporte de Bolsillo (Plata propia para gastos/insumos)</option>
                <option value="RETIRO_BASE" ${currentType === 'RETIRO_BASE' ? 'selected' : ''}>🔴 Retiro de Base / Devolución de Inversión</option>
                <option value="TRASLADO_EFECTIVO_A_BANCO" ${currentType === 'TRASLADO_EFECTIVO_A_BANCO' ? 'selected' : ''}>🔄 Traslado: Efectivo ➔ Transferencia</option>
                <option value="TRASLADO_BANCO_A_EFECTIVO" ${currentType === 'TRASLADO_BANCO_A_EFECTIVO' ? 'selected' : ''}>🔄 Traslado: Transferencia ➔ Efectivo</option>
              </select>
            </div>

            <!-- Fila: Medio de Pago y Fecha -->
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" style="font-weight: 700;">Cuenta / Medio a Afectar *</label>
                <select id="cashMovMethod" class="form-select" style="font-weight: 700;">
                  <option value="NEQUI" ${currentMethod === 'NEQUI' ? 'selected' : ''}>🟣 Transferencia Nequi</option>
                  <option value="BANCOLOMBIA" ${currentMethod === 'BANCOLOMBIA' ? 'selected' : ''}>🟡 Transferencia Bancolombia</option>
                  <option value="TRANSFERENCIA" ${currentMethod === 'TRANSFERENCIA' ? 'selected' : ''}>💳 Otra Transferencia</option>
                  <option value="EFECTIVO" ${currentMethod === 'EFECTIVO' ? 'selected' : ''}>💵 Efectivo (Caja Física)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" style="font-weight: 700;">Fecha *</label>
                <input type="date" id="cashMovDate" class="form-input" value="${currentDate}" required />
              </div>
            </div>

            <!-- ASISTENTE DE AJUSTE (Visible cuando es Ajuste) -->
            <div id="adjustmentHelperCard" style="background: #FAF5FF; border: 1.5px solid #E9D5FF; border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px; ${isAdjustment ? '' : 'display: none;'}">
              
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 0.8rem; font-weight: 800; color: #6B21A8;">💡 ¿Cómo deseas ingresar el ajuste?</span>
                <div style="display: flex; gap: 4px;">
                  <button type="button" class="btn btn-sm btn-primary" id="btnModeDiff" style="font-size: 0.72rem; padding: 3px 8px;">Por Diferencia</button>
                  <button type="button" class="btn btn-sm btn-outline" id="btnModeReal" style="font-size: 0.72rem; padding: 3px 8px; color: #6B21A8; border-color: #D8B4FE;">Calculadora Saldo Real</button>
                </div>
              </div>

              <!-- Modo Calculadora: Saldo en Sistema vs Saldo Real -->
              <div id="realBalanceCalculator" style="display: none; background: #FFFFFF; border: 1px solid #D8B4FE; border-radius: var(--radius-sm); padding: 10px; margin-bottom: 12px;">
                <div class="form-row" style="margin-bottom: 0;">
                  <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.74rem; font-weight: 700; color: var(--text-muted);">Saldo registrado en sistema ($):</label>
                    <input type="number" id="systemRegisteredBalance" class="form-input" style="font-size: 0.85rem; padding: 6px;" placeholder="Ej: 10000" />
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.74rem; font-weight: 700; color: #6B21A8;">Saldo real en tu cuenta/caja ($):</label>
                    <input type="number" id="actualRealBalance" class="form-input" style="font-size: 0.85rem; padding: 6px; font-weight: 800; border-color: #A855F7;" placeholder="Ej: 8400" />
                  </div>
                </div>
                <div id="calcDiffResult" style="font-size: 0.74rem; color: #6B21A8; font-weight: 700; margin-top: 6px; text-align: right;"></div>
              </div>

              <!-- Botones de Motivo Rápido -->
              <div style="margin-bottom: 8px;">
                <span style="font-size: 0.73rem; color: var(--text-muted); font-weight: 700; display: block; margin-bottom: 4px;">Motivos frecuentes (haz clic para autollenar):</span>
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                  <button type="button" class="btn btn-sm btn-outline btn-quick-concept" data-concept="Impuesto 4x1000 (GMF) cobrado por el banco" data-type="AJUSTE_FALTANTE" style="font-size: 0.72rem; padding: 3px 8px; border-color: #FECACA; color: #DC2626;">🏦 4x1000 (GMF)</button>
                  <button type="button" class="btn btn-sm btn-outline btn-quick-concept" data-concept="Comisión bancaria / Cuota de manejo" data-type="AJUSTE_FALTANTE" style="font-size: 0.72rem; padding: 3px 8px; border-color: #FECACA; color: #DC2626;">💳 Comisión Bancaria</button>
                  <button type="button" class="btn btn-sm btn-outline btn-quick-concept" data-concept="Descuadre faltante en cuenta" data-type="AJUSTE_FALTANTE" style="font-size: 0.72rem; padding: 3px 8px; border-color: #FECACA; color: #DC2626;">📉 Descuadre Faltante</button>
                  <button type="button" class="btn btn-sm btn-outline btn-quick-concept" data-concept="Sobrante / Excedente en cuenta" data-type="AJUSTE_SOBRANTE" style="font-size: 0.72rem; padding: 3px 8px; border-color: #BBF7D0; color: #15803D;">📈 Sobrante en Cuenta</button>
                  <button type="button" class="btn btn-sm btn-outline btn-quick-concept" data-concept="Redondeo de vueltos / Efectivo" data-type="AJUSTE_FALTANTE" style="font-size: 0.72rem; padding: 3px 8px; border-color: #FED7AA; color: #C2410C;">🪙 Redondeo / Vueltos</button>
                </div>
              </div>

            </div>

            <!-- Campo del Monto -->
            <div class="form-group">
              <label class="form-label" id="cashMovAmountLabel" style="font-weight: 800; font-size: 0.95rem;">
                ${currentType === 'AJUSTE_FALTANTE' ? '🔴 Monto a Descontar / Restar ($ COP) *' : currentType === 'AJUSTE_SOBRANTE' ? '🟢 Monto a Sumar / Agregar ($ COP) *' : 'Monto ($ COP) *'}
              </label>
              <input type="number" id="cashMovAmount" class="form-input" min="1" step="any" placeholder="Ej: 1600" value="${currentAmount}" required style="font-weight: 900; font-size: 1.2rem; color: var(--primary);" />
            </div>

            <!-- Previsualización Visual en Vivo del Efecto -->
            <div id="cashMovPreviewBanner" style="padding: 8px 12px; border-radius: var(--radius-sm); font-size: 0.78rem; font-weight: 700; margin-bottom: 14px; background: #F3F4F6; color: #374151; border: 1px solid #E5E7EB;">
              <!-- Se actualiza por JS en tiempo real -->
            </div>

            <!-- Concepto / Motivo -->
            <div class="form-group">
              <label class="form-label" style="font-weight: 700;">Concepto / Motivo *</label>
              <input type="text" id="cashMovConcept" class="form-input" placeholder="Ej: Impuesto 4x1000 cobrado por el banco / Base para vueltos" value="${currentConcept}" required />
            </div>

            <!-- Notas Adicionales -->
            <div class="form-group">
              <label class="form-label">Notas Adicionales (Opcional)</label>
              <input type="text" id="cashMovNotes" class="form-input" placeholder="Ej: Verificado en extracto de Nequi..." value="${currentNotes}" />
            </div>

          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btnCancelCashMovModal">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="btnSubmitCashMov" style="font-weight: 800;">
              ${isEdit ? 'Guardar Cambios' : 'Guardar Ajuste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseCashMovModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelCashMovModal')?.addEventListener('click', closeModal);

  const typeSelect = document.getElementById('cashMovType');
  const methodSelect = document.getElementById('cashMovMethod');
  const amountInput = document.getElementById('cashMovAmount');
  const amountLabel = document.getElementById('cashMovAmountLabel');
  const conceptInput = document.getElementById('cashMovConcept');
  const helperCard = document.getElementById('adjustmentHelperCard');
  const previewBanner = document.getElementById('cashMovPreviewBanner');
  const modalTitle = document.getElementById('cashModalTitle');
  const submitBtn = document.getElementById('btnSubmitCashMov');

  // Modo de ingreso: Diferencia vs Calculadora de saldo real
  let entryMode = 'DIFF';
  const btnModeDiff = document.getElementById('btnModeDiff');
  const btnModeReal = document.getElementById('btnModeReal');
  const realBalanceCard = document.getElementById('realBalanceCalculator');
  const sysBalInput = document.getElementById('systemRegisteredBalance');
  const actualBalInput = document.getElementById('actualRealBalance');
  const calcDiffResult = document.getElementById('calcDiffResult');

  btnModeDiff?.addEventListener('click', () => {
    entryMode = 'DIFF';
    btnModeDiff.className = 'btn btn-sm btn-primary';
    btnModeReal.className = 'btn btn-sm btn-outline';
    realBalanceCard.style.display = 'none';
  });

  btnModeReal?.addEventListener('click', () => {
    entryMode = 'REAL';
    btnModeReal.className = 'btn btn-sm btn-primary';
    btnModeDiff.className = 'btn btn-sm btn-outline';
    realBalanceCard.style.display = 'block';
  });

  // Cálculo automático de diferencia cuando el usuario escribe el saldo real
  const handleRealBalanceCalc = () => {
    const sysVal = Number(sysBalInput.value) || 0;
    const actualVal = Number(actualBalInput.value) || 0;
    if (sysBalInput.value === '' || actualBalInput.value === '') return;

    const diff = actualVal - sysVal;
    if (diff < 0) {
      typeSelect.value = 'AJUSTE_FALTANTE';
      amountInput.value = Math.abs(diff);
      calcDiffResult.innerHTML = `📉 Faltante detectado: <strong style="color: #DC2626;">-${formatCOP(Math.abs(diff))}</strong> (Se descontará de la cuenta)`;
    } else if (diff > 0) {
      typeSelect.value = 'AJUSTE_SOBRANTE';
      amountInput.value = diff;
      calcDiffResult.innerHTML = `📈 Sobrante detectado: <strong style="color: #15803D;">+${formatCOP(diff)}</strong> (Se sumará a la cuenta)`;
    } else {
      calcDiffResult.innerHTML = `✅ Los saldos coinciden exactamente ($0 de diferencia).`;
    }
    updateUI();
  };

  sysBalInput?.addEventListener('input', handleRealBalanceCalc);
  actualBalInput?.addEventListener('input', handleRealBalanceCalc);

  // Botones de motivo rápido
  modalOverlay.querySelectorAll('.btn-quick-concept').forEach((btn) => {
    btn.addEventListener('click', () => {
      conceptInput.value = btn.dataset.concept;
      if (btn.dataset.type) {
        typeSelect.value = btn.dataset.type;
      }
      updateUI();
    });
  });

  function updateUI() {
    const type = typeSelect.value;
    const isAdj = type === 'AJUSTE_FALTANTE' || type === 'AJUSTE_SOBRANTE' || type === 'AJUSTE_CAJA';
    const method = methodSelect.options[methodSelect.selectedIndex]?.text || methodSelect.value;
    const val = Number(amountInput.value) || 0;

    helperCard.style.display = isAdj ? 'block' : 'none';

    if (isAdj) {
      modalTitle.innerText = isEdit ? '✏️ Editar Ajuste de Cuadre' : '⚖️ Ajuste / Cuadre de Caja o Banco';
      submitBtn.innerText = isEdit ? 'Guardar Cambios' : 'Guardar Ajuste';

      if (type === 'AJUSTE_FALTANTE') {
        amountLabel.innerHTML = `🔴 Monto a Descontar / Restar ($ COP) *`;
        previewBanner.style.background = '#FEF2F2';
        previewBanner.style.color = '#991B1B';
        previewBanner.style.border = '1px solid #FECACA';
        previewBanner.innerHTML = `📉 <strong>Efecto:</strong> Se RESTARÁN <strong style="color: #DC2626;">-${formatCOP(val)}</strong> de <strong>${method}</strong> (Reflejará que hay menos saldo por 4x1000, comisiones o faltante).`;
      } else {
        amountLabel.innerHTML = `🟢 Monto a Sumar / Agregar ($ COP) *`;
        previewBanner.style.background = '#F0FDF4';
        previewBanner.style.color = '#166534';
        previewBanner.style.border = '1px solid #BBF7D0';
        previewBanner.innerHTML = `📈 <strong>Efecto:</strong> Se SUMARÁN <strong style="color: #15803D;">+${formatCOP(val)}</strong> a <strong>${method}</strong> (Reflejará que hay más saldo en la cuenta o caja).`;
      }
    } else {
      modalTitle.innerText = isEdit ? '✏️ Editar Movimiento de Caja' : '🏦 Registrar Movimiento de Caja';
      amountLabel.innerHTML = `Monto ($ COP) *`;
      submitBtn.innerText = isEdit ? 'Guardar Cambios' : 'Guardar en Caja';

      if (type === 'BASE_INICIAL' || type === 'APORTE_SOCIO') {
        previewBanner.style.background = '#F0F9FF';
        previewBanner.style.color = '#075985';
        previewBanner.style.border = '1px solid #BAE6FD';
        previewBanner.innerHTML = `🟢 <strong>Efecto:</strong> Ingresarán <strong>+${formatCOP(val)}</strong> a la caja/cuenta como respaldo inicial.`;
      } else if (type === 'RETIRO_BASE') {
        previewBanner.style.background = '#FFFBEB';
        previewBanner.style.color = '#92400E';
        previewBanner.style.border = '1px solid #FDE68A';
        previewBanner.innerHTML = `🔴 <strong>Efecto:</strong> Se retirarán <strong>-${formatCOP(val)}</strong> de la base de caja.`;
      } else {
        previewBanner.style.background = '#EFF6FF';
        previewBanner.style.color = '#1E40AF';
        previewBanner.style.border = '1px solid #BFDBFE';
        previewBanner.innerHTML = `🔄 <strong>Efecto:</strong> Se trasladarán <strong>${formatCOP(val)}</strong> entre cuentas.`;
      }
    }
  }

  typeSelect.addEventListener('change', updateUI);
  methodSelect.addEventListener('change', updateUI);
  amountInput.addEventListener('input', updateUI);

  updateUI();

  document.getElementById('cashMovementForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      type: document.getElementById('cashMovType').value,
      amount: Number(document.getElementById('cashMovAmount').value),
      concept: document.getElementById('cashMovConcept').value,
      paymentMethod: document.getElementById('cashMovMethod').value,
      movementDate: document.getElementById('cashMovDate').value,
      notes: document.getElementById('cashMovNotes').value,
      registeredBy: store.currentUser,
    };

    try {
      if (isEdit) {
        const idToUpdate = movementToEdit.rawId || movementToEdit.id;
        await api.updateCashMovement(idToUpdate, payload);
        showToast('¡Movimiento de caja actualizado con éxito! ✏️');
      } else {
        await api.createCashMovement(payload);
        showToast('¡Ajuste de caja guardado exitosamente! ⚖️');
      }
      closeModal();
      if (typeof onSaved === 'function') onSaved();
    } catch (err) {
      showToast(err.message || 'Error al guardar movimiento de caja', 'danger');
    }
  });
}

