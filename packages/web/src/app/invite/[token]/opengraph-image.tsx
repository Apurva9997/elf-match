import { invitePreviewCopy } from "../../../../../api/src/lib/invite-preview";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Invitation to an Elf Match exchange";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: { token: string };
}) {
  const copy = await invitePreviewCopy(params.token);
  return new ImageResponse(
    (
      <div
        style={{
          background: "#F6F1E7",
          width: "100%",
          height: "100%",
          display: "flex",
          padding: "56px",
          color: "#1C1915",
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
          <div
            style={{
              fontSize: 22,
              letterSpacing: 3,
              color: "#8E3A42",
              fontFamily: "system-ui",
            }}
          >
            ELF MATCH
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontFamily: "Georgia, serif",
              fontSize: 64,
              lineHeight: 1.05,
              color: "#1E3A32",
            }}
          >
            {copy.hostName} is inviting you to
            <div style={{ marginTop: 12 }}>{copy.exchangeName}</div>
          </div>
          <div style={{ fontFamily: "system-ui", fontSize: 28, color: "#5C564C" }}>
            Join the exchange
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
