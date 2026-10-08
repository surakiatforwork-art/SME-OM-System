import { ClipboardList, Home, ShoppingCart, Store, UtensilsCrossed } from "lucide-react";
import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { APP_NAME } from "../../lib/constants";
import { useCartStore } from "../../store/cartStore";
import { usePublicDataStore } from "../../store/publicDataStore";

export function CustomerShell() {
  const totalQty = useCartStore((state) => state.totalQty());
  const location = useLocation();
  const settings = usePublicDataStore((state) => state.settings);
  const bootstrap = usePublicDataStore((state) => state.bootstrap);
  const isRefreshing = usePublicDataStore((state) => state.isRefreshing);
  const shopName = settings?.shop_name || APP_NAME;
  const navItems = [
    { to: "/", label: "Home", icon: Home, active: location.pathname === "/" && !location.hash },
    { to: "/#menu", label: "Menu", icon: UtensilsCrossed, active: location.pathname === "/" && location.hash === "#menu" },
    { to: "/cart", label: "Cart", icon: ShoppingCart, active: location.pathname === "/cart", count: totalQty },
    { to: "/order", label: "Orders", icon: ClipboardList, active: location.pathname.startsWith("/order") },
  ];

  useEffect(() => {
    bootstrap().catch(() => undefined);
  }, [bootstrap]);

  return (
    <div className="min-h-screen pb-32 sm:pb-24">
      <header className="sticky top-0 z-30 border-b border-cream-200/40 bg-cream-50/95 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between gap-3">
          <Link to="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-thaiTea-600">
              <Store size={18} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-xl font-bold text-thaiTea-600 sm:text-2xl">
                {shopName}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-cocoa-500">
                {isRefreshing ? (
                  <>
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint-600" />
                    กำลังอัปเดตเมนู
                  </>
                ) : (
                  "Thai sweets & bakery"
                )}
              </span>
            </span>
          </Link>
          <nav className="hidden items-center gap-2 text-sm font-bold text-cocoa-600 sm:flex">
            <NavLink
              to="/"
              className={({ isActive }) =>
                [
                  "rounded-full px-4 py-2",
                  isActive ? "bg-thaiTea-100 text-thaiTea-700" : "hover:bg-white",
                ].join(" ")
              }
            >
              หน้าร้าน
            </NavLink>
            <NavLink
              to="/order"
              className={({ isActive }) =>
                [
                  "rounded-full px-4 py-2",
                  isActive ? "bg-thaiTea-100 text-thaiTea-700" : "hover:bg-white",
                ].join(" ")
              }
            >
              ติดตามออเดอร์
            </NavLink>
            <Link
              to="/cart"
              aria-label="เปิดตะกร้าสินค้า"
              className="relative inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-cocoa-700 shadow-sm"
            >
              <ShoppingCart size={18} aria-hidden />
              <span>ตะกร้า</span>
              {totalQty > 0 ? (
                <span className="absolute -right-2 -top-2 grid h-6 min-w-6 place-items-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
                  {totalQty}
                </span>
              ) : null}
            </Link>
          </nav>
        </div>
      </header>
      <main className="pb-8 sm:pb-0">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 z-40 grid h-[84px] w-full grid-cols-4 rounded-t-2xl bg-rice-100/95 px-3 pb-2 pt-2 shadow-[0_-8px_24px_rgba(79,34,0,0.08)] backdrop-blur sm:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={`${item.to}-${item.label}`}
              to={item.to}
              className={[
                "relative flex flex-col items-center justify-center gap-1 rounded-xl text-xs font-bold",
                item.active
                  ? "bg-thaiTea-500 text-white"
                  : "text-cocoa-700 hover:bg-white",
              ].join(" ")}
            >
              <span className="relative">
                <Icon size={20} aria-hidden />
                {item.count ? (
                  <span className="absolute -right-3 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] text-white">
                    {item.count}
                  </span>
                ) : null}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
