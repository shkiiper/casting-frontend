import { FormEvent, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { resendVerification, verifyEmail } from "../../api/auth";
import { useAuthStore } from "../../entities/user/model/authStore";
import { PageOctopusDecor } from "@/shared/ui/PageOctopusDecor";
import { getApiErrorMessage, sanitizeEmail, trimToNull } from "@/shared/lib/safety";
import "./CheckEmailPage.css";

type UserRole =
  | "CUSTOMER"
  | "ACTOR"
  | "CREATOR"
  | "LOCATION_OWNER"
  | "LOCATION"
  | "ADMIN";

const resolveRedirectPath = (role?: string) => {
  const normalized = (role ?? "").toUpperCase();
  if (normalized === "CUSTOMER") return "/customer";
  if (normalized === "CREATOR") return "/creator";
  if (normalized === "ACTOR") return "/actor";
  if (normalized === "LOCATION_OWNER" || normalized === "LOCATION") return "/location";
  return "/account";
};

export function CheckEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as { email?: string } | null) ?? null;
  const loginStore = useAuthStore((s) => s.login);

  const initialEmail =
    locationState?.email ?? localStorage.getItem("pendingVerificationEmail") ?? "";

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
      });
      localStorage.removeItem("pendingVerificationEmail");

      const maybeAuth = res as { token?: string | null; role?: string };
      if (maybeAuth.token) {
        localStorage.setItem("token", maybeAuth.token);
        localStorage.setItem("accessToken", maybeAuth.token);
        loginStore(maybeAuth.token);
        if (maybeAuth.role) {
          localStorage.setItem("role", maybeAuth.role);
          localStorage.setItem(
            "account_name",
            maybeAuth.role === "CUSTOMER" ? "Заказчик" : maybeAuth.role
          );
        }
        navigate(resolveRedirectPath(maybeAuth.role as UserRole), {
          replace: true,
        });
        return;
      }

      setMsg(
        (res as { message?: string }).message || "Email подтверждён. Теперь войдите."
      );
      setTimeout(() => navigate("/login"), 600);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Неверный код или код истёк"));
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
      const res = await resendVerification({ email: normalizedEmail });
      localStorage.setItem("pendingVerificationEmail", normalizedEmail);
      setMsg(res.message || "Письмо отправлено");
    } catch (error: unknown) {
      console.error(error);
      setError(getApiErrorMessage(error, "Не удалось отправить письмо"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="check-root">
      <PageOctopusDecor />
      <div className="check-card relative z-10">
        <h1 className="check-title">Проверь почту</h1>
        <p className="check-text">
          Мы отправили 6-значный код подтверждения на email. Введите его ниже.
        </p>

        <form className="check-form" onSubmit={onVerify}>
          <div className="check-email-box">
            <div className="check-email-label">Код отправлен на email</div>
            <div className="check-email-value">{email || "Email не указан"}</div>
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
          Если письмо не приходит — проверь “Спам”.
        </p>
      </div>
    </div>
  );
}
