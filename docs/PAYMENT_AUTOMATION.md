# Payment Automation Roadmap

## Current production-safe mode

SME OM System currently uses Dynamic Thai QR PromptPay for the exact order amount. After payment, the customer uploads a slip image. The browser reads the QR contained in the slip before upload and the backend stores the transfer reference together with the Drive file. The payment stays pending_review until an admin approves it.

This remains the default mode because it works with the existing Google Apps Script + Google Sheet + Google Drive stack without requiring a merchant payment contract or a secret API credential in the frontend.

## Why QR generation alone cannot confirm money received

Generating a PromptPay QR tells the banking app where and how much to pay. It does not, by itself, give this web app a trusted server-to-server event when the recipient account is credited.

Automatic confirmation should only be enabled when the shop has a merchant, acquirer or payment-provider service that supplies a server-side API or webhook for successful transactions.

Do not put provider secret keys in Vite environment variables because frontend environment values are compiled into browser JavaScript.

## Recommended future flow

1. Frontend asks Apps Script or the future Cloudflare backend to create a payment session for an existing order.
2. Backend creates a provider payment transaction and stores the provider reference against payment_id.
3. The provider calls a backend webhook after payment.
4. Backend verifies the webhook signature or queries the provider server API.
5. Backend validates order id, amount, currency, recipient context and duplicate transaction id.
6. The update is idempotent: the same provider transaction can mark the order paid only once.
7. Backend sets payment and order status to paid, fills verified_at and verified_by, and writes an activity log.
8. Customer and admin sync receive the new state automatically.
9. If the provider is unavailable or the merchant account is not configured, the existing slip upload remains available as fallback.

## Migration-friendly interface

Keep provider-specific code behind an adapter rather than calling it directly from React:

- createPaymentSession(orderId)
- getPaymentStatus(paymentId)
- handlePaymentWebhook(rawRequest)
- verifyProviderTransaction(reference)

This mirrors the adapter strategy used to keep the current Apps Script backend replaceable by a future Cloudflare backend.

## Security requirements

- Provider secrets are backend-only.
- Verify webhook authenticity before updating payment state.
- Never trust amount or order data sent back by the browser.
- Store a unique provider transaction id and reject duplicate processing.
- Log automatic verification separately from manual admin approval.
- Keep slips private and apply a retention policy where practical.
- Test with small real transactions before enabling automatic approval for customers.
