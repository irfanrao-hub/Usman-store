"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useStore, api } from "./store-context";
import { ErrorMessage, Photo } from "./ui";
export function InfoPage({ slug }: { slug: string }) {
  const { settings } = useStore();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const titles: Record<string, string> = {
    about: "An everyday point of view.",
    contact: "Let’s talk.",
    faq: "A little clarity.",
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
            src="/images/gallery-1.jpg"
            alt="Relaxed unisex everyday clothing"
          />
          <div className="prose">
            <h2>
              Good pieces.
              <br />
              Your perspective.
            </h2>
            <p>
              {settings.brand} is a demo concept for an everyday wardrobe: easy
              shapes, expressive textures and pieces that work together.
            </p>
            <p>
              This independent local demonstration uses Hanger product
              photography with permission from the person commissioning the
              build. FORME is a placeholder brand. It is not Hanger’s official
              store.
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
              Leave a message for the store owner. In this demo, your message is
              saved locally in administration.
            </p>
            <p>
              {settings.contactEmail ||
                "A customer support email has not been configured yet."}
            </p>
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
        <div className="prose faq">
          {[
            [
              "Is this a live store?",
              "No. This is an explicitly labeled local demonstration. Checkout never charges real money or ships products.",
            ],
            [
              "How do I choose a size?",
              "Open the size guide on each product. Demo measurements must be verified by the owner before launch.",
            ],
            [
              "Where can I find my order?",
              "Visit your account or use your private tracking link from the order confirmation.",
            ],
            ["What are the delivery charges?", settings.shippingPolicy],
            ["Can I return an item?", settings.returns],
            [
              "How do I reset my password?",
              "Use Forgot your password on the sign-in screen. Demo recovery links are written to the owner’s local outbox; no email is sent.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      ) : (
        <div className="prose">
          {slug === "shipping"
            ? settings.shippingPolicy
            : slug === "returns"
              ? settings.returns
              : slug === "privacy"
                ? settings.privacy
                : "Check the size guide on each product for its garment measurements. Compare them with a piece you already own. Demo measurements are illustrative and require the owner’s approval."}
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
