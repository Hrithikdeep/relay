"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface AiChatContextValue {
  open: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
}

const AiChatContext = createContext<AiChatContextValue | null>(null);

export function useAiChatPanel(): AiChatContextValue {
  const ctx = useContext(AiChatContext);
  if (!ctx) {
    throw new Error("useAiChatPanel must be used within an AiChatPanelProvider");
  }
  return ctx;
}

export function AiChatPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openPanel = useCallback(() => setOpen(true), []);
  const closePanel = useCallback(() => setOpen(false), []);
  const togglePanel = useCallback(() => setOpen((prev) => !prev), []);

  return (
    <AiChatContext.Provider value={{ open, openPanel, closePanel, togglePanel }}>
      {children}
    </AiChatContext.Provider>
  );
}

export default AiChatPanelProvider;
