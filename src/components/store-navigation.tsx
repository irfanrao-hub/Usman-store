"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { useStore } from "./store-context";
import { seasonCategories, seasonCategoryHref, seasons } from "@/lib/kidswear";

export function StoreNavigation({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const { settings, products, collections } = useStore();
  const path = usePathname();
  return (
    <nav
      className={mobile ? "mobile-links" : "desktop-nav"}
      aria-label={mobile ? "Mobile navigation" : "Main navigation"}
    >
      {settings.nav.map((n) => {
        const season = seasons.find((s) => n.href === `/collections/${s}`);
        const categories = season
          ? seasonCategories(season, collections, products)
          : [];
        if (!season)
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={onNavigate}
              className={path === n.href ? "active" : ""}
              aria-current={path === n.href ? "page" : undefined}
            >
              {n.label}
              {mobile && <ArrowUpRight />}
            </Link>
          );
        return (
          <details
            className="season-menu"
            key={n.href}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.currentTarget.open = false;
                e.currentTarget.querySelector("summary")?.focus();
              }
            }}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget))
                e.currentTarget.open = false;
            }}
          >
            <summary className={path === n.href ? "active" : ""}>
              {n.label}
              <ChevronDown size={15} />
            </summary>
            <div className="season-submenu">
              <p>
                {n.label === "Summer"
                  ? "Sunshine-ready styles"
                  : "Layers for little explorers"}
              </p>
              {[
                { title: `Shop all ${n.label.toLowerCase()}`, href: n.href },
                ...categories.map((c) => ({
                  title: c.title,
                  href: seasonCategoryHref(season, c.slug),
                })),
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    e.currentTarget.closest("details")?.removeAttribute("open");
                    onNavigate?.();
                  }}
                >
                  {link.title}
                  <ArrowUpRight size={15} />
                </Link>
              ))}
            </div>
          </details>
        );
      })}
      {mobile && (
        <Link href="/account" onClick={onNavigate}>
          My account
          <ArrowUpRight />
        </Link>
      )}
    </nav>
  );
}
