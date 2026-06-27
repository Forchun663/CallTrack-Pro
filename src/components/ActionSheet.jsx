import React, { useEffect, useRef } from "react";

/**
 * ActionSheet — iOS/Android-style native bottom sheet replacement for browser confirm().
 *
 * Usage:
 *   <ActionSheet
 *     open={open}
 *     onClose={() => setOpen(false)}
 *     title="Delete Lead?"
 *     message="This cannot be undone."
 *     actions={[
 *       { label: "Delete", style: "destructive", onPress: () => handleDelete() },
 *       { label: "Cancel", style: "cancel" },
 *     ]}
 *   />
 */
export function ActionSheet({ open, onClose, title, message, actions = [] }) {
  const sheetRef = useRef(null);
  const startY = useRef(null);
  const currentY = useRef(0);

  useEffect(() => {
    if (!open) return;
    // Prevent body scroll while sheet open
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Drag-to-dismiss
  function onTouchStart(e) {
    startY.current = e.touches[0].clientY;
    currentY.current = 0;
  }

  function onTouchMove(e) {
    const dy = e.touches[0].clientY - startY.current;
    if (dy < 0) return;
    currentY.current = dy;
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${dy}px)`;
      sheetRef.current.style.transition = "none";
    }
  }

  function onTouchEnd() {
    if (currentY.current > 100) {
      onClose();
    } else {
      if (sheetRef.current) {
        sheetRef.current.style.transform = "";
        sheetRef.current.style.transition = "";
      }
    }
    currentY.current = 0;
  }

  if (!open) return null;

  const cancelAction = actions.find((a) => a.style === "cancel");
  const mainActions = actions.filter((a) => a.style !== "cancel");

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        display: "flex", flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
        padding: "0 12px",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          animation: "fadeIn 0.2s ease both",
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position: "relative", zIndex: 1,
          width: "100%", maxWidth: 480,
          animation: "slideInBottom 0.34s cubic-bezier(0.32,0.72,0,1) both",
          display: "flex", flexDirection: "column", gap: 8,
        }}
      >
        {/* Main group */}
        <div style={{
          background: "rgba(28,24,45,0.96)",
          backdropFilter: "blur(30px) saturate(1.6)",
          WebkitBackdropFilter: "blur(30px) saturate(1.6)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 18,
          overflow: "hidden",
        }}>
          {/* Title / Message */}
          {(title || message) && (
            <div style={{
              padding: "18px 20px 14px",
              textAlign: "center",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
            }}>
              {title && (
                <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: message ? 4 : 0 }}>
                  {title}
                </div>
              )}
              {message && (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
                  {message}
                </div>
              )}
            </div>
          )}

          {/* Main actions */}
          {mainActions.map((action, i) => (
            <button
              key={i}
              onClick={() => { action.onPress?.(); onClose(); }}
              style={{
                width: "100%", display: "block", textAlign: "center",
                padding: "17px 20px",
                fontSize: 17, fontWeight: action.style === "destructive" ? 600 : 500,
                color: action.style === "destructive"
                  ? "#ff453a"
                  : action.style === "default"
                  ? "#0a84ff"
                  : "rgba(255,255,255,0.85)",
                background: "transparent",
                border: "none",
                borderTop: i > 0 ? "1px solid rgba(255,255,255,0.07)" : "none",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background 0.15s ease",
                WebkitTapHighlightColor: "transparent",
              }}
              onMouseDown={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
              onMouseUp={e => e.currentTarget.style.background = "transparent"}
              onTouchStart={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
              onTouchEnd={e => e.currentTarget.style.background = "transparent"}
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Cancel — separate card */}
        {cancelAction && (
          <button
            onClick={() => { cancelAction.onPress?.(); onClose(); }}
            style={{
              width: "100%", display: "block", textAlign: "center",
              padding: "17px 20px",
              fontSize: 17, fontWeight: 600,
              color: "rgba(255,255,255,0.85)",
              background: "rgba(28,24,45,0.96)",
              backdropFilter: "blur(30px) saturate(1.6)",
              WebkitBackdropFilter: "blur(30px) saturate(1.6)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 18,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "background 0.15s ease",
              WebkitTapHighlightColor: "transparent",
            }}
            onMouseDown={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
            onMouseUp={e => e.currentTarget.style.background = "rgba(28,24,45,0.96)"}
            onTouchStart={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
            onTouchEnd={e => e.currentTarget.style.background = "rgba(28,24,45,0.96)"}
          >
            {cancelAction.label}
          </button>
        )}
      </div>
    </div>
  );
}
