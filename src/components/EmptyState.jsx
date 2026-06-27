import React from "react";

const PRESETS = {
  leads: {
    icon: (
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="28" fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.2)" strokeWidth="1.5"/>
        <path d="M20 42c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="rgba(99,102,241,0.5)" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="32" cy="24" r="6" stroke="rgba(99,102,241,0.5)" strokeWidth="2"/>
        <path d="M26 36l6 6 6-6" stroke="rgba(99,102,241,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "No leads yet",
    subtitle: "Add your first business lead to start tracking calls.",
    cta: null,
  },
  queue: {
    icon: (
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="28" fill="rgba(16,185,129,0.1)" stroke="rgba(16,185,129,0.2)" strokeWidth="1.5"/>
        <path d="M22 32l8 8 14-14" stroke="rgba(16,185,129,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="46" cy="20" r="8" fill="rgba(16,185,129,0.15)" stroke="rgba(16,185,129,0.3)" strokeWidth="1.5"/>
        <path d="M43 20h3v-3" stroke="rgba(16,185,129,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: "All caught up! 🎉",
    subtitle: "No calls are due right now. Check back later or add a new lead.",
    cta: null,
  },
  search: {
    icon: (
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="28" fill="rgba(6,182,212,0.08)" stroke="rgba(6,182,212,0.15)" strokeWidth="1.5"/>
        <circle cx="29" cy="29" r="11" stroke="rgba(6,182,212,0.45)" strokeWidth="2"/>
        <path d="M37 37l8 8" stroke="rgba(6,182,212,0.45)" strokeWidth="2" strokeLinecap="round"/>
        <path d="M25 29h8M29 25v8" stroke="rgba(6,182,212,0.3)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: "No results",
    subtitle: "No leads match your search. Try a different name, phone number, or category.",
    cta: null,
  },
  activity: {
    icon: (
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="28" fill="rgba(168,85,247,0.08)" stroke="rgba(168,85,247,0.15)" strokeWidth="1.5"/>
        <path d="M20 36l6-8 6 4 6-10 6 4" stroke="rgba(168,85,247,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="44" cy="26" r="3" fill="rgba(168,85,247,0.4)"/>
      </svg>
    ),
    title: "No activity yet",
    subtitle: "Call outcomes and notes will appear here after you log a call.",
    cta: null,
  },
};

export function EmptyState({ type = "leads", title, subtitle, onCta, ctaLabel, style }) {
  const preset = PRESETS[type] || PRESETS.leads;
  const displayTitle = title ?? preset.title;
  const displaySubtitle = subtitle ?? preset.subtitle;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "40px 24px 32px",
      gap: 14,
      ...style,
    }}>
      <div style={{
        marginBottom: 4,
        filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.3))",
        animation: "fadeIn 0.4s ease both",
      }}>
        {preset.icon}
      </div>
      <div style={{ animation: "slideUp 0.35s 0.1s ease both", opacity: 0, animationFillMode: "forwards" }}>
        <div style={{
          fontSize: 17, fontWeight: 800,
          color: "rgba(255,255,255,0.78)",
          marginBottom: 6,
          letterSpacing: "-0.01em",
        }}>
          {displayTitle}
        </div>
        <div style={{
          fontSize: 13, fontWeight: 500,
          color: "rgba(255,255,255,0.38)",
          lineHeight: 1.55,
          maxWidth: 260,
        }}>
          {displaySubtitle}
        </div>
      </div>
      {onCta && ctaLabel && (
        <button
          onClick={onCta}
          style={{
            marginTop: 8,
            padding: "11px 24px",
            borderRadius: 999,
            border: "none",
            background: "linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)",
            color: "white",
            fontSize: 13,
            fontWeight: 800,
            fontFamily: "inherit",
            cursor: "pointer",
            boxShadow: "0 4px 18px rgba(99,102,241,0.4)",
            animation: "slideUp 0.35s 0.2s ease both",
            opacity: 0,
            animationFillMode: "forwards",
          }}
          onMouseDown={e => e.currentTarget.style.transform = "scale(0.96)"}
          onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
