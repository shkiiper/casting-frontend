import { lazy, Suspense, useEffect, useState } from "react";
import "./AuthSplineVisual.css";

const Spline = lazy(() => import("@splinetool/react-spline"));

const AUTH_SCENE_URL =
  "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode";

export function AuthSplineVisual() {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 901px)");
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const updateVisibility = () => {
      setShouldRender(desktopQuery.matches && !reducedMotionQuery.matches);
    };

    updateVisibility();
    desktopQuery.addEventListener("change", updateVisibility);
    reducedMotionQuery.addEventListener("change", updateVisibility);

    return () => {
      desktopQuery.removeEventListener("change", updateVisibility);
      reducedMotionQuery.removeEventListener("change", updateVisibility);
    };
  }, []);

  if (!shouldRender) return null;

  return (
    <div className="auth-spline" aria-hidden="true">
      <Suspense fallback={<div className="auth-spline-glow" />}>
        <Spline scene={AUTH_SCENE_URL} className="auth-spline-canvas" />
      </Suspense>
    </div>
  );
}
