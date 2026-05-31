import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const ADMIN_TOKEN_KEY = 'admin_token';

export const getAdminToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;

export const setAdminToken = (token: string | null) => {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  }
};

export const adminApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

adminApi.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message = String(error?.response?.data?.message || '').toLowerCase();
    const isAdminTokenError =
      status === 401 && (message.includes('admin token') || message.includes('unauthorized'));

    if (isAdminTokenError && typeof window !== 'undefined') {
      setAdminToken(null);
      if (window.location.pathname !== '/') {
        window.location.href = '/?expired=1';
      }
    }

    return Promise.reject(error);
  },
);
