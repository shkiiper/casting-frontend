export const UrlListInput = ({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) => {
  const add = () => onChange([...values, ""]);
  const update = (i: number, v: string) =>
    onChange(values.map((x, idx) => (idx === i ? v : x)));
  const remove = (i: number) =>
    onChange(values.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      {values.map((v, i) => (
        <div key={i} className="flex gap-2">
          <input
            className="flex-1 rounded-xl border px-4 py-2 text-slate-900"
            value={v}
            onChange={(e) => update(i, e.target.value)}
            placeholder="https://..."
          />
          <button onClick={() => remove(i)}>✕</button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-sm text-slate-600 underline"
      >
        + Добавить
      </button>
    </div>
  );
};
