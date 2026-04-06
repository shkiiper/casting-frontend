import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  banAdminUser,
  deactivateAdminUser,
  deleteAdminUser,
  getAdminUsers,
  notifyAdminUserMissingPhoto,
  setAdminUserProfileVisibility,
  unbanAdminUser,
  type AdminUser,
} from "@/api/admin";
import { getProfile } from "@/api/profile";

export type AdminUsersFilters = {
  page: number;
  query?: string;
  role?: string;
  size: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  visibility?: "ALL" | "VISIBLE" | "HIDDEN";
};

const USERS_QUERY_KEY = "admin-users";

const canHavePerformerProfile = (role?: string) =>
  role === "ACTOR" || role === "CREATOR" || role === "LOCATION_OWNER" || role === "LOCATION";

const enrichAdminUsers = async (users: AdminUser[]) => {
  const enriched = await Promise.all(
    users.map(async (user) => {
      if (!canHavePerformerProfile(user.role)) return user;
      if (user.mainPhotoUrl || (Array.isArray(user.photoUrls) && user.photoUrls.length > 0)) {
        return user;
      }

      try {
        const profile = await getProfile(user.id);
        return {
          ...user,
          role:
            profile.type === "LOCATION"
              ? "LOCATION_OWNER"
              : profile.type === "ACTOR"
              ? "ACTOR"
              : "CREATOR",
          city: profile.city ?? user.city ?? null,
          description: profile.description ?? user.description ?? null,
          firstName: profile.firstName ?? user.firstName ?? null,
          lastName: profile.lastName ?? user.lastName ?? null,
          displayName: profile.displayName ?? user.displayName ?? null,
          contactPhone: profile.contactPhone ?? user.contactPhone ?? null,
          contactEmail: profile.contactEmail ?? user.contactEmail ?? null,
          contactTelegram: profile.contactTelegram ?? user.contactTelegram ?? null,
          contactWhatsapp: profile.contactWhatsapp ?? user.contactWhatsapp ?? null,
          mainPhotoUrl: profile.mainPhotoUrl ?? user.mainPhotoUrl ?? null,
          photoUrls: profile.photoUrls ?? user.photoUrls ?? [],
          published: profile.published ?? user.published ?? null,
          hasPhoto: Boolean(profile.mainPhotoUrl || profile.photoUrls?.length || user.hasPhoto),
        } satisfies AdminUser;
      } catch {
        return user;
      }
    })
  );

  return enriched;
};

export function useAdminUsersData(filters: AdminUsersFilters) {
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: [USERS_QUERY_KEY, filters],
    queryFn: async () => {
      const page = await getAdminUsers(filters);
      return {
        ...page,
        content: await enrichAdminUsers(page.content ?? []),
      };
    },
  });

  const refreshUsers = async () => {
    await queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
  };

  const banToggleMutation = useMutation({
    mutationFn: async (user: AdminUser) => {
      if (user.banned) {
        await unbanAdminUser(user.id);
        return { ...user, banned: false };
      }
      await banAdminUser(user.id);
      return { ...user, banned: true };
    },
    onSuccess: async () => {
      await refreshUsers();
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (userId: number) => {
      await deactivateAdminUser(userId);
      return userId;
    },
    onSuccess: async () => {
      await refreshUsers();
    },
  });

  const visibilityMutation = useMutation({
    mutationFn: ({ userId, published }: { userId: number; published: boolean }) =>
      setAdminUserProfileVisibility(userId, published),
    onSuccess: async () => {
      await refreshUsers();
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await deleteAdminUser(userId);
      return userId;
    },
    onSuccess: async () => {
      await refreshUsers();
    },
  });

  const notifyMissingPhotoMutation = useMutation({
    mutationFn: async (userId: number) => {
      await notifyAdminUserMissingPhoto(userId);
      return userId;
    },
  });

  return {
    usersQuery,
    banToggleUser: banToggleMutation.mutateAsync,
    deactivateUser: deactivateMutation.mutateAsync,
    updateVisibility: visibilityMutation.mutateAsync,
    deleteUser: deleteUserMutation.mutateAsync,
    notifyMissingPhoto: notifyMissingPhotoMutation.mutateAsync,
    refetchUsers: usersQuery.refetch,
  };
}
