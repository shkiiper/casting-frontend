import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "/api";

const publicApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
});

export default publicApi;
