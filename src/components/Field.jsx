import React from "react";

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-zinc-400">{label}</span>
      {children}
    </label>
  );
}
