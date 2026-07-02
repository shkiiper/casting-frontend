import { create } from "zustand";

type SessionRole = string | null;

const ACCESS_TOKEN_KEY = "accessToken";
const LEGACY_TOKEN_KEY = "token";
const ROLE_KEY = "role";
const ACCOUNT_NAME_KEY = "account_name";
const ACCOUNT_ROLES_KEY = "account_roles";

const toNormalizedRole = (role?: string | null): SessionRole =>
  role ? role.toUpperCase() : null;

const isRoleString = (role: SessionRole): role is string => Boolean(role);

const getAccountName = (role?: string | null) =>
  role === "CUSTOMER" ? "Заказчик" : role || "";

export const getStoredAccessToken = () =>
  localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);

export const getStoredRole = () => toNormalizedRole(localStorage.getItem(ROLE_KEY));

export const getStoredEmail = () => {
  const token = getStoredAccessToken();
  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalizedPayload));
    return typeof decoded.sub === "string" ? decoded.sub : null;
  } catch {
    return null;
  }
};

export const getStoredAccountRoles = () => {
  try {
    const roles = JSON.parse(localStorage.getItem(ACCOUNT_ROLES_KEY) ?? "[]");
    return Array.isArray(roles)
      ? roles.map((role) => toNormalizedRole(String(role))).filter(isRoleString)
      : [];
  } catch {
    return [];
  }
};

export const persistSession = (
  token: string,
  role?: string | null,
  availableRoles?: string[] | null
) => {
  localStorage.setItem(LEGACY_TOKEN_KEY, token);
  localStorage.setItem(ACCESS_TOKEN_KEY, token);

  const normalizedRole = toNormalizedRole(role);
  if (normalizedRole) {
    localStorage.setItem(ROLE_KEY, normalizedRole);
    localStorage.setItem(ACCOUNT_NAME_KEY, getAccountName(normalizedRole));
  }

  if (availableRoles) {
    const normalizedRoles = availableRoles
      .map((item) => toNormalizedRole(item))
      .filter(isRoleString);
    localStorage.setItem(ACCOUNT_ROLES_KEY, JSON.stringify(normalizedRoles));
  }
};

export const clearStoredSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(ACCOUNT_NAME_KEY);
  localStorage.removeItem(ACCOUNT_ROLES_KEY);
  localStorage.removeItem("refreshToken");
  sessionStorage.clear();
};

type AuthState = {
  accessToken: string | null;
  role: SessionRole;
  availableRoles: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    token: string,
    role?: string | null,
    availableRoles?: string[] | null
  ) => void;
  logout: () => void;
  initFromStorage: () => void;
};

const readSessionSnapshot = () => {
  const accessToken = getStoredAccessToken();
  const role = getStoredRole();
  return {
    accessToken,
    role,
    availableRoles: getStoredAccountRoles(),
    isAuthenticated: Boolean(accessToken),
  };
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  role: null,
  availableRoles: [],
  isAuthenticated: false,
  isLoading: true,

  initFromStorage: () => {
    set({
      ...readSessionSnapshot(),
      isLoading: false,
    });
  },

  login: (token: string, role?: string | null, availableRoles?: string[] | null) => {
    persistSession(token, role, availableRoles);
    set({
      accessToken: token,
      role: toNormalizedRole(role) ?? getStoredRole(),
      availableRoles: availableRoles
        ? availableRoles.map((item) => toNormalizedRole(item)).filter(isRoleString)
        : getStoredAccountRoles(),
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: () => {
    clearStoredSession();
    set({
      accessToken: null,
      role: null,
      availableRoles: [],
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
  const availableRoles = useAuthStore((state) => state.availableRoles);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);

  return {
    accessToken,
    role,
    availableRoles,
    isAuthenticated,
    isLoading,
    isAdmin: role === "ADMIN",
    login,
    logout,
  };
};
