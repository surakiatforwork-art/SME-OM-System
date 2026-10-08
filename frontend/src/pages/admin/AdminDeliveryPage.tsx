import "leaflet/dist/leaflet.css";

import L from "leaflet";
import {
  CheckCircle2,
  ExternalLink,
  List,
  MapPinned,
  Navigation,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { Link } from "react-router-dom";
import { OrderStatusBadge, PaymentStatusBadge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { LoadingState } from "../../components/ui/LoadingState";
import {
  getDeliveryAddressSummary,
  getGoogleMapsDirectionsUrl,
  parseDeliveryLocation,
} from "../../lib/delivery";
import { apiClient } from "../../lib/apiClient";
import { orderListFromMap } from "../../lib/adminData";
import { formatCurrency, formatDateThai } from "../../lib/format";
import { useAdminDataStore } from "../../store/adminDataStore";
import { useAdminSessionStore } from "../../store/adminSessionStore";
import type { Order } from "../../types/order";
import type { PaymentStatus } from "../../types/payment";

type DeliveryView = "list" | "map";
type SortMode = "pickup_asc" | "newest" | "amount_desc" | "customer_asc";

const DEFAULT_CENTER: [number, number] = [13.7563, 100.5018];

const markerIcon = L.divIcon({
  className: "delivery-map-marker",
  html: '<span></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

export function AdminDeliveryPage() {
  const token = useAdminSessionStore((state) => state.session?.session_token || "");
  const ordersById = useAdminDataStore((state) => state.ordersById);
  const upsertOrder = useAdminDataStore((state) => state.upsertOrder);
  const sync = useAdminDataStore((state) => state.sync);
  const loading = useAdminDataStore((state) => state.isBootstrapping);
  const isSyncing = useAdminDataStore((state) => state.isSyncing);
  const [view, setView] = useState<DeliveryView>("list");
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "">("");
  const [sortMode, setSortMode] = useState<SortMode>("pickup_asc");
  const [busyOrderId, setBusyOrderId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const orders = useMemo(
    () =>
      orderListFromMap(ordersById, { order_status: "delivering" }).filter(
        (order) => order.pickup_method === "delivery",
      ),
    [ordersById],
  );

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders
      .filter((order) =>
        paymentStatus ? order.payment_status === paymentStatus : true,
      )
      .filter((order) => {
        if (!query) return true;
        return [
          order.order_id,
          order.customer_name,
          order.phone,
          order.line_id || "",
          order.delivery_address || "",
          order.customer_note || "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        if (sortMode === "newest") return b.created_at.localeCompare(a.created_at);
        if (sortMode === "amount_desc") return b.total_amount - a.total_amount;
        if (sortMode === "customer_asc") {
          return a.customer_name.localeCompare(b.customer_name, "th");
        }
        return `${a.pickup_date}${a.created_at}`.localeCompare(
          `${b.pickup_date}${b.created_at}`,
        );
      });
  }, [orders, paymentStatus, search, sortMode]);

  const mappableOrders = useMemo(
    () =>
      filteredOrders
        .map((order) => ({ order, location: parseDeliveryLocation(order.delivery_address) }))
        .filter((item): item is { order: Order; location: { lat: number; lng: number } } =>
          Boolean(item.location),
        ),
    [filteredOrders],
  );

  async function markDelivered(order: Order) {
    try {
      setBusyOrderId(order.order_id);
      setError("");
      setMessage("");
      const result = await apiClient.adminUpdateOrderStatus(
        token,
        order.order_id,
        "completed",
        [order.internal_note || "", "จัดส่งแล้ว"].filter(Boolean).join("\n"),
      );
      upsertOrder(result.order);
      setMessage(`อัปเดต ${order.order_id} เป็นจัดส่งแล้ว`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัปเดตสถานะไม่สำเร็จ");
    } finally {
      setBusyOrderId("");
    }
  }

  return (
    <div className="grid gap-6 pb-24 lg:pb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-cocoa-900">การจัดส่ง</h1>
          <p className="mt-1 text-sm text-cocoa-500">
            รวมออเดอร์สถานะกำลังจัดส่ง พร้อมรายการและมุมมองแผนที่
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={isSyncing}
          onClick={() => sync(token, ["orders", "payments", "order_items"])}
        >
          {isSyncing ? "กำลังรีเฟรช..." : "รีเฟรช"}
        </Button>
      </div>

      {message ? (
        <Card className="border-mint-100 bg-mint-50 text-mint-800">{message}</Card>
      ) : null}
      {error ? <Card className="border-red-100 bg-red-50 text-red-700">{error}</Card> : null}

      <Card className="grid gap-3">
        <div className="grid gap-3 xl:grid-cols-[1.2fr_180px_180px_auto]">
          <label className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cocoa-500"
            />
            <input
              className="field pl-11"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหา order id / ชื่อ / เบอร์ / ที่อยู่"
            />
          </label>
          <select
            className="field"
            value={paymentStatus}
            onChange={(event) =>
              setPaymentStatus(event.target.value as PaymentStatus | "")
            }
          >
            <option value="">ทุกสถานะชำระเงิน</option>
            <option value="pending_review">รอตรวจสลิป</option>
            <option value="paid">ชำระแล้ว</option>
            <option value="unpaid">ยังไม่ชำระ</option>
            <option value="rejected">ปฏิเสธ</option>
          </select>
          <select
            className="field"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
          >
            <option value="pickup_asc">วันรับสินค้าใกล้สุด</option>
            <option value="newest">ออเดอร์ล่าสุด</option>
            <option value="amount_desc">ยอดสูงสุด</option>
            <option value="customer_asc">ชื่อลูกค้า A-Z</option>
          </select>
          <div className="hidden gap-2 xl:flex">
            <Button
              variant={view === "list" ? "primary" : "secondary"}
              icon={<List size={18} aria-hidden />}
              onClick={() => setView("list")}
            >
              รายการ
            </Button>
            <Button
              variant={view === "map" ? "primary" : "secondary"}
              icon={<MapPinned size={18} aria-hidden />}
              onClick={() => setView("map")}
            >
              แผนที่
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <Summary label="ทั้งหมด" value={filteredOrders.length} />
          <Summary label="มีพิกัด" value={mappableOrders.length} />
          <Summary
            label="ชำระแล้ว"
            value={filteredOrders.filter((order) => order.payment_status === "paid").length}
          />
        </div>
      </Card>

      {loading ? (
        <LoadingState />
      ) : filteredOrders.length === 0 ? (
        <EmptyState title="ยังไม่มีออเดอร์กำลังจัดส่ง" />
      ) : view === "list" ? (
        <section className="grid gap-4">
          {filteredOrders.map((order) => (
            <DeliveryOrderCard
              key={order.order_id}
              order={order}
              busy={busyOrderId === order.order_id}
              onDelivered={() => markDelivered(order)}
            />
          ))}
        </section>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="delivery-admin-map h-[70vh] min-h-[520px]">
            {mappableOrders.length === 0 ? (
              <div className="grid h-full place-items-center p-6 text-center">
                <div>
                  <p className="text-lg font-extrabold text-cocoa-900">
                    ยังไม่มีออเดอร์ที่มีพิกัด
                  </p>
                  <p className="mt-2 text-sm text-cocoa-500">
                    ออเดอร์จัดส่งที่ลูกค้าปักหมุดจากแผนที่จะขึ้นที่นี่
                  </p>
                </div>
              </div>
            ) : (
              <MapContainer
                center={DEFAULT_CENTER}
                zoom={12}
                scrollWheelZoom
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitDeliveryBounds items={mappableOrders} />
                {mappableOrders.map(({ order, location }) => (
                  <Marker
                    key={order.order_id}
                    icon={markerIcon}
                    position={[location.lat, location.lng]}
                  >
                    <Popup>
                      <div className="grid min-w-56 gap-2 text-sm">
                        <p className="font-bold text-cocoa-900">{order.order_id}</p>
                        <p>{order.customer_name}</p>
                        <p className="text-xs text-cocoa-600">
                          {getDeliveryAddressSummary(order.delivery_address)}
                        </p>
                        <a
                          className="font-bold text-mint-700"
                          href={getGoogleMapsDirectionsUrl(order)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          เปิดเส้นทางใน Google Maps
                        </a>
                        <button
                          type="button"
                          className="rounded-xl bg-mint-600 px-3 py-2 font-bold text-white disabled:opacity-60"
                          disabled={busyOrderId === order.order_id}
                          onClick={() => markDelivered(order)}
                        >
                          จัดส่งแล้ว
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>
        </Card>
      )}

      <div className="fixed bottom-4 left-4 right-4 z-40 grid grid-cols-2 gap-2 rounded-3xl bg-white/95 p-2 shadow-soft backdrop-blur xl:hidden">
        <Button
          variant={view === "list" ? "primary" : "ghost"}
          icon={<List size={18} aria-hidden />}
          onClick={() => setView("list")}
        >
          รายการ
        </Button>
        <Button
          variant={view === "map" ? "primary" : "ghost"}
          icon={<MapPinned size={18} aria-hidden />}
          onClick={() => setView("map")}
        >
          แผนที่
        </Button>
      </div>
    </div>
  );
}

function DeliveryOrderCard({
  order,
  busy,
  onDelivered,
}: {
  order: Order;
  busy: boolean;
  onDelivered: () => void;
}) {
  const location = parseDeliveryLocation(order.delivery_address);
  return (
    <Card className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/admin/orders/${order.order_id}`}
            className="text-lg font-extrabold text-cocoa-900"
          >
            {order.order_id}
          </Link>
          <OrderStatusBadge status={order.order_status} />
          <PaymentStatusBadge status={order.payment_status} />
        </div>
        <div className="grid gap-2 text-sm text-cocoa-700 sm:grid-cols-2 xl:grid-cols-4">
          <Info label="ลูกค้า" value={order.customer_name} />
          <Info label="โทร" value={order.phone} />
          <Info label="วันที่รับ" value={formatDateThai(order.pickup_date)} />
          <Info label="ยอด" value={formatCurrency(order.total_amount)} />
        </div>
        <div className="rounded-2xl bg-cream-50 p-3 text-sm leading-6 text-cocoa-700">
          <p className="font-bold text-cocoa-900">ที่อยู่จัดส่ง</p>
          <p className="mt-1 whitespace-pre-wrap">
            {getDeliveryAddressSummary(order.delivery_address)}
          </p>
          <p className="mt-2 text-xs font-semibold text-cocoa-500">
            {location
              ? `พิกัด ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
              : "ไม่มีพิกัดจากแผนที่"}
          </p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3 lg:w-44 lg:grid-cols-1">
        <a href={getGoogleMapsDirectionsUrl(order)} target="_blank" rel="noreferrer">
          <Button
            className="w-full"
            variant="secondary"
            icon={<Navigation size={18} aria-hidden />}
          >
            เปิดเส้นทาง
          </Button>
        </a>
        <Button
          className="w-full"
          icon={<CheckCircle2 size={18} aria-hidden />}
          disabled={busy}
          onClick={onDelivered}
        >
          {busy ? "กำลังอัปเดต..." : "จัดส่งแล้ว"}
        </Button>
        <Link to={`/admin/orders/${order.order_id}`}>
          <Button
            className="w-full"
            variant="ghost"
            icon={<ExternalLink size={18} aria-hidden />}
          >
            รายละเอียด
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function FitDeliveryBounds({
  items,
}: {
  items: Array<{ location: { lat: number; lng: number } }>;
}) {
  const map = useMap();

  useEffect(() => {
    if (items.length === 0) return;
    const bounds = L.latLngBounds(
      items.map((item) => [item.location.lat, item.location.lng]),
    );
    map.fitBounds(bounds, { padding: [42, 42], maxZoom: 15 });
  }, [items, map]);

  return null;
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-cream-50 p-3">
      <p className="text-xs font-semibold text-cocoa-500">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-cocoa-900">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-cocoa-500">{label}</p>
      <p className="mt-1 font-bold text-cocoa-900">{value}</p>
    </div>
  );
}
