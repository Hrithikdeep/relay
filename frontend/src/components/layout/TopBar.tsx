'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, Plus, ChevronDown, Check, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useCreateJob } from '@/components/jobs/CreateJobContext';
import { GlobalSearch } from './GlobalSearch';

const LABEL_OVERRIDES: Record<string, string> = {
  insights: 'AI Insights',
  'api-keys': 'API Keys',
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

type Environment = 'Production' | 'Staging' | 'Development';

const ENVIRONMENTS: { name: Environment; dotClassName: string }[] = [
  { name: 'Production', dotClassName: 'bg-success' },
  { name: 'Staging', dotClassName: 'bg-warning' },
  { name: 'Development', dotClassName: 'bg-idle' },
];

function EnvironmentSelector() {
  const [open, setOpen] = useState(false);
  const [environment, setEnvironment] = useState<Environment>('Production');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const current = ENVIRONMENTS.find((env) => env.name === environment)!;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-sm text-foreground hover:border-subtle-foreground"
      >
        <span className={`h-1.5 w-1.5 rounded-full ${current.dotClassName}`} />
        {environment}
        <ChevronDown className="h-3.5 w-3.5 text-subtle-foreground" strokeWidth={1.75} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-44 overflow-hidden rounded-md border border-border bg-card py-1 shadow-lg">
          {ENVIRONMENTS.map((env) => (
            <button
              key={env.name}
              type="button"
              onClick={() => {
                setEnvironment(env.name);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-background"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${env.dotClassName}`} />
              <span className="flex-1">{env.name}</span>
              {env.name === environment && (
                <Check className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/95 px-8 backdrop-blur">
      <div className="flex items-center gap-1.5 text-sm">
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

      <div className="flex flex-1 items-center justify-end gap-3">
        <GlobalSearch />

        <EnvironmentSelector />

        <ThemeToggle />

        <button
          type="button"
          aria-label="Notifications"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground"
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
