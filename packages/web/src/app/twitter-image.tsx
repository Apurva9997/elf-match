import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Elf Match - Free Secret Santa Generator";
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
          background: "linear-gradient(135deg, #0f1419 0%, #1a1f2e 50%, #0f1419 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Decorative elements */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "600px",
            height: "600px",
            background: "radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />
        
        {/* Gift emoji */}
        <div style={{ fontSize: "120px", marginBottom: "20px" }}>🎁</div>
        
        {/* Title */}
        <div
          style={{
            fontSize: "72px",
            fontWeight: "bold",
            color: "#f5f0e8",
            marginBottom: "16px",
            textAlign: "center",
          }}
        >
          Elf Match
        </div>
        
        {/* Subtitle */}
        <div
          style={{
            fontSize: "32px",
            background: "linear-gradient(90deg, #d4af37, #f5d485)",
            backgroundClip: "text",
            color: "transparent",
            marginBottom: "24px",
          }}
        >
          Free Secret Santa Generator
        </div>
        
        {/* Description */}
        <div
          style={{
            fontSize: "24px",
            color: "rgba(245, 240, 232, 0.7)",
            textAlign: "center",
            maxWidth: "800px",
          }}
        >
          Create gift exchanges in 2 minutes • Wishlists • Exclusion rules • Automatic matching
        </div>
        
        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            fontSize: "20px",
            color: "rgba(212, 175, 55, 0.8)",
          }}
        >
          elfmatch.com
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

