# Codex Multi Chat Plan

ใช้ไฟล์นี้เพื่อแยกงานต่อใน Codex หลายแชทโดยลดการแก้ชนกัน

## Chat A: Architect/Foundation

Focus:

- README and docs
- shared types
- API contract alignment
- project config

Allowed files:

- `README.md`
- `docs/**`
- `frontend/src/types/**`
- `frontend/src/lib/constants.ts`
- root config files

Avoid editing:

- page UI details
- Apps Script service internals unless coordinating with Chat D

## Chat B: Customer Storefront

Focus:

- storefront
- cart
- checkout
- payment
- order status

Allowed files:

- `frontend/src/pages/customer/**`
- `frontend/src/components/customer/**`
- `frontend/src/store/cartStore.ts`

Coordinate before editing:

- `frontend/src/lib/apiClient.ts`
- shared UI components

## Chat C: Admin Back Office

Focus:

- login
- dashboard
- products
- orders
- production
- reports
- settings

Allowed files:

- `frontend/src/pages/admin/**`
- `frontend/src/components/admin/**`
- `frontend/src/store/adminSessionStore.ts`

Coordinate before editing:

- `frontend/src/lib/apiClient.ts`
- route shells

## Chat D: Apps Script Backend

Focus:

- Apps Script routing
- sheet services
- order/payment/product logic
- PromptPay payload
- Drive upload
- auth/session

Allowed files:

- `apps-script/**`
- `docs/API_CONTRACT.md`
- `docs/DATABASE_SCHEMA.md`

Avoid editing:

- frontend UI pages unless fixing an integration mismatch

## Chat E: Design Polish

Focus:

- Tailwind theme
- UI polish
- responsive behavior
- accessibility
- empty/loading/error states

Allowed files:

- `frontend/src/styles/**`
- `frontend/src/components/ui/**`
- component classes in frontend pages
- `docs/UI_GUIDELINES.md`

Coordinate before editing:

- business logic in stores or api client

## Chat F: QA/Integration

Focus:

- install/build/dev verification
- mock flow tests
- Apps Script integration smoke tests
- docs consistency

Allowed files:

- test files if added
- `docs/TASK_BOARD.md`
- small bug fixes across stack after documenting reason

Coordinate before editing:

- large feature changes

## General Rules

- Do not rewrite files outside each chat ownership unless necessary
- Update `docs/TASK_BOARD.md` after material changes
- Keep `API_CONTRACT.md` and `types/**` aligned
- Keep mock mode working even when real Apps Script is unavailable
