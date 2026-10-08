var SHOP_SETTING_KEYS = [
  'shop_name',
  'shop_description',
  'logo_url',
  'contact_phone',
  'line_id',
  'address',
  'pickup_instructions',
  'delivery_note',
  'is_shop_open',
  'closed_message',
  'promptpay_id',
  'promptpay_display_name',
  'bank_account_name',
  'bank_account_number',
  'payment_instructions',
  'thank_you_message',
  'admin_password_hash'
];

function getSetting(key) {
  var row = findRowById('shop_settings', 'key', key);
  return row ? row.value : '';
}

function upsertSetting(key, value) {
  var existing = findRowById('shop_settings', 'key', key);
  var payload = {
    key: key,
    value: value,
    updated_at: nowString()
  };
  if (existing) return updateRowById('shop_settings', 'key', key, payload);
  return appendRow('shop_settings', payload);
}

function getSettingsObject() {
  var rows = readRows('shop_settings');
  var settings = {};
  rows.forEach(function (row) {
    settings[row.key] = row.value;
  });
  settings.is_shop_open = settings.is_shop_open === '' ? true : toBool(settings.is_shop_open);
  settings.promptpay_id_masked = maskPromptPayId(settings.promptpay_id);
  return settings;
}

function getShopSettingsPublic() {
  var settings = getSettingsObject();
  var promptpayId = settings.promptpay_id;
  delete settings.promptpay_id;
  delete settings.admin_password_hash;
  settings.promptpay_id_masked = maskPromptPayId(promptpayId);
  return settings;
}

function adminGetShopSettings() {
  return getSettingsObject();
}

function adminUpdateShopSettings(payload) {
  var settings = payload.settings || {};
  Object.keys(settings).forEach(function (key) {
    if (SHOP_SETTING_KEYS.indexOf(key) === -1 || key === 'admin_password_hash') return;
    upsertSetting(key, settings[key]);
  });
  logActivity('admin', 'update_shop_settings', 'shop_settings', 'settings', {});
  invalidatePublicDataCache();
  return getSettingsObject();
}

function maskPromptPayId(value) {
  if (!value) return 'ยังไม่ได้ตั้งค่า';
  var text = String(value);
  var digits = text.replace(/\D/g, '');
  if (digits.length === 9 && /^[689][0-9]{8}$/.test(digits)) {
    digits = '0' + digits;
  }
  if (digits.length === 10) {
    return digits.slice(0, 2) + 'x-xxx-' + digits.slice(-4);
  }
  if (digits.length === 13) {
    return digits.slice(0, 1) + '-xxxx-xxxxx-' + digits.slice(-3);
  }
  if (text.length <= 6) return text.slice(0, 2) + '***';
  return text.slice(0, 3) + '***' + text.slice(-3);
}
