import type { MetadataRoute } from "next";
import { products, collections, isDemo } from "@/lib/db";
export const dynamic = "force-dynamic";
export default function sitemap(): MetadataRoute.Sitemap {
  if (isDemo()) return [];
  const base = process.env.SITE_URL || "http://127.0.0.1:3100";
  return [
    "",
    "/collections",
    ...collections().map((c) => "/collections/" + c.slug),
    ...products().map((p) => "/products/" + p.slug),
    ...["about", "contact", "faq", "shipping", "returns", "privacy"].map(
      (p) => "/pages/" + p,
    ),
  ].map((p) => ({ url: base + p }));
}
