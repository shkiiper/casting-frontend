import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { register as apiRegister } from "../../api/auth";
import type { RegisterRequest } from "../../types/auth";
import { PageOctopusDecor } from "@/shared/ui/PageOctopusDecor";
import { getApiErrorMessage, sanitizeEmail, sanitizePhone, trimToNull } from "@/shared/lib/safety";
import { CenterToast } from "@/shared/ui/CenterToast";
import "./RegisterPage.css";

export function RegisterPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [role, setRole] = useState<RegisterRequest["role"]>("CUSTOMER");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const canSubmit = useMemo(() => {
    return Boolean(sanitizeEmail(email) && sanitizePhone(phone) && password.trim().length >= 6);
  }, [email, phone, password]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const normalizedEmail = sanitizeEmail(email);
      const normalizedPhone = sanitizePhone(phone);
      const normalizedPassword = trimToNull(password, 200);

      if (!normalizedEmail || !normalizedPhone || !normalizedPassword || normalizedPassword.length < 6) {
        setError("Проверьте email, телефон и пароль");
        return;
      }

      await apiRegister({
        email: normalizedEmail,
        phone: normalizedPhone,
        password: normalizedPassword,
        role,
      });

      setRegisteredEmail(normalizedEmail);
      setAgreementAccepted(false);
      setAgreementOpen(true);
    } catch (error) {
      console.error(error);
      setError(getApiErrorMessage(error, "Ошибка регистрации"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      <PageOctopusDecor />
      <div className="auth-card relative z-10">
        <div className="auth-card-left">
          <header className="auth-card-header">
            <div className="auth-brand">Onset</div>
            <button
              type="button"
              className="auth-link-button"
              onClick={() => navigate("/login")}
            >
              Вход
            </button>
          </header>

          <h1 className="auth-title">Регистрация</h1>

          <form className="auth-form" onSubmit={onSubmit}>
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

            <div className="auth-field">
              <label className="auth-field-label">телефон</label>
              <input
                className="auth-input"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+996..."
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-field-label">пароль</label>
              <input
                className="auth-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-field-label">роль</label>
              <select
                className="auth-input"
                value={role}
                onChange={(e) => setRole(e.target.value as RegisterRequest["role"])}
              >
                <option value="CUSTOMER">Клиент</option>
                <option value="ACTOR">Актёр</option>
                <option value="CREATOR">Креатор</option>
                <option value="LOCATION_OWNER">Владелец локации</option>
              </select>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <div className="auth-actions">
              <button
                type="button"
                className="auth-secondary-button"
                onClick={() => navigate("/login")}
              >
                Уже есть аккаунт
              </button>

              <button
                type="submit"
                className="auth-primary-button"
                disabled={loading || !canSubmit}
              >
                {loading ? "Создаём..." : "Создать аккаунт"}
              </button>
            </div>
          </form>

          <p className="auth-note">
            После регистрации мы отправим письмо для подтверждения почты.
          </p>
        </div>

        <div className="auth-card-right">
          <div className="auth-pill">Безопасный вход</div>
          <div className="auth-right-header">
            <div className="auth-right-title">Подтверди email</div>
            <div className="auth-right-subtitle">
              Без подтверждения логин будет недоступен.
            </div>
          </div>

          <ul className="auth-right-list">
            <li>Письмо приходит сразу</li>
            <li>Ссылка действительна ограниченное время</li>
            <li>Можно отправить повторно</li>
          </ul>

          <button
            type="button"
            className="auth-join-button"
            onClick={() => navigate("/auth/check-email", { state: { email } })}
          >
            Я уже зарегистрировался
          </button>
        </div>
      </div>

      {agreementOpen && (
        <div className="auth-legal-overlay" role="dialog" aria-modal="true">
          <div className="auth-legal-modal">
            <h2 className="auth-legal-title">Подтверждение условий</h2>
            <div className="auth-legal-text">
              Продолжая регистрацию, вы подтверждаете согласие с условиями
              использования сервиса и политикой обработки персональных данных.
            </div>
            <div className="auth-legal-text">
              Вы добровольно указываете контактные данные в профиле. Платформа не
              несет ответственность за последствия передачи контактных данных
              третьим лицам после их раскрытия в рамках функционала сервиса.
            </div>

            <label className="auth-legal-check">
              <input
                type="checkbox"
                checked={agreementAccepted}
                onChange={(e) => setAgreementAccepted(e.target.checked)}
              />
              <span>Я ознакомлен(а) и принимаю условия</span>
            </label>

            <div className="auth-legal-actions">
              <button
                type="button"
                className="auth-secondary-button"
                onClick={() => setAgreementOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="auth-primary-button"
                disabled={!agreementAccepted}
                onClick={() =>
                  navigate("/auth/check-email", { state: { email: registeredEmail } })
                }
              >
                Продолжить
              </button>
            </div>
          </div>
        </div>
      )}
      {error && <CenterToast message={error} variant="error" />}
    </div>
  );
}
