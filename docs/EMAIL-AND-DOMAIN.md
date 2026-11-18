# Knit & Kin email and domain setup

The storefront code, public DNS and outbound email are separate connections. Setting the brand domain or Gmail address in the code does not authorize changes in Namecheap or send email through Google.

## Current connection checks — 16 November 2026

- `https://oonline-store.netlify.app` responds with HTTP 200.
- `knitandkin.com` resolves to `162.255.119.107`, and its HTTPS connection times out.
- `www.knitandkin.com` is a CNAME to `parkingpage.namecheap.com`.
- Nameservers are `dns1.registrar-servers.com` and `dns2.registrar-servers.com`.
- No authenticated Netlify CLI connection or SMTP password is configured in this workspace. No public DNS changes or Netlify deployment have been performed by this update.

## Connect the existing domain

1. Sign in to Netlify, open the **oonline-store** project, then **Domain management → Production domains → Add a domain**. Add the existing domain `knitandkin.com`. Add/confirm `www.knitandkin.com` as its alternate domain. Do not buy the domain again or create another site.
2. In Namecheap, open **Domain List → Manage** next to `knitandkin.com`, then **Advanced DNS → Host Records**. Replace the old parking/URL redirect records for `@` and `www` with these records for Netlify's standard network:

   | Type | Host | Value | TTL |
   | --- | --- | --- | --- |
   | A Record | `@` | `75.2.60.5` | Automatic |
   | CNAME Record | `www` | `oonline-store.netlify.app` | Automatic |

   Use Netlify's project-specific values if **Pending DNS verification** shows different ones. Remove conflicting web records for these two hosts; preserve email MX records and unrelated TXT/subdomain records. Nameservers can remain with Namecheap.
3. Return to Netlify and verify DNS. Wait for its HTTPS certificate to be provisioned for both names, then set `knitandkin.com` as the primary domain. DNS changes can take up to 24–48 hours; waiting does not fix records that still point to the parking page.
4. Deploy this updated repository. In Netlify **Project configuration → Environment variables**, set `SITE_URL=https://knitandkin.com` after the domain is serving the store. Rebuild/redeploy after changing variables. `CANONICAL_SITE_URL` is already `https://knitandkin.com` in the project configuration.
5. Check both HTTPS domains, the redirect to the primary domain, login, cart/checkout and an emailed private order link. Confirm that order links use the active domain.

For testing on Netlify before the domain is ready, leave `SITE_URL` unset so the app uses Netlify's `URL`, or explicitly set it to `https://oonline-store.netlify.app`. Locally keep `SITE_URL=http://127.0.0.1:3100`. A local order exists only in the local database; changing a link cannot transfer it to the hosted store.

Sources: [Netlify external DNS configuration](https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns/), [Namecheap A record instructions](https://www.namecheap.com/support/knowledgebase/article.aspx/319/2237/how-can-i-set-up-an-a-address-record-for-my-domain/), [Netlify environment variables](https://docs.netlify.com/build/environment-variables/get-started/).

## Enable Gmail order confirmations

1. Sign in to Google as `knitandkin1@gmail.com`, enable **2-Step Verification**, then create an [App Password](https://myaccount.google.com/apppasswords) for this store. Use the App Password, not the normal Google account password. Availability depends on the account's security settings. [Google's instructions](https://support.google.com/mail/answer/185833?hl=en).
2. Set these server-only environment variables. For local testing, use the ignored `.env.local` file. For the hosted store, use Netlify's private environment variable settings, including Functions/runtime scope where scope selection is offered:

   ```dotenv
   EMAIL_MODE=smtp
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=knitandkin1@gmail.com
   SMTP_PASS=
   EMAIL_FROM=knitandkin1@gmail.com
   ```

   Put the App Password in the blank `SMTP_PASS` value privately. Do not paste it in chat, commit it, put it in `netlify.toml`, or prefix it with `NEXT_PUBLIC_`. The local file already has these settings with the password blank. Also configure a private, random `SESSION_SECRET` of at least 32 characters on Netlify; the committed demo secret has been removed so it cannot override your private setting.
3. Restart the local server or redeploy Netlify. Sign in as the owner and open **Administration → Inbox & outbox → Email connection**. **Send connection test** sends to the store contact email. Confirm receipt in the inbox/spam folder.
4. Keep **Store settings → Services → Send order confirmation emails** enabled. New checkout confirmations are sent after the order transaction commits. Existing unsent order emails can be sent individually with **Send / retry email** in the outbox. No old backlog is sent automatically.

The previously reported test order was saved locally with a confirmation in the outbox. It was never sent by the old implementation. After configuring local SMTP, its existing outbox entry can be retried without creating another order. Its local tracking link works only on the machine running that local store.

## Delivery behavior and limits

- Emails include Knit & Kin branding, items, totals, payment state and a private tracking link. Sandbox messages clearly state that no real payment was taken and nothing will be shipped.
- `EMAIL_MODE=outbox` saves messages without external sending. Use this mode for automated tests.
- Without valid SMTP configuration, orders still complete and the customer sees that email has not been sent. The owner sees setup/error details, without secrets.
- Concurrent attempts and already-sent messages are not sent again. A failed send needs an owner retry. An interrupted/ambiguous SMTP send is marked uncertain and warns that retrying could duplicate an email. There is no automatic background retry worker.
- “Sent” means the SMTP provider accepted the message, not proof of inbox delivery. Bounces and spam filtering require checking the provider/mailbox; delivery webhooks are not implemented.
- Password recovery remains in the existing local demo outbox; this change enables order confirmations and owner connection-test messages only.
- The Netlify configuration still uses temporary SQLite storage and sandbox checkout. It is suitable for previewing, but orders/email status may disappear or differ between server instances. Real commerce requires a shared durable database and the remaining payment/fulfilment setup; connecting a domain does not make that data persistent.

Technical reference: [Nodemailer SMTP transport](https://nodemailer.com/smtp).
