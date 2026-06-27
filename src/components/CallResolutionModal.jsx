import React, { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Field } from "./Field";

const inputCls = "w-full rounded-xl border border-white/[0.08] bg-black/35 px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-cyan-400/30 transition";

export function CallResolutionModal({ lead, type, preSelectOption, onClose, onResolve }) {
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState(lead.email || "");

  // Reschedule options states
  const [rescheduleType, setRescheduleType] = useState(preSelectOption || "no_answer"); // "no_answer" | "vm" | "busy" | "today" | "custom"
  const [customDate, setCustomDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (type === "interested") {
        await onResolve({
          id: lead.id,
          status: "interested",
          notes: notes || "Prospect wants website demo outreach.",
          email: email,
        });
      } else {
        // Reschedule resolution
        let status = "follow_up";
        let days = 1;
        let cDate = null;

        if (rescheduleType === "no_answer") {
          status = "no_answer";
          days = 1;
        } else if (rescheduleType === "vm") {
          status = "follow_up";
          days = 1;
        } else if (rescheduleType === "busy") {
          status = "follow_up";
          days = 1;
        } else if (rescheduleType === "today") {
          status = "follow_up";
          days = 0;
        } else if (rescheduleType === "custom") {
          status = "follow_up";
          days = null;
          cDate = customDate;
        } else if (rescheduleType === "no") {
          status = "no";
          days = null;
        }

        await onResolve({
          id: lead.id,
          status,
          followUpDays: days,
          customDate: cDate,
          notes: notes || `Rescheduled call: ${
            rescheduleType === "no_answer" ? "No answer" :
            rescheduleType === "vm" ? "Voicemail left" :
            rescheduleType === "busy" ? "Busy / Call back" :
            rescheduleType === "today" ? "Call back later today" :
            rescheduleType === "no" ? "Not Interested / Archive" : "Custom schedule"
          }.`,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-md" />

      {/* Modal Box */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-md border border-white/10 bg-[#060212] rounded-3xl shadow-2xl p-6 backdrop-blur-3xl animate-[scaleUp_0.25s_ease] max-h-[90vh] overflow-y-auto">

        {/* Title */}
        <div className="mb-4">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Save Call Details</span>
          <h2 className="text-xl font-black text-white mt-1">
            {type === "interested" ? "🎉 Wants Website / Demo" : "⏳ Pick Callback Time"}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">Log outcome details for <strong className="text-zinc-300">{lead.businessName}</strong></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {type === "interested" ? (
            <>
              {/* Interested / Wants Website form fields */}
              <div className="space-y-3">
                <Field label="Contact Email">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email to send demo"
                    className={inputCls}
                    required
                  />
                </Field>

                <Field label="Call Notes">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Specific requests, callback notes, owner name..."
                    rows={3}
                    className={inputCls + " resize-none"}
                  />
                </Field>
              </div>
            </>
          ) : (
            <>
              {/* Reschedule option badges */}
              <div className="space-y-3">
                <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">What happened during this call?</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "no_answer", label: "🚫 No Answer (Call Tomorrow)", desc: "Call tomorrow" },
                    { key: "vm", label: "📘 Left Voicemail (Call Tomorrow)", desc: "Call tomorrow" },
                    { key: "busy", label: "👥 Busy / Call Tomorrow", desc: "Call tomorrow" },
                    { key: "today", label: "⏳ Call Back Later Today", desc: "Call back today" },
                    { key: "custom", label: "📅 Pick a Specific Day", desc: "Choose callback date" },
                    { key: "no", label: "🗑 Delete / Off List", desc: "Permanently delete from database" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setRescheduleType(opt.key)}
                      className={`rounded-xl border p-2.5 text-[10px] text-left transition active:scale-95 cursor-pointer ${rescheduleType === opt.key
                        ? "border-cyan-400 bg-cyan-400/10 text-cyan-200 font-black shadow-lg"
                        : "border-white/[0.06] bg-white/[0.03] text-zinc-400 hover:text-white"
                        }`}
                    >
                      <span className="block font-black">{opt.label}</span>
                      <span className="block text-[8px] text-zinc-500 mt-0.5 font-normal">{opt.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Custom calendar picker if "custom" selected */}
                {rescheduleType === "custom" && (
                  <Field label="Choose Callback Date">
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className={inputCls}
                      required
                    />
                  </Field>
                )}

                <Field label="Call Notes">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Why schedule callback? E.g., 'Mike busy, call back at 4 PM'"
                    rows={3}
                    className={inputCls + " resize-none"}
                  />
                </Field>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/5 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-400 hover:bg-white/10 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || (rescheduleType === "custom" && !customDate)}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-2.5 text-xs font-black text-white shadow-lg transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={13} />
                  Saving...
                </>
              ) : (
                <>
                  {type === "interested" ? "✓ Save Details" : "🔄 Save Callback Time"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
