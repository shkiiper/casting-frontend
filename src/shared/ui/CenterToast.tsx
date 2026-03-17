type CenterToastProps = {
  message: string;
  variant?: "success" | "error" | "info";
};

export function CenterToast({
  message,
  variant = "success",
}: CenterToastProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[80] flex justify-center pointer-events-none px-4 pb-4 md:inset-0 md:items-center md:pb-0"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div
        className={[
          "w-full max-w-md rounded-2xl border px-5 py-4 text-sm font-medium shadow-[0_16px_40px_rgba(15,23,42,0.18)] backdrop-blur",
          variant === "error"
            ? "border-red-200/80 bg-red-50/95 text-red-800"
            : variant === "info"
            ? "border-blue-200/80 bg-blue-50/95 text-blue-900"
            : "border-emerald-200/70 bg-emerald-50/95 text-emerald-800",
        ].join(" ")}
        role="status"
        aria-live="polite"
      >
        {message}
      </div>
    </div>
  );
}
