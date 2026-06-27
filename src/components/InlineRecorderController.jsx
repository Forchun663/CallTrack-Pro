import React, { useState } from "react";
import { FileAudio, Download, Volume2, FileText, Trash2, X, Mic } from "lucide-react";
import { fmtTime } from "../utils/helpers";

export function InlineRecorderController({
  lead,
  recordingLeadId,
  recording,
  recordingBlob,
  recordingBlobUrl,
  leadTranscript,
  recSecs,
  recError,
  consent,
  setConsent,
  startRecording,
  stopRecording,
  deleteRecording,
  downloadRecording,
  savingActivity,
  push,
}) {
  const [expanded, setExpanded] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  // If this specific lead is actively recording
  const isThisLeadRecording = recording && recordingLeadId === lead.id;
  // If another lead is currently recording
  const isAnotherLeadRecording = recording && recordingLeadId !== lead.id;

  // Render when recording is in progress for THIS lead
  if (isThisLeadRecording) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-2 py-1 text-[10px] text-red-400 animate-pulse shrink-0">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
        <span className="font-extrabold uppercase text-[9px] tracking-wider">REC</span>
        <span className="font-mono text-white font-bold">{fmtTime(recSecs)}</span>
        <button
          type="button"
          onClick={stopRecording}
          className="rounded bg-white text-zinc-950 px-1.5 py-0.5 text-[9px] font-extrabold uppercase transition hover:bg-zinc-100 cursor-pointer active:scale-95 shrink-0"
        >
          Stop
        </button>
      </div>
    );
  }

  // Render when a recording is ready for THIS lead
  if (recordingBlob) {
    return (
      <div className="relative flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2 py-1 shrink-0 animate-[fadeIn_0.2s_ease]">
        <FileAudio size={12} className="text-emerald-400 shrink-0" />
        <span className="text-[10px] text-emerald-400 font-bold font-mono shrink-0">
          {fmtTime(recSecs)}
        </span>

        {/* Playback Preview option */}
        {recordingBlobUrl && (
          <audio src={recordingBlobUrl} className="hidden" id={`inline-audio-${lead.id}`} />
        )}
        <button
          type="button"
          onClick={() => {
            const aud = document.getElementById(`inline-audio-${lead.id}`);
            if (aud) {
              if (aud.paused) {
                // Pause all other audio elements first
                document.querySelectorAll("audio").forEach((el) => {
                  if (el !== aud) el.pause();
                });
                aud.play();
                push("Playing recording preview", "info");
              } else {
                aud.pause();
              }
            }
          }}
          className="rounded bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 p-1 transition cursor-pointer active:scale-95 shrink-0"
          title="Play preview"
        >
          <Volume2 size={10} />
        </button>

        <button
          type="button"
          onClick={() => downloadRecording(lead)}
          disabled={savingActivity}
          className="rounded bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 p-1 transition cursor-pointer active:scale-95 shrink-0"
          title="Download recording"
        >
          <Download size={10} />
        </button>

        {leadTranscript && (
          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            className={`rounded p-1 transition cursor-pointer active:scale-95 shrink-0 ${showTranscript
              ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400/30"
              : "bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400"
              }`}
            title="Toggle call transcription"
          >
            <FileText size={10} />
          </button>
        )}

        <button
          type="button"
          onClick={() => deleteRecording(lead.id)}
          className="rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 p-1 transition cursor-pointer active:scale-95 shrink-0"
          title="Delete recording"
        >
          <Trash2 size={10} />
        </button>

        {/* Call Transcript Dropdown Bubble */}
        {showTranscript && leadTranscript && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowTranscript(false)} />
            <div className="absolute top-8 right-0 z-40 w-72 rounded-2xl border border-cyan-500/20 bg-[#0c071e]/96 p-3.5 shadow-2xl backdrop-blur-2xl space-y-2.5 animate-[slideUp_0.18s_ease] text-left">
              <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.05]">
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300">Call Transcript</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(leadTranscript);
                      push("Transcript copied", "success");
                    }}
                    className="text-[9px] font-bold text-zinc-400 hover:text-white transition flex items-center gap-0.5 cursor-pointer"
                  >
                    📋 Copy
                  </button>
                  <button onClick={() => setShowTranscript(false)} className="text-zinc-500 hover:text-white">
                    <X size={10} />
                  </button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto pr-1 text-[10px] text-zinc-300 leading-relaxed font-sans whitespace-pre-wrap select-text selection:bg-cyan-500/30">
                {leadTranscript}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Default: Record setup button + expanded panel
  return (
    <div className="relative flex flex-col items-start shrink-0">
      <button
        type="button"
        disabled={isAnotherLeadRecording}
        onClick={() => setExpanded(!expanded)}
        title={isAnotherLeadRecording ? "Another recording is currently active" : expanded ? "Close recording setup" : "Start call recording"}
        className={`shrink-0 rounded-lg p-1.5 transition ${isAnotherLeadRecording
          ? "bg-white/[0.01] text-zinc-700 cursor-not-allowed opacity-30"
          : expanded
            ? "bg-red-500/20 text-red-400"
            : "bg-white/[0.05] text-zinc-500 hover:bg-white/10 hover:text-white"
          }`}
      >
        <Mic size={11} />
      </button>

      {/* Expanded Consent Panel */}
      {expanded && !isAnotherLeadRecording && (
        <>
          {/* Invisible backdrop to close the tiny panel on clicking outside */}
          <div className="fixed inset-0 z-30" onClick={() => setExpanded(false)} />

          <div className="absolute top-7 left-0 z-40 w-52 rounded-xl border border-red-500/20 bg-[#0c071e] p-3 shadow-xl space-y-2.5 animate-[slideUp_0.15s_ease]">
            <div className="flex items-center justify-between pb-1 border-b border-white/[0.04]">
              <span className="text-[9px] font-black uppercase tracking-widest text-red-400">Record Call</span>
              <button onClick={() => setExpanded(false)} className="text-zinc-500 hover:text-white">
                <X size={10} />
              </button>
            </div>

            {recError && (
              <p className="text-[8px] text-red-400 leading-normal bg-red-500/5 p-1.5 rounded-lg border border-red-500/10">
                {recError}
              </p>
            )}

            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 w-3 h-3 rounded border-white/20 bg-black text-red-500 cursor-pointer"
              />
              <span className="text-[9px] text-zinc-300 leading-snug">I have the permission/legal right to record.</span>
            </label>

            <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.04] gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText("Just so you know, I may record this call for notes and follow-up. Is that okay?");
                  push("Consent script copied", "success");
                }}
                className="text-[9px] font-extrabold text-zinc-400 hover:text-cyan-300 transition flex items-center gap-0.5 cursor-pointer"
              >
                📋 Copy Script
              </button>

              <button
                type="button"
                onClick={() => {
                  startRecording(lead);
                  setExpanded(false);
                }}
                disabled={!consent}
                className="rounded-lg bg-red-600 hover:bg-red-500 text-white px-2.5 py-1 text-[9px] font-black tracking-wider uppercase transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <Mic size={9} /> Start
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
