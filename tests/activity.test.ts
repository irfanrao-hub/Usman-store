import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const directory = mkdtempSync(join(tmpdir(), "knitkin-activity-"));
process.env.DATABASE_PATH = join(directory, "test.sqlite");
process.env.DEMO_MODE = "true";
process.env.SEED_ON_BOOT = "false";
import { db, defaultSettings } from "../src/lib/db";
import {
  recordProductView,
  latestPublicPurchase,
  presenceTtl,
  activityEnabled,
} from "../src/lib/activity";
before(() => {
  db()
    .prepare("INSERT INTO settings VALUES(1,?,1)")
    .run(JSON.stringify(defaultSettings));
  db()
    .prepare(
      `INSERT INTO products(id,slug,title,description,price,status,images) VALUES
    ('p','public-tee','Public tee','An example',145000,'published','["/images/kids-sunshine-tee.webp"]'),
    ('private','private-tee','Private tee','An example',145000,'draft','[]')`,
    )
    .run();
});
after(() => {
  db().close();
  rmSync(directory, { recursive: true, force: true });
});

test("presence deduplicates tabs, expires stale visits and removes only the closing tab", () => {
  const time = Date.now();
  assert.equal(recordProductView("p", "visitor-a", "tab-a", true, time), 1);
  assert.equal(recordProductView("p", "visitor-a", "tab-b", true, time), 1);
  assert.equal(recordProductView("p", "visitor-b", "tab-c", true, time), 2);
  assert.equal(recordProductView("p", "visitor-a", "tab-a", false, time), 2);
  assert.equal(recordProductView("p", "visitor-a", "tab-b", false, time), 1);
  assert.equal(
    recordProductView("p", "visitor-c", "tab-d", true, time + presenceTtl + 1),
    1,
  );
  assert.throws(
    () => recordProductView("private", "visitor-a", "tab-a", true, time),
    /Product not found/,
  );
  assert.throws(
    () => recordProductView("missing", "visitor-a", "tab-a", true, time),
    /Product not found/,
  );
  const stored = db()
    .prepare("SELECT session_hash FROM product_presence")
    .get()!;
  assert.notEqual(stored.session_hash, "visitor-c");
});

test("last order exposes product fields only and excludes sandbox, failed, cancelled, old and private orders", () => {
  const now = Date.now();
  const insert = (
    id: string,
    sandbox: number,
    payment: string,
    fulfilment: string,
    product: string,
    date: string,
  ) =>
    db()
      .prepare(
        `INSERT INTO orders
    (id,session_id,idempotency_key,fingerprint,tracking_hash,customer,items,subtotal,discount,shipping,total,payment_status,fulfilment_status,sandbox,created_at)
    VALUES(?,?,?,?,?,?,?,?,0,0,?,?,?,?,?)`,
      )
      .run(
        id,
        "private-session",
        id,
        "private-fingerprint",
        "private-tracking",
        JSON.stringify({
          name: "Private customer",
          email: "private@example.test",
          city: "Private city",
        }),
        JSON.stringify([{ productId: product, title: "Historic name" }]),
        145000,
        145000,
        payment,
        fulfilment,
        sandbox,
        date,
      );
  const recent = new Date(now - 60_000).toISOString();
  for (const row of [
    ["sandbox", 1, "paid", "unfulfilled", "p"],
    ["test-paid", 1, "sandbox_paid", "unfulfilled", "p"],
    ["failed", 0, "failed", "unfulfilled", "p"],
    ["cancelled", 0, "paid", "cancelled", "p"],
    ["private", 0, "paid", "unfulfilled", "private"],
  ] as const)
    insert(row[0], row[1], row[2], row[3], row[4], recent);
  insert(
    "old",
    0,
    "paid",
    "unfulfilled",
    "p",
    new Date(now - 8 * 86400000).toISOString(),
  );
  assert.equal(latestPublicPurchase(now), null);
  insert("real", 0, "paid", "unfulfilled", "p", recent);
  const result = latestPublicPurchase(now)!;
  assert.equal(result.title, "Public tee");
  assert.deepEqual(Object.keys(result).sort(), [
    "image",
    "orderedAt",
    "slug",
    "title",
  ]);
  assert.ok(!JSON.stringify(result).includes("Private"));
  db().prepare("UPDATE products SET status='archived' WHERE id='p'").run();
  assert.equal(latestPublicPurchase(now), null);
});

test("activity is disabled on ephemeral serverless hosts and when turned off", () => {
  const prior = process.env.NETLIFY;
  process.env.NETLIFY = "true";
  assert.equal(activityEnabled(), false);
  if (prior === undefined) delete process.env.NETLIFY;
  else process.env.NETLIFY = prior;
  db()
    .prepare("UPDATE settings SET value=? WHERE id=1")
    .run(JSON.stringify({ ...defaultSettings, activityWidgets: false }));
  assert.equal(activityEnabled(), false);
});
