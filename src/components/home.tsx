"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Hero } from "./hero";
import { useStore } from "./store-context";
import { ProductCard } from "./product-card";
import { Cta } from "./ui";
import { SeasonCards, CategoryCircles } from "./home-discovery";
import { RecentPurchase } from "./activity";
import { HomeFaq } from "./faq";
export function Home() {
  const { products, settings, collections, demo } = useStore();
  const [tab, setTab] = useState("all");
  const tabs = ["all", ...settings.homeTabs];
  const selected = collections.find((c) => c.slug === tab);
  const list = (
    tab === "all"
      ? products
      : products.filter((p) => p.collections.includes(selected?.id || ""))
  ).slice(0, 4);
  return (
    <>
      <Hero />
      <div className="utility-strip">
        <Link href="/collections/summer">
          Summer days <ArrowRight size={16} />
        </Link>
        <Link href="/collections/winter">
          Winter layers <ArrowRight size={16} />
        </Link>
        <Link href="/pages/size-guide">
          Find their size <ArrowRight size={16} />
        </Link>
      </div>
      <div className="home-sections">
        {settings.homeOrder.includes("editorial") && (
          <section
            className="season-section section"
            style={{ order: settings.homeOrder.indexOf("editorial") * 2 }}
            aria-labelledby="seasons-heading"
          >
            <h2 id="seasons-heading">A season for every adventure</h2>
            <SeasonCards />
          </section>
        )}
        <section
          className="category-section section"
          style={{ order: 1 }}
          aria-labelledby="categories-heading"
        >
          <div className="section-heading">
            <h2 id="categories-heading">Shop all categories</h2>
            <Link href="/collections" className="text-link">
              Explore all
              <ArrowRight size={18} />
            </Link>
          </div>
          <CategoryCircles />
        </section>
        {settings.homeOrder.includes("arrivals") && (
          <section
            className="arrivals section"
            style={{ order: settings.homeOrder.indexOf("arrivals") * 2 }}
          >
            <div className="section-heading">
              <h2>Little wardrobe favourites</h2>
              <div
                className="tabs"
                role="tablist"
                aria-label="New arrivals categories"
              >
                {tabs.map((t, index) => (
                  <button
                    key={t}
                    role="tab"
                    id={`arrival-tab-${t}`}
                    aria-controls="arrival-panel"
                    tabIndex={tab === t ? 0 : -1}
                    onKeyDown={(e) => {
                      let next: number;
                      if (e.key === "ArrowRight")
                        next = (index + 1) % tabs.length;
                      else if (e.key === "ArrowLeft")
                        next = (index - 1 + tabs.length) % tabs.length;
                      else if (e.key === "Home") next = 0;
                      else if (e.key === "End") next = tabs.length - 1;
                      else return;
                      e.preventDefault();
                      setTab(tabs[next]);
                      document
                        .getElementById(`arrival-tab-${tabs[next]}`)
                        ?.focus();
                    }}
                    aria-selected={tab === t}
                    className={tab === t ? "selected" : ""}
                    onClick={() => setTab(t)}
                  >
                    {t === "all"
                      ? "All"
                      : collections.find((c) => c.slug === t)?.title || t}
                  </button>
                ))}
              </div>
            </div>
            <div
              className="product-grid"
              role="tabpanel"
              id="arrival-panel"
              aria-labelledby={`arrival-tab-${tab}`}
              aria-label={`${tab} arrivals`}
            >
              {list.map((p, i) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  priority={i < 4}
                  from={
                    "/collections/" + (tab === "all" ? "new-arrivals" : tab)
                  }
                />
              ))}
            </div>
            {list.length === 0 && (
              <p className="empty">
                A new edit is on its way. Check back soon.
              </p>
            )}
            {demo && (
              <p className="sample-catalogue">
                Sample catalogue · AI-generated imagery · Test orders only
              </p>
            )}
            <div className="center">
              <Cta href="/collections/new-arrivals" outline>
                View all arrivals
              </Cta>
            </div>
          </section>
        )}
      </div>
      <HomeFaq />
      <RecentPurchase />
    </>
  );
}
