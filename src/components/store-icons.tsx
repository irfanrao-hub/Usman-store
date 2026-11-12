import type { SVGProps } from "react";

/** Fine, rounded boutique icons matching the supplied reference. */
export function StoreIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & {
  name: "search" | "account" | "cart" | "instagram" | "facebook";
}) {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {name === "search" ? (
        <>
          <circle cx="14" cy="14" r="10" />
          <path d="m21.2 21.2 6.3 6.3" />
        </>
      ) : name === "account" ? (
        <>
          <circle cx="16" cy="9" r="6" />
          <path d="M4 29v-2c0-5.4 5.4-8 12-8s12 2.6 12 8v2" />
        </>
      ) : name === "instagram" ? (
        <>
          <rect x="4" y="4" width="24" height="24" rx="7" />
          <circle cx="16" cy="16" r="6" />
          <circle cx="23" cy="9" r="1" fill="currentColor" stroke="none" />
        </>
      ) : name === "facebook" ? (
        <>
          <circle cx="16" cy="16" r="13" />
          <path d="M18 28V17h4l.7-4H18v-2c0-2 1-3 3-3h2V4h-3c-4 0-6 3-6 7v2h-3v4h3v11" />
        </>
      ) : (
        <>
          <path d="M2 3h4l4.3 16.2a3 3 0 0 0 2.9 2.2h10.1a3 3 0 0 0 2.9-2.2L29 9a2 2 0 0 0-1.9-2.5H7" />
          <circle cx="13" cy="27" r="2.4" />
          <circle cx="24" cy="27" r="2.4" />
        </>
      )}
    </svg>
  );
}
