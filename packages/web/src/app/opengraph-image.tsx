import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Elf Match — an example gift exchange invitation";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#F6F1E7",
          width: "100%",
          height: "100%",
          display: "flex",
          fontFamily: "Georgia, serif",
          color: "#1C1915",
          padding: "56px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            border: "1px solid #DDD4C4",
            background: "#FFFCF6",
            padding: "48px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 18, letterSpacing: 3, color: "#8E3A42", fontFamily: "system-ui" }}>
                ELF MATCH
              </div>
              <div style={{ fontSize: 56, color: "#1E3A32", marginTop: 12 }}>
                Cousins, December
              </div>
            </div>
            <div style={{ fontSize: 18, color: "#5C564C", fontFamily: "system-ui" }}>
              Example invitation
            </div>
          </div>
          <div style={{ display: "flex", gap: 48, fontFamily: "system-ui", fontSize: 24 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ color: "#8A8276", fontSize: 16 }}>BUDGET</div>
              <div>Rs 500 – 1,000</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ color: "#8A8276", fontSize: 16 }}>EXCHANGE</div>
              <div>21 December</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ color: "#8A8276", fontSize: 16 }}>JOINED</div>
              <div>3 of 4</div>
            </div>
          </div>
          <div style={{ fontFamily: "system-ui", fontSize: 22, color: "#5C564C" }}>
            Set a budget, invite by email, keep pairs apart, send a private draw.
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
