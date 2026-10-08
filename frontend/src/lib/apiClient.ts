import type {
  AdminBootstrapData,
  AdminBootstrapOptions,
  AdminOrderList,
  AdminProductList,
  AdminSession,
  AdminSyncDelta,
  AdminSyncScope,
  DashboardData,
  ProductionSummaryItem,
  SalesReport,
} from "../types/api";
import type {
  CreateOrderInput,
  CreateOrderResponse,
  Order,
  OrderDetail,
  OrderFilters,
  OrderItem,
  OrderStatus,
} from "../types/order";
import type {
  CustomerOrdersByPhoneResponse,
  CustomerProfileLookupResponse,
} from "../types/customer";
import type { PaymentStatus, Payment, UploadFilePayload } from "../types/payment";
import type { Product, ProductInput } from "../types/product";
import type { ShopSettings, ShopSettingsPatch } from "../types/shop";
import { API_URL, MOCK_MODE, STORAGE_KEYS } from "./constants";
import { createMockPromptPayPayload, maskPromptPayId } from "./promptpay";
import { sanitizeText, validateCheckout } from "./validators";

type Payload = Record<string, unknown>;

const API_CACHE_PREFIX = "sme-om-api-cache:";
const inFlightRequests = new Map<string, Promise<unknown>>();
const REQUEST_TIMEOUT_MS = 22_000;
const RETRYABLE_READ_ACTIONS = new Set([
  "getPublicBootstrap",
  "getShopSettingsPublic",
  "getProducts",
  "getProductDetail",
  "getOrderStatus",
  "getCustomerProfileByPhone",
  "listOrdersByPhone",
  "adminBootstrap",
  "adminSync",
  "adminGetDashboard",
  "adminListProducts",
  "adminListOrders",
  "adminGetOrderDetail",
  "adminGetProductionSummary",
  "adminGetSalesReport",
  "adminGetShopSettings",
]);

export class ApiClientError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
  }
}

function friendlyApiErrorMessage(code: string, fallback: string) {
  if (code === "INVALID_PROMPTPAY_ID") {
    return "ร้านยังตั้งค่า PromptPay ไม่ถูกต้อง กรุณาติดต่อร้านเพื่อแก้ไขข้อมูลการชำระเงิน";
  }
  if (code === "PROMPTPAY_NOT_CONFIGURED") {
    return "ร้านยังไม่ได้ตั้งค่า PromptPay กรุณาติดต่อร้านก่อนยืนยันออเดอร์";
  }
  if (code === "UNAUTHORIZED" || code === "INVALID_SESSION") {
    return "Session หลังบ้านหมดอายุ กรุณาเข้าสู่ระบบใหม่";
  }
  return fallback || "เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

function cacheKey(action: string, payload: Payload) {
  const safePayload = { ...payload };
  if ("session_token" in safePayload) safePayload.session_token = "admin-session";
  return `${API_CACHE_PREFIX}${action}:${JSON.stringify(safePayload)}`;
}

function readApiCache<T>(key: string) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as { data: T; expires_at: number };
  } catch {
    return null;
  }
}

function writeApiCache<T>(key: string, data: T, ttlMs: number) {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({ data, expires_at: Date.now() + ttlMs }),
    );
  } catch {
    // Cache is a speed optimization only.
  }
}

function clearApiCache() {
  try {
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith(API_CACHE_PREFIX))
      .forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // Ignore cache cleanup failures.
  }
}

interface MockSession {
  token: string;
  expires_at: string;
  is_revoked: boolean;
}

interface MockDb {
  settings: ShopSettings;
  products: Product[];
  orders: Order[];
  orderItems: OrderItem[];
  payments: Payment[];
  sessions: MockSession[];
}

function nowIso() {
  return new Date().toISOString();
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function randomToken(prefix = "tok") {
  const id =
    globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}_${id.replace(/-/g, "")}`;
}

function defaultSettings(): ShopSettings {
  return {
    shop_name: "Ruam Mit Home Bakery",
    shop_description:
      "ขนมไทยและขนมปังโฮมเมดทำสดตามรอบ รับพรีออเดอร์ จัดเซ็ตของฝาก และชำระผ่าน PromptPay QR ได้เลย",
    logo_url: "",
    contact_phone: "0800000000",
    line_id: "@mintbakery",
    address: "Bangkok, Thailand",
    pickup_instructions: "รับสินค้าได้ที่หน้าร้านตามวันที่เลือก เวลา 10:00-17:00",
    delivery_note: "จัดส่งในพื้นที่ตามรอบของร้าน ค่าจัดส่งจะแจ้งทาง LINE",
    is_shop_open: true,
    closed_message: "วันนี้ปิดรับออเดอร์ชั่วคราว กรุณากลับมาใหม่อีกครั้ง",
    promptpay_id: "0800000000",
    promptpay_id_masked: maskPromptPayId("0800000000"),
    promptpay_display_name: "Ruam Mit Home Bakery",
    bank_account_name: "Ruam Mit Home Bakery",
    bank_account_number: "000-0-00000-0",
    payment_instructions:
      "กรุณาชำระยอดให้ตรงกับออเดอร์ แล้วอัปโหลดสลิปเพื่อให้ร้านตรวจสอบ",
    thank_you_message: "ขอบคุณสำหรับออเดอร์ค่ะ ร้านจะตรวจสอบสลิปให้เร็วที่สุด",
  };
}

function defaultProducts(): Product[] {
  const created = nowIso();
  return [
    {
      product_id: "PRD-000001",
      name: "ทองหยิบ",
      description: "ขนมมงคลสีทอง หวานละมุน หอมกลิ่นมะลิ เหมาะกับเซ็ตของฝาก",
      price: 80,
      category: "ขนมไทย",
      image_url: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&w=900&q=80",
      image_file_id: "",
      stock_type: "limited",
      stock_qty: 40,
      sold_qty: 8,
      remaining_qty: 32,
      is_active: true,
      is_deleted: false,
      is_preorder: true,
      sort_order: 10,
      created_at: created,
      updated_at: created,
    },
    {
      product_id: "PRD-000002",
      name: "ข้าวเหนียวมะม่วง",
      description: "ข้าวเหนียวนุ่ม มะม่วงหวานฉ่ำ แยกน้ำกะทิให้ก่อนจัดส่ง",
      price: 120,
      category: "ขนมไทย",
      image_url: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=900&q=80",
      image_file_id: "",
      stock_type: "limited",
      stock_qty: 25,
      sold_qty: 20,
      remaining_qty: 5,
      is_active: true,
      is_deleted: false,
      is_preorder: true,
      sort_order: 20,
      created_at: created,
      updated_at: created,
    },
    {
      product_id: "PRD-000003",
      name: "ชิโอะปังเนยสด",
      description: "ขนมปังเกลือหอมเนย อบตามรอบ กรอบนอกนุ่มในตามเทรนด์",
      price: 55,
      category: "ขนมปัง",
      image_url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80",
      image_file_id: "",
      stock_type: "unlimited",
      stock_qty: 0,
      sold_qty: 0,
      remaining_qty: 999,
      is_active: true,
      is_deleted: false,
      is_preorder: true,
      sort_order: 30,
      created_at: created,
      updated_at: created,
    },
  ];
}

function initialMockDb(): MockDb {
  return {
    settings: defaultSettings(),
    products: defaultProducts(),
    orders: [],
    orderItems: [],
    payments: [],
    sessions: [],
  };
}

function getMockDb(): MockDb {
  const raw = localStorage.getItem(STORAGE_KEYS.mockDb);
  if (!raw) {
    const db = initialMockDb();
    saveMockDb(db);
    return db;
  }

  try {
    const parsed = JSON.parse(raw) as MockDb;
    return {
      ...initialMockDb(),
      ...parsed,
      settings: {
        ...defaultSettings(),
        ...parsed.settings,
        promptpay_id_masked: maskPromptPayId(parsed.settings?.promptpay_id),
      },
    };
  } catch {
    const db = initialMockDb();
    saveMockDb(db);
    return db;
  }
}

function saveMockDb(db: MockDb) {
  localStorage.setItem(STORAGE_KEYS.mockDb, JSON.stringify(db));
}

function productRemaining(product: Product) {
  if (product.stock_type === "unlimited") return 999;
  return Math.max(0, Number(product.stock_qty || 0) - Number(product.sold_qty || 0));
}

function publicSettings(settings: ShopSettings): ShopSettings {
  const { promptpay_id: _promptpayId, ...safe } = settings;
  return {
    ...safe,
    promptpay_id_masked: maskPromptPayId(settings.promptpay_id),
  };
}

function requireSession(db: MockDb, token: unknown) {
  if (typeof token !== "string" || token.length < 8) {
    throw new Error("กรุณาเข้าสู่ระบบหลังบ้านอีกครั้ง");
  }

  const session = db.sessions.find((item) => item.token === token);
  if (!session || session.is_revoked || new Date(session.expires_at) <= new Date()) {
    throw new Error("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
  }
}

function generateOrderId(db: MockDb) {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const prefix = `ORD-${yy}${mm}${dd}`;
  const count = db.orders.filter((order) => order.order_id.startsWith(prefix)).length + 1;
  return `${prefix}-${String(count).padStart(4, "0")}`;
}

function generatePaymentId(db: MockDb) {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const prefix = `PAY-${yy}${mm}${dd}`;
  const count =
    db.payments.filter((payment) => payment.payment_id.startsWith(prefix)).length + 1;
  return `${prefix}-${String(count).padStart(4, "0")}`;
}

function generateProductId(db: MockDb) {
  return `PRD-${String(db.products.length + 1).padStart(6, "0")}`;
}

function filterOrders(orders: Order[], filters: OrderFilters = {}) {
  const search = filters.search?.trim().toLowerCase();

  return orders.filter((order) => {
    if (filters.created_from && order.created_at.slice(0, 10) < filters.created_from) {
      return false;
    }
    if (filters.created_to && order.created_at.slice(0, 10) > filters.created_to) {
      return false;
    }
    if (filters.pickup_date && order.pickup_date !== filters.pickup_date) return false;
    if (filters.payment_status && order.payment_status !== filters.payment_status) {
      return false;
    }
    if (filters.order_status && order.order_status !== filters.order_status) return false;
    if (search) {
      const target = [
        order.order_id,
        order.customer_name,
        order.phone,
        order.line_id ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return target.includes(search);
    }
    return true;
  });
}

function buildDashboard(db: MockDb): DashboardData {
  const today = todayIsoDate();
  const todayOrders = db.orders.filter((order) => order.created_at.slice(0, 10) === today);
  const paidOrders = db.orders.filter((order) => order.payment_status === "paid");
  const pendingReview = db.orders.filter(
    (order) => order.payment_status === "pending_review",
  );

  const bestSellerMap = new Map<string, DashboardData["best_sellers"][number]>();
  for (const item of db.orderItems) {
    const current = bestSellerMap.get(item.product_id) ?? {
      product_id: item.product_id,
      product_name: item.product_name_snapshot,
      qty: 0,
      amount: 0,
    };
    current.qty += item.qty;
    current.amount += item.subtotal;
    bestSellerMap.set(item.product_id, current);
  }

  const pickupMap = new Map<string, { pickup_date: string; orders: number; total_amount: number }>();
  for (const order of db.orders) {
    if (order.order_status === "cancelled") continue;
    const current = pickupMap.get(order.pickup_date) ?? {
      pickup_date: order.pickup_date,
      orders: 0,
      total_amount: 0,
    };
    current.orders += 1;
    current.total_amount += order.total_amount;
    pickupMap.set(order.pickup_date, current);
  }

  return {
    stats: {
      today_orders: todayOrders.length,
      today_sales: todayOrders.reduce((sum, order) => sum + order.total_amount, 0),
      paid_sales: paidOrders.reduce((sum, order) => sum + order.total_amount, 0),
      pending_review: pendingReview.length,
      preparing_orders: db.orders.filter((order) => order.order_status === "preparing")
        .length,
      active_products: db.products.filter(
        (product) => product.is_active && !product.is_deleted,
      ).length,
      low_stock_products: db.products.filter(
        (product) =>
          product.stock_type === "limited" &&
          !product.is_deleted &&
          productRemaining(product) <= 5,
      ).length,
    },
    latest_orders: [...db.orders]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 6),
    best_sellers: [...bestSellerMap.values()]
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5),
    upcoming_pickups: [...pickupMap.values()]
      .filter((item) => item.pickup_date >= today)
      .sort((a, b) => a.pickup_date.localeCompare(b.pickup_date))
      .slice(0, 5),
  };
}

function buildProductionSummary(
  db: MockDb,
  pickupDate: string,
  includePendingReview: boolean,
) {
  const eligiblePaymentStatuses: PaymentStatus[] = includePendingReview
    ? ["paid", "pending_review"]
    : ["paid"];
  const orders = db.orders.filter(
    (order) =>
      order.pickup_date === pickupDate &&
      eligiblePaymentStatuses.includes(order.payment_status) &&
      order.order_status !== "cancelled",
  );
  const orderIds = new Set(orders.map((order) => order.order_id));
  const map = new Map<string, ProductionSummaryItem>();

  for (const item of db.orderItems.filter((entry) => orderIds.has(entry.order_id))) {
    const current = map.get(item.product_id) ?? {
      product_id: item.product_id,
      product_name: item.product_name_snapshot,
      total_qty: 0,
      number_of_orders: 0,
    };
    current.total_qty += item.qty;
    current.number_of_orders += 1;
    map.set(item.product_id, current);
  }

  return [...map.values()].sort((a, b) => b.total_qty - a.total_qty);
}

function buildSalesReport(db: MockDb, from?: string, to?: string): SalesReport {
  const filtered = db.orders.filter((order) => {
    const date = order.created_at.slice(0, 10);
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  });

  const dailyMap = new Map<
    string,
    SalesReport["daily"][number]
  >();

  for (const order of filtered) {
    const date = order.created_at.slice(0, 10);
    const current = dailyMap.get(date) ?? {
      date,
      orders: 0,
      paid_amount: 0,
      pending_amount: 0,
      cancelled_amount: 0,
    };
    current.orders += 1;
    if (order.order_status === "cancelled") current.cancelled_amount += order.total_amount;
    else if (order.payment_status === "paid") current.paid_amount += order.total_amount;
    else if (order.payment_status === "pending_review") {
      current.pending_amount += order.total_amount;
    }
    dailyMap.set(date, current);
  }

  const orderIds = new Set(filtered.map((order) => order.order_id));
  const sellerMap = new Map<string, DashboardData["best_sellers"][number]>();
  for (const item of db.orderItems.filter((entry) => orderIds.has(entry.order_id))) {
    const current = sellerMap.get(item.product_id) ?? {
      product_id: item.product_id,
      product_name: item.product_name_snapshot,
      qty: 0,
      amount: 0,
    };
    current.qty += item.qty;
    current.amount += item.subtotal;
    sellerMap.set(item.product_id, current);
  }

  return {
    summary: {
      total_orders: filtered.length,
      gross_sales: filtered.reduce((sum, order) => sum + order.total_amount, 0),
      paid_sales: filtered
        .filter((order) => order.payment_status === "paid")
        .reduce((sum, order) => sum + order.total_amount, 0),
      pending_amount: filtered
        .filter((order) => order.payment_status === "pending_review")
        .reduce((sum, order) => sum + order.total_amount, 0),
      cancelled_amount: filtered
        .filter((order) => order.order_status === "cancelled")
        .reduce((sum, order) => sum + order.total_amount, 0),
    },
    daily: [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    best_sellers: [...sellerMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 8),
  };
}

function buildAdminBootstrap(db: MockDb): AdminBootstrapData {
  const now = nowIso();
  return {
    settings: db.settings,
    products: db.products.map((product) => ({
      ...product,
      remaining_qty: productRemaining(product),
    })),
    orders: [...db.orders].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    order_items: db.orderItems,
    payments: db.payments,
    server_time: now,
    next_sync_cursor: now,
  };
}

function buildAdminSyncDelta(db: MockDb, since: string): AdminSyncDelta {
  const now = nowIso();
  const isAfter = (value?: string) => !since || String(value || "") > since;
  return {
    orders_upsert: db.orders.filter((order) => isAfter(order.updated_at)),
    payments_upsert: db.payments.filter((payment) => isAfter(payment.updated_at)),
    products_upsert: db.products
      .filter((product) => isAfter(product.updated_at))
      .map((product) => ({ ...product, remaining_qty: productRemaining(product) })),
    order_items_upsert: db.orderItems.filter((item) => isAfter(item.created_at)),
    settings_patch: null,
    deleted_product_ids: db.products
      .filter((product) => isAfter(product.updated_at) && product.is_deleted)
      .map((product) => product.product_id),
    server_time: now,
    next_sync_cursor: now,
  };
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function ordersToCsv(orders: Order[]) {
  const headers = [
    "order_id",
    "created_at",
    "customer_name",
    "phone",
    "pickup_method",
    "pickup_date",
    "total_amount",
    "payment_status",
    "order_status",
  ];
  const rows = orders.map((order) => headers.map((key) => csvEscape(order[key as keyof Order])));
  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

function publicOrderSummary(order: Order) {
  return {
    order_id: order.order_id,
    created_at: order.created_at,
    pickup_date: order.pickup_date,
    total_amount: order.total_amount,
    payment_status: order.payment_status,
    order_status: order.order_status,
  };
}

async function mockRequest<T>(action: string, payload: Payload): Promise<T> {
  const db = getMockDb();
  const body = payload as Record<string, any>;

  switch (action) {
    case "getShopSettingsPublic":
      return publicSettings(db.settings) as T;

    case "getProducts": {
      const search = String(body.search ?? "").toLowerCase();
      const category = String(body.category ?? "");
      const products = db.products
        .filter((product) => product.is_active && !product.is_deleted)
        .filter((product) => !category || product.category === category)
        .filter((product) =>
          search
            ? [product.name, product.description, product.category]
                .join(" ")
                .toLowerCase()
                .includes(search)
            : true,
        )
        .map((product) => ({
          ...product,
          remaining_qty: productRemaining(product),
        }))
        .sort((a, b) => a.sort_order - b.sort_order);
      return { products } as T;
    }

    case "getProductDetail": {
      const product = db.products.find(
        (item) => item.product_id === body.product_id && !item.is_deleted,
      );
      if (!product) throw new Error("ไม่พบสินค้า");
      return { product: { ...product, remaining_qty: productRemaining(product) } } as T;
    }

    case "createOrder": {
      const input = body as CreateOrderInput;
      const errors = validateCheckout(input);
      if (errors.length > 0) throw new Error(errors[0]);
      if (!db.settings.is_shop_open) {
        throw new Error(db.settings.closed_message || "ร้านปิดรับออเดอร์ชั่วคราว");
      }
      if (!db.settings.promptpay_id) throw new Error("ร้านยังไม่ได้ตั้งค่า PromptPay");

      const orderItems: OrderItem[] = [];
      let total = 0;

      for (const entry of input.items) {
        const product = db.products.find(
          (item) =>
            item.product_id === entry.product_id &&
            item.is_active &&
            !item.is_deleted,
        );
        if (!product) throw new Error("มีสินค้าที่ไม่พร้อมขายในตะกร้า");
        const qty = Number(entry.qty || 0);
        const remaining = productRemaining(product);
        if (qty < 1) throw new Error("จำนวนสินค้าไม่ถูกต้อง");
        if (product.stock_type === "limited" && qty > remaining) {
          throw new Error(`${product.name} เหลือ ${remaining} ชิ้น`);
        }
        total += product.price * qty;
      }

      const orderId = generateOrderId(db);
      const orderToken = randomToken("order");
      const createdAt = nowIso();
      const paymentId = generatePaymentId(db);

      for (const [index, entry] of input.items.entries()) {
        const product = db.products.find((item) => item.product_id === entry.product_id);
        if (!product) continue;
        const qty = Number(entry.qty);
        product.sold_qty += qty;
        product.remaining_qty = productRemaining(product);
        product.updated_at = createdAt;
        orderItems.push({
          item_id: `ITM-${orderId}-${String(index + 1).padStart(3, "0")}`,
          order_id: orderId,
          product_id: product.product_id,
          product_name_snapshot: product.name,
          unit_price_snapshot: product.price,
          qty,
          subtotal: product.price * qty,
          image_url: product.image_url,
          created_at: createdAt,
        });
      }

      const order: Order = {
        order_id: orderId,
        order_token: orderToken,
        created_at: createdAt,
        customer_name: sanitizeText(input.customer.name, 120),
        phone: sanitizeText(input.customer.phone, 40),
        line_id: sanitizeText(input.customer.line_id ?? "", 80),
        pickup_method: input.pickup.method,
        pickup_date: input.pickup.pickup_date,
        delivery_address: sanitizeText(input.pickup.delivery_address ?? "", 500),
        customer_note: sanitizeText(input.customer_note ?? "", 500),
        internal_note: "",
        total_amount: total,
        payment_status: "unpaid",
        order_status: "received",
        source: "mock-web",
        updated_at: createdAt,
      };

      const payment: Payment = {
        payment_id: paymentId,
        order_id: orderId,
        amount: total,
        promptpay_payload: createMockPromptPayPayload(db.settings.promptpay_id, total),
        payment_status: "unpaid",
        created_at: createdAt,
        updated_at: createdAt,
      };

      db.orders.push(order);
      db.orderItems.push(...orderItems);
      db.payments.push(payment);
      saveMockDb(db);

      return ({
        order_id: orderId,
        order_token: orderToken,
        total_amount: total,
        payment_status: "unpaid",
        order_status: "received",
        promptpay_payload: payment.promptpay_payload,
        payment_id: paymentId,
      } satisfies CreateOrderResponse) as T;
    }

    case "getOrderStatus": {
      const order = db.orders.find((item) => item.order_id === body.order_id);
      if (!order || order.order_token !== body.order_token) {
        throw new Error("ไม่พบออเดอร์หรือ token ไม่ถูกต้อง");
      }
      const items = db.orderItems.filter((item) => item.order_id === order.order_id);
      const payment = db.payments.find((item) => item.order_id === order.order_id) ?? null;
      return ({ order, items, payment } satisfies OrderDetail) as T;
    }

    case "getCustomerProfileByPhone": {
      const phone = String(body.phone || "").replace(/\D/g, "");
      const normalizedPhone =
        phone.length === 9 && /^[689]/.test(phone) ? `0${phone}` : phone;
      const orders = db.orders
        .filter((order) => {
          const orderPhone = String(order.phone || "").replace(/\D/g, "");
          return orderPhone === normalizedPhone || orderPhone === phone;
        })
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      const latest = orders[0];
      if (!latest) return { found: false } as T;
      const latestDelivery =
        orders.find((order) => order.pickup_method === "delivery" && order.delivery_address) ||
        latest;
      return ({
        found: true,
        customer: {
          name: latest.customer_name,
          phone: latest.phone,
          line_id: latest.line_id,
        },
        last_delivery: {
          pickup_method: latestDelivery.pickup_method,
          delivery_address: latestDelivery.delivery_address,
        },
      } satisfies CustomerProfileLookupResponse) as T;
    }

    case "listOrdersByPhone": {
      const phone = String(body.phone || "").replace(/\D/g, "");
      const normalizedPhone =
        phone.length === 9 && /^[689]/.test(phone) ? `0${phone}` : phone;
      return ({
        orders: db.orders
          .filter((order) => {
            const orderPhone = String(order.phone || "").replace(/\D/g, "");
            return orderPhone === normalizedPhone || orderPhone === phone;
          })
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .slice(0, 12)
          .map(publicOrderSummary),
      } satisfies CustomerOrdersByPhoneResponse) as T;
    }

    case "cancelOrderByCustomer": {
      const order = db.orders.find((item) => item.order_id === body.order_id);
      if (!order || order.order_token !== body.order_token) {
        throw new Error("ไม่พบออเดอร์หรือ token ไม่ถูกต้อง");
      }
      if (order.payment_status !== "unpaid") {
        throw new Error("ออเดอร์นี้มีการชำระเงินแล้ว กรุณาติดต่อร้านโดยตรง");
      }
      if (order.order_status !== "received") {
        throw new Error("ร้านเริ่มจัดการออเดอร์นี้แล้ว กรุณาติดต่อร้านโดยตรง");
      }
      const updatedAt = nowIso();
      order.order_status = "cancelled";
      order.updated_at = updatedAt;
      for (const item of db.orderItems.filter((entry) => entry.order_id === order.order_id)) {
        const product = db.products.find((entry) => entry.product_id === item.product_id);
        if (!product) continue;
        product.sold_qty = Math.max(0, Number(product.sold_qty || 0) - Number(item.qty || 0));
        product.remaining_qty = productRemaining(product);
        product.updated_at = updatedAt;
      }
      saveMockDb(db);
      return ({
        order,
        items: db.orderItems.filter((item) => item.order_id === order.order_id),
        payment: db.payments.find((item) => item.order_id === order.order_id) ?? null,
      } satisfies OrderDetail) as T;
    }

    case "uploadPaymentSlip": {
      const order = db.orders.find((item) => item.order_id === body.order_id);
      if (!order || order.order_token !== body.order_token) {
        throw new Error("ไม่พบออเดอร์หรือ token ไม่ถูกต้อง");
      }
      const file = body.file as UploadFilePayload | undefined;
      if (!file?.base64) throw new Error("กรุณาเลือกไฟล์สลิป");
      const payment = db.payments.find((item) => item.order_id === order.order_id);
      if (!payment) throw new Error("ไม่พบข้อมูลการชำระเงิน");
      const uploadedAt = nowIso();
      payment.slip_url = `data:${file.mime_type};base64,${file.base64}`;
      payment.slip_file_id = `mock-${file.name}`;
      payment.payment_status = "pending_review";
      payment.uploaded_at = uploadedAt;
      payment.updated_at = uploadedAt;
      order.payment_status = "pending_review";
      order.updated_at = uploadedAt;
      saveMockDb(db);
      return { payment_status: "pending_review", slip_url: payment.slip_url } as T;
    }

    case "adminLogin": {
      if (String(body.password ?? "") !== "admin123") {
        throw new Error("รหัสผ่านไม่ถูกต้อง");
      }
      const expires = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
      const token = randomToken("admin");
      db.sessions.push({ token, expires_at: expires, is_revoked: false });
      saveMockDb(db);
      return ({ session_token: token, expires_at: expires } satisfies AdminSession) as T;
    }

    case "adminLogout": {
      const session = db.sessions.find((item) => item.token === body.session_token);
      if (session) session.is_revoked = true;
      saveMockDb(db);
      return { success: true } as T;
    }

    case "adminBootstrap":
      requireSession(db, body.session_token);
      return buildAdminBootstrap(db) as T;

    case "adminSync":
      requireSession(db, body.session_token);
      return buildAdminSyncDelta(db, String(body.since || "")) as T;

    case "adminGetDashboard":
      requireSession(db, body.session_token);
      return buildDashboard(db) as T;

    case "adminListProducts":
      requireSession(db, body.session_token);
      return ({
        products: db.products
          .filter((product) => body.include_deleted || !product.is_deleted)
          .map((product) => ({ ...product, remaining_qty: productRemaining(product) }))
          .sort((a, b) => a.sort_order - b.sort_order),
      } satisfies AdminProductList) as T;

    case "adminCreateProduct": {
      requireSession(db, body.session_token);
      const input = body.product as ProductInput;
      const createdAt = nowIso();
      const product: Product = {
        product_id: generateProductId(db),
        name: sanitizeText(input.name, 160),
        description: sanitizeText(input.description ?? "", 1000),
        price: Number(input.price || 0),
        category: sanitizeText(input.category ?? "ทั่วไป", 80),
        image_url: input.image_url || "",
        image_file_id: input.image_file_id || "",
        stock_type: input.stock_type ?? "unlimited",
        stock_qty: Number(input.stock_qty || 0),
        sold_qty: 0,
        remaining_qty: input.stock_type === "limited" ? Number(input.stock_qty || 0) : 999,
        is_active: Boolean(input.is_active),
        is_deleted: false,
        is_preorder: Boolean(input.is_preorder),
        sort_order: Number(input.sort_order || db.products.length + 1),
        created_at: createdAt,
        updated_at: createdAt,
      };
      db.products.push(product);
      saveMockDb(db);
      return { product } as T;
    }

    case "adminUpdateProduct": {
      requireSession(db, body.session_token);
      const product = db.products.find((item) => item.product_id === body.product_id);
      if (!product) throw new Error("ไม่พบสินค้า");
      const patch = body.patch as Partial<Product>;
      Object.assign(product, {
        ...patch,
        remaining_qty:
          patch.stock_type === "unlimited" || product.stock_type === "unlimited"
            ? 999
            : Math.max(0, Number(patch.stock_qty ?? product.stock_qty) - product.sold_qty),
        updated_at: nowIso(),
      });
      saveMockDb(db);
      return { product } as T;
    }

    case "adminDeleteProduct": {
      requireSession(db, body.session_token);
      const product = db.products.find((item) => item.product_id === body.product_id);
      if (!product) throw new Error("ไม่พบสินค้า");
      product.is_deleted = true;
      product.is_active = false;
      product.updated_at = nowIso();
      saveMockDb(db);
      return { product } as T;
    }

    case "adminUploadProductImage": {
      requireSession(db, body.session_token);
      const file = body.file as UploadFilePayload;
      return {
        image_url: `data:${file.mime_type};base64,${file.base64}`,
        image_file_id: `mock-${file.name}`,
      } as T;
    }

    case "adminListOrders":
      requireSession(db, body.session_token);
      return ({
        orders: filterOrders(db.orders, body.filters as OrderFilters).sort((a, b) =>
          b.created_at.localeCompare(a.created_at),
        ),
      } satisfies AdminOrderList) as T;

    case "adminGetOrderDetail": {
      requireSession(db, body.session_token);
      const order = db.orders.find((item) => item.order_id === body.order_id);
      if (!order) throw new Error("ไม่พบออเดอร์");
      return ({
        order,
        items: db.orderItems.filter((item) => item.order_id === order.order_id),
        payment: db.payments.find((item) => item.order_id === order.order_id) ?? null,
      } satisfies OrderDetail) as T;
    }

    case "adminApprovePayment": {
      requireSession(db, body.session_token);
      const order = db.orders.find((item) => item.order_id === body.order_id);
      const payment = db.payments.find((item) => item.order_id === body.order_id);
      if (!order || !payment) throw new Error("ไม่พบออเดอร์");
      const updated = nowIso();
      order.payment_status = "paid";
      order.updated_at = updated;
      payment.payment_status = "paid";
      payment.verified_at = updated;
      payment.verified_by = "mock-admin";
      payment.reject_reason = "";
      payment.updated_at = updated;
      saveMockDb(db);
      return { order, payment } as T;
    }

    case "adminRejectPayment": {
      requireSession(db, body.session_token);
      const order = db.orders.find((item) => item.order_id === body.order_id);
      const payment = db.payments.find((item) => item.order_id === body.order_id);
      if (!order || !payment) throw new Error("ไม่พบออเดอร์");
      const updated = nowIso();
      order.payment_status = "rejected";
      order.updated_at = updated;
      payment.payment_status = "rejected";
      payment.verified_at = updated;
      payment.verified_by = "mock-admin";
      payment.reject_reason = sanitizeText(String(body.reject_reason ?? ""), 300);
      payment.updated_at = updated;
      saveMockDb(db);
      return { order, payment } as T;
    }

    case "adminUpdateOrderStatus": {
      requireSession(db, body.session_token);
      const order = db.orders.find((item) => item.order_id === body.order_id);
      if (!order) throw new Error("ไม่พบออเดอร์");
      order.order_status = body.order_status as OrderStatus;
      order.internal_note = sanitizeText(String(body.internal_note ?? order.internal_note ?? ""));
      order.updated_at = nowIso();
      saveMockDb(db);
      return { order } as T;
    }

    case "adminGetProductionSummary":
      requireSession(db, body.session_token);
      return {
        items: buildProductionSummary(
          db,
          String(body.pickup_date || todayIsoDate()),
          Boolean(body.include_pending_review),
        ),
      } as T;

    case "adminGetSalesReport":
      requireSession(db, body.session_token);
      return buildSalesReport(db, String(body.from || ""), String(body.to || "")) as T;

    case "adminGetShopSettings":
      requireSession(db, body.session_token);
      return db.settings as T;

    case "adminUpdateShopSettings":
      requireSession(db, body.session_token);
      db.settings = {
        ...db.settings,
        ...(body.settings as ShopSettingsPatch),
      };
      db.settings.promptpay_id_masked = maskPromptPayId(db.settings.promptpay_id);
      saveMockDb(db);
      return db.settings as T;

    case "adminExportOrdersCsv":
      requireSession(db, body.session_token);
      return { csv: ordersToCsv(filterOrders(db.orders, body.filters as OrderFilters)) } as T;

    default:
      throw new Error(`ไม่รู้จัก action: ${action}`);
  }
}

async function requestNetwork<T>(action: string, payload: Payload): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({ action, payload }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ApiClientError(
        "HTTP_ERROR",
        "ระบบตอบกลับผิดปกติ (" + response.status + ") กรุณาลองใหม่อีกครั้ง",
      );
    }

    let json: {
      ok: boolean;
      data: T | null;
      error: { code: string; message: string } | null;
    };
    try {
      json = (await response.json()) as typeof json;
    } catch {
      throw new ApiClientError(
        "INVALID_RESPONSE",
        "ระบบตอบกลับไม่สมบูรณ์ กรุณาลองใหม่อีกครั้ง",
      );
    }

    if (!json.ok || json.error) {
      const code = json.error?.code || "API_ERROR";
      throw new ApiClientError(
        code,
        friendlyApiErrorMessage(code, json.error?.message || "API error"),
      );
    }

    return json.data as T;
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    const isTimeout = err instanceof DOMException && err.name === "AbortError";
    throw new ApiClientError(
      isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
      isTimeout
        ? "ระบบใช้เวลาตอบกลับนานกว่าปกติ กรุณาลองใหม่อีกครั้ง"
        : "เชื่อมต่อระบบไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่",
    );
  } finally {
    window.clearTimeout(timer);
  }
}

async function request<T>(action: string, payload: Payload = {}): Promise<T> {
  if (MOCK_MODE) {
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    try {
      return await mockRequest<T>(action, payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Mock API error";
      if (message.includes("PromptPay ID")) {
        throw new ApiClientError(
          "INVALID_PROMPTPAY_ID",
          friendlyApiErrorMessage("INVALID_PROMPTPAY_ID", message),
        );
      }
      throw err;
    }
  }

  const attempts = RETRYABLE_READ_ACTIONS.has(action) ? 2 : 1;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await requestNetwork<T>(action, payload);
    } catch (err) {
      lastError = err;
      const retryable =
        err instanceof ApiClientError &&
        (err.code === "TIMEOUT" ||
          err.code === "NETWORK_ERROR" ||
          err.code === "HTTP_ERROR" ||
          err.code === "INVALID_RESPONSE");
      if (!retryable || attempt >= attempts - 1) throw err;
      await new Promise((resolve) => window.setTimeout(resolve, 350 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function cachedRequest<T>(
  action: string,
  payload: Payload = {},
  ttlMs = 30_000,
): Promise<T> {
  const key = cacheKey(action, payload);
  const cached = readApiCache<T>(key);
  if (cached && cached.expires_at > Date.now()) return cached.data;

  const current = inFlightRequests.get(key) as Promise<T> | undefined;
  if (current) return current;

  const promise = request<T>(action, payload)
    .then((data) => {
      writeApiCache(key, data, ttlMs);
      return data;
    })
    .catch((err) => {
      if (cached) return cached.data;
      throw err;
    })
    .finally(() => {
      inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, promise);
  return promise;
}

export async function fileToBase64Payload(file: File): Promise<UploadFilePayload> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      resolve(value.includes(",") ? value.split(",")[1] : value);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  return {
    name: file.name,
    mime_type: file.type,
    base64,
  };
}

async function legacyAdminBootstrap(
  session_token: string,
  options: AdminBootstrapOptions = {},
): Promise<AdminBootstrapData> {
  const [settings, productList, orderList] = await Promise.all([
    request<ShopSettings>("adminGetShopSettings", { session_token }),
    request<AdminProductList>("adminListProducts", {
      session_token,
      include_deleted: options.include_deleted_products ?? true,
    }),
    request<AdminOrderList>("adminListOrders", {
      session_token,
      filters: {},
    }),
  ]);
  const now = new Date().toISOString();
  return {
    settings,
    products: productList.products,
    orders: orderList.orders,
    order_items: [],
    payments: [],
    server_time: now,
    next_sync_cursor: now,
  };
}

async function getPublicBootstrap(force = false) {
  try {
    const load = () =>
      request<{ settings: ShopSettings; products: Product[]; server_time: string }>(
        "getPublicBootstrap",
        {},
      );
    return force
      ? await load()
      : await cachedRequest<{ settings: ShopSettings; products: Product[]; server_time: string }>(
          "getPublicBootstrap",
          {},
          90_000,
        );
  } catch (err) {
    if (err instanceof ApiClientError && err.code === "UNKNOWN_ACTION") {
      const [settings, productResult] = await Promise.all([
        cachedRequest<ShopSettings>("getShopSettingsPublic", {}, 5 * 60_000),
        cachedRequest<{ products: Product[] }>("getProducts", {}, 2 * 60_000),
      ]);
      return {
        settings,
        products: productResult.products,
        server_time: new Date().toISOString(),
      };
    }
    throw err;
  }
}

function emptyAdminSyncDelta(): AdminSyncDelta {
  const now = new Date().toISOString();
  return {
    orders_upsert: [],
    payments_upsert: [],
    products_upsert: [],
    order_items_upsert: [],
    settings_patch: null,
    deleted_product_ids: [],
    server_time: now,
    next_sync_cursor: now,
  };
}

export const apiClient = {
  getPublicBootstrap,
  getShopSettingsPublic: () =>
    cachedRequest<ShopSettings>("getShopSettingsPublic", {}, 5 * 60_000),
  getProducts: (params: { category?: string; search?: string } = {}) =>
    cachedRequest<{ products: Product[] }>("getProducts", params, 2 * 60_000),
  getProductDetail: (product_id: string) =>
    cachedRequest<{ product: Product }>("getProductDetail", { product_id }, 2 * 60_000),
  createOrder: async (payload: CreateOrderInput) => {
    const result = await request<CreateOrderResponse>(
      "createOrder",
      payload as unknown as Payload,
    );
    clearApiCache();
    return result;
  },
  getOrderStatus: (order_id: string, order_token: string) =>
    cachedRequest<OrderDetail>("getOrderStatus", { order_id, order_token }, 15_000),
  getCustomerProfileByPhone: (phone: string) =>
    cachedRequest<CustomerProfileLookupResponse>(
      "getCustomerProfileByPhone",
      { phone },
      60_000,
    ),
  listOrdersByPhone: (phone: string) =>
    cachedRequest<CustomerOrdersByPhoneResponse>(
      "listOrdersByPhone",
      { phone },
      15_000,
    ),
  cancelOrderByCustomer: async (order_id: string, order_token: string) => {
    const result = await request<OrderDetail>("cancelOrderByCustomer", {
      order_id,
      order_token,
    });
    clearApiCache();
    return result;
  },
  uploadPaymentSlip: async (
    order_id: string,
    order_token: string,
    file: UploadFilePayload,
  ) => {
    const result = await request<{ payment_status: PaymentStatus; slip_url: string }>(
      "uploadPaymentSlip",
      {
        order_id,
        order_token,
        file,
      },
    );
    clearApiCache();
    return result;
  },
  adminLogin: async (password: string) => {
    const result = await request<AdminSession>("adminLogin", { password });
    clearApiCache();
    return result;
  },
  adminLogout: async (session_token: string) => {
    const result = await request<{ success: boolean }>("adminLogout", {
      session_token,
    });
    clearApiCache();
    return result;
  },
  adminBootstrap: async (
    session_token: string,
    options: AdminBootstrapOptions = {},
  ) => {
    try {
      return await request<AdminBootstrapData>("adminBootstrap", {
        session_token,
        range_days: options.range_days ?? 90,
        max_orders: options.max_orders ?? 800,
        include_deleted_products: options.include_deleted_products ?? true,
      });
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "UNKNOWN_ACTION") {
        return legacyAdminBootstrap(session_token, options);
      }
      throw err;
    }
  },
  adminSync: async (
    session_token: string,
    since: string,
    scope: AdminSyncScope[] = ["orders", "payments", "products", "settings", "order_items"],
  ) => {
    try {
      return await request<AdminSyncDelta>("adminSync", {
        session_token,
        since,
        scope,
      });
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "UNKNOWN_ACTION") {
        return emptyAdminSyncDelta();
      }
      throw err;
    }
  },
  adminGetDashboard: (session_token: string) =>
    cachedRequest<DashboardData>("adminGetDashboard", { session_token }, 30_000),
  adminListProducts: (session_token: string, include_deleted = false) =>
    cachedRequest<AdminProductList>("adminListProducts", {
      session_token,
      include_deleted,
    }, 30_000),
  adminCreateProduct: async (session_token: string, product: ProductInput) => {
    const result = await request<{ product: Product }>("adminCreateProduct", {
      session_token,
      product,
    });
    clearApiCache();
    return result;
  },
  adminUpdateProduct: async (
    session_token: string,
    product_id: string,
    patch: Partial<Product>,
  ) => {
    const result = await request<{ product: Product }>("adminUpdateProduct", {
      session_token,
      product_id,
      patch,
    });
    clearApiCache();
    return result;
  },
  adminDeleteProduct: async (session_token: string, product_id: string) => {
    const result = await request<{ product: Product }>("adminDeleteProduct", {
      session_token,
      product_id,
    });
    clearApiCache();
    return result;
  },
  adminUploadProductImage: async (session_token: string, file: UploadFilePayload) => {
    const result = await request<{ image_url: string; image_file_id: string }>(
      "adminUploadProductImage",
      {
        session_token,
        file,
      },
    );
    clearApiCache();
    return result;
  },
  adminListOrders: (session_token: string, filters: OrderFilters = {}) =>
    cachedRequest<AdminOrderList>(
      "adminListOrders",
      { session_token, filters },
      20_000,
    ),
  adminGetOrderDetail: (session_token: string, order_id: string) =>
    cachedRequest<OrderDetail>(
      "adminGetOrderDetail",
      { session_token, order_id },
      15_000,
    ),
  adminApprovePayment: async (session_token: string, order_id: string) => {
    const result = await request<{ order: Order; payment: Payment }>(
      "adminApprovePayment",
      {
        session_token,
        order_id,
      },
    );
    clearApiCache();
    return result;
  },
  adminRejectPayment: async (
    session_token: string,
    order_id: string,
    reject_reason: string,
  ) => {
    const result = await request<{ order: Order; payment: Payment }>(
      "adminRejectPayment",
      {
        session_token,
        order_id,
        reject_reason,
      },
    );
    clearApiCache();
    return result;
  },
  adminUpdateOrderStatus: async (
    session_token: string,
    order_id: string,
    order_status: OrderStatus,
    internal_note?: string,
  ) => {
    const result = await request<{ order: Order }>("adminUpdateOrderStatus", {
      session_token,
      order_id,
      order_status,
      internal_note,
    });
    clearApiCache();
    return result;
  },
  adminGetProductionSummary: (
    session_token: string,
    pickup_date: string,
    include_pending_review: boolean,
  ) =>
    cachedRequest<{ items: ProductionSummaryItem[] }>(
      "adminGetProductionSummary",
      {
        session_token,
        pickup_date,
        include_pending_review,
      },
      30_000,
    ),
  adminGetSalesReport: (session_token: string, from?: string, to?: string) =>
    cachedRequest<SalesReport>(
      "adminGetSalesReport",
      { session_token, from, to },
      60_000,
    ),
  adminGetShopSettings: (session_token: string) =>
    cachedRequest<ShopSettings>("adminGetShopSettings", { session_token }, 60_000),
  adminUpdateShopSettings: async (
    session_token: string,
    settings: ShopSettingsPatch,
  ) => {
    const result = await request<ShopSettings>("adminUpdateShopSettings", {
      session_token,
      settings,
    });
    clearApiCache();
    return result;
  },
  adminExportOrdersCsv: (session_token: string, filters: OrderFilters = {}) =>
    request<{ csv: string }>("adminExportOrdersCsv", { session_token, filters }),
};
