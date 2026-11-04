# Reference audit · 1 November 2026

The audit used headless Google Chrome through Playwright because the Browser plugin was not installed. Public pages only; no forms were submitted and no orders were placed. No access to Hanger’s private backend or admin is claimed.

## Exact URLs inspected

- https://thehangerpakistan.com/ — desktop 1440 × 960, tablet 768 × 960, mobile 390 × 960.
- https://thehangerpakistan.com/collections/tshirts — desktop 1440 × 960, tablet 768 × 900, mobile 390 × 900.
- https://thehangerpakistan.com/collections/tshirts?sort_by=price-ascending — desktop, public URL sort state.
- https://thehangerpakistan.com/products/washed-print-knit-tshirt-6 — desktop 1440 × 960, tablet 768 × 900, mobile 390 × 900; selected Medium without adding to cart.
- https://thehangerpakistan.com/cart — desktop empty cart.
- https://thehangerpakistan.com/pages/exchange-return-policy — desktop.
- https://thehangerpakistan.com/collections/jeans and https://thehangerpakistan.com/collections/shirts — public imagery inspection.

Raw evidence: [page data](reference-audit.json), [interaction data](reference-interactions.json). Screenshots use the `reference-` prefix in this folder. [Homepage desktop](reference-0-1440.png), [homepage mobile](reference-0-390.png), [collection](reference-1-1440.png), [product](reference-2-1440.png), [cart](reference-3-1440.png), [returns](reference-4-1440.png).

## Observed structure and measurements

The homepage has a dark announcement strip, logo/navigation with search/account/cart controls, a large video-led opening, collection imagery and tabbed arrivals. The footer links to information and tracking and includes an email field. The live reference differs from its cached web text in places; screenshots are the visual evidence.

Computed font: Helvetica, Arial, sans-serif. Desktop homepage collection heading ~48.5px; arrival section ~36.4px. Mobile: ~32px / 20px. Desktop collection and policy headings ~97px; product title 40px. Desktop side spacing is approximately 48px. White surfaces, near-black text and light-gray image backgrounds dominate; product gallery corners are rounded in the reference. Downloaded product photos use a 4:5 ratio; category artwork typically uses 2:3. Desktop product page is gallery-left/details-right. Desktop collection uses a multicolumn grid; mobile compacts the layout and controls. No document-level horizontal overflow was observed at audited sizes.

Collection controls expose sorting, stock and price. Visiting `sort_by=price-ascending` preserved that URL. Medium selection on the product changed the checked variant input; the inspected product URL itself remained unchanged. The empty cart provides a continue-shopping path. Variant sizes, current/compare prices, stock text and a multi-image gallery were visible. These are observations, not evidence about Hanger’s internal inventory or payment correctness.

## Assumptions and deliberate improvements

Occupied-cart behavior, checkout payment steps, account recovery, successful orders and browser-back scroll restoration on the reference were not tested: the audit did not submit forms. Their implementation here follows the brief, rather than claiming parity with unverified reference internals.

Do not copy the reference’s inconsistent shipping thresholds (product help versus footer), mismatched contact-email spelling, customer reviews/ratings, shipping promises or return terms. The demo has a single configurable shipping calculation and explicitly provisional policies. Actual ratings are not invented. The oversized opening video is replaced by a bounded, immediately usable editorial hero. Original authorized product photography replaces generated concept stand-ins; the photos and any garment graphics remain intact.

## Official implementation references consulted

- [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) and [matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/): native scroll, scoped cleanup and motion preferences.
- [Google ecommerce guidance](https://developers.google.com/search/docs/specialty/ecommerce) and [product structured data](https://developers.google.com/search/docs/appearance/structured-data/product): canonical public URLs, explicit product offers, no invented ratings.
- [Web Vitals](https://web.dev/articles/vitals): distinguish local lab observations from real-user metrics.
- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), installed Next.js 16.4.3 route/server-client/authentication guides, and [iron-session](https://github.com/vvo/iron-session): server-rendered routes, sealed sessions and server authorization.
