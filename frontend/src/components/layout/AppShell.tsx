'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { CreateJobProvider } from '@/components/jobs/CreateJobContext';
import { AiChatPanelProvider } from '@/components/aichat/AiChatContext';
import { AiChatPanel } from '@/components/aichat/AiChatPanel';
import { AiChatTrigger } from '@/components/aichat/AiChatTrigger';

const COLLAPSED_STORAGE_KEY = 'relay-sidebar-collapsed';

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // Phones and small tablets start with the narrow icon rail so pages get
    // the room; an explicit choice (either way) is always respected.
    const smallScreen = window.matchMedia('(max-width: 1023px)').matches;
    try {
      const stored = window.localStorage.getItem(COLLAPSED_STORAGE_KEY);
      setCollapsed(stored === null ? smallScreen : stored === 'true');
    } catch {
      setCollapsed(smallScreen);
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
      } catch {
        // localStorage unavailable - collapse state just won't persist.
      }
      return next;
    });
  };

  return (
    <CreateJobProvider>
      <AiChatPanelProvider>
        <div className="min-h-screen bg-background">
          <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
          <div
            className={`flex min-h-screen flex-col transition-[padding-left] duration-200 ${
              collapsed ? 'pl-18' : 'pl-65'
            }`}
          >
            <TopBar />
            <main className="mx-auto w-full max-w-[1600px] min-w-0 flex-1 px-4 py-6 sm:px-8">{children}</main>
          </div>
          <AiChatPanel />
          <AiChatTrigger />
        </div>
      </AiChatPanelProvider>
    </CreateJobProvider>
  );
}

export default AppShell;
