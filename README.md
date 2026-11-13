# Knit & Kin · Kidswear storefront

A Next.js + TypeScript kidswear storefront for **Knit & Kin**. The November 13 update adds Summer/Winter menus with clothing categories, a pastel purple design, a swipeable kidswear hero, category browsing, homepage FAQs, age-size selection and visible add-to-cart controls.

The catalogue contains **eight clearly labelled sample products with AI-generated photography**. Prices, stock and sizes are examples, and checkout creates sandbox orders only. Replace them with verified merchant inventory before launch. Original adult demo products are archived by the guarded demo upgrade; their variants and historic order data are retained. Custom catalogues are not automatically replaced.

**Local preview:** http://127.0.0.1:3100  
**Administration:** http://127.0.0.1:3100/admin

Start the local preview with `pnpm dev`, or use `pnpm build` and `pnpm start` for production testing. Changes in this checkout do not update Netlify until deployed. No live payment service is enabled.

Brand name, email and social links are centralized in `src/lib/brand.ts`. `CANONICAL_SITE_URL=https://knitandkin.com` controls SEO URLs; `SITE_URL` must match the actual application origin for request validation. Change `SITE_URL` when the custom domain is connected. Do not replace the Netlify origin before the domain is serving the app.

The sitemap includes published products, collections and information pages. Metadata includes page titles, descriptions, canonical URLs, Open Graph/Twitter previews and structured store/product/breadcrumb data. Demo mode keeps `noindex` and disallows crawling. Turn off both `DEMO_MODE` and `SEED_ON_BOOT` only after real catalog, durable database, payment integration and policies are ready; submit the canonical sitemap to Search Console after connecting the domain. Rankings are not guaranteed.

On machines with little free disk space, run `DISABLE_WEBPACK_CACHE=true pnpm dev` (also supported for builds) and `pnpm test:e2e --trace=off`. Browser QA outputs are kept under `/tmp`, outside the source checkout.

## Kidswear categories and activity

In Administration → Products, assign each real product to **Summer or Winter**, its clothing type, and optionally New arrivals. Season submenus and filters use these collection memberships. The six homepage clothing categories are T-shirts, Co-ord sets, Dresses, Rompers, Sweatshirts and Jackets. Additional clothing collections appear on the all-categories page and in matching seasonal menus. Update collection pictures and the homepage hero from administration.

Homepage FAQs share the same component as `/pages/faq`. Shipping and returns answers read the owner's settings; no competitor guarantees or reviews were copied. Product descriptions, title metadata, social previews and the automatically generated sitemap now use kidswear terminology.

**People viewing:** active product tabs send a heartbeat every 30 seconds; visits expire after 90 seconds. Multiple tabs from the same session count once. Closing/hiding a tab removes its presence when possible. The current shopper is included, and the demo UI says “viewing this preview.” This is a count of browser sessions, not verified identities.

**Last order:** a dismissible homepage notice reads the latest non-sandbox paid, non-cancelled order from the last seven days whose product is still published. It exposes only the product title/image/link and timestamp; no customer names, addresses or tracking links. With no eligible order, it stays hidden. Sandbox checkouts never produce this notice.

A separate Administration → Settings → Services toggle controls activity widgets. Both widgets are disabled on ephemeral Netlify/Lambda storage, because separate temporary SQLite files cannot provide an accurate shared feed. A shared persistent backend is required before enabling them there. Local persistent SQLite supports them now.

Design concepts and the built-in image-generation prompt/asset manifest are in [`docs/design`](docs/design). Current reference findings are in [`docs/REFERENCE-AUDIT.md`](docs/REFERENCE-AUDIT.md).

## Run locally

Requirements: Node 22.13+ (Node 24 LTS recommended), pnpm 10.29.2, and Chrome for the configured browser tests. The project uses Node’s built-in SQLite driver; its experimental warning on some supported Node versions is expected.

```sh
cd /Users/mab/Downloads/forme-store
pnpm install --frozen-lockfile
pnpm dev
```

The delivered folder already contains a private `.env.local`, seeded `data/forme.sqlite`, and installed dependencies. Owner login is the `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env.local`. Staff login is `staff@forme.local` with `SEED_STAFF_PASSWORD`. Passwords were generated randomly and stored with scrypt in the database. With `SEED_ON_BOOT=true`, an empty demo database is seeded automatically using the configured seed account values.

For a fresh, separate demo installation:

1. Copy `.env.example` to `.env.local`.
2. Set `SESSION_SECRET` to a cryptographically random string of at least 32 characters; set a 12+ character seed owner password and optionally a staff password.
3. Set `DEMO_MODE=true` explicitly. Keep `SITE_URL` exactly equal to the preview origin, including `127.0.0.1` and port.
4. Run `pnpm db:migrate`, then `pnpm db:seed` once against an empty database. The seed refuses to overwrite an existing catalog.
5. Run `pnpm dev`, or `pnpm build && pnpm start` for production-mode rendering of the **sandbox** store.

`NODE_ENV=production` optimizes the app; it does not turn a sandbox payment into a real payment. Only `DEMO_MODE=true` enables sandbox order creation. With demo mode disabled, checkout fails closed because no live provider is integrated.

## Environment

| Variable | Purpose |
|---|---|
| `DEMO_MODE` | Explicit sandbox opt-in. Never defaults to mock commerce. |
| `SITE_URL` | Canonical origin and mutation origin checks. HTTPS for real hosting. |
| `DATABASE_PATH` | SQLite file path, default `data/forme.sqlite`. |
| `SESSION_SECRET` | Server-only sealed-cookie secret, 32+ random characters. |
| `SEED_ADMIN_EMAIL` | Email used by the one-time demo seed. |
| `SEED_ADMIN_PASSWORD` | Owner password for the one-time seed. |
| `SEED_STAFF_PASSWORD` | Optional staff password for the one-time seed. |
| `TEST_BASE_URL` | Optional browser test origin. Defaults to port 3100. Must match `SITE_URL` when testing mutations. |

Never commit `.env.local`, `data/`, uploads, or test traces. Recovery messages in the local outbox contain private reset/tracking links. The owner can view them in Administration → Inbox & outbox. For a locked-out local owner, inspect the `outbox` table using an authorized local SQLite client; no email has been sent.

## Try the main flow

1. Open Summer or Winter, choose a clothing category, filter by age size, open a product, and use browser Back/Forward.
2. Select an available variant and add it to the bag. Reload to verify persistence.
3. Continue to checkout, enter demo delivery information, and choose a test payment result. `HELLO10` applies 10% off orders from Rs. 2,000 while valid.
4. A successful order is clearly labeled sandbox. The confirmation has a private tracking link; never share this link publicly.
5. Sign in to `/admin`. The order appears with separate payment and fulfilment states.
6. Create a collection, upload a JPG/PNG/WebP, create a draft product with unique SKUs, choose collections and a primary collection, then publish.
7. For a delayed test order, settle it in admin within 15 minutes or cancel it. Expired/failed/cancelled orders release stock once.

## Data and maintenance

`migrations/001_initial.sql` creates the relational schema. `scripts/seed.ts` contains separate demo seed data. Business changes write to SQLite; browser cart storage holds only variant IDs and quantities. Order lines preserve names, SKU, image and charged prices independently of later catalog edits.

Uploaded media lives in `data/media/` and is served through `/api/media/:id.webp`. Images are type/content/dimension/size validated, re-encoded, and stripped of metadata. Uploads that are abandoned or replaced can be reclaimed with `pnpm media:cleanup`; it only removes unreferenced uploads older than 24 hours and preserves historical order images.

Run `pnpm db:expire` every minute in a deployed sandbox to release expired reservations promptly. Reservation expiry also runs on quote, checkout, tracking and admin requests, so expired reservations are reconciled even without a scheduler.

Back up the SQLite database using its backup API or a consistent snapshot, together with `data/media/` and the session secret. SQLite WAL files must not be copied independently while writes are in progress. Only one authoritative database is used.

## Verification

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
# Start the app, then run:
pnpm test:e2e
```

The browser suite uses installed Chrome. To use Playwright’s managed Chromium instead, install it with `pnpm exec playwright install chromium` and remove `channel: 'chrome'` from `playwright.config.ts`.

Browser tests create labeled QA records and sandbox orders in the configured local database. Use a disposable database for repeatable CI; do not point tests at real customer data. Unit/integration tests use their own temporary SQLite database. See [QA results](docs/QA.md), [feature status](docs/FEATURES.md), [reference audit](docs/REFERENCE-AUDIT.md), [architecture](docs/ARCHITECTURE.md), and [design specification](docs/DESIGN.md).

## Deployment requirements

No deployment was performed. The app can run on a Node host with persistent writable storage; do not deploy the SQLite/media directories onto an ephemeral serverless filesystem. Use a reverse proxy with TLS, set the exact HTTPS `SITE_URL`, inject a new private session secret, and keep the database/media outside publicly served files. Make `.env.local` readable only by the app owner. Run migrations separately and create real owner accounts through an approved account-provisioning procedure; do not seed demonstration products into production.

Before accepting real commerce, the owner must provide the final brand and domain, authorized production product content, verified measurements/composition, support contact, shipping regions/rates, courier choice, approved returns/privacy/tax policy and payment-provider account. Live checkout, verified provider webhooks, real refunds, courier fulfilment and outbound email remain unconfigured. No provider availability or tax treatment is assumed. A live payment adapter must verify signed webhooks, deduplicate provider event IDs, enforce atomic stock/idempotency rules, and keep payment status independent of redirects and fulfilment. Do not simply change the sandbox UI label.

For multiple app instances, migrate SQLite to a shared relational database with equivalent transactions and use object storage for media. Add operational monitoring, backups, a provider-specific integration/security review, accessibility assistive-technology testing and real-user performance measurement before launch.
