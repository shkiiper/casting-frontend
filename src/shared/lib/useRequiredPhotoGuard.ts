import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export const REQUIRED_PROFILE_PHOTO_MESSAGE =
  "Загрузите хотя бы одно фото профиля. Это обязательно для выхода из личного кабинета и отображения профиля в каталоге.";

type UseRequiredPhotoGuardParams = {
  enabled: boolean;
  hasPhoto: boolean;
  onBlocked: () => void;
};

export function useRequiredPhotoGuard({
  enabled,
  hasPhoto,
  onBlocked,
}: UseRequiredPhotoGuardParams) {
  const shouldBlock = enabled && !hasPhoto;
  const navigate = useNavigate();
  const location = useLocation();
  const currentUrl = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    if (!shouldBlock) return;

    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const nextUrl = new URL(anchor.href, window.location.href);
      const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;

      if (nextUrl.origin !== window.location.origin) return;
      if (nextPath === currentUrl) return;

      event.preventDefault();
      event.stopPropagation();
      onBlocked();
    };

    const handlePopState = () => {
      onBlocked();
      navigate(currentUrl, { replace: true });
    };

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [currentUrl, navigate, onBlocked, shouldBlock]);

  useEffect(() => {
    if (!shouldBlock) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [shouldBlock]);
}
