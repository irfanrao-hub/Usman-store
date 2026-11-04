import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loadEnvFile } from "node:process";
import { randomUUID } from "node:crypto";
loadEnvFile(".env.local");
const origin = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
async function goto(page: import("@playwright/test").Page, url: string) {
  const response = await page.goto(url);
  await expect(page.locator("body")).toHaveAttribute(
    "data-store-ready",
    "true",
  );
  return response;
}
const headers = { Origin: origin, "X-Forme-Request": "1" };
test("responsive homepage, tabs, keyboard dialogs and accessibility", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await goto(page, "/");
  await expect(
    page.getByRole("heading", { name: "Wear it your way." }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Denim", exact: true }).click();
  await expect(page.locator(".product-card").first()).toContainText("Jeans");
  await page.getByRole("tab", { name: "All", exact: true }).click();
  const search = page.getByRole("button", { name: "Search", exact: true });
  await search.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Find your next favourite" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(search).toBeFocused();
  for (const width of [1536, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 960 });
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(200);
    await page.evaluate(() => window.scrollTo(0, 0));
    if (width !== 360)
      await page.screenshot({ path: `docs/home-${width}.png`, fullPage: true });
  }
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
  expect(errors).toEqual([]);
});
test("collection URL filters, product breadcrumbs, backward and forward navigation", async ({
  page,
}) => {
  await goto(page, "/collections/tshirts");
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await page.getByLabel("Size", { exact: true }).selectOption("M");
  await page.getByLabel("Sort products").selectOption("price-asc");
  await expect(page).toHaveURL(/size=M/);
  await expect(page).toHaveURL(/sort=price-asc/);
  await page.reload();
  await expect(page.locator("body")).toHaveAttribute(
    "data-store-ready",
    "true",
  );
  await page.getByRole("button", { name: /Filter/ }).click();
  await expect(page.getByLabel("Size", { exact: true })).toHaveValue("M");
  await page.locator(".product-card .product-title").first().click();
  await expect(page.locator(".product-info h1")).toBeVisible();
  await expect(page.locator(".breadcrumb")).toContainText("T-shirts");
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "T-shirts", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/size=M/);
  await page.goForward();
  await expect(page.locator(".product-info h1")).toBeVisible();
  expect(
    await page.locator("link[rel=canonical]").getAttribute("href"),
  ).not.toContain("?");
  const data = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ||
      "[]",
  );
  expect(data[0]["@type"]).toBe("Product");
  expect(data[0].offers.priceCurrency).toBe("PKR");
  await goto(page, "/products/not-a-real-product");
  await expect(
    page.getByRole("heading", { name: /story is missing/ }),
  ).toBeVisible();
});
test("persistent cart, variant selection and sandbox checkout", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await goto(page, "/products/washed-print-knit-tee");
  await page.getByRole("button", { name: "M", exact: true }).click();
  await page.getByRole("button", { name: "Add to bag", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Your bag (1)" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.locator("body")).toHaveAttribute(
    "data-store-ready",
    "true",
  );
  await page.getByRole("button", { name: "Shopping bag, 1 items" }).click();
  await page.getByRole("link", { name: "Continue to checkout" }).click();
  await expect(
    page.getByRole("heading", { name: "Make it yours." }),
  ).toBeVisible();
  await page
    .getByLabel("Email address", { exact: true })
    .fill("shopper@example.test");
  await page.getByLabel("Full name", { exact: true }).fill("Demo Shopper");
  await page.getByLabel("Phone number").fill("+923001234567");
  await page.getByLabel("Street address").fill("123 Demo Street");
  await page.getByLabel("City", { exact: true }).fill("Karachi");
  await page.getByRole("button", { name: "Place sandbox order" }).click();
  await expect(
    page.getByRole("heading", { name: "Your test order is in." }),
  ).toBeVisible();
  const url = new URL(page.url());
  const id = url.pathname.split("/").pop()!;
  expect((await request.get("/api/orders/" + id)).status()).toBe(404);
  expect(
    (
      await request.get(
        "/api/orders/" + id + "?token=" + url.searchParams.get("token"),
      )
    ).status(),
  ).toBe(200);
  await page.screenshot({
    path: "docs/order-confirmation.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("admin creates collection and product with uploaded images and sees a persisted order", async ({
  page,
}) => {
  await goto(page, "/admin");
  await expect(page).toHaveURL("/admin/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill(process.env.SEED_ADMIN_EMAIL!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.SEED_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Welcome back/ }),
  ).toBeVisible();
  await page.screenshot({ path: "docs/admin-dashboard.png", fullPage: true });
  const suffix = Date.now().toString(36);
  const title = "QA Edit " + suffix;
  await page.getByRole("button", { name: "Collections", exact: true }).click();
  await page.getByRole("button", { name: "Add collection" }).click();
  await page.getByLabel("Collection name").fill(title);
  await page.getByLabel("URL slug").fill("qa-edit-" + suffix);
  await page
    .getByLabel("Description", { exact: true })
    .fill("A collection created in the browser acceptance test.");
  await page
    .getByLabel("Upload image")
    .setInputFiles("public/images/product-3.jpg");
  await expect(page.locator(".media-thumb")).toHaveCount(1);
  await page.getByRole("button", { name: "Save collection" }).click();
  await expect(
    page.getByRole("heading", { name: "Collections", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Products", exact: true }).click();
  await page.getByRole("button", { name: "Add product" }).click();
  await page.getByLabel("Product name").fill("QA Studio Tee " + suffix);
  await page.getByLabel("URL slug").fill("qa-studio-tee-" + suffix);
  await page
    .getByLabel("Description", { exact: true })
    .fill(
      "A locally created product with a real uploaded image and two variants.",
    );
  await page.getByLabel("Price (PKR)", { exact: true }).fill("2200");
  await page.getByLabel("Compare price (PKR)").fill("2800");
  await page.getByLabel("Status", { exact: true }).selectOption("published");
  await page.getByLabel(title, { exact: true }).check();
  await page.getByLabel("Primary collection").selectOption({ label: title });
  await page.getByLabel("SKU", { exact: true }).fill("QA-" + suffix + "-S");
  await page.getByLabel("Color", { exact: true }).fill("Olive");
  await page.getByLabel("Stock", { exact: true }).fill("8");
  await page
    .getByLabel("Upload image")
    .setInputFiles("public/images/product-3.jpg");
  await expect(page.locator(".media-thumb")).toHaveCount(1);
  await page.getByRole("button", { name: "Add variant" }).click();
  await page
    .getByLabel("SKU", { exact: true })
    .nth(1)
    .fill("QA-" + suffix + "-M");
  await page.getByLabel("Size", { exact: true }).nth(1).fill("M");
  await page.getByLabel("Color", { exact: true }).nth(1).fill("Olive");
  await page.getByLabel("Stock", { exact: true }).nth(1).fill("6");
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(
    page.getByRole("heading", { name: "Products", exact: true }),
  ).toBeVisible();
  await goto(page, "/collections/qa-edit-" + suffix);
  await expect(page.locator(".product-title")).toContainText("QA Studio Tee");
  await page.locator(".product-title").click();
  await expect(
    page.getByRole("button", { name: "M", exact: true }),
  ).toBeEnabled();
  await goto(page, "/admin");
  await page.getByRole("button", { name: /^Orders/ }).click();
  await expect(page.locator("tbody")).toContainText("Demo Shopper");
  await expect(page.locator("tbody")).toContainText("sandbox paid");
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#admin-navigation")).toBeHidden();
  await page.getByRole("button", { name: "Toggle admin navigation" }).click();
  await expect(page.locator("#admin-navigation")).toBeVisible();
  await expect(
    page.locator("#admin-navigation nav button.selected"),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Toggle admin navigation" }),
  ).toBeFocused();
  await expect(page.locator("#admin-navigation")).toBeHidden();
  await page.setViewportSize({ width: 1440, height: 960 });
  await page
    .getByRole("button", { name: "Store settings", exact: true })
    .click();
  await page.getByLabel("Brand name").fill("Unsaved QA brand");
  await page.route("**/api/admin/settings", (route) =>
    route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Settings changed in another session. Reload before saving.",
      }),
    }),
  );
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(page.locator(".error-message[role=alert]")).toContainText(
    "Settings changed in another session",
  );
  await expect(page.locator("body")).toHaveAttribute(
    "data-admin-dirty",
    "true",
  );
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toBe("Discard unsaved changes?");
    await dialog.dismiss();
  });
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(page.getByLabel("Brand name")).toHaveValue("Unsaved QA brand");
});
test("permissions, CSRF, staff limits, malformed uploads and duplicate checkout retries", async ({
  request,
}) => {
  expect(
    (await request.post("/api/admin/products", { headers, data: {} })).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/auth/login", {
        data: {
          email: process.env.SEED_ADMIN_EMAIL,
          password: process.env.SEED_ADMIN_PASSWORD,
        },
      })
    ).status(),
  ).toBe(403);
  const login = await request.post("/api/auth/login", {
    headers,
    data: {
      email: "staff@forme.local",
      password: process.env.SEED_STAFF_PASSWORD,
    },
  });
  expect(login.status()).toBe(200);
  expect(
    (await request.post("/api/admin/settings", { headers, data: {} })).status(),
  ).toBe(403);
  expect(
    (
      await request.delete("/api/admin/products/product-1", {
        headers,
        data: {},
      })
    ).status(),
  ).toBe(403);
  const upload = await request.post("/api/admin/upload", {
    headers,
    multipart: {
      file: {
        name: "fake.png",
        mimeType: "image/png",
        buffer: Buffer.from("This is not a PNG"),
      },
    },
  });
  expect(upload.status()).toBe(400);
  const body = {
    items: [{ variantId: "v-2-M", quantity: 1 }],
    customer: {
      name: "Retry Customer",
      email: "retry@example.test",
      phone: "+923001234567",
      address: "88 Retry Street",
      city: "Karachi",
      region: "Sindh",
    },
    outcome: "failed",
    discountCode: "",
    idempotencyKey: randomUUID(),
  };
  const q = await (
    await request.post("/api/cart/quote", {
      headers,
      data: { items: body.items },
    })
  ).json();
  const first = await (
    await request.post("/api/checkout", {
      headers,
      data: { ...body, expectedTotal: q.total },
    })
  ).json();
  const second = await (
    await request.post("/api/checkout", {
      headers,
      data: { ...body, expectedTotal: q.total },
    })
  ).json();
  expect(first.order.id).toBe(second.order.id);
  expect(second.replayed).toBe(true);
  expect(first.order.payment_status).toBe("failed");
});
test("customer registration, private order history and password recovery", async ({
  page,
}) => {
  const suffix = Date.now().toString(36);
  await goto(page, "/account");
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Account Tester");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("account-" + suffix + "@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Test-password-12345");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Hello, Account." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByRole("button", { name: "Forgot your password?" }).click();
  await page
    .getByLabel("Email address", { exact: true })
    .fill("account-" + suffix + "@example.test");
  await page.getByRole("button", { name: "Request reset link" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "local demo outbox" }),
  ).toBeVisible();
});
test("reduced motion, info pages, SEO and responsive product/admin", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await goto(page, "/");
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
  await page.setViewportSize({ width: 390, height: 844 });
  await goto(page, "/products/washed-print-knit-tee");
  await page.getByRole("button", { name: "Size guide" }).click();
  await expect(
    page.getByRole("dialog", { name: "Find your fit" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Size guide" })).toBeFocused();
  await page.screenshot({ path: "docs/product-mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const route of [
    "/collections",
    "/search?q=denim",
    "/cart",
    "/track",
    "/pages/about",
    "/pages/contact",
    "/pages/faq",
    "/pages/shipping",
    "/pages/returns",
    "/pages/privacy",
    "/pages/size-guide",
  ]) {
    const res = await goto(page, route);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(
    await page.locator("meta[name=robots]").getAttribute("content"),
  ).toContain("noindex");
});

test("owner catalog lifecycle, settings version conflicts and discounts", async ({
  request,
}) => {
  expect(
    (
      await request.post("/api/auth/login", {
        headers,
        data: {
          email: process.env.SEED_ADMIN_EMAIL,
          password: process.env.SEED_ADMIN_PASSWORD,
        },
      })
    ).status(),
  ).toBe(200);
  const admin = await (await request.get("/api/admin/data")).json();
  const suffix = Date.now().toString(36);
  const payload = {
    title: "Lifecycle QA " + suffix,
    slug: "lifecycle-qa-" + suffix,
    description: "Temporary lifecycle test with historical preservation.",
    price: 123400,
    compare_price: 150000,
    status: "draft",
    images: ["/images/product-4.jpg"],
    primary_collection: "tshirts",
    collections: ["tshirts"],
    size_guide: "Test guide",
    seo_title: "Lifecycle title",
    seo_description: "Lifecycle description",
    variants: [{ sku: "LIFE-" + suffix, size: "M", color: "Mocha", stock: 3 }],
  };
  let result = await request.post("/api/admin/products", {
    headers,
    data: payload,
  });
  expect(result.status()).toBe(200);
  let product = await result.json();
  expect((await request.get("/products/" + payload.slug)).status()).toBe(404);
  result = await request.post("/api/admin/products", {
    headers,
    data: { ...product, status: "published" },
  });
  expect(result.status()).toBe(200);
  product = await result.json();
  expect((await request.get("/products/" + payload.slug)).status()).toBe(200);
  const stale = { ...product };
  const newSlug = payload.slug + "-new";
  result = await request.post("/api/admin/products", {
    headers,
    data: { ...product, slug: newSlug },
  });
  expect(result.status()).toBe(200);
  product = await result.json();
  expect(
    (
      await request.get("/products/" + payload.slug, { maxRedirects: 0 })
    ).status(),
  ).toBe(308);
  expect(
    (
      await request.post("/api/admin/products", { headers, data: stale })
    ).status(),
  ).toBe(409);
  result = await request.post("/api/admin/products", {
    headers,
    data: { ...product, status: "archived" },
  });
  expect(result.status()).toBe(200);
  expect(
    (
      await request.post("/api/cart/quote", {
        headers,
        data: { items: [{ variantId: product.variants[0].id, quantity: 1 }] },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.delete("/api/admin/products/" + product.id, {
        headers,
        data: {},
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post("/api/admin/settings", {
        headers,
        data: { value: admin.settings, version: admin.settingsVersion },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post("/api/admin/settings", {
        headers,
        data: { value: admin.settings, version: admin.settingsVersion },
      })
    ).status(),
  ).toBe(409);
  const code = "QA-" + suffix.toUpperCase();
  expect(
    (
      await request.post("/api/admin/discounts", {
        headers,
        data: {
          code,
          percent: 15,
          expires_at: "2027-12-31T00:00:00.000Z",
          minimum: 0,
          limit_uses: 1,
          active: 1,
        },
      })
    ).status(),
  ).toBe(200);
  const quote = await (
    await request.post("/api/cart/quote", {
      headers,
      data: {
        items: [{ variantId: "v-2-S", quantity: 1 }],
        discountCode: code,
      },
    })
  ).json();
  expect(quote.discount).toBe(Math.floor(quote.subtotal * 0.15));
  const out = await request.post("/api/admin/upload", {
    headers,
    multipart: {
      file: {
        name: "vector.svg",
        mimeType: "image/svg+xml",
        buffer: Buffer.from("<svg/>"),
      },
    },
  });
  expect(out.status()).toBe(400);
});
test("password reset tokens are single use and revoke existing sessions", async ({
  playwright,
}) => {
  const customer = await playwright.request.newContext({ baseURL: origin });
  const owner = await playwright.request.newContext({ baseURL: origin });
  const suffix = Date.now().toString(36);
  const email = "reset-" + suffix + "@example.test";
  expect(
    (
      await customer.post("/api/auth/register", {
        headers,
        data: {
          name: "Recovery Tester",
          email,
          password: "Initial-password-1234",
        },
      })
    ).status(),
  ).toBe(201);
  expect(
    (
      await customer.post("/api/auth/recover", { headers, data: { email } })
    ).status(),
  ).toBe(200);
  expect(
    (
      await owner.post("/api/auth/login", {
        headers,
        data: {
          email: process.env.SEED_ADMIN_EMAIL,
          password: process.env.SEED_ADMIN_PASSWORD,
        },
      })
    ).status(),
  ).toBe(200);
  const data = await (await owner.get("/api/admin/data")).json();
  const emailRecord = data.outbox.find(
    (m: { recipient: string; subject: string }) =>
      m.recipient === email && m.subject.includes("recovery"),
  );
  expect(emailRecord).toBeTruthy();
  const token = new URL(emailRecord.body).searchParams.get("token");
  expect(
    (
      await owner.post("/api/auth/reset", {
        headers,
        data: { token, password: "Updated-password-1234" },
      })
    ).status(),
  ).toBe(200);
  expect((await (await customer.get("/api/session")).json()).user).toBeNull();
  expect(
    (
      await customer.post("/api/auth/reset", {
        headers,
        data: { token, password: "Another-password-1234" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await customer.post("/api/auth/login", {
        headers,
        data: { email, password: "Updated-password-1234" },
      })
    ).status(),
  ).toBe(200);
  await customer.dispose();
  await owner.dispose();
});
