import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { z } from "zod";
import { db, settings } from "./db";
import { siteUrl, HttpError } from "./security";
import { brand } from "./brand";
import { money, type Order, type EmailStatus } from "./types";

type Message = {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  html: string;
  kind: "order" | "test";
  status: EmailStatus;
  attempts: number;
  last_error: string | null;
  sent_at: string | null;
};

// Credentials stay on the server and are never returned by this helper.
export function emailConfiguration() {
  const mode = process.env.EMAIL_MODE || "outbox";
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || brand.email;
  const port = Number(process.env.SMTP_PORT || "465");
  let issue = "";
  if (mode !== "smtp")
    issue = "Email sending is off. Set EMAIL_MODE=smtp to enable it.";
  else if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  )
    issue =
      "SMTP_HOST, SMTP_USER and SMTP_PASS must be configured on the server.";
  else if (!z.email().safeParse(from).success || ![465, 587].includes(port))
    issue = "Use a valid EMAIL_FROM address and SMTP_PORT 465 or 587.";
  else {
    try {
      const url = new URL(siteUrl());
      const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      if (
        url.username ||
        url.password ||
        url.pathname !== "/" ||
        url.search ||
        url.hash ||
        (!local && url.protocol !== "https:") ||
        (local &&
          (process.env.NETLIFY || !["http:", "https:"].includes(url.protocol)))
      )
        issue = "SITE_URL must be the public HTTPS store origin on Netlify.";
    } catch {
      issue = "SITE_URL is not a valid store URL.";
    }
  }
  return { configured: !issue, mode, from, siteUrl: siteUrl(), issue };
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

export function orderEmail(order: Order, token: string) {
  const link = `${siteUrl()}/orders/${encodeURIComponent(order.id)}?token=${encodeURIComponent(token)}`;
  const label = order.sandbox ? "Test order" : "Order";
  const notice = order.sandbox
    ? "This is a test order. No real payment was taken and it will not be shipped."
    : "Thank you for shopping with Knit & Kin.";
  const lines = order.items.map(
    (i) =>
      `${i.title} · ${i.color} / ${i.size} · Qty ${i.quantity} — ${money(i.price * i.quantity)}`,
  );
  const body = [
    `Hi ${order.customer.name},`,
    "",
    `${label} ${order.id}`,
    notice,
    `Payment status: ${order.payment_status.replaceAll("_", " ")}`,
    "",
    ...lines,
    "",
    `Subtotal: ${money(order.subtotal)}`,
    `Discount: ${money(order.discount)}`,
    `Shipping: ${money(order.shipping)}`,
    `Total: ${money(order.total)}`,
    "",
    `View your order: ${link}`,
    "Keep this private tracking link safe.",
    "",
    `${brand.name} · ${brand.email}`,
  ].join("\n");
  const html = `<div style="background:#faf5ed;padding:32px 16px;font-family:Arial,sans-serif;color:#59305d"><div style="max-width:560px;margin:auto;background:white;padding:28px;border-radius:16px"><h2>knit &amp; kin</h2><h1 style="font-size:26px">${label} ${escapeHtml(order.id)}</h1><p>Hi ${escapeHtml(order.customer.name)},</p><p>${notice}</p><p>Payment status: ${escapeHtml(order.payment_status.replaceAll("_", " "))}</p><ul>${lines.map((line) => `<li style="margin:12px 0">${escapeHtml(line)}</li>`).join("")}</ul><p>Subtotal: ${money(order.subtotal)}<br>Discount: ${money(order.discount)}<br>Shipping: ${money(order.shipping)}</p><h3>Total: ${money(order.total)}</h3><p style="margin:28px 0"><a href="${escapeHtml(link)}" style="background:#59305d;color:white;padding:14px 20px;border-radius:8px;text-decoration:none">View your order</a></p><p style="font-size:13px">Keep this private tracking link safe.</p><p>Need a hand? <a href="mailto:${brand.email}">${brand.email}</a></p></div></div>`;
  return {
    subject: `${brand.name} — ${label.toLowerCase()} ${order.id}`,
    body,
    html,
  };
}

// Call within the order transaction so an email can never outlive a failed order.
export function queueOrderEmail(order: Order, token: string) {
  const id = randomUUID();
  const message = orderEmail(order, token);
  db()
    .prepare("INSERT INTO outbox(id,recipient,subject,body) VALUES(?,?,?,?)")
    .run(id, order.customer.email, message.subject, message.body);
  db()
    .prepare(
      "INSERT INTO email_deliveries(outbox_id,order_id,kind,html) VALUES(?,?,'order',?)",
    )
    .run(id, order.id, message.html);
}

export function orderEmailId(orderId: string) {
  return db()
    .prepare("SELECT outbox_id FROM email_deliveries WHERE order_id=?")
    .get(orderId)?.outbox_id as string | undefined;
}

function message(id: string) {
  return db()
    .prepare(
      "SELECT o.*,e.html,e.kind,e.status,e.attempts,e.last_error,e.sent_at,e.updated_at FROM outbox o JOIN email_deliveries e ON e.outbox_id=o.id WHERE o.id=?",
    )
    .get(id) as (Message & { updated_at: number }) | undefined;
}

// A terminated server may have sent DATA before it could persist the receipt.
// Never retry that case automatically: SMTP cannot guarantee exactly-once delivery.
function effectiveStatus(row: {
  status: EmailStatus;
  updated_at: number;
}): EmailStatus {
  return row.status === "sending" && row.updated_at < Date.now() - 120000
    ? "uncertain"
    : row.status;
}

export function orderEmailStatus(orderId: string): EmailStatus {
  const id = orderEmailId(orderId);
  const row = id && message(id);
  return row ? effectiveStatus(row) : "not_queued";
}

export function emailOutbox() {
  const rows = db()
    .prepare(
      "SELECT o.*,e.kind,e.status,e.attempts,e.last_error,e.sent_at,e.updated_at FROM outbox o LEFT JOIN email_deliveries e ON e.outbox_id=o.id ORDER BY o.created_at DESC,o.rowid DESC LIMIT 50",
    )
    .all() as unknown as (Omit<Message, "kind" | "status" | "attempts"> & {
    kind: Message["kind"] | null;
    status: EmailStatus | null;
    attempts: number | null;
    created_at: string;
    updated_at: number;
  })[];
  return rows.map((row) => ({
    ...row,
    status: row.status
      ? effectiveStatus({ status: row.status, updated_at: row.updated_at })
      : ("local_only" as const),
  }));
}

export type SendMessage = (mail: {
  to: string;
  subject: string;
  text: string;
  html: string;
  messageId: string;
}) => Promise<void>;

export const sendSmtp: SendMessage = async (mail) => {
  const config = emailConfiguration();
  if (!config.configured) throw new Error("Email configuration is incomplete.");
  const port = Number(process.env.SMTP_PORT || "465");
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: true,
    auth: {
      user: process.env.SMTP_USER,
      pass:
        process.env.SMTP_HOST === "smtp.gmail.com"
          ? process.env.SMTP_PASS?.replace(/\s/g, "")
          : process.env.SMTP_PASS,
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
    logger: false,
    debug: false,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  try {
    const result = await transport.sendMail({
      ...mail,
      from: { name: brand.name, address: config.from },
      replyTo: settings().contactEmail,
    });
    if (!result.accepted?.length)
      throw Object.assign(new Error("Recipient rejected"), {
        code: "EENVELOPE",
      });
  } finally {
    transport.close();
  }
};

// Bounded, awaited delivery after COMMIT, never detached serverless background work.
export async function deliverEmail(
  id: string,
  retry = false,
  send: SendMessage = sendSmtp,
) {
  const row = message(id);
  if (!row)
    throw new HttpError(
      404,
      "Email not found or this legacy message cannot be sent.",
    );
  const status = effectiveStatus(row);
  if (
    status === "sent" ||
    status === "sending" ||
    (status !== "queued" && !retry)
  )
    return status;
  const config = emailConfiguration();
  if (!config.configured) {
    db()
      .prepare("UPDATE email_deliveries SET last_error=? WHERE outbox_id=?")
      .run(config.issue, id);
    return status;
  }
  const claimed = db()
    .prepare(
      "UPDATE email_deliveries SET status='sending',attempts=attempts+1,updated_at=?,last_error=NULL WHERE outbox_id=? AND status=? AND updated_at=?",
    )
    .run(Date.now(), id, row.status, row.updated_at);
  if (!claimed.changes) return "sending";
  let subject = row.subject,
    text = row.body,
    html = row.html;
  try {
    // Refresh links to the current deployment/domain when explicitly retrying an old order.
    if (row.kind === "order") {
      const url = row.body.match(
        /https?:\/\/[^\s]+\/orders\/[^\s]+\?token=[A-Za-z0-9_-]+/,
      );
      const orderId = db()
        .prepare("SELECT order_id FROM email_deliveries WHERE outbox_id=?")
        .get(id)?.order_id;
      const raw = db().prepare("SELECT * FROM orders WHERE id=?").get(orderId!);
      const token = url && new URL(url[0]).searchParams.get("token");
      if (!raw || !token)
        throw Object.assign(new Error("Tracking link unavailable"), {
          code: "ETRACKING",
        });
      const order = {
        ...raw,
        customer: JSON.parse(String(raw.customer)),
        items: JSON.parse(String(raw.items)),
      } as Order;
      const refreshed = orderEmail(order, token);
      subject = refreshed.subject;
      text = refreshed.body;
      html = refreshed.html;
    }
    await send({
      to: row.recipient,
      subject,
      text,
      html,
      messageId: `<${id}@${new URL(siteUrl()).hostname}>`,
    });
  } catch (error) {
    const { code, command } = error as { code?: string; command?: string };
    const reason =
      code === "EAUTH"
        ? "SMTP sign-in failed. For Gmail, check the App Password and 2-Step Verification."
        : code === "EENVELOPE"
          ? "The email provider rejected the sender or recipient address."
          : code === "ETRACKING"
            ? "This order has no usable private tracking link."
            : "The mail server did not confirm sending. Check the provider and retry from the outbox.";
    const next =
      ["EAUTH", "EENVELOPE", "ETRACKING", "EDNS"].includes(code || "") ||
      command === "CONN"
        ? "failed"
        : "uncertain";
    db()
      .prepare(
        "UPDATE email_deliveries SET status=?,last_error=?,updated_at=? WHERE outbox_id=?",
      )
      .run(next, reason, Date.now(), id);
    return next;
  }
  // Keep this outside the send catch: a failed receipt write must not become a safe-to-retry failure.
  db()
    .prepare("UPDATE outbox SET subject=?,body=? WHERE id=?")
    .run(subject, text, id);
  db()
    .prepare(
      "UPDATE email_deliveries SET status='sent',html=?,sent_at=CURRENT_TIMESTAMP,updated_at=?,last_error=NULL WHERE outbox_id=?",
    )
    .run(html, Date.now(), id);
  return "sent";
}

export function queueTestEmail() {
  const id = randomUUID();
  db()
    .prepare("INSERT INTO outbox(id,recipient,subject,body) VALUES(?,?,?,?)")
    .run(
      id,
      settings().contactEmail,
      `${brand.name} — email connection test`,
      `Your Knit & Kin store can send email.\nStore URL: ${siteUrl()}\nThis test does not create an order.`,
    );
  db()
    .prepare("INSERT INTO email_deliveries(outbox_id,kind) VALUES(?,'test')")
    .run(id);
  return id;
}
