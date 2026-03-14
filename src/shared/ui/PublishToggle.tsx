type PublishToggleProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
};

export const PublishToggle = ({
  checked,
  onChange,
  disabled = false,
}: PublishToggleProps) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-base md:text-lg font-semibold text-slate-900">
            Публикация в каталоге
          </div>
          <div className="text-sm text-slate-500 mt-1">
            Включите, чтобы профиль был виден заказчикам в каталоге.
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          disabled={disabled}
          className={[
            "relative inline-flex h-8 w-14 items-center rounded-full transition-colors",
            checked ? "bg-slate-900" : "bg-slate-300",
            disabled ? "opacity-60 cursor-not-allowed" : "",
          ].join(" ")}
        >
          <span
            className={[
              "inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform",
              checked ? "translate-x-7" : "translate-x-1",
            ].join(" ")}
          />
        </button>
      </div>
    </div>
  );
};
