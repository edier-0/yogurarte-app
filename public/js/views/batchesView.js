import { api } from '../api.js';
import { formatCOP, formatDate, getTodayLocalDateStr, showToast, store } from '../store.js';

let includeInactive = false;
let batchStatusFilter = 'ALL';

export async function renderBatches(container) {
  container.innerHTML = `
    <!-- Encabezado de Sección -->
    <div class="section-header-card" style="margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div>
          <h2 class="view-title" style="margin: 0; display: flex; align-items: center; gap: 8px;">
            🍶 Control de Lotes y Producción
          </h2>
          <p class="view-subtitle" style="margin: 4px 0 0 0;">
            Registra tu fermentación, calcula rendimientos, costos y establece precios de venta por lote.
          </p>
        </div>
        <button class="btn btn-primary" id="btnOpenNewBatchModal" style="padding: 10px 20px; font-weight: 800;">
          + Registrar Nuevo Lote
        </button>
      </div>
    </div>

    <!-- Toolbar de Filtros -->
    <div class="toolbar-container" style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
      <div class="toolbar-left" style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
        <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--primary); margin: 0;">
          📋 Historial de Lotes Producidos
        </h3>
        <div class="filter-chip-group" id="batchStatusChips">
          <button class="filter-chip ${batchStatusFilter === 'ALL' ? 'active' : ''}" data-status="ALL">Todos los Lotes</button>
          <button class="filter-chip ${batchStatusFilter === 'COMPLETADO' ? 'active' : ''}" data-status="COMPLETADO">✅ Disponibles</button>
          <button class="filter-chip ${batchStatusFilter === 'AGOTADO' ? 'active' : ''}" data-status="AGOTADO">📦 Agotados</button>
        </div>
      </div>
      <div class="toolbar-right">
        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 700; color: var(--text-muted); cursor: pointer;">
          <input type="checkbox" id="chkIncludeInactive" ${includeInactive ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px;" />
          Mostrar desactivados
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

  container.querySelectorAll('#batchStatusChips .filter-chip').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      batchStatusFilter = e.currentTarget.dataset.status;
      container.querySelectorAll('#batchStatusChips .filter-chip').forEach((b) => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      loadBatchesList(container);
    });
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
    const params = {
      includeInactive: includeInactive ? 'true' : 'false',
    };
    if (batchStatusFilter !== 'ALL') {
      params.status = batchStatusFilter;
    }

    const batches = await api.getBatches(params);

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
            <th>🥛 Leche Invertida</th>
            <th>🍶 Yogur Salido</th>
            <th>🍾 Botellas & Ventas</th>
            <th>💲 Precios Venta</th>
            <th>📈 Rendimiento</th>
            <th>💰 Costo / L</th>
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
              const hasExtraYield = b.totalLitersProduced > b.milkUsedLiters;
              const p1 = b.price1L || 10000;
              const p2 = b.price2L || 20000;

              let statusBadge = '<span class="badge badge-paid">✅ Disponible</span>';
              if (isInactive) {
                statusBadge = `<span class="badge badge-pending" title="${b.deactivationReason || ''}">🚫 Desactivado</span>`;
              } else if (b.status === 'AGOTADO') {
                statusBadge = '<span class="badge" style="background: #FEF3C7; color: #92400E; border: 1px solid #FCD34D; font-weight: 800;">📦 Agotado</span>';
              } else if (b.status === 'DESCARTADO') {
                statusBadge = '<span class="badge" style="background: #FEE2E2; color: #DC2626; border: 1px solid #FCA5A5; font-weight: 800;">🚫 Baja</span>';
              }

              const soldLiters = b.totalSoldLiters || 0;
              const soldPct = b.totalLitersProduced > 0 ? Math.min(100, Math.round((soldLiters / b.totalLitersProduced) * 100)) : 0;

              return `
              <tr style="${isInactive ? 'opacity: 0.55; background: var(--bg-subtle);' : (b.status === 'AGOTADO' ? 'background: #FFFDF7;' : '')}">
                <td>
                  <strong>${b.batchCode}</strong>
                  <div><small style="color: var(--accent); font-weight: 800;">${b.flavor}</small></div>
                  ${
                    b.itemsUsed && b.itemsUsed.length > 0
                      ? `<div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; max-width: 250px;">
                          ${b.itemsUsed
                            .map((item) => {
                              const icon = getBatchItemIcon(item.rawMaterial?.name, item.rawMaterial?.code);
                              const unitLower = (item.rawMaterial?.unit || '').toLowerCase();
                              let shortQty = `${item.quantityUsed} ${item.rawMaterial?.unit || ''}`;
                              if (unitLower.includes('k')) {
                                shortQty = `${item.quantityUsed} kg`;
                              } else if (unitLower.includes('litro')) {
                                shortQty = `${item.quantityUsed}L`;
                              } else {
                                shortQty = `${item.quantityUsed} und`;
                              }
                              const shortName = (item.rawMaterial?.name || 'Insumo').split(' ')[0];
                              return `<span style="background: var(--bg-app); border: 1px solid var(--border-color); border-radius: 4px; padding: 1px 5px; font-size: 0.7rem; color: var(--text-main); font-weight: 700; white-space: nowrap;" title="${item.rawMaterial?.name || ''}: ${item.quantityUsed} ${item.rawMaterial?.unit || ''}">${icon} ${shortName}: ${shortQty}</span>`;
                            })
                            .join('')}
                        </div>`
                      : ''
                  }
                </td>
                <td>${formatDate(b.preparationDate)}</td>
                <td><strong style="color: #0369A1;">${b.milkUsedLiters} L</strong></td>
                <td><strong style="color: var(--primary); font-size: 1.05rem;">${b.totalLitersProduced} L</strong></td>
                <td>
                  <span style="font-size: 0.85rem;">
                    ${b.bottles1LProduced > 0 ? `<strong>${b.bottles1LProduced}</strong> de 1L` : ''}
                    ${b.bottles1LProduced > 0 && b.bottles2LProduced > 0 ? ' • ' : ''}
                    ${b.bottles2LProduced > 0 ? `<strong>${b.bottles2LProduced}</strong> de 2L` : ''}
                    ${b.bottles1LProduced === 0 && b.bottles2LProduced === 0 ? '<span style="color: var(--text-muted);">A granel</span>' : ''}
                  </span>
                  ${
                    soldLiters > 0
                      ? `<div style="font-size: 0.72rem; color: var(--primary); font-weight: 700; margin-top: 2px;">
                          🛒 ${soldLiters}L vendidos (${soldPct}%)
                         </div>`
                      : '<div style="font-size: 0.72rem; color: var(--text-muted);">Sin ventas aún</div>'
                  }
                </td>
                <td>
                  <div style="font-size: 0.82rem;">
                    <div><span style="color: var(--text-muted);">1L:</span> <strong style="color: var(--primary);">${formatCOP(p1)}</strong></div>
                    <div><span style="color: var(--text-muted);">2L:</span> <strong style="color: var(--primary);">${formatCOP(p2)}</strong></div>
                  </div>
                </td>
                <td>
                  <strong style="color: ${yieldColor}; font-size: 0.95rem;">${b.yieldPercentage}%</strong>
                  ${hasExtraYield ? `<div style="font-size: 0.7rem; color: var(--success); font-weight: 700;">+${(b.totalLitersProduced - b.milkUsedLiters).toFixed(1)} L extra</div>` : ''}
                </td>
                <td><strong style="color: #b78103;">${b.costPerLiter > 0 ? formatCOP(b.costPerLiter) : 'N/D'}</strong></td>
                <td>${statusBadge}</td>
                <td>
                  <div style="display: flex; gap: 6px; align-items: center;">
                    <button class="btn btn-outline btn-sm btn-view-batch" data-id="${b.id}" title="Ver resumen completo">
                      👁️ Resumen
                    </button>
                    ${
                      b.isActive
                        ? `
                        <button class="btn btn-outline btn-sm btn-quick-toggle-status" data-id="${b.id}" data-current="${b.status}" title="${b.status === 'AGOTADO' ? 'Reactivar lote (Marcar como disponible)' : 'Marcar lote como agotado'}" style="font-size: 0.76rem; font-weight: 700; padding: 4px 8px; ${b.status === 'AGOTADO' ? 'color: var(--primary); border-color: var(--primary); background: #FAF5FF;' : 'color: #92400E; border-color: #FCD34D; background: #FFFBEB;'}">
                          ${b.status === 'AGOTADO' ? '🔄 Reactivar' : '📦 Agotar'}
                        </button>
                        <button class="btn btn-outline btn-sm btn-edit-batch" data-id="${b.id}" title="Editar lote">
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

    tableContainer.querySelectorAll('.btn-view-batch').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        openBatchDetailModal(id);
      });
    });

    tableContainer.querySelectorAll('.btn-quick-toggle-status').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const current = e.currentTarget.dataset.current;
        const nextStatus = current === 'AGOTADO' ? 'COMPLETADO' : 'AGOTADO';
        try {
          await api.updateBatch(id, { status: nextStatus });
          showToast(`Lote marcado como ${nextStatus === 'AGOTADO' ? '📦 Agotado' : '✅ Disponible'} 🍶`);
          loadBatchesList(container);
        } catch (err) {
          showToast('Error al cambiar estado del lote', 'danger');
        }
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

// Modal simplificado y directo para registrar lote con receta estándar por gramo y costeo
async function openBatchModal() {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  const materials = await api.getMaterials();

  // Identificar materias primas e insumos clave
  const milkMat = materials.find((m) => m.code === 'LECHE' || (m.category === 'MATERIA_PRIMA' && !m.name.toLowerCase().includes('polvo')) || (m.name.toLowerCase().includes('leche') && !m.name.toLowerCase().includes('polvo')));
  const milkStock = milkMat ? milkMat.currentStock : 0;
  const milkCost = milkMat ? milkMat.avgCost : 0;

  const sugarMat = materials.find((m) => m.code === 'AZUCAR' || m.name.toLowerCase().includes('azucar') || m.name.toLowerCase().includes('azúcar'));
  const sugarStock = sugarMat ? sugarMat.currentStock : 0;
  const sugarUnit = sugarMat ? sugarMat.unit : 'Kilogramos';
  const sugarCost = sugarMat ? sugarMat.avgCost : 0;

  const powderMat = materials.find((m) => m.code === 'LECHE_POLVO' || m.name.toLowerCase().includes('polvo'));
  const powderStock = powderMat ? powderMat.currentStock : 0;
  const powderUnit = powderMat ? powderMat.unit : 'Kilogramos';
  const powderCost = powderMat ? powderMat.avgCost : 0;

  const b1Mat = materials.find((m) => m.code === 'BOTELLA_1L' || m.name.toLowerCase().includes('1 litro') || m.name.toLowerCase().includes('1l'));
  const b1Stock = b1Mat ? b1Mat.currentStock : 0;
  const b1Cost = b1Mat ? b1Mat.avgCost : 0;

  const b2Mat = materials.find((m) => m.code === 'BOTELLA_2L' || m.name.toLowerCase().includes('2 litro') || m.name.toLowerCase().includes('2l'));
  const b2Stock = b2Mat ? b2Mat.currentStock : 0;
  const b2Cost = b2Mat ? b2Mat.avgCost : 0;

  const labelMat = materials.find((m) => m.code === 'ETIQUETA' || m.name.toLowerCase().includes('etiqueta'));
  const labelStock = labelMat ? labelMat.currentStock : 0;
  const labelCost = labelMat ? labelMat.avgCost : 0;
  const hasLabelStock = labelStock > 0;

  const extraOptions = materials.filter(
    (m) => m.id !== milkMat?.id && m.id !== sugarMat?.id && m.id !== powderMat?.id && m.id !== b1Mat?.id && m.id !== b2Mat?.id && m.id !== labelMat?.id
  );

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 560px;">
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

            <!-- Cantidad de Leche Usada (Descuento de Stock) -->
            <div class="form-group" style="background: #F0F9FF; border: 1.5px solid #BAE6FD; padding: 12px 14px; border-radius: var(--radius-md); margin-bottom: 12px;">
              <label class="form-label" style="color: #0369A1; font-weight: 800; font-size: 0.92rem;">
                🥛 Litros de Leche Invertidos (Se descontarán del inventario) *
              </label>
              <input type="number" id="batchMilkLiters" class="form-input" min="0.5" step="0.1" placeholder="Ej: 10" required style="font-size: 1.05rem; font-weight: 700;" />
              <div id="milkStockHint" style="font-size: 0.78rem; margin-top: 5px; font-weight: 700; color: ${milkStock > 0 ? 'var(--text-muted)' : 'var(--danger)'};">
                🥛 Stock disponible: <strong>${milkStock} L</strong> • Costo promedio: ${formatCOP(milkCost)}/L
              </div>
            </div>

            <!-- Cantidad Real de Yogur Salido (Rendimiento) -->
            <div class="form-group" style="background: #FAF5FF; border: 1.5px solid #DDD6FE; padding: 12px 14px; border-radius: var(--radius-md); margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <label class="form-label" style="color: var(--primary); font-weight: 800; font-size: 0.92rem; margin: 0;">
                  🍶 Litros de Yogur Salidos / Obtenidos (Rendimiento Final) *
                </label>
                <button type="button" id="btnSyncWithBottles" class="btn btn-outline btn-sm" style="padding: 2px 8px; font-size: 0.72rem; font-weight: 700; color: var(--primary); border-color: var(--primary);" title="Calcular automáticamente a partir de las botellas envasadas">
                  🔄 Igualar a botellas
                </button>
              </div>
              <input type="number" id="batchTotalProducedLiters" class="form-input" min="0.1" step="0.1" placeholder="Ej: 11.5" required style="font-size: 1.05rem; font-weight: 700; color: var(--primary);" />
              <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 4px;">
                💡 <em>Indica cuántos litros reales salieron del lote (suelen salir más litros que los invertidos por la adición de azúcar, leche en polvo, frutas y fermento).</em>
              </div>
            </div>

            <!-- Botellas Envasadas (Opcional o Desglose de Envases) -->
            <div class="form-row" style="margin-bottom: 12px;">
              <div class="form-group">
                <label class="form-label">🍾 Botellas 1 Litro Envasadas</label>
                <input type="number" id="batchBottles1L" class="form-input" min="0" value="0" />
                <div id="b1StockHint" style="font-size: 0.75rem; margin-top: 3px; font-weight: 700; color: ${b1Stock > 0 ? 'var(--text-muted)' : 'var(--danger)'};">
                  🍾 Stock 1L: <strong>${b1Stock} und</strong> ${b1Stock <= 0 ? '⚠️' : ''}
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">🍾 Botellas 2 Litros Envasadas</label>
                <input type="number" id="batchBottles2L" class="form-input" min="0" value="0" />
                <div id="b2StockHint" style="font-size: 0.75rem; margin-top: 3px; font-weight: 700; color: ${b2Stock > 0 ? 'var(--text-muted)' : 'var(--danger)'};">
                  🍾 Stock 2L: <strong>${b2Stock} und</strong> ${b2Stock <= 0 ? '⚠️' : ''}
                </div>
              </div>
            </div>

            <!-- Receta Estándar Automática (Azúcar y Leche en Polvo por Gramos) -->
            <div style="background: var(--bg-app); border: 1.5px solid var(--border-color); padding: 12px 14px; border-radius: var(--radius-md); margin-bottom: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div style="font-size: 0.88rem; font-weight: 800; color: var(--primary);">
                  🥣 Receta e Insumos por Litro de Leche (g / L)
                </div>
                <span style="font-size: 0.74rem; color: var(--text-muted); font-weight: 700;">Calculado sobre leche</span>
              </div>

              <!-- Azúcar: g / Litro -->
              <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 10px; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 700; color: var(--text-main); margin: 0; cursor: pointer;">
                    <input type="checkbox" id="batchUseSugar" checked style="width: 16px; height: 16px; cursor: pointer;" />
                    <span>🍬 Azúcar</span>
                  </label>
                  
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <input type="number" id="batchSugarGramsPerL" class="form-input" min="0" step="5" value="80" style="width: 75px; padding: 4px 8px; font-size: 0.85rem; text-align: center; font-weight: 800; color: var(--primary);" title="Gramos de azúcar por cada litro de leche" />
                    <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">g / L</span>
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.76rem; color: var(--text-muted); margin-top: 6px; padding-top: 4px; border-top: 1px dashed var(--border-subtle);">
                  <span id="sugarCalcText">Consumo: 0 g</span>
                  <strong id="sugarCostBadge" style="color: var(--primary);">$0 COP</strong>
                </div>
                <div id="sugarStockHint" style="font-size: 0.74rem; margin-top: 3px; color: var(--text-muted);">
                  ${sugarMat ? `Stock disponible: <strong>${sugarStock} ${sugarUnit}</strong> (${formatCOP(sugarCost)}/kg)` : '⚠️ Insumo Azúcar no registrado'}
                </div>
              </div>

              <!-- Leche en Polvo: g / Litro -->
              <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 10px; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 700; color: var(--text-main); margin: 0; cursor: pointer;">
                    <input type="checkbox" id="batchUsePowder" checked style="width: 16px; height: 16px; cursor: pointer;" />
                    <span>🥛 Leche en Polvo</span>
                  </label>
                  
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <input type="number" id="batchPowderGramsPerL" class="form-input" min="0" step="5" value="30" style="width: 75px; padding: 4px 8px; font-size: 0.85rem; text-align: center; font-weight: 800; color: var(--primary);" title="Gramos de leche en polvo por cada litro de leche" />
                    <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">g / L</span>
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.76rem; color: var(--text-muted); margin-top: 6px; padding-top: 4px; border-top: 1px dashed var(--border-subtle);">
                  <span id="powderCalcText">Consumo: 0 g</span>
                  <strong id="powderCostBadge" style="color: var(--primary);">$0 COP</strong>
                </div>
                <div id="powderStockHint" style="font-size: 0.74rem; margin-top: 3px; color: var(--text-muted);">
                  ${powderMat ? `Stock disponible: <strong>${powderStock} ${powderUnit}</strong> (${formatCOP(powderCost)}/kg)` : '⚠️ Insumo Leche en Polvo no registrado'}
                </div>
              </div>

              <!-- Insumos Adicionales: Botón Base y Botón Compuesto -->
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                  <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-main);">🥣 Insumos Adicionales:</span>
                  <div style="display: flex; gap: 6px;">
                    <button type="button" class="btn btn-outline btn-sm" id="btnAddBaseExtra" style="padding: 4px 8px; font-size: 0.76rem; font-weight: 700; color: #0369A1; border-color: #BAE6FD; background: #F0F9FF;" title="Insumo calculado por cada litro de leche cruda invertida">
                      🥛 + Insumo Base (g/L leche)
                    </button>
                    <button type="button" class="btn btn-outline btn-sm" id="btnAddCompoundExtra" style="padding: 4px 8px; font-size: 0.76rem; font-weight: 700; color: var(--primary); border-color: #DDD6FE; background: #FAF5FF;" title="Insumo compuesto, fruta o mermelada calculado por cada litro de yogur final producido">
                      🍓 + Insumo Compuesto (g/L yogur)
                    </button>
                  </div>
                </div>
                <div id="extraContainer" style="display: flex; flex-direction: column; gap: 8px;">
                  <div id="extraRowsList"></div>
                </div>
              </div>

            </div>

            <!-- Control Opcional de Etiquetas Adhesivas -->
            <div style="background: var(--bg-app); border: 1.5px solid var(--border-color); padding: 10px 12px; border-radius: var(--radius-md); margin-bottom: 14px;">
              <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 700; color: var(--text-main); cursor: pointer; margin: 0;">
                <input type="checkbox" id="batchUseLabels" ${hasLabelStock ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer;" />
                <span>🏷️ Aplicar y descontar etiquetas adhesivas (Opcional)</span>
              </label>
              <div id="labelStockAlert" style="font-size: 0.76rem; margin-top: 4px; margin-left: 24px; color: ${hasLabelStock ? 'var(--text-muted)' : '#b78103'};">
                ${hasLabelStock ? `Stock disponible: <strong>${labelStock} und</strong>` : '⚠️ No tienes etiquetas registradas en inventario (se omitirá)'}
              </div>
            </div>

            <!-- Precios de Venta de este Lote -->
            <div style="background: #FAF5FF; border: 1.5px solid #DDD6FE; padding: 12px 14px; border-radius: var(--radius-md); margin-bottom: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 0.88rem; font-weight: 800; color: var(--primary);">
                  💲 Precios de Venta para este Lote
                </span>
                <span style="font-size: 0.74rem; color: var(--text-muted); font-weight: 700;">Configurable por lote</span>
              </div>
              <div class="form-row" style="margin-bottom: 0;">
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label">Precio Botella 1L ($ COP) *</label>
                  <input type="number" id="batchPrice1L" class="form-input" min="0" step="500" value="10000" required style="font-weight: 800; color: var(--primary);" />
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label">Precio Botella 2L ($ COP) *</label>
                  <input type="number" id="batchPrice2L" class="form-input" min="0" step="500" value="20000" required style="font-weight: 800; color: var(--primary);" />
                </div>
              </div>
              <div id="batchMarginPreview" style="font-size: 0.78rem; color: var(--text-muted); margin-top: 6px; font-weight: 600;">
                Margen proyectado: 1L (~$0) • 2L (~$0)
              </div>
            </div>

            <!-- Resumen de Costeo y Descuento en Tiempo Real -->
            <div style="background: #FFFFFF; border: 2px solid var(--border-color); padding: 14px; border-radius: var(--radius-md); margin-bottom: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-main);">Yogur Obtenido / Salido:</span>
                <strong id="batchTotalResultLiters" style="font-size: 1.15rem; color: var(--primary);">0 Litros</strong>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-main);">Rendimiento Obtenido:</span>
                <strong id="batchYieldDisplay" style="font-size: 1.1rem; color: var(--success);">0%</strong>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--border-subtle);">
                <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-main);">Costo Real por Litro Producido:</span>
                <strong id="batchCostPerLiterDisplay" style="font-size: 1.15rem; color: #b78103;">$0 COP / L</strong>
              </div>

              <div style="font-size: 0.8rem; color: var(--text-muted);">
                <div style="font-weight: 700; color: var(--primary); margin-bottom: 4px;">📦 Desglose que se descontará del inventario:</div>
                <div id="autoDeductSummary">
                  • 🥛 Leche líquida: <span id="summaryMilk">0 L</span><br>
                  • 🍬 Azúcar: <span id="summarySugar">0 g</span><br>
                  • 🥛 Leche en Polvo: <span id="summaryPowder">0 g</span><br>
                  <span id="summaryExtras"></span>
                  • 🍾 Botellas 1L: <span id="summaryB1">0 und</span><br>
                  • 🍾 Botellas 2L: <span id="summaryB2">0 und</span><br>
                  • 🏷️ Etiquetas: <span id="summaryLabels">Omitido</span>
                </div>
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
  const totalProducedInput = document.getElementById('batchTotalProducedLiters');
  const b1Input = document.getElementById('batchBottles1L');
  const b2Input = document.getElementById('batchBottles2L');
  const btnSyncWithBottles = document.getElementById('btnSyncWithBottles');
  
  const useSugarCheckbox = document.getElementById('batchUseSugar');
  const sugarGplInput = document.getElementById('batchSugarGramsPerL');
  const sugarCalcText = document.getElementById('sugarCalcText');
  const sugarCostBadge = document.getElementById('sugarCostBadge');

  const usePowderCheckbox = document.getElementById('batchUsePowder');
  const powderGplInput = document.getElementById('batchPowderGramsPerL');
  const powderCalcText = document.getElementById('powderCalcText');
  const powderCostBadge = document.getElementById('powderCostBadge');

  const useLabelsCheckbox = document.getElementById('batchUseLabels');

  const totalResult = document.getElementById('batchTotalResultLiters');
  const yieldDisplay = document.getElementById('batchYieldDisplay');
  const costPerLiterDisplay = document.getElementById('batchCostPerLiterDisplay');

  const summaryMilk = document.getElementById('summaryMilk');
  const summarySugar = document.getElementById('summarySugar');
  const summaryPowder = document.getElementById('summaryPowder');
  const summaryB1 = document.getElementById('summaryB1');
  const summaryB2 = document.getElementById('summaryB2');
  const summaryLabels = document.getElementById('summaryLabels');

  const milkStockHint = document.getElementById('milkStockHint');
  const sugarStockHint = document.getElementById('sugarStockHint');
  const powderStockHint = document.getElementById('powderStockHint');
  const b1StockHint = document.getElementById('b1StockHint');
  const b2StockHint = document.getElementById('b2StockHint');

  let hasManuallySetProduced = false;

  btnSyncWithBottles?.addEventListener('click', () => {
    const b1 = Number(b1Input.value) || 0;
    const b2 = Number(b2Input.value) || 0;
    const bottlesTotal = b1 * 1 + b2 * 2;
    totalProducedInput.value = bottlesTotal > 0 ? bottlesTotal : '';
    hasManuallySetProduced = true;
    updateCalculations();
  });

  const updateCalculations = () => {
    const milk = Number(milkInput.value) || 0;
    const b1 = Number(b1Input.value) || 0;
    const b2 = Number(b2Input.value) || 0;
    const bottlesLitros = b1 * 1 + b2 * 2;
    const totalBotellas = b1 + b2;

    // Si el usuario no ha puesto un valor manual para los litros que salieron, sugerir a partir de botellas o leche
    if (!hasManuallySetProduced) {
      if (bottlesLitros > 0) {
        totalProducedInput.value = bottlesLitros;
      } else if (milk > 0 && !totalProducedInput.value) {
        totalProducedInput.value = milk;
      }
    }

    const totalLitrosObtenidos = Number(totalProducedInput.value) || (bottlesLitros > 0 ? bottlesLitros : milk);

    const useSugar = useSugarCheckbox.checked;
    const sugarGpl = Number(sugarGplInput.value) || 0;
    const usePowder = usePowderCheckbox.checked;
    const powderGpl = Number(powderGplInput.value) || 0;
    const useLabels = useLabelsCheckbox.checked;

    // Gramos requeridos calculados por los g/L configurados sobre la leche usada
    const sugarGrams = useSugar ? milk * sugarGpl : 0;
    const sugarKg = sugarGrams / 1000;
    const powderGrams = usePowder ? milk * powderGpl : 0;
    const powderKg = powderGrams / 1000;

    // Cálculo de costos estimados
    let totalBatchCost = 0;

    // 1. Costo Leche
    const totalMilkCost = milk * milkCost;
    totalBatchCost += totalMilkCost;

    // 2. Costo Azúcar (calculado por gramo / kg)
    const isSugarInKg = sugarUnit.toLowerCase().includes('k');
    const sugarUnitCostPerGram = isSugarInKg ? sugarCost / 1000 : sugarCost;
    const totalSugarCost = sugarGrams * sugarUnitCostPerGram;
    if (useSugar) totalBatchCost += totalSugarCost;

    sugarCalcText.textContent = useSugar ? `Consumo: ${sugarGrams} g (${sugarKg.toFixed(2)} kg) • ${sugarGpl} g/L leche` : 'Desactivado';
    sugarCostBadge.textContent = useSugar ? `+${formatCOP(Math.round(totalSugarCost))}` : '$0 COP';

    // 3. Costo Leche en Polvo (calculado por gramo / kg)
    const isPowderInKg = powderUnit.toLowerCase().includes('k');
    const powderUnitCostPerGram = isPowderInKg ? powderCost / 1000 : powderCost;
    const totalPowderCost = powderGrams * powderUnitCostPerGram;
    if (usePowder) totalBatchCost += totalPowderCost;

    powderCalcText.textContent = usePowder ? `Consumo: ${powderGrams} g (${powderKg.toFixed(2)} kg) • ${powderGpl} g/L leche` : 'Desactivado';
    powderCostBadge.textContent = usePowder ? `+${formatCOP(Math.round(totalPowderCost))}` : '$0 COP';

    // 4. Costo Botellas 1L y 2L
    const totalB1Cost = b1 * b1Cost;
    const totalB2Cost = b2 * b2Cost;
    totalBatchCost += totalB1Cost + totalB2Cost;

    // 5. Costo Etiquetas
    if (useLabels && hasLabelStock) {
      totalBatchCost += totalBotellas * labelCost;
    }

    // 6. Costo Insumos Extras (Base y Compuestos)
    let extraSummaryHtml = '';
    document.querySelectorAll('.extra-mat-row').forEach((row) => {
      const basis = row.dataset.basis || 'produced'; // 'milk' or 'produced'
      const isBase = basis === 'milk';
      const select = row.querySelector('.extra-select');
      const gpl = Number(row.querySelector('.extra-gpl')?.value) || 0;
      const calcSpan = row.querySelector('.extra-calc-hint');
      const costSpan = row.querySelector('.extra-cost-hint');

      const opt = select?.selectedOptions[0];
      const cost = Number(opt?.dataset?.cost || 0);
      const matName = opt?.textContent || 'Insumo';
      const matUnit = (opt?.dataset?.unit || '').toLowerCase();

      const litersBase = isBase ? milk : totalLitrosObtenidos;
      const basisLabel = isBase ? `leche (${milk}L)` : `yogur prod. (${totalLitrosObtenidos}L)`;
      const icon = isBase ? '🥛' : '🍓';

      const itemGrams = litersBase * gpl;
      const itemKg = itemGrams / 1000;

      let itemCost = 0;
      if (matUnit.includes('k')) {
        itemCost = itemKg * cost;
        if (calcSpan) calcSpan.textContent = `Consumo: ${itemGrams.toFixed(1)} g (${itemKg.toFixed(2)} kg) • ${gpl} g / L ${basisLabel}`;
      } else {
        itemCost = itemGrams * cost;
        if (calcSpan) calcSpan.textContent = `Consumo: ${itemGrams.toFixed(1)} ${matUnit} • ${gpl} / L ${basisLabel}`;
      }

      if (costSpan) costSpan.textContent = `+${formatCOP(Math.round(itemCost))}`;
      totalBatchCost += itemCost;

      if (gpl > 0) {
        extraSummaryHtml += `• ${icon} ${matName.split('(')[0].trim()}: <strong>${itemGrams.toFixed(1)} g</strong> (${formatCOP(Math.round(itemCost))}) <small style="color: ${isBase ? '#0369A1' : 'var(--primary)'}; font-weight: 700;">• sobre ${litersBase}L ${isBase ? 'leche' : 'prod.'}</small><br>`;
      }
    });

    const summaryExtras = document.getElementById('summaryExtras');
    if (summaryExtras) {
      summaryExtras.innerHTML = extraSummaryHtml;
    }

    // Actualizar resultados en pantalla basados en los litros que salieron
    totalResult.textContent = `${totalLitrosObtenidos} Litros de Yogur`;
    const costPerLiter = totalLitrosObtenidos > 0 ? Math.round(totalBatchCost / totalLitrosObtenidos) : (milk > 0 ? Math.round(totalBatchCost / milk) : 0);
    costPerLiterDisplay.textContent = `${formatCOP(costPerLiter)} / L (Inversión total: ${formatCOP(Math.round(totalBatchCost))})`;

    // Hint dinámico de leche
    if (milkStock <= 0) {
      milkStockHint.innerHTML = `⚠️ <strong style="color: var(--danger);">No tienes leche registrada en inventario</strong> (Stock: 0 L)`;
    } else if (milk > milkStock) {
      milkStockHint.innerHTML = `⚠️ <strong style="color: var(--danger);">Stock insuficiente</strong>: Tienes ${milkStock} L e intentas usar ${milk} L`;
    } else {
      milkStockHint.innerHTML = `🥛 Stock disponible: <strong>${milkStock} L</strong> • Costo: ${formatCOP(milkCost)}/L (Se descontarán exactamente ${milk} L)`;
    }

    // Hint dinámico de azúcar
    if (useSugar && sugarMat) {
      const sugarNeededStock = isSugarInKg ? sugarKg : sugarGrams;
      if (sugarStock < sugarNeededStock) {
        sugarStockHint.innerHTML = `⚠️ <strong style="color: var(--danger);">Stock insuficiente de azúcar</strong>: Tienes ${sugarStock} ${sugarUnit} y requieres ${sugarGrams} g (${sugarKg.toFixed(2)} kg)`;
      } else {
        sugarStockHint.innerHTML = `Stock disponible: <strong>${sugarStock} ${sugarUnit}</strong>`;
      }
    } else if (!useSugar) {
      sugarStockHint.innerHTML = `<em>Desactivado para este lote</em>`;
    }

    // Hint dinámico de leche en polvo
    if (usePowder && powderMat) {
      const powderNeededStock = isPowderInKg ? powderKg : powderGrams;
      if (powderStock < powderNeededStock) {
        powderStockHint.innerHTML = `⚠️ <strong style="color: var(--danger);">Stock insuficiente de leche en polvo</strong>: Tienes ${powderStock} ${powderUnit} y requieres ${powderGrams} g (${powderKg.toFixed(2)} kg)`;
      } else {
        powderStockHint.innerHTML = `Stock disponible: <strong>${powderStock} ${powderUnit}</strong>`;
      }
    } else if (!usePowder) {
      powderStockHint.innerHTML = `<em>Desactivado para este lote</em>`;
    }

    // Hints de botellas
    if (b1 > b1Stock) {
      b1StockHint.innerHTML = `⚠️ <strong style="color: var(--danger);">Insuficiente</strong>: Stock ${b1Stock} und`;
    } else {
      b1StockHint.innerHTML = `🍾 Stock 1L: <strong>${b1Stock} und</strong>`;
    }

    if (b2 > b2Stock) {
      b2StockHint.innerHTML = `⚠️ <strong style="color: var(--danger);">Insuficiente</strong>: Stock ${b2Stock} und`;
    } else {
      b2StockHint.innerHTML = `🍾 Stock 2L: <strong>${b2Stock} und</strong>`;
    }

    // Desglose de insumos en caja
    summaryMilk.innerHTML = `<strong>${milk} L</strong> (${formatCOP(totalMilkCost)}) <small style="color: #0369A1; font-weight: 700;">• Exacto de stock</small>`;
    summarySugar.innerHTML = useSugar ? `<strong>${sugarGrams} g (${sugarKg.toFixed(2)} kg)</strong> (${formatCOP(Math.round(totalSugarCost))})` : `<em>Omitido</em>`;
    summaryPowder.innerHTML = usePowder ? `<strong>${powderGrams} g (${powderKg.toFixed(2)} kg)</strong> (${formatCOP(Math.round(totalPowderCost))})` : `<em>Omitido</em>`;
    summaryB1.innerHTML = `<strong>${b1} und</strong> (${formatCOP(totalB1Cost)})`;
    summaryB2.innerHTML = `<strong>${b2} und</strong> (${formatCOP(totalB2Cost)})`;
    
    if (useLabels && hasLabelStock) {
      summaryLabels.innerHTML = `<strong>${totalBotellas} und</strong>`;
    } else {
      summaryLabels.innerHTML = `<em>Omitido</em>`;
    }

    if (milk > 0) {
      const pct = Math.round((totalLitrosObtenidos / milk) * 100);
      const diff = totalLitrosObtenidos - milk;
      if (diff > 0) {
        yieldDisplay.innerHTML = `${pct}% <span style="font-size: 0.8rem; color: var(--success); font-weight: 800;">(+${diff.toFixed(1)} L extra 🎉)</span>`;
      } else {
        yieldDisplay.textContent = `${pct}%`;
      }
      yieldDisplay.style.color = pct >= 85 ? 'var(--success)' : 'var(--warning)';
    } else {
      yieldDisplay.textContent = '0%';
    }

    // Margen de ganancia proyectado por botella
    const price1L = Number(document.getElementById('batchPrice1L')?.value) || 10000;
    const price2L = Number(document.getElementById('batchPrice2L')?.value) || 20000;
    const marginPreview = document.getElementById('batchMarginPreview');
    if (marginPreview) {
      const margin1 = price1L - costPerLiter;
      const margin2 = price2L - (costPerLiter * 2);
      const m1Pct = price1L > 0 ? Math.round((margin1 / price1L) * 100) : 0;
      const m2Pct = price2L > 0 ? Math.round((margin2 / price2L) * 100) : 0;
      marginPreview.innerHTML = `Ganancia estimada: 1L: <strong style="color: ${margin1 >= 0 ? 'var(--success)' : 'var(--danger)'};">${formatCOP(Math.round(margin1))} (${m1Pct}%)</strong> • 2L: <strong style="color: ${margin2 >= 0 ? 'var(--success)' : 'var(--danger)'};">${formatCOP(Math.round(margin2))} (${m2Pct}%)</strong>`;
    }
  };

  milkInput?.addEventListener('input', () => {
    updateCalculations();
  });

  totalProducedInput?.addEventListener('input', () => {
    hasManuallySetProduced = true;
    updateCalculations();
  });

  b1Input?.addEventListener('input', () => {
    if (!hasManuallySetProduced) {
      const b1 = Number(b1Input.value) || 0;
      const b2 = Number(b2Input.value) || 0;
      if (b1 * 1 + b2 * 2 > 0) {
        totalProducedInput.value = b1 * 1 + b2 * 2;
      }
    }
    updateCalculations();
  });

  b2Input?.addEventListener('input', () => {
    if (!hasManuallySetProduced) {
      const b1 = Number(b1Input.value) || 0;
      const b2 = Number(b2Input.value) || 0;
      if (b1 * 1 + b2 * 2 > 0) {
        totalProducedInput.value = b1 * 1 + b2 * 2;
      }
    }
    updateCalculations();
  });
  
  useSugarCheckbox?.addEventListener('change', updateCalculations);
  sugarGplInput?.addEventListener('input', updateCalculations);

  usePowderCheckbox?.addEventListener('change', updateCalculations);
  powderGplInput?.addEventListener('input', updateCalculations);

  useLabelsCheckbox?.addEventListener('change', updateCalculations);

  document.getElementById('batchPrice1L')?.addEventListener('input', updateCalculations);
  document.getElementById('batchPrice2L')?.addEventListener('input', updateCalculations);

  updateCalculations();

  // Función para agregar filas dinámicas (Base o Compuesto)
  const extraContainer = document.getElementById('extraContainer');
  const extraRowsList = document.getElementById('extraRowsList');
  const modalBody = modalOverlay.querySelector('.modal-body');

  const addExtraRow = (basis = 'produced') => {
    extraContainer.style.display = 'flex';
    const isBase = basis === 'milk';
    const row = document.createElement('div');
    row.className = 'extra-mat-row';
    row.dataset.basis = basis;
    row.style.cssText = `background: ${isBase ? '#F0F9FF' : '#FAF5FF'}; border: 1.5px solid ${isBase ? '#BAE6FD' : '#DDD6FE'}; border-radius: var(--radius-sm); padding: 8px 10px; margin-bottom: 6px; display: flex; flex-direction: column; gap: 6px;`;
    row.innerHTML = `
      <div style="display: flex; gap: 6px; align-items: center;">
        <span style="font-size: 0.72rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: ${isBase ? '#0369A1' : 'var(--primary)'}; color: white; white-space: nowrap;">
          ${isBase ? '🥛 Base (Leche)' : '🍓 Compuesto (Yogur)'}
        </span>
        <select class="form-select extra-select" style="flex: 2; font-size: 0.84rem; padding: 4px 8px;">
          ${extraOptions.map((m) => `<option value="${m.id}" data-cost="${m.avgCost}" data-unit="${m.unit}">${m.name} (${m.unit})</option>`).join('')}
        </select>
        
        <div style="display: flex; align-items: center; gap: 4px;">
          <input type="number" class="form-input extra-gpl" min="0" step="5" value="50" placeholder="g/L" style="width: 65px; padding: 4px 6px; font-size: 0.84rem; text-align: center; font-weight: 800; color: ${isBase ? '#0369A1' : 'var(--primary)'};" title="Gramos por cada litro ${isBase ? 'de leche invertida' : 'de yogur obtenido'}" />
          <span style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted);">${isBase ? 'g/L leche' : 'g/L prod.'}</span>
        </div>

        <button type="button" class="btn btn-outline btn-sm" style="color: var(--danger); padding: 4px 8px;" onclick="this.closest('.extra-mat-row').remove(); document.getElementById('batchMilkLiters').dispatchEvent(new Event('input'));">✕</button>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-muted);">
        <span class="extra-calc-hint">Consumo: 0 g</span>
        <strong class="extra-cost-hint" style="color: ${isBase ? '#0369A1' : 'var(--primary)'};">$0 COP</strong>
      </div>
    `;
    
    row.querySelector('.extra-gpl')?.addEventListener('input', updateCalculations);
    row.querySelector('.extra-select')?.addEventListener('change', updateCalculations);

    extraRowsList.appendChild(row);
    updateCalculations();

    if (modalBody) {
      setTimeout(() => {
        modalBody.scrollTo({ top: modalBody.scrollHeight, behavior: 'smooth' });
      }, 50);
    }
  };

  document.getElementById('btnAddBaseExtra')?.addEventListener('click', () => addExtraRow('milk'));
  document.getElementById('btnAddCompoundExtra')?.addEventListener('click', () => addExtraRow('produced'));

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseBatchModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelBatchModal')?.addEventListener('click', closeModal);

  document.getElementById('newBatchForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const milkUsed = Number(milkInput.value);
    const totalProduced = Number(totalProducedInput.value) || milkUsed;
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

    // Recoger insumos extras calculando cada uno por su base correspondiente (leche o yogur producido)
    const extraItems = [];
    document.querySelectorAll('.extra-mat-row').forEach((row) => {
      const basis = row.dataset.basis || 'produced';
      const matId = Number(row.querySelector('.extra-select')?.value);
      const gpl = Number(row.querySelector('.extra-gpl')?.value) || 0;
      const litersBase = basis === 'milk' ? milkUsed : totalProduced;
      const totalGrams = gpl * litersBase;
      if (matId && totalGrams > 0) {
        extraItems.push({
          rawMaterialId: matId,
          quantityUsed: totalGrams,
          unit: 'g',
          gramsPerLiter: gpl,
        });
      }
    });

    const payload = {
      milkUsedLiters: milkUsed,
      totalLitersProduced: totalProduced,
      bottles1LProduced: b1,
      bottles2LProduced: b2,
      price1L: Number(document.getElementById('batchPrice1L')?.value) || 10000,
      price2L: Number(document.getElementById('batchPrice2L')?.value) || 20000,
      useSugar: useSugarCheckbox.checked,
      sugarGramsPerLiter: Number(sugarGplInput.value) || 0,
      usePowderedMilk: usePowderCheckbox.checked,
      powderedMilkGramsPerLiter: Number(powderGplInput.value) || 0,
      useLabels: useLabelsCheckbox.checked,
      flavor: document.getElementById('batchFlavor').value,
      preparationDate: document.getElementById('batchDate').value,
      notes: document.getElementById('batchNotes').value,
      registeredBy: store.currentUser,
      extraItems,
    };

    try {
      const res = await api.createBatch(payload);
      showToast(`¡Lote ${res.batchCode} registrado con éxito! Salieron ${res.totalLitersProduced}L (Rendimiento: ${res.yieldPercentage}%) 🍶`);
      closeModal();
      renderBatches(document.getElementById('contentContainer'));
    } catch (err) {
      showToast(err.message || 'Error al registrar lote', 'danger');
    }
  });
}

// Helper para obtener icono representativo según el insumo
function getBatchItemIcon(name = '', code = '') {
  const n = (name || '').toLowerCase();
  const c = (code || '').toLowerCase();
  if (c === 'leche' || (n.includes('leche') && !n.includes('polvo'))) return '🥛';
  if (c.includes('azucar') || n.includes('azucar') || n.includes('azúcar')) return '🍬';
  if (n.includes('polvo')) return '🥛';
  if (n.includes('fresa') || n.includes('mora') || n.includes('fruta') || n.includes('melocoton') || n.includes('durazno') || n.includes('maracuya')) return '🍓';
  if (c.includes('botella') || n.includes('botella') || n.includes('envase') || n.includes('1l') || n.includes('2l')) return '🍾';
  if (c.includes('etiqueta') || n.includes('etiqueta')) return '🏷️';
  return '🥣';
}

// Modal de resumen completo de lote
async function openBatchDetailModal(batchId) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  try {
    const batch = await api.getBatchById(batchId);
    const hasExtraYield = batch.totalLitersProduced > batch.milkUsedLiters;
    const p1 = batch.price1L || 10000;
    const p2 = batch.price2L || 20000;

    let statusBadge = '<span class="badge badge-paid">✅ Activo / Disponible</span>';
    if (!batch.isActive) {
      statusBadge = '<span class="badge badge-pending">🚫 Desactivado</span>';
    } else if (batch.status === 'AGOTADO') {
      statusBadge = '<span class="badge" style="background: #FEF3C7; color: #92400E; border: 1px solid #FCD34D; font-weight: 800;">📦 Agotado (Todo Vendido)</span>';
    } else if (batch.status === 'DESCARTADO') {
      statusBadge = '<span class="badge" style="background: #FEE2E2; color: #DC2626; border: 1px solid #FCA5A5; font-weight: 800;">🚫 Baja</span>';
    }

    const linkedOrders = batch.orders || [];
    const totalSoldLiters = linkedOrders.reduce((sum, o) => sum + (o.totalLiters || 0), 0);
    const totalSoldBottles = linkedOrders.reduce((sum, o) => sum + (o.quantityBottles || 0), 0);
    const totalSoldAmount = linkedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    modalOverlay.innerHTML = `
      <div class="modal-overlay active">
        <div class="modal-card" style="max-width: 680px;">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <h3 class="modal-title">🍶 Resumen de Lote: ${batch.batchCode}</h3>
              ${statusBadge}
            </div>
            <button class="modal-close-btn" id="btnCloseBatchDetailModal">✕</button>
          </div>
          <div class="modal-body">
            
            <!-- Tarjetas de Estadísticas Principales del Lote -->
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 14px;">
              <div class="order-card" style="padding: 12px 14px; background: #F0F9FF; border: 1.5px solid #BAE6FD;">
                <span style="font-size: 0.74rem; color: #0369A1; font-weight: 700; text-transform: uppercase;">🥛 Leche Invertida</span>
                <div style="font-size: 1.45rem; font-weight: 800; color: #0369A1;">${batch.milkUsedLiters} Litros</div>
                <small style="color: var(--text-muted); font-weight: 600;">Descontados de stock de leche</small>
              </div>

              <div class="order-card" style="padding: 12px 14px; background: #FAF5FF; border: 1.5px solid #DDD6FE;">
                <span style="font-size: 0.74rem; color: var(--primary); font-weight: 700; text-transform: uppercase;">🍶 Yogur Salido / Obtenido</span>
                <div style="font-size: 1.45rem; font-weight: 800; color: var(--primary);">${batch.totalLitersProduced} Litros</div>
                <small style="color: var(--text-muted); font-weight: 600;">
                  ${batch.bottles1LProduced > 0 ? `${batch.bottles1LProduced} de 1L` : ''}
                  ${batch.bottles1LProduced > 0 && batch.bottles2LProduced > 0 ? ' • ' : ''}
                  ${batch.bottles2LProduced > 0 ? `${batch.bottles2LProduced} de 2L` : ''}
                  ${batch.bottles1LProduced === 0 && batch.bottles2LProduced === 0 ? 'Envasado a granel' : ''}
                </small>
              </div>

              <div class="order-card" style="padding: 12px 14px; background: var(--bg-app); border: 1px solid var(--border-color);">
                <span style="font-size: 0.74rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">📈 Rendimiento Real</span>
                <div style="font-size: 1.45rem; font-weight: 800; color: var(--success);">${batch.yieldPercentage}%</div>
                <small style="color: var(--text-muted); font-weight: 600;">
                  ${hasExtraYield ? `+${(batch.totalLitersProduced - batch.milkUsedLiters).toFixed(1)} L extra por insumos 🎉` : 'Rendimiento estándar'}
                </small>
              </div>

              <div class="order-card" style="padding: 12px 14px; background: var(--bg-app); border: 1px solid var(--border-color);">
                <span style="font-size: 0.74rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">💰 Costo Real / L Producido</span>
                <div style="font-size: 1.35rem; font-weight: 800; color: #b78103;">${formatCOP(batch.costPerLiter)} / L</div>
                <small style="color: var(--text-muted); font-weight: 600;">Inversión total: ${formatCOP(batch.totalCost)}</small>
              </div>
            </div>

            <!-- Precios de Venta Establecidos para este Lote -->
            <div style="background: #FAF5FF; border: 1.5px solid #DDD6FE; padding: 12px 14px; border-radius: var(--radius-md); margin-bottom: 14px; display: flex; justify-content: space-around; align-items: center; text-align: center;">
              <div>
                <span style="font-size: 0.74rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">💲 Precio Venta Botella 1L</span>
                <div style="font-size: 1.25rem; font-weight: 800; color: var(--primary);">${formatCOP(p1)}</div>
                <small style="color: var(--success); font-weight: 700;">Margen: ~${formatCOP(Math.max(0, p1 - batch.costPerLiter))}</small>
              </div>
              <div style="width: 1px; height: 35px; background: #DDD6FE;"></div>
              <div>
                <span style="font-size: 0.74rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">💲 Precio Venta Botella 2L</span>
                <div style="font-size: 1.25rem; font-weight: 800; color: var(--primary);">${formatCOP(p2)}</div>
                <small style="color: var(--success); font-weight: 700;">Margen: ~${formatCOP(Math.max(0, p2 - (batch.costPerLiter * 2)))}</small>
              </div>
            </div>

            <!-- Resumen de Ventas Vinculadas a este Lote -->
            <div style="background: #FFFFFF; border: 1.5px solid var(--border-color); border-radius: var(--radius-md); padding: 12px 14px; margin-bottom: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h4 style="font-size: 0.92rem; font-weight: 800; color: var(--primary); margin: 0;">
                  🛒 Despacho y Ventas de este Lote (${linkedOrders.length})
                </h4>
                <span style="font-size: 0.8rem; font-weight: 700; color: var(--primary);">
                  ${totalSoldLiters}L vendidos (${totalSoldBottles} botellas) • Recaudado: ${formatCOP(totalSoldAmount)}
                </span>
              </div>

              ${
                linkedOrders.length > 0
                  ? `
                <div style="max-height: 180px; overflow-y: auto; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);">
                  <table class="app-table" style="margin: 0; font-size: 0.8rem;">
                    <thead>
                      <tr style="background: var(--bg-app);">
                        <th>Pedido</th>
                        <th>Cliente</th>
                        <th>Fecha</th>
                        <th>Botellas / L</th>
                        <th style="text-align: right;">Total</th>
                        <th>Pago</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${linkedOrders
                        .map(
                          (o) => `
                        <tr>
                          <td><strong>${o.orderNumber}</strong></td>
                          <td>${o.customer?.fullName || 'Cliente'}</td>
                          <td>${formatDate(o.orderDate)}</td>
                          <td>${o.quantityBottles} bot (${o.totalLiters}L)</td>
                          <td style="text-align: right;"><strong>${formatCOP(o.totalAmount)}</strong></td>
                          <td>
                            ${o.paymentStatus === 'PAID' ? '<span class="badge badge-paid" style="font-size: 0.7rem;">Pagado</span>' : '<span class="badge badge-pending" style="font-size: 0.7rem;">Pendiente</span>'}
                          </td>
                        </tr>
                      `
                        )
                        .join('')}
                    </tbody>
                  </table>
                </div>
              `
                  : `
                <div style="text-align: center; padding: 12px; color: var(--text-muted); font-size: 0.82rem;">
                  Aún no se han registrado pedidos seleccionando este lote.
                </div>
              `
              }
            </div>

            <!-- Tabla Detallada de Ingredientes e Insumos Consumidos -->
            <div style="margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--primary); margin: 0;">
                  🥣 Ingredientes y Materiales Descontados
                </h4>
                <span style="font-size: 0.76rem; color: var(--text-muted); font-weight: 700;">
                  ${batch.itemsUsed ? batch.itemsUsed.length : 0} insumo(s) registrados
                </span>
              </div>

              ${
                batch.itemsUsed && batch.itemsUsed.length > 0
                  ? `
                <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden;">
                  <table class="app-table" style="margin: 0; font-size: 0.85rem;">
                    <thead>
                      <tr style="background: var(--bg-app);">
                        <th>Ingrediente / Insumo</th>
                        <th>Cantidad Descontada</th>
                        <th>Costo Unitario</th>
                        <th style="text-align: right;">Total Invertido</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${batch.itemsUsed
                        .map((item) => {
                          const icon = getBatchItemIcon(item.rawMaterial?.name, item.rawMaterial?.code);
                          const unitLower = (item.rawMaterial?.unit || '').toLowerCase();
                          const matNameLower = (item.rawMaterial?.name || '').toLowerCase();
                          const matCode = item.rawMaterial?.code || '';
                          
                          let qtyDisplay = '';
                          let detailSub = '';

                          const isMilk = matCode === 'LECHE' || matNameLower.includes('leche líquida') || matNameLower.includes('leche entera');
                          const isSugarOrPowder = matCode.includes('AZUCAR') || matNameLower.includes('azúcar') || matNameLower.includes('polvo');

                          if (unitLower.includes('k')) {
                            const grams = Math.round(item.quantityUsed * 1000);
                            if (isSugarOrPowder) {
                              const gpl = batch.milkUsedLiters > 0 ? (grams / batch.milkUsedLiters).toFixed(0) : null;
                              qtyDisplay = `<strong>${item.quantityUsed} kg</strong> (${grams.toLocaleString('es-CO')} g)`;
                              if (gpl) detailSub = `<small style="color: var(--primary); font-weight: 700;">• ${gpl} g / L leche invertida</small>`;
                            } else {
                              const gpl = batch.totalLitersProduced > 0 ? (grams / batch.totalLitersProduced).toFixed(0) : null;
                              qtyDisplay = `<strong>${item.quantityUsed} kg</strong> (${grams.toLocaleString('es-CO')} g)`;
                              if (gpl) detailSub = `<small style="color: #0369A1; font-weight: 700;">• ${gpl} g / L yogur producido</small>`;
                            }
                          } else if (unitLower.includes('g') || unitLower === 'gramos') {
                            if (isSugarOrPowder) {
                              const gpl = batch.milkUsedLiters > 0 ? (item.quantityUsed / batch.milkUsedLiters).toFixed(0) : null;
                              qtyDisplay = `<strong>${item.quantityUsed.toLocaleString('es-CO')} g</strong>`;
                              if (gpl) detailSub = `<small style="color: var(--primary); font-weight: 700;">• ${gpl} g / L leche invertida</small>`;
                            } else {
                              const gpl = batch.totalLitersProduced > 0 ? (item.quantityUsed / batch.totalLitersProduced).toFixed(0) : null;
                              qtyDisplay = `<strong>${item.quantityUsed.toLocaleString('es-CO')} g</strong>`;
                              if (gpl) detailSub = `<small style="color: #0369A1; font-weight: 700;">• ${gpl} g / L yogur producido</small>`;
                            }
                          } else if (unitLower.includes('litro')) {
                            qtyDisplay = `<strong>${item.quantityUsed} Litros</strong>`;
                            detailSub = `<small style="color: #0369A1; font-weight: 700;">• Base de leche pura</small>`;
                          } else {
                            qtyDisplay = `<strong>${item.quantityUsed}</strong> ${item.rawMaterial?.unit || 'und'}`;
                            detailSub = `<small style="color: var(--text-muted);">Empaque</small>`;
                          }

                          const pct = batch.totalCost > 0 ? Math.round((item.totalCost / batch.totalCost) * 100) : 0;

                          return `
                        <tr>
                          <td>
                            <div style="display: flex; align-items: center; gap: 6px;">
                              <span style="font-size: 1.1rem;">${icon}</span>
                              <div>
                                <strong style="color: var(--text-main);">${item.rawMaterial?.name || 'Insumo'}</strong>
                                <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">
                                  ${item.rawMaterial?.category || 'Insumo'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div>${qtyDisplay}</div>
                            <div>${detailSub}</div>
                          </td>
                          <td>
                            <div style="font-weight: 600;">${formatCOP(item.unitCost)}</div>
                            <small style="color: var(--text-muted);">por ${item.rawMaterial?.unit || 'und'}</small>
                          </td>
                          <td style="text-align: right;">
                            <strong style="color: var(--primary); font-size: 0.92rem;">${formatCOP(item.totalCost)}</strong>
                            <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">${pct}% del lote</div>
                          </td>
                        </tr>
                      `;
                        })
                        .join('')}
                    </tbody>
                    <tfoot>
                      <tr style="background: var(--bg-app); font-weight: 800;">
                        <td colspan="3" style="text-align: right; color: var(--text-main);">Costo Total del Lote:</td>
                        <td style="text-align: right; color: var(--primary); font-size: 1.05rem;">${formatCOP(batch.totalCost)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              `
                  : `
                <div style="background: var(--bg-app); border: 1px dashed var(--border-color); padding: 14px; border-radius: var(--radius-md); text-align: center; color: var(--text-muted); font-size: 0.85rem;">
                  ℹ️ Este lote no tiene desglose de insumos guardado.
                </div>
              `
              }
            </div>

            ${
              batch.notes
                ? `
              <div style="margin-top: 12px; background: #FFFFFF; padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <strong style="font-size: 0.82rem; color: var(--text-muted); text-transform: uppercase;">📝 Notas del Lote:</strong>
                <p style="font-size: 0.88rem; margin-top: 3px; color: var(--text-main);">${batch.notes}</p>
              </div>
            `
                : ''
            }

            ${
              !batch.isActive && batch.deactivationReason
                ? `
              <div style="margin-top: 12px; background: var(--danger-light); padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--danger-border);">
                <strong style="font-size: 0.82rem; color: var(--danger); text-transform: uppercase;">🚫 Motivo de Desactivación:</strong>
                <p style="font-size: 0.88rem; margin-top: 3px; color: var(--danger);">${batch.deactivationReason}</p>
              </div>
            `
                : ''
            }

          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" id="btnCloseBatchDetailBtn" style="padding: 8px 24px;">Cerrar</button>
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
      <div class="modal-card" style="max-width: 540px;">
        <div class="modal-header">
          <h3 class="modal-title">✏️ Editar Lote: ${batch.batchCode}</h3>
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
                <label class="form-label">Estado del Lote *</label>
                <select id="editBatchStatus" class="form-select" style="font-weight: 700;">
                  <option value="COMPLETADO" ${batch.status === 'COMPLETADO' ? 'selected' : ''}>✅ Activo / Disponible</option>
                  <option value="AGOTADO" ${batch.status === 'AGOTADO' ? 'selected' : ''}>📦 Agotado (Todo Vendido)</option>
                  <option value="DESCARTADO" ${batch.status === 'DESCARTADO' ? 'selected' : ''}>🚫 Descartado / Baja</option>
                </select>
              </div>
            </div>

            <!-- Precios de Venta para este Lote -->
            <div style="background: #FAF5FF; border: 1.5px solid #DDD6FE; padding: 12px 14px; border-radius: var(--radius-md); margin-bottom: 14px;">
              <div style="font-size: 0.85rem; font-weight: 800; color: var(--primary); margin-bottom: 8px;">
                💲 Precios de Venta de este Lote
              </div>
              <div class="form-row" style="margin-bottom: 0;">
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label">Precio Botella 1L ($ COP) *</label>
                  <input type="number" id="editBatchPrice1L" class="form-input" min="0" step="500" value="${batch.price1L || 10000}" required style="font-weight: 800; color: var(--primary);" />
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label">Precio Botella 2L ($ COP) *</label>
                  <input type="number" id="editBatchPrice2L" class="form-input" min="0" step="500" value="${batch.price2L || 20000}" required style="font-weight: 800; color: var(--primary);" />
                </div>
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

            <!-- Leche y Yogur Producido -->
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">🥛 Leche Invertida (L) *</label>
                <input type="number" id="editBatchMilk" class="form-input" min="0.5" step="0.1" value="${batch.milkUsedLiters}" required />
              </div>

              <div class="form-group">
                <label class="form-label">🍶 Yogur Salido (L) *</label>
                <input type="number" id="editBatchTotalProduced" class="form-input" min="0.1" step="0.1" value="${batch.totalLitersProduced}" required />
              </div>
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
                <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Total Yogur</span>
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
  const editTotalProduced = document.getElementById('editBatchTotalProduced');
  const editB1 = document.getElementById('editBatchB1');
  const editB2 = document.getElementById('editBatchB2');
  const editTotalDisplay = document.getElementById('editTotalLitrosDisplay');
  const editYieldDisplay = document.getElementById('editYieldDisplay');

  const recalculateEdit = () => {
    const milk = Number(editMilk.value) || 0;
    const totalL = Number(editTotalProduced.value) || 0;
    editTotalDisplay.textContent = `${totalL} L`;

    if (milk > 0) {
      const pct = Math.round((totalL / milk) * 100);
      const diff = totalL - milk;
      if (diff > 0) {
        editYieldDisplay.innerHTML = `${pct}% <span style="font-size: 0.75rem; color: var(--success);">(+${diff.toFixed(1)}L)</span>`;
      } else {
        editYieldDisplay.textContent = `${pct}%`;
      }
      editYieldDisplay.style.color = pct >= 85 ? 'var(--success)' : 'var(--warning)';
    } else {
      editYieldDisplay.textContent = '0%';
    }
  };

  editMilk?.addEventListener('input', recalculateEdit);
  editTotalProduced?.addEventListener('input', recalculateEdit);
  editB1?.addEventListener('input', () => {
    const b1 = Number(editB1.value) || 0;
    const b2 = Number(editB2.value) || 0;
    if (b1 * 1 + b2 * 2 > 0) {
      editTotalProduced.value = b1 * 1 + b2 * 2;
    }
    recalculateEdit();
  });
  editB2?.addEventListener('input', () => {
    const b1 = Number(editB1.value) || 0;
    const b2 = Number(editB2.value) || 0;
    if (b1 * 1 + b2 * 2 > 0) {
      editTotalProduced.value = b1 * 1 + b2 * 2;
    }
    recalculateEdit();
  });

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseEditBatchModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelEditBatchModal')?.addEventListener('click', closeModal);

  document.getElementById('editBatchForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      flavor: document.getElementById('editBatchFlavor').value,
      status: document.getElementById('editBatchStatus').value,
      price1L: Number(document.getElementById('editBatchPrice1L')?.value) || 10000,
      price2L: Number(document.getElementById('editBatchPrice2L')?.value) || 20000,
      preparationDate: document.getElementById('editBatchDate').value,
      expirationDate: document.getElementById('editBatchExpDate').value || null,
      milkUsedLiters: Number(editMilk.value),
      totalLitersProduced: Number(editTotalProduced.value),
      bottles1LProduced: Number(editB1.value),
      bottles2LProduced: Number(editB2.value),
      notes: document.getElementById('editBatchNotes').value,
    };

    try {
      await api.updateBatch(batchId, payload);
      showToast(`¡Lote ${batch.batchCode} actualizado correctamente! ✅`);
      closeModal();
      renderBatches(document.getElementById('contentContainer'));
    } catch (err) {
      showToast(err.message || 'Error al actualizar lote', 'danger');
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
