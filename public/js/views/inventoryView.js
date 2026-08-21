import { api } from '../api.js';
import { formatCOP, formatDate, formatPaymentBadge, formatStock, getTodayLocalDateStr, showToast, store } from '../store.js';

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
          <span class="inventory-toolbar-subtitle">Control de existencias, insumos, elaboraciones y compras</span>
        </div>

        <div class="inventory-toolbar-actions" style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-outline" id="btnOpenNewMaterialModal">
            <span>+</span> Crear Insumo
          </button>
          <button class="btn btn-accent" id="btnOpenPreparationModal" style="background: linear-gradient(135deg, #1b4332, #2d6a4f); color: #fff; font-weight: 700;">
            <span>🥣</span> Elaborar Insumo / Mermelada
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

    <!-- Historial de Elaboraciones de Insumos / Mermeladas -->
    <div class="table-container" style="padding: 20px; margin-top: 24px;">
      <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px;">
        <div>
          <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--primary); margin-bottom: 2px;">
            🥣 Historial de Elaboraciones (Mermeladas, Jarabes, Dulces)
          </h3>
          <span style="font-size: 0.8rem; color: var(--text-muted);">
            Insumos preparados a partir de otros insumos. El costo se transfiere automáticamente sin generar gastos duplicados.
          </span>
        </div>
        <button class="btn btn-accent btn-sm" id="btnOpenPreparationModalSec" style="background: linear-gradient(135deg, #1b4332, #2d6a4f); color: #fff; font-weight: 700;">
          + Elaborar Mermelada / Insumo
        </button>
      </div>

      <div id="preparationsTableContainer">
        <div style="text-align: center; padding: 20px; color: var(--text-muted);">
          Cargando historial de elaboraciones... 🥣
        </div>
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

  const handleOpenPrep = async () => {
    const materials = await api.getMaterials();
    openNewPreparationModal(materials);
  };

  container.querySelector('#btnOpenPreparationModal')?.addEventListener('click', handleOpenPrep);
  container.querySelector('#btnOpenPreparationModalSec')?.addEventListener('click', handleOpenPrep);

  await loadInventoryData(container);
}

async function loadInventoryData(container) {
  const gridContainer = container.querySelector('#materialsGridContainer');
  const preparationsContainer = container.querySelector('#preparationsTableContainer');
  const purchasesContainer = container.querySelector('#purchasesTableContainer');

  try {
    let materials = await api.getMaterials();
    const preparations = await api.getPreparations();
    
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

    // 1. Renderizar tarjetas de insumos
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
            const unitLower = (m.unit || '').toLowerCase();
            const isKg = unitLower.includes('k');
            const formattedStock = formatStock(m.currentStock, 2);
            
            let stockDisplay = `${formattedStock} <span style="font-size: 0.95rem; font-weight: 600; color: var(--text-muted);">${m.unit}</span>`;
            if (isKg) {
              const gramsVal = Math.round(m.currentStock * 1000);
              stockDisplay = `${formattedStock} <span style="font-size: 0.95rem; font-weight: 600; color: var(--text-muted);">kg</span> <small style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted);">(${formatStock(gramsVal, 0)} g)</small>`;
            }

            let costDisplay = `Costo: <strong>${formatCOP(m.avgCost)}</strong>`;
            if (isKg) {
              costDisplay = `Costo: <strong>${formatCOP(m.avgCost)}/kg</strong> <small style="color: var(--text-muted);">(${formatCOP(Math.round(m.avgCost / 1000))}/g)</small>`;
            }

            return `
            <div class="inventory-card ${isLow ? 'low-stock' : ''}">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 6px;">
                <span class="badge" style="background: var(--bg-subtle); color: var(--text-muted); font-size: 0.72rem;">${m.category}</span>
                ${isLow ? '<span class="badge badge-pending" style="font-size: 0.72rem;">⚠️ Stock Bajo</span>' : '<span class="badge badge-paid" style="font-size: 0.72rem;">Stock Óptimo</span>'}
              </div>

              <div class="inventory-card-title">${m.name}</div>

              <div>
                <div class="inventory-card-stock ${isLow ? 'warning' : ''}">
                  ${stockDisplay}
                </div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">
                  Mínimo sugerido: ${formatStock(m.minStockAlert, 2)} ${m.unit}
                </div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 10px; margin-top: auto; gap: 6px; flex-wrap: wrap;">
                <span style="font-size: 0.78rem; color: var(--text-muted);">${costDisplay}</span>
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
          btn.addEventListener('click', (e) => {
            const id = Number(e.currentTarget.dataset.id);
            const material = materials.find((m) => m.id === id);
            if (material) openEditMaterialModal(material);
          });
        });

        // Eventos de ajuste manual de stock
        gridContainer.querySelectorAll('.btn-adjust-stock').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            const { id, name, stock, unit } = e.currentTarget.dataset;
            openAdjustStockModal(Number(id), name, Number(stock), unit);
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

    // 2. Renderizar historial de elaboraciones / mermeladas
    if (preparationsContainer) {
      if (!preparations || preparations.length === 0) {
        preparationsContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🥣</div>
            <div class="empty-state-title">No hay elaboraciones de insumos registradas</div>
            <div class="empty-state-text">Prepara mermeladas, jarabes o dulces combinando azúcar, frutas u otros insumos de tu inventario.</div>
          </div>
        `;
      } else {
        preparationsContainer.innerHTML = `
          <table class="app-table">
            <thead>
              <tr>
                <th>Código / Fecha</th>
                <th>Insumo Elaborado</th>
                <th>Ingredientes Consumidos</th>
                <th>Costo Total Transferido</th>
                <th>Costo por Kilo</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              ${preparations
                .map((p) => {
                  const unitLower = (p.unit || '').toLowerCase();
                  const isKg = unitLower.includes('k');
                  const costPerG = p.costPerUnit > 0 ? (p.costPerUnit / 1000).toFixed(1) : '0';

                  return `
                <tr>
                  <td>
                    <strong>${p.code}</strong>
                    <div><small style="color: var(--text-muted);">${formatDate(p.preparationDate)}</small></div>
                  </td>
                  <td>
                    <strong style="color: var(--primary); font-size: 0.95rem;">🍓 ${p.name}</strong>
                    <div><span class="badge badge-paid" style="font-size: 0.72rem; font-weight: 700;">+ ${p.quantityProduced} ${p.unit} producidos</span></div>
                  </td>
                  <td>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap; max-width: 280px;">
                      ${
                        p.ingredients && p.ingredients.length > 0
                          ? p.ingredients
                              .map((i) => {
                                const uLow = (i.rawMaterial?.unit || '').toLowerCase();
                                let displayQty = `${i.quantityUsed} ${i.rawMaterial?.unit || ''}`;
                                if (uLow.includes('k')) {
                                  displayQty = `${i.quantityUsed} kg (${Math.round(i.quantityUsed * 1000)} g)`;
                                }
                                const icon = (i.rawMaterial?.name || '').toLowerCase().includes('azucar') ? '🍬' : '🍓';
                                return `<span style="background: var(--bg-app); border: 1px solid var(--border-color); border-radius: 4px; padding: 2px 6px; font-size: 0.72rem; font-weight: 700; color: var(--text-main); white-space: nowrap;">${icon} ${i.rawMaterial?.name ? i.rawMaterial.name.split(' ')[0] : 'Insumo'}: ${displayQty}</span>`;
                              })
                              .join('')
                          : '<small style="color: var(--text-muted);">Sin ingredientes</small>'
                      }
                    </div>
                  </td>
                  <td>
                    <strong style="color: var(--text-main); font-size: 0.95rem;">${formatCOP(p.totalCost)}</strong>
                    <div><small style="color: var(--text-muted); font-size: 0.72rem;">Transferido de stock</small></div>
                  </td>
                  <td>
                    <strong style="color: #b78103; font-size: 0.95rem;">${formatCOP(p.costPerUnit)} / kg</strong>
                    <div><small style="color: var(--text-muted); font-size: 0.72rem;">(${formatCOP(costPerG)} / gramo)</small></div>
                  </td>
                  <td>
                    <div style="display: flex; gap: 6px;">
                      <button class="btn btn-outline btn-sm btn-view-prep" data-id="${p.id}" title="Ver resumen completo y receta">
                        👁️ Resumen
                      </button>
                      <button class="btn btn-outline btn-sm btn-delete-prep" data-id="${p.id}" data-name="${p.name}" style="color: var(--danger);" title="Eliminar elaboración y devolver ingredientes al stock">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              `;
                })
                .join('')}
            </tbody>
          </table>
        `;

        preparationsContainer.querySelectorAll('.btn-view-prep').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            openPreparationDetailModal(id);
          });
        });

        preparationsContainer.querySelectorAll('.btn-delete-prep').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            const { id, name } = e.currentTarget.dataset;
            if (confirm(`¿Estás seguro de eliminar la elaboración de "${name}"? Se devolverán los ingredientes al inventario y se descontará la cantidad producida.`)) {
              try {
                await api.deletePreparation(id);
                showToast('Elaboración eliminada e inventario restaurado 🥣');
                renderInventory(container);
              } catch (err) {
                showToast(err.message || 'Error al eliminar elaboración', 'danger');
              }
            }
          });
        });
      }
    }

    // 3. Renderizar historial de compras
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
                <th>Medio de Pago</th>
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
                  <td><strong style="color: var(--primary); font-size: 0.95rem;">${formatCOP(p.totalCost)}</strong></td>
                  <td>${formatPaymentBadge(p.paymentMethod)}</td>
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
                    ${m.name} (${m.unit}) - Stock: ${formatStock(m.currentStock, 2)} ${m.unit}
                  </option>
                `
                  )
                  .join('')}
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Cantidad Comprada *</label>
                <input type="number" id="purchaseQuantity" class="form-input" min="0.01" step="0.01" placeholder="Ej: 12 o 2.5" required />
                <small id="purchaseQtyHint" style="font-size: 0.75rem; color: var(--text-muted); margin-top: 3px; display: block;">
                  Unidad: Kilogramos / Litros / Unidades
                </small>
              </div>

              <div class="form-group">
                <label class="form-label">
                  <span>Costo Unitario ($ COP)</span>
                </label>
                <input type="number" id="purchaseUnitCost" class="form-input" min="0" step="any" placeholder="Ej: 3100 o 20100" />
                <small id="purchaseCostHint" style="font-size: 0.75rem; color: var(--text-muted); margin-top: 3px; display: block;">
                  Precio por unidad / kilo / litro
                </small>
              </div>
            </div>

            <!-- Sección de Costo Total con opción de ingreso manual o automático -->
            <div class="form-group" style="background: var(--bg-card); border: 1.5px dashed var(--border-subtle); padding: 12px 14px; border-radius: var(--radius-md); box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="form-label" style="margin: 0; font-weight: 700; color: var(--text-main);">
                  💵 Total Inversión de la Compra ($ COP) *
                </label>
                <span style="font-size: 0.73rem; color: var(--primary); font-weight: 700; background: #EEF2FF; padding: 2px 8px; border-radius: 12px; border: 1px solid #C7D2FE;">
                  🏷️ Puedes escribir el total manual si fue promoción
                </span>
              </div>
              <input type="number" id="purchaseTotalCost" class="form-input" min="0" step="any" placeholder="Ej: 50000 (o se calcula solo)" style="font-weight: 800; font-size: 1.05rem; color: var(--primary);" required />
              <div id="purchaseCalcBadge" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 6px; padding: 4px 8px; border-radius: var(--radius-sm); background: var(--bg-subtle);">
                💡 Escribe el costo por unidad o el valor total pagado por el paquete/promoción.
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Proveedor / Lugar de Compra</label>
                <input type="text" id="purchaseSupplier" class="form-input" placeholder="Ej: El Bodegón / Distribuidora / Ara" />
              </div>

              <div class="form-group">
                <label class="form-label">Medio de Pago</label>
                <select id="purchasePaymentMethod" class="form-select" style="font-weight: 700;">
                  <option value="EFECTIVO" selected>💵 Efectivo (Dinero en Mano)</option>
                  <option value="NEQUI">🟣 Transferencia Nequi</option>
                  <option value="BANCOLOMBIA">🟡 Transferencia Bancolombia</option>
                  <option value="TRANSFERENCIA">💳 Otra Transferencia</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Fecha de Compra</label>
                <input type="date" id="purchaseDate" class="form-input" value="${getTodayLocalDateStr()}" required />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Notas Adicionales</label>
              <input type="text" id="purchaseNotes" class="form-input" placeholder="Ej: Promoción de 10 paquetes..." />
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

  const matSelect = document.getElementById('purchaseMaterialSelect');
  const qtyInput = document.getElementById('purchaseQuantity');
  const unitCostInput = document.getElementById('purchaseUnitCost');
  const totalCostInput = document.getElementById('purchaseTotalCost');
  const qtyHint = document.getElementById('purchaseQtyHint');
  const costHint = document.getElementById('purchaseCostHint');
  const calcBadge = document.getElementById('purchaseCalcBadge');

  let lastEditedField = 'unitCost'; // 'unitCost' | 'totalCost'

  const getSelectedUnit = () => {
    const opt = matSelect.selectedOptions[0];
    return opt?.dataset?.unit || 'unidad';
  };

  const onMaterialChange = () => {
    const opt = matSelect.selectedOptions[0];
    const unit = opt?.dataset?.unit || 'Unidades';
    const lastCost = Number(opt?.dataset?.cost || 0);

    qtyHint.textContent = `Cantidad en ${unit}`;
    if (unit.toLowerCase().includes('k')) {
      costHint.textContent = `Precio por Kilo ($/kg) • Ej: $3.100/kg azúcar, $20.100/kg leche polvo`;
    } else {
      costHint.textContent = `Precio por ${unit}`;
    }

    if (lastCost > 0 && !unitCostInput.value && !totalCostInput.value) {
      unitCostInput.value = lastCost;
      recalculateFromUnitCost();
    }
  };

  const recalculateFromUnitCost = () => {
    lastEditedField = 'unitCost';
    const qty = Number(qtyInput.value) || 0;
    const unitCost = Number(unitCostInput.value) || 0;
    const unit = getSelectedUnit();

    if (qty > 0 && unitCost > 0) {
      const total = Math.round(qty * unitCost);
      totalCostInput.value = total;
      calcBadge.innerHTML = `💰 <strong>${qty} ${unit}</strong> × <strong>${formatCOP(unitCost)}</strong> = Inversión Total: <strong style="color: var(--primary);">${formatCOP(total)}</strong>`;
      calcBadge.style.color = 'var(--text-main)';
    } else {
      calcBadge.innerHTML = `💡 Ingrese la cantidad y el costo unitario o el total pagado.`;
      calcBadge.style.color = 'var(--text-muted)';
      calcBadge.style.background = 'var(--bg-subtle)';
    }
  };

  const recalculateFromTotalCost = () => {
    lastEditedField = 'totalCost';
    const qty = Number(qtyInput.value) || 0;
    const total = Number(totalCostInput.value) || 0;
    const unit = getSelectedUnit();

    if (qty > 0 && total > 0) {
      const unitCost = total / qty;
      unitCostInput.value = Math.round(unitCost * 100) / 100;
      calcBadge.innerHTML = `🏷️ Inversión <strong>${formatCOP(total)}</strong> ÷ <strong>${qty} ${unit}</strong> = Costo unitario: <strong style="color: var(--success);">${formatCOP(unitCost)} / ${unit}</strong>`;
      calcBadge.style.color = '#065F46';
      calcBadge.style.background = '#ECFDF5';
    } else {
      calcBadge.innerHTML = `💡 Ingrese la cantidad y el costo unitario o el total pagado.`;
      calcBadge.style.color = 'var(--text-muted)';
      calcBadge.style.background = 'var(--bg-subtle)';
    }
  };

  const onQuantityInput = () => {
    if (lastEditedField === 'totalCost' && Number(totalCostInput.value) > 0) {
      recalculateFromTotalCost();
    } else {
      recalculateFromUnitCost();
    }
  };

  matSelect?.addEventListener('change', onMaterialChange);
  qtyInput?.addEventListener('input', onQuantityInput);
  unitCostInput?.addEventListener('input', recalculateFromUnitCost);
  totalCostInput?.addEventListener('input', recalculateFromTotalCost);

  onMaterialChange();

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnClosePurchaseModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelPurchaseModal')?.addEventListener('click', closeModal);

  document.getElementById('purchaseForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const qty = Number(qtyInput.value);
    const unitCost = Number(unitCostInput.value) || 0;
    const totalCost = Number(totalCostInput.value) || 0;

    if (!qty || qty <= 0) {
      showToast('Por favor ingresa una cantidad válida', 'danger');
      return;
    }

    if (unitCost <= 0 && totalCost <= 0) {
      showToast('Por favor ingresa el costo unitario o el total pagado', 'danger');
      return;
    }

    const payload = {
      rawMaterialId: Number(matSelect.value),
      quantity: qty,
      unitCost: unitCost,
      totalCost: totalCost,
      supplier: document.getElementById('purchaseSupplier').value,
      paymentMethod: document.getElementById('purchasePaymentMethod')?.value || 'EFECTIVO',
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
      showToast(err.message || 'Error al registrar compra', 'danger');
    }
  });
}

// Modal para editar insumo existente
function openEditMaterialModal(material) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  const currentUnit = material.unit || 'Kilogramos';

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
                  <option value="MATERIA_PRIMA" ${material.category === 'MATERIA_PRIMA' ? 'selected' : ''}>Materia Prima (Leche)</option>
                  <option value="EMPAQUE" ${material.category === 'EMPAQUE' ? 'selected' : ''}>Empaque / Botellas / Etiquetas</option>
                  <option value="INSUMO" ${material.category === 'INSUMO' ? 'selected' : ''}>Insumo General (Azúcar, Leche en Polvo, Frutas)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Unidad de Medida</label>
                <select id="editMatUnit" class="form-select">
                  <option value="Kilogramos" ${currentUnit.toLowerCase().includes('k') ? 'selected' : ''}>Kilogramos (kg)</option>
                  <option value="Gramos" ${currentUnit.toLowerCase() === 'gramos' || currentUnit.toLowerCase() === 'g' ? 'selected' : ''}>Gramos (g)</option>
                  <option value="Litros" ${currentUnit.toLowerCase().includes('l') && !currentUnit.toLowerCase().includes('k') ? 'selected' : ''}>Litros (L)</option>
                  <option value="Unidades" ${currentUnit.toLowerCase().includes('und') || currentUnit.toLowerCase().includes('unidad') ? 'selected' : ''}>Unidades (und)</option>
                  <option value="Mililitros" ${currentUnit.toLowerCase().includes('ml') ? 'selected' : ''}>Mililitros (ml)</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Stock Actual</label>
                <input type="number" id="editMatStock" class="form-input" min="0" step="0.001" value="${material.currentStock}" required />
              </div>

              <div class="form-group">
                <label class="form-label">Stock Mínimo (Alerta)</label>
                <input type="number" id="editMatMinAlert" class="form-input" min="0" step="0.1" value="${material.minStockAlert}" required />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Costo Promedio Unitario ($ COP)</label>
              <input type="number" id="editMatAvgCost" class="form-input" min="0" value="${material.avgCost}" />
              <small style="font-size: 0.75rem; color: var(--text-muted); margin-top: 3px; display: block;">
                Si la unidad es Kilogramos, ingresa el precio por Kilo (ej: 3100 para azúcar, 20100 para leche en polvo).
              </small>
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
              <input type="number" id="newStockInput" class="form-input" min="0" step="0.001" value="${currentStock}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Motivo del Ajuste</label>
              <input type="text" id="adjustReason" class="form-input" placeholder="Ej: Conteo físico, pesado en báscula, merma..." />
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
      <div class="modal-card" style="max-width: 460px;">
        <div class="modal-header">
          <h3 class="modal-title">✨ Crear Nuevo Insumo</h3>
          <button class="modal-close-btn" id="btnCloseNewMatModal">✕</button>
        </div>
        <form id="newMaterialForm">
          <div class="modal-body">
            
            <div class="form-group">
              <label class="form-label">Nombre del Insumo *</label>
              <input type="text" id="newMatName" class="form-input" placeholder="Ej: Azúcar Refinada / Fruta Mora / Fresa" required />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Categoría</label>
                <select id="newMatCategory" class="form-select">
                  <option value="INSUMO" selected>Insumo General (Azúcar, Polvo, Frutas)</option>
                  <option value="MATERIA_PRIMA">Materia Prima (Leche)</option>
                  <option value="EMPAQUE">Empaque / Botellas / Etiquetas</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Unidad de Medida</label>
                <select id="newMatUnit" class="form-select">
                  <option value="Kilogramos" selected>Kilogramos (kg)</option>
                  <option value="Gramos">Gramos (g)</option>
                  <option value="Litros">Litros (L)</option>
                  <option value="Unidades">Unidades (und)</option>
                  <option value="Mililitros">Mililitros (ml)</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Stock Inicial</label>
                <input type="number" id="newMatInitialStock" class="form-input" min="0" step="0.01" value="0" />
              </div>

              <div class="form-group">
                <label class="form-label">Alerta Stock Mínimo</label>
                <input type="number" id="newMatMinAlert" class="form-input" min="0.1" step="0.1" value="1" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Costo por Unidad / Kilo ($ COP)</label>
              <input type="number" id="newMatAvgCost" class="form-input" min="0" value="0" placeholder="Ej: 3100 para 1 kg de azúcar" />
              <small style="font-size: 0.75rem; color: var(--text-muted); margin-top: 3px; display: block;">
                Para insumos por Kilo, ingresa el valor de 1 Kg (se dividirá automáticamente para calcular el costo por gramo).
              </small>
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
                <input type="number" id="editPurchQty" class="form-input" min="0.01" step="0.01" value="${purchase.quantity}" required />
              </div>

              <div class="form-group">
                <label class="form-label">Costo Unitario ($ COP)</label>
                <input type="number" id="editPurchUnitCost" class="form-input" min="0" step="any" value="${purchase.unitCost}" />
              </div>
            </div>

            <div class="form-group" style="background: var(--bg-card); border: 1.5px dashed var(--border-subtle); padding: 12px 14px; border-radius: var(--radius-md);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="form-label" style="margin: 0; font-weight: 700; color: var(--text-main);">
                  💵 Total Invertido ($ COP) *
                </label>
                <span style="font-size: 0.73rem; color: var(--primary); font-weight: 700; background: #EEF2FF; padding: 2px 8px; border-radius: 12px; border: 1px solid #C7D2FE;">
                  🏷️ Puedes escribir el total manual
                </span>
              </div>
              <input type="number" id="editPurchTotalCost" class="form-input" min="0" step="any" value="${purchase.totalCost}" style="font-weight: 800; font-size: 1.05rem; color: var(--primary);" required />
              <div id="editPurchCalcBadge" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 6px; padding: 4px 8px; border-radius: var(--radius-sm); background: var(--bg-subtle);">
                💡 Modifica el costo unitario o el total pagado.
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Medio de Pago</label>
                <select id="editPurchPaymentMethod" class="form-select" style="font-weight: 700;">
                  <option value="EFECTIVO" ${purchase.paymentMethod === 'EFECTIVO' ? 'selected' : ''}>💵 Efectivo (Dinero en Mano)</option>
                  <option value="NEQUI" ${purchase.paymentMethod === 'NEQUI' ? 'selected' : ''}>🟣 Transferencia Nequi</option>
                  <option value="BANCOLOMBIA" ${purchase.paymentMethod === 'BANCOLOMBIA' ? 'selected' : ''}>🟡 Transferencia Bancolombia</option>
                  <option value="TRANSFERENCIA" ${purchase.paymentMethod === 'TRANSFERENCIA' ? 'selected' : ''}>💳 Otra Transferencia</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Fecha de Compra *</label>
                <input type="date" id="editPurchDate" class="form-input" value="${purchaseDateStr}" required />
              </div>
            </div>

            <div class="form-group">
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
  const unitCostInput = document.getElementById('editPurchUnitCost');
  const totalCostInput = document.getElementById('editPurchTotalCost');
  const calcBadge = document.getElementById('editPurchCalcBadge');

  let lastEditedField = 'unitCost';

  const recalculateFromUnitCost = () => {
    lastEditedField = 'unitCost';
    const qty = Number(qtyInput.value) || 0;
    const unitCost = Number(unitCostInput.value) || 0;

    if (qty > 0 && unitCost > 0) {
      const total = Math.round(qty * unitCost);
      totalCostInput.value = total;
      calcBadge.innerHTML = `💰 <strong>${qty} ${unit}</strong> × <strong>${formatCOP(unitCost)}</strong> = Inversión: <strong style="color: var(--primary);">${formatCOP(total)}</strong>`;
      calcBadge.style.color = 'var(--text-main)';
      calcBadge.style.background = '#EFF6FF';
    }
  };

  const recalculateFromTotalCost = () => {
    lastEditedField = 'totalCost';
    const qty = Number(qtyInput.value) || 0;
    const total = Number(totalCostInput.value) || 0;

    if (qty > 0 && total > 0) {
      const unitCost = total / qty;
      unitCostInput.value = Math.round(unitCost * 100) / 100;
      calcBadge.innerHTML = `🏷️ Inversión <strong>${formatCOP(total)}</strong> ÷ <strong>${qty} ${unit}</strong> = Costo unitario: <strong style="color: var(--success);">${formatCOP(unitCost)} / ${unit}</strong>`;
      calcBadge.style.color = '#065F46';
      calcBadge.style.background = '#ECFDF5';
    }
  };

  const onQuantityInput = () => {
    if (lastEditedField === 'totalCost' && Number(totalCostInput.value) > 0) {
      recalculateFromTotalCost();
    } else {
      recalculateFromUnitCost();
    }
  };

  qtyInput?.addEventListener('input', onQuantityInput);
  unitCostInput?.addEventListener('input', recalculateFromUnitCost);
  totalCostInput?.addEventListener('input', recalculateFromTotalCost);

  recalculateFromUnitCost();

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseEditPurchaseModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelEditPurchaseModal')?.addEventListener('click', closeModal);

  document.getElementById('editPurchaseForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const qty = Number(qtyInput.value);
    const unitCost = Number(unitCostInput.value) || 0;
    const totalCost = Number(totalCostInput.value) || 0;

    if (!qty || qty <= 0) {
      showToast('Por favor ingresa una cantidad válida', 'danger');
      return;
    }

    const payload = {
      supplier: document.getElementById('editPurchSupplier').value,
      invoiceNumber: document.getElementById('editPurchInvoice').value,
      quantity: qty,
      unitCost: unitCost,
      totalCost: totalCost,
      purchaseDate: document.getElementById('editPurchDate').value,
      paymentMethod: document.getElementById('editPurchPaymentMethod')?.value || 'EFECTIVO',
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

// Helper para iconos de insumos en preparaciones
function getPrepIcon(name = '') {
  const n = (name || '').toLowerCase();
  if (n.includes('leche') && !n.includes('polvo')) return '🥛';
  if (n.includes('azucar') || n.includes('azúcar')) return '🍬';
  if (n.includes('polvo')) return '🥛';
  if (n.includes('fresa') || n.includes('mora') || n.includes('fruta') || n.includes('melocoton') || n.includes('durazno') || n.includes('maracuya')) return '🍓';
  if (n.includes('botella') || n.includes('envase')) return '🍾';
  if (n.includes('etiqueta')) return '🏷️';
  return '🥣';
}

// Modal interactivo para elaborar un nuevo insumo (Mermeladas, Jarabes, Almíbares)
function openNewPreparationModal(materials) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  const todayStr = getTodayLocalDateStr();

  // Filtrar insumos disponibles para usar como ingredientes (excluir empaques/botellas)
  const availableIngredients = materials.filter(
    (m) => m.category !== 'EMPAQUE' && m.currentStock > 0 && m.isActive
  );

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 600px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">🥣 Elaborar Insumo / Mermelada</h3>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
              Transforma insumos existentes (azúcar, frutas) en un nuevo insumo con costeo real transferido.
            </div>
          </div>
          <button class="modal-close-btn" id="btnCloseNewPrepModal">✕</button>
        </div>
        <form id="newPreparationForm">
          <div class="modal-body">
            
            <!-- Aviso informativo de costeo -->
            <div style="background: rgba(27, 67, 50, 0.08); border-left: 3px solid #2d6a4f; padding: 8px 12px; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; font-size: 0.8rem; color: var(--text-main); margin-bottom: 14px;">
              💡 <strong>Sin gasto de dinero duplicado:</strong> El costo de los ingredientes consumidos se transfiere directamente al nuevo insumo para calcular su costo exacto por kilo y por gramo.
            </div>

            <!-- Datos del Insumo Resultante -->
            <div style="background: var(--bg-app); border: 1.5px solid var(--border-color); border-radius: var(--radius-md); padding: 12px; margin-bottom: 14px;">
              <label class="form-label" style="color: var(--primary); font-weight: 800; margin-bottom: 8px;">
                1. Insumo Resultante a Producir
              </label>

              <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                <label style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 700; cursor: pointer;">
                  <input type="radio" name="prepMode" value="NEW" checked style="cursor: pointer;" />
                  <span>+ Crear Nuevo Insumo</span>
                </label>
                <label style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 700; cursor: pointer;">
                  <input type="radio" name="prepMode" value="EXISTING" style="cursor: pointer;" />
                  <span>Seleccionar Insumo Existente</span>
                </label>
              </div>

              <div id="prepNewMatContainer" class="form-group" style="margin-bottom: 8px;">
                <input type="text" id="prepNewName" class="form-input" placeholder="Ej: Mermelada de Fresa, Jarabe de Mora, Dulce de Maracuyá..." required />
              </div>

              <div id="prepExistingMatContainer" class="form-group" style="display: none; margin-bottom: 8px;">
                <select id="prepExistingMatSelect" class="form-select">
                  <option value="">-- Seleccionar Insumo de la lista --</option>
                  ${materials
                    .filter((m) => m.category === 'INSUMO' || m.category === 'MATERIA_PRIMA')
                    .map((m) => `<option value="${m.id}">${m.name} (Stock: ${formatStock(m.currentStock, 2)} ${m.unit})</option>`)
                    .join('')}
                </select>
              </div>

              <div class="form-row" style="margin-bottom: 0;">
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label">Cantidad Final Obtenida (Kilos) *</label>
                  <input type="number" id="prepQuantityProduced" class="form-input" min="0.05" step="0.05" placeholder="Ej: 2.5" required style="font-weight: 800; color: var(--primary);" />
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label">Fecha de Elaboración *</label>
                  <input type="date" id="prepDate" class="form-input" value="${todayStr}" required />
                </div>
              </div>
            </div>

            <!-- Lista de Ingredientes Consumidos -->
            <div style="margin-bottom: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label class="form-label" style="color: var(--primary); font-weight: 800; margin: 0;">
                  2. Ingredientes y Cantidades Consumidas
                </label>
                <button type="button" class="btn btn-outline btn-sm" id="btnAddPrepIngredientRow" style="padding: 3px 10px; font-size: 0.78rem; font-weight: 700;">
                  + Agregar Ingrediente
                </button>
              </div>

              <div id="prepIngredientsList" style="display: flex; flex-direction: column; gap: 8px;">
                <!-- Filas dinámicas -->
              </div>
            </div>

            <!-- Tarjeta de Resumen en Vivo del Costo -->
            <div style="background: #FFFFFF; border: 1.5px solid var(--border-color); border-radius: var(--radius-md); padding: 12px; margin-bottom: 12px;">
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: center;">
                <div style="background: var(--bg-app); padding: 8px; border-radius: var(--radius-sm);">
                  <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Costo Total Invertido</span>
                  <div id="prepLiveTotalCost" style="font-size: 1.15rem; font-weight: 800; color: var(--text-main);">$0</div>
                </div>
                <div style="background: var(--bg-app); padding: 8px; border-radius: var(--radius-sm);">
                  <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Costo por Kilo</span>
                  <div id="prepLiveCostPerKg" style="font-size: 1.15rem; font-weight: 800; color: var(--primary);">$0 / kg</div>
                </div>
                <div style="background: var(--bg-app); padding: 8px; border-radius: var(--radius-sm);">
                  <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Costo por Gramo</span>
                  <div id="prepLiveCostPerGram" style="font-size: 1.15rem; font-weight: 800; color: #b78103;">$0 / g</div>
                </div>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Notas u Observaciones (Opcional)</label>
              <input type="text" id="prepNotes" class="form-input" placeholder="Ej: Receta estándar 60% fruta 40% azúcar..." />
            </div>

          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btnCancelNewPrepModal">Cancelar</button>
            <button type="submit" class="btn btn-accent" style="background: linear-gradient(135deg, #1b4332, #2d6a4f); color: #fff; font-weight: 800;">
              🥣 Guardar Elaboración
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const radioModes = modalOverlay.querySelectorAll('input[name="prepMode"]');
  const newMatContainer = document.getElementById('prepNewMatContainer');
  const existingMatContainer = document.getElementById('prepExistingMatContainer');
  const newNameInput = document.getElementById('prepNewName');
  const existingSelect = document.getElementById('prepExistingMatSelect');

  radioModes.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'NEW') {
        newMatContainer.style.display = 'block';
        existingMatContainer.style.display = 'none';
        newNameInput.setAttribute('required', 'required');
        existingSelect.removeAttribute('required');
      } else {
        newMatContainer.style.display = 'none';
        existingMatContainer.style.display = 'block';
        newNameInput.removeAttribute('required');
        existingSelect.setAttribute('required', 'required');
      }
    });
  });

  const ingredientsListContainer = document.getElementById('prepIngredientsList');
  const producedQtyInput = document.getElementById('prepQuantityProduced');
  const liveTotalCostDisplay = document.getElementById('prepLiveTotalCost');
  const liveCostPerKgDisplay = document.getElementById('prepLiveCostPerKg');
  const liveCostPerGramDisplay = document.getElementById('prepLiveCostPerGram');

  // Función para recalcular totales en tiempo real
  const updateLiveCalculations = () => {
    let totalCost = 0;
    const rows = ingredientsListContainer.querySelectorAll('.prep-ingredient-row');

    rows.forEach((row) => {
      const select = row.querySelector('.prep-row-mat');
      const qtyInput = row.querySelector('.prep-row-qty');
      const unitSelect = row.querySelector('.prep-row-unit');
      const costBadge = row.querySelector('.prep-row-cost');

      const matId = Number(select?.value);
      const qty = Number(qtyInput?.value) || 0;
      const unit = unitSelect?.value || 'g';

      const mat = materials.find((m) => m.id === matId);
      if (mat && qty > 0) {
        const isKg = (mat.unit || '').toLowerCase().includes('k');
        let rowCost = 0;
        if (isKg && (unit === 'g' || unit === 'gramos')) {
          rowCost = (qty / 1000) * mat.avgCost;
        } else {
          rowCost = qty * mat.avgCost;
        }
        totalCost += rowCost;
        if (costBadge) costBadge.textContent = formatCOP(rowCost);
      } else {
        if (costBadge) costBadge.textContent = '$0';
      }
    });

    const producedQty = Number(producedQtyInput.value) || 0;
    const costPerKg = producedQty > 0 ? Math.round(totalCost / producedQty) : 0;
    const costPerGram = producedQty > 0 ? (costPerKg / 1000).toFixed(1) : '0';

    liveTotalCostDisplay.textContent = formatCOP(totalCost);
    liveCostPerKgDisplay.textContent = `${formatCOP(costPerKg)} / kg`;
    liveCostPerGramDisplay.textContent = `${formatCOP(costPerGram)} / g`;
  };

  // Función para añadir una fila de ingrediente
  const addIngredientRow = (defaultMatId = '') => {
    const row = document.createElement('div');
    row.className = 'prep-ingredient-row';
    row.style.cssText = 'display: flex; align-items: center; gap: 8px; background: var(--bg-app); padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);';

    row.innerHTML = `
      <select class="form-select prep-row-mat" style="flex: 2; padding: 6px 8px; font-size: 0.82rem;" required>
        <option value="">-- Seleccionar Insumo --</option>
        ${materials
          .filter((m) => m.category !== 'EMPAQUE' && m.isActive)
          .map((m) => {
            const isSelected = m.id === defaultMatId ? 'selected' : '';
            return `<option value="${m.id}" ${isSelected}>${getPrepIcon(m.name)} ${m.name} (Stock: ${formatStock(m.currentStock, 2)} ${m.unit})</option>`;
          })
          .join('')}
      </select>

      <input type="number" class="form-input prep-row-qty" min="1" step="any" placeholder="Cantidad" style="flex: 1; padding: 6px 8px; font-size: 0.82rem; font-weight: 700;" required />

      <select class="form-select prep-row-unit" style="width: 100px; padding: 6px 8px; font-size: 0.82rem;">
        <option value="g">Gramos (g)</option>
        <option value="kg">Kilos (kg)</option>
      </select>

      <div class="prep-row-cost" style="width: 85px; text-align: right; font-size: 0.82rem; font-weight: 800; color: var(--primary);">
        $0
      </div>

      <button type="button" class="btn btn-outline btn-sm btn-remove-row" style="color: var(--danger); padding: 4px 8px; font-size: 0.82rem;" title="Quitar ingrediente">
        ✕
      </button>
    `;

    row.querySelector('.prep-row-mat')?.addEventListener('change', updateLiveCalculations);
    row.querySelector('.prep-row-qty')?.addEventListener('input', updateLiveCalculations);
    row.querySelector('.prep-row-unit')?.addEventListener('change', updateLiveCalculations);

    row.querySelector('.btn-remove-row')?.addEventListener('click', () => {
      row.remove();
      updateLiveCalculations();
    });

    ingredientsListContainer.appendChild(row);
  };

  document.getElementById('btnAddPrepIngredientRow')?.addEventListener('click', () => addIngredientRow());
  producedQtyInput?.addEventListener('input', updateLiveCalculations);

  // Agregar 2 filas por defecto (ej: para fruta y azúcar)
  const sugarMat = materials.find((m) => m.name.toLowerCase().includes('azucar') || m.name.toLowerCase().includes('azúcar'));
  const otherMat = materials.find((m) => m.category !== 'EMPAQUE' && m.id !== sugarMat?.id);

  addIngredientRow(otherMat?.id || '');
  addIngredientRow(sugarMat?.id || '');

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseNewPrepModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelNewPrepModal')?.addEventListener('click', closeModal);

  document.getElementById('newPreparationForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const isNew = modalOverlay.querySelector('input[name="prepMode"]:checked')?.value === 'NEW';
    const outputMaterialId = isNew ? null : Number(document.getElementById('prepExistingMatSelect')?.value);
    const newMaterialName = isNew ? document.getElementById('prepNewName')?.value : null;
    const quantityProduced = Number(producedQtyInput.value);
    const preparationDate = document.getElementById('prepDate')?.value;
    const notes = document.getElementById('prepNotes')?.value;

    const rows = ingredientsListContainer.querySelectorAll('.prep-ingredient-row');
    const ingredients = [];

    rows.forEach((row) => {
      const matId = Number(row.querySelector('.prep-row-mat')?.value);
      const qty = Number(row.querySelector('.prep-row-qty')?.value);
      const unit = row.querySelector('.prep-row-unit')?.value || 'g';

      if (matId && qty > 0) {
        ingredients.push({
          rawMaterialId: matId,
          quantityUsed: qty,
          unitUsed: unit,
        });
      }
    });

    if (ingredients.length === 0) {
      showToast('Debes agregar al menos un ingrediente válido a la elaboración', 'warning');
      return;
    }

    const payload = {
      outputMaterialId,
      newMaterialName,
      quantityProduced,
      unit: 'Kilogramos',
      preparationDate,
      notes,
      registeredBy: store.currentUser?.name || 'Edier',
      ingredients,
    };

    try {
      await api.createPreparation(payload);
      showToast('🥣 Elaboración registrada e insumo guardado con éxito');
      closeModal();
      renderInventory(document.getElementById('contentContainer'));
    } catch (err) {
      showToast(err.message || 'Error al registrar elaboración', 'danger');
    }
  });
}

// Modal de detalle y resumen completo de una elaboración
async function openPreparationDetailModal(prepId) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  try {
    const prep = await api.getPreparationById(prepId);
    const costPerG = prep.costPerUnit > 0 ? (prep.costPerUnit / 1000).toFixed(1) : '0';

    modalOverlay.innerHTML = `
      <div class="modal-overlay active">
        <div class="modal-card" style="max-width: 580px;">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <h3 class="modal-title">🥣 Resumen: ${prep.code}</h3>
              <span class="badge badge-paid">✅ Elaborado</span>
            </div>
            <button class="modal-close-btn" id="btnClosePrepDetailModal">✕</button>
          </div>
          <div class="modal-body">
            
            <!-- Tarjetas de estadísticas de la elaboración -->
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px;">
              <div class="order-card" style="padding: 12px 14px; background: var(--bg-app); border: 1px solid var(--border-color);">
                <span style="font-size: 0.74rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Insumo Elaborado</span>
                <div style="font-size: 1.25rem; font-weight: 800; color: var(--primary);">🍓 ${prep.name}</div>
                <small style="color: var(--text-muted); font-weight: 700;">+ ${prep.quantityProduced} ${prep.unit} producidos</small>
              </div>

              <div class="order-card" style="padding: 12px 14px; background: var(--bg-app); border: 1px solid var(--border-color);">
                <span style="font-size: 0.74rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Costo Total Transferido</span>
                <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-main);">${formatCOP(prep.totalCost)}</div>
                <small style="color: var(--text-muted); font-weight: 600;">Fecha: ${formatDate(prep.preparationDate)}</small>
              </div>

              <div class="order-card" style="padding: 12px 14px; background: var(--bg-app); border: 1px solid var(--border-color);">
                <span style="font-size: 0.74rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Costo por Kilo</span>
                <div style="font-size: 1.25rem; font-weight: 800; color: #b78103;">${formatCOP(prep.costPerUnit)} / kg</div>
                <small style="color: var(--text-muted); font-weight: 600;">Costo exacto del producto</small>
              </div>

              <div class="order-card" style="padding: 12px 14px; background: var(--bg-app); border: 1px solid var(--border-color);">
                <span style="font-size: 0.74rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Costo por Gramo</span>
                <div style="font-size: 1.25rem; font-weight: 800; color: var(--primary);">${formatCOP(costPerG)} / g</div>
                <small style="color: var(--text-muted); font-weight: 600;">Para descuento en lotes</small>
              </div>
            </div>

            <!-- Desglose de Ingredientes Utilizados -->
            <div style="margin-bottom: 12px;">
              <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--primary); margin-bottom: 8px;">
                📜 Ingredientes Utilizados y Costeo en ese Momento
              </h4>

              <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden;">
                <table class="app-table" style="margin: 0; font-size: 0.85rem;">
                  <thead>
                    <tr style="background: var(--bg-app);">
                      <th>Ingrediente</th>
                      <th>Cantidad Consumida</th>
                      <th>Costo Unitario</th>
                      <th style="text-align: right;">Total Invertido</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${
                      prep.ingredients && prep.ingredients.length > 0
                        ? prep.ingredients
                            .map((item) => {
                              const uLow = (item.rawMaterial?.unit || '').toLowerCase();
                              let qtyDisplay = `${item.quantityUsed} ${item.rawMaterial?.unit || ''}`;
                              if (uLow.includes('k')) {
                                qtyDisplay = `<strong>${item.quantityUsed} kg</strong> (${Math.round(item.quantityUsed * 1000)} g)`;
                              }
                              const pct = prep.totalCost > 0 ? Math.round((item.totalCost / prep.totalCost) * 100) : 0;
                              return `
                            <tr>
                              <td>
                                <div style="display: flex; align-items: center; gap: 6px;">
                                  <span style="font-size: 1.1rem;">${getPrepIcon(item.rawMaterial?.name)}</span>
                                  <strong>${item.rawMaterial?.name || 'Insumo'}</strong>
                                </div>
                              </td>
                              <td>${qtyDisplay}</td>
                              <td>${formatCOP(item.unitCost)} / ${item.rawMaterial?.unit || 'kg'}</td>
                              <td style="text-align: right;">
                                <strong style="color: var(--primary);">${formatCOP(item.totalCost)}</strong>
                                <div style="font-size: 0.72rem; color: var(--text-muted);">${pct}% de la receta</div>
                              </td>
                            </tr>
                          `;
                            })
                            .join('')
                        : '<tr><td colspan="4" style="text-align: center;">Sin desglose de ingredientes.</td></tr>'
                    }
                  </tbody>
                  <tfoot>
                    <tr style="background: var(--bg-app); font-weight: 800;">
                      <td colspan="3" style="text-align: right; color: var(--text-main);">Total Invertido en Receta:</td>
                      <td style="text-align: right; color: var(--primary); font-size: 1.05rem;">${formatCOP(prep.totalCost)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            ${
              prep.notes
                ? `
              <div style="background: #FFFFFF; padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-top: 10px;">
                <strong style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">📝 Notas:</strong>
                <p style="font-size: 0.88rem; margin-top: 3px; color: var(--text-main);">${prep.notes}</p>
              </div>
            `
                : ''
            }

            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 10px; text-align: right;">
              Registrado por: <strong>${prep.registeredBy || 'Edier'}</strong>
            </div>

          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" id="btnClosePrepDetailBtn" style="padding: 8px 24px;">Cerrar</button>
          </div>
        </div>
      </div>
    `;

    const closeModal = () => (modalOverlay.innerHTML = '');
    document.getElementById('btnClosePrepDetailModal')?.addEventListener('click', closeModal);
    document.getElementById('btnClosePrepDetailBtn')?.addEventListener('click', closeModal);
  } catch (err) {
    showToast('Error al cargar detalle de la elaboración', 'danger');
  }
}
