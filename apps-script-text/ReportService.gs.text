function adminGetDashboard() {
  var orders = readRows('orders').map(function (order) {
    order.total_amount = toNumber(order.total_amount);
    return order;
  });
  var products = readRows('products').map(normalizeProduct);
  var items = readRows('order_items').map(function (item) {
    item.qty = toNumber(item.qty);
    item.subtotal = toNumber(item.subtotal);
    return item;
  });
  var today = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
  var todayOrders = orders.filter(function (order) {
    return dateOnly(order.created_at) === today;
  });
  return {
    stats: {
      today_orders: todayOrders.length,
      today_sales: sumAmount(todayOrders),
      paid_sales: sumAmount(orders.filter(function (order) {
        return order.payment_status === 'paid';
      })),
      pending_review: orders.filter(function (order) {
        return order.payment_status === 'pending_review';
      }).length,
      preparing_orders: orders.filter(function (order) {
        return order.order_status === 'preparing';
      }).length,
      active_products: products.filter(function (product) {
        return product.is_active && !product.is_deleted;
      }).length,
      low_stock_products: products.filter(function (product) {
        return product.stock_type === 'limited' && !product.is_deleted && product.remaining_qty <= 5;
      }).length
    },
    latest_orders: orders.sort(function (a, b) {
      return dateTimeKey(b.created_at).localeCompare(dateTimeKey(a.created_at));
    }).slice(0, 6),
    best_sellers: buildBestSellers(items).slice(0, 5),
    upcoming_pickups: buildUpcomingPickups(orders).slice(0, 5)
  };
}

function adminGetProductionSummary(payload) {
  var pickupDate = payload.pickup_date || Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
  var includePending = toBool(payload.include_pending_review);
  var allowedPayments = includePending ? ['paid', 'pending_review'] : ['paid'];
  var eligibleOrders = readRows('orders').filter(function (order) {
    return dateOnly(order.pickup_date) === pickupDate &&
      allowedPayments.indexOf(order.payment_status) !== -1 &&
      order.order_status !== 'cancelled';
  });
  var orderIds = {};
  eligibleOrders.forEach(function (order) {
    orderIds[order.order_id] = true;
  });
  var map = {};
  readRows('order_items').forEach(function (item) {
    if (!orderIds[item.order_id]) return;
    if (!map[item.product_id]) {
      map[item.product_id] = {
        product_id: item.product_id,
        product_name: item.product_name_snapshot,
        total_qty: 0,
        number_of_orders: 0
      };
    }
    map[item.product_id].total_qty += toNumber(item.qty);
    map[item.product_id].number_of_orders += 1;
  });
  var result = Object.keys(map).map(function (key) {
    return map[key];
  }).sort(function (a, b) {
    return b.total_qty - a.total_qty;
  });
  return { items: result };
}

function adminGetSalesReport(payload) {
  var from = payload.from || '';
  var to = payload.to || '';
  var orders = readRows('orders').filter(function (order) {
    var date = dateOnly(order.created_at);
    if (from && date < from) return false;
    if (to && date > to) return false;
    order.total_amount = toNumber(order.total_amount);
    return true;
  });
  var daily = {};
  orders.forEach(function (order) {
    var date = dateOnly(order.created_at);
    if (!daily[date]) {
      daily[date] = {
        date: date,
        orders: 0,
        paid_amount: 0,
        pending_amount: 0,
        cancelled_amount: 0
      };
    }
    daily[date].orders += 1;
    if (order.order_status === 'cancelled') daily[date].cancelled_amount += order.total_amount;
    else if (order.payment_status === 'paid') daily[date].paid_amount += order.total_amount;
    else if (order.payment_status === 'pending_review') daily[date].pending_amount += order.total_amount;
  });
  var orderIds = {};
  orders.forEach(function (order) {
    orderIds[order.order_id] = true;
  });
  var items = readRows('order_items').filter(function (item) {
    return orderIds[item.order_id];
  }).map(function (item) {
    item.qty = toNumber(item.qty);
    item.subtotal = toNumber(item.subtotal);
    return item;
  });

  return {
    summary: {
      total_orders: orders.length,
      gross_sales: sumAmount(orders),
      paid_sales: sumAmount(orders.filter(function (order) {
        return order.payment_status === 'paid';
      })),
      pending_amount: sumAmount(orders.filter(function (order) {
        return order.payment_status === 'pending_review';
      })),
      cancelled_amount: sumAmount(orders.filter(function (order) {
        return order.order_status === 'cancelled';
      }))
    },
    daily: Object.keys(daily).map(function (key) {
      return daily[key];
    }).sort(function (a, b) {
      return a.date.localeCompare(b.date);
    }),
    best_sellers: buildBestSellers(items).slice(0, 8)
  };
}

function sumAmount(orders) {
  return orders.reduce(function (sum, order) {
    return sum + toNumber(order.total_amount);
  }, 0);
}

function buildBestSellers(items) {
  var map = {};
  items.forEach(function (item) {
    if (!map[item.product_id]) {
      map[item.product_id] = {
        product_id: item.product_id,
        product_name: item.product_name_snapshot,
        qty: 0,
        amount: 0
      };
    }
    map[item.product_id].qty += toNumber(item.qty);
    map[item.product_id].amount += toNumber(item.subtotal);
  });
  return Object.keys(map).map(function (key) {
    return map[key];
  }).sort(function (a, b) {
    return b.qty - a.qty;
  });
}

function buildUpcomingPickups(orders) {
  var today = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
  var map = {};
  orders.forEach(function (order) {
    var pickupDate = dateOnly(order.pickup_date);
    if (!pickupDate || pickupDate < today || order.order_status === 'cancelled') return;
    if (!map[pickupDate]) {
      map[pickupDate] = {
        pickup_date: pickupDate,
        orders: 0,
        total_amount: 0
      };
    }
    map[pickupDate].orders += 1;
    map[pickupDate].total_amount += toNumber(order.total_amount);
  });
  return Object.keys(map).map(function (key) {
    return map[key];
  }).sort(function (a, b) {
    return String(a.pickup_date).localeCompare(String(b.pickup_date));
  });
}
