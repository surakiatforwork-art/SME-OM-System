var TIMEZONE = 'Asia/Bangkok';

var SHEET_HEADERS = {
  shop_settings: ['key', 'value', 'updated_at'],
  products: [
    'product_id',
    'name',
    'description',
    'price',
    'category',
    'image_url',
    'image_file_id',
    'stock_type',
    'stock_qty',
    'sold_qty',
    'remaining_qty',
    'is_active',
    'is_deleted',
    'is_preorder',
    'sort_order',
    'created_at',
    'updated_at'
  ],
  orders: [
    'order_id',
    'order_token',
    'created_at',
    'customer_name',
    'phone',
    'line_id',
    'pickup_method',
    'pickup_date',
    'delivery_address',
    'customer_note',
    'internal_note',
    'total_amount',
    'payment_status',
    'order_status',
    'source',
    'updated_at'
  ],
  order_items: [
    'item_id',
    'order_id',
    'product_id',
    'product_name_snapshot',
    'unit_price_snapshot',
    'qty',
    'subtotal',
    'created_at'
  ],
  payments: [
    'payment_id',
    'order_id',
    'amount',
    'promptpay_payload',
    'slip_url',
    'slip_file_id',
    'payment_status',
    'uploaded_at',
    'verified_at',
    'verified_by',
    'reject_reason',
    'created_at',
    'updated_at'
  ],
  customers: [
    'customer_id',
    'name',
    'phone',
    'line_id',
    'total_orders',
    'total_spent',
    'last_order_at',
    'created_at',
    'updated_at'
  ],
  admin_sessions: ['session_id', 'token_hash', 'created_at', 'expires_at', 'is_revoked'],
  activity_logs: [
    'log_id',
    'actor',
    'action',
    'target_type',
    'target_id',
    'detail_json',
    'created_at'
  ],
  preorder_rounds: [
    'round_id',
    'round_name',
    'pickup_date',
    'cutoff_at',
    'status',
    'note',
    'created_at',
    'updated_at'
  ]
};

function getSpreadsheet() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw appError('CONFIG_ERROR', 'SPREADSHEET_ID is not configured');
  return active;
}

function setupSheets() {
  var ss = getSpreadsheet();
  Object.keys(SHEET_HEADERS).forEach(function (name) {
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    var headers = SHEET_HEADERS[name];
    var current = sheet.getLastColumn()
      ? sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0]
      : [];
    var needsHeader = current.filter(String).length === 0 || current[0] !== headers[0];
    if (needsHeader) {
      sheet.clear();
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
  });
  return { sheets: Object.keys(SHEET_HEADERS) };
}

function getSheet(name) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    setupSheets();
    sheet = ss.getSheetByName(name);
  }
  return sheet;
}

function readRows(sheetName) {
  var sheet = getSheet(sheetName);
  var headers = SHEET_HEADERS[sheetName];
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values.map(function (row) {
    var obj = {};
    headers.forEach(function (header, index) {
      obj[header] = row[index];
    });
    return obj;
  });
}

function appendRow(sheetName, obj) {
  var sheet = getSheet(sheetName);
  var headers = SHEET_HEADERS[sheetName];
  sheet.appendRow(headers.map(function (header) {
    return obj[header] !== undefined ? obj[header] : '';
  }));
  return obj;
}

function appendRows(sheetName, objects) {
  if (!objects || !objects.length) return [];
  var sheet = getSheet(sheetName);
  var headers = SHEET_HEADERS[sheetName];
  var values = objects.map(function (obj) {
    return headers.map(function (header) {
      return obj[header] !== undefined ? obj[header] : '';
    });
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
  return objects;
}

function updateRowsByIds(sheetName, idField, patchesById) {
  var ids = Object.keys(patchesById || {});
  if (!ids.length) return 0;
  var sheet = getSheet(sheetName);
  var headers = SHEET_HEADERS[sheetName];
  var idIndex = headers.indexOf(idField);
  if (idIndex < 0) throw appError('CONFIG_ERROR', 'Unknown id field: ' + idField);

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;
  var range = sheet.getRange(2, 1, lastRow - 1, headers.length);
  var values = range.getValues();
  var changed = 0;

  values.forEach(function (row) {
    var patch = patchesById[String(row[idIndex])];
    if (!patch) return;
    Object.keys(patch).forEach(function (key) {
      var column = headers.indexOf(key);
      if (column >= 0) row[column] = patch[key];
    });
    changed += 1;
  });

  if (changed) range.setValues(values);
  return changed;
}

function findRowById(sheetName, idField, idValue) {
  var rows = readRows(sheetName);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][idField]) === String(idValue)) {
      rows[i]._rowNumber = i + 2;
      return rows[i];
    }
  }
  return null;
}

function updateRowById(sheetName, idField, idValue, patch) {
  var sheet = getSheet(sheetName);
  var headers = SHEET_HEADERS[sheetName];
  var row = findRowById(sheetName, idField, idValue);
  if (!row) throw appError('NOT_FOUND', sheetName + ' row not found');
  var updated = {};
  headers.forEach(function (header) {
    updated[header] = row[header];
  });
  Object.keys(patch).forEach(function (key) {
    updated[key] = patch[key];
  });
  sheet.getRange(row._rowNumber, 1, 1, headers.length).setValues([
    headers.map(function (header) {
      return updated[header] !== undefined ? updated[header] : '';
    })
  ]);
  return updated;
}

function nowString() {
  return Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss") + '+07:00';
}

function dateId() {
  return Utilities.formatDate(new Date(), TIMEZONE, 'yyMMdd');
}

function dateOnly(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, TIMEZONE, 'yyyy-MM-dd');
  }
  var text = String(value);
  var match = text.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : text.slice(0, 10);
}

function dateTimeKey(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss");
  }
  return String(value);
}

function parseTimestamp(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === '[object Date]') return value;
  var text = String(value);
  var parsed = new Date(text);
  if (!isNaN(parsed.getTime())) return parsed;
  return null;
}

function isTimestampAfter(value, since) {
  var valueDate = parseTimestamp(value);
  var sinceDate = parseTimestamp(since);
  if (valueDate && sinceDate) return valueDate.getTime() > sinceDate.getTime();
  return dateTimeKey(value) > dateTimeKey(since);
}

function readRowsUpdatedSince(sheetName, updatedField, since) {
  if (!since) return readRows(sheetName);
  return readRows(sheetName).filter(function (row) {
    return isTimestampAfter(row[updatedField], since);
  });
}

function readRowsCreatedSince(sheetName, createdField, since) {
  if (!since) return readRows(sheetName);
  return readRows(sheetName).filter(function (row) {
    return isTimestampAfter(row[createdField], since);
  });
}

function toNumber(value) {
  var n = Number(value);
  return isNaN(n) ? 0 : n;
}

function toBool(value) {
  if (value === true || value === 'TRUE' || value === 'true' || value === 1) return true;
  return false;
}

function sanitizeText(value, maxLength) {
  maxLength = maxLength || 500;
  return String(value || '').replace(/[<>]/g, '').trim().slice(0, maxLength);
}

function generateDailyId(prefix, sheetName, idField) {
  var marker = prefix + '-' + dateId();
  var rows = readRows(sheetName);
  var count = rows.filter(function (row) {
    return String(row[idField]).indexOf(marker) === 0;
  }).length + 1;
  return marker + '-' + String(count).padStart(4, '0');
}

function generateSimpleId(prefix, sheetName, idField) {
  var rows = readRows(sheetName);
  return prefix + '-' + String(rows.length + 1).padStart(6, '0');
}

function logActivity(actor, action, targetType, targetId, detail) {
  appendRow('activity_logs', {
    log_id: generateSimpleId('LOG', 'activity_logs', 'log_id'),
    actor: actor || 'system',
    action: action,
    target_type: targetType,
    target_id: targetId,
    detail_json: JSON.stringify(detail || {}),
    created_at: nowString()
  });
}
