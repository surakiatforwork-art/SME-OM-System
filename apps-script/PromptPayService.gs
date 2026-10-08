function buildPromptPayPayload(promptPayId, amount) {
  if (!promptPayId) throw appError('PROMPTPAY_NOT_CONFIGURED', 'PromptPay ID is not configured');
  var target = buildPromptPayTarget(promptPayId);
  var merchantAccount = formatEmvField('00', 'A000000677010111') +
    formatEmvField(target.type, target.value);
  var payload = '';
  payload += formatEmvField('00', '01');
  payload += formatEmvField('01', Number(amount) > 0 ? '12' : '11');
  payload += formatEmvField('29', merchantAccount);
  payload += formatEmvField('53', '764');
  if (amount && Number(amount) > 0) {
    payload += formatEmvField('54', Number(amount).toFixed(2));
  }
  payload += formatEmvField('58', 'TH');
  payload += '6304';
  return payload + crc16Ccitt(payload);
}

function buildPromptPayTarget(promptPayId) {
  var digits = String(promptPayId).trim().replace(/\D/g, '');
  if (digits.length === 10 && digits.charAt(0) === '0') {
    return {
      type: '01',
      value: '0066' + digits.slice(1)
    };
  }
  if (digits.length === 9 && /^[689][0-9]{8}$/.test(digits)) {
    return {
      type: '01',
      value: '0066' + digits
    };
  }
  if (digits.length === 11 && digits.indexOf('66') === 0) {
    return {
      type: '01',
      value: '0066' + digits.slice(2)
    };
  }
  if (digits.length === 13 && digits.indexOf('0066') === 0) {
    return {
      type: '01',
      value: digits
    };
  }
  if (digits.length === 13) {
    return {
      type: '02',
      value: digits
    };
  }
  if (digits.length === 15) {
    return {
      type: '03',
      value: digits
    };
  }
  throw appError(
    'INVALID_PROMPTPAY_ID',
    'PromptPay ID ของร้านไม่ถูกต้อง กรุณาใช้เบอร์พร้อมเพย์ 10 หลัก, เลขบัตร 13 หลัก หรือ e-wallet 15 หลัก'
  );
}

function validatePromptPayPayload(payload) {
  var text = String(payload || '');
  if (text.length < 8 || text.slice(-8, -4) !== '6304') return false;
  var body = text.slice(0, -4);
  return crc16Ccitt(body) === text.slice(-4).toUpperCase();
}

function getPromptPayPayloadDebug(promptPayId, amount) {
  var payload = buildPromptPayPayload(promptPayId, amount);
  return {
    payload: payload,
    valid_crc: validatePromptPayPayload(payload)
  };
}

function formatEmvField(id, value) {
  var text = String(value);
  return id + String(text.length).padStart(2, '0') + text;
}

function crc16Ccitt(value) {
  var crc = 0xFFFF;
  for (var i = 0; i < value.length; i++) {
    crc ^= value.charCodeAt(i) << 8;
    for (var j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
