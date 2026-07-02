import { FormEvent, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { login as apiLogin, resendVerification, verifyEmail } from "../../api/auth";
import { useAuthStore } from "../../entities/user/model/authStore";
import type { UserRole } from "../../types/auth";
import { PageOctopusDecor } from "@/shared/ui/PageOctopusDecor";
import { getApiErrorMessage, sanitizeEmail, trimToNull } from "@/shared/lib/safety";
import "./CheckEmailPage.css";

const REGISTRATION_DRAFT_KEY = "pendingRegistrationDraft";

const resolveRedirectPath = (role?: string) => {
  const normalized = (role ?? "").toUpperCase();
  if (normalized === "ADMIN") return "/admin";
  return "/auth/onboarding";
};

const readPendingRole = (fallback?: string): UserRole | undefined => {
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

export function CheckEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState =
    (location.state as { email?: string; role?: UserRole } | null) ?? null;
  const loginStore = useAuthStore((s) => s.login);

  const initialEmail =
    locationState?.email ?? localStorage.getItem("pendingVerificationEmail") ?? "";
  const pendingRole = readPendingRole(locationState?.role);

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => Boolean(sanitizeEmail(email) && code.trim().length >= 6),
    [email, code]
  );

  const onVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setLoading(true);

    try {
      const normalizedEmail = sanitizeEmail(email);
      const normalizedCode = trimToNull(code, 6);
      if (!normalizedEmail || !normalizedCode || normalizedCode.length < 6) {
        setError("Введите корректные email и код");
        return;
      }

      const res = await verifyEmail({
        email: normalizedEmail,
        code: normalizedCode,
        role: pendingRole,
      });

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
      if (pendingPassword) {
        const auth = await apiLogin({
          email: normalizedEmail,
          password: pendingPassword,
          role: pendingRole,
        });

        if (auth?.token) {
          persistAuth(auth.token, auth.role, loginStore, auth.availableRoles);
          navigate(resolveRedirectPath(auth.role as UserRole), { replace: true });
          return;
        }
      }

      localStorage.removeItem("pendingVerificationEmail");
      localStorage.removeItem("pendingVerificationRole");
      setMsg(maybeAuth.message || "Email подтвержден. Теперь войдите.");
      setTimeout(() => navigate("/login"), 600);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Неверный код или код истек"));
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    setError(null);
    setMsg(null);
    setLoading(true);
    try {
      const normalizedEmail = sanitizeEmail(email);
      if (!normalizedEmail) {
        setError("Введите корректный email");
        return;
      }

      const res = await resendVerification({
        email: normalizedEmail,
        role: pendingRole,
      });
      localStorage.setItem("pendingVerificationEmail", normalizedEmail);
      if (pendingRole) {
        localStorage.setItem("pendingVerificationRole", pendingRole);
      }
      setMsg(res.message || "Код отправлен");
    } catch (error: unknown) {
      console.error(error);
      setError(getApiErrorMessage(error, "Не удалось отправить код"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="check-root">
      <PageOctopusDecor />
      <div className="check-card relative z-10">
        <h1 className="check-title">Проверьте почту</h1>
        <p className="check-text">
          Мы отправили 6-значный код подтверждения на email. Введите его ниже.
        </p>

        <form className="check-form" onSubmit={onVerify}>
          <div className="check-email-box">
            <div className="check-email-label">Код отправлен на email</div>
            <input
              className="check-email-edit"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <div className="check-email-note">
              Если ошиблись в почте, можно вернуться назад и исправить ее.
            </div>
          </div>

          <label className="check-label">
            Код подтверждения
            <input
              className="check-input"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="123456"
              inputMode="numeric"
              autoFocus
            />
          </label>

          {msg && <div className="check-ok">{msg}</div>}
          {error && <div className="check-error">{error}</div>}

          <div className="check-actions">
            <button
              type="button"
              className="check-secondary"
              onClick={() => navigate("/auth/register")}
            >
              Изменить email
            </button>
            <button
              type="button"
              className="check-secondary"
              onClick={onResend}
              disabled={loading || email.trim().length < 3}
            >
              {loading ? "Отправляем..." : "Отправить код повторно"}
            </button>

            <button
              type="submit"
              className="check-primary"
              disabled={loading || !canSubmit}
            >
              {loading ? "Проверяем..." : "Подтвердить код"}
            </button>
          </div>
        </form>

        <p className="check-hint">
          Если письмо не приходит, проверьте папку "Спам".
        </p>
      </div>
    </div>
  );
}
