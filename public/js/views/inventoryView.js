import { api } from '../api.js';
import { formatCOP, formatDate, getTodayLocalDateStr, showToast, store } from '../store.js';

let selectedCategory = 'ALL';
let purchaseDateFilter = '';

export async function renderInventory(container) {
  // Generar meses para filtrar compras
  const monthOptions = [];
  const currDate = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(currDate.getFullYear(), currDate.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(d);
    monthOptions.push({ val, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }

  container.innerHTML = `
    <!-- Barra de Acciones de Inventario Optimizada y Responsive -->
    <div class="inventory-toolbar-card">
      <div class="inventory-toolbar-main-row">
        <div class="inventory-toolbar-title-box">
          <h3 class="inventory-toolbar-title">
            📦 Materia Prima e Insumos
          </h3>
          <span class="inventory-toolbar-subtitle">Control de existencias, insumos y compras</span>
        </div>

        <div class="inventory-toolbar-actions">
          <button class="btn btn-outline" id="btnOpenNewMaterialModal">
            <span>+</span> Crear Insumo
          </button>
          <button class="btn btn-accent" id="btnOpenPurchaseModal">
            <span>+</span> Registrar Compra
          </button>
        </div>
      </div>

      <div class="inventory-toolbar-filters-row">
        <div class="filter-chip-group inventory-filter-chips">
          <button class="filter-chip ${selectedCategory === 'ALL' ? 'active' : ''}" data-cat="ALL">Todos</button>
          <button class="filter-chip ${selectedCategory === 'MATERIA_PRIMA' ? 'active' : ''}" data-cat="MATERIA_PRIMA">🥛 Materia Prima</button>
          <button class="filter-chip ${selectedCategory === 'EMPAQUE' ? 'active' : ''}" data-cat="EMPAQUE">🍾 Empaques y Botellas</button>
          <button class="filter-chip ${selectedCategory === 'INSUMO' ? 'active' : ''}" data-cat="INSUMO">🏷️ Otros Insumos</button>
        </div>
      </div>
    </div>

    <!-- Grid de Insumos / Stock Actual -->
    <div id="materialsGridContainer" class="inventory-grid">
      <div style="text-align: center; padding: 20px; color: var(--text-muted);">
        Cargando stock de insumos... 📦
      </div>
    </div>

    <!-- Historial de Compras con Filtro por Fechas -->
    <div class="table-container" style="padding: 20px; margin-top: 24px;">
      <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px;">
        <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--primary);">
          🧾 Historial de Compras de Insumos
        </h3>

        <div style="display: flex; align-items: center; gap: 10px;">
          <select id="selectPurchaseMonth" class="form-select" style="width: auto; padding: 6px 12px; font-size: 0.85rem;">
            <option value="">📅 Todas las fechas</option>
            ${monthOptions
              .map((m) => `<option value="${m.val}" ${purchaseDateFilter === m.val ? 'selected' : ''}>📅 ${m.label}</option>`)
              .join('')}
          </select>
        </div>
      </div>

      <div id="purchasesTableContainer">
        <div style="text-align: center; padding: 20px; color: var(--text-muted);">
          Cargando compras...
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll('[data-cat]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      container.querySelectorAll('[data-cat]').forEach((b) => b.classList.remove('active'));
      e.target.classList.add('active');
      selectedCategory = e.target.dataset.cat;
      loadInventoryData(container);
    });
  });

  container.querySelector('#selectPurchaseMonth')?.addEventListener('change', (e) => {
    purchaseDateFilter = e.target.value;
    loadInventoryData(container);
  });

  container.querySelector('#btnOpenPurchaseModal')?.addEventListener('click', () => {
    openPurchaseModal();
  });

  container.querySelector('#btnOpenNewMaterialModal')?.addEventListener('click', () => {
    openNewMaterialModal();
  });

  await loadInventoryData(container);
}

async function loadInventoryData(container) {
  const gridContainer = container.querySelector('#materialsGridContainer');
  const purchasesContainer = container.querySelector('#purchasesTableContainer');

  try {
    let materials = await api.getMaterials();
    
    // Filtrar por categoría si no es ALL
    if (selectedCategory !== 'ALL') {
      materials = materials.filter((m) => m.category === selectedCategory);
    }

    // Parámetros de filtro de compras
    const purchaseParams = {};
    if (purchaseDateFilter) {
      const [year, month] = purchaseDateFilter.split('-').map(Number);
      purchaseParams.startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      purchaseParams.endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    }
    const purchases = await api.getPurchasesHistory(purchaseParams);

    // Renderizar tarjetas de insumos
    if (gridContainer) {
      if (!materials || materials.length === 0) {
        gridContainer.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <div class="empty-state-icon">📦</div>
            <div class="empty-state-title">No hay insumos registrados</div>
            <div class="empty-state-text">Agrega los insumos base para comenzar a gestionar el inventario.</div>
          </div>
        `;
      } else {
        gridContainer.innerHTML = materials
          .map((m) => {
            const isLow = m.currentStock <= m.minStockAlert;
            return `
            <div class="inventory-card ${isLow ? 'low-stock' : ''}">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <span class="badge" style="background: var(--bg-subtle); color: var(--text-muted);">${m.category}</span>
                ${isLow ? '<span class="badge badge-pending">⚠️ Stock Bajo</span>' : '<span class="badge badge-paid">Stock Óptimo</span>'}
              </div>

              <div class="inventory-card-title">${m.name}</div>

              <div>
                <div class="inventory-card-stock ${isLow ? 'warning' : ''}">
                  ${m.currentStock} <span style="font-size: 1rem; font-weight: 600; color: var(--text-muted);">${m.unit}</span>
                </div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">
                  Mínimo sugerido: ${m.minStockAlert} ${m.unit}
                </div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 10px; margin-top: auto; gap: 6px;">
                <span style="font-size: 0.78rem; color: var(--text-muted);">Costo: <strong>${formatCOP(m.avgCost)}</strong></span>
                <div style="display: flex; gap: 4px;">
                  <button class="btn btn-outline btn-sm btn-edit-material" data-id="${m.id}" title="Editar campos del insumo">
                    ✏️
                  </button>
                  <button class="btn btn-outline btn-sm btn-adjust-stock" data-id="${m.id}" data-name="${m.name}" data-stock="${m.currentStock}" data-unit="${m.unit}" title="Ajustar cantidad de stock">
                    Stock
                  </button>
                  <button class="btn btn-outline btn-sm btn-delete-material" data-id="${m.id}" data-name="${m.name}" style="color: var(--danger);" title="Eliminar insumo">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          `;
          })
          .join('');

        // Eventos de edición de insumo
        gridContainer.querySelectorAll('.btn-edit-material').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            const mat = materials.find((m) => m.id === Number(id));
            if (mat) openEditMaterialModal(mat);
          });
        });

        // Eventos de ajuste manual
        gridContainer.querySelectorAll('.btn-adjust-stock').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            const { id, name, stock, unit } = e.currentTarget.dataset;
            openAdjustStockModal(id, name, Number(stock), unit);
          });
        });

        // Eventos de eliminación de insumo
        gridContainer.querySelectorAll('.btn-delete-material').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            const { id, name } = e.currentTarget.dataset;
            if (confirm(`¿Estás seguro de eliminar el insumo "${name}"?`)) {
              try {
                await api.deleteMaterial(id);
                showToast('Insumo eliminado correctamente');
                renderInventory(container);
              } catch (err) {
                showToast('Error al eliminar insumo', 'danger');
              }
            }
          });
        });
      }
    }

    // Renderizar historial de compras
    if (purchasesContainer) {
      if (!purchases || purchases.length === 0) {
        purchasesContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-title">No hay compras registradas en este periodo</div>
          </div>
        `;
      } else {
        purchasesContainer.innerHTML = `
          <table class="app-table">
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Cantidad</th>
                <th>Costo Unitario</th>
                <th>Total Invertido</th>
                <th>Proveedor</th>
                <th>Fecha</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              ${purchases
                .map(
                  (p) => `
                <tr>
                  <td><strong>${p.rawMaterial?.name || 'Insumo'}</strong></td>
                  <td><strong>${p.quantity} ${p.rawMaterial?.unit || ''}</strong></td>
                  <td>${formatCOP(p.unitCost)}</td>
                  <td><strong style="color: var(--primary);">${formatCOP(p.totalCost)}</strong></td>
                  <td>${p.supplier || 'N/A'}</td>
                  <td>${formatDate(p.purchaseDate)}</td>
                  <td>
                    <div style="display: flex; gap: 6px;">
                      <button class="btn btn-outline btn-sm btn-edit-purchase" data-id="${p.id}" title="Editar compra y proveedor">
                        ✏️
                      </button>
                      <button class="btn btn-outline btn-sm btn-delete-purchase" data-id="${p.id}" style="color: var(--danger);" title="Eliminar compra y revertir stock">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        `;

        purchasesContainer.querySelectorAll('.btn-edit-purchase').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            const id = Number(e.currentTarget.dataset.id);
            const purchase = purchases.find((p) => p.id === id);
            if (purchase) openEditPurchaseModal(purchase);
          });
        });

        purchasesContainer.querySelectorAll('.btn-delete-purchase').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            if (confirm('¿Deseas eliminar esta compra? Se revertirá automáticamente la cantidad del stock.')) {
              try {
                await api.deletePurchase(id);
                showToast('Compra eliminada y stock revertido');
                renderInventory(container);
              } catch (err) {
                showToast('Error al eliminar compra', 'danger');
              }
            }
          });
        });
      }
    }
  } catch (error) {
    console.error('Error loading inventory:', error);
  }
}

// Modal para registrar compra de insumos
async function openPurchaseModal() {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  const materials = await api.getMaterials();

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">📦 Registrar Compra de Insumo</h3>
          <button class="modal-close-btn" id="btnClosePurchaseModal">✕</button>
        </div>
        <form id="purchaseForm">
          <div class="modal-body">
            
            <div class="form-group">
              <label class="form-label">Insumo o Materia Prima *</label>
              <select id="purchaseMaterialSelect" class="form-select" required>
                ${materials
                  .map(
                    (m) => `
                  <option value="${m.id}" data-cost="${m.avgCost}" data-unit="${m.unit}">
                    ${m.name} (${m.unit}) - Stock Actual: ${m.currentStock}
                  </option>
                `
                  )
                  .join('')}
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Cantidad Comprada *</label>
                <input type="number" id="purchaseQuantity" class="form-input" min="0.5" step="0.5" placeholder="Ej: 50" required />
              </div>

              <div class="form-group">
                <label class="form-label">Costo Unitario ($ COP) *</label>
                <input type="number" id="purchaseUnitCost" class="form-input" min="1" placeholder="Ej: 2500" required />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Total Inversión</label>
              <input type="text" id="purchaseTotalDisplay" class="form-input" value="$0" disabled style="background: var(--bg-subtle); font-weight: 800; color: var(--primary);" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Proveedor / Lugar de Compra</label>
                <input type="text" id="purchaseSupplier" class="form-input" placeholder="Ej: Finca El Roble / Distribuidora" />
              </div>

              <div class="form-group">
                <label class="form-label">Fecha de Compra</label>
                <input type="date" id="purchaseDate" class="form-input" value="${getTodayLocalDateStr()}" required />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Notas Adicionales</label>
              <input type="text" id="purchaseNotes" class="form-input" placeholder="Ej: Pago de contado en efectivo..." />
            </div>

          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btnCancelPurchaseModal">Cancelar</button>
            <button type="submit" class="btn btn-accent">Guardar e Incrementar Stock</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const qtyInput = document.getElementById('purchaseQuantity');
  const costInput = document.getElementById('purchaseUnitCost');
  const totalDisplay = document.getElementById('purchaseTotalDisplay');

  const updateTotal = () => {
    const qty = Number(qtyInput.value) || 0;
    const cost = Number(costInput.value) || 0;
    totalDisplay.value = formatCOP(qty * cost);
  };

  qtyInput?.addEventListener('input', updateTotal);
  costInput?.addEventListener('input', updateTotal);

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnClosePurchaseModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelPurchaseModal')?.addEventListener('click', closeModal);

  document.getElementById('purchaseForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      rawMaterialId: Number(document.getElementById('purchaseMaterialSelect').value),
      quantity: Number(qtyInput.value),
      unitCost: Number(costInput.value),
      supplier: document.getElementById('purchaseSupplier').value,
      purchaseDate: document.getElementById('purchaseDate').value,
      notes: document.getElementById('purchaseNotes').value,
      registeredBy: store.currentUser,
    };

    try {
      await api.createPurchase(payload);
      showToast('Compra registrada y stock actualizado con éxito 📦');
      closeModal();
      renderInventory(document.getElementById('contentContainer'));
    } catch (err) {
      showToast('Error al registrar compra', 'danger');
    }
  });
}

// Modal para editar insumo existente
function openEditMaterialModal(material) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 480px;">
        <div class="modal-header">
          <h3 class="modal-title">✏️ Editar Insumo: ${material.name}</h3>
          <button class="modal-close-btn" id="btnCloseEditMatModal">✕</button>
        </div>
        <form id="editMaterialForm">
          <div class="modal-body">
            
            <div class="form-group">
              <label class="form-label">Nombre del Insumo *</label>
              <input type="text" id="editMatName" class="form-input" value="${material.name}" required />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Categoría</label>
                <select id="editMatCategory" class="form-select">
                  <option value="MATERIA_PRIMA" ${material.category === 'MATERIA_PRIMA' ? 'selected' : ''}>Materia Prima</option>
                  <option value="EMPAQUE" ${material.category === 'EMPAQUE' ? 'selected' : ''}>Empaque / Botellas / Etiquetas</option>
                  <option value="INSUMO" ${material.category === 'INSUMO' ? 'selected' : ''}>Insumo General</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Unidad de Medida</label>
                <input type="text" id="editMatUnit" class="form-input" value="${material.unit}" required />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Stock Actual</label>
                <input type="number" id="editMatStock" class="form-input" min="0" step="0.5" value="${material.currentStock}" required />
              </div>

              <div class="form-group">
                <label class="form-label">Stock Mínimo (Alerta)</label>
                <input type="number" id="editMatMinAlert" class="form-input" min="0" value="${material.minStockAlert}" required />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Costo Promedio Unitario ($ COP)</label>
              <input type="number" id="editMatAvgCost" class="form-input" min="0" value="${material.avgCost}" />
            </div>

          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btnCancelEditMatModal">Cancelar</button>
            <button type="submit" class="btn btn-primary">Guardar Cambios</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseEditMatModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelEditMatModal')?.addEventListener('click', closeModal);

  document.getElementById('editMaterialForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('editMatName').value,
      category: document.getElementById('editMatCategory').value,
      unit: document.getElementById('editMatUnit').value,
      currentStock: Number(document.getElementById('editMatStock').value),
      minStockAlert: Number(document.getElementById('editMatMinAlert').value),
      avgCost: Number(document.getElementById('editMatAvgCost').value),
    };

    try {
      await api.updateMaterial(material.id, payload);
      showToast('Insumo actualizado con éxito');
      closeModal();
      renderInventory(document.getElementById('contentContainer'));
    } catch (err) {
      showToast('Error al actualizar insumo', 'danger');
    }
  });
}

// Modal para ajustar stock manual
function openAdjustStockModal(materialId, materialName, currentStock, unit) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 420px;">
        <div class="modal-header">
          <h3 class="modal-title">🔧 Ajuste Manual de Stock</h3>
          <button class="modal-close-btn" id="btnCloseAdjustModal">✕</button>
        </div>
        <form id="adjustForm">
          <div class="modal-body">
            <p style="font-size: 0.9rem; margin-bottom: 12px;">
              Insumo: <strong>${materialName}</strong>
            </p>
            <div class="form-group">
              <label class="form-label">Nuevo Stock Real (${unit}) *</label>
              <input type="number" id="newStockInput" class="form-input" min="0" step="0.5" value="${currentStock}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Motivo del Ajuste</label>
              <input type="text" id="adjustReason" class="form-input" placeholder="Ej: Conteo físico semanal, merma..." />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btnCancelAdjustModal">Cancelar</button>
            <button type="submit" class="btn btn-primary">Guardar Ajuste</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseAdjustModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelAdjustModal')?.addEventListener('click', closeModal);

  document.getElementById('adjustForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newStock = Number(document.getElementById('newStockInput').value);
    const reason = document.getElementById('adjustReason').value;

    try {
      await api.adjustStock(materialId, newStock, reason);
      showToast('Stock ajustado correctamente');
      closeModal();
      renderInventory(document.getElementById('contentContainer'));
    } catch (err) {
      showToast('Error al ajustar stock', 'danger');
    }
  });
}

// Modal para crear nuevo tipo de insumo
function openNewMaterialModal() {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 450px;">
        <div class="modal-header">
          <h3 class="modal-title">✨ Crear Nuevo Insumo</h3>
          <button class="modal-close-btn" id="btnCloseNewMatModal">✕</button>
        </div>
        <form id="newMaterialForm">
          <div class="modal-body">
            
            <div class="form-group">
              <label class="form-label">Nombre del Insumo *</label>
              <input type="text" id="newMatName" class="form-input" placeholder="Ej: Azúcar Refinada / Fruta Fresa" required />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Categoría</label>
                <select id="newMatCategory" class="form-select">
                  <option value="MATERIA_PRIMA">Materia Prima (Leche)</option>
                  <option value="EMPAQUE">Empaque / Botellas / Etiquetas</option>
                  <option value="INSUMO" selected>Insumo General (Frutas, etc.)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Unidad de Medida</label>
                <input type="text" id="newMatUnit" class="form-input" placeholder="Litros, Unidades, Kg" value="Unidades" required />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Stock Inicial</label>
                <input type="number" id="newMatInitialStock" class="form-input" min="0" step="0.5" value="0" />
              </div>

              <div class="form-group">
                <label class="form-label">Alerta Stock Mínimo</label>
                <input type="number" id="newMatMinAlert" class="form-input" min="1" value="10" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Costo Estimado Unitario ($ COP)</label>
              <input type="number" id="newMatAvgCost" class="form-input" min="0" value="0" />
            </div>

          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btnCancelNewMatModal">Cancelar</button>
            <button type="submit" class="btn btn-accent">Crear Insumo</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseNewMatModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelNewMatModal')?.addEventListener('click', closeModal);

  document.getElementById('newMaterialForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('newMatName').value,
      category: document.getElementById('newMatCategory').value,
      unit: document.getElementById('newMatUnit').value,
      currentStock: Number(document.getElementById('newMatInitialStock').value),
      minStockAlert: Number(document.getElementById('newMatMinAlert').value),
      avgCost: Number(document.getElementById('newMatAvgCost').value),
    };

    try {
      await api.createMaterial(payload);
      showToast('Nuevo insumo creado con éxito');
      closeModal();
      renderInventory(document.getElementById('contentContainer'));
    } catch (err) {
      showToast('Error al crear insumo', 'danger');
    }
  });
}

// Modal para editar compra histórica y proveedor
function openEditPurchaseModal(purchase) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  const matName = purchase.rawMaterial?.name || 'Insumo';
  const unit = purchase.rawMaterial?.unit || 'Unidades';
  const purchaseDateStr = purchase.purchaseDate ? String(purchase.purchaseDate).split('T')[0] : getTodayLocalDateStr();

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 480px;">
        <div class="modal-header">
          <h3 class="modal-title">✏️ Editar Compra de Insumo</h3>
          <button class="modal-close-btn" id="btnCloseEditPurchaseModal">✕</button>
        </div>
        <form id="editPurchaseForm">
          <div class="modal-body">
            
            <div class="form-group" style="background: var(--bg-app); padding: 10px 12px; border-radius: var(--radius-md); border: 1.5px solid var(--border-color);">
              <label class="form-label" style="color: var(--primary); font-weight: 800; margin-bottom: 2px;">Insumo Adquirido</label>
              <div style="font-size: 1.05rem; font-weight: 800; color: var(--text-main);">
                ${matName} (${unit})
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Proveedor / Vendedor *</label>
                <input type="text" id="editPurchSupplier" class="form-input" placeholder="Ej: Lácteos La Granja, Distribuidora..." value="${purchase.supplier || ''}" required />
              </div>

              <div class="form-group">
                <label class="form-label">No. Factura / Recibo</label>
                <input type="text" id="editPurchInvoice" class="form-input" placeholder="Ej: FAC-1042" value="${purchase.invoiceNumber || ''}" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Cantidad Adquirida (${unit}) *</label>
                <input type="number" id="editPurchQty" class="form-input" min="0.1" step="0.1" value="${purchase.quantity}" required />
              </div>

              <div class="form-group">
                <label class="form-label">Costo Unitario ($ COP) *</label>
                <input type="number" id="editPurchUnitCost" class="form-input" min="0" value="${purchase.unitCost}" required />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Total Invertido Calculado</label>
                <input type="text" id="editPurchTotalDisplay" class="form-input" value="${formatCOP(purchase.totalCost)}" disabled style="background: var(--bg-subtle); font-weight: 800; color: var(--primary);" />
              </div>

              <div class="form-group">
                <label class="form-label">Fecha de Compra *</label>
                <input type="date" id="editPurchDate" class="form-input" value="${purchaseDateStr}" required />
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Notas Adicionales</label>
              <input type="text" id="editPurchNotes" class="form-input" placeholder="Observaciones de la compra..." value="${purchase.notes || ''}" />
            </div>

          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btnCancelEditPurchaseModal">Cancelar</button>
            <button type="submit" class="btn btn-primary">Guardar Cambios</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const qtyInput = document.getElementById('editPurchQty');
  const costInput = document.getElementById('editPurchUnitCost');
  const totalDisplay = document.getElementById('editPurchTotalDisplay');

  const updateCalculations = () => {
    const qty = Number(qtyInput.value) || 0;
    const cost = Number(costInput.value) || 0;
    totalDisplay.value = formatCOP(qty * cost);
  };

  qtyInput?.addEventListener('input', updateCalculations);
  costInput?.addEventListener('input', updateCalculations);

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseEditPurchaseModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelEditPurchaseModal')?.addEventListener('click', closeModal);

  document.getElementById('editPurchaseForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      supplier: document.getElementById('editPurchSupplier').value,
      invoiceNumber: document.getElementById('editPurchInvoice').value,
      quantity: Number(qtyInput.value),
      unitCost: Number(costInput.value),
      purchaseDate: document.getElementById('editPurchDate').value,
      notes: document.getElementById('editPurchNotes').value,
    };

    try {
      await api.updatePurchase(purchase.id, payload);
      showToast('Compra actualizada y stock sincronizado correctamente 📦');
      closeModal();
      renderInventory(document.getElementById('contentContainer'));
    } catch (err) {
      showToast(err.message || 'Error al actualizar compra', 'danger');
    }
  });
}
