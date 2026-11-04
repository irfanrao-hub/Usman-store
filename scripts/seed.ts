import { loadEnvFile } from "node:process";
loadEnvFile(".env.local");
import { isDemo } from "../src/lib/db";
import { seedDemoContent } from "../src/lib/demo-catalog";
if (!isDemo()) throw new Error("Demo seed requires DEMO_MODE=true");
const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;
if (!email || !password || password.length < 12)
  throw new Error(
    "Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (12+ characters).",
  );
if (
  !seedDemoContent({
    email,
    password,
    staffPassword: process.env.SEED_STAFF_PASSWORD,
  })
)
  throw new Error(
    "Database already has products. Seed only an empty database.",
  );
console.log(
  "Demo catalog, settings and admin account seeded. No real integrations enabled.",
);
