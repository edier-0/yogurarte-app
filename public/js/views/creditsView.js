import { api } from '../api.js';
import { formatCOP, formatDate, formatDateTime, formatPaymentBadge, getTodayLocalDateStr, showToast, store } from '../store.js';
import { paginateArray, renderPaginationHtml, attachPaginationEvents, PAGE_SIZE } from '../components/pagination.js';

let creditsCurrentPage = 1;
let creditFilterStatus = 'ALL'; // 'ALL' | 'ACTIVO' | 'PAGADO_TOTAL'

export async function renderCredits(container) {
  container.innerHTML = `
    <!-- Barra Superior de Acciones de Créditos -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 14px;">
      <div>
        <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--primary); margin: 0;">
          💳 Compras a Cuotas y Créditos
        </h3>
        <span style="font-size: 0.8rem; color: var(--text-muted);">
          Gestión de equipos, maquinaria, adecuaciones y compras financiadas
        </span>
      </div>

      <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
        <!-- Filtro por Estado -->
        <div style="display: flex; gap: 4px; background: var(--bg-card); padding: 4px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); align-items: center;">
          <button class="btn btn-sm ${creditFilterStatus === 'ALL' ? 'btn-primary' : 'btn-outline'}" data-cstatus="ALL">Todos</button>
          <button class="btn btn-sm ${creditFilterStatus === 'ACTIVO' ? 'btn-primary' : 'btn-outline'}" data-cstatus="ACTIVO">🟢 Activos</button>
          <button class="btn btn-sm ${creditFilterStatus === 'PAGADO_TOTAL' ? 'btn-primary' : 'btn-outline'}" data-cstatus="PAGADO_TOTAL">🎉 Pagados</button>
          <button class="btn btn-sm btn-outline" id="btnClearCreditFilters" style="font-weight: 700; color: var(--text-muted); border-color: var(--border-color); display: inline-flex; align-items: center; gap: 4px; margin-left: 4px;" title="Restablecer filtros de créditos">
            <span>🧹</span> Limpiar Filtros
          </button>
        </div>

        <button class="btn btn-accent" id="btnOpenNewCreditModal" style="font-weight: 800;">
          <span>➕</span> Nueva Compra a Crédito
        </button>
      </div>
    </div>

    <!-- KPIs de Deuda y Cuotas -->
    <div id="creditsKpisContainer" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 24px;">
      <div style="text-align: center; padding: 20px; color: var(--text-muted);">Cargando métricas de créditos... 💳</div>
    </div>

    <!-- Lista de Tarjetas de Créditos -->
    <div id="creditsListContainer">
      <div style="text-align: center; padding: 30px; color: var(--text-muted);">Cargando compras a crédito...</div>
    </div>
  `;

  // Listener para limpiar filtros
  container.querySelector('#btnClearCreditFilters')?.addEventListener('click', () => {
    creditFilterStatus = 'ALL';
    creditsCurrentPage = 1;
    renderCredits(container);
  });

  // Listeners de filtro
  container.querySelectorAll('[data-cstatus]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      creditFilterStatus = e.currentTarget.dataset.cstatus;
      creditsCurrentPage = 1;
      container.querySelectorAll('[data-cstatus]').forEach((b) => {
        b.className = b.dataset.cstatus === creditFilterStatus ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline';
      });
      loadCreditsData(container);
    });
  });

  // Botón Nuevo Crédito
  container.querySelector('#btnOpenNewCreditModal')?.addEventListener('click', () => {
    openNewCreditModal(() => loadCreditsData(container));
  });

  await loadCreditsData(container);
}

async function loadCreditsData(container) {
  const kpisContainer = container.querySelector('#creditsKpisContainer');
  const listContainer = container.querySelector('#creditsListContainer');
  if (!kpisContainer || !listContainer) return;

  try {
    const data = await api.getCredits();
    const { totalRemainingBalance, totalDebtFinanced, totalPaidSoFar, activeCount, credits } = data;

    // Próximo vencimiento más cercano entre los activos
    const activeCredits = (credits || []).filter((c) => c.status === 'ACTIVO');
    const sortedByDue = [...activeCredits]
      .filter((c) => c.nextDueDate)
      .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
    const nextDueCredit = sortedByDue[0];

    // Renderizar KPIs
    kpisContainer.innerHTML = `
      <!-- Total Deuda Pendiente -->
      <div style="background: #FEF2F2; padding: 18px; border-radius: var(--radius-md); border: 2.5px solid #EF4444;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: #991B1B;">💳 DEUDA TOTAL PENDIENTE</span>
          <span style="font-size: 1.2rem;">📉</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: #DC2626; margin: 6px 0;">
          ${formatCOP(totalRemainingBalance)}
        </div>
        <div style="font-size: 0.74rem; color: #991B1B; font-weight: 700;">
          ${activeCount} crédito(s) activo(s) por pagar
        </div>
      </div>

      <!-- Total Amortizado / Ya Pagado -->
      <div style="background: #F0FDF4; padding: 18px; border-radius: var(--radius-md); border: 1.5px solid #BBF7D0;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: #166534;">✅ TOTAL YA PAGADO</span>
          <span style="font-size: 1.2rem;">📈</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: #15803D; margin: 6px 0;">
          ${formatCOP(totalPaidSoFar)}
        </div>
        <div style="font-size: 0.74rem; color: #166534; font-weight: 600;">
          De un total financiado de ${formatCOP(totalDebtFinanced)}
        </div>
      </div>

      <!-- Próximo Pago Más Cercano -->
      <div style="background: ${nextDueCredit ? '#FFFBEB' : '#F8FAFC'}; padding: 18px; border-radius: var(--radius-md); border: 1.5px solid ${nextDueCredit ? '#FDE68A' : 'var(--border-color)'};">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: ${nextDueCredit ? '#92400E' : 'var(--text-muted)'};">⏰ PRÓXIMA CUOTA</span>
          <span style="font-size: 1.2rem;">📅</span>
        </div>
        <div style="font-size: 1.4rem; font-weight: 900; color: ${nextDueCredit ? '#D97706' : 'var(--text-main)'}; margin: 6px 0;">
          ${nextDueCredit ? formatCOP(nextDueCredit.installmentAmount || nextDueCredit.remainingBalance) : 'Al día'}
        </div>
        <div style="font-size: 0.74rem; color: ${nextDueCredit ? '#92400E' : 'var(--text-muted)'}; font-weight: 700;">
          ${nextDueCredit ? `📅 ${formatDate(nextDueCredit.nextDueDate)} • ${nextDueCredit.title}` : 'No hay cuotas pendientes'}
        </div>
      </div>

      <!-- Total Equipos / Créditos -->
      <div style="background: #F8FAFC; padding: 18px; border-radius: var(--radius-md); border: 1.5px solid var(--border-color);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; font-weight: 800; color: var(--text-main);">📑 TOTAL BIENES</span>
          <span style="font-size: 1.2rem;">🧊</span>
        </div>
        <div style="font-size: 1.7rem; font-weight: 900; color: var(--primary); margin: 6px 0;">
          ${credits.length}
        </div>
        <div style="font-size: 0.74rem; color: var(--text-muted); font-weight: 600;">
          ${credits.filter((c) => c.status === 'PAGADO_TOTAL').length} pagados totalmente
        </div>
      </div>
    `;

    // Filtrar créditos según botón
    let filteredCredits = credits;
    if (creditFilterStatus !== 'ALL') {
      filteredCredits = credits.filter((c) => c.status === creditFilterStatus);
    }

    if (filteredCredits.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💳</div>
          <div class="empty-state-title">No hay compras a crédito registradas</div>
          <div class="empty-state-text">Registra compras de maquinaria, congeladores, selladoras o adecuaciones a cuotas.</div>
          <button class="btn btn-primary" id="btnEmptyNewCredit">+ Registrar Compra a Crédito</button>
        </div>
      `;
      listContainer.querySelector('#btnEmptyNewCredit')?.addEventListener('click', () => {
        openNewCreditModal(() => loadCreditsData(container));
      });
      return;
    }

    const { pageItems, totalPages, totalItems, currentPage } = paginateArray(filteredCredits, creditsCurrentPage, 15);
    creditsCurrentPage = currentPage;

    // Helper de iconos por categoría
    const getCatIcon = (cat) => {
      if (cat === 'EQUIPO_MAQUINARIA') return '🧊';
      if (cat === 'TRANSPORTE_VEHICULO') return '🛵';
      if (cat === 'INFRAESTRUCTURA_LOCAL') return '🏢';
      if (cat === 'HERRAMIENTAS') return '⚡';
      return '📦';
    };

    // Renderizar tarjetas de crédito
    listContainer.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 18px;">
        ${pageItems
          .map((c) => {
            const isPaid = c.status === 'PAGADO_TOTAL';
            const paidAmount = c.totalAmount - c.remainingBalance;
            const progressPct = c.totalAmount > 0 ? Math.min(100, Math.round((paidAmount / c.totalAmount) * 100)) : 100;
            const icon = getCatIcon(c.category);

            // Alerta de fecha de vencimiento
            let dueBadge = '';
            if (!isPaid && c.nextDueDate) {
              const dueDate = new Date(c.nextDueDate);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

              if (diffDays < 0) {
                dueBadge = `<span class="badge" style="background: #FEE2E2; color: #DC2626; font-weight: 800;">🚨 Vencida (${Math.abs(diffDays)}d)</span>`;
              } else if (diffDays <= 3) {
                dueBadge = `<span class="badge" style="background: #FEF3C7; color: #D97706; font-weight: 800;">⏰ Vence pronto (${diffDays === 0 ? 'Hoy' : diffDays + 'd'})</span>`;
              } else {
                dueBadge = `<span class="badge" style="background: #EFF6FF; color: #2563EB; font-weight: 700;">📅 Vence ${formatDate(c.nextDueDate)}</span>`;
              }
            }

            return `
            <div class="card" style="border: 2px solid ${isPaid ? '#BBF7D0' : '#E2E8F0'}; background: ${isPaid ? '#F0FDF4' : 'var(--bg-card)'}; border-radius: var(--radius-md); padding: 18px; position: relative;">
              
              <!-- Cabecera de la tarjeta -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <div style="display: flex; gap: 10px; align-items: center;">
                  <span style="font-size: 1.6rem; background: var(--bg-app); padding: 8px; border-radius: var(--radius-md);">${icon}</span>
                  <div>
                    <h4 style="font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin: 0;">
                      ${c.title}
                    </h4>
                    <span style="font-size: 0.76rem; color: var(--text-muted); font-weight: 700;">
                      🏢 ${c.creditor}
                    </span>
                  </div>
                </div>

                <div>
                  <span class="badge" style="background: ${isPaid ? '#DCFCE7' : '#FEF3C7'}; color: ${isPaid ? '#15803D' : '#D97706'}; font-weight: 800;">
                    ${isPaid ? '🎉 PAGADO TOTAL' : '🟢 ACTIVO'}
                  </span>
                </div>
              </div>

              <!-- Barra de Progreso de Pago -->
              <div style="margin-bottom: 14px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 800; margin-bottom: 4px;">
                  <span style="color: #15803D;">Pagado: ${formatCOP(paidAmount)} (${progressPct}%)</span>
                  <span style="color: ${isPaid ? '#15803D' : '#DC2626'};">Saldo: ${formatCOP(c.remainingBalance)}</span>
                </div>
                <div style="width: 100%; height: 10px; background: #E2E8F0; border-radius: 6px; overflow: hidden;">
                  <div style="width: ${progressPct}%; height: 100%; background: ${isPaid ? '#10B981' : '#3B82F6'}; transition: width 0.3s ease;"></div>
                </div>
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 3px; display: flex; justify-content: space-between;">
                  <span>Valor Total: <strong>${formatCOP(c.totalAmount)}</strong> ${c.interestRate > 0 ? `(${c.interestRate}% int)` : ''}</span>
                  <span>Inicial: ${formatCOP(c.initialPayment || 0)}</span>
                </div>
              </div>

              <!-- Detalles de la modalidad -->
              <div style="background: var(--bg-app); border-radius: var(--radius-sm); padding: 10px 12px; font-size: 0.8rem; margin-bottom: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div>
                  <span style="color: var(--text-muted); font-size: 0.72rem;">Modalidad:</span>
                  <div style="font-weight: 800; color: var(--text-main);">
                    ${c.paymentType === 'ABONOS_LIBRES' ? '🕊️ Abonos Libres' : `📅 Cuotas Fijas (${c.paidInstallments}/${c.totalInstallments || '?'})`}
                  </div>
                </div>

                <div>
                  <span style="color: var(--text-muted); font-size: 0.72rem;">Cuota Sugerida:</span>
                  <div style="font-weight: 800; color: var(--primary);">
                    ${c.installmentAmount > 0 ? `${formatCOP(c.installmentAmount)} (${c.frequency.toLowerCase()})` : 'Flexible'}
                  </div>
                </div>

                <div style="grid-column: span 2; display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed var(--border-color); padding-top: 6px; margin-top: 2px;">
                  <div>
                    <span style="color: var(--text-muted); font-size: 0.72rem;">Próximo Pago:</span>
                    <div style="font-weight: 700;">
                      ${c.nextDueDate ? formatDate(c.nextDueDate) : 'N/A'}
                    </div>
                  </div>
                  <div>
                    ${dueBadge}
                  </div>
                </div>
              </div>

              ${c.notes ? `<div style="font-size: 0.74rem; color: var(--text-muted); margin-bottom: 12px;">📝 ${c.notes}</div>` : ''}

              <!-- Botones de Acción -->
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                ${
                  !isPaid
                    ? `
                  <button class="btn btn-sm btn-primary btn-pay-credit" data-id="${c.id}" style="font-weight: 800; flex: 1;">
                    💵 Pagar / Abonar
                  </button>
                  <button class="btn btn-sm btn-outline btn-skip-credit" data-id="${c.id}" style="color: #D97706; border-color: #FDE68A; font-weight: 700;" title="Aplazar cuota con motivo">
                    ⏭️ Aplazar
                  </button>
                `
                    : ''
                }
                <button class="btn btn-sm btn-outline btn-history-credit" data-id="${c.id}" style="font-weight: 700;" title="Ver historial de pagos">
                  📜 Historial (${c.payments?.length || 0})
                </button>
                <button class="btn btn-sm btn-outline btn-del-credit" data-id="${c.id}" style="color: var(--danger); border-color: #FECACA;" title="Eliminar crédito">
                  🗑️
                </button>
              </div>

            </div>
          `;
          })
          .join('')}
      </div>
      ${renderPaginationHtml({
        currentPage: creditsCurrentPage,
        totalPages,
        totalItems,
        pageSize: 15,
        itemName: 'créditos',
        paginationId: 'creditsPagination',
      })}
    `;

    attachPaginationEvents(
      listContainer,
      'creditsPagination',
      (newPage) => {
        creditsCurrentPage = newPage;
        loadCreditsData(container);
      },
      listContainer
    );

    // Listeners de los botones de cada tarjeta
    listContainer.querySelectorAll('.btn-pay-credit').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = Number(e.currentTarget.dataset.id);
        const credit = credits.find((c) => c.id === id);
        if (credit) openPayInstallmentModal(credit, () => loadCreditsData(container));
      });
    });

    listContainer.querySelectorAll('.btn-skip-credit').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = Number(e.currentTarget.dataset.id);
        const credit = credits.find((c) => c.id === id);
        if (credit) openSkipInstallmentModal(credit, () => loadCreditsData(container));
      });
    });

    listContainer.querySelectorAll('.btn-history-credit').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = Number(e.currentTarget.dataset.id);
        const credit = credits.find((c) => c.id === id);
        if (credit) openCreditHistoryModal(credit, () => loadCreditsData(container));
      });
    });

    listContainer.querySelectorAll('.btn-del-credit').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = Number(e.currentTarget.dataset.id);
        if (confirm('¿Estás seguro de eliminar este crédito y su historial de pagos?')) {
          try {
            await api.deleteCredit(id);
            showToast('Crédito eliminado exitosamente');
            loadCreditsData(container);
          } catch (err) {
            showToast(err.message || 'Error al eliminar crédito', 'danger');
          }
        }
      });
    });
  } catch (error) {
    console.error('Error loading credits:', error);
    listContainer.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--danger); font-weight: 700;">
        Error al cargar créditos: ${error.message}
      </div>
    `;
  }
}

// -----------------------------------------------------------------
// MODAL 1: NUEVA COMPRA A CRÉDITO
// -----------------------------------------------------------------
export function openNewCreditModal(onSaved) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 540px;">
        <div class="modal-header">
          <h3 class="modal-title">💳 Nueva Compra a Crédito / Financiada</h3>
          <button class="modal-close-btn" id="btnCloseNewCreditModal">✕</button>
        </div>
        <form id="newCreditForm">
          <div class="modal-body">
            
            <div class="form-row">
              <div class="form-group" style="flex: 2;">
                <label class="form-label">Nombre del Bien / Equipo / Motivo *</label>
                <input type="text" id="creditTitle" class="form-input" placeholder="Ej: Congelador 400L, Selladora..." required />
              </div>

              <div class="form-group" style="flex: 1;">
                <label class="form-label">Categoría</label>
                <select id="creditCategory" class="form-select">
                  <option value="EQUIPO_MAQUINARIA">🧊 Equipo / Maquinaria</option>
                  <option value="INFRAESTRUCTURA_LOCAL">🏢 Adecuación Local</option>
                  <option value="TRANSPORTE_VEHICULO">🛵 Vehículo / Moto</option>
                  <option value="HERRAMIENTAS">⚡ Herramientas</option>
                  <option value="OTRO">📦 Otro</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Proveedor / Acreedor / Almacén *</label>
              <input type="text" id="creditCreditor" class="form-input" placeholder="Ej: ElectroHogar, Distribuidora, Préstamo personal..." required />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Precio Base / Contado ($ COP) *</label>
                <input type="number" id="creditPrincipal" class="form-input" min="1" step="any" placeholder="Ej: 1500000" required style="font-weight: 800;" />
              </div>

              <div class="form-group">
                <label class="form-label">% Interés / Recargo (Opcional)</label>
                <input type="number" id="creditInterest" class="form-input" min="0" step="any" placeholder="0% (Directo)" value="0" />
              </div>
            </div>

            <!-- Resumen de Valor Total -->
            <div id="creditTotalBadge" style="background: #EFF6FF; border: 1.5px solid #BFDBFE; border-radius: var(--radius-sm); padding: 8px 12px; margin-bottom: 14px; font-size: 0.84rem; font-weight: 700; color: #1E40AF; display: flex; justify-content: space-between;">
              <span>Total Financiado: <strong id="lblTotalFinanced">$0</strong></span>
            </div>

            <div class="form-row" style="background: var(--bg-app); padding: 10px; border-radius: var(--radius-sm); border: 1px dashed var(--border-color); margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label">Cuota Inicial ($ COP)</label>
                <input type="number" id="creditInitialPayment" class="form-input" min="0" step="any" placeholder="0 si no dio inicial" value="0" />
              </div>

              <div class="form-group">
                <label class="form-label">Medio Pago Cuota Inicial</label>
                <select id="creditInitialPayMethod" class="form-select" style="font-weight: 700;">
                  <option value="EFECTIVO">💵 Efectivo</option>
                  <option value="NEQUI">🟣 Transferencia Nequi</option>
                  <option value="BANCOLOMBIA">🟡 Transferencia Bancolombia</option>
                  <option value="TRANSFERENCIA">💳 Otra Transferencia</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Modalidad de Pago</label>
                <select id="creditPaymentType" class="form-select">
                  <option value="CUOTAS_FIJAS" selected>📅 Cuotas Fijas Periódicas</option>
                  <option value="ABONOS_LIBRES">🕊️ Abonos Libres / Flexibles</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Frecuencia Sugerida</label>
                <select id="creditFrequency" class="form-select">
                  <option value="MENSUAL" selected>Mensual</option>
                  <option value="QUINCENAL">Quincenal</option>
                  <option value="SEMANAL">Semanal</option>
                  <option value="DIARIA">Diaria</option>
                  <option value="LIBRE">Libre / Sin fecha fija</option>
                </select>
              </div>
            </div>

            <div class="form-row" id="creditFixedPlanRow">
              <div class="form-group">
                <label class="form-label">Número de Cuotas</label>
                <input type="number" id="creditTotalInstallments" class="form-input" min="1" step="1" placeholder="Ej: 10" />
              </div>

              <div class="form-group">
                <label class="form-label">Valor Cuota ($ COP)</label>
                <input type="number" id="creditInstallmentAmount" class="form-input" min="0" step="any" placeholder="Se calcula solo" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Fecha de Compra</label>
                <input type="date" id="creditStartDate" class="form-input" value="${getTodayLocalDateStr()}" required />
              </div>

              <div class="form-group">
                <label class="form-label">Fecha Primer Pago / Vencimiento</label>
                <input type="date" id="creditNextDueDate" class="form-input" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Notas / Garantía / Contrato (Opcional)</label>
              <input type="text" id="creditNotes" class="form-input" placeholder="Ej: Garantía 1 año con factura #..." />
            </div>

          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btnCancelNewCreditModal">Cancelar</button>
            <button type="submit" class="btn btn-primary" style="font-weight: 800;">Guardar Crédito</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const principalInput = document.getElementById('creditPrincipal');
  const interestInput = document.getElementById('creditInterest');
  const initialInput = document.getElementById('creditInitialPayment');
  const totalInstallmentsInput = document.getElementById('creditTotalInstallments');
  const installmentAmountInput = document.getElementById('creditInstallmentAmount');
  const paymentTypeSelect = document.getElementById('creditPaymentType');
  const fixedPlanRow = document.getElementById('creditFixedPlanRow');
  const lblTotal = document.getElementById('lblTotalFinanced');

  const recalculateTotals = () => {
    const principal = Number(principalInput.value) || 0;
    const interestRate = Number(interestInput.value) || 0;
    const initial = Number(initialInput.value) || 0;
    const numInstallments = Number(totalInstallmentsInput.value) || 0;

    const total = principal + principal * (interestRate / 100);
    const remaining = Math.max(0, total - initial);

    lblTotal.textContent = `${formatCOP(total)} (Saldo restante: ${formatCOP(remaining)})`;

    if (numInstallments > 0 && paymentTypeSelect.value === 'CUOTAS_FIJAS') {
      const quota = Math.round(remaining / numInstallments);
      installmentAmountInput.value = quota;
    }
  };

  principalInput?.addEventListener('input', recalculateTotals);
  interestInput?.addEventListener('input', recalculateTotals);
  initialInput?.addEventListener('input', recalculateTotals);
  totalInstallmentsInput?.addEventListener('input', recalculateTotals);

  paymentTypeSelect?.addEventListener('change', (e) => {
    if (e.target.value === 'ABONOS_LIBRES') {
      fixedPlanRow.style.display = 'none';
    } else {
      fixedPlanRow.style.display = 'flex';
      recalculateTotals();
    }
  });

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseNewCreditModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelNewCreditModal')?.addEventListener('click', closeModal);

  document.getElementById('newCreditForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const principal = Number(principalInput.value);
    if (!principal || principal <= 0) {
      showToast('Ingresa un valor base válido', 'danger');
      return;
    }

    const payload = {
      title: document.getElementById('creditTitle').value,
      category: document.getElementById('creditCategory').value,
      creditor: document.getElementById('creditCreditor').value,
      principalAmount: principal,
      interestRate: Number(interestInput.value) || 0,
      initialPayment: Number(initialInput.value) || 0,
      initialPaymentMethod: document.getElementById('creditInitialPayMethod').value,
      paymentType: paymentTypeSelect.value,
      frequency: document.getElementById('creditFrequency').value,
      totalInstallments: Number(totalInstallmentsInput.value) || null,
      installmentAmount: Number(installmentAmountInput.value) || 0,
      startDate: document.getElementById('creditStartDate').value,
      nextDueDate: document.getElementById('creditNextDueDate').value || null,
      notes: document.getElementById('creditNotes').value,
      registeredBy: store.currentUser,
    };

    try {
      await api.createCredit(payload);
      showToast('¡Compra a crédito registrada exitosamente! 💳');
      closeModal();
      if (typeof onSaved === 'function') onSaved();
    } catch (err) {
      showToast(err.message || 'Error al registrar crédito', 'danger');
    }
  });
}

// -----------------------------------------------------------------
// MODAL 2: PAGAR / ABONAR CUOTA
// -----------------------------------------------------------------
export function openPayInstallmentModal(credit, onSaved) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  const suggestedAmount = credit.installmentAmount > 0
    ? Math.min(credit.installmentAmount, credit.remainingBalance)
    : credit.remainingBalance;

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 480px;">
        <div class="modal-header">
          <h3 class="modal-title">💵 Pagar / Abonar Cuota</h3>
          <button class="modal-close-btn" id="btnClosePayCreditModal">✕</button>
        </div>
        <form id="payCreditForm">
          <div class="modal-body">
            
            <div style="background: var(--bg-app); border: 1.5px solid var(--border-color); border-radius: var(--radius-md); padding: 12px; margin-bottom: 14px;">
              <div style="font-weight: 800; font-size: 1.05rem; color: var(--text-main);">${credit.title}</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">Acreedor: <strong>${credit.creditor}</strong></div>
              <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 0.85rem; font-weight: 800;">
                <span style="color: var(--danger);">Saldo Deuda: ${formatCOP(credit.remainingBalance)}</span>
                <span style="color: var(--primary);">Cuota #${credit.paidInstallments + 1}</span>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Monto a Pagar ($ COP) *</label>
                <input type="number" id="payAmount" class="form-input" min="1" max="${credit.remainingBalance}" step="any" value="${suggestedAmount}" required style="font-weight: 900; font-size: 1.1rem; color: var(--primary);" />
              </div>

              <div class="form-group">
                <label class="form-label">Medio de Pago *</label>
                <select id="payMethod" class="form-select" required style="font-weight: 700;">
                  <option value="EFECTIVO" selected>💵 Efectivo (Dinero en Mano)</option>
                  <option value="NEQUI">🟣 Transferencia Nequi</option>
                  <option value="BANCOLOMBIA">🟡 Transferencia Bancolombia</option>
                  <option value="TRANSFERENCIA">💳 Otra Transferencia</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Fecha del Pago</label>
                <input type="date" id="payDate" class="form-input" value="${getTodayLocalDateStr()}" required />
              </div>

              <div class="form-group">
                <label class="form-label">No. Recibo / Comprobante</label>
                <input type="text" id="payReceipt" class="form-input" placeholder="Ej: REC-102 o Nequi M12" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Próxima Fecha de Vencimiento</label>
              <input type="date" id="payNextDueDate" class="form-input" placeholder="Opcional" />
              <small style="color: var(--text-muted); font-size: 0.72rem;">Deja vacío si ya es el último pago o no cambia.</small>
            </div>

            <div class="form-group">
              <label class="form-label">Concepto / Notas del Abono</label>
              <input type="text" id="payJustification" class="form-input" placeholder="Ej: Pago cuota mensual #..." value="Pago cuota ${credit.paidInstallments + 1} a ${credit.title}" />
            </div>

          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btnCancelPayCreditModal">Cancelar</button>
            <button type="submit" class="btn btn-primary" style="font-weight: 800;">Confirmar Pago</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnClosePayCreditModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelPayCreditModal')?.addEventListener('click', closeModal);

  document.getElementById('payCreditForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = Number(document.getElementById('payAmount').value);
    if (!amount || amount <= 0) {
      showToast('Ingresa un monto de pago válido', 'danger');
      return;
    }

    const payload = {
      amount,
      paymentDate: document.getElementById('payDate').value,
      paymentMethod: document.getElementById('payMethod').value,
      receiptNumber: document.getElementById('payReceipt').value,
      justification: document.getElementById('payJustification').value,
      nextDueDate: document.getElementById('payNextDueDate').value || null,
      registeredBy: store.currentUser,
    };

    try {
      const res = await api.payCreditInstallment(credit.id, payload);
      showToast(res.message || '¡Pago de cuota registrado con éxito! 💵');
      closeModal();
      if (typeof onSaved === 'function') onSaved();
    } catch (err) {
      showToast(err.message || 'Error al registrar pago', 'danger');
    }
  });
}

// -----------------------------------------------------------------
// MODAL 3: OMITIR / APLAZAR CUOTA CON MOTIVO
// -----------------------------------------------------------------
export function openSkipInstallmentModal(credit, onSaved) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 480px;">
        <div class="modal-header">
          <h3 class="modal-title">⏭️ Omitir / Aplazar Cuota</h3>
          <button class="modal-close-btn" id="btnCloseSkipCreditModal">✕</button>
        </div>
        <form id="skipCreditForm">
          <div class="modal-body">
            
            <div style="background: #FFFBEB; border: 1.5px solid #FDE68A; border-radius: var(--radius-md); padding: 12px; margin-bottom: 14px;">
              <div style="font-weight: 800; font-size: 1rem; color: #92400E;">${credit.title} (${credit.creditor})</div>
              <div style="font-size: 0.78rem; color: #92400E; margin-top: 4px;">
                Fecha actual de vencimiento: <strong>${credit.nextDueDate ? formatDate(credit.nextDueDate) : 'Sin fecha'}</strong>
              </div>
              <div style="font-size: 0.74rem; color: #B45309; margin-top: 4px;">
                💡 Esta acción no descuenta dinero de la caja, pero deja constancia en el historial y reprograma el cobro.
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Nueva Fecha Reprogramada para el Pago *</label>
              <input type="date" id="skipNewDueDate" class="form-input" required />
            </div>

            <div class="form-group">
              <label class="form-label">Motivo o Justificación del Aplazamiento *</label>
              <textarea id="skipJustification" class="form-input" rows="3" placeholder="Ej: Se acordó con el acreedor pagar doble la próxima semana debido a retraso de pedidos..." required></textarea>
            </div>

          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btnCancelSkipCreditModal">Cancelar</button>
            <button type="submit" class="btn btn-primary" style="background: #D97706; border-color: #D97706; font-weight: 800;">Reprogramar Cuota</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseSkipCreditModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelSkipCreditModal')?.addEventListener('click', closeModal);

  document.getElementById('skipCreditForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const justification = document.getElementById('skipJustification').value;
    const newNextDueDate = document.getElementById('skipNewDueDate').value;

    if (!justification || !newNextDueDate) {
      showToast('Por favor completa todos los campos requeridos', 'danger');
      return;
    }

    const payload = {
      justification,
      newNextDueDate,
      registeredBy: store.currentUser,
    };

    try {
      const res = await api.skipCreditInstallment(credit.id, payload);
      showToast(res.message || 'Cuota aplazada exitosamente ⏭️');
      closeModal();
      if (typeof onSaved === 'function') onSaved();
    } catch (err) {
      showToast(err.message || 'Error al aplazar cuota', 'danger');
    }
  });
}

// -----------------------------------------------------------------
// MODAL 4: HISTORIAL DE PAGOS Y OMISIONES
// -----------------------------------------------------------------
export function openCreditHistoryModal(credit, onSaved) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  const payments = credit.payments || [];
  let creditHistPage = 1;

  function renderCreditHistModal() {
    const { pageItems, totalPages, totalItems, currentPage } = paginateArray(payments, creditHistPage, 15);
    creditHistPage = currentPage;

    modalOverlay.innerHTML = `
      <div class="modal-overlay active">
        <div class="modal-card" style="max-width: 640px;">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">📜 Historial de Cuotas: ${credit.title}</h3>
              <span style="font-size: 0.76rem; color: var(--text-muted);">${payments.length} registro(s) de cuotas</span>
            </div>
            <button class="modal-close-btn" id="btnCloseHistCreditModal">✕</button>
          </div>
          <div class="modal-body">
            
            <div style="display: flex; justify-content: space-between; background: var(--bg-app); padding: 10px 14px; border-radius: var(--radius-md); margin-bottom: 14px; font-size: 0.84rem; flex-wrap: wrap; gap: 8px;">
              <div>Acreedor: <strong>${credit.creditor}</strong></div>
              <div>Total: <strong>${formatCOP(credit.totalAmount)}</strong></div>
              <div>Saldo: <strong style="color: var(--danger);">${formatCOP(credit.remainingBalance)}</strong></div>
            </div>

            ${
              payments.length === 0
                ? `
              <div style="text-align: center; padding: 30px; color: var(--text-muted);">
                Aún no hay cuotas ni abonos registrados para este crédito.
              </div>
            `
                : `
              <div class="table-responsive">
                <table class="app-table" style="font-size: 0.82rem;">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Detalle / Motivo</th>
                      <th>Medio</th>
                      <th style="text-align: right;">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${pageItems
                      .map((p) => {
                        const isSkip = p.actionType === 'CUOTA_OMITIDA_APLAZADA';
                        const isInitial = p.actionType === 'CUOTA_INICIAL';

                        let badgeBg = '#DCFCE7';
                        let badgeColor = '#15803D';
                        let badgeText = `Cuota #${p.installmentNumber || '1'}`;

                        if (isSkip) {
                          badgeBg = '#FEF3C7';
                          badgeColor = '#D97706';
                          badgeText = '⏭️ APLAZADA';
                        } else if (isInitial) {
                          badgeBg = '#E0F2FE';
                          badgeColor = '#0369A1';
                          badgeText = '💵 INICIAL';
                        }

                        return `
                        <tr>
                          <td><small style="color: var(--text-muted); font-weight: 600;">${formatDate(p.paymentDate)}</small></td>
                          <td>
                            <span class="badge" style="background: ${badgeBg}; color: ${badgeColor}; font-weight: 800; font-size: 0.72rem;">
                              ${badgeText}
                            </span>
                          </td>
                          <td>
                            <div>${p.justification || 'Abono de cuota'}</div>
                            ${p.receiptNumber ? `<small style="color: var(--text-muted);">Recibo: ${p.receiptNumber}</small>` : ''}
                          </td>
                          <td>
                            ${
                              isSkip
                                ? '<span style="color: var(--text-muted); font-size: 0.72rem;">N/A</span>'
                                : formatPaymentBadge(p.paymentMethod)
                            }
                          </td>
                          <td style="text-align: right;">
                            <strong style="color: ${isSkip ? '#94A3B8' : '#15803D'}; font-weight: 900;">
                              ${isSkip ? '$0' : '+' + formatCOP(p.amount)}
                            </strong>
                          </td>
                        </tr>
                      `;
                      })
                      .join('')}
                  </tbody>
                </table>
              </div>
              ${renderPaginationHtml({
                currentPage: creditHistPage,
                totalPages,
                totalItems,
                pageSize: 15,
                itemName: 'cuotas y abonos',
                paginationId: 'modalCreditHistPagination',
              })}
            `
            }

          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btnCancelHistCreditModal">Cerrar</button>
          </div>
        </div>
      </div>
    `;

    const closeModal = () => (modalOverlay.innerHTML = '');
    document.getElementById('btnCloseHistCreditModal')?.addEventListener('click', closeModal);
    document.getElementById('btnCancelHistCreditModal')?.addEventListener('click', closeModal);

    attachPaginationEvents(modalOverlay, 'modalCreditHistPagination', (newPage) => {
      creditHistPage = newPage;
      renderCreditHistModal();
    });
  }

  renderCreditHistModal();
}
