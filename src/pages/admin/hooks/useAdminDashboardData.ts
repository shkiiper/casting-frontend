import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdminPlanBasics,
  deleteAdminPlan,
  getAdminPlans,
  getAdminStats,
  getCatalogRoleCounts,
  updateAdminPlan,
  updateAdminPlanBasics,
  updateAdminPlanBooster,
  updateAdminPlanCasting,
  updateAdminPlanPremium,
  type AdminPlan,
  type AdminPlanBasicsPayload,
  type AdminPlanBoosterPayload,
  type AdminPlanCastingPayload,
  type AdminPlanPayload,
  type AdminPlanPremiumPayload,
  type AdminStatsResponse,
  type RoleCounts,
} from "@/api/admin";

type AdminDashboardData = {
  plans: AdminPlan[];
  roleCountsFallback: RoleCounts | null;
  stats: AdminStatsResponse | null;
};

const DASHBOARD_QUERY_KEY = ["admin-dashboard"] as const;

const hasRoleCounts = (stats: AdminStatsResponse | null) =>
  Boolean(
    stats &&
      (stats.actorsCount !== undefined ||
        stats.actors !== undefined ||
        stats.creatorsCount !== undefined ||
        stats.creators !== undefined ||
        stats.locationOwnersCount !== undefined ||
        stats.locationOwners !== undefined ||
        stats.customersCount !== undefined ||
        stats.customers !== undefined)
  );

export function useAdminDashboardData() {
  const queryClient = useQueryClient();

  const dashboardQuery = useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: async (): Promise<AdminDashboardData> => {
      const [stats, plans] = await Promise.all([getAdminStats(), getAdminPlans()]);
      const roleCountsFallback =
        hasRoleCounts(stats) ? null : await getCatalogRoleCounts().catch(() => null);

      return {
        stats,
        plans,
        roleCountsFallback,
      };
    },
  });

  const patchPlans = (updater: (plans: AdminPlan[]) => AdminPlan[]) => {
    queryClient.setQueryData<AdminDashboardData | undefined>(
      DASHBOARD_QUERY_KEY,
      (current) =>
        current
          ? {
              ...current,
              plans: updater(current.plans),
            }
          : current
    );
  };

  const createPlanMutation = useMutation({
    mutationFn: (payload: AdminPlanBasicsPayload) => createAdminPlanBasics(payload),
    onSuccess: (created) => {
      patchPlans((plans) => [created, ...plans]);
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id: number) => deleteAdminPlan(id),
    onSuccess: (_, id) => {
      patchPlans((plans) => plans.filter((plan) => plan.id !== id));
    },
  });

  const savePlanMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AdminPlanPayload }) =>
      updateAdminPlan(id, payload),
    onSuccess: (updated) => {
      patchPlans((plans) => plans.map((plan) => (plan.id === updated.id ? updated : plan)));
    },
  });

  const saveBaseMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AdminPlanBasicsPayload }) =>
      updateAdminPlanBasics(id, payload),
    onSuccess: (updated) => {
      patchPlans((plans) => plans.map((plan) => (plan.id === updated.id ? updated : plan)));
    },
  });

  const saveBoosterMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AdminPlanBoosterPayload }) =>
      updateAdminPlanBooster(id, payload),
    onSuccess: (updated) => {
      patchPlans((plans) => plans.map((plan) => (plan.id === updated.id ? updated : plan)));
    },
  });

  const saveCastingMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AdminPlanCastingPayload }) =>
      updateAdminPlanCasting(id, payload),
    onSuccess: (updated) => {
      patchPlans((plans) => plans.map((plan) => (plan.id === updated.id ? updated : plan)));
    },
  });

  const savePremiumMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AdminPlanPremiumPayload }) =>
      updateAdminPlanPremium(id, payload),
    onSuccess: (updated) => {
      patchPlans((plans) => plans.map((plan) => (plan.id === updated.id ? updated : plan)));
    },
  });

  return {
    dashboardQuery,
    createPlan: createPlanMutation.mutateAsync,
    deletePlan: deletePlanMutation.mutateAsync,
    savePlan: savePlanMutation.mutateAsync,
    saveBase: saveBaseMutation.mutateAsync,
    saveBooster: saveBoosterMutation.mutateAsync,
    saveCasting: saveCastingMutation.mutateAsync,
    savePremium: savePremiumMutation.mutateAsync,
  };
}
