function normalizeOrder(row) {
  row.total_amount = toNumber(row.total_amount);
  return row;
}

function normalizeOrderItem(row) {
  row.unit_price_snapshot = toNumber(row.unit_price_snapshot);
  row.qty = toNumber(row.qty);
  row.subtotal = toNumber(row.subtotal);
  return row;
}

function normalizePayment(row) {
  row.amount = toNumber(row.amount);
  return row;
}

function adminBootstrap(payload) {
  payload = payload || {};
  var rangeDays = Math.max(1, toNumber(payload.range_days || 90));
  var maxOrders = Math.max(50, toNumber(payload.max_orders || 800));
  var includeDeletedProducts = toBool(payload.include_deleted_products);
  var serverTime = nowString();
  var cutoff = new Date(new Date().getTime() - rangeDays * 24 * 60 * 60 * 1000);

  var products = readRows('products')
    .map(normalizeProduct)
    .filter(function (product) {
      return includeDeletedProducts || !product.is_deleted;
    })
    .sort(function (a, b) {
      return a.sort_order - b.sort_order;
    });

  var orders = readRows('orders')
    .map(normalizeOrder)
    .filter(function (order) {
      var created = parseTimestamp(order.created_at);
      return !created || created.getTime() >= cutoff.getTime();
    })
    .sort(function (a, b) {
      return dateTimeKey(b.created_at).localeCompare(dateTimeKey(a.created_at));
    })
    .slice(0, maxOrders);

  var orderIds = {};
  orders.forEach(function (order) {
    orderIds[order.order_id] = true;
  });

  var orderItems = readRows('order_items')
    .filter(function (item) {
      return orderIds[item.order_id];
    })
    .map(normalizeOrderItem);

  var payments = readRows('payments')
    .filter(function (payment) {
      return orderIds[payment.order_id];
    })
    .map(normalizePayment);

  return {
    settings: adminGetShopSettings(),
    products: products,
    orders: orders,
    order_items: orderItems,
    payments: payments,
    server_time: serverTime,
    next_sync_cursor: serverTime
  };
}

function adminSync(payload) {
  payload = payload || {};
  var since = payload.since || payload.sync_cursor || '';
  if (!since) return adminBootstrap(payload);

  var scope = payload.scope || ['orders', 'payments', 'products', 'settings', 'order_items'];
  var serverTime = nowString();
  var result = {
    orders_upsert: [],
    payments_upsert: [],
    products_upsert: [],
    order_items_upsert: [],
    settings_patch: null,
    deleted_product_ids: [],
    server_time: serverTime,
    next_sync_cursor: serverTime
  };

  if (scope.indexOf('orders') !== -1) {
    result.orders_upsert = readRowsUpdatedSince('orders', 'updated_at', since)
      .map(normalizeOrder);
  }

  if (scope.indexOf('payments') !== -1) {
    result.payments_upsert = readRowsUpdatedSince('payments', 'updated_at', since)
      .map(normalizePayment);
  }

  if (scope.indexOf('products') !== -1) {
    result.products_upsert = readRowsUpdatedSince('products', 'updated_at', since)
      .map(normalizeProduct);
    result.products_upsert.forEach(function (product) {
      if (product.is_deleted) result.deleted_product_ids.push(product.product_id);
    });
  }

  if (scope.indexOf('order_items') !== -1) {
    result.order_items_upsert = readRowsCreatedSince('order_items', 'created_at', since)
      .map(normalizeOrderItem);
  }

  if (scope.indexOf('settings') !== -1) {
    var settingsChanged = readRowsUpdatedSince('shop_settings', 'updated_at', since);
    if (settingsChanged.length > 0) {
      result.settings_patch = adminGetShopSettings();
    }
  }

  return result;
}
