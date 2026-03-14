export type CastingApplication = {
  id: string;
  castingId: number;
  castingTitle: string;
  castingCity: string | null;
  castingType: string | null;
  applicantProfileId: number | null;
  applicantName: string;
  applicantCity: string | null;
  applicantRole: string | null;
  applicantContact: string;
  createdAt: string;
};

const STORAGE_KEY = "castingApplicationsV1";

function readRaw(): CastingApplication[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CastingApplication[];
  } catch {
    return [];
  }
}

function writeRaw(items: CastingApplication[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getCastingApplications(): CastingApplication[] {
  return readRaw().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addCastingApplication(
  payload: Omit<CastingApplication, "id" | "createdAt">
) {
  const current = readRaw();
  const exists = current.some(
    (item) =>
      item.castingId === payload.castingId &&
      item.applicantProfileId != null &&
      item.applicantProfileId === payload.applicantProfileId
  );

  if (exists) {
    return { created: false };
  }

  const next: CastingApplication = {
    ...payload,
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  };

  writeRaw([next, ...current]);
  return { created: true, item: next };
}
