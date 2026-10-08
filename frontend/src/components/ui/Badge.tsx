import type { ReactNode } from "react";
import type { OrderStatus } from "../../types/order";
import type { PaymentStatus } from "../../types/payment";
import { orderStatusLabel, paymentStatusLabel } from "../../lib/format";

type Tone = "gray" | "green" | "amber" | "red" | "blue" | "mint";

const toneClasses: Record<Tone, string> = {
  gray: "bg-rice-100 text-cocoa-700",
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-thaiTea-100 text-thaiTea-700",
  red: "bg-red-100 text-red-700",
  blue: "bg-sky-100 text-sky-700",
  mint: "bg-mint-100 text-mint-700",
};

export function Badge({
  children,
  tone = "gray",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold",
        toneClasses[tone],
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const tone: Record<PaymentStatus, Tone> = {
    unpaid: "gray",
    pending_review: "amber",
    paid: "green",
    rejected: "red",
    refunded: "blue",
  };
  return <Badge tone={tone[status]}>{paymentStatusLabel(status)}</Badge>;
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const tone: Record<OrderStatus, Tone> = {
    received: "blue",
    preparing: "amber",
    ready: "mint",
    delivering: "blue",
    completed: "green",
    cancelled: "red",
  };
  return <Badge tone={tone[status]}>{orderStatusLabel(status)}</Badge>;
}
