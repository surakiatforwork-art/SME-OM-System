import { CheckCircle2, ChefHat, Circle, ClipboardCheck, PackageCheck, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { OrderStatusBadge, PaymentStatusBadge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { FormField } from "../../components/ui/FormField";
import { LoadingState } from "../../components/ui/LoadingState";
import { STORAGE_KEYS } from "../../lib/constants";
import { apiClient } from "../../lib/apiClient";
import {
  getCustomerOrderToken,
  normalizePhone,
  readCustomerOrders,
  readCustomerProfile,
  rememberCustomerOrderDetail,
} from "../../lib/customerMemory";
import { formatCurrency, formatDateThai } from "../../lib/format";
import type { CustomerOrderSummary } from "../../types/customer";
import type { OrderDetail, OrderStatus } from "../../types/order";

type TimelineState = "done" | "active" | "pending" | "cancelled";

const ORDER_PROGRESS: OrderStatus[] = [
  "received",
  "preparing",
  "ready",
  "delivering",
  "completed",
];

export function OrderStatusPage() {
  const { orderId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const storedToken = useMemo(
    () =>
      searchParams.get("token") ||
      localStorage.getItem(`${STORAGE_KEYS.orderTokenPrefix}${orderId}`) ||
      "",
    [orderId, searchParams],
  );
  const localProfile = useMemo(() => readCustomerProfile(), []);
  const localOrders = useMemo(() => readCustomerOrders(), []);
  const [lookup, setLookup] = useState({ order_id: orderId, order_token: storedToken });
  const [phone, setPhone] = useState(localProfile?.phone || "");
  const [phoneOrders, setPhoneOrders] = useState<CustomerOrderSummary[]>([]);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId && storedToken));
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load(order_id = lookup.order_id, order_token = lookup.order_token) {
    if (!order_id || !order_token) return;
    setError("");
    setLoading(true);
    try {
      const data = await apiClient.getOrderStatus(order_id, order_token);
      setDetail(data);
      rememberCustomerOrderDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ไม่พบออเดอร์");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }

  async function findOrdersByPhone() {
    const normalized = normalizePhone(phone);
    if (normalized.length < 9) {
      setError("กรุณากรอกเบอร์โทรให้ถูกต้อง");
      return;
    }
    setPhoneLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await apiClient.listOrdersByPhone(normalized);
      setPhoneOrders(result.orders);
      if (result.orders.length === 0) {
        setMessage("ยังไม่พบออเดอร์จากเบอร์นี้");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "ค้นหาออเดอร์ไม่สำเร็จ");
    } finally {
      setPhoneLoading(false);
    }
  }

  function openKnownOrder(order_id: string) {
    const token = getCustomerOrderToken(order_id);
    if (!token) {
      setError("เครื่องนี้ไม่มี token ของออเดอร์นี้ จึงแสดงได้เฉพาะสถานะสรุปจากเบอร์โทร");
      return;
    }
    setLookup({ order_id, order_token: token });
    load(order_id, token);
  }

  async function cancelOrder() {
    if (!detail) return;
    if (!window.confirm("ต้องการยกเลิกออเดอร์นี้ใช่ไหม?")) return;
    setCancelBusy(true);
    setError("");
    setMessage("");
    try {
      const updated = await apiClient.cancelOrderByCustomer(
        detail.order.order_id,
        lookup.order_token || storedToken,
      );
      setDetail(updated);
      rememberCustomerOrderDetail(updated);
      setMessage("ยกเลิกออเดอร์แล้ว จำนวนสินค้าถูกคืนให้ร้านเรียบร้อย");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ยกเลิกออเดอร์ไม่สำเร็จ");
    } finally {
      setCancelBusy(false);
    }
  }

  useEffect(() => {
    if (orderId && storedToken) {
      load(orderId, storedToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, storedToken]);

  return (
    <div className="container-page grid gap-6 py-6 sm:py-10 lg:grid-cols-[360px_1fr]">
      <Card className="h-fit">
        <h1 className="font-display text-3xl font-bold text-cocoa-900">
          เช็กสถานะออเดอร์
        </h1>
        <p className="mt-2 text-base leading-7 text-cocoa-500">
          กรอกเบอร์โทรเพื่อดูออเดอร์ล่าสุด หรือเลือกออเดอร์ที่เคยสั่งจากเครื่องนี้
        </p>
        <form
          className="mt-5 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            findOrdersByPhone();
          }}
        >
          <FormField label="เบอร์โทร">
            <input
              className="field"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="08x-xxx-xxxx"
              inputMode="tel"
            />
          </FormField>
          <Button type="submit" disabled={phoneLoading}>
            {phoneLoading ? "กำลังค้นหา..." : "ค้นหาจากเบอร์โทร"}
          </Button>
        </form>

        {localOrders.length > 0 ? (
          <div className="mt-5 grid gap-2">
            <p className="text-sm font-bold text-cocoa-900">ออเดอร์ในเครื่องนี้</p>
            {localOrders.slice(0, 5).map((order) => (
              <button
                key={order.order_id}
                type="button"
                className="rounded-xl bg-rice-100 p-3 text-left text-sm font-semibold text-cocoa-800"
                onClick={() => openKnownOrder(order.order_id)}
              >
                <span className="block">{order.order_id}</span>
                <span className="mt-1 block text-xs text-cocoa-500">
                  {order.pickup_date ? formatDateThai(order.pickup_date) : "ดูรายละเอียด"}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        <details className="mt-5 rounded-xl bg-rice-100 p-3">
          <summary className="cursor-pointer text-sm font-bold text-cocoa-800">
            มีเลขออเดอร์และ token
          </summary>
          <form
            className="mt-4 grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              load();
            }}
          >
          <FormField label="เลขออเดอร์">
            <input
              className="field"
              value={lookup.order_id}
              onChange={(event) =>
                setLookup({ ...lookup, order_id: event.target.value })
              }
              placeholder="ORD-260522-0001"
            />
          </FormField>
          <FormField label="Order token">
            <input
              className="field"
              value={lookup.order_token}
              onChange={(event) =>
                setLookup({ ...lookup, order_token: event.target.value })
              }
              placeholder="token จากระบบ"
            />
          </FormField>
          <Button type="submit">ค้นหาออเดอร์</Button>
          </form>
        </details>
        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-xl bg-mint-50 p-3 text-sm font-semibold text-mint-800">
            {message}
          </p>
        ) : null}
      </Card>

      <section>
        {loading ? <LoadingState /> : null}
        {!loading && !detail ? (
          <Card className="grid min-h-64 place-items-center text-center">
            <div>
              <h2 className="text-lg font-bold text-cocoa-900">
                ยังไม่มีข้อมูลให้แสดง
              </h2>
              <p className="mt-2 text-sm text-cocoa-500">
                ค้นหาด้วยเลขออเดอร์และ token เพื่อดูสถานะ
              </p>
            </div>
          </Card>
        ) : null}
        {!loading && !detail && phoneOrders.length > 0 ? (
          <Card className="grid gap-4">
            <h2 className="text-lg font-bold text-cocoa-900">
              ออเดอร์ล่าสุดของเบอร์นี้
            </h2>
            <div className="grid gap-3">
              {phoneOrders.map((order) => {
                const knownToken = getCustomerOrderToken(order.order_id);
                return (
                  <div
                    key={order.order_id}
                    className="grid gap-3 rounded-xl border border-cream-200/60 p-3 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div>
                      <p className="font-extrabold text-cocoa-900">{order.order_id}</p>
                      <p className="mt-1 text-sm text-cocoa-500">
                        รับสินค้า {formatDateThai(order.pickup_date)} •{" "}
                        {formatCurrency(order.total_amount)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <PaymentStatusBadge status={order.payment_status} />
                        <OrderStatusBadge status={order.order_status} />
                      </div>
                    </div>
                    {knownToken ? (
                      <Button
                        variant="secondary"
                        onClick={() => openKnownOrder(order.order_id)}
                      >
                        ดูรายละเอียด
                      </Button>
                    ) : (
                      <span className="rounded-xl bg-rice-100 p-3 text-xs font-semibold leading-5 text-cocoa-500">
                        แสดงรายละเอียดเต็มได้เมื่อสั่งจากเครื่องนี้
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ) : null}
        {detail ? (
          <Card className="grid gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-thaiTea-600">เลขออเดอร์</p>
                <h2 className="font-display text-4xl font-bold text-cocoa-900">
                  {detail.order.order_id}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <PaymentStatusBadge status={detail.order.payment_status} />
                <OrderStatusBadge status={detail.order.order_status} />
              </div>
            </div>
            <OrderTimeline detail={detail} />
            <div className="grid gap-3 rounded-xl bg-rice-100 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold text-cocoa-500">ยอดรวม</p>
                <p className="mt-1 text-xl font-extrabold text-thaiTea-600">
                  {formatCurrency(detail.order.total_amount)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-cocoa-500">วันที่รับสินค้า</p>
                <p className="mt-1 font-extrabold text-cocoa-900">
                  {formatDateThai(detail.order.pickup_date)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-cocoa-500">วิธีรับสินค้า</p>
                <p className="mt-1 font-extrabold text-cocoa-900">
                  {detail.order.pickup_method === "delivery" ? "จัดส่ง" : "รับที่ร้าน"}
                </p>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-cocoa-900">รายการสินค้า</h3>
              <div className="mt-3 grid gap-3">
                {detail.items.map((item) => (
                  <div
                    key={item.item_id}
                    className="flex items-center justify-between rounded-xl border border-cream-200/60 p-3"
                  >
                    <div>
                      <p className="font-semibold text-cocoa-900">
                        {item.product_name_snapshot}
                      </p>
                      <p className="text-sm text-cocoa-500">x {item.qty}</p>
                    </div>
                    <p className="font-bold text-cocoa-900">
                      {formatCurrency(item.subtotal)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            {detail.order.internal_note ? (
              <div className="rounded-xl bg-mint-50 p-4 text-sm text-mint-800">
                หมายเหตุจากร้าน: {detail.order.internal_note}
              </div>
            ) : null}
            {detail.order.payment_status === "pending_review" ? (
              <div className="rounded-xl bg-mint-50 p-4 text-sm font-semibold leading-6 text-mint-800">
                ขอบคุณค่ะ ร้านได้รับสลิปแล้วและจะตรวจสอบการชำระเงินให้เร็วที่สุด หากต้องการยกเลิกออเดอร์หลังจากนี้ กรุณาติดต่อร้านโดยตรง
              </div>
            ) : null}
            {detail.order.payment_status === "paid" ? (
              <div className="rounded-xl bg-mint-50 p-4 text-sm font-semibold leading-6 text-mint-800">
                ชำระเงินเรียบร้อยแล้ว ขอบคุณสำหรับออเดอร์ค่ะ หากต้องการเปลี่ยนแปลงหรือยกเลิกออเดอร์ กรุณาติดต่อร้านโดยตรง
              </div>
            ) : null}
            {detail.order.payment_status === "unpaid" &&
            detail.order.order_status === "received" ? (
              <Button variant="danger" disabled={cancelBusy} onClick={cancelOrder}>
                {cancelBusy ? "กำลังยกเลิก..." : "ยกเลิกออเดอร์นี้"}
              </Button>
            ) : detail.order.order_status !== "cancelled" ? (
              <div className="rounded-xl bg-thaiTea-50 p-4 text-sm font-semibold leading-6 text-cocoa-700">
                ร้านเริ่มจัดการออเดอร์นี้แล้ว หรือมีการชำระเงินเกิดขึ้น หากต้องการยกเลิก กรุณาติดต่อร้านโดยตรง
              </div>
            ) : null}
            <Link className="font-bold text-thaiTea-600" to="/">
              กลับหน้าร้าน
            </Link>
          </Card>
        ) : null}
      </section>
    </div>
  );
}

function OrderTimeline({ detail }: { detail: OrderDetail }) {
  const steps = buildTimelineSteps(detail);

  return (
    <section className="rounded-xl border border-cream-200/60 bg-white p-5">
      <h3 className="font-display text-2xl font-bold text-cocoa-900">
        ติดตามสถานะ
      </h3>
      <div className="mt-5 grid gap-0">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isLast = index === steps.length - 1;
          const stateClass =
            step.state === "done"
              ? "bg-thaiTea-600 text-white"
              : step.state === "active"
                ? "bg-thaiTea-50 text-thaiTea-600 ring-4 ring-thaiTea-100"
                : step.state === "cancelled"
                  ? "bg-red-100 text-red-700"
                  : "bg-rice-200 text-cocoa-500";

          return (
            <div key={step.label} className="grid grid-cols-[44px_1fr] gap-4">
              <div className="grid justify-center">
                <span className={`grid h-9 w-9 place-items-center rounded-full ${stateClass}`}>
                  <Icon size={18} aria-hidden />
                </span>
                {!isLast ? (
                  <span
                    className={[
                      "mx-auto h-12 w-0.5",
                      step.state === "done" ? "bg-thaiTea-600" : "bg-rice-200",
                    ].join(" ")}
                  />
                ) : null}
              </div>
              <div className={isLast ? "pb-0" : "pb-5"}>
                <p
                  className={[
                    "font-display text-xl font-bold",
                    step.state === "pending" ? "text-cocoa-500" : "text-cocoa-900",
                  ].join(" ")}
                >
                  {step.label}
                </p>
                <p className="mt-1 text-sm leading-6 text-cocoa-500">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function buildTimelineSteps(detail: OrderDetail) {
  const { order } = detail;
  if (order.order_status === "cancelled") {
    return [
      {
        label: "ยกเลิกออเดอร์แล้ว",
        description: "ออเดอร์นี้ถูกยกเลิก หากต้องการสั่งใหม่ สามารถกลับไปเลือกเมนูได้ค่ะ",
        icon: Circle,
        state: "cancelled" as TimelineState,
      },
    ];
  }

  const progressIndex = ORDER_PROGRESS.indexOf(order.order_status);
  const statusState = (status: OrderStatus): TimelineState => {
    const index = ORDER_PROGRESS.indexOf(status);
    if (index < progressIndex) return "done";
    if (index === progressIndex) return "active";
    return "pending";
  };

  const paymentState: TimelineState =
    order.payment_status === "paid"
      ? "done"
      : order.payment_status === "pending_review"
        ? "active"
        : order.payment_status === "rejected"
          ? "cancelled"
          : "pending";

  const steps = [
    {
      label: "รับออเดอร์แล้ว",
      description: "ร้านได้รับรายการขนมของคุณแล้ว และจะจัดเตรียมตามวันที่เลือก",
      icon: ClipboardCheck,
      state: statusState("received") === "pending" ? "done" : statusState("received"),
    },
    {
      label:
        order.payment_status === "paid"
          ? "ชำระเงินเรียบร้อย"
          : order.payment_status === "pending_review"
            ? "กำลังตรวจสลิป"
            : order.payment_status === "rejected"
              ? "สลิปถูกปฏิเสธ"
              : "รอชำระเงิน",
      description:
        order.payment_status === "paid"
          ? "ร้านยืนยันการชำระเงินแล้ว ขอบคุณค่ะ"
          : order.payment_status === "pending_review"
            ? "ร้านได้รับสลิปแล้วและกำลังตรวจสอบ"
            : order.payment_status === "rejected"
              ? "กรุณาติดต่อร้านหรืออัปโหลดสลิปใหม่อีกครั้ง"
              : "ชำระผ่าน QR แล้วอัปโหลดสลิปเพื่อให้ร้านตรวจสอบ",
      icon: CheckCircle2,
      state: paymentState,
    },
    {
      label: "กำลังเตรียมขนม",
      description: "ร้านกำลังจัดรอบผลิตและเตรียมสินค้าให้สดใหม่ที่สุด",
      icon: ChefHat,
      state: statusState("preparing"),
    },
    {
      label: order.pickup_method === "delivery" ? "พร้อมจัดส่ง" : "พร้อมรับสินค้า",
      description:
        order.pickup_method === "delivery"
          ? "สินค้าเตรียมพร้อมสำหรับรอบจัดส่งของร้าน"
          : "สามารถรับสินค้าได้ตามเวลาที่ร้านแจ้ง",
      icon: PackageCheck,
      state: statusState("ready"),
    },
  ];

  if (order.pickup_method === "delivery") {
    steps.push({
      label: "กำลังจัดส่ง",
      description: "ร้านกำลังนำสินค้าไปส่งตามที่อยู่ที่ให้ไว้",
      icon: Truck,
      state: statusState("delivering"),
    });
  }

  steps.push({
    label: "เสร็จสิ้น",
    description: "ขอบคุณที่อุดหนุนร้านค่ะ",
    icon: CheckCircle2,
    state: statusState("completed"),
  });

  return steps;
}
