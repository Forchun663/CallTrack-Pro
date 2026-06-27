import React, { useState } from "react";
import { Copy } from "lucide-react";

export function CopyBtn({ text, label, push }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      push(`${label} copied ✓`, "success");
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <button
      onClick={handleCopy}
      title={`Copy ${label}`}
      className={`shrink-0 rounded-lg p-1.5 transition ${
        copied ? "bg-emerald-500/15 text-emerald-400" : "bg-white/[0.05] text-zinc-500 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Copy size={11} />
    </button>
  );
}
