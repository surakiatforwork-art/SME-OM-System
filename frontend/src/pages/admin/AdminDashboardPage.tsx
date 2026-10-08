import { ClipboardList, Coins, Package, ReceiptText, Sprout } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AdminStatCard } from "../../components/admin/AdminStatCard";
import { PaymentStatusBadge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { LoadingState } from "../../components/ui/LoadingState";
import { buildDashboardData } from "../../lib/adminData";
import { formatCurrency, formatDateThai } from "../../lib/format";
import { useAdminDataStore } from "../../store/adminDataStore";

export function AdminDashboardPage() {
  const ordersById = useAdminDataStore((state) => state.ordersById);
  const productsById = useAdminDataStore((state) => state.productsById);
  const orderItemsByOrderId = useAdminDataStore((state) => state.orderItemsByOrderId);
  const loading = useAdminDataStore((state) => state.isBootstrapping);
  const error = useAdminDataStore((state) => state.error);
  const data = useMemo(
    () => buildDashboardData(ordersById, productsById, orderItemsByOrderId),
    [orderItemsByOrderId, ordersById, productsById],
  );

  if (loading) return <LoadingState />;
  if (error) return <Card className="text-red-700">{error}</Card>;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-cocoa-900">Dashboard</h1>
        <p className="mt-1 text-sm text-cocoa-500">
          ภาพรวมออเดอร์ ยอดขาย และงานที่ต้องจัดการวันนี้
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="ออเดอร์วันนี้"
          value={data.stats.today_orders}
          icon={<ClipboardList size={22} />}
        />
        <AdminStatCard
          label="ยอดขายวันนี้"
          value={formatCurrency(data.stats.today_sales)}
          icon={<Coins size={22} />}
        />
        <AdminStatCard
          label="รอตรวจสลิป"
          value={data.stats.pending_review}
          icon={<ReceiptText size={22} />}
        />
        <AdminStatCard
          label="สินค้าเปิดขาย"
          value={data.stats.active_products}
          helper={`${data.stats.low_stock_products} รายการใกล้หมด`}
          icon={<Package size={22} />}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-cocoa-900">ออเดอร์ล่าสุด</h2>
            <Link to="/admin/orders" className="text-sm font-bold text-mint-700">
              ดูทั้งหมด
            </Link>
          </div>
          {data.latest_orders.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="ยังไม่มีออเดอร์"
                description="เมื่อมีลูกค้าสั่งซื้อ ออเดอร์ล่าสุดจะแสดงที่นี่"
              />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-cocoa-500">
                  <tr>
                    <th className="py-3">เลขออเดอร์</th>
                    <th>ลูกค้า</th>
                    <th>รับสินค้า</th>
                    <th>ยอด</th>
                    <th>ชำระเงิน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-100">
                  {data.latest_orders.map((order) => (
                    <tr key={order.order_id}>
                      <td className="py-3 font-bold text-cocoa-900">
                        <Link to={`/admin/orders/${order.order_id}`}>
                          {order.order_id}
                        </Link>
                      </td>
                      <td>{order.customer_name}</td>
                      <td>{formatDateThai(order.pickup_date)}</td>
                      <td>{formatCurrency(order.total_amount)}</td>
                      <td>
                        <PaymentStatusBadge status={order.payment_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="grid gap-4">
          <Card>
            <h2 className="flex items-center gap-2 text-lg font-bold text-cocoa-900">
              <Sprout size={18} />
              รอบรับสินค้าที่กำลังจะถึง
            </h2>
            <div className="mt-4 grid gap-3">
              {data.upcoming_pickups.length === 0 ? (
                <p className="text-sm text-cocoa-500">ยังไม่มีรอบรับสินค้า</p>
              ) : (
                data.upcoming_pickups.map((item) => (
                  <div
                    key={item.pickup_date}
                    className="rounded-2xl bg-cream-50 p-3 text-sm"
                  >
                    <p className="font-bold text-cocoa-900">
                      {formatDateThai(item.pickup_date)}
                    </p>
                    <p className="text-cocoa-500">
                      {item.orders} ออเดอร์ · {formatCurrency(item.total_amount)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
          <Card>
            <h2 className="text-lg font-bold text-cocoa-900">เมนูขายดี</h2>
            <div className="mt-4 grid gap-3">
              {data.best_sellers.length === 0 ? (
                <p className="text-sm text-cocoa-500">ยังไม่มีข้อมูลขายดี</p>
              ) : (
                data.best_sellers.map((item) => (
                  <div
                    key={item.product_id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="font-semibold text-cocoa-800">
                      {item.product_name}
                    </span>
                    <span className="font-bold text-mint-700">{item.qty} ชิ้น</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
