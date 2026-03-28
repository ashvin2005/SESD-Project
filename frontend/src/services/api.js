import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken });
          localStorage.setItem('token', data.data.token);
          localStorage.setItem('refresh_token', data.data.refreshToken);
          original.headers.Authorization = `Bearer ${data.data.token}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/profile', data),
  changePassword: (data) => api.patch('/auth/change-password', data),
  getPreferences: () => api.get('/auth/preferences'),
  updatePreferences: (data) => api.patch('/auth/preferences', data),
};

// Transactions
export const transactionsApi = {
  list: (params) => api.get('/transactions', { params }),
  get: (id) => api.get(`/transactions/${id}`),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.patch(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
  bulkDelete: (ids) => api.post('/transactions/bulk-delete', { ids }),
  bulkRecategorize: (ids, category_id) => api.post('/transactions/bulk-recategorize', { ids, category_id }),
};

// Categories
export const categoriesApi = {
  list: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.patch(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
  merge: (id, target_category_id) => api.post(`/categories/${id}/merge`, { target_category_id }),
};

// Budgets
export const budgetsApi = {
  list: () => api.get('/budgets'),
  summary: () => api.get('/budgets/summary'),
  get: (id) => api.get(`/budgets/${id}`),
  create: (data) => api.post('/budgets', data),
  update: (id, data) => api.patch(`/budgets/${id}`, data),
  deactivate: (id) => api.patch(`/budgets/${id}/deactivate`),
  delete: (id) => api.delete(`/budgets/${id}`),
};

// Reports
export const reportsApi = {
  monthlySummary: (params) => api.get('/reports/monthly-summary', { params }),
  categoryBreakdown: (params) => api.get('/reports/category-breakdown', { params }),
  yearOverYear: () => api.get('/reports/year-over-year'),
  savingsTrend: (params) => api.get('/reports/savings-trend', { params }),
  export: (params) => api.get('/reports/export', { params, responseType: 'blob' }),
};

// Dashboard
export const dashboardApi = {
  get: () => api.get('/dashboard'),
};

// Notifications
export const notificationsApi = {
  list: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  deleteAll: () => api.delete('/notifications/all'),
};

// Insights
export const insightsApi = {
  generate: () => api.get('/insights/generate'),
  summary: () => api.get('/insights/summary'),
};

// Recurring
export const recurringApi = {
  list: () => api.get('/recurring'),
  get: (id) => api.get(`/recurring/${id}`),
  create: (data) => api.post('/recurring', data),
  update: (id, data) => api.patch(`/recurring/${id}`, data),
  delete: (id) => api.delete(`/recurring/${id}`),
};

// Chat (Conversational Finance Assistant)
export const chatApi = {
  message: (message, history = []) => api.post('/chat/message', { message, history }),
};

// Bank Import
export const importApi = {
  preview: (file, currency = 'INR') => {
    const form = new FormData();
    form.append('file', file);
    form.append('currency', currency);
    return api.post('/import/preview', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  confirm: (transactions, currency = 'INR') => api.post('/import/confirm', { transactions, currency }),
};

// Receipts
export const receiptsApi = {
  list: () => api.get('/receipts'),
  upload: (file, transactionId = null) => {
    const form = new FormData();
    form.append('receipt', file);
    if (transactionId) form.append('transaction_id', transactionId);
    return api.post('/receipts', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  get: (id) => api.get(`/receipts/${id}`),
  fileUrl: (id, thumbnail = false) => `${BASE_URL}/receipts/${id}/file${thumbnail ? '?thumbnail=true' : ''}`,
  delete: (id) => api.delete(`/receipts/${id}`),
};

// Investments
export const investmentsApi = {
  list: () => api.get('/investments'),
  get: (id) => api.get(`/investments/${id}`),
  create: (data) => api.post('/investments', data),
  update: (id, data) => api.put(`/investments/${id}`, data),
  delete: (id) => api.delete(`/investments/${id}`),
};

// AI Features (Budget Recommendations, Goal Planning, Anomaly Detection)
export const aiApi = {
  budgetRecommendations: () => api.get('/ai/budget-recommendations'),
  goalPlan: (data) => api.post('/ai/goal-plan', data),
  anomalies: () => api.get('/ai/anomalies'),
};

export default api;
