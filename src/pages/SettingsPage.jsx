import React, { useState } from "react";
import { ActionSheet } from "../components/ActionSheet";

function ListSection({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      {title && (
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.32)",
          padding: "0 4px", marginBottom: 8,
        }}>
          {title}
        </div>
      )}
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 18,
        overflow: "hidden",
      }}>
        {children}
      </div>
    </div>
  );
}

function ListRow({ icon, label, value, chevron = false, danger = false, onClick, topBorder = false }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 14,
        padding: "14px 16px",
        background: pressed ? "rgba(255,255,255,0.06)" : "transparent",
        border: "none",
        borderTop: topBorder ? "1px solid rgba(255,255,255,0.06)" : "none",
        cursor: onClick ? "pointer" : "default",
        textAlign: "left",
        fontFamily: "inherit",
        transition: "background 0.15s ease",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Icon circle */}
      {icon && (
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: danger ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: danger ? "#ef4444" : "rgba(255,255,255,0.55)",
        }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600,
          color: danger ? "#ef4444" : "rgba(255,255,255,0.85)",
        }}>
          {label}
        </div>
      </div>
      {value != null && (
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>
          {value}
        </div>
      )}
      {chevron && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}

export function SettingsPage({
  session,
  totalLeads,
  duplicateGroupsCount,
  onExportCSV,
  onWipeDatabase,
  onOpenDuplicateModal,
  wipingDatabase,
}) {
  const [wipeSheet, setWipeSheet] = useState(false);
  const [wipeConfirmSheet, setWipeConfirmSheet] = useState(false);
  const email = session?.user?.email ?? "Unknown";
  const userId = session?.user?.id?.slice(0, 8) ?? "—";

  const icons = {
    user: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
    id: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 9h5M7 13h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    export: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3v12M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
    dupe: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M8 21h13a1 1 0 001-1V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
    bell: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    trash: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M9 6V4h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
    info: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  };

  return (
    <div style={{ paddingBottom: 16 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "white", margin: 0, marginBottom: 4, letterSpacing: "-0.02em" }}>
          Settings
        </h1>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0 }}>
          Workspace configuration &amp; tools
        </p>
      </div>

      {/* Account */}
      <ListSection title="Account">
        <ListRow icon={icons.user} label={email} value="Email" />
        <ListRow icon={icons.id} label={`Session #${userId}`} value="ID" topBorder />
      </ListSection>

      {/* Data */}
      <ListSection title="Data">
        <ListRow
          icon={icons.export}
          label="Export All Leads"
          value={`${totalLeads} leads`}
          chevron
          onClick={onExportCSV}
        />
        {duplicateGroupsCount > 0 && (
          <ListRow
            icon={icons.dupe}
            label="Review Duplicates"
            value={`${duplicateGroupsCount} found`}
            chevron
            onClick={onOpenDuplicateModal}
            topBorder
          />
        )}
      </ListSection>

      {/* Notifications */}
      <ListSection title="Notifications">
        <ListRow
          icon={icons.bell}
          label="Follow-Up Reminders"
          value="Auto-scheduled"
          chevron={false}
        />
      </ListSection>

      {/* App Info */}
      <ListSection title="About">
        <ListRow icon={icons.info} label="CallTrack Pro" value="v2.0.0" />
        <ListRow icon={icons.id} label="Total Leads in Workspace" value={String(totalLeads)} topBorder />
      </ListSection>

      {/* Danger Zone */}
      <ListSection title="Danger Zone">
        <ListRow
          icon={icons.trash}
          label="Wipe All Data"
          danger
          chevron
          onClick={() => setWipeSheet(true)}
        />
      </ListSection>

      {/* Wipe confirmation — step 1 */}
      <ActionSheet
        open={wipeSheet}
        onClose={() => setWipeSheet(false)}
        title="Wipe All Leads?"
        message="This will permanently delete all leads for every team member. This action cannot be undone."
        actions={[
          {
            label: "⚠ Delete All Leads",
            style: "destructive",
            onPress: () => { setWipeSheet(false); setTimeout(() => setWipeConfirmSheet(true), 350); },
          },
          { label: "Cancel", style: "cancel" },
        ]}
      />

      {/* Wipe confirmation — step 2 (final) */}
      <ActionSheet
        open={wipeConfirmSheet}
        onClose={() => setWipeConfirmSheet(false)}
        title="Are you absolutely sure?"
        message="Type-confirm: all leads, notes, and activity history will be erased for the entire team."
        actions={[
          {
            label: "Yes, Erase Everything",
            style: "destructive",
            onPress: () => { setWipeConfirmSheet(false); onWipeDatabase(); },
          },
          { label: "Cancel", style: "cancel" },
        ]}
      />
    </div>
  );
}
