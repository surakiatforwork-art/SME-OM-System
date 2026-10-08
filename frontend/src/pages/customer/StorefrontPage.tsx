import { ClipboardList, Gift, Search, ShoppingBasket, Sparkles, XCircle } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ProductCard } from "../../components/customer/ProductCard";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { LoadingState } from "../../components/ui/LoadingState";
import { MOCK_MODE } from "../../lib/constants";
import { formatCurrency } from "../../lib/format";
import { useCartStore } from "../../store/cartStore";
import { usePublicDataStore } from "../../store/publicDataStore";

export function StorefrontPage() {
  const settings = usePublicDataStore((state) => state.settings);
  const products = usePublicDataStore((state) => state.products);
  const loading = usePublicDataStore((state) => state.isLoading);
  const isBootstrapped = usePublicDataStore((state) => state.isBootstrapped);
  const isRefreshing = usePublicDataStore((state) => state.isRefreshing);
  const error = usePublicDataStore((state) => state.error);
  const bootstrap = usePublicDataStore((state) => state.bootstrap);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [category, setCategory] = useState("");
  const addItem = useCartStore((state) => state.addItem);
  const totalQty = useCartStore((state) => state.totalQty());
  const subtotal = useCartStore((state) => state.subtotal());

  useEffect(() => {
    bootstrap().catch(() => undefined);
  }, [bootstrap]);

  const categories = useMemo(
    () => Array.from(new Set(products.map((item) => item.category).filter(Boolean))),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return products.filter((product) => {
      if (category && product.category !== category) return false;
      if (!query) return true;
      return [product.name, product.description, product.category]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [category, deferredSearch, products]);

  const featuredProduct = products.find((product) => product.image_url) || products[0];

  if (loading && !isBootstrapped) return <LoadingState label="กำลังเตรียมเมนูสดใหม่..." />;

  return (
    <div className="container-page grid gap-8 py-6 sm:py-10">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.72fr)] lg:items-center">
        <div className="grid gap-5">
          <div className="flex flex-wrap gap-2">
            <Badge tone={settings?.is_shop_open ? "mint" : "red"}>
              {settings?.is_shop_open ? "เปิดรับออเดอร์" : "ปิดรับออเดอร์"}
            </Badge>
            {MOCK_MODE ? <Badge tone="amber">Mock Mode</Badge> : null}
            {isRefreshing ? <Badge tone="mint">กำลังอัปเดตเมนู...</Badge> : null}
          </div>
          <div>
            <h1 className="font-display text-[2.2rem] font-bold leading-tight text-thaiTea-600 sm:text-6xl">
              {settings?.shop_name || "SME OM System"}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-cocoa-700">
              {settings?.shop_description ||
                "ขนมไทยและเบเกอรี่ทำสดตามรอบ เลือกเมนูที่ชอบ ชำระผ่าน PromptPay แล้วรอร้านเตรียมความอร่อยให้ค่ะ"}
            </p>
          </div>
          {!settings?.is_shop_open ? (
            <div className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700">
              {settings?.closed_message || "ร้านปิดรับออเดอร์ชั่วคราว"}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <a href="#menu">
              <Button icon={<ShoppingBasket size={20} aria-hidden />}>
                ดูเมนูขนม
              </Button>
            </a>
            <Link to="/order">
              <Button variant="secondary" icon={<ClipboardList size={18} aria-hidden />}>
                เช็กออเดอร์
              </Button>
            </Link>
          </div>
        </div>
        <div className="surface overflow-hidden p-0">
          <div className="relative aspect-[4/3] bg-thaiTea-100">
            {featuredProduct?.image_url ? (
              <img
                src={featuredProduct.image_url}
                alt={featuredProduct.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full place-items-center bg-thaiTea-100 text-thaiTea-700">
                <Sparkles size={48} aria-hidden />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-cocoa-900/70 to-transparent p-5 text-white">
              <p className="font-display text-3xl font-bold">อบอุ่นเหมือนอยู่บ้าน</p>
              <p className="mt-1 text-sm font-semibold opacity-90">
                ขนมไทย เบเกอรี่ และเซ็ตของฝากสำหรับทุกโอกาส
              </p>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="surface flex items-center gap-3 border-red-100 bg-red-50 p-4 text-red-700">
          <XCircle size={18} />
          {error}
        </div>
      ) : null}

      <section id="menu" className="scroll-mt-24 grid gap-5">
        <div>
          <h2 className="font-display text-3xl font-bold text-cocoa-900 sm:text-4xl">
            เมนูขนม
          </h2>
          <p className="mt-1 text-base font-medium text-cocoa-500">
            ขนมไทยทำสดและขนมปังตามเทรนด์ เลือกแล้วเพิ่มลงตะกร้าได้เลย
          </p>
        </div>
        <div className="sticky top-16 z-20 grid gap-3 rounded-xl border border-cream-200/60 bg-cream-50/95 p-3 backdrop-blur lg:grid-cols-[1fr_auto]">
          <label className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cocoa-500"
              size={18}
              aria-hidden
            />
            <input
              className="field pl-11"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหา เช่น ขนมชั้น ลูกชุบ ชิโอะปัง เซ็ตของฝาก"
            />
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Button
              variant={category ? "secondary" : "primary"}
              onClick={() => setCategory("")}
            >
              ทั้งหมด
            </Button>
            {categories.map((item) => (
              <Button
                key={item}
                variant={category === item ? "primary" : "secondary"}
                onClick={() => setCategory(item)}
              >
                {item}
              </Button>
            ))}
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <EmptyState
            title="ไม่พบสินค้า"
            description="ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่น"
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.product_id}
                product={product}
                onAdd={addItem}
              />
            ))}
          </div>
        )}
      </section>

      {totalQty > 0 ? (
        <Link
          to="/cart"
          className="fixed bottom-[92px] left-5 right-5 z-30 flex min-h-14 items-center justify-between rounded-xl bg-cocoa-900 px-4 text-sm font-bold text-white shadow-soft sm:hidden"
        >
          <span className="inline-flex items-center gap-2">
            <Gift size={18} aria-hidden />
            เปิดตะกร้า • {totalQty} รายการ
          </span>
          <span>{formatCurrency(subtotal)}</span>
        </Link>
      ) : null}
    </div>
  );
}
