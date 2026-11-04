import type { MetadataRoute } from "next";
import { products, collections, isDemo } from "@/lib/db";
import { siteUrl } from "@/lib/security";
export const dynamic = "force-dynamic";
export default function sitemap(): MetadataRoute.Sitemap {
  if (isDemo()) return [];
  const base = siteUrl();
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
