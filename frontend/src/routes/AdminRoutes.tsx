import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AdminShell } from "../components/layout/AdminShell";
import { LoadingState } from "../components/ui/LoadingState";
import { useAdminSessionStore } from "../store/adminSessionStore";

const AdminDashboardPage = lazy(() =>
  import("../pages/admin/AdminDashboardPage").then((module) => ({
    default: module.AdminDashboardPage,
  })),
);
const AdminDeliveryPage = lazy(() =>
  import("../pages/admin/AdminDeliveryPage").then((module) => ({
    default: module.AdminDeliveryPage,
  })),
);
const AdminLoginPage = lazy(() =>
  import("../pages/admin/AdminLoginPage").then((module) => ({
    default: module.AdminLoginPage,
  })),
);
const AdminOrderDetailPage = lazy(() =>
  import("../pages/admin/AdminOrderDetailPage").then((module) => ({
    default: module.AdminOrderDetailPage,
  })),
);
const AdminOrdersPage = lazy(() =>
  import("../pages/admin/AdminOrdersPage").then((module) => ({
    default: module.AdminOrdersPage,
  })),
);
const AdminProductEditorPage = lazy(() =>
  import("../pages/admin/AdminProductEditorPage").then((module) => ({
    default: module.AdminProductEditorPage,
  })),
);
const AdminProductsPage = lazy(() =>
  import("../pages/admin/AdminProductsPage").then((module) => ({
    default: module.AdminProductsPage,
  })),
);
const AdminProductionPage = lazy(() =>
  import("../pages/admin/AdminProductionPage").then((module) => ({
    default: module.AdminProductionPage,
  })),
);
const AdminReportsPage = lazy(() =>
  import("../pages/admin/AdminReportsPage").then((module) => ({
    default: module.AdminReportsPage,
  })),
);
const AdminSettingsPage = lazy(() =>
  import("../pages/admin/AdminSettingsPage").then((module) => ({
    default: module.AdminSettingsPage,
  })),
);

function RequireAdmin() {
  const location = useLocation();
  const isAuthenticated = useAdminSessionStore((state) => state.isAuthenticated);
  return isAuthenticated() ? (
    <Outlet />
  ) : (
    <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  );
}

function AdminFallback() {
  return <LoadingState label="กำลังเตรียมหลังบ้าน..." />;
}

export function AdminRoutes() {
  return (
    <Suspense fallback={<AdminFallback />}>
      <Routes>
        <Route path="login" element={<AdminLoginPage />} />
        <Route element={<RequireAdmin />}>
          <Route element={<AdminShell />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="products/new" element={<AdminProductEditorPage />} />
            <Route path="products/:productId" element={<AdminProductEditorPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="orders/:orderId" element={<AdminOrderDetailPage />} />
            <Route path="delivery" element={<AdminDeliveryPage />} />
            <Route path="production" element={<AdminProductionPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
