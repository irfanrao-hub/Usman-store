"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, Clock, TriangleAlert, Copy, ArrowRight } from "lucide-react";
import { api, useStore } from "./store-context";
import { ErrorMessage, Photo, Cta } from "./ui";
import { money, type Order } from "@/lib/types";
export function Tracking() {
  const router = useRouter();
  return (
    <div className="section narrow">
      <div className="page-intro">
        <h1>Follow your order.</h1>
        <p>
          Use the order number and private tracking key from your confirmation.
        </p>
      </div>
      <form
        className="stack-form"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          router.push(
            `/orders/${encodeURIComponent(String(d.get("id")).trim())}?token=${encodeURIComponent(String(d.get("token")).trim())}`,
          );
        }}
      >
        <label>
          Order number
          <input name="id" placeholder="FM-…" required />
        </label>
        <label>
          Private tracking key
          <input name="token" autoComplete="off" required />
        </label>
        <button className="button">
          Track order
          <ArrowRight size={18} />
        </button>
      </form>
    </div>
  );
}
export function OrderPage({ id }: { id: string }) {
  const params = useSearchParams();
  const { notify } = useStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const token = params.get("token") || "";
  useEffect(() => {
    const key = token || localStorage.getItem("forme-order-" + id) || "";
    api<Order>(
      `orders/${encodeURIComponent(id)}${key ? "?token=" + encodeURIComponent(key) : ""}`,
    )
      .then(setOrder)
      .catch((e) => setError(e.message));
  }, [id, token]);
  if (error)
    return (
      <div className="empty">
        <h1>We couldn’t find that order.</h1>
        <ErrorMessage message={error} />
        <Cta href="/track">Try your tracking details</Cta>
      </div>
    );
  if (!order)
    return (
      <div className="empty" role="status">
        Finding your order…
      </div>
    );
  const success = order.payment_status === "sandbox_paid";
  const pending = order.payment_status === "pending";
  return (
    <div className="section order-page">
      <div className="order-heading">
        <div className="status-icon">
          {success ? <Check /> : pending ? <Clock /> : <TriangleAlert />}
        </div>
        <h1>
          {success
            ? "Your test order is in."
            : pending
              ? "Payment is pending."
              : "This test order wasn’t completed."}
        </h1>
        <p>
          {success
            ? "No real payment was taken. This order will not be shipped."
            : pending
              ? "Stock is reserved for 15 minutes. The store owner can settle this sandbox payment in administration."
              : "The reserved stock has been released. You can return to your bag and try again."}
        </p>
        <p className="order-number">{order.id}</p>
        {token && (
          <button
            className="text-link"
            onClick={async () => {
              await navigator.clipboard.writeText(location.href);
              notify("Private tracking link copied. Keep it safe.");
            }}
          >
            <Copy size={15} />
            Copy private tracking link
          </button>
        )}
      </div>
      <div className="order-detail-grid">
        <div>
          <h2>Your pieces</h2>
          {order.items.map((i) => (
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
          <div className="summary-line">
            <span>Subtotal</span>
            <span>{money(order.subtotal)}</span>
          </div>
          <div className="summary-line">
            <span>Discount</span>
            <span>− {money(order.discount)}</span>
          </div>
          <div className="summary-line">
            <span>Shipping</span>
            <span>{money(order.shipping)}</span>
          </div>
          <div className="summary-line total">
            <span>Total</span>
            <span>{money(order.total)}</span>
          </div>
        </div>
        <aside>
          <h2>Order details</h2>
          <dl>
            <dt>Payment</dt>
            <dd>{order.payment_status.replaceAll("_", " ")}</dd>
            <dt>Fulfilment</dt>
            <dd>{order.fulfilment_status}</dd>
            <dt>Delivery details</dt>
            <dd>
              {order.customer.name}
              <br />
              {order.customer.address}
              <br />
              {order.customer.city}, {order.customer.region}
            </dd>
            <dt>Email</dt>
            <dd>{order.customer.email}</dd>
          </dl>
          {order.reserved_until && pending && (
            <p className="notice">
              Reservation ends{" "}
              {new Date(order.reserved_until).toLocaleTimeString("en-PK", {
                timeZone: "Asia/Karachi",
              })}{" "}
              PKT.
            </p>
          )}
        </aside>
      </div>
      <div className="center">
        <Link
          className="button"
          href={success || pending ? "/collections/new-arrivals" : "/cart"}
        >
          {success || pending ? "Continue exploring" : "Return to bag"}
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}
