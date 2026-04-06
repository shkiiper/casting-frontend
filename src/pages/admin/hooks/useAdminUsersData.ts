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

export function useAdminUsersData(filters: AdminUsersFilters) {
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: [USERS_QUERY_KEY, filters],
    queryFn: () => getAdminUsers(filters),
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
