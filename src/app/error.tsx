"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty">
      <h1>Let’s try that again.</h1>
      <p>Something interrupted this page. Your saved bag is still here.</p>
      <button className="button" onClick={reset}>
        Reload this page
      </button>
    </div>
  );
}
