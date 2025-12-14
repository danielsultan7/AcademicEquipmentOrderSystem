const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error ${response.status}`);
  }
  
  return response.json();
}

// ============ Users API ============
export const usersApi = {
  getAll: () => fetchApi('/users'),
  getById: (id) => fetchApi(`/users/${id}`),
  create: (userData) => fetchApi('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
  update: (id, userData) => fetchApi(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  }),
  delete: (id) => fetchApi(`/users/${id}`, {
    method: 'DELETE',
  }),
};

// ============ Products API ============
export const productsApi = {
  getAll: () => fetchApi('/products'),
  getById: (id) => fetchApi(`/products/${id}`),
  create: (productData) => fetchApi('/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  }),
  update: (id, productData) => fetchApi(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(productData),
  }),
  delete: (id) => fetchApi(`/products/${id}`, {
    method: 'DELETE',
  }),
};

// ============ Orders API ============
export const ordersApi = {
  getAll: () => fetchApi('/orders'),
  getById: (id) => fetchApi(`/orders/${id}`),
  create: (orderData) => fetchApi('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  }),
  update: (id, orderData) => fetchApi(`/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(orderData),
  }),
  approve: (id) => fetchApi(`/orders/${id}/approve`, {
    method: 'PUT',
  }),
  reject: (id) => fetchApi(`/orders/${id}/reject`, {
    method: 'PUT',
  }),
  delete: (id) => fetchApi(`/orders/${id}`, {
    method: 'DELETE',
  }),
};

// ============ Logs API ============
export const logsApi = {
  getAll: () => fetchApi('/logs'),
  create: (logData) => fetchApi('/logs', {
    method: 'POST',
    body: JSON.stringify(logData),
  }),
};

// ============ Health Check ============
export const healthCheck = () => fetchApi('/health');
