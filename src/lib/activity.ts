import { db, serverlessHost, settings } from "./db";
import { hash, HttpError } from "./security";

export const presenceTtl = 90_000;
export function activityEnabled() {
  // Ephemeral Netlify/Lambda SQLite instances cannot give a store-wide count.
  // Keep widgets hidden there until a shared persistent source is connected.
  return !serverlessHost() && settings().activityWidgets;
}
export function recordProductView(
  productId: string,
  sessionId: string,
  tabId: string,
  active: boolean,
  now = Date.now(),
) {
  const d = db();
  if (
    !d
      .prepare("SELECT id FROM products WHERE id=? AND status='published'")
      .get(productId)
  )
    throw new HttpError(404, "Product not found.");
  d.prepare("DELETE FROM product_presence WHERE last_seen<=?").run(
    now - presenceTtl,
  );
  const sessionHash = hash(sessionId);
  if (active)
    d.prepare(
      `INSERT INTO product_presence VALUES(?,?,?,?)
    ON CONFLICT(product_id,session_hash,tab_id) DO UPDATE SET last_seen=excluded.last_seen`,
    ).run(productId, sessionHash, tabId, now);
  else
    d.prepare(
      "DELETE FROM product_presence WHERE product_id=? AND session_hash=? AND tab_id=?",
    ).run(productId, sessionHash, tabId);
  return Number(
    d
      .prepare(
        "SELECT COUNT(DISTINCT session_hash) AS n FROM product_presence WHERE product_id=? AND last_seen>?",
      )
      .get(productId, now - presenceTtl)!.n,
  );
}

export type RecentOrder = {
  title: string;
  slug: string;
  image: string;
  orderedAt: string;
};
export function latestPublicPurchase(now = Date.now()): RecentOrder | null {
  // Select only public product fields, never a customer's name, address,
  // identity, order number, or private tracking link. Test/failed/refunded orders
  // and unpublished products must never create social proof.
  const row = db()
    .prepare(
      `SELECT p.title,p.slug,json_extract(p.images,'$[0]') AS image,
      strftime('%Y-%m-%dT%H:%M:%SZ',o.created_at) AS orderedAt
    FROM orders o JOIN json_each(o.items) item
      JOIN products p ON p.id=json_extract(item.value,'$.productId')
    WHERE o.sandbox=0 AND o.payment_status='paid' AND o.fulfilment_status!='cancelled'
      AND p.status='published' AND julianday(o.created_at)>julianday(?)
      AND julianday(o.created_at)<=julianday(?)
    ORDER BY julianday(o.created_at) DESC,o.rowid DESC LIMIT 1`,
    )
    .get(
      new Date(now - 7 * 86400000).toISOString(),
      new Date(now).toISOString(),
    );
  return row
    ? {
        title: String(row.title),
        slug: String(row.slug),
        image: String(row.image || ""),
        orderedAt: String(row.orderedAt),
      }
    : null;
}
