# FORME · Local fashion commerce demo

A standalone Next.js + TypeScript storefront and branded administration panel, using the Hanger photographs authorized in the request. The Nuance trial repository has not been changed. FORME is a provisional demo brand; the catalog, inventory and commercial settings are demo data.

**Local preview:** http://127.0.0.1:3100  
**Administration:** http://127.0.0.1:3100/admin

The final handoff includes a running production preview. If it has stopped, run `pnpm start` from this folder after building. Nothing has been committed, pushed or published, and no live payment service is enabled.

## Run locally

Requirements: Node 22.13+ (Node 24 LTS recommended), pnpm 10.29.2, and Chrome for the configured browser tests. The project uses Node’s built-in SQLite driver; its experimental warning on some supported Node versions is expected.

```sh
cd /Users/mab/Downloads/forme-store
pnpm install --frozen-lockfile
pnpm dev
```

The delivered folder already contains a private `.env.local`, seeded `data/forme.sqlite`, and installed dependencies. Owner login is the `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env.local`. Staff login is `staff@forme.local` with `SEED_STAFF_PASSWORD`. Passwords were generated randomly and stored with scrypt in the database. The seed variables do not create accounts automatically at startup.

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

1. Browse T-shirts, select a size filter and price sort, open a product, and use browser Back/Forward.
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
