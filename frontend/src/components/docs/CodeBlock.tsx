"use client";

import { useState } from "react";
import { Copy, CircleCheck } from "lucide-react";

interface CodeBlockProps {
  label?: string;
  code: string;
}

export function CodeBlock({ label, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable - nothing to do.
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-xs font-medium uppercase tracking-wide text-subtle-foreground">
          {label ?? "Example"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <>
              <CircleCheck className="h-3.5 w-3.5 text-success" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-auto p-4 font-mono text-xs text-foreground">{code}</pre>
    </div>
  );
}

export default CodeBlock;
