"use client";
import { useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Menu, ArrowRight, ArrowUpRight } from "lucide-react";
import { useStore, api } from "./store-context";
import { Modal, ErrorMessage } from "./ui";
import { BagContent } from "./cart";
import { Motion } from "./motion";
import { brand } from "@/lib/brand";
import { StoreNavigation } from "./store-navigation";
import { StoreIcon } from "./store-icons";
export function Shell({ children }: { children: ReactNode }) {
  const { settings, items, bagOpen, setBagOpen, demo, notify } = useStore();
  const [search, setSearch] = useState(false);
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const path = usePathname();
  const router = useRouter();
  if (path.startsWith("/admin")) return <>{children}</>;
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="announcement">
        <Link href="/collections/new-arrivals">{settings.announcement}</Link>
      </div>
      <header className="site-header">
        <button
          className="icon-button mobile-menu"
          aria-label="Open navigation"
          onClick={() => setMenu(true)}
        >
          <Menu />
        </button>
        <Link
          className="wordmark"
          href="/"
          aria-label={`${settings.brand} home`}
        >
          {settings.brand === brand.name ? brand.wordmark : settings.brand}
        </Link>
        <StoreNavigation />
        <div className="header-actions">
          <button
            className="icon-button"
            aria-label="Search"
            onClick={() => setSearch(true)}
          >
            <StoreIcon name="search" />
          </button>
          <Link
            className="icon-button account-icon"
            href="/account"
            aria-label="My account"
          >
            <StoreIcon name="account" />
          </Link>
          <button
            className="icon-button bag-button"
            aria-label={`Shopping cart, ${items.reduce((s, i) => s + i.quantity, 0)} items`}
            onClick={() => setBagOpen(true)}
          >
            <StoreIcon name="cart" />
            {items.length > 0 && (
              <span className="bag-count">
                {items.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer>
        <div className="footer-grid">
          <div>
            <Link className="wordmark" href="/">
              {settings.brand === brand.name ? brand.wordmark : settings.brand}
            </Link>
            <p>Little outfits. Big adventures.</p>
            <a href={`mailto:${settings.contactEmail}`}>
              {settings.contactEmail}
            </a>
            <div className="social-links">
              <a
                href={brand.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Knit & Kin on Instagram"
              >
                <StoreIcon name="instagram" />
              </a>
              <a
                href={brand.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Knit & Kin on Facebook"
              >
                <StoreIcon name="facebook" />
              </a>
            </div>
          </div>
          <div>
            <h3>Explore</h3>
            {settings.nav.slice(0, 3).map((n) => (
              <Link key={n.href} href={n.href}>
                {n.label}
              </Link>
            ))}
            <Link href="/collections">All categories</Link>
          </div>
          <div>
            <h3>Need a hand?</h3>
            <Link href="/pages/contact">Contact</Link>
            <Link href="/pages/shipping">Shipping</Link>
            <Link href="/pages/returns">Returns</Link>
            <Link href="/track">Track an order</Link>
            <Link href="/pages/faq">FAQ</Link>
          </div>
          <div>
            <h3>Stay in the loop</h3>
            <p>Little looks. Fresh arrivals.</p>
            <form
              className="email-form"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  const r = await api<{ message: string }>("newsletter", {
                    email,
                  });
                  notify(r.message);
                  setEmail("");
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label className="sr-only" htmlFor="newsletter">
                Your email address
              </label>
              <input
                id="newsletter"
                type="email"
                placeholder="Your email address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button disabled={busy} aria-label="Subscribe to newsletter">
                <ArrowRight size={20} />
              </button>
            </form>
            <ErrorMessage message={error} />
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {settings.brand}.
            {demo ? " Preview store." : ""}
          </span>
          <div>
            <a href={brand.website}>knitandkin.com</a>
            <Link href="/pages/privacy">Privacy</Link>
            <span>/</span>
            <Link href="/admin">
              Admin <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>
      </footer>
      <Modal open={menu} onClose={() => setMenu(false)} title="Explore" drawer>
        <StoreNavigation mobile onNavigate={() => setMenu(false)} />
      </Modal>
      <Modal
        open={search}
        onClose={() => setSearch(false)}
        title="Find your next favourite"
      >
        <form
          className="search-form"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(false);
            router.push("/search?q=" + encodeURIComponent(query));
          }}
        >
          <label htmlFor="search-q">Search products</label>
          <div className="input-action">
            <input
              id="search-q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try “romper”, “dress”, “hoodie”…"
              required
              autoComplete="off"
            />
            <button className="button" type="submit" aria-label="Submit search">
              <Search size={20} />
            </button>
          </div>
        </form>
        <p className="muted">Explore the collections</p>
        <div className="search-suggestions">
          {settings.nav.slice(0, 4).map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setSearch(false)}>
              {n.label}
              <ArrowUpRight size={16} />
            </Link>
          ))}
        </div>
      </Modal>
      <Modal
        open={bagOpen}
        onClose={() => setBagOpen(false)}
        title={`Your cart (${items.reduce((s, i) => s + i.quantity, 0)})`}
        drawer
      >
        <BagContent drawer />
      </Modal>
      <Motion />
    </>
  );
}
