import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { defaultSettings } from "../src/lib/db";
import { upgradeLegacyDemo } from "../src/lib/kidswear-demo";

function legacyDatabase() {
  const d = new DatabaseSync(":memory:");
  d.exec(readFileSync("migrations/001_initial.sql", "utf8"));
  d.prepare("INSERT INTO settings VALUES(1,?,1)").run(
    JSON.stringify({
      ...defaultSettings,
      brand: "FORME",
      shippingPolicy: "Owner shipping policy",
      shippingRate: 35000,
    }),
  );
  for (const slug of ["new-arrivals", "tshirts", "denim", "shirts"])
    d.prepare("INSERT INTO collections(id,slug,title) VALUES(?,?,?)").run(
      slug,
      slug,
      slug,
    );
  for (let i = 1; i <= 26; i++)
    d.prepare(
      "INSERT INTO products(id,slug,title,description,price,status,images,primary_collection) VALUES(?,?,?,?,1,'published',?,'tshirts')",
    ).run(
      `product-${i}`,
      `original-${i}`,
      `Original ${i}`,
      "Demo product information; confirm before launch.",
      JSON.stringify([`/images/product-${i}.jpg`]),
    );
  d.prepare(
    "INSERT INTO variants VALUES('old-variant','product-1','OLD-SKU','M','Blue',7)",
  ).run();
  return d;
}

test("kidswear upgrade archives template products, preserves variants and owner policies, and is idempotent", () => {
  const d = legacyDatabase();
  try {
    upgradeLegacyDemo(d, defaultSettings);
    assert.equal(
      d
        .prepare("SELECT count(*) n FROM products WHERE status='published'")
        .get()!.n,
      8,
    );
    assert.equal(
      d
        .prepare("SELECT count(*) n FROM products WHERE status='archived'")
        .get()!.n,
      26,
    );
    assert.equal(
      d.prepare("SELECT stock FROM variants WHERE id='old-variant'").get()!
        .stock,
      7,
    );
    assert.equal(
      d.prepare("SELECT slug FROM collections WHERE id='denim'").get()!.slug,
      "sweatshirts",
    );
    assert.equal(
      d
        .prepare(
          "SELECT new_path FROM redirects WHERE old_path='/collections/denim'",
        )
        .get()!.new_path,
      "/collections/sweatshirts",
    );
    const settings = JSON.parse(
      String(d.prepare("SELECT value FROM settings").get()!.value),
    );
    assert.equal(settings.shippingPolicy, "Owner shipping policy");
    assert.equal(settings.shippingRate, 35000);
    assert.deepEqual(settings.homeTabs, ["summer", "winter"]);
    const version = d.prepare("SELECT version FROM settings").get()!.version;
    upgradeLegacyDemo(d, defaultSettings);
    assert.equal(d.prepare("SELECT count(*) n FROM products").get()!.n, 34);
    assert.equal(
      d.prepare("SELECT version FROM settings").get()!.version,
      version,
    );
  } finally {
    d.close();
  }
});

test("a custom catalogue is never automatically replaced with demo products", () => {
  const d = legacyDatabase();
  try {
    d.prepare(
      "UPDATE products SET description='Owner supplied product information' WHERE id='product-1'",
    ).run();
    upgradeLegacyDemo(d, defaultSettings);
    assert.equal(
      d
        .prepare("SELECT count(*) n FROM products WHERE status='published'")
        .get()!.n,
      26,
    );
    assert.equal(
      d
        .prepare("SELECT count(*) n FROM products WHERE id LIKE 'kids-demo-%'")
        .get()!.n,
      0,
    );
  } finally {
    d.close();
  }
});
