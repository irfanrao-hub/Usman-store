"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
export function Motion() {
  const path = usePathname();
  useEffect(() => {
    let cancelled = false;
    let cleanup: undefined | (() => void);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    Promise.all([import("gsap"), import("gsap/ScrollTrigger")])
      .then(([{ gsap }, { ScrollTrigger }]) => {
        if (cancelled) return;
        gsap.registerPlugin(ScrollTrigger);
        const mm = gsap.matchMedia();
        mm.add("(prefers-reduced-motion: no-preference)", () => {
          const ctx = gsap.context(() => {
            gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
              gsap.from(el, {
                y: 24,
                duration: 0.7,
                ease: "power2.out",
                clearProps: "transform",
                scrollTrigger: { trigger: el, start: "top 95%", once: true },
              });
            });
            if (
              innerWidth > 760 &&
              document.querySelector(".editorial-image img")
            )
              gsap.fromTo(
                ".editorial-image img",
                { y: -25 },
                {
                  y: 25,
                  ease: "none",
                  scrollTrigger: {
                    trigger: ".editorial",
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 1,
                  },
                },
              );
          });
          const refresh = () => ScrollTrigger.refresh();
          document.querySelectorAll("img").forEach((i) => {
            if (!i.complete)
              i.addEventListener("load", refresh, { once: true });
          });
          return () => {
            ctx.revert();
            document
              .querySelectorAll("img")
              .forEach((i) => i.removeEventListener("load", refresh));
          };
        });
        cleanup = () => mm.revert();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [path]);
  return null;
}
