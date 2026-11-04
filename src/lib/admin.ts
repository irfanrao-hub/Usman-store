import { z } from "zod";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { db, transaction, audit, products, collections, orders } from "./db";
import { HttpError } from "./security";
const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(100);
const media = z
  .string()
  .max(150)
  .refine(
    (v) => /^\/(images\/[a-zA-Z0-9._-]+|api\/media\/[a-f0-9-]+\.webp)$/.test(v),
    "Select a locally uploaded image.",
  )
  .refine(
    (v) =>
      existsSync(
        resolve(
          v.startsWith("/images/")
            ? "public" + v
            : "data/media/" + v.split("/").pop(),
        ),
      ),
    "Image does not exist.",
  );
export const productSchema = z.object({
  id: z.string().optional(),
  version: z.number().int().optional(),
  title: z.string().trim().min(2).max(150),
  slug,
  description: z.string().trim().min(10).max(10000),
  price: z.number().int().min(0).max(100000000),
  compare_price: z.number().int().min(0).max(100000000),
  status: z.enum(["draft", "published", "archived"]),
  images: z.array(media).min(1).max(12),
  primary_collection: z.string().min(1),
  collections: z.array(z.string()).min(1).max(30),
  size_guide: z.string().max(5000),
  seo_title: z.string().max(150),
  seo_description: z.string().max(320),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        sku: z.string().trim().min(2).max(80),
        size: z.string().trim().min(1).max(30),
        color: z.string().trim().min(1).max(50),
        stock: z.number().int().min(0).max(100000),
      }),
    )
    .min(1)
    .max(80),
});
export function saveProduct(raw: unknown, actor: string) {
  const p = productSchema.parse(raw);
  if (p.compare_price && p.compare_price < p.price)
    throw new HttpError(400, "Compare price must be above the selling price.");
  if (!p.collections.includes(p.primary_collection))
    throw new HttpError(400, "Primary collection must be selected.");
  if (p.collections.some((id) => !collections().some((c) => c.id === id)))
    throw new HttpError(400, "A selected collection no longer exists.");
  return transaction(() => {
    const old = p.id ? products(true).find((x) => x.id === p.id) : undefined;
    if (p.id && !old) throw new HttpError(404, "Product not found.");
    if (old && old.version !== p.version)
      throw new HttpError(
        409,
        "This product or its stock changed. Reload before saving.",
      );
    const id = old?.id || randomUUID();
    if (old) {
      const removed = old.variants.filter(
        (v) => !p.variants.some((n) => n.id === v.id),
      );
      if (
        removed.some((v) =>
          orders().some(
            (o) =>
              !o.stock_restored &&
              o.fulfilment_status !== "shipped" &&
              o.items.some((l) => l.variantId === v.id),
          ),
        )
      )
        throw new HttpError(
          409,
          "A removed variant belongs to an open order. Fulfil or cancel it first.",
        );
      db()
        .prepare(
          "UPDATE products SET slug=?,title=?,description=?,price=?,compare_price=?,status=?,images=?,primary_collection=?,size_guide=?,seo_title=?,seo_description=?,version=version+1 WHERE id=?",
        )
        .run(
          p.slug,
          p.title,
          p.description,
          p.price,
          p.compare_price,
          p.status,
          JSON.stringify(p.images),
          p.primary_collection,
          p.size_guide,
          p.seo_title,
          p.seo_description,
          id,
        );
      if (old.slug !== p.slug)
        db()
          .prepare(
            "INSERT OR REPLACE INTO redirects(old_path,new_path) VALUES(?,?)",
          )
          .run("/products/" + old.slug, "/products/" + p.slug);
      for (const v of removed)
        db().prepare("DELETE FROM variants WHERE id=?").run(v.id);
    } else
      db()
        .prepare(
          "INSERT INTO products(id,slug,title,description,price,compare_price,status,images,primary_collection,size_guide,seo_title,seo_description) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
        )
        .run(
          id,
          p.slug,
          p.title,
          p.description,
          p.price,
          p.compare_price,
          p.status,
          JSON.stringify(p.images),
          p.primary_collection,
          p.size_guide,
          p.seo_title,
          p.seo_description,
        );
    for (const v of p.variants) {
      if (v.id && old?.variants.some((x) => x.id === v.id))
        db()
          .prepare(
            "UPDATE variants SET sku=?,size=?,color=?,stock=? WHERE id=? AND product_id=?",
          )
          .run(v.sku, v.size, v.color, v.stock, v.id, id);
      else
        db()
          .prepare(
            "INSERT INTO variants(id,product_id,sku,size,color,stock) VALUES(?,?,?,?,?,?)",
          )
          .run(randomUUID(), id, v.sku, v.size, v.color, v.stock);
    }
    db().prepare("DELETE FROM product_collections WHERE product_id=?").run(id);
    for (const cid of new Set(p.collections))
      db().prepare("INSERT INTO product_collections VALUES(?,?)").run(id, cid);
    audit(actor, old ? "product.updated" : "product.created", id, {
      title: p.title,
      status: p.status,
    });
    return products(true).find((x) => x.id === id)!;
  });
}
export const collectionSchema = z.object({
  id: z.string().optional(),
  version: z.number().int().optional(),
  title: z.string().trim().min(2).max(100),
  slug,
  description: z.string().max(2000),
  image: media,
  position: z.number().int().min(0).max(1000),
  seo_title: z.string().max(150),
  seo_description: z.string().max(320),
});
export function saveCollection(raw: unknown, actor: string) {
  const c = collectionSchema.parse(raw);
  return transaction(() => {
    const old = collections().find((x) => x.id === c.id);
    if (c.id && !old) throw new HttpError(404, "Collection not found.");
    if (old && old.version !== c.version)
      throw new HttpError(409, "Collection changed. Reload before saving.");
    const id = old?.id || randomUUID();
    if (old) {
      db()
        .prepare(
          "UPDATE collections SET slug=?,title=?,description=?,image=?,position=?,seo_title=?,seo_description=?,version=version+1 WHERE id=?",
        )
        .run(
          c.slug,
          c.title,
          c.description,
          c.image,
          c.position,
          c.seo_title,
          c.seo_description,
          id,
        );
      if (c.slug !== old.slug)
        db()
          .prepare("INSERT OR REPLACE INTO redirects VALUES(?,?)")
          .run("/collections/" + old.slug, "/collections/" + c.slug);
    } else
      db()
        .prepare(
          "INSERT INTO collections(id,slug,title,description,image,position,seo_title,seo_description) VALUES(?,?,?,?,?,?,?,?)",
        )
        .run(
          id,
          c.slug,
          c.title,
          c.description,
          c.image,
          c.position,
          c.seo_title,
          c.seo_description,
        );
    audit(actor, old ? "collection.updated" : "collection.created", id);
    return collections().find((x) => x.id === id);
  });
}
export function deleteEntity(
  kind: "products" | "collections",
  id: string,
  actor: string,
) {
  transaction(() => {
    if (
      kind === "products" &&
      orders().some(
        (o) =>
          !o.stock_restored &&
          o.fulfilment_status !== "shipped" &&
          o.items.some((l) => l.productId === id),
      )
    )
      throw new HttpError(
        409,
        "This product belongs to an open order. Archive it, or resolve the order first.",
      );
    const entity = db().prepare(`SELECT * FROM ${kind} WHERE id=?`).get(id);
    if (!entity) throw new HttpError(404, "Item not found.");
    db().prepare(`DELETE FROM ${kind} WHERE id=?`).run(id);
    audit(actor, kind + ".deleted", id, { title: entity.title });
  });
}
export const settingsSchema = z.object({
  brand: z.string().trim().min(1).max(30),
  contactEmail: z.union([z.email(), z.literal("")]),
  announcement: z.string().max(150),
  heroTitle: z.string().max(80),
  heroText: z.string().max(150),
  heroImage: media,
  shippingRate: z.number().int().min(0).max(10000000),
  freeShippingThreshold: z.number().int().min(0).max(100000000),
  regions: z.array(z.string().min(2).max(100)).min(1).max(30),
  returns: z.string().max(10000),
  shippingPolicy: z.string().max(10000),
  privacy: z.string().max(10000),
  nav: z
    .array(
      z.object({
        label: z.string().min(1).max(30),
        href: z.string().regex(/^\/(collections|pages)\/[a-z0-9-]+$/),
      }),
    )
    .max(6),
  homeTabs: z.array(slug).max(5),
  homeOrder: z
    .array(z.enum(["arrivals", "editorial"]))
    .max(2)
    .refine((v) => new Set(v).size === v.length)
    .default(["arrivals", "editorial"]),
  themeInk: z.enum(["#111111", "#243025", "#202b3c"]).default("#111111"),
  notifications: z.boolean(),
});
