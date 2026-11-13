"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { api, useStore } from "./store-context";
import { Photo } from "./ui";
import type { RecentOrder } from "@/lib/activity";

export function ProductActivity({ productId }: { productId: string }) {
  const { demo, refreshUser } = useStore();
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const tabId = crypto.randomUUID();
    let cancelled = false;
    let stopped = false;
    let initialized = false;
    let pending = false;
    const send = async (active: boolean) => {
      if (pending || stopped || !initialized) return;
      pending = true;
      try {
        const result = await api<{ enabled: boolean; viewers?: number }>(
          "activity/view",
          { productId, tabId, active },
        );
        if (!cancelled) {
          if (!result.enabled) stopped = true;
          setCount(result.enabled && active ? (result.viewers ?? null) : null);
        }
      } catch {
        if (!cancelled) setCount(null);
      } finally {
        pending = false;
      }
    };
    const sync = () => {
      void send(!document.hidden);
    };
    void refreshUser().then(() => {
      if (!cancelled) {
        initialized = true;
        sync();
      }
    });
    const timer = setInterval(() => {
      if (!document.hidden) sync();
    }, 30_000);
    document.addEventListener("visibilitychange", sync);
    const leave = () => {
      if (initialized && !stopped)
        void fetch("/api/activity/view", {
          method: "POST",
          keepalive: true,
          headers: {
            "Content-Type": "application/json",
            "X-Forme-Request": "1",
          },
          body: JSON.stringify({ productId, tabId, active: false }),
        }).catch(() => {});
    };
    window.addEventListener("pagehide", leave);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [productId, refreshUser]);
  if (!count) return null;
  return (
    <p
      className="product-activity"
      title="Unique active browser sessions in the last 90 seconds, including you."
    >
      <span className="activity-dot" aria-hidden="true" />
      <span>
        <strong>{count}</strong> {count === 1 ? "person is" : "people are"}{" "}
        viewing {demo ? "this preview" : "this right now"}
        <span className="sr-only">, including you</span>
      </span>
    </p>
  );
}

export function RecentPurchase() {
  const { refreshUser } = useStore();
  const [order, setOrder] = useState<RecentOrder | null>(null);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (dismissed) return;
    const load = async () => {
      if (document.hidden) return;
      try {
        const result = await api<{ recent: RecentOrder | null }>(
          "activity/recent",
        );
        if (!cancelled) setOrder(result.recent);
      } catch {
        if (!cancelled) setOrder(null);
      }
    };
    void refreshUser().then(() => {
      if (!cancelled) void load();
    });
    const timer = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [dismissed, refreshUser]);
  if (!order || dismissed) return null;
  return (
    <aside className="recent-order" aria-label="Last order">
      <Link href={`/products/${order.slug}`}>
        {order.image && <Photo src={order.image} alt="" sizes="60px" />}
        <span>
          Last order<strong>{order.title}</strong>
          <time dateTime={order.orderedAt}>
            {new Intl.DateTimeFormat("en-PK", {
              day: "numeric",
              month: "short",
              hour: "numeric",
              minute: "2-digit",
              timeZone: "Asia/Karachi",
            }).format(new Date(order.orderedAt))}{" "}
            PKT
          </time>
        </span>
      </Link>
      <button
        aria-label="Dismiss last order"
        onClick={() => setDismissed(true)}
      >
        <X size={16} />
      </button>
    </aside>
  );
}
