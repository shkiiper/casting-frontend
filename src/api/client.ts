import axios from "axios";
import {
  getStoredAccessToken,
  logoutSession,
} from "@/entities/user/model/authStore";

type WindowWithApiBase = Window & {
  __API_BASE_URL__?: string;
};

const resolveApiBaseUrl = () => {
  const configuredBaseUrl =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    (window as WindowWithApiBase).__API_BASE_URL__ ||
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

  // If a localhost API URL leaks into a production build, prefer same-origin requests.
  if (!runsOnLocalhost && pointsToLocalApi) {
    return "";
  }

  return normalizedBaseUrl;
};

const API_BASE_URL = resolveApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = getStoredAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let logoutTriggered = false;

api.interceptors.response.use(
  (response) => {
    logoutTriggered = false;
    return response;
  },
  (error) => {
    const hasToken = Boolean(getStoredAccessToken());
    if (error.response?.status === 401 && hasToken && !logoutTriggered) {
      logoutTriggered = true;
      logoutSession();
    }
    return Promise.reject(error);
  }
);

export default api;
