import { create } from "zustand";

interface AuthState {
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
  initFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  initFromStorage: () => {
    const token = localStorage.getItem("accessToken");
    set({
      accessToken: token,
      isAuthenticated: Boolean(token),
      isLoading: false,
    });
  },

login: (token: string) => {
  localStorage.setItem("accessToken", token);
  set({
    accessToken: token,
    isAuthenticated: true,
  });
},


  logout: () => {
    localStorage.removeItem("accessToken");
    set({
      accessToken: null,
      isAuthenticated: false,
    });
  },
}));
