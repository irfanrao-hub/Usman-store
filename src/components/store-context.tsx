"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type {
  CartItem,
  Product,
  Settings,
  Collection,
  PublicUser,
} from "@/lib/types";
export async function api<T>(
  path: string,
  body?: unknown,
  method = "POST",
): Promise<T> {
  const res = await fetch("/api/" + path, {
    method: body === undefined ? "GET" : method,
    headers:
      body === undefined
        ? {}
        : { "Content-Type": "application/json", "X-Forme-Request": "1" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}
type Store = {
  items: CartItem[];
  ready: boolean;
  add: (id: string, quantity: number) => void;
  setQuantity: (id: string, n: number) => void;
  clear: () => void;
  bagOpen: boolean;
  setBagOpen: (v: boolean) => void;
  products: Product[];
  collections: Collection[];
  settings: Settings;
  demo: boolean;
  user: PublicUser | null;
  refreshUser: () => Promise<void>;
  notify: (text: string) => void;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({
  children,
  products,
  collections,
  settings,
  demo,
}: {
  children: ReactNode;
  products: Product[];
  collections: Collection[];
  settings: Settings;
  demo: boolean;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [toast, setToast] = useState("");
  const sessionRequest = useRef<Promise<void> | null>(null);
  const refreshUser = useCallback(() => {
    if (!sessionRequest.current) {
      sessionRequest.current = api<{ user: PublicUser | null }>("session")
        .then((result) => setUser(result.user))
        .catch(() => setUser(null))
        .finally(() => {
          sessionRequest.current = null;
        });
    }
    return sessionRequest.current;
  }, []);
  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("knitandkin-cart-v1") ||
          localStorage.getItem("forme-cart-v1") ||
          "[]",
      );
      if (Array.isArray(stored))
        setItems(
          stored
            .filter(
              (i) =>
                i !== null &&
                typeof i === "object" &&
                typeof i.variantId === "string" &&
                Number.isInteger(i.quantity) &&
                i.quantity > 0 &&
                i.quantity <= 20,
            )
            .slice(0, 50),
        );
    } catch {
      /* Preserve the last safe state when storage or revalidation is unavailable. */
    }
    setReady(true);
    document.body.dataset.storeReady = "true";
    void refreshUser();
  }, [refreshUser]);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem("knitandkin-cart-v1", JSON.stringify(items));
      } catch {
        /* The bag remains usable for this tab when storage is disabled. */
      }
    }
  }, [items, ready]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  const stockFor = (id: string) =>
    products.flatMap((p) => p.variants).find((v) => v.id === id)?.stock || 0;
  const setQuantity = (id: string, n: number) =>
    setItems((prev) =>
      n <= 0
        ? prev.filter((i) => i.variantId !== id)
        : prev.map((i) =>
            i.variantId === id
              ? { ...i, quantity: Math.max(1, Math.min(20, n, stockFor(id))) }
              : i,
          ),
    );
  const add = (id: string, quantity: number) => {
    const stock = stockFor(id);
    if (!stock || !Number.isInteger(quantity) || quantity < 1) {
      setToast("Please choose an available size.");
      return;
    }
    setItems((prev) => {
      const found = prev.find((i) => i.variantId === id);
      return found
        ? prev.map((i) =>
            i.variantId === id
              ? { ...i, quantity: Math.min(20, stock, i.quantity + quantity) }
              : i,
          )
        : [...prev, { variantId: id, quantity: Math.min(20, stock, quantity) }];
    });
    setBagOpen(true);
  };
  return (
    <Context.Provider
      value={{
        items,
        ready,
        add,
        setQuantity,
        clear: () => setItems([]),
        bagOpen,
        setBagOpen,
        products,
        collections,
        settings,
        demo,
        user,
        refreshUser,
        notify: setToast,
      }}
    >
      {children}
      <div className={`toast ${toast ? "visible" : ""}`} role="status">
        {toast}
      </div>
    </Context.Provider>
  );
}
export function useStore() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("Store context missing");
  return ctx;
}
