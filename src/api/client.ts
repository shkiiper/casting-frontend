import axios from "axios";

type WindowWithApiBase = Window & {
  __API_BASE_URL__?: string;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (window as WindowWithApiBase).__API_BASE_URL__ ||
  "";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("accessToken") || localStorage.getItem("token");
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
    const hasToken = Boolean(
      localStorage.getItem("accessToken") || localStorage.getItem("token")
    );
    if (error.response?.status === 401 && hasToken && !logoutTriggered) {
      logoutTriggered = true;
      window.dispatchEvent(new Event("unauthorized"));
    }
    return Promise.reject(error);
  }
);

export default api;
