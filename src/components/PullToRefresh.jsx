import React, { useRef, useState, useCallback } from "react";

/**
 * PullToRefresh — Wraps scroll content with a pull-down-to-refresh gesture.
 * On pull past threshold, calls onRefresh(). Shows native-style spinner.
 */
export function PullToRefresh({ children, onRefresh, disabled = false }) {
  const containerRef = useRef(null);
  const startY = useRef(null);
  const [pullDelta, setPullDelta] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const THRESHOLD = 72;

  const onTouchStart = useCallback((e) => {
    if (disabled || refreshing) return;
    const el = containerRef.current;
    if (el && el.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, [disabled, refreshing]);

  const onTouchMove = useCallback((e) => {
    if (startY.current === null || disabled || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy < 0) { startY.current = null; return; }
    // Rubber-band feel: diminishing returns after threshold
    const clamped = Math.min(dy * 0.45, THRESHOLD * 1.3);
    setPullDelta(clamped);
    if (dy > 5) {
      try { e.preventDefault(); } catch (_) {}
    }
  }, [disabled, refreshing]);

  const onTouchEnd = useCallback(async () => {
    if (startY.current === null) return;
    startY.current = null;

    if (pullDelta >= THRESHOLD) {
      setRefreshing(true);
      setPullDelta(THRESHOLD); // Snap to threshold height
      try {
        await onRefresh();
      } catch (_) {}
      setRefreshing(false);
    }
    setPullDelta(0);
  }, [pullDelta, onRefresh]);

  const progress = Math.min(pullDelta / THRESHOLD, 1);
  const indicatorOpacity = Math.min(progress * 1.5, 1);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {/* Pull indicator */}
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: Math.max(pullDelta, refreshing ? THRESHOLD : 0),
          overflow: "hidden",
          transition: refreshing || pullDelta === 0 ? "height 0.3s cubic-bezier(0.32,0.72,0,1)" : "none",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <div style={{
          opacity: indicatorOpacity,
          transform: `rotate(${progress * 360}deg) scale(${0.5 + progress * 0.5})`,
          transition: refreshing ? "opacity 0.2s ease" : "none",
        }}>
          {refreshing ? (
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              border: "2.5px solid rgba(6,182,212,0.25)",
              borderTopColor: "#06b6d4",
              animation: "spin 0.7s linear infinite",
            }} />
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 4v4M12 4l-2 2M12 4l2 2" stroke="rgba(6,182,212,0.7)" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="14" r="6" stroke="rgba(6,182,212,0.4)" strokeWidth="1.5"/>
            </svg>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          transform: `translateY(${Math.max(pullDelta, refreshing ? THRESHOLD : 0)}px)`,
          transition: refreshing || pullDelta === 0 ? "transform 0.3s cubic-bezier(0.32,0.72,0,1)" : "none",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
}
