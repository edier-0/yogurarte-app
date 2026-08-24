import { api } from '../api.js';
import { formatCOP, formatDate, formatDateTime, formatPaymentBadge, getTodayLocalDateStr, showToast, store } from '../store.js';
import { openBankSettingsModal } from './customersView.js';
import { paginateArray, renderPaginationHtml, attachPaginationEvents, PAGE_SIZE } from '../components/pagination.js';

let staffCurrentPage = 1;
let paymentsCurrentPage = 1;
let usersCurrentPage = 1;

const WA_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="display: inline-block; vertical-align: -2px; margin-right: 4px;"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>`;

let staffFilters = {
  tab: 'all', // 'all', 'socios', 'empleados', 'historial', 'usuarios'
  searchTerm: '',
  month: '',
};

export async function renderStaff(container) {
  container.innerHTML = `
    <div style="display: flex; justify-content: center; padding: 40px;">
      <span style="color: var(--primary); font-weight: 700;">Cargando nómina, personal y accesos de YogurArte... 🥛</span>
    </div>
  `;

  try {
    const promises = [
      api.getStaff({ includeInactive: 'false' }),
      api.getStaffPayments(),
    ];

    if (store.isAdmin()) {
      promises.push(api.getUsers());
    }

    const [staffList, paymentsData, usersData] = await Promise.all(promises);

    const allPayments = paymentsData?.payments || [];
    const usersList = usersData || [];
    const totalPayroll = allPayments
      .filter((p) => p.paymentType !== 'RETIRO_SOCIO')
      .reduce((sum, p) => sum + (p.netAmount || 0), 0);
    const totalOwnerDraws = allPayments
      .filter((p) => p.paymentType === 'RETIRO_SOCIO')
      .reduce((sum, p) => sum + (p.netAmount || 0), 0);

    let filteredStaff = staffList || [];
    if (staffFilters.tab === 'socios') {
      filteredStaff = filteredStaff.filter((s) => s.type === 'SOCIO');
    } else if (staffFilters.tab === 'empleados') {
      filteredStaff = filteredStaff.filter((s) => s.type === 'EMPLEADO');
    }

    if (staffFilters.searchTerm.trim()) {
      const q = staffFilters.searchTerm.toLowerCase();
      filteredStaff = filteredStaff.filter(
        (s) => s.fullName.toLowerCase().includes(q) || (s.role && s.role.toLowerCase().includes(q))
      );
    }

    const isUsersTab = staffFilters.tab === 'usuarios';

    container.innerHTML = `
      <!-- Toolbar y Acciones Principales -->
      <div class="orders-toolbar-card" style="padding: 16px 20px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div>
            <h2 style="font-size: 1.3rem; font-weight: 800; color: var(--primary); margin: 0;">
              👥 Nómina, Personal y Accesos
            </h2>
            <span style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600;">
              Administra tu equipo, liquida nóminas flexibles, registra retiros de socios y gestiona usuarios del sistema.
            </span>
          </div>

          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            ${
              isUsersTab && store.isAdmin()
                ? `
              <button class="btn btn-outline" id="btnOpenBankSettingsStaff" style="border-color: #D8B4FE; color: #7E22CE; font-weight: 700; background: #FAF5FF;" title="Configurar cuenta bancaria / Nequi de cobro">
                ⚙️ Cuenta de Cobro (Nequi)
              </button>
              <button class="btn btn-primary" id="btnNewUserGlobal" style="font-weight: 800; padding: 8px 18px;">
                🔐 + Crear Usuario del Sistema
              </button>
            `
                : `
              <button class="btn btn-outline" id="btnOpenBankSettingsStaff" style="border-color: #D8B4FE; color: #7E22CE; font-weight: 700; background: #FAF5FF;" title="Configurar cuenta bancaria / Nequi de cobro">
                ⚙️ Cuenta de Cobro (Nequi)
              </button>
              <button class="btn btn-outline" id="btnNewStaffMember">
                👤 + Registrar Integrante
              </button>
              <button class="btn btn-accent" id="btnNewPaymentGlobal" style="font-weight: 800; padding: 8px 18px;">
                💵 + Registrar Pago / Retiro
              </button>
            `
            }
          </div>
        </div>

        <div style="height: 1px; background: var(--border-subtle); margin: 14px 0;"></div>

        <!-- Filtros y Pastillas Rápidas -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div class="filter-chip-group">
            <button class="filter-chip ${staffFilters.tab === 'all' ? 'active' : ''}" data-tab-filter="all">
              Todos (${staffList.length})
            </button>
            <button class="filter-chip ${staffFilters.tab === 'socios' ? 'active' : ''}" data-tab-filter="socios">
              👑 Socios / Dueños (${staffList.filter((s) => s.type === 'SOCIO').length})
            </button>
            <button class="filter-chip ${staffFilters.tab === 'empleados' ? 'active' : ''}" data-tab-filter="empleados">
              👷 Colaboradores (${staffList.filter((s) => s.type === 'EMPLEADO').length})
            </button>
            <button class="filter-chip ${staffFilters.tab === 'historial' ? 'active' : ''}" data-tab-filter="historial">
              📜 Historial de Pagos (${allPayments.length})
            </button>
            ${
              store.isAdmin()
                ? `
              <button class="filter-chip ${staffFilters.tab === 'usuarios' ? 'active' : ''}" data-tab-filter="usuarios" style="${staffFilters.tab === 'usuarios' ? 'background: #0284C7; color: white;' : 'color: #0284C7; border-color: #BAE6FD; font-weight: 700;'}">
                🔐 Usuarios y Accesos (${usersList.length})
              </button>
            `
                : ''
            }
          </div>

          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <input 
              type="text" 
              id="staffSearchInput" 
              class="form-input" 
              placeholder="🔍 Buscar por nombre o cargo..." 
              value="${staffFilters.searchTerm}"
              style="max-width: 250px; font-size: 0.85rem; padding: 6px 10px;"
            />
            <button class="btn btn-sm btn-outline" id="btnClearStaffFilters" style="font-weight: 700; color: var(--text-muted); border-color: var(--border-color); display: inline-flex; align-items: center; gap: 4px;" title="Restablecer filtros de personal">
              <span>🧹</span> Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      <!-- Tarjetas de Resumen Financiero de Personal (si no está en usuarios) -->
      ${
        !isUsersTab
          ? `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 22px;">
        <div class="kpi-card" style="border: 1.5px solid var(--border-color); background: #FFFFFF;">
          <div class="kpi-header">
            <span class="kpi-title" style="color: var(--primary); font-weight: 800;">👥 Equipo Activo</span>
            <div class="kpi-icon" style="background: var(--primary-light); color: var(--primary);">👤</div>
          </div>
          <div class="kpi-value" style="color: var(--primary); font-size: 1.8rem;">
            ${staffList.length} <span style="font-size: 0.95rem; font-weight: 600; color: var(--text-muted);">integrantes</span>
          </div>
          <div class="kpi-subtitle">
            ${staffList.filter((s) => s.type === 'SOCIO').length} socio(s) • ${staffList.filter((s) => s.type === 'EMPLEADO').length} colaborador(es)
          </div>
        </div>

        <div class="kpi-card" style="border: 1.5px solid #BBF7D0; background: #F0FDF4;">
          <div class="kpi-header">
            <span class="kpi-title" style="color: #15803D; font-weight: 800;">💵 Nómina Total Pagada</span>
            <div class="kpi-icon" style="background: #DCFCE7; color: #15803D;">💰</div>
          </div>
          <div class="kpi-value" style="color: #16A34A; font-size: 1.8rem;">
            ${formatCOP(totalPayroll)}
          </div>
          <div class="kpi-subtitle" style="color: #15803D;">
            Costo operativo de mano de obra
          </div>
        </div>

        <div class="kpi-card" style="border: 1.5px solid #DDD6FE; background: #FAF5FF;">
          <div class="kpi-header">
            <span class="kpi-title" style="color: #6D28D9; font-weight: 800;">🤝 Retiros de Socios</span>
            <div class="kpi-icon" style="background: #EDE9FE; color: #6D28D9;">👑</div>
          </div>
          <div class="kpi-value" style="color: #7C3AED; font-size: 1.8rem;">
            ${formatCOP(totalOwnerDraws)}
          </div>
          <div class="kpi-subtitle" style="color: #6D28D9;">
            Utilidades y retiros personales de dueños
          </div>
        </div>
      </div>
      `
          : ''
      }

      <!-- Contenido Principal: Directorio, Historial o Usuarios -->
      ${
        isUsersTab
          ? renderUsersTableHtml(usersList)
          : staffFilters.tab === 'historial'
          ? renderPaymentsHistoryTableHtml(allPayments)
          : renderStaffGridHtml(filteredStaff)
      }
    `;

    // Conectar eventos
    attachStaffEvents(container, staffList, allPayments, usersList);
  } catch (error) {
    console.error('Error rendering staff view:', error);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-title">Error al cargar la sección de nómina</div>
        <div class="empty-state-text">${error.message || 'Verifica la conexión con el servidor.'}</div>
      </div>
    `;
  }
}

// Renderizar cuadrícula de tarjetas de integrantes
function renderStaffGridHtml(staffList) {
  if (!staffList || staffList.length === 0) {
    return `
      <div class="empty-state" style="padding: 40px 20px; background: #FFFFFF; border-radius: var(--radius-lg); border: 1.5px dashed var(--border-color);">
        <div class="empty-state-icon">👥</div>
        <div class="empty-state-title">Aún no has registrado integrantes</div>
        <div class="empty-state-text">Comienza registrando a los socios (Edier, Yeilin) o a tus colaboradores y ayudantes.</div>
        <button class="btn btn-accent" id="btnEmptyNewStaff" style="margin-top: 12px;">+ Registrar Primer Integrante</button>
      </div>
    `;
  }

  const { pageItems, totalPages, totalItems, currentPage } = paginateArray(staffList, staffCurrentPage, 15);
  staffCurrentPage = currentPage;

  return `
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 18px;">
      ${pageItems
        .map((s) => {
          const isSocio = s.type === 'SOCIO';
          const typeBadge = isSocio
            ? `<span class="badge" style="background: #EDE9FE; color: #6D28D9; border: 1px solid #DDD6FE; font-weight: 800;">👑 Socio / Dueño</span>`
            : `<span class="badge" style="background: #E0F2FE; color: #0369A1; border: 1px solid #BAE6FD; font-weight: 800;">👷 Empleado</span>`;

          const schemeText = {
            FIJO: 'Sueldo Fijo Pactado',
            POR_DIA: `Por Día / Jornal (${formatCOP(s.defaultRate || 0)}/día)`,
            POR_LITRO: `Por Litro (${formatCOP(s.defaultRate || 0)}/L)`,
            POR_PEDIDO: `Por Domicilio (${formatCOP(s.defaultRate || 0)}/ent)`,
            LIBRE: 'Monto Libre / Flexible',
          }[s.paymentScheme] || 'Flexible';

          const avatarChar = (s.fullName || 'U').charAt(0).toUpperCase();

          return `
          <div class="order-card" style="padding: 18px; display: flex; flex-direction: column; justify-content: space-between; border: 1.5px solid var(--border-color);">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="width: 44px; height: 44px; border-radius: 50%; background: ${isSocio ? 'var(--primary)' : '#0284C7'}; color: #FFFFFF; font-weight: 800; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-sm);">
                    ${avatarChar}
                  </div>
                  <div>
                    <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin: 0;">
                      ${s.fullName}
                    </h3>
                    <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">
                      ${s.role || (isSocio ? 'Socio' : 'Producción')}
                    </span>
                  </div>
                </div>
                ${typeBadge}
              </div>

              <div style="background: var(--bg-app); padding: 10px 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin: 10px 0; font-size: 0.82rem; display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-muted); font-weight: 600;">Esquema de pago:</span>
                  <strong style="color: var(--text-main);">${schemeText}</strong>
                </div>
                ${
                  s.phone
                    ? `<div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text-muted); font-weight: 600;">Teléfono / WA:</span>
                        <strong style="color: var(--primary);">📞 ${s.phone}</strong>
                       </div>`
                    : ''
                }
                ${
                  s.bankInfo
                    ? `<div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text-muted); font-weight: 600;">Cuenta / Pago:</span>
                        <strong style="color: var(--accent);">${s.bankInfo}</strong>
                       </div>`
                    : ''
                }
              </div>
            </div>

            <div style="display: flex; gap: 8px; margin-top: 8px;">
              <button class="btn btn-accent btn-sm btn-pay-staff" data-id="${s.id}" data-name="${s.fullName}" data-type="${s.type}" style="flex: 1; font-weight: 800; font-size: 0.82rem;">
                ${isSocio ? '🤝 Retiro / Pago' : '💵 Pagar Nómina'}
              </button>
              <button class="btn btn-outline btn-sm btn-edit-staff" data-id="${s.id}" style="padding: 4px 10px;" title="Editar integrante">
                ✏️
              </button>
              <button class="btn btn-outline btn-sm btn-delete-staff" data-id="${s.id}" data-name="${s.fullName}" style="padding: 4px 10px; color: var(--danger); border-color: #FECACA;" title="Eliminar integrante">
                🗑️
              </button>
            </div>
          </div>
        `;
        })
        .join('')}
    </div>
    ${renderPaginationHtml({
      currentPage: staffCurrentPage,
      totalPages,
      totalItems,
      pageSize: 15,
      itemName: 'integrantes',
      paginationId: 'staffPagination',
    })}
  `;
}

// Renderizar tabla de historial de pagos
function renderPaymentsHistoryTableHtml(payments) {
  if (!payments || payments.length === 0) {
    return `
      <div class="empty-state" style="padding: 40px 20px; background: #FFFFFF; border-radius: var(--radius-lg); border: 1.5px dashed var(--border-color);">
        <div class="empty-state-icon">📜</div>
        <div class="empty-state-title">No hay pagos o retiros registrados</div>
        <div class="empty-state-text">Usa el botón "+ Registrar Pago / Retiro" para liquidar nómina o anotar un retiro de socio.</div>
      </div>
    `;
  }

  const { pageItems, totalPages, totalItems, currentPage } = paginateArray(payments, paymentsCurrentPage, 15);
  paymentsCurrentPage = currentPage;

  return `
    <div class="table-container" style="padding: 20px; background: #FFFFFF;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
        <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--primary); margin: 0;">
          📜 Historial de Pagos de Nómina y Retiros
        </h3>
        <span style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600;">
          Mostrando ${totalItems} movimiento(s)
        </span>
      </div>

      <div style="overflow-x: auto;">
        <table class="app-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Integrante</th>
              <th>Tipo</th>
              <th>Detalle / Concepto</th>
              <th>Periodo</th>
              <th>Monto Bruto</th>
              <th>Deducciones</th>
              <th>Neto Pagado</th>
              <th>Método</th>
              <th style="text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${pageItems
              .map((p) => {
                const isSocio = p.paymentType === 'RETIRO_SOCIO';
                const typeBadge = isSocio
                  ? `<span class="badge" style="background: #EDE9FE; color: #6D28D9; border: 1px solid #DDD6FE; font-weight: 800;">🟣 Retiro Socio</span>`
                  : `<span class="badge" style="background: #DCFCE7; color: #15803D; border: 1px solid #BBF7D0; font-weight: 800;">🟢 Nómina</span>`;

                const periodStr =
                  p.periodStart && p.periodEnd
                    ? `${formatDate(p.periodStart)} al ${formatDate(p.periodEnd)}`
                    : 'N/A';

                return `
                <tr>
                  <td><strong>${formatDate(p.paymentDate)}</strong></td>
                  <td>
                    <div><strong>${p.staff?.fullName || 'Personal'}</strong></div>
                    <small style="color: var(--text-muted);">${p.staff?.role || ''}</small>
                  </td>
                  <td>${typeBadge}</td>
                  <td>
                    <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-main);">${p.calculationDetails || 'Pago acordado'}</div>
                    ${p.notes ? `<small style="color: var(--text-muted);">📝 ${p.notes}</small>` : ''}
                  </td>
                  <td><small>${periodStr}</small></td>
                  <td>${formatCOP(p.amount)}</td>
                  <td style="color: ${p.deductions > 0 ? 'var(--danger)' : 'var(--text-muted)'}; font-weight: 600;">
                    ${p.deductions > 0 ? `-${formatCOP(p.deductions)}` : '$0'}
                  </td>
                  <td>
                    <strong style="color: ${isSocio ? '#7C3AED' : 'var(--success)'}; font-size: 0.95rem;">
                      ${formatCOP(p.netAmount)}
                    </strong>
                  </td>
                  <td>${formatPaymentBadge(p.paymentMethod)}</td>
                  <td style="text-align: right;">
                    <div style="display: inline-flex; gap: 6px;">
                      <button class="btn btn-whatsapp btn-sm btn-staff-whatsapp" data-id="${p.id}" title="Enviar comprobante por WhatsApp">
                        ${WA_ICON_SVG} Recibo
                      </button>
                      <button class="btn btn-outline btn-sm btn-edit-payment" data-id="${p.id}" style="color: var(--primary); border-color: var(--primary-light); padding: 3px 8px; font-weight: 700;" title="Editar este pago / método / monto">
                        ✏️ Editar
                      </button>
                      <button class="btn btn-outline btn-sm btn-delete-payment" data-id="${p.id}" style="color: var(--danger); padding: 3px 8px;" title="Eliminar registro">
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
      </div>
      ${renderPaginationHtml({
        currentPage: paymentsCurrentPage,
        totalPages,
        totalItems,
        pageSize: 15,
        itemName: 'pagos',
        paginationId: 'paymentsPagination',
      })}
    </div>
  `;
}

// Renderizar tabla de gestión de usuarios del sistema
function renderUsersTableHtml(usersList) {
  if (!usersList || usersList.length === 0) {
    return `
      <div class="empty-state" style="padding: 40px 20px; background: #FFFFFF; border-radius: var(--radius-lg); border: 1.5px dashed var(--border-color);">
        <div class="empty-state-icon">🔐</div>
        <div class="empty-state-title">No hay usuarios registrados</div>
        <div class="empty-state-text">Crea usuarios para que tus socios, personal de producción, vendedores o domiciliarios inicien sesión.</div>
        <button class="btn btn-primary" id="btnEmptyNewUser" style="margin-top: 12px;">+ Crear Primer Usuario</button>
      </div>
    `;
  }

  const { pageItems, totalPages, totalItems, currentPage } = paginateArray(usersList, usersCurrentPage, 15);
  usersCurrentPage = currentPage;

  return `
    <div class="table-container" style="padding: 20px; background: #FFFFFF;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
        <div>
          <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--primary); margin: 0; display: flex; align-items: center; gap: 8px;">
            <span>🔐</span> Usuarios y Accesos al Sistema
          </h3>
          <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">
            Administra los roles, contraseñas, números de contacto y cuentas de cobro de cada usuario.
          </span>
        </div>
        <button class="btn btn-primary btn-sm" id="btnNewUserFromTable" style="font-weight: 800; padding: 6px 14px;">
          + Crear Usuario
        </button>
      </div>

      <div style="overflow-x: auto;">
        <table class="app-table">
          <thead>
            <tr>
              <th>Usuario / Nombre</th>
              <th>Rol Asignado</th>
              <th>Teléfono / WhatsApp</th>
              <th>Correo Electrónico</th>
              <th>Nequi / Banco</th>
              <th>Estado</th>
              <th style="text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${pageItems
              .map((u) => {
                let roleBadge = '';
                if (u.role === 'ADMIN') {
                  roleBadge = `<span class="badge" style="background: #EDE9FE; color: #6D28D9; border: 1px solid #DDD6FE; font-weight: 800;">👑 Administrador (Socio)</span>`;
                } else if (u.role === 'PRODUCCION') {
                  roleBadge = `<span class="badge" style="background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; font-weight: 800;">🧑‍🍳 Producción / Planta</span>`;
                } else if (u.role === 'VENTAS') {
                  roleBadge = `<span class="badge" style="background: #DCFCE7; color: #15803D; border: 1px solid #BBF7D0; font-weight: 800;">🛍️ Ventas / Asesor</span>`;
                } else if (u.role === 'REPARTIDOR') {
                  roleBadge = `<span class="badge" style="background: #E0F2FE; color: #0369A1; border: 1px solid #BAE6FD; font-weight: 800;">🛵 Domiciliario</span>`;
                } else {
                  roleBadge = `<span class="badge" style="background: var(--bg-subtle); color: var(--text-muted);">${u.role}</span>`;
                }

                const statusBadge = u.isActive
                  ? `<span class="badge badge-paid" style="font-size: 0.72rem;">🟢 Activo</span>`
                  : `<span class="badge badge-pending" style="font-size: 0.72rem;">🔴 Inactivo</span>`;

                return `
                <tr>
                  <td>
                    <strong>${u.name}</strong>
                    <div><small style="color: var(--text-muted); font-weight: 700;">@${u.username}</small></div>
                  </td>
                  <td>${roleBadge}</td>
                  <td>
                    ${
                      u.phone
                        ? `<span style="font-size: 0.85rem; color: var(--primary); font-weight: 700;">📞 ${u.phone}</span>`
                        : `<span style="color: var(--text-muted); font-size: 0.82rem;">No registrado</span>`
                    }
                  </td>
                  <td>
                    ${
                      u.email
                        ? `<span style="font-size: 0.85rem; color: var(--text-main); font-weight: 600;">✉️ ${u.email}</span>`
                        : `<span style="color: var(--text-muted); font-size: 0.82rem;">No registrado</span>`
                    }
                  </td>
                  <td>
                    ${
                      u.bankInfo
                        ? `<span style="font-size: 0.85rem; font-weight: 700; color: var(--accent);">🏦 ${u.bankInfo}</span>`
                        : `<span style="color: var(--text-muted); font-size: 0.82rem;">No registrado</span>`
                    }
                  </td>
                  <td>${statusBadge}</td>
                  <td style="text-align: right;">
                    <div style="display: inline-flex; gap: 6px;">
                      <button class="btn btn-outline btn-sm btn-edit-user" data-id="${u.id}" style="padding: 4px 10px;" title="Editar usuario o cambiar contraseña">
                        ✏️ Editar
                      </button>
                      ${
                        u.username !== 'edier' && u.username !== 'yeilin'
                          ? `
                        <button class="btn btn-outline btn-sm btn-delete-user" data-id="${u.id}" data-name="${u.name}" style="padding: 4px 8px; color: var(--danger); border-color: #FECACA;" title="Eliminar usuario">
                          🗑️
                        </button>
                      `
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
        currentPage: usersCurrentPage,
        totalPages,
        totalItems,
        pageSize: 15,
        itemName: 'usuarios',
        paginationId: 'usersPagination',
      })}
    </div>
  `;
}

// Conectar eventos del módulo
function attachStaffEvents(container, staffList, allPayments, usersList = []) {
  // Filtros de pestaña
  container.querySelectorAll('[data-tab-filter]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      staffFilters.tab = e.currentTarget.dataset.tabFilter;
      staffCurrentPage = 1;
      paymentsCurrentPage = 1;
      usersCurrentPage = 1;
      renderStaff(container);
    });
  });

  // Búsqueda en tiempo real
  const searchInput = container.querySelector('#staffSearchInput');
  searchInput?.addEventListener('input', (e) => {
    staffFilters.searchTerm = e.target.value;
    staffCurrentPage = 1;
    paymentsCurrentPage = 1;
    usersCurrentPage = 1;
    renderStaff(container);
  });

  // Limpiar filtros
  container.querySelector('#btnClearStaffFilters')?.addEventListener('click', () => {
    staffFilters = {
      tab: 'all',
      searchTerm: '',
      month: '',
    };
    staffCurrentPage = 1;
    paymentsCurrentPage = 1;
    usersCurrentPage = 1;
    renderStaff(container);
  });

  // Eventos de paginación
  attachPaginationEvents(
    container,
    'staffPagination',
    (newPage) => {
      staffCurrentPage = newPage;
      renderStaff(container);
    }
  );

  attachPaginationEvents(
    container,
    'paymentsPagination',
    (newPage) => {
      paymentsCurrentPage = newPage;
      renderStaff(container);
    }
  );

  attachPaginationEvents(
    container,
    'usersPagination',
    (newPage) => {
      usersCurrentPage = newPage;
      renderStaff(container);
    }
  );

  // Botones de Usuario
  container.querySelector('#btnNewUserGlobal')?.addEventListener('click', () => {
    openUserModal();
  });
  container.querySelector('#btnNewUserFromTable')?.addEventListener('click', () => {
    openUserModal();
  });
  container.querySelector('#btnEmptyNewUser')?.addEventListener('click', () => {
    openUserModal();
  });

  container.querySelectorAll('.btn-edit-user').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const user = usersList.find((u) => u.id === id);
      if (user) openUserModal(user);
    });
  });

  container.querySelectorAll('.btn-delete-user').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.id);
      const name = btn.dataset.name || 'este usuario';
      if (confirm(`¿Estás seguro de que deseas eliminar la cuenta de "${name}"?`)) {
        try {
          await api.deleteUser(id);
          showToast(`¡Usuario "${name}" eliminado! 🗑️`);
          renderStaff(container);
        } catch (err) {
          showToast(err.message || 'Error al eliminar usuario', 'danger');
        }
      }
    });
  });

  // Botón Configuración de Cuenta de Cobro / Nequi
  container.querySelector('#btnOpenBankSettingsStaff')?.addEventListener('click', () => {
    openBankSettingsModal();
  });

  // Botón Nuevo Integrante
  container.querySelector('#btnNewStaffMember')?.addEventListener('click', () => {
    openStaffModal();
  });
  container.querySelector('#btnEmptyNewStaff')?.addEventListener('click', () => {
    openStaffModal();
  });

  // Botón Registrar Pago Global
  container.querySelector('#btnNewPaymentGlobal')?.addEventListener('click', () => {
    openStaffPaymentModal(staffList);
  });

  // Botón Pagar a un integrante específico
  container.querySelectorAll('.btn-pay-staff').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = Number(e.currentTarget.dataset.id);
      openStaffPaymentModal(staffList, id);
    });
  });

  // Botón Editar Integrante
  container.querySelectorAll('.btn-edit-staff').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = Number(e.currentTarget.dataset.id);
      try {
        const member = await api.getStaffById(id);
        openStaffModal(member);
      } catch (err) {
        showToast('Error al cargar datos del integrante', 'danger');
      }
    });
  });

  // Botón Eliminar Integrante
  container.querySelectorAll('.btn-delete-staff').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = Number(e.currentTarget.dataset.id);
      const name = e.currentTarget.dataset.name || 'este integrante';
      if (confirm(`¿Estás seguro de que deseas eliminar a "${name}" de Nómina y Personal?`)) {
        try {
          await api.deleteStaff(id);
          showToast(`¡Integrante "${name}" eliminado correctamente! 🗑️`);
          renderStaff(container);
        } catch (err) {
          showToast(err.message || 'Error al eliminar integrante', 'danger');
        }
      }
    });
  });

  // Botón WhatsApp Recibo
  container.querySelectorAll('.btn-staff-whatsapp').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      try {
        const res = await api.getStaffPaymentWhatsAppLink(id);
        if (res.whatsappUrl) {
          window.open(res.whatsappUrl, '_blank');
        }
      } catch (err) {
        showToast(err.message || 'Error al generar enlace de WhatsApp', 'danger');
      }
    });
  });

  // Botón Editar Pago
  container.querySelectorAll('.btn-edit-payment').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = Number(e.currentTarget.dataset.id);
      const payment = allPayments.find((p) => p.id === id);
      if (payment) {
        openStaffPaymentModal(staffList, payment.staffId, payment);
      }
    });
  });

  // Botón Eliminar Pago
  container.querySelectorAll('.btn-delete-payment').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      if (confirm('¿Estás seguro de eliminar este registro de pago de nómina?')) {
        try {
          await api.deleteStaffPayment(id);
          showToast('Registro de pago eliminado correctamente 🗑️');
          renderStaff(container);
        } catch (err) {
          showToast(err.message || 'Error al eliminar pago', 'danger');
        }
      }
    });
  });
}

// Modal de Creación / Edición de Integrante
export function openStaffModal(memberData = null) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  const isEditing = !!memberData;
  const modalTitle = isEditing ? `✏️ Editar Integrante: ${memberData.fullName}` : `👤 Registrar Nuevo Integrante`;

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 480px;">
        <div class="modal-header">
          <h3 class="modal-title">${modalTitle}</h3>
          <button class="modal-close-btn" id="btnCloseStaffModal">✕</button>
        </div>
        <form id="staffForm">
          <div class="modal-body">
            
            <div class="form-group">
              <label class="form-label">Nombre y Apellido *</label>
              <input type="text" id="staffFullName" class="form-input" placeholder="Ej: Edier o Juan Pérez" value="${memberData?.fullName || ''}" required />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Tipo de Integrante *</label>
                <select id="staffType" class="form-select">
                  <option value="SOCIO" ${memberData?.type === 'SOCIO' ? 'selected' : ''}>👑 Socio / Dueño</option>
                  <option value="EMPLEADO" ${memberData?.type === 'EMPLEADO' || !memberData ? 'selected' : ''}>👷 Empleado / Colaborador</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Rol Principal</label>
                <select id="staffRole" class="form-select">
                  <option value="SOCIO" ${memberData?.role === 'SOCIO' ? 'selected' : ''}>👑 Socio / Administración</option>
                  <option value="PRODUCCION" ${memberData?.role === 'PRODUCCION' || !memberData ? 'selected' : ''}>🥛 Producción de Yogur</option>
                  <option value="DOMICILIARIO" ${memberData?.role === 'DOMICILIARIO' ? 'selected' : ''}>🛵 Domicilios y Envíos</option>
                  <option value="VENTAS" ${memberData?.role === 'VENTAS' ? 'selected' : ''}>💬 Ventas y Pedidos</option>
                  <option value="AUXILIAR" ${memberData?.role === 'AUXILIAR' ? 'selected' : ''}>🧼 Auxiliar General</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" style="font-weight: 700;">📱 Celular / WhatsApp Directo (10 dígitos)</label>
              <input type="text" id="staffPhone" class="form-input" placeholder="Ej: 3024581882" value="${memberData?.phone || ''}" />
              <small style="color: var(--text-muted); font-size: 0.73rem; display: block; margin-top: 3px;">Ingresa el número celular de WhatsApp para que el chat se abra directamente.</small>
            </div>

            <div class="form-group">
              <label class="form-label">Esquema de Pago Habitual</label>
              <select id="staffScheme" class="form-select">
                <option value="LIBRE" ${memberData?.paymentScheme === 'LIBRE' || !memberData ? 'selected' : ''}>⚡ Libre / Flexible (Digitar al pagar)</option>
                <option value="POR_DIA" ${memberData?.paymentScheme === 'POR_DIA' ? 'selected' : ''}>📅 Por Día / Jornal</option>
                <option value="POR_LITRO" ${memberData?.paymentScheme === 'POR_LITRO' ? 'selected' : ''}>🥛 Por Litro Producido</option>
                <option value="POR_PEDIDO" ${memberData?.paymentScheme === 'POR_PEDIDO' ? 'selected' : ''}>🛵 Por Domicilio Entregado</option>
                <option value="FIJO" ${memberData?.paymentScheme === 'FIJO' ? 'selected' : ''}>💼 Sueldo Fijo Pactado</option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Tarifa por Defecto ($ COP)</label>
                <input type="number" id="staffDefaultRate" class="form-input" placeholder="0 si es libre" value="${memberData?.defaultRate || 0}" />
              </div>

              <div class="form-group">
                <label class="form-label">Cuenta / Nequi / Datos de Pago</label>
                <input type="text" id="staffBankInfo" class="form-input" placeholder="Ej: Nequi 3014964250" value="${memberData?.bankInfo || ''}" />
              </div>
            </div>

          </div>
          <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
            ${
              isEditing
                ? `<button type="button" class="btn btn-outline btn-sm" id="btnDeleteStaffModal" style="color: var(--danger); border-color: #FECACA;">🗑️ Eliminar Integrante</button>`
                : '<div></div>'
            }
            <div style="display: flex; gap: 8px;">
              <button type="button" class="btn btn-outline" id="btnCancelStaffModal">Cancelar</button>
              <button type="submit" class="btn btn-accent">${isEditing ? 'Guardar Cambios' : 'Registrar Integrante'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseStaffModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelStaffModal')?.addEventListener('click', closeModal);

  document.getElementById('staffForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      fullName: document.getElementById('staffFullName').value,
      type: document.getElementById('staffType').value,
      role: document.getElementById('staffRole').value,
      phone: document.getElementById('staffPhone').value || null,
      paymentScheme: document.getElementById('staffScheme').value,
      defaultRate: Number(document.getElementById('staffDefaultRate').value) || 0,
      bankInfo: document.getElementById('staffBankInfo').value || null,
    };

    try {
      if (isEditing) {
        await api.updateStaff(memberData.id, payload);
        showToast(`¡Integrante ${payload.fullName} actualizado! 👤`);
      } else {
        await api.createStaff(payload);
        showToast(`¡Integrante ${payload.fullName} registrado con éxito! 👤`);
      }
      closeModal();
      renderStaff(document.getElementById('contentContainer'));
    } catch (err) {
      showToast(err.message || 'Error al guardar integrante', 'danger');
    }
  });

  if (isEditing) {
    document.getElementById('btnDeleteStaffModal')?.addEventListener('click', async () => {
      if (confirm(`¿Estás seguro de que deseas eliminar a "${memberData.fullName}" de Nómina y Personal?`)) {
        try {
          await api.deleteStaff(memberData.id);
          showToast(`¡Integrante "${memberData.fullName}" eliminado correctamente! 🗑️`);
          closeModal();
          renderStaff(document.getElementById('contentContainer'));
        } catch (err) {
          showToast(err.message || 'Error al eliminar integrante', 'danger');
        }
      }
    });
  }
}

// Modal de Liquidación / Edición de Pago o Retiro de Socio
export function openStaffPaymentModal(staffList = [], preselectedStaffId = null, paymentToEdit = null) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  if (!staffList || staffList.length === 0) {
    showToast('Debes registrar al menos un integrante o socio primero', 'warning');
    openStaffModal();
    return;
  }

  const isEditing = !!paymentToEdit;
  const targetStaffId = paymentToEdit ? paymentToEdit.staffId : preselectedStaffId;
  const selectedMember = staffList.find((s) => s.id === targetStaffId) || staffList[0];
  const isSocio = selectedMember?.type === 'SOCIO';

  const defaultPaymentType = paymentToEdit ? paymentToEdit.paymentType : (isSocio ? 'RETIRO_SOCIO' : 'NOMINA');
  const defaultMethod = paymentToEdit ? paymentToEdit.paymentMethod : 'EFECTIVO';
  const defaultGross = paymentToEdit ? paymentToEdit.amount : 0;
  const defaultDed = paymentToEdit ? (paymentToEdit.deductions || 0) : 0;
  const defaultDate = paymentToEdit && paymentToEdit.paymentDate ? paymentToEdit.paymentDate.split('T')[0] : getTodayLocalDateStr();
  const defaultStart = paymentToEdit && paymentToEdit.periodStart ? paymentToEdit.periodStart.split('T')[0] : '';
  const defaultEnd = paymentToEdit && paymentToEdit.periodEnd ? paymentToEdit.periodEnd.split('T')[0] : '';
  const defaultConcept = paymentToEdit ? (paymentToEdit.calculationDetails || '') : (isSocio ? 'Retiro de utilidades' : 'Pago de nómina');
  const defaultNotes = paymentToEdit ? (paymentToEdit.notes || '') : '';

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="modal-title">${isEditing ? '✏️ Editar Pago / Retiro de Socio' : '💵 Registrar Pago o Retiro de Socio'}</h3>
          <button class="modal-close-btn" id="btnClosePayModal">✕</button>
        </div>
        <form id="paymentStaffForm">
          <div class="modal-body">
            
            <div class="form-group">
              <label class="form-label">Selecciona a Quién se le Realiza el Pago *</label>
              <select id="payStaffSelect" class="form-select" style="font-weight: 700;">
                ${staffList
                  .map(
                    (s) => `
                  <option value="${s.id}" data-type="${s.type}" data-scheme="${s.paymentScheme}" data-rate="${s.defaultRate || 0}" ${s.id === selectedMember?.id ? 'selected' : ''}>
                    ${s.type === 'SOCIO' ? '👑' : '👷'} ${s.fullName} (${s.role})
                  </option>
                `
                  )
                  .join('')}
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Tipo de Movimiento *</label>
                <select id="payMovementType" class="form-select" style="font-weight: 800;">
                  <option value="NOMINA" ${defaultPaymentType === 'NOMINA' ? 'selected' : ''}>🟢 Pago de Nómina / Honorarios</option>
                  <option value="RETIRO_SOCIO" ${defaultPaymentType === 'RETIRO_SOCIO' ? 'selected' : ''}>🟣 Retiro de Socio (Utilidades personales)</option>
                  <option value="ANTICIPO" ${defaultPaymentType === 'ANTICIPO' ? 'selected' : ''}>🟡 Anticipo / Adelanto de Sueldo</option>
                  <option value="BONIFICACION" ${defaultPaymentType === 'BONIFICACION' ? 'selected' : ''}>🔵 Bonificación Especial</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Método de Pago *</label>
                <select id="payMethod" class="form-select" style="font-weight: 700;">
                  <option value="EFECTIVO" ${defaultMethod === 'EFECTIVO' ? 'selected' : ''}>💵 Efectivo de Caja</option>
                  <option value="NEQUI" ${defaultMethod === 'NEQUI' ? 'selected' : ''}>📱 Nequi</option>
                  <option value="BANCOLOMBIA" ${defaultMethod === 'BANCOLOMBIA' ? 'selected' : ''}>🏦 Bancolombia</option>
                  <option value="TRANSFERENCIA" ${defaultMethod === 'TRANSFERENCIA' ? 'selected' : ''}>💳 Otra Transferencia</option>
                </select>
              </div>
            </div>

            <!-- Calculadora Dinámica / Concepto -->
            <div style="background: var(--bg-app); border: 1.5px solid var(--border-color); border-radius: var(--radius-md); padding: 12px; margin-bottom: 14px;">
              <label style="font-size: 0.85rem; font-weight: 800; color: var(--primary); display: block; margin-bottom: 8px;">
                🧮 Modo de Cálculo del Monto
              </label>

              <div class="form-row" style="margin-bottom: 8px;">
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-size: 0.78rem;">Modo</label>
                  <select id="calcModeSelect" class="form-select" style="font-size: 0.82rem;">
                    <option value="MANUAL">⚡ Monto Libre Manual</option>
                    <option value="DIAS">📅 Por Días Trabajados (Días × Tarifa)</option>
                    <option value="LITROS">🥛 Por Litros Producidos (Litros × Tarifa)</option>
                    <option value="DOMICILIOS">🛵 Por Domicilios Entregados</option>
                  </select>
                </div>

                <div class="form-group calc-unit-group" style="margin-bottom: 0; display: none;">
                  <label class="form-label" id="calcUnitLabel" style="font-size: 0.78rem;">Cantidad</label>
                  <input type="number" id="calcQuantityInput" class="form-input" value="1" min="1" step="any" style="font-size: 0.82rem;" />
                </div>

                <div class="form-group calc-unit-group" style="margin-bottom: 0; display: none;">
                  <label class="form-label" style="font-size: 0.78rem;">Tarifa Unit ($)</label>
                  <input type="number" id="calcRateInput" class="form-input" value="${selectedMember?.defaultRate || 0}" style="font-size: 0.82rem;" />
                </div>
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 0.78rem;">Detalle / Concepto del Pago</label>
                <input type="text" id="calcConceptInput" class="form-input" placeholder="Ej: Pago quincena 1 de agosto..." value="${defaultConcept}" style="font-size: 0.82rem;" />
              </div>
            </div>

            <!-- Valores Monetarios y Deducciones -->
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Monto Bruto ($ COP) *</label>
                <input type="number" id="payGrossAmount" class="form-input" value="${defaultGross}" min="0" required style="font-weight: 800; color: var(--primary);" />
              </div>

              <div class="form-group">
                <label class="form-label">Deducciones / Anticipos ($ COP)</label>
                <input type="number" id="payDeductions" class="form-input" value="${defaultDed}" min="0" placeholder="0 si no hay descuentos" />
              </div>
            </div>

            <div class="form-group" style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: var(--radius-md); padding: 10px 14px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 800; color: #15803D; font-size: 0.9rem;">Total Neto a Desembolsar:</span>
              <strong id="payNetDisplay" style="font-size: 1.25rem; color: #16A34A; font-weight: 900;">${formatCOP(Math.max(0, defaultGross - defaultDed))}</strong>
            </div>

            <!-- Fechas de Periodo y Pago -->
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">📅 Fecha de Pago *</label>
                <input type="date" id="payPaymentDate" class="form-input" value="${defaultDate}" required />
              </div>

              <div class="form-group">
                <label class="form-label">Periodo: Desde</label>
                <input type="date" id="payPeriodStart" class="form-input" value="${defaultStart}" />
              </div>

              <div class="form-group">
                <label class="form-label">Periodo: Hasta</label>
                <input type="date" id="payPeriodEnd" class="form-input" value="${defaultEnd}" />
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Notas Adicionales (Opcional)</label>
              <input type="text" id="payNotes" class="form-input" placeholder="Ej: Queda pendiente $20.000 para el viernes..." value="${defaultNotes}" />
            </div>

          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btnCancelPayModal">Cancelar</button>
            <button type="submit" class="btn btn-accent" style="padding: 10px 22px;">${isEditing ? '💾 Guardar Cambios' : 'Registrar Pago 💵'}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnClosePayModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelPayModal')?.addEventListener('click', closeModal);

  const staffSelect = document.getElementById('payStaffSelect');
  const movementType = document.getElementById('payMovementType');
  const calcMode = document.getElementById('calcModeSelect');
  const calcQty = document.getElementById('calcQuantityInput');
  const calcRate = document.getElementById('calcRateInput');
  const calcConcept = document.getElementById('calcConceptInput');
  const grossInput = document.getElementById('payGrossAmount');
  const dedInput = document.getElementById('payDeductions');
  const netDisplay = document.getElementById('payNetDisplay');
  const unitGroups = modalOverlay.querySelectorAll('.calc-unit-group');
  const unitLabel = document.getElementById('calcUnitLabel');

  const recalculateNet = () => {
    const gross = Number(grossInput.value) || 0;
    const ded = Number(dedInput.value) || 0;
    const net = Math.max(0, gross - ded);
    netDisplay.textContent = formatCOP(net);
  };

  const updateCalcFormula = () => {
    const mode = calcMode.value;
    if (mode === 'MANUAL') {
      unitGroups.forEach((g) => (g.style.display = 'none'));
    } else {
      unitGroups.forEach((g) => (g.style.display = 'block'));
      if (mode === 'DIAS') unitLabel.textContent = 'Días trabajados';
      if (mode === 'LITROS') unitLabel.textContent = 'Litros producidos';
      if (mode === 'DOMICILIOS') unitLabel.textContent = 'Pedidos entregados';

      const qty = Number(calcQty.value) || 0;
      const rate = Number(calcRate.value) || 0;
      const calcTotal = qty * rate;
      grossInput.value = calcTotal;

      if (mode === 'DIAS') calcConcept.value = `${qty} días trabajados a ${formatCOP(rate)}/día`;
      if (mode === 'LITROS') calcConcept.value = `${qty} litros producidos a ${formatCOP(rate)}/L`;
      if (mode === 'DOMICILIOS') calcConcept.value = `${qty} domicilios entregados a ${formatCOP(rate)}/pedido`;
    }
    recalculateNet();
  };

  staffSelect?.addEventListener('change', (e) => {
    const selectedOpt = e.target.selectedOptions[0];
    const isOwner = selectedOpt.dataset.type === 'SOCIO';
    const rate = Number(selectedOpt.dataset.rate) || 0;

    movementType.value = isOwner ? 'RETIRO_SOCIO' : 'NOMINA';
    calcRate.value = rate;
    calcConcept.value = isOwner ? 'Retiro de utilidades' : 'Pago de nómina';
    updateCalcFormula();
  });

  calcMode?.addEventListener('change', updateCalcFormula);
  calcQty?.addEventListener('input', updateCalcFormula);
  calcRate?.addEventListener('input', updateCalcFormula);
  grossInput?.addEventListener('input', recalculateNet);
  dedInput?.addEventListener('input', recalculateNet);

  document.getElementById('paymentStaffForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const gross = Number(grossInput.value) || 0;
    const ded = Number(dedInput.value) || 0;
    const net = Math.max(0, gross - ded);

    if (net <= 0 && gross <= 0) {
      showToast('El monto a pagar debe ser mayor a $0 COP', 'warning');
      return;
    }

    const payload = {
      staffId: Number(staffSelect.value),
      paymentType: movementType.value,
      amount: gross,
      deductions: ded,
      netAmount: net,
      periodStart: document.getElementById('payPeriodStart').value || null,
      periodEnd: document.getElementById('payPeriodEnd').value || null,
      paymentDate: document.getElementById('payPaymentDate').value || getTodayLocalDateStr(),
      calculationDetails: calcConcept.value,
      paymentMethod: document.getElementById('payMethod').value,
      notes: document.getElementById('payNotes').value || null,
      registeredBy: store.currentUser || 'Edier',
    };

    try {
      let savedPaymentId;
      if (isEditing) {
        await api.updateStaffPayment(paymentToEdit.id, payload);
        savedPaymentId = paymentToEdit.id;
        showToast('¡Pago actualizado correctamente! ✏️');
      } else {
        const newPay = await api.createStaffPayment(payload);
        savedPaymentId = newPay.id;
        showToast('¡Pago registrado con éxito! 💵');
      }
      closeModal();
      renderStaff(document.getElementById('contentContainer'));

      // Preguntar si desea enviar comprobante por WhatsApp
      const staffObj = staffList.find((s) => s.id === Number(payload.staffId));
      const staffName = staffObj?.fullName || 'el colaborador';
      setTimeout(async () => {
        if (confirm(`¿Deseas enviar el comprobante de pago por WhatsApp a ${staffName}?`)) {
          try {
            const res = await api.getStaffPaymentWhatsAppLink(savedPaymentId);
            if (res.whatsappUrl) window.open(res.whatsappUrl, '_blank');
          } catch (e) {
            console.error('Error opening whatsapp link:', e);
          }
        }
      }, 300);
    } catch (err) {
      showToast(err.message || 'Error al guardar pago', 'danger');
    }
  });
}

// Modal de Creación / Edición de Usuario del Sistema
export function openUserModal(userData = null) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  const isEditing = !!userData;
  const modalTitle = isEditing ? `✏️ Editar Usuario: ${userData.name}` : `🔐 Crear Nuevo Usuario del Sistema`;

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 500px;">
        <div class="modal-header">
          <h3 class="modal-title">${modalTitle}</h3>
          <button class="modal-close-btn" id="btnCloseUserModal">✕</button>
        </div>
        <form id="userForm">
          <div class="modal-body">
            
            <div class="form-group">
              <label class="form-label">Nombre Completo *</label>
              <input type="text" id="userFullName" class="form-input" placeholder="Ej: Camilo Andrés Domicilios" value="${userData?.name || ''}" required />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Teléfono / WhatsApp</label>
                <input type="text" id="userPhone" class="form-input" placeholder="Ej: 3024581882" value="${userData?.phone || ''}" />
              </div>

              <div class="form-group">
                <label class="form-label">Correo Electrónico</label>
                <input type="email" id="userEmail" class="form-input" placeholder="Ej: usuario@gmail.com" value="${userData?.email || ''}" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Nombre de Usuario (Login) *</label>
                <input type="text" id="userUsername" class="form-input" placeholder="Ej: camilo" value="${userData?.username || ''}" required />
              </div>

              <div class="form-group">
                <label class="form-label">${isEditing ? 'Nueva Contraseña (Opcional)' : 'Contraseña de Acceso *'}</label>
                <input type="password" id="userPassword" class="form-input" placeholder="${isEditing ? 'Dejar en blanco para no cambiar' : 'Ej: camilo123'}" ${isEditing ? '' : 'required'} />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Rol Asignado *</label>
                <select id="userRole" class="form-select" style="font-weight: 700;">
                  <option value="ADMIN" ${userData?.role === 'ADMIN' ? 'selected' : ''}>👑 Administrador (Acceso Total)</option>
                  <option value="PRODUCCION" ${userData?.role === 'PRODUCCION' ? 'selected' : ''}>🧑‍🍳 Producción (Lotes e Insumos)</option>
                  <option value="VENTAS" ${userData?.role === 'VENTAS' || !userData ? 'selected' : ''}>🛍️ Ventas (Pedidos y Clientes)</option>
                  <option value="DOMICILIARIO" ${userData?.role === 'DOMICILIARIO' ? 'selected' : ''}>🛵 Domiciliario (Ruta y Entregas)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Cuenta Nequi / Bancaria</label>
                <input type="text" id="userBankInfo" class="form-input" placeholder="Ej: 3024581882" value="${userData?.bankInfo || ''}" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Estado de la Cuenta</label>
              <select id="userIsActive" class="form-select">
                <option value="true" ${userData?.isActive !== false ? 'selected' : ''}>🟢 Activo (Puede iniciar sesión)</option>
                <option value="false" ${userData?.isActive === false ? 'selected' : ''}>🔴 Inactivo (Acceso bloqueado)</option>
              </select>
            </div>

          </div>
          <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" class="btn btn-outline" id="btnCancelUserModal">Cancelar</button>
            <button type="submit" class="btn btn-accent" style="font-weight: 800; padding: 10px 20px;">
              ${isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseUserModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelUserModal')?.addEventListener('click', closeModal);

  document.getElementById('userForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('userFullName').value,
      phone: document.getElementById('userPhone').value || null,
      email: document.getElementById('userEmail').value || null,
      username: document.getElementById('userUsername').value,
      role: document.getElementById('userRole').value,
      bankInfo: document.getElementById('userBankInfo').value || null,
      isActive: document.getElementById('userIsActive').value === 'true',
    };

    const pwd = document.getElementById('userPassword').value;
    if (pwd && pwd.trim() !== '') {
      payload.password = pwd.trim();
    }

    try {
      if (isEditing) {
        await api.updateUser(userData.id, payload);
        showToast(`¡Usuario ${payload.name} actualizado con éxito! 🔐`);
      } else {
        await api.createUser(payload);
        showToast(`¡Usuario ${payload.name} creado con éxito! 🔐`);
      }
      closeModal();
      renderStaff(document.getElementById('contentContainer'));
    } catch (err) {
      showToast(err.message || 'Error al guardar usuario', 'danger');
    }
  });
}

