import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import {
  db,
  products,
  collections,
  settings,
  getProduct,
  isDemo,
} from "@/lib/db";
import { identity } from "@/lib/security";
import { brand, canonicalUrl } from "@/lib/brand";
import { Home } from "@/components/home";
import { Catalog, CollectionsIndex } from "@/components/catalog";
import { ProductDetail } from "@/components/product-detail";
import { CartPage } from "@/components/cart";
import { Checkout } from "@/components/checkout";
import { Account, Auth } from "@/components/account";
import { Tracking, OrderPage } from "@/components/orders";
import { InfoPage } from "@/components/info";
import { Admin } from "@/components/admin";
const info = [
  "about",
  "contact",
  "faq",
  "shipping",
  "returns",
  "privacy",
  "size-guide",
];
type Props = {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | undefined>>;
};
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { slug = [] } = await params;
  const q = await searchParams;
  const path = "/" + slug.join("/");
  const p = slug[0] === "products" ? getProduct(slug[1]) : undefined;
  const c =
    slug[0] === "collections"
      ? collections().find((c) => c.slug === slug[1])
      : undefined;
  const title =
    p?.seo_title ||
    p?.title ||
    c?.seo_title ||
    c?.title ||
    (slug.length
      ? slug[0] === "pages"
        ? slug[1].replaceAll("-", " ")
        : slug[0].replaceAll("-", " ")
      : "Everyday Clothing in Pakistan");
  const description =
    p?.seo_description ||
    p?.description ||
    c?.seo_description ||
    c?.description ||
    (slug.length
      ? "Discover " +
        title +
        " at " +
        settings().brand +
        ". Shop relaxed everyday clothing in Pakistan."
      : brand.description);
  const privatePage = [
    "admin",
    "account",
    "orders",
    "checkout",
    "cart",
    "track",
    "search",
  ].includes(slug[0]);
  const filtered =
    slug[0] === "collections" && Object.keys(q).some((k) => k !== "page");
  return {
    title,
    description,
    alternates: {
      canonical: path + (q.page && !filtered ? "?page=" + q.page : ""),
    },
    robots:
      isDemo() || privatePage || filtered
        ? { index: false, follow: false }
        : undefined,
    openGraph: {
      title,
      description,
      url: path,
      siteName: settings().brand,
      type: "website",
      locale: "en_PK",
      images: p?.images?.slice(0, 1) || [c?.image || "/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: p?.images?.slice(0, 1) || [c?.image || "/opengraph-image"],
    },
  };
}
const jsonLd = (value: unknown) =>
  JSON.stringify(value).replace(/</g, "\\u003c");
export default async function Page({ params, searchParams }: Props) {
  const { slug = [] } = await params;
  const q = await searchParams;
  const path = "/" + slug.join("/");
  const all = products();
  const cols = collections();
  if (slug.length === 0)
    return (
      <>
        <Home />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd([
              {
                "@context": "https://schema.org",
                "@type": "OnlineStore",
                "@id": canonicalUrl() + "/#organization",
                name: settings().brand,
                alternateName: "knitandkin",
                url: canonicalUrl(),
                logo: canonicalUrl() + "/icon.svg",
                email: settings().contactEmail,
                sameAs: [brand.instagram, brand.facebook],
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "@id": canonicalUrl() + "/#website",
                name: settings().brand,
                url: canonicalUrl(),
                inLanguage: "en-PK",
                publisher: { "@id": canonicalUrl() + "/#organization" },
              },
            ]),
          }}
        />
      </>
    );
  if (slug[0] === "collections" && slug.length === 1)
    return <CollectionsIndex />;
  if (slug[0] === "collections" && slug.length === 2) {
    const c = cols.find((c) => c.slug === slug[1]);
    if (c)
      return (
        <Catalog
          collection={c}
          products={all.filter((p) => p.collections.includes(c.id))}
        />
      );
  }
  if (slug[0] === "search" && slug.length === 1)
    return <Catalog products={all} search />;
  if (slug[0] === "products" && slug.length === 2) {
    const p = getProduct(slug[1]);
    if (p) {
      const requested = q.from?.match(/^\/collections\/([a-z0-9-]+)/)?.[1];
      const context = cols.find(
        (c) => c.slug === requested && p.collections.includes(c.id),
      );
      const c =
        context ||
        cols.find((c) => c.id === p.primary_collection) ||
        cols.find((c) => p.collections.includes(c.id));
      const related = all.filter(
        (x) => x.id !== p.id && (c ? x.collections.includes(c.id) : true),
      );
      const base = canonicalUrl();
      return (
        <>
          <ProductDetail product={p} collection={c} related={related} />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: jsonLd([
                {
                  "@context": "https://schema.org",
                  "@type": "Product",
                  name: p.title,
                  brand: { "@type": "Brand", name: settings().brand },
                  description: p.description,
                  image: p.images.map((i) => base + i),
                  sku: p.variants[0]?.sku,
                  offers: {
                    "@type": "Offer",
                    url: base + path,
                    priceCurrency: "PKR",
                    price: (p.price / 100).toFixed(2),
                    availability:
                      "https://schema.org/" +
                      (p.variants.some((v) => v.stock > 0)
                        ? "InStock"
                        : "OutOfStock"),
                  },
                },
                {
                  "@context": "https://schema.org",
                  "@type": "BreadcrumbList",
                  itemListElement: [
                    { name: "Home", item: base },
                    ...(c
                      ? [
                          {
                            name: c.title,
                            item: base + "/collections/" + c.slug,
                          },
                        ]
                      : []),
                    { name: p.title, item: base + path },
                  ].map((i, n) => ({
                    "@type": "ListItem",
                    position: n + 1,
                    ...i,
                  })),
                },
              ]),
            }}
          />
        </>
      );
    }
  }
  if (slug[0] === "cart" && slug.length === 1) return <CartPage />;
  if (slug[0] === "checkout" && slug.length === 1) return <Checkout />;
  if (slug[0] === "account" && slug.length === 1) return <Account />;
  if (
    slug[0] === "account" &&
    ["reset", "recover"].includes(slug[1]) &&
    slug.length === 2
  )
    return <Auth initialMode={slug[1]} />;
  if (slug[0] === "track" && slug.length === 1) return <Tracking />;
  if (slug[0] === "orders" && slug.length === 2)
    return <OrderPage id={slug[1]} />;
  if (slug[0] === "pages" && slug.length === 2 && info.includes(slug[1]))
    return <InfoPage slug={slug[1]} />;
  if (slug[0] === "admin" && slug.length <= 2) {
    const u = await identity();
    if (slug[1] === "login")
      return u && ["owner", "staff"].includes(u.role) ? (
        redirect("/admin")
      ) : (
        <Auth admin />
      );
    if (slug.length === 1) {
      if (!u || !["owner", "staff"].includes(u.role)) redirect("/admin/login");
      return <Admin />;
    }
  }
  const r = db()
    .prepare("SELECT new_path FROM redirects WHERE old_path=?")
    .get(path);
  if (r) permanentRedirect(String(r.new_path));
  notFound();
}
