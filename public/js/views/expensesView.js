import { api } from '../api.js';
import { formatCOP, formatDate, getTodayLocalDateStr, showToast, store } from '../store.js';

let activeCategory = 'ALL';

export async function renderExpenses(container) {
  container.innerHTML = `
    <!-- Barra de Filtros y Acción -->
    <div class="toolbar-container">
      <div class="toolbar-left">
        <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--primary);">
          🧾 Gastos e Infraestructura
        </h3>
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
      <button class="expense-pill ${activeCategory === 'OTRO' ? 'active' : ''}" data-cat="OTRO">📦 Otros Gastos</button>
    </div>

    <!-- Tabla de Gastos -->
    <div class="table-container" style="padding: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text-main);">
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
  container.querySelectorAll('.expense-pill').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      container.querySelectorAll('.expense-pill').forEach((b) => b.classList.remove('active'));
      e.target.classList.add('active');
      activeCategory = e.target.dataset.cat;
      loadExpensesList(container);
    });
  });

  container.querySelector('#btnOpenExpenseModal')?.addEventListener('click', () => {
    openExpenseModal();
  });

  await loadExpensesList(container);
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
      tableContainer.querySelector('#btnNewExpenseEmpty')?.addEventListener('click', () => openExpenseModal());
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
      <table class="app-table">
        <thead>
          <tr>
            <th>Categoría</th>
            <th>Descripción</th>
            <th>Monto</th>
            <th>Fecha</th>
            <th>Notas</th>
            <th>Responsable</th>
            <th>Acción</th>
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
              <td>${formatDate(e.expenseDate)}</td>
              <td><small style="color: var(--text-muted);">${e.notes || '-'}</small></td>
              <td><small>${e.registeredBy || 'Edier'}</small></td>
              <td>
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
    `;

    // Eventos de eliminación
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

function openExpenseModal() {
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
                <input type="number" id="expenseAmount" class="form-input" min="1" placeholder="Ej: 85000" required />
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
      expenseDate: document.getElementById('expenseDate').value,
      notes: document.getElementById('expenseNotes').value,
      registeredBy: store.currentUser,
    };

    try {
      await api.createExpense(payload);
      showToast('Gasto registrado con éxito 🧾');
      closeModal();
      renderExpenses(document.getElementById('contentContainer'));
    } catch (err) {
      showToast('Error al registrar gasto', 'danger');
    }
  });
}
