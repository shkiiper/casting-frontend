import { useEffect, useMemo, useState } from "react";
import { getCustomerPlans } from "../../api/subscriptions";
import type { CustomerPlanResponse } from "../../types/subscription";
import { clamp, getApiErrorMessage, toOptionalNumber } from "@/shared/lib/safety";
import { PAYMENTS_LOCKED_MESSAGE } from "@/shared/lib/payments";
import { CenterToast } from "@/shared/ui/CenterToast";
import "./SubscriptionModal.css";

type Mode = "SUBSCRIPTION" | "BOOSTERS";

interface Props {
  open: boolean;
  mode: Mode;
  onClose: () => void;
  onBeforeRedirectToPay?: unknown;
  onPaymentCreated?: unknown;
  onSuccess?: () => void;
}

export function SubscriptionModal({
  open,
  mode,
  onClose,
  onBeforeRedirectToPay: _onBeforeRedirectToPay,
  onPaymentCreated: _onPaymentCreated,
  onSuccess,
}: Props) {
  const [plans, setPlans] = useState<CustomerPlanResponse[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [boosterCount, setBoosterCount] = useState<number>(1);

  const [loadingPlans, setLoadingPlans] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
        const normalizedPlans = Array.isArray(list) ? list.filter((item) => item?.id) : [];
        setPlans(normalizedPlans);
        const active = normalizedPlans.find((p) => p.active);
        setSelectedPlanId(active?.id ?? (normalizedPlans[0]?.id ?? null));
      })
      .catch((error) => {
        console.error(error);
        setError(getApiErrorMessage(error, "Не удалось загрузить планы"));
      })
      .finally(() => setLoadingPlans(false));
  }, [open]);

  if (!open) return null;

  const pay = async () => {
    if (!selectedPlanId || !selectedPlan) {
      setError("Выберите план");
      return;
    }

    setNotice(PAYMENTS_LOCKED_MESSAGE);
    window.setTimeout(() => setNotice(null), 2600);
    setError(null);
    onSuccess?.();
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
                  onChange={(e) =>
                    setSelectedPlanId(
                      toOptionalNumber(e.target.value, { min: 1, integer: true })
                    )
                  }
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
                    onChange={(e) =>
                      setBoosterCount(
                        clamp(
                          toOptionalNumber(e.target.value, {
                            min: 1,
                            max: 100,
                            integer: true,
                          }) ?? 1,
                          1,
                          100
                        )
                      )
                    }
                  />
                </label>
              )}

              {error && <div className="submodal-error">{error}</div>}
            </div>

            <div className="submodal-footer">
              <button
                className="submodal-secondary"
                onClick={onClose}
              >
                Отмена
              </button>
              <button
                className="submodal-primary"
                onClick={pay}
                disabled={loadingPlans || !selectedPlanId}
              >
                Оплатить
              </button>
            </div>
          </>
        )}
      </div>
      {notice && <CenterToast message={notice} variant="info" />}
    </div>
  );
}
