import { ImageResponse } from "next/og";
import { site } from "@/content/site";

export const alt = "Nordair — a fictional airline motion demo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        color: "white",
        background:
          "linear-gradient(180deg, #0b1b3a 0%, #26295c 40%, #7b4170 68%, #f07a4a 88%, #ffc27a 100%)",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <svg width="72" height="72" viewBox="0 0 40 40">
          <rect x="6" y="9" width="6" height="25" rx="1.6" fill="#fff" />
          <rect x="28" y="6" width="6" height="28" rx="1.6" fill="#fff" />
          <path
            d="M1.5 3.5c4.6.3 8.6 1.9 11.7 4.9L34 32.4V34h-6.1L7.8 12.1C6 10 4.1 7.2 1.5 3.5Z"
            fill="#ff7a3d"
          />
        </svg>
        <div style={{ fontSize: 56, fontWeight: 700 }}>{site.name}</div>
        <div
          style={{
            marginLeft: 16,
            fontSize: 24,
            fontWeight: 700,
            color: "#0b1b3a",
            background: "#ff7a3d",
            padding: "6px 14px",
            borderRadius: 8,
          }}
        >
          FICTIONAL · DEMO
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1 }}>
          {site.home.hero.headline.join(" ")}
        </div>
        <div style={{ fontSize: 30, marginTop: 24, maxWidth: 900, opacity: 0.92 }}>
          {site.shortDescription}
        </div>
      </div>
    </div>,
    size,
  );
}
