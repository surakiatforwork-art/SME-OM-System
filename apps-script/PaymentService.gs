function uploadPaymentSlip(payload) {
  var order = findRowById('orders', 'order_id', payload.order_id);
  if (!order || order.order_token !== payload.order_token) {
    throw appError('NOT_FOUND', 'Order not found');
  }
  var slipCheck = validateSlipQrPayloadBasic(payload.file);
  if (!slipCheck.ok) {
    throw appError('INVALID_SLIP_QR', slipCheck.message);
  }
  var result = uploadBase64Image(payload.file, 'SLIP_FOLDER_ID');
  var now = nowString();
  var payment = updateRowById('payments', 'order_id', payload.order_id, {
    slip_url: result.url,
    slip_file_id: result.file_id,
    payment_status: 'pending_review',
    uploaded_at: now,
    updated_at: now
  });
  updateRowById('orders', 'order_id', payload.order_id, {
    payment_status: 'pending_review',
    updated_at: now
  });
  logActivity('customer', 'upload_payment_slip', 'order', payload.order_id, {
    slip_file_id: result.file_id,
    slip_qr_payload: sanitizeText(slipCheck.payload, 500),
    slip_trans_ref: sanitizeText(slipCheck.trans_ref, 120),
    slip_basic_check_status: 'passed'
  });
  return {
    payment_status: 'pending_review',
    slip_url: payment.slip_url
  };
}

function validateSlipQrPayloadBasic(file) {
  if (!file) {
    return {
      ok: false,
      message: 'Slip file is required'
    };
  }
  var payload = String(file.slip_qr_payload || '').trim();
  var transRef = String(file.slip_trans_ref || '').trim();
  if (!payload || !transRef) {
    return {
      ok: false,
      message: 'ไม่พบ QR ตรวจสอบสลิป กรุณาอัปโหลดสลิปจากแอปธนาคารอีกครั้ง'
    };
  }
  var extracted = extractSlipTransRefFromPayload(payload);
  if (!extracted || extracted !== transRef) {
    return {
      ok: false,
      message: 'QR ในรูปไม่ใช่ QR ตรวจสอบสลิปธนาคาร กรุณาอัปโหลดสลิปใหม่'
    };
  }
  return {
    ok: true,
    payload: payload,
    trans_ref: transRef
  };
}

function extractSlipTransRefFromPayload(payload) {
  var root = parseSlipTlv(payload);
  for (var i = 0; i < root.length; i++) {
    var children = parseSlipTlv(root[i].value);
    var apiId = '';
    var transRef = '';
    children.forEach(function (child) {
      if (child.id === '00') apiId = child.value;
      if (child.id === '02') transRef = child.value;
    });
    if (apiId === '000001' && transRef) return transRef;
  }
  return '';
}

function parseSlipTlv(value) {
  var nodes = [];
  var index = 0;
  value = String(value || '');
  while (index + 4 <= value.length) {
    var id = value.slice(index, index + 2);
    var len = Number(value.slice(index + 2, index + 4));
    if (isNaN(len) || len < 0) break;
    var start = index + 4;
    var end = start + len;
    if (end > value.length) break;
    nodes.push({
      id: id,
      value: value.slice(start, end)
    });
    index = end;
  }
  return nodes;
}

function adminApprovePayment(payload) {
  var now = nowString();
  var payment = updateRowById('payments', 'order_id', payload.order_id, {
    payment_status: 'paid',
    verified_at: now,
    verified_by: 'admin',
    reject_reason: '',
    updated_at: now
  });
  var order = updateRowById('orders', 'order_id', payload.order_id, {
    payment_status: 'paid',
    updated_at: now
  });
  logActivity('admin', 'approve_payment', 'order', payload.order_id, {
    amount: payment.amount
  });
  return {
    order: order,
    payment: payment
  };
}

function adminRejectPayment(payload) {
  if (!payload.reject_reason) {
    throw appError('VALIDATION_ERROR', 'Reject reason is required');
  }
  var now = nowString();
  var payment = updateRowById('payments', 'order_id', payload.order_id, {
    payment_status: 'rejected',
    verified_at: now,
    verified_by: 'admin',
    reject_reason: sanitizeText(payload.reject_reason, 300),
    updated_at: now
  });
  var order = updateRowById('orders', 'order_id', payload.order_id, {
    payment_status: 'rejected',
    updated_at: now
  });
  logActivity('admin', 'reject_payment', 'order', payload.order_id, {
    reject_reason: payload.reject_reason
  });
  return {
    order: order,
    payment: payment
  };
}
