import { test, before, beforeEach, after, mock } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { db, defaultSettings, transaction, orders } from "../src/lib/db";
import { createOrder, quote, publicOrder } from "../src/lib/commerce";
import {
  deliverEmail,
  emailConfiguration,
  emailOutbox,
  orderEmailId,
  orderEmailStatus,
  queueTestEmail,
  sendSmtp,
  type SendMessage,
} from "../src/lib/email";

const directory = mkdtempSync(join(tmpdir(), "knitkin-email-test-"));
process.env.DATABASE_PATH = join(directory, "test.sqlite");
process.env.DEMO_MODE = "true";
before(() => {
  db()
    .prepare("INSERT INTO settings(id,value) VALUES(1,?)")
    .run(JSON.stringify(defaultSettings));
  db().exec(
    "INSERT INTO products(id,slug,title,description,price,status) VALUES('p','test-tee','Test tee','Test only',100000,'published'); INSERT INTO variants VALUES('v','p','TEST-EMAIL','2–3Y','Peach',100)",
  );
});
beforeEach(() => {
  process.env.EMAIL_MODE = "smtp";
  process.env.SMTP_HOST = "smtp.gmail.com";
  process.env.SMTP_PORT = "465";
  process.env.SMTP_USER = "sender@example.test";
  process.env.SMTP_PASS = "test-only-app-password";
  process.env.EMAIL_FROM = "sender@example.test";
  process.env.SITE_URL = "https://oonline-store.netlify.app";
  delete process.env.NETLIFY;
});
after(() => {
  db().close();
  rmSync(directory, { recursive: true, force: true });
});
const order = () => {
  const input = {
    items: [{ variantId: "v", quantity: 1 }],
    discountCode: "",
    expectedTotal: quote([{ variantId: "v", quantity: 1 }]).total,
    idempotencyKey: randomUUID(),
    outcome: "success" as const,
    customer: {
      name: "A <script>alert(1)</script>",
      email: "customer@example.test",
      phone: "03001234567",
      address: "Test only street",
      city: "Karachi",
      region: "Sindh",
    },
  };
  const sid = randomUUID();
  const result = createOrder(input, sid);
  return { ...result, input, sid, emailId: orderEmailId(result.order.id)! };
};

test("unconfigured SMTP keeps the committed order and never claims email was sent", async () => {
  const result = order();
  delete process.env.SMTP_PASS;
  let calls = 0;
  assert.equal(
    await deliverEmail(result.emailId, false, async () => {
      calls++;
    }),
    "queued",
  );
  assert.equal(calls, 0);
  assert.equal(publicOrder(result.order).email_status, "queued");
  assert.ok(orders().some((o) => o.id === result.order.id));
  assert.match(
    String(emailOutbox().find((m) => m.id === result.emailId)?.last_error),
    /SMTP_PASS/,
  );
  process.env.EMAIL_MODE = "outbox";
  assert.equal(emailConfiguration().configured, false);
});

test("checkout replay and concurrent delivery attempts send one escaped, complete confirmation", async () => {
  const result = order();
  assert.equal(createOrder(result.input, result.sid).replayed, true);
  assert.equal(orderEmailId(result.order.id), result.emailId);
  const sent: Parameters<SendMessage>[0][] = [];
  const send: SendMessage = async (mail) => {
    sent.push(mail);
    await new Promise((resolve) => setTimeout(resolve, 15));
  };
  await Promise.all([
    deliverEmail(result.emailId, false, send),
    deliverEmail(result.emailId, false, send),
  ]);
  await deliverEmail(result.emailId, true, send);
  assert.equal(sent.length, 1);
  assert.match(sent[0].subject, /Knit & Kin/);
  assert.match(sent[0].text, /No real payment/);
  assert.match(sent[0].text, /Total: Rs\. 1,250/);
  assert.ok(sent[0].text.includes(result.trackingToken!));
  assert.ok(sent[0].html.includes("&lt;script&gt;"));
  assert.ok(!sent[0].html.includes("<script>"));
  assert.equal(orderEmailStatus(result.order.id), "sent");
});

test("authentication failure is redacted and requires an explicit retry", async () => {
  const result = order();
  assert.equal(
    await deliverEmail(result.emailId, false, async () => {
      throw Object.assign(
        new Error("private-smtp-password-and-customer-data"),
        { code: "EAUTH" },
      );
    }),
    "failed",
  );
  let calls = 0;
  const success = async () => {
    calls++;
  };
  await deliverEmail(result.emailId, false, success);
  assert.equal(calls, 0);
  const row = emailOutbox().find((m) => m.id === result.emailId)!;
  assert.ok(!JSON.stringify(row).includes("private-smtp-password"));
  assert.match(String(row.last_error), /App Password/);
  await deliverEmail(result.emailId, true, success);
  assert.equal(calls, 1);
  assert.equal(orderEmailStatus(result.order.id), "sent");
});

test("interrupted and ambiguous sends never retry automatically", async () => {
  const result = order();
  assert.equal(
    await deliverEmail(result.emailId, false, async () => {
      throw Object.assign(new Error("socket closed after DATA"), {
        code: "ECONNECTION",
        command: "DATA",
      });
    }),
    "uncertain",
  );
  let calls = 0;
  await deliverEmail(result.emailId, false, async () => {
    calls++;
  });
  db()
    .prepare(
      "UPDATE email_deliveries SET status='sending',updated_at=? WHERE outbox_id=?",
    )
    .run(Date.now() - 121000, result.emailId);
  assert.equal(orderEmailStatus(result.order.id), "uncertain");
  await deliverEmail(result.emailId, false, async () => {
    calls++;
  });
  assert.equal(calls, 0);
  await deliverEmail(result.emailId, true, async () => {
    calls++;
  });
  assert.equal(calls, 1);
});

test("legacy confirmation can be retried with the current domain without changing its private key", async () => {
  const result = order();
  db()
    .prepare("DELETE FROM email_deliveries WHERE outbox_id=?")
    .run(result.emailId);
  db()
    .prepare("UPDATE outbox SET subject=?,body=? WHERE id=?")
    .run(
      `Sandbox order ${result.order.id}`,
      `No real payment was taken. Track locally: http://127.0.0.1:3100/orders/${result.order.id}?token=${result.trackingToken}`,
      result.emailId,
    );
  db().exec(readFileSync("migrations/001_initial.sql", "utf8"));
  assert.equal(orderEmailStatus(result.order.id), "queued");
  process.env.SITE_URL = "https://knitandkin.com";
  let body = "";
  await deliverEmail(result.emailId, true, async (mail) => {
    body = mail.text;
  });
  assert.ok(
    body.includes(
      `https://knitandkin.com/orders/${result.order.id}?token=${result.trackingToken}`,
    ),
  );
  assert.ok(!body.includes("127.0.0.1"));
});

test("queue metadata rolls back with its transaction", () => {
  const count = () => db().prepare("SELECT COUNT(*) AS n FROM outbox").get()!.n;
  const before = count();
  assert.throws(() =>
    transaction(() => {
      queueTestEmail();
      throw new Error("rollback");
    }),
  );
  assert.equal(count(), before);
});

test("public URL and SMTP configuration validation keeps secrets private", () => {
  assert.equal(emailConfiguration().configured, true);
  assert.ok(
    !JSON.stringify(emailConfiguration()).includes(process.env.SMTP_PASS!),
  );
  process.env.SITE_URL = "http://127.0.0.1:3100";
  process.env.NETLIFY = "true";
  assert.equal(emailConfiguration().configured, false);
  delete process.env.NETLIFY;
  assert.equal(emailConfiguration().configured, true);
  process.env.SITE_URL = "https://user:secret@knitandkin.com";
  assert.equal(emailConfiguration().configured, false);
});

test("SMTP uses encrypted transport, safe sender and recipient, and closes after provider acceptance", async () => {
  process.env.SMTP_PASS = "abcd efgh ijkl mnop";
  let closed = false;
  const transport = mock.method(
    nodemailer,
    "createTransport",
    (options: unknown) => {
      const config = options as {
        secure: boolean;
        requireTLS: boolean;
        auth: { pass: string };
        disableFileAccess: boolean;
      };
      assert.equal(config.secure, true);
      assert.equal(config.requireTLS, true);
      assert.equal(config.disableFileAccess, true);
      assert.equal(config.auth.pass, "abcdefghijklmnop");
      return {
        sendMail: async (mail: {
          to: string;
          from: { address: string };
          replyTo: string;
        }) => {
          assert.equal(mail.to, "customer@example.test");
          assert.equal(mail.from.address, "sender@example.test");
          assert.equal(mail.replyTo, defaultSettings.contactEmail);
          return { accepted: [mail.to] };
        },
        close: () => {
          closed = true;
        },
      } as unknown as ReturnType<typeof nodemailer.createTransport>;
    },
  );
  try {
    await sendSmtp({
      to: "customer@example.test",
      subject: "Test",
      text: "Test",
      html: "<p>Test</p>",
      messageId: "<test@example.test>",
    });
    assert.equal(closed, true);
  } finally {
    transport.mock.restore();
  }
});
