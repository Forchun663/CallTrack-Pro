import React from "react";
import { Edit3, Trash2, Phone, Mail, MapPin, Globe, Send, ExternalLink, CalendarDays, Clock, Calendar, Square, FileAudio, FileText, AlertTriangle, Loader2 } from "lucide-react";
import { statusMeta, isDue, relativeDate, fmtTime, STATUS_OPTIONS } from "../utils/helpers";
import { CopyBtn } from "./CopyBtn";
import { Alert } from "./Alert";

function Empty({ children }) {
  return <span className="text-xs text-zinc-600 italic">{children}</span>;
}

function Section({ title, children }) {
  return (
    <div>
      <p className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">{title}</p>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function ContactRow({ icon, label, children }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-black/20 px-3 py-2.5">
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-black uppercase tracking-wider text-zinc-600 mb-0.5">{label}</p>
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </div>
  );
}

export function FocusDrawer({
  lead,
  session,
  onClose,
  onEdit,
  onDelete,
  onStatus,
  onDemoStatus,
  onFollowUp,
  onTriggerResolution,
  push,
  recordingLeadId,
  recording: globalRecording,
  consentMap,
  setConsentMap,
  recordingsMap,
  recSecs: globalRecSecs,
  recError: globalRecError,
  startRecording: globalStartRecording,
  stopRecording,
  deleteRecording: globalDeleteRecording,
  downloadRecording: globalDownloadRecording,
  savingActivity,
}) {
  const isThisLeadRecording = globalRecording && recordingLeadId === lead.id;
  const isAnotherLeadRecording = globalRecording && recordingLeadId !== lead.id;

  const consent = consentMap[lead.id] || false;
  const setConsent = (val) => setConsentMap((prev) => ({ ...prev, [lead.id]: val }));
  const blob = recordingsMap[lead.id]?.blob || null;
  const blobUrl = recordingsMap[lead.id]?.url || "";
  const recSecs = isThisLeadRecording ? globalRecSecs : (recordingsMap[lead.id]?.secs || 0);
  const recError = isThisLeadRecording ? globalRecError : "";

  const recording = isThisLeadRecording;
  const meta = statusMeta(lead.status);
  const due = isDue(lead.nextFollowUp) && lead.status !== "no" && lead.status !== "closed";

  /* Maps URL */
  const mapsUrl = lead.mapsLink
    ? lead.mapsLink
    : lead.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}`
      : null;

  /* ── Recording Wrapper Handlers ── */
  function startRecording() {
    globalStartRecording(lead);
  }

  function deleteRecording() {
    globalDeleteRecording(lead.id);
  }

  function downloadRecording() {
    globalDownloadRecording(lead);
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 z-45 bg-black/60 backdrop-blur-sm" />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full sm:max-w-[480px] flex-col border-l border-white/[0.07] bg-[#060212]/96 shadow-2xl backdrop-blur-2xl overflow-hidden pt-[calc(env(safe-area-inset-top))] pb-[calc(env(safe-area-inset-bottom))]">

        {/* Header */}
        <div className="flex-shrink-0 border-b border-white/[0.07] px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black ${meta.soft}`}>{meta.label}</span>

                {/* Demo status visual indicator */}
                {lead.demoStatus === "needs_demo" && (
                  <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-2.5 py-0.5 text-[10px] font-black text-fuchsia-300 animate-pulse">
                    📤 Needs Demo
                  </span>
                )}
                {lead.demoStatus === "sent" && (
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-black text-emerald-300">
                    ✓ Demo Sent
                  </span>
                )}

                {lead.nextAction && (
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/8 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300">
                    Next: {lead.nextAction}
                  </span>
                )}
                {due && (
                  <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2.5 py-0.5 text-[10px] font-black text-yellow-300 animate-pulse">
                    ⚡ Follow-up due
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black text-white leading-tight truncate">{lead.businessName}</h2>
              <p className="text-xs text-zinc-500 mt-0.5">{lead.category || "No category"}{lead.lastContacted ? ` · Last called ${relativeDate(lead.lastContacted)}` : ""}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => onEdit(lead)} className="rounded-xl bg-white/[0.06] p-2 hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer" title="Edit">
                <Edit3 size={14} />
              </button>
              <button onClick={() => { if (confirm("Delete this lead?")) onDelete(lead.id); }} className="rounded-xl bg-red-500/8 p-2 text-red-400 hover:bg-red-500/15 transition cursor-pointer" title="Delete">
                <Trash2 size={14} />
              </button>
              <button onClick={onClose} className="rounded-xl bg-white/[0.06] p-2 hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer">
                <X size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* DNC warning */}
          {lead.status === "no" && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-black text-red-300">
              <AlertTriangle size={14} className="animate-pulse" /> ⛔ DO NOT CALL AGAIN
            </div>
          )}

          {/* Contact details with copy buttons */}
          <Section title="Contact Details">
            <ContactRow icon={<Phone size={14} className="text-cyan-400" />} label="Phone">
              {lead.phone ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <a href={`tel:${lead.phone}`} className="text-sm font-mono font-bold text-white hover:text-cyan-300 transition truncate">{lead.phone}</a>
                  <a href={`tel:${lead.phone}`} className="shrink-0 rounded-lg bg-cyan-500 px-2.5 py-1 text-[10px] font-black text-white hover:bg-cyan-400 transition">📞 Call</a>
                  <CopyBtn text={lead.phone} label="Phone" push={push} />
                </div>
              ) : <Empty>No phone saved</Empty>}
            </ContactRow>

            {/* Email contact row */}
            <ContactRow icon={<Mail size={14} className="text-cyan-400" />} label="Email Address">
              {lead.email ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <a href={`mailto:${lead.email}`} className="text-xs font-bold text-white hover:text-cyan-300 transition truncate flex-1">{lead.email}</a>
                  <CopyBtn text={lead.email} label="Email" push={push} />
                </div>
              ) : <Empty>No email saved</Empty>}
            </ContactRow>

            <ContactRow icon={<MapPin size={14} className="text-cyan-400" />} label="Address">
              {lead.address ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <a href={mapsUrl} target="_blank" rel="noreferrer"
                    className="text-xs text-white hover:text-cyan-300 transition truncate flex-1">{lead.address}</a>
                  {mapsUrl && (
                    <a href={mapsUrl} target="_blank" rel="noreferrer"
                      className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-zinc-300 hover:bg-white/10 transition flex items-center gap-1">
                      Maps <ExternalLink size={9} />
                    </a>
                  )}
                  <CopyBtn text={lead.address} label="Address" push={push} />
                </div>
              ) : <Empty>No address saved</Empty>}
            </ContactRow>

            <ContactRow icon={<Globe size={14} className="text-cyan-400" />} label={`Website (${lead.websiteStatus || "Unknown"})`}>
              {lead.website ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                    target="_blank" rel="noreferrer"
                    className="text-xs text-white hover:text-cyan-300 transition truncate flex-1">{lead.website}</a>
                  <CopyBtn text={lead.website} label="Website" push={push} />
                </div>
              ) : <Empty>No website saved</Empty>}
            </ContactRow>

            <ContactRow icon={<Send size={14} className="text-purple-400" />} label="Social Media Link">
              {lead.socialLink ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <a href={lead.socialLink.startsWith("http") ? lead.socialLink : `https://${lead.socialLink}`}
                    target="_blank" rel="noreferrer"
                    className="text-xs text-white hover:text-purple-300 font-bold transition truncate flex-1">
                    {lead.socialLink}
                  </a>
                  <CopyBtn text={lead.socialLink} label="Social Media Link" push={push} />
                </div>
              ) : <Empty>No social media saved</Empty>}
            </ContactRow>

            {lead.mapsLink && (
              <ContactRow icon={<ExternalLink size={14} className="text-cyan-400" />} label="Maps Link">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <a href={lead.mapsLink} target="_blank" rel="noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-bold transition truncate flex-1">Open Maps Portal →</a>
                  <CopyBtn text={lead.mapsLink} label="Maps link" push={push} />
                </div>
              </ContactRow>
            )}
          </Section>

          {/* Dates & Quick Scheduler */}
          <Section title="Follow-up & Scheduler">
            {lead.lastContacted && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Clock size={13} className="text-zinc-600 shrink-0" />
                Last contacted: <span className="text-white font-bold">{lead.lastContacted}</span>
                <span className="text-zinc-600">({relativeDate(lead.lastContacted)})</span>
              </div>
            )}
            <div className={`flex items-center gap-2 text-xs ${due ? "text-yellow-300 font-bold" : "text-zinc-400"} pb-1`}>
              <CalendarDays size={13} className={`shrink-0 ${due ? "text-yellow-400" : "text-zinc-600"}`} />
              Follow-up Date: <span className={due ? "text-yellow-300" : "text-white font-bold"}>{lead.nextFollowUp || "Not scheduled"}</span>
              {due && <span className="text-yellow-400">⚡ Due!</span>}
            </div>

            {/* Quick scheduler buttons */}
            <div className="rounded-xl border border-white/[0.05] bg-black/25 p-2.5">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1">
                <Calendar size={10} /> Quick Schedule Next Day Planner
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { days: 1, label: "Tomorrow" },
                  { days: 3, label: "In 3 Days" },
                  { days: 7, label: "In 1 Week" },
                ].map((preset) => (
                  <button
                    key={preset.days}
                    onClick={() => onFollowUp(lead.id, preset.days)}
                    className="rounded-lg bg-white/[0.06] hover:bg-white/10 px-2 py-2 text-[10px] font-black text-zinc-300 hover:text-white transition active:scale-95 cursor-pointer text-center"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* Notes */}
          {lead.notes && (
            <Section title="Notes">
              <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">{lead.notes}</p>
            </Section>
          )}

          {/* Demo Website Status Toggles in Drawer */}
          <Section title="Demo Website Actions">
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "not_sent", label: "No Demo Tag", cls: "bg-white/[0.06] text-zinc-400 hover:text-white" },
                { key: "needs_demo", label: "Needs Demo 📤", cls: "bg-fuchsia-500/15 text-fuchsia-300 hover:bg-fuchsia-500/25" },
                { key: "sent", label: "Demo Sent ✓", cls: "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => onDemoStatus(lead.id, opt.key)}
                  className={`rounded-xl px-2 py-3 text-[10px] font-black text-center transition active:scale-95 cursor-pointer ${lead.demoStatus === opt.key
                    ? "bg-white text-zinc-950 font-black shadow-lg hover:bg-white animate-[fadeIn_0.1s]"
                    : opt.cls
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Quick status buttons */}
          <Section title="Quick Log Outcome">
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((opt) => (
                <button key={opt.key}
                  onClick={() => onStatus(lead.id, opt.key)}
                  className={`rounded-xl px-3 py-2 text-[10px] font-black transition hover:scale-105 active:scale-95 cursor-pointer ${lead.status === opt.key ? `${opt.color} text-white shadow-lg` : "bg-white/[0.06] text-zinc-300 hover:bg-white/10"
                    }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Quick Called Rescheduler outcomes */}
          <Section title="Quick Outbound Call Outcomes (Reschedule & Clear Queue)">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onTriggerResolution(lead, "reschedule", "no_answer")}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-xs font-black text-red-300 hover:bg-red-500/20 transition active:scale-[0.98] cursor-pointer"
              >
                🚫 No Answer → Call Tomorrow
              </button>
              <button
                onClick={() => onTriggerResolution(lead, "reschedule", "follow_up")}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-orange-500/25 bg-orange-500/10 px-3 py-2.5 text-xs font-black text-orange-300 hover:bg-orange-500/20 transition active:scale-[0.98] cursor-pointer"
              >
                📅 Voicemail → Call Tomorrow
              </button>
            </div>
          </Section>

          {/* ── CALL RECORDING PANEL ── */}
          <Section title="Call Recording">
            <p className="text-[10px] text-zinc-500 -mt-1 mb-3">
              Use this to capture audio from your Google Voice tab. Recording stays local — never uploaded.
            </p>

            {isAnotherLeadRecording && (
              <div className="mb-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3 text-xs text-yellow-300/90 leading-relaxed flex items-start gap-2.5">
                <AlertTriangle className="text-yellow-400 shrink-0 mt-0.5" size={14} />
                <span>A call recording is currently active for another prospect. Please stop that recording first.</span>
              </div>
            )}

            {recError && <Alert type="warn" msg={recError} />}

            {/* Step-by-step instructions when not recording */}
            {!recording && !blob && (
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3 mb-3 space-y-1">
                {["1. Open Google Voice and start your call", "2. Check the consent box below", "3. Click Start Recording", "4. Choose the Google Voice tab", "5. Enable 'Share tab audio' in the dialog"].map((step, i) => (
                  <p key={i} className="text-[10px] text-zinc-400 font-medium">{step}</p>
                ))}
              </div>
            )}

            {/* Consent checkbox + script */}
            {!blob && (
              <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3 mb-3 space-y-2.5">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
                    disabled={recording || isAnotherLeadRecording}
                    className="mt-0.5 w-3.5 h-3.5 rounded border-white/20 bg-black text-cyan-400 cursor-pointer disabled:opacity-40" />
                  <span className="text-xs text-zinc-300 leading-snug">I have permission or legal right to record this call.</span>
                </label>
                <div className="flex items-center justify-between border-t border-white/[0.05] pt-2">
                  <span className="text-[10px] text-zinc-600">Ask consent verbally first:</span>
                  <button
                    disabled={isAnotherLeadRecording}
                    onClick={() => {
                      navigator.clipboard.writeText("Just so you know, I may record this call for notes and follow-up. Is that okay?");
                      push("Consent script copied", "success");
                    }}
                    className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                    📋 Copy Script
                  </button>
                </div>
              </div>
            )}

            {/* Recording controls */}
            {!recording && !blob && (
              <button onClick={startRecording} disabled={!consent || isAnotherLeadRecording}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 py-3 text-xs font-black text-white shadow-lg transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                <Mic size={14} className="shrink-0" /> Start Recording
              </button>
            )}

            {recording && (
              <div className="rounded-xl border border-red-500/25 bg-red-500/8 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-black text-red-300">RECORDING</span>
                </div>
                <span className="font-mono text-white text-base font-black">{fmtTime(recSecs)}</span>
                <button onClick={stopRecording}
                  className="flex items-center gap-1.5 rounded-xl bg-white text-zinc-900 px-3 py-2 text-xs font-black hover:bg-zinc-100 transition active:scale-95 cursor-pointer">
                  <Square size={11} className="shrink-0" /> Stop
                </button>
              </div>
            )}

            {blob && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileAudio size={16} className="text-emerald-400" />
                    <div>
                      <p className="text-xs font-black text-white">Recording ready</p>
                      <p className="text-[10px] text-zinc-500 font-mono">{fmtTime(recSecs)} · {(blob.size / 1024).toFixed(0)} KB</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400">Local only</span>
                </div>
                <audio src={blobUrl} controls className="w-full h-8" />

                {/* Collapsible Transcript inside Drawer */}
                {recordingsMap[lead.id]?.transcript && (
                  <div className="rounded-xl border border-white/[0.05] bg-black/45 p-3.5 space-y-2 text-left">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <FileText size={12} className="text-cyan-400" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300">Call Transcript</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pb-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(recordingsMap[lead.id]?.transcript);
                          push("Transcript copied", "success");
                        }}
                        className="text-[9px] font-bold text-zinc-400 hover:text-white transition flex items-center gap-0.5 cursor-pointer"
                      >
                        📋 Copy Transcript
                      </button>
                    </div>
                    <div className="max-h-40 overflow-y-auto text-[10px] text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans select-text">
                      {recordingsMap[lead.id]?.transcript}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={deleteRecording}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] py-2.5 text-xs font-bold text-zinc-300 hover:bg-white/10 transition active:scale-95 cursor-pointer">
                    <Trash2 size={12} className="shrink-0" /> Delete
                  </button>
                  <button onClick={downloadRecording} disabled={savingActivity}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-2.5 text-xs font-black text-white shadow-md hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-60 cursor-pointer">
                    {savingActivity ? <Loader2 className="animate-spin" size={12} /> : <Download size={12} className="shrink-0" />}
                    Download .webm
                  </button>
                </div>
              </div>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
