"use client";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { SlidersHorizontal, ArrowRight, X } from "lucide-react";
import type { Collection, Product } from "@/lib/types";
import { useStore } from "./store-context";
import { ProductCard } from "./product-card";
import { Photo } from "./ui";
export function CollectionsIndex() {
  const { collections } = useStore();
  return (
    <div className="section">
      <div className="page-intro">
        <span className="breadcrumb">
          <Link href="/">Home</Link> / Collections
        </span>
        <h1>Find your form.</h1>
        <p>A few good pieces. A thousand ways to wear them.</p>
      </div>
      <div className="collection-grid">
        {collections.map((c) => (
          <Link key={c.id} href={"/collections/" + c.slug}>
            <div>
              <Photo src={c.image} alt={c.title} />
            </div>
            <h2>
              {c.title}
              <ArrowRight size={22} />
            </h2>
            <p>{c.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
export function Catalog({
  collection,
  products,
  search = false,
}: {
  collection?: Collection;
  products: Product[];
  search?: boolean;
}) {
  const { ready } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const [filters, setFilters] = useState(false);
  const query = params.get("q") || "";
  const size = params.get("size") || "";
  const color = params.get("color") || "";
  const sort = params.get("sort") || "featured";
  const max = Number(params.get("max")) || 0;
  const inStock = params.get("stock") === "1";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const sizeOptions = [
    ...new Set(products.flatMap((p) => p.variants.map((v) => v.size))),
  ];
  const colors = [
    ...new Set(products.flatMap((p) => p.variants.map((v) => v.color))),
  ];
  const filtered = products.filter(
    (p) =>
      (!search ||
        [p.title, p.description, ...p.variants.map((v) => v.color)]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (!max || p.price <= max * 100) &&
      p.variants.some(
        (v) =>
          (!size || v.size === size) &&
          (!color || v.color === color) &&
          (!inStock || v.stock > 0),
      ),
  );
  if (sort === "price-asc") filtered.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") filtered.sort((a, b) => b.price - a.price);
  if (sort === "name") filtered.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === "newest")
    filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));
  const totalPages = Math.ceil(filtered.length / 12);
  const shown = filtered.slice((page - 1) * 12, page * 12);
  const from = path + (params.size ? "?" + params.toString() : "");
  function update(key: string, value: string) {
    const p = new URLSearchParams(window.location.search);
    if (value) p.set(key, value);
    else p.delete(key);
    if (key !== "page") p.delete("page");
    window.history.pushState(null, "", path + (p.size ? "?" + p : ""));
  }
  return (
    <div className="section catalog">
      <div className="page-intro">
        <div className="breadcrumb">
          <Link href="/">Home</Link> /{" "}
          {search ? (
            "Search"
          ) : (
            <>
              <Link href="/collections">Collections</Link> / {collection?.title}
            </>
          )}
        </div>
        <h1>{search ? "The search is on." : collection?.title}</h1>
        {search ? (
          <form className="catalog-search" action="/search">
            <input
              aria-label="Search products"
              name="q"
              defaultValue={query}
              placeholder="Search the collection…"
            />
            <button className="button" type="submit">
              Search <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          <p>{collection?.description}</p>
        )}
      </div>
      <div className="filter-bar">
        <button
          className="filter-toggle"
          disabled={!ready}
          onClick={() => setFilters(!filters)}
          aria-expanded={filters}
        >
          <SlidersHorizontal size={18} /> Filter{" "}
          {size || color || max || inStock ? (
            <span className="filter-count">Active</span>
          ) : null}
        </button>
        <span className="results-count">
          {filtered.length} pieces{search && query ? ` for “${query}”` : ""}
        </span>
        <label className="sort-label">
          Sort by{" "}
          <select
            value={sort}
            onChange={(e) => update("sort", e.target.value)}
            aria-label="Sort products"
          >
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="name">Name: A–Z</option>
          </select>
        </label>
      </div>
      {filters && (
        <div className="filter-panel">
          <label>
            Size
            <select
              aria-label="Size"
              value={size}
              onChange={(e) => update("size", e.target.value)}
            >
              <option value="">All sizes</option>
              {sizeOptions.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Color
            <select
              aria-label="Color"
              value={color}
              onChange={(e) => update("color", e.target.value)}
            >
              <option value="">All colors</option>
              {colors.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Maximum price (PKR)
            <input
              type="number"
              min="0"
              value={max || ""}
              onChange={(e) => update("max", e.target.value)}
              placeholder="No limit"
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => update("stock", e.target.checked ? "1" : "")}
            />
            In stock only
          </label>
          <button
            className="text-link"
            onClick={() =>
              router.push(
                path + (search ? "?q=" + encodeURIComponent(query) : ""),
                { scroll: false },
              )
            }
          >
            Clear filters
            <X size={14} />
          </button>
        </div>
      )}
      <div className="product-grid">
        {shown.map((p, i) => (
          <ProductCard key={p.id} product={p} from={from} priority={i < 4} />
        ))}
      </div>
      {shown.length === 0 && (
        <div className="empty">
          <h2>No pieces found.</h2>
          <p>Try a different search or clear your filters.</p>
          <button className="button outline" onClick={() => router.push(path)}>
            Reset this view
          </button>
        </div>
      )}
      {totalPages > 1 && (
        <nav className="pagination" aria-label="Product pages">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              aria-current={page === i + 1 ? "page" : undefined}
              className={page === i + 1 ? "selected" : ""}
              onClick={() => {
                update("page", String(i + 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              {i + 1}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
