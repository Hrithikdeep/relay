"use client";

import { useState } from "react";
import { Copy, CircleCheck } from "lucide-react";

interface JsonViewerProps {
  title: string;
  value: unknown;
  emptyLabel?: string;
}

export function JsonViewer({ title, value, emptyLabel = "—" }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);

  const hasValue = value !== null && value !== undefined;
  const text = hasValue ? JSON.stringify(value, null, 2) : "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
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
          {title}
        </span>
        {hasValue && (
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
        )}
      </div>
      {hasValue ? (
        <pre className="max-h-64 overflow-auto p-4 font-mono text-xs text-foreground">{text}</pre>
      ) : (
        <p className="p-4 text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}

export default JsonViewer;
