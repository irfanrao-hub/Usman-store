import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";

test("last-order notice opens its product and can be dismissed", async ({
  page,
}) => {
  // Public activity fixture stays inside this browser test, never in the store DB.
  await page.route("**/api/activity/recent", (route) =>
    route.fulfill({
      json: {
        recent: {
          title: "Sunshine Graphic Tee",
          slug: "sunshine-graphic-tee",
          image: "/images/kids-sunshine-tee.webp",
          orderedAt: "2026-11-13T10:00:00Z",
        },
      },
    }),
  );
  await page.goto("/");
  const notice = page.getByRole("complementary", { name: "Last order" });
  await expect(notice).toContainText("Sunshine Graphic Tee");
  await expect(notice.locator("time")).toContainText("PKT");
  await notice.getByRole("link").click();
  await expect(page).toHaveURL(/\/products\/sunshine-graphic-tee/);
  await page.goto("/");
  await page.getByRole("button", { name: "Dismiss last order" }).click();
  await expect(notice).not.toBeVisible();
});

test("Summer and Winter navigation leads to the correct clothing classes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await nav.locator("summary").filter({ hasText: "Summer" }).click();
  await nav.getByRole("link", { name: "Co-ord sets", exact: true }).click();
  await expect(page).toHaveURL(/collections\/summer\?category=co-ord-sets/);
  await expect(page.locator(".product-title")).toHaveText(["Meadow Play Set"]);
  await page.reload();
  await expect(
    page.locator(".category-filter a[aria-current=page]"),
  ).toHaveText("Co-ord sets");
  await page.getByRole("link", { name: "View Meadow Play Set" }).click();
  await expect(page.locator(".back-link")).toHaveAttribute(
    "href",
    "/collections/summer?category=co-ord-sets",
  );
  await page.locator(".back-link").click();
  await expect(page.locator(".product-title")).toHaveText(["Meadow Play Set"]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  const menu = page.getByRole("dialog", { name: "Explore", exact: true });
  await menu.locator("summary").filter({ hasText: "Winter" }).click();
  await menu.getByRole("link", { name: "Co-ord sets", exact: true }).click();
  await expect(page.locator(".product-title")).toHaveText(["Cosy Day Set"]);
  await expect(menu).not.toBeVisible();
  await page.goto("/collections/winter?category=dresses");
  await expect(
    page.getByRole("heading", { name: "No pieces found." }),
  ).toBeVisible();
});

test("category tiles, seasonal tabs and FAQ support mobile and keyboard use", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".category-circles a")).toHaveCount(6);
  await page.getByRole("tab", { name: "Winter", exact: true }).click();
  await expect(page.locator(".product-title")).toHaveText([
    "Lilac Days Sweatshirt",
    "Little Explorer Hoodie",
    "Peach Quilted Jacket",
    "Cosy Day Set",
  ]);
  await page.keyboard.press("ArrowLeft");
  await expect(
    page.getByRole("tab", { name: "Summer", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page
    .locator(".category-circles")
    .getByRole("link", { name: "Rompers" })
    .click();
  await expect(page.locator(".product-title")).toHaveText([
    "Little Cloud Romper",
  ]);
  await page.goto("/");
  const faq = page.locator(".faq-list");
  const size = faq.locator("summary").filter({ hasText: "How do I choose" });
  await size.focus();
  await page.keyboard.press("Enter");
  await expect(faq.locator("details[open]")).toHaveCount(1);
  await expect(faq.locator("details[open]")).toContainText(
    "Age labels are a starting point",
  );
  await page.keyboard.press("Enter");
  await expect(faq.locator("details[open]")).toHaveCount(0);
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
});

test("people viewing comes from sessions, not random numbers; test orders stay private", async ({
  browser,
  request,
}) => {
  const origin = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
  const headers = { Origin: origin, "X-Forme-Request": "1" };
  const recent = await request.get("/api/activity/recent");
  expect(await recent.json()).toEqual({ recent: null });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(origin + "/products/little-cloud-romper");
  await expect(page.locator(".product-activity")).toContainText(
    "1 person is viewing this preview",
  );
  const secondTab = await context.newPage();
  await secondTab.goto(origin + "/products/little-cloud-romper");
  await expect(secondTab.locator(".product-activity")).toContainText(
    "1 person is viewing this preview",
  );
  const data = {
    productId: "kids-demo-little-cloud-romper",
    tabId: randomUUID(),
    active: true,
  };
  expect((await request.post("/api/activity/view", { data })).status()).toBe(
    403,
  );
  const result = await request.post("/api/activity/view", { headers, data });
  expect((await result.json()).viewers).toBe(2);
  const leave = await request.post("/api/activity/view", {
    headers,
    data: { ...data, active: false },
  });
  expect((await leave.json()).viewers).toBe(1);
  expect(
    (
      await request.post("/api/activity/view", {
        headers,
        data: { ...data, productId: "does-not-exist" },
      })
    ).status(),
  ).toBe(404);
  await context.close();
});
