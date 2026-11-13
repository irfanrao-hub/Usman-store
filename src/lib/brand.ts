/** Public brand details. Keep operational origins and legacy storage keys separate. */
export const brand = {
  name: "Knit & Kin",
  wordmark: "knit&kin",
  website: "https://knitandkin.com",
  email: "knitandkin1@gmail.com",
  instagram: "https://www.instagram.com/knitandkinofficial/",
  facebook: "https://web.facebook.com/profile.php?id=61596132126275",
  description:
    "Explore Knit & Kin kidswear in Pakistan. Shop Summer and Winter collections, from T-shirts, co-ord sets, dresses and rompers to sweatshirts and jackets.",
} as const;

export function canonicalUrl() {
  return (process.env.CANONICAL_SITE_URL || brand.website).replace(/\/$/, "");
}
