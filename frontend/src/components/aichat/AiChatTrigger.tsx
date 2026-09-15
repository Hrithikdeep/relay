"use client";

import { Sparkles } from "lucide-react";
import { useAiChatPanel } from "./AiChatContext";

/** Floating launcher for the AI Chat panel - fixed to the viewport (not the
 * scrolling page content) so it stays put while a page like Jobs scrolls.
 * Hidden while the panel itself is open to avoid a redundant/overlapping
 * control. */
export function AiChatTrigger() {
  const { open, openPanel } = useAiChatPanel();

  if (open) return null;

  return (
    <button
      type="button"
      onClick={openPanel}
      aria-label="Open Relay AI"
      className="fixed right-6 top-1/2 z-30 flex h-13 w-13 -translate-y-1/2 items-center justify-center rounded-full bg-ai text-white shadow-lg hover:opacity-90"
    >
      <Sparkles className="h-5 w-5" />
    </button>
  );
}

export default AiChatTrigger;
