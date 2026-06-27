import React from "react";

export function MiniStat({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2 text-center">
      <div className={`text-lg font-black ${accent ?? "text-white"}`}>{value}</div>
      <div className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">{label}</div>
    </div>
  );
}
