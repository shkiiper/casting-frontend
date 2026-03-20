import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  banAdminUser,
  deactivateAdminUser,
  deleteAdminUser,
  getAdminUsers,
  setAdminUserProfileVisibility,
  unbanAdminUser,
  type AdminUser,
} from "@/api/admin";
import { InlineNav } from "@/shared/ui/InlineNav";
import { CenterToast } from "@/shared/ui/CenterToast";
import { HeaderPublishSwitch } from "@/shared/ui/HeaderPublishSwitch";

type UserRoleFilter = "ALL" | "ACTOR" | "CREATOR" | "LOCATION_OWNER" | "CUSTOMER";
type VisibilityFilter = "ALL" | "VISIBLE" | "HIDDEN";
type SortBy = "createdAt" | "updatedAt" | "id" | "email" | "role";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 20;

export const AdminUsersPage = () => {
  const navigate = useNavigate();
  const role = (localStorage.getItem("role") || "").toUpperCase();
  const isAdmin = role === "ADMIN";

  const [items, setItems] = useState<AdminUser[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>("ALL");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminUsers({
        page,
        size: PAGE_SIZE,
        role: roleFilter === "ALL" ? undefined : roleFilter,
        visibility: visibilityFilter,
        query: search.trim() || undefined,
        sortBy,
        sortDir,
      });
      setItems((data.content ?? []).filter((user) => user.role !== "ADMIN"));
      setTotalElements(data.totalElements ?? 0);
      setTotalPages(Math.max(1, data.totalPages ?? 1));
    } catch {
      setError(
        "Не удалось загрузить пользователей. Нужен backend-эндпоинт /api/admin/users с page/size/sort/query."
      );
      setItems([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    void loadUsers();
  }, [isAdmin, page, roleFilter, visibilityFilter, sortBy, sortDir]);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("role");
    localStorage.removeItem("token");
    sessionStorage.clear();
    navigate("/login", { replace: true });
  };

  const applySearch = () => {
    setPage(0);
    void loadUsers();
  };

  const onBanToggle = async (user: AdminUser) => {
    if (user.role === "ADMIN") {
      setError("Администраторов нельзя банить из этого раздела");
      return;
    }
    try {
      setProcessingId(user.id);
      setError(null);
      if (user.banned) {
        await unbanAdminUser(user.id);
        showToast("Пользователь разбанен");
      } else {
        await banAdminUser(user.id);
        showToast("Пользователь забанен");
      }
      await loadUsers();
      if (selectedUser?.id === user.id) {
        setSelectedUser((prev) =>
          prev ? { ...prev, banned: !Boolean(prev.banned) } : prev
        );
      }
    } catch {
      setError("Не удалось выполнить операцию бан/разбан");
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
      await deactivateAdminUser(user.id);
      showToast("Пользователь деактивирован");
      await loadUsers();
      if (selectedUser?.id === user.id) {
        setSelectedUser((prev) => (prev ? { ...prev, active: false } : prev));
      }
    } catch {
      setError("Не удалось деактивировать пользователя");
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
      const updatedUser = await setAdminUserProfileVisibility(user.id, nextPublished);

      setItems((prev) =>
        prev.map((item) =>
          item.id === user.id
            ? { ...item, published: updatedUser?.published ?? nextPublished }
            : item
        )
      );

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
      const message =
        (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data
          ?.message ||
        (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data
          ?.error;

      setError(message || "Не удалось изменить видимость профиля");
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
      await deleteAdminUser(user.id);
      setItems((prev) => prev.filter((item) => item.id !== user.id));
      setTotalElements((prev) => Math.max(0, prev - 1));
      if (selectedUser?.id === user.id) {
        setSelectedUser(null);
      }
      showToast("Аккаунт пользователя удален");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data
          ?.message ||
        (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data
          ?.error;
      setError(message || "Не удалось удалить пользователя");
    } finally {
      setProcessingId(null);
    }
  };

  const pageInfo = useMemo(
    () => ({
      from: totalElements === 0 ? 0 : page * PAGE_SIZE + 1,
      to: Math.min((page + 1) * PAGE_SIZE, totalElements),
    }),
    [page, totalElements]
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
          {error && (
            <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">
              {error}
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
                ) : items.length === 0 ? (
                  <div className="px-5 py-8 text-slate-600">Нет данных</div>
                ) : (
                  <div className="divide-y divide-black/10">
                    {items.map((user) => (
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
              Показано {pageInfo.from}-{pageInfo.to} из {totalElements}
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
