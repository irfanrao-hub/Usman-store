import type { Collection, Product } from "./types";

export const clothingCategories = [
  "tshirts",
  "co-ord-sets",
  "dresses",
  "rompers",
  "sweatshirts",
  "jackets",
] as const;
export const seasons = ["summer", "winter"] as const;

// Membership comes from the catalogue: owners assign both a season and a
// clothing type in the existing product editor. No title-based guessing.
export function seasonCategories(
  season: string,
  collections: Collection[],
  products: Product[],
) {
  const parent = collections.find((c) => c.slug === season);
  if (!parent) return [];
  const members = products.filter((p) => p.collections.includes(parent.id));
  return collections.filter(
    (c) =>
      c.id !== parent.id &&
      c.slug !== "new-arrivals" &&
      !seasons.some((s) => s === c.slug) &&
      members.some((p) => p.collections.includes(c.id)),
  );
}

export function seasonCategoryHref(season: string, category: string) {
  return `/collections/${season}?category=${encodeURIComponent(category)}`;
}
