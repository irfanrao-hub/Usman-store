# Design system

Concepts: concept-home.png (1536 × 1024) and concept-continuation.png. User asked to use actual reference images: substitute authorized original Hanger photography for generated concept stand-ins, using deliberate responsive crops and the original product aspect ratio. Original source pixels and in-photo graphics are not repainted.

Palette: true white #fff; ink #111; muted #626262; line #dededc; hero/editorial neutral #eae9e6. Helvetica/Arial sans-serif. Header wordmark 40px bold, nav 14px; hero 100–112px bold, line-height .94, tracking -6px; sections 40–44px; body 15–16px. Desktop gutter approximately 68px, tablet 32px, mobile 20px. Crisp rectangular buttons, 1px borders, no shadows on cards. Icons: Lucide outline 20px / 1.5 stroke, 44px touch targets. Card photo ratio 4:5 (actual reference product ratio), editorial cropped 1:1, no color overlays. Four desktop product columns, two mobile; desktop split hero collapses text above photograph.

Locked first-viewport copy: FORME; A new point of view. Discover the collection.; New arrivals; T-shirts; Denim; Shirts; The edit; Wear it your way.; Everyday pieces. A different perspective.; Explore the collection; 01 / 03; Made for every day; Unisex, by design; Find your fit; New & noteworthy; All. Required demo disclosure is in footer and all checkout/admin screens.

Sections: header, split hero (three manual slides), utility links, tabbed arrival grid, denim editorial, footer with email form. Required functional surfaces extend same system: collections/filter bar, product image gallery + options panel, bag drawer/page, checkout/confirmation, auth/recovery, informational pages, admin sidebar + tables/forms. No generated UI screenshots used as runtime assets.

Motion: short nonblocking wordmark/hero entrance, product reveal via GSAP context, editorial scrub translation with native scroll and no pinning. Static content is visible before initialization. Reduced-motion disables animation, CSS transitions and smooth scrolling. Route cleanup reverts all triggers.
