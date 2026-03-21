import type { ProfileCompletionState } from "@/shared/lib/profileCompletion";

export const ProfileCompletionCard = ({
  completion,
  title = "Заполненность профиля",
}: {
  completion: ProfileCompletionState;
  title?: string;
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-sm text-slate-500">
          Заполнено {completion.completed} из {completion.total} ключевых блоков
        </div>
      </div>
      <div className="rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
        {completion.percent}%
      </div>
    </div>

    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full bg-slate-900 transition-[width]"
        style={{ width: `${completion.percent}%` }}
      />
    </div>

    {completion.missing.length > 0 ? (
      <div className="mt-4">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Не хватает для сильного профиля
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {completion.missing.map((item) => (
            <span
              key={item}
              className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    ) : (
      <div className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        Профиль выглядит заполненным и готовым к показу.
      </div>
    )}
  </div>
);
