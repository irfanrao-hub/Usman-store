"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, LogOut } from "lucide-react";
import { useStore, api } from "./store-context";
import { ErrorMessage } from "./ui";
import { money, type Order, type PublicUser } from "@/lib/types";
export function Auth({
  admin = false,
  initialMode = "login",
}: {
  admin?: boolean;
  initialMode?: string;
}) {
  const [mode, setMode] = useState(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const { refreshUser, settings, ready } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  return (
    <div className={`auth-page ${admin ? "admin-auth" : ""}`}>
      <div className="auth-art">
        <p className="wordmark">{settings.brand}</p>
        <h2>
          {admin ? (
            <>
              Behind
              <br />
              the edit.
            </>
          ) : (
            <>
              Your style.
              <br />
              Your space.
            </>
          )}
        </h2>
        <p>
          {admin
            ? "A considered store starts here."
            : "Keep your favourites close."}
        </p>
        <Link href="/" className="text-link">
          Back to the store <ArrowUpRight size={18} />
        </Link>
      </div>
      <div className="auth-form">
        <h1>
          {mode === "register"
            ? "Make yourself at home."
            : mode === "recover"
              ? "Let’s get you back in."
              : mode === "reset"
                ? "A fresh start."
                : admin
                  ? "Store administration"
                  : "Good to see you."}
        </h1>
        <p className="muted">
          {mode === "recover"
            ? "Enter your email to request a password reset."
            : mode === "reset"
              ? "Choose a new password with at least 12 characters."
              : admin
                ? "Sign in with your owner or staff account."
                : "Sign in for your orders and account details."}
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            setMessage("");
            const data = Object.fromEntries(new FormData(e.currentTarget));
            try {
              const result = await api<{ message?: string; user?: PublicUser }>(
                "auth/" + mode,
                { ...data, token: params.get("token") },
              );
              if (mode === "recover") {
                setMessage(result.message || "Request saved.");
              } else if (mode === "reset") {
                setMessage("Password updated. Sign in with your new password.");
                setMode("login");
              } else {
                await refreshUser();
                if (
                  admin &&
                  !["owner", "staff"].includes(result.user?.role || "")
                ) {
                  setError("This account does not have administration access.");
                } else {
                  router.push(admin ? "/admin" : "/account");
                  router.refresh();
                }
              }
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {mode === "register" && (
            <label>
              Name
              <input name="name" required autoComplete="name" minLength={2} />
            </label>
          )}
          {mode !== "reset" && (
            <label>
              Email address
              <input
                type="email"
                disabled={!ready}
                name="email"
                required
                autoComplete="username"
              />
            </label>
          )}
          {mode !== "recover" && (
            <label>
              Password
              <input
                type="password"
                disabled={!ready}
                name="password"
                required
                minLength={mode === "login" ? 1 : 12}
                maxLength={128}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              />
            </label>
          )}
          <ErrorMessage message={error} />
          {message && (
            <p className="success-message" role="status">
              {message}
            </p>
          )}
          <button className="button full" disabled={busy || !ready}>
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : mode === "register"
                  ? "Create account"
                  : mode === "recover"
                    ? "Request reset link"
                    : "Update password"}
            <ArrowRight size={18} />
          </button>
        </form>
        <div className="auth-links">
          {mode === "login" ? (
            <>
              <button className="text-link" onClick={() => setMode("recover")}>
                Forgot your password?
              </button>
              {!admin && (
                <button
                  className="text-link"
                  onClick={() => setMode("register")}
                >
                  Create an account
                  <ArrowUpRight size={14} />
                </button>
              )}
            </>
          ) : (
            <button className="text-link" onClick={() => setMode("login")}>
              Back to sign in
            </button>
          )}
        </div>
        {admin && (
          <p className="small muted">
            Local demo credentials are in the project’s private .env.local file.
            Recovery links are saved in the owner’s demo outbox.
          </p>
        )}
      </div>
    </div>
  );
}
export function Account() {
  const { user, refreshUser } = useStore();
  const [list, setList] = useState<Order[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (user)
      api<Order[]>("orders")
        .then(setList)
        .catch((e) => setError(e.message));
  }, [user]);
  if (!user) return <Auth />;
  return (
    <div className="section account-page">
      <div className="section-heading">
        <div>
          <div className="breadcrumb">Your account</div>
          <h1>Hello, {user.name.split(" ")[0]}.</h1>
          <p className="muted">{user.email}</p>
        </div>
        <button
          className="button outline"
          onClick={async () => {
            await api("auth/logout", {});
            await refreshUser();
          }}
        >
          Sign out
          <LogOut size={16} />
        </button>
      </div>
      <h2>Your orders</h2>
      <ErrorMessage message={error} />
      {list.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Payment</th>
                <th>Fulfilment</th>
                <th>Total</th>
                <th>
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>
                    {new Date(o.created_at + "Z").toLocaleDateString("en-GB")}
                  </td>
                  <td>{o.payment_status.replaceAll("_", " ")}</td>
                  <td>{o.fulfilment_status}</td>
                  <td>{money(o.total)}</td>
                  <td>
                    <Link className="text-link" href={"/orders/" + o.id}>
                      View
                      <ArrowUpRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <p>Your next favourite is waiting.</p>
          <Link className="button" href="/collections/new-arrivals">
            Explore new arrivals
            <ArrowRight size={18} />
          </Link>
        </div>
      )}
    </div>
  );
}
