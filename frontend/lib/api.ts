import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth
export const login = async (email: string, password: string) => {
  const response = await api.post('/api/auth/login', { email, password });
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
  }
  return response.data;
};

export const logout = async () => {
  const response = await api.post('/api/auth/logout');
  localStorage.removeItem('token');
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/api/auth/me');
  return response.data;
};

// Dashboard
export const getDashboardSummary = async () => {
  const response = await api.get('/api/dashboard/summary');
  return response.data;
};

export const getOrdersByDate = async (from: string, to: string) => {
  const response = await api.get('/api/dashboard/orders-by-date', {
    params: { from, to },
  });
  return response.data;
};

export const getTopCustomers = async (limit: number = 5) => {
  const response = await api.get('/api/dashboard/top-customers', {
    params: { limit },
  });
  return response.data;
};

export const getEventsSummary = async (days: number = 30) => {
  const response = await api.get('/api/dashboard/events-summary', {
    params: { days },
  });
  return response.data;
};

export const getEventsTimeline = async (days: number = 30) => {
  const response = await api.get('/api/dashboard/events-timeline', {
    params: { days },
  });
  return response.data;
};

// Sync
export const triggerSync = async () => {
  const response = await api.post('/api/sync/shopify');
  return response.data;
};

// Shopify Connection
export const getShopifyConnectUrl = async (tenantId: string) => {
  const response = await api.get('/api/shopify/connect-url', {
    params: { tenantId },
  });
  return response.data;
};

export default api;
