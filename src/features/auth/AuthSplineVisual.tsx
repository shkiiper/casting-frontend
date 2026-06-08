import { lazy, Suspense, useEffect, useRef, useState } from "react";
import "./AuthSplineVisual.css";

const Spline = lazy(() => import("@splinetool/react-spline"));

const AUTH_SCENE_URL =
  "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode";

export function AuthSplineVisual() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 901px)");
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    let loadTimer: number | undefined;

    const updateVisibility = () => {
      window.clearTimeout(loadTimer);

      if (!desktopQuery.matches || reducedMotionQuery.matches) {
        setShouldRender(false);
        return;
      }

      loadTimer = window.setTimeout(() => setShouldRender(true), 300);
    };

    updateVisibility();
    desktopQuery.addEventListener("change", updateVisibility);
    reducedMotionQuery.addEventListener("change", updateVisibility);

    return () => {
      window.clearTimeout(loadTimer);
      desktopQuery.removeEventListener("change", updateVisibility);
      reducedMotionQuery.removeEventListener("change", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!shouldRender) return;

    const followCursor = (event: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;

      const rect = root.getBoundingClientRect();
      const pointerX = (event.clientX - rect.left) / rect.width - 0.5;
      const pointerY = (event.clientY - rect.top) / rect.height - 0.5;
      root.style.setProperty("--brand-rotate-y", `${pointerX * 7}deg`);
      root.style.setProperty("--brand-rotate-x", `${pointerY * -5}deg`);

      const canvas = root.querySelector("canvas");
      if (!canvas || event.target === canvas) return;

      canvas.dispatchEvent(
        new PointerEvent("pointermove", {
          clientX: event.clientX,
          clientY: event.clientY,
          pointerId: event.pointerId,
          pointerType: event.pointerType,
        })
      );
    };

    window.addEventListener("pointermove", followCursor, { capture: true });
    return () => {
      window.removeEventListener("pointermove", followCursor, { capture: true });
    };
  }, [shouldRender]);

  if (!shouldRender) return null;

  return (
    <div ref={rootRef} className="auth-spline" aria-hidden="true">
      <Suspense fallback={<div className="auth-spline-glow" />}>
        <Spline scene={AUTH_SCENE_URL} className="auth-spline-canvas" />
      </Suspense>
      <div className="auth-spline-brand">
        <span className="auth-spline-brand-name">ONSET</span>
        <span className="auth-spline-brand-model">MODEL 01</span>
      </div>
    </div>
  );
}
