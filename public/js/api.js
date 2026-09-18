// API Client Seguro para YogurArte
const API_BASE = '/api';

// In-memory Cache para navegación instantánea (0ms) entre apartados y móviles
const apiCache = new Map();
const CACHE_TTL_MS = 25000; // 25 segundos de validez

export function clearApiCache() {
  apiCache.clear();
}

/**
 * Función central para realizar peticiones HTTP a la API
 * Adjunta automáticamente el token JWT y maneja expiración de sesión (401)
 */
async function apiFetch(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const useCache = isGet && !options.noCache;
  const cacheKey = endpoint;

  if (useCache && apiCache.has(cacheKey)) {
    const cached = apiCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return JSON.parse(JSON.stringify(cached.data));
    }
    apiCache.delete(cacheKey);
  }

  const token = localStorage.getItem('yogurarte_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Manejo de sesión expirada o token inválido (401)
  if (res.status === 401 && !endpoint.includes('/users/login') && !endpoint.includes('/users/public-list')) {
    localStorage.removeItem('yogurarte_token');
    localStorage.removeItem('yogurarte_auth_user');
    apiCache.clear();
    window.dispatchEvent(new CustomEvent('session-expired'));
    const errData = await res.json().catch(() => ({ error: 'Sesión expirada' }));
    throw new Error(errData.error || 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: `Error en la petición (${res.status})` }));
    throw new Error(errData.error || errData.message || `Error en la petición (${res.status})`);
  }

  const data = await res.json();

  if (useCache) {
    apiCache.set(cacheKey, { timestamp: Date.now(), data });
  } else if (!isGet) {
    // Si se realizó una mutación (POST, PUT, DELETE), invalidar caché para sincronizar datos frescos
    apiCache.clear();
  }

  return data;
}

export const api = {
  clearCache: clearApiCache,
  // Dashboard
  async getDashboardSummary(params = {}) {
    let query = '';
    if (typeof params === 'string') {
      query = `period=${params}`;
    } else {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          sp.append(key, val);
        }
      });
      query = sp.toString();
    }
    return apiFetch(`/dashboard/summary${query ? '?' + query : ''}`);
  },

  // Pedidos
  async getOrders(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    return apiFetch(`/orders?${query.toString()}`);
  },

  async getOrderById(id) {
    return apiFetch(`/orders/${id}`);
  },

  async createOrder(data) {
    return apiFetch('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateOrder(id, data) {
    return apiFetch(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async addOrderPayment(id, data) {
    return apiFetch(`/orders/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateOrderPayment(orderId, paymentId, data) {
    return apiFetch(`/orders/${orderId}/payments/${paymentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteOrderPayment(orderId, paymentId) {
    return apiFetch(`/orders/${orderId}/payments/${paymentId}`, {
      method: 'DELETE',
    });
  },

  async assignOrderDriver(id, data) {
    return apiFetch(`/orders/${id}/assign-driver`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async updateOrderDeliveryStatus(id, data) {
    return apiFetch(`/orders/${id}/delivery-status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async rescheduleOverdueOrders() {
    return apiFetch('/orders/reschedule-overdue', {
      method: 'POST',
    });
  },

  async deleteOrder(id) {
    return apiFetch(`/orders/${id}`, {
      method: 'DELETE',
    });
  },

  async getWhatsAppLink(id, type = '') {
    return apiFetch(`/orders/${id}/whatsapp${type ? `?type=${encodeURIComponent(type)}` : ''}`);
  },

  // Producción (Lotes)
  async getBatches(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') query.append(key, val);
    });
    return apiFetch(`/batches?${query.toString()}`);
  },

  async getBatchById(id) {
    return apiFetch(`/batches/${id}`);
  },

  async createBatch(data) {
    return apiFetch('/batches', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateBatch(id, data) {
    return apiFetch(`/batches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deactivateBatch(id, reason, restoreStock = false, unlinkOrders = true) {
    return apiFetch(`/batches/${id}/deactivate`, {
      method: 'PUT',
      body: JSON.stringify({ reason, restoreStock, unlinkOrders }),
    });
  },

  async getPendingBatchOrders(flavor = '') {
    const query = flavor ? `?flavor=${encodeURIComponent(flavor)}` : '';
    return apiFetch(`/batches/pending-orders${query}`);
  },

  async linkOrdersToBatch(batchId, payload = {}) {
    return apiFetch(`/batches/${batchId}/link-orders`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async createBatchDischarge(batchId, payload) {
    return apiFetch(`/batches/${batchId}/discharges`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteBatchDischarge(dischargeId) {
    return apiFetch(`/batches/discharges/${dischargeId}`, {
      method: 'DELETE',
    });
  },

  // Inventario y Materia Prima
  async getMaterials() {
    return apiFetch('/inventory/materials');
  },

  async createMaterial(data) {
    return apiFetch('/inventory/materials', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateMaterial(id, data) {
    return apiFetch(`/inventory/materials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteMaterial(id) {
    return apiFetch(`/inventory/materials/${id}`, {
      method: 'DELETE',
    });
  },

  async createPurchase(data) {
    return apiFetch('/inventory/purchases', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updatePurchase(id, data) {
    return apiFetch(`/inventory/purchases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deletePurchase(id) {
    return apiFetch(`/inventory/purchases/${id}`, {
      method: 'DELETE',
    });
  },

  async adjustStock(id, newStock, reason, type = 'CONTEO_FISICO', registeredBy = '', adjustmentDate = '') {
    return apiFetch(`/inventory/materials/${id}/adjust`, {
      method: 'PUT',
      body: JSON.stringify({ newStock, reason, type, registeredBy, adjustmentDate }),
    });
  },

  async createInventoryAdjustment(data) {
    return apiFetch('/inventory/adjustments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getInventoryAdjustments(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    return apiFetch(`/inventory/adjustments?${query.toString()}`);
  },

  async deleteInventoryAdjustment(id) {
    return apiFetch(`/inventory/adjustments/${id}`, {
      method: 'DELETE',
    });
  },

  async getPurchasesHistory(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') query.append(key, val);
    });
    return apiFetch(`/inventory/purchases?${query.toString()}`);
  },

  // Preparaciones / Elaboración de Insumos (Mermeladas, Jarabes)
  async getPreparations() {
    return apiFetch('/preparations');
  },

  async getPreparationById(id) {
    return apiFetch(`/preparations/${id}`);
  },

  async createPreparation(data) {
    return apiFetch('/preparations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deletePreparation(id) {
    return apiFetch(`/preparations/${id}`, {
      method: 'DELETE',
    });
  },

  // Gastos
  async getExpenses(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val) query.append(key, val);
    });
    return apiFetch(`/expenses?${query.toString()}`);
  },

  async createExpense(data) {
    return apiFetch('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteExpense(id) {
    return apiFetch(`/expenses/${id}`, {
      method: 'DELETE',
    });
  },

  // Movimientos de Caja y Bases
  async getCashMovements(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val) query.append(key, val);
    });
    return apiFetch(`/cash-movements?${query.toString()}`);
  },

  async createCashMovement(data) {
    return apiFetch('/cash-movements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCashMovement(id, data) {
    return apiFetch(`/cash-movements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteCashMovement(id) {
    return apiFetch(`/cash-movements/${id}`, {
      method: 'DELETE',
    });
  },

  // Clientes
  async getCustomers(params = {}) {
    let query = '';
    if (typeof params === 'string') {
      query = `search=${encodeURIComponent(params)}`;
    } else {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          sp.append(key, val);
        }
      });
      query = sp.toString();
    }
    return apiFetch(`/customers${query ? '?' + query : ''}`);
  },

  async getCustomerById(id) {
    return apiFetch(`/customers/${id}`);
  },

  async getCustomerWhatsAppLink(id) {
    return apiFetch(`/customers/${id}/whatsapp`);
  },

  async createOrUpdateCustomer(data) {
    return apiFetch('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCustomer(id, data) {
    return apiFetch(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async registerCustomerPayment(id, data) {
    return apiFetch(`/customers/${id}/payment`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteCustomer(id) {
    return apiFetch(`/customers/${id}`, {
      method: 'DELETE',
    });
  },

  // Usuarios y Autenticación
  async getPublicUsersList() {
    return apiFetch('/users/public-list');
  },

  async getUsers() {
    return apiFetch('/users');
  },

  async getMe() {
    return apiFetch('/users/me');
  },

  async login(username, password) {
    return apiFetch('/users/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  async forgotPassword(identifier) {
    return apiFetch('/users/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  },

  async resetPassword(identifier, resetCode, newPassword) {
    return apiFetch('/users/reset-password', {
      method: 'POST',
      body: JSON.stringify({ identifier, resetCode, newPassword }),
    });
  },

  async createUser(data) {
    return apiFetch('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateUser(id, data) {
    return apiFetch(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteUser(id) {
    return apiFetch(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  // Personal, Nómina y Retiros de Socios
  async getStaff(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') query.append(key, val);
    });
    return apiFetch(`/staff?${query.toString()}`);
  },

  async getStaffById(id) {
    return apiFetch(`/staff/${id}`);
  },

  async createStaff(data) {
    return apiFetch('/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateStaff(id, data) {
    return apiFetch(`/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteStaff(id) {
    return apiFetch(`/staff/${id}`, {
      method: 'DELETE',
    });
  },

  async getStaffPayments(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') query.append(key, val);
    });
    return apiFetch(`/staff/payments/list?${query.toString()}`);
  },

  async createStaffPayment(data) {
    return apiFetch('/staff/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateStaffPayment(id, data) {
    return apiFetch(`/staff/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteStaffPayment(id) {
    return apiFetch(`/staff/payments/${id}`, {
      method: 'DELETE',
    });
  },

  async getStaffPaymentWhatsAppLink(id) {
    return apiFetch(`/staff/payments/${id}/whatsapp`);
  },

  // Créditos y Compras a Cuotas
  async getCredits() {
    return apiFetch('/credits');
  },

  async createCredit(data) {
    return apiFetch('/credits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async payCreditInstallment(id, data) {
    return apiFetch(`/credits/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async skipCreditInstallment(id, data) {
    return apiFetch(`/credits/${id}/skip`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteCredit(id) {
    return apiFetch(`/credits/${id}`, {
      method: 'DELETE',
    });
  },

  // Configuración del Sistema (Datos Bancarios, Nequi, etc.)
  async getSettings() {
    return apiFetch('/settings');
  },

  async updateSettings(data) {
    return apiFetch('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // CRM y WhatsApp Multi-Agente
  async getWhatsAppStatus() {
    return apiFetch('/crm/status');
  },

  async logoutWhatsApp() {
    return apiFetch('/crm/logout', {
      method: 'POST',
    });
  },

  async refreshCrmQR() {
    return apiFetch('/crm/refresh-qr', {
      method: 'POST',
    });
  },

  async getCrmConversations(search = '', tag = 'ALL') {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (tag && tag !== 'ALL') params.set('tag', tag);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/crm/conversations${qs}`);
  },

  async getCrmMessages(conversationId, options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit);
    if (options.beforeId) params.set('beforeId', options.beforeId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/crm/conversations/${conversationId}/messages${qs}`);
  },

  async sendCrmMessage(to, text, extra = {}) {
    return apiFetch('/crm/send', {
      method: 'POST',
      body: JSON.stringify({ recipient: to, to, text, ...extra }),
    });
  },

  async markCrmConversationAsRead(conversationId) {
    return apiFetch(`/crm/conversations/${conversationId}/read`, {
      method: 'POST',
    });
  },

  async updateCrmConversationTag(conversationId, tag) {
    return apiFetch(`/crm/conversations/${conversationId}/tag`, {
      method: 'PUT',
      body: JSON.stringify({ tag }),
    });
  },

  async linkCrmCustomer(conversationId, customerId) {
    return apiFetch(`/crm/conversations/${conversationId}/link-customer`, {
      method: 'POST',
      body: JSON.stringify({ customerId }),
    });
  },

  // 🎁 Programa de Fidelización (10+1)
  async getCrmLoyalty(search = '', page = 1, limit = 12) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/crm/loyalty${qs}`);
  },

  async redeemCrmLoyalty(customerId) {
    return apiFetch('/crm/loyalty/redeem', {
      method: 'POST',
      body: JSON.stringify({ customerId }),
    });
  },

  // 🔁 Compras Frecuentes y Recordatorios
  async getCrmRecurring(filter = 'ALL', search = '') {
    const params = new URLSearchParams();
    if (filter && filter !== 'ALL') params.set('filter', filter);
    if (search) params.set('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/crm/recurring${qs}`);
  },

  async createCrmRecurring(data) {
    return apiFetch('/crm/recurring', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCrmRecurring(id, data) {
    return apiFetch(`/crm/recurring/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteCrmRecurring(id) {
    return apiFetch(`/crm/recurring/${id}`, {
      method: 'DELETE',
    });
  },

  async triggerCrmRecurringOrder(id) {
    return apiFetch(`/crm/recurring/${id}/create-order`, {
      method: 'POST',
    });
  },

  // ⚡ Respuestas Rápidas (Plantillas)
  async getCrmQuickReplies() {
    return apiFetch('/crm/quick-replies');
  },

  async createCrmQuickReply(data) {
    return apiFetch('/crm/quick-replies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCrmQuickReply(id, data) {
    return apiFetch(`/crm/quick-replies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteCrmQuickReply(id) {
    return apiFetch(`/crm/quick-replies/${id}`, {
      method: 'DELETE',
    });
  },
};


