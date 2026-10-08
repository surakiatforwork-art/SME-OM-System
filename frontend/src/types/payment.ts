export type PaymentStatus =
  | "unpaid"
  | "pending_review"
  | "paid"
  | "rejected"
  | "refunded";

export interface Payment {
  payment_id: string;
  order_id: string;
  amount: number;
  promptpay_payload: string;
  slip_url?: string;
  slip_file_id?: string;
  payment_status: PaymentStatus;
  uploaded_at?: string;
  verified_at?: string;
  verified_by?: string;
  reject_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface UploadFilePayload {
  name: string;
  mime_type: string;
  base64: string;
  slip_qr_payload?: string;
  slip_trans_ref?: string;
}
