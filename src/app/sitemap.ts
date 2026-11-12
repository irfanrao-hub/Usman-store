import type { MetadataRoute } from "next";
import { products, collections } from "@/lib/db";
import { canonicalUrl } from "@/lib/brand";
export const dynamic = "force-dynamic";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = canonicalUrl();
  return [
    "",
    "/collections",
    ...collections().map((c) => "/collections/" + c.slug),
    ...products().map((p) => "/products/" + p.slug),
    ...[
      "about",
      "contact",
      "faq",
      "shipping",
      "returns",
      "privacy",
      "size-guide",
    ].map((p) => "/pages/" + p),
  ].map((p) => ({
    url: base + p,
    changeFrequency: p.startsWith("/pages") ? "monthly" : "weekly",
    priority:
      p === ""
        ? 1
        : p.startsWith("/collections")
          ? 0.8
          : p.startsWith("/products")
            ? 0.7
            : 0.4,
  }));
}
