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
import { useSession } from "@/entities/user/model/authStore";
import { resolveMediaUrl, useProfileAvatar } from "@/shared/ui/useProfileAvatar";

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
  const { isAdmin, logout } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const effectiveProfileMenu =
    profileMenu ??
    (isAdmin
      ? [
          {
            label: "Выйти",
            onClick: () => {
              logout();
              navigate("/login", { replace: true });
            },
            danger: true,
          },
        ]
      : undefined);

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
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:px-6 md:px-8 md:py-5">
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
                    if (effectiveProfileMenu) {
                      setMenuOpen((v) => !v);
                      return;
                    }
                    if (isAdmin) {
                      return;
                    }
                    navigate("/account");
                  }}
                  onFocus={openMenu}
                  className="h-10 w-10 rounded-full bg-slate-300 hover:ring-2 hover:ring-slate-300 transition-shadow overflow-hidden border border-black/10"
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
                    className="absolute right-0 mt-2 min-w-[160px] rounded-xl border border-black/10 bg-white shadow-lg p-1.5"
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
                          "w-full whitespace-nowrap text-left px-3 py-2.5 rounded-lg text-sm hover:bg-slate-100",
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
              className="inline-flex rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white lg:hidden"
            >
              Войти
            </Link>
          ) : null}
        </div>
      </div>
    </header>
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 rounded-[28px] border border-white/70 bg-white/[0.92] p-1.5 shadow-[0_16px_42px_rgba(15,23,42,0.18)] backdrop-blur">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const selected = resolvedActive === item.key;
          return (
            <Link
              key={item.key}
              to={item.to}
              className={[
                "flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-[22px] px-1 text-[10px] font-semibold transition-colors",
                selected
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 active:bg-slate-100",
              ].join(" ")}
              aria-current={selected ? "page" : undefined}
            >
              <Icon size={20} strokeWidth={2.2} />
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
    </>
  );
};
