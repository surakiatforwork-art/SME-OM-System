import { Download } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { LoadingState } from "../../components/ui/LoadingState";
import { buildSalesReport } from "../../lib/adminData";
import { downloadCsv, formatCurrency, toInputDate } from "../../lib/format";
import { useAdminDataStore } from "../../store/adminDataStore";

export function AdminReportsPage() {
  const ordersById = useAdminDataStore((state) => state.ordersById);
  const orderItemsByOrderId = useAdminDataStore((state) => state.orderItemsByOrderId);
  const loading = useAdminDataStore((state) => state.isBootstrapping);
  const [from, setFrom] = useState(toInputDate(new Date(Date.now() - 7 * 86400000)));
  const [to, setTo] = useState(toInputDate());
  const report = useMemo(
    () => buildSalesReport(ordersById, orderItemsByOrderId, from, to),
    [from, orderItemsByOrderId, ordersById, to],
  );

  function exportDailyCsv() {
    const csv = [
      "date,orders,paid_amount,pending_amount,cancelled_amount",
      ...report.daily.map((item) =>
        [
          item.date,
          item.orders,
          item.paid_amount,
          item.pending_amount,
          item.cancelled_amount,
        ].join(","),
      ),
    ].join("\n");
    downloadCsv(`sales-${from}-${to}.csv`, csv);
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-cocoa-900">รายงานยอดขาย</h1>
        <p className="mt-1 text-sm text-cocoa-500">
          ดูยอดขายรายวัน สถานะยอดเงิน และสินค้าขายดี
        </p>
      </div>
      <Card className="grid gap-3 lg:grid-cols-[180px_180px_auto]">
        <input
          className="field"
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
        />
        <input
          className="field"
          type="date"
          value={to}
          onChange={(event) => setTo(event.target.value)}
        />
        <Button
          variant="secondary"
          icon={<Download size={18} />}
          onClick={exportDailyCsv}
        >
          Export CSV
        </Button>
      </Card>
      {loading ? (
        <LoadingState />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Metric label="จำนวนออเดอร์" value={report.summary.total_orders} />
            <Metric label="ยอดรวม" value={formatCurrency(report.summary.gross_sales)} />
            <Metric label="ยอด paid" value={formatCurrency(report.summary.paid_sales)} />
            <Metric
              label="ยอด pending"
              value={formatCurrency(report.summary.pending_amount)}
            />
            <Metric
              label="ยอด cancelled"
              value={formatCurrency(report.summary.cancelled_amount)}
            />
          </section>
          <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="overflow-x-auto">
              <h2 className="text-lg font-bold text-cocoa-900">ยอดขายรายวัน</h2>
              <table className="mt-4 w-full min-w-[640px] text-left text-sm">
                <thead className="text-cocoa-500">
                  <tr>
                    <th className="py-3">วันที่</th>
                    <th>ออเดอร์</th>
                    <th>Paid</th>
                    <th>Pending</th>
                    <th>Cancelled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-100">
                  {report.daily.map((item) => (
                    <tr key={item.date}>
                      <td className="py-3 font-bold text-cocoa-900">{item.date}</td>
                      <td>{item.orders}</td>
                      <td>{formatCurrency(item.paid_amount)}</td>
                      <td>{formatCurrency(item.pending_amount)}</td>
                      <td>{formatCurrency(item.cancelled_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card>
              <h2 className="text-lg font-bold text-cocoa-900">สินค้าขายดี</h2>
              <div className="mt-4 grid gap-3">
                {report.best_sellers.length === 0 ? (
                  <p className="text-sm text-cocoa-500">ยังไม่มีข้อมูลสินค้า</p>
                ) : (
                  report.best_sellers.map((item) => (
                    <div
                      key={item.product_id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-cream-50 p-3 text-sm"
                    >
                      <span className="font-semibold text-cocoa-900">
                        {item.product_name}
                      </span>
                      <span className="font-bold text-mint-700">{item.qty}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card>
      <p className="text-sm font-semibold text-cocoa-500">{label}</p>
      <p className="mt-3 text-2xl font-extrabold text-cocoa-900">{value}</p>
    </Card>
  );
}
