import { create } from "zustand";

type SessionRole = string | null;

const ACCESS_TOKEN_KEY = "accessToken";
const LEGACY_TOKEN_KEY = "token";
const ROLE_KEY = "role";
const ACCOUNT_NAME_KEY = "account_name";

const toNormalizedRole = (role?: string | null): SessionRole =>
  role ? role.toUpperCase() : null;

const getAccountName = (role?: string | null) =>
  role === "CUSTOMER" ? "Заказчик" : role || "";

export const getStoredAccessToken = () =>
  localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);

export const getStoredRole = () => toNormalizedRole(localStorage.getItem(ROLE_KEY));

export const persistSession = (token: string, role?: string | null) => {
  localStorage.setItem(LEGACY_TOKEN_KEY, token);
  localStorage.setItem(ACCESS_TOKEN_KEY, token);

  const normalizedRole = toNormalizedRole(role);
  if (normalizedRole) {
    localStorage.setItem(ROLE_KEY, normalizedRole);
    localStorage.setItem(ACCOUNT_NAME_KEY, getAccountName(normalizedRole));
  }
};

export const clearStoredSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(ACCOUNT_NAME_KEY);
  localStorage.removeItem("refreshToken");
  sessionStorage.clear();
};

type AuthState = {
  accessToken: string | null;
  role: SessionRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, role?: string | null) => void;
  logout: () => void;
  initFromStorage: () => void;
};

const readSessionSnapshot = () => {
  const accessToken = getStoredAccessToken();
  const role = getStoredRole();
  return {
    accessToken,
    role,
    isAuthenticated: Boolean(accessToken),
  };
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,

  initFromStorage: () => {
    set({
      ...readSessionSnapshot(),
      isLoading: false,
    });
  },

  login: (token: string, role?: string | null) => {
    persistSession(token, role);
    set({
      accessToken: token,
      role: toNormalizedRole(role) ?? getStoredRole(),
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: () => {
    clearStoredSession();
    set({
      accessToken: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },
}));

export const logoutSession = () => {
  useAuthStore.getState().logout();
};

export const useSession = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const role = useAuthStore((state) => state.role);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);

  return {
    accessToken,
    role,
    isAuthenticated,
    isLoading,
    isAdmin: role === "ADMIN",
    login,
    logout,
  };
};
