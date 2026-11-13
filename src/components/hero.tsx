"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Pause,
  Play,
  MoveHorizontal,
} from "lucide-react";
import { useStore } from "./store-context";
import { Cta, Photo } from "./ui";

export function Hero() {
  const { settings } = useStore();
  const [slide, setSlide] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [visible, setVisible] = useState(true);
  const [onScreen, setOnScreen] = useState(true);
  const root = useRef<HTMLElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const slides = [
    {
      title: settings.heroTitle,
      text: settings.heroText,
      href: "/collections/new-arrivals",
      images: [settings.heroImage],
      alt: "Children wearing lavender and sage layers in the Knit & Kin kidswear preview",
    },
    {
      title: "Hello sunshine.|Let’s play.",
      text: "Summer styles for their everyday adventures.",
      href: "/collections/summer",
      images: ["/images/kids-summer.webp"],
      alt: "Children wearing a yellow dress and sage summer co-ord",
    },
    {
      title: "Little layers.|Cosy days.",
      text: "Discover their next favourite winter outfit.",
      href: "/collections/winter",
      images: ["/images/kids-winter.webp"],
      alt: "Children in a lilac sweatshirt and peach quilted winter jacket",
    },
  ];
  const current = slides[slide];
  const rotating = playing && !hovered && !reduced && visible && onScreen;
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    const visibility = () => setVisible(!document.hidden);
    sync();
    visibility();
    media.addEventListener("change", sync);
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(([entry]) =>
      setOnScreen(entry.isIntersecting),
    );
    if (root.current) observer.observe(root.current);
    return () => {
      media.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", visibility);
      observer.disconnect();
    };
  }, []);
  useEffect(() => {
    if (!rotating) return;
    const timer = setInterval(() => setSlide((s) => (s + 1) % 3), 6500);
    return () => clearInterval(timer);
  }, [rotating]);
  function show(index: number) {
    setPlaying(false);
    setSlide((index + slides.length) % slides.length);
  }
  return (
    <section
      className="hero"
      ref={root}
      aria-label="Featured collections"
      aria-roledescription="carousel"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={(event) => {
        if (!(event.target as HTMLElement).closest("[data-rotation-control]"))
          setPlaying(false);
      }}
    >
      <div className="hero-copy">
        <div
          className="hero-message"
          key={slide}
          aria-live={rotating ? "off" : "polite"}
        >
          <h1>
            {current.title.split("|").map((line, i) => (
              <span key={i}>
                {i > 0 && " "}
                {line}
              </span>
            ))}
          </h1>
          <p>{current.text}</p>
          <Cta href={current.href}>
            {slide === 0
              ? "Shop new arrivals"
              : slide === 1
                ? "Shop summer"
                : "Shop winter"}
          </Cta>
          <div className="hero-season-links">
            <Link href="/collections/summer">Summer</Link>
            <span aria-hidden="true">/</span>
            <Link href="/collections/winter">Winter</Link>
          </div>
        </div>
        <div className="slide-controls">
          <span className="slide-number">0{slide + 1} / 03</span>
          <div className="slide-dots">
            {slides.map((s, i) => (
              <button
                key={s.href}
                className={i === slide ? "selected" : ""}
                onClick={() => show(i)}
                aria-label={`Show collection ${i + 1}`}
                aria-pressed={i === slide}
              />
            ))}
          </div>
          <div className="slide-arrows">
            <button
              aria-label="Previous collection"
              onClick={() => show(slide - 1)}
            >
              <ArrowLeft size={17} />
            </button>
            <button
              aria-label="Next collection"
              onClick={() => show(slide + 1)}
            >
              <ArrowRight size={17} />
            </button>
            {!reduced && (
              <button
                data-rotation-control
                aria-label={playing ? "Pause slideshow" : "Play slideshow"}
                onClick={() => setPlaying((p) => !p)}
              >
                {playing ? <Pause size={14} /> : <Play size={14} />}
              </button>
            )}
          </div>
        </div>
      </div>
      <div
        className="hero-photo"
        tabIndex={0}
        role="group"
        aria-label="Swipe or use arrow keys to change collection"
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            show(slide + (e.key === "ArrowLeft" ? -1 : 1));
          }
        }}
        onPointerDown={(e) => {
          start.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          start.current = null;
        }}
        onPointerUp={(e) => {
          if (!start.current) return;
          const dx = e.clientX - start.current.x;
          const dy = e.clientY - start.current.y;
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy))
            show(slide + (dx < 0 ? 1 : -1));
          start.current = null;
        }}
      >
        <div
          className="hero-track"
          style={{ transform: `translateX(-${slide * 100}%)` }}
        >
          {slides.map((s, index) => (
            <div
              className="hero-frame"
              key={s.href}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of 3`}
              aria-hidden={index !== slide}
            >
              {s.images.map((src, i) => (
                <Photo
                  key={`${src}-${i}`}
                  src={src}
                  alt={i === 0 ? s.alt : ""}
                  eager={index === 0}
                  sizes="(max-width: 700px) 100vw, 56vw"
                />
              ))}
            </div>
          ))}
        </div>
        <span className="swipe-hint">
          <MoveHorizontal size={17} /> Swipe to explore
        </span>
      </div>
    </section>
  );
}
