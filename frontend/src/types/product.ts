export type StockType = "limited" | "unlimited";

export interface Product {
  product_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  image_file_id?: string;
  stock_type: StockType;
  stock_qty: number;
  sold_qty: number;
  remaining_qty: number;
  is_active: boolean;
  is_deleted: boolean;
  is_preorder: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type ProductInput = Omit<
  Product,
  "product_id" | "sold_qty" | "remaining_qty" | "created_at" | "updated_at"
> & {
  product_id?: string;
};
