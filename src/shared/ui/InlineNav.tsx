import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import logo from "@/assets/onset-logo.svg";
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
  const role = (localStorage.getItem("role") || "").toUpperCase();
  const isAdmin = role === "ADMIN";
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const effectiveProfileMenu =
    profileMenu ??
    (isAdmin
      ? [
          {
            label: "Выйти",
            onClick: () => {
              localStorage.removeItem("accessToken");
              localStorage.removeItem("refreshToken");
              localStorage.removeItem("role");
              localStorage.removeItem("token");
              sessionStorage.clear();
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
    setMobileNavOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);
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

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:px-6 md:px-8 md:py-5">
      <div className="flex flex-wrap items-center justify-between gap-4 md:gap-6">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="onset" className="h-9 w-9 rounded-xl" />
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
          <button
            type="button"
            onClick={() => setMobileNavOpen((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white text-slate-700 lg:hidden"
            aria-label="Открыть навигацию"
            aria-expanded={mobileNavOpen}
          >
            <span className="text-lg leading-none">{mobileNavOpen ? "✕" : "☰"}</span>
          </button>
          {!isAuthed ? (
            <Link
              to="/login"
              className="text-sm font-semibold text-slate-600 hover:text-slate-900"
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
        </div>
      </div>

      {mobileNavOpen ? (
        <div className="mt-4 rounded-2xl border border-black/5 bg-white/90 p-4 shadow-sm lg:hidden">
          <nav className="flex flex-col gap-3 text-sm">
            {resolvedActive === "home" ? (
              <span className={navItemActiveClass}>Главная</span>
            ) : (
              <Link to="/" className={navItemClass}>
                Главная
              </Link>
            )}
            {resolvedActive === "actors" ? (
              <span className={navItemActiveClass}>Актёры</span>
            ) : (
              <Link to="/actors" className={navItemClass}>
                Актёры
              </Link>
            )}
            {resolvedActive === "creators" ? (
              <span className={navItemActiveClass}>Креаторы</span>
            ) : (
              <Link to="/creators" className={navItemClass}>
                Креаторы
              </Link>
            )}
            {resolvedActive === "locations" ? (
              <span className={navItemActiveClass}>Локации</span>
            ) : (
              <Link to="/locations" className={navItemClass}>
                Локации
              </Link>
            )}
            {resolvedActive === "ads" ? (
              <span className={navItemActiveClass}>Объявления</span>
            ) : (
              <Link to="/ads" className={navItemClass}>
                Объявления
              </Link>
            )}
            {isAdmin ? (
              resolvedActive === "admin" ? (
                <span className={navItemActiveClass}>Админка</span>
              ) : (
                <Link to="/admin" className={navItemClass}>
                  Админка
                </Link>
              )
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
};
