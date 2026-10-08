# Security Notes

## MVP Security Model

SME OM System MVP is designed for small shops using Apps Script, Google Sheet, and Google Drive. It is not a bank-grade payment gateway and does not verify money transfer automatically.

Payment becomes `paid` only after admin manually approves the uploaded slip.

## Admin Authentication

- Admin password must not be stored in frontend
- Apps Script compares password hash from Script Properties or `shop_settings`
- Successful login creates a random session token
- Only token hash is stored in `admin_sessions`
- Session has expiry
- Admin APIs must call `verifyAdminSession`

Before real use:

- Change demo password
- Prefer `ADMIN_PASSWORD_HASH` in Script Properties
- Clear old sessions if admin password changes

## Order Status Access

Customer status page must require `order_token`. Do not expose order details by predictable `order_id` alone.

## PromptPay ID

- PromptPay ID must come from shop settings or backend configuration
- Do not hard-code a real PromptPay ID in frontend source
- Customer UI should show only masked PromptPay ID
- Recommend using a shop phone number instead of national ID for privacy
- Bank account number is public on the payment page only if the shop owner configures it as a transfer fallback
- Test the generated QR with a small amount after changing PromptPay ID, especially when switching between phone, national ID, and e-wallet IDs

## File Upload

- Accept only `image/jpeg`, `image/png`, `image/webp`
- Limit file size to 5MB
- Do not allow user-provided folder id
- Drive folder id must come from Script Properties
- Treat payment slips as sensitive personal/payment data

## Google Drive Links

Product images can be public if the shop accepts it. Payment slips should be protected where possible.

MVP may use link-readable files for simplicity. Before production, consider:

- storing slips in private folder
- showing slip only through admin-authenticated Apps Script route
- automatically removing old slips after retention period

## Input Validation

Backend must validate:

- required fields
- phone and contact length
- pickup method/date
- product active/deleted status
- stock availability
- order status enum
- payment status enum
- numeric price/qty

Frontend validation improves UX but is not a security boundary.

## Known Limitations

- Apps Script web app is not ideal for high traffic
- Google Sheet has concurrency limits
- Manual slip approval can be spoofed if admin does not carefully check amount/date/account
- No automated fraud detection
- No full audit-grade immutable ledger

## Before Real Production

- Replace demo settings and password
- Verify PromptPay QR with a real small amount
- Restrict Drive permissions
- Back up Google Sheet
- Add monitoring for Apps Script errors
- Consider moving to a dedicated backend for higher volume


## Automatic payment verification security

PromptPay QR generation is not considered payment confirmation. Automatic paid status must come from a trusted server-side merchant or payment-provider integration that can authenticate the transaction.

Provider credentials must never be shipped in frontend JavaScript. Webhooks must be authenticated, payment amount and order identity must be rechecked on the backend, and provider transaction ids must be processed idempotently. Until such an integration is configured, manual slip review remains the authoritative payment confirmation.
