import type { DatabaseSync } from "node:sqlite";
import type { Settings } from "./types";

export const kidsDemoProducts = [
  {
    slug: "sunshine-graphic-tee",
    title: "Sunshine Graphic Tee",
    asset: "sunshine-tee",
    color: "Butter Yellow",
    category: "tshirts",
    season: "summer",
    price: 145000,
  },
  {
    slug: "meadow-play-set",
    title: "Meadow Play Set",
    asset: "meadow-set",
    color: "Sage Green",
    category: "co-ord-sets",
    season: "summer",
    price: 245000,
  },
  {
    slug: "daisy-day-dress",
    title: "Daisy Day Dress",
    asset: "daisy-dress",
    color: "Daisy Yellow",
    category: "dresses",
    season: "summer",
    price: 265000,
  },
  {
    slug: "little-cloud-romper",
    title: "Little Cloud Romper",
    asset: "cloud-romper",
    color: "Sky Blue",
    category: "rompers",
    season: "summer",
    price: 165000,
  },
  {
    slug: "lilac-days-sweatshirt",
    title: "Lilac Days Sweatshirt",
    asset: "lilac-sweatshirt",
    color: "Lilac",
    category: "sweatshirts",
    season: "winter",
    price: 225000,
  },
  {
    slug: "little-explorer-hoodie",
    title: "Little Explorer Hoodie",
    asset: "sage-hoodie",
    color: "Sage Green",
    category: "sweatshirts",
    season: "winter",
    price: 285000,
  },
  {
    slug: "peach-quilted-jacket",
    title: "Peach Quilted Jacket",
    asset: "peach-jacket",
    color: "Peach",
    category: "jackets",
    season: "winter",
    price: 365000,
  },
  {
    slug: "cosy-day-set",
    title: "Cosy Day Set",
    asset: "cosy-set",
    color: "Oatmeal",
    category: "co-ord-sets",
    season: "winter",
    price: 325000,
  },
];
const categoryData = [
  [
    "new-arrivals",
    "New arrivals",
    "hero",
    "Little outfits for their next big adventure.",
  ],
  [
    "summer",
    "Summer",
    "summer",
    "Sunshine-ready kidswear. Explore T-shirts, co-ord sets, dresses and rompers.",
  ],
  [
    "winter",
    "Winter",
    "winter",
    "Layers for little explorers. Discover sweatshirts, hoodies, jackets and cosy co-ord sets.",
  ],
  [
    "tshirts",
    "T-shirts",
    "sunshine-tee",
    "Easy everyday tees for little personalities.",
  ],
  [
    "co-ord-sets",
    "Co-ord sets",
    "meadow-set",
    "Little outfits that go together, from summer play sets to winter layers.",
  ],
  [
    "dresses",
    "Dresses",
    "daisy-dress",
    "Playful dresses for sunshine days and everyday adventures.",
  ],
  [
    "rompers",
    "Rompers",
    "cloud-romper",
    "One-piece outfits for the littlest members of the family.",
  ],
  [
    "sweatshirts",
    "Sweatshirts",
    "lilac-sweatshirt",
    "Discover sweatshirts and hoodies for their winter wardrobe.",
  ],
  [
    "jackets",
    "Jackets",
    "peach-jacket",
    "An extra layer for little explorers.",
  ],
];

export function insertKidsDemo(d: DatabaseSync) {
  for (const [
    position,
    [slug, title, asset, description],
  ] of categoryData.entries()) {
    d.prepare(
      `INSERT INTO collections(id,slug,title,image,description,position)
      VALUES(?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET title=excluded.title,
      image=excluded.image,description=excluded.description,position=excluded.position,version=version+1`,
    ).run(
      slug,
      slug,
      title,
      `/images/kids-${asset}.webp`,
      description,
      position,
    );
  }
  for (const [i, p] of kidsDemoProducts.entries()) {
    const id = "kids-demo-" + p.slug;
    const categoryId = String(
      d.prepare("SELECT id FROM collections WHERE slug=?").get(p.category)!.id,
    );
    d.prepare(
      `INSERT INTO products(id,slug,title,description,price,compare_price,status,images,primary_collection,size_guide)
      VALUES(?,?,?,?,?,0,'published',?,?,?)`,
    ).run(
      id,
      p.slug,
      p.title,
      `A ${p.season} wardrobe idea for little adventures. Sample product with AI-generated imagery; prices, stock, fabric, care and fit are illustrative and must be replaced with verified product details before launch.`,
      p.price,
      JSON.stringify([`/images/kids-${p.asset}.webp`]),
      categoryId,
      "Sample age options only, not verified garment measurements. Compare your child's measurements with the final product size chart. Contact Knit & Kin for sizing help before ordering.",
    );
    for (const slug of [p.category, p.season, "new-arrivals"]) {
      const col = d
        .prepare("SELECT id FROM collections WHERE slug=?")
        .get(slug)!;
      d.prepare("INSERT INTO product_collections VALUES(?,?)").run(id, col.id);
    }
    const sizes =
      p.category === "rompers"
        ? ["0–3 M", "3–6 M", "6–12 M", "12–18 M"]
        : ["2–3 Y", "3–4 Y", "5–6 Y", "7–8 Y"];
    for (const [j, size] of sizes.entries())
      d.prepare("INSERT INTO variants VALUES(?,?,?,?,?,?)").run(
        `kids-v-${i + 1}-${j + 1}`,
        id,
        `KK-SAMPLE-${i + 1}-${j + 1}`,
        size,
        p.color,
        i === 0 && j === 3 ? 0 : 12 + j * 3,
      );
  }
}

// Only the recognisable original demo catalogue is upgraded automatically.
// Orders, accounts, uploaded media and the old product/variant records survive.
export function upgradeLegacyDemo(d: DatabaseSync, defaults: Settings) {
  if (
    d
      .prepare("SELECT 1 FROM products WHERE id LIKE 'kids-demo-%' LIMIT 1")
      .get()
  )
    return;
  const existing = d
    .prepare("SELECT id,description,images FROM products")
    .all();
  if (
    existing.length !== 26 ||
    !existing.every(
      (p) =>
        /^product-\d+$/.test(String(p.id)) &&
        String(p.description).includes("Demo product information;") &&
        /^\["\/images\/(product|denim|shirt)-\d+\.jpg"/.test(String(p.images)),
    )
  )
    return;
  d.exec("BEGIN IMMEDIATE");
  try {
    // Another rendering process may have completed the upgrade while this
    // connection was waiting for SQLite's write lock.
    if (
      d
        .prepare("SELECT 1 FROM products WHERE id LIKE 'kids-demo-%' LIMIT 1")
        .get()
    ) {
      d.exec("COMMIT");
      return;
    }
    d.prepare(
      "UPDATE products SET status='archived',version=version+1 WHERE id LIKE 'product-%'",
    ).run();
    for (const [old, next] of [
      ["denim", "sweatshirts"],
      ["shirts", "jackets"],
    ]) {
      d.prepare("UPDATE collections SET slug=? WHERE id=? AND slug=?").run(
        next,
        old,
        old,
      );
      d.prepare("INSERT OR IGNORE INTO redirects VALUES(?,?)").run(
        `/collections/${old}`,
        `/collections/${next}`,
      );
    }
    insertKidsDemo(d);
    const row = d.prepare("SELECT value FROM settings WHERE id=1").get();
    const previous = row ? JSON.parse(String(row.value)) : {};
    // Retain the owner's business/contact policies; update requested presentation.
    d.prepare("UPDATE settings SET value=?,version=version+1 WHERE id=1").run(
      JSON.stringify({
        ...defaults,
        ...previous,
        brand: defaults.brand,
        contactEmail: defaults.contactEmail,
        announcement: defaults.announcement,
        heroTitle: defaults.heroTitle,
        heroText: defaults.heroText,
        heroImage: defaults.heroImage,
        nav: defaults.nav,
        homeTabs: defaults.homeTabs,
        homeOrder: defaults.homeOrder,
        themeInk: defaults.themeInk,
      }),
    );
    d.prepare(
      "INSERT INTO audit(actor,action,entity,detail) VALUES('system','catalog.kidswear_demo.upgraded','catalog',?)",
    ).run(
      JSON.stringify({ archivedTemplateProducts: 26, addedSampleProducts: 8 }),
    );
    d.exec("COMMIT");
  } catch (error) {
    d.exec("ROLLBACK");
    throw error;
  }
}
