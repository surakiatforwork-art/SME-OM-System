function doGet() {
  return jsonResponse({
    ok: true,
    data: {
      app: 'SME OM System API',
      version: '0.1.0',
      status: 'ok'
    },
    error: null
  });
}

function doPost(e) {
  try {
    var raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    var body;
    try {
      body = JSON.parse(raw);
    } catch (parseErr) {
      throw appError('INVALID_JSON', 'Request body must be JSON');
    }
    var action = body.action;
    var payload = body.payload || {};

    if (!action) {
      return jsonResponse(errorBody('VALIDATION_ERROR', 'Missing action'));
    }

    var data = routeAction(action, payload);
    return jsonResponse({
      ok: true,
      data: data,
      error: null
    });
  } catch (err) {
    var code = err && err.code ? err.code : 'INTERNAL_ERROR';
    var message = err && err.message ? err.message : 'Unexpected error';
    return jsonResponse(errorBody(code, message));
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorBody(code, message) {
  return {
    ok: false,
    data: null,
    error: {
      code: code,
      message: message
    }
  };
}

function appError(code, message) {
  var err = new Error(message);
  err.code = code;
  return err;
}
