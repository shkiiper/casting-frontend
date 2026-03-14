import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Добавляем токен автоматически ко всем запросам
api.interceptors.request.use((config: any) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// При 401 — logout и редирект на /login
api.interceptors.response.use(
  (response: any) => response,
  (error: any) => {
    const hasToken = Boolean(localStorage.getItem('accessToken'));
    if (error.response?.status === 401 && hasToken) {
      window.dispatchEvent(new Event("unauthorized"));
    }
    return Promise.reject(error);
  }
);

export default api;
