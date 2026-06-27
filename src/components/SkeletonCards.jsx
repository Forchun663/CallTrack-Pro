import React from "react";

function SkeletonCard() {
  return (
    <div style={{
      borderRadius: 20,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.06)",
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      overflow: "hidden",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Avatar circle */}
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 14, flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="skeleton" style={{ height: 14, borderRadius: 7, width: "65%" }} />
          <div className="skeleton" style={{ height: 10, borderRadius: 5, width: "40%" }} />
        </div>
        {/* Status pill */}
        <div className="skeleton" style={{ height: 22, borderRadius: 11, width: 58, flexShrink: 0 }} />
      </div>
      {/* Body line */}
      <div className="skeleton" style={{ height: 10, borderRadius: 5, width: "80%" }} />
      {/* Action row */}
      <div style={{ display: "flex", gap: 8, paddingTop: 2 }}>
        <div className="skeleton" style={{ height: 34, borderRadius: 10, flex: 1 }} />
        <div className="skeleton" style={{ height: 34, borderRadius: 10, flex: 1 }} />
        <div className="skeleton" style={{ height: 34, width: 34, borderRadius: 10, flexShrink: 0 }} />
      </div>
    </div>
  );
}

export function SkeletonCards({ count = 4 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{ opacity: 1 - i * 0.18, animationDelay: `${i * 0.06}s` }}
        >
          <SkeletonCard />
        </div>
      ))}
    </div>
  );
}
