function seedDemoData() {
  setupSheets();
  var now = nowString();
  var settings = {
    shop_name: 'บ้านขนม Mint',
    shop_description: 'ขนมทำสดใหม่ รับพรีออเดอร์ตามรอบผลิต ชำระผ่าน PromptPay QR ได้',
    logo_url: '',
    contact_phone: '0800000000',
    line_id: '@mintbakery',
    address: 'Bangkok, Thailand',
    pickup_instructions: 'รับสินค้าได้ที่หน้าร้าน เวลา 10:00-17:00',
    delivery_note: 'จัดส่งตามรอบของร้าน',
    is_shop_open: true,
    closed_message: 'วันนี้ปิดรับออเดอร์ชั่วคราว',
    promptpay_id: '0800000000',
    promptpay_display_name: 'Mint Bakery',
    bank_account_name: 'Mint Bakery',
    bank_account_number: '000-0-00000-0',
    payment_instructions: 'กรุณาชำระยอดให้ตรงกับออเดอร์ แล้วอัปโหลดสลิป',
    thank_you_message: 'ขอบคุณสำหรับออเดอร์ค่ะ ร้านจะตรวจสอบสลิปให้เร็วที่สุด',
    admin_password_hash: hashString('admin123')
  };
  Object.keys(settings).forEach(function (key) {
    upsertSetting(key, settings[key]);
  });

  if (readRows('products').length === 0) {
    appendRow('products', {
      product_id: 'PRD-000001',
      name: 'เค้กกล้วยหอม',
      description: 'เนื้อนุ่ม หอมกล้วย ทำสดตามรอบ',
      price: 89,
      category: 'Bakery',
      image_url: 'https://placehold.co/900x650/d8f4e6/4b3a2c?text=Banana+Cake',
      image_file_id: '',
      stock_type: 'limited',
      stock_qty: 40,
      sold_qty: 0,
      remaining_qty: 40,
      is_active: true,
      is_deleted: false,
      is_preorder: true,
      sort_order: 10,
      created_at: now,
      updated_at: now
    });
    appendRow('products', {
      product_id: 'PRD-000002',
      name: 'บราวนี่กล่องเล็ก',
      description: 'บราวนี่ช็อกโกแลตเข้มข้น ตัดชิ้นพอดีคำ',
      price: 129,
      category: 'Dessert',
      image_url: 'https://placehold.co/900x650/efe3c7/4b3a2c?text=Brownie+Box',
      image_file_id: '',
      stock_type: 'limited',
      stock_qty: 25,
      sold_qty: 0,
      remaining_qty: 25,
      is_active: true,
      is_deleted: false,
      is_preorder: true,
      sort_order: 20,
      created_at: now,
      updated_at: now
    });
    appendRow('products', {
      product_id: 'PRD-000003',
      name: 'ข้าวกล่องไก่ย่าง',
      description: 'ชุดอาหารกลางวันพร้อมผักและน้ำจิ้มสูตรร้าน',
      price: 75,
      category: 'Meal Box',
      image_url: 'https://placehold.co/900x650/abe8cf/2d2119?text=Meal+Box',
      image_file_id: '',
      stock_type: 'unlimited',
      stock_qty: 0,
      sold_qty: 0,
      remaining_qty: 999,
      is_active: true,
      is_deleted: false,
      is_preorder: false,
      sort_order: 30,
      created_at: now,
      updated_at: now
    });
  }

  return {
    ok: true,
    demo_admin_password: 'admin123'
  };
}
