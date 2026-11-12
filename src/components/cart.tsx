"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ShoppingBag, Trash2 } from "lucide-react";
import { useStore, api } from "./store-context";
import { Photo, Quantity, ErrorMessage, Cta } from "./ui";
import { money, type Quote } from "@/lib/types";
export function BagContent({ drawer = false }: { drawer?: boolean }) {
  const { items, ready, products, setQuantity, setBagOpen, settings } =
    useStore();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    if (!items.length) {
      setQuote(null);
      return;
    }
    setQuote(null);
    api<Quote>("cart/quote", { items })
      .then((q) => {
        if (!cancelled) {
          setQuote(q);
          setError("");
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [items]);
  if (!ready)
    return (
      <p className="empty" role="status">
        Opening your cart…
      </p>
    );
  if (!items.length)
    return (
      <div className="empty bag-empty">
        <ShoppingBag size={38} strokeWidth={1} />
        <h2>A little room for something good.</h2>
        <p>Your cart is currently empty.</p>
        <Link
          className="button"
          href="/collections/new-arrivals"
          onClick={() => setBagOpen(false)}
        >
          Explore new arrivals <ArrowRight size={18} />
        </Link>
      </div>
    );
  return (
    <div className={`bag-content ${drawer ? "" : "bag-page-layout"}`}>
      <div className="bag-items">
        {items.map((item) => {
          const p = products.find((p) =>
            p.variants.some((v) => v.id === item.variantId),
          );
          const v = p?.variants.find((v) => v.id === item.variantId);
          const line = quote?.items.find((l) => l.variantId === item.variantId);
          return (
            <article className="bag-item" key={item.variantId}>
              <Link
                href={p ? "/products/" + p.slug : "/collections/new-arrivals"}
                onClick={() => setBagOpen(false)}
              >
                <Photo
                  src={p?.images[0] || ""}
                  alt={p?.title || "Unavailable product"}
                />
              </Link>
              <div>
                <Link
                  href={p ? "/products/" + p.slug : "/collections/new-arrivals"}
                  onClick={() => setBagOpen(false)}
                >
                  {p?.title || "Item no longer available"}
                </Link>
                <p className="muted">
                  {v ? `${v.color} / ${v.size}` : "Please remove this item."}
                </p>
                <div className="bag-item-bottom">
                  <Quantity
                    value={item.quantity}
                    max={Math.min(v?.stock || 20, 20)}
                    onChange={(n) => setQuantity(item.variantId, n)}
                  />
                  <button
                    className="icon-button"
                    aria-label={`Remove ${p?.title || "item"}`}
                    onClick={() => setQuantity(item.variantId, 0)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <span className="line-price">
                {line
                  ? money(line.price * item.quantity)
                  : p
                    ? money(p.price * item.quantity)
                    : "—"}
              </span>
            </article>
          );
        })}
      </div>
      <div className="bag-summary">
        <p className="shipping-progress">
          {quote && quote.subtotal < settings.freeShippingThreshold
            ? `${money(settings.freeShippingThreshold - quote.subtotal)} away from free demo shipping`
            : "Your next everyday favourites."}
        </p>
        <div className="progress-line">
          <span
            style={{
              width: `${Math.min(100, ((quote?.subtotal || 0) / (settings.freeShippingThreshold || 1)) * 100)}%`,
            }}
          />
        </div>
        <ErrorMessage message={error} />
        <div className="summary-line">
          <span>Subtotal</span>
          <span>{quote ? money(quote.subtotal) : "Recalculating…"}</span>
        </div>
        <p className="muted">Shipping and discounts confirmed at checkout.</p>
        <Link
          className={`button full ${!quote ? "disabled-link" : ""}`}
          aria-disabled={!quote}
          href="/checkout"
          onClick={(e) => {
            if (!quote) e.preventDefault();
            else setBagOpen(false);
          }}
        >
          Continue to checkout
          <ArrowRight size={18} />
        </Link>
        {drawer ? (
          <Link
            className="text-link centered"
            href="/cart"
            onClick={() => setBagOpen(false)}
          >
            View your cart
          </Link>
        ) : (
          <Cta href="/collections/new-arrivals" outline>
            Continue shopping
          </Cta>
        )}
      </div>
    </div>
  );
}
export function CartPage() {
  return (
    <div className="section">
      <div className="page-intro">
        <div className="breadcrumb">
          <Link href="/">Home</Link> / Cart
        </div>
        <h1>Your cart.</h1>
      </div>
      <BagContent />
    </div>
  );
}
