import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  Clapperboard,
  Home,
  MapPin,
  Shield,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { getAuthAccounts, switchRole as apiSwitchRole } from "@/api/auth";
import { getStoredEmail, useSession } from "@/entities/user/model/authStore";
import { resolveMediaUrl, useProfileAvatar } from "@/shared/ui/useProfileAvatar";
import type { UserRole } from "@/types/auth";

type ActiveKey =
  | "home"
  | "catalog"
  | "actors"
  | "creators"
  | "locations"
  | "ads"
  | "admin";

type MenuItem = {
  label: string;
  onClick: () => void;
  danger?: boolean;
};

const ROLE_LABELS: Record<string, string> = {
  ACTOR: "Актер",
  CREATOR: "Креатор",
  LOCATION_OWNER: "Локация",
  LOCATION: "Локация",
  CUSTOMER: "Заказчик",
  ADMIN: "Админ",
};

const PROFILE_ROLES: UserRole[] = [
  "ACTOR",
  "CREATOR",
  "LOCATION_OWNER",
  "CUSTOMER",
];

const resolveRolePath = (role?: string) => {
  const normalized = (role ?? "").toUpperCase();
  if (normalized === "ADMIN") return "/admin";
  if (normalized === "CUSTOMER") return "/customer";
  if (normalized === "CREATOR") return "/creator";
  if (normalized === "ACTOR") return "/actor";
  if (normalized === "LOCATION_OWNER" || normalized === "LOCATION") return "/location";
  return "/account";
};

const normalizeRoles = (roles: Array<string | null | undefined>) =>
  Array.from(
    new Set(
      roles
        .map((item) => item?.toUpperCase())
        .filter((item): item is string => Boolean(item))
    )
  );

export const InlineNav = ({
  active,
  showProfile = true,
  profileMenu,
}: {
  active?: ActiveKey;
  showProfile?: boolean;
  profileMenu?: MenuItem[];
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { avatarUrl, isAuthed } = useProfileAvatar();
  const {
    isAdmin,
    logout,
    login,
    role: currentRole,
    availableRoles,
  } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountRoles, setAccountRoles] = useState<string[]>(
    normalizeRoles(availableRoles)
  );
  const [switchingRole, setSwitchingRole] = useState<string | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setAccountRoles(normalizeRoles(availableRoles));
  }, [availableRoles]);

  useEffect(() => {
    if (!isAuthed) {
      setAccountRoles([]);
      return;
    }

    let cancelled = false;
    getAuthAccounts()
      .then((roles) => {
        if (!cancelled) {
          setAccountRoles(normalizeRoles(roles));
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [isAuthed, currentRole]);

  const handleSwitchRole = async (nextRole: string) => {
    setSwitchingRole(nextRole);
    try {
      const resp = await apiSwitchRole(nextRole as UserRole);
      if (resp.token) {
        login(resp.token, resp.role, resp.availableRoles);
        navigate(resolveRolePath(resp.role), { replace: true });
      }
    } finally {
      setSwitchingRole(null);
    }
  };

  const currentProfilePath = resolveRolePath(currentRole ?? undefined);
  const currentProfileMenu: MenuItem[] =
    isAuthed && currentRole && currentRole !== "ADMIN"
      ? [
          {
            label: `Мой профиль: ${ROLE_LABELS[currentRole] ?? currentRole}`,
            onClick: () => navigate(currentProfilePath),
          },
        ]
      : [];

  const switchProfileMenu: MenuItem[] = accountRoles
    .filter((item) => item !== currentRole)
    .map((item) => ({
      label: `${switchingRole === item ? "Переключаем..." : "Перейти"}: ${
        ROLE_LABELS[item] ?? item
      }`,
      onClick: () => void handleSwitchRole(item),
    }));

  const addRoleMenu: MenuItem[] =
    isAdmin || !isAuthed
      ? []
      : PROFILE_ROLES.filter((item) => !accountRoles.includes(item)).map((item) => ({
          label: `Добавить: ${ROLE_LABELS[item] ?? item}`,
          onClick: () => {
            const params = new URLSearchParams({ role: item, addRole: "1" });
            const email = getStoredEmail();
            if (email) {
              params.set("email", email);
            }
            navigate(`/auth/register?${params.toString()}`);
          },
        }));

  const logoutMenuItem: MenuItem = {
    label: "Выйти",
    onClick: () => {
      logout();
      navigate("/login", { replace: true });
    },
    danger: true,
  };
  const baseProfileMenu = profileMenu ?? [];
  const hasCustomLogout = baseProfileMenu.some((item) => item.label === logoutMenuItem.label);
  const profileActionsMenu =
    isAuthed && !hasCustomLogout ? [...baseProfileMenu, logoutMenuItem] : baseProfileMenu;
  const effectiveProfileMenu =
    switchProfileMenu.length > 0 || addRoleMenu.length > 0 || profileActionsMenu.length > 0
      ? [...currentProfileMenu, ...switchProfileMenu, ...addRoleMenu, ...profileActionsMenu]
      : undefined;

  const openMenu = () => {
    if (!effectiveProfileMenu) return;
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setMenuOpen(true);
  };

  const closeMenuSoon = () => {
    if (!effectiveProfileMenu) return;
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      setMenuOpen(false);
      closeTimerRef.current = null;
    }, 140);
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.add("has-mobile-app-nav");
    return () => document.body.classList.remove("has-mobile-app-nav");
  }, []);

  const resolvedActive: ActiveKey | undefined =
    active ??
    (location.pathname.startsWith("/ads")
      ? "ads"
      : location.pathname.startsWith("/actors")
      ? "actors"
      : location.pathname.startsWith("/creators")
      ? "creators"
      : location.pathname.startsWith("/locations")
      ? "locations"
      : location.pathname.startsWith("/admin")
      ? "admin"
      : location.pathname === "/"
      ? "home"
      : undefined);

  const navItemClass = "text-slate-600 hover:text-slate-900";
  const navItemActiveClass = "text-slate-900 font-semibold";
  const navItem = (key: ActiveKey, label: string, to: string) =>
    resolvedActive === key ? (
      <span className={navItemActiveClass}>{label}</span>
    ) : (
      <Link to={to} className={navItemClass}>
        {label}
      </Link>
    );
  const mobileItems = [
    { key: "home" as ActiveKey, label: "Главная", to: "/", icon: Home },
    { key: "actors" as ActiveKey, label: "Актёры", to: "/actors", icon: UsersRound },
    { key: "creators" as ActiveKey, label: "Креаторы", to: "/creators", icon: Sparkles },
    { key: "locations" as ActiveKey, label: "Локации", to: "/locations", icon: MapPin },
    isAdmin
      ? { key: "admin" as ActiveKey, label: "Админ", to: "/admin", icon: Shield }
      : { key: "ads" as ActiveKey, label: "Кастинги", to: "/ads", icon: Clapperboard },
  ];

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 px-4 py-3 text-slate-900 shadow-[0_12px_36px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-white/72 sm:px-6 md:px-8 md:py-5">
      <div className="flex items-center justify-between gap-3 md:gap-6">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.jpeg" alt="onset" className="h-9 w-9 rounded-xl object-cover" />
          <div className="leading-tight">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Casting
            </div>
            <div className="text-sm font-semibold text-slate-900">ONSET</div>
          </div>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-5 text-sm lg:flex">
          {navItem("home", "Главная", "/")}
          {navItem("actors", "Актёры", "/actors")}
          {navItem("creators", "Креаторы", "/creators")}
          {navItem("locations", "Локации", "/locations")}
          {navItem("ads", "Объявления", "/ads")}
          {isAdmin && navItem("admin", "Админка", "/admin")}
        </nav>

        <div className="flex items-center gap-2">
          {!isAuthed ? (
            <Link
              to="/login"
              className="hidden text-sm font-semibold text-slate-600 hover:text-slate-900 lg:inline-flex"
            >
              Войти/Регистрация
            </Link>
          ) : (
            showProfile && (
              <div
                className="relative"
                onMouseEnter={openMenu}
                onMouseLeave={closeMenuSoon}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (isAdmin) {
                      return;
                    }
                    navigate(currentProfilePath);
                  }}
                  onFocus={openMenu}
                  className="h-10 w-10 overflow-hidden rounded-full border border-black/10 bg-slate-200 transition-shadow hover:ring-2 hover:ring-slate-300"
                  aria-label="Профиль"
                >
                  {avatarUrl ? (
                    <img
                      src={resolveMediaUrl(avatarUrl) ?? undefined}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </button>
                {effectiveProfileMenu && menuOpen && (
                  <div
                    className="absolute right-0 mt-2 min-w-[160px] rounded-xl border border-black/10 bg-white p-1.5 shadow-lg"
                    onMouseEnter={openMenu}
                    onMouseLeave={closeMenuSoon}
                  >
                    {effectiveProfileMenu.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => {
                          setMenuOpen(false);
                          item.onClick();
                        }}
                        className={[
                          "w-full whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100",
                          item.danger ? "text-red-600 hover:bg-red-50" : "",
                        ].join(" ")}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
          {!isAuthed ? (
            <Link
              to="/login"
              className="inline-flex rounded-full border border-white/80 bg-white/85 px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm lg:hidden"
            >
              Войти
            </Link>
          ) : null}
        </div>
      </div>
    </header>
    <nav className="fixed inset-x-0 bottom-0 z-50 max-w-[100vw] overflow-hidden px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-3 lg:hidden">
      <div className="mx-auto grid w-full max-w-[calc(100vw-1rem)] grid-cols-[repeat(5,minmax(0,1fr))] rounded-[26px] border border-white/70 bg-white/[0.92] p-1.5 shadow-[0_16px_42px_rgba(15,23,42,0.18)] backdrop-blur sm:max-w-md sm:rounded-[28px]">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const selected = resolvedActive === item.key;
          return (
            <Link
              key={item.key}
              to={item.to}
              className={[
                "flex min-h-[54px] min-w-0 flex-col items-center justify-center gap-1 rounded-[20px] px-0.5 text-[9px] font-semibold transition-colors min-[390px]:text-[10px] sm:min-h-[56px] sm:rounded-[22px] sm:px-1",
                selected
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500 active:bg-slate-100",
              ].join(" ")}
              aria-current={selected ? "page" : undefined}
            >
              <Icon size={20} strokeWidth={2.2} />
              <span className="max-w-full truncate leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
    </>
  );
};
