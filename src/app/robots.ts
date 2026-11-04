import type { MetadataRoute } from "next";
import { isDemo } from "@/lib/db";
import { siteUrl } from "@/lib/security";
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
    sitemap: siteUrl() + "/sitemap.xml",
  };
}
