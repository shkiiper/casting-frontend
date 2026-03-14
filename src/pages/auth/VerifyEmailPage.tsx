import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifyEmail } from "../../api/auth";
import { PageOctopusDecor } from "@/shared/ui/PageOctopusDecor";
import "./VerifyEmailPage.css";

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
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
      .then((res) => {
        setStatus("success");
        setMessage(("message" in res && res.message) || "Email verified");
      })
      .catch((e: unknown) => {
        console.error(e);
        setStatus("error");
        setMessage(
          (e as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || "Ошибка подтверждения email"
        );
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
