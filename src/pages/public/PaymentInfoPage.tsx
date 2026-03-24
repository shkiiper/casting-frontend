import { Container } from "@/shared/ui/Container";
import { InlineNav } from "@/shared/ui/InlineNav";
import { PageOctopusDecor } from "@/shared/ui/PageOctopusDecor";
import { PublicFooter } from "@/shared/ui/PublicFooter";

export const PaymentInfoPage = () => {
  return (
    <div className="relative min-h-screen bg-[#f3f4f7] text-slate-900">
      <PageOctopusDecor />
      <div className="relative z-10 pt-10">
        <Container>
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[30px] border border-black/5 bg-white/88 shadow-[0_16px_56px_rgba(15,23,42,0.10)] sm:rounded-[36px]">
            <InlineNav />
            <main className="space-y-8 px-4 py-6 sm:px-6 md:px-8 md:py-8">
              <section>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Платёжная информация
                </div>
                <h1 className="mt-2 text-3xl font-bold">Оплата банковской картой</h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Оплата услуг на сайте производится банковской картой через защищённый платёжный
                  интерфейс. После успешной оплаты пользователь получает доступ к выбранной
                  цифровой услуге внутри своего аккаунта.
                </p>
              </section>

              <InfoCard title="Как проходит оплата">
                <ul className="list-disc pl-5">
                  <li>пользователь выбирает нужную услугу или тариф на сайте;</li>
                  <li>система переводит его на защищённую страницу оплаты;</li>
                  <li>после подтверждения платежа статус оплаты обновляется автоматически;</li>
                  <li>оплаченная функция активируется в аккаунте пользователя.</li>
                </ul>
              </InfoCard>

              <InfoCard title="Какие услуги оплачиваются">
                <ul className="list-disc pl-5">
                  <li>подписка заказчика с доступом к платному функционалу платформы;</li>
                  <li>бустеры контактов;</li>
                  <li>premium-размещение профилей;</li>
                  <li>платное размещение объявлений.</li>
                </ul>
                <p className="mt-3">
                  Стоимость каждой услуги отображается на соответствующем экране сайта и
                  указывается в сомах.
                </p>
              </InfoCard>

              <InfoCard title="Платёжные системы">
                <div className="flex flex-wrap gap-3">
                  <img src="/payments-visa.svg" alt="Visa" className="h-11 w-auto" />
                  <img src="/payments-mastercard.svg" alt="Mastercard" className="h-11 w-auto" />
                  <img src="/payments-elcart.svg" alt="Элкарт" className="h-11 w-auto" />
                </div>
              </InfoCard>
            </main>
          </div>
        </Container>
      </div>
      <div className="relative z-10 mt-10">
        <PublicFooter />
      </div>
    </div>
  );
};

const InfoCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
    <div className="mt-3 text-sm leading-6 text-slate-700">{children}</div>
  </section>
);
