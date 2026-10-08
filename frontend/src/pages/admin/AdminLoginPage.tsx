import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { FormField } from "../../components/ui/FormField";
import { MOCK_MODE } from "../../lib/constants";
import { apiClient } from "../../lib/apiClient";
import { useAdminSessionStore } from "../../store/adminSessionStore";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const setSession = useAdminSessionStore((state) => state.setSession);
  const isAuthenticated = useAdminSessionStore((state) => state.isAuthenticated);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated()) navigate("/admin");
  }, [isAuthenticated, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      setSubmitting(true);
      const session = await apiClient.adminLogin(password);
      setSession(session);
      navigate("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container-page grid min-h-screen place-items-center py-8">
      <Card className="w-full max-w-md">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-cocoa-900">Admin Login</h1>
          <p className="mt-2 text-sm leading-6 text-cocoa-500">
            เข้าสู่หลังบ้านเพื่อจัดการสินค้า ออเดอร์ และการตั้งค่าร้าน
          </p>
        </div>
        {MOCK_MODE ? (
          <div className="mt-5 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
            Mock mode ใช้รหัสผ่าน `admin123`
          </div>
        ) : null}
        <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          <FormField label="Admin password">
            <input
              className="field"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="กรอกรหัสผ่านหลังบ้าน"
            />
          </FormField>
          {error ? (
            <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
