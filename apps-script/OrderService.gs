function createOrder(payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    validateCreateOrder(payload);

    var settings = getSettingsObject();
    if (settings.is_shop_open === false) {
      throw appError('VALIDATION_ERROR', settings.closed_message || 'Shop is closed');
    }
    var promptpayId = settings.promptpay_id;
    if (!promptpayId) {
      throw appError('PROMPTPAY_NOT_CONFIGURED', 'PromptPay ID is not configured');
    }

    var productRows = readRows('products').map(normalizeProduct);
    var now = nowString();
    var orderId = generateDailyId('ORD', 'orders', 'order_id');
    var paymentId = generateDailyId('PAY', 'payments', 'payment_id');
    var orderToken = generateRandomToken(48);
    var items = [];
    var total = 0;
    var productPatches = {};

    payload.items.forEach(function (entry, index) {
      var product = productRows.find(function (item) {
        return item.product_id === entry.product_id;
      });
      if (!product || !product.is_active || product.is_deleted) {
        throw appError('VALIDATION_ERROR', 'Product is not available');
      }
      var qty = toNumber(entry.qty);
      if (qty < 1) throw appError('VALIDATION_ERROR', 'Invalid quantity');
      if (product.stock_type === 'limited' && qty > product.remaining_qty) {
        throw appError('OUT_OF_STOCK', product.name + ' remaining qty is ' + product.remaining_qty);
      }
      total += product.price * qty;
      items.push({
        item_id: 'ITM-' + orderId + '-' + String(index + 1).padStart(3, '0'),
        order_id: orderId,
        product_id: product.product_id,
        product_name_snapshot: product.name,
        unit_price_snapshot: product.price,
        qty: qty,
        subtotal: product.price * qty,
        created_at: now
      });

      product.sold_qty = product.sold_qty + qty;
      product.remaining_qty = product.stock_type === 'limited'
        ? Math.max(0, product.stock_qty - product.sold_qty)
        : 999;
      productPatches[product.product_id] = {
        sold_qty: product.sold_qty,
        remaining_qty: product.remaining_qty,
        updated_at: now
      };
    });

    updateRowsByIds('products', 'product_id', productPatches);

    var order = {
      order_id: orderId,
      order_token: orderToken,
      created_at: now,
      customer_name: sanitizeText(payload.customer.name, 120),
      phone: sanitizeText(payload.customer.phone, 40),
      line_id: sanitizeText(payload.customer.line_id, 80),
      pickup_method: payload.pickup.method,
      pickup_date: payload.pickup.pickup_date,
      delivery_address: sanitizeText(payload.pickup.delivery_address, 500),
      customer_note: sanitizeText(payload.customer_note, 500),
      internal_note: '',
      total_amount: total,
      payment_status: 'unpaid',
      order_status: 'received',
      source: 'web',
      updated_at: now
    };
    appendRow('orders', order);
    appendRows('order_items', items);

    var promptpayPayload = buildPromptPayPayload(promptpayId, total);
    appendRow('payments', {
      payment_id: paymentId,
      order_id: orderId,
      amount: total,
      promptpay_payload: promptpayPayload,
      slip_url: '',
      slip_file_id: '',
      payment_status: 'unpaid',
      uploaded_at: '',
      verified_at: '',
      verified_by: '',
      reject_reason: '',
      created_at: now,
      updated_at: now
    });

    upsertCustomerFromOrder(order);
    logActivity('customer', 'create_order', 'order', orderId, { total_amount: total });
    invalidatePublicDataCache();

    return {
      order_id: orderId,
      order_token: orderToken,
      total_amount: total,
      payment_status: 'unpaid',
      order_status: 'received',
      promptpay_payload: promptpayPayload,
      payment_id: paymentId
    };
  } finally {
    lock.releaseLock();
  }
}

function validateCreateOrder(payload) {
  if (!payload || !payload.customer || !payload.pickup || !payload.items) {
    throw appError('VALIDATION_ERROR', 'Invalid order payload');
  }
  if (!payload.customer.name || !payload.customer.phone) {
    throw appError('VALIDATION_ERROR', 'Customer name and phone are required');
  }
  if (['pickup', 'delivery'].indexOf(payload.pickup.method) === -1) {
    throw appError('VALIDATION_ERROR', 'Invalid pickup method');
  }
  if (!payload.pickup.pickup_date) {
    throw appError('VALIDATION_ERROR', 'Pickup date is required');
  }
  if (payload.pickup.method === 'delivery' && !payload.pickup.delivery_address) {
    throw appError('VALIDATION_ERROR', 'Delivery address is required');
  }
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw appError('VALIDATION_ERROR', 'At least one item is required');
  }
}

function getOrderStatus(payload) {
  var order = findRowById('orders', 'order_id', payload.order_id);
  if (!order || order.order_token !== payload.order_token) {
    throw appError('NOT_FOUND', 'Order not found');
  }
  return buildOrderDetail(order.order_id);
}

function normalizePhoneForLookup(value) {
  var digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 9 && /^[689]/.test(digits)) return '0' + digits;
  return digits;
}

function orderPublicSummary(order) {
  return {
    order_id: order.order_id,
    created_at: order.created_at,
    pickup_date: dateOnly(order.pickup_date),
    total_amount: toNumber(order.total_amount),
    payment_status: order.payment_status,
    order_status: order.order_status
  };
}

function getCustomerProfileByPhone(payload) {
  var phone = normalizePhoneForLookup(payload.phone);
  if (!phone || phone.length < 9) throw appError('VALIDATION_ERROR', 'Phone is required');
  var orders = readRows('orders').filter(function (order) {
    return normalizePhoneForLookup(order.phone) === phone;
  }).sort(function (a, b) {
    return dateTimeKey(b.created_at).localeCompare(dateTimeKey(a.created_at));
  });
  var latest = orders[0];
  if (!latest) return { found: false };
  var latestDelivery = orders.find(function (order) {
    return order.pickup_method === 'delivery' && order.delivery_address;
  }) || latest;
  var location = parseDeliveryLocationText(latestDelivery.delivery_address);
  return {
    found: true,
    customer: {
      name: latest.customer_name,
      phone: latest.phone,
      line_id: latest.line_id
    },
    last_delivery: {
      pickup_method: latestDelivery.pickup_method,
      delivery_address: latestDelivery.delivery_address,
      lat: location ? location.lat : '',
      lng: location ? location.lng : ''
    }
  };
}

function listOrdersByPhone(payload) {
  var phone = normalizePhoneForLookup(payload.phone);
  if (!phone || phone.length < 9) throw appError('VALIDATION_ERROR', 'Phone is required');
  var orders = readRows('orders').filter(function (order) {
    return normalizePhoneForLookup(order.phone) === phone;
  }).sort(function (a, b) {
    return dateTimeKey(b.created_at).localeCompare(dateTimeKey(a.created_at));
  }).slice(0, 12).map(orderPublicSummary);
  return { orders: orders };
}

function cancelOrderByCustomer(payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var order = findRowById('orders', 'order_id', payload.order_id);
    if (!order || order.order_token !== payload.order_token) {
      throw appError('NOT_FOUND', 'Order not found');
    }
    if (order.payment_status !== 'unpaid') {
      throw appError('CANNOT_CANCEL', 'This order has payment activity. Please contact the shop directly.');
    }
    if (order.order_status !== 'received') {
      throw appError('CANNOT_CANCEL', 'The shop has started processing this order. Please contact the shop directly.');
    }

    var now = nowString();
    var items = readRows('order_items').filter(function (item) {
      return item.order_id === order.order_id;
    });

    items.forEach(function (item) {
      var product = findRowById('products', 'product_id', item.product_id);
      if (!product) return;
      var soldQty = Math.max(0, toNumber(product.sold_qty) - toNumber(item.qty));
      updateRowById('products', 'product_id', item.product_id, {
        sold_qty: soldQty,
        remaining_qty: product.stock_type === 'limited'
          ? Math.max(0, toNumber(product.stock_qty) - soldQty)
          : 999,
        updated_at: now
      });
    });

    updateRowById('orders', 'order_id', order.order_id, {
      order_status: 'cancelled',
      updated_at: now
    });
    logActivity('customer', 'cancel_order', 'order', order.order_id, {});
    invalidatePublicDataCache();
    return buildOrderDetail(order.order_id);
  } finally {
    lock.releaseLock();
  }
}

function parseDeliveryLocationText(value) {
  if (!value) return null;
  var text = String(value);
  var match = text.match(/(?:พิกัดจัดส่ง|พิกัด|location|coords?)\s*:?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i) ||
    text.match(/(?:q=|destination=)(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
  if (!match) return null;
  var lat = Number(match[1]);
  var lng = Number(match[2]);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat: lat, lng: lng };
}

function buildOrderDetail(orderId) {
  var order = findRowById('orders', 'order_id', orderId);
  if (!order) throw appError('NOT_FOUND', 'Order not found');
  var items = readRows('order_items').filter(function (item) {
    return item.order_id === orderId;
  }).map(function (item) {
    item.qty = toNumber(item.qty);
    item.unit_price_snapshot = toNumber(item.unit_price_snapshot);
    item.subtotal = toNumber(item.subtotal);
    return item;
  });
  var payment = readRows('payments').find(function (row) {
    return row.order_id === orderId;
  }) || null;
  order.total_amount = toNumber(order.total_amount);
  return {
    order: order,
    items: items,
    payment: payment
  };
}

function adminListOrders(payload) {
  var filters = payload.filters || {};
  var search = String(filters.search || '').toLowerCase();
  var orders = readRows('orders').filter(function (order) {
    if (filters.created_from && dateOnly(order.created_at) < filters.created_from) return false;
    if (filters.created_to && dateOnly(order.created_at) > filters.created_to) return false;
    if (filters.pickup_date && dateOnly(order.pickup_date) !== filters.pickup_date) return false;
    if (filters.payment_status && order.payment_status !== filters.payment_status) return false;
    if (filters.order_status && order.order_status !== filters.order_status) return false;
    if (search) {
      return [order.order_id, order.customer_name, order.phone, order.line_id]
        .join(' ')
        .toLowerCase()
        .indexOf(search) !== -1;
    }
    return true;
  }).map(function (order) {
    order.total_amount = toNumber(order.total_amount);
    return order;
  }).sort(function (a, b) {
    return dateTimeKey(b.created_at).localeCompare(dateTimeKey(a.created_at));
  });
  return { orders: orders };
}

function adminGetOrderDetail(payload) {
  return buildOrderDetail(payload.order_id);
}

function adminUpdateOrderStatus(payload) {
  var status = payload.order_status;
  var allowed = ['received', 'preparing', 'ready', 'delivering', 'completed', 'cancelled'];
  if (allowed.indexOf(status) === -1) throw appError('VALIDATION_ERROR', 'Invalid order status');
  var order = updateRowById('orders', 'order_id', payload.order_id, {
    order_status: status,
    internal_note: sanitizeText(payload.internal_note, 1000),
    updated_at: nowString()
  });
  logActivity('admin', 'update_order_status', 'order', payload.order_id, {
    order_status: status
  });
  return { order: order };
}

function adminExportOrdersCsv(payload) {
  var orders = adminListOrders(payload).orders;
  var headers = [
    'order_id',
    'created_at',
    'customer_name',
    'phone',
    'pickup_method',
    'pickup_date',
    'total_amount',
    'payment_status',
    'order_status'
  ];
  var lines = [headers.join(',')];
  orders.forEach(function (order) {
    lines.push(headers.map(function (key) {
      return csvEscape(order[key]);
    }).join(','));
  });
  return { csv: lines.join('\n') };
}

function csvEscape(value) {
  var text = String(value || '');
  if (/[",\n]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
  return text;
}

function upsertCustomerFromOrder(order) {
  var existing = readRows('customers').find(function (row) {
    return row.phone === order.phone;
  });
  if (existing) {
    updateRowById('customers', 'customer_id', existing.customer_id, {
      name: order.customer_name,
      line_id: order.line_id,
      total_orders: toNumber(existing.total_orders) + 1,
      total_spent: toNumber(existing.total_spent) + toNumber(order.total_amount),
      last_order_at: order.created_at,
      updated_at: nowString()
    });
    return;
  }
  appendRow('customers', {
    customer_id: generateSimpleId('CUS', 'customers', 'customer_id'),
    name: order.customer_name,
    phone: order.phone,
    line_id: order.line_id,
    total_orders: 1,
    total_spent: order.total_amount,
    last_order_at: order.created_at,
    created_at: nowString(),
    updated_at: nowString()
  });
}
