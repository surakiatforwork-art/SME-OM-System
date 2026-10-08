import {
  BarChart3,
  ClipboardList,
  Home,
  LogOut,
  Package,
  RefreshCw,
  Settings,
  ShoppingBag,
  Sprout,
  Truck,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { useAdminDataStore } from "../../store/adminDataStore";
import { useAdminSessionStore } from "../../store/adminSessionStore";
import type { AdminSyncScope } from "../../types/api";
import { Button } from "../ui/Button";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: Home, end: true },
  { to: "/admin/products", label: "สินค้า", icon: Package },
  { to: "/admin/orders", label: "ออเดอร์", icon: ClipboardList },
  { to: "/admin/delivery", label: "จัดส่ง", icon: Truck },
  { to: "/admin/production", label: "ยอดผลิต", icon: Sprout },
  { to: "/admin/reports", label: "รายงาน", icon: BarChart3 },
  { to: "/admin/settings", label: "ตั้งค่า", icon: Settings },
];

function syncConfig(pathname: string): { interval: number; scope: AdminSyncScope[] } {
  if (pathname.includes("/admin/delivery")) {
    return { interval: 12_000, scope: ["orders", "payments", "order_items"] };
  }
  if (pathname.includes("/admin/orders")) {
    return { interval: 18_000, scope: ["orders", "payments", "order_items"] };
  }
  if (pathname.includes("/admin/products")) {
    return { interval: 45_000, scope: ["products"] };
  }
  if (pathname.includes("/admin/settings")) {
    return { interval: 60_000, scope: ["settings"] };
  }
  return {
    interval: 35_000,
    scope: ["orders", "payments", "products", "settings", "order_items"],
  };
}

export function AdminShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useAdminSessionStore((state) => state.session);
  const clearSession = useAdminSessionStore((state) => state.clearSession);
  const bootstrap = useAdminDataStore((state) => state.bootstrap);
  const sync = useAdminDataStore((state) => state.sync);
  const resetAdminData = useAdminDataStore((state) => state.reset);
  const isSyncing = useAdminDataStore((state) => state.isSyncing);
  const isBootstrapping = useAdminDataStore((state) => state.isBootstrapping);
  const lastSyncedAt = useAdminDataStore((state) => state.lastSyncedAt);
  const syncStatus = useMemo(() => {
    if (isBootstrapping) return "กำลังโหลดข้อมูล";
    if (isSyncing) return "กำลังซิงก์";
    if (!lastSyncedAt) return "ยังไม่ซิงก์";
    return `อัปเดต ${new Date(lastSyncedAt).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }, [isBootstrapping, isSyncing, lastSyncedAt]);

  useEffect(() => {
    if (!session?.session_token) return;
    bootstrap(session.session_token).catch(() => undefined);
  }, [bootstrap, session?.session_token]);

  useEffect(() => {
    if (!session?.session_token) return;
    const { interval, scope } = syncConfig(location.pathname);
    const run = () => {
      if (document.visibilityState !== "visible") return;
      sync(session.session_token, scope).catch(() => undefined);
    };
    const timer = window.setInterval(run, interval);
    window.addEventListener("focus", run);
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", run);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", run);
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", run);
    };
  }, [location.pathname, session?.session_token, sync]);

  async function handleRefresh() {
    if (!session?.session_token) return;
    await bootstrap(session.session_token, undefined, true).catch(() => undefined);
  }

  async function handleLogout() {
    if (session?.session_token) {
      await apiClient.adminLogout(session.session_token).catch(() => undefined);
    }
    resetAdminData();
    clearSession();
    navigate("/admin/login");
  }

  return (
    <div className="min-h-screen bg-cream-50/60">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-cream-200 bg-white/90 p-4 backdrop-blur lg:block">
        <div className="flex items-center gap-3 px-2 py-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-mint-600 text-white">
            <ShoppingBag size={22} aria-hidden />
          </span>
          <div>
            <p className="font-bold text-cocoa-900">SME OM</p>
            <p className="text-xs text-cocoa-500">Back Office</p>
          </div>
        </div>
        <nav className="mt-6 grid gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  "flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition",
                  isActive
                    ? "bg-mint-50 text-mint-700"
                    : "text-cocoa-600 hover:bg-cream-100",
                ].join(" ")
              }
            >
              <item.icon size={18} aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-5 left-4 right-4 grid gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={16} aria-hidden />}
            disabled={isBootstrapping || isSyncing}
            onClick={handleRefresh}
          >
            {syncStatus}
          </Button>
          <Button
            variant="ghost"
            icon={<LogOut size={18} aria-hidden />}
            onClick={handleLogout}
          >
            ออกจากระบบ
          </Button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-white/70 bg-cream-50/90 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="font-bold text-cocoa-900">SME OM Admin</div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              aria-label="รีเฟรชข้อมูล"
              disabled={isBootstrapping || isSyncing}
              onClick={handleRefresh}
              icon={<RefreshCw size={16} aria-hidden />}
            />
            <Button
              variant="ghost"
              size="sm"
              aria-label="ออกจากระบบ"
              onClick={handleLogout}
              icon={<LogOut size={18} aria-hidden />}
            >
              ออก
            </Button>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-3 pb-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold",
                  isActive
                    ? "bg-mint-600 text-white"
                    : "bg-white text-cocoa-600 shadow-sm",
                ].join(" ")
              }
            >
              <item.icon size={16} aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="lg:pl-64">
        <div className="container-page py-6 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
