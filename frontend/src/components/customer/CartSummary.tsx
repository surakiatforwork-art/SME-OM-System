import { ArrowRight } from "lucide-react";
import { formatCurrency } from "../../lib/format";
import { Button } from "../ui/Button";

export function CartSummary({
  subtotal,
  disabled,
  onCheckout,
}: {
  subtotal: number;
  disabled?: boolean;
  onCheckout: () => void;
}) {
  return (
    <aside className="surface sticky top-20 grid h-fit gap-4 p-5 sm:top-24">
      <h2 className="font-display text-2xl font-bold text-cocoa-900">
        สรุปคำสั่งซื้อ
      </h2>
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold text-cocoa-600">ยอดรวมสินค้า</span>
        <span className="text-2xl font-extrabold text-cocoa-900">
          {formatCurrency(subtotal)}
        </span>
      </div>
      <p className="rounded-xl bg-rice-100 p-3 text-sm leading-6 text-cocoa-500">
        ยอดจริงจะถูกคำนวณอีกครั้งโดยระบบหลังจากยืนยันออเดอร์
      </p>
      <Button
        size="lg"
        disabled={disabled}
        onClick={onCheckout}
        icon={<ArrowRight size={20} aria-hidden />}
      >
        ไปกรอกข้อมูลรับสินค้า
      </Button>
    </aside>
  );
}
