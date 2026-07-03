import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2, Mail, ShieldCheck } from "lucide-react";
import { register as apiRegister } from "../../api/auth";
import type { RegisterRequest } from "../../types/auth";
import { getApiErrorMessage, sanitizeEmail, sanitizePhone, trimToNull } from "@/shared/lib/safety";
import { CenterToast } from "@/shared/ui/CenterToast";
import { AuthSplineVisual } from "./AuthSplineVisual";
import "./RegisterPage.css";

const REGISTRATION_DRAFT_KEY = "pendingRegistrationDraft";

type RegistrationDraft = {
  email: string;
  phone: string;
  password: string;
  role: RegisterRequest["role"];
};

type RegisterStep = "role" | "email" | "phone" | "password" | "terms";

const STEPS: Array<{
  id: RegisterStep;
  eyebrow: string;
  title: string;
  subtitle: string;
}> = [
  {
    id: "role",
    eyebrow: "1 из 5",
    title: "Кто вы на Onset?",
    subtitle: "От роли зависит анкета после подтверждения почты.",
  },
  {
    id: "email",
    eyebrow: "2 из 5",
    title: "На какую почту отправить код?",
    subtitle: "Email нужен для входа и восстановления доступа.",
  },
  {
    id: "phone",
    eyebrow: "3 из 5",
    title: "Укажите телефон",
    subtitle: "Мы подставим его в контакты анкеты, потом можно изменить.",
  },
  {
    id: "password",
    eyebrow: "4 из 5",
    title: "Придумайте пароль",
    subtitle: "Минимум 6 символов, лучше без очевидных комбинаций.",
  },
  {
    id: "terms",
    eyebrow: "5 из 5",
    title: "Последний шаг перед кодом",
    subtitle: "После создания аккаунта откроется страница подтверждения email.",
  },
];

const ROLE_OPTIONS: Array<{
  value: RegisterRequest["role"];
  label: string;
  hint: string;
}> = [
  { value: "ACTOR", label: "Актер", hint: "Анкета, параметры, опыт, фото" },
  { value: "CUSTOMER", label: "Заказчик", hint: "Кабинет для кастингов и контактов" },
  { value: "CREATOR", label: "Креатор", hint: "Режиссура, фото, продакшен, SMM" },
  { value: "LOCATION_OWNER", label: "Локация", hint: "Пространства для съемок и аренды" },
];

const USER_ROLES = new Set<RegisterRequest["role"]>([
  "ACTOR",
  "CUSTOMER",
  "CREATOR",
  "LOCATION_OWNER",
]);

const getInitialRegisterParams = () => {
  if (typeof window === "undefined") {
    return { email: "", role: null as RegisterRequest["role"] | null, addRole: false };
  }

  const params = new URLSearchParams(window.location.search);
  const rawRole = params.get("role")?.toUpperCase() as RegisterRequest["role"] | undefined;
  const role = rawRole && USER_ROLES.has(rawRole) ? rawRole : null;

  return {
    email: params.get("email") ?? "",
    role,
    addRole: params.get("addRole") === "1",
  };
};

const parseDraft = (): Partial<RegistrationDraft> => {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(sessionStorage.getItem(REGISTRATION_DRAFT_KEY) ?? "{}") as Partial<RegistrationDraft>;
  } catch {
    return {};
  }
};

const getPreviewStep = () => {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("previewStep");
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), STEPS.length - 1) : null;
};

export function RegisterPage() {
  const navigate = useNavigate();
  const parsedDraft = useMemo(() => parseDraft(), []);
  const initialParams = useMemo(() => getInitialRegisterParams(), []);
  const previewStep = useMemo(() => getPreviewStep(), []);
  const isPreview = previewStep !== null;
  const startsFromAddRole = initialParams.addRole && initialParams.role !== null;
  const initialStep = previewStep ?? (startsFromAddRole && initialParams.email ? 2 : startsFromAddRole ? 1 : 0);

  const [stepIndex, setStepIndex] = useState(initialStep);
  const [email, setEmail] = useState(initialParams.email || parsedDraft.email || (isPreview ? "actor@example.com" : ""));
  const [phone, setPhone] = useState(startsFromAddRole ? "" : parsedDraft.phone ?? (isPreview ? "+996 700 123 456" : ""));
  const [password, setPassword] = useState(startsFromAddRole ? "" : parsedDraft.password ?? (isPreview ? "123456" : ""));
  const [role, setRole] = useState<RegisterRequest["role"]>(initialParams.role ?? parsedDraft.role ?? "ACTOR");
  const [agreementAccepted, setAgreementAccepted] = useState(isPreview);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStep = STEPS[stepIndex];
  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  useEffect(() => {
    if (isPreview) return;
    sessionStorage.setItem(
      REGISTRATION_DRAFT_KEY,
      JSON.stringify({
        email,
        phone,
        password,
        role,
      })
    );
  }, [email, isPreview, password, phone, role]);

  const canContinue = useMemo(() => {
    switch (currentStep.id) {
      case "role":
        return Boolean(role);
      case "email":
        return Boolean(sanitizeEmail(email));
      case "phone":
        return Boolean(sanitizePhone(phone));
      case "password":
        return password.trim().length >= 6;
      case "terms":
        return agreementAccepted;
      default:
        return false;
    }
  }, [agreementAccepted, currentStep.id, email, password, phone, role]);

  const submitRegistration = async () => {
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

      localStorage.setItem("pendingVerificationEmail", normalizedEmail);
      localStorage.setItem("pendingVerificationRole", role);
      sessionStorage.setItem("pendingVerificationPassword", normalizedPassword);
      sessionStorage.setItem(
        REGISTRATION_DRAFT_KEY,
        JSON.stringify({
          email: normalizedEmail,
          phone: normalizedPhone,
          password: normalizedPassword,
          role,
        })
      );
      navigate("/auth/check-email", {
        replace: true,
        state: { email: normalizedEmail, role },
      });
    } catch (registerError) {
      setError(getApiErrorMessage(registerError, "Ошибка регистрации"));
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!canContinue) {
      setError("Заполните этот шаг, чтобы продолжить");
      return;
    }

    if (stepIndex < STEPS.length - 1) {
      setStepIndex((current) => current + 1);
      return;
    }

    void submitRegistration();
  };

  const renderStep = () => {
    switch (currentStep.id) {
      case "role":
        return (
          <div className="register-role-grid">
            {ROLE_OPTIONS.map((option) => {
              const selected = role === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={selected ? "is-selected" : ""}
                  onClick={() => setRole(option.value)}
                >
                  <span>{option.label}</span>
                  <small>{option.hint}</small>
                  {selected ? <Check size={18} /> : null}
                </button>
              );
            })}
          </div>
        );
      case "email":
        return (
          <input
            className="auth-input register-large-input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoFocus
          />
        );
      case "phone":
        return (
          <input
            className="auth-input register-large-input"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+996..."
            autoFocus
          />
        );
      case "password":
        return (
          <input
            className="auth-input register-large-input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Минимум 6 символов"
            autoFocus
          />
        );
      case "terms":
        return (
          <div className="register-terms-box">
            <div className="register-summary">
              <div>
                <span>Роль</span>
                <strong>{ROLE_OPTIONS.find((option) => option.value === role)?.label}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{sanitizeEmail(email) ?? email}</strong>
              </div>
              <div>
                <span>Телефон</span>
                <strong>{sanitizePhone(phone) ?? phone}</strong>
              </div>
            </div>

            <label className="auth-legal-check register-terms-check">
              <input
                type="checkbox"
                checked={agreementAccepted}
                onChange={(event) => setAgreementAccepted(event.target.checked)}
              />
              <span>
                Я ознакомлен(а) и принимаю условия сервиса и обработку персональных данных.
              </span>
            </label>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="auth-root register-root">
      <AuthSplineVisual />
      <div className="auth-card register-card relative z-10">
        <div className="auth-card-left register-card-left">
          <header className="auth-card-header">
            <div className="auth-brand">Onset</div>
            <button type="button" className="auth-link-button" onClick={() => navigate("/login")}>
              Вход
            </button>
          </header>

          <div className="register-progress-row">
            <span>{currentStep.eyebrow}</span>
            <span>{progress}%</span>
          </div>
          <div className="register-progress" aria-hidden="true">
            <div style={{ width: `${progress}%` }} />
          </div>

          <form className="auth-form register-step-form" onSubmit={onSubmit}>
            <div className="register-question">
              <h1 className="auth-title register-title">{currentStep.title}</h1>
              <p>{currentStep.subtitle}</p>
            </div>

            <div className="register-answer">{renderStep()}</div>

            {error ? <div className="auth-error">{error}</div> : null}

            <div className="auth-actions register-actions">
              <button
                type="button"
                className="auth-secondary-button"
                disabled={stepIndex === 0 || loading}
                onClick={() => {
                  setError(null);
                  setStepIndex((current) => Math.max(0, current - 1));
                }}
              >
                <ArrowLeft size={17} />
                Назад
              </button>

              <button type="submit" className="auth-primary-button" disabled={loading || !canContinue}>
                {loading ? (
                  <Loader2 size={17} className="register-spin" />
                ) : stepIndex === STEPS.length - 1 ? (
                  <Mail size={17} />
                ) : (
                  <ArrowRight size={17} />
                )}
                {stepIndex === STEPS.length - 1 ? "Получить код" : "Дальше"}
              </button>
            </div>
          </form>
        </div>

        <div className="auth-card-right register-card-right">
          <div className="auth-pill">Быстрый старт</div>
          <div className="auth-right-header">
            <div className="auth-right-title">Без длинной анкеты на первом экране</div>
            <div className="auth-right-subtitle">
              Сначала создаем аккаунт и подтверждаем email. Затем анкета пойдет по одному вопросу.
            </div>
          </div>

          <ul className="auth-right-list">
            <li>Роль, контакты и пароль отдельно</li>
            <li>Код подтверждения сразу после регистрации</li>
            <li>Профиль заполняется короткими шагами</li>
          </ul>

          <div className="register-side-badge">
            <ShieldCheck size={18} />
            Почта защищает вход и восстановление доступа
          </div>
        </div>
      </div>

      {error ? <CenterToast message={error} variant="error" /> : null}
    </div>
  );
}
