import React, { useState } from "react";
import { Trash2, X, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { statusMeta, relativeDate } from "../utils/helpers";
import { dbService } from "../services/db";

export function DuplicateReviewModal({ duplicateGroups, setLeads, onClose, push }) {
  const [deletingId, setDeletingId] = useState(null);

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to permanently delete this duplicate lead record? This action cannot be undone.")) return;
    setDeletingId(id);
    try {
      await dbService.deleteLead(id);
      setLeads((p) => p.filter((l) => l.id !== id));
      push("Duplicate lead deleted ✓", "success");
    } catch (e) {
      console.error("Delete duplicate:", e);
      alert("Failed to delete lead: " + e.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/75 backdrop-blur-md" />

      {/* Modal Container */}
      <div className="fixed inset-4 md:inset-x-20 md:inset-y-10 z-50 flex flex-col border border-red-500/20 bg-[#060212] rounded-3xl shadow-2xl overflow-hidden backdrop-blur-3xl animate-[slideUp_0.3s_ease]">

        {/* Header */}
        <div className="flex-shrink-0 border-b border-white/[0.07] px-6 py-4 flex items-center justify-between bg-red-950/10">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">Workspace Lead De-duplicator</span>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              ⚠️ Repetitive Lead Manager
            </h2>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white/[0.06] p-2 hover:bg-white/10 text-zinc-400 hover:text-white transition">
            <X size={16} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {duplicateGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-16 space-y-4">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">No Duplicate Leads Found!</h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                  Excellent work! Every phone number and business name in your CallTrack Pro workspace is unique.
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl bg-white px-5 py-2.5 text-xs font-black text-zinc-950 hover:bg-zinc-100 transition active:scale-95 cursor-pointer"
              >
                Return to Workspace
              </button>
            </div>
          ) : (
            <div className="space-y-6 max-w-5xl mx-auto">

              <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 text-xs text-red-300/90 leading-relaxed flex items-start gap-3">
                <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="font-bold text-white mb-0.5">Warning: Duplicate records can clutter your outbound pipeline.</p>
                  <p>Below are groups of leads with identical phone numbers or business names. Review them side-by-side, verify which record has the best notes/history, and click <span className="font-bold text-white">"Delete Redundant Lead"</span> to wipe the extra copy. We automatically sync the change in your database.</p>
                </div>
              </div>

              <div className="space-y-6">
                {duplicateGroups.map((group, gIdx) => (
                  <div key={gIdx} className="rounded-3xl border border-red-500/15 bg-red-950/[0.02] p-5 space-y-4">

                    {/* Group Header Info */}
                    <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      <h4 className="text-sm font-black text-red-300 uppercase tracking-wider">{group.title}</h4>
                      <span className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">
                        {group.leads.length} matches found
                      </span>
                    </div>

                    {/* Side-by-side leads cards comparison grid */}
                    <div className="grid gap-4 md:grid-cols-2">
                      {group.leads.map((lead) => {
                        const meta = statusMeta(lead.status);
                        return (
                          <div
                            key={lead.id}
                            className="rounded-2xl border border-white/[0.06] bg-black/40 p-4 flex flex-col justify-between"
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h5 className="text-sm font-black text-white leading-tight truncate">{lead.businessName}</h5>
                                  <p className="text-[10px] text-zinc-500 mt-0.5">
                                    {lead.category || "No Category"} · Added {relativeDate(lead.createdAt)}
                                  </p>
                                </div>
                                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black shrink-0 ${meta.soft}`}>
                                  {meta.label}
                                </span>
                              </div>

                              <div className="space-y-1 text-xs text-zinc-400 border-t border-b border-white/[0.04] py-2">
                                {lead.phone && <p>📞 <span className="font-mono text-zinc-300">{lead.phone}</span></p>}
                                {lead.email && <p>✉️ <span className="text-zinc-300">{lead.email}</span></p>}
                                {lead.address && <p>📍 <span className="text-zinc-300">{lead.address}</span></p>}
                                {lead.website && <p>🌐 <span className="text-zinc-300">{lead.website}</span></p>}
                              </div>

                              {lead.notes && (
                                <div>
                                  <p className="text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-1">Lead Notes</p>
                                  <p className="text-[10px] text-zinc-400 italic bg-white/[0.02] border border-white/[0.03] rounded-lg p-2 leading-normal line-clamp-3">
                                    &ldquo;{lead.notes}&rdquo;
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="mt-4 pt-3 border-t border-white/[0.04]">
                              <button
                                onClick={() => handleDelete(lead.id)}
                                disabled={deletingId === lead.id}
                                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/8 hover:bg-red-500/15 py-2.5 text-xs font-bold text-red-400 transition cursor-pointer active:scale-[0.99] disabled:opacity-50"
                              >
                                {deletingId === lead.id ? (
                                  <>
                                    <Loader2 className="animate-spin" size={12} />
                                    Deleting Lead...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 size={12} />
                                    Delete Redundant Lead
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-white/[0.07] px-6 py-4 flex justify-end bg-black/40">
          <button
            onClick={onClose}
            className="rounded-xl bg-white px-6 py-2.5 text-xs font-black text-zinc-950 hover:bg-zinc-100 transition active:scale-95 cursor-pointer shadow-md"
          >
            Finished Cleaning
          </button>
        </div>

      </div>
    </>
  );
}
