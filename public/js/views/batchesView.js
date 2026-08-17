import { api } from '../api.js';
import { formatCOP, formatDate, getTodayLocalDateStr, showToast, store } from '../store.js';

let includeInactive = false;

export async function renderBatches(container) {
  container.innerHTML = `
    <!-- Card de Resumen de Producción -->
    <div class="batch-calculator-card">
      <div class="batch-calculator-content">
        <h3>🍶 Registro de Lotes de Yogur Artesanal</h3>
        <p>
          Registra cada producción indicando los litros de leche y las botellas envasadas (1L y 2L). El sistema descuenta automáticamente la leche, los envases y las etiquetas correspondientes.
        </p>
      </div>
      <button class="btn btn-accent" id="btnOpenNewBatchModal" style="background: #FFFFFF; color: var(--primary); font-weight: 800;">
        + Registrar Lote
      </button>
    </div>

    <!-- Toolbar de Filtros -->
    <div class="toolbar-container" style="margin-bottom: 16px;">
      <div class="toolbar-left">
        <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--primary);">
          📋 Historial de Lotes Producidos
        </h3>
      </div>
      <div class="toolbar-right">
        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 700; color: var(--text-muted); cursor: pointer;">
          <input type="checkbox" id="chkIncludeInactive" ${includeInactive ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px;" />
          Mostrar lotes desactivados
        </label>
      </div>
    </div>

    <!-- Historial de Lotes -->
    <div class="table-container" style="padding: 20px;">
      <div id="batchesTableContainer">
        <div style="text-align: center; padding: 24px; color: var(--text-muted);">
          Cargando lotes de producción... 🥛
        </div>
      </div>
    </div>
  `;

  container.querySelector('#btnOpenNewBatchModal')?.addEventListener('click', () => {
    openBatchModal();
  });

  container.querySelector('#chkIncludeInactive')?.addEventListener('change', (e) => {
    includeInactive = e.target.checked;
    loadBatchesList(container);
  });

  await loadBatchesList(container);
}

async function loadBatchesList(container) {
  const tableContainer = container.querySelector('#batchesTableContainer');
  if (!tableContainer) return;

  try {
    const batches = await api.getBatches({ includeInactive: includeInactive ? 'true' : 'false' });

    if (!batches || batches.length === 0) {
      tableContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🍶</div>
          <div class="empty-state-title">No hay lotes de producción registrados</div>
          <div class="empty-state-text">Registra tu primer lote indicando la leche y botellas envasadas.</div>
          <button class="btn btn-primary" id="btnNewBatchEmpty">+ Registrar Primer Lote</button>
        </div>
      `;
      tableContainer.querySelector('#btnNewBatchEmpty')?.addEventListener('click', () => openBatchModal());
      return;
    }

    tableContainer.innerHTML = `
      <table class="app-table">
        <thead>
          <tr>
            <th>Código Lote</th>
            <th>Fecha</th>
            <th>Leche Usada</th>
            <th>Botellas Envasadas</th>
            <th>Total Litros</th>
            <th>Rendimiento</th>
            <th>Costo / L</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${batches
            .map((b) => {
              let yieldColor = 'var(--success)';
              if (b.yieldPercentage < 85) yieldColor = 'var(--warning)';
              if (b.yieldPercentage < 70) yieldColor = 'var(--danger)';

              const isInactive = !b.isActive;

              return `
              <tr style="${isInactive ? 'opacity: 0.55; background: var(--bg-subtle);' : ''}">
                <td>
                  <strong>${b.batchCode}</strong>
                  <div><small style="color: var(--accent); font-weight: 700;">${b.flavor}</small></div>
                </td>
                <td>${formatDate(b.preparationDate)}</td>
                <td><strong>${b.milkUsedLiters} L</strong></td>
                <td>
                  <span style="font-size: 0.85rem;">
                    ${b.bottles1LProduced > 0 ? `<strong>${b.bottles1LProduced}</strong> de 1L` : ''}
                    ${b.bottles1LProduced > 0 && b.bottles2LProduced > 0 ? ' • ' : ''}
                    ${b.bottles2LProduced > 0 ? `<strong>${b.bottles2LProduced}</strong> de 2L` : ''}
                  </span>
                </td>
                <td><strong style="color: var(--primary); font-size: 1.05rem;">${b.totalLitersProduced} L</strong></td>
                <td><strong style="color: ${yieldColor};">${b.yieldPercentage}%</strong></td>
                <td><strong>${b.costPerLiter > 0 ? formatCOP(b.costPerLiter) : 'N/D'}</strong></td>
                <td>
                  ${
                    b.isActive
                      ? '<span class="badge badge-paid">✅ Activo</span>'
                      : `<span class="badge badge-pending" title="${b.deactivationReason || ''}">🚫 Desactivado</span>`
                  }
                </td>
                <td>
                  <div style="display: flex; gap: 6px;">
                    <button class="btn btn-outline btn-sm btn-view-batch" data-id="${b.id}" title="Ver resumen completo">
                      👁️ Resumen
                    </button>
                    ${
                      b.isActive
                        ? `<button class="btn btn-outline btn-sm btn-edit-batch" data-id="${b.id}" title="Editar lote">
                            ✏️
                           </button>
                           <button class="btn btn-outline btn-sm btn-deactivate-batch" data-id="${b.id}" data-code="${b.batchCode}" style="color: var(--danger);" title="Desactivar lote">
                            🚫
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
    `;

    // Eventos de botones
    tableContainer.querySelectorAll('.btn-view-batch').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        openBatchDetailModal(id);
      });
    });

    tableContainer.querySelectorAll('.btn-edit-batch').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        openEditBatchModal(id);
      });
    });

    tableContainer.querySelectorAll('.btn-deactivate-batch').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const { id, code } = e.currentTarget.dataset;
        openDeactivateBatchModal(id, code);
      });
    });
  } catch (error) {
    console.error('Error loading batches:', error);
    tableContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-title">Error al cargar lotes</div>
        <div class="empty-state-text">${error.message}</div>
      </div>
    `;
  }
}

// Modal simplificado y directo para registrar lote
async function openBatchModal() {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  const materials = await api.getMaterials();
  const extraOptions = materials.filter(
    (m) => m.category === 'INSUMO' || (!m.code.includes('LECHE') && !m.code.includes('BOTELLA') && !m.code.includes('ETIQUETA'))
  );

  const milkMat = materials.find((m) => m.code === 'LECHE' || m.category === 'MATERIA_PRIMA' || m.name.toLowerCase().includes('leche'));
  const milkStock = milkMat ? milkMat.currentStock : 0;

  const b1Mat = materials.find((m) => m.code === 'BOTELLA_1L' || m.name.toLowerCase().includes('1 litro') || m.name.toLowerCase().includes('1l'));
  const b1Stock = b1Mat ? b1Mat.currentStock : 0;

  const b2Mat = materials.find((m) => m.code === 'BOTELLA_2L' || m.name.toLowerCase().includes('2 litro') || m.name.toLowerCase().includes('2l'));
  const b2Stock = b2Mat ? b2Mat.currentStock : 0;

  const labelMat = materials.find((m) => m.code === 'ETIQUETA' || m.name.toLowerCase().includes('etiqueta'));
  const labelStock = labelMat ? labelMat.currentStock : 0;
  const hasLabelStock = labelStock > 0;

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="modal-title">🍶 Registrar Lote de Producción</h3>
          <button class="modal-close-btn" id="btnCloseBatchModal">✕</button>
        </div>
        <form id="newBatchForm">
          <div class="modal-body">
            
            <!-- Sabor y Fecha -->
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Sabor del Yogur *</label>
                <select id="batchFlavor" class="form-select">
                  <option value="Natural" selected>Natural Artesanal</option>
                  <option value="Fresa">Fresa (Frutos Rojos)</option>
                  <option value="Melocotón">Melocotón / Durazno</option>
                  <option value="Mora">Mora Silvestre</option>
                  <option value="Maracuyá">Maracuyá Tropical</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Fecha *</label>
                <input type="date" id="batchDate" class="form-input" value="${getTodayLocalDateStr()}" required />
              </div>
            </div>

            <!-- Cantidad de Leche Principal -->
            <div class="form-group">
              <label class="form-label">Litros de Leche Invertidos (Materia Prima Base) *</label>
              <input type="number" id="batchMilkLiters" class="form-input" min="0.5" step="0.5" placeholder="Ej: 11" required />
              <div id="milkStockHint" style="font-size: 0.78rem; margin-top: 4px; font-weight: 700; color: ${milkStock > 0 ? 'var(--text-muted)' : 'var(--danger)'};">
                🥛 Stock disponible de leche: <strong>${milkStock} L</strong> ${milkStock <= 0 ? '<span style="color: var(--danger);">(⚠️ Sin stock de leche)</span>' : ''}
              </div>
            </div>

            <!-- Botellas Producidas -->
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Botellas 1 Litro Envasadas</label>
                <input type="number" id="batchBottles1L" class="form-input" min="0" value="0" />
                <div id="b1StockHint" style="font-size: 0.75rem; margin-top: 3px; font-weight: 700; color: ${b1Stock > 0 ? 'var(--text-muted)' : 'var(--danger)'};">
                  🍾 Stock 1L: <strong>${b1Stock} und</strong> ${b1Stock <= 0 ? '⚠️' : ''}
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Botellas 2 Litros Envasadas</label>
                <input type="number" id="batchBottles2L" class="form-input" min="0" value="0" />
                <div id="b2StockHint" style="font-size: 0.75rem; margin-top: 3px; font-weight: 700; color: ${b2Stock > 0 ? 'var(--text-muted)' : 'var(--danger)'};">
                  🍾 Stock 2L: <strong>${b2Stock} und</strong> ${b2Stock <= 0 ? '⚠️' : ''}
                </div>
              </div>
            </div>

            <!-- Control Opcional de Etiquetas Adhesivas -->
            <div style="background: var(--bg-app); border: 1.5px solid var(--border-color); padding: 10px 12px; border-radius: var(--radius-md); margin-bottom: 14px;">
              <label style="display: flex; align-items: center; gap: 8px; font-size: 0.88rem; font-weight: 700; color: var(--text-main); cursor: pointer; margin: 0;">
                <input type="checkbox" id="batchUseLabels" ${hasLabelStock ? 'checked' : ''} style="width: 17px; height: 17px; cursor: pointer;" />
                <span>🏷️ Aplicar y descontar etiquetas adhesivas (Opcional)</span>
              </label>
              <div id="labelStockAlert" style="font-size: 0.78rem; margin-top: 4px; margin-left: 25px; color: ${hasLabelStock ? 'var(--text-muted)' : '#b78103'};">
                ${hasLabelStock ? `Stock disponible en inventario: <strong>${labelStock} unidades</strong>` : '⚠️ No tienes etiquetas registradas en inventario (se omitirá el descuento de etiquetas)'}
              </div>
            </div>

            <!-- Resumen Automático de Descuento de Insumos -->
            <div style="background: var(--bg-app); border: 1.5px solid var(--border-color); padding: 14px; border-radius: var(--radius-md); margin-bottom: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-main);">Litros Resultantes:</span>
                <strong id="batchTotalResultLiters" style="font-size: 1.2rem; color: var(--primary);">0 Litros</strong>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-main);">Rendimiento:</span>
                <strong id="batchYieldDisplay" style="font-size: 1.15rem; color: var(--success);">0%</strong>
              </div>

              <div style="border-top: 1px dashed var(--border-color); padding-top: 8px; font-size: 0.82rem; color: var(--text-muted);">
                <div style="font-weight: 700; color: var(--primary); margin-bottom: 4px;">📦 Insumos a descontar del inventario:</div>
                <div id="autoDeductSummary">
                  • 🥛 Leche: <span id="summaryMilk">0 L</span><br>
                  • 🍾 Botellas 1L: <span id="summaryB1">0 und</span><br>
                  • 🍾 Botellas 2L: <span id="summaryB2">0 und</span><br>
                  • 🏷️ Etiquetas: <span id="summaryLabels">Omitido / No se descontará</span>
                </div>
              </div>
            </div>

            <!-- Sección Opcional de Fruta o Insumos Adicionales -->
            <div style="margin-bottom: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted);">
                  🍓 ¿Utilizaste fruta u otro ingrediente adicional?
                </label>
                <button type="button" class="btn btn-outline btn-sm" id="btnToggleExtra" style="padding: 4px 8px; font-size: 0.78rem;">
                  + Añadir Insumo
                </button>
              </div>

              <div id="extraContainer" style="display: none; flex-direction: column; gap: 8px; margin-top: 8px;">
                <div id="extraRowsList"></div>
              </div>
            </div>

            <!-- Notas -->
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Notas Adicionales (Opcional)</label>
              <input type="text" id="batchNotes" class="form-input" placeholder="Ej: Tiempo de fermentación, consistencia..." />
            </div>

          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btnCancelBatchModal">Cancelar</button>
            <button type="submit" class="btn btn-accent" id="btnSubmitBatch" style="padding: 10px 22px;">
              ✅ Guardar Lote
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const milkInput = document.getElementById('batchMilkLiters');
  const b1Input = document.getElementById('batchBottles1L');
  const b2Input = document.getElementById('batchBottles2L');
  const useLabelsCheckbox = document.getElementById('batchUseLabels');
  const totalResult = document.getElementById('batchTotalResultLiters');
  const yieldDisplay = document.getElementById('batchYieldDisplay');

  const summaryMilk = document.getElementById('summaryMilk');
  const summaryB1 = document.getElementById('summaryB1');
  const summaryB2 = document.getElementById('summaryB2');
  const summaryLabels = document.getElementById('summaryLabels');

  const milkStockHint = document.getElementById('milkStockHint');
  const b1StockHint = document.getElementById('b1StockHint');
  const b2StockHint = document.getElementById('b2StockHint');

  const updateCalculations = () => {
    const milk = Number(milkInput.value) || 0;
    const b1 = Number(b1Input.value) || 0;
    const b2 = Number(b2Input.value) || 0;
    const totalLitros = b1 * 1 + b2 * 2;
    const totalBotellas = b1 + b2;
    const useLabels = useLabelsCheckbox.checked;

    totalResult.textContent = `${totalLitros} Litros`;

    // Hint dinámico bajo input de leche
    if (milkStock <= 0) {
      milkStockHint.innerHTML = `⚠️ <strong style="color: var(--danger);">No tienes leche registrada en inventario</strong> (Stock: 0 L)`;
    } else if (milk > milkStock) {
      milkStockHint.innerHTML = `⚠️ <strong style="color: var(--danger);">Stock insuficiente de leche</strong>: Intentas usar ${milk} L pero solo tienes ${milkStock} L`;
    } else {
      milkStockHint.innerHTML = `🥛 Stock disponible de leche: <strong>${milkStock} L</strong>`;
    }

    // Hint dinámico bajo input de botella 1L
    if (b1Stock <= 0) {
      b1StockHint.innerHTML = `⚠️ <strong style="color: var(--danger);">Sin botellas de 1L en inventario</strong> (Stock: 0 und)`;
    } else if (b1 > b1Stock) {
      b1StockHint.innerHTML = `⚠️ <strong style="color: var(--danger);">Stock insuficiente de 1L</strong>: Requieres ${b1} und (Stock: ${b1Stock} und)`;
    } else {
      b1StockHint.innerHTML = `🍾 Stock 1L: <strong>${b1Stock} und</strong>`;
    }

    // Hint dinámico bajo input de botella 2L
    if (b2Stock <= 0) {
      b2StockHint.innerHTML = `⚠️ <strong style="color: var(--danger);">Sin botellas de 2L en inventario</strong> (Stock: 0 und)`;
    } else if (b2 > b2Stock) {
      b2StockHint.innerHTML = `⚠️ <strong style="color: var(--danger);">Stock insuficiente de 2L</strong>: Requieres ${b2} und (Stock: ${b2Stock} und)`;
    } else {
      b2StockHint.innerHTML = `🍾 Stock 2L: <strong>${b2Stock} und</strong>`;
    }

    // Resumen de leche en caja de totales
    if (milk > milkStock) {
      summaryMilk.innerHTML = `<strong>${milk} L</strong> <span style="color: var(--danger); font-weight: 800;">(⚠️ Insuficiente. Stock: ${milkStock} L)</span>`;
    } else {
      summaryMilk.innerHTML = `<strong>${milk} L</strong> <span style="color: var(--success); font-size: 0.75rem;">(Stock disp: ${milkStock} L)</span>`;
    }

    // Resumen de botella 1L en caja de totales
    if (b1 > b1Stock) {
      summaryB1.innerHTML = `<strong>${b1} und</strong> <span style="color: var(--danger); font-weight: 800;">(⚠️ Insuficiente. Stock: ${b1Stock} und)</span>`;
    } else {
      summaryB1.innerHTML = `<strong>${b1} und</strong> <span style="color: var(--success); font-size: 0.75rem;">(Stock disp: ${b1Stock} und)</span>`;
    }

    // Resumen de botella 2L en caja de totales
    if (b2 > b2Stock) {
      summaryB2.innerHTML = `<strong>${b2} und</strong> <span style="color: var(--danger); font-weight: 800;">(⚠️ Insuficiente. Stock: ${b2Stock} und)</span>`;
    } else {
      summaryB2.innerHTML = `<strong>${b2} und</strong> <span style="color: var(--success); font-size: 0.75rem;">(Stock disp: ${b2Stock} und)</span>`;
    }

    if (useLabels && hasLabelStock) {
      summaryLabels.innerHTML = `<strong>${totalBotellas} und</strong> <span style="color: var(--success); font-size: 0.75rem;">(Stock disp: ${labelStock} und)</span>`;
    } else if (useLabels && !hasLabelStock) {
      summaryLabels.innerHTML = `<em>0 und (Sin stock disponible en inventario)</em>`;
    } else {
      summaryLabels.innerHTML = `<em>Omitido (No se descontará)</em>`;
    }

    if (milk > 0) {
      const pct = Math.round((totalLitros / milk) * 100);
      yieldDisplay.textContent = `${pct}%`;
      yieldDisplay.style.color = pct >= 85 ? 'var(--success)' : 'var(--warning)';
    } else {
      yieldDisplay.textContent = '0%';
    }
  };

  milkInput?.addEventListener('input', updateCalculations);
  b1Input?.addEventListener('input', updateCalculations);
  b2Input?.addEventListener('input', updateCalculations);
  useLabelsCheckbox?.addEventListener('change', updateCalculations);

  updateCalculations();

  // Botón para agregar ingredientes adicionales
  const extraContainer = document.getElementById('extraContainer');
  const extraRowsList = document.getElementById('extraRowsList');
  const modalBody = modalOverlay.querySelector('.modal-body');

  document.getElementById('btnToggleExtra')?.addEventListener('click', () => {
    extraContainer.style.display = 'flex';
    const row = document.createElement('div');
    row.className = 'extra-mat-row';
    row.style.cssText = 'display: flex; gap: 8px; align-items: center; margin-bottom: 4px;';
    row.innerHTML = `
      <select class="form-select extra-select" style="flex: 2;">
        ${extraOptions.map((m) => `<option value="${m.id}">${m.name} (${m.unit})</option>`).join('')}
      </select>
      <input type="number" class="form-input extra-qty" min="0.1" step="0.1" value="1" placeholder="Cantidad" style="flex: 1;" />
      <button type="button" class="btn btn-outline btn-sm" style="color: var(--danger); padding: 6px 10px;" onclick="this.parentElement.remove();">✕</button>
    `;
    extraRowsList.appendChild(row);

    // Scroll suave hacia abajo para que el campo de notas y el nuevo insumo queden perfectamente visibles
    if (modalBody) {
      setTimeout(() => {
        modalBody.scrollTo({ top: modalBody.scrollHeight, behavior: 'smooth' });
      }, 50);
    }
  });

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseBatchModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelBatchModal')?.addEventListener('click', closeModal);

  document.getElementById('newBatchForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const milkUsed = Number(milkInput.value);
    const b1 = Number(b1Input.value) || 0;
    const b2 = Number(b2Input.value) || 0;

    // Validación obligatoria en cliente
    if (milkUsed > milkStock) {
      showToast(`⚠️ Stock insuficiente de leche: Tienes ${milkStock} L e intentas usar ${milkUsed} L. Registra compra de leche primero.`, 'danger');
      return;
    }

    if (b1 > 0 && b1 > b1Stock) {
      showToast(`⚠️ Stock insuficiente de botellas de 1L: Tienes ${b1Stock} und e intentas usar ${b1} und.`, 'danger');
      return;
    }

    if (b2 > 0 && b2 > b2Stock) {
      showToast(`⚠️ Stock insuficiente de botellas de 2L: Tienes ${b2Stock} und e intentas usar ${b2} und.`, 'danger');
      return;
    }

    // Recoger insumos extras si se agregaron
    const extraItems = [];
    document.querySelectorAll('.extra-mat-row').forEach((row) => {
      const matId = Number(row.querySelector('.extra-select')?.value);
      const qty = Number(row.querySelector('.extra-qty')?.value) || 0;
      if (matId && qty > 0) {
        extraItems.push({ rawMaterialId: matId, quantityUsed: qty });
      }
    });

    const payload = {
      milkUsedLiters: milkUsed,
      bottles1LProduced: b1,
      bottles2LProduced: b2,
      useLabels: useLabelsCheckbox.checked,
      flavor: document.getElementById('batchFlavor').value,
      preparationDate: document.getElementById('batchDate').value,
      notes: document.getElementById('batchNotes').value,
      registeredBy: store.currentUser,
      extraItems,
    };

    try {
      const res = await api.createBatch(payload);
      showToast(`¡Lote ${res.batchCode} registrado con éxito! 🍶`);
      closeModal();
      renderBatches(document.getElementById('contentContainer'));
    } catch (err) {
      showToast(err.message || 'Error al registrar lote', 'danger');
    }
  });
}

// Modal de resumen completo de lote
async function openBatchDetailModal(batchId) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  try {
    const batch = await api.getBatchById(batchId);

    modalOverlay.innerHTML = `
      <div class="modal-overlay active">
        <div class="modal-card" style="max-width: 550px;">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <h3 class="modal-title">🍶 Resumen: ${batch.batchCode}</h3>
              ${batch.isActive ? '<span class="badge badge-paid">Activo</span>' : '<span class="badge badge-pending">Desactivado</span>'}
            </div>
            <button class="modal-close-btn" id="btnCloseBatchDetailModal">✕</button>
          </div>
          <div class="modal-body">
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px;">
              <div class="order-card" style="padding: 14px; background: var(--bg-app);">
                <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Total Producido</span>
                <div style="font-size: 1.5rem; font-weight: 800; color: var(--primary);">${batch.totalLitersProduced} Litros</div>
                <small style="color: var(--text-muted);">${batch.bottles1LProduced} de 1L • ${batch.bottles2LProduced} de 2L</small>
              </div>

              <div class="order-card" style="padding: 14px; background: var(--bg-app);">
                <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Rendimiento</span>
                <div style="font-size: 1.5rem; font-weight: 800; color: var(--success);">${batch.yieldPercentage}%</div>
                <small style="color: var(--text-muted);">${batch.milkUsedLiters} L de leche invertidos</small>
              </div>

              <div class="order-card" style="padding: 14px; background: var(--bg-app);">
                <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Costo Total Insumos</span>
                <div style="font-size: 1.3rem; font-weight: 800; color: var(--text-main);">${formatCOP(batch.totalCost)}</div>
                <small style="color: var(--text-muted);">Sabor: <strong>${batch.flavor}</strong></small>
              </div>

              <div class="order-card" style="padding: 14px; background: var(--bg-app);">
                <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Costo por Litro</span>
                <div style="font-size: 1.3rem; font-weight: 800; color: var(--primary);">${formatCOP(batch.costPerLiter)} / L</div>
                <small style="color: var(--text-muted);">Fecha: ${formatDate(batch.preparationDate)}</small>
              </div>
            </div>

            <h4 style="font-size: 0.92rem; font-weight: 800; color: var(--primary); margin-bottom: 8px;">
              📦 Desglose de Insumos Descontados
            </h4>

            ${
              batch.itemsUsed && batch.itemsUsed.length > 0
                ? `
              <table class="app-table">
                <thead>
                  <tr>
                    <th>Insumo</th>
                    <th>Cantidad</th>
                    <th>Costo Unit</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${batch.itemsUsed
                    .map(
                      (item) => `
                    <tr>
                      <td><strong>${item.rawMaterial?.name || 'Insumo'}</strong></td>
                      <td>${item.quantityUsed} ${item.rawMaterial?.unit || ''}</td>
                      <td>${formatCOP(item.unitCost)}</td>
                      <td><strong>${formatCOP(item.totalCost)}</strong></td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            `
                : `<p style="color: var(--text-muted); font-size: 0.88rem;">No hay desglose guardado.</p>`
            }

            ${
              batch.notes
                ? `
              <div style="margin-top: 12px; background: #FFFFFF; padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <strong style="font-size: 0.82rem; color: var(--text-muted);">Notas:</strong>
                <p style="font-size: 0.88rem; margin-top: 3px;">${batch.notes}</p>
              </div>
            `
                : ''
            }

            ${
              !batch.isActive && batch.deactivationReason
                ? `
              <div style="margin-top: 12px; background: var(--danger-light); padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--danger-border);">
                <strong style="font-size: 0.82rem; color: var(--danger);">Motivo de Desactivación:</strong>
                <p style="font-size: 0.88rem; margin-top: 3px; color: var(--danger);">${batch.deactivationReason}</p>
              </div>
            `
                : ''
            }

          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" id="btnCloseBatchDetailBtn">Cerrar</button>
          </div>
        </div>
      </div>
    `;

    const closeModal = () => (modalOverlay.innerHTML = '');
    document.getElementById('btnCloseBatchDetailModal')?.addEventListener('click', closeModal);
    document.getElementById('btnCloseBatchDetailBtn')?.addEventListener('click', closeModal);
  } catch (err) {
    showToast('Error al cargar resumen del lote', 'danger');
  }
}

// Modal para editar lote absolutamente todo
async function openEditBatchModal(batchId) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  const batch = await api.getBatchById(batchId);

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="modal-title">✏️ Editar Lote Completo: ${batch.batchCode}</h3>
          <button class="modal-close-btn" id="btnCloseEditBatchModal">✕</button>
        </div>
        <form id="editBatchForm">
          <div class="modal-body">
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Sabor *</label>
                <select id="editBatchFlavor" class="form-select">
                  <option value="Natural" ${batch.flavor === 'Natural' ? 'selected' : ''}>Natural Artesanal</option>
                  <option value="Fresa" ${batch.flavor === 'Fresa' ? 'selected' : ''}>Fresa (Frutos Rojos)</option>
                  <option value="Melocotón" ${batch.flavor === 'Melocotón' ? 'selected' : ''}>Melocotón / Durazno</option>
                  <option value="Mora" ${batch.flavor === 'Mora' ? 'selected' : ''}>Mora Silvestre</option>
                  <option value="Maracuyá" ${batch.flavor === 'Maracuyá' ? 'selected' : ''}>Maracuyá Tropical</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Estado del Lote</label>
                <select id="editBatchStatus" class="form-select">
                  <option value="COMPLETADO" ${batch.status === 'COMPLETADO' ? 'selected' : ''}>✅ Activo / Completado</option>
                  <option value="AGOTADO" ${batch.status === 'AGOTADO' ? 'selected' : ''}>📦 Agotado (Vendido)</option>
                  <option value="DESCARTADO" ${batch.status === 'DESCARTADO' ? 'selected' : ''}>🚫 Descartado / Baja</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Fecha de Preparación *</label>
                <input type="date" id="editBatchDate" class="form-input" value="${String(batch.preparationDate).split('T')[0]}" required />
              </div>

              <div class="form-group">
                <label class="form-label">Fecha de Vencimiento (Opcional)</label>
                <input type="date" id="editBatchExpDate" class="form-input" value="${batch.expirationDate ? String(batch.expirationDate).split('T')[0] : ''}" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Litros de Leche Invertidos *</label>
              <input type="number" id="editBatchMilk" class="form-input" min="0.5" step="0.5" value="${batch.milkUsedLiters}" required />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Botellas 1 Litro Producidas</label>
                <input type="number" id="editBatchB1" class="form-input" min="0" value="${batch.bottles1LProduced || 0}" />
              </div>

              <div class="form-group">
                <label class="form-label">Botellas 2 Litros Producidas</label>
                <input type="number" id="editBatchB2" class="form-input" min="0" value="${batch.bottles2LProduced || 0}" />
              </div>
            </div>

            <!-- Resumen Recalculado en Tiempo Real -->
            <div style="background: var(--bg-app); border: 1.5px solid var(--border-color); padding: 12px; border-radius: var(--radius-md); margin-bottom: 14px; display: flex; justify-content: space-around; text-align: center;">
              <div>
                <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Total Litros</span>
                <div id="editTotalLitrosDisplay" style="font-size: 1.15rem; font-weight: 800; color: var(--primary);">${batch.totalLitersProduced} L</div>
              </div>
              <div style="width: 1px; background: var(--border-subtle);"></div>
              <div>
                <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Rendimiento</span>
                <div id="editYieldDisplay" style="font-size: 1.15rem; font-weight: 800; color: var(--success);">${batch.yieldPercentage}%</div>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Observaciones o Notas</label>
              <textarea id="editBatchNotes" class="form-textarea" rows="2">${batch.notes || ''}</textarea>
            </div>

          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btnCancelEditBatchModal">Cancelar</button>
            <button type="submit" class="btn btn-primary">Guardar Cambios del Lote</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const editMilk = document.getElementById('editBatchMilk');
  const editB1 = document.getElementById('editBatchB1');
  const editB2 = document.getElementById('editBatchB2');
  const editTotalDisplay = document.getElementById('editTotalLitrosDisplay');
  const editYieldDisplay = document.getElementById('editYieldDisplay');

  const recalculateEdit = () => {
    const milk = Number(editMilk.value) || 0;
    const b1 = Number(editB1.value) || 0;
    const b2 = Number(editB2.value) || 0;
    const totalL = b1 * 1 + b2 * 2;
    editTotalDisplay.textContent = `${totalL} L`;

    if (milk > 0) {
      const pct = Math.round((totalL / milk) * 100);
      editYieldDisplay.textContent = `${pct}%`;
      editYieldDisplay.style.color = pct >= 85 ? 'var(--success)' : 'var(--warning)';
    } else {
      editYieldDisplay.textContent = '0%';
    }
  };

  editMilk?.addEventListener('input', recalculateEdit);
  editB1?.addEventListener('input', recalculateEdit);
  editB2?.addEventListener('input', recalculateEdit);

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseEditBatchModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelEditBatchModal')?.addEventListener('click', closeModal);

  document.getElementById('editBatchForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      flavor: document.getElementById('editBatchFlavor').value,
      status: document.getElementById('editBatchStatus').value,
      preparationDate: document.getElementById('editBatchDate').value,
      expirationDate: document.getElementById('editBatchExpDate').value || null,
      milkUsedLiters: Number(editMilk.value),
      bottles1LProduced: Number(editB1.value),
      bottles2LProduced: Number(editB2.value),
      notes: document.getElementById('editBatchNotes').value,
    };

    try {
      await api.updateBatch(batchId, payload);
      showToast('Lote actualizado por completo con éxito 🍶');
      closeModal();
      renderBatches(document.getElementById('contentContainer'));
    } catch (err) {
      showToast('Error al actualizar lote', 'danger');
    }
  });
}

// Modal para desactivar lote (soft delete) con motivo
function openDeactivateBatchModal(batchId, batchCode) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 450px;">
        <div class="modal-header">
          <h3 class="modal-title" style="color: var(--danger);">🚫 Desactivar Lote: ${batchCode}</h3>
          <button class="modal-close-btn" id="btnCloseDeactModal">✕</button>
        </div>
        <form id="deactivateBatchForm">
          <div class="modal-body">
            <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 14px;">
              El lote no se borrará permanentemente, sino que quedará como <strong>Desactivado</strong> para mantener el historial.
            </p>

            <div class="form-group">
              <label class="form-label">Motivo de Desactivación *</label>
              <input type="text" id="deactReason" class="form-input" placeholder="Ej: Se dañó la fermentación / Error de digitación" required />
            </div>

            <div style="margin-top: 10px;">
              <label style="display: flex; align-items: center; gap: 8px; font-size: 0.88rem; font-weight: 700; cursor: pointer;">
                <input type="checkbox" id="chkRestoreStock" style="width: 16px; height: 16px; cursor: pointer;" />
                Restaurar stock de los insumos utilizados
              </label>
              <small style="display: block; color: var(--text-muted); margin-top: 4px; margin-left: 24px;">
                (Devuelve la leche, botellas y etiquetas al inventario)
              </small>
            </div>

          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btnCancelDeactModal">Cancelar</button>
            <button type="submit" class="btn btn-accent" style="background: var(--danger);">Confirmar Desactivación</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseDeactModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelDeactModal')?.addEventListener('click', closeModal);

  document.getElementById('deactivateBatchForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const reason = document.getElementById('deactReason').value;
    const restoreStock = document.getElementById('chkRestoreStock').checked;

    try {
      await api.deactivateBatch(batchId, reason, restoreStock);
      showToast('Lote desactivado correctamente', 'warning');
      closeModal();
      renderBatches(document.getElementById('contentContainer'));
    } catch (err) {
      showToast('Error al desactivar lote', 'danger');
    }
  });
}
