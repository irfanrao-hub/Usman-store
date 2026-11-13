# Knit & Kin kidswear design · 13 November 2026

This specification supersedes the earlier adult fashion design after the user explicitly selected a kidswear store.

Concepts: [hero and navigation](design/kidswear-hero.png), [season/category/product sections](design/kidswear-shopping.png), [FAQ and footer](design/kidswear-faq.png). All were created with the built-in image-generation tool and opened with `view_image` before implementation. The first concept owns the navigation; the generated shopping concept's extra header is not part of the page.

The design uses a white canvas, deep plum `#59305d` typography, Babyplanet-inspired purple `#a6489c` announcements, a darker accessible `#97418f` action colour, lavender `#f5ecf6` hero/FAQ surfaces, and mint/peach photo backgrounds. Nunito variable font is bundled locally with its OFL licence. Headings are bold and rounded; controls use the same family at readable weights. Search, person and wheeled cart retain the user's fine outline icon style.

The header stays sticky. Desktop navigation includes New arrivals, Summer, Winter, All categories and About us. Summer/Winter expand accessible native disclosure menus with actual catalogue clothing types. Mobile uses the existing focus-trapped navigation drawer and stacked disclosures.

The main page sequence is: split swipeable hero; three utility links; Summer/Winter cards; six circular clothing categories; four-column product grid with All/Summer/Winter tabs and visible Add to cart; FAQ accordion; four-column footer. On small screens the hero and seasonal cards stack, categories form three columns, products form two columns, and FAQs/footer stack. Owner settings retain control over seasonal-card/arrival ordering.

Above-fold wording: “Little outfits. Big adventures.”; “Everyday kidswear for their little world.”; “Shop new arrivals”; Summer / Winter; “Summer days”, “Winter layers”, “Find their size”. The other slides introduce Summer and Winter. The hero supports arrow buttons, keyboard arrows, dragging/swiping, pause/resume, and reduced motion. Rotation pauses on manual interaction, focus, hover, a hidden tab and off-screen state.

Eleven original raster assets were generated: three kidswear campaign images and eight isolated clothing photographs. Optimized WebP files are in `public/images/kids-*.webp`; the prompt and source manifest is [kidswear-assets.json](design/kidswear-assets.json). The model images are original concept photography, not competitor product images or verified sale inventory. Product descriptions, the catalogue and checkout disclose the preview status. No generated UI screenshot is used as a runtime image.

The implementation follows the concepts' palette, section order, typography family, 44:56 hero split, category circles, product-card anatomy, FAQ layout and icon style. Necessary differences are separately generated photographs, truthful preview disclosures, larger accessible click targets, real product colours, and the required pause/swipe controls. Font rendering and photo composition are not claimed to be pixel-identical to the generated mockups.
