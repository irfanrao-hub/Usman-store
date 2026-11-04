import { loadEnvFile } from "node:process";
import { readdir, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { products, collections, settings, orders } from "../src/lib/db";
loadEnvFile(".env.local");
const used = new Set([
  ...products(true).flatMap((p) => p.images),
  ...collections().map((c) => c.image),
  settings().heroImage,
  ...orders().flatMap((o) => o.items.map((i) => i.image)),
]);
let removed = 0;
for (const file of await readdir("data/media").catch(() => [])) {
  if (!/^[a-f0-9-]+\.webp$/.test(file) || used.has("/api/media/" + file))
    continue;
  const path = join("data/media", file);
  const meta = await stat(path);
  if (Date.now() - meta.mtimeMs > 24 * 60 * 60 * 1000) {
    await unlink(path);
    removed++;
  }
}
console.log(`Removed ${removed} unreferenced uploads older than 24 hours.`);
