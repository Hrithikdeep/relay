"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type Kind = "kw" | "fn" | "str" | "cm" | "pl" | "id";
type Token = [Kind, string];

const CLASS: Record<Kind, string> = {
  kw: "text-ai",
  fn: "text-accent",
  str: "text-success",
  cm: "text-subtle-foreground",
  pl: "text-muted-foreground",
  id: "text-foreground",
};

// Real SDK API - see sdk/typescript/README.md. Each inner array is a line.
const LINES: Token[][] = [
  [["kw", "import"], ["pl", " { "], ["id", "Relay"], ["pl", " } "], ["kw", "from"], ["pl", " "], ["str", '"@relay/sdk"'], ["pl", ";"]],
  [],
  [["kw", "const"], ["id", " relay "], ["pl", "= "], ["kw", "new"], ["pl", " "], ["fn", "Relay"], ["pl", "({ apiKey: "], ["id", "process.env.RELAY_API_KEY!"], ["pl", " });"]],
  [],
  [["cm", "// Describe the job - Relay classifies it and routes it to a queue."]],
  [["kw", "const"], ["id", " job "], ["pl", "= "], ["kw", "await"], ["id", " relay"], ["pl", "."], ["fn", "run"], ["pl", "("], ["str", '"Send welcome email to user@email.com"'], ["pl", ");"]],
];

const PLAIN = LINES.map((line) => line.map(([, text]) => text).join("")).join("\n");

export function CodeCard({ filename }: { filename: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(PLAIN);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable (insecure context / denied) - nothing to do.
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card text-left shadow-2xl shadow-black/30">
      <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
        <span className="ml-3 font-mono text-xs text-subtle-foreground">{filename}</span>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy code"
          className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-background hover:text-foreground"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-5 py-5 font-mono text-[13px] leading-relaxed">
        <code>
          {LINES.map((line, i) => (
            <span key={i} className="block min-h-[1.4em]">
              {line.map(([kind, text], j) => (
                <span key={j} className={CLASS[kind]}>
                  {text}
                </span>
              ))}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

export default CodeCard;
