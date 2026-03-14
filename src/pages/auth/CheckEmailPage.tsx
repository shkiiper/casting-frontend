import { FormEvent, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { resendVerification, verifyEmail } from "../../api/auth";
import { useAuthStore } from "../../entities/user/model/authStore";
import { PageOctopusDecor } from "@/shared/ui/PageOctopusDecor";
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

  const initialEmail = locationState?.email ?? "";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => email.trim().length > 3 && code.trim().length >= 6,
    [email, code]
  );

  const onVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setLoading(true);

    try {
      const res = await verifyEmail({
        email: email.trim(),
        code: code.trim(),
      });

      const maybeAuth = res as { token?: string | null; role?: string };
      if (maybeAuth.token) {
        localStorage.setItem("token", maybeAuth.token);
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
    } catch (e: unknown) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Неверный код или код истёк";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    setError(null);
    setMsg(null);
    setLoading(true);
    try {
      const res = await resendVerification({ email: email.trim() });
      setMsg(res.message || "Письмо отправлено");
    } catch (e: unknown) {
      console.error(e);
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Не удалось отправить письмо"
      );
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
          <label className="check-label">
            Email
            <input
              className="check-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>

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
