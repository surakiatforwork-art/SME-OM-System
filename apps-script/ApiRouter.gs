function routeAction(action, payload) {
  switch (action) {
    case 'getPublicBootstrap':
      return getPublicBootstrap();
    case 'getShopSettingsPublic':
      return getShopSettingsPublic();
    case 'getProducts':
      return getProducts(payload);
    case 'getProductDetail':
      return getProductDetail(payload);
    case 'createOrder':
      return createOrder(payload);
    case 'getOrderStatus':
      return getOrderStatus(payload);
    case 'getCustomerProfileByPhone':
      return getCustomerProfileByPhone(payload);
    case 'listOrdersByPhone':
      return listOrdersByPhone(payload);
    case 'cancelOrderByCustomer':
      return cancelOrderByCustomer(payload);
    case 'uploadPaymentSlip':
      return uploadPaymentSlip(payload);
    case 'adminLogin':
      return adminLogin(payload);
    case 'adminLogout':
      return adminLogout(payload);
  }

  if (action.indexOf('admin') === 0) {
    verifyAdminSession(payload.session_token);
  }

  switch (action) {
    case 'adminGetDashboard':
      return adminGetDashboard(payload);
    case 'adminBootstrap':
      return adminBootstrap(payload);
    case 'adminSync':
      return adminSync(payload);
    case 'adminListProducts':
      return adminListProducts(payload);
    case 'adminCreateProduct':
      return adminCreateProduct(payload);
    case 'adminUpdateProduct':
      return adminUpdateProduct(payload);
    case 'adminDeleteProduct':
      return adminDeleteProduct(payload);
    case 'adminUploadProductImage':
      return adminUploadProductImage(payload);
    case 'adminListOrders':
      return adminListOrders(payload);
    case 'adminGetOrderDetail':
      return adminGetOrderDetail(payload);
    case 'adminApprovePayment':
      return adminApprovePayment(payload);
    case 'adminRejectPayment':
      return adminRejectPayment(payload);
    case 'adminUpdateOrderStatus':
      return adminUpdateOrderStatus(payload);
    case 'adminGetProductionSummary':
      return adminGetProductionSummary(payload);
    case 'adminGetSalesReport':
      return adminGetSalesReport(payload);
    case 'adminGetShopSettings':
      return adminGetShopSettings();
    case 'adminUpdateShopSettings':
      return adminUpdateShopSettings(payload);
    case 'adminExportOrdersCsv':
      return adminExportOrdersCsv(payload);
    default:
      throw appError('UNKNOWN_ACTION', 'Unknown action: ' + action);
  }
}
