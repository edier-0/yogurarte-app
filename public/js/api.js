// API Client para YogurArte
const API_BASE = '/api';

export const api = {
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
    const res = await fetch(`${API_BASE}/dashboard/summary${query ? '?' + query : ''}`);
    return res.json();
  },

  // Pedidos
  async getOrders(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const res = await fetch(`${API_BASE}/orders?${query.toString()}`);
    return res.json();
  },

  async getOrderById(id) {
    const res = await fetch(`${API_BASE}/orders/${id}`);
    return res.json();
  },

  async createOrder(data) {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateOrder(id, data) {
    const res = await fetch(`${API_BASE}/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteOrder(id) {
    const res = await fetch(`${API_BASE}/orders/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async getWhatsAppLink(id, type = '') {
    const res = await fetch(`${API_BASE}/orders/${id}/whatsapp${type ? `?type=${encodeURIComponent(type)}` : ''}`);
    return res.json();
  },

  // Producción (Lotes)
  async getBatches(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') query.append(key, val);
    });
    const res = await fetch(`${API_BASE}/batches?${query.toString()}`);
    return res.json();
  },

  async getBatchById(id) {
    const res = await fetch(`${API_BASE}/batches/${id}`);
    return res.json();
  },

  async createBatch(data) {
    const res = await fetch(`${API_BASE}/batches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateBatch(id, data) {
    const res = await fetch(`${API_BASE}/batches/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deactivateBatch(id, reason, restoreStock = false) {
    const res = await fetch(`${API_BASE}/batches/${id}/deactivate`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, restoreStock }),
    });
    return res.json();
  },

  // Inventario y Materia Prima
  async getMaterials() {
    const res = await fetch(`${API_BASE}/inventory/materials`);
    return res.json();
  },

  async createMaterial(data) {
    const res = await fetch(`${API_BASE}/inventory/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateMaterial(id, data) {
    const res = await fetch(`${API_BASE}/inventory/materials/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteMaterial(id) {
    const res = await fetch(`${API_BASE}/inventory/materials/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async createPurchase(data) {
    const res = await fetch(`${API_BASE}/inventory/purchases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updatePurchase(id, data) {
    const res = await fetch(`${API_BASE}/inventory/purchases/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deletePurchase(id) {
    const res = await fetch(`${API_BASE}/inventory/purchases/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async adjustStock(id, newStock, reason) {
    const res = await fetch(`${API_BASE}/inventory/materials/${id}/adjust`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newStock, reason }),
    });
    return res.json();
  },

  async getPurchasesHistory(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') query.append(key, val);
    });
    const res = await fetch(`${API_BASE}/inventory/purchases?${query.toString()}`);
    return res.json();
  },

  // Preparaciones / Elaboración de Insumos (Mermeladas, Jarabes)
  async getPreparations() {
    const res = await fetch(`${API_BASE}/preparations`);
    return res.json();
  },

  async getPreparationById(id) {
    const res = await fetch(`${API_BASE}/preparations/${id}`);
    return res.json();
  },

  async createPreparation(data) {
    const res = await fetch(`${API_BASE}/preparations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deletePreparation(id) {
    const res = await fetch(`${API_BASE}/preparations/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  // Gastos
  async getExpenses(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val) query.append(key, val);
    });
    const res = await fetch(`${API_BASE}/expenses?${query.toString()}`);
    return res.json();
  },

  async createExpense(data) {
    const res = await fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteExpense(id) {
    const res = await fetch(`${API_BASE}/expenses/${id}`, {
      method: 'DELETE',
    });
    return res.json();
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
    const res = await fetch(`${API_BASE}/customers${query ? '?' + query : ''}`);
    return res.json();
  },

  async getCustomerById(id) {
    const res = await fetch(`${API_BASE}/customers/${id}`);
    return res.json();
  },

  async getCustomerWhatsAppLink(id) {
    const res = await fetch(`${API_BASE}/customers/${id}/whatsapp`);
    return res.json();
  },

  async createOrUpdateCustomer(data) {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateCustomer(id, data) {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async registerCustomerPayment(id, data) {
    const res = await fetch(`${API_BASE}/customers/${id}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al registrar pago');
    }
    return res.json();
  },

  async deleteCustomer(id) {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  // Usuarios y Autenticación
  async getUsers() {
    const res = await fetch(`${API_BASE}/users`);
    return res.json();
  },

  async login(username, password) {
    const res = await fetch(`${API_BASE}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al iniciar sesión');
    }
    return res.json();
  },

  // Personal, Nómina y Retiros de Socios
  async getStaff(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') query.append(key, val);
    });
    const res = await fetch(`${API_BASE}/staff?${query.toString()}`);
    return res.json();
  },

  async getStaffById(id) {
    const res = await fetch(`${API_BASE}/staff/${id}`);
    return res.json();
  },

  async createStaff(data) {
    const res = await fetch(`${API_BASE}/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al crear integrante');
    }
    return res.json();
  },

  async updateStaff(id, data) {
    const res = await fetch(`${API_BASE}/staff/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al actualizar integrante');
    }
    return res.json();
  },

  async deleteStaff(id) {
    const res = await fetch(`${API_BASE}/staff/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async getStaffPayments(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') query.append(key, val);
    });
    const res = await fetch(`${API_BASE}/staff/payments/list?${query.toString()}`);
    return res.json();
  },

  async createStaffPayment(data) {
    const res = await fetch(`${API_BASE}/staff/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al registrar pago');
    }
    return res.json();
  },

  async deleteStaffPayment(id) {
    const res = await fetch(`${API_BASE}/staff/payments/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async getStaffPaymentWhatsAppLink(id) {
    const res = await fetch(`${API_BASE}/staff/payments/${id}/whatsapp`);
    return res.json();
  },
};
