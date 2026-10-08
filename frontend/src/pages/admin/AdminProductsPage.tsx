import { Edit3, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { LoadingState } from "../../components/ui/LoadingState";
import { productListFromMap } from "../../lib/adminData";
import { apiClient } from "../../lib/apiClient";
import { formatCurrency } from "../../lib/format";
import { useAdminDataStore } from "../../store/adminDataStore";
import { useAdminSessionStore } from "../../store/adminSessionStore";
import type { Product } from "../../types/product";

export function AdminProductsPage() {
  const token = useAdminSessionStore((state) => state.session?.session_token || "");
  const productsById = useAdminDataStore((state) => state.productsById);
  const upsertProduct = useAdminDataStore((state) => state.upsertProduct);
  const sync = useAdminDataStore((state) => state.sync);
  const loading = useAdminDataStore((state) => state.isBootstrapping);
  const isSyncing = useAdminDataStore((state) => state.isSyncing);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const products = useMemo(() => productListFromMap(productsById), [productsById]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return products.filter((product) =>
      [product.name, product.category].join(" ").toLowerCase().includes(query),
    );
  }, [products, search]);

  async function toggleActive(product: Product) {
    try {
      setError("");
      const result = await apiClient.adminUpdateProduct(token, product.product_id, {
        is_active: !product.is_active,
      });
      upsertProduct(result.product);
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัปเดตสินค้าไม่สำเร็จ");
    }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`ลบสินค้า "${product.name}" หรือไม่?`)) return;
    try {
      setError("");
      const result = await apiClient.adminDeleteProduct(token, product.product_id);
      upsertProduct(result.product);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบสินค้าไม่สำเร็จ");
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-cocoa-900">จัดการสินค้า</h1>
          <p className="mt-1 text-sm text-cocoa-500">
            เพิ่ม แก้ไข เปิด/ปิด และตั้งจำนวนสินค้าที่รับได้
          </p>
        </div>
        <Link to="/admin/products/new">
          <Button icon={<Plus size={18} />}>เพิ่มสินค้า</Button>
        </Link>
      </div>
      {error ? <Card className="text-red-700">{error}</Card> : null}
      <Card>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            className="field"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาชื่อสินค้า/หมวดหมู่"
          />
          <Button
            variant="secondary"
            disabled={isSyncing}
            onClick={() => sync(token, ["products"])}
          >
            {isSyncing ? "กำลังรีเฟรช..." : "รีเฟรช"}
          </Button>
        </div>
        {filtered.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="ยังไม่มีสินค้า" actionLabel="เพิ่มสินค้า" onAction={() => {}} />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-cocoa-500">
                <tr>
                  <th className="py-3">สินค้า</th>
                  <th>ราคา</th>
                  <th>คงเหลือ</th>
                  <th>สถานะ</th>
                  <th className="text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100">
                {filtered.map((product) => (
                  <tr key={product.product_id}>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-14 w-14 rounded-2xl object-cover"
                        />
                        <div>
                          <p className="font-bold text-cocoa-900">{product.name}</p>
                          <p className="text-xs text-cocoa-500">{product.category}</p>
                        </div>
                      </div>
                    </td>
                    <td>{formatCurrency(product.price)}</td>
                    <td>
                      {product.stock_type === "limited"
                        ? `${product.remaining_qty}/${product.stock_qty}`
                        : "ไม่จำกัด"}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={product.is_active ? "green" : "gray"}>
                          {product.is_active ? "เปิดขาย" : "ปิดขาย"}
                        </Badge>
                        {product.is_preorder ? <Badge tone="amber">Preorder</Badge> : null}
                      </div>
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => toggleActive(product)}
                        >
                          {product.is_active ? "ปิด" : "เปิด"}
                        </Button>
                        <Link to={`/admin/products/${product.product_id}`}>
                          <Button size="sm" variant="secondary" icon={<Edit3 size={15} />}>
                            แก้ไข
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="danger"
                          icon={<Trash2 size={15} />}
                          onClick={() => deleteProduct(product)}
                        >
                          ลบ
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
