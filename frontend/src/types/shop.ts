export interface ShopSettings {
  shop_name: string;
  shop_description: string;
  logo_url?: string;
  contact_phone?: string;
  line_id?: string;
  address?: string;
  pickup_instructions?: string;
  delivery_note?: string;
  is_shop_open: boolean;
  closed_message?: string;
  promptpay_id?: string;
  promptpay_id_masked?: string;
  promptpay_display_name?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  payment_instructions?: string;
  thank_you_message?: string;
}

export type ShopSettingsPatch = Partial<ShopSettings>;
