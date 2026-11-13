# Kidswear reference review · 13 November 2026

Each supplied reference was inspected separately. Text inspection used the web tool; visual review used Playwright with installed Chrome at 1440 × 1000 because the built-in IAB was unavailable. The Hopscotch website rejected the text-fetch tool but loaded normally in Chrome. No reference forms or orders were submitted, and no customer data was collected.

| Reference | Observed detail | Applied to Knit & Kin |
|---|---|---|
| [Cuddle & Cradle](https://cuddle-cradle.com/) | Product page has an inline “people are viewing this right now” indicator beside product options. | Database-backed, expiring session counts on product pages. The user's requested last-order pattern is a separate recent-purchase notice; its exact behaviour on the reference was not verified. No numbers, reviews or sales claims were copied. |
| [Tods n Teens](https://www.todsnteens.com/) | Clothing navigation distinguishes Tropical, Winter, Summer and Eastern clothing; homepage has “Shop All Categories.” | Exactly Summer and Winter, as requested, with clothing types beneath each; six visual clothing categories on the homepage. |
| [Little & Loom](https://littlenloom.com/) | Homepage includes a clearly labelled Frequently Asked Questions section with shopping and collection questions. | Accessible expandable questions, original kidswear copy and the owner's own delivery/return settings. |
| [Babyplanet](https://babyplanet.pk/) | White storefront, strong purple navigation/actions (computed `rgb(166,72,156)`), colourful kids imagery, clear category browsing and Add to cart. | Purple/plum design with white, lavender, mint and peach surfaces; visible cart controls and original kidswear sample photography. |
| [Hopscotch](https://ilovehopscotch.com/) | Spacious white header, fine search/account/cart icons, age-oriented kids navigation, large editorial campaign images. | Clean sticky header, the user's outline icon treatment and a swipeable kidswear campaign hero. Sale graphics and competitor promotions were not copied. |

The user explicitly chose to convert the store to kidswear. The supplied contact details and Knit & Kin identity remain central. Since verified kids inventory and photos were not supplied, eight sample products use newly generated images and clearly marked demo prices/sizes. SEO metadata and sitemap include the resulting kidswear collections; demo indexing remains disabled.

The older Hanger review below is retained as historical context. Its adult catalogue and monochrome design were superseded by the kidswear update.

---

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
