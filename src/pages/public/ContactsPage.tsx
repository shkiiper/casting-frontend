import { Container } from "@/shared/ui/Container";
import { InlineNav } from "@/shared/ui/InlineNav";
import { PageOctopusDecor } from "@/shared/ui/PageOctopusDecor";
import { PublicFooter } from "@/shared/ui/PublicFooter";
import { COMPANY_EMAIL, COMPANY_NAME } from "@/shared/config/company";

export const ContactsPage = () => {
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
                  Контакты сервиса
                </div>
                <h1 className="mt-2 text-3xl font-bold">Контакты</h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  По вопросам работы платформы, оплаты и возвратов можно связаться с сервисом по
                  электронной почте.
                </p>
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      Название сервиса
                    </div>
                    <div className="mt-2 text-lg font-semibold text-slate-900">{COMPANY_NAME}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      Электронная почта
                    </div>
                    <a
                      href={`mailto:${COMPANY_EMAIL}`}
                      className="mt-2 block text-lg font-semibold text-slate-900 underline"
                    >
                      {COMPANY_EMAIL}
                    </a>
                  </div>
                </div>
              </section>
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
