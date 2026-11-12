"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { Hero } from "./hero";
import { useStore } from "./store-context";
import { ProductCard } from "./product-card";
import { Cta, Photo } from "./ui";
export function Home() {
  const { products, settings, collections } = useStore();
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
        <Link href="/pages/about">
          Made for every day <ArrowRight size={16} />
        </Link>
        <Link href="/collections/tshirts">
          Unisex, by design <ArrowRight size={16} />
        </Link>
        <Link href="/pages/size-guide">
          Find your fit <ArrowRight size={16} />
        </Link>
      </div>
      <div className="home-sections">
        {settings.homeOrder.includes("arrivals") && (
          <section
            className="arrivals section"
            style={{ order: settings.homeOrder.indexOf("arrivals") }}
          >
            <div className="section-heading">
              <h2>New &amp; noteworthy</h2>
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
            <div className="center">
              <Cta href="/collections/new-arrivals" outline>
                View all arrivals
              </Cta>
            </div>
          </section>
        )}
        {settings.homeOrder.includes("editorial") && (
          <section
            className="editorial"
            style={{ order: settings.homeOrder.indexOf("editorial") }}
          >
            <div className="editorial-image">
              <Photo
                src="/images/category-denim.jpg"
                alt="Relaxed blue denim jeans, an everyday Knit & Kin look"
              />
            </div>
            <div className="editorial-copy">
              <h2>
                Good denim.
                <br />
                <em>Great days.</em>
              </h2>
              <p>Find your everyday fit.</p>
              <Cta href="/collections/denim">Discover denim</Cta>
            </div>
          </section>
        )}
      </div>
      <div className="editorial-note">
        <Link href="/pages/about">
          Meet the everyday edit <ArrowUpRight size={16} />
        </Link>
      </div>
    </>
  );
}
