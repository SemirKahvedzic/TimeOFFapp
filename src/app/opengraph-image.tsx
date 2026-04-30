import { ImageResponse } from "next/og";
import { getCompany } from "@/lib/company";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Time off, simplified";
export const dynamic = "force-dynamic";

export default async function OpengraphImage() {
  const company = await getCompany().catch(() => null);
  const name = company?.name ?? "TimeOff";
  const tagline = company?.tagline ?? "Time off, simplified";
  const brand = company?.brandColor ?? "#7c5cff";
  const accent = company?.accentColor ?? "#ff8fb1";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, #f6f5fb 0%, #ffffff 50%, #faf8ff 100%)`,
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Soft brand glow blob */}
        <div
          style={{
            position: "absolute",
            top: -200,
            left: -200,
            width: 700,
            height: 700,
            borderRadius: "50%",
            background: brand,
            opacity: 0.18,
            filter: "blur(80px)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -250,
            right: -150,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: accent,
            opacity: 0.18,
            filter: "blur(80px)",
            display: "flex",
          }}
        />

        {/* Brand label */}
        <div
          style={{
            display: "flex",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#8d8aa3",
            marginBottom: 28,
          }}
        >
          {name}
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "#1a1a2e",
            textAlign: "center",
            padding: "0 80px",
            lineHeight: 1.05,
          }}
        >
          {tagline}
        </div>

        {/* Sub-label */}
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "#5b5874",
            marginTop: 32,
            padding: "0 120px",
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          Request, approve, and track vacation in one shared calendar.
        </div>

        {/* Accent bar */}
        <div
          style={{
            display: "flex",
            marginTop: 48,
            height: 6,
            width: 220,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${brand}, ${accent})`,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
