import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Container } from "@/shared/ui/Container";
import { InlineNav } from "@/shared/ui/InlineNav";
import { PageOctopusDecor } from "@/shared/ui/PageOctopusDecor";
import {
  getCastingApplications,
  type CastingApplication,
} from "@/shared/lib/castingApplications";

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const CastingApplicationsPage = () => {
  const role = localStorage.getItem("role");
  const list = useMemo(() => getCastingApplications(), []);
  const uniqueCastings = useMemo(
    () => new Set(list.map((item) => item.castingId)).size,
    [list]
  );

  return (
    <div className="relative min-h-screen bg-[#f6f6f4] text-slate-900">
      <PageOctopusDecor />
      <div className="relative z-10">
        <Container>
        <div className="mx-auto max-w-7xl mt-10 rounded-[36px] bg-white shadow border border-black/5 overflow-visible">
          <InlineNav />

          <header className="px-8 py-7 border-b flex flex-wrap justify-between items-center gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Заявки
              </div>
              <h1 className="text-3xl font-bold mt-1">Отклики на объявления</h1>
              <div className="text-sm text-slate-500 mt-1">
                Здесь собраны кандидаты, которые оставили заявку.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/ads"
                className="px-4 py-2 rounded-xl border text-sm hover:bg-slate-50"
              >
                К объявлениям
              </Link>
              <Link
                to="/account"
                className="px-4 py-2 rounded-xl border text-sm hover:bg-slate-50"
              >
                В профиль
              </Link>
            </div>
          </header>

          <section className="px-8 py-8">
            {role !== "CREATOR" && (
              <div className="rounded-2xl bg-amber-50 text-amber-700 px-4 py-3 text-sm mb-6">
                Страница заявок доступна для аккаунта креатора.
              </div>
            )}

            <div className="grid sm:grid-cols-3 gap-3 mb-6">
              <StatCard label="Всего заявок" value={String(list.length)} />
              <StatCard label="Объявлений" value={String(uniqueCastings)} />
              <StatCard
                label="За сегодня"
                value={String(
                  list.filter((item) => {
                    const now = new Date();
                    const date = new Date(item.createdAt);
                    return (
                      now.getFullYear() === date.getFullYear() &&
                      now.getMonth() === date.getMonth() &&
                      now.getDate() === date.getDate()
                    );
                  }).length
                )}
              />
            </div>

            {list.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-600">
                Пока нет заявок.
              </div>
            ) : (
              <div className="space-y-4">
                {list.map((item) => (
                  <ApplicationCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>
        </div>
        </Container>
      </div>
    </div>
  );
};

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-black/5 p-4">
    <div className="text-xs text-slate-500">{label}</div>
    <div className="text-2xl font-bold mt-1">{value}</div>
  </div>
);

const ApplicationCard = ({ item }: { item: CastingApplication }) => (
  <article className="rounded-2xl border border-black/5 p-5">
    <div className="flex flex-wrap justify-between gap-3">
      <div>
        <div className="text-lg font-semibold">{item.applicantName}</div>
        <div className="text-xs text-slate-500 mt-1">
          {item.applicantRole || "Без роли"} • {formatDateTime(item.createdAt)}
        </div>
      </div>

      <div className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 h-fit">
        Отклик на #{item.castingId}
      </div>
    </div>

    <div className="mt-4 grid md:grid-cols-2 gap-3 text-sm">
      <div>
        <div className="text-xs text-slate-500">Объявление</div>
        <div className="font-medium">{item.castingTitle}</div>
        <div className="text-slate-500 mt-1">
          {item.castingCity || "Без города"}
          {item.castingType ? ` • ${item.castingType}` : ""}
        </div>
      </div>

      <div>
        <div className="text-xs text-slate-500">Контакт кандидата</div>
        <div className="font-medium break-all">{item.applicantContact}</div>
      </div>
    </div>

    <div className="mt-4 text-sm text-slate-600">
      {item.applicantCity ? `Город кандидата: ${item.applicantCity}` : ""}
    </div>
  </article>
);
