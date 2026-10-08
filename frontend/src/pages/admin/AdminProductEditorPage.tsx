import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { FormField } from "../../components/ui/FormField";
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_MB } from "../../lib/constants";
import { apiClient, fileToBase64Payload } from "../../lib/apiClient";
import { optimizeImageForUpload } from "../../lib/imageUpload";
import { useAdminDataStore } from "../../store/adminDataStore";
import { useAdminSessionStore } from "../../store/adminSessionStore";
import type { ProductInput, StockType } from "../../types/product";

const blankProduct: ProductInput = {
  name: "",
  description: "",
  price: 0,
  category: "",
  image_url: "",
  image_file_id: "",
  stock_type: "limited",
  stock_qty: 0,
  is_active: true,
  is_deleted: false,
  is_preorder: true,
  sort_order: 10,
};

export function AdminProductEditorPage() {
  const { productId = "new" } = useParams();
  const isNew = productId === "new";
  const navigate = useNavigate();
  const token = useAdminSessionStore((state) => state.session?.session_token || "");
  const productsById = useAdminDataStore((state) => state.productsById);
  const upsertProduct = useAdminDataStore((state) => state.upsertProduct);
  const isBootstrapping = useAdminDataStore((state) => state.isBootstrapping);
  const [form, setForm] = useState<ProductInput>(blankProduct);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (isNew || !token) return;
      try {
        setLoading(true);
        setError("");
        const product = productsById[productId];
        if (!product && isBootstrapping) return;
        if (!product) throw new Error("ไม่พบสินค้า");
        setForm(product);
      } catch (err) {
        setError(err instanceof Error ? err.message : "โหลดสินค้าไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isBootstrapping, isNew, productId, productsById, token]);

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError("รองรับเฉพาะ JPG, PNG หรือ WebP");
      return;
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setError(`ไฟล์ต้องไม่เกิน ${MAX_UPLOAD_MB}MB`);
      return;
    }
    try {
      setUploadingImage(true);
      const optimizedFile = await optimizeImageForUpload(file, {
        maxDimension: 1600,
        quality: 0.86,
        skipBelowBytes: 450 * 1024,
      });
      const payload = await fileToBase64Payload(optimizedFile);
      const uploaded = await apiClient.adminUploadProductImage(token, payload);
      setForm((current) => ({
        ...current,
        image_url: uploaded.image_url,
        image_file_id: uploaded.image_file_id,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัปโหลดรูปสินค้าไม่สำเร็จ");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("กรุณากรอกชื่อสินค้า");
      return;
    }
    if (Number(form.price) <= 0) {
      setError("กรุณากรอกราคาสินค้า");
      return;
    }
    try {
      setSaving(true);
      if (isNew) {
        const result = await apiClient.adminCreateProduct(token, form);
        upsertProduct(result.product);
      } else {
        const result = await apiClient.adminUpdateProduct(token, productId, {
          ...form,
          price: Number(form.price),
          stock_qty: Number(form.stock_qty),
          sort_order: Number(form.sort_order),
        });
        upsertProduct(result.product);
      }
      navigate("/admin/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกสินค้าไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Card>กำลังโหลดสินค้า...</Card>;

  return (
    <form className="grid gap-6" onSubmit={handleSubmit}>
      <div>
        <h1 className="text-2xl font-extrabold text-cocoa-900">
          {isNew ? "เพิ่มสินค้า" : "แก้ไขสินค้า"}
        </h1>
        <p className="mt-1 text-sm text-cocoa-500">
          ตั้งราคา จำนวนเปิดรับ รูปภาพ และสถานะการขาย
        </p>
      </div>
      {error ? <Card className="text-red-700">{error}</Card> : null}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="grid gap-4">
          <FormField label="ชื่อสินค้า">
            <input
              className="field"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </FormField>
          <FormField label="รายละเอียด">
            <textarea
              className="field min-h-28"
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="ราคา">
              <input
                className="field"
                type="number"
                min="0"
                value={form.price}
                onChange={(event) =>
                  setForm({ ...form, price: Number(event.target.value) })
                }
              />
            </FormField>
            <FormField label="หมวดหมู่">
              <input
                className="field"
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value })
                }
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="ประเภท stock">
              <select
                className="field"
                value={form.stock_type}
                onChange={(event) =>
                  setForm({ ...form, stock_type: event.target.value as StockType })
                }
              >
                <option value="limited">จำกัดจำนวน</option>
                <option value="unlimited">ไม่จำกัด</option>
              </select>
            </FormField>
            <FormField label="จำนวนที่เปิดรับ">
              <input
                className="field"
                type="number"
                min="0"
                disabled={form.stock_type === "unlimited"}
                value={form.stock_qty}
                onChange={(event) =>
                  setForm({ ...form, stock_qty: Number(event.target.value) })
                }
              />
            </FormField>
            <FormField label="ลำดับแสดงผล">
              <input
                className="field"
                type="number"
                value={form.sort_order}
                onChange={(event) =>
                  setForm({ ...form, sort_order: Number(event.target.value) })
                }
              />
            </FormField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl bg-cream-50 p-4 text-sm font-semibold text-cocoa-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  setForm({ ...form, is_active: event.target.checked })
                }
              />
              เปิดขาย
            </label>
            <label className="flex items-center gap-3 rounded-2xl bg-cream-50 p-4 text-sm font-semibold text-cocoa-700">
              <input
                type="checkbox"
                checked={form.is_preorder}
                onChange={(event) =>
                  setForm({ ...form, is_preorder: event.target.checked })
                }
              />
              สินค้า preorder
            </label>
          </div>
        </Card>
        <Card className="h-fit">
          <FormField label="รูปสินค้า" hint="รองรับ JPG, PNG, WebP ไม่เกิน 5MB">
            <input
              className="field"
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              onChange={handleImageChange}
              disabled={uploadingImage}
            />
          </FormField>
          {uploadingImage ? (
            <div className="mt-3 rounded-xl bg-mint-50 p-3 text-sm font-semibold text-mint-800">
              กำลังปรับขนาดและอัปโหลดรูปไปยัง Google Drive...
            </div>
          ) : null}
          <div className="mt-4 aspect-[4/3] overflow-hidden rounded-3xl bg-mint-50">
            {form.image_url ? (
              <img
                src={form.image_url}
                alt={form.name || "ตัวอย่างรูปสินค้า"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full place-items-center text-sm text-cocoa-500">
                ยังไม่มีรูปสินค้า
              </div>
            )}
          </div>
          <Button className="mt-5 w-full" type="submit" size="lg" disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึกสินค้า"}
          </Button>
        </Card>
      </div>
    </form>
  );
}
