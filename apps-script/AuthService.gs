function hashString(value) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value),
    Utilities.Charset.UTF_8
  );
  return bytes.map(function (byte) {
    var v = byte < 0 ? byte + 256 : byte;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
}

function generateRandomToken(length) {
  length = length || 32;
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var token = '';
  for (var i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token + String(new Date().getTime());
}

function adminLogin(payload) {
  var password = payload.password || '';
  var hash = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD_HASH') ||
    getSetting('admin_password_hash');
  if (!hash) throw appError('CONFIG_ERROR', 'Admin password hash is not configured');
  if (hashString(password) !== hash) {
    throw appError('UNAUTHORIZED', 'Invalid admin password');
  }

  var token = generateRandomToken(48);
  var now = new Date();
  var expires = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  appendRow('admin_sessions', {
    session_id: generateSimpleId('SES', 'admin_sessions', 'session_id'),
    token_hash: hashString(token),
    created_at: nowString(),
    expires_at: Utilities.formatDate(expires, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss") + '+07:00',
    is_revoked: false
  });
  return {
    session_token: token,
    expires_at: Utilities.formatDate(expires, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss") + '+07:00'
  };
}

function verifyAdminSession(token) {
  if (!token) throw appError('UNAUTHORIZED', 'Missing admin session token');
  var tokenHash = hashString(token);
  var rows = readRows('admin_sessions');
  var found = rows.find(function (row) {
    return row.token_hash === tokenHash;
  });
  if (!found || toBool(found.is_revoked)) {
    throw appError('UNAUTHORIZED', 'Invalid admin session');
  }
  if (new Date(found.expires_at).getTime() <= new Date().getTime()) {
    throw appError('UNAUTHORIZED', 'Admin session expired');
  }
  return true;
}

function adminLogout(payload) {
  var token = payload.session_token;
  if (!token) return { success: true };
  var row = readRows('admin_sessions').find(function (item) {
    return item.token_hash === hashString(token);
  });
  if (row) updateRowById('admin_sessions', 'session_id', row.session_id, {
    is_revoked: true
  });
  return { success: true };
}
