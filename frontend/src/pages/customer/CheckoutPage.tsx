import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DeliveryMapPicker,
  formatDeliveryLocation,
  type DeliveryLocation,
} from "../../components/customer/DeliveryMapPicker";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { FormField } from "../../components/ui/FormField";
import { STORAGE_KEYS } from "../../lib/constants";
import { apiClient } from "../../lib/apiClient";
import {
  normalizePhone,
  readCustomerProfile,
  rememberCustomerAfterCreateOrder,
} from "../../lib/customerMemory";
import { getDeliveryAddressSummary, parseDeliveryLocation } from "../../lib/delivery";
import { formatCurrency, toInputDate } from "../../lib/format";
import { validateCheckout } from "../../lib/validators";
import { useCartStore } from "../../store/cartStore";
import type { PickupMethod } from "../../types/order";

export function CheckoutPage() {
  const navigate = useNavigate();
  const [storedProfile] = useState(() => readCustomerProfile());
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.subtotal());
  const clearCart = useCartStore((state) => state.clear);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocation | null>(
    storedProfile?.delivery_location ||
      parseDeliveryLocation(storedProfile?.delivery_address) ||
      null,
  );
  const [form, setForm] = useState({
    name: storedProfile?.name || "",
    phone: storedProfile?.phone || "",
    line_id: storedProfile?.line_id || "",
    pickup_date: toInputDate(),
    method: storedProfile?.pickup_method || ("delivery" as PickupMethod),
    delivery_address: storedProfile?.delivery_address
      ? getDeliveryAddressSummary(storedProfile.delivery_address)
      : "",
    customer_note: "",
  });
  const [prefillMessage, setPrefillMessage] = useState(
    storedProfile ? "ใช้ข้อมูลที่เคยสั่งไว้ในเครื่องนี้ให้แล้ว แก้ไขก่อนยืนยันได้ค่ะ" : "",
  );
  const [lookupStatus, setLookupStatus] = useState("");
  const lookedUpPhoneRef = useRef("");

  useEffect(() => {
    const phone = normalizePhone(form.phone);
    if (phone.length < 9) return;
    if (lookedUpPhoneRef.current === phone) return;
    if (storedProfile && normalizePhone(storedProfile.phone) === phone) return;

    const timer = window.setTimeout(async () => {
      try {
        lookedUpPhoneRef.current = phone;
        setLookupStatus("กำลังค้นหาข้อมูลเดิมจากเบอร์นี้...");
        const result = await apiClient.getCustomerProfileByPhone(phone);
        if (!result.found) {
          setLookupStatus("");
          return;
        }
        const location =
          result.last_delivery?.lat && result.last_delivery?.lng
            ? { lat: Number(result.last_delivery.lat), lng: Number(result.last_delivery.lng) }
            : parseDeliveryLocation(result.last_delivery?.delivery_address);
        setForm((current) => ({
          ...current,
          name: current.name || result.customer?.name || "",
          line_id: current.line_id || result.customer?.line_id || "",
          method: result.last_delivery?.pickup_method || current.method,
          delivery_address:
            current.delivery_address ||
            (result.last_delivery?.delivery_address
              ? getDeliveryAddressSummary(result.last_delivery.delivery_address)
              : ""),
        }));
        if (location) setDeliveryLocation(location);
        setPrefillMessage("พบข้อมูลเดิมจากเบอร์นี้ และใส่ข้อมูลล่าสุดให้แล้ว");
        setLookupStatus("");
      } catch {
        setLookupStatus("");
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [form.phone, storedProfile]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const locationText = formatDeliveryLocation(deliveryLocation);
    const deliveryAddress =
      form.method === "delivery"
        ? [form.delivery_address.trim(), locationText].filter(Boolean).join("\n\n")
        : "";
    const payload = {
      customer: {
        name: form.name,
        phone: form.phone,
        line_id: form.line_id,
      },
      pickup: {
        method: form.method,
        pickup_date: form.pickup_date,
        delivery_address: deliveryAddress,
      },
      items: items.map((item) => ({
        product_id: item.product.product_id,
        qty: item.qty,
      })),
      customer_note: form.customer_note,
    };

    const errors = validateCheckout(payload);
    if (errors.length > 0) {
      setError(errors[0]);
      return;
    }

    try {
      setSubmitting(true);
      const order = await apiClient.createOrder(payload);
      rememberCustomerAfterCreateOrder(payload, order, deliveryLocation);
      localStorage.setItem(
        `${STORAGE_KEYS.orderTokenPrefix}${order.order_id}`,
        order.order_token,
      );
      clearCart();
      navigate(`/payment/${order.order_id}?token=${encodeURIComponent(order.order_token)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "สร้างออเดอร์ไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="container-page py-8">
        <Card className="text-center">
          <h1 className="text-xl font-bold text-cocoa-900">ไม่มีสินค้าในตะกร้า</h1>
          <p className="mt-2 text-sm text-cocoa-500">
            กรุณาเลือกสินค้าก่อนกรอกข้อมูลรับสินค้า
          </p>
          <Button className="mt-5" onClick={() => navigate("/")}>
            กลับไปหน้าร้าน
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-page grid gap-6 py-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_400px]">
      <form className="surface grid min-w-0 gap-5 p-5 sm:p-6" onSubmit={handleSubmit}>
        <div>
          <h1 className="font-display text-4xl font-bold text-cocoa-900">
            ข้อมูลรับสินค้า
          </h1>
          <p className="mt-2 text-base leading-7 text-cocoa-500">
            กรอกข้อมูลเพื่อให้ร้านติดต่อและเตรียมสินค้าได้ถูกต้อง
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}
        {prefillMessage ? (
          <div className="rounded-2xl bg-mint-50 p-4 text-sm font-semibold leading-6 text-mint-800">
            {prefillMessage}
          </div>
        ) : null}
        {lookupStatus ? (
          <div className="rounded-2xl bg-cream-50 p-4 text-sm font-semibold text-cocoa-600">
            {lookupStatus}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="ชื่อผู้รับสินค้า">
            <input
              className="field"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="เช่น คุณเมย์"
            />
          </FormField>
          <FormField label="เบอร์โทร">
            <input
              className="field"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              placeholder="08x-xxx-xxxx"
              inputMode="tel"
            />
          </FormField>
        </div>
        <FormField label="LINE ID หรือช่องทางติดต่อ">
          <input
            className="field"
            value={form.line_id}
            onChange={(event) => setForm({ ...form, line_id: event.target.value })}
            placeholder="@line หรือ LINE ID"
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="วันที่ต้องการรับสินค้า">
            <input
              className="field"
              type="date"
              value={form.pickup_date}
              onChange={(event) =>
                setForm({ ...form, pickup_date: event.target.value })
              }
            />
          </FormField>
          <FormField label="วิธีรับสินค้า">
            <select
              className="field"
              value={form.method}
              onChange={(event) =>
                setForm({
                  ...form,
                  method: event.target.value as PickupMethod,
                })
              }
            >
              <option value="pickup">รับที่ร้าน</option>
              <option value="delivery">จัดส่ง</option>
            </select>
          </FormField>
        </div>
        {form.method === "delivery" ? (
          <div className="grid gap-4">
            <FormField label="ที่อยู่จัดส่ง">
              <textarea
                className="field min-h-28"
                value={form.delivery_address}
                onChange={(event) =>
                  setForm({ ...form, delivery_address: event.target.value })
                }
                placeholder="กรอกบ้านเลขที่ อาคาร หมู่บ้าน ชั้น จุดสังเกต หรือคำแนะนำสำหรับการจัดส่ง"
              />
            </FormField>
            <DeliveryMapPicker
              value={deliveryLocation}
              onChange={setDeliveryLocation}
            />
          </div>
        ) : null}
        <FormField label="หมายเหตุถึงร้าน">
          <textarea
            className="field min-h-24"
            value={form.customer_note}
            onChange={(event) =>
              setForm({ ...form, customer_note: event.target.value })
            }
            placeholder="เช่น แยกน้ำจิ้ม ไม่ใส่ถั่ว หรือเวลาที่สะดวกรับ"
          />
        </FormField>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "กำลังสร้างออเดอร์..." : "ยืนยันออเดอร์"}
        </Button>
      </form>

      <aside className="surface h-fit min-w-0 p-5">
        <h2 className="font-display text-2xl font-bold text-cocoa-900">ตรวจรายการ</h2>
        <div className="mt-4 grid gap-3">
          {items.map((item) => (
            <div
              key={item.product.product_id}
              className="flex items-start justify-between gap-3 border-b border-cream-100 pb-3 last:border-0"
            >
              <div>
                <p className="font-semibold text-cocoa-900">{item.product.name}</p>
                <p className="text-sm text-cocoa-500">x {item.qty}</p>
              </div>
              <p className="font-bold text-cocoa-900">
                {formatCurrency(item.product.price * item.qty)}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between rounded-xl bg-thaiTea-50 p-4">
          <span className="font-semibold text-cocoa-700">ยอดประมาณการ</span>
          <span className="text-2xl font-extrabold text-thaiTea-600">
            {formatCurrency(subtotal)}
          </span>
        </div>
        <p className="mt-3 text-xs leading-5 text-cocoa-500">
          ระบบจะคำนวณยอดจริงจากฐานข้อมูลสินค้าอีกครั้งหลังยืนยันออเดอร์
        </p>
      </aside>
    </div>
  );
}
