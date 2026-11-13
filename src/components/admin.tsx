"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  Settings2,
  Ticket,
  ClipboardList,
  Mail,
  ArrowUpRight,
  Plus,
  LogOut,
  Menu,
  Search,
  ArrowLeft,
  Trash2,
  ArrowUp,
  ArrowDown,
  Upload,
  Check,
  X,
} from "lucide-react";
import { api, useStore } from "./store-context";
import { ErrorMessage, Photo, Modal } from "./ui";
import {
  type Product,
  type Collection,
  type Settings,
  type PublicUser,
  type Order,
  money,
} from "@/lib/types";
type Discount = {
  code: string;
  percent: number;
  expires_at: string;
  minimum: number;
  limit_uses: number;
  uses: number;
  active: number;
};
type AdminData = {
  user: PublicUser;
  products: Product[];
  collections: Collection[];
  settings: Settings;
  settingsVersion: number;
  orders: Order[];
  discounts: Discount[];
  audit: {
    id: number;
    actor: string;
    action: string;
    entity: string;
    detail: string;
    created_at: string;
  }[];
  outbox: {
    id: string;
    recipient: string;
    subject: string;
    body: string;
    created_at: string;
  }[];
  messages: { id: string; name: string; email: string; message: string }[];
  demo: boolean;
};
type Section =
  | "overview"
  | "products"
  | "collections"
  | "orders"
  | "discounts"
  | "settings"
  | "audit"
  | "inbox";
const sections = [
  ["overview", "Overview", LayoutDashboard],
  ["products", "Products", Package],
  ["collections", "Collections", Layers],
  ["orders", "Orders", ShoppingBag],
  ["discounts", "Discounts", Ticket],
  ["settings", "Store settings", Settings2],
  ["audit", "Activity log", ClipboardList],
  ["inbox", "Inbox & outbox", Mail],
] as const;
export function Admin() {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");
  const [section, setSection] = useState<Section>("overview");
  const [editProduct, setEditProduct] = useState<Product | "new" | null>(null);
  const [editCollection, setEditCollection] = useState<
    Collection | "new" | null
  >(null);
  const [search, setSearch] = useState("");
  const [nav, setNav] = useState(false);
  const [confirm, setConfirm] = useState<{
    title: string;
    action: () => Promise<unknown>;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const { notify, refreshUser } = useStore();
  const router = useRouter();
  const load = async () => {
    const r = await api<AdminData>("admin/data");
    setData(r);
    setError("");
  };
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  async function perform(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
      router.refresh();
      notify("Changes saved.");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <div className="empty">
        <p>{error || "Opening administration…"}</p>
        {error && (
          <Link className="button" href="/admin/login">
            Sign in again
          </Link>
        )}
      </div>
    );
  const owner = data.user.role === "owner";
  const orderAction = async (id: string, action: string) => {
    await perform(() => api("admin/orders", { id, action }));
  };
  const filtered = data.products.filter((p) =>
    (p.title + " " + p.slug + " " + p.variants.map((v) => v.sku).join(" "))
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <div className="admin-shell">
      <aside
        id="admin-navigation"
        className={`admin-sidebar ${nav ? "open" : ""}`}
        onKeyDown={(e) => {
          if (e.key === "Escape" && nav) {
            setNav(false);
            document.getElementById("admin-menu-toggle")?.focus();
          }
        }}
      >
        <Link href="/" className="wordmark">
          {data.settings.brand}
        </Link>
        <p className="admin-label">STORE ADMINISTRATION</p>
        <nav aria-label="Administration">
          {sections
            .filter(
              ([id]) =>
                owner ||
                !["discounts", "settings", "audit", "inbox"].includes(id),
            )
            .map(([id, label, Icon]) => (
              <button
                key={id}
                className={section === id ? "selected" : ""}
                onClick={() => {
                  if (
                    document.body.dataset.adminDirty === "true" &&
                    !window.confirm("Discard unsaved changes?")
                  )
                    return;
                  setSection(id);
                  setEditProduct(null);
                  setEditCollection(null);
                  setNav(false);
                  if (window.matchMedia("(max-width: 767px)").matches)
                    document.getElementById("admin-menu-toggle")?.focus();
                }}
              >
                <Icon size={18} />
                {label}
                {id === "orders" && <span>{data.orders.length}</span>}
              </button>
            ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link href="/" target="_blank">
            View storefront
            <ArrowUpRight size={16} />
          </Link>
          <div className="admin-user">
            <span className="avatar">{data.user.name[0]}</span>
            <div>
              {data.user.name}
              <small>{data.user.role}</small>
            </div>
            <button
              className="icon-button"
              aria-label="Sign out"
              onClick={async () => {
                await api("auth/logout", {});
                await refreshUser();
                router.push("/admin/login");
                router.refresh();
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="icon-button mobile-menu"
            id="admin-menu-toggle"
            aria-controls="admin-navigation"
            aria-expanded={nav}
            onClick={() => {
              setNav(!nav);
              if (!nav)
                requestAnimationFrame(() =>
                  document
                    .querySelector<HTMLButtonElement>(
                      "#admin-navigation nav button.selected",
                    )
                    ?.focus(),
                );
            }}
            aria-label="Toggle admin navigation"
          >
            <Menu />
          </button>
          <span>{sections.find((s) => s[0] === section)?.[1]}</span>
          <span className="environment-label">
            <span />
            {data.demo
              ? "Sandbox environment"
              : "Live mode — payments unconfigured"}
          </span>
        </header>
        <div className="admin-content">
          <ErrorMessage message={error} />
          {editProduct ? (
            <ProductEditor
              product={editProduct === "new" ? undefined : editProduct}
              collections={data.collections}
              onClose={() => setEditProduct(null)}
              onSave={async (p) => {
                await api("admin/products", p);
                await load();
                setEditProduct(null);
                router.refresh();
                notify("Product saved.");
              }}
            />
          ) : editCollection ? (
            <CollectionEditor
              collection={editCollection === "new" ? undefined : editCollection}
              onClose={() => setEditCollection(null)}
              onSave={async (c) => {
                await api("admin/collections", c);
                await load();
                setEditCollection(null);
                router.refresh();
                notify("Collection saved.");
              }}
            />
          ) : (
            <>
              {section === "overview" && (
                <>
                  <div className="admin-heading">
                    <div>
                      <p className="muted">Your store, at a glance</p>
                      <h1>Welcome back, {data.user.name.split(" ")[0]}.</h1>
                    </div>
                    <button
                      className="button"
                      onClick={() => {
                        setSection("products");
                        setEditProduct("new");
                      }}
                    >
                      Add product
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="stats-grid">
                    <div>
                      <span>Sandbox sales</span>
                      <strong>
                        {money(
                          data.orders
                            .filter((o) => o.payment_status === "sandbox_paid")
                            .reduce((s, o) => s + o.total, 0),
                        )}
                      </strong>
                      <small>Test transactions only</small>
                    </div>
                    <div>
                      <span>Orders</span>
                      <strong>{data.orders.length}</strong>
                      <small>
                        {
                          data.orders.filter(
                            (o) => o.fulfilment_status === "unfulfilled",
                          ).length
                        }{" "}
                        awaiting fulfilment
                      </small>
                    </div>
                    <div>
                      <span>Published products</span>
                      <strong>
                        {
                          data.products.filter((p) => p.status === "published")
                            .length
                        }
                      </strong>
                      <small>
                        Across {data.collections.length} collections
                      </small>
                    </div>
                    <div>
                      <span>Low stock variants</span>
                      <strong>
                        {
                          data.products
                            .flatMap((p) => p.variants)
                            .filter((v) => v.stock <= 3).length
                        }
                      </strong>
                      <small>3 units or fewer</small>
                    </div>
                  </div>
                  <div className="admin-panel">
                    <div className="section-heading">
                      <h2>Recent orders</h2>
                      <button
                        className="text-link"
                        onClick={() => setSection("orders")}
                      >
                        View all
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                    <OrderTable
                      orders={data.orders.slice(0, 5)}
                      onAction={orderAction}
                      confirm={setConfirm}
                    />
                  </div>
                  <div className="notice">
                    <Check size={20} />
                    <div>
                      <strong>Your local demo is ready to explore.</strong>
                      <p>
                        Catalog and orders persist in SQLite. Payments and email
                        delivery are sandbox services. Configure your business
                        details before launch.
                      </p>
                    </div>
                  </div>
                </>
              )}
              {section === "products" && (
                <>
                  <div className="admin-heading">
                    <div>
                      <h1>Products</h1>
                      <p className="muted">The pieces that make your store.</p>
                    </div>
                    <button
                      className="button"
                      onClick={() => setEditProduct("new")}
                    >
                      Add product
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="admin-search">
                    <Search size={18} />
                    <input
                      placeholder="Search by product name or SKU"
                      aria-label="Search admin products"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="admin-panel table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Status</th>
                          <th>Price</th>
                          <th>Inventory</th>
                          <th>Variants</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((p) => (
                          <tr key={p.id}>
                            <td>
                              <button
                                className="table-product"
                                onClick={() => setEditProduct(p)}
                              >
                                <Photo src={p.images[0]} alt="" />
                                <span>
                                  {p.title}
                                  <small>{p.slug}</small>
                                </span>
                              </button>
                            </td>
                            <td>
                              <span className={"status " + p.status}>
                                {p.status}
                              </span>
                            </td>
                            <td>{money(p.price)}</td>
                            <td>
                              {p.variants.reduce((s, v) => s + v.stock, 0)}{" "}
                              available
                            </td>
                            <td>{p.variants.length}</td>
                            <td>
                              <div className="table-actions">
                                <button onClick={() => setEditProduct(p)}>
                                  Edit
                                </button>
                                {owner && (
                                  <button
                                    aria-label={`Delete ${p.title}`}
                                    onClick={() =>
                                      setConfirm({
                                        title: `Delete “${p.title}”? Historical order details are preserved.`,
                                        action: () =>
                                          perform(() =>
                                            api(
                                              "admin/products/" + p.id,
                                              {},
                                              "DELETE",
                                            ),
                                          ),
                                      })
                                    }
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {section === "collections" && (
                <>
                  <div className="admin-heading">
                    <div>
                      <h1>Collections</h1>
                      <p className="muted">Give every piece a place.</p>
                    </div>
                    <button
                      className="button"
                      onClick={() => setEditCollection("new")}
                    >
                      Add collection
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="admin-panel table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Collection</th>
                          <th>Products</th>
                          <th>Position</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.collections.map((c) => (
                          <tr key={c.id}>
                            <td>
                              <button
                                className="table-product"
                                onClick={() => setEditCollection(c)}
                              >
                                <Photo src={c.image} alt="" />
                                <span>
                                  {c.title}
                                  <small>/collections/{c.slug}</small>
                                </span>
                              </button>
                            </td>
                            <td>
                              {
                                data.products.filter((p) =>
                                  p.collections.includes(c.id),
                                ).length
                              }
                            </td>
                            <td>{c.position}</td>
                            <td>
                              <div className="table-actions">
                                <button onClick={() => setEditCollection(c)}>
                                  Edit
                                </button>
                                {owner && (
                                  <button
                                    aria-label={`Delete ${c.title}`}
                                    onClick={() =>
                                      setConfirm({
                                        title: `Delete collection “${c.title}”? Products remain in the catalog.`,
                                        action: () =>
                                          perform(() =>
                                            api(
                                              "admin/collections/" + c.id,
                                              {},
                                              "DELETE",
                                            ),
                                          ),
                                      })
                                    }
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {section === "orders" && (
                <>
                  <div className="admin-heading">
                    <div>
                      <h1>Orders</h1>
                      <p className="muted">
                        Payment and fulfilment, kept separate.
                      </p>
                    </div>
                    <button
                      className="button outline"
                      onClick={() => perform(load)}
                    >
                      Refresh orders
                    </button>
                  </div>
                  <div className="admin-panel">
                    <OrderTable
                      orders={data.orders}
                      onAction={orderAction}
                      confirm={setConfirm}
                    />
                  </div>
                </>
              )}
              {section === "discounts" && owner && (
                <Discounts
                  data={data.discounts}
                  save={(v) => perform(() => api("admin/discounts", v))}
                />
              )}
              {section === "settings" && owner && (
                <SettingsEditor
                  initial={data.settings}
                  version={data.settingsVersion}
                  onSave={(v) => perform(() => api("admin/settings", v))}
                />
              )}
              {section === "audit" && (
                <>
                  <div className="admin-heading">
                    <h1>Activity log</h1>
                  </div>
                  <div className="admin-panel table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Time (UTC)</th>
                          <th>Action</th>
                          <th>Entity</th>
                          <th>Actor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.audit.map((a) => (
                          <tr key={a.id}>
                            <td>{a.created_at}</td>
                            <td>{a.action}</td>
                            <td className="mono">{a.entity}</td>
                            <td className="mono">{a.actor}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {section === "inbox" && (
                <>
                  <div className="admin-heading">
                    <div>
                      <h1>Inbox &amp; outbox</h1>
                      <p className="muted">
                        Local demo messages. No email has been sent.
                      </p>
                    </div>
                  </div>
                  <h2>Customer messages</h2>
                  {data.messages.length ? (
                    data.messages.map((m) => (
                      <article className="admin-panel message-panel" key={m.id}>
                        <h3>
                          {m.name} · {m.email}
                        </h3>
                        <p>{m.message}</p>
                      </article>
                    ))
                  ) : (
                    <p className="empty">No messages yet.</p>
                  )}
                  <h2>Demo email outbox</h2>
                  {data.outbox.map((m) => (
                    <article className="admin-panel message-panel" key={m.id}>
                      <h3>{m.subject}</h3>
                      <p className="muted">
                        To: {m.recipient} · {m.created_at} UTC
                      </p>
                      <p className="break-all">{m.body}</p>
                    </article>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Please confirm"
      >
        <p>{confirm?.title}</p>
        <div className="modal-actions">
          <button className="button outline" onClick={() => setConfirm(null)}>
            Keep it
          </button>
          <button
            className="button danger"
            disabled={busy}
            onClick={async () => {
              await confirm?.action();
              setConfirm(null);
            }}
          >
            Confirm action
          </button>
        </div>
      </Modal>
    </div>
  );
}
function OrderTable({
  orders,
  onAction,
  confirm,
}: {
  orders: Order[];
  onAction: (id: string, action: string) => Promise<void>;
  confirm: (v: { title: string; action: () => Promise<void> }) => void;
}) {
  const [selected, setSelected] = useState<Order | null>(null);
  return (
    <>
      {orders.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Fulfilment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <button
                      className="text-link mono"
                      onClick={() => setSelected(o)}
                    >
                      {o.id}
                    </button>
                    <small className="muted block">{o.created_at}</small>
                  </td>
                  <td>
                    {o.customer.name}
                    <small className="block muted">{o.customer.email}</small>
                  </td>
                  <td>{money(o.total)}</td>
                  <td>
                    <span
                      className={
                        "status " +
                        (o.payment_status === "sandbox_paid"
                          ? "published"
                          : "draft")
                      }
                    >
                      {o.payment_status.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td>{o.fulfilment_status}</td>
                  <td>
                    <div className="table-actions">
                      {o.payment_status === "pending" && (
                        <button onClick={() => onAction(o.id, "settle")}>
                          Settle sandbox
                        </button>
                      )}
                      {o.payment_status === "sandbox_paid" &&
                        o.fulfilment_status === "unfulfilled" && (
                          <button onClick={() => onAction(o.id, "ship")}>
                            Mark shipped
                          </button>
                        )}
                      {o.fulfilment_status === "unfulfilled" && (
                        <button
                          onClick={() =>
                            confirm({
                              title: `Cancel ${o.id} and restore its stock?`,
                              action: () => onAction(o.id, "cancel"),
                            })
                          }
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <ShoppingBag size={32} strokeWidth={1} />
          <h3>Your first order starts here.</h3>
          <p>Place a sandbox order in the storefront to see it here.</p>
        </div>
      )}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.id || "Order"}
      >
        {selected && (
          <>
            <p>
              {selected.customer.name}
              <br />
              {selected.customer.address}
              <br />
              {selected.customer.city}, {selected.customer.region}
              <br />
              {selected.customer.phone}
            </p>
            {selected.items.map((i) => (
              <div className="summary-line" key={i.variantId}>
                <span>
                  {i.quantity} × {i.title} · {i.size}
                  <small className="block muted">{i.sku}</small>
                </span>
                <span>{money(i.price * i.quantity)}</span>
              </div>
            ))}
            <div className="summary-line total">
              <strong>Total</strong>
              <strong>{money(selected.total)}</strong>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
function useUnsaved(dirty: boolean) {
  useEffect(() => {
    document.body.dataset.adminDirty = String(dirty);
    const fn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", fn);
    return () => {
      window.removeEventListener("beforeunload", fn);
      delete document.body.dataset.adminDirty;
    };
  }, [dirty]);
}
function MediaField({
  images,
  onChange,
}: {
  images: string[];
  onChange: (v: string[]) => void;
}) {
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <div className="media-grid">
        {images.map((img, i) => (
          <div className="media-thumb" key={img + i}>
            <Photo src={img} alt={`Product media ${i + 1}`} />
            <div>
              <button
                type="button"
                aria-label={`Move image ${i + 1} earlier`}
                disabled={i === 0}
                onClick={() => {
                  const n = [...images];
                  [n[i - 1], n[i]] = [n[i], n[i - 1]];
                  onChange(n);
                }}
              >
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                aria-label={`Move image ${i + 1} later`}
                disabled={i === images.length - 1}
                onClick={() => {
                  const n = [...images];
                  [n[i + 1], n[i]] = [n[i], n[i + 1]];
                  onChange(n);
                }}
              >
                <ArrowDown size={14} />
              </button>
              <button
                type="button"
                aria-label={`Remove image ${i + 1}`}
                onClick={() => onChange(images.filter((_, j) => j !== i))}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <label className="upload-area">
        <Upload size={22} />
        <span>
          {busy ? `Uploading… ${progress}%` : "Upload a product image"}
        </span>
        <small>JPG, PNG or WebP · 300–6000px · up to 8 MB</small>
        <input
          aria-label="Upload image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setError("");
            setProgress(0);
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/admin/upload");
            xhr.setRequestHeader("X-Forme-Request", "1");
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable)
                setProgress(Math.round((e.loaded / e.total) * 100));
            };
            xhr.onload = () => {
              setBusy(false);
              try {
                const d = JSON.parse(xhr.responseText);
                if (xhr.status >= 400) throw new Error(d.error);
                onChange([...images, d.url]);
              } catch (e) {
                setError((e as Error).message);
              }
            };
            xhr.onerror = () => {
              setBusy(false);
              setError("Upload failed. Select the file again to retry.");
            };
            const form = new FormData();
            form.append("file", file);
            xhr.send(form);
            e.target.value = "";
          }}
        />
      </label>
      <ErrorMessage message={error} />
    </div>
  );
}
function ProductEditor({
  product,
  collections,
  onClose,
  onSave,
}: {
  product?: Product;
  collections: Collection[];
  onClose: () => void;
  onSave: (v: unknown) => Promise<void>;
}) {
  const [images, setImages] = useState(product?.images || []);
  const [variants, setVariants] = useState<
    {
      id?: string;
      product_id: string;
      sku: string;
      size: string;
      color: string;
      stock: number;
    }[]
  >(
    product?.variants.map((v) => ({ ...v })) || [
      {
        id: undefined,
        product_id: "",
        sku: "",
        size: "2–3 Y",
        color: "",
        stock: 0,
      },
    ],
  );
  const [selected, setSelected] = useState(product?.collections || []);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useUnsaved(dirty);
  return (
    <form
      onChange={() => setDirty(true)}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const d = Object.fromEntries(new FormData(e.currentTarget));
        try {
          await onSave({
            ...d,
            id: product?.id,
            version: product?.version,
            images,
            variants,
            collections: selected,
            price: Math.round(Number(d.price) * 100),
            compare_price: Math.round(Number(d.compare_price) * 100),
          });
          setDirty(false);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="admin-heading">
        <div>
          <button
            type="button"
            className="back-link"
            onClick={() => {
              if (!dirty || window.confirm("Discard your unsaved changes?"))
                onClose();
            }}
          >
            <ArrowLeft size={14} />
            Products
          </button>
          <h1>{product ? "Edit product" : "A new piece."}</h1>
        </div>
        <button className="button" disabled={busy}>
          {busy ? "Saving…" : "Save product"}
          <Check size={16} />
        </button>
      </div>
      <ErrorMessage message={error} />
      <div className="editor-layout">
        <div>
          <section className="admin-panel editor-panel">
            <h2>Product details</h2>
            <label>
              Product name
              <input name="title" defaultValue={product?.title} required />
            </label>
            <label>
              URL slug
              <input
                name="slug"
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                defaultValue={product?.slug}
                placeholder="washed-everyday-tee"
                required
              />
            </label>
            <label>
              Description
              <textarea
                name="description"
                rows={5}
                minLength={10}
                defaultValue={product?.description}
                required
              />
            </label>
            <div className="form-row">
              <label>
                Price (PKR)
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={(product?.price || 0) / 100}
                  required
                />
              </label>
              <label>
                Compare price (PKR)
                <input
                  name="compare_price"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={(product?.compare_price || 0) / 100}
                />
              </label>
            </div>
          </section>
          <section className="admin-panel editor-panel">
            <h2>Photography</h2>
            <p className="muted">
              The first image leads your product card. Use the arrows to
              reorder.
            </p>
            <MediaField
              images={images}
              onChange={(v) => {
                setImages(v);
                setDirty(true);
              }}
            />
          </section>
          <section className="admin-panel editor-panel">
            <div className="section-heading">
              <h2>Variants &amp; inventory</h2>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setVariants([
                    ...variants,
                    {
                      id: undefined,
                      product_id: "",
                      sku: "",
                      size: "",
                      color: "",
                      stock: 0,
                    },
                  ]);
                  setDirty(true);
                }}
              >
                <Plus size={16} />
                Add variant
              </button>
            </div>
            {variants.map((v, i) => (
              <div className="variant-row" key={v.id || i}>
                {(["sku", "size", "color", "stock"] as const).map((key) => (
                  <label key={key}>
                    {key === "sku"
                      ? "SKU"
                      : key[0].toUpperCase() + key.slice(1)}
                    <input
                      type={key === "stock" ? "number" : "text"}
                      min={key === "stock" ? 0 : undefined}
                      required
                      value={v[key]}
                      onChange={(e) => {
                        setVariants(
                          variants.map((r, j) =>
                            j === i
                              ? {
                                  ...r,
                                  [key]:
                                    key === "stock"
                                      ? Number(e.target.value)
                                      : e.target.value,
                                }
                              : r,
                          ),
                        );
                        setDirty(true);
                      }}
                    />
                  </label>
                ))}
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Remove variant ${i + 1}`}
                  disabled={variants.length === 1}
                  onClick={() => {
                    setVariants(variants.filter((_, j) => j !== i));
                    setDirty(true);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </section>
          <section className="admin-panel editor-panel">
            <h2>Search engine listing</h2>
            <label>
              SEO title
              <input
                name="seo_title"
                defaultValue={product?.seo_title}
                maxLength={150}
              />
            </label>
            <label>
              SEO description
              <textarea
                name="seo_description"
                defaultValue={product?.seo_description}
                maxLength={320}
              />
            </label>
          </section>
        </div>
        <div>
          <section className="admin-panel editor-panel">
            <h2>Publishing</h2>
            <label>
              Status
              <select
                aria-label="Status"
                name="status"
                defaultValue={product?.status || "draft"}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <p className="muted small">
              Published changes appear on the next storefront request.
            </p>
          </section>
          <section className="admin-panel editor-panel">
            <h2>Collections</h2>
            {collections.map((c) => (
              <label className="checkbox-label" key={c.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={(e) => {
                    setSelected(
                      e.target.checked
                        ? [...selected, c.id]
                        : selected.filter((id) => id !== c.id),
                    );
                    setDirty(true);
                  }}
                />
                {c.title}
              </label>
            ))}
            <label>
              Primary collection
              <select
                aria-label="Primary collection"
                name="primary_collection"
                defaultValue={product?.primary_collection || ""}
                required
              >
                <option value="">Choose collection</option>
                {collections
                  .filter((c) => selected.includes(c.id))
                  .map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.title}
                    </option>
                  ))}
              </select>
            </label>
          </section>
          <section className="admin-panel editor-panel">
            <h2>Size guide</h2>
            <label>
              Garment measurements
              <textarea
                name="size_guide"
                defaultValue={product?.size_guide}
                rows={6}
              />
            </label>
          </section>
        </div>
      </div>
    </form>
  );
}
function CollectionEditor({
  collection: c,
  onClose,
  onSave,
}: {
  collection?: Collection;
  onClose: () => void;
  onSave: (v: unknown) => Promise<void>;
}) {
  const [images, setImages] = useState(c?.image ? [c.image] : []);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useUnsaved(dirty);
  return (
    <form
      className="collection-editor"
      onChange={() => setDirty(true)}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const data = Object.fromEntries(new FormData(e.currentTarget));
        try {
          await onSave({
            ...data,
            id: c?.id,
            version: c?.version,
            image: images[0] || "",
            position: Number(data.position),
          });
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="admin-heading">
        <div>
          <button
            type="button"
            className="back-link"
            onClick={() => {
              if (!dirty || confirm("Discard unsaved changes?")) onClose();
            }}
          >
            <ArrowLeft size={14} />
            Collections
          </button>
          <h1>{c ? "Edit collection" : "A new collection."}</h1>
        </div>
        <button className="button" disabled={busy}>
          Save collection
          <Check size={16} />
        </button>
      </div>
      <ErrorMessage message={error} />
      <div className="admin-panel editor-panel">
        <label>
          Collection name
          <input name="title" required defaultValue={c?.title} />
        </label>
        <label>
          URL slug
          <input
            name="slug"
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            defaultValue={c?.slug}
            required
          />
        </label>
        <label>
          Description
          <textarea name="description" defaultValue={c?.description} />
        </label>
        <label>
          Display position
          <input
            name="position"
            type="number"
            min="0"
            defaultValue={c?.position || 0}
          />
        </label>
        <h2>Collection image</h2>
        <MediaField
          images={images}
          onChange={(v) => {
            setImages(v.slice(-1));
            setDirty(true);
          }}
        />
        <label>
          SEO title
          <input name="seo_title" defaultValue={c?.seo_title} />
        </label>
        <label>
          SEO description
          <textarea name="seo_description" defaultValue={c?.seo_description} />
        </label>
      </div>
    </form>
  );
}
function Discounts({
  data,
  save,
}: {
  data: Discount[];
  save: (v: unknown) => Promise<boolean>;
}) {
  const [edit, setEdit] = useState<Discount | null>(null);
  return (
    <>
      <div className="admin-heading">
        <div>
          <h1>Discounts</h1>
          <p className="muted">Offers with clear limits.</p>
        </div>
      </div>
      <form
        key={edit?.code || "new"}
        className="admin-panel editor-panel"
        onSubmit={async (e) => {
          e.preventDefault();
          const d = Object.fromEntries(new FormData(e.currentTarget));
          const saved = await save({
            ...d,
            percent: Number(d.percent),
            minimum: Math.round(Number(d.minimum) * 100),
            limit_uses: Number(d.limit_uses),
            active: Number(d.active),
            expires_at: new Date(String(d.expires_at)).toISOString(),
          });
          if (saved) setEdit(null);
        }}
      >
        <h2>{edit ? "Edit " + edit.code : "Create a discount"}</h2>
        <div className="form-row">
          <label>
            Code
            <input
              name="code"
              pattern="[A-Z0-9-]{3,30}"
              defaultValue={edit?.code}
              required
            />
          </label>
          <label>
            Discount (%)
            <input
              type="number"
              name="percent"
              min="1"
              max="100"
              defaultValue={edit?.percent || 10}
              required
            />
          </label>
          <label>
            Minimum spend (PKR)
            <input
              type="number"
              name="minimum"
              min="0"
              defaultValue={(edit?.minimum || 0) / 100}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Expires (local time)
            <input
              type="datetime-local"
              name="expires_at"
              defaultValue={edit?.expires_at.slice(0, 16)}
              required
            />
          </label>
          <label>
            Usage limit
            <input
              type="number"
              name="limit_uses"
              min="1"
              defaultValue={edit?.limit_uses || 100}
            />
          </label>
          <label>
            Status
            <select name="active" defaultValue={edit?.active ?? 1}>
              <option value="1">Active</option>
              <option value="0">Disabled</option>
            </select>
          </label>
        </div>
        <button className="button">Save discount</button>
      </form>
      <div className="admin-panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Discount</th>
              <th>Uses</th>
              <th>Expires</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.code}>
                <td>{d.code}</td>
                <td>{d.percent}%</td>
                <td>
                  {d.uses} / {d.limit_uses}
                </td>
                <td>{d.expires_at.slice(0, 10)}</td>
                <td>{d.active ? "Active" : "Disabled"}</td>
                <td>
                  <button className="text-link" onClick={() => setEdit(d)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function SettingsEditor({
  initial,
  version,
  onSave,
}: {
  initial: Settings;
  version: number;
  onSave: (v: unknown) => Promise<boolean>;
}) {
  const [value, setValue] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  useUnsaved(dirty);
  const change = (key: keyof Settings, v: unknown) => {
    setValue({ ...value, [key]: v });
    setDirty(true);
  };
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          if (await onSave({ value, version })) setDirty(false);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="admin-heading">
        <div>
          <h1>Store settings</h1>
          <p className="muted">
            One source for your storefront’s business details.
          </p>
        </div>
        <button className="button" disabled={busy}>
          Save settings
          <Check size={16} />
        </button>
      </div>
      <div className="editor-layout">
        <div>
          <section className="admin-panel editor-panel">
            <h2>Brand &amp; homepage</h2>
            {(
              [
                ["brand", "Brand name"],
                ["contactEmail", "Support email"],
                ["announcement", "Announcement"],
                ["heroTitle", "Hero title (use | for a line break)"],
                ["heroText", "Hero description"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  value={value[key]}
                  onChange={(e) => change(key, e.target.value)}
                />
              </label>
            ))}
            <label>
              Hero image
              <MediaField
                images={[value.heroImage]}
                onChange={(v) => change("heroImage", v[v.length - 1] || "")}
              />
            </label>
            <label>
              Homepage collection tabs (slugs, comma separated)
              <input
                value={value.homeTabs.join(", ")}
                onChange={(e) =>
                  change(
                    "homeTabs",
                    e.target.value.split(",").map((s) => s.trim()),
                  )
                }
              />
            </label>
          </section>
          <section className="admin-panel editor-panel">
            <h2>Homepage sections &amp; theme</h2>
            <label>
              Section order
              <select
                aria-label="Section order"
                value={value.homeOrder.join(",")}
                onChange={(e) => change("homeOrder", e.target.value.split(","))}
              >
                <option value="arrivals,editorial">
                  New arrivals, then season cards
                </option>
                <option value="editorial,arrivals">
                  Season cards, then new arrivals
                </option>
                <option value="arrivals">New arrivals only</option>
                <option value="editorial">Season cards only</option>
              </select>
            </label>
            <label>
              Ink color
              <select
                aria-label="Ink color"
                value={value.themeInk}
                onChange={(e) => change("themeInk", e.target.value)}
              >
                <option value="#111111">Classic black</option>
                <option value="#243025">Deep olive</option>
                <option value="#59305d">Kidswear plum</option>
                <option value="#202b3c">Midnight blue</option>
              </select>
            </label>
            <h2 style={{ marginTop: 32 }}>Navigation</h2>
            {value.nav.map((n, i) => (
              <div className="form-row" key={i}>
                <label>
                  Label
                  <input
                    value={n.label}
                    onChange={(e) =>
                      change(
                        "nav",
                        value.nav.map((r, j) =>
                          j === i ? { ...r, label: e.target.value } : r,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Local URL
                  <input
                    value={n.href}
                    onChange={(e) =>
                      change(
                        "nav",
                        value.nav.map((r, j) =>
                          j === i ? { ...r, href: e.target.value } : r,
                        ),
                      )
                    }
                  />
                </label>
              </div>
            ))}
          </section>
          <section className="admin-panel editor-panel">
            <h2>Policies</h2>
            {(
              [
                ["returns", "Returns policy"],
                ["shippingPolicy", "Shipping policy"],
                ["privacy", "Privacy notice"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <textarea
                  rows={5}
                  value={value[key]}
                  onChange={(e) => change(key, e.target.value)}
                />
              </label>
            ))}
          </section>
        </div>
        <div>
          <section className="admin-panel editor-panel">
            <h2>Delivery</h2>
            <p className="muted">Currency: PKR</p>
            <label>
              Flat shipping (PKR)
              <input
                type="number"
                min="0"
                step="0.01"
                value={value.shippingRate / 100}
                onChange={(e) =>
                  change(
                    "shippingRate",
                    Math.round(Number(e.target.value) * 100),
                  )
                }
              />
            </label>
            <label>
              Free shipping from (PKR)
              <input
                type="number"
                min="0"
                value={value.freeShippingThreshold / 100}
                onChange={(e) =>
                  change(
                    "freeShippingThreshold",
                    Math.round(Number(e.target.value) * 100),
                  )
                }
              />
            </label>
            <label>
              Regions (one per line)
              <textarea
                rows={8}
                value={value.regions.join("\n")}
                onChange={(e) => change("regions", e.target.value.split("\n"))}
              />
            </label>
          </section>
          <section className="admin-panel editor-panel">
            <h2>Services</h2>
            <p>Payment: sandbox only</p>
            <p className="muted">
              A real provider must be integrated and tested before live checkout
              can be enabled.
            </p>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={value.notifications}
                onChange={(e) => change("notifications", e.target.checked)}
              />
              Save demo order emails to outbox
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={value.activityWidgets}
                onChange={(e) => change("activityWidgets", e.target.checked)}
              />
              Show live product viewing and recent-order notices
            </label>
            <p className="muted small">
              Uses actual activity only. Viewing counts include the current
              shopper. Recent-order notices exclude all test orders and customer
              details. These widgets stay hidden on ephemeral Netlify/Lambda
              storage.
            </p>
          </section>
        </div>
      </div>
    </form>
  );
}
