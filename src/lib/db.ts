import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { Product, Variant, Collection, Settings, Order } from "./types";
import { seedDemoContent } from "./demo-catalog";
import { brand } from "./brand";
const globalDb = globalThis as unknown as { formeDb?: DatabaseSync };
export function serverlessHost() {
  return Boolean(
    process.env.NETLIFY ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.AWS_EXECUTION_ENV,
  );
}
function migrationSql() {
  const path = join(process.cwd(), "migrations/001_initial.sql");
  try {
    return readFileSync(path, "utf8");
  } catch {
    return readFileSync(resolve("migrations/001_initial.sql"), "utf8");
  }
}
function databasePath() {
  if (process.env.DATABASE_PATH) return resolve(process.env.DATABASE_PATH);
  if (serverlessHost()) return "/tmp/forme.sqlite";
  return resolve("data/forme.sqlite");
}
function connect(path: string, sql: string) {
  mkdirSync(dirname(path), { recursive: true });
  const d = new DatabaseSync(path);
  d.exec(
    "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
  );
  d.exec(sql);
  return d;
}
export function db() {
  if (!globalDb.formeDb) {
    const sql = migrationSql();
    const preferred = databasePath();
    let opened: DatabaseSync;
    try {
      opened = connect(preferred, sql);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      const fallback = "/tmp/forme.sqlite";
      if (
        preferred === fallback ||
        (code !== "EROFS" && code !== "EACCES" && code !== "EPERM")
      )
        throw error;
      opened = connect(fallback, sql);
    }
    globalDb.formeDb = opened;
    const count = opened
      .prepare("SELECT COUNT(*) AS n FROM products")
      .get() as {
      n: number;
    };
    if (
      count.n === 0 &&
      (process.env.SEED_ON_BOOT === "true" || serverlessHost())
    ) {
      const password = process.env.SEED_ADMIN_PASSWORD;
      seedDemoContent({
        email: process.env.SEED_ADMIN_EMAIL,
        password: password && password.length >= 12 ? password : undefined,
        staffPassword: process.env.SEED_STAFF_PASSWORD,
      });
    }
  }
  return globalDb.formeDb;
}
export function transaction<T>(fn: () => T): T {
  const d = db();
  d.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    d.exec("COMMIT");
    return result;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}
export function audit(
  actor: string,
  action: string,
  entity: string,
  detail: unknown = {},
) {
  db()
    .prepare("INSERT INTO audit(actor,action,entity,detail) VALUES(?,?,?,?)")
    .run(actor, action, entity, JSON.stringify(detail));
}
export function collections(): Collection[] {
  return db()
    .prepare("SELECT * FROM collections ORDER BY position,title")
    .all()
    .map((r) => ({ ...r })) as unknown as Collection[];
}
export function products(includePrivate = false): Product[] {
  const rows = db()
    .prepare(
      `SELECT * FROM products ${includePrivate ? "" : "WHERE status='published'"} ORDER BY created_at DESC,rowid ASC`,
    )
    .all();
  const vs = db()
    .prepare("SELECT * FROM variants")
    .all()
    .map((r) => ({ ...r })) as unknown as Variant[];
  const links = db().prepare("SELECT * FROM product_collections").all() as {
    product_id: string;
    collection_id: string;
  }[];
  return rows.map((r) => ({
    ...r,
    images: JSON.parse(r.images as string),
    variants: vs.filter((v) => v.product_id === r.id),
    collections: links
      .filter((l) => l.product_id === r.id)
      .map((l) => l.collection_id),
  })) as Product[];
}
export function getProduct(slug: string, includePrivate = false) {
  return products(includePrivate).find((p) => p.slug === slug || p.id === slug);
}
export const defaultSettings: Settings = {
  brand: brand.name,
  contactEmail: brand.email,
  announcement: "A new point of view. Discover the collection.",
  heroTitle: "Wear it|your way.",
  heroText: "Everyday pieces. A little more you.",
  heroImage: "/images/gallery-1.jpg",
  shippingRate: 25000,
  freeShippingThreshold: 500000,
  regions: [
    "Sindh",
    "Punjab",
    "Islamabad",
    "Khyber Pakhtunkhwa",
    "Balochistan",
    "Gilgit-Baltistan",
    "Azad Kashmir",
  ],
  returns:
    "Demo policy: returns and exchanges are not yet offered. The store owner must approve eligibility, timelines and contact details before launch.",
  shippingPolicy:
    "Demo shipping: Rs. 250, free from Rs. 5,000. These are configurable examples. No courier or delivery estimate is connected.",
  privacy:
    "This local demo stores account, cart, order and contact data on this machine. No payment card information is collected. The owner must supply a production privacy notice before launch.",
  nav: [
    { label: "New arrivals", href: "/collections/new-arrivals" },
    { label: "T-shirts", href: "/collections/tshirts" },
    { label: "Denim", href: "/collections/denim" },
    { label: "Shirts", href: "/collections/shirts" },
    { label: "The edit", href: "/pages/about" },
  ],
  homeTabs: ["tshirts", "denim", "shirts"],
  homeOrder: ["arrivals", "editorial"],
  themeInk: "#111111",
  notifications: true,
};
export function settings(): Settings {
  const r = db().prepare("SELECT value FROM settings WHERE id=1").get();
  const value: Settings = r
    ? { ...defaultSettings, ...JSON.parse(r.value as string) }
    : defaultSettings;
  // Upgrade the original template without replacing the owner's catalog or policies.
  const legacyBrand = value.brand === "FORME";
  if (legacyBrand) value.brand = brand.name;
  if (legacyBrand || !value.contactEmail) value.contactEmail = brand.email;
  if (
    legacyBrand &&
    value.heroText === "Everyday pieces. A different perspective."
  )
    value.heroText = defaultSettings.heroText;
  if (
    legacyBrand &&
    ["/images/hero.jpg", "/images/product-1.jpg"].includes(value.heroImage)
  )
    value.heroImage = defaultSettings.heroImage;
  return value;
}
export function orders(): Order[] {
  return db()
    .prepare("SELECT * FROM orders ORDER BY created_at DESC")
    .all()
    .map((r) => ({
      ...r,
      customer: JSON.parse(r.customer as string),
      items: JSON.parse(r.items as string),
    })) as Order[];
}
export function isDemo() {
  return (
    process.env.DEMO_MODE === "true" || process.env.SEED_ON_BOOT === "true"
  );
}
