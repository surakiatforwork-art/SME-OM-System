import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { LoadingState } from "../../components/ui/LoadingState";
import { buildProductionSummary } from "../../lib/adminData";
import { downloadCsv, toInputDate } from "../../lib/format";
import { useAdminDataStore } from "../../store/adminDataStore";

export function AdminProductionPage() {
  const ordersById = useAdminDataStore((state) => state.ordersById);
  const orderItemsByOrderId = useAdminDataStore((state) => state.orderItemsByOrderId);
  const loading = useAdminDataStore((state) => state.isBootstrapping);
  const [pickupDate, setPickupDate] = useState(toInputDate());
  const [includePending, setIncludePending] = useState(false);
  const items = useMemo(
    () =>
      buildProductionSummary(
        ordersById,
        orderItemsByOrderId,
        pickupDate,
        includePending,
      ),
    [includePending, orderItemsByOrderId, ordersById, pickupDate],
  );

  function exportCsv() {
    const csv = [
      "product_id,product_name,total_qty,number_of_orders",
      ...items.map((item) =>
        [
          item.product_id,
          `"${item.product_name.replace(/"/g, '""')}"`,
          item.total_qty,
          item.number_of_orders,
        ].join(","),
      ),
    ].join("\n");
    downloadCsv(`production-${pickupDate}.csv`, csv);
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-cocoa-900">ยอดผลิต</h1>
        <p className="mt-1 text-sm text-cocoa-500">
          สรุปรายการสินค้าที่ต้องเตรียมตามวันที่รับสินค้า
        </p>
      </div>
      <Card className="grid gap-3 lg:grid-cols-[220px_1fr_auto]">
        <input
          className="field"
          type="date"
          value={pickupDate}
          onChange={(event) => setPickupDate(event.target.value)}
        />
        <label className="flex items-center gap-3 rounded-2xl bg-cream-50 px-4 py-3 text-sm font-semibold text-cocoa-700">
          <input
            type="checkbox"
            checked={includePending}
            onChange={(event) => setIncludePending(event.target.checked)}
          />
          รวมออเดอร์รอตรวจสลิป
        </label>
        <Button
          variant="secondary"
          icon={<Download size={18} />}
          onClick={exportCsv}
          disabled={items.length === 0}
        >
          Export CSV
        </Button>
      </Card>
      {loading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState
          title="ยังไม่มียอดผลิต"
          description="ค่าเริ่มต้นนับเฉพาะออเดอร์ที่ชำระเงินแล้ว"
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-cocoa-500">
              <tr>
                <th className="py-3">สินค้า</th>
                <th>จำนวนรวม</th>
                <th>จำนวนออเดอร์</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {items.map((item) => (
                <tr key={item.product_id}>
                  <td className="py-3 font-bold text-cocoa-900">{item.product_name}</td>
                  <td>{item.total_qty}</td>
                  <td>{item.number_of_orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
