import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { type AdminUser } from "@/api/admin";
import { useSession } from "@/entities/user/model/authStore";
import { useAdminUsersData } from "@/pages/admin/hooks/useAdminUsersData";
import { getApiErrorMessage } from "@/shared/lib/safety";
import { InlineNav } from "@/shared/ui/InlineNav";
import { CenterToast } from "@/shared/ui/CenterToast";
import { HeaderPublishSwitch } from "@/shared/ui/HeaderPublishSwitch";

type UserRoleFilter = "ALL" | "ACTOR" | "CREATOR" | "LOCATION_OWNER" | "CUSTOMER";
type VisibilityFilter = "ALL" | "VISIBLE" | "HIDDEN";
type SortBy = "createdAt" | "updatedAt" | "id" | "email" | "role";
type SortDir = "asc" | "desc";
type QuickFilter = "WITHOUT_PHOTO" | "HIDDEN" | "INACTIVE";

const PAGE_SIZE = 20;

export const AdminUsersPage = () => {
  const navigate = useNavigate();
  const { isAdmin, logout: clearSession } = useSession();
  const [page, setPage] = useState(0);

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>("ALL");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [quickFilters, setQuickFilters] = useState<QuickFilter[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const { usersQuery, banToggleUser, deactivateUser, updateVisibility, deleteUser, notifyMissingPhoto } =
    useAdminUsersData({
      page,
      size: PAGE_SIZE,
      role: roleFilter === "ALL" ? undefined : roleFilter,
      visibility: visibilityFilter,
      query: appliedSearch || undefined,
      sortBy,
      sortDir,
    });
  const items = useMemo(
    () => (usersQuery.data?.content ?? []).filter((user) => user.role !== "ADMIN"),
    [usersQuery.data?.content]
  );
  const filteredItems = useMemo(
    () =>
      items.filter((user) => {
        if (quickFilters.includes("WITHOUT_PHOTO") && user.hasPhoto !== false) return false;
        if (quickFilters.includes("HIDDEN") && user.published !== false) return false;
        if (quickFilters.includes("INACTIVE") && user.active !== false) return false;
        return true;
      }),
    [items, quickFilters]
  );
  const totalElements = usersQuery.data?.totalElements ?? 0;
  const totalPages = Math.max(1, usersQuery.data?.totalPages ?? 1);
  const loading = usersQuery.isLoading;

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  };

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const logout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  const applySearch = () => {
    setPage(0);
    setAppliedSearch(search.trim());
  };

  const onBanToggle = async (user: AdminUser) => {
    if (user.role === "ADMIN") {
      setError("Администраторов нельзя банить из этого раздела");
      return;
    }
    try {
      setProcessingId(user.id);
      setError(null);
      const updatedUser = await banToggleUser(user);
      showToast(updatedUser.banned ? "Пользователь забанен" : "Пользователь разбанен");
      if (selectedUser?.id === user.id) {
        setSelectedUser((prev) => (prev ? { ...prev, banned: updatedUser.banned } : prev));
      }
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Не удалось выполнить операцию бан/разбан"));
    } finally {
      setProcessingId(null);
    }
  };

  const onDeactivate = async (user: AdminUser) => {
    if (user.role === "ADMIN") {
      setError("Администраторов нельзя деактивировать из этого раздела");
      return;
    }
    try {
      setProcessingId(user.id);
      setError(null);
      await deactivateUser(user.id);
      showToast("Пользователь деактивирован");
      if (selectedUser?.id === user.id) {
        setSelectedUser((prev) => (prev ? { ...prev, active: false } : prev));
      }
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Не удалось деактивировать пользователя"));
    } finally {
      setProcessingId(null);
    }
  };

  const onVisibilityToggle = async (user: AdminUser, nextPublished: boolean) => {
    if (user.role === "CUSTOMER" || user.role === "ADMIN") {
      setError("Для этой роли нельзя менять видимость профиля");
      return;
    }

    try {
      setProcessingId(user.id);
      setError(null);
      const updatedUser = await updateVisibility({
        userId: user.id,
        published: nextPublished,
      });

      if (selectedUser?.id === user.id) {
        setSelectedUser((prev) =>
          prev
            ? {
                ...prev,
                published: updatedUser?.published ?? nextPublished,
              }
            : prev
        );
      }

      showToast(nextPublished ? "Профиль показан в каталоге" : "Профиль скрыт из каталога");
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Не удалось изменить видимость профиля"));
    } finally {
      setProcessingId(null);
    }
  };

  const onDeleteUser = async (user: AdminUser) => {
    if (user.role === "ADMIN") {
      setError("Администраторов нельзя удалять из этого раздела");
      return;
    }

    const confirmed = window.confirm(
      `Удалить аккаунт пользователя #${user.id} (${userName(user)})? Это действие необратимо.`
    );
    if (!confirmed) return;

    try {
      setProcessingId(user.id);
      setError(null);
      await deleteUser(user.id);
      if (selectedUser?.id === user.id) {
        setSelectedUser(null);
      }
      showToast("Аккаунт пользователя удален");
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Не удалось удалить пользователя"));
    } finally {
      setProcessingId(null);
    }
  };

  const onNotifyMissingPhoto = async (user: AdminUser) => {
    if (user.role === "CUSTOMER" || user.role === "ADMIN") {
      setError("Для этой роли нельзя отправлять напоминание о фото");
      return;
    }

    try {
      setProcessingId(user.id);
      setError(null);
      await notifyMissingPhoto(user.id);
      showToast("Напоминание о фото отправлено");
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Не удалось отправить напоминание о фото"));
    } finally {
      setProcessingId(null);
    }
  };

  const pageInfo = useMemo(
    () => ({
      from: filteredItems.length === 0 ? 0 : page * PAGE_SIZE + 1,
      to: Math.min(page * PAGE_SIZE + filteredItems.length, totalElements),
    }),
    [filteredItems.length, page, totalElements]
  );

  return (
    <div className="min-h-screen bg-[#eef2f7] text-slate-900">
      <div className="border-b border-black/10 bg-white/90 backdrop-blur">
        <InlineNav
          active="admin"
          profileMenu={[{ label: "Выйти", onClick: logout, danger: true }]}
        />
      </div>

      <header className="border-b border-black/10 bg-white">
        <div className="w-full px-4 py-6 sm:px-6 md:px-8 md:py-8 xl:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Админка
              </div>
              <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">Пользователи</h1>
              <p className="mt-2 max-w-3xl text-slate-600">
                Серверный список с поиском, сортировкой и быстрыми действиями.
              </p>
            </div>
            <Link
              to="/admin"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold border border-black/15 bg-white hover:bg-slate-100"
            >
              ← Назад в админку
            </Link>
          </div>
        </div>
      </header>

      <main className="w-full px-4 py-6 sm:px-6 md:px-8 md:py-8 xl:px-10">
        <section className="space-y-4">
          {(error || usersQuery.isError) && (
            <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">
              {error ||
                "Не удалось загрузить пользователей. Нужен backend-эндпоинт /api/admin/users с page/size/sort/query."}
            </div>
          )}

          <div className="rounded-[28px] border border-black/10 bg-white p-4 shadow-sm">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px_190px_220px_180px]">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applySearch();
                  }}
                  placeholder="Глобальный поиск: email / телефон / id"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white"
                />
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value as UserRoleFilter);
                    setPage(0);
                  }}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white"
                >
                  <option value="ALL">Все роли</option>
                  <option value="ACTOR">Актёры</option>
                  <option value="CREATOR">Креаторы</option>
                  <option value="LOCATION_OWNER">Владельцы локаций</option>
                  <option value="CUSTOMER">Кастомеры</option>
                </select>
                <select
                  value={visibilityFilter}
                  onChange={(e) => {
                    setVisibilityFilter(e.target.value as VisibilityFilter);
                    setPage(0);
                  }}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white"
                >
                  <option value="ALL">Все профили</option>
                  <option value="VISIBLE">Только видимые</option>
                  <option value="HIDDEN">Только скрытые</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white"
                >
                  <option value="createdAt">Сорт: Создан</option>
                  <option value="updatedAt">Сорт: Обновлен</option>
                  <option value="id">Сорт: ID</option>
                  <option value="email">Сорт: Email</option>
                  <option value="role">Сорт: Роль</option>
                </select>
                <select
                  value={sortDir}
                  onChange={(e) => setSortDir(e.target.value as SortDir)}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white"
                >
                  <option value="desc">По убыванию</option>
                  <option value="asc">По возрастанию</option>
                </select>
              </div>

              <button
                type="button"
                onClick={applySearch}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800"
              >
                Найти
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/5 pt-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Быстрые фильтры
              </span>
              {[
                { key: "WITHOUT_PHOTO" as QuickFilter, label: "Без фото" },
                { key: "HIDDEN" as QuickFilter, label: "Скрыт из каталога" },
                { key: "INACTIVE" as QuickFilter, label: "Неактивен" },
              ].map((filter) => {
                const active = quickFilters.includes(filter.key);
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() =>
                      setQuickFilters((prev) =>
                        prev.includes(filter.key)
                          ? prev.filter((item) => item !== filter.key)
                          : [...prev, filter.key]
                      )
                    }
                    className={[
                      "rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white text-slate-600 hover:border-slate-500",
                    ].join(" ")}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-[110px_180px_minmax(260px,1fr)_250px_320px] gap-4 border-b border-black/10 px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <div>ID</div>
                  <div>Роль</div>
                  <div>Имя / email</div>
                  <div>Статус</div>
                  <div>Действия</div>
                </div>

                {loading ? (
                  <div className="px-5 py-8 text-slate-600">Загрузка...</div>
                ) : filteredItems.length === 0 ? (
                  <div className="px-5 py-8 text-slate-600">Нет данных</div>
                ) : (
                  <div className="divide-y divide-black/10">
                    {filteredItems.map((user) => (
                      <div
                        key={user.id}
                        className="grid grid-cols-[110px_180px_minmax(260px,1fr)_250px_320px] gap-4 px-5 py-4 text-sm items-center"
                      >
                        <div className="font-semibold">#{user.id}</div>
                        <div>{roleLabel(user.role)}</div>
                        <div>
                          <div className="font-medium">{userName(user)}</div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            {user.email || user.contactEmail || "—"}
                          </div>
                        </div>
                        <div className="text-xs">
                          <div>{Boolean(user.active) ? "Активен" : "Неактивен"}</div>
                          {typeof user.published === "boolean" ? (
                            <div
                              className={[
                                "mt-1",
                                user.published ? "text-blue-700" : "text-slate-500",
                              ].join(" ")}
                            >
                              {user.published ? "Виден в каталоге" : "Скрыт из каталога"}
                            </div>
                          ) : null}
                          <div className={user.banned ? "mt-1 text-red-600" : "mt-1 text-emerald-700"}>
                            {user.banned ? "Забанен" : "Не забанен"}
                          </div>
                          <div className="mt-1 text-slate-500">
                            {user.hasPhoto === true
                              ? "Фото есть"
                              : user.hasPhoto === false
                              ? "Без фото"
                              : "Фото: —"}
                          </div>
                          <div className="mt-1 text-slate-500">
                            {user.emailVerified === true
                              ? "Email подтверждён"
                              : user.emailVerified === false
                              ? "Email не подтверждён"
                              : "Email: —"}
                          </div>
                          <div className="mt-1 text-slate-500">
                            Логин: {formatAdminDate(user.lastLoginAt)}
                          </div>
                          <div className="mt-1 text-slate-500">
                            Активность: {formatAdminDate(user.lastActivityAt || user.updatedAt)}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {user.role !== "CUSTOMER" && user.role !== "ADMIN" ? (
                            <HeaderPublishSwitch
                              checked={Boolean(user.published)}
                              onChange={(next) => void onVisibilityToggle(user, next)}
                              disabled={processingId === user.id}
                            />
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setSelectedUser(user)}
                            className="rounded-lg px-3 py-1.5 text-xs border"
                          >
                            Карточка
                          </button>
                          {user.role !== "CUSTOMER" && user.role !== "ADMIN" ? (
                            <button
                              type="button"
                              disabled={processingId === user.id}
                              onClick={() => void onNotifyMissingPhoto(user)}
                              className="rounded-lg px-3 py-1.5 text-xs border border-sky-300 text-sky-700 disabled:opacity-60"
                            >
                              Напомнить о фото
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={processingId === user.id}
                            onClick={() => onBanToggle(user)}
                            className="rounded-lg px-3 py-1.5 text-xs border border-red-300 text-red-600 disabled:opacity-60"
                          >
                            {user.banned ? "Разбан" : "Бан"}
                          </button>
                          <button
                            type="button"
                            disabled={processingId === user.id || user.active === false}
                            onClick={() => onDeactivate(user)}
                            className="rounded-lg px-3 py-1.5 text-xs border border-amber-300 text-amber-700 disabled:opacity-60"
                          >
                            Деактивировать
                          </button>
                          <button
                            type="button"
                            disabled={processingId === user.id}
                            onClick={() => void onDeleteUser(user)}
                            className="rounded-lg px-3 py-1.5 text-xs border border-red-500 bg-red-50 text-red-700 disabled:opacity-60"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-slate-600">
              Показано {pageInfo.from}-{pageInfo.to} из{" "}
              {quickFilters.length > 0 ? `${filteredItems.length} на странице (${totalElements} всего)` : totalElements}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg px-3 py-2 text-sm border disabled:opacity-50"
              >
                ← Назад
              </button>
              <div className="text-sm text-slate-600">
                Страница {page + 1} / {totalPages}
              </div>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page + 1 >= totalPages}
                className="rounded-lg px-3 py-2 text-sm border disabled:opacity-50"
              >
                Вперёд →
              </button>
            </div>
          </div>
        </section>
      </main>

      {selectedUser && (
        <UserDrawer user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}

      {toast && <CenterToast message={toast} />}
    </div>
  );
};

const UserDrawer = ({
  user,
  onClose,
}: {
  user: AdminUser;
  onClose: () => void;
}) => {
  const contacts =
    [
      user.contactPhone || user.phone ? `Тел: ${user.contactPhone || user.phone}` : null,
      user.contactEmail || user.email ? `Email: ${user.contactEmail || user.email}` : null,
      user.contactTelegram || user.telegram
        ? `Telegram: ${user.contactTelegram || user.telegram}`
        : null,
      user.contactWhatsapp ? `WhatsApp: ${user.contactWhatsapp}` : null,
    ]
      .filter(Boolean)
      .join(" • ") || "—";

  const price =
    user.minRate && user.minRate > 0
      ? `${user.minRate} ${user.rateUnit || "сом"}`
      : "—";

  return (
    <div className="fixed inset-0 z-[90] bg-black/30" onClick={onClose}>
      <aside
        className="absolute right-0 top-0 h-full w-full max-w-[440px] overflow-y-auto bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-bold">Карточка пользователя</h3>
          <button type="button" onClick={onClose} className="text-slate-600">
            Закрыть
          </button>
        </div>

        <div className="mt-5 space-y-3 text-sm">
          <Row label="ID" value={String(user.id)} />
          <Row label="Роль" value={roleLabel(user.role)} />
          <Row label="Имя" value={userName(user)} />
          <Row label="Email" value={user.email || user.contactEmail || "—"} />
          <Row label="Телефон" value={user.phone || user.contactPhone || "—"} />
          <Row label="Город" value={user.city || "—"} />
          <Row label="О себе" value={user.description || "—"} />
          <Row label="Контакты" value={contacts} />
          <Row label="Прайс" value={price} />
          <Row
            label="Видимость"
            value={
              typeof user.published === "boolean"
                ? user.published
                  ? "Виден в каталоге"
                  : "Скрыт из каталога"
                : "—"
            }
          />
          <Row
            label="Фото"
            value={
              user.hasPhoto === true ? "Есть фото" : user.hasPhoto === false ? "Нет фото" : "—"
            }
          />
          <Row
            label="Email подтвержден"
            value={
              user.emailVerified === true
                ? "Да"
                : user.emailVerified === false
                ? "Нет"
                : "—"
            }
          />
          <Row label="Последний логин" value={formatAdminDate(user.lastLoginAt)} />
          <Row
            label="Последняя активность"
            value={formatAdminDate(user.lastActivityAt || user.updatedAt)}
          />
          <Row label="Статус" value={Boolean(user.active) ? "Активен" : "Неактивен"} />
          <Row label="Бан" value={user.banned ? "Забанен" : "Не забанен"} />
          <Row label="Создан" value={user.createdAt || "—"} />
          <Row label="Обновлен" value={user.updatedAt || "—"} />
        </div>
      </aside>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-xs text-slate-500">{label}</div>
    <div className="text-slate-800 mt-0.5 break-words">{value}</div>
  </div>
);

const formatAdminDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const userName = (user: AdminUser) =>
  user.displayName ||
  [user.firstName, user.lastName].filter(Boolean).join(" ") ||
  user.email ||
  `ID ${user.id}`;

const roleLabel = (role: string) => {
  if (role === "ACTOR") return "Актёр";
  if (role === "CREATOR") return "Креатор";
  if (role === "LOCATION_OWNER") return "Владелец локации";
  if (role === "CUSTOMER") return "Кастомер";
  if (role === "ADMIN") return "Админ";
  return role;
};
