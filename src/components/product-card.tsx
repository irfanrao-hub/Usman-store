"use client";
import Link from "next/link";
import { useState } from "react";
import { Plus, ArrowUpRight } from "lucide-react";
import { type Product, money } from "@/lib/types";
import { Photo, Modal } from "./ui";
import { useStore } from "./store-context";
import { StoreIcon } from "./store-icons";
export function ProductCard({
  product: p,
  from,
  priority = false,
}: {
  product: Product;
  from?: string;
  priority?: boolean;
}) {
  const [quick, setQuick] = useState(false);
  const [variant, setVariant] = useState("");
  const { add } = useStore();
  const discount =
    p.compare_price > p.price
      ? Math.round((1 - p.price / p.compare_price) * 100)
      : 0;
  const available = p.variants.some((v) => v.stock > 0);
  return (
    <article className="product-card reveal">
      <div className="product-image">
        <Link
          href={`/products/${p.slug}${from ? "?from=" + encodeURIComponent(from) : ""}`}
          aria-label={`View ${p.title}`}
        >
          <Photo
            src={p.images[0]}
            alt={`${p.title} in ${p.variants[0]?.color || ""}`}
            eager={priority}
            sizes="(max-width: 900px) 50vw, 25vw"
          />
          {p.images.length > 1 && (
            <Photo
              className="alternate"
              src={p.images[1]}
              alt=""
              sizes="(max-width: 900px) 50vw, 25vw"
            />
          )}
        </Link>
        {!available ? (
          <span className="product-badge">SOLD OUT</span>
        ) : discount > 0 ? (
          <span className="product-badge">{discount}% OFF</span>
        ) : null}
      </div>
      <button
        className="card-add"
        disabled={!available}
        aria-label={
          available
            ? `Add ${p.title} to cart — choose size`
            : `${p.title} is sold out`
        }
        onClick={() => {
          setVariant("");
          setQuick(true);
        }}
      >
        {available ? "Add to cart" : "Sold out"}
        <StoreIcon name="cart" />
      </button>
      <Link
        className="product-title"
        href={`/products/${p.slug}${from ? "?from=" + encodeURIComponent(from) : ""}`}
      >
        {p.title}
      </Link>
      <div className="product-price">
        <span>{money(p.price)}</span>
        {p.compare_price > p.price && <del>{money(p.compare_price)}</del>}
      </div>
      <p className="product-color">
        <span
          className="color-dot"
          style={{ background: swatch(p.variants[0]?.color) }}
        />
        {p.variants[0]?.color}
      </p>
      <Modal open={quick} onClose={() => setQuick(false)} title={p.title}>
        <div className="quick-layout">
          <Photo src={p.images[0]} alt={p.title} />
          <div>
            <p>{money(p.price)}</p>
            <p>Select your size</p>
            <div className="size-buttons">
              {p.variants.map((v) => (
                <button
                  key={v.id}
                  disabled={!v.stock}
                  className={variant === v.id ? "selected" : ""}
                  onClick={() => setVariant(v.id)}
                  aria-pressed={variant === v.id}
                >
                  {v.size}
                  {new Set(p.variants.map((v) => v.color)).size > 1
                    ? " / " + v.color
                    : ""}
                </button>
              ))}
            </div>
            <button
              className="button full"
              disabled={!variant}
              onClick={() => {
                setQuick(false);
                add(variant, 1);
              }}
            >
              Add to cart <Plus size={18} />
            </button>
            <Link
              className="text-link"
              href={`/products/${p.slug}`}
              onClick={() => setQuick(false)}
            >
              View full details <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </Modal>
    </article>
  );
}
export function swatch(color = "") {
  const v = color.toLowerCase();
  const kidsColors: Record<string, string> = {
    "butter yellow": "#f3d77c",
    "daisy yellow": "#f5dd8e",
    "sage green": "#9eaf8c",
    "sky blue": "#b3d8ef",
    lilac: "#b7a2d5",
    peach: "#d68d73",
    oatmeal: "#dfcdb4",
  };
  if (kidsColors[v]) return kidsColors[v];
  return v.includes("olive")
    ? "#777a61"
    : v.includes("blue")
      ? "#3c4c63"
      : v.includes("white") || v.includes("ecru")
        ? "#e7e3d9"
        : v.includes("mocha") || v.includes("brown")
          ? "#776659"
          : v.includes("khaki") || v.includes("sand") || v.includes("taupe")
            ? "#b5a68c"
            : v.includes("grey")
              ? "#858581"
              : "#30302f";
}
