import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", background: "#08090C",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
          <div
            style={{
              width: 84, height: 84, borderRadius: 22, display: "flex",
              alignItems: "center", justifyContent: "center",
              background: "linear-gradient(155deg,#37E29B,#059669)",
            }}
          >
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
              <path d="M17.6 5.6a9 9 0 1 0 2.2 3.6" stroke="#04140D" strokeWidth="2.8" strokeLinecap="round" />
              <circle cx="18.6" cy="5.4" r="2.85" fill="#04140D" />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, color: "#FFFFFF", letterSpacing: "-2px" }}>
            LMC Agents
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#9CA3AF", maxWidth: 820, textAlign: "center" }}>
          Answers every call — in Spanish, English or French.
        </div>
      </div>
    ),
    { ...size }
  );
}
