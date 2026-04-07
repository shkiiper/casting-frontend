import { Suspense, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { lazyWithRetry } from "./lazyWithRetry";
import { markUserActivity } from "@/shared/lib/activityTracker";

const LoginPage = lazyWithRetry(() =>
  import("../../features/auth/LoginPage").then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = lazyWithRetry(() =>
  import("../../features/auth/RegisterPage").then((m) => ({
    default: m.RegisterPage,
  }))
);
const CheckEmailPage = lazyWithRetry(() =>
  import("../../pages/auth/CheckEmailPage").then((m) => ({
    default: m.CheckEmailPage,
  }))
);
const VerifyEmailPage = lazyWithRetry(() =>
  import("../../pages/auth/VerifyEmailPage").then((m) => ({
    default: m.VerifyEmailPage,
  }))
);
const ResetPasswordPage = lazyWithRetry(() =>
  import("../../pages/auth/ResetPasswordPage").then((m) => ({
    default: m.ResetPasswordPage,
  }))
);
const HomePage = lazyWithRetry(() =>
  import("../../pages/landing/HomePage").then((m) => ({ default: m.HomePage }))
);
const CatalogPage = lazyWithRetry(() =>
  import("../../pages/catalog/CatalogPage").then((m) => ({
    default: m.CatalogPage,
  }))
);
const ProfileDetailsPage = lazyWithRetry(() =>
  import("../../pages/catalog/ProfileDetailsPage").then((m) => ({
    default: m.ProfileDetailsPage,
  }))
);
const AccountPage = lazyWithRetry(() =>
  import("../../pages/account/AccountPage").then((m) => ({
    default: m.AccountPage,
  }))
);
const AccountLayout = lazyWithRetry(() =>
  import("../../pages/account/AccountLayout").then((m) => ({
    default: m.AccountLayout,
  }))
);
const CastingApplicationsPage = lazyWithRetry(() =>
  import("../../pages/account/CastingApplicationsPage").then((m) => ({
    default: m.CastingApplicationsPage,
  }))
);
const CustomerCastingResponsesPage = lazyWithRetry(() =>
  import("../../pages/account/CustomerCastingResponsesPage").then((m) => ({
    default: m.CustomerCastingResponsesPage,
  }))
);
const CustomerMyCastingsPage = lazyWithRetry(() =>
  import("../../pages/account/CustomerMyCastingsPage").then((m) => ({
    default: m.CustomerMyCastingsPage,
  }))
);
const AdsPage = lazyWithRetry(() =>
  import("../../pages/ads/AdsPage").then((m) => ({ default: m.AdsPage }))
);
const PublishedAdsPage = lazyWithRetry(() =>
  import("../../pages/ads/PublishedAdsPage").then((m) => ({
    default: m.PublishedAdsPage,
  }))
);
const AdminPage = lazyWithRetry(() =>
  import("../../pages/admin/AdminPage").then((m) => ({
    default: m.AdminPage,
  }))
);
const AdminUsersPage = lazyWithRetry(() =>
  import("../../pages/admin/AdminUsersPage").then((m) => ({
    default: m.AdminUsersPage,
  }))
);
const PaymentStatusPage = lazyWithRetry(() =>
  import("../../pages/payment/PaymentStatusPage").then((m) => ({
    default: m.PaymentStatusPage,
  }))
);
const LegalPage = lazyWithRetry(() =>
  import("../../pages/public/LegalPage").then((m) => ({
    default: m.LegalPage,
  }))
);
const PaymentInfoPage = lazyWithRetry(() =>
  import("../../pages/public/PaymentInfoPage").then((m) => ({
    default: m.PaymentInfoPage,
  }))
);
const ContactsPage = lazyWithRetry(() =>
  import("../../pages/public/ContactsPage").then((m) => ({
    default: m.ContactsPage,
  }))
);

export function AppRouter() {
  return (
    <BrowserRouter>
      <ActivityRouteTracker />
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
          <Route path="/legal" element={<LegalPage />} />
          <Route path="/payment-info" element={<PaymentInfoPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
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

function ActivityRouteTracker() {
  const location = useLocation();

  useEffect(() => {
    markUserActivity();
  }, [location.pathname, location.search, location.hash]);

  return null;
}
