import { useEffect } from "react";
import { useBlocker } from "react-router-dom";

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

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (!shouldBlock) return false;

    return (
      currentLocation.pathname !== nextLocation.pathname ||
      currentLocation.search !== nextLocation.search ||
      currentLocation.hash !== nextLocation.hash
    );
  });

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    onBlocked();
    blocker.reset();
  }, [blocker, onBlocked]);

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
