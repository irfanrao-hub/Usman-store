"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useStore } from "./store-context";
import { ProductCard } from "./product-card";
import { Cta, Photo } from "./ui";
export function Home() {
  const { products, settings, collections } = useStore();
  const [tab, setTab] = useState("all");
  const [slide, setSlide] = useState(0);
  const slides = [
    {
      title: settings.heroTitle,
      text: settings.heroText,
      href: "/collections/new-arrivals",
      image: settings.heroImage,
      second: "/images/gallery-1.jpg",
    },
    {
      title: "A new|daily uniform.",
      text: "Easy shapes. Endless possibilities.",
      href: "/collections/tshirts",
      image: "/images/product-3.jpg",
      second: "/images/product-4.jpg",
    },
    {
      title: "Your denim.|Your rules.",
      text: "Find the fit that feels like you.",
      href: "/collections/denim",
      image: "/images/denim-2.jpg",
      second: "/images/denim-1.jpg",
    },
  ];
  const current = slides[slide];
  const tabs = ["all", ...settings.homeTabs];
  const selected = collections.find((c) => c.slug === tab);
  const list = (
    tab === "all"
      ? products
      : products.filter((p) => p.collections.includes(selected?.id || ""))
  ).slice(0, 4);
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <h1>
            {current.title.split("|").map((t, i) => (
              <span key={i}>{t}</span>
            ))}
          </h1>
          <p>{current.text}</p>
          <Cta href={current.href}>Explore the collection</Cta>
          <div className="slide-controls">
            <span>0{slide + 1} / 03</span>
            <div>
              {slides.map((_, i) => (
                <button
                  key={i}
                  className={i === slide ? "selected" : ""}
                  onClick={() => setSlide(i)}
                  aria-label={`Show collection ${i + 1}`}
                  aria-pressed={i === slide}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="hero-photo">
          <Photo
            src={current.image}
            alt="Oversized everyday style from the new collection"
            eager
          />
          <Photo src={current.second} alt="Relaxed unisex silhouette" eager />
        </div>
      </section>
      <div className="utility-strip">
        <Link href="/pages/about">Made for every day</Link>
        <Link href="/collections/tshirts">Unisex, by design</Link>
        <Link href="/pages/size-guide">Find your fit</Link>
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
                alt="Relaxed denim from the Hanger reference collection"
              />
            </div>
            <div className="editorial-copy">
              <h2>
                Good denim.
                <br />
                Great days.
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
