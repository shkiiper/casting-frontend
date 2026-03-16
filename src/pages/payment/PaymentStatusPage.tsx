import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import api from "@/api/client";
import {
  getPaymentStatus,
  isFinalPaymentStatus,
} from "@/api/payments";
import { Container } from "@/shared/ui/Container";
import { InlineNav } from "@/shared/ui/InlineNav";
import { PageOctopusDecor } from "@/shared/ui/PageOctopusDecor";
import { CenterToast } from "@/shared/ui/CenterToast";
import { sanitizeHttpUrl, sanitizeInternalPath } from "@/shared/lib/safety";

const POLL_INTERVAL_MS = 2500;

export const PaymentStatusPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const externalId = searchParams.get("externalId") || "";
  const paymentUrl = sanitizeHttpUrl(searchParams.get("paymentUrl")) || "";
  const returnTo = sanitizeInternalPath(searchParams.get("returnTo"), "/account");
  const title = searchParams.get("title") || "Ожидание оплаты";

  const [status, setStatus] = useState<string>("PENDING");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const doneRef = useRef(false);
  const role = (localStorage.getItem("role") || "").toUpperCase();
  const isAuthed = Boolean(localStorage.getItem("accessToken"));

  const computedMockUrl = useMemo(() => {
    const base = String(api.defaults.baseURL || "").replace(/\/$/, "");
    const candidate = externalId ? `${base}/mock-pay/${encodeURIComponent(externalId)}` : "";
    return sanitizeHttpUrl(candidate) || "";
  }, [externalId]);

  const checkStatus = async () => {
    if (!externalId || doneRef.current) return;
    try {
      setLoading(true);
      setError(null);
      const response = await getPaymentStatus(externalId);
      const nextStatus = (response.status || "PENDING").toUpperCase();
      setStatus(nextStatus);

      if (nextStatus === "SUCCESS") {
        doneRef.current = true;
        setToast("Оплата подтверждена");
        window.setTimeout(() => {
          navigate(returnTo, { replace: true });
        }, 900);
      } else if (nextStatus === "FAILED") {
        doneRef.current = true;
      }
    } catch {
      setError("Не удалось проверить статус платежа");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!externalId) return;
    void checkStatus();
    const id = window.setInterval(() => {
      if (!doneRef.current) {
        void checkStatus();
      }
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [externalId]);

  if (!isAuthed) {
    return <Navigate to="/login" replace />;
  }

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("role");
    localStorage.removeItem("token");
    sessionStorage.clear();
    navigate("/login", { replace: true });
  };

  const statusLabel =
    status === "SUCCESS"
      ? "Успешно"
      : status === "FAILED"
      ? "Неуспешно"
      : "Ожидание";

  const isFinal = isFinalPaymentStatus(status);
  const isMockMode =
    paymentUrl.includes("/mock-pay/") ||
    (window.location.hostname === "localhost" && Boolean(externalId));

  return (
    <div className="relative min-h-screen bg-[#f3f4f7] text-slate-900">
      <PageOctopusDecor />
      <div className="relative z-10 pt-8 pb-16">
        <Container>
          <div className="glass-object mx-auto max-w-4xl overflow-visible rounded-[28px] sm:rounded-[36px]">
            <InlineNav
              active={role === "ADMIN" ? "admin" : undefined}
              profileMenu={[{ label: "Выйти", onClick: logout, danger: true }]}
            />

            <section className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Платеж
              </div>
              <h1 className="mt-1 text-2xl font-bold">{title}</h1>
              <p className="mt-2 text-slate-600">
                Статус: <span className="font-semibold">{statusLabel}</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">externalId: {externalId || "—"}</p>

              {error && (
                <div className="mt-4 rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              {status === "FAILED" && (
                <div className="mt-4 rounded-xl bg-amber-50 text-amber-800 px-4 py-3 text-sm">
                  Оплата не прошла. Попробуйте снова.
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-2">
                {paymentUrl && !isFinal && (
                  <a
                    href={paymentUrl}
                    className="rounded-xl px-4 py-2.5 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800"
                  >
                    Открыть страницу оплаты
                  </a>
                )}
                {isMockMode && !isFinal && (
                  <a
                    href={computedMockUrl}
                    className="rounded-xl px-4 py-2.5 text-sm font-semibold border border-black/15 bg-white hover:bg-slate-100"
                  >
                    Открыть mock-pay
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => void checkStatus()}
                  disabled={loading || !externalId || isFinal}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold border border-black/15 bg-white hover:bg-slate-100 disabled:opacity-60"
                >
                  {loading ? "Проверяем..." : "Проверить статус"}
                </button>
                <Link
                  to={returnTo}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold border border-black/15 bg-white hover:bg-slate-100"
                >
                  Вернуться
                </Link>
              </div>
            </section>
          </div>
        </Container>
      </div>
      {toast && <CenterToast message={toast} />}
    </div>
  );
};
