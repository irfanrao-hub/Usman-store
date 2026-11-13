"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  clothingCategories,
  seasons,
  seasonCategories,
  seasonCategoryHref,
} from "@/lib/kidswear";
import { useStore } from "./store-context";
import { Photo } from "./ui";

export function SeasonCards() {
  const { collections } = useStore();
  return (
    <div className="season-grid">
      {seasons.map((season) => {
        const collection = collections.find((c) => c.slug === season);
        if (!collection) return null;
        return (
          <Link
            href={`/collections/${season}`}
            key={season}
            className={`season-card ${season}`}
          >
            <Photo
              src={collection.image}
              alt={`${collection.title} kidswear collection`}
              sizes="(max-width: 700px) 60vw, 30vw"
            />
            <div>
              <h3>{collection.title}</h3>
              <p>
                {season === "summer"
                  ? "Sunshine-ready styles"
                  : "Layers for little explorers"}
              </p>
              <span className="button">
                Shop {season}
                <ArrowRight size={18} />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
export function CategoryCircles() {
  const { collections } = useStore();
  return (
    <div className="category-circles">
      {clothingCategories.map((slug) => {
        const c = collections.find((c) => c.slug === slug);
        return c ? (
          <Link href={`/collections/${c.slug}`} key={c.id}>
            <div>
              <Photo
                src={c.image}
                alt=""
                sizes="(max-width: 600px) 28vw, 15vw"
              />
            </div>
            <span>{c.title}</span>
          </Link>
        ) : null;
      })}
    </div>
  );
}
export function SeasonCategories({
  season,
  current = "",
}: {
  season: string;
  current?: string;
}) {
  const { collections, products } = useStore();
  const children = seasonCategories(season, collections, products);
  return (
    <nav
      className="category-filter"
      aria-label={`${season} clothing categories`}
    >
      <Link
        href={`/collections/${season}`}
        aria-current={!current ? "page" : undefined}
      >
        Shop all {season}
      </Link>
      {children.map((c) => (
        <Link
          key={c.id}
          href={seasonCategoryHref(season, c.slug)}
          aria-current={current === c.slug ? "page" : undefined}
        >
          {c.title}
        </Link>
      ))}
    </nav>
  );
}
