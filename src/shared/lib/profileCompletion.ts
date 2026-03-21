export type ProfileCompletionItem = {
  label: string;
  done: boolean;
};

export type ProfileCompletionState = {
  completed: number;
  missing: string[];
  percent: number;
  total: number;
};

export const hasTextValue = (value: unknown) =>
  typeof value === "string" ? value.trim().length > 0 : false;

export const hasListValue = (value: unknown) =>
  Array.isArray(value) ? value.some((item) => hasTextValue(item)) : false;

export const hasNumberValue = (value: unknown) =>
  typeof value === "number" ? Number.isFinite(value) && value > 0 : false;

export const buildProfileCompletion = (
  items: ProfileCompletionItem[]
): ProfileCompletionState => {
  const total = items.length;
  const completed = items.filter((item) => item.done).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    completed,
    missing: items.filter((item) => !item.done).map((item) => item.label),
    percent,
    total,
  };
};
