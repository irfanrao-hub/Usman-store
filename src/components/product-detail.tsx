"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  ArrowLeft,
  ArrowUpRight,
  Ruler,
  Truck,
  RotateCcw,
} from "lucide-react";
import type { Product, Collection } from "@/lib/types";
import { money } from "@/lib/types";
import { useStore } from "./store-context";
import { Photo, Quantity, Modal, ErrorMessage } from "./ui";
import { ProductCard, swatch } from "./product-card";
export function ProductDetail({
  product: p,
  collection,
  related,
}: {
  product: Product;
  collection?: Collection;
  related: Product[];
}) {
  const params = useSearchParams();
  const { add, settings } = useStore();
  const [selected, setSelected] = useState(params.get("variant") || "");
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [guide, setGuide] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [error, setError] = useState("");
  const variant = p.variants.find((v) => v.id === selected);
  const from = params.get("from");
  const safeFrom =
    from && /^\/collections\/[a-z0-9-]+(?:\?[^#]*)?$/.test(from)
      ? from
      : "/collections/" + (collection?.slug || "new-arrivals");
  const colors = [...new Set(p.variants.map((v) => v.color))];
  const [color, setColor] = useState(variant?.color || colors[0]);
  const sizes = p.variants.filter((v) => v.color === color);
  return (
    <div className="section product-page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href={safeFrom}>{collection?.title || "Collections"}</Link>
        <span>/</span>
        <span>{p.title}</span>
      </nav>
      <div className="product-layout">
        <div className="gallery">
          <button
            className="main-photo"
            aria-label="Enlarge product image"
            onClick={() => setZoom(true)}
          >
            <Photo
              src={p.images[activeImage]}
              alt={`${p.title}, view ${activeImage + 1}`}
              eager
            />
            <span>
              View closer <Plus size={14} />
            </span>
          </button>
          {p.images.length > 1 && (
            <div className="thumbnails">
              {p.images.map((src, i) => (
                <button
                  key={src}
                  className={activeImage === i ? "selected" : ""}
                  onClick={() => setActiveImage(i)}
                  aria-label={`Show product image ${i + 1}`}
                  aria-pressed={activeImage === i}
                >
                  <Photo src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="product-info">
          <Link className="back-link" href={safeFrom}>
            <ArrowLeft size={14} /> Back to{" "}
            {collection?.title.toLowerCase() || "collection"}
          </Link>
          <h1>{p.title}</h1>
          <div className="detail-price">
            <span>{money(p.price)}</span>
            {p.compare_price > p.price && (
              <>
                <del>{money(p.compare_price)}</del>
                <span className="sale-text">
                  Save {Math.round((1 - p.price / p.compare_price) * 100)}%
                </span>
              </>
            )}
          </div>
          <p className="detail-lead">
            An everyday favourite. Make it your own.
          </p>
          <fieldset className="variant-field">
            <legend>Color — {color}</legend>
            <div className="color-options">
              {colors.map((c) => (
                <button
                  key={c}
                  aria-label={c}
                  aria-pressed={color === c}
                  className={color === c ? "selected" : ""}
                  onClick={() => {
                    setColor(c);
                    setSelected("");
                  }}
                >
                  <span style={{ background: swatch(c) }} />
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="variant-field">
            <legend>Size {variant ? "— " + variant.size : ""}</legend>
            <button
              type="button"
              className="size-guide text-link"
              onClick={() => setGuide(true)}
            >
              <Ruler size={16} />
              Size guide
            </button>
            <div className="size-buttons">
              {sizes.map((v) => (
                <button
                  key={v.id}
                  disabled={!v.stock}
                  aria-pressed={selected === v.id}
                  className={selected === v.id ? "selected" : ""}
                  onClick={() => {
                    setSelected(v.id);
                    setQuantity(1);
                    setError("");
                    const u = new URL(location.href);
                    u.searchParams.set("variant", v.id);
                    history.replaceState(null, "", u);
                  }}
                >
                  {v.size}
                </button>
              ))}
            </div>
          </fieldset>
          <p className="stock-status">
            {variant
              ? `${variant.stock > 0 ? "In stock" : "Sold out"}${variant.stock > 0 ? " · " + variant.stock + " available" : ""}`
              : "Select a size to check availability"}
          </p>
          <div className="add-row">
            <Quantity
              value={quantity}
              max={Math.min(20, variant?.stock || 1)}
              onChange={setQuantity}
            />
            <button
              className="button"
              onClick={() => {
                if (!variant || !variant.stock) {
                  setError("Choose an available size first.");
                  return;
                }
                add(variant.id, quantity);
              }}
            >
              Add to cart <Plus size={18} />
            </button>
          </div>
          <ErrorMessage message={error} />
          <div className="product-promises">
            <p>
              <Truck size={18} />
              {money(settings.shippingRate)} demo shipping · Free from{" "}
              {money(settings.freeShippingThreshold)}
            </p>
            <Link href="/pages/returns">
              <RotateCcw size={18} />
              Read our returns information <ArrowUpRight size={14} />
            </Link>
          </div>
          <details open>
            <summary>The details</summary>
            <p>{p.description}</p>
          </details>
          <details>
            <summary>Shipping &amp; returns</summary>
            <p>{settings.shippingPolicy}</p>
            <p>{settings.returns}</p>
          </details>
          <p className="sku">
            {variant ? "SKU: " + variant.sku : "Choose a size to view SKU"}
          </p>
        </div>
      </div>
      {related.length > 0 && (
        <section className="related">
          <div className="section-heading">
            <h2>Good company.</h2>
            <Link href={safeFrom} className="text-link">
              Explore the collection
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="product-grid">
            {related.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} from={safeFrom} />
            ))}
          </div>
        </section>
      )}
      <Modal open={guide} onClose={() => setGuide(false)} title="Find your fit">
        <p className="prose">
          {p.size_guide ||
            "Measurements are not available for this piece yet. Please contact the store owner."}
        </p>
        <p className="muted">
          Measure a piece you already love and compare it with the garment
          measurements.
        </p>
      </Modal>
      <Modal open={zoom} onClose={() => setZoom(false)} title={p.title}>
        <Photo
          className="zoom-photo"
          src={p.images[activeImage]}
          alt={p.title}
        />
      </Modal>
    </div>
  );
}
