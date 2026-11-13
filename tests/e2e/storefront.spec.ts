import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("Knit & Kin branding, public links and canonical sitemap", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Knit & Kin/);
  await expect(
    page.getByRole("link", { name: "Knit & Kin home" }),
  ).toBeVisible();
  await expect(
    page.locator('a[href="mailto:knitandkin1@gmail.com"]'),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Knit & Kin on Instagram" }),
  ).toHaveAttribute("href", "https://www.instagram.com/knitandkinofficial/");
  await expect(
    page.getByRole("link", { name: "Knit & Kin on Facebook" }),
  ).toHaveAttribute(
    "href",
    "https://web.facebook.com/profile.php?id=61596132126275",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /^https:\/\/knitandkin\.com\/?$/,
  );
  const schema = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent())!,
  );
  expect(schema[0].name).toBe("Knit & Kin");
  expect(schema[0].sameAs).toHaveLength(2);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain(
    "https://knitandkin.com/products/sunshine-graphic-tee",
  );
  expect(await sitemap.text()).not.toMatch(/\/(admin|account|checkout|cart)</);
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain(
    "Sitemap: https://knitandkin.com/sitemap.xml",
  );
  const og = await request.get("/opengraph-image");
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toContain("image/png");
});

test("header remains visible and reachable at every responsive width", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const width of [320, 360, 390, 600, 768, 900, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 1200));
    const header = await page.locator(".site-header").boundingBox();
    expect(header!.y).toBe(0);
    await expect(
      page.getByRole("button", { name: "Search", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "My account", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("dialog", { name: "Explore", exact: true })
    .locator("summary")
    .filter({ hasText: "Winter" })
    .click();
  await page
    .getByRole("dialog", { name: "Explore", exact: true })
    .getByRole("link", { name: "Shop all winter", exact: true })
    .click();
  await expect(page).toHaveURL(/\/collections\/winter$/);
  await expect(
    page.getByRole("heading", { name: "Winter", exact: true }),
  ).toBeVisible();
});

test("homepage quick add, stock limits, persistence and removal", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("body")).toHaveAttribute(
    "data-store-ready",
    "true",
  );
  await page
    .getByRole("button", {
      name: "Add Sunshine Graphic Tee to cart — choose size",
      exact: true,
    })
    .click();
  const quick = page.getByRole("dialog", {
    name: "Sunshine Graphic Tee",
    exact: true,
  });
  await expect(
    quick.getByRole("button", { name: "Add to cart", exact: true }),
  ).toBeDisabled();
  await expect(
    quick.getByRole("button", { name: "7–8 Y", exact: true }),
  ).toBeDisabled();
  await quick.getByRole("button", { name: "3–4 Y", exact: true }).click();
  await quick.getByRole("button", { name: "Add to cart", exact: true }).click();
  let cart = page.getByRole("dialog", { name: "Your cart (1)", exact: true });
  await expect(cart).toBeVisible();
  await expect(
    cart.getByRole("link", { name: "Continue to checkout" }),
  ).toHaveAttribute("aria-disabled", "false");
  await cart.getByRole("button", { name: "Increase quantity" }).click();
  cart = page.getByRole("dialog", { name: "Your cart (2)", exact: true });
  await expect(cart).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("button", { name: "Shopping cart, 2 items" }).click();
  await expect(
    page.getByRole("dialog", { name: "Your cart (2)" }),
  ).toContainText("Rs. 2,900");
  await page
    .getByRole("button", { name: "Remove Sunshine Graphic Tee" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Your cart (0)" }),
  ).toContainText("Your cart is currently empty.");
});

test("carousel arrow, keyboard, drag and reduced motion controls", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("button", { name: /slideshow/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Next collection" }).click();
  await expect(page.locator("h1")).toHaveText("Hello sunshine. Let’s play.");
  await page.getByRole("button", { name: "Previous collection" }).click();
  await expect(page.locator("h1")).toHaveText(
    "Little outfits. Big adventures.",
  );
  await page.locator(".hero-photo").focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("h1")).toHaveText("Little layers. Cosy days.");
  const box = (await page.locator(".hero-photo").boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.7, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.3, box.y + 100, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator("h1")).toHaveText(
    "Little outfits. Big adventures.",
  );
  expect(
    await page
      .locator(".hero-track")
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const play = page.getByRole("button", { name: "Play slideshow" });
  await expect(play).toBeVisible();
  await play.click();
  await expect(
    page.getByRole("button", { name: "Pause slideshow" }),
  ).toBeVisible();
});

test("search returns relevant products and mobile cart is accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByLabel("Search products", { exact: true }).fill("romper");
  await page.getByRole("button", { name: "Submit search" }).click();
  await expect(page).toHaveURL(/search\?q=romper/);
  await expect(page.locator(".product-card").first()).toBeVisible();
  await page.getByRole("button", { name: "Shopping cart, 0 items" }).click();
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
  expect(errors).toEqual([]);
});
