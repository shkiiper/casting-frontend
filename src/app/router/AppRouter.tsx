import { Suspense, lazy } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";

const LoginPage = lazy(() =>
  import("../../features/auth/LoginPage").then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = lazy(() =>
  import("../../features/auth/RegisterPage").then((m) => ({
    default: m.RegisterPage,
  }))
);
const CheckEmailPage = lazy(() =>
  import("../../pages/auth/CheckEmailPage").then((m) => ({
    default: m.CheckEmailPage,
  }))
);
const VerifyEmailPage = lazy(() =>
  import("../../pages/auth/VerifyEmailPage").then((m) => ({
    default: m.VerifyEmailPage,
  }))
);
const ResetPasswordPage = lazy(() =>
  import("../../pages/auth/ResetPasswordPage").then((m) => ({
    default: m.ResetPasswordPage,
  }))
);
const HomePage = lazy(() =>
  import("../../pages/landing/HomePage").then((m) => ({ default: m.HomePage }))
);
const CatalogPage = lazy(() =>
  import("../../pages/catalog/CatalogPage").then((m) => ({
    default: m.CatalogPage,
  }))
);
const ProfileDetailsPage = lazy(() =>
  import("../../pages/catalog/ProfileDetailsPage").then((m) => ({
    default: m.ProfileDetailsPage,
  }))
);
const AccountPage = lazy(() =>
  import("../../pages/account/AccountPage").then((m) => ({
    default: m.AccountPage,
  }))
);
const AccountLayout = lazy(() =>
  import("../../pages/account/AccountLayout").then((m) => ({
    default: m.AccountLayout,
  }))
);
const CastingApplicationsPage = lazy(() =>
  import("../../pages/account/CastingApplicationsPage").then((m) => ({
    default: m.CastingApplicationsPage,
  }))
);
const CustomerCastingResponsesPage = lazy(() =>
  import("../../pages/account/CustomerCastingResponsesPage").then((m) => ({
    default: m.CustomerCastingResponsesPage,
  }))
);
const CustomerMyCastingsPage = lazy(() =>
  import("../../pages/account/CustomerMyCastingsPage").then((m) => ({
    default: m.CustomerMyCastingsPage,
  }))
);
const AdsPage = lazy(() =>
  import("../../pages/ads/AdsPage").then((m) => ({ default: m.AdsPage }))
);
const PublishedAdsPage = lazy(() =>
  import("../../pages/ads/PublishedAdsPage").then((m) => ({
    default: m.PublishedAdsPage,
  }))
);
const AdminPage = lazy(() =>
  import("../../pages/admin/AdminPage").then((m) => ({
    default: m.AdminPage,
  }))
);
const AdminUsersPage = lazy(() =>
  import("../../pages/admin/AdminUsersPage").then((m) => ({
    default: m.AdminUsersPage,
  }))
);
const PaymentStatusPage = lazy(() =>
  import("../../pages/payment/PaymentStatusPage").then((m) => ({
    default: m.PaymentStatusPage,
  }))
);

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="min-h-screen grid place-items-center text-slate-500">
            Загрузка...
          </div>
        }
      >
        <Routes>
          {/* PUBLIC */}
          <Route path="/" element={<HomePage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/actors" element={<CatalogPage />} />
          <Route path="/creators" element={<CatalogPage />} />
          <Route path="/locations" element={<CatalogPage />} />
          <Route path="/profiles/:id" element={<ProfileDetailsPage />} />

          <Route path="/ads" element={<PublishedAdsPage />} />
          <Route
            path="/ads/manage"
            element={
              <ProtectedRoute>
                <AdsPage />
              </ProtectedRoute>
            }
          />

          {/* AUTH */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/check-email" element={<CheckEmailPage />} />
          <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

          {/* PRIVATE */}
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <AccountLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AccountPage />} />
            <Route path="applications" element={<CastingApplicationsPage />} />
            <Route
              path="casting-responses"
              element={<CustomerCastingResponsesPage />}
            />
            <Route path="my-castings" element={<CustomerMyCastingsPage />} />
          </Route>

          <Route
            path="/customer"
            element={
              <ProtectedRoute>
                <Navigate to="/account" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/actor"
            element={
              <ProtectedRoute>
                <Navigate to="/account" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/creator"
            element={
              <ProtectedRoute>
                <Navigate to="/account" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/location"
            element={
              <ProtectedRoute>
                <Navigate to="/account" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments/status"
            element={
              <ProtectedRoute>
                <PaymentStatusPage />
              </ProtectedRoute>
            }
          />

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
