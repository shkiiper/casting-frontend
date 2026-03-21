import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/api/client";
import { useSession } from "@/entities/user/model/authStore";
import { Container } from "@/shared/ui/Container";
import { InlineNav } from "@/shared/ui/InlineNav";
import { PageOctopusDecor } from "@/shared/ui/PageOctopusDecor";
import type { PageResponse } from "@/types/common";
import { Input } from "@/shared/ui/Input";
import { addCastingApplication } from "@/shared/lib/castingApplications";

type CastingResponse = {
  id: number;
  title: string;
  description?: string | null;
  city?: string | null;
  projectType?: string | null;
  publishedAt?: string | null;
};

type CastingListResponse = PageResponse<CastingResponse> | CastingResponse[];

type ApplicantProfile = {
  id: number;
  type?: string | null;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contactTelegram?: string | null;
};

const PROJECT_TYPE_OPTIONS = [
  "Проект",
  "Реклама",
  "Клип",
  "Короткий метр",
  "Полный метр",
  "Сериал",
  "ТВ-шоу",
  "YouTube",
  "TikTok / Reels",
  "Фотосессия",
  "Имиджевая съемка",
  "Контент для бренда",
  "Подкаст / интервью",
  "Озвучка",
  "Театр",
  "Ивент",
  "Модельный кастинг",
  "Детский кастинг",
  "Массовка",
  "Эпизодическая роль",
  "Главная роль",
];

const formatDate = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const PublishedAdsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useSession();
  const [list, setList] = useState<CastingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<CastingListResponse>(
          "/api/castings/active",
          { params: { page: 0, size: 20 } }
        );
        const payload = res.data;
        setList(Array.isArray(payload) ? payload : payload.content ?? []);
      } catch {
        setError("Не удалось загрузить объявления");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cities = useMemo(
    () =>
      Array.from(
        new Set(list.map((item) => item.city).filter(Boolean))
      ) as string[],
    [list]
  );

  const types = useMemo(
    () => {
      const discovered =
        Array.from(
          new Set(list.map((item) => item.projectType).filter(Boolean))
        ) as string[];
      return Array.from(new Set([...PROJECT_TYPE_OPTIONS, ...discovered]));
    },
    [list]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((item) => {
      if (cityFilter && item.city !== cityFilter) return false;
      if (typeFilter && item.projectType !== typeFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        (item.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [list, query, cityFilter, typeFilter]);

  const submitApplication = async (casting: CastingResponse) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      let me: ApplicantProfile | null = null;

      try {
        const res = await api.get<ApplicantProfile>("/api/profile/me");
        me = res.data;
      } catch {
        const res = await api.get<ApplicantProfile>("/api/customer/me");
        me = res.data;
      }

      const applicantName =
        me.displayName ||
        [me.firstName, me.lastName].filter(Boolean).join(" ") ||
        "Пользователь";
      const applicantContact =
        me.contactTelegram
          ? `@${me.contactTelegram}`
          : me.contactPhone || me.contactEmail || "Контакт не указан";

      const result = addCastingApplication({
        castingId: casting.id,
        castingTitle: casting.title,
        castingCity: casting.city ?? null,
        castingType: casting.projectType ?? null,
        applicantProfileId: me.id ?? null,
        applicantName,
        applicantCity: me.city ?? null,
        applicantRole: me.type ?? role,
        applicantContact,
      });

      setSuccess(
        result.created
          ? "Заявка успешно отправлена"
          : "Вы уже оставляли заявку на это объявление"
      );
    } catch {
      setError("Не удалось отправить заявку");
    }
  };

  return (
    <div className="relative min-h-screen bg-[#f3f4f7] text-slate-900">
      <PageOctopusDecor />
      <div className="relative z-10">
        <Container>
        <div className="mx-auto max-w-7xl mt-10">
          <div className="glass-object overflow-visible rounded-[28px] sm:rounded-[36px]">
            <InlineNav active="ads" />

            <header className="glass-object-soft flex flex-wrap items-center justify-between gap-4 border-b border-white/50 px-4 py-5 sm:px-6 md:px-8 md:py-7">
              <div>
                <div className="text-xs tracking-wide text-slate-500 uppercase">
                  Объявления
                </div>
                <h1 className="text-3xl font-bold">Опубликованные объявления</h1>
                <div className="text-sm text-slate-500 mt-1">
                  Свежие проекты, открытые роли и запросы от заказчиков.
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Доступно всем посетителям
              </div>
            </header>

            <section className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl text-sm mb-6">
                  {success}
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-[0.8fr_1.6fr]">
                <aside className="space-y-4">
                  <div className="glass-object-soft rounded-2xl p-5">
                    <div className="text-xs text-slate-500 uppercase tracking-wide">
                      Фильтры
                    </div>
                    <div className="mt-3 space-y-3">
                      <Input
                        value={query}
                        placeholder="Поиск по тексту"
                        onChange={(value) => setQuery(value)}
                      />
                      <select
                        className="w-full rounded-xl border px-3 py-2 text-sm"
                        value={cityFilter}
                        onChange={(e) => setCityFilter(e.target.value)}
                      >
                        <option value="">Все города</option>
                        {cities.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                      <select
                        className="w-full rounded-xl border px-3 py-2 text-sm"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                      >
                        <option value="">Все типы</option>
                        {types.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      <button
                        className="w-full px-3 py-2 rounded-xl border text-sm"
                        onClick={() => {
                          setQuery("");
                          setCityFilter("");
                          setTypeFilter("");
                        }}
                      >
                        Сбросить фильтры
                      </button>
                    </div>
                  </div>

                  <div className="glass-object-soft hidden rounded-2xl p-5 xl:block">
                    <div className="text-xs text-slate-500 uppercase tracking-wide">
                      Как это работает
                    </div>
                    <div className="mt-3 text-sm text-slate-700 space-y-2">
                      <div>1. Выберите интересующее объявление.</div>
                      <div>2. Откройте контакты при наличии лимита.</div>
                      <div>3. Напишите заказчику и договоритесь.</div>
                    </div>
                  </div>

                  <div className="glass-object-soft hidden rounded-2xl p-5 xl:block">
                    <div className="text-xs text-slate-500 uppercase tracking-wide">
                      Для заказчиков
                    </div>
                    <div className="mt-3 text-sm text-slate-700 space-y-2">
                      <div>
                        Размещение объявлений доступно из личного кабинета.
                      </div>
                    </div>
                  </div>
                </aside>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <div className="text-sm text-slate-500">
                      Найдено: {filtered.length}
                    </div>
                    <div className="text-xs text-slate-500">
                      Обновлено сегодня
                    </div>
                  </div>

                  {loading ? (
                    <div className="text-sm text-slate-500">Загрузка...</div>
                  ) : filtered.length === 0 ? (
                    <div className="text-sm text-slate-500">
                      Пока нет опубликованных объявлений.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filtered.map((c) => (
                        <div key={c.id} className="glass-object rounded-2xl p-6">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-lg">
                                {c.title}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                {c.city || "Без города"}
                                {c.projectType ? ` • ${c.projectType}` : ""}
                                {c.publishedAt ? ` • ${formatDate(c.publishedAt)}` : ""}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                                Открыто
                              </span>
                              <Link
                                to="/catalog"
                                className="text-xs text-slate-700 underline"
                              >
                                В каталог
                              </Link>
                            </div>
                          </div>
                          {c.description && (
                            <div className="text-sm text-slate-700 mt-4 whitespace-pre-line">
                              {c.description}
                            </div>
                          )}

                          <div className="mt-5 flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={() => submitApplication(c)}
                              className="rounded-xl px-4 py-2 bg-slate-900 text-white text-sm hover:bg-slate-800 transition-colors"
                            >
                              Откликнуться
                            </button>
                            <span className="text-xs text-slate-500">
                              Оставьте заявку, и заказчик свяжется с вами
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </section>
          </div>
        </div>
        </Container>
      </div>
    </div>
  );
};
