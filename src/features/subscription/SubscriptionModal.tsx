import { useEffect, useMemo, useState } from "react";
import {
  getCustomerPlans,
  initCustomerBoosterPayment,
  initCustomerSubscriptionPayment,
} from "../../api/subscriptions";
import type { CustomerPlanResponse } from "../../types/subscription";
import type { PaymentInitResponse } from "../../types/payment";
import "./SubscriptionModal.css";

type Mode = "SUBSCRIPTION" | "BOOSTERS";

interface Props {
  open: boolean;
  mode: Mode;
  onClose: () => void;
  onBeforeRedirectToPay?: (resp: PaymentInitResponse) => void;
  onPaymentCreated?: (resp: PaymentInitResponse) => void;
  onSuccess?: () => void;
}

export function SubscriptionModal({
  open,
  mode,
  onClose,
  onBeforeRedirectToPay,
  onPaymentCreated,
  onSuccess,
}: Props) {
  const [plans, setPlans] = useState<CustomerPlanResponse[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [boosterCount, setBoosterCount] = useState<number>(1);

  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingPay, setLoadingPay] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId]
  );

  useEffect(() => {
    if (!open) return;

    setError(null);
    setLoadingPlans(true);

    getCustomerPlans()
      .then((list) => {
        setPlans(list);
        const active = list.find((p) => p.active);
        setSelectedPlanId(active?.id ?? (list[0]?.id ?? null));
      })
      .catch((e) => {
        console.error(e);
        setError("Не удалось загрузить планы");
      })
      .finally(() => setLoadingPlans(false));
  }, [open]);

  if (!open) return null;

  const pay = async () => {
    if (!selectedPlanId) {
      setError("Выберите план");
      return;
    }

    setError(null);
    setLoadingPay(true);

    try {
      let resp: PaymentInitResponse;

      if (mode === "SUBSCRIPTION") {
        resp = await initCustomerSubscriptionPayment({ planId: selectedPlanId });
      } else {
        resp = await initCustomerBoosterPayment({
          planId: selectedPlanId,
          boosterCount: boosterCount < 1 ? 1 : boosterCount,
        });
      }

      onBeforeRedirectToPay?.(resp);
      onSuccess?.();
      if (onPaymentCreated) {
        onPaymentCreated(resp);
      } else {
        window.location.href = resp.paymentUrl;
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.message || "Ошибка инициализации платежа");
    } finally {
      setLoadingPay(false);
    }
  };

  return (
    <div className="submodal-overlay" onMouseDown={onClose}>
      <div
        className="submodal"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="submodal-header">
          <div className="submodal-title">
            {mode === "SUBSCRIPTION" ? "Оформить подписку" : "Купить бустеры"}
          </div>
          <button className="submodal-close" onClick={onClose} aria-label="close">
            ×
          </button>
        </div>

        {loadingPlans ? (
          <div className="submodal-loading">Загрузка планов...</div>
        ) : (
          <>
            <div className="submodal-body">
              <label className="submodal-label">
                План
                <select
                  className="submodal-select"
                  value={selectedPlanId ?? ""}
                  onChange={(e) => setSelectedPlanId(Number(e.target.value))}
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.active ? " • активный" : ""}
                    </option>
                  ))}
                </select>
              </label>

              {selectedPlan && (
                <div className="submodal-plan-grid">
                  <div className="submodal-kv">
                    <span>Контактов</span>
                    <strong>{selectedPlan.baseContactLimit}</strong>
                  </div>
                  <div className="submodal-kv">
                    <span>Период</span>
                    <strong>{selectedPlan.periodDays} дн.</strong>
                  </div>
                  <div className="submodal-kv">
                    <span>Цена</span>
                    <strong>{selectedPlan.pricePerPeriod ?? "—"}</strong>
                  </div>
                </div>
              )}

              {mode === "BOOSTERS" && (
                <label className="submodal-label">
                  Количество бустеров
                  <input
                    className="submodal-input"
                    type="number"
                    min={1}
                    max={100}
                    value={boosterCount}
                    onChange={(e) => setBoosterCount(Number(e.target.value))}
                  />
                </label>
              )}

              {error && <div className="submodal-error">{error}</div>}
            </div>

            <div className="submodal-footer">
              <button
                className="submodal-secondary"
                onClick={onClose}
                disabled={loadingPay}
              >
                Отмена
              </button>
              <button
                className="submodal-primary"
                onClick={pay}
                disabled={loadingPay || loadingPlans || !selectedPlanId}
              >
                {loadingPay ? "Переходим к оплате..." : "Оплатить"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
