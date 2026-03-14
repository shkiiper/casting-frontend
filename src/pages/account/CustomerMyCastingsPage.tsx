import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/api/client";
import { Container } from "@/shared/ui/Container";
import { InlineNav } from "@/shared/ui/InlineNav";
import { PageOctopusDecor } from "@/shared/ui/PageOctopusDecor";
import type { PageResponse } from "@/types/common";

type CastingResponse = {
  id: number;
  title: string;
  city?: string | null;
  projectType?: string | null;
  active?: boolean;
};

export const CustomerMyCastingsPage = () => {
  const [castings, setCastings] = useState<CastingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<PageResponse<CastingResponse>>(
          "/api/castings/my",
          { params: { page: 0, size: 100 } }
        );
        setCastings(res.data.content ?? []);
      } catch {
        setError("Не удалось загрузить объявления");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const deleteCasting = async (id: number) => {
    try {
      setDeletingId(id);
      setError(null);
      await api.post(`/api/castings/${id}/close`);
      setCastings((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setError("Не удалось удалить объявление");
    } finally {
      setDeletingId(null);
    }
  };

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
              <h1 className="text-2xl font-bold">Мои объявления</h1>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/ads/manage"
                className="px-4 py-2 rounded-xl border text-sm hover:bg-slate-50"
              >
                Создать объявление
              </Link>
              <Link
                to="/account"
                className="px-4 py-2 rounded-xl border text-sm hover:bg-slate-50"
              >
                Назад в кабинет
              </Link>
            </div>
          </header>

          <section className="px-8 py-8">
            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-sm text-slate-500">Загрузка...</div>
            ) : castings.length === 0 ? (
              <div className="text-sm text-slate-500">
                У вас пока нет объявлений.
              </div>
            ) : (
              <div className="space-y-3">
                {castings.map((c) => (
                  <div
                    key={c.id}
                    className="border rounded-2xl p-4 flex items-start justify-between gap-4"
                  >
                    <div>
                      <div className="font-medium">{c.title}</div>
                      <div className="text-xs text-slate-500">
                        {c.city || "Без города"}
                        {c.projectType ? ` • ${c.projectType}` : ""}
                      </div>
                      <div
                        className={`mt-2 inline-flex text-xs px-2 py-1 rounded-full ${
                          c.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {c.active ? "Активно" : "Неактивно"}
                      </div>
                    </div>

                    <button
                      onClick={() => deleteCasting(c.id)}
                      disabled={deletingId === c.id}
                      className="px-3 py-1 text-xs rounded-lg border"
                    >
                      {deletingId === c.id ? "Удаляем..." : "Удалить"}
                    </button>
                  </div>
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
