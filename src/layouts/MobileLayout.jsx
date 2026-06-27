import React, { useState, useRef } from "react";
import { useHaptics } from "../hooks/useHaptics";

/* ── Icons (custom SVG to avoid extra deps) ── */
function HomeIcon({ filled }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        fill={filled ? "rgba(34,211,238,0.15)" : "none"}
        stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 21V13h6v8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function PhoneIcon({ filled }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.32.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C9.57 21 3 14.43 3 6c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.26.2 2.48.57 3.61.11.35.03.74-.27 1.01L6.6 10.8z"
        fill={filled ? "rgba(34,211,238,0.15)" : "none"}
        stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  );
}
function SearchIcon({ filled }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="10.5" cy="10.5" r="6.5"
        fill={filled ? "rgba(34,211,238,0.12)" : "none"}
        stroke="currentColor" strokeWidth="1.75"/>
      <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/>
    </svg>
  );
}
function MoreIcon({ filled }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
      <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
    </svg>
  );
}

const TABS = [
  { key: "dashboard", label: "Home",   icon: (a) => <HomeIcon filled={a} /> },
  { key: "queue",     label: "Calls",  icon: (a) => <PhoneIcon filled={a} />, badge: true },
  { key: "add",       label: "Add",    icon: ()  => <PlusIcon />,              prominent: true },
  { key: "search",    label: "Leads",  icon: (a) => <SearchIcon filled={a} /> },
  { key: "settings",  label: "More",   icon: (a) => <MoreIcon filled={a} /> },
];

/* ── Toast Pill ── */
const TOAST_META = {
  success: { bg: "rgba(22,163,74,0.9)",    border: "rgba(52,211,153,0.3)",  icon: "✓" },
  error:   { bg: "rgba(153,27,27,0.9)",    border: "rgba(248,113,113,0.3)", icon: "✕" },
  warning: { bg: "rgba(120,53,15,0.9)",    border: "rgba(251,191,36,0.3)",  icon: "!" },
  info:    { bg: "rgba(15,15,15,0.95)",    border: "rgba(255,255,255,0.1)", icon: "·" },
};

function ToastPill({ toast, onDismiss }) {
  const m = TOAST_META[toast.type] || TOAST_META.info;
  const startX = useRef(null);
  const [dx, setDx] = useState(0);

  return (
    <div
      onClick={() => onDismiss(toast.id)}
      onTouchStart={e => { startX.current = e.touches[0].clientX; }}
      onTouchMove={e => {
        if (!startX.current) return;
        setDx(e.touches[0].clientX - startX.current);
      }}
      onTouchEnd={() => {
        if (Math.abs(dx) > 70) onDismiss(toast.id);
        else setDx(0);
        startX.current = null;
      }}
      className="toast-pill"
      style={{
        background: m.bg,
        border: `1px solid ${m.border}`,
        color: "white",
        transform: `translateX(${dx}px)`,
        opacity: Math.abs(dx) > 40 ? 0.6 : 1,
        transition: dx === 0 ? "opacity 0.2s ease" : "none",
      }}
    >
      <span style={{ fontWeight: 800, fontSize: 13 }}>{m.icon}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{toast.msg}</span>
    </div>
  );
}

export function MobileLayout({ activeTab, setActiveTab, session, onLogout, dueCount, toasts = [], onDismissToast, children }) {
  const haptics = useHaptics();
  const [pressed, setPressed] = useState(null);

  function changeTab(key) {
    if (key === activeTab) return;
    haptics.light();
    setActiveTab(key);
  }

  return (
    <div style={{
      height: "100dvh",
      display: "flex",
      flexDirection: "column",
      background: "var(--c-bg)",
      paddingTop: "var(--safe-top)",
    }}>
      {/* ── Toast Stack (top) ── */}
      {toasts.length > 0 && (
        <div style={{
          position: "fixed",
          top: "calc(var(--safe-top) + 12px)",
          left: 0, right: 0, zIndex: 9998,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          pointerEvents: "none",
          padding: "0 20px",
        }}>
          {toasts.map(t => (
            <div key={t.id} style={{ pointerEvents: "all", width: "fit-content", maxWidth: "100%" }}>
              <ToastPill toast={t} onDismiss={onDismissToast} />
            </div>
          ))}
        </div>
      )}

      {/* ── Header ── */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 20px",
        borderBottom: "1px solid var(--c-border)",
        flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: "linear-gradient(135deg, #22d3ee, #6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.32.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C9.57 21 3 14.43 3 6c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.26.2 2.48.57 3.61.11.35.03.74-.27 1.01L6.6 10.8z" fill="white"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 8.5, fontWeight: 700, color: "rgba(34,211,238,0.6)", letterSpacing: "0.15em", textTransform: "uppercase", lineHeight: 1 }}>Workspace</div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.03em", color: "white", lineHeight: 1.15 }}>CallTrack Pro</div>
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {dueCount > 0 && (
            <button
              onClick={() => changeTab("queue")}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 10px",
                borderRadius: "var(--r-pill)",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#f87171",
                fontSize: 11, fontWeight: 800,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#ef4444", animation: "pulse 1.5s ease infinite", flexShrink: 0 }} />
              {dueCount} due
            </button>
          )}
          {session && (
            <button
              onClick={() => { haptics.medium(); onLogout(); }}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--r-md)",
                border: "1px solid var(--c-border)",
                background: "transparent",
                color: "var(--c-text-3)",
                fontSize: 11, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Sign out
            </button>
          )}
        </div>
      </header>

      {/* ── Main Content ── */}
      <main style={{
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain",
        paddingBottom: "calc(60px + var(--safe-bottom) + 12px)",
      }}>
        <div style={{ padding: "16px 16px 0" }}>
          {children}
        </div>
      </main>

      {/* ── Bottom Nav ── */}
      <nav className="nav-bar">
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const isAdd = tab.prominent;
          const isPress = pressed === tab.key;

          return (
            <button
              key={tab.key}
              className={`nav-tab${isActive ? " active" : ""}`}
              onClick={() => changeTab(tab.key)}
              onPointerDown={() => setPressed(tab.key)}
              onPointerUp={() => setPressed(null)}
              onPointerLeave={() => setPressed(null)}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              style={{
                transform: isPress ? "scale(0.88)" : "scale(1)",
                transition: isPress ? "transform 0.08s ease" : "transform 0.24s cubic-bezier(0.34,1.56,0.64,1)",
              }}
            >
              {/* Add button special treatment */}
              {isAdd ? (
                <div className="nav-add" style={{
                  color: isActive ? "white" : "rgba(34,211,238,0.7)",
                }}>
                  {tab.icon(isActive)}
                </div>
              ) : (
                <div className="nav-icon" style={{ position: "relative" }}>
                  {tab.icon(isActive)}
                  {tab.badge && dueCount > 0 && (
                    <div className="nav-badge">{dueCount > 9 ? "9+" : dueCount}</div>
                  )}
                </div>
              )}
              <span className="nav-label">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
