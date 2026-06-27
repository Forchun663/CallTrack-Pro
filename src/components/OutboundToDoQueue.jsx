import React, { useState, useMemo } from "react";
import { todayStr, tomorrowStr, isDue, statusMeta } from "../utils/helpers";
import { EmptyState } from "./EmptyState";
import { ActionSheet } from "./ActionSheet";

/* ── Chevron icon ── */
function Chevron({ open }) {
  return (
    <div className={`accordion-chevron${open ? " open" : ""}`}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

/* ── Lead row inside an accordion group ── */
function LeadRow({ lead, onSelect, onTriggerResolution, onDelete, push }) {
  const [deleteSheet, setDeleteSheet] = useState(false);
  const meta = statusMeta(lead.status);
  const due = isDue(lead.nextFollowUp) && lead.status !== "no" && lead.status !== "closed";

  // Avatar initials
  const initials = (lead.businessName || "?")
    .split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  return (
    <>
      <div
        className="lead-row"
        style={{ "--status-color": due ? "#fbbf24" : meta.color || "transparent" }}
        onClick={() => onSelect(lead)}
      >
        {/* Avatar */}
        <div className="avatar" style={{
          background: due ? "rgba(251,191,36,0.1)" : "var(--c-surface2)",
          border: `1px solid ${due ? "rgba(251,191,36,0.2)" : "var(--c-border)"}`,
          color: due ? "#fbbf24" : "var(--c-text-2)",
        }}>
          {initials}
        </div>

        {/* Name + phone */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: "var(--c-text-1)",
            overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
          }}>
            {lead.businessName}
          </div>
          <div style={{
            fontSize: 12, color: "var(--c-text-3)", marginTop: 2,
            fontWeight: 500, letterSpacing: "0.01em",
            overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
          }}>
            {lead.phone || "No phone"}
            {due && <span style={{ color: "#fbbf24", marginLeft: 8, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em" }}>DUE</span>}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          {/* Quick outcomes — only show on tap of more button */}
          <button
            onClick={() => onTriggerResolution(lead, "interested")}
            style={{
              height: 36, padding: "0 11px",
              borderRadius: 11,
              background: "rgba(52,211,153,0.1)",
              border: "1px solid rgba(52,211,153,0.2)",
              color: "#34d399",
              fontSize: 11, fontWeight: 700,
              fontFamily: "inherit",
            }}
            title="Interested — wants demo"
          >
            Yes
          </button>

          {/* Call button */}
          {lead.phone ? (
            <a
              href={`tel:${lead.phone}`}
              className="call-btn"
              title={`Call ${lead.phone}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.32.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C9.57 21 3 14.43 3 6c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.26.2 2.48.57 3.61.11.35.03.74-.27 1.01L6.6 10.8z" fill="currentColor"/>
              </svg>
            </a>
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "var(--c-surface2)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.4 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.32.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C9.57 21 3 14.43 3 6c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.26.2 2.48.57 3.61.11.35.03.74-.27 1.01L6.6 10.8z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              </svg>
            </div>
          )}

          {/* No answer shortcut */}
          <button
            onClick={() => onTriggerResolution(lead, "reschedule", "no_answer")}
            style={{
              height: 36, padding: "0 10px",
              borderRadius: 11,
              background: "transparent",
              border: "1px solid var(--c-border)",
              color: "var(--c-text-3)",
              fontSize: 11, fontWeight: 600,
              fontFamily: "inherit",
            }}
            title="No answer — call tomorrow"
          >
            ✕
          </button>
        </div>
      </div>

      <ActionSheet
        open={deleteSheet}
        onClose={() => setDeleteSheet(false)}
        title="Delete lead?"
        message="This cannot be undone."
        actions={[
          { label: "Delete", style: "destructive", onPress: () => onDelete(lead.id) },
          { label: "Cancel", style: "cancel" },
        ]}
      />
    </>
  );
}

/* ── Category accordion group ── */
function CategoryGroup({ category, leads, onSelect, onTriggerResolution, onDelete, push }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      borderRadius: 16,
      overflow: "hidden",
      border: "1px solid var(--c-border)",
      marginBottom: 8,
    }}>
      {/* Header */}
      <button
        className="accordion-header"
        onClick={() => setOpen(o => !o)}
        style={{ userSelect: "none" }}
      >
        {/* Category name */}
        <div style={{
          flex: 1, textAlign: "left",
          fontSize: 14, fontWeight: 700, color: "var(--c-text-1)",
          overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
        }}>
          {category}
        </div>
        {/* Count badge */}
        <div style={{
          background: open ? "var(--c-accent-soft)" : "rgba(255,255,255,0.06)",
          color: open ? "var(--c-accent)" : "var(--c-text-3)",
          borderRadius: "var(--r-pill)",
          padding: "3px 9px",
          fontSize: 11, fontWeight: 800,
          flexShrink: 0,
          transition: "all 0.2s ease",
        }}>
          {leads.length}
        </div>
        <Chevron open={open} />
      </button>

      {/* Lead rows */}
      {open && (
        <div className="accordion-body">
          {leads.map(lead => (
            <LeadRow
              key={lead.id}
              lead={lead}
              onSelect={onSelect}
              onTriggerResolution={onTriggerResolution}
              onDelete={onDelete}
              push={push}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  MAIN QUEUE COMPONENT                                          */
/* ══════════════════════════════════════════════════════════════ */
export function OutboundToDoQueue({
  leads,
  onTriggerResolution,
  onSelect,
  onDelete,
  push,
  categoryStats,
  selectedCategories,
  setSelectedCategories,
  toggleCategory,
}) {
  const [segment, setSegment] = useState("cold");

  const today = todayStr();
  const tomorrow = tomorrowStr();

  // Segment filtering
  const segLeads = useMemo(() => {
    if (segment === "cold")     return leads.filter(l => l.status === "not_called");
    if (segment === "due")      return leads.filter(l => isDue(l.nextFollowUp) && l.status !== "no" && l.status !== "closed");
    if (segment === "tomorrow") return leads.filter(l => l.nextFollowUp === tomorrow && l.status !== "no" && l.status !== "closed");
    return leads;
  }, [leads, segment, tomorrow]);

  // Group by category
  const grouped = useMemo(() => {
    const groups = {};
    segLeads.forEach(lead => {
      const cat = lead.category || "Uncategorized";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(lead);
    });
    // Sort by count descending
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [segLeads]);

  const segments = [
    { key: "cold",     label: "Cold",     count: leads.filter(l => l.status === "not_called").length },
    { key: "due",      label: "Due",      count: leads.filter(l => isDue(l.nextFollowUp) && l.status !== "no" && l.status !== "closed").length },
    { key: "tomorrow", label: "Tomorrow", count: leads.filter(l => l.nextFollowUp === tomorrow && l.status !== "no" && l.status !== "closed").length },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Page Title ── */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--c-text-1)", margin: 0, letterSpacing: "-0.03em" }}>
          Calls
        </h1>
        <span style={{ fontSize: 12, color: "var(--c-text-3)", fontWeight: 500 }}>
          {segLeads.length} lead{segLeads.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Segment Control ── */}
      <div className="seg-control">
        {segments.map(s => (
          <button
            key={s.key}
            className={`seg-item${segment === s.key ? " active" : ""}`}
            onClick={() => setSegment(s.key)}
          >
            {s.label}
            <span className="seg-count">{s.count}</span>
          </button>
        ))}
      </div>

      {/* ── Accordion Groups ── */}
      {grouped.length === 0 ? (
        <EmptyState
          type="queue"
          title={segment === "due" ? "No calls due" : segment === "tomorrow" ? "Nothing scheduled tomorrow" : "No cold calls"}
          subtitle={segment === "due" ? "You're all caught up! No follow-ups are overdue." : "Add leads to start building your pipeline."}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {grouped.map(([cat, catLeads]) => (
            <CategoryGroup
              key={cat}
              category={cat}
              leads={catLeads}
              onSelect={onSelect}
              onTriggerResolution={onTriggerResolution}
              onDelete={onDelete}
              push={push}
            />
          ))}
        </div>
      )}
    </div>
  );
}
