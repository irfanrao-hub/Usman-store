import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import {
  db,
  products,
  collections,
  settings,
  orders,
  isDemo,
  audit,
  transaction,
} from "@/lib/db";
import {
  session,
  identity,
  requireAdmin,
  sameOrigin,
  rateLimit,
  passwordHash,
  passwordMatches,
  hash,
  HttpError,
} from "@/lib/security";
import {
  quote,
  cartSchema,
  checkoutSchema,
  createOrder,
  publicOrder,
  expireReservations,
  updateOrder,
} from "@/lib/commerce";
import {
  saveProduct,
  saveCollection,
  deleteEntity,
  settingsSchema,
} from "@/lib/admin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    const key = path.join("/");
    const method = req.method;
    if (method !== "GET") sameOrigin(req);
    if (method === "GET" && path[0] === "media") {
      if (!/^[a-f0-9-]+\.webp$/.test(path[1] || ""))
        throw new HttpError(404, "Image not found.");
      try {
        return new NextResponse(
          await readFile(resolve("data/media", path[1])),
          {
            headers: {
              "Content-Type": "image/webp",
              "Cache-Control": "public,max-age=31536000,immutable",
            },
          },
        );
      } catch {
        throw new HttpError(404, "Image not found.");
      }
    }
    const s = await session();
    if (!s.sid) {
      s.sid = randomUUID();
      await s.save();
    }
    if (key === "session" && method === "GET")
      return json({ user: await identity(), demo: isDemo() });
    if (key === "catalog" && method === "GET")
      return json({
        products: products(),
        collections: collections(),
        settings: settings(),
        demo: isDemo(),
      });
    if (key === "auth/logout" && method === "POST") {
      s.destroy();
      return json({ ok: true });
    }
    if (key === "admin/upload" && method === "POST") {
      const u = await requireAdmin();
      rateLimit("upload:" + u.id, 60);
      if (Number(req.headers.get("content-length") || 0) > 9 * 1024 * 1024)
        throw new HttpError(413, "Maximum image size is 8 MB.");
      const form = await req.formData();
      const file = form.get("file");
      if (
        !(file instanceof File) ||
        file.size > 8 * 1024 * 1024 ||
        !["image/jpeg", "image/png", "image/webp"].includes(file.type)
      )
        throw new HttpError(400, "Upload a JPG, PNG or WebP image under 8 MB.");
      const buffer = Buffer.from(await file.arrayBuffer());
      let metadata;
      try {
        metadata = await sharp(buffer, {
          limitInputPixels: 36000000,
        }).metadata();
      } catch {
        throw new HttpError(400, "The file is not a valid image.");
      }
      if (
        !["jpeg", "png", "webp"].includes(metadata.format || "") ||
        !metadata.width ||
        !metadata.height ||
        metadata.width < 300 ||
        metadata.height < 300 ||
        metadata.width > 6000 ||
        metadata.height > 6000
      )
        throw new HttpError(
          400,
          "Image dimensions must be between 300 and 6000 pixels.",
        );
      const name = randomUUID() + ".webp";
      await mkdir("data/media", { recursive: true });
      await writeFile(
        resolve("data/media", name),
        await sharp(buffer)
          .rotate()
          .resize({
            width: 1800,
            height: 2400,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 85 })
          .toBuffer(),
      );
      audit(u.id, "media.uploaded", name);
      return json({ url: "/api/media/" + name });
    }
    if (key.startsWith("admin") && method === "GET") {
      const u = await requireAdmin();
      expireReservations();
      if (key === "admin/data") {
        const base = {
          user: u,
          products: products(true),
          collections: collections(),
          settings: settings(),
          settingsVersion:
            db().prepare("SELECT version FROM settings WHERE id=1").get()
              ?.version || 1,
          orders: orders().map(publicOrder),
          demo: isDemo(),
        };
        return json(
          u.role === "owner"
            ? {
                ...base,
                discounts: db().prepare("SELECT * FROM discounts").all(),
                audit: db()
                  .prepare("SELECT * FROM audit ORDER BY id DESC LIMIT 100")
                  .all(),
                outbox: db()
                  .prepare(
                    "SELECT * FROM outbox ORDER BY created_at DESC LIMIT 50",
                  )
                  .all(),
                messages: db()
                  .prepare(
                    "SELECT * FROM messages ORDER BY created_at DESC LIMIT 50",
                  )
                  .all(),
              }
            : { ...base, discounts: [], audit: [], outbox: [], messages: [] },
        );
      }
    }
    if (key === "orders" && method === "GET") {
      expireReservations();
      const u = await identity();
      return json(
        orders()
          .filter((o) => (u ? o.user_id === u.id : o.session_id === s.sid))
          .map(publicOrder),
      );
    }
    if (path[0] === "orders" && path[1] && method === "GET") {
      expireReservations();
      const u = await identity();
      const o = orders().find((o) => o.id === path[1]);
      const token = req.nextUrl.searchParams.get("token");
      if (
        !o ||
        !(
          o.session_id === s.sid ||
          (u && o.user_id === u.id) ||
          (token && hash(token) === o.tracking_hash)
        )
      )
        throw new HttpError(404, "Order not found or tracking key is invalid.");
      return json(publicOrder(o));
    }
    if (method === "GET") throw new HttpError(404, "Not found.");
    if (Number(req.headers.get("content-length") || 0) > 500000)
      throw new HttpError(413, "Request too large.");
    let body;
    try {
      body = await req.json();
    } catch {
      throw new HttpError(400, "Invalid JSON request.");
    }
    if (key === "auth/login") {
      const v = z
        .object({
          email: z.email().max(200),
          password: z.string().min(1).max(200),
        })
        .parse(body);
      const email = v.email.toLowerCase();
      rateLimit("login:" + email, 12);
      const user = db().prepare("SELECT * FROM users WHERE email=?").get(email);
      const fallback =
        "b2ef44219b3121b7:9e72f4c566ed36a251d599d28c90848971ccbf856354e378a7f3118faab5e5645e2d85ea8ba53974296fba55c681d394ba9adbb22d35b2ad73916711cce5d708";
      if (
        !passwordMatches(v.password, String(user?.password_hash || fallback)) ||
        !user
      )
        throw new HttpError(401, "Email or password is incorrect.");
      s.userId = String(user.id);
      s.version = Number(user.session_version);
      s.expires = Date.now() + 8 * 3600000;
      await s.save();
      return json({ user: await identity() });
    }
    if (key === "auth/register") {
      rateLimit("register-global", 40);
      const v = z
        .object({
          name: z.string().trim().min(2).max(100),
          email: z.email().max(200),
          password: z.string().min(12).max(128),
        })
        .parse(body);
      rateLimit("register:" + v.email.toLowerCase(), 5);
      const id = randomUUID();
      db()
        .prepare(
          "INSERT INTO users(id,email,name,password_hash,role) VALUES(?,?,?,?,'customer')",
        )
        .run(id, v.email.toLowerCase(), v.name, passwordHash(v.password));
      s.userId = id;
      s.version = 1;
      s.expires = Date.now() + 8 * 3600000;
      await s.save();
      return json({ user: await identity() }, 201);
    }
    if (key === "auth/recover") {
      if (!isDemo())
        throw new HttpError(
          503,
          "Recovery email delivery is not configured. Contact the store owner.",
        );
      const v = z.object({ email: z.email().max(200) }).parse(body);
      rateLimit("recovery:" + v.email.toLowerCase(), 3);
      rateLimit("recovery-global", 30);
      const user = db()
        .prepare("SELECT id FROM users WHERE email=?")
        .get(v.email.toLowerCase());
      if (user) {
        const token = randomBytes(32).toString("base64url");
        db()
          .prepare("INSERT INTO recovery_tokens VALUES(?,?,?)")
          .run(hash(token), user.id, Date.now() + 30 * 60000);
        db()
          .prepare("INSERT INTO outbox VALUES(?,?,?,?,CURRENT_TIMESTAMP)")
          .run(
            randomUUID(),
            v.email,
            "Sandbox password recovery",
            `${process.env.SITE_URL}/account/reset?token=${token}`,
          );
      }
      return json({
        message:
          "If an account exists, a recovery link was saved to the owner’s local demo outbox. No email was sent.",
      });
    }
    if (key === "auth/reset") {
      const v = z
        .object({
          token: z.string().min(30).max(100),
          password: z.string().min(12).max(128),
        })
        .parse(body);
      rateLimit("reset-global", 30);
      transaction(() => {
        const token = db()
          .prepare(
            "SELECT * FROM recovery_tokens WHERE hash=? AND expires_at>?",
          )
          .get(hash(v.token), Date.now());
        if (!token)
          throw new HttpError(400, "This recovery link is invalid or expired.");
        db()
          .prepare(
            "UPDATE users SET password_hash=?,session_version=session_version+1 WHERE id=?",
          )
          .run(passwordHash(v.password), token.user_id);
        db()
          .prepare("DELETE FROM recovery_tokens WHERE user_id=?")
          .run(token.user_id);
        audit(String(token.user_id), "password.reset", String(token.user_id));
      });
      s.destroy();
      return json({ ok: true });
    }
    if (key === "cart/quote") {
      expireReservations();
      const v = z
        .object({
          items: cartSchema,
          discountCode: z.string().max(40).optional(),
          region: z.string().optional(),
        })
        .parse(body);
      return json(quote(v.items, v.discountCode, v.region));
    }
    if (key === "checkout") {
      rateLimit("checkout:" + s.sid, 25);
      const u = await identity();
      const result = createOrder(checkoutSchema.parse(body), s.sid, u?.id);
      return json(
        { ...result, order: publicOrder(result.order) },
        result.replayed ? 200 : 201,
      );
    }
    if (key === "newsletter") {
      const v = z.object({ email: z.email().max(200) }).parse(body);
      rateLimit("newsletter:" + s.sid, 5);
      db()
        .prepare("INSERT OR IGNORE INTO subscribers(email) VALUES(?)")
        .run(v.email.toLowerCase());
      return json({
        message: isDemo()
          ? "You’re on the local demo list. No emails will be sent."
          : "You’re on the list.",
      });
    }
    if (key === "contact") {
      const v = z
        .object({
          name: z.string().min(2).max(100),
          email: z.email().max(200),
          message: z.string().min(10).max(5000),
        })
        .parse(body);
      rateLimit("contact:" + s.sid, 5);
      db()
        .prepare("INSERT INTO messages(id,name,email,message) VALUES(?,?,?,?)")
        .run(randomUUID(), v.name, v.email, v.message);
      return json({
        message: "Your message has been saved for the store owner.",
      });
    }
    if (key === "admin/products" && method === "POST") {
      const u = await requireAdmin();
      return json(saveProduct(body, u.id));
    }
    if (key === "admin/collections" && method === "POST") {
      const u = await requireAdmin();
      return json(saveCollection(body, u.id));
    }
    if (
      path[0] === "admin" &&
      ["products", "collections"].includes(path[1]) &&
      path[2] &&
      method === "DELETE"
    ) {
      const u = await requireAdmin(true);
      deleteEntity(path[1] as "products" | "collections", path[2], u.id);
      return json({ ok: true });
    }
    if (key === "admin/settings") {
      const u = await requireAdmin(true);
      const value = settingsSchema.parse(body.value);
      transaction(() => {
        const current = db()
          .prepare("SELECT version FROM settings WHERE id=1")
          .get();
        if (current && current.version !== body.version)
          throw new HttpError(409, "Settings changed. Reload before saving.");
        db()
          .prepare(
            "INSERT INTO settings(id,value,version) VALUES(1,?,1) ON CONFLICT(id) DO UPDATE SET value=excluded.value,version=version+1",
          )
          .run(JSON.stringify(value));
        audit(u.id, "settings.updated", "store");
      });
      return json({ ok: true });
    }
    if (key === "admin/discounts") {
      const u = await requireAdmin(true);
      const v = z
        .object({
          code: z.string().regex(/^[A-Z0-9-]{3,30}$/),
          percent: z.number().int().min(1).max(100),
          expires_at: z.iso.datetime(),
          minimum: z.number().int().min(0),
          limit_uses: z.number().int().min(1),
          active: z.number().int().min(0).max(1),
        })
        .parse(body);
      db()
        .prepare(
          "INSERT INTO discounts(code,percent,expires_at,minimum,limit_uses,active) VALUES(?,?,?,?,?,?) ON CONFLICT(code) DO UPDATE SET percent=excluded.percent,expires_at=excluded.expires_at,minimum=excluded.minimum,limit_uses=excluded.limit_uses,active=excluded.active",
        )
        .run(
          v.code,
          v.percent,
          v.expires_at,
          v.minimum,
          v.limit_uses,
          v.active,
        );
      audit(u.id, "discount.saved", v.code);
      return json({ ok: true });
    }
    if (key === "admin/orders") {
      const u = await requireAdmin();
      const v = z
        .object({
          id: z.string(),
          action: z.enum(["ship", "cancel", "settle"]),
        })
        .parse(body);
      expireReservations();
      return json(publicOrder(updateOrder(v.id, v.action, u.id)));
    }
    throw new HttpError(404, "Not found.");
  } catch (error) {
    if (error instanceof z.ZodError)
      return json(
        {
          error: error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        },
        400,
      );
    if (error instanceof HttpError)
      return json({ error: error.message }, error.status);
    if (error instanceof Error && /UNIQUE constraint/.test(error.message))
      return json(
        {
          error:
            "That email, slug, SKU or size/color combination is already in use.",
        },
        409,
      );
    console.error("Request failed:", error);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}
export { handler as GET, handler as POST, handler as DELETE };
