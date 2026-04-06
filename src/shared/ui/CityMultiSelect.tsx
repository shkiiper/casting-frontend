import { useEffect, useMemo, useRef, useState } from "react";
import {
  getCityOptions,
  parseCitiesValue,
  stringifyCitiesValue,
} from "@/shared/lib/cities";

type CityMultiSelectProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export const CityMultiSelect = ({
  value,
  onChange,
  placeholder = "Выберите города",
}: CityMultiSelectProps) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedValues = useMemo(() => parseCitiesValue(value), [value]);
  const options = useMemo(() => getCityOptions(selectedValues), [selectedValues]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toggleValue = (city: string) => {
    const nextValues = selectedValues.includes(city)
      ? selectedValues.filter((item) => item !== city)
      : [...selectedValues, city];
    onChange(stringifyCitiesValue(nextValues));
  };

  const clearValue = () => onChange("");

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-left text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/30 focus:border-slate-400"
      >
        <span className={selectedValues.length ? "text-slate-700" : "text-slate-400"}>
          {selectedValues.length ? selectedValues.join(", ") : placeholder}
        </span>
        <span className="shrink-0 text-slate-400" aria-hidden="true">
          ▾
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 z-20 mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">Можно отметить несколько городов</div>
            <button
              type="button"
              onClick={clearValue}
              className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
            >
              Очистить
            </button>
          </div>
          <div className="grid max-h-72 gap-1 overflow-auto sm:grid-cols-2">
            {options.map((city) => {
              const checked = selectedValues.includes(city);
              return (
                <label
                  key={city}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleValue(city)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                  />
                  <span>{city}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};
