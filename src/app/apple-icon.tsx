import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";
export const size = {
  width: 180,
  height: 180,
};

export default function AppleIconRoute() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #0f172a 0%, #1d4ed8 55%, #38bdf8 100%)",
          borderRadius: 40,
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#e2e8f0",
            fontSize: 54,
            fontWeight: 700,
            letterSpacing: -3,
            background: "rgba(2, 6, 23, 0.34)",
            border: "1px solid rgba(226, 232, 240, 0.22)",
          }}
        >
          IP
        </div>
      </div>
    ),
    size,
  );
}