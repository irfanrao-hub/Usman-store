import { randomUUID } from "node:crypto";
import { db, defaultSettings, transaction } from "./db";
import { insertKidsDemo } from "./kidswear-demo";
import { passwordHash } from "./security";

export function seedDemoContent(options?: {
  email?: string;
  password?: string;
  staffPassword?: string;
}) {
  if (db().prepare("SELECT COUNT(*) n FROM products").get()!.n) return false;
  transaction(() => {
    db()
      .prepare("INSERT INTO settings(id,value) VALUES(1,?)")
      .run(
        JSON.stringify({
          ...defaultSettings,
          heroImage: defaultSettings.heroImage,
        }),
      );
    insertKidsDemo(db());
    if (options?.email && options.password && options.password.length >= 12)
      db()
        .prepare(
          "INSERT INTO users(id,email,name,password_hash,role) VALUES(?,?,?,?,'owner')",
        )
        .run(
          randomUUID(),
          options.email.toLowerCase(),
          "Store owner",
          passwordHash(options.password),
        );
    if (options?.staffPassword)
      db()
        .prepare(
          "INSERT INTO users(id,email,name,password_hash,role) VALUES(?,?,?,?,'staff')",
        )
        .run(
          randomUUID(),
          "staff@forme.local",
          "Store staff",
          passwordHash(options.staffPassword),
        );
    db()
      .prepare(
        "INSERT INTO discounts(code,percent,expires_at,minimum,limit_uses) VALUES(?,?,?,?,?)",
      )
      .run("HELLO10", 10, "2027-12-31T23:59:59Z", 200000, 100);
  });
  return true;
}
