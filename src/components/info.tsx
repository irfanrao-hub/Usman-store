"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useStore, api } from "./store-context";
import { ErrorMessage, Photo } from "./ui";
import { brand } from "@/lib/brand";
import { FaqList } from "./faq";
import { StoreIcon } from "./store-icons";
export function InfoPage({ slug }: { slug: string }) {
  const { settings } = useStore();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const titles: Record<string, string> = {
    about: "For their little world.",
    contact: "Let’s talk.",
    faq: "Frequently asked questions",
    shipping: "On its way to you.",
    returns: "Room to reconsider.",
    privacy: "Your privacy matters.",
    "size-guide": "Find your fit.",
  };
  return (
    <div className="section info-page">
      <div className="page-intro">
        <div className="breadcrumb">
          <Link href="/">Home</Link> / {slug.replaceAll("-", " ")}
        </div>
        <h1>{titles[slug]}</h1>
      </div>
      {slug === "about" ? (
        <div className="about-layout">
          <Photo
            src="/images/kids-hero.webp"
            alt="Children wearing Knit & Kin kidswear preview outfits"
          />
          <div className="prose">
            <h2>
              Little outfits.
              <br />
              Big adventures.
            </h2>
            <p>
              Meet {settings.brand}: kidswear for their little world, with
              Summer and Winter collections to explore as they grow.
            </p>
            <p>
              From playful T-shirts and dresses to rompers, matching sets and
              cosy layers, find their next favourite. Follow Knit &amp; Kin for
              the latest collection updates.
            </p>
            <Link className="button" href="/collections/new-arrivals">
              Meet the collection
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      ) : slug === "contact" ? (
        <div className="info-columns">
          <div className="prose">
            <h2>Need a hand?</h2>
            <p>
              Questions about an outfit or your child’s size? Email Knit &amp;
              Kin or find us on Instagram and Facebook.
            </p>
            <p>
              <a href={`mailto:${settings.contactEmail}`}>
                {settings.contactEmail}
              </a>
            </p>
            <div className="social-links">
              <a
                href={brand.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Knit & Kin on Instagram"
              >
                <StoreIcon name="instagram" />
              </a>
              <a
                href={brand.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Knit & Kin on Facebook"
              >
                <StoreIcon name="facebook" />
              </a>
            </div>
            <Link href="/pages/faq" className="text-link">
              Read the frequently asked questions
              <ArrowRight size={16} />
            </Link>
          </div>
          <form
            className="stack-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const form = e.currentTarget;
              try {
                const r = await api<{ message: string }>(
                  "contact",
                  Object.fromEntries(new FormData(form)),
                );
                setMessage(r.message);
                form.reset();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <p className="muted small">
              Preview message form: messages are saved in store administration.
              For a reply, use the email address above.
            </p>
            <label>
              Name
              <input name="name" required minLength={2} />
            </label>
            <label>
              Email
              <input name="email" type="email" required />
            </label>
            <label>
              Your message
              <textarea name="message" rows={5} required minLength={10} />
            </label>
            <ErrorMessage message={error} />
            {message && (
              <p className="success-message" role="status">
                {message}
              </p>
            )}
            <button className="button" disabled={busy}>
              Save message
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      ) : slug === "faq" ? (
        <FaqList />
      ) : (
        <div className="prose">
          {slug === "shipping"
            ? settings.shippingPolicy
            : slug === "returns"
              ? settings.returns
              : slug === "privacy"
                ? settings.privacy
                : "Check the size guide on each product for its garment measurements. Compare them with a garment that fits your child comfortably. Demo measurements are illustrative and require the owner’s approval."}
          {slug === "privacy" && (
            <p>
              Product viewing counts use a hashed session identifier and a
              per-tab identifier. A visit stops counting after 90 seconds
              without activity; expired entries are removed on the next activity
              update. Recent-order notices show only a public product and order
              time, never customer details.
            </p>
          )}
          <p className="notice">
            Demo content — business details and policies require owner approval
            before launch.
          </p>
          <Link className="text-link" href="/pages/contact">
            Need help? Get in touch
            <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </div>
  );
}
