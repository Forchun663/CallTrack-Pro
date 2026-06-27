import React, { useState } from "react";
import { statusMeta, isDue, relativeDate } from "../utils/helpers";
import { ActionSheet } from "./ActionSheet";

function initials(name) {
  return (name || "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

const STATUS_COLOR = {
  interested:  "#34d399",
  not_called:  "rgba(255,255,255,0.15)",
  no_answer:   "#94a3b8",
  follow_up:   "#fb923c",
  maybe:       "#fbbf24",
  demo_sent:   "#818cf8",
  no:          "#f87171",
  closed:      "#4ade80",
};

export function LeadCard({ lead, onStatus, onDemoStatus, onEdit, onDelete, onSelect, onTriggerResolution, push, selected, onToggleSelect }) {
  const [expanded, setExpanded] = useState(false);
  const [deleteSheet, setDeleteSheet] = useState(false);

  const meta = statusMeta(lead.status);
  const due = isDue(lead.nextFollowUp) && lead.status !== "no" && lead.status !== "closed";
  const accentColor = due ? "#fbbf24" : STATUS_COLOR[lead.status] || "rgba(255,255,255,0.12)";

  const QUICK = [
    { key: "interested", label: "Interested",  color: "#34d399", bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.2)" },
    { key: "no_answer",  label: "No Answer",   color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.15)" },
    { key: "maybe",      label: "Maybe",       color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.2)" },
    { key: "follow_up",  label: "Follow Up",   color: "#fb923c", bg: "rgba(251,146,60,0.1)",  border: "rgba(251,146,60,0.2)" },
    { key: "demo_sent",  label: "Demo Sent",   color: "#818cf8", bg: "rgba(129,140,248,0.1)", border: "rgba(129,140,248,0.2)" },
  ];

  return (
    <>
      <article
        onClick={() => onSelect(lead)}
        style={{
          background: selected ? "rgba(34,211,238,0.05)" : "var(--c-surface)",
          border: `1px solid ${selected ? "rgba(34,211,238,0.25)" : due ? "rgba(251,191,36,0.18)" : "var(--c-border)"}`,
          borderRadius: 18,
          overflow: "hidden",
          transition: "all 0.18s ease",
          cursor: "pointer",
        }}
      >
        {/* ── Main row ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 14px 14px 16px" }}>
          {/* Status bar + checkbox */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <input
              type="checkbox"
              checked={selected || false}
              onChange={onToggleSelect}
              onClick={e => e.stopPropagation()}
              style={{ width: 16, height: 16, accentColor: "#22d3ee", cursor: "pointer" }}
            />
          </div>

          {/* Avatar */}
          <div style={{
            width: 42, height: 42, borderRadius: 14, flexShrink: 0,
            background: "var(--c-surface2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color: "var(--c-text-2)",
            borderLeft: `3px solid ${accentColor}`,
            border: `1px solid var(--c-border)`,
            borderLeftWidth: 3,
            borderLeftColor: accentColor,
          }}>
            {initials(lead.businessName)}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 14, fontWeight: 700,
              color: "var(--c-text-1)",
              overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
              marginBottom: 3,
            }}>
              {lead.businessName}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {/* Status pill */}
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                color: accentColor,
                background: `${accentColor}18`,
                borderRadius: 999, padding: "2px 7px",
                border: `1px solid ${accentColor}30`,
                whiteSpace: "nowrap",
              }}>
                {meta.label}
              </span>
              {/* Phone */}
              {lead.phone && (
                <span style={{ fontSize: 11, color: "var(--c-text-3)", fontWeight: 500 }}>
                  {lead.phone}
                </span>
              )}
              {/* Due badge */}
              {due && (
                <span style={{ fontSize: 9, fontWeight: 800, color: "#fbbf24", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Due
                </span>
              )}
            </div>
          </div>

          {/* Right action — call or expand */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="call-btn"
                style={{ width: 40, height: 40, borderRadius: 12 }}
                title={`Call ${lead.phone}`}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.32.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C9.57 21 3 14.43 3 6c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.26.2 2.48.57 3.61.11.35.03.74-.27 1.01L6.6 10.8z"/>
                </svg>
              </a>
            )}
            {/* Expand toggle */}
            <button
              onClick={() => setExpanded(x => !x)}
              style={{
                width: 40, height: 40, borderRadius: 12,
                background: "transparent",
                border: "1px solid var(--c-border)",
                color: "var(--c-text-3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0,
                transition: "all 0.2s ease",
              }}
              title="More actions"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.25s ease" }}>
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Expanded panel ── */}
        {expanded && (
          <div
            onClick={e => e.stopPropagation()}
            style={{
              borderTop: "1px solid var(--c-border)",
              padding: "14px 16px",
              display: "flex", flexDirection: "column", gap: 14,
              animation: "accordionOpen 0.2s ease both",
            }}
          >
            {/* Contact info row */}
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {lead.phone && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "var(--c-text-2)", fontWeight: 500 }}>{lead.phone}</span>
                  <a href={`tel:${lead.phone}`} style={{ fontSize: 11, fontWeight: 700, color: "var(--c-accent)", textDecoration: "none" }}>Call →</a>
                </div>
              )}
              {lead.email && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "var(--c-text-2)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.email}</span>
                  <a href={`mailto:${lead.email}`} style={{ fontSize: 11, fontWeight: 700, color: "var(--c-accent)", textDecoration: "none", flexShrink: 0, marginLeft: 8 }}>Email →</a>
                </div>
              )}
              {lead.address && (
                <span style={{ fontSize: 12, color: "var(--c-text-3)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  📍 {lead.address}
                </span>
              )}
              {lead.lastContacted && (
                <span style={{ fontSize: 11, color: "var(--c-text-3)" }}>Last called: {relativeDate(lead.lastContacted)}</span>
              )}
              {lead.notes && (
                <p style={{
                  fontSize: 12, color: "var(--c-text-2)", lineHeight: 1.5,
                  margin: 0, padding: "10px 12px",
                  background: "var(--c-surface2)", borderRadius: 10,
                  overflow: "hidden", display: "-webkit-box",
                  WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
                }}>
                  {lead.notes}
                </p>
              )}
            </div>

            {/* Quick status buttons */}
            <div>
              <div className="label" style={{ marginBottom: 8 }}>Log Outcome</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {QUICK.map(q => (
                  <button
                    key={q.key}
                    onClick={() => onStatus(lead.id, q.key)}
                    style={{
                      padding: "7px 13px", borderRadius: 999,
                      background: lead.status === q.key ? q.bg : "transparent",
                      border: `1px solid ${lead.status === q.key ? q.border : "var(--c-border)"}`,
                      color: lead.status === q.key ? q.color : "var(--c-text-3)",
                      fontSize: 11, fontWeight: 700,
                      cursor: "pointer", fontFamily: "inherit",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reschedule quick actions */}
            <div style={{ display: "flex", gap: 7 }}>
              <button
                onClick={() => onTriggerResolution(lead, "reschedule")}
                style={{
                  flex: 1, padding: "10px",
                  borderRadius: 12,
                  background: "var(--c-surface2)",
                  border: "1px solid var(--c-border)",
                  color: "var(--c-text-2)",
                  fontSize: 12, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Reschedule
              </button>
              <button
                onClick={() => onEdit(lead)}
                style={{
                  flex: 1, padding: "10px",
                  borderRadius: 12,
                  background: "var(--c-surface2)",
                  border: "1px solid var(--c-border)",
                  color: "var(--c-text-2)",
                  fontSize: 12, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Edit
              </button>
              <button
                onClick={() => setDeleteSheet(true)}
                style={{
                  width: 44, height: 44, padding: 0,
                  borderRadius: 12, flexShrink: 0,
                  background: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.18)",
                  color: "#f87171",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* View full details */}
            <button
              onClick={() => onSelect(lead)}
              style={{
                padding: "11px",
                borderRadius: 12,
                background: "var(--c-accent-dim)",
                border: "1px solid rgba(34,211,238,0.15)",
                color: "var(--c-accent)",
                fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              View Full Details
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        )}
      </article>

      <ActionSheet
        open={deleteSheet}
        onClose={() => setDeleteSheet(false)}
        title="Delete lead?"
        message={`"${lead.businessName}" and all its history will be removed.`}
        actions={[
          { label: "Delete Lead", style: "destructive", onPress: () => onDelete(lead.id) },
          { label: "Cancel", style: "cancel" },
        ]}
      />
    </>
  );
}
