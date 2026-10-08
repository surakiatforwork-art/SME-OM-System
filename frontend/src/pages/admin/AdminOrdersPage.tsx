import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { OrderStatusBadge, PaymentStatusBadge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { LoadingState } from "../../components/ui/LoadingState";
import { orderListFromMap } from "../../lib/adminData";
import { formatCurrency, formatDateThai } from "../../lib/format";
import { useAdminDataStore } from "../../store/adminDataStore";
import { useAdminSessionStore } from "../../store/adminSessionStore";
import type { OrderFilters, OrderStatus } from "../../types/order";
import type { PaymentStatus } from "../../types/payment";

export function AdminOrdersPage() {
  const token = useAdminSessionStore((state) => state.session?.session_token || "");
  const ordersById = useAdminDataStore((state) => state.ordersById);
  const sync = useAdminDataStore((state) => state.sync);
  const loading = useAdminDataStore((state) => state.isBootstrapping);
  const isSyncing = useAdminDataStore((state) => state.isSyncing);
  const error = useAdminDataStore((state) => state.error);
  const [filters, setFilters] = useState<OrderFilters>({});
  const orders = useMemo(
    () => orderListFromMap(ordersById, filters),
    [filters, ordersById],
  );

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-cocoa-900">จัดการออเดอร์</h1>
        <p className="mt-1 text-sm text-cocoa-500">
          ค้นหา ตรวจสลิป เปลี่ยนสถานะ และดูรายละเอียดออเดอร์
        </p>
      </div>
      <Card className="grid gap-3">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_180px_180px_180px_auto]">
          <label className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cocoa-500"
            />
            <input
              className="field pl-11"
              value={filters.search || ""}
              onChange={(event) =>
                setFilters({ ...filters, search: event.target.value })
              }
              placeholder="ค้นหา order id / ชื่อ / เบอร์โทร"
            />
          </label>
          <input
            className="field"
            type="date"
            value={filters.pickup_date || ""}
            onChange={(event) =>
              setFilters({ ...filters, pickup_date: event.target.value })
            }
          />
          <select
            className="field"
            value={filters.payment_status || ""}
            onChange={(event) =>
              setFilters({
                ...filters,
                payment_status: event.target.value as PaymentStatus | "",
              })
            }
          >
            <option value="">ทุกสถานะชำระเงิน</option>
            <option value="unpaid">ยังไม่ชำระ</option>
            <option value="pending_review">รอตรวจสลิป</option>
            <option value="paid">ชำระแล้ว</option>
            <option value="rejected">ปฏิเสธ</option>
          </select>
          <select
            className="field"
            value={filters.order_status || ""}
            onChange={(event) =>
              setFilters({
                ...filters,
                order_status: event.target.value as OrderStatus | "",
              })
            }
          >
            <option value="">ทุกสถานะออเดอร์</option>
            <option value="received">รับออเดอร์แล้ว</option>
            <option value="preparing">กำลังผลิต</option>
            <option value="ready">พร้อมรับสินค้า</option>
            <option value="delivering">กำลังจัดส่ง</option>
            <option value="completed">เสร็จสิ้น</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
          <Button
            variant="secondary"
            disabled={isSyncing}
            onClick={() => sync(token, ["orders", "payments", "order_items"])}
          >
            {isSyncing ? "กำลังรีเฟรช..." : "รีเฟรช"}
          </Button>
        </div>
      </Card>
      {error ? <Card className="text-red-700">{error}</Card> : null}
      {loading ? (
        <LoadingState />
      ) : orders.length === 0 ? (
        <EmptyState title="ยังไม่มีออเดอร์" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-cocoa-500">
              <tr>
                <th className="py-3">ออเดอร์</th>
                <th>ลูกค้า</th>
                <th>วันที่รับ</th>
                <th>ยอด</th>
                <th>ชำระเงิน</th>
                <th>สถานะ</th>
                <th className="text-right">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {orders.map((order) => (
                <tr key={order.order_id}>
                  <td className="py-3 font-bold text-cocoa-900">{order.order_id}</td>
                  <td>
                    <p className="font-semibold">{order.customer_name}</p>
                    <p className="text-xs text-cocoa-500">{order.phone}</p>
                  </td>
                  <td>{formatDateThai(order.pickup_date)}</td>
                  <td>{formatCurrency(order.total_amount)}</td>
                  <td>
                    <PaymentStatusBadge status={order.payment_status} />
                  </td>
                  <td>
                    <OrderStatusBadge status={order.order_status} />
                  </td>
                  <td className="text-right">
                    <Link to={`/admin/orders/${order.order_id}`}>
                      <Button size="sm" variant="secondary">
                        เปิด
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
