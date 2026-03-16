type UnknownRecord = Record<string, unknown>;

const MAX_DEFAULT_TEXT = 5000;

export const trimToNull = (value: unknown, maxLength = MAX_DEFAULT_TEXT) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
};

export const trimMultilineToNull = (value: unknown, maxLength = MAX_DEFAULT_TEXT) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
};

export const toOptionalNumber = (
  value: unknown,
  { min, max, integer = false }: { min?: number; max?: number; integer?: boolean } = {}
) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value.trim().replace(",", "."))
      : Number.NaN;

  if (!Number.isFinite(parsed)) return null;
  let next = integer ? Math.trunc(parsed) : parsed;
  if (typeof min === "number") next = Math.max(min, next);
  if (typeof max === "number") next = Math.min(max, next);
  return next;
};

export const normalizeStringArray = (
  value: unknown,
  { maxItems = 20, maxItemLength = 500 }: { maxItems?: number; maxItemLength?: number } = {}
) => {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();

  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    unique.add(trimmed.slice(0, maxItemLength));
    if (unique.size >= maxItems) break;
  }

  return Array.from(unique);
};

export const normalizeUploadedUrls = (
  value: unknown,
  { maxItems = 20 }: { maxItems?: number } = {}
) =>
  normalizeStringArray(value, {
    maxItems,
    maxItemLength: 1500,
  }).filter((item) => /^https?:\/\//i.test(item) || item.startsWith("/"));

export const mergeUniqueUrls = (
  current: string[],
  incoming: unknown,
  { maxItems = 20 }: { maxItems?: number } = {}
) =>
  normalizeStringArray([...current, ...normalizeUploadedUrls(incoming, { maxItems })], {
    maxItems,
    maxItemLength: 1500,
  });

export const sanitizeEmail = (value: unknown) => {
  const normalized = trimToNull(value, 254);
  if (!normalized) return null;
  return normalized.toLowerCase();
};

export const sanitizeTelegram = (value: unknown) => {
  const normalized = trimToNull(value, 64);
  if (!normalized) return null;
  return normalized.replace(/^@+/, "");
};

export const sanitizePhone = (value: unknown) => {
  const normalized = trimToNull(value, 32);
  if (!normalized) return null;
  return normalized.replace(/[^\d+\-() ]/g, "");
};

export const sanitizeHttpUrl = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
};

export const sanitizeInternalPath = (value: unknown, fallback = "/account") => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  return trimmed;
};

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  const message =
    (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof message === "string" && message.trim() ? message.trim() : fallback;
};

export const isNonEmptyObject = (value: unknown): value is UnknownRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
