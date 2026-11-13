import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

export const alt = "Knit & Kin — Little outfits. Big adventures.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#f5ecf6",
        color: "#59305d",
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
            fontSize: 90,
            fontWeight: 600,
            letterSpacing: "-4px",
            lineHeight: 1,
          }}
        >
          Their little world.
        </div>
        <div style={{ fontSize: 28, marginTop: 30 }}>
          Little outfits. Big adventures.
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
        <span>Kidswear / Summer / Winter</span>
        <span>knitandkin.com</span>
      </div>
    </div>,
    size,
  );
}
