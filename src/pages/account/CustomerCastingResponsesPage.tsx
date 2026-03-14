import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/api/client";
import { Container } from "@/shared/ui/Container";
import { InlineNav } from "@/shared/ui/InlineNav";
import { PageOctopusDecor } from "@/shared/ui/PageOctopusDecor";
import type { PageResponse } from "@/types/common";
import {
  getCastingApplications,
  type CastingApplication,
} from "@/shared/lib/castingApplications";

type CastingResponse = {
  id: number;
};

const formatDateTime = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const CustomerCastingResponsesPage = () => {
  const [castings, setCastings] = useState<CastingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<PageResponse<CastingResponse>>(
          "/api/castings/my",
          { params: { page: 0, size: 100 } }
        );
        setCastings(res.data.content ?? []);
      } catch {
        setError("Не удалось загрузить отклики");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const applications = useMemo(() => {
    const castingIds = new Set(castings.map((item) => item.id));
    return getCastingApplications().filter(
      (item) => castingIds.has(item.castingId) && item.applicantProfileId
    );
  }, [castings]);

  return (
    <div className="relative min-h-screen bg-[#f6f6f4] text-slate-900">
      <PageOctopusDecor />
      <div className="relative z-10">
        <Container>
        <div className="mx-auto max-w-7xl mt-10 bg-white rounded-[36px] shadow border border-black/5 overflow-visible">
          <InlineNav />

          <header className="px-8 py-7 border-b flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs text-slate-500">Кабинет заказчика</div>
              <h1 className="text-2xl font-bold">Отклики на кастинг</h1>
              <div className="text-sm text-slate-500 mt-1">
                Только профили, которые откликнулись на ваши объявления
              </div>
            </div>

            <Link to="/account" className="px-4 py-2 rounded-xl border text-sm">
              Назад в кабинет
            </Link>
          </header>

          <section className="px-8 py-8">
            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-sm text-slate-500">Загрузка...</div>
            ) : applications.length === 0 ? (
              <div className="text-sm text-slate-500">
                Пока нет откликов с профилями.
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((item) => (
                  <ApplicationItem key={item.id} item={item} />
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

const ApplicationItem = ({ item }: { item: CastingApplication }) => (
  <div className="border rounded-2xl p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Link
          to={`/profiles/${item.applicantProfileId}`}
          state={{ from: "casting-responses" }}
          className="font-medium hover:underline"
        >
          {item.applicantName}
        </Link>
        <div className="text-xs text-slate-500 mt-1">
          {item.applicantRole || "Без роли"}
          {item.applicantCity ? ` • ${item.applicantCity}` : ""}
        </div>
      </div>
      <div className="text-xs text-slate-500">
        {formatDateTime(item.createdAt)}
      </div>
    </div>
    <div className="text-sm text-slate-700 mt-3">
      Отклик на: <span className="font-medium">{item.castingTitle}</span>
    </div>
    <div className="text-sm text-slate-700 mt-1 break-all">
      Контакт: {item.applicantContact}
    </div>
    <div className="mt-3">
      <Link
        to={`/profiles/${item.applicantProfileId}`}
        state={{ from: "casting-responses" }}
        className="inline-flex rounded-xl px-3 py-2 bg-slate-900 text-white text-sm hover:bg-slate-800"
      >
        Открыть профиль
      </Link>
    </div>
  </div>
);
