import { api } from '../api.js';
import { formatCOP, formatDate, formatStock, getTodayLocalDateStr, getTomorrowDateStr, toColombiaDateStr, showToast, store } from '../store.js';
import { paginateArray, renderPaginationHtml, attachPaginationEvents, PAGE_SIZE } from '../components/pagination.js';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let batchesCurrentPage = 1;
let batchSearchQuery = '';
let batchStatusFilter = 'ALL'; // 'ALL' | 'COMPLETADO' | 'AGOTADO' | 'ARCHIVED'

export async function renderBatches(container) {
  container.innerHTML = `
    <!-- Encabezado de Sección Compacto -->
    <div class="batches-view-header" style="margin-bottom: 12px;">
      <h2 class="view-title" style="margin: 0; display: flex; align-items: center; gap: 8px; font-size: 1.25rem;">
        🍶 Control de Lotes y Producción
      </h2>
      <p class="view-subtitle" style="margin: 2px 0 0 0; font-size: 0.8rem; color: var(--text-muted);">
        Registra tu fermentación, calcula rendimientos, costos y establece precios de venta por lote.
      </p>
    </div>

    <!-- Toolbar de Búsqueda y Filtros de Lotes (Compacto y Equilibrado) -->
    <div class="orders-toolbar-card batches-toolbar-card">
      <div class="batches-search-row">
        <div class="search-box input-with-icon" style="flex: 1 1 auto; min-width: 0;">
          <span class="input-icon">🔍</span>
          <input 
            type="text" 
            id="batchSearchInput" 
            class="form-input" 
            placeholder="Buscar lote por código (LOT-...) o sabor..." 
            value="${escapeHtml(batchSearchQuery)}"
            autocomplete="off"
          />
        </div>

        <div class="batches-toolbar-actions">
          <button class="btn btn-primary" id="btnOpenNewBatchModal" style="white-space: nowrap; font-weight: 800; display: inline-flex; align-items: center; gap: 6px;">
            <span>+</span> Registrar Nuevo Lote
          </button>
        </div>
      </div>

      <!-- Tira de Chips Unificada (4 chips operativos) en una sola fila táctil compacta -->
      <div class="batches-chips-wrapper">
        <div class="horizontal-chip-scroll" id="batchStatusChips">
          <button class="filter-chip ${batchStatusFilter === 'ALL' ? 'active' : ''}" data-status="ALL">
            📋 Todos los Lotes
          </button>
          <button class="filter-chip ${batchStatusFilter === 'COMPLETADO' ? 'active' : ''}" data-status="COMPLETADO" style="border-color: #BBF7D0; color: #15803D; font-weight: 700;">
            ✅ Disponibles
          </button>
          <button class="filter-chip ${batchStatusFilter === 'AGOTADO' ? 'active' : ''}" data-status="AGOTADO" style="border-color: #FECACA; color: #DC2626; font-weight: 700;">
            📦 Agotados
          </button>
          <button class="filter-chip ${batchStatusFilter === 'ARCHIVED' ? 'active' : ''}" data-status="ARCHIVED" style="border-color: #CBD5E1; color: var(--text-muted); font-weight: 700;">
            📁 Archivados
          </button>
        </div>
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

  // Buscador ágil con debounce de 300 ms
  const searchInput = container.querySelector('#batchSearchInput');
  let debounceTimer;
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      batchesCurrentPage = 1;
      batchSearchQuery = e.target.value.trim();
      loadBatchesList(container);
    }, 300);
  });

  container.querySelector('#btnOpenNewBatchModal')?.addEventListener('click', () => {
    openBatchModal();
  });

  container.querySelectorAll('#batchStatusChips .filter-chip').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      batchStatusFilter = e.currentTarget.dataset.status;
      batchesCurrentPage = 1;
      container.querySelectorAll('#batchStatusChips .filter-chip').forEach((b) => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      loadBatchesList(container);
    });
  });

  await loadBatchesList(container);
}

async function loadBatchesList(container) {
  const tableContainer = container.querySelector('#batchesTableContainer');
  if (!tableContainer) return;

  try {
    const params = {};
    if (batchStatusFilter === 'ARCHIVED') {
      params.includeInactive = 'true';
    } else {
      params.includeInactive = 'false';
      if (batchStatusFilter !== 'ALL') {
        params.status = batchStatusFilter;
      }
    }

    let batches = await api.getBatches(params);
    if (batchStatusFilter === 'ARCHIVED') {
      batches = (batches || []).filter((b) => b.isActive === false);
    }

    if (batchSearchQuery) {
      const q = batchSearchQuery.toLowerCase();
      batches = (batches || []).filter(
        (b) =>
          (b.batchCode && b.batchCode.toLowerCase().includes(q)) ||
          (b.flavor && b.flavor.toLowerCase().includes(q))
      );
    }

    if (!batches || batches.length === 0) {
      tableContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🍶</div>
          <div class="empty-state-title">No se encontraron lotes</div>
          <div class="empty-state-text">
            ${
              batchSearchQuery
                ? `No hay lotes que coincidan con "${escapeHtml(batchSearchQuery)}".`
                : batchStatusFilter === 'ARCHIVED'
                ? 'No hay lotes desactivados o archivados.'
                : batchStatusFilter === 'AGOTADO'
                ? 'No hay lotes con inventario agotado.'
                : batchStatusFilter === 'COMPLETADO'
                ? 'No hay lotes disponibles en este momento.'
                : 'Registra tu primer lote indicando la leche y botellas envasadas.'
            }
          </div>
          ${
            batchStatusFilter === 'ALL' && !batchSearchQuery
              ? '<button class="btn btn-primary" id="btnNewBatchEmpty">+ Registrar Primer Lote</button>'
              : ''
          }
        </div>
      `;
      tableContainer.querySelector('#btnNewBatchEmpty')?.addEventListener('click', () => openBatchModal());
      return;
    }

    const { pageItems, totalPages, totalItems, currentPage } = paginateArray(batches, batchesCurrentPage, 15);
    batchesCurrentPage = currentPage;

    tableContainer.innerHTML = `
      <div class="table-responsive">
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
            ${pageItems
              .map((b) => {
                let yieldColor = 'var(--success)';
                if (b.yieldPercentage < 85) yieldColor = 'var(--warning)';
                if (b.yieldPercentage < 70) yieldColor = 'var(--danger)';

                const isInactive = !b.isActive;
                const hasExtraYield = b.totalLitersProduced > b.milkUsedLiters;
                const p1 = b.price1L || 12000;
                const p2 = b.price2L || 24000;

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
                    <div style="font-size: 0.74rem; margin-top: 3px;">
                      ${
                        soldLiters > 0
                          ? `<span style="color: var(--primary); font-weight: 700;">🛒 ${soldLiters}L vendidos (${soldPct}%)</span>`
                          : '<span style="color: var(--text-muted);">Sin ventas aún</span>'
                      }
                      ${
                        (b.totalDischargedLiters || 0) > 0
                          ? `<span style="color: #0369A1; font-weight: 700; margin-left: 4px;">• 🏷️ ${b.totalDischargedLiters}L retirados</span>`
                          : ''
                      }
                      <span style="color: ${(b.remainingAvailableLiters ?? Math.max(0, b.totalLitersProduced - soldLiters - (b.totalDischargedLiters || 0))) > 0 ? '#059669' : '#DC2626'}; font-weight: 800; margin-left: 4px;">• ${(b.remainingAvailableLiters ?? Math.max(0, b.totalLitersProduced - soldLiters - (b.totalDischargedLiters || 0))) > 0 ? `🟢 ${(b.remainingAvailableLiters ?? Math.max(0, b.totalLitersProduced - soldLiters - (b.totalDischargedLiters || 0))).toFixed(1)}L libres` : `🔴 0.0L libres (Lleno)`}</span>
                    </div>
                    ${
                      b.isActive && b.unassignedOrdersCount > 0
                        ? `<button class="btn btn-sm btn-link-pending-batch" data-id="${b.id}" data-code="${escapeHtml(b.batchCode)}" data-flavor="${escapeHtml(b.flavor)}" style="background: #FEF3C7; color: #92400E; border: 1.5px solid #FCD34D; font-size: 0.72rem; padding: 2px 7px; font-weight: 800; border-radius: 4px; margin-top: 4px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;" title="Vincular ${b.unassignedOrdersCount} encargos pendientes de este sabor">
                            ⚡ ${b.unassignedOrdersCount} encargo(s) (${b.unassignedLiters}L) sin lote 🔗
                          </button>`
                        : ''
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
                          <button class="btn btn-outline btn-sm btn-discharge-batch" data-id="${b.id}" style="color: #0369A1; border-color: #BAE6FD; background: #F0F9FF; font-weight: 800; font-size: 0.76rem; padding: 4px 8px;" title="Retirar o descontar litros (Consumo socio, muestra, merma)">
                            🍶 Retirar
                          </button>
                          <button class="btn btn-outline btn-sm btn-quick-toggle-status" data-id="${b.id}" data-current="${b.status}" title="${b.status === 'AGOTADO' ? 'Reactivar lote (Marcar como disponible)' : 'Marcar lote como agotado'}" style="font-size: 0.76rem; font-weight: 700; padding: 4px 8px; ${b.status === 'AGOTADO' ? 'color: var(--primary); border-color: var(--primary); background: #FAF5FF;' : 'color: #92400E; border-color: #FCD34D; background: #FFFBEB;'}">
                            ${b.status === 'AGOTADO' ? '🔄 Reactivar' : '📦 Agotar'}
                          </button>
                          <button class="btn btn-outline btn-sm btn-edit-batch" data-id="${b.id}" title="Editar lote">
                            ✏️
                          </button>
                          <button class="btn btn-outline btn-sm btn-deactivate-batch" data-id="${b.id}" data-code="${escapeHtml(b.batchCode)}" style="color: var(--danger);" title="Desactivar lote">
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
      </div>
      ${renderPaginationHtml({
        currentPage: batchesCurrentPage,
        totalPages,
        totalItems,
        pageSize: 15,
        itemName: 'lotes',
        paginationId: 'batchesPagination',
      })}
    `;

    attachPaginationEvents(
      tableContainer,
      'batchesPagination',
      (newPage) => {
        batchesCurrentPage = newPage;
        loadBatchesList(container);
      },
      tableContainer
    );

    tableContainer.querySelectorAll('.btn-link-pending-batch').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const { id, code, flavor } = e.currentTarget.dataset;
        openLinkOrdersModal(id, code, flavor, container);
      });
    });

    tableContainer.querySelectorAll('.btn-discharge-batch').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        openBatchDischargeModal(id, container);
      });
    });

    tableContainer.querySelectorAll('.btn-view-batch').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        openBatchDetailModal(id, container);
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
                  <option value="Natural" selected>Natural Artesanal (Tradicional)</option>
                  <option value="Natural Bajo en Azúcar">Natural Bajo en Azúcar</option>
                  <option value="Natural Sin Azúcar">Natural Sin Azúcar (Stevia)</option>
                  <option value="Fresa">Fresa (Frutos Rojos)</option>
                  <option value="Melocotón">Melocotón / Durazno</option>
                  <option value="Mora">Mora Silvestre</option>
                  <option value="Maracuyá">Maracuyá Tropical</option>
                  <option value="OTRO">✍️ Otro sabor o variante personalizada...</option>
                </select>
                <div id="customFlavorGroup" style="display: none; margin-top: 6px;">
                  <input type="text" id="customBatchFlavor" class="form-input" placeholder="Escribe el nombre del sabor o variante (ej: Natural Stevia, Guanábana)..." />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Fecha *</label>
                <input type="date" id="batchDate" class="form-input" value="${getTodayLocalDateStr()}" required />
              </div>
            </div>

            <!-- Tarjeta de Detección de Encargos Preventa en Espera de este Sabor -->
            <div id="pendingOrdersHintContainer" style="display: none; margin-bottom: 12px;"></div>

            <!-- Cantidad de Leche Usada (Descuento de Stock) -->
            <div class="form-group" style="background: #F0F9FF; border: 1.5px solid #BAE6FD; padding: 12px 14px; border-radius: var(--radius-md); margin-bottom: 12px;">
              <label class="form-label" style="color: #0369A1; font-weight: 800; font-size: 0.92rem;">
                🥛 Litros de Leche Invertidos (Se descontarán del inventario) *
              </label>
              <input type="number" id="batchMilkLiters" class="form-input" min="0.1" step="any" placeholder="Ej: 10" required style="font-size: 1.05rem; font-weight: 700;" />
              <div id="milkStockHint" style="font-size: 0.78rem; margin-top: 5px; font-weight: 700; color: ${milkStock > 0 ? 'var(--text-muted)' : 'var(--danger)'};">
                🥛 Stock disponible: <strong>${formatStock(milkStock, 2)} L</strong> • Costo promedio: ${formatCOP(milkCost)}/L
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
              <input type="number" id="batchTotalProducedLiters" class="form-input" min="0.1" step="any" placeholder="Ej: 11.5" required style="font-size: 1.05rem; font-weight: 700; color: var(--primary);" />
              <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 4px;">
                💡 <em>Indica cuántos litros reales salieron del lote (suelen salir más litros que los invertidos por la adición de azúcar, leche en polvo, frutas y fermento).</em>
              </div>
            </div>

            <!-- Botellas Envasadas (Opcional o Desglose de Envases) -->
            <div class="form-row" style="margin-bottom: 12px;">
              <div class="form-group">
                <label class="form-label">🍾 Botellas 1 Litro Envasadas</label>
                <input type="number" id="batchBottles1L" class="form-input" min="0" step="any" value="0" />
                <div id="b1StockHint" style="font-size: 0.75rem; margin-top: 3px; font-weight: 700; color: ${b1Stock > 0 ? 'var(--text-muted)' : 'var(--danger)'};">
                  🍾 Stock 1L: <strong>${formatStock(b1Stock, 0)} und</strong> ${b1Stock <= 0 ? '⚠️' : ''}
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">🍾 Botellas 2 Litros Envasadas</label>
                <input type="number" id="batchBottles2L" class="form-input" min="0" step="any" value="0" />
                <div id="b2StockHint" style="font-size: 0.75rem; margin-top: 3px; font-weight: 700; color: ${b2Stock > 0 ? 'var(--text-muted)' : 'var(--danger)'};">
                  🍾 Stock 2L: <strong>${formatStock(b2Stock, 0)} und</strong> ${b2Stock <= 0 ? '⚠️' : ''}
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
                    <input type="number" id="batchSugarGramsPerL" class="form-input" min="0" step="any" value="80" style="width: 85px; padding: 4px 8px; font-size: 0.85rem; text-align: center; font-weight: 800; color: var(--primary);" title="Gramos de azúcar por cada litro de leche (ej: 80, 100, 108.33)" />
                    <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">g / L</span>
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.76rem; color: var(--text-muted); margin-top: 6px; padding-top: 4px; border-top: 1px dashed var(--border-subtle);">
                  <span id="sugarCalcText">Consumo: 0 g</span>
                  <strong id="sugarCostBadge" style="color: var(--primary);">$0 COP</strong>
                </div>
                <div id="sugarStockHint" style="font-size: 0.74rem; margin-top: 3px; color: var(--text-muted);">
                  ${sugarMat ? `Stock disponible: <strong>${formatStock(sugarStock, 2)} ${sugarUnit}</strong> (${formatCOP(sugarCost)}/kg)` : '⚠️ Insumo Azúcar no registrado'}
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
                    <input type="number" id="batchPowderGramsPerL" class="form-input" min="0" step="any" value="30" style="width: 85px; padding: 4px 8px; font-size: 0.85rem; text-align: center; font-weight: 800; color: var(--primary);" title="Gramos de leche en polvo por cada litro de leche (ej: 30, 25, 33.3)" />
                    <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">g / L</span>
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.76rem; color: var(--text-muted); margin-top: 6px; padding-top: 4px; border-top: 1px dashed var(--border-subtle);">
                  <span id="powderCalcText">Consumo: 0 g</span>
                  <strong id="powderCostBadge" style="color: var(--primary);">$0 COP</strong>
                </div>
                <div id="powderStockHint" style="font-size: 0.74rem; margin-top: 3px; color: var(--text-muted);">
                  ${powderMat ? `Stock disponible: <strong>${formatStock(powderStock, 2)} ${powderUnit}</strong> (${formatCOP(powderCost)}/kg)` : '⚠️ Insumo Leche en Polvo no registrado'}
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
                ${hasLabelStock ? `Stock disponible: <strong>${formatStock(labelStock, 0)} und</strong>` : '⚠️ No tienes etiquetas registradas en inventario (se omitirá)'}
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
                  <input type="number" id="batchPrice1L" class="form-input" min="0" step="any" value="12000" required style="font-weight: 800; color: var(--primary);" />
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label">Precio Botella 2L ($ COP) *</label>
                  <input type="number" id="batchPrice2L" class="form-input" min="0" step="any" value="24000" required style="font-weight: 800; color: var(--primary);" />
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

    sugarCalcText.textContent = useSugar ? `Consumo: ${Number(sugarGrams.toFixed(2))} g (${sugarKg.toFixed(2)} kg) • ${sugarGpl} g/L leche` : 'Desactivado';
    sugarCostBadge.textContent = useSugar ? `+${formatCOP(Math.round(totalSugarCost))}` : '$0 COP';

    // 3. Costo Leche en Polvo (calculado por gramo / kg)
    const isPowderInKg = powderUnit.toLowerCase().includes('k');
    const powderUnitCostPerGram = isPowderInKg ? powderCost / 1000 : powderCost;
    const totalPowderCost = powderGrams * powderUnitCostPerGram;
    if (usePowder) totalBatchCost += totalPowderCost;

    powderCalcText.textContent = usePowder ? `Consumo: ${Number(powderGrams.toFixed(2))} g (${powderKg.toFixed(2)} kg) • ${powderGpl} g/L leche` : 'Desactivado';
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
      milkStockHint.innerHTML = `⚠️ <strong style="color: var(--danger);">Stock insuficiente</strong>: Tienes ${formatStock(milkStock, 2)} L e intentas usar ${formatStock(milk, 2)} L`;
    } else {
      milkStockHint.innerHTML = `🥛 Stock disponible: <strong>${formatStock(milkStock, 2)} L</strong> • Costo: ${formatCOP(milkCost)}/L (Se descontarán exactamente ${formatStock(milk, 2)} L)`;
    }

    // Hint dinámico de azúcar
    if (useSugar && sugarMat) {
      const sugarNeededStock = isSugarInKg ? sugarKg : sugarGrams;
      if (sugarStock < sugarNeededStock) {
        sugarStockHint.innerHTML = `⚠️ <strong style="color: var(--danger);">Stock insuficiente de azúcar</strong>: Tienes ${formatStock(sugarStock, 2)} ${sugarUnit} y requieres ${Number(sugarGrams.toFixed(2))} g (${sugarKg.toFixed(2)} kg)`;
      } else {
        sugarStockHint.innerHTML = `Stock disponible: <strong>${formatStock(sugarStock, 2)} ${sugarUnit}</strong>`;
      }
    } else if (!useSugar) {
      sugarStockHint.innerHTML = `<em>Desactivado para este lote</em>`;
    }

    // Hint dinámico de leche en polvo
    if (usePowder && powderMat) {
      const powderNeededStock = isPowderInKg ? powderKg : powderGrams;
      if (powderStock < powderNeededStock) {
        powderStockHint.innerHTML = `⚠️ <strong style="color: var(--danger);">Stock insuficiente de leche en polvo</strong>: Tienes ${formatStock(powderStock, 2)} ${powderUnit} y requieres ${Number(powderGrams.toFixed(2))} g (${powderKg.toFixed(2)} kg)`;
      } else {
        powderStockHint.innerHTML = `Stock disponible: <strong>${formatStock(powderStock, 2)} ${powderUnit}</strong>`;
      }
    } else if (!usePowder) {
      powderStockHint.innerHTML = `<em>Desactivado para este lote</em>`;
    }

    // Hints de botellas
    if (b1 > b1Stock) {
      b1StockHint.innerHTML = `⚠️ <strong style="color: var(--danger);">Insuficiente</strong>: Stock ${formatStock(b1Stock, 0)} und`;
    } else {
      b1StockHint.innerHTML = `🍾 Stock 1L: <strong>${formatStock(b1Stock, 0)} und</strong>`;
    }

    if (b2 > b2Stock) {
      b2StockHint.innerHTML = `⚠️ <strong style="color: var(--danger);">Insuficiente</strong>: Stock ${formatStock(b2Stock, 0)} und`;
    } else {
      b2StockHint.innerHTML = `🍾 Stock 2L: <strong>${formatStock(b2Stock, 0)} und</strong>`;
    }

    // Desglose de insumos en caja
    summaryMilk.innerHTML = `<strong>${milk} L</strong> (${formatCOP(totalMilkCost)}) <small style="color: #0369A1; font-weight: 700;">• Exacto de stock</small>`;
    summarySugar.innerHTML = useSugar ? `<strong>${Number(sugarGrams.toFixed(2))} g (${sugarKg.toFixed(2)} kg)</strong> (${formatCOP(Math.round(totalSugarCost))})` : `<em>Omitido</em>`;
    summaryPowder.innerHTML = usePowder ? `<strong>${Number(powderGrams.toFixed(2))} g (${powderKg.toFixed(2)} kg)</strong> (${formatCOP(Math.round(totalPowderCost))})` : `<em>Omitido</em>`;
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
    const price1L = Number(document.getElementById('batchPrice1L')?.value) || 12000;
    const price2L = Number(document.getElementById('batchPrice2L')?.value) || 24000;
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

  // Detección reactiva de encargos pendientes para el sabor seleccionado
  const pendingContainer = document.getElementById('pendingOrdersHintContainer');
  const flavorSelect = document.getElementById('batchFlavor');
  const customFlavorGroup = document.getElementById('customFlavorGroup');
  const customBatchFlavor = document.getElementById('customBatchFlavor');

  const getEffectiveNewBatchFlavor = () => {
    const sel = flavorSelect?.value || 'Natural';
    if (sel === 'OTRO') {
      return customBatchFlavor?.value.trim() || 'Personalizado';
    }
    return sel;
  };
  
  const checkPendingOrdersForFlavor = async () => {
    if (!pendingContainer || !flavorSelect) return;
    const selectedFlavor = getEffectiveNewBatchFlavor();
    try {
      const pendingData = await api.getPendingBatchOrders(selectedFlavor);
      const orders = pendingData?.orders || [];
      if (orders.length > 0) {
        const todayStr = getTodayLocalDateStr();
        const tomorrowStr = getTomorrowDateStr();

        pendingContainer.style.display = 'block';
        pendingContainer.innerHTML = `
          <div style="background: #ECFDF5; border: 1.5px solid #A7F3D0; border-radius: var(--radius-md); padding: 12px 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;">
              <div style="font-weight: 800; color: #065F46; font-size: 0.88rem; display: flex; align-items: center; gap: 6px;">
                <span>🛒</span> Encargos de ${selectedFlavor} en espera (${orders.length} pedidos • ${pendingData.totalLiters} L)
              </div>
            </div>

            <!-- Botones de selección rápida -->
            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px;">
              <button type="button" class="btn btn-outline btn-sm" id="btnSelectTodayBatch" style="font-size: 0.74rem; font-weight: 700; padding: 2px 8px; background: #FFFFFF; color: #92400E; border-color: #FCD34D;">
                🛵 Solo Hoy
              </button>
              <button type="button" class="btn btn-outline btn-sm" id="btnSelectTomorrowBatch" style="font-size: 0.74rem; font-weight: 700; padding: 2px 8px; background: #FFFFFF; color: #3730A3; border-color: #C7D2FE;">
                🛵 Solo Mañana
              </button>
              <button type="button" class="btn btn-outline btn-sm" id="btnSelectAllBatch" style="font-size: 0.74rem; font-weight: 700; padding: 2px 8px; background: #FFFFFF; color: #065F46; border-color: #A7F3D0;">
                📅 Todos (${orders.length})
              </button>
              <button type="button" class="btn btn-outline btn-sm" id="btnDeselectAllBatch" style="font-size: 0.74rem; font-weight: 700; padding: 2px 8px; background: #FFFFFF; color: var(--text-muted); border-color: #E2E8F0;">
                🚫 Ninguno
              </button>
            </div>

            <!-- Lista de pedidos con checkbox y fecha -->
            <div style="max-height: 150px; overflow-y: auto; background: #FFFFFF; border: 1px solid #A7F3D0; border-radius: var(--radius-sm); padding: 4px 6px;">
              ${orders
                .map((o) => {
                  const delivStr = o.deliveryDate ? toColombiaDateStr(o.deliveryDate) : '';
                  const isToday = delivStr === todayStr || (!delivStr && delivStr !== 'null');
                  const isTomorrow = delivStr === tomorrowStr;
                  let dateBadge = `<span style="font-size: 0.72rem; color: var(--text-muted);">Sin fecha (${formatDate(o.orderDate)})</span>`;
                  if (delivStr === todayStr) {
                    dateBadge = `<span class="badge" style="background: #FEF3C7; color: #92400E; font-size: 0.68rem; font-weight: 800;">🛵 Entrega Hoy</span>`;
                  } else if (delivStr === tomorrowStr) {
                    dateBadge = `<span class="badge" style="background: #E0E7FF; color: #3730A3; font-size: 0.68rem; font-weight: 800;">🛵 Entrega Mañana</span>`;
                  } else if (delivStr < todayStr) {
                    dateBadge = `<span class="badge" style="background: #FEE2E2; color: #DC2626; font-size: 0.68rem; font-weight: 800;">⚠️ Vencido (${formatDate(o.deliveryDate)})</span>`;
                  } else if (delivStr > tomorrowStr) {
                    dateBadge = `<span class="badge" style="background: #F1F5F9; color: #475569; font-size: 0.68rem; font-weight: 700;">📅 Futuro (${formatDate(o.deliveryDate)})</span>`;
                  }
                  return `
                    <label style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 5px 6px; border-bottom: 1px solid #F0FDF4; font-size: 0.8rem; cursor: pointer;">
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <input type="checkbox" class="chk-batch-order" value="${o.id}" data-liters="${o.totalLiters}" data-is-today="${isToday ? '1' : '0'}" data-is-tomorrow="${isTomorrow ? '1' : '0'}" ${isToday ? 'checked' : ''} style="accent-color: #059669; cursor: pointer; width: 15px; height: 15px;" />
                        <strong>${o.customer?.fullName || 'Cliente'}</strong>
                      </div>
                      <div style="display: flex; align-items: center; gap: 6px;">
                        ${dateBadge}
                        <strong style="color: #065F46; font-size: 0.82rem;">${o.totalLiters}L</strong>
                      </div>
                    </label>
                  `;
                })
                .join('')}
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 0.8rem; font-weight: 700; color: #065F46;">
              <span>⚡ Pedidos a vincular a este lote:</span>
              <strong id="batchSelectedOrdersSummary">Calculando...</strong>
            </div>
          </div>
        `;

        const updateBatchOrdersSummary = () => {
          const checked = pendingContainer.querySelectorAll('.chk-batch-order:checked');
          let sumL = 0;
          checked.forEach((chk) => (sumL += Number(chk.dataset.liters) || 0));
          const sumEl = pendingContainer.querySelector('#batchSelectedOrdersSummary');
          if (sumEl) sumEl.textContent = `${checked.length} pedido(s) (${sumL} Litros)`;
        };

        pendingContainer.querySelectorAll('.chk-batch-order').forEach((chk) => {
          chk.addEventListener('change', updateBatchOrdersSummary);
        });

        pendingContainer.querySelector('#btnSelectTodayBatch')?.addEventListener('click', () => {
          pendingContainer.querySelectorAll('.chk-batch-order').forEach((chk) => {
            chk.checked = chk.dataset.isToday === '1';
          });
          updateBatchOrdersSummary();
        });

        pendingContainer.querySelector('#btnSelectTomorrowBatch')?.addEventListener('click', () => {
          pendingContainer.querySelectorAll('.chk-batch-order').forEach((chk) => {
            chk.checked = chk.dataset.isTomorrow === '1';
          });
          updateBatchOrdersSummary();
        });

        pendingContainer.querySelector('#btnSelectAllBatch')?.addEventListener('click', () => {
          pendingContainer.querySelectorAll('.chk-batch-order').forEach((chk) => {
            chk.checked = true;
          });
          updateBatchOrdersSummary();
        });

        pendingContainer.querySelector('#btnDeselectAllBatch')?.addEventListener('click', () => {
          pendingContainer.querySelectorAll('.chk-batch-order').forEach((chk) => {
            chk.checked = false;
          });
          updateBatchOrdersSummary();
        });

        updateBatchOrdersSummary();
      } else {
        pendingContainer.style.display = 'none';
        pendingContainer.innerHTML = '';
      }
    } catch (err) {
      console.error('Error fetching pending orders for flavor:', err);
    }
  };

  flavorSelect?.addEventListener('change', () => {
    const val = flavorSelect.value;
    if (val === 'OTRO') {
      if (customFlavorGroup) customFlavorGroup.style.display = 'block';
      if (customBatchFlavor) customBatchFlavor.focus();
    } else {
      if (customFlavorGroup) customFlavorGroup.style.display = 'none';
      if (val === 'Natural Bajo en Azúcar') {
        if (useSugarCheckbox) useSugarCheckbox.checked = true;
        if (sugarGplInput) sugarGplInput.value = '40';
        updateCalculations();
      } else if (val === 'Natural Sin Azúcar') {
        if (useSugarCheckbox) useSugarCheckbox.checked = false;
        if (sugarGplInput) sugarGplInput.value = '0';
        updateCalculations();
      } else if (val === 'Natural' && sugarGplInput && (sugarGplInput.value === '40' || sugarGplInput.value === '0')) {
        if (useSugarCheckbox) useSugarCheckbox.checked = true;
        sugarGplInput.value = '80';
        updateCalculations();
      }
    }
    checkPendingOrdersForFlavor();
  });

  customBatchFlavor?.addEventListener('input', () => {
    checkPendingOrdersForFlavor();
  });
  checkPendingOrdersForFlavor();

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
          <input type="number" class="form-input extra-gpl" min="0" step="any" value="50" placeholder="g/L" style="width: 75px; padding: 4px 6px; font-size: 0.84rem; text-align: center; font-weight: 800; color: ${isBase ? '#0369A1' : 'var(--primary)'};" title="Gramos por cada litro ${isBase ? 'de leche invertida' : 'de yogur obtenido'}" />
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

    const checkedOrderCheckboxes = modalOverlay.querySelectorAll('.chk-batch-order:checked');
    const linkOrderIds = Array.from(checkedOrderCheckboxes).map((chk) => Number(chk.value)).filter((id) => !isNaN(id) && id > 0);

    const payload = {
      milkUsedLiters: milkUsed,
      totalLitersProduced: totalProduced,
      bottles1LProduced: b1,
      bottles2LProduced: b2,
      price1L: Number(document.getElementById('batchPrice1L')?.value) || 12000,
      price2L: Number(document.getElementById('batchPrice2L')?.value) || 24000,
      useSugar: useSugarCheckbox.checked,
      sugarGramsPerLiter: Number(sugarGplInput.value) || 0,
      usePowderedMilk: usePowderCheckbox.checked,
      powderedMilkGramsPerLiter: Number(powderGplInput.value) || 0,
      useLabels: useLabelsCheckbox.checked,
      flavor: getEffectiveNewBatchFlavor(),
      preparationDate: document.getElementById('batchDate').value,
      notes: document.getElementById('batchNotes').value,
      registeredBy: store.currentUser,
      linkOrderIds,
      autoLinkPendingOrders: false,
      extraItems,
    };

    try {
      const res = await api.createBatch(payload);
      const linkedMsg = linkOrderIds.length > 0 ? ` • ${linkOrderIds.length} pedidos vinculados` : '';
      showToast(`¡Lote ${res.batchCode} registrado con éxito! Salieron ${res.totalLitersProduced}L (Rendimiento: ${res.yieldPercentage}%)${linkedMsg} 🍶`);
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
    const [batch, pendingData] = await Promise.all([
      api.getBatchById(batchId),
      api.getPendingBatchOrders(),
    ]);

    const hasExtraYield = batch.totalLitersProduced > batch.milkUsedLiters;
    const p1 = batch.price1L || 12000;
    const p2 = batch.price2L || 24000;

    let statusBadge = '<span class="badge badge-paid">✅ Activo / Disponible</span>';
    if (!batch.isActive) {
      statusBadge = '<span class="badge badge-pending">🚫 Desactivado</span>';
    } else if (batch.status === 'AGOTADO') {
      statusBadge = '<span class="badge" style="background: #FEF3C7; color: #92400E; border: 1px solid #FCD34D; font-weight: 800;">📦 Agotado (Todo Vendido)</span>';
    } else if (batch.status === 'DESCARTADO') {
      statusBadge = '<span class="badge" style="background: #FEE2E2; color: #DC2626; border: 1px solid #FCA5A5; font-weight: 800;">🚫 Baja</span>';
    }

    const linkedDischarges = batch.discharges || [];

    // Consolidar todos los pedidos vinculados (directos o por OrderItem de lote mixto)
    const orderMap = new Map();
    (batch.orders || []).forEach((o) => {
      orderMap.set(o.id, {
        id: o.id,
        orderNumber: o.orderNumber,
        customer: o.customer,
        orderDate: o.orderDate,
        quantityBottles: o.quantityBottles,
        totalLiters: o.totalLiters,
        totalAmount: o.totalAmount,
        paidAmount: o.paidAmount,
        pendingAmount: o.pendingAmount,
        paymentStatus: o.paymentStatus,
      });
    });

    (batch.orderItems || []).forEach((it) => {
      if (it.order) {
        const o = it.order;
        if (!orderMap.has(o.id)) {
          orderMap.set(o.id, {
            id: o.id,
            orderNumber: o.orderNumber,
            customer: o.customer,
            orderDate: o.orderDate,
            quantityBottles: it.quantity,
            totalLiters: it.totalLiters,
            totalAmount: it.totalPrice,
            paidAmount: o.paidAmount,
            pendingAmount: o.pendingAmount,
            paymentStatus: o.paymentStatus,
          });
        }
      }
    });

    const linkedOrders = Array.from(orderMap.values());

    const soldLitersFromItems = (batch.orderItems || []).reduce((sum, i) => sum + i.totalLiters, 0);
    const legacyOrdersSold = (batch.orders || [])
      .filter((o) => !(batch.orderItems || []).some((it) => it.orderId === o.id))
      .reduce((sum, o) => sum + o.totalLiters, 0);
    const totalSoldLiters = soldLitersFromItems + legacyOrdersSold;
    const totalSoldBottles = linkedOrders.reduce((sum, o) => sum + (o.quantityBottles || 0), 0);
    const totalSoldAmount = linkedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalPaidAmount = linkedOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
    const totalPendingAmount = linkedOrders.reduce((sum, o) => {
      const isPaid = o.paymentStatus === 'PAID' || (o.paidAmount >= o.totalAmount && o.totalAmount > 0) || (o.pendingAmount !== undefined && o.pendingAmount <= 0 && (o.paidAmount || 0) > 0);
      if (isPaid) return sum;
      return sum + (o.pendingAmount > 0 ? o.pendingAmount : Math.max(0, o.totalAmount - (o.paidAmount || 0)));
    }, 0);

    const totalDischargedLiters = linkedDischarges.reduce((sum, d) => sum + (d.totalLiters || 0), 0);
    const totalDischargedAmount = linkedDischarges.reduce((sum, d) => sum + (d.totalAmount || 0), 0);

    const remainingAvailableLiters = Math.max(0, batch.totalLitersProduced - totalSoldLiters - totalDischargedLiters);

    // Filtrar encargos pendientes de este sabor
    const bFlavorNorm = (batch.flavor || '').toLowerCase().trim();
    const matchingPending = (pendingData?.orders || []).filter((po) => {
      const pFlavorNorm = (po.flavor || '').toLowerCase().trim();
      const hasItem = (po.items || []).some((it) => (it.flavor || '').toLowerCase().trim().includes(bFlavorNorm) && it.batchId == null);
      return pFlavorNorm.includes(bFlavorNorm) || bFlavorNorm.includes(pFlavorNorm) || hasItem;
    });
    const pendingCount = matchingPending.length;
    const pendingLiters = matchingPending.reduce((sum, po) => sum + po.totalLiters, 0);

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
            
            <!-- Banner de encargos preventa en espera si existen -->
            ${
              batch.isActive && pendingCount > 0
                ? `
              <div style="background: #ECFDF5; border: 1.5px solid #A7F3D0; border-radius: var(--radius-md); padding: 10px 14px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <div>
                  <div style="font-weight: 800; color: #065F46; font-size: 0.88rem; display: flex; align-items: center; gap: 6px;">
                    <span>⚡</span> ¡Hay ${pendingCount} encargo(s) de ${batch.flavor} esperando lote! (${pendingLiters} L)
                  </div>
                  <div style="font-size: 0.76rem; color: #047857; margin-top: 2px;">
                    ${matchingPending.map((po) => `${po.customer?.fullName || 'Cliente'} (${po.totalLiters}L)`).join(', ')}
                  </div>
                </div>
                <button type="button" class="btn btn-sm btn-accent" id="btnLinkOrdersFromDetail" style="font-size: 0.78rem; padding: 5px 12px; font-weight: 800;">
                  🔗 Vincular Ahora
                </button>
              </div>
            `
                : ''
            }

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
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                <h4 style="font-size: 0.92rem; font-weight: 800; color: var(--primary); margin: 0;">
                  🛒 Despacho y Ventas de este Lote (${linkedOrders.length})
                </h4>
                <div style="font-size: 0.8rem; font-weight: 700; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span style="color: var(--primary);">${totalSoldLiters}L pedidos (${formatCOP(totalSoldAmount)})</span>
                  <span>•</span>
                  <span style="color: #059669;">🟢 ${totalPaidAmount > 0 ? formatCOP(totalPaidAmount) : '$0'} cobrados</span>
                  ${totalPendingAmount > 0 ? `
                    <span>•</span>
                    <span style="color: #DC2626;">⏳ ${formatCOP(totalPendingAmount)} pendientes</span>
                  ` : ''}
                </div>
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
                        <th>Estado Pago</th>
                        <th style="text-align: center;">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${linkedOrders
                        .map(
                          (o) => {
                            const isPaid = o.paymentStatus === 'PAID' || (o.paidAmount >= o.totalAmount && o.totalAmount > 0) || (o.pendingAmount !== undefined && o.pendingAmount <= 0 && (o.paidAmount || 0) > 0);
                            const isPartial = !isPaid && ((o.paidAmount || 0) > 0 || o.paymentStatus === 'PARTIAL');
                            const pendingBal = Math.max(0, o.totalAmount - (o.paidAmount || 0));

                            let payBadge = '';
                            if (isPaid) {
                              payBadge = '<span class="badge badge-paid" style="font-size: 0.7rem; font-weight: 800;">✅ Pagado</span>';
                            } else if (isPartial) {
                              payBadge = `<span class="badge" style="background: #FEF3C7; color: #92400E; font-size: 0.7rem; font-weight: 800;" title="Abonado: ${formatCOP(o.paidAmount)} / Resta: ${formatCOP(pendingBal)}">🟡 Abono (${formatCOP(o.paidAmount)})</span>`;
                            } else {
                              payBadge = `<span class="badge badge-pending" style="font-size: 0.7rem; font-weight: 800;">⏳ Pendiente</span>`;
                            }

                            return `
                        <tr>
                          <td><strong>${escapeHtml(o.orderNumber)}</strong></td>
                          <td>${escapeHtml(o.customer?.fullName) || 'Cliente'}</td>
                          <td>${formatDate(o.orderDate)}</td>
                          <td>${o.quantityBottles} bot (${o.totalLiters}L)</td>
                          <td style="text-align: right;"><strong>${formatCOP(o.totalAmount)}</strong></td>
                          <td>${payBadge}</td>
                          <td style="text-align: center;">
                            ${!isPaid ? `
                              <button type="button" class="btn btn-sm btn-outline btn-quick-pay-from-batch" data-order-id="${o.id}" data-order-number="${escapeHtml(o.orderNumber)}" data-customer-name="${escapeHtml(o.customer?.fullName || 'Cliente')}" data-pending="${pendingBal}" data-batch-id="${batch.id}" style="padding: 2px 8px; font-size: 0.74rem; color: #059669; border-color: #A7F3D0; background: #ECFDF5; font-weight: 800;" title="Cobrar pedido / registrar pago">
                                💵 Cobrar
                              </button>
                            ` : `
                              <span style="color: #059669; font-size: 0.76rem; font-weight: 800;">✓ Al día</span>
                            `}
                          </td>
                        </tr>
                      `;
                          }
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

            <!-- Resumen de Retiros y Consumos del Lote -->
            <div style="background: #FFFFFF; border: 1.5px solid #BAE6FD; border-radius: var(--radius-md); padding: 12px 14px; margin-bottom: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                <h4 style="font-size: 0.92rem; font-weight: 800; color: #0369A1; margin: 0; display: flex; align-items: center; gap: 6px;">
                  <span>📦</span> Retiros y Consumos de este Lote (${linkedDischarges.length})
                </h4>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 0.8rem; font-weight: 700; color: #0369A1;">
                    ${totalDischargedLiters.toFixed(1)}L retirados • ${formatCOP(totalDischargedAmount)}
                  </span>
                  ${batch.isActive ? `
                    <button type="button" class="btn btn-sm btn-outline" id="btnDischargeFromDetail" style="color: #0369A1; border-color: #BAE6FD; background: #F0F9FF; font-weight: 800; font-size: 0.74rem; padding: 3px 8px;">
                      + Registrar Retiro
                    </button>
                  ` : ''}
                </div>
              </div>

              ${
                linkedDischarges.length > 0
                  ? `
                <div style="max-height: 160px; overflow-y: auto; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);">
                  <table class="app-table" style="margin: 0; font-size: 0.8rem;">
                    <thead>
                      <tr style="background: #F0F9FF;">
                        <th>Fecha</th>
                        <th>Motivo / Beneficiario</th>
                        <th>Cantidad</th>
                        <th>Valor</th>
                        <th>Notas</th>
                        <th style="text-align: center;">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${linkedDischarges
                        .map((d) => {
                          const reasonLabels = {
                            CONSUMO_SOCIO: '👤 Consumo Socio',
                            MUESTRA_DEGUSTACION: '🍓 Muestra / Degustación',
                            MERMA_DANO: '⚠️ Merma / Daño',
                            CORTESIA: '🎁 Cortesía',
                            OTRO: '📝 Otro Motivo',
                          };
                          const label = reasonLabels[d.reasonType] || d.reasonType;
                          const partnerInfo = d.staffMember ? ` (${escapeHtml(d.staffMember.fullName)})` : '';
                          return `
                        <tr>
                          <td>${formatDate(d.dischargeDate)}</td>
                          <td>
                            <strong>${label}</strong>
                            <div style="font-size: 0.72rem; color: var(--primary); font-weight: 700;">${partnerInfo}</div>
                          </td>
                          <td>${d.quantityBottles}x ${d.bottleSize} (<strong>${d.totalLiters}L</strong>)</td>
                          <td><strong>${formatCOP(d.totalAmount)}</strong></td>
                          <td><small style="color: var(--text-muted);">${escapeHtml(d.notes) || '-'}</small></td>
                          <td style="text-align: center;">
                            <button class="btn btn-outline btn-sm btn-delete-discharge" data-id="${d.id}" data-batch-id="${batch.id}" style="padding: 2px 6px; color: var(--danger); font-size: 0.72rem;" title="Eliminar retiro y reintegrar litros">
                              🗑️
                            </button>
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
                <div style="text-align: center; padding: 12px; color: var(--text-muted); font-size: 0.82rem;">
                  No hay retiros directos registrados en este lote.
                </div>
              `
              }
            </div>

            <!-- Tabla Detallada de Ingredientes e Insumos Consumidos -->
            <div style="margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h4 style="font-size: 0.92rem; font-weight: 800; color: var(--primary); margin: 0;">
                  📦 Insumos Consumidos del Inventario (${batch.itemsUsed?.length || 0})
                </h4>
              </div>

              ${
                batch.itemsUsed && batch.itemsUsed.length > 0
                  ? `
                <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);">
                  <table class="app-table" style="margin: 0; font-size: 0.8rem;">
                    <thead>
                      <tr style="background: var(--bg-app);">
                        <th>Insumo</th>
                        <th>Cantidad Usada</th>
                        <th>Costo Unitario</th>
                        <th style="text-align: right;">Costo Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${batch.itemsUsed
                        .map((item) => {
                          const icon = getBatchItemIcon(item.rawMaterial?.name, item.rawMaterial?.code);
                          const unitLower = (item.rawMaterial?.unit || '').toLowerCase();
                          const matNameLower = (item.rawMaterial?.name || '').toLowerCase();
                          const isSugarOrPowder = matNameLower.includes('azucar') || matNameLower.includes('azúcar') || matNameLower.includes('polvo');

                          let qtyDisplay = '';
                          let detailSub = '';

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
                <div style="text-align: center; padding: 12px; color: var(--text-muted); font-size: 0.82rem;">
                  No hay desglose de insumos registrado para este lote.
                </div>
              `
              }
            </div>

            <!-- Notas Adicionales -->
            ${
              batch.notes
                ? `
              <div style="background: var(--bg-app); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 10px 12px; font-size: 0.84rem;">
                <strong style="color: var(--primary);">📝 Notas:</strong> ${escapeHtml(batch.notes)}
              </div>
            `
                : ''
            }

          </div>
          <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              ${batch.isActive ? `
                <button type="button" class="btn btn-outline" id="btnDischargeFooter" style="color: #0369A1; border-color: #BAE6FD; background: #F0F9FF; font-weight: 800;">
                  🍶 Retirar / Ajustar Litros
                </button>
              ` : ''}
            </div>
            <button type="button" class="btn btn-outline" id="btnCloseDetailFooter">Cerrar</button>
          </div>
        </div>
      </div>
    `;

    const closeDetail = () => (modalOverlay.innerHTML = '');
    document.getElementById('btnCloseBatchDetailModal')?.addEventListener('click', closeDetail);
    document.getElementById('btnCloseDetailFooter')?.addEventListener('click', closeDetail);

    document.getElementById('btnLinkOrdersFromDetail')?.addEventListener('click', () => {
      openLinkOrdersModal(batch.id, batch.batchCode, batch.flavor);
    });

    const triggerDischarge = () => {
      openBatchDischargeModal(batch);
    };
    document.getElementById('btnDischargeFromDetail')?.addEventListener('click', triggerDischarge);
    document.getElementById('btnDischargeFooter')?.addEventListener('click', triggerDischarge);

    modalOverlay.querySelectorAll('.btn-quick-pay-from-batch').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const { orderId, orderNumber, customerName, pending, batchId } = e.currentTarget.dataset;
        openQuickPayBatchOrderModal(orderId, orderNumber, customerName, Number(pending), batchId);
      });
    });

    modalOverlay.querySelectorAll('.btn-delete-discharge').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const dischargeId = e.currentTarget.dataset.id;
        const bId = e.currentTarget.dataset.batchId;
        if (confirm('¿Estás seguro de anular este retiro? Los litros se reintegrarán automáticamente al lote y se revertirá el registro de socio.')) {
          try {
            await api.deleteBatchDischarge(dischargeId);
            showToast('Retiro anulado y litros reintegrados al lote 🔄');
            openBatchDetailModal(bId);
            const mainContainer = document.getElementById('contentContainer');
            if (mainContainer) loadBatchesList(mainContainer);
          } catch (err) {
            showToast(err.message || 'Error al anular retiro', 'danger');
          }
        }
      });
    });
  } catch (error) {
    console.error('Error opening batch detail modal:', error);
    showToast('Error al cargar detalle del lote', 'danger');
  }
}

// Modal para registrar cobro rápido de un pedido directamente desde el resumen de lote
function openQuickPayBatchOrderModal(orderId, orderNumber, customerName, pendingAmount, batchId) {
  let modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) {
    modalOverlay = document.createElement('div');
    modalOverlay.id = 'modalContainer';
    document.body.appendChild(modalOverlay);
  }

  const defaultAmount = Math.max(1, pendingAmount);

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 440px;">
        <div class="modal-header">
          <h3 class="modal-title">💵 Registrar Cobro de Pedido</h3>
          <button class="modal-close-btn" id="btnCloseQuickPayModal">✕</button>
        </div>
        <form id="quickPayBatchOrderForm">
          <div class="modal-body">
            
            <div style="background: var(--bg-app); border: 1.5px solid var(--border-color); padding: 12px 14px; border-radius: var(--radius-md); margin-bottom: 14px;">
              <strong style="color: var(--primary); font-size: 1.05rem;">Pedido #${escapeHtml(orderNumber)}</strong>
              <div style="font-size: 0.88rem; color: var(--text-main); font-weight: 700; margin-top: 3px;">
                👤 ${escapeHtml(customerName)}
              </div>
              <div style="font-size: 0.8rem; color: #DC2626; font-weight: 800; margin-top: 4px;">
                Saldo pendiente a cobrar: ${formatCOP(pendingAmount)}
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Monto a Cobrar *</label>
              <input 
                type="number" 
                id="quickPayAmount" 
                class="form-input" 
                min="1" 
                step="any" 
                value="${defaultAmount}" 
                style="font-size: 1.25rem; font-weight: 800; color: #059669; text-align: center;" 
                required 
              />
            </div>

            <div class="form-group">
              <label class="form-label">Método de Pago *</label>
              <select id="quickPayMethod" class="form-select" style="font-weight: 700;">
                <option value="EFECTIVO" selected>💵 Efectivo</option>
                <option value="NEQUI">🟣 Nequi</option>
                <option value="BANCOLOMBIA">🟡 Bancolombia</option>
                <option value="TRANSFERENCIA">💳 Transferencia</option>
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Notas / Observación (Opcional)</label>
              <input type="text" id="quickPayNotes" class="form-input" placeholder="Ej: Pago total recibido por Nequi" />
            </div>

          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btnCancelQuickPay">Cancelar</button>
            <button type="submit" class="btn btn-accent" id="btnSubmitQuickPay" style="padding: 10px 20px; font-weight: 800;">
              ✅ Confirmar Cobro
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeQuickPay = () => openBatchDetailModal(batchId);
  document.getElementById('btnCloseQuickPayModal')?.addEventListener('click', closeQuickPay);
  document.getElementById('btnCancelQuickPay')?.addEventListener('click', closeQuickPay);

  document.getElementById('quickPayBatchOrderForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = Number(document.getElementById('quickPayAmount')?.value);
    const paymentMethod = document.getElementById('quickPayMethod')?.value || 'EFECTIVO';
    const notes = document.getElementById('quickPayNotes')?.value || 'Pago registrado desde resumen de lote';

    if (!amount || amount <= 0) {
      showToast('Ingresa un monto válido mayor a 0', 'danger');
      return;
    }

    try {
      await api.addOrderPayment(orderId, {
        amount,
        paymentMethod,
        notes,
        registeredBy: store.currentUser || 'Edier',
      });
      showToast(`¡Pago de ${formatCOP(amount)} registrado con éxito para ${orderNumber}! 💵`);
      openBatchDetailModal(batchId);
      const mainContainer = document.getElementById('contentContainer');
      if (mainContainer) loadBatchesList(mainContainer);
    } catch (err) {
      showToast(err.message || 'Error al registrar pago', 'danger');
    }
  });
}

// Modal para Retirar / Ajustar Litros de Lote (Consumo Socios, Muestras, Mermas)
async function openBatchDischargeModal(batchIdOrObj, parentContainer = null) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  try {
    const batch = typeof batchIdOrObj === 'object' && batchIdOrObj.batchCode ? batchIdOrObj : await api.getBatchById(batchIdOrObj);
    const staffList = await api.getStaff({ includeInactive: false });
    const partners = staffList.filter((s) => s.type === 'SOCIO' || s.role === 'SOCIO');

    const p1 = batch.price1L || 12000;
    const p2 = batch.price2L || 24000;

    const remainingAvailable = batch.remainingAvailableLiters !== undefined
      ? batch.remainingAvailableLiters
      : Math.max(0, batch.totalLitersProduced - (batch.totalSoldLiters || 0) - (batch.totalDischargedLiters || 0));

    modalOverlay.innerHTML = `
      <div class="modal-overlay active">
        <div class="modal-card" style="max-width: 520px;">
          <div class="modal-header">
            <h3 class="modal-title">🍶 Retirar / Descontar Litros del Lote</h3>
            <button class="modal-close-btn" id="btnCloseDischargeModal">✕</button>
          </div>
          <form id="batchDischargeForm">
            <div class="modal-body">
              
              <!-- Info del Lote -->
              <div style="background: var(--bg-app); border: 1.5px solid var(--border-color); padding: 12px 14px; border-radius: var(--radius-md); margin-bottom: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <strong style="color: var(--primary); font-size: 1.05rem;">Lote #${escapeHtml(batch.batchCode)} (${escapeHtml(batch.flavor)})</strong>
                  <span class="badge" style="background: ${remainingAvailable > 0 ? '#DCFCE7' : '#FEE2E2'}; color: ${remainingAvailable > 0 ? '#059669' : '#DC2626'}; font-weight: 800; font-size: 0.8rem;">
                    ${remainingAvailable > 0 ? `🟢 ${remainingAvailable.toFixed(1)}L libres` : `🔴 0.0L libres (Lleno)`}
                  </span>
                </div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">
                  Precio comercial de venta: 1L = ${formatCOP(p1)} • 2L = ${formatCOP(p2)}
                </div>
              </div>

              <!-- Selector de Presentación y Cantidad -->
              <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 10px; margin-bottom: 12px;">
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label">Presentación a Retirar *</label>
                  <select id="dischargeBottleSize" class="form-select" style="font-weight: 700;">
                    <option value="1L" selected>🍾 Botella 1L (${formatCOP(p1)})</option>
                    <option value="2L">🍾 Botella 2L (${formatCOP(p2)})</option>
                    <option value="OTRA">🍶 Litros Directos / Granel</option>
                  </select>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" id="dischargeQtyLabel">Cantidad (Botellas) *</label>
                  <input 
                    type="number" 
                    id="dischargeQtyBottles" 
                    class="form-input" 
                    min="1" 
                    step="any" 
                    value="1" 
                    style="font-size: 1.1rem; font-weight: 800; text-align: center; color: var(--primary);" 
                    required 
                  />
                </div>
              </div>

              <!-- Motivo del Retiro -->
              <div class="form-group">
                <label class="form-label">Motivo del Retiro *</label>
                <select id="dischargeReasonType" class="form-select" style="font-weight: 700;">
                  <option value="CONSUMO_SOCIO" selected>👤 Consumo Propio de Socio (Cargar a Utilidades)</option>
                  <option value="MUESTRA_DEGUSTACION">🍓 Muestra Comercial / Degustación a Clientes</option>
                  <option value="MERMA_DANO">⚠️ Merma / Daño Físico de Botella / Vencimiento</option>
                  <option value="CORTESIA">🎁 Cortesía / Obsequio Promocional</option>
                  <option value="OTRO">📝 Otro Motivo</option>
                </select>
              </div>

              <!-- Selector de Socio (Visible si es CONSUMO_SOCIO) -->
              <div class="form-group" id="dischargePartnerGroup">
                <label class="form-label">Socio que realiza el consumo *</label>
                <select id="dischargeStaffMemberId" class="form-select" style="font-weight: 700; color: var(--primary);">
                  ${
                    partners.length > 0
                      ? partners.map((p) => `<option value="${p.id}">👤 ${escapeHtml(p.fullName)} (${p.role || 'Socio'})</option>`).join('')
                      : '<option value="">-- No hay socios registrados en el módulo de personal --</option>'
                  }
                </select>
                <small style="color: #0369A1; font-size: 0.76rem; font-weight: 600; display: block; margin-top: 4px;">
                  ℹ️ Se registrará automáticamente un retiro en especie a precio comercial en la cuenta de utilidades del socio.
                </small>
              </div>

              <!-- Resumen Calculado de Litros y Monto -->
              <div style="background: #FAF5FF; border: 1.5px solid #DDD6FE; border-radius: var(--radius-md); padding: 10px 14px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Litros a Descontar:</span>
                  <div style="font-size: 1.25rem; font-weight: 800; color: #0369A1;" id="calcDischargeLiters">1.0 L</div>
                </div>
                <div style="text-align: right;">
                  <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Valor Comercial Total:</span>
                  <div style="font-size: 1.25rem; font-weight: 800; color: var(--primary);" id="calcDischargeAmount">${formatCOP(p1)}</div>
                </div>
              </div>

              <!-- Notas / Observaciones -->
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">Notas / Observación (Opcional)</label>
                <input type="text" id="dischargeNotes" class="form-input" placeholder="Ej: Yogur para la casa de Yeilin, degustación restaurante..." />
              </div>

            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" id="btnCloseDischargeFooter">Cancelar</button>
              <button type="submit" class="btn btn-accent" id="btnSubmitDischarge" style="padding: 10px 22px; font-weight: 800;">
                ✅ Confirmar Retiro
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeDischargeModal = () => (modalOverlay.innerHTML = '');
    document.getElementById('btnCloseDischargeModal')?.addEventListener('click', closeDischargeModal);
    document.getElementById('btnCloseDischargeFooter')?.addEventListener('click', closeDischargeModal);

    const sizeSelect = document.getElementById('dischargeBottleSize');
    const qtyInput = document.getElementById('dischargeQtyBottles');
    const qtyLabel = document.getElementById('dischargeQtyLabel');
    const reasonSelect = document.getElementById('dischargeReasonType');
    const partnerGroup = document.getElementById('dischargePartnerGroup');
    const partnerSelect = document.getElementById('dischargeStaffMemberId');
    const calcLitersEl = document.getElementById('calcDischargeLiters');
    const calcAmountEl = document.getElementById('calcDischargeAmount');

    function updateCalculations() {
      const size = sizeSelect.value;
      const qty = Math.max(0.1, Number(qtyInput.value) || 1);
      
      let liters = 0;
      let amount = 0;

      if (size === '2L') {
        liters = qty * 2;
        amount = qty * p2;
        if (qtyLabel) qtyLabel.innerText = 'Cantidad (Botellas 2L) *';
      } else if (size === '1L') {
        liters = qty * 1;
        amount = qty * p1;
        if (qtyLabel) qtyLabel.innerText = 'Cantidad (Botellas 1L) *';
      } else {
        liters = qty;
        amount = qty * p1;
        if (qtyLabel) qtyLabel.innerText = 'Cantidad (Litros) *';
      }

      if (calcLitersEl) calcLitersEl.innerText = `${liters.toFixed(1)} L`;
      if (calcAmountEl) calcAmountEl.innerText = formatCOP(amount);
    }

    sizeSelect?.addEventListener('change', updateCalculations);
    qtyInput?.addEventListener('input', updateCalculations);

    reasonSelect?.addEventListener('change', (e) => {
      const isPartner = e.target.value === 'CONSUMO_SOCIO';
      if (partnerGroup) {
        partnerGroup.style.display = isPartner ? 'block' : 'none';
      }
    });

    document.getElementById('batchDischargeForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const size = sizeSelect.value;
      const qty = Number(qtyInput.value);
      if (!qty || qty <= 0) {
        showToast('Ingresa una cantidad válida mayor a 0', 'danger');
        return;
      }

      const reasonType = reasonSelect.value;
      const staffMemberId = reasonType === 'CONSUMO_SOCIO' ? partnerSelect?.value : null;

      if (reasonType === 'CONSUMO_SOCIO' && !staffMemberId) {
        showToast('Debes seleccionar el socio beneficiario del consumo', 'danger');
        return;
      }

      let totalLiters = size === '2L' ? qty * 2 : (size === '1L' ? qty * 1 : qty);
      let unitPrice = size === '2L' ? p2 : p1;

      const payload = {
        bottleSize: size,
        quantityBottles: qty,
        totalLiters,
        unitPrice,
        reasonType,
        staffMemberId: staffMemberId ? Number(staffMemberId) : undefined,
        notes: document.getElementById('dischargeNotes')?.value || undefined,
        registeredBy: store.authUser?.name || store.currentUser || 'Edier',
      };

      try {
        const res = await api.createBatchDischarge(batch.id, payload);
        showToast(res.message || `Retiro de ${totalLiters}L registrado exitosamente 🍶`);
        closeDischargeModal();

        const mainContainer = document.getElementById('contentContainer');
        if (mainContainer) loadBatchesList(mainContainer);
      } catch (err) {
        showToast(err.message || 'Error al registrar retiro del lote', 'danger');
      }
    });
  } catch (err) {
    console.error('Error opening batch discharge modal:', err);
    showToast('Error al preparar modal de retiro', 'danger');
  }
}

// Modal para editar lote
async function openEditBatchModal(batchId) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  const batch = await api.getBatchById(batchId);
  const p1 = batch.price1L || 12000;
  const p2 = batch.price2L || 24000;
  const b1 = batch.bottles1LProduced || 0;
  const b2 = batch.bottles2LProduced || 0;
  const milk = batch.milkUsedLiters || 0;
  const produced = batch.totalLitersProduced || milk;
  const prepDate = batch.preparationDate ? toColombiaDateStr(batch.preparationDate) : getTodayLocalDateStr();
  const expDate = batch.expirationDate ? toColombiaDateStr(batch.expirationDate) : '';

  const standardFlavors = ['Natural', 'Natural Bajo en Azúcar', 'Natural Sin Azúcar', 'Fresa', 'Melocotón', 'Mora', 'Maracuyá'];
  const isCustomFlavor = !standardFlavors.includes(batch.flavor);

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 520px;">
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
                  <option value="Natural Bajo en Azúcar" ${batch.flavor === 'Natural Bajo en Azúcar' ? 'selected' : ''}>Natural Bajo en Azúcar</option>
                  <option value="Natural Sin Azúcar" ${batch.flavor === 'Natural Sin Azúcar' ? 'selected' : ''}>Natural Sin Azúcar (Stevia)</option>
                  <option value="Fresa" ${batch.flavor === 'Fresa' ? 'selected' : ''}>Fresa (Frutos Rojos)</option>
                  <option value="Melocotón" ${batch.flavor === 'Melocotón' ? 'selected' : ''}>Melocotón / Durazno</option>
                  <option value="Mora" ${batch.flavor === 'Mora' ? 'selected' : ''}>Mora Silvestre</option>
                  <option value="Maracuyá" ${batch.flavor === 'Maracuyá' ? 'selected' : ''}>Maracuyá Tropical</option>
                  <option value="OTRO" ${isCustomFlavor ? 'selected' : ''}>✍️ Otro sabor o variante personalizada...</option>
                </select>
                <div id="editCustomFlavorGroup" style="${isCustomFlavor ? 'display: block;' : 'display: none;'} margin-top: 6px;">
                  <input type="text" id="editCustomBatchFlavor" class="form-input" value="${isCustomFlavor ? escapeHtml(batch.flavor) : ''}" placeholder="Escribe el sabor o variante..." />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Estado *</label>
                <select id="editBatchStatus" class="form-select">
                  <option value="COMPLETADO" ${batch.status === 'COMPLETADO' ? 'selected' : ''}>✅ Disponible (En Venta)</option>
                  <option value="AGOTADO" ${batch.status === 'AGOTADO' ? 'selected' : ''}>📦 Agotado (Todo vendido)</option>
                  <option value="DESCARTADO" ${batch.status === 'DESCARTADO' ? 'selected' : ''}>🚫 Baja / Descartado</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Fecha Elaboración *</label>
                <input type="date" id="editBatchDate" class="form-input" value="${prepDate}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Fecha Vencimiento (Opcional)</label>
                <input type="date" id="editBatchExpDate" class="form-input" value="${expDate}" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">🥛 Leche Invertida (L) *</label>
                <input type="number" id="editBatchMilk" class="form-input" min="0.1" step="any" value="${milk}" required />
              </div>
              <div class="form-group">
                <label class="form-label">🍶 Yogur Salido (L) *</label>
                <input type="number" id="editBatchTotalProduced" class="form-input" min="0.1" step="any" value="${produced}" required />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">🍾 Botellas 1L Envasadas</label>
                <input type="number" id="editBatchB1" class="form-input" min="0" step="any" value="${b1}" />
              </div>
              <div class="form-group">
                <label class="form-label">🍾 Botellas 2L Envasadas</label>
                <input type="number" id="editBatchB2" class="form-input" min="0" step="any" value="${b2}" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">💲 Precio Venta 1L ($ COP) *</label>
                <input type="number" id="editBatchPrice1L" class="form-input" min="0" step="any" value="${p1}" required />
              </div>
              <div class="form-group">
                <label class="form-label">💲 Precio Venta 2L ($ COP) *</label>
                <input type="number" id="editBatchPrice2L" class="form-input" min="0" step="any" value="${p2}" required />
              </div>
            </div>

            <div style="background: var(--bg-app); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; margin-bottom: 12px; display: flex; justify-content: space-between; font-size: 0.85rem;">
              <span>Rendimiento recalculado:</span>
              <strong id="editYieldPreview" style="color: var(--success);">${batch.yieldPercentage}%</strong>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Notas Adicionales</label>
              <input type="text" id="editBatchNotes" class="form-input" value="${batch.notes || ''}" placeholder="Ej: Observaciones de la fermentación..." />
            </div>

          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btnCancelEditBatchModal">Cancelar</button>
            <button type="submit" class="btn btn-accent">Guardar Cambios</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const editMilk = document.getElementById('editBatchMilk');
  const editTotalProduced = document.getElementById('editBatchTotalProduced');
  const editB1 = document.getElementById('editBatchB1');
  const editB2 = document.getElementById('editBatchB2');
  const editYieldPreview = document.getElementById('editYieldPreview');

  const recalculateEdit = () => {
    const m = Number(editMilk.value) || 0;
    const p = Number(editTotalProduced.value) || 0;
    if (m > 0) {
      const pct = Math.round((p / m) * 100);
      editYieldPreview.textContent = `${pct}%`;
      editYieldPreview.style.color = pct >= 85 ? 'var(--success)' : 'var(--warning)';
    }
  };

  editMilk?.addEventListener('input', recalculateEdit);
  editTotalProduced?.addEventListener('input', recalculateEdit);
  editB1?.addEventListener('input', () => {
    const b1 = Number(editB1.value) || 0;
    const b2 = Number(editB2.value) || 0;
    if (b1 * 1 + b2 * 2 > 0) editTotalProduced.value = b1 * 1 + b2 * 2;
    recalculateEdit();
  });
  editB2?.addEventListener('input', () => {
    const b1 = Number(editB1.value) || 0;
    const b2 = Number(editB2.value) || 0;
    if (b1 * 1 + b2 * 2 > 0) editTotalProduced.value = b1 * 1 + b2 * 2;
    recalculateEdit();
  });

  const editFlavorSelect = document.getElementById('editBatchFlavor');
  const editCustomFlavorGroup = document.getElementById('editCustomFlavorGroup');
  const editCustomBatchFlavor = document.getElementById('editCustomBatchFlavor');

  editFlavorSelect?.addEventListener('change', () => {
    if (editFlavorSelect.value === 'OTRO') {
      if (editCustomFlavorGroup) editCustomFlavorGroup.style.display = 'block';
      if (editCustomBatchFlavor) editCustomBatchFlavor.focus();
    } else {
      if (editCustomFlavorGroup) editCustomFlavorGroup.style.display = 'none';
    }
  });

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseEditBatchModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelEditBatchModal')?.addEventListener('click', closeModal);

  document.getElementById('editBatchForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const flavorVal = editFlavorSelect?.value || 'Natural';
    const finalFlavor = flavorVal === 'OTRO'
      ? (editCustomBatchFlavor?.value.trim() || 'Personalizado')
      : flavorVal;

    const payload = {
      flavor: finalFlavor,
      status: document.getElementById('editBatchStatus').value,
      price1L: Number(document.getElementById('editBatchPrice1L')?.value) || 12000,
      price2L: Number(document.getElementById('editBatchPrice2L')?.value) || 24000,
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
      <div class="modal-card" style="max-width: 480px;">
        <div class="modal-header">
          <h3 class="modal-title" style="color: var(--danger);">🚫 Desactivar Lote: ${batchCode}</h3>
          <button class="modal-close-btn" id="btnCloseDeactModal">✕</button>
        </div>
        <form id="deactivateBatchForm">
          <div class="modal-body">
            <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 14px;">
              El lote no se borrará permanentemente, sino que quedará como <strong>Desactivado</strong> para mantener el historial.
            </p>

            <div class="form-group">
              <label class="form-label">Motivo de Desactivación *</label>
              <input type="text" id="deactReason" class="form-input" placeholder="Ej: Se dañó la fermentación / Error de digitación" required />
            </div>

            <!-- Opción para desvincular pedidos y dejarlos como preventa -->
            <div style="margin-top: 12px; background: #FAF5FF; border: 1.5px solid #DDD6FE; border-radius: var(--radius-sm); padding: 10px 12px;">
              <label style="display: flex; align-items: flex-start; gap: 8px; font-size: 0.86rem; font-weight: 800; color: var(--primary); cursor: pointer;">
                <input type="checkbox" id="chkUnlinkOrders" checked style="width: 17px; height: 17px; margin-top: 2px; cursor: pointer; accent-color: var(--primary);" />
                <span>🥣 Liberar pedidos asociados y dejarlos como "Encargo Preventa (Sin lote)"</span>
              </label>
              <small style="display: block; color: #6B21A8; margin-top: 4px; margin-left: 25px; font-size: 0.76rem; font-weight: 600;">
                (Recomendado: Los clientes conservan su encargo y podrás asociarlos al próximo lote que prepares)
              </small>
            </div>

            <!-- Opción para restaurar stock de insumos -->
            <div style="margin-top: 10px; background: var(--bg-app); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 10px 12px;">
              <label style="display: flex; align-items: center; gap: 8px; font-size: 0.86rem; font-weight: 700; cursor: pointer;">
                <input type="checkbox" id="chkRestoreStock" style="width: 16px; height: 16px; cursor: pointer;" />
                Restaurar stock de los insumos utilizados
              </label>
              <small style="display: block; color: var(--text-muted); margin-top: 4px; margin-left: 24px; font-size: 0.76rem;">
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
    const unlinkOrders = document.getElementById('chkUnlinkOrders')?.checked ?? true;

    try {
      const res = await api.deactivateBatch(batchId, reason, restoreStock, unlinkOrders);
      showToast(res.message || 'Lote desactivado correctamente', 'warning');
      closeModal();
      renderBatches(document.getElementById('contentContainer'));
    } catch (err) {
      showToast('Error al desactivar lote', 'danger');
    }
  });
}

// Modal para vinculación masiva e inteligente de encargos preventa a un lote
async function openLinkOrdersModal(batchId, batchCode, flavor, container = null) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 600px;">
        <div class="modal-header">
          <h3 class="modal-title">⚡ Vincular Encargos Preventa a Lote</h3>
          <button class="modal-close-btn" id="btnCloseLinkOrdersModal">✕</button>
        </div>
        <div class="modal-body">
          <div style="text-align: center; padding: 24px; color: var(--text-muted);">
            Buscando encargos pendientes de <strong>${flavor}</strong>... 🥛
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btnCloseLinkOrdersModal')?.addEventListener('click', () => (modalOverlay.innerHTML = ''));

  try {
    const data = await api.getPendingBatchOrders(flavor);
    const orders = data.orders || [];

    if (orders.length === 0) {
      modalOverlay.querySelector('.modal-body').innerHTML = `
        <div style="text-align: center; padding: 24px;">
          <div style="font-size: 2.5rem; margin-bottom: 8px;">✅</div>
          <h4 style="color: var(--primary); font-weight: 800; margin: 0 0 6px 0;">¡No hay encargos pendientes sin lote!</h4>
          <p style="color: var(--text-muted); font-size: 0.88rem; margin: 0;">
            Todos los pedidos registrados de sabor <strong>${flavor}</strong> ya tienen un lote asignado o ya han sido entregados.
          </p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" id="btnCloseNoPendingModal">Entendido</button>
        </div>
      `;
      document.getElementById('btnCloseNoPendingModal')?.addEventListener('click', () => (modalOverlay.innerHTML = ''));
      return;
    }

    const todayStr = getTodayLocalDateStr();
    const tomorrowStr = getTomorrowDateStr();

    modalOverlay.querySelector('.modal-body').innerHTML = `
      <div style="background: #ECFDF5; border: 1.5px solid #A7F3D0; border-radius: var(--radius-md); padding: 12px 14px; margin-bottom: 14px;">
        <div style="font-weight: 800; color: #065F46; font-size: 0.95rem; display: flex; align-items: center; gap: 6px;">
          <span>🥛</span> Lote Destino: <strong>${batchCode}</strong> (${flavor})
        </div>
        <div style="font-size: 0.82rem; color: #047857; margin-top: 4px;">
          Selecciona qué encargos corresponden a la entrega de este lote. Los pedidos a futuro se pueden desmarcar para producirlos en su fecha.
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: gap: 8px; margin-bottom: 10px;">
        <span style="font-size: 0.84rem; font-weight: 800; color: var(--text-main);">
          📋 Encargos Disponibles (${orders.length}):
        </span>
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          <button type="button" class="btn btn-outline btn-sm" id="btnFilterToday" style="font-size: 0.75rem; padding: 3px 9px; font-weight: 700; color: #92400E; border-color: #FCD34D; background: #FFFBEB;">
            🛵 Solo Hoy
          </button>
          <button type="button" class="btn btn-outline btn-sm" id="btnFilterTomorrow" style="font-size: 0.75rem; padding: 3px 9px; font-weight: 700; color: #3730A3; border-color: #C7D2FE; background: #EEF2FF;">
            🛵 Solo Mañana
          </button>
          <button type="button" class="btn btn-outline btn-sm" id="btnSelectAllOrders" style="font-size: 0.75rem; padding: 3px 9px; font-weight: 700; color: #065F46; border-color: #A7F3D0; background: #ECFDF5;">
            📅 Todos
          </button>
          <button type="button" class="btn btn-outline btn-sm" id="btnDeselectAllOrders" style="font-size: 0.75rem; padding: 3px 9px; color: var(--text-muted); border-color: #E2E8F0;">
            🚫 Ninguno
          </button>
        </div>
      </div>

      <div style="max-height: 250px; overflow-y: auto; border: 1.5px solid var(--border-color); border-radius: var(--radius-sm);">
        <table class="app-table" style="margin: 0; font-size: 0.82rem;">
          <thead>
            <tr style="background: var(--bg-app);">
              <th style="width: 36px; text-align: center;">✓</th>
              <th>Cliente / Pedido</th>
              <th>Fecha Entrega</th>
              <th>Litros</th>
              <th>Total</th>
              <th>Pago</th>
            </tr>
          </thead>
          <tbody>
            ${orders
              .map((o) => {
                const delivStr = o.deliveryDate ? toColombiaDateStr(o.deliveryDate) : '';
                const isToday = delivStr === todayStr || (!delivStr && delivStr !== 'null');
                const isTomorrow = delivStr === tomorrowStr;
                let dateBadge = `<span style="font-size: 0.74rem; color: var(--text-muted);">Sin fecha (${formatDate(o.orderDate)})</span>`;
                if (delivStr === todayStr) {
                  dateBadge = `<span class="badge" style="background: #FEF3C7; color: #92400E; font-size: 0.72rem; font-weight: 800;">🛵 Entrega Hoy</span>`;
                } else if (delivStr === tomorrowStr) {
                  dateBadge = `<span class="badge" style="background: #E0E7FF; color: #3730A3; font-size: 0.72rem; font-weight: 800;">🛵 Entrega Mañana</span>`;
                } else if (delivStr < todayStr) {
                  dateBadge = `<span class="badge" style="background: #FEE2E2; color: #DC2626; font-size: 0.72rem; font-weight: 800;">⚠️ Vencido (${formatDate(o.deliveryDate)})</span>`;
                } else if (delivStr > tomorrowStr) {
                  dateBadge = `<span class="badge" style="background: #F1F5F9; color: #475569; font-size: 0.72rem; font-weight: 700;">📅 Futuro (${formatDate(o.deliveryDate)})</span>`;
                }

                return `
                  <tr style="cursor: pointer;" onclick="const chk = this.querySelector('input[type=checkbox]'); if (event.target !== chk) { chk.checked = !chk.checked; chk.dispatchEvent(new Event('change')); }">
                    <td style="text-align: center;" onclick="event.stopPropagation();">
                      <input type="checkbox" class="chk-order-to-link" value="${o.id}" data-liters="${o.totalLiters}" data-is-today="${isToday ? '1' : '0'}" data-is-tomorrow="${isTomorrow ? '1' : '0'}" ${isToday ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--primary); cursor: pointer;" />
                    </td>
                    <td>
                      <strong>${o.customer?.fullName || 'Cliente'}</strong>
                      <div style="font-size: 0.72rem; color: var(--text-muted);">${o.orderNumber}</div>
                    </td>
                    <td>${dateBadge}</td>
                    <td><strong style="color: var(--primary);">${o.totalLiters} L</strong></td>
                    <td><strong>${formatCOP(o.totalAmount)}</strong></td>
                    <td>
                      ${(() => {
                        const isPaid = o.paymentStatus === 'PAID' || (o.paidAmount >= o.totalAmount && o.totalAmount > 0) || (o.pendingAmount !== undefined && o.pendingAmount <= 0 && (o.paidAmount || 0) > 0);
                        const isPartial = !isPaid && ((o.paidAmount || 0) > 0 || o.paymentStatus === 'PARTIAL');
                        if (isPaid) return '<span class="badge badge-paid" style="font-size: 0.7rem; font-weight: 800;">✅ Pagado</span>';
                        if (isPartial) return `<span class="badge" style="background: #FEF3C7; color: #92400E; font-size: 0.7rem; font-weight: 800;">🟡 Abono (${formatCOP(o.paidAmount)})</span>`;
                        return '<span class="badge badge-pending" style="font-size: 0.7rem; font-weight: 800;">⏳ Pendiente</span>';
                      })()}
                    </td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center; background: var(--bg-app); padding: 8px 12px; border-radius: var(--radius-sm);">
        <span style="font-size: 0.82rem; color: var(--text-muted); font-weight: 700;">Litros seleccionados:</span>
        <strong id="linkSelectedLitersDisplay" style="color: var(--primary); font-size: 0.95rem;">0 Litros</strong>
      </div>
    `;

    // Footer
    const footerDiv = document.createElement('div');
    footerDiv.className = 'modal-footer';
    footerDiv.innerHTML = `
      <button type="button" class="btn btn-outline" id="btnCancelLinkModal">Cancelar</button>
      <button type="button" class="btn btn-accent" id="btnConfirmLinkOrders" style="padding: 9px 20px; font-weight: 800;">
        🔗 Vincular Pedidos al Lote
      </button>
    `;
    modalOverlay.querySelector('.modal-card').appendChild(footerDiv);

    const updateSelectedLiters = () => {
      const checked = modalOverlay.querySelectorAll('.chk-order-to-link:checked');
      let sumLiters = 0;
      checked.forEach((chk) => {
        sumLiters += Number(chk.dataset.liters) || 0;
      });
      const display = modalOverlay.querySelector('#linkSelectedLitersDisplay');
      if (display) display.textContent = `${sumLiters} Litros (${checked.length} pedidos)`;
      const confirmBtn = modalOverlay.querySelector('#btnConfirmLinkOrders');
      if (confirmBtn) {
        confirmBtn.disabled = checked.length === 0;
        confirmBtn.textContent = `🔗 Vincular ${checked.length} Pedido(s) (${sumLiters}L)`;
      }
    };

    modalOverlay.querySelectorAll('.chk-order-to-link').forEach((chk) => {
      chk.addEventListener('change', updateSelectedLiters);
    });

    modalOverlay.querySelector('#btnFilterToday')?.addEventListener('click', () => {
      modalOverlay.querySelectorAll('.chk-order-to-link').forEach((chk) => {
        chk.checked = chk.dataset.isToday === '1';
      });
      updateSelectedLiters();
    });

    modalOverlay.querySelector('#btnFilterTomorrow')?.addEventListener('click', () => {
      modalOverlay.querySelectorAll('.chk-order-to-link').forEach((chk) => {
        chk.checked = chk.dataset.isTomorrow === '1';
      });
      updateSelectedLiters();
    });

    modalOverlay.querySelector('#btnSelectAllOrders')?.addEventListener('click', () => {
      modalOverlay.querySelectorAll('.chk-order-to-link').forEach((chk) => {
        chk.checked = true;
      });
      updateSelectedLiters();
    });

    modalOverlay.querySelector('#btnDeselectAllOrders')?.addEventListener('click', () => {
      modalOverlay.querySelectorAll('.chk-order-to-link').forEach((chk) => {
        chk.checked = false;
      });
      updateSelectedLiters();
    });

    modalOverlay.querySelector('#btnCancelLinkModal')?.addEventListener('click', () => (modalOverlay.innerHTML = ''));

    modalOverlay.querySelector('#btnConfirmLinkOrders')?.addEventListener('click', async () => {
      const checked = modalOverlay.querySelectorAll('.chk-order-to-link:checked');
      const orderIds = Array.from(checked).map((chk) => Number(chk.value));
      if (orderIds.length === 0) {
        showToast('Selecciona al menos un pedido para vincular', 'warning');
        return;
      }
      try {
        const res = await api.linkOrdersToBatch(batchId, { orderIds });
        showToast(res.message || 'Pedidos vinculados con éxito 🍶');
        modalOverlay.innerHTML = '';
        if (container) {
          loadBatchesList(container);
        } else {
          renderBatches(document.getElementById('contentContainer'));
        }
      } catch (err) {
        showToast(err.message || 'Error al vincular pedidos', 'danger');
      }
    });

    updateSelectedLiters();
  } catch (err) {
    console.error('Error opening link orders modal:', err);
    modalOverlay.querySelector('.modal-body').innerHTML = `
      <div style="color: var(--danger); text-align: center; padding: 20px;">
        Error al cargar encargos pendientes: ${err.message}
      </div>
    `;
  }
}
