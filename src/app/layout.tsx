import type { Metadata } from "next";
import { products, collections, settings, isDemo } from "@/lib/db";
import { brand, canonicalUrl } from "@/lib/brand";
import { StoreProvider } from "@/components/store-context";
import { Shell } from "@/components/shell";
import "./globals.css";
import "./storefront.css";
import "./kidswear.css";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const s = settings();
  return {
    metadataBase: new URL(canonicalUrl()),
    title: {
      default: `${s.brand} — Kidswear in Pakistan`,
      template: `%s | ${s.brand}`,
    },
    description: brand.description,
    robots: isDemo() ? { index: false, follow: false } : undefined,
    openGraph: {
      siteName: s.brand,
      type: "website",
      locale: "en_PK",
      title: `${s.brand} — Kidswear in Pakistan`,
      description: brand.description,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "Knit & Kin — Little outfits. Big adventures.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: s.brand,
      description: brand.description,
      images: ["/opengraph-image"],
    },
    icons: { icon: "/icon.svg" },
  };
}
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body style={{ "--ink": settings().themeInk } as React.CSSProperties}>
        <StoreProvider
          products={products()}
          collections={collections()}
          settings={settings()}
          demo={isDemo()}
        >
          <Shell>{children}</Shell>
        </StoreProvider>
      </body>
    </html>
  );
}
