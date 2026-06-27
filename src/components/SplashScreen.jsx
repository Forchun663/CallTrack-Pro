import React, { useEffect, useState } from "react";

/**
 * SplashScreen — Animated launch screen shown during app boot.
 * Fades out after auth check completes.
 */
export function SplashScreen({ visible }) {
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    if (!visible) {
      setHiding(true);
    }
  }, [visible]);

  if (!visible && hiding) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg, #07040f 0%, #080c18 60%, #060312 100%)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingTop: "env(safe-area-inset-top)",
        transition: hiding ? "opacity 0.55s ease, transform 0.55s cubic-bezier(0.32,0.72,0,1)" : "none",
        opacity: hiding && !visible ? 0 : 1,
        transform: hiding && !visible ? "scale(1.06)" : "scale(1)",
        pointerEvents: hiding && !visible ? "none" : "all",
      }}
    >
      {/* Background glows */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "15%", left: "5%",
          width: "60vw", height: "60vw", maxWidth: 340,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)",
          filter: "blur(48px)",
          animation: "pulse 3s ease infinite",
        }} />
        <div style={{
          position: "absolute", bottom: "20%", right: "0%",
          width: "55vw", height: "55vw", maxWidth: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(6,182,212,0.18) 0%, transparent 70%)",
          filter: "blur(44px)",
          animation: "pulse 3.5s 0.5s ease infinite",
        }} />
      </div>

      {/* Logo / Icon */}
      <div style={{
        width: 96, height: 96,
        borderRadius: 28,
        background: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 55%, #a855f7 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 12px 48px rgba(99,102,241,0.55), 0 2px 0 rgba(255,255,255,0.18) inset",
        marginBottom: 28,
        animation: "scalePop 0.6s cubic-bezier(0.34,1.56,0.64,1) both",
      }}>
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none">
          <path
            d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.32.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C9.57 21 3 14.43 3 6c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.26.2 2.48.57 3.61.11.35.03.74-.27 1.01L6.6 10.8z"
            fill="white"
            fillOpacity="0.95"
          />
        </svg>
      </div>

      {/* App name */}
      <div style={{
        animation: "slideUp 0.5s 0.15s cubic-bezier(0.34,1.56,0.64,1) both",
        opacity: 0,
        animationFillMode: "forwards",
        textAlign: "center",
      }}>
        <h1 style={{
          fontSize: 30, fontWeight: 900,
          letterSpacing: "-0.025em",
          background: "linear-gradient(90deg, #fff 20%, #a5f3fc 55%, #c4b5fd 90%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          margin: 0, marginBottom: 6,
        }}>
          CallTrack Pro
        </h1>
        <p style={{
          fontSize: 12, fontWeight: 600,
          color: "rgba(255,255,255,0.35)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          margin: 0,
        }}>
          Team Workspace
        </p>
      </div>

      {/* Loading dots */}
      <div style={{
        display: "flex", gap: 6,
        marginTop: 52,
        animation: "fadeIn 0.4s 0.4s ease both",
        opacity: 0,
        animationFillMode: "forwards",
      }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 6, height: 6,
              borderRadius: "50%",
              background: "rgba(6,182,212,0.6)",
              animation: `pulse 1.2s ${i * 0.2}s ease infinite`,
            }}
          />
        ))}
      </div>

      {/* Version */}
      <div style={{
        position: "absolute",
        bottom: "calc(env(safe-area-inset-bottom) + 24px)",
        fontSize: 10,
        fontWeight: 600,
        color: "rgba(255,255,255,0.18)",
        letterSpacing: "0.08em",
      }}>
        v2.0.0 · Powered by Supabase
      </div>
    </div>
  );
}
