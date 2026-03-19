import { useState } from "react";
import { formatPremiumDate, formatSom, type ProfilePremiumInfo } from "@/shared/lib/profilePremium";
import { PAYMENTS_LOCKED_MESSAGE } from "@/shared/lib/payments";
import { CenterToast } from "@/shared/ui/CenterToast";

type ProfilePremiumPanelProps = {
  premium: ProfilePremiumInfo;
  returnTo?: string;
  title?: string;
  onError?: (message: string) => void;
};

export const ProfilePremiumPanel = ({
  premium,
  returnTo: _returnTo,
  title: _title,
  onError: _onError,
}: ProfilePremiumPanelProps) => {
  const [notice, setNotice] = useState<string | null>(null);

  const handlePurchase = async () => {
    setNotice(PAYMENTS_LOCKED_MESSAGE);
    window.setTimeout(() => setNotice(null), 2600);
  };

  return (
    <>
      <section className="glass-object-soft rounded-2xl p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-amber-700">
              Profile Premium
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              {premium.active ? "Профиль продвигается в каталоге" : "Поднимите профиль выше в каталоге"}
            </div>
            <div className="mt-2 text-sm text-slate-600">
              {premium.active
                ? premium.expiresAt
                  ? `Активен до ${formatPremiumDate(premium.expiresAt)}`
                  : "Premium уже активен."
                : "Premium-профили показываются выше внутри своего каталога и заметнее выглядят для заказчиков."}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
              {premium.durationDays ? (
                <span className="rounded-full bg-white px-3 py-1">
                  Срок: {premium.durationDays} дн.
                </span>
              ) : null}
              {premium.price ? (
                <span className="rounded-full bg-white px-3 py-1">
                  Цена: {formatSom(premium.price)} сом
                </span>
              ) : null}
              {premium.active ? (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
                  Premium активен
                </span>
              ) : null}
            </div>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => void handlePurchase()}
              className={[
                "rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                !premium.canPurchase
                  ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  : "bg-slate-900 text-white hover:bg-slate-800",
              ].join(" ")}
            >
              {premium.active ? "Premium уже активен" : "Купить premium"}
            </button>
          </div>
        </div>
      </section>
      {notice && <CenterToast message={notice} variant="info" />}
    </>
  );
};
