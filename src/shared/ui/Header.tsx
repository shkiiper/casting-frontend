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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-black/5">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.jpeg" alt="onset" className="w-9 h-9 rounded-xl object-cover" />
          <span className="text-sm font-semibold tracking-[0.12em] text-slate-700">
            ONSET
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex">
          <Link to="/actors">Актёры</Link>
          <Link to="/creators">Креаторы</Link>
          <Link to="/locations">Локации</Link>
          <Link to="/ads">Объявления</Link>
        </nav>

        <div className="flex items-center gap-3">
          {!isAuthed ? (
            <Link to="/login" className="text-sm text-slate-700">
              Войти/Регистрация
            </Link>
          ) : (
            <>
              <button
                onClick={() => navigate("/account")}
                className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border border-black/5"
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
