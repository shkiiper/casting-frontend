type HeaderPublishSwitchProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
};

export const HeaderPublishSwitch = ({
  checked,
  onChange,
  disabled = false,
}: HeaderPublishSwitchProps) => {
  return (
    <div
      className={[
        "inline-flex items-center gap-3 rounded-xl border bg-white px-3 py-2 transition-colors",
        checked ? "border-emerald-300 shadow-[0_0_0_3px_rgba(16,185,129,0.10)]" : "border-slate-300",
      ].join(" ")}
    >
      <span className="text-sm font-medium text-slate-800 whitespace-nowrap">
        Показывать в каталоге
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={[
          "relative inline-flex h-7 w-12 items-center rounded-full transition-colors shadow-inner",
          checked ? "bg-emerald-500" : "bg-slate-300",
          disabled ? "opacity-60 cursor-not-allowed" : "",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          ].join(" ")}
        />
      </button>
    </div>
  );
};
