# Feature status

Status distinguishes a functioning local implementation from a live external service. Passing tests verify the named paths, not every possible production scenario.

| Area | Status | Scope / evidence |
|---|---|---|
| Home, collection index, catalog and product pages | Working locally | SSR, actual authorized photographs, empty/404/error screens. Responsive and browser navigation checks. |
| Search, size/color/stock/price filters, sort, pagination | Working locally | Query-string state, rapid filter updates, refresh and browser history. No external search service. |
| Galleries, variants, SKU/stock, discounts | Working locally | Product gallery/guide controls, per-variant inventory, integer-priced offers. No invented reviews. |
| Persistent cart, drawer and cart page | Working locally | Browser storage of IDs/quantities; server revalidates prices/stock. Reload and checkout tested. |
| Checkout and payment outcomes | Sandbox | Success, failed, cancelled, delayed/expired; atomic reservation, idempotency, restoration tests. No real charges. |
| Confirmation, private tracking and account orders | Working locally | Session/user ownership or random private token; other clients denied. |
| Customer login/register/logout/recovery | Working locally; recovery email sandbox | Sealed expiring sessions, password hashes, one-use reset token and session revocation. Local outbox only. |
| Admin authentication / owner and staff | Working locally | Server-side enforcement; anonymous writes and staff owner-only operations rejected. |
| Product create/edit/draft/publish/archive/delete | Working locally | Version conflict protection, unique SKU/slug validation, redirects, historical lines, open-order deletion guard. |
| Variant and image management | Working locally | Add/remove variants; validated uploads, progress/retry, ordering and removal. Orphan cleanup command provided. Upload and invalid-content rejection tested. |
| Collection CRUD, ordering and memberships | Working locally | Display position, primary collection, many-to-many product membership, SEO fields. Browser creation and published product verified. |
| Home, navigation, theme and policies | Working locally | Main banner, section ordering/visibility, collection tabs, brand/contact, dark ink presets, configurable policies. Settings version guard tested; each theme permutation not individually audited. |
| Discounts / delivery settings | Working locally | Percentage, minimum, expiry, usage limit, enabled state; region validation and server shipping calculation. Demo values require owner approval. |
| Admin order fulfilment / cancellation | Sandbox | Separate payment/fulfilment states, simulated settlement, stock restoration. No courier calls or actual refunds. |
| Audit history | Working locally | Catalog, settings, orders, uploads and password-reset events. Owner-only listing. |
| Contact / newsletter | Local persistence | Records saved to owner inbox/database. No external mailing list or email sending. |
| GSAP / ScrollTrigger | Working locally | Nonblocking entrance, hero/product reveals, editorial scrub, native scroll, cleanup, reduced-motion alternative. No pinned scroll traps. |
| SEO | Implemented; demo intentionally nonindexable | Titles, descriptions, canonical routes, Product/Offer and breadcrumb JSON-LD; sitemap/organization enabled for real public mode. Local metadata assertions; Google Rich Results live validation not run. |
| Accessibility | Tested subset | Automated axe checks, keyboard dialogs/focus restoration, reduced motion, mobile layout. Not a claim of complete WCAG conformance or assistive-technology certification. |
| Performance | Measured lab subset | See QA report and raw lab measurements. No field data or ranking guarantee. |
| Live payment processing / verified payment webhooks | Blocked by unconfigured integration | Provider/account/business decisions required. Live checkout explicitly refuses orders. No unverified webhook can mark orders paid. |
| Actual courier integration, outbound email, taxes | Unavailable | Owner/provider choices and reviewed business rules required. No invented integrations or tax assumptions. |
| Production hosting / backups / monitoring | Not deployed | Deployment and maintenance instructions provided. No commit, push or publication. |
| Multi-instance database/object storage | Incomplete for scale-out | Current runtime is a single Node deployment with persistent SQLite/media storage. Migrate before horizontally scaling. |

Remaining production work is integration and operational work, not hidden by a simulated success screen. The UI identifies test checkout and demo policy/content explicitly.
