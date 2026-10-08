import { Copy, ShieldCheck, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { SlipViewer } from "../../components/admin/SlipViewer";
import { OrderStatusBadge, PaymentStatusBadge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { FormField } from "../../components/ui/FormField";
import { LoadingState } from "../../components/ui/LoadingState";
import { apiClient } from "../../lib/apiClient";
import { orderDetailFromMaps } from "../../lib/adminData";
import {
  formatCurrency,
  formatDateThai,
  orderStatusLabel,
  paymentStatusLabel,
} from "../../lib/format";
import { useAdminDataStore } from "../../store/adminDataStore";
import { useAdminSessionStore } from "../../store/adminSessionStore";
import type { OrderDetail, OrderStatus } from "../../types/order";

export function AdminOrderDetailPage() {
  const { orderId = "" } = useParams();
  const token = useAdminSessionStore((state) => state.session?.session_token || "");
  const ordersById = useAdminDataStore((state) => state.ordersById);
  const orderItemsByOrderId = useAdminDataStore((state) => state.orderItemsByOrderId);
  const paymentsByOrderId = useAdminDataStore((state) => state.paymentsByOrderId);
  const upsertOrder = useAdminDataStore((state) => state.upsertOrder);
  const upsertPayment = useAdminDataStore((state) => state.upsertPayment);
  const storeDetail = useMemo(
    () =>
      orderDetailFromMaps(
        orderId,
        ordersById,
        orderItemsByOrderId,
        paymentsByOrderId,
      ),
    [orderId, orderItemsByOrderId, ordersById, paymentsByOrderId],
  );
  const [remoteDetail, setRemoteDetail] = useState<OrderDetail | null>(null);
  const detail = storeDetail || remoteDetail;
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("received");
  const [internalNote, setInternalNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadRemote() {
    try {
      setLoading(true);
      const data = await apiClient.adminGetOrderDetail(token, orderId);
      setRemoteDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดออเดอร์ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (storeDetail) {
      setLoading(false);
      setRemoteDetail(null);
      return;
    }
    if (token && orderId) loadRemote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, orderId, storeDetail]);

  useEffect(() => {
    if (!detail) return;
    setOrderStatus(detail.order.order_status);
    setInternalNote(detail.order.internal_note || "");
  }, [detail?.order.internal_note, detail?.order.order_id, detail?.order.order_status]);

  const lineSummary = useMemo(() => {
    if (!detail) return "";
    const itemText = detail.items
      .map((item) => `- ${item.product_name_snapshot} x ${item.qty}`)
      .join("\n");
    return [
      `สรุปออเดอร์ ${detail.order.order_id}`,
      itemText,
      `ยอดรวม ${formatCurrency(detail.order.total_amount)}`,
      `รับสินค้า ${formatDateThai(detail.order.pickup_date)}`,
      `สถานะชำระเงิน ${paymentStatusLabel(detail.order.payment_status)}`,
      `สถานะออเดอร์ ${orderStatusLabel(detail.order.order_status)}`,
    ].join("\n");
  }, [detail]);

  async function runAction(action: () => Promise<void>, success: string) {
    setError("");
    setMessage("");
    try {
      setBusy(true);
      await action();
      setMessage(success);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!detail) return <Card className="text-red-700">{error || "ไม่พบออเดอร์"}</Card>;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-mint-700">รายละเอียดออเดอร์</p>
          <h1 className="text-2xl font-extrabold text-cocoa-900">
            {detail.order.order_id}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <PaymentStatusBadge status={detail.order.payment_status} />
          <OrderStatusBadge status={detail.order.order_status} />
        </div>
      </div>

      {message ? (
        <Card className="border-mint-100 bg-mint-50 text-mint-800">{message}</Card>
      ) : null}
      {error ? <Card className="border-red-100 bg-red-50 text-red-700">{error}</Card> : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-6">
          <Card>
            <h2 className="text-lg font-bold text-cocoa-900">ข้อมูลลูกค้า</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Info label="ชื่อ" value={detail.order.customer_name} />
              <Info label="เบอร์โทร" value={detail.order.phone} />
              <Info label="LINE ID" value={detail.order.line_id || "-"} />
              <Info
                label="วันที่รับสินค้า"
                value={formatDateThai(detail.order.pickup_date)}
              />
              <Info
                label="วิธีรับสินค้า"
                value={detail.order.pickup_method === "delivery" ? "จัดส่ง" : "รับที่ร้าน"}
              />
              <Info
                label="ที่อยู่จัดส่ง"
                value={detail.order.delivery_address || "-"}
              />
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-cocoa-900">รายการสินค้า</h2>
            <div className="mt-4 grid gap-3">
              {detail.items.map((item) => (
                <div
                  key={item.item_id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-cream-50 p-3"
                >
                  <div>
                    <p className="font-semibold text-cocoa-900">
                      {item.product_name_snapshot}
                    </p>
                    <p className="text-sm text-cocoa-500">
                      {formatCurrency(item.unit_price_snapshot)} x {item.qty}
                    </p>
                  </div>
                  <p className="font-bold text-cocoa-900">
                    {formatCurrency(item.subtotal)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-mint-50 p-4">
              <span className="font-semibold text-cocoa-700">ยอดรวม</span>
              <span className="text-xl font-extrabold text-cocoa-900">
                {formatCurrency(detail.order.total_amount)}
              </span>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-cocoa-900">อัปเดตสถานะออเดอร์</h2>
            <div className="mt-4 grid gap-4">
              <FormField label="สถานะออเดอร์">
                <select
                  className="field"
                  value={orderStatus}
                  onChange={(event) =>
                    setOrderStatus(event.target.value as OrderStatus)
                  }
                >
                  <option value="received">รับออเดอร์แล้ว</option>
                  <option value="preparing">กำลังผลิต</option>
                  <option value="ready">พร้อมรับสินค้า</option>
                  <option value="delivering">กำลังจัดส่ง</option>
                  <option value="completed">เสร็จสิ้น</option>
                  <option value="cancelled">ยกเลิก</option>
                </select>
              </FormField>
              <FormField label="Internal note">
                <textarea
                  className="field min-h-24"
                  value={internalNote}
                  onChange={(event) => setInternalNote(event.target.value)}
                />
              </FormField>
              <Button
                disabled={busy}
                onClick={() =>
                  runAction(
                    () =>
                      apiClient.adminUpdateOrderStatus(
                        token,
                        detail.order.order_id,
                        orderStatus,
                        internalNote,
                      ).then((result) => {
                        upsertOrder(result.order);
                        setRemoteDetail((current) =>
                          current ? { ...current, order: result.order } : current,
                        );
                      }),
                    "อัปเดตสถานะออเดอร์แล้ว",
                  )
                }
              >
                บันทึกสถานะ
              </Button>
            </div>
          </Card>
        </div>

        <aside className="grid h-fit gap-6">
          <Card>
            <h2 className="text-lg font-bold text-cocoa-900">ตรวจสลิป</h2>
            <SlipViewer
              slipUrl={detail.payment?.slip_url}
              slipFileId={detail.payment?.slip_file_id}
            />
            <div className="mt-4 rounded-2xl bg-mint-50 p-3 text-sm leading-6 text-cocoa-700">
              ระบบ MVP ยังไม่ยืนยันยอดโอนอัตโนมัติ ให้ตรวจยอดเงิน วันที่ และชื่อบัญชีจากสลิปก่อนกดอนุมัติ
            </div>
            <div className="mt-4 grid gap-3">
              <Button
                disabled={busy}
                icon={<ShieldCheck size={18} />}
                onClick={() =>
                  runAction(
                    () =>
                      apiClient
                        .adminApprovePayment(token, detail.order.order_id)
                        .then((result) => {
                          upsertOrder(result.order);
                          upsertPayment(result.payment);
                          setRemoteDetail((current) =>
                            current
                              ? {
                                  ...current,
                                  order: result.order,
                                  payment: result.payment,
                                }
                              : current,
                          );
                        }),
                    "อนุมัติการชำระเงินแล้ว",
                  )
                }
              >
                Approve payment
              </Button>
              <FormField label="เหตุผลปฏิเสธ">
                <input
                  className="field"
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  placeholder="เช่น ยอดไม่ตรง / สลิปไม่ชัด"
                />
              </FormField>
              <Button
                variant="danger"
                disabled={busy || !rejectReason.trim()}
                icon={<XCircle size={18} />}
                onClick={() =>
                  runAction(
                    () =>
                      apiClient
                        .adminRejectPayment(
                          token,
                          detail.order.order_id,
                          rejectReason,
                        )
                        .then((result) => {
                          upsertOrder(result.order);
                          upsertPayment(result.payment);
                          setRemoteDetail((current) =>
                            current
                              ? {
                                  ...current,
                                  order: result.order,
                                  payment: result.payment,
                                }
                              : current,
                          );
                        }),
                    "ปฏิเสธสลิปแล้ว",
                  )
                }
              >
                Reject payment
              </Button>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-cocoa-900">ส่งสรุปทาง LINE</h2>
            <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-cream-50 p-3 text-sm leading-6 text-cocoa-700">
              {lineSummary}
            </pre>
            <Button
              className="mt-4 w-full"
              variant="secondary"
              icon={<Copy size={18} />}
              onClick={() => navigator.clipboard?.writeText(lineSummary)}
            >
              Copy ข้อความ
            </Button>
          </Card>
        </aside>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-cream-50 p-3">
      <p className="text-xs font-semibold text-cocoa-500">{label}</p>
      <p className="mt-1 font-bold text-cocoa-900">{value}</p>
    </div>
  );
}
