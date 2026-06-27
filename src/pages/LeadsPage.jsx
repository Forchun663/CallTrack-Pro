import React, { useState } from "react";
import { LeadCard } from "../components/LeadCard";
import { SkeletonCards } from "../components/SkeletonCards";
import { EmptyState } from "../components/EmptyState";
import { PullToRefresh } from "../components/PullToRefresh";

const FILTERS = [
  { key: "all",          label: "All"         },
  { key: "call_today",   label: "Due Today"   },
  { key: "not_called",   label: "Not Called"  },
  { key: "interested",   label: "Interested"  },
  { key: "follow_up",    label: "Follow-up"   },
  { key: "needs_demo",   label: "Needs Demo"  },
  { key: "demo_sent",    label: "Demo Sent"   },
  { key: "maybe",        label: "Maybe"       },
];

export function LeadsPage({
  leads, filteredLeads, query, setQuery, filter, setFilter, stats,
  selectedLeadIds, onToggleSelectLead, onDeleteSelectedLeads,
  onStatus, onDemoStatus, onEdit, onDelete, onSelect, onTriggerResolution,
  push, dupSearchLead, duplicateGroups, setShowDuplicateModal, bulkDeleting,
  leadsLoading, onRefresh,
}) {
  const [inputFocused, setInputFocused] = useState(false);

  function getCount(key) {
    if (key === "all")        return stats.total;
    if (key === "call_today") return stats.due;
    if (key === "not_called") return stats.notCalled;
    if (key === "interested") return stats.interested;
    if (key === "follow_up")  return stats.followUp;
    if (key === "needs_demo") return stats.needsDemo;
    if (key === "demo_sent")  return stats.demoSent;
    if (key === "maybe")      return stats.maybe;
    return 0;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--c-text-1)", margin: 0, letterSpacing: "-0.03em" }}>
          Leads
        </h1>
        <span style={{ fontSize: 12, color: "var(--c-text-3)", fontWeight: 500 }}>
          {filteredLeads.length} of {leads.length}
        </span>
      </div>

      {/* ── Search bar ── */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "var(--c-surface)",
          border: `1.5px solid ${inputFocused ? "rgba(34,211,238,0.35)" : "var(--c-border)"}`,
          borderRadius: "var(--r-pill)",
          padding: "11px 16px",
          boxShadow: inputFocused ? "0 0 0 3px rgba(34,211,238,0.08)" : "none",
          transition: "all 0.2s ease",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: "var(--c-text-3)", flexShrink: 0 }}>
          <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          placeholder="Search name, phone, category…"
          style={{
            flex: 1, background: "transparent", border: "none",
            outline: "none", fontFamily: "inherit",
            fontSize: 15, fontWeight: 500, color: "var(--c-text-1)",
          }}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            style={{
              width: 22, height: 22, borderRadius: "50%",
              background: "rgba(255,255,255,0.1)", border: "none",
              color: "var(--c-text-3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── Filter chips ── */}
      <div style={{
        display: "flex", gap: 7, overflowX: "auto", paddingBottom: 2,
        scrollbarWidth: "none", msOverflowStyle: "none",
      }}>
        {FILTERS.map(f => {
          const count = getCount(f.key);
          if (f.key !== "all" && count === 0) return null;
          return (
            <button
              key={f.key}
              className={`chip${filter === f.key ? " active" : ""}`}
              onClick={() => setFilter(filter === f.key ? "all" : f.key)}
              style={{ flexShrink: 0 }}
            >
              {f.label}
              {count > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 800, marginLeft: 2,
                  color: filter === f.key ? "var(--c-accent)" : "var(--c-text-3)",
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Duplicate warning ── */}
      {dupSearchLead && (
        <div style={{
          padding: "12px 14px", borderRadius: 14,
          background: "rgba(248,113,113,0.07)",
          border: "1px solid rgba(248,113,113,0.2)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: "#f87171", flexShrink: 0 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 12, color: "#f87171", fontWeight: 600 }}>
            Duplicate phone — already saved as "{dupSearchLead.businessName}"
          </span>
        </div>
      )}

      {/* ── Bulk action bar ── */}
      {selectedLeadIds.size > 0 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 14px", borderRadius: 14,
          background: "rgba(34,211,238,0.06)",
          border: "1px solid rgba(34,211,238,0.15)",
          animation: "slideDown 0.2s ease both",
        }}>
          <span style={{ fontSize: 13, color: "var(--c-accent)", fontWeight: 700 }}>
            {selectedLeadIds.size} selected
          </span>
          <button
            onClick={onDeleteSelectedLeads}
            disabled={bulkDeleting}
            style={{
              padding: "7px 14px", borderRadius: 10,
              background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.2)",
              color: "#f87171", fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
              opacity: bulkDeleting ? 0.5 : 1,
            }}
          >
            Delete Selected
          </button>
        </div>
      )}

      {/* ── Leads list ── */}
      {leadsLoading ? (
        <SkeletonCards count={5} />
      ) : filteredLeads.length === 0 ? (
        <EmptyState
          type={query ? "search" : "leads"}
          title={query ? "No results" : "No leads yet"}
          subtitle={query
            ? "Try a different search term or clear your filters."
            : "Add your first lead to start tracking calls."}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 8 }}>
          {filteredLeads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onStatus={onStatus}
              onDemoStatus={onDemoStatus}
              onEdit={onEdit}
              onDelete={onDelete}
              onSelect={onSelect}
              onTriggerResolution={onTriggerResolution}
              push={push}
              selected={selectedLeadIds.has(lead.id)}
              onToggleSelect={() => onToggleSelectLead(lead.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
