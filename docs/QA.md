# Verification and handoff · 1 November 2026

The deliverable is a functioning **local sandbox**, with source in `/Users/mab/Downloads/forme-store` and production-mode preview at http://127.0.0.1:3100. It is not a deployed merchant service. The unrelated Nuance repository remains unchanged; no commit, push, publication or real payment was made.

## Checks and evidence

| Check | Result | Evidence / scope |
|---|---|---|
| TypeScript | Pass | `pnpm typecheck` on final source |
| ESLint | Pass | `pnpm lint` on final source |
| Production build | Pass | `pnpm build`, Next 16.4.3 / webpack |
| Commerce and security integration tests | 13 passed | `pnpm test`; isolated temporary SQLite database |
| Browser suite | 9 passed, 0 skipped, 0 flaky | [Full JSON report](e2e-full-results.json); production server, installed Chrome, Playwright |
| Final admin regression | 1 passed; [focused report](e2e-admin-regression.json) | Product/collection/image creation, mobile admin keyboard navigation and rejected-settings-save protection after the final UI fixes |
| Browser console/network | No errors or failed requests in measured homepage journeys | [Raw lab results](lab-results.json); desktop/mobile tabs and search modal |
| Accessibility | No axe violations in checked views | Home and admin order view using WCAG 2 A/AA, 2.1 AA and 2.2 AA rule tags; keyboard checks described below |
| Responsive layout | No document overflow at checked widths | Home 1536/768/390/360, product/info 390, admin 390; screenshots below |
| Client asset secret scan | 0 credential matches | Scanned final browser assets for generated owner/staff passwords and session secret |
| Source isolation | Clean Nuance Git status | `git status --short` produced no output in the original repository |

The Browser plugin was unavailable. Reference and implementation inspection used actual headless Chrome through Playwright; these were rendered-browser checks, not inferred from source code. Reference measurements and limitations are in the [audit](REFERENCE-AUDIT.md).

The 13 integration tests cover integer price arithmetic and discount rounding; duplicate variant merging; invalid quantities, unavailable stock and regions; expired/invalid offers; rejection of client-tampered totals without mutation; retry idempotency and request fingerprints; atomic stock deduction; failed/cancelled/expired reservation restoration once; repeated settlement/cancellation; draft/archived/zero-stock products; concurrent admin version checks and open-order deletion protection; production checkout refusal without a provider; salted password hashes, CSRF checks and persistent rate limits.

The nine browser scenarios cover responsive home and tabs, keyboard focus trapping/Escape/restoration, URL filters and rapid filter updates, refresh/back/forward, product/breadcrumb/canonical/JSON-LD behavior, persistent cart, variant selection and successful sandbox checkout, private order access, actual admin image upload/collection/product creation, customer registration/recovery, role enforcement and staff restrictions, malformed file rejection, duplicate checkout retries, reduced motion and information pages, product draft/publish/rename/archive/delete lifecycle, real 404/308 HTTP responses, settings version conflicts, discounts, and one-use password reset with session revocation. Automated image upload exercised the actual image pipeline, not a fake URL.

The mobile admin menu removes closed links from keyboard navigation, focuses its selected section when opened, and restores toggle focus on Escape. This behavior is included in the focused rerun. The last editor fix retains unsaved state after a rejected settings save and retains discount edits after a failed mutation. The focused browser rerun injects a settings conflict, verifies the error and dirty state, dismisses the discard confirmation, and verifies the edited field remains. It also reruns the product/collection/upload flow. The full suite predates only these isolated admin error-handling and keyboard-navigation adjustments; unrelated storefront tests were not unnecessarily repeated.

## Performance measurement

Measured against the local production build using `scripts/lab-check.cjs` and Chrome PerformanceObserver. New browser contexts were used. Desktop: 1536 × 1024, no throttling. Mobile: 390 × 844, 4× CPU slowdown, 80ms network latency, approximately 1.6Mbps download / 750Kbps upload. The Next image optimization cache may already be warm from prior functional tests. These are single-run localhost results, not a Lighthouse score, field measurements, a percentile or a production guarantee.

| Measurement | Desktop | Mobile |
|---|---:|---:|
| Largest Contentful Paint | 404ms | 628ms |
| Cumulative Layout Shift | 0 | 0 |
| Longest observed event duration in the exercised interactions | 48ms | 56ms |
| Browser errors / failed requests | 0 / 0 | 0 / 0 |

Observed event durations are **not field INP**. The recorded interaction set is small (tabs and search dialog). Public hosting, cold image transformation, real devices and user traffic still need measurement. The metrics follow the distinctions in [official Web Vitals guidance](https://web.dev/articles/vitals). Primary images have intrinsic layout dimensions and responsive Next Image output; below-fold imagery is lazy loaded. Native scroll remains usable without animation; reduced-motion preference disables animation and smooth scrolling.

## Visual fidelity ledger

Both generated concepts and final browser screenshots were opened for visual inspection with `view_image`. The homepage comparison used the same 1536 × 1024 viewport. [Opening concept](concept-home.png), [continuation concept](concept-continuation.png), [final opening](final-desktop-viewport.png), [final full page](final-desktop-full.png).

| Comparison | Final result / reason for difference |
|---|---|
| Header and section geometry | Dark announcement, white compact header, roughly 44:56 split hero and three-part utility strip preserved. Header was reduced from 90px to 64px and desktop hero to 480px at 1536px to match the concept’s first-viewport hierarchy. |
| Typography | Bold Helvetica/Arial display hierarchy, two-line hero wording, compact navigation, rectangular CTAs and thin outline icons preserved. Actual browser font rasterization/wordmark width differs modestly from the generated lettering. |
| Imagery | Uses the **original Hanger images explicitly requested by the user**. Generated models were concept stand-ins only. Full-body studio photos replace the seated concept models; garment graphics remain intact. No generated UI screenshot is used as a website background. This is an intentional material difference, not claimed pixel equivalence. |
| Product grid | Four equal desktop columns and two mobile columns, original 4:5 product photography, offer labels, prices, color labels and quick-add controls. Actual demo catalog titles/prices replace fictional concept labels. |
| Editorial and footer | Denim image/text split, same headline and CTA, white four-column footer with newsletter and support links. Actual denim close-up replaces the concept model. FAQ and explicit demo disclosure support the requested functional scope; mobile reflows vertically. |
| Interactive/accessibility details | Real buttons, keyboard tab selection, focus outlines, dialog trapping and focus restoration are retained. The blue outline in screenshots is the legitimate restored keyboard focus after closing search. |

The structural design matches the chosen concept closely; imagery and catalog copy intentionally follow the user’s reference-image instruction. No false 10/10 pixel-match claim is made. Mobile is an implementation adaptation of the desktop concept, with readable stacked hero content and two-column cards.

## Screenshot gallery

- [Desktop first viewport](final-desktop-viewport.png) and [complete desktop homepage](final-desktop-full.png).
- [Mobile first viewport](final-mobile-viewport.png) and [complete mobile homepage](final-mobile-full.png).
- [Product desktop](final-product-desktop.png), [product mobile / size-guide flow](product-mobile.png).
- [Admin desktop](final-admin-desktop.png) and [admin mobile](final-admin-mobile.png).
- [Sandbox order confirmation](order-confirmation.png).
- Reference screenshots and measured dimensions: [reference audit](REFERENCE-AUDIT.md).

Repeated automated owner logins correctly triggered the 12-attempt throttle. Only the seeded local owner’s transient counter was cleared to finish the focused rerun; the rate-limit implementation was not disabled or relaxed. Temporary QA catalog products/collections were removed after verification. Sample sandbox orders and audit records remain as useful evidence. Completed test traces were removed because they can contain test login values; raw passing reports contain no account passwords. Private `.env.local`, database and outbox are local-only and ignored by Git.

## Practical limits

This is a single-node SQLite/media deployment model. Live payments, signed provider webhooks/refunds, outbound email, courier fulfilment and production tax rules are not configured. Checkout refuses live operation; it never presents a sandbox outcome as a real charge. Owner brand/domain/contact, verified product details and legally approved policies remain inputs for launch. See [feature-by-feature status](FEATURES.md) and [deployment instructions](../README.md).

Checked Chrome only. Safari/Firefox, screen-reader testing, multi-instance concurrency, broad load/security testing, email deliverability, provider webhook replay behavior and live Google Rich Results validation remain outside this local verification. CSP still permits inline scripts for Next rendering; a nonce-based policy is a further production hardening step. Installing the Browser plugin would make future rendered UI checks easier to inspect directly in the app.
