import { loadEnvFile } from "node:process";
loadEnvFile(".env.local");
import { randomUUID } from "node:crypto";
import { db, defaultSettings, transaction, isDemo } from "../src/lib/db";
import { passwordHash } from "../src/lib/security";
if (!isDemo()) throw new Error("Demo seed requires DEMO_MODE=true");
const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;
if (!email || !password || password.length < 12)
  throw new Error(
    "Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (12+ characters).",
  );
if (db().prepare("SELECT COUNT(*) n FROM products").get()!.n)
  throw new Error(
    "Database already has products. Seed only an empty database.",
  );
transaction(() => {
  db()
    .prepare("INSERT INTO settings(id,value) VALUES(1,?)")
    .run(
      JSON.stringify({
        ...defaultSettings,
        heroImage: "/images/product-1.jpg",
      }),
    );
  for (const [i, [id, title, image, description]] of (
    [
      [
        "new-arrivals",
        "New arrivals",
        "/images/hero.jpg",
        "Fresh perspectives. Everyday favourites.",
      ],
      [
        "tshirts",
        "T-shirts",
        "/images/category-tees.jpg",
        "Easy shapes, washed textures and a little personality.",
      ],
      [
        "denim",
        "Denim",
        "/images/category-denim.jpg",
        "Your everyday rotation starts here.",
      ],
      [
        "shirts",
        "Shirts",
        "/images/category-shirts.jpg",
        "Considered details. Effortless layers.",
      ],
    ] as string[][]
  ).entries())
    db()
      .prepare(
        "INSERT INTO collections(id,slug,title,image,description,position) VALUES(?,?,?,?,?,?)",
      )
      .run(id, id, title, image, description, i);
  const names = [
    "Washed Print Knit Tee",
    "Waffle-Knit Henley",
    "Washed Graphic Tee",
    "Interlock Essential Tee",
    "Slub Textured Raglan",
    "Varsity Print Tee",
    "Reverse Print Knit Tee",
    "Ecru Graphic Tee",
    "Anthracite Print Tee",
    "Brutally Soft Tee",
    "Athletic Embroidered Tee",
    "Washed Interlock Tee",
    "Double-Sleeve Tee",
    "Washed Grey Graphic Tee",
    "Knit Basic Essential",
    "Washed Statement Tee",
    "White Essential Tee",
    "Black Essential Tee",
  ];
  const colors = [
    "Ink Blue",
    "Black",
    "Washed Olive",
    "Mocha",
    "Anthracite Grey",
    "Black",
    "Stone Taupe",
    "Ecru",
    "Dark Anthracite",
    "Dark Anthracite",
    "Dark Blue",
    "Dark Anthracite",
    "Taupe & White",
    "Washed Grey",
    "Slate Grey",
    "Dark Anthracite",
    "White",
    "Black",
  ];
  const all = [
    ...names.map((name, i) => ({
      name,
      color: colors[i],
      image: `/images/product-${i + 1}.jpg`,
      collection: "tshirts",
      price: i === 3 ? 180000 : i === 4 ? 185000 : 189900,
      compare: 249000,
    })),
    ...[
      "Khaki Baggy Jeans",
      "Blue Baggy Jeans",
      "Relaxed Denim Jeans",
      "Straight Fit Jeans",
    ].map((name, i) => ({
      name,
      color: ["Khaki", "Denim Blue", "Denim Blue", "Arctic White"][i],
      image: `/images/denim-${i + 1}.jpg`,
      collection: "denim",
      price: 382000,
      compare: 0,
    })),
    ...[
      "Relaxed Everyday Shirt",
      "Textured Overshirt",
      "The Weekend Shirt",
      "Easy Layer Shirt",
    ].map((name, i) => ({
      name,
      color: ["Neutral", "Light Blue", "White", "Sand"][i],
      image: `/images/shirt-${i + 1}.jpg`,
      collection: "shirts",
      price: 289000,
      compare: 349000,
    })),
  ];
  for (const [i, p] of all.entries()) {
    const id = "product-" + (i + 1);
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const images =
      i === 0
        ? [p.image, ...[1, 2, 3, 4, 5].map((n) => `/images/gallery-${n}.jpg`)]
        : [p.image];
    db()
      .prepare(
        "INSERT INTO products(id,slug,title,description,price,compare_price,status,images,primary_collection,size_guide) VALUES(?,?,?,?,?,?,'published',?,?,?)",
      )
      .run(
        id,
        slug,
        p.name,
        "An easy-going silhouette with room to make it your own. Pair it with your everyday favourites. Demo product information; confirm fabric composition and care instructions with the store owner before launch.",
        p.price,
        p.compare,
        JSON.stringify(images),
        p.collection,
        "Demo measurements (inches): S — chest 42, length 27; M — chest 44, length 28; L — chest 46, length 29; XL — chest 48, length 30. Owner must verify before launch.",
      );
    for (const col of [p.collection, "new-arrivals"])
      db().prepare("INSERT INTO product_collections VALUES(?,?)").run(id, col);
    for (const [j, size] of ["S", "M", "L", "XL"].entries())
      db()
        .prepare("INSERT INTO variants VALUES(?,?,?,?,?,?)")
        .run(
          `v-${i + 1}-${size}`,
          id,
          `FM-${String(i + 1).padStart(3, "0")}-${size}`,
          size,
          p.color,
          i === 10 || (j === 3 && i % 5 === 0) ? 0 : 12 + j * 3,
        );
  }
  db()
    .prepare(
      "INSERT INTO users(id,email,name,password_hash,role) VALUES(?,?,?,?,'owner')",
    )
    .run(
      randomUUID(),
      email.toLowerCase(),
      "Store owner",
      passwordHash(password),
    );
  if (process.env.SEED_STAFF_PASSWORD)
    db()
      .prepare(
        "INSERT INTO users(id,email,name,password_hash,role) VALUES(?,?,?,?,'staff')",
      )
      .run(
        randomUUID(),
        "staff@forme.local",
        "Store staff",
        passwordHash(process.env.SEED_STAFF_PASSWORD),
      );
  db()
    .prepare(
      "INSERT INTO discounts(code,percent,expires_at,minimum,limit_uses) VALUES(?,?,?,?,?)",
    )
    .run("HELLO10", 10, "2027-12-31T23:59:59Z", 200000, 100);
});
console.log(
  "Demo catalog, settings and admin account seeded. No real integrations enabled.",
);
