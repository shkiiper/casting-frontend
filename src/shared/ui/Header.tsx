import { Link, useNavigate } from "react-router-dom";
import { useSession } from "@/entities/user/model/authStore";
import { resolveMediaUrl, useProfileAvatar } from "@/shared/ui/useProfileAvatar";

export const Header = () => {
  const navigate = useNavigate();
  const { avatarUrl, isAuthed } = useProfileAvatar();
  const { logout } = useSession();

  const onLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 text-slate-900 shadow-[0_12px_36px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.jpeg" alt="onset" className="w-9 h-9 rounded-xl object-cover" />
          <span className="text-sm font-semibold tracking-[0.12em] text-slate-900">
            ONSET
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <Link to="/actors">Актёры</Link>
          <Link to="/creators">Креаторы</Link>
          <Link to="/locations">Локации</Link>
          <Link to="/ads">Объявления</Link>
        </nav>

        <div className="flex items-center gap-3">
          {!isAuthed ? (
            <Link to="/login" className="text-sm text-slate-700 hover:text-slate-900">
              Войти/Регистрация
            </Link>
          ) : (
            <>
              <button
                onClick={() => navigate("/account")}
                className="h-10 w-10 overflow-hidden rounded-full border border-black/5 bg-slate-200"
                aria-label="Профиль"
              >
                {avatarUrl ? (
                  <img
                    src={resolveMediaUrl(avatarUrl) ?? undefined}
                    className="w-full h-full object-cover"
                    alt="Профиль"
                  />
                ) : null}
              </button>
              <button onClick={onLogout} className="text-sm text-red-600">
                Выйти
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
