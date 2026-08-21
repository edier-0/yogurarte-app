import { api } from '../api.js';
import { formatCOP, formatDate, formatPaymentBadge, getTodayLocalDateStr, showToast, store } from '../store.js';
import { renderCredits } from './creditsView.js';

let activeCategory = 'ALL';
let activeMainTab = 'EXPENSES'; // 'EXPENSES' | 'CREDITS'

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
    <div class="toolbar-container" style="margin-bottom: 16px;">
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

    <!-- Píldoras de Categoría -->
    <div class="expenses-category-pills">
      <button class="expense-pill ${activeCategory === 'ALL' ? 'active' : ''}" data-cat="ALL">Todos los Gastos</button>
      <button class="expense-pill ${activeCategory === 'INFRAESTRUCTURA' ? 'active' : ''}" data-cat="INFRAESTRUCTURA">🏗️ Infraestructura / Equipos</button>
      <button class="expense-pill ${activeCategory === 'SERVICIOS' ? 'active' : ''}" data-cat="SERVICIOS">💡 Gas / Energía / Agua</button>
      <button class="expense-pill ${activeCategory === 'TRANSPORTE' ? 'active' : ''}" data-cat="TRANSPORTE">🛵 Domicilio / Gasolina</button>
      <button class="expense-pill ${activeCategory === 'PUBLICIDAD' ? 'active' : ''}" data-cat="PUBLICIDAD">📢 Publicidad y Volantes</button>
      <button class="expense-pill ${activeCategory === 'INSUMOS_EXTRA' ? 'active' : ''}" data-cat="INSUMOS_EXTRA">🍓 Insumos Extra</button>
      <button class="expense-pill ${activeCategory === 'OTRO' ? 'active' : ''}" data-cat="OTRO">📦 Otros Gastos</button>
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

  // Listeners de categorías
  subContainer.querySelectorAll('.expense-pill').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      subContainer.querySelectorAll('.expense-pill').forEach((b) => b.classList.remove('active'));
      e.target.classList.add('active');
      activeCategory = e.target.dataset.cat;
      loadExpensesList(subContainer);
    });
  });

  subContainer.querySelector('#btnOpenExpenseModal')?.addEventListener('click', () => {
    openExpenseModal(() => renderExpensesContent(subContainer));
  });

  await loadExpensesList(subContainer);
}

async function loadExpensesList(container) {
  const tableContainer = container.querySelector('#expensesTableContainer');
  const sumDisplay = container.querySelector('#totalExpensesSumDisplay');
  if (!tableContainer) return;

  try {
    const params = {};
    if (activeCategory !== 'ALL') {
      params.category = activeCategory;
    }

    const data = await api.getExpenses(params);
    const { expenses, totalAmount } = data;

    if (sumDisplay) {
      sumDisplay.textContent = `Total Filtrado: ${formatCOP(totalAmount)}`;
    }

    if (!expenses || expenses.length === 0) {
      tableContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🧾</div>
          <div class="empty-state-title">No hay gastos en esta categoría</div>
          <div class="empty-state-text">Registra compras de equipos, gas, energía o transporte.</div>
          <button class="btn btn-primary" id="btnNewExpenseEmpty">+ Registrar Gasto</button>
        </div>
      `;
      tableContainer.querySelector('#btnNewExpenseEmpty')?.addEventListener('click', () => {
        openExpenseModal(() => renderExpenses(container));
      });
      return;
    }

    const categoryLabels = {
      INFRAESTRUCTURA: '🏗️ Infraestructura / Equipos',
      SERVICIOS: '💡 Servicios Públicos',
      TRANSPORTE: '🛵 Transporte / Domicilio',
      PUBLICIDAD: '📢 Publicidad',
      INSUMOS_EXTRA: '🍓 Insumos Extra',
      OTRO: '📦 Otro',
    };

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
            ${expenses
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
    `;

    tableContainer.querySelectorAll('.btn-delete-expense').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        if (confirm('¿Deseas eliminar este registro de gasto?')) {
          try {
            await api.deleteExpense(id);
            showToast('Gasto eliminado correctamente');
            loadExpensesList(container);
          } catch (err) {
            showToast('Error al eliminar gasto', 'danger');
          }
        }
      });
    });
  } catch (error) {
    console.error('Error loading expenses:', error);
  }
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
// MODAL PARA REGISTRAR / EDITAR BASE EN CAJA, APORTE, RETIRO O TRASLADO
// -----------------------------------------------------------------
export function openCashMovementModal(onSaved, defaultType = 'BASE_INICIAL', movementToEdit = null) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  const isEdit = !!movementToEdit;
  const currentType = isEdit ? (movementToEdit.type || movementToEdit.movementType || defaultType) : defaultType;
  const currentAmount = isEdit ? (movementToEdit.amount !== undefined ? Math.abs(movementToEdit.amount) : '') : '';
  const currentConcept = isEdit ? (movementToEdit.concept || movementToEdit.flavor || movementToEdit.description || '') : '';
  const currentMethod = isEdit ? (movementToEdit.paymentMethod || 'EFECTIVO') : 'EFECTIVO';
  const currentDate = isEdit
    ? (movementToEdit.movementDate ? String(movementToEdit.movementDate).slice(0, 10) : movementToEdit.date ? String(movementToEdit.date).slice(0, 10) : getTodayLocalDateStr())
    : getTodayLocalDateStr();
  const currentNotes = isEdit ? (movementToEdit.notes || '') : '';

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">${isEdit ? '✏️ Editar Movimiento de Caja' : '🏦 Registrar Base / Aporte de Caja'}</h3>
          <button class="modal-close-btn" id="btnCloseCashMovModal">✕</button>
        </div>
        <form id="cashMovementForm">
          <div class="modal-body">
            
            <div class="form-group">
              <label class="form-label">Tipo de Movimiento *</label>
              <select id="cashMovType" class="form-select" required>
                <option value="BASE_INICIAL" ${currentType === 'BASE_INICIAL' ? 'selected' : ''}>🟢 Base Inicial (Sencillo para dar vueltos)</option>
                <option value="APORTE_SOCIO" ${currentType === 'APORTE_SOCIO' ? 'selected' : ''}>💼 Aporte de Bolsillo (Plata propia para compras/insumos)</option>
                <option value="RETIRO_BASE" ${currentType === 'RETIRO_BASE' ? 'selected' : ''}>🔴 Retiro de Base / Devolución de Inversión</option>
                <option value="AJUSTE_CAJA" ${currentType === 'AJUSTE_CAJA' ? 'selected' : ''}>⚖️ Ajuste de Caja (Cuadre de diferencias)</option>
                <option value="TRASLADO_EFECTIVO_A_BANCO" ${currentType === 'TRASLADO_EFECTIVO_A_BANCO' ? 'selected' : ''}>🔄 Traslado: Efectivo ➔ Transferencia</option>
                <option value="TRASLADO_BANCO_A_EFECTIVO" ${currentType === 'TRASLADO_BANCO_A_EFECTIVO' ? 'selected' : ''}>🔄 Traslado: Transferencia ➔ Efectivo</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Monto ($ COP) *</label>
              <input type="number" id="cashMovAmount" class="form-input" min="1" step="any" placeholder="Ej: 50000" value="${currentAmount}" required style="font-weight: 800; font-size: 1.05rem;" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Medio de Pago</label>
                <select id="cashMovMethod" class="form-select" style="font-weight: 700;">
                  <option value="EFECTIVO" ${currentMethod === 'EFECTIVO' ? 'selected' : ''}>💵 Efectivo (Billetes / Monedas)</option>
                  <option value="NEQUI" ${currentMethod === 'NEQUI' ? 'selected' : ''}>🟣 Transferencia Nequi</option>
                  <option value="BANCOLOMBIA" ${currentMethod === 'BANCOLOMBIA' ? 'selected' : ''}>🟡 Transferencia Bancolombia</option>
                  <option value="TRANSFERENCIA" ${currentMethod === 'TRANSFERENCIA' ? 'selected' : ''}>💳 Otra Transferencia</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Fecha</label>
                <input type="date" id="cashMovDate" class="form-input" value="${currentDate}" required />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Concepto / Motivo *</label>
              <input type="text" id="cashMovConcept" class="form-input" placeholder="Ej: Base para dar vuelto / Plata de mi bolsillo para comprar insumos" value="${currentConcept}" required />
            </div>

            <div class="form-group">
              <label class="form-label">Notas Adicionales (Opcional)</label>
              <input type="text" id="cashMovNotes" class="form-input" placeholder="Ej: Puesto por Edier..." value="${currentNotes}" />
            </div>

          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btnCancelCashMovModal">Cancelar</button>
            <button type="submit" class="btn btn-primary" style="font-weight: 800;">${isEdit ? 'Guardar Cambios' : 'Guardar en Caja'}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseCashMovModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelCashMovModal')?.addEventListener('click', closeModal);

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
        showToast('¡Movimiento de caja guardado exitosamente! 🏦');
      }
      closeModal();
      if (typeof onSaved === 'function') onSaved();
    } catch (err) {
      showToast(err.message || 'Error al guardar movimiento de caja', 'danger');
    }
  });
}
