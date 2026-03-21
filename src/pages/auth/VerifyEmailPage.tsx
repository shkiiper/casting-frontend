import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { login as apiLogin, verifyEmail } from "../../api/auth";
import { useAuthStore } from "../../entities/user/model/authStore";
import { PageOctopusDecor } from "@/shared/ui/PageOctopusDecor";
import { getApiErrorMessage } from "@/shared/lib/safety";
import "./VerifyEmailPage.css";

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
  if (normalized === "ADMIN") return "/admin";
  return "/account";
};

const persistAuth = (
  token: string,
  role: string | undefined,
  loginStore: (token: string, role?: string | null) => void
) => {
  loginStore(token, role);
  localStorage.removeItem("pendingVerificationEmail");
  sessionStorage.removeItem("pendingVerificationPassword");
};

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const loginStore = useAuthStore((s) => s.login);
  const email = params.get("email");
  const code = params.get("code");
  const hasParams = Boolean(email && code);

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    hasParams ? "loading" : "error"
  );
  const [message, setMessage] = useState<string>(
    hasParams ? "" : "Откройте подтверждение по коду на странице проверки почты"
  );

  useEffect(() => {
    if (!email || !code) return;

    verifyEmail({ email, code })
      .then(async (res) => {
        const maybeAuth = res as { token?: string | null; role?: string; message?: string };
        if (maybeAuth.token) {
          persistAuth(maybeAuth.token, maybeAuth.role, loginStore);
          navigate(resolveRedirectPath(maybeAuth.role as UserRole), { replace: true });
          return;
        }

        const pendingPassword = sessionStorage.getItem("pendingVerificationPassword");
        if (email && pendingPassword) {
          const auth = await apiLogin({ email, password: pendingPassword });
          if (auth?.token) {
            persistAuth(auth.token, auth.role, loginStore);
            navigate(resolveRedirectPath(auth.role as UserRole), { replace: true });
            return;
          }
        }

        setStatus("success");
        localStorage.removeItem("pendingVerificationEmail");
        setMessage(maybeAuth.message || "Email verified");
      })
      .catch((e: unknown) => {
        console.error(e);
        setStatus("error");
        setMessage(getApiErrorMessage(e, "Ошибка подтверждения email"));
      });
  }, [email, code]);

  return (
    <div className="verify-root">
      <PageOctopusDecor />
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
                onClick={() => navigate("/auth/check-email", { state: { email: params.get("email") ?? "" } })}
              >
                Ввести код
              </button>
              <button
                className="verify-primary"
                onClick={() => navigate("/login")}
              >
                Вход
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
