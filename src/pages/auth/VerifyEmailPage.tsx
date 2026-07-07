import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { login as apiLogin, verifyEmail } from "../../api/auth";
import { useAuthStore } from "../../entities/user/model/authStore";
import type { UserRole } from "../../types/auth";
import { AnimatedCodeBackdrop } from "@/shared/ui/AnimatedCodeBackdrop";
import { getApiErrorMessage } from "@/shared/lib/safety";
import "./VerifyEmailPage.css";

const REGISTRATION_DRAFT_KEY = "pendingRegistrationDraft";

const resolveRedirectPath = (role?: string) => {
  const normalized = (role ?? "").toUpperCase();
  if (normalized === "ADMIN") return "/admin";
  return "/auth/onboarding";
};

const readPendingRole = (fallback?: string | null): UserRole | undefined => {
  const raw =
    fallback ??
    localStorage.getItem("pendingVerificationRole") ??
    (() => {
      try {
        return JSON.parse(sessionStorage.getItem(REGISTRATION_DRAFT_KEY) ?? "{}")
          ?.role;
      } catch {
        return undefined;
      }
    })();

  return raw ? (String(raw).toUpperCase() as UserRole) : undefined;
};

const persistAuth = (
  token: string,
  role: string | undefined,
  loginStore: (
    token: string,
    role?: string | null,
    availableRoles?: string[] | null
  ) => void,
  availableRoles?: string[] | null
) => {
  loginStore(token, role, availableRoles);
  localStorage.removeItem("pendingVerificationEmail");
  localStorage.removeItem("pendingVerificationRole");
  sessionStorage.removeItem("pendingVerificationPassword");
};

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const loginStore = useAuthStore((s) => s.login);
  const email = params.get("email");
  const code = params.get("code");
  const role = readPendingRole(params.get("role"));
  const hasParams = Boolean(email && code);

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    hasParams ? "loading" : "error"
  );
  const [message, setMessage] = useState<string>(
    hasParams
      ? ""
      : "Откройте подтверждение по коду на странице проверки почты"
  );

  useEffect(() => {
    if (!email || !code) return;

    verifyEmail({ email, code, role })
      .then(async (res) => {
        const maybeAuth = res as {
          token?: string | null;
          role?: string;
          availableRoles?: string[];
          message?: string;
        };

        if (maybeAuth.token) {
          persistAuth(maybeAuth.token, maybeAuth.role, loginStore, maybeAuth.availableRoles);
          navigate(resolveRedirectPath(maybeAuth.role as UserRole), { replace: true });
          return;
        }

        const pendingPassword = sessionStorage.getItem("pendingVerificationPassword");
        if (email && pendingPassword) {
          const auth = await apiLogin({ email, password: pendingPassword, role });
          if (auth?.token) {
            persistAuth(auth.token, auth.role, loginStore, auth.availableRoles);
            navigate(resolveRedirectPath(auth.role as UserRole), { replace: true });
            return;
          }
        }

        setStatus("success");
        localStorage.removeItem("pendingVerificationEmail");
        localStorage.removeItem("pendingVerificationRole");
        setMessage(maybeAuth.message || "Email подтвержден");
      })
      .catch((e: unknown) => {
        console.error(e);
        setStatus("error");
        setMessage(getApiErrorMessage(e, "Ошибка подтверждения email"));
      });
  }, [email, code, role, loginStore, navigate]);

  return (
    <div className="verify-root">
      <AnimatedCodeBackdrop />
      <div className="verify-card relative z-10">
        {status === "loading" && (
          <>
            <div className="verify-title">Подтверждаем email...</div>
            <div className="verify-text">Подождите пару секунд.</div>
          </>
        )}

        {status === "success" && (
          <>
            <div className="verify-title">Email подтвержден</div>
            <div className="verify-text">{message}</div>
            <button className="verify-primary" onClick={() => navigate("/login")}>
              Перейти к входу
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="verify-title">Ошибка подтверждения</div>
            <div className="verify-text">{message}</div>
            <div className="verify-actions">
              <button
                className="verify-secondary"
                onClick={() =>
                  navigate("/auth/check-email", {
                    state: { email: params.get("email") ?? "", role },
                  })
                }
              >
                Ввести код
              </button>
              <button className="verify-primary" onClick={() => navigate("/login")}>
                Вход
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
