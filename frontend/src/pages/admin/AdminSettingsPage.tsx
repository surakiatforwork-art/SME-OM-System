import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { FormField } from "../../components/ui/FormField";
import { ApiClientError, apiClient } from "../../lib/apiClient";
import { maskPromptPayId } from "../../lib/promptpay";
import { useAdminDataStore } from "../../store/adminDataStore";
import { useAdminSessionStore } from "../../store/adminSessionStore";
import type { ShopSettings } from "../../types/shop";

export function AdminSettingsPage() {
  const token = useAdminSessionStore((state) => state.session?.session_token || "");
  const clearSession = useAdminSessionStore((state) => state.clearSession);
  const adminSettings = useAdminDataStore((state) => state.settings);
  const setAdminSettings = useAdminDataStore((state) => state.setSettings);
  const loading = useAdminDataStore((state) => state.isBootstrapping);
  const storeError = useAdminDataStore((state) => state.error);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (adminSettings) setSettings(adminSettings);
  }, [adminSettings]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const saved = await apiClient.adminUpdateShopSettings(token, settings);
      setSettings(saved);
      setAdminSettings(saved);
      setMessage("บันทึกการตั้งค่าร้านแล้ว");
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึก settings ไม่สำเร็จ");
      if (err instanceof ApiClientError && err.code === "UNAUTHORIZED") {
        clearSession();
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Card>กำลังโหลด settings...</Card>;

  if (!settings) {
    return (
      <Card className="grid gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-cocoa-900">
            โหลดหน้าตั้งค่าไม่สำเร็จ
          </h1>
          <p className="mt-2 text-sm leading-6 text-red-700">
            {error || storeError || "กรุณาเข้าสู่ระบบหลังบ้านใหม่อีกครั้ง"}
          </p>
        </div>
        <Button
          className="w-fit"
          onClick={() => {
            clearSession();
            window.location.hash = "#/admin/login";
            window.location.reload();
          }}
        >
          กลับไปหน้า Login
        </Button>
      </Card>
    );
  }

  return (
    <form className="grid gap-6" onSubmit={handleSubmit}>
      <div>
        <h1 className="text-2xl font-extrabold text-cocoa-900">ตั้งค่าร้าน</h1>
        <p className="mt-1 text-sm text-cocoa-500">
          แก้ชื่อร้าน ข้อมูลติดต่อ สถานะเปิดร้าน และข้อมูล PromptPay
        </p>
      </div>
      {message ? <Card className="bg-mint-50 text-mint-800">{message}</Card> : null}
      {error ? <Card className="bg-red-50 text-red-700">{error}</Card> : null}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="grid gap-4">
          <h2 className="text-lg font-bold text-cocoa-900">ข้อมูลหน้าร้าน</h2>
          <FormField label="ชื่อร้าน">
            <input
              className="field"
              value={settings.shop_name}
              onChange={(event) =>
                setSettings({ ...settings, shop_name: event.target.value })
              }
            />
          </FormField>
          <FormField label="คำอธิบายร้าน">
            <textarea
              className="field min-h-24"
              value={settings.shop_description}
              onChange={(event) =>
                setSettings({ ...settings, shop_description: event.target.value })
              }
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="เบอร์ติดต่อ">
              <input
                className="field"
                value={settings.contact_phone || ""}
                onChange={(event) =>
                  setSettings({ ...settings, contact_phone: event.target.value })
                }
              />
            </FormField>
            <FormField label="LINE ID">
              <input
                className="field"
                value={settings.line_id || ""}
                onChange={(event) =>
                  setSettings({ ...settings, line_id: event.target.value })
                }
              />
            </FormField>
          </div>
          <FormField label="ที่อยู่ร้าน">
            <textarea
              className="field min-h-20"
              value={settings.address || ""}
              onChange={(event) =>
                setSettings({ ...settings, address: event.target.value })
              }
            />
          </FormField>
          <label className="flex items-center gap-3 rounded-2xl bg-cream-50 p-4 text-sm font-semibold text-cocoa-700">
            <input
              type="checkbox"
              checked={settings.is_shop_open}
              onChange={(event) =>
                setSettings({ ...settings, is_shop_open: event.target.checked })
              }
            />
            เปิดรับออเดอร์
          </label>
          <FormField label="ข้อความเมื่อปิดร้าน">
            <input
              className="field"
              value={settings.closed_message || ""}
              onChange={(event) =>
                setSettings({ ...settings, closed_message: event.target.value })
              }
            />
          </FormField>
        </Card>

        <Card className="grid gap-4">
          <h2 className="text-lg font-bold text-cocoa-900">การชำระเงิน</h2>
          <FormField
            label="PromptPay ID"
            hint={`หน้าลูกค้าจะแสดงเป็น ${maskPromptPayId(settings.promptpay_id)}`}
          >
            <input
              className="field"
              value={settings.promptpay_id || ""}
              onChange={(event) =>
                setSettings({ ...settings, promptpay_id: event.target.value })
              }
              placeholder="แนะนำเบอร์พร้อมเพย์ของร้าน"
            />
          </FormField>
          <FormField label="ชื่อที่แสดงบนหน้าชำระเงิน">
            <input
              className="field"
              value={settings.promptpay_display_name || ""}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  promptpay_display_name: event.target.value,
                })
              }
            />
          </FormField>
          <FormField label="ชื่อบัญชีร้าน">
            <input
              className="field"
              value={settings.bank_account_name || ""}
              onChange={(event) =>
                setSettings({ ...settings, bank_account_name: event.target.value })
              }
            />
          </FormField>
          <FormField
            label="เลขบัญชีสำหรับโอนสำรอง"
            hint="จะแสดงใต้ QR ให้ลูกค้ากดคัดลอกได้"
          >
            <input
              className="field"
              value={settings.bank_account_number || ""}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  bank_account_number: event.target.value,
                })
              }
              placeholder="เช่น 123-4-56789-0"
              inputMode="numeric"
            />
          </FormField>
          <FormField label="คำแนะนำการชำระเงิน">
            <textarea
              className="field min-h-24"
              value={settings.payment_instructions || ""}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  payment_instructions: event.target.value,
                })
              }
            />
          </FormField>
          <FormField label="ข้อความขอบคุณ">
            <textarea
              className="field min-h-24"
              value={settings.thank_you_message || ""}
              onChange={(event) =>
                setSettings({ ...settings, thank_you_message: event.target.value })
              }
            />
          </FormField>
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
          </Button>
        </Card>
      </div>
    </form>
  );
}
