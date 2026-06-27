import React, { useState } from "react";

const SLIDES = [
  {
    gradient: "linear-gradient(160deg, rgba(99,102,241,0.18) 0%, rgba(6,182,212,0.08) 100%)",
    icon: (
      <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="46" fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.25)" strokeWidth="1.5"/>
        {/* Phone handset */}
        <path
          d="M35 42c2.3 4.6 6.3 8.4 10.9 10.9l3.6-3.6c.45-.45 1.1-.6 1.7-.4 1.85.62 3.82.94 5.9.94.9 0 1.65.74 1.65 1.65v5.78c0 .9-.75 1.65-1.65 1.65C41.06 59 30 47.94 30 34.45c0-.9.75-1.65 1.65-1.65h5.78c.9 0 1.65.74 1.65 1.65 0 2.1.32 4.1.94 5.9.17.57.02 1.22-.39 1.63L35 42z"
          fill="rgba(99,102,241,0.7)"
          strokeWidth="0"
        />
        {/* Signal waves */}
        <path d="M60 34a8 8 0 010 16" stroke="rgba(6,182,212,0.5)" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M64 30a14 14 0 010 24" stroke="rgba(6,182,212,0.3)" strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
    ),
    title: "Track Every Cold Call",
    subtitle:
      "Keep a real-time log of every business you contact. Never lose track of a lead again.",
  },
  {
    gradient: "linear-gradient(160deg, rgba(6,182,212,0.15) 0%, rgba(16,185,129,0.08) 100%)",
    icon: (
      <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="46" fill="rgba(6,182,212,0.1)" stroke="rgba(6,182,212,0.2)" strokeWidth="1.5"/>
        {/* List / queue */}
        <rect x="28" y="34" width="44" height="8" rx="4" fill="rgba(6,182,212,0.5)"/>
        <rect x="28" y="47" width="36" height="8" rx="4" fill="rgba(6,182,212,0.35)"/>
        <rect x="28" y="60" width="28" height="8" rx="4" fill="rgba(6,182,212,0.2)"/>
        {/* Play arrow */}
        <circle cx="66" cy="64" r="12" fill="rgba(16,185,129,0.25)" stroke="rgba(16,185,129,0.5)" strokeWidth="1.5"/>
        <path d="M62 60l8 4-8 4V60z" fill="rgba(16,185,129,0.8)"/>
      </svg>
    ),
    title: "Your Daily Call Queue",
    subtitle:
      "Start each day knowing exactly who to call. Follow-ups are auto-prioritised by due date.",
  },
  {
    gradient: "linear-gradient(160deg, rgba(168,85,247,0.15) 0%, rgba(6,182,212,0.08) 100%)",
    icon: (
      <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="46" fill="rgba(168,85,247,0.1)" stroke="rgba(168,85,247,0.2)" strokeWidth="1.5"/>
        {/* Checkmark circle */}
        <circle cx="50" cy="48" r="18" fill="rgba(168,85,247,0.15)" stroke="rgba(168,85,247,0.4)" strokeWidth="2"/>
        <path d="M41 48l7 7 11-12" stroke="rgba(168,85,247,0.85)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Calendar */}
        <rect x="30" y="67" width="40" height="12" rx="6" fill="rgba(168,85,247,0.2)" stroke="rgba(168,85,247,0.35)" strokeWidth="1.2"/>
        <path d="M37 73h26" stroke="rgba(168,85,247,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: "Log Outcomes Instantly",
    subtitle:
      "Record call results, reschedule follow-ups, and track demos — all in one tap.",
  },
];

export function OnboardingFlow({ onComplete }) {
  const [slide, setSlide] = useState(0);
  const [exiting, setExiting] = useState(false);
  const isLast = slide === SLIDES.length - 1;

  function next() {
    if (isLast) {
      finish();
      return;
    }
    setSlide((s) => s + 1);
  }

  function finish() {
    localStorage.setItem("calltrack_onboarded", "1");
    onComplete();
  }

  const current = SLIDES[slide];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", flexDirection: "column",
      background: "linear-gradient(160deg, #080514 0%, #07040f 50%, #080c18 100%)",
      paddingTop: "env(safe-area-inset-top)",
      paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)",
    }}>
      {/* Background glow transitions with slide */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: current.gradient,
        transition: "background 0.5s ease",
      }} />

      {/* Skip */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 20px 0", position: "relative", zIndex: 1 }}>
        <button
          onClick={finish}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 999, padding: "7px 16px",
            fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.45)",
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Skip
        </button>
      </div>

      {/* Slide content */}
      <div
        key={slide}
        style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "0 32px",
          position: "relative", zIndex: 1,
          animation: "slideUp 0.42s cubic-bezier(0.34,1.56,0.64,1) both",
          textAlign: "center",
        }}
      >
        <div style={{ marginBottom: 36, filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.35))" }}>
          {current.icon}
        </div>
        <h2 style={{
          fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em",
          color: "white", margin: 0, marginBottom: 14,
        }}>
          {current.title}
        </h2>
        <p style={{
          fontSize: 15, fontWeight: 500,
          color: "rgba(255,255,255,0.5)",
          lineHeight: 1.6, margin: 0,
          maxWidth: 300,
        }}>
          {current.subtitle}
        </p>
      </div>

      {/* Progress dots + CTA */}
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 24,
        padding: "0 24px",
        position: "relative", zIndex: 1,
      }}>
        {/* Dots */}
        <div style={{ display: "flex", gap: 7 }}>
          {SLIDES.map((_, i) => (
            <div
              key={i}
              onClick={() => setSlide(i)}
              style={{
                width: i === slide ? 24 : 7,
                height: 7,
                borderRadius: 999,
                background: i === slide
                  ? "linear-gradient(90deg, #06b6d4, #6366f1)"
                  : "rgba(255,255,255,0.2)",
                transition: "all 0.35s cubic-bezier(0.34,1.56,0.64,1)",
                cursor: "pointer",
              }}
            />
          ))}
        </div>

        {/* CTA button */}
        <button
          onClick={next}
          style={{
            width: "100%",
            padding: "18px",
            borderRadius: 20,
            border: "none",
            background: "linear-gradient(135deg, #06b6d4 0%, #6366f1 60%, #a855f7 100%)",
            color: "white",
            fontSize: 16, fontWeight: 800,
            fontFamily: "inherit",
            letterSpacing: "0.01em",
            cursor: "pointer",
            boxShadow: "0 8px 28px rgba(99,102,241,0.5), 0 1px 0 rgba(255,255,255,0.15) inset",
            transition: "all 0.22s ease",
          }}
          onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
          onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
          onTouchStart={e => e.currentTarget.style.transform = "scale(0.97)"}
          onTouchEnd={e => e.currentTarget.style.transform = "scale(1)"}
        >
          {isLast ? "Get Started →" : "Continue →"}
        </button>
      </div>
    </div>
  );
}
