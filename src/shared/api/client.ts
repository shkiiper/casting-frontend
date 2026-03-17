import axios from 'axios';

const resolveApiBaseUrl = () => {
  const configuredBaseUrl =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "";

  const normalizedBaseUrl = configuredBaseUrl.trim().replace(/\/+$/, "");
  if (!normalizedBaseUrl) {
    return "";
  }

  const runsOnLocalhost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(
    window.location.hostname
  );
  const pointsToLocalApi =
    /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(
      normalizedBaseUrl
    );

  if (!runsOnLocalhost && pointsToLocalApi) {
    return "";
  }

  return normalizedBaseUrl;
};

const API_BASE_URL = resolveApiBaseUrl();

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
