# POS SaaS — Frontend

Multi-tenant Point of Sale for Indonesian UMKM. One merchant, several outlets, three roles.
Companion docs in `/docs`: `frontend-design-brief.md` (screen specs, design system), `api-contract.md` (endpoints).
Where the design brief and the rules in this file disagree, **this file wins** — it reflects later product decisions.

## Stack

- Expo + Expo Router (file-based routing, typed routes), TypeScript `strict: true`
- NativeWind v4 for styling. Tailwind classes only — no `StyleSheet.create`, no inline style objects except for values Tailwind genuinely cannot express (animated values, measured layout)
- react-native-reusables for base UI primitives (`components/ui/*`). These are vendored, not a dependency — edit them freely
- react-native-web so the same components serve desktop, tablet, and mobile
- TanStack Query for all server state. Zustand for cart state only
- react-hook-form + zod for every form. One zod schema per form, colocated
- victory-native + react-native-svg for charts
- Path alias `@/*` → project root

## Non-negotiable rules

1. **Money never touches a float.** The API sends decimal strings (`"15750000.00"`). Parse to an integer number of rupiah at the API boundary and keep it an integer everywhere. Never `parseFloat` money, never sum with `+` on strings, never `toFixed`. All formatting goes through `lib/money.ts` — `formatIDR(15750000) === "Rp 15.750.000"`. No decimals are ever shown.
2. **Total = subtotal.** No discount, no tax, no service charge exists in this product — not as a field, not as a line item, not as a zero row. If a totals block has more than Subtotal and Total, it is a bug.
3. **Role gating is enforced in the router, not just in the UI.** A role that reaches a forbidden route gets the 403 screen. Hiding a nav item is not enough.
4. **No audit trail anywhere.** No audit log screens, no "riwayat perubahan stok", no audit wording in helper text. Out of MVP scope.
5. **UI copy is Bahasa Indonesia.** Code, comments, file names, and commit messages are English. Dates render as `13 Agu 2026, 14.30`; percentages use a comma decimal (`12,5%`).
6. **Touch targets ≥ 44×44** on tablet and mobile; POS tiles and cart steppers larger still. Status is never signalled by colour alone — always a text label or icon alongside.
7. Do not implement anything in the "Out of scope" list below, even if an endpoint exists for it.

## Role matrix (authoritative)

|                             | Owner         | Admin                           | Cashier            |
| --------------------------- | ------------- | ------------------------------- | ------------------ |
| Merchant settings           | manage        | —                               | —                  |
| Outlets                     | manage        | —                               | —                  |
| Staff                       | manage        | —                               | —                  |
| Category / Product          | **read-only** | manage                          | read via POS only  |
| Inventory                   | **read-only** | manage (adjust, bulk, transfer) | read at own outlet |
| Business dashboard          | yes           | no                              | no                 |
| Operational stock dashboard | no            | yes                             | no                 |
| Analytics                   | yes           | **no**                          | no                 |
| AI Insight                  | yes           | **no**                          | no                 |
| Transactions                | all outlets   | **no access**                   | own outlet only    |
| POS / checkout              | **no**        | **no**                          | yes                |

The Owner never creates products. The Owner's path to a catalog is: create an Admin account → that Admin manages the catalog.

## Routes

```
/(auth)/login, /(auth)/register
/(owner)/dashboard, /analytics, /ai-insights, /outlets, /users, /merchant,
         /products, /categories, /inventory  ← last three are read-only for Owner
/(admin)/dashboard, /inventory, /inventory/low-stock, /products, /categories
/(cashier)/pos, /transactions
/transactions/[id]  ← Owner and Cashier only
```

## Design tokens

Map these into `tailwind.config.js` as semantic names with a dark variant. Never hardcode a hex outside the config.

`canvas #F7F8FA / #0B0D11` · `surface #FFFFFF / #14171D` · `surface-raised #FFFFFF / #1B1F27` · `subtle #F1F3F6 / #1B1F27` · `border #E4E7EC / #272B34` · `border-strong #CDD2DA / #3A404C` · `fg #101828 / #F2F4F7` · `fg-muted #5A6376 / #98A2B3` · `fg-subtle #8A94A6 / #6B7385` · `accent #4F46E5 / #6366F1` · `accent-hover #4338CA / #818CF8` · `accent-subtle #EEF0FE / #1E1B4B` · `success #16A34A / #22C55E` · `success-subtle #ECFDF3 / #052E16` · `warning #D97706 / #F59E0B` · `warning-subtle #FFFAEB / #3B2506` · `danger #DC2626 / #EF4444` · `danger-subtle #FEF3F2 / #3B0A0A` · `info #0284C7 / #38BDF8`

Chart palette in this exact order: `#4F46E5, #0EA5E9, #14B8A6, #F59E0B, #EC4899, #8B5CF6`. Revenue is always `#4F46E5`, transaction count always `#0EA5E9`.

Type scale (Inter): `display 32/40 w600` · `h1 24/32 w600` · `h2 18/26 w600` · `h3 15/22 w600` · `body 14/20 w400` · `body-strong 14/20 w500` · `label 13/18 w500` · `caption 12/16 w400` · `mono 13/20 w500`. Money is always mono, tabular figures, right-aligned in tables.

Spacing `4 8 12 16 20 24 32 40 48 64`. Radius `sm 6 / md 8 / lg 12 / full`. Breakpoints: mobile `<768`, tablet `768–1279`, desktop `≥1280`.

## Out of scope — do not build

Payment gateway, card readers, split payments, tips. Refund / void / cancel of a completed transaction. Discounts, taxes, service charges. Customer profiles, loyalty, CRM. Purchase orders, suppliers, warehouses. Product variants, modifiers, per-outlet price overrides. Multi-currency. Audit logs and stock-movement history. AI insight history, archive, or dismiss. AI for Admin or Cashier. Any AI action that mutates data. Owner or Admin checkout. KYC / identity verification at signup. Offline mode. Shift management, clock-in/out, cash drawer.

## Known backend gaps

The Prisma schema currently lacks `Product.sku`, `Category.status`, `Transaction.status`, and has no `Payment` model, though `api-contract.md` specifies all of them. **Build against the API contract**, keep those fields in the client types, and make the mock adapter serve them. Do not redesign screens around the gap — file it for the backend instead.

## Conventions

- `components/ui/*` primitives are dumb and role-agnostic. Screen-specific composition lives in `features/<domain>/`
- One component per file, named export, colocated `*.test.tsx`
- Every list screen implements four states: loading (skeleton), populated, empty, no-results. Empty and no-results get different copy and different CTAs
- Every mutation gets an optimistic update or a pending state — never a frozen button with no feedback
- Commit per vertical slice, conventional commits, no `any`, no commented-out code
