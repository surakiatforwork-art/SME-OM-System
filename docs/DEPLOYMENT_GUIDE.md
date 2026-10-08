# Deployment Guide

## 1. Frontend Local Development

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal. By default, mock mode works without Apps Script.

## 2. Frontend Environment

Create `frontend/.env.local`:

```env
VITE_API_URL=https://script.google.com/macros/s/your-deployment-id/exec
VITE_APP_NAME=SME OM System
VITE_MOCK_MODE=false
```

For UI-only development:

```env
VITE_API_URL=
VITE_APP_NAME=SME OM System
VITE_MOCK_MODE=true
```

## 3. Apps Script Setup

1. Create a new Google Sheet.
2. Copy the spreadsheet id from the URL.
3. Create folders in Google Drive:
   - product images
   - payment slips
4. Open Apps Script and add every `.gs` file from `apps-script/`.
5. Add `appsscript.json` manifest.

## 4. Script Properties

Set these in Apps Script Project Settings:

| key | required | notes |
| --- | --- | --- |
| `SPREADSHEET_ID` | yes | Google Sheet id |
| `PRODUCT_IMAGE_FOLDER_ID` | yes | folder for product images |
| `SLIP_FOLDER_ID` | yes | folder for payment slips |
| `ADMIN_PASSWORD_HASH` | recommended | SHA-256 of admin password |

If `ADMIN_PASSWORD_HASH` is not set, the backend can read `admin_password_hash` from `shop_settings`. This is acceptable only for demo or early MVP.

## 5. Initialize Database

In Apps Script editor, run:

```js
setupSheets()
```

Then optional demo data:

```js
seedDemoData()
```

Demo login password after seed is `admin123`. Change it before real use.

## 6. Deploy Web App

1. Click Deploy > New deployment.
2. Select Web app.
3. Execute as: Me.
4. Who has access: Anyone.
5. Deploy.
6. Copy the Web App URL.
7. Put it into `VITE_API_URL`.

## 7. GitHub Pages

From project root:

```bash
npm run build
```

Deploy `frontend/dist`.

If using a repository path, update [frontend/vite.config.ts](../frontend/vite.config.ts) `base` before build.

## 8. Drive Permissions

For MVP, uploaded images may need link access so frontend can display them. Before production:

- Prefer separate folders for product images and slips
- Product images may be public/readable
- Payment slips should not be broadly public unless the store accepts that risk
- Consider returning protected Apps Script download URLs for slips in a future version

## 9. Production Checklist

- Change demo admin password
- Set real PromptPay ID and optional fallback bank account number in Admin Settings
- Verify QR with a small test order
- Verify slip upload and admin review
- Confirm Drive folder permissions
- Confirm Google Sheet is owned by the shop/admin account
- Turn off mock mode


## Updated deployment notes for the performance build

Apps Script must include PublicDataService.gs together with the other files in apps-script. After updating the script, create or update the Web App deployment and confirm getPublicBootstrap responds successfully.

A frontend built from this version is safe to publish before the Apps Script update because it falls back to the legacy public actions when the new action is unavailable.

For GitHub Pages use npm run export:github. That command builds with hash routing, copies the output into github-deploy, creates 404.html, and adds .nojekyll. The current Vite configuration uses a relative base so the static build works under a repository path.

Before production release, verify the storefront, cart, checkout, PromptPay QR, slip upload, order lookup, admin login, product image upload, order update, and sync behavior with the real Apps Script endpoint.
