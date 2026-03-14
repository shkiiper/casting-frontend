import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuthStore } from "../../entities/user/model/authStore";

interface Props {
  children: ReactNode;
}

export const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <div>Загрузка...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
