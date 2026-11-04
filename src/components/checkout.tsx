"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, LockKeyhole, Check } from "lucide-react";
import { useStore, api } from "./store-context";
import { ErrorMessage, Photo, Cta } from "./ui";
import { money, type Quote, type Customer } from "@/lib/types";
export function Checkout() {
  const { items, ready, demo, settings, user, clear } = useStore();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState("");
  const [region, setRegion] = useState(settings.regions[0] || "");
  const [outcome, setOutcome] = useState("success");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const idempotency = useRef("");
  useEffect(() => {
    if (!items.length) return;
    let cancelled = false;
    setQuote(null);
    api<Quote>("cart/quote", { items, discountCode: applied, region })
      .then((q) => {
        if (!cancelled) {
          setQuote(q);
          setError("");
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [items, applied, region]);
  if (!ready) return <div className="empty">Preparing checkout…</div>;
  if (!items.length)
    return (
      <div className="empty">
        <h1>Your bag is empty.</h1>
        <Cta href="/collections/new-arrivals">Find your next favourite</Cta>
      </div>
    );
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current || !quote) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    const customer = Object.fromEntries(
      ["name", "email", "phone", "address", "city", "region"].map((k) => [
        k,
        String(data.get(k) || ""),
      ]),
    ) as Customer;
    const fingerprint = JSON.stringify({
      items,
      customer,
      applied,
      outcome,
      total: quote.total,
    });
    const saved = JSON.parse(
      sessionStorage.getItem("forme-checkout-attempt") || "null",
    );
    idempotency.current =
      saved?.fingerprint === fingerprint ? saved.key : crypto.randomUUID();
    sessionStorage.setItem(
      "forme-checkout-attempt",
      JSON.stringify({ fingerprint, key: idempotency.current }),
    );
    try {
      const result = await api<{
        order: { id: string; payment_status: string };
        trackingToken: string | null;
      }>("checkout", {
        items,
        customer,
        discountCode: applied,
        expectedTotal: quote.total,
        outcome,
        idempotencyKey: idempotency.current,
      });
      if (["sandbox_paid", "pending"].includes(result.order.payment_status))
        clear();
      const token = result.trackingToken;
      if (token) localStorage.setItem("forme-order-" + result.order.id, token);
      sessionStorage.removeItem("forme-checkout-attempt");
      router.push(
        `/orders/${result.order.id}${token ? "?token=" + encodeURIComponent(token) : ""}`,
      );
    } catch (e) {
      setError((e as Error).message);
      try {
        setQuote(
          await api<Quote>("cart/quote", {
            items,
            discountCode: applied,
            region,
          }),
        );
      } catch {
        /* Preserve the last safe state when storage or revalidation is unavailable. */
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="section checkout">
      <Link href="/cart" className="back-link">
        <ArrowLeft size={15} />
        Back to bag
      </Link>
      <div className="page-intro">
        <h1>Make it yours.</h1>
        <p>One last step to a fresh perspective.</p>
      </div>
      <div className="notice">
        <LockKeyhole size={20} />
        <div>
          <strong>{demo ? "Sandbox checkout" : "Checkout unavailable"}</strong>
          <p>
            {demo
              ? "This is a test order. No real payment will be collected and nothing will be shipped."
              : "A live payment provider has not been configured."}
          </p>
        </div>
      </div>
      <div className="checkout-layout">
        <form onSubmit={submit} className="checkout-form">
          <h2>Contact &amp; delivery</h2>
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={user?.email}
            />
          </label>
          <label>
            Full name
            <input
              name="name"
              required
              minLength={2}
              autoComplete="name"
              defaultValue={user?.name}
            />
          </label>
          <label>
            Phone number
            <input
              name="phone"
              type="tel"
              pattern="[+0-9 ()-]{7,20}"
              autoComplete="tel"
              placeholder="+92"
              required
            />
          </label>
          <label>
            Street address
            <input
              name="address"
              minLength={8}
              autoComplete="street-address"
              required
            />
          </label>
          <div className="form-row">
            <label>
              City
              <input
                name="city"
                autoComplete="address-level2"
                minLength={2}
                required
              />
            </label>
            <label>
              Region
              <select
                aria-label="Region"
                name="region"
                autoComplete="address-level1"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                {settings.regions.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="muted">Country: Pakistan · Demo delivery regions</p>
          <h2>Test payment outcome</h2>
          <label>
            Sandbox result
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            >
              <option value="success">Successful test payment</option>
              <option value="failed">Failed test payment</option>
              <option value="cancelled">Cancelled test payment</option>
              <option value="delayed">
                Delayed — reserve stock for 15 minutes
              </option>
            </select>
          </label>
          <p className="muted">
            No card details are needed. Delayed orders can be settled from
            administration before the reservation expires.
          </p>
          <ErrorMessage message={error} />
          <button
            className="button full"
            disabled={busy || !quote || !demo}
            type="submit"
          >
            {busy ? "Creating test order…" : "Place sandbox order"}
            <ArrowRight size={18} />
          </button>
          <p className="small muted">
            By placing a test order, you acknowledge the{" "}
            <Link href="/pages/privacy">demo privacy notice</Link>.
          </p>
        </form>
        <aside className="checkout-summary">
          <h2>Your edit</h2>
          {quote?.items.map((i) => (
            <div className="checkout-item" key={i.variantId}>
              <Photo src={i.image} alt={i.title} />
              <div>
                <strong>{i.title}</strong>
                <p>
                  {i.color} / {i.size} · Qty {i.quantity}
                </p>
              </div>
              <span>{money(i.price * i.quantity)}</span>
            </div>
          ))}
          <form
            className="discount-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              try {
                const q = await api<Quote>("cart/quote", {
                  items,
                  discountCode: code,
                  region,
                });
                setQuote(q);
                setApplied(code);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <label className="sr-only" htmlFor="discount">
              Discount code
            </label>
            <input
              id="discount"
              placeholder="Discount code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <button className="button outline" type="submit">
              Apply
            </button>
          </form>
          {applied && (
            <button
              className="text-link"
              onClick={() => {
                setCode("");
                setApplied("");
              }}
            >
              Remove {applied}
            </button>
          )}
          {demo && (
            <p className="small muted">
              Demo code HELLO10: 10% off orders from Rs. 2,000.
            </p>
          )}
          <div className="summary-line">
            <span>Subtotal</span>
            <span>{quote ? money(quote.subtotal) : "—"}</span>
          </div>
          <div className="summary-line">
            <span>Discount</span>
            <span>{quote ? "- " + money(quote.discount) : "—"}</span>
          </div>
          <div className="summary-line">
            <span>Shipping</span>
            <span>
              {quote ? (quote.shipping ? money(quote.shipping) : "Free") : "—"}
            </span>
          </div>
          <div className="summary-line total">
            <span>Total (PKR)</span>
            <span>{quote ? money(quote.total) : "—"}</span>
          </div>
          <p className="small muted">
            <Check size={13} /> Prices verified by the server at checkout.
          </p>
        </aside>
      </div>
    </div>
  );
}
