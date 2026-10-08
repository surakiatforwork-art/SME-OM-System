import { Minus, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CartSummary } from "../../components/customer/CartSummary";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatCurrency } from "../../lib/format";
import { useCartStore } from "../../store/cartStore";

export function CartPage() {
  const navigate = useNavigate();
  const items = useCartStore((state) => state.items);
  const updateQty = useCartStore((state) => state.updateQty);
  const removeItem = useCartStore((state) => state.removeItem);
  const subtotal = useCartStore((state) => state.subtotal());

  const warnings = useMemo(
    () =>
      items
        .filter(
          (item) =>
            item.product.stock_type === "limited" &&
            item.qty > item.product.remaining_qty,
        )
        .map(
          (item) =>
            `${item.product.name} เหลือ ${item.product.remaining_qty} ชิ้น กรุณาลดจำนวน`,
        ),
    [items],
  );

  if (items.length === 0) {
    return (
      <div className="container-page py-8">
        <EmptyState
          title="ตะกร้ายังว่าง"
          description="เลือกสินค้าจากหน้าร้านก่อน แล้วกลับมาตรวจรายการที่นี่"
          actionLabel="ไปเลือกสินค้า"
          onAction={() => navigate("/")}
        />
      </div>
    );
  }

  return (
    <div className="container-page grid gap-6 py-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="grid gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold text-cocoa-900">ตะกร้าสินค้า</h1>
          <p className="mt-2 text-base leading-7 text-cocoa-500">
            ตรวจจำนวนสินค้าให้เรียบร้อยก่อนกรอกข้อมูลรับสินค้า
          </p>
        </div>

        {warnings.length > 0 ? (
          <div className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            {warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}

        {items.map((item) => (
          <article
            key={item.product.product_id}
            className="surface relative grid grid-cols-[112px_minmax(0,1fr)] gap-4 p-4 sm:grid-cols-[136px_minmax(0,1fr)_auto] sm:items-center sm:p-5"
          >
            <img
              src={item.product.image_url}
              alt={item.product.name}
              className="h-28 w-28 rounded-lg object-cover sm:h-32 sm:w-32"
            />
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-bold leading-snug text-cocoa-900">
                {item.product.name}
              </h2>
              <p className="mt-1 text-base text-cocoa-700">
                {formatCurrency(item.product.price)} / ชิ้น
              </p>
              <p className="mt-1 text-sm font-semibold text-cocoa-500">
                {item.product.stock_type === "limited"
                  ? `เหลือ ${item.product.remaining_qty} ชิ้น`
                  : "ไม่จำกัดจำนวน"}
              </p>
            </div>
            <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:flex-col sm:items-end">
              <div className="flex items-center gap-2 rounded-full bg-rice-100 p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 rounded-full bg-white p-0"
                  aria-label="ลดจำนวน"
                  onClick={() =>
                    item.qty <= 1
                      ? removeItem(item.product.product_id)
                      : updateQty(item.product.product_id, item.qty - 1)
                  }
                >
                  <Minus size={16} />
                </Button>
                <span className="min-w-10 text-center text-lg font-extrabold">
                  {item.qty}
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  className="h-10 w-10 rounded-full p-0"
                  aria-label="เพิ่มจำนวน"
                  onClick={() => updateQty(item.product.product_id, item.qty + 1)}
                >
                  <Plus size={16} />
                </Button>
              </div>
              <div className="text-right">
                <p className="text-xl font-extrabold text-thaiTea-600">
                  {formatCurrency(item.product.price * item.qty)}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 text-red-600"
                  onClick={() => removeItem(item.product.product_id)}
                  icon={<Trash2 size={15} aria-hidden />}
                >
                  ลบ
                </Button>
              </div>
            </div>
          </article>
        ))}
        <Button
          variant="secondary"
          className="hidden w-fit sm:inline-flex"
          onClick={() => navigate("/#menu")}
          icon={<ShoppingBasket size={18} aria-hidden />}
        >
          เลือกสินค้าเพิ่ม
        </Button>
      </section>

      <CartSummary
        subtotal={subtotal}
        disabled={warnings.length > 0}
        onCheckout={() => navigate("/checkout")}
      />
    </div>
  );
}
