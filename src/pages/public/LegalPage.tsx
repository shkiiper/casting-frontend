import { Container } from "@/shared/ui/Container";
import { InlineNav } from "@/shared/ui/InlineNav";
import { PageOctopusDecor } from "@/shared/ui/PageOctopusDecor";
import { PublicFooter } from "@/shared/ui/PublicFooter";
import { COMPANY_EMAIL, COMPANY_NAME } from "@/shared/config/company";

export const LegalPage = () => {
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
                  Юридическая информация
                </div>
                <h1 className="mt-2 text-3xl font-bold">Политика, оферта и возврат</h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Эта страница объединяет правила обработки данных, условия оказания услуг и
                  порядок возврата по цифровым услугам платформы {COMPANY_NAME}.
                </p>
              </section>

              <LegalCard title="1. Политика конфиденциальности">
                <p>
                  Платформа {COMPANY_NAME} обрабатывает персональные данные пользователей только
                  в объёме, необходимом для регистрации, авторизации, размещения профилей,
                  объявлений, связи между пользователями и предоставления платных цифровых услуг.
                </p>
                <p>
                  Мы можем хранить имя, телефон, email, данные профиля, фото, видео, историю
                  оплаченных услуг и технические данные, необходимые для безопасности и работы
                  сервиса.
                </p>
                <p>
                  Пользователь, регистрируясь и используя сервис, соглашается на обработку своих
                  данных в целях оказания услуг платформы. По вопросам обработки данных можно
                  написать на <a className="underline" href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>.
                </p>
              </LegalCard>

              <LegalCard title="2. Публичная оферта">
                <p>
                  {COMPANY_NAME} предоставляет цифровые услуги: доступ к функционалу платформы,
                  платные тарифы для заказчиков, бустеры контактов, premium-размещение профилей и
                  платное размещение объявлений.
                </p>
                <p>
                  Описание, срок действия и стоимость услуг указываются на соответствующих экранах
                  сайта в национальной валюте Кыргызской Республики, сомах.
                </p>
                <p>
                  Оплата услуги означает согласие пользователя с её стоимостью, сроком действия и
                  объёмом предоставляемого функционала. Услуга считается оказанной с момента
                  успешной активации оплаченной опции в аккаунте пользователя.
                </p>
              </LegalCard>

              <LegalCard title="3. Правила возврата денежных средств">
                <p>
                  Возврат по цифровым услугам рассматривается индивидуально. Пользователь может
                  обратиться по адресу <a className="underline" href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>,
                  указав email аккаунта, дату оплаты, сумму и описание ситуации.
                </p>
                <p>
                  Заявка на возврат рассматривается в разумный срок после получения обращения.
                  Если услуга уже была активирована и фактически предоставлена, возврат может быть
                  ограничен или отклонён в зависимости от характера оказанной цифровой услуги.
                </p>
                <p>
                  Если платёж был списан ошибочно или услуга не была предоставлена по технической
                  причине, обращение рассматривается в приоритетном порядке.
                </p>
              </LegalCard>
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

const LegalCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
    <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700">{children}</div>
  </section>
);
