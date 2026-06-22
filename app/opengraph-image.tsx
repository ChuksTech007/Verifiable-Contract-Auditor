import { ImageResponse } from "next/og";

export const alt = "Verifiable Contract Auditor — TEE-Attested AI Audit";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0d1117 0%, #0f1923 60%, #0d1f17 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Grid pattern overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(16,185,129,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Shield icon */}
        <div style={{ display: "flex", marginBottom: "36px" }}>
          <svg width="100" height="100" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L20 5.8V11.5C20 16.1 16.5 20.4 12 21.5C7.5 20.4 4 16.1 4 11.5V5.8L12 2Z"
              fill="#10b981"
            />
            <path
              d="M9 11.5L11.2 13.7L15.5 9"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            color: "white",
            fontSize: "60px",
            fontWeight: "bold",
            textAlign: "center",
            letterSpacing: "-1px",
            lineHeight: 1.1,
          }}
        >
          Verifiable Contract Auditor
        </div>

        {/* Subtitle */}
        <div
          style={{
            color: "#6b7280",
            fontSize: "24px",
            marginTop: "20px",
            textAlign: "center",
          }}
        >
          AI-powered Solidity security analysis · Powered by 0G Compute Network
        </div>

        {/* Badge */}
        <div
          style={{
            marginTop: "44px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.4)",
            borderRadius: "100px",
            padding: "10px 28px",
            color: "#10b981",
            fontSize: "20px",
            fontWeight: "600",
          }}
        >
          <span style={{ fontSize: "18px" }}>●</span>
          Verified via 0G Compute (TEE)
        </div>
      </div>
    ),
    { ...size }
  );
}
