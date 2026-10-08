# Design AI Brief

Use this brief with Figma AI, Uizard, v0, Lovable, Framer, Relume, or another UI design tool.

## Product

Name: SME OM System
Full name: SME Order Management System

SME OM System is an order management and preorder management web app for small SME shops. It helps shop owners manage products, customer orders, PromptPay QR payment, slip review, sales summaries, production summaries, and shop settings without editing code.

## Users

- Shop owners who sell bakery, lunch boxes, cakes, souvenirs, handmade products, and preorder items
- General customers ordering products from a small shop

## Brand Mood

Friendly, clean, trustworthy, soft, modern, warm, and approachable.

## Visual Style

Theme: Mint Light SME

- soft mint primary color
- warm cream background
- white surfaces
- soft brown text accents
- rounded corners
- gentle shadows
- large mobile-friendly buttons
- clean product cards
- calm admin dashboard

Avoid a heavy enterprise look. The app should feel professional but friendly for a small shop.

## Required Pages

Customer:

- Customer Storefront
- Cart
- Checkout
- Payment with PromptPay QR
- Order Status

Admin:

- Admin Login
- Admin Dashboard
- Admin Product Management
- Admin Product Editor
- Admin Order Management
- Admin Order Detail / Slip Review
- Admin Production Summary
- Admin Reports
- Admin Settings

## Required Components

- product card
- cart item
- quantity stepper
- checkout form
- order status badge
- payment status badge
- dashboard stat card
- admin table
- filter/search bar
- modal form
- confirm dialog
- upload field
- QR payment panel
- empty state
- loading state
- responsive admin navigation

## Customer UX Requirements

- Customer can order within 3-4 steps
- Cart is easy to access
- Checkout button is obvious
- Payment page must strongly emphasize exact amount and QR
- Payment page should show masked PromptPay ID, bank account/shop name, optional copyable bank account number, and slip upload
- Thai copy should feel natural and reassuring

## Admin UX Requirements

- Desktop: sidebar navigation
- Mobile: compact top/bottom navigation
- Tables must be responsive
- Use status badges with clear colors
- Search/filter should be visible
- Product and order actions should be easy to find
- Empty, loading, and error states must exist

## Design Constraints for React/Tailwind

- Use code-native text and controls, not screenshots
- Use reusable components
- Keep card radius consistent, ideally 16-24px for customer surfaces and 12-16px for admin surfaces
- Avoid nested cards inside cards
- Avoid decorative clutter
- Keep typography readable on mobile
- Make all form inputs at least 44px high
- Keep color tokens easy to map to Tailwind classes

## Suggested First Concept Prompt

Design a mobile-first web app UI for "SME OM System", an order and preorder management system for small Thai SME shops. Create a friendly, clean, trustworthy Mint Light SME visual style with warm cream background, soft mint primary buttons, white product cards, gentle shadows, rounded corners, and natural Thai copy. Include customer storefront with product cards, cart, checkout, PromptPay QR payment page, and admin dashboard with sidebar, stat cards, orders table, product management, reports, and settings. The interface should be practical to implement in React and Tailwind, with responsive layouts, status badges, upload fields, QR payment panel, and clear mobile touch targets.
