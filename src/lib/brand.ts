/** Public brand details. Keep operational origins and legacy storage keys separate. */
export const brand = {
  name: "Knit & Kin",
  wordmark: "knit&kin",
  website: "https://knitandkin.com",
  email: "knitandkin1@gmail.com",
  instagram: "https://www.instagram.com/knitandkinofficial/",
  facebook: "https://web.facebook.com/profile.php?id=61596132126275",
  description:
    "Explore Knit & Kin's everyday clothing in Pakistan. Discover relaxed T-shirts, shirts and denim, find your fit and build your everyday wardrobe.",
} as const;

export function canonicalUrl() {
  return (process.env.CANONICAL_SITE_URL || brand.website).replace(/\/$/, "");
}
