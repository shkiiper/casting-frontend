import { Link } from "react-router-dom";
import { COMPANY_EMAIL, COMPANY_NAME } from "@/shared/config/company";

const legalLinks = [
  { label: "Политика, оферта и возврат", to: "/legal" },
  { label: "Оплата банковской картой", to: "/payment-info" },
  { label: "Контакты", to: "/contacts" },
];

const productLinks = [
  { label: "Актёры", to: "/actors" },
  { label: "Креаторы", to: "/creators" },
  { label: "Локации", to: "/locations" },
  { label: "Объявления", to: "/ads" },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-black/10 bg-white/88 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8">
        <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div>
            <div className="text-lg font-semibold text-slate-900">{COMPANY_NAME}</div>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
              Платформа для размещения объявлений, поиска актёров, креаторов и локаций,
              покупки подписки заказчика, бустеров контактов и premium-размещения профилей.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <img src="/payments-visa.svg" alt="Visa" className="h-10 w-auto" />
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Документы
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {legalLinks.map((item) => (
                <Link key={item.to} to={item.to} className="text-sm text-slate-700 hover:text-slate-900">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Разделы
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {productLinks.map((item) => (
                <Link key={item.to} to={item.to} className="text-sm text-slate-700 hover:text-slate-900">
                  {item.label}
                </Link>
              ))}
              <a href={`mailto:${COMPANY_EMAIL}`} className="pt-2 text-sm font-medium text-slate-900 hover:text-slate-700">
                {COMPANY_EMAIL}
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-black/5 pt-4 text-xs text-slate-500">
          Все ссылки на документы и способы связи доступны без авторизации.
        </div>
      </div>
    </footer>
  );
}
