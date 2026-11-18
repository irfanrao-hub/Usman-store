import { test, expect } from "@playwright/test";
import { loadEnvFile } from "node:process";
import { randomUUID } from "node:crypto";

loadEnvFile(".env.local");
const origin = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
const headers = { Origin: origin, "X-Forme-Request": "1" };

// Browser plugin not available. Validate with the project's Playwright/Chrome setup.
// Flow: checkout -> saved order with an unsent email -> owner sees setup and retry state.
test("order confirmation and owner outbox show honest email status on desktop and mobile", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const items = [{ variantId: "kids-v-2-2", quantity: 1 }];
  const quote = await page.request.post("/api/cart/quote", {
    headers,
    data: { items },
  });
  expect(quote.status()).toBe(200);
  const input = {
    items,
    expectedTotal: (await quote.json()).total,
    discountCode: "",
    idempotencyKey: randomUUID(),
    outcome: "success",
    customer: {
      name: "Email QA",
      email: "email-qa@example.test",
      phone: "03001234567",
      address: "42 Test Street",
      city: "Karachi",
      region: "Sindh",
    },
  };
  const checkout = await page.request.post("/api/checkout", {
    headers,
    data: input,
  });
  expect(checkout.status()).toBe(201);
  const result = await checkout.json();
  expect(result.order.email_status).toBe("queued");
  const replay = await page.request.post("/api/checkout", {
    headers,
    data: input,
  });
  expect(replay.status()).toBe(200);
  expect((await replay.json()).order.id).toBe(result.order.id);
  await page.goto(`/orders/${result.order.id}?token=${result.trackingToken}`);
  await expect(page).toHaveTitle(/Knit & Kin/);
  await expect(
    page.getByRole("heading", { name: "Your test order is in." }),
  ).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 950 });
    await expect(
      page.getByText("Your confirmation email has not been sent.", {
        exact: false,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/tmp/knitkin-email-order-${width}.png`,
      fullPage: true,
    });
  }
  expect(
    (
      await page.request.post("/api/admin/email/test", { headers, data: {} })
    ).status(),
  ).toBe(401);
  const login = await page.request.post("/api/auth/login", {
    headers,
    data: {
      email: process.env.SEED_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD,
    },
  });
  expect(login.status()).toBe(200);
  const admin = await (await page.request.get("/api/admin/data")).json();
  expect(admin.email.configured).toBe(false);
  expect(admin.email).not.toHaveProperty("SMTP_PASS");
  expect(
    admin.outbox.filter((m: { subject: string }) =>
      m.subject.includes(result.order.id),
    ),
  ).toHaveLength(1);
  expect(
    (
      await page.request.post("/api/admin/email/test", { headers, data: {} })
    ).status(),
  ).toBe(503);
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto("/admin");
  await page
    .getByRole("button", { name: "Inbox & outbox", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Email connection", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send connection test", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Status: queued", { exact: true }).first(),
  ).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 950 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/tmp/knitkin-email-admin-${width}.png`,
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});

test("staff cannot send connection tests or retry order emails", async ({
  request,
}) => {
  const login = await request.post("/api/auth/login", {
    headers,
    data: {
      email: "staff@forme.local",
      password: process.env.SEED_STAFF_PASSWORD,
    },
  });
  expect(login.status()).toBe(200);
  for (const path of ["test", "retry"]) {
    expect(
      (
        await request.post(`/api/admin/email/${path}`, {
          headers,
          data: { id: randomUUID() },
        })
      ).status(),
    ).toBe(403);
  }
});
