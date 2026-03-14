import { FormEvent, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../../api/auth";
import { PageOctopusDecor } from "@/shared/ui/PageOctopusDecor";
import "./ResetPasswordPage.css";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const token = params.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => token && newPassword.trim().length >= 6, [token, newPassword]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setError(null);
    setLoading(true);
    try {
      const res = await resetPassword({ token, newPassword });
      setMsg(res.message || "Пароль обновлён");
      setTimeout(() => navigate("/login"), 800);
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.message || "Ошибка сброса пароля");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-root">
      <PageOctopusDecor />
      <div className="reset-card relative z-10">
        <h1 className="reset-title">Новый пароль</h1>
        {!token ? (
          <div className="reset-error">В ссылке нет token</div>
        ) : (
          <form className="reset-form" onSubmit={onSubmit}>
            <label className="reset-label">
              Новый пароль
              <input
                className="reset-input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Минимум 6 символов"
              />
            </label>

            {msg && <div className="reset-ok">{msg}</div>}
            {error && <div className="reset-error">{error}</div>}

            <div className="reset-actions">
              <button
                type="button"
                className="reset-secondary"
                onClick={() => navigate("/login")}
              >
                Назад
              </button>
              <button
                type="submit"
                className="reset-primary"
                disabled={loading || !canSubmit}
              >
                {loading ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
