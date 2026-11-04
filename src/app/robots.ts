import type { MetadataRoute } from "next";
import { isDemo } from "@/lib/db";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: isDemo()
      ? { userAgent: "*", disallow: "/" }
      : {
          userAgent: "*",
          allow: "/",
          disallow: [
            "/admin",
            "/api",
            "/account",
            "/orders",
            "/checkout",
            "/cart",
            "/search",
          ],
        },
    sitemap: (process.env.SITE_URL || "http://127.0.0.1:3100") + "/sitemap.xml",
  };
}
