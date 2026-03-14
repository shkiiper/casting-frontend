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
    <div className="inline-flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2">
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
          "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
          checked ? "bg-slate-900" : "bg-slate-300",
          disabled ? "opacity-60 cursor-not-allowed" : "",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          ].join(" ")}
        />
      </button>
    </div>
  );
};
