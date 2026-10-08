import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { CustomerShell } from "../components/layout/CustomerShell";
import { LoadingState } from "../components/ui/LoadingState";
import { StorefrontPage } from "../pages/customer/StorefrontPage";

const CartPage = lazy(() =>
  import("../pages/customer/CartPage").then((module) => ({ default: module.CartPage })),
);
const CheckoutPage = lazy(() =>
  import("../pages/customer/CheckoutPage").then((module) => ({
    default: module.CheckoutPage,
  })),
);
const OrderStatusPage = lazy(() =>
  import("../pages/customer/OrderStatusPage").then((module) => ({
    default: module.OrderStatusPage,
  })),
);
const PaymentPage = lazy(() =>
  import("../pages/customer/PaymentPage").then((module) => ({
    default: module.PaymentPage,
  })),
);

function PageFallback() {
  return (
    <div className="container-page py-8">
      <LoadingState label="กำลังเปิดหน้าที่เลือก..." />
    </div>
  );
}

export function CustomerRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<CustomerShell />}>
          <Route index element={<StorefrontPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="payment/:orderId" element={<PaymentPage />} />
          <Route path="order" element={<OrderStatusPage />} />
          <Route path="order/:orderId" element={<OrderStatusPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
