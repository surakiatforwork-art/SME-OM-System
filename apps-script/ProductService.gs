function normalizeProduct(row) {
  row.price = toNumber(row.price);
  row.stock_qty = toNumber(row.stock_qty);
  row.sold_qty = toNumber(row.sold_qty);
  row.remaining_qty = row.stock_type === 'unlimited'
    ? 999
    : Math.max(0, row.stock_qty - row.sold_qty);
  row.is_active = toBool(row.is_active);
  row.is_deleted = toBool(row.is_deleted);
  row.is_preorder = toBool(row.is_preorder);
  row.sort_order = toNumber(row.sort_order);
  return row;
}

function getProducts(payload) {
  payload = payload || {};
  var search = String(payload.search || '').toLowerCase();
  var category = String(payload.category || '');
  var products = readRows('products')
    .map(normalizeProduct)
    .filter(function (product) {
      if (!product.is_active || product.is_deleted) return false;
      if (category && product.category !== category) return false;
      if (!search) return true;
      return [product.name, product.description, product.category].join(' ').toLowerCase().indexOf(search) !== -1;
    })
    .sort(function (a, b) {
      return a.sort_order - b.sort_order;
    });
  return { products: products };
}

function getProductDetail(payload) {
  var product = findRowById('products', 'product_id', payload.product_id);
  if (!product || toBool(product.is_deleted)) throw appError('NOT_FOUND', 'Product not found');
  return { product: normalizeProduct(product) };
}

function adminListProducts(payload) {
  var includeDeleted = toBool(payload.include_deleted);
  var products = readRows('products')
    .map(normalizeProduct)
    .filter(function (product) {
      return includeDeleted || !product.is_deleted;
    })
    .sort(function (a, b) {
      return a.sort_order - b.sort_order;
    });
  return { products: products };
}

function adminCreateProduct(payload) {
  var input = payload.product || {};
  if (!input.name) throw appError('VALIDATION_ERROR', 'Product name is required');
  if (Number(input.price) <= 0) throw appError('VALIDATION_ERROR', 'Product price is required');
  var now = nowString();
  var stockType = input.stock_type === 'limited' ? 'limited' : 'unlimited';
  var stockQty = stockType === 'limited' ? toNumber(input.stock_qty) : 0;
  var product = {
    product_id: generateSimpleId('PRD', 'products', 'product_id'),
    name: sanitizeText(input.name, 160),
    description: sanitizeText(input.description, 1000),
    price: toNumber(input.price),
    category: sanitizeText(input.category || 'ทั่วไป', 80),
    image_url: input.image_url || '',
    image_file_id: input.image_file_id || '',
    stock_type: stockType,
    stock_qty: stockQty,
    sold_qty: 0,
    remaining_qty: stockType === 'limited' ? stockQty : 999,
    is_active: input.is_active !== false,
    is_deleted: false,
    is_preorder: toBool(input.is_preorder),
    sort_order: toNumber(input.sort_order),
    created_at: now,
    updated_at: now
  };
  appendRow('products', product);
  logActivity('admin', 'create_product', 'product', product.product_id, product);
  invalidatePublicDataCache();
  return { product: normalizeProduct(product) };
}

function adminUpdateProduct(payload) {
  var productId = payload.product_id;
  var patch = payload.patch || {};
  var current = findRowById('products', 'product_id', productId);
  if (!current) throw appError('NOT_FOUND', 'Product not found');
  var updatedPatch = {};
  [
    'name',
    'description',
    'price',
    'category',
    'image_url',
    'image_file_id',
    'stock_type',
    'stock_qty',
    'is_active',
    'is_deleted',
    'is_preorder',
    'sort_order'
  ].forEach(function (key) {
    if (patch[key] !== undefined) updatedPatch[key] = patch[key];
  });
  var nextStockType = updatedPatch.stock_type !== undefined ? updatedPatch.stock_type : current.stock_type;
  var nextStockQty = updatedPatch.stock_qty !== undefined ? toNumber(updatedPatch.stock_qty) : toNumber(current.stock_qty);
  updatedPatch.price = updatedPatch.price !== undefined ? toNumber(updatedPatch.price) : toNumber(current.price);
  updatedPatch.stock_qty = nextStockQty;
  updatedPatch.remaining_qty = nextStockType === 'unlimited'
    ? 999
    : Math.max(0, nextStockQty - toNumber(current.sold_qty));
  updatedPatch.updated_at = nowString();
  var product = updateRowById('products', 'product_id', productId, updatedPatch);
  logActivity('admin', 'update_product', 'product', productId, updatedPatch);
  invalidatePublicDataCache();
  return { product: normalizeProduct(product) };
}

function adminDeleteProduct(payload) {
  var product = updateRowById('products', 'product_id', payload.product_id, {
    is_active: false,
    is_deleted: true,
    updated_at: nowString()
  });
  logActivity('admin', 'delete_product', 'product', payload.product_id, {});
  invalidatePublicDataCache();
  return { product: normalizeProduct(product) };
}

function adminUploadProductImage(payload) {
  var result = uploadBase64Image(payload.file, 'PRODUCT_IMAGE_FOLDER_ID');
  return {
    image_url: result.url,
    image_file_id: result.file_id
  };
}
