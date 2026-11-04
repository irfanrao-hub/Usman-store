import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
const dir = mkdtempSync(join(tmpdir(), "forme-test-"));
process.env.DATABASE_PATH = join(dir, "test.sqlite");
process.env.DEMO_MODE = "true";
process.env.SESSION_SECRET = "test-only-session-secret-32-characters-long";
import { db, defaultSettings, orders, products } from "../src/lib/db";
import {
  quote,
  createOrder,
  updateOrder,
  expireReservations,
} from "../src/lib/commerce";
import { saveProduct, deleteEntity } from "../src/lib/admin";
import {
  passwordHash,
  passwordMatches,
  sameOrigin,
  rateLimit,
} from "../src/lib/security";
const customer = {
  name: "Test Customer",
  email: "test@example.test",
  phone: "+923001234567",
  address: "42 Test Street",
  city: "Karachi",
  region: "Sindh",
};
const input = (
  outcome: "success" | "failed" | "cancelled" | "delayed" = "success",
) => ({
  items: [{ variantId: "v1", quantity: 1 }],
  discountCode: "",
  expectedTotal: quote([{ variantId: "v1", quantity: 1 }]).total,
  idempotencyKey: randomUUID(),
  customer,
  outcome,
});
before(() => {
  db()
    .prepare("INSERT INTO settings(id,value) VALUES(1,?)")
    .run(JSON.stringify(defaultSettings));
  db()
    .prepare(
      "INSERT INTO collections(id,slug,title) VALUES('c1','test','Test')",
    )
    .run();
  db()
    .prepare(
      "INSERT INTO products(id,slug,title,description,price,compare_price,status,images,primary_collection) VALUES('p1','test-tee','Test tee','A test product for integration checks',189901,249000,'published','[\"/images/product-1.jpg\"]','c1')",
    )
    .run();
  db()
    .prepare(
      "INSERT INTO variants VALUES('v1','p1','TEST-M','M','Ink Blue',30)",
    )
    .run();
  db().prepare("INSERT INTO product_collections VALUES('p1','c1')").run();
  db()
    .prepare(
      "INSERT INTO discounts(code,percent,expires_at,minimum,limit_uses) VALUES('TEST10',10,'2099-01-01T00:00:00Z',0,100),('EXPIRED',10,'2020-01-01T00:00:00Z',0,100)",
    )
    .run();
});
after(() => {
  db().close();
  rmSync(dir, { recursive: true, force: true });
});
test("integer pricing, duplicate variant merge, discount rounding and shipping threshold", () => {
  const q = quote(
    [
      { variantId: "v1", quantity: 1 },
      { variantId: "v1", quantity: 2 },
    ],
    "TEST10",
  );
  assert.equal(q.items.length, 1);
  assert.equal(q.items[0].quantity, 3);
  assert.equal(q.subtotal, 569703);
  assert.equal(q.discount, 56970);
  assert.equal(q.shipping, 0);
  assert.equal(q.total, 512733);
});
test("invalid quantities, stock, unavailable variants and region are rejected", () => {
  for (const quantity of [0, -1, 1.5, 21, 100])
    assert.throws(() => quote([{ variantId: "v1", quantity }]));
  assert.throws(() => quote([{ variantId: "missing", quantity: 1 }]));
  assert.throws(() =>
    quote([
      { variantId: "v1", quantity: 20 },
      { variantId: "v1", quantity: 20 },
    ]),
  );
  assert.throws(() =>
    quote([{ variantId: "v1", quantity: 1 }], "", "Unsupported"),
  );
});
test("expired and unknown discount codes are rejected", () => {
  assert.throws(() => quote([{ variantId: "v1", quantity: 1 }], "EXPIRED"));
  assert.throws(() => quote([{ variantId: "v1", quantity: 1 }], "BOGUS"));
});
test("server prices ignore client tampering; changed price requires explicit total review", () => {
  const d = input();
  d.expectedTotal = 1;
  const before = Number(
    db().prepare("SELECT stock FROM variants WHERE id='v1'").get()!.stock,
  );
  assert.throws(() => createOrder(d, "guest1"));
  assert.equal(
    Number(
      db().prepare("SELECT stock FROM variants WHERE id='v1'").get()!.stock,
    ),
    before,
  );
});
test("order creation persists and retry decrements inventory exactly once", () => {
  const d = input();
  const stock = Number(
    db().prepare("SELECT stock FROM variants WHERE id='v1'").get()!.stock,
  );
  const first = createOrder(d, "guest1");
  const second = createOrder(d, "guest1");
  assert.equal(first.order.id, second.order.id);
  assert.equal(second.replayed, true);
  assert.equal(orders().filter((o) => o.id === first.order.id).length, 1);
  assert.equal(
    Number(
      db().prepare("SELECT stock FROM variants WHERE id='v1'").get()!.stock,
    ),
    stock - 1,
  );
  assert.throws(() =>
    createOrder(
      { ...d, customer: { ...customer, name: "Changed Customer" } },
      "guest1",
    ),
  );
});
test("failed and cancelled payments restore stock and never become paid", () => {
  for (const outcome of ["failed", "cancelled"] as const) {
    const stock = Number(
      db().prepare("SELECT stock FROM variants WHERE id='v1'").get()!.stock,
    );
    const o = createOrder(input(outcome), "guest2").order;
    assert.equal(o.payment_status, outcome);
    assert.equal(o.stock_restored, 1);
    assert.equal(
      Number(
        db().prepare("SELECT stock FROM variants WHERE id='v1'").get()!.stock,
      ),
      stock,
    );
  }
});
test("pending reservation expiry releases inventory once and cannot settle late", () => {
  const stock = Number(
    db().prepare("SELECT stock FROM variants WHERE id='v1'").get()!.stock,
  );
  const o = createOrder(input("delayed"), "guest3").order;
  db()
    .prepare("UPDATE orders SET reserved_until=? WHERE id=?")
    .run(Date.now() - 1, o.id);
  expireReservations();
  expireReservations();
  assert.equal(
    Number(
      db().prepare("SELECT stock FROM variants WHERE id='v1'").get()!.stock,
    ),
    stock,
  );
  assert.equal(orders().find((x) => x.id === o.id)!.payment_status, "expired");
  assert.throws(() => updateOrder(o.id, "settle", "owner"));
});
test("sandbox settlement is idempotent, cancellation restores inventory once", () => {
  const stock = Number(
    db().prepare("SELECT stock FROM variants WHERE id='v1'").get()!.stock,
  );
  const o = createOrder(input("delayed"), "guest4").order;
  updateOrder(o.id, "settle", "owner");
  updateOrder(o.id, "settle", "owner");
  assert.equal(
    orders().find((x) => x.id === o.id)!.payment_status,
    "sandbox_paid",
  );
  updateOrder(o.id, "cancel", "owner");
  updateOrder(o.id, "cancel", "owner");
  assert.equal(
    Number(
      db().prepare("SELECT stock FROM variants WHERE id='v1'").get()!.stock,
    ),
    stock,
  );
});
test("archived products and insufficient stock cannot check out", () => {
  db().prepare("UPDATE products SET status='archived' WHERE id='p1'").run();
  assert.throws(() => quote([{ variantId: "v1", quantity: 1 }]));
  db().prepare("UPDATE products SET status='published' WHERE id='p1'").run();
  const stock = Number(
    db().prepare("SELECT stock FROM variants WHERE id='v1'").get()!.stock,
  );
  db().prepare("UPDATE variants SET stock=0 WHERE id='v1'").run();
  assert.throws(() => quote([{ variantId: "v1", quantity: 1 }]));
  db().prepare("UPDATE variants SET stock=? WHERE id='v1'").run(stock);
});
test("optimistic catalog updates reject concurrent checkout inventory changes", () => {
  const p = products(true)[0];
  const o = createOrder(input(), "guest5").order;
  assert.throws(
    () => saveProduct({ ...p, primary_collection: "c1" }, "owner"),
    /changed/,
  );
  assert.throws(() => deleteEntity("products", "p1", "owner"), /open order/);
  updateOrder(o.id, "cancel", "owner");
});
test("production checkout fails closed without creating orders", () => {
  const count = orders().length;
  process.env.DEMO_MODE = "false";
  assert.throws(() => createOrder(input(), "guest6"), /not configured/);
  assert.equal(orders().length, count);
  process.env.DEMO_MODE = "true";
});
test("passwords are salted and verified, cross-origin requests rejected", () => {
  const a = passwordHash("a-long-test-password");
  const b = passwordHash("a-long-test-password");
  assert.notEqual(a, b);
  assert.ok(passwordMatches("a-long-test-password", a));
  assert.equal(passwordMatches("wrong", a), false);
  assert.throws(() =>
    sameOrigin(
      new Request("http://127.0.0.1:3100/api/admin/products", {
        method: "POST",
        headers: { Origin: "https://evil.example", "X-Forme-Request": "1" },
      }),
    ),
  );
  assert.throws(() =>
    sameOrigin(
      new Request("http://127.0.0.1:3100/api/admin/products", {
        method: "POST",
      }),
    ),
  );
});
test("rate limiting is persisted and enforced", () => {
  rateLimit("test-limit", 2);
  rateLimit("test-limit", 2);
  assert.throws(() => rateLimit("test-limit", 2), /Too many/);
});
