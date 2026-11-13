"use client";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { useStore } from "./store-context";

export function FaqList() {
  const { settings, demo } = useStore();
  const entries = [
    [
      "What can I shop at Knit & Kin?",
      "Explore Summer and Winter kidswear, from T-shirts and co-ord sets to dresses, rompers and cosy layers. Choose a season, then a clothing category to find their next outfit.",
    ],
    [
      "How do I choose the right size?",
      "Choose an age size on the product page and open its size guide. Age labels are a starting point; compare your child’s measurements with the garment measurements. If you need a hand, email " +
        settings.contactEmail +
        ".",
    ],
    ["What are the delivery charges?", settings.shippingPolicy],
    ["Can I return or exchange an item?", settings.returns],
    [
      "How can I track my order?",
      "Use the private tracking link on your order confirmation, or visit Track an order. If you checked out while signed in, you can also find your orders in My account.",
    ],
    ...(demo
      ? [
          [
            "Can I place a real order on this preview?",
            "This is a kidswear store preview. Sample products use AI-generated imagery and illustrative prices and sizes. Checkout creates test orders only; no payment is taken and no products are shipped.",
          ],
        ]
      : []),
  ];
  return (
    <div className="faq-list">
      {entries.map(([question, answer], i) => (
        <details name="knitkin-faq" key={question} open={i === 0}>
          <summary>
            {question}
            <Plus size={20} aria-hidden="true" />
          </summary>
          <p>{answer}</p>
        </details>
      ))}
    </div>
  );
}
export function HomeFaq() {
  return (
    <section className="home-faq section" aria-labelledby="faq-heading">
      <div className="faq-intro">
        <h2 id="faq-heading">
          Little questions.
          <br />
          Helpful answers.
        </h2>
        <p>A little help for their next big adventure.</p>
        <Link href="/pages/contact" className="text-link">
          Ask Knit &amp; Kin
          <ArrowRight size={20} />
        </Link>
        <Link className="faq-all-link" href="/pages/faq">
          Frequently asked questions
        </Link>
      </div>
      <FaqList />
    </section>
  );
}
