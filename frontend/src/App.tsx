import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { LoadingState } from "./components/ui/LoadingState";

const AdminRoutes = lazy(() =>
  import("./routes/AdminRoutes").then((module) => ({ default: module.AdminRoutes })),
);
const CustomerRoutes = lazy(() =>
  import("./routes/CustomerRoutes").then((module) => ({ default: module.CustomerRoutes })),
);

export function App() {
  return (
    <Suspense
      fallback={
        <div className="container-page py-8">
          <LoadingState label="กำลังเตรียมหน้าร้าน..." />
        </div>
      }
    >
      <Routes>
        <Route path="/admin/*" element={<AdminRoutes />} />
        <Route path="/*" element={<CustomerRoutes />} />
      </Routes>
    </Suspense>
  );
}
