import { NextRequest, NextResponse } from "next/server";
import { db } from "./lib/db";
// Resolve catalog status before rendering streams headers. The SQLite file is
// authoritative; the proxy and rendering process do not share in-memory state.
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const parts = path.split("/").filter(Boolean);
  let valid: boolean;
  if (parts[0] === "products" && parts.length === 2)
    valid = !!db()
      .prepare("SELECT id FROM products WHERE slug=? AND status='published'")
      .get(parts[1]);
  else if (parts[0] === "collections")
    valid =
      parts.length === 1 ||
      (parts.length === 2 &&
        !!db()
          .prepare("SELECT id FROM collections WHERE slug=?")
          .get(parts[1]));
  else if (parts[0] === "pages")
    valid =
      parts.length === 2 &&
      [
        "about",
        "contact",
        "faq",
        "shipping",
        "returns",
        "privacy",
        "size-guide",
      ].includes(parts[1]);
  else
    valid =
      parts.length === 0 ||
      (parts.length === 1 &&
        ["search", "cart", "checkout", "account", "track", "admin"].includes(
          parts[0],
        )) ||
      (parts.length === 2 &&
        ((parts[0] === "account" && ["reset", "recover"].includes(parts[1])) ||
          (parts[0] === "admin" && parts[1] === "login") ||
          (parts[0] === "orders" && /^FM-[A-F0-9]{10}$/.test(parts[1]))));
  if (valid) return NextResponse.next();
  const redirect = db()
    .prepare("SELECT new_path FROM redirects WHERE old_path=?")
    .get(path);
  if (redirect) {
    const target = new URL(String(redirect.new_path), request.url);
    target.search = request.nextUrl.search;
    return NextResponse.redirect(target, 308);
  }
  return NextResponse.rewrite(new URL("/_not-found", request.url), {
    status: 404,
    headers: { "X-Robots-Tag": "noindex" },
  });
}
export const config = {
  matcher: [
    "/((?!api(?:/|$)|_next(?:/|$)|_not-found$|images(?:/|$)|fonts(?:/|$)|opengraph-image(?:/|$)|icon.svg$|robots.txt$|sitemap.xml$|favicon.ico$).*)",
  ],
};
