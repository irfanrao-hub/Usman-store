import type { Metadata } from "next";
import { Suspense } from "react";
import { products, collections, settings, isDemo } from "@/lib/db";
import { StoreProvider } from "@/components/store-context";
import { Shell } from "@/components/shell";
import "./globals.css";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const s = settings();
  return {
    metadataBase: new URL(process.env.SITE_URL || "http://127.0.0.1:3100"),
    title: {
      default: `${s.brand} — A different perspective`,
      template: `%s | ${s.brand}`,
    },
    description:
      "Everyday pieces. A different perspective. Explore relaxed silhouettes and your next everyday favourites.",
    robots: isDemo() ? { index: false, follow: false } : undefined,
    openGraph: {
      siteName: s.brand,
      type: "website",
      images: ["/images/product-1.jpg"],
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
    <html lang="en">
      <body style={{ "--ink": settings().themeInk } as React.CSSProperties}>
        <Suspense
          fallback={<main className="empty">Loading your next favourite…</main>}
        >
          <StoreProvider
            products={products()}
            collections={collections()}
            settings={settings()}
            demo={isDemo()}
          >
            <Shell>{children}</Shell>
          </StoreProvider>
        </Suspense>
      </body>
    </html>
  );
}
