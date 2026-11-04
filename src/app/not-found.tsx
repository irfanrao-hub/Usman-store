import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty not-found">
      <p className="muted">404 · A little off the beaten path</p>
      <h1>
        This piece of the
        <br />
        story is missing.
      </h1>
      <p>The page may have moved, or the product is no longer available.</p>
      <Link href="/collections/new-arrivals" className="button">
        Explore the collection ↗
      </Link>
    </div>
  );
}
