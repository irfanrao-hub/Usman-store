import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

export const alt = "Knit & Kin — Everyday pieces. A little more you.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#e8e7e3",
        color: "#111",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "56px 68px",
      }}
    >
      <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-3px" }}>
        {brand.wordmark}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: 112,
            fontWeight: 600,
            letterSpacing: "-7px",
            lineHeight: 1,
          }}
        >
          Wear it your way.
        </div>
        <div style={{ fontSize: 28, marginTop: 30 }}>
          Everyday pieces. A little more you.
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 21,
          borderTop: "1px solid #b4b3ad",
          paddingTop: 22,
        }}
      >
        <span>T-shirts / Shirts / Denim</span>
        <span>knitandkin.com</span>
      </div>
    </div>,
    size,
  );
}
