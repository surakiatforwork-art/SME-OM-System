# Task Board

Last updated: 2026-10-08

## Done

- Created project source-of-truth documentation
- Defined Google Sheet database schema
- Defined Apps Script API contract
- Defined UI and design AI guidelines
- Defined deployment and security notes
- Defined multi-chat ownership plan
- Created React + TypeScript + Vite + Tailwind frontend scaffold
- Added customer flow: storefront, cart, checkout, payment QR, order status
- Added admin flow: login, dashboard, products, product editor, orders, order detail, production, reports, settings
- Added mock mode with localStorage-backed products, orders, payments, and admin session
- Added Apps Script backend scaffold with router, sheets, Drive upload, auth, products, orders, payments, reports, settings, PromptPay payload, setup, and seed data
- Verified `npm install`
- Verified `npm run build`
- Smoke tested customer mock flow on desktop/mobile with Edge via Playwright Core
- Smoke tested admin login and admin pages in mock mode
- Connected frontend to deployed Apps Script URL through `frontend/.env.local`
- Smoke tested real customer flow against Apps Script: storefront, checkout, QR payment, slip upload, order status
- Smoke tested real admin pages against Apps Script: orders, products, settings
- Fixed Apps Script date normalization for Google Sheet Date cells in dashboard/report paths
- Redeployed and smoke tested Apps Script dashboard/report date fixes against the live Web App
- Added delivery GPS/map picker to checkout with current-location lookup, clickable/draggable map pin, and Google Maps link saved into the delivery address
- Verified frontend build after adding Leaflet/react-leaflet map dependencies
- Smoke tested real customer delivery checkout flow with map selection and GPS button
- Added `github-deploy` static export folder and reusable `npm run export:github` script for GitHub Pages upload
- Fixed PromptPay payload generation to use dynamic QR mode with backend-calculated amount and stricter PromptPay ID normalization
- Added bank account number setting and customer payment copy-to-clipboard action under the QR code
- Replaced technical PromptPay checkout errors with customer-friendly Thai messages
- Added frontend error boundary and admin settings recovery state to avoid blank pages
- Added PromptPay normalization for Google Sheet numeric phone values that lose the leading zero
- Added admin slip viewer popup with Google Drive fallback link
- Added `delivering` order status and Admin Delivery page with list/map views, search, filters, sorting, route links, and delivered action
- Set checkout delivery method as the default customer choice
- Polished mobile UI density for storefront, product cards, cart, checkout, buttons, fields, loading states, and admin navigation
- Added session-scoped API response cache and request de-duplication for read APIs to reduce repeated Apps Script calls
- Added automatic storefront refresh on focus/visibility/online recovery while respecting the 90-second soft refresh window
- Added admin sync recovery when the browser comes back online
- Added reduced-motion accessibility fallback so 3D loaders and micro-interactions respect the user's OS preference

## In Progress

- None

## Todo

- Add deeper QA coverage for edge cases
- Add automated tests for API client and stores
- Add richer product image upload UX with preview/crop
- Add structured delivery latitude/longitude fields to the Sheet/API contract if the project needs filtering or routing by coordinates later
- Add robust admin password setup UI or helper script
- Add protected slip viewing route instead of public Drive links
- Add LINE notification integration
- Add multi-shop/SaaS tenancy model
- Add real production monitoring and backup process
- Test real Apps Script deployment against a live Google Sheet
- Add stock release logic when an order is cancelled or payment is rejected
- Add an admin test button that generates a 1 baht PromptPay QR preview from current settings
- Add Apps Script clasp/deployment automation if the team wants CLI deploys

## Next Recommended Codex Chat

Start with Chat F QA/Integration after this foundation is complete:

> Review the SME OM System repo. Run install/build, inspect the mock customer and admin flows, verify Apps Script files against docs/API_CONTRACT.md, and fix any build/runtime issues while keeping mock mode working.
