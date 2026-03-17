import axios from "axios";

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

const publicApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
});

export default publicApi;
