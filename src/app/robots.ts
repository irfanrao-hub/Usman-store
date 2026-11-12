import type { MetadataRoute } from "next";
import { isDemo } from "@/lib/db";
import { canonicalUrl } from "@/lib/brand";
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
            "/track",
          ],
        },
    sitemap: canonicalUrl() + "/sitemap.xml",
  };
}
