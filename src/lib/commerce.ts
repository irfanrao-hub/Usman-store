import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { db, settings, isDemo, transaction, audit, orders } from "./db";
import { hash, HttpError, siteUrl } from "./security";
import type { CartItem, Quote, Line, Order } from "./types";
export const cartSchema = z
  .array(
    z.object({
      variantId: z.string().min(1).max(100),
      quantity: z.number().int().min(1).max(20),
    }),
  )
  .min(1)
  .max(50);
export const checkoutSchema = z.object({
  items: cartSchema,
  discountCode: z.string().max(40).default(""),
  expectedTotal: z.number().int().nonnegative(),
  idempotencyKey: z.string().uuid(),
  customer: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.email().max(200),
    phone: z.string().regex(/^[+\d\s()-]{7,20}$/),
    address: z.string().trim().min(8).max(300),
    city: z.string().trim().min(2).max(100),
    region: z.string().min(1).max(100),
  }),
  outcome: z.enum(["success", "failed", "cancelled", "delayed"]),
});
export function quote(raw: CartItem[], code = "", region?: string): Quote {
  const input = cartSchema.parse(raw);
  const merged = new Map<string, number>();
  input.forEach((i) =>
    merged.set(i.variantId, (merged.get(i.variantId) || 0) + i.quantity),
  );
  const items: Line[] = [];
  for (const [id, quantity] of merged) {
    if (quantity > 20)
      throw new HttpError(400, "Maximum quantity is 20 per variant.");
    const row = db()
      .prepare(
        "SELECT v.*,p.title,p.slug,p.price,p.images,p.status FROM variants v JOIN products p ON p.id=v.product_id WHERE v.id=?",
      )
      .get(id);
    if (!row || row.status !== "published")
      throw new HttpError(
        409,
        "An item is no longer available. Remove it from your bag.",
      );
    if (Number(row.stock) < quantity)
      throw new HttpError(
        409,
        `${row.title} (${row.size}) has only ${row.stock} available.`,
      );
    items.push({
      variantId: id,
      productId: String(row.product_id),
      title: String(row.title),
      slug: String(row.slug),
      sku: String(row.sku),
      size: String(row.size),
      color: String(row.color),
      image: JSON.parse(String(row.images))[0] || "/images/fallback.svg",
      price: Number(row.price),
      quantity,
      stock: Number(row.stock),
    });
  }
  const config = settings();
  if (region && !config.regions.includes(region))
    throw new HttpError(400, "Delivery is not available in this region.");
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  let discount = 0;
  const discountCode = code.trim().toUpperCase();
  if (discountCode) {
    const d = db()
      .prepare("SELECT * FROM discounts WHERE code=?")
      .get(discountCode);
    if (
      !d ||
      !d.active ||
      Date.parse(String(d.expires_at)) <= Date.now() ||
      Number(d.uses) >= Number(d.limit_uses)
    )
      throw new HttpError(400, "This discount code is invalid or expired.");
    if (subtotal < Number(d.minimum))
      throw new HttpError(
        400,
        "The order does not meet this discount’s minimum spend.",
      );
    discount = Math.floor((subtotal * Number(d.percent)) / 100);
  }
  const shipping =
    subtotal - discount >= config.freeShippingThreshold
      ? 0
      : config.shippingRate;
  return {
    items,
    subtotal,
    discount,
    shipping,
    total: subtotal - discount + shipping,
    discountCode,
  };
}
function restore(order: Order) {
  if (order.stock_restored) return;
  for (const l of order.items) {
    db()
      .prepare("UPDATE variants SET stock=stock+? WHERE id=?")
      .run(l.quantity, l.variantId);
    db()
      .prepare("UPDATE products SET version=version+1 WHERE id=?")
      .run(l.productId);
  }
  if (order.discount_code)
    db()
      .prepare("UPDATE discounts SET uses=MAX(uses-1,0) WHERE code=?")
      .run(order.discount_code);
  db().prepare("UPDATE orders SET stock_restored=1 WHERE id=?").run(order.id);
}
export function expireReservations() {
  transaction(() => {
    for (const o of orders().filter(
      (o) =>
        o.payment_status === "pending" && (o.reserved_until || 0) < Date.now(),
    )) {
      restore(o);
      db()
        .prepare(
          "UPDATE orders SET payment_status='expired',fulfilment_status='cancelled' WHERE id=?",
        )
        .run(o.id);
      audit("system", "reservation.expired", o.id);
    }
  });
}
export function createOrder(
  input: z.infer<typeof checkoutSchema>,
  sid: string,
  userId?: string,
) {
  if (!isDemo())
    throw new HttpError(
      503,
      "Live checkout is not configured. No order or payment was created.",
    );
  expireReservations();
  const data = checkoutSchema.parse(input);
  const fingerprint = hash(
    JSON.stringify({
      items: data.items,
      customer: data.customer,
      discountCode: data.discountCode,
      outcome: data.outcome,
      expectedTotal: data.expectedTotal,
    }),
  );
  return transaction(() => {
    const existing = orders().find(
      (o) => o.session_id === sid && o.idempotency_key === data.idempotencyKey,
    );
    if (existing) {
      if (existing.fingerprint !== fingerprint)
        throw new HttpError(
          409,
          "This checkout attempt was already used. Start a new attempt.",
        );
      return { order: existing, trackingToken: null, replayed: true };
    }
    const q = quote(data.items, data.discountCode, data.customer.region);
    if (q.total !== data.expectedTotal)
      throw new HttpError(
        409,
        "Prices have changed. Review the refreshed total before trying again.",
      );
    for (const l of q.items) {
      const r = db()
        .prepare("UPDATE variants SET stock=stock-? WHERE id=? AND stock>=?")
        .run(l.quantity, l.variantId, l.quantity);
      if (Number(r.changes) !== 1)
        throw new HttpError(409, "Stock changed. Please review your bag.");
      db()
        .prepare("UPDATE products SET version=version+1 WHERE id=?")
        .run(l.productId);
    }
    if (q.discountCode)
      db()
        .prepare("UPDATE discounts SET uses=uses+1 WHERE code=?")
        .run(q.discountCode);
    const id = "FM-" + randomBytes(5).toString("hex").toUpperCase();
    const token = randomBytes(32).toString("base64url");
    const payment =
      data.outcome === "success"
        ? "sandbox_paid"
        : data.outcome === "delayed"
          ? "pending"
          : data.outcome;
    db()
      .prepare(
        "INSERT INTO orders(id,session_id,user_id,idempotency_key,fingerprint,tracking_hash,customer,items,subtotal,discount,shipping,total,discount_code,payment_status,sandbox,reserved_until) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)",
      )
      .run(
        id,
        sid,
        userId || null,
        data.idempotencyKey,
        fingerprint,
        hash(token),
        JSON.stringify(data.customer),
        JSON.stringify(q.items),
        q.subtotal,
        q.discount,
        q.shipping,
        q.total,
        q.discountCode,
        payment,
        payment === "pending" ? Date.now() + 15 * 60 * 1000 : null,
      );
    let order = orders().find((o) => o.id === id)!;
    if (["failed", "cancelled"].includes(payment)) {
      restore(order);
      db()
        .prepare("UPDATE orders SET fulfilment_status='cancelled' WHERE id=?")
        .run(id);
      order = orders().find((o) => o.id === id)!;
    }
    audit(userId || sid, "order.created", id, { payment, sandbox: true });
    if (settings().notifications)
      db()
        .prepare(
          "INSERT INTO outbox(id,recipient,subject,body) VALUES(?,?,?,?)",
        )
        .run(
          randomUUID(),
          data.customer.email,
          `Sandbox order ${id}`,
          `No real payment was taken. Track locally: ${siteUrl()}/orders/${id}?token=${token}`,
        );
    return { order, trackingToken: token, replayed: false };
  });
}
export function updateOrder(id: string, action: string, actor: string) {
  return transaction(() => {
    const o = orders().find((x) => x.id === id);
    if (!o) throw new HttpError(404, "Order not found.");
    if (action === "cancel") {
      if (o.fulfilment_status === "shipped")
        throw new HttpError(409, "Shipped orders cannot be cancelled.");
      restore(o);
      db()
        .prepare(
          "UPDATE orders SET fulfilment_status='cancelled',payment_status=CASE WHEN payment_status='sandbox_paid' THEN 'sandbox_refunded' ELSE 'cancelled' END WHERE id=?",
        )
        .run(id);
    } else if (action === "ship") {
      if (
        o.payment_status !== "sandbox_paid" ||
        o.fulfilment_status === "cancelled"
      )
        throw new HttpError(409, "Only paid, active orders can be fulfilled.");
      db()
        .prepare("UPDATE orders SET fulfilment_status='shipped' WHERE id=?")
        .run(id);
    } else if (action === "settle") {
      if (!isDemo() || !o.sandbox)
        throw new HttpError(403, "Sandbox action is unavailable.");
      if (o.payment_status === "sandbox_paid") return o;
      if (
        o.payment_status !== "pending" ||
        (o.reserved_until || 0) < Date.now()
      )
        throw new HttpError(409, "This reservation cannot be settled.");
      db()
        .prepare(
          "UPDATE orders SET payment_status='sandbox_paid',reserved_until=NULL WHERE id=?",
        )
        .run(id);
    } else throw new HttpError(400, "Unsupported order action.");
    audit(actor, `order.${action}`, id);
    return orders().find((x) => x.id === id)!;
  });
}
export function publicOrder(o: Order) {
  const {
    id,
    customer,
    items,
    subtotal,
    discount,
    shipping,
    total,
    payment_status,
    fulfilment_status,
    sandbox,
    reserved_until,
    created_at,
  } = o;
  return {
    id,
    customer,
    items,
    subtotal,
    discount,
    shipping,
    total,
    payment_status,
    fulfilment_status,
    sandbox,
    reserved_until,
    created_at,
  };
}
