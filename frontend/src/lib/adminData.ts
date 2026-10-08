import type { DashboardData, ProductionSummaryItem, SalesReport } from "../types/api";
import type { Order, OrderDetail, OrderFilters, OrderItem } from "../types/order";
import type { Payment } from "../types/payment";
import type { Product } from "../types/product";
import { toInputDate } from "./format";

export function productListFromMap(
  productsById: Record<string, Product>,
  includeDeleted = false,
) {
  return Object.values(productsById)
    .filter((product) => includeDeleted || !product.is_deleted)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function orderListFromMap(
  ordersById: Record<string, Order>,
  filters: OrderFilters = {},
) {
  const search = filters.search?.trim().toLowerCase();

  return Object.values(ordersById)
    .filter((order) => {
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
      if (!search) return true;

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
        .includes(search);
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function orderDetailFromMaps(
  orderId: string,
  ordersById: Record<string, Order>,
  orderItemsByOrderId: Record<string, OrderItem[]>,
  paymentsByOrderId: Record<string, Payment>,
): OrderDetail | null {
  const order = ordersById[orderId];
  if (!order) return null;
  return {
    order,
    items: orderItemsByOrderId[orderId] || [],
    payment: paymentsByOrderId[orderId] || null,
  };
}

export function allOrderItems(orderItemsByOrderId: Record<string, OrderItem[]>) {
  return Object.values(orderItemsByOrderId).flat();
}

export function buildDashboardData(
  ordersById: Record<string, Order>,
  productsById: Record<string, Product>,
  orderItemsByOrderId: Record<string, OrderItem[]>,
): DashboardData {
  const orders = Object.values(ordersById);
  const products = Object.values(productsById);
  const items = allOrderItems(orderItemsByOrderId);
  const today = toInputDate();
  const todayOrders = orders.filter((order) => order.created_at.slice(0, 10) === today);
  const paidOrders = orders.filter((order) => order.payment_status === "paid");
  const pendingReview = orders.filter(
    (order) => order.payment_status === "pending_review",
  );

  const bestSellerMap = new Map<string, DashboardData["best_sellers"][number]>();
  for (const item of items) {
    const current = bestSellerMap.get(item.product_id) ?? {
      product_id: item.product_id,
      product_name: item.product_name_snapshot,
      qty: 0,
      amount: 0,
    };
    current.qty += Number(item.qty || 0);
    current.amount += Number(item.subtotal || 0);
    bestSellerMap.set(item.product_id, current);
  }

  const pickupMap = new Map<
    string,
    { pickup_date: string; orders: number; total_amount: number }
  >();
  for (const order of orders) {
    if (order.order_status === "cancelled") continue;
    const current = pickupMap.get(order.pickup_date) ?? {
      pickup_date: order.pickup_date,
      orders: 0,
      total_amount: 0,
    };
    current.orders += 1;
    current.total_amount += Number(order.total_amount || 0);
    pickupMap.set(order.pickup_date, current);
  }

  return {
    stats: {
      today_orders: todayOrders.length,
      today_sales: todayOrders.reduce((sum, order) => sum + order.total_amount, 0),
      paid_sales: paidOrders.reduce((sum, order) => sum + order.total_amount, 0),
      pending_review: pendingReview.length,
      preparing_orders: orders.filter((order) => order.order_status === "preparing")
        .length,
      active_products: products.filter(
        (product) => product.is_active && !product.is_deleted,
      ).length,
      low_stock_products: products.filter(
        (product) =>
          product.stock_type === "limited" &&
          !product.is_deleted &&
          product.remaining_qty <= 5,
      ).length,
    },
    latest_orders: [...orders]
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

export function buildProductionSummary(
  ordersById: Record<string, Order>,
  orderItemsByOrderId: Record<string, OrderItem[]>,
  pickupDate: string,
  includePendingReview: boolean,
): ProductionSummaryItem[] {
  const allowedPayments = includePendingReview
    ? new Set(["paid", "pending_review"])
    : new Set(["paid"]);
  const eligibleOrderIds = new Set(
    Object.values(ordersById)
      .filter(
        (order) =>
          order.pickup_date === pickupDate &&
          allowedPayments.has(order.payment_status) &&
          order.order_status !== "cancelled",
      )
      .map((order) => order.order_id),
  );
  const map = new Map<string, ProductionSummaryItem>();

  for (const item of allOrderItems(orderItemsByOrderId)) {
    if (!eligibleOrderIds.has(item.order_id)) continue;
    const current = map.get(item.product_id) ?? {
      product_id: item.product_id,
      product_name: item.product_name_snapshot,
      total_qty: 0,
      number_of_orders: 0,
    };
    current.total_qty += Number(item.qty || 0);
    current.number_of_orders += 1;
    map.set(item.product_id, current);
  }

  return [...map.values()].sort((a, b) => b.total_qty - a.total_qty);
}

export function buildSalesReport(
  ordersById: Record<string, Order>,
  orderItemsByOrderId: Record<string, OrderItem[]>,
  from: string,
  to: string,
): SalesReport {
  const orders = Object.values(ordersById).filter((order) => {
    const date = order.created_at.slice(0, 10);
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  });
  const dailyMap = new Map<string, SalesReport["daily"][number]>();

  for (const order of orders) {
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

  const orderIds = new Set(orders.map((order) => order.order_id));
  const sellerMap = new Map<string, DashboardData["best_sellers"][number]>();
  for (const item of allOrderItems(orderItemsByOrderId)) {
    if (!orderIds.has(item.order_id)) continue;
    const current = sellerMap.get(item.product_id) ?? {
      product_id: item.product_id,
      product_name: item.product_name_snapshot,
      qty: 0,
      amount: 0,
    };
    current.qty += Number(item.qty || 0);
    current.amount += Number(item.subtotal || 0);
    sellerMap.set(item.product_id, current);
  }

  return {
    summary: {
      total_orders: orders.length,
      gross_sales: orders.reduce((sum, order) => sum + order.total_amount, 0),
      paid_sales: orders
        .filter((order) => order.payment_status === "paid")
        .reduce((sum, order) => sum + order.total_amount, 0),
      pending_amount: orders
        .filter((order) => order.payment_status === "pending_review")
        .reduce((sum, order) => sum + order.total_amount, 0),
      cancelled_amount: orders
        .filter((order) => order.order_status === "cancelled")
        .reduce((sum, order) => sum + order.total_amount, 0),
    },
    daily: [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    best_sellers: [...sellerMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 8),
  };
}
