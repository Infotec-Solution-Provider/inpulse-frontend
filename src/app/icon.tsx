import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";
export const size = {
  width: 512,
  height: 512,
};

function Icon({ size }: { size: number }) {
  const borderRadius = Math.round(size * 0.22);
  const badgeSize = Math.round(size * 0.46);
  const fontSize = Math.round(size * 0.34);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg, #0f172a 0%, #1d4ed8 55%, #38bdf8 100%)",
      }}
    >
      <div
        style={{
          width: badgeSize,
          height: badgeSize,
          borderRadius,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#e2e8f0",
          fontSize,
          fontWeight: 700,
          letterSpacing: -6,
          background: "rgba(2, 6, 23, 0.34)",
          border: "1px solid rgba(226, 232, 240, 0.22)",
          boxShadow: "0 18px 60px rgba(2, 6, 23, 0.35)",
        }}
      >
        IP
      </div>
    </div>
  );
}

export default function IconRoute() {
  return new ImageResponse(<Icon size={size.width} />, size);
}