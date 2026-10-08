import { Plus, Sparkles } from "lucide-react";
import { formatCurrency, formatNumber } from "../../lib/format";
import type { Product } from "../../types/product";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

export function ProductCard({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (product: Product) => void;
}) {
  const isSoldOut =
    product.stock_type === "limited" && Number(product.remaining_qty || 0) <= 0;
  const isLowStock =
    product.stock_type === "limited" &&
    Number(product.remaining_qty || 0) > 0 &&
    Number(product.remaining_qty || 0) <= 5;

  return (
    <article className="surface group flex h-full flex-col overflow-hidden p-0">
      <div className="relative aspect-[4/3] overflow-hidden bg-thaiTea-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="grid h-full place-items-center px-6 text-center font-display text-xl font-bold text-thaiTea-700">
            {product.name}
          </div>
        )}
        <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-2">
          {isSoldOut ? <Badge tone="red">หมด</Badge> : null}
          {isLowStock ? <Badge tone="amber">ใกล้หมด</Badge> : null}
          {product.is_preorder ? <Badge tone="mint">พรีออเดอร์</Badge> : null}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-2">
          <Badge tone="mint">{product.category || "ทั่วไป"}</Badge>
        </div>
        <div className="min-h-[92px]">
          <h3 className="line-clamp-2 font-display text-2xl font-bold leading-snug text-cocoa-900">
            {product.name}
          </h3>
          <p className="mt-2 line-clamp-2 text-base leading-7 text-cocoa-700">
            {product.description}
          </p>
        </div>
        <div className="mt-auto grid gap-3">
          <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-2xl font-extrabold text-thaiTea-600">
              {formatCurrency(product.price)}
            </p>
            <p className="mt-1 line-clamp-1 text-sm font-semibold text-cocoa-500">
              {product.stock_type === "limited"
                ? `เหลือ ${formatNumber(product.remaining_qty)} ชิ้น`
                : "ทำตามรอบ รับออเดอร์ได้ต่อเนื่อง"}
            </p>
          </div>
          </div>
          <Button
            size="lg"
            className="w-full"
            disabled={isSoldOut}
            icon={isSoldOut ? <Sparkles size={16} /> : <Plus size={16} />}
            onClick={() => onAdd(product)}
          >
            {isSoldOut ? "หมดชั่วคราว" : "เพิ่มลงตะกร้า"}
          </Button>
        </div>
      </div>
    </article>
  );
}
