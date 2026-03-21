import api from "@/api/client";
import publicApi from "@/shared/api/publicClient";
import type { PageResponse } from "@/types/common";
import type { ProfileResponse } from "@/types/profile";

export type AdminStatsResponse = {
  contactViews?: number;
  payments?: number;
  castings?: number;
  siteVisits?: number;
  visitsCount?: number;
  visitorsCount?: number;
  uniqueVisitors?: number;
  totalVisitors?: number;
  revenue?: number;
  totalRevenue?: number;
  transactionAmount?: number;
  transactionsAmount?: number;
  turnover?: number;
  views?: number;
  totalViews?: number;
  actorsCount?: number;
  creatorsCount?: number;
  locationOwnersCount?: number;
  customersCount?: number;
  actors?: number;
  creators?: number;
  locationOwners?: number;
  customers?: number;
};

export type AdminPlan = {
  id: number;
  name: string;
  pricePerPeriod: number;
  periodDays: number;
  baseContactLimit: number;
  boosterPrice: number;
  boosterContacts: number;
  castingPostPrice: number;
  castingPostDays: number;
  premiumProfilePrice: number;
  premiumProfileDays: number;
  active: boolean;
};

export type AdminPlanPayload = Omit<AdminPlan, "id">;

export type AdminPlanBasicsPayload = Pick<
  AdminPlanPayload,
  "name" | "pricePerPeriod" | "periodDays" | "baseContactLimit" | "active"
>;

export type AdminPlanBoosterPayload = Pick<
  AdminPlanPayload,
  "boosterPrice" | "boosterContacts"
>;

export type AdminPlanCastingPayload = Pick<
  AdminPlanPayload,
  "castingPostPrice" | "castingPostDays"
>;

export type AdminPlanPremiumPayload = Pick<
  AdminPlanPayload,
  "premiumProfilePrice" | "premiumProfileDays"
>;

export async function getAdminStats() {
  const { data } = await api.get<AdminStatsResponse>("/api/admin/stats");
  return data;
}

export async function getAdminPlans() {
  const { data } = await api.get<AdminPlan[]>("/api/admin/plans");
  return data;
}

export async function createAdminPlan(payload: AdminPlanPayload) {
  const { data } = await api.post<AdminPlan>("/api/admin/plans", payload);
  return data;
}

export async function createAdminPlanBasics(payload: AdminPlanBasicsPayload) {
  const { data } = await api.post<AdminPlan>("/api/admin/plans/basics", payload);
  return data;
}

export async function updateAdminPlan(id: number, payload: AdminPlanPayload) {
  const { data } = await api.put<AdminPlan>(`/api/admin/plans/${id}`, payload);
  return data;
}

export async function updateAdminPlanBasics(
  id: number,
  payload: AdminPlanBasicsPayload
) {
  const { data } = await api.put<AdminPlan>(`/api/admin/plans/${id}/basics`, payload);
  return data;
}

export async function updateAdminPlanBooster(
  id: number,
  payload: AdminPlanBoosterPayload
) {
  const { data } = await api.put<AdminPlan>(`/api/admin/plans/${id}/booster`, payload);
  return data;
}

export async function updateAdminPlanCasting(
  id: number,
  payload: AdminPlanCastingPayload
) {
  const { data } = await api.put<AdminPlan>(`/api/admin/plans/${id}/casting`, payload);
  return data;
}

export async function updateAdminPlanPremium(
  id: number,
  payload: AdminPlanPremiumPayload
) {
  const { data } = await api.put<AdminPlan>(`/api/admin/plans/${id}/premium`, payload);
  return data;
}

export async function deleteAdminPlan(id: number) {
  await api.delete(`/api/admin/plans/${id}`);
}

export type RoleCounts = {
  actors: number;
  creators: number;
  locationOwners: number;
  customers: number;
};

export async function getCatalogRoleCounts(): Promise<RoleCounts> {
  const [actorsRes, creatorsRes, locationsRes, customerPage] = await Promise.all([
    publicApi.get<PageResponse<unknown>>("/api/catalog/actors", {
      params: { page: 0, size: 1 },
    }),
    publicApi.get<PageResponse<unknown>>("/api/catalog/creators", {
      params: { page: 0, size: 1 },
    }),
    publicApi.get<PageResponse<unknown>>("/api/catalog/locations", {
      params: { page: 0, size: 1 },
    }),
    getAdminUsers({
      page: 0,
      size: 1,
      role: "CUSTOMER",
      sortBy: "id",
      sortDir: "desc",
    }).catch(() => ({
      content: [],
      page: 0,
      size: 1,
      totalElements: 0,
      totalPages: 1,
      last: true,
    })),
  ]);

  return {
    actors: actorsRes.data.totalElements ?? 0,
    creators: creatorsRes.data.totalElements ?? 0,
    locationOwners: locationsRes.data.totalElements ?? 0,
    customers: customerPage.totalElements ?? customerPage.content.length ?? 0,
  };
}

export type AdminPerformerProfile = ProfileResponse & {
  rentPrice?: number | null;
  rentPriceUnit?: string | null;
  bio?: string | null;
};

export type AdminCustomerUser = {
  id: number;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  description?: string | null;
  telegram?: string | null;
  role?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contactTelegram?: string | null;
  minRate?: number | null;
  rateUnit?: string | null;
  mainPhotoUrl?: string | null;
  photoUrls?: string[] | null;
  hasPhoto?: boolean | null;
  emailVerified?: boolean | null;
  lastLoginAt?: string | null;
  lastActivityAt?: string | null;
};

type CatalogItem = {
  id: number;
};

async function getCatalogIds(endpoint: string): Promise<number[]> {
  const { data } = await publicApi.get<PageResponse<CatalogItem>>(endpoint, {
    params: { page: 0, size: 500 },
  });
  return (data.content ?? []).map((item) => item.id);
}

export async function getAdminPerformerProfiles() {
  const [actorIds, creatorIds, locationIds] = await Promise.all([
    getCatalogIds("/api/catalog/actors"),
    getCatalogIds("/api/catalog/creators"),
    getCatalogIds("/api/catalog/locations"),
  ]);

  const uniqueIds = Array.from(new Set([...actorIds, ...creatorIds, ...locationIds]));
  if (!uniqueIds.length) {
    return [] as AdminPerformerProfile[];
  }

  const profiles = await Promise.allSettled(
    uniqueIds.map((id) => api.get<AdminPerformerProfile>(`/api/profile/${id}`))
  );

  return profiles
    .filter((item) => item.status === "fulfilled")
    .map((item) => {
      const response = item as PromiseFulfilledResult<{
        data: AdminPerformerProfile;
      }>;
      return response.value.data;
    });
}

export async function getAdminCustomers(): Promise<AdminCustomerUser[]> {
  try {
    const { data } = await api.get<AdminCustomerUser[]>("/api/admin/users", {
      params: { role: "CUSTOMER" },
    });
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export type AdminUser = {
  id: number;
  role: "ACTOR" | "CREATOR" | "LOCATION_OWNER" | "CUSTOMER" | "ADMIN" | string;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  description?: string | null;
  telegram?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contactTelegram?: string | null;
  contactWhatsapp?: string | null;
  minRate?: number | null;
  rateUnit?: string | null;
  published?: boolean | null;
  hasPhoto?: boolean | null;
  emailVerified?: boolean | null;
  lastLoginAt?: string | null;
  lastActivityAt?: string | null;
  active?: boolean;
  banned?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AdminUsersQuery = {
  page: number;
  size: number;
  role?: string;
  visibility?: "ALL" | "VISIBLE" | "HIDDEN";
  query?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

const toComparable = (value: unknown): string | number => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value;
  return String(value).toLowerCase();
};

const sortUsers = (
  users: AdminUser[],
  sortBy: string,
  sortDir: "asc" | "desc"
): AdminUser[] => {
  const dir = sortDir === "asc" ? 1 : -1;
  return [...users].sort((a, b) => {
    const av = toComparable((a as Record<string, unknown>)[sortBy]);
    const bv = toComparable((b as Record<string, unknown>)[sortBy]);
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
};

const filterUsers = (
  users: AdminUser[],
  role?: string,
  query?: string,
  visibility?: "ALL" | "VISIBLE" | "HIDDEN"
) => {
  const normalizedQuery = query?.trim().toLowerCase();
  return users.filter((user) => {
    if (role && user.role !== role) return false;
    if (visibility === "VISIBLE" && user.published !== true) return false;
    if (visibility === "HIDDEN" && user.published !== false) return false;
    if (!normalizedQuery) return true;
    const haystack = [
      user.id,
      user.email,
      user.phone,
      user.contactPhone,
      user.contactEmail,
      user.contactTelegram,
      user.contactWhatsapp,
      user.telegram,
      user.firstName,
      user.lastName,
      user.displayName,
      user.city,
      user.description,
      user.role,
    ]
      .filter((v) => v !== null && v !== undefined)
      .map((v) => String(v).toLowerCase());
    return haystack.some((value) => value.includes(normalizedQuery));
  });
};

const paginateUsers = (
  users: AdminUser[],
  page: number,
  size: number
): PageResponse<AdminUser> => {
  const safeSize = Math.max(1, size || 20);
  const safePage = Math.max(0, page || 0);
  const totalElements = users.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / safeSize));
  const from = safePage * safeSize;
  const to = from + safeSize;
  return {
    content: users.slice(from, to),
    page: safePage,
    size: safeSize,
    totalElements,
    totalPages,
    last: safePage >= totalPages - 1,
  };
};

const performerToAdminUser = (profile: AdminPerformerProfile): AdminUser => ({
  id: profile.id,
  role:
    profile.type === "LOCATION"
      ? "LOCATION_OWNER"
      : profile.type === "ACTOR"
      ? "ACTOR"
      : "CREATOR",
  email: profile.contactEmail ?? null,
  phone: profile.contactPhone ?? null,
  city: profile.city ?? null,
  description: profile.description ?? profile.bio ?? null,
  telegram: profile.contactTelegram ?? null,
  firstName: profile.firstName ?? null,
  lastName: profile.lastName ?? null,
  displayName: profile.displayName ?? null,
  contactPhone: profile.contactPhone ?? null,
  contactEmail: profile.contactEmail ?? null,
  contactTelegram: profile.contactTelegram ?? null,
  contactWhatsapp: profile.contactWhatsapp ?? null,
  minRate: profile.minRate ?? profile.rentPrice ?? null,
  rateUnit: profile.rateUnit ?? profile.rentPriceUnit ?? null,
  published: profile.published ?? null,
  hasPhoto: Boolean(profile.mainPhotoUrl || profile.photoUrls?.length),
  lastActivityAt: null,
  active: true,
  banned: false,
});

export async function getAdminUsers(params: AdminUsersQuery) {
  try {
    const { data } = await api.get<PageResponse<AdminUser>>("/api/admin/users", {
      params,
    });
    if (data && Array.isArray(data.content)) {
      return data;
    }
    throw new Error("Unexpected admin users page shape");
  } catch {
    try {
      const { data } = await api.get<AdminUser[] | PageResponse<AdminUser>>(
        "/api/admin/users",
        {
          params: {
            role: params.role,
            query: params.query,
            sortBy: params.sortBy,
            sortDir: params.sortDir,
          },
        }
      );
      if (Array.isArray(data)) {
        const filtered = filterUsers(data, params.role, params.query, params.visibility);
        const sorted = sortUsers(
          filtered,
          params.sortBy ?? "createdAt",
          params.sortDir ?? "desc"
        );
        return paginateUsers(sorted, params.page, params.size);
      }
      if (data && Array.isArray(data.content)) {
        const filtered = filterUsers(data.content, params.role, params.query, params.visibility);
        const sorted = sortUsers(
          filtered,
          params.sortBy ?? "createdAt",
          params.sortDir ?? "desc"
        );
        return paginateUsers(sorted, params.page, params.size);
      }
    } catch {
      // ignore and fallback to catalog/profile aggregation
    }

    const [performers, customers] = await Promise.all([
      getAdminPerformerProfiles().catch(() => [] as AdminPerformerProfile[]),
      getAdminCustomers().catch(() => [] as AdminCustomerUser[]),
    ]);

    const performerUsers = performers.map(performerToAdminUser);
    const customerUsers: AdminUser[] = customers.map((user) => ({
      id: user.id,
      role: user.role || "CUSTOMER",
      email: user.email ?? user.contactEmail ?? null,
      phone: user.phone ?? user.contactPhone ?? null,
      city: user.city ?? null,
      description: user.description ?? null,
      telegram: user.telegram ?? user.contactTelegram ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      displayName: user.displayName ?? null,
      contactPhone: user.contactPhone ?? null,
      contactEmail: user.contactEmail ?? null,
      contactTelegram: user.contactTelegram ?? null,
      minRate: user.minRate ?? null,
      rateUnit: user.rateUnit ?? null,
      hasPhoto:
        typeof user.hasPhoto === "boolean"
          ? user.hasPhoto
          : Boolean(user.mainPhotoUrl || user.photoUrls?.length),
      emailVerified: user.emailVerified ?? null,
      lastLoginAt: user.lastLoginAt ?? null,
      lastActivityAt: user.lastActivityAt ?? null,
      published: null,
      active: true,
      banned: false,
    }));

    const mergedById = new Map<number, AdminUser>();
    [...performerUsers, ...customerUsers].forEach((user) => {
      mergedById.set(user.id, { ...(mergedById.get(user.id) || {}), ...user });
    });

    const merged = Array.from(mergedById.values());
    const filtered = filterUsers(merged, params.role, params.query, params.visibility);
    const sorted = sortUsers(
      filtered,
      params.sortBy ?? "createdAt",
      params.sortDir ?? "desc"
    );
    return paginateUsers(sorted, params.page, params.size);
  }
}

export async function banAdminUser(userId: number) {
  await api.post(`/api/admin/users/${userId}/ban`);
}

export async function unbanAdminUser(userId: number) {
  await api.post(`/api/admin/users/${userId}/unban`);
}

export async function deactivateAdminUser(userId: number) {
  await api.post(`/api/admin/users/${userId}/deactivate`);
}

export async function notifyAdminUserMissingPhoto(userId: number) {
  await api.post(`/api/admin/users/${userId}/notify-missing-photo`);
}

export async function setAdminUserProfileVisibility(
  userId: number,
  published: boolean
) {
  const { data } = await api.post<AdminUser>(
    `/api/admin/users/${userId}/profile/visibility`,
    null,
    {
      params: { published },
    }
  );
  return data;
}

export async function deleteAdminUser(userId: number) {
  await api.delete(`/api/admin/users/${userId}`);
}
