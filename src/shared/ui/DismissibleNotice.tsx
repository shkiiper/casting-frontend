type DismissibleNoticeProps = {
  message: string;
  onClose: () => void;
  className?: string;
};

export function DismissibleNotice({
  message,
  onClose,
  className = "",
}: DismissibleNoticeProps) {
  return (
    <div
      className={[
        "relative mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 pr-12 text-sm text-amber-900",
        className,
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Закрыть предупреждение"
        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-900"
      >
        x
      </button>
      {message}
    </div>
  );
}
