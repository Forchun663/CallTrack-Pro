import React, { useState } from "react";
import { CATEGORIES } from "../utils/categories";
import { STATUS_OPTIONS, WEBSITE_OPTIONS, NEXT_ACTION_OPTIONS } from "../utils/helpers";

function FormField({ label, children, error }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--c-text-3)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </label>
      {children}
      {error && <span style={{ fontSize: 11, color: "#f87171", fontWeight: 600 }}>{error}</span>}
    </div>
  );
}

export function AddLeadPage({ form, upForm, resetForm, editingId, saving, formError, supaError, duplicatePhone, onSave, onTriggerBulkImport }) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 16 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--c-text-1)", margin: 0, letterSpacing: "-0.03em" }}>
            {editingId ? "Edit Lead" : "New Lead"}
          </h1>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", margin: "4px 0 0", fontWeight: 500 }}>
            {editingId ? "Update contact information" : "Add a new business to your pipeline"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          {!editingId && (
            <button
              onClick={onTriggerBulkImport}
              style={{
                padding: "8px 13px", borderRadius: 12,
                background: "var(--c-accent-dim)",
                border: "1px solid rgba(34,211,238,0.18)",
                color: "var(--c-accent)", fontSize: 11, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Import
            </button>
          )}
          {editingId && (
            <button
              onClick={resetForm}
              style={{
                width: 36, height: 36, borderRadius: 11,
                background: "var(--c-surface)",
                border: "1px solid var(--c-border)",
                color: "var(--c-text-3)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Error banners ── */}
      {(formError || supaError || duplicatePhone) && (
        <div style={{
          padding: "12px 14px", borderRadius: 12,
          background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)",
          fontSize: 12, color: "#f87171", fontWeight: 600,
        }}>
          {formError || supaError || (duplicatePhone ? `Duplicate phone — already saved as "${duplicatePhone.businessName}"` : "")}
        </div>
      )}

      {/* ── Core fields ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        <FormField label="Business Name *">
          <input
            className="field"
            value={form.businessName}
            onChange={e => upForm("businessName", e.target.value)}
            placeholder="e.g. Mike's Auto Shop"
          />
        </FormField>

        <FormField label="Phone Number">
          <input
            className="field"
            value={form.phone}
            onChange={e => upForm("phone", e.target.value)}
            placeholder="(202) 555-1234"
            type="tel"
            inputMode="tel"
          />
        </FormField>

        <FormField label="Business Category">
          <input
            className="field"
            list="cat-list"
            value={form.category}
            onChange={e => upForm("category", e.target.value)}
            placeholder="Type or pick a category…"
          />
          <datalist id="cat-list">
            {CATEGORIES.map(c => <option key={c} value={c} />)}
          </datalist>
        </FormField>

        <FormField label="Notes">
          <textarea
            className="field"
            value={form.notes}
            onChange={e => upForm("notes", e.target.value)}
            placeholder="Owner name, best time to call, details…"
            rows={3}
            style={{ resize: "none" }}
          />
        </FormField>

        {/* ── Advanced toggle ── */}
        <button
          type="button"
          onClick={() => setShowAdvanced(s => !s)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 14px", borderRadius: 13,
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            color: "var(--c-text-2)", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <span>More details</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            style={{ transform: showAdvanced ? "rotate(180deg)" : "none", transition: "transform 0.25s ease", color: "var(--c-text-3)" }}>
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {showAdvanced && (
          <div style={{
            display: "flex", flexDirection: "column", gap: 14,
            padding: "16px", borderRadius: 14,
            background: "var(--c-surface)", border: "1px solid var(--c-border)",
            animation: "accordionOpen 0.22s ease both",
          }}>
            <FormField label="Email">
              <input className="field" type="email" inputMode="email" value={form.email}
                onChange={e => upForm("email", e.target.value)} placeholder="owner@business.com" />
            </FormField>

            <FormField label="Address">
              <input className="field" value={form.address}
                onChange={e => upForm("address", e.target.value)} placeholder="Street, city, state" />
            </FormField>

            <FormField label="Website">
              <input className="field" value={form.website}
                onChange={e => {
                  const val = e.target.value;
                  upForm("website", val);
                  if (!val.trim()) {
                    upForm("websiteStatus", form.socialLink?.trim() ? "Social media only" : "No website");
                  } else {
                    const social = ["instagram.com","facebook.com","fb.com","tiktok.com","twitter.com","x.com","linkedin.com","youtube.com"];
                    if (social.some(kw => val.toLowerCase().includes(kw))) {
                      upForm("socialLink", val); upForm("website", ""); upForm("websiteStatus", "Social media only");
                    } else { upForm("websiteStatus", "Has website"); }
                  }
                }}
                placeholder="www.business.com" />
            </FormField>

            <FormField label="Social Media">
              <input className="field" value={form.socialLink}
                onChange={e => { upForm("socialLink", e.target.value); if (e.target.value.trim() && !form.website?.trim()) upForm("websiteStatus", "Social media only"); }}
                placeholder="Instagram / Facebook URL" />
            </FormField>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <FormField label="Last Contacted">
                <input className="field" type="date" value={form.lastContacted}
                  onChange={e => upForm("lastContacted", e.target.value)} style={{ padding: "12px 10px" }} />
              </FormField>
              <FormField label="Next Follow-Up">
                <input className="field" type="date" value={form.nextFollowUp}
                  onChange={e => upForm("nextFollowUp", e.target.value)} style={{ padding: "12px 10px" }} />
              </FormField>
            </div>

            <FormField label="Call Status">
              <select className="field" value={form.status} onChange={e => upForm("status", e.target.value)}>
                {STATUS_OPTIONS.map(o => <option key={o.key} value={o.key} style={{ background: "#111" }}>{o.label}</option>)}
              </select>
            </FormField>

            <FormField label="Website Status">
              <select className="field" value={form.websiteStatus} onChange={e => upForm("websiteStatus", e.target.value)}>
                {WEBSITE_OPTIONS.map(o => <option key={o} value={o} style={{ background: "#111" }}>{o}</option>)}
              </select>
            </FormField>

            <FormField label="Demo Status">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { key: "not_sent",   label: "None"       },
                  { key: "needs_demo", label: "Needs Demo" },
                  { key: "sent",       label: "Sent ✓"     },
                ].map(opt => (
                  <button key={opt.key} type="button"
                    onClick={() => upForm("demoStatus", opt.key)}
                    style={{
                      padding: "10px 8px", borderRadius: 10, fontFamily: "inherit",
                      fontSize: 11, fontWeight: 700, cursor: "pointer",
                      border: form.demoStatus === opt.key ? "1.5px solid var(--c-accent)" : "1px solid var(--c-border)",
                      background: form.demoStatus === opt.key ? "var(--c-accent-soft)" : "transparent",
                      color: form.demoStatus === opt.key ? "var(--c-accent)" : "var(--c-text-3)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </FormField>
          </div>
        )}

        {/* ── Save / Cancel ── */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={resetForm}
            style={{
              padding: "14px 18px", borderRadius: 14,
              background: "var(--c-surface)",
              border: "1px solid var(--c-border)",
              color: "var(--c-text-2)", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            style={{
              flex: 1, padding: "14px",
              borderRadius: 14,
              background: saving ? "rgba(52,211,153,0.5)" : "linear-gradient(135deg, #34d399 0%, #06b6d4 100%)",
              border: "none",
              color: "#0a0a0a", fontSize: 14, fontWeight: 800,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              transition: "opacity 0.2s ease",
              boxShadow: "0 4px 18px rgba(52,211,153,0.3)",
            }}
            onMouseDown={e => { if (!saving) e.currentTarget.style.opacity = "0.85"; }}
            onMouseUp={e => e.currentTarget.style.opacity = "1"}
          >
            {saving ? (
              <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2.5px solid rgba(0,0,0,0.3)", borderTopColor: "#000", animation: "spin 0.7s linear infinite" }} />
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><polyline points="7,3 7,8 15,8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
            )}
            {editingId ? "Save Changes" : "Add Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}
