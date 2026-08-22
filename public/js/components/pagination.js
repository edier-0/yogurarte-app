/**
 * Módulo Universal de Paginación para YogurArte
 * Máximo 15 registros por página con búsqueda y filtros globales.
 */

export const PAGE_SIZE = 15;

/**
 * Divide cualquier array de datos en la página solicitada.
 * @param {Array} items - Array con todos los registros filtrados globalmente
 * @param {number} currentPage - Página actual (inicia en 1)
 * @param {number} pageSize - Registros por página (por defecto 15)
 * @returns {{ pageItems: Array, totalPages: number, totalItems: number, startIndex: number, endIndex: number, currentPage: number }}
 */
export function paginateArray(items = [], currentPage = 1, pageSize = PAGE_SIZE) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (validPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const pageItems = items.slice(startIndex, endIndex);

  return {
    pageItems,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    currentPage: validPage,
  };
}

/**
 * Genera el HTML de la barra de paginación estilizada.
 * @param {Object} options
 * @param {number} options.currentPage - Página actual
 * @param {number} options.totalPages - Total de páginas
 * @param {number} options.totalItems - Total de registros encontrados
 * @param {number} options.pageSize - Tamaño de página
 * @param {string} options.itemName - Nombre del elemento (ej: 'pedidos', 'movimientos', 'clientes')
 * @param {string} options.paginationId - ID único para el contenedor de la paginación
 * @returns {string} HTML string
 */
export function renderPaginationHtml({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = PAGE_SIZE,
  itemName = 'registros',
  paginationId = 'paginationControls',
}) {
  if (totalItems <= pageSize) {
    if (totalItems === 0) return '';
    return `
      <div class="pagination-container" id="${paginationId}" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 6px; margin-top: 14px; font-size: 0.82rem; color: var(--text-muted); border-top: 1px solid var(--border-subtle);">
        <span>Mostrando <strong>${totalItems}</strong> de <strong>${totalItems}</strong> ${itemName}</span>
        <span style="font-weight: 700; color: var(--primary);">Página 1 de 1</span>
      </div>
    `;
  }

  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalItems);

  const maxVisiblePages = 5;
  let pageButtonsHtml = '';

  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  if (startPage > 1) {
    pageButtonsHtml += `
      <button type="button" class="btn btn-sm btn-pagination-num" data-page="1" style="min-width: 32px; padding: 4px 8px; font-weight: 700;">1</button>
    `;
    if (startPage > 2) {
      pageButtonsHtml += `<span style="padding: 0 4px; color: var(--text-muted); font-weight: 700;">...</span>`;
    }
  }

  for (let p = startPage; p <= endPage; p++) {
    const isActive = p === currentPage;
    pageButtonsHtml += `
      <button 
        type="button" 
        class="btn btn-sm btn-pagination-num ${isActive ? 'btn-primary' : 'btn-outline'}" 
        data-page="${p}" 
        style="min-width: 32px; padding: 4px 8px; font-weight: ${isActive ? '800' : '600'}; ${isActive ? 'background: var(--primary); color: white;' : ''}"
        ${isActive ? 'disabled' : ''}
      >
        ${p}
      </button>
    `;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      pageButtonsHtml += `<span style="padding: 0 4px; color: var(--text-muted); font-weight: 700;">...</span>`;
    }
    pageButtonsHtml += `
      <button type="button" class="btn btn-sm btn-pagination-num" data-page="${totalPages}" style="min-width: 32px; padding: 4px 8px; font-weight: 700;">${totalPages}</button>
    `;
  }

  return `
    <div class="pagination-container" id="${paginationId}" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; padding: 14px 6px; margin-top: 16px; border-top: 1.5px solid var(--border-subtle); background: transparent;">
      <div style="font-size: 0.83rem; color: var(--text-muted);">
        Mostrando <strong>${startRecord} - ${endRecord}</strong> de <strong>${totalItems}</strong> ${itemName}
      </div>

      <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
        <!-- Botón Anterior -->
        <button 
          type="button" 
          class="btn btn-sm btn-outline btn-pagination-prev" 
          data-page="${currentPage - 1}" 
          style="padding: 4px 10px; font-weight: 700; ${currentPage === 1 ? 'opacity: 0.5; pointer-events: none;' : ''}"
          ${currentPage === 1 ? 'disabled' : ''}
        >
          ◀ Anterior
        </button>

        <!-- Números de Página -->
        <div style="display: flex; align-items: center; gap: 4px;">
          ${pageButtonsHtml}
        </div>

        <!-- Botón Siguiente -->
        <button 
          type="button" 
          class="btn btn-sm btn-outline btn-pagination-next" 
          data-page="${currentPage + 1}" 
          style="padding: 4px 10px; font-weight: 700; ${currentPage === totalPages ? 'opacity: 0.5; pointer-events: none;' : ''}"
          ${currentPage === totalPages ? 'disabled' : ''}
        >
          Siguiente ▶
        </button>
      </div>
    </div>
  `;
}

/**
 * Conecta los eventos de clic en los controles de paginación.
 * @param {HTMLElement} parentContainer - Contenedor padre donde se renderizó la paginación
 * @param {string} paginationId - ID único de la paginación
 * @param {Function} onPageChange - Callback que recibe el nuevo número de página
 * @param {HTMLElement|null} scrollTarget - Elemento al cual hacer scroll suave tras cambiar de página
 */
export function attachPaginationEvents(parentContainer, paginationId, onPageChange, scrollTarget = null) {
  if (!parentContainer) return;
  const container = parentContainer.querySelector(`#${paginationId}`) || parentContainer;

  container.querySelectorAll('.btn-pagination-num, .btn-pagination-prev, .btn-pagination-next').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetPage = Number(e.currentTarget.dataset.page);
      if (!isNaN(targetPage) && targetPage >= 1) {
        if (scrollTarget && typeof scrollTarget.scrollIntoView === 'function') {
          scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        onPageChange(targetPage);
      }
    });
  });
}
