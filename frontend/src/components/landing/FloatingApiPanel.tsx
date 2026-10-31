"use client";

import { useEffect, useState } from "react";

// Examples use the real API: POST /v1/jobs takes { queueId, name, payload },
// and POST /v1/queues/:name/pause returns the updated queue.
const EXAMPLES = [
  {
    label: "post a job — rest",
    request: "POST /v1/jobs",
    body: `{ "queueId": "q_emails",
  "name": "send-welcome-email",
  "payload": { "to": "ada@acme.dev" } }`,
    result: "→ 201 · queued",
  },
  {
    label: "post a job — rest",
    request: "POST /v1/jobs",
    body: `{ "queueId": "q_media",
  "name": "resize-avatar",
  "payload": { "userId": 402 } }`,
    result: "→ 201 · queued",
  },
  {
    label: "pause a queue — rest",
    request: "POST /v1/queues/emails/pause",
    body: `{ "name": "emails",
  "concurrency": 5 }`,
    result: "→ 200 · isPaused: true",
  },
];

const CYCLE_MS = 5000;

// Left/top are driven by the keyframes below. The panel glides along the top
// edge of the card (just outside it, overlapping only the card's own padding),
// fades, then glides back along the bottom edge - so it travels the card's
// border without ever sitting on top of the dashboard's content. With
// reduced motion it stays put and only the text cross-fades.
const PANEL_CSS = `
.relay-orbit { animation: relay-orbit 28s ease-in-out infinite; }
@keyframes relay-orbit {
  0%   { left: -12px; top: 0; opacity: 0; }
  4%   { left: -12px; top: 0; opacity: 1; }
  38%  { left: calc(100% - 290px + 16px); top: 0; opacity: 1; }
  42%  { left: calc(100% - 290px + 16px); top: 0; opacity: 0; }
  46%  { left: calc(100% - 290px + 16px); top: calc(100% - 136px); opacity: 0; }
  50%  { left: calc(100% - 290px + 16px); top: calc(100% - 136px); opacity: 1; }
  88%  { left: -12px; top: calc(100% - 136px); opacity: 1; }
  92%  { left: -12px; top: calc(100% - 136px); opacity: 0; }
  96%  { left: -12px; top: 0; opacity: 0; }
  100% { left: -12px; top: 0; opacity: 0; }
}
.relay-fade { animation: relay-fade 0.7s ease both; }
@keyframes relay-fade { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .relay-orbit { animation: none; left: -12px; top: 0; opacity: 1; }
}
`;

export function FloatingApiPanel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % EXAMPLES.length), CYCLE_MS);
    return () => clearInterval(timer);
  }, []);

  const example = EXAMPLES[index];

  return (
    <>
      <style>{PANEL_CSS}</style>
      <div
        aria-hidden
        className="relay-orbit absolute z-10 max-sm:hidden h-[136px] w-[min(290px,calc(100%-8px))] overflow-hidden rounded-lg border border-(--l-border-strong) bg-(--l-surface-2) p-3 font-mono text-[11px] leading-[1.45] shadow-[0_24px_60px_-20px_var(--l-shadow)]"
      >
        <div key={index} className="relay-fade">
          <p className="text-[11px] uppercase tracking-widest text-(--l-muted)">{example.label}</p>
          <p className="mt-1.5 text-(--l-text)">{example.request}</p>
          <pre className="whitespace-pre text-(--l-muted)">{example.body}</pre>
          <p className="text-(--l-accent)">{example.result}</p>
        </div>
      </div>
    </>
  );
}

export default FloatingApiPanel;
