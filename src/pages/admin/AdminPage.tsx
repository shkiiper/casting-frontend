import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  type RoleCounts,
  type AdminPlan,
  type AdminPlanPayload,
  type AdminPlanBasicsPayload,
  type AdminPlanBoosterPayload,
  type AdminPlanCastingPayload,
  type AdminPlanPremiumPayload,
  type AdminStatsResponse,
} from "@/api/admin";
import { useSession } from "@/entities/user/model/authStore";
import { useAdminDashboardData } from "@/pages/admin/hooks/useAdminDashboardData";
import { getApiErrorMessage } from "@/shared/lib/safety";
import { InlineNav } from "@/shared/ui/InlineNav";
import { CenterToast } from "@/shared/ui/CenterToast";

const emptyPlan: AdminPlanPayload = {
  name: "",
  pricePerPeriod: 0,
  periodDays: 30,
  baseContactLimit: 10,
  boosterPrice: 0,
  boosterContacts: 0,
  castingPostPrice: 0,
  castingPostDays: 30,
  premiumProfilePrice: 0,
  premiumProfileDays: 30,
  active: true,
};

const toNum = (value: string) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("ru-RU").format(value);

const normalizeStats = (stats: AdminStatsResponse | null) => ({
  views: stats?.contactViews ?? stats?.views ?? stats?.totalViews ?? 0,
  siteVisits:
    stats?.siteVisits ??
    stats?.visitsCount ??
    stats?.visitorsCount ??
    stats?.uniqueVisitors ??
    stats?.totalVisitors ??
    0,
  payments: stats?.payments ?? 0,
  castings: stats?.castings ?? 0,
  revenue:
    stats?.revenue ??
    stats?.totalRevenue ??
    stats?.transactionAmount ??
    stats?.transactionsAmount ??
    stats?.turnover ??
    0,
});

const normalizeRoleCounts = (
  stats: AdminStatsResponse | null,
  fallback: RoleCounts | null
): RoleCounts => ({
  actors: stats?.actorsCount ?? stats?.actors ?? fallback?.actors ?? 0,
  creators: stats?.creatorsCount ?? stats?.creators ?? fallback?.creators ?? 0,
  locationOwners:
    stats?.locationOwnersCount ??
    stats?.locationOwners ??
    fallback?.locationOwners ??
    0,
  customers: stats?.customersCount ?? stats?.customers ?? fallback?.customers ?? 0,
});

export const AdminPage = () => {
  const navigate = useNavigate();
  const { isAdmin, logout: clearSession } = useSession();
  const {
    dashboardQuery,
    createPlan,
    deletePlan,
    savePlan,
    saveBase,
    saveBooster,
    saveCasting,
    savePremium,
  } = useAdminDashboardData();
  const [newPlan, setNewPlan] = useState<AdminPlanPayload>(emptyPlan);

  const [savingId, setSavingId] = useState<number | "new" | null>(null);
  const [expandedPlanId, setExpandedPlanId] = useState<number | null>(null);
  const [planDrafts, setPlanDrafts] = useState<Record<number, AdminPlan>>({});
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [openPlanMenuId, setOpenPlanMenuId] = useState<number | null>(null);
  const planMenuRef = useRef<HTMLDivElement | null>(null);
  const stats = dashboardQuery.data?.stats ?? null;
  const roleCountsFallback = dashboardQuery.data?.roleCountsFallback ?? null;
  const plans = dashboardQuery.data?.plans ?? [];
  const loading = dashboardQuery.isLoading;

  const statValues = useMemo(() => normalizeStats(stats), [stats]);
  const roleCounts = useMemo(
    () => normalizeRoleCounts(stats, roleCountsFallback),
    [stats, roleCountsFallback]
  );

  useEffect(() => {
    if (openPlanMenuId === null) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (planMenuRef.current?.contains(target)) return;
      setOpenPlanMenuId(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [openPlanMenuId]);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const logout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  };

  const onCreatePlan = async () => {
    try {
      setSavingId("new");
      setError(null);
      const created = await createPlan(toBasicsPayload(newPlan));
      setNewPlan(emptyPlan);
      setExpandedPlanId(created.id);
      setPlanDrafts((prev) => ({ ...prev, [created.id]: created }));
      showToast("План создан");
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Не удалось создать план"));
    } finally {
      setSavingId(null);
    }
  };

  const onDeletePlan = async (id: number) => {
    try {
      setSavingId(id);
      setError(null);
      await deletePlan(id);
      showToast("План удален");
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Не удалось удалить план"));
    } finally {
      setSavingId(null);
    }
  };

  const updatePlanDraft = (id: number, next: AdminPlan) => {
    setPlanDrafts((prev) => ({ ...prev, [id]: next }));
  };

  const onSavePlan = async (id: number, payload: AdminPlanPayload, sectionLabel = "Тариф") => {
    try {
      setSavingId(id);
      setError(null);
      const updated = await savePlan({ id, payload });
      setPlanDrafts((prev) => ({ ...prev, [id]: updated }));
      showToast(`${sectionLabel} сохранен`);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, `Не удалось сохранить: ${sectionLabel.toLowerCase()}`));
    } finally {
      setSavingId(null);
    }
  };

  const onSavePlanSection = async (
    id: number,
    section: PlanSectionKey,
    plan: AdminPlanPayload | AdminPlan
  ) => {
    try {
      setSavingId(id);
      setError(null);

      const updated =
        section === "base"
          ? await saveBase({ id, payload: toBasicsPayload(plan) })
          : section === "booster"
          ? await saveBooster({ id, payload: toBoosterPayload(plan) })
          : section === "casting"
          ? await saveCasting({ id, payload: toCastingPayload(plan) })
          : await savePremium({ id, payload: toPremiumPayload(plan) });

      setPlanDrafts((prev) => ({ ...prev, [id]: updated }));
      showToast(`${sectionLabelMap[section]} сохранен`);
    } catch (error: unknown) {
      setError(
        getApiErrorMessage(error, `Не удалось сохранить: ${sectionLabelMap[section].toLowerCase()}`)
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f9fc_0%,#edf2f8_45%,#e8eef6_100%)] text-slate-900">
      <div className="border-b border-black/10 bg-white/90 backdrop-blur">
        <InlineNav
          active="admin"
          profileMenu={[{ label: "Выйти", onClick: logout, danger: true }]}
        />
      </div>

      <header className="border-b border-black/10 bg-white">
        <div className="w-full px-4 py-6 sm:px-6 md:px-8 md:py-8 xl:px-10">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_420px]">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">
                Панель управления
              </div>
              <h1 className="mt-3 text-3xl font-extrabold md:text-5xl">Админка</h1>
              <p className="mt-3 max-w-3xl text-base text-slate-600 md:text-lg">
                В этом разделе видно состояние платформы, активность пользователей и стоимость
                основных продуктов. Сначала смотрим на метрики, потом редактируем тарифы.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/admin/users"
                  className="rounded-2xl px-5 py-3 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800"
                >
                  Открыть пользователей →
                </Link>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {plans.length > 0
                    ? `Активных тарифов: ${plans.filter((plan) => plan.active).length}`
                    : "Тарифы ещё не настроены"}
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.08),_transparent_45%),linear-gradient(135deg,#ffffff_0%,#f4f7fb_100%)] p-5 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Быстрый обзор</div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <MiniStat label="Клиенты" value={roleCounts.customers} />
                <MiniStat
                  label="Контакты"
                  value={statValues.views}
                  tone="slate"
                />
                <MiniStat
                  label="Посещения"
                  value={statValues.siteVisits}
                  tone="blue"
                />
                <MiniStat
                  label="Выручка"
                  value={statValues.revenue}
                  tone="amber"
                  money
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-4 py-6 sm:px-6 md:px-8 md:py-8 xl:px-10">
        <section className="space-y-6">
          {(error || dashboardQuery.isError) && (
            <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">
              {error || "Не удалось загрузить данные админки"}
            </div>
          )}

          {loading ? (
            <div className="text-slate-600">Загрузка админ-данных...</div>
          ) : (
            <>
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
                <section className="rounded-[30px] border border-slate-200 bg-white/90 p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Состояние платформы</div>
                      <div className="text-sm text-slate-500">
                        Основные продуктовые показатели и объём использования
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-4">
                    <StatCard
                      label="Просмотры контактов"
                      value={statValues.views}
                      hint="Сколько раз заказчики открывали контакты"
                      tone="slate"
                    />
                    <StatCard
                      label="Посещения сайта"
                      value={statValues.siteVisits}
                      hint="Сколько людей посетили сайт по данным backend-статистики"
                      tone="blue"
                    />
                    <StatCard
                      label="Платежи"
                      value={statValues.payments}
                      hint="Всего успешных и зарегистрированных оплат"
                      tone="emerald"
                    />
                    <StatCard
                      label="Выручка"
                      value={statValues.revenue}
                      hint="Сколько денег прошло через успешные транзакции платформы"
                      tone="amber"
                      money
                    />
                  </div>
                </section>

                <section className="rounded-[30px] border border-slate-200 bg-white/90 p-5 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">Аудитория</div>
                  <div className="mt-1 text-sm text-slate-500">
                    Кого сейчас больше всего на платформе
                  </div>
                  <div className="mt-4 space-y-3">
                    <AudienceRow label="Заказчики" value={roleCounts.customers} />
                    <AudienceRow label="Актёры" value={roleCounts.actors} />
                    <AudienceRow label="Креаторы" value={roleCounts.creators} />
                    <AudienceRow
                      label="Владельцы локаций"
                      value={roleCounts.locationOwners}
                    />
                  </div>
                </section>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_520px]">
                <section className="rounded-[30px] border border-slate-200 bg-white/90 p-5 shadow-sm">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Новый тариф
                    </div>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900">Создать тариф</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Сначала задайте базовые параметры тарифа, затем отдельно настройте
                      бустер, объявления и premium-профиль. Все блоки заполняются независимо и
                      собраны в одной форме только для сохранения на backend.
                    </p>
                  </div>

                  <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    <div className="font-medium text-slate-900">Подсказка</div>
                    <div className="mt-2">
                      Базовый тариф, бустер, размещение объявлений и premium-профиль вынесены в
                      отдельные секции, чтобы их было проще читать и редактировать.
                    </div>
                  </div>

                  <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="text-sm font-semibold text-slate-900">Параметры нового тарифа</div>
                        <div className="mt-1 text-sm text-slate-500">
                          Основной тариф, бустер, объявления и premium теперь разделены на
                          отдельные широкие блоки. Так проще видеть введённые значения во время
                          редактирования.
                        </div>
                      </div>

                      <div className="mt-5">
                        <PlanFields plan={newPlan} onChange={setNewPlan} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
                        <div className="text-sm font-semibold text-slate-900">Что будет после создания</div>
                        <div className="mt-2 text-sm leading-6 text-slate-600">
                          Новый тариф сразу появится в колонке справа. Его можно будет поправить,
                          отключить или удалить без перезагрузки страницы.
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="text-sm font-semibold text-slate-900">Черновой summary</div>
                        <div className="mt-3 space-y-3 text-xs text-slate-600">
                          <SummarySection
                            title="Базовый тариф"
                            items={[
                              {
                                label: "Подписка",
                                value: `${formatNumber(newPlan.pricePerPeriod)} сом / ${newPlan.periodDays} дн.`,
                              },
                              {
                                label: "Контакты",
                                value: `${formatNumber(newPlan.baseContactLimit)}`,
                              },
                            ]}
                          />
                          <SummarySection
                            title="Дополнительно"
                            items={[
                              {
                                label: "Бустер",
                                value: `${formatNumber(newPlan.boosterPrice)} сом за ${formatNumber(newPlan.boosterContacts)}`,
                              },
                              {
                                label: "Объявление",
                                value: `${formatNumber(newPlan.castingPostPrice)} сом / ${newPlan.castingPostDays} дн.`,
                              },
                              {
                                label: "Premium профиль",
                                value: `${formatNumber(newPlan.premiumProfilePrice)} сом / ${newPlan.premiumProfileDays} дн.`,
                              },
                            ]}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={onCreatePlan}
                      disabled={savingId === "new"}
                      className="rounded-xl px-5 py-2.5 bg-slate-900 text-white disabled:opacity-60"
                    >
                      {savingId === "new" ? "Создаём..." : "Создать"}
                    </button>
                  </div>
                </section>

                <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
                  <div className="rounded-[30px] border border-slate-200 bg-white/90 p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          Управление ценами
                        </div>
                        <div className="mt-1 text-2xl font-bold text-slate-900">
                          Созданные тарифы
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          Заказчиков в системе: {roleCounts.customers}. Выберите любой тариф справа
                          и обновите условия.
                        </div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        Планов: <span className="font-semibold text-slate-900">{plans.length}</span>
                      </div>
                    </div>
                  </div>

                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className="rounded-[30px] border border-slate-200 bg-white/95 p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 flex-wrap items-center gap-3">
                            <h3 className="text-xl font-bold text-slate-900">
                              {plan.name || `План #${plan.id}`}
                            </h3>
                          <span
                            className={[
                              "rounded-full px-3 py-1 text-xs font-semibold",
                              plan.active
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-600",
                            ].join(" ")}
                          >
                            {plan.active ? "Активен" : "Выключен"}
                          </span>
                        </div>

                        <div ref={openPlanMenuId === plan.id ? planMenuRef : null} className="relative self-start">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenPlanMenuId((current) =>
                                current === plan.id ? null : plan.id
                              )
                            }
                            className="px-2 py-1 text-2xl leading-none text-slate-500 hover:text-slate-800"
                          >
                            ⋯
                          </button>

                          {openPlanMenuId === plan.id ? (
                            <div className="absolute right-0 top-10 z-10 min-w-[180px] rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenPlanMenuId(null);
                                  setExpandedPlanId((current) =>
                                    current === plan.id ? null : plan.id
                                  );
                                  setPlanDrafts((prev) => ({
                                    ...prev,
                                    [plan.id]: prev[plan.id] ?? plan,
                                  }));
                                }}
                                className="w-full rounded-xl px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                              >
                                {expandedPlanId === plan.id ? "Скрыть редактирование" : "Редактировать"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenPlanMenuId(null);
                                  void onDeletePlan(plan.id);
                                }}
                                disabled={savingId === plan.id}
                                className="w-full rounded-xl px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                              >
                                Удалить тариф
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                        <SummaryChip
                          label="Подписка"
                          value={`${formatNumber(plan.pricePerPeriod)} сом / ${plan.periodDays} дн.`}
                        />
                        <SummaryChip
                          label="Контакты"
                          value={`${formatNumber(plan.baseContactLimit)}`}
                        />
                        <SummaryChip
                          label="Бустер"
                          value={`${formatNumber(plan.boosterPrice)} сом за ${formatNumber(plan.boosterContacts)}`}
                        />
                        <SummaryChip
                          label="Объявление"
                          value={`${formatNumber(plan.castingPostPrice)} сом / ${plan.castingPostDays} дн.`}
                        />
                        <SummaryChip
                          label="Premium профиль"
                          value={`${formatNumber(plan.premiumProfilePrice)} сом / ${plan.premiumProfileDays} дн.`}
                        />
                      </div>

                      {expandedPlanId === plan.id ? (
                        <div className="mt-5 border-t border-slate-200 pt-5">
                          <PlanFields
                            plan={planDrafts[plan.id] ?? plan}
                            onChange={(next) => updatePlanDraft(plan.id, next as AdminPlan)}
                            onSaveSection={(section, currentPlan) =>
                              void onSavePlanSection(plan.id, section, currentPlan)
                            }
                            saving={savingId === plan.id}
                          />
                          <div className="mt-4 flex justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                void onSavePlan(
                                  plan.id,
                                  toAdminPlanPayload(planDrafts[plan.id] ?? plan),
                                  "Тариф"
                                )
                              }
                              disabled={savingId === plan.id}
                              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                            >
                              {savingId === plan.id ? "Сохраняем..." : "Сохранить весь тариф"}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {plans.length === 0 && (
                    <div className="rounded-[30px] border border-dashed border-slate-300 bg-white/70 p-5 text-sm text-slate-600 shadow-sm">
                      Пока нет тарифных планов.
                    </div>
                  )}
                </aside>
              </div>
            </>
          )}
        </section>
      </main>

      {toast && <CenterToast message={toast} />}
    </div>
  );
};

const MiniStat = ({
  label,
  value,
  tone = "blue",
  money,
}: {
  label: string;
  value: number;
  tone?: "blue" | "slate" | "emerald" | "amber";
  money?: boolean;
}) => (
  <div
    className={[
      "rounded-2xl border px-4 py-3",
      tone === "emerald"
        ? "border-emerald-100 bg-emerald-50"
        : tone === "amber"
        ? "border-amber-100 bg-amber-50"
        : tone === "slate"
        ? "border-slate-200 bg-slate-50"
        : "border-blue-100 bg-blue-50",
    ].join(" ")}
  >
    <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    <div className="mt-1 text-2xl font-bold text-slate-900">
      {money ? `${formatNumber(value)} сом` : formatNumber(value)}
    </div>
  </div>
);

const StatCard = ({
  label,
  value,
  hint,
  tone,
  money,
}: {
  label: string;
  value: number;
  hint: string;
  tone: "blue" | "slate" | "emerald" | "amber";
  money?: boolean;
}) => (
  <div
    className={[
      "rounded-[24px] border p-5 shadow-sm",
      tone === "blue"
        ? "border-blue-200 bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_100%)]"
        : 
      tone === "emerald"
        ? "border-emerald-200 bg-[linear-gradient(180deg,#ffffff_0%,#f3fbf7_100%)]"
        : tone === "amber"
        ? "border-amber-200 bg-[linear-gradient(180deg,#ffffff_0%,#fff8ef_100%)]"
        : "border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)]",
    ].join(" ")}
  >
    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
    <div className="mt-3 text-4xl font-extrabold tracking-tight">
      {money ? `${formatNumber(value)} сом` : formatNumber(value)}
    </div>
    <div className="mt-3 text-sm leading-6 text-slate-600">{hint}</div>
  </div>
);

const AudienceRow = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm text-slate-600">{label}</div>
      <div className="text-lg font-bold text-slate-900">{formatNumber(value)}</div>
    </div>
  </div>
);

const SummaryChip = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
    <span className="font-medium text-slate-500">{label}: </span>
    <span className="text-slate-800">{value}</span>
  </div>
);

const SummarySection = ({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: string }>;
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
      {title}
    </div>
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((item) => (
        <SummaryChip key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  </div>
);

type PlanSectionKey = "base" | "booster" | "casting" | "premium";

const sectionLabelMap: Record<PlanSectionKey, string> = {
  base: "Базовый тариф",
  booster: "Бустер",
  casting: "Объявления",
  premium: "Premium",
};

const toAdminPlanPayload = (plan: AdminPlan | AdminPlanPayload): AdminPlanPayload => ({
  name: plan.name,
  pricePerPeriod: plan.pricePerPeriod,
  periodDays: plan.periodDays,
  baseContactLimit: plan.baseContactLimit,
  boosterPrice: plan.boosterPrice,
  boosterContacts: plan.boosterContacts,
  castingPostPrice: plan.castingPostPrice,
  castingPostDays: plan.castingPostDays,
  premiumProfilePrice: plan.premiumProfilePrice,
  premiumProfileDays: plan.premiumProfileDays,
  active: plan.active,
});

const toBasicsPayload = (
  plan: AdminPlan | AdminPlanPayload
): AdminPlanBasicsPayload => ({
  name: plan.name,
  pricePerPeriod: plan.pricePerPeriod,
  periodDays: plan.periodDays,
  baseContactLimit: plan.baseContactLimit,
  active: plan.active,
});

const toBoosterPayload = (
  plan: AdminPlan | AdminPlanPayload
): AdminPlanBoosterPayload => ({
  boosterPrice: plan.boosterPrice,
  boosterContacts: plan.boosterContacts,
});

const toCastingPayload = (
  plan: AdminPlan | AdminPlanPayload
): AdminPlanCastingPayload => ({
  castingPostPrice: plan.castingPostPrice,
  castingPostDays: plan.castingPostDays,
});

const toPremiumPayload = (
  plan: AdminPlan | AdminPlanPayload
): AdminPlanPremiumPayload => ({
  premiumProfilePrice: plan.premiumProfilePrice,
  premiumProfileDays: plan.premiumProfileDays,
});

const PlanFields = ({
  plan,
  onChange,
  onSaveSection,
  saving = false,
}: {
  plan: AdminPlanPayload | AdminPlan;
  onChange: (next: AdminPlanPayload | AdminPlan) => void;
  onSaveSection?: (section: PlanSectionKey, plan: AdminPlanPayload | AdminPlan) => void;
  saving?: boolean;
}) => (
  <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2">
      <Field
        label="Название тарифа"
        value={plan.name}
        placeholder="Например, Pro 30"
        onChange={(v) => onChange({ ...plan, name: v })}
      />
      <ToggleField
        label="Статус плана"
        checked={plan.active}
        onChange={(checked) => onChange({ ...plan, active: checked })}
      />
    </div>

    <div className="space-y-4">
      <FieldGroup
        title="Базовый тариф"
        description="Основные условия подписки. Это самостоятельный блок с ценой, сроком и лимитом контактов."
        fieldsLayoutClassName="grid gap-4 md:grid-cols-3"
        action={
          onSaveSection ? (
            <button
              type="button"
              onClick={() => onSaveSection("base", plan)}
              disabled={saving}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              Сохранить блок
            </button>
          ) : null
        }
      >
        <Field
          label="Цена периода"
          type="number"
          value={String(plan.pricePerPeriod)}
          suffix="сом"
          onChange={(v) => onChange({ ...plan, pricePerPeriod: toNum(v) })}
        />
        <Field
          label="Дней в периоде"
          type="number"
          value={String(plan.periodDays)}
          suffix="дней"
          onChange={(v) => onChange({ ...plan, periodDays: toNum(v) })}
        />
        <Field
          label="Лимит контактов"
          type="number"
          value={String(plan.baseContactLimit)}
          suffix="шт"
          onChange={(v) => onChange({ ...plan, baseContactLimit: toNum(v) })}
        />
      </FieldGroup>

      <FieldGroup
        title="Бустер"
        description="Отдельный продукт для докупки контактов. Не смешан с базовым тарифом."
        fieldsLayoutClassName="grid gap-4 md:grid-cols-2"
        action={
          onSaveSection ? (
            <button
              type="button"
              onClick={() => onSaveSection("booster", plan)}
              disabled={saving}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              Сохранить блок
            </button>
          ) : null
        }
      >
        <Field
          label="Цена бустера"
          type="number"
          value={String(plan.boosterPrice)}
          suffix="сом"
          onChange={(v) => onChange({ ...plan, boosterPrice: toNum(v) })}
        />
        <Field
          label="Контакты бустера"
          type="number"
          value={String(plan.boosterContacts)}
          suffix="шт"
          onChange={(v) => onChange({ ...plan, boosterContacts: toNum(v) })}
        />
      </FieldGroup>

      <FieldGroup
        title="Объявления"
        description="Отдельная настройка стоимости публикации и срока размещения."
        fieldsLayoutClassName="grid gap-4 md:grid-cols-2"
        action={
          onSaveSection ? (
            <button
              type="button"
              onClick={() => onSaveSection("casting", plan)}
              disabled={saving}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              Сохранить блок
            </button>
          ) : null
        }
      >
        <Field
          label="Цена объявления"
          type="number"
          value={String(plan.castingPostPrice)}
          suffix="сом"
          onChange={(v) => onChange({ ...plan, castingPostPrice: toNum(v) })}
        />
        <Field
          label="Дней объявления"
          type="number"
          value={String(plan.castingPostDays)}
          suffix="дней"
          onChange={(v) => onChange({ ...plan, castingPostDays: toNum(v) })}
        />
      </FieldGroup>

      <FieldGroup
        title="Premium профиль"
        description="Отдельная настройка visual upgrade для performer-профиля."
        fieldsLayoutClassName="grid gap-4 md:grid-cols-2"
        action={
          onSaveSection ? (
            <button
              type="button"
              onClick={() => onSaveSection("premium", plan)}
              disabled={saving}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              Сохранить блок
            </button>
          ) : null
        }
      >
        <Field
          label="Цена premium"
          type="number"
          value={String(plan.premiumProfilePrice)}
          suffix="сом"
          onChange={(v) => onChange({ ...plan, premiumProfilePrice: toNum(v) })}
        />
        <Field
          label="Срок premium"
          type="number"
          value={String(plan.premiumProfileDays)}
          suffix="дней"
          onChange={(v) => onChange({ ...plan, premiumProfileDays: toNum(v) })}
        />
      </FieldGroup>
    </div>
  </div>
);

const FieldGroup = ({
  title,
  description,
  action,
  children,
  fieldsLayoutClassName = "space-y-3",
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
  fieldsLayoutClassName?: string;
}) => (
  <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-sm">
    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <div className="text-lg font-semibold text-slate-900">{title}</div>
        <div className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
    <div className={["mt-5", fieldsLayoutClassName].join(" ")}>{children}</div>
  </div>
);

const ToggleField = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    <label className="mt-3 flex cursor-pointer items-center justify-between gap-3">
      <span className="text-sm text-slate-700">
        {checked ? "План доступен для новых покупок" : "План скрыт и недоступен"}
      </span>
      <span
        className={[
          "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
          checked ? "bg-slate-900" : "bg-slate-300",
        ].join(" ")}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={[
            "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          ].join(" ")}
        />
      </span>
    </label>
  </div>
);

const Field = ({
  label,
  value,
  onChange,
  type = "text",
  suffix,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
  suffix?: string;
  placeholder?: string;
}) => (
  <label className="block">
    <div className="mb-2 text-sm font-medium text-slate-700">{label}</div>
    <div className="relative">
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={[
          "w-full min-w-0 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-base font-medium text-slate-900 shadow-sm outline-none transition [appearance:textfield] placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-200/70",
          suffix ? "pr-20" : "",
        ].join(" ")}
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 whitespace-nowrap text-sm font-semibold text-slate-400">
          {suffix}
        </span>
      ) : null}
    </div>
  </label>
);
