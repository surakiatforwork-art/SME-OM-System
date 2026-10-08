import { Check, Copy, Download, Upload } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { LoadingState } from "../../components/ui/LoadingState";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_UPLOAD_MB,
  STORAGE_KEYS,
} from "../../lib/constants";
import { apiClient, fileToBase64Payload } from "../../lib/apiClient";
import { optimizeImageForUpload } from "../../lib/imageUpload";
import { rememberCustomerOrderDetail } from "../../lib/customerMemory";
import { usePublicDataStore } from "../../store/publicDataStore";
import { downloadQrCanvas } from "../../lib/qrcode";
import { formatCurrency } from "../../lib/format";
import { readAndValidateSlipQr } from "../../lib/slipQr";
import type { OrderDetail } from "../../types/order";

export function PaymentPage() {
  const { orderId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const token = useMemo(
    () =>
      searchParams.get("token") ||
      localStorage.getItem(`${STORAGE_KEYS.orderTokenPrefix}${orderId}`) ||
      "",
    [orderId, searchParams],
  );
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const settings = usePublicDataStore((state) => state.settings);
  const bootstrapPublicData = usePublicDataStore((state) => state.bootstrap);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<"" | "checking" | "optimizing" | "uploading" | "refreshing">("");
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!orderId || !token) {
        setError("ไม่พบ token สำหรับดูออเดอร์");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        bootstrapPublicData().catch(() => undefined);
        const data = await apiClient.getOrderStatus(orderId, token);
        if (active) setDetail(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "โหลดข้อมูลออเดอร์ไม่สำเร็จ");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [bootstrapPublicData, orderId, token]);

  async function handleSlipUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !detail) return;
    setError("");
    setMessage("");
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError("รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP");
      return;
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setError(`ไฟล์ต้องไม่เกิน ${MAX_UPLOAD_MB}MB`);
      return;
    }
    try {
      setUploading(true);
      setUploadStage("checking");
      const qrCheck = await readAndValidateSlipQr(file);
      if (!qrCheck.ok) {
        setError(qrCheck.message);
        return;
      }

      setUploadStage("optimizing");
      const optimizedFile = await optimizeImageForUpload(file, {
        maxDimension: 2000,
        quality: 0.9,
        skipBelowBytes: 600 * 1024,
      });
      const payload = await fileToBase64Payload(optimizedFile);
      payload.slip_qr_payload = qrCheck.payload;
      payload.slip_trans_ref = qrCheck.transRef;

      setUploadStage("uploading");
      await apiClient.uploadPaymentSlip(detail.order.order_id, token, payload);

      setUploadStage("refreshing");
      const refreshed = await apiClient.getOrderStatus(detail.order.order_id, token);
      setDetail(refreshed);
      rememberCustomerOrderDetail(refreshed);
      setMessage(
        "ขอบคุณค่ะ ร้านได้รับสลิปแล้วและจะตรวจสอบการชำระเงินให้เร็วที่สุด หากต้องการยกเลิกออเดอร์หลังจากนี้ กรุณาติดต่อร้านโดยตรง",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัปโหลดสลิปไม่สำเร็จ");
    } finally {
      setUploading(false);
      setUploadStage("");
      event.target.value = "";
    }
  }

  async function copyBankAccountNumber(accountNumber: string) {
    const value = accountNumber.trim();
    if (!value) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedAccount(true);
      window.setTimeout(() => setCopiedAccount(false), 1800);
    } catch {
      setError("คัดลอกเลขบัญชีไม่สำเร็จ กรุณาคัดลอกด้วยตนเอง");
    }
  }

  if (loading) return <LoadingState />;

  if (!detail) {
    return (
      <div className="container-page py-8">
        <div className="surface p-6 text-center">
          <h1 className="text-xl font-bold text-cocoa-900">ไม่พบข้อมูลออเดอร์</h1>
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <Link className="mt-5 inline-flex font-bold text-mint-700" to="/">
            กลับหน้าร้าน
          </Link>
        </div>
      </div>
    );
  }

  const payment = detail.payment;
  const payload = payment?.promptpay_payload || "";
  const bankAccountNumber = settings?.bank_account_number?.trim() || "";
  const hasPaymentActivity =
    detail.order.payment_status === "pending_review" ||
    detail.order.payment_status === "paid";
  const uploadStageMeta = {
    checking: { label: "กำลังตรวจ QR ในสลิป...", progress: 20 },
    optimizing: { label: "กำลังย่อรูปให้ส่งเร็วขึ้น...", progress: 42 },
    uploading: { label: "กำลังส่งสลิปไปยังร้าน...", progress: 76 },
    refreshing: { label: "กำลังยืนยันข้อมูลล่าสุด...", progress: 94 },
  } as const;
  const currentUploadStage = uploadStage ? uploadStageMeta[uploadStage] : null;

  return (
    <div className="container-page grid gap-6 py-6 sm:py-10 lg:grid-cols-[1fr_430px]">
      <section className="surface grid gap-5 p-5 sm:p-6">
        <div>
          <p className="text-sm font-bold text-thaiTea-600">เลขออเดอร์</p>
          <h1 className="font-display text-4xl font-bold text-cocoa-900">
            {detail.order.order_id}
          </h1>
        </div>
        <div className="rounded-xl bg-thaiTea-50 p-5">
          <p className="text-sm font-semibold text-cocoa-600">ยอดที่ต้องชำระ</p>
          <p className="mt-2 text-5xl font-extrabold text-thaiTea-600">
            {formatCurrency(detail.order.total_amount)}
          </p>
          <p className="mt-3 text-sm leading-6 text-cocoa-600">
            กรุณาชำระยอดให้ตรงกับออเดอร์ เพื่อให้ร้านตรวจสอบได้รวดเร็ว
          </p>
        </div>
        <div>
          <h2 className="text-lg font-bold text-cocoa-900">รายการสินค้า</h2>
          <div className="mt-3 grid gap-3">
            {detail.items.map((item) => (
              <div
                key={item.item_id}
              className="flex items-center justify-between rounded-xl bg-rice-100 p-3"
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
        <Link
          to={`/order/${detail.order.order_id}?token=${encodeURIComponent(token)}`}
          className="font-bold text-thaiTea-600"
        >
          ดูสถานะออเดอร์
        </Link>
      </section>

      <aside className="surface h-fit p-5 text-center sm:p-6">
        <h2 className="font-display text-3xl font-bold text-thaiTea-600">
          ชำระเงิน
        </h2>
        <p className="mt-1 text-sm text-cocoa-500">สแกนเพื่อชำระเงินตามยอดจริง</p>
        <div className="mt-4 grid gap-2 rounded-xl bg-rice-100 p-4 text-left text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-cocoa-500">ชื่อบัญชี</span>
            <span className="font-bold text-cocoa-900">
              {settings?.bank_account_name ||
                settings?.promptpay_display_name ||
                "ยังไม่ได้ตั้งค่า"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-cocoa-500">PromptPay</span>
            <span className="font-bold text-cocoa-900">
              {settings?.promptpay_id_masked || "ยังไม่ได้ตั้งค่า"}
            </span>
          </div>
        </div>
        <div className="mx-auto mt-5 grid w-fit place-items-center rounded-xl bg-rice-100 p-5 shadow-sm">
          {payload ? (
            <div className="rounded-xl bg-white p-4 shadow-soft">
            <QRCodeCanvas
              id="promptpay-qr"
              value={payload}
              size={240}
              includeMargin
              level="M"
            />
            </div>
          ) : (
            <div className="grid h-60 w-60 place-items-center rounded-xl bg-cream-100 text-sm text-red-600">
              ร้านยังไม่ได้ตั้งค่า PromptPay
            </div>
          )}
        </div>
        {bankAccountNumber ? (
          <div className="mt-4 rounded-xl border border-cream-200 bg-white p-3 text-left">
            <p className="text-xs font-semibold text-cocoa-500">
              เลขบัญชีสำหรับโอนสำรอง
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-lg font-extrabold text-cocoa-900">
                {bankAccountNumber}
              </span>
              <Button
                variant="secondary"
                size="sm"
                icon={
                  copiedAccount ? (
                    <Check size={16} aria-hidden />
                  ) : (
                    <Copy size={16} aria-hidden />
                  )
                }
                onClick={() => copyBankAccountNumber(bankAccountNumber)}
              >
                {copiedAccount ? "คัดลอกแล้ว" : "คัดลอก"}
              </Button>
            </div>
          </div>
        ) : null}
        <Button
          className="mt-4 w-full"
          variant="secondary"
          icon={<Download size={18} aria-hidden />}
          onClick={() => downloadQrCanvas("promptpay-qr", `${detail.order.order_id}.png`)}
          disabled={!payload}
        >
          ดาวน์โหลด QR
        </Button>
        <p className="mt-4 rounded-xl bg-thaiTea-50 p-3 text-left text-sm leading-6 text-cocoa-700">
          {settings?.payment_instructions ||
            "กรุณาชำระยอดให้ตรงกับออเดอร์ แล้วอัปโหลดสลิปเพื่อให้ร้านตรวจสอบ"}
        </p>
        {hasPaymentActivity ? (
          <p className="mt-4 rounded-xl bg-mint-50 p-3 text-left text-sm font-semibold leading-6 text-mint-800">
            ขอบคุณค่ะ ร้านได้รับข้อมูลการชำระเงินแล้ว หากต้องการเปลี่ยนแปลงหรือยกเลิกออเดอร์หลังจากนี้ กรุณาติดต่อร้านโดยตรง
          </p>
        ) : null}
        <label className="mt-4 block">
          <span className="sr-only">อัปโหลดสลิป</span>
          <input
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            className="hidden"
            onChange={handleSlipUpload}
            disabled={uploading}
          />
          <span className="inline-flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-thaiTea-600 px-5 text-lg font-bold text-white shadow-press">
            <Upload size={18} aria-hidden />
            {currentUploadStage?.label || "อัปโหลดสลิป"}
          </span>
        </label>
        {uploading && currentUploadStage ? (
          <div className="mt-3 rounded-xl bg-mint-50 p-3 text-left">
            <div className="flex items-center justify-between gap-3 text-xs font-bold text-mint-800">
              <span>{currentUploadStage.label}</span>
              <span>{currentUploadStage.progress}%</span>
            </div>
            <div className="upload-progress-track mt-2">
              <div
                className="upload-progress-bar"
                style={{ width: currentUploadStage.progress + "%" }}
              />
            </div>
            <p className="mt-2 text-xs leading-5 text-cocoa-500">
              กรุณารอสักครู่ ไม่ต้องกดซ้ำ ระบบกำลังจัดการภาพและบันทึกข้อมูลให้โดยอัตโนมัติ
            </p>
          </div>
        ) : null}
        {payment?.slip_url ? (
          <img
            src={payment.slip_url}
            alt="สลิปที่อัปโหลด"
            className="mt-4 max-h-72 w-full rounded-xl object-contain"
          />
        ) : null}
        {message ? (
          <p className="mt-4 rounded-xl bg-mint-50 p-3 text-sm font-semibold text-mint-700">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        ) : null}
      </aside>
    </div>
  );
}
