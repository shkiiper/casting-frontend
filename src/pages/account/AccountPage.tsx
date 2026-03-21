// account/AccountPage.tsx
import { useMemo } from "react";
import { useSession } from "@/entities/user/model/authStore";
import { CustomerAccountPage } from "./CustomerAccountPage";
import { ActorProfilePage } from "./ActorProfilePage";
import { CreatorProfilePage } from "./CreatorProfilePage";
import { LocationProfilePage } from "./LocationProfilePage";

export const AccountPage = () => {
  const { role } = useSession();

  return useMemo(() => {
    switch (role) {
      case "CUSTOMER":
        return <CustomerAccountPage />;
      case "ACTOR":
        return <ActorProfilePage />;
      case "CREATOR":
        return <CreatorProfilePage />;
      case "LOCATION_OWNER":
        return <LocationProfilePage />;
      default:
        return (
          <div className="px-8 py-10">
            <div className="text-lg font-semibold">
              Роль аккаунта не определена
            </div>
            <div className="mt-2 text-sm text-slate-600">
              Перезайдите в аккаунт
            </div>
          </div>
        );
    }
  }, [role]);
};
