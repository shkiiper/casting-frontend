import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  login as apiLogin,
  resendVerification,
  forgotPassword,
} from "../../api/auth";
import api from "../../api/client";
import { useAuthStore } from "../../entities/user/model/authStore";
import { getApiErrorMessage, sanitizeEmail, trimToNull } from "@/shared/lib/safety";
import { CenterToast } from "@/shared/ui/CenterToast";
import "./LoginPage.css";

type Mode = "LOGIN" | "RESEND" | "FORGOT";
type UserRole =
  | "CUSTOMER"
  | "ACTOR"
  | "CREATOR"
  | "LOCATION_OWNER"
  | "LOCATION"
  | "ADMIN";

const resolveMeEndpoint = (role?: string) => {
  const normalized = (role ?? "").toUpperCase();
  return normalized === "CUSTOMER" ? "/api/customer/me" : "/api/profile/me";
};

const resolveRedirectPath = (role?: string) => {
  const normalized = (role ?? "").toUpperCase();
  if (normalized === "ADMIN") return "/admin";
  if (normalized === "CUSTOMER") return "/customer";
  if (normalized === "CREATOR") return "/creator";
  if (normalized === "ACTOR") return "/actor";
  if (normalized === "LOCATION_OWNER" || normalized === "LOCATION") return "/location";
  return "/account";
};

const getErrorStatus = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } })?.response?.status;

const getErrorMessage = (error: unknown): string =>
  (error as { response?: { data?: { message?: string } } })?.response?.data
    ?.message || "Ошибка запроса";

export const LoginPage = () => {
  const [mode, setMode] = useState<Mode>("LOGIN");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loginStore = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const canSubmit = useMemo(() => {
    if (mode === "LOGIN") return Boolean(sanitizeEmail(email) && trimToNull(password, 200));
    return Boolean(sanitizeEmail(email));
  }, [mode, email, password]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (mode === "LOGIN") {
        const normalizedEmail = sanitizeEmail(email);
        const normalizedPassword = trimToNull(password, 200);
        if (!normalizedEmail || !normalizedPassword) {
          setError("Введите корректные email и пароль");
          return;
        }
        const resp = await apiLogin({ email: normalizedEmail, password: normalizedPassword });
        // ожидаем { token, role }
        if (!resp?.token) {
          setError("Токен не получен. Проверь email подтверждение.");
          return;
        }

        // 1) кладём в localStorage
        localStorage.setItem("token", resp.token);
        localStorage.setItem("accessToken", resp.token);
        if (resp.role) {
          localStorage.setItem("role", resp.role);
          localStorage.setItem(
            "account_name",
            resp.role === "CUSTOMER" ? "Заказчик" : resp.role
          );
        }

        // 2) кладём в zustand‑store (если используешь дальше)
        loginStore(resp.token);

        // 3) проверяем профиль в зависимости от роли
        const role = (resp.role ?? "").toUpperCase() as UserRole;
        try {
          if (role !== "ADMIN") {
            await api.get(resolveMeEndpoint(role));
          }
        } catch (meError: unknown) {
          const meStatus = getErrorStatus(meError);
          const isPerformer =
            role === "ACTOR" ||
            role === "CREATOR" ||
            role === "LOCATION_OWNER" ||
            role === "LOCATION";

          // Для performer-ролей отсутствие профиля на /api/profile/me
          // не должно блокировать вход: страница аккаунта даст создать профиль.
          if (!(isPerformer && (meStatus === 400 || meStatus === 403 || meStatus === 404))) {
            throw meError;
          }
        }

        // 4) роль-зависимый редирект
        navigate(resolveRedirectPath(role), { replace: true });
        return;
      }

      if (mode === "RESEND") {
        const normalizedEmail = sanitizeEmail(email);
        if (!normalizedEmail) {
          setError("Введите корректный email");
          return;
        }
        const res = await resendVerification({ email: normalizedEmail });
        localStorage.setItem("pendingVerificationEmail", normalizedEmail);
        setInfo(res.message || "Код отправлен.");
        navigate("/auth/check-email", {
          state: { email: normalizedEmail },
        });
        return;
      }

      if (mode === "FORGOT") {
        const normalizedEmail = sanitizeEmail(email);
        if (!normalizedEmail) {
          setError("Введите корректный email");
          return;
        }
        const res = await forgotPassword({ email: normalizedEmail });
        setInfo(res.message || "Письмо для сброса отправлено");
        return;
      }
    } catch (e: unknown) {
      console.error(e);
      const msg = getApiErrorMessage(e, getErrorMessage(e));

      if (msg.toLowerCase().includes("not verified")) {
        setError("Email не подтвержден. Нажми “Отправить письмо повторно”.");
        setMode("RESEND");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-card">
        <div className="auth-card-left">
          <header className="auth-card-header">
            <div className="auth-brand">Onset</div>
            <button
              type="button"
              className="auth-link-button"
              onClick={() => navigate("/")}
            >
              На главную
            </button>
          </header>

          <h1 className="auth-title">
            {mode === "LOGIN"
              ? "Вход в аккаунт"
              : mode === "RESEND"
              ? "Подтверждение email"
              : "Сброс пароля"}
          </h1>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-field-label">email</label>
              <input
                className="auth-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            {mode === "LOGIN" && (
              <div className="auth-field">
                <label className="auth-field-label">пароль</label>
                <input
                  className="auth-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ваш пароль"
                  required
                />
              </div>
            )}

            {info && (
              <div style={{ marginTop: 4, fontSize: 13, color: "#067647" }}>
                {info}
              </div>
            )}
            {error && <div className="auth-error">{error}</div>}

            <div className="auth-actions">
              {mode === "LOGIN" ? (
                <>
                  <button
                    type="button"
                    className="auth-secondary-button"
                    onClick={() => navigate("/auth/register")}
                  >
                    Регистрация
                  </button>

                  <button
                    type="submit"
                    className="auth-primary-button"
                    disabled={loading || !canSubmit}
                  >
                    {loading ? "Входим..." : "Войти"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="auth-secondary-button"
                    onClick={() => setMode("LOGIN")}
                  >
                    Назад ко входу
                  </button>

                  <button
                    type="submit"
                    className="auth-primary-button"
                    disabled={loading || !canSubmit}
                  >
                    {loading
                      ? "Отправляем..."
                      : mode === "RESEND"
                      ? "Отправить код"
                      : "Отправить ссылку"}
                  </button>
                </>
              )}
            </div>

            {mode === "LOGIN" && (
              <div className="auth-extra-actions">
                <button
                  type="button"
                  className="auth-secondary-button"
                  onClick={() => setMode("RESEND")}
                >
                  Не пришло письмо подтверждения
                </button>
                <button
                  type="button"
                  className="auth-secondary-button"
                  onClick={() => setMode("FORGOT")}
                >
                  Забыл пароль
                </button>
              </div>
            )}
          </form>

          <p className="auth-note">
            {mode === "LOGIN"
              ? "Введите email и пароль. Если email не подтвержден — подтвердите его."
              : mode === "RESEND"
              ? "Мы отправим письмо с подтверждением регистрации."
              : "Мы отправим письмо со ссылкой для сброса пароля."}
          </p>
        </div>

        <div className="auth-card-right">
          <div className="auth-pill">Твоя сцена здесь</div>

          <div className="auth-right-header">
            <div className="auth-right-title">
              {mode === "LOGIN"
                ? "Каждый проект начинается с выбора"
                : mode === "RESEND"
                ? "Подтвердите email"
                : "Сброс пароля"}
            </div>
            <div className="auth-right-subtitle">
              {mode === "LOGIN"
                ? "Найди людей, с которыми идея становится кадром."
                : mode === "RESEND"
                ? "Без подтверждения вход заблокирован."
                : "Ссылка придёт на вашу почту."}
            </div>
          </div>

          <ul className="auth-right-list">
            <li>Талант важнее шума — выбирай осознанно.</li>
            <li>Сильная команда рождает сильные истории.</li>
            <li>Один верный кастинг меняет весь проект.</li>
          </ul>

          <button
            type="button"
            className="auth-join-button"
            onClick={() => navigate("/auth/register")}
          >
            Создать аккаунт
          </button>
        </div>

        <img
          src="/loginpage.png"
          alt=""
          aria-hidden="true"
          className="auth-octopus-login"
        />
      </div>
      {error && <CenterToast message={error} variant="error" />}
    </div>
  );
};
