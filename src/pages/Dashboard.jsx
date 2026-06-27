import React, { useMemo } from "react";
import { EmptyState } from "../components/EmptyState";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function StatCard({ label, value, color = "var(--c-text-1)" }) {
  return (
    <div style={{
      flex: 1,
      padding: "14px 12px",
      background: "var(--c-surface)",
      border: "1px solid var(--c-border)",
      borderRadius: 16,
      textAlign: "center",
    }}>
      <div style={{ fontSize: 26, fontWeight: 900, color, letterSpacing: "-0.03em", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--c-text-3)", marginTop: 5, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </div>
    </div>
  );
}

function PipelineBar({ label, value, total, color }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  if (value === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ fontSize: 12, color: "var(--c-text-2)", fontWeight: 500, width: 96, flexShrink: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
        {label}
      </div>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.8s cubic-bezier(0.32,0.72,0,1)" }} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-text-3)", width: 22, textAlign: "right", flexShrink: 0 }}>
        {value}
      </div>
    </div>
  );
}

export function Dashboard({ stats, categoryStats, onSelectCategory, selectedCategories, onStartCalling, onAddLead }) {
  const hasLeads = stats.total > 0;
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  const topCategories = useMemo(() => {
    if (!categoryStats) return [];
    return Object.entries(categoryStats).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [categoryStats]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 8 }}>

      {/* ── Greeting ── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-text-3)", marginBottom: 2 }}>{today}</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--c-text-1)", margin: 0, letterSpacing: "-0.03em" }}>
          {greeting()}
        </h1>
      </div>

      {/* ── Stats row ── */}
      {hasLeads && (
        <div style={{ display: "flex", gap: 8 }}>
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Due" value={stats.due} color={stats.due > 0 ? "#fbbf24" : "var(--c-text-1)"} />
          <StatCard label="Interested" value={stats.interested} color="#34d399" />
        </div>
      )}

      {/* ── Due now CTA ── */}
      {stats.due > 0 && (
        <button
          onClick={onStartCalling}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "16px 18px", borderRadius: 18,
            background: "rgba(239,68,68,0.07)",
            border: "1px solid rgba(239,68,68,0.18)",
            cursor: "pointer", fontFamily: "inherit", textAlign: "left",
            width: "100%",
          }}
          onMouseDown={e => e.currentTarget.style.opacity = "0.8"}
          onMouseUp={e => e.currentTarget.style.opacity = "1"}
        >
          <div style={{
            width: 42, height: 42, borderRadius: 13, flexShrink: 0,
            background: "rgba(239,68,68,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#ef4444">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.32.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C9.57 21 3 14.43 3 6c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.26.2 2.48.57 3.61.11.35.03.74-.27 1.01L6.6 10.8z"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fca5a5", marginBottom: 2 }}>
              {stats.due} call{stats.due !== 1 ? "s" : ""} due now
            </div>
            <div style={{ fontSize: 11, color: "var(--c-text-3)", fontWeight: 500 }}>
              Open call queue →
            </div>
          </div>
        </button>
      )}

      {/* ── Pipeline ── */}
      {hasLeads && (
        <div style={{
          padding: "16px",
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: 18,
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div className="label">Pipeline</div>
          <PipelineBar label="Not Called" value={stats.notCalled} total={stats.total} color="rgba(255,255,255,0.25)" />
          <PipelineBar label="Interested" value={stats.interested} total={stats.total} color="#34d399" />
          <PipelineBar label="Needs Demo" value={stats.needsDemo} total={stats.total} color="#a78bfa" />
          <PipelineBar label="Demo Sent"  value={stats.demoSent}  total={stats.total} color="#818cf8" />
          <PipelineBar label="Follow-Up"  value={stats.followUp}  total={stats.total} color="#fb923c" />
        </div>
      )}

      {/* ── Categories ── */}
      {topCategories.length > 0 && (
        <div style={{
          padding: "16px",
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: 18,
        }}>
          <div className="label" style={{ marginBottom: 12 }}>Top Categories</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {topCategories.map(([cat, count]) => {
              const active = selectedCategories.includes(cat);
              return (
                <button
                  key={cat}
                  className={`chip${active ? " active" : ""}`}
                  onClick={() => onSelectCategory(cat)}
                >
                  {cat}
                  <span style={{
                    fontSize: 10, fontWeight: 800, marginLeft: 2,
                    color: active ? "var(--c-accent)" : "var(--c-text-3)",
                  }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Follow-up schedule ── */}
      {hasLeads && (stats.due > 0 || stats.tomorrow > 0) && (
        <div style={{
          padding: "16px",
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: 18,
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div className="label">Follow-Up Schedule</div>
          {stats.due > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "var(--c-text-2)", fontWeight: 500 }}>Overdue / Due Today</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#fbbf24" }}>{stats.due}</span>
            </div>
          )}
          {stats.tomorrow > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "var(--c-text-2)", fontWeight: 500 }}>Tomorrow</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: "var(--c-accent)" }}>{stats.tomorrow}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Empty state ── */}
      {!hasLeads && (
        <EmptyState
          type="leads"
          title="No leads yet"
          subtitle="Add your first business lead to start tracking calls."
          onCta={onAddLead}
          ctaLabel="Add First Lead"
          style={{ paddingTop: 24 }}
        />
      )}

      {/* ── Quick actions ── */}
      {hasLeads && (
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onStartCalling}
            style={{
              flex: 1, padding: "14px",
              borderRadius: 14,
              background: "var(--c-accent)",
              border: "none",
              color: "#0a0a0a", fontSize: 13, fontWeight: 800,
              cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              boxShadow: "0 4px 16px rgba(34,211,238,0.3)",
            }}
            onMouseDown={e => e.currentTarget.style.opacity = "0.85"}
            onMouseUp={e => e.currentTarget.style.opacity = "1"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.32.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C9.57 21 3 14.43 3 6c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.26.2 2.48.57 3.61.11.35.03.74-.27 1.01L6.6 10.8z"/></svg>
            Start Calling
          </button>
          <button
            onClick={onAddLead}
            style={{
              flex: 1, padding: "14px",
              borderRadius: 14,
              background: "var(--c-surface)",
              border: "1px solid var(--c-border)",
              color: "var(--c-text-2)", fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            }}
            onMouseDown={e => e.currentTarget.style.background = "var(--c-surface2)"}
            onMouseUp={e => e.currentTarget.style.background = "var(--c-surface)"}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Add Lead
          </button>
        </div>
      )}
    </div>
  );
}
