'use client';

import { usePathname } from 'next/navigation';
import { Bell, Plus, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useCreateJob } from '@/components/jobs/CreateJobContext';
import { GlobalSearch } from './GlobalSearch';

const LABEL_OVERRIDES: Record<string, string> = {
  insights: 'AI Insights',
  'api-keys': 'API Keys',
  api: 'API',
  ai: 'AI',
  sdks: 'SDKs',
  faq: 'FAQ',
};

function formatSegment(segment: string): string {
  if (LABEL_OVERRIDES[segment]) {
    return LABEL_OVERRIDES[segment];
  }

  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function useBreadcrumb(): string[] {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  return ['Relay', ...segments.map(formatSegment)];
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground"
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" strokeWidth={1.75} />
      ) : (
        <Moon className="h-4 w-4" strokeWidth={1.75} />
      )}
    </button>
  );
}

export function TopBar() {
  const crumbs = useBreadcrumb();
  const { openCreateJob } = useCreateJob();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b border-border bg-background/95 px-4 backdrop-blur sm:gap-4 sm:px-8">
      <div className="hidden min-w-0 items-center gap-1.5 truncate text-sm sm:flex">
        {crumbs.map((crumb, index) => (
          <span key={`${crumb}-${index}`} className="flex items-center gap-1.5">
            {index > 0 && <span className="text-subtle-foreground">/</span>}
            <span
              className={index === crumbs.length - 1 ? 'text-foreground' : 'text-muted-foreground'}
            >
              {crumb}
            </span>
          </span>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
        <GlobalSearch />

        <ThemeToggle />

        <button
          type="button"
          aria-label="Notifications"
          className="hidden h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground sm:flex"
        >
          <Bell className="h-4 w-4" strokeWidth={1.75} />
        </button>

        <button
          type="button"
          onClick={() => openCreateJob()}
          className="flex h-9 items-center gap-1.5 rounded-md bg-accent px-3.5 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Create Job
        </button>
      </div>
    </header>
  );
}

export default TopBar;
