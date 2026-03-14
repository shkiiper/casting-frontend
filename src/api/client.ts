import axios from "axios";

const API_BASE_URL =
  (window as any).__API_BASE_URL__ || "http://localhost:8080";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let logoutTriggered = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const hasToken = Boolean(localStorage.getItem("accessToken"));
    if (error.response?.status === 401 && hasToken && !logoutTriggered) {
      logoutTriggered = true;
      window.dispatchEvent(new Event("unauthorized"));
    }
    return Promise.reject(error);
  }
);


export default api;
