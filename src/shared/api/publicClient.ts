import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8080";

const publicApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
});

export default publicApi;
