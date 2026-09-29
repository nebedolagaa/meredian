import { ImageResponse } from "next/og";

export const alt = "Meredian — Train with precision.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          backgroundColor: "#0F1015",
          padding: "80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              width: 16,
              height: 16,
              borderRadius: 4,
              backgroundColor: "#A3E635",
            }}
          />
          <div
            style={{
              display: "flex",
              color: "#818CF8",
              fontSize: 28,
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            Meredian
          </div>
        </div>
        <div
          style={{
            display: "flex",
            color: "#ECECF2",
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.15,
            maxWidth: 900,
            marginTop: 48,
          }}
        >
          Train with precision.
        </div>
        <div
          style={{
            display: "flex",
            color: "rgba(236, 236, 242, 0.6)",
            fontSize: 28,
            marginTop: 28,
            maxWidth: 800,
          }}
        >
          Plan your workouts, log reality, and surface insights over time.
        </div>
      </div>
    ),
    { ...size },
  );
}
