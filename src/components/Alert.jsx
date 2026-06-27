import React from "react";
import { AlertTriangle } from "lucide-react";

export function Alert({ type, msg }) {
  const cls = type === "error" ? "border-red-500/25 bg-red-500/8 text-red-300" :
    type === "success" ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-300" :
      "border-yellow-400/25 bg-yellow-400/8 text-yellow-200";
  return (
    <div className={`mb-3 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs ${cls}`}>
      <AlertTriangle size={13} className="mt-0.5 shrink-0" />
      <p>{msg}</p>
    </div>
  );
}
