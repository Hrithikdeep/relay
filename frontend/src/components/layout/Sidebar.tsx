'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ListChecks,
  Layers,
  Cpu,
  Workflow,
  Sparkles,
  ScrollText,
  KeyRound,
  Webhook,
  BookOpen,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
}

const mainNav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/jobs', label: 'Jobs', icon: ListChecks },
  { href: '/queues', label: 'Queues', icon: Layers },
  { href: '/workers', label: 'Workers', icon: Cpu },
  { href: '/workflows', label: 'Workflows', icon: Workflow },
  { href: '/insights', label: 'AI Insights', icon: Sparkles },
  { href: '/logs', label: 'Logs', icon: ScrollText },
  { href: '/api-keys', label: 'API Keys', icon: KeyRound },
  { href: '/webhooks', label: 'Webhooks', icon: Webhook },
];

const secondaryNav: NavItem[] = [
  { href: '/docs', label: 'Docs', icon: BookOpen },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={`group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
        collapsed ? 'justify-center px-0' : ''
      } ${
        active
          ? 'bg-accent/10 text-foreground'
          : 'text-muted-foreground hover:bg-card hover:text-foreground'
      }`}
    >
      <span
        className={`absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full ${
          active ? 'bg-accent' : 'bg-transparent'
        }`}
      />
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.soon && (
            <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-subtle-foreground">
              Soon
            </span>
          )}
        </>
      )}
    </Link>
  );
}

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex flex-col overflow-hidden border-r border-border bg-background transition-[width] duration-200 ${
        collapsed ? 'w-18' : 'w-65'
      }`}
    >
      <div className={`flex h-16 items-center gap-2 px-5 ${collapsed ? 'justify-center px-0' : ''}`}>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent">
          <Sparkles className="h-4 w-4 text-white" strokeWidth={2} />
        </div>
        {!collapsed && (
          <span className="text-[15px] font-semibold tracking-tight text-foreground">Relay</span>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
        {mainNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
            collapsed={collapsed}
          />
        ))}

        <div className="my-3 h-px bg-border" />

        {secondaryNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <div
        className={`flex items-center gap-3 border-t border-border px-4 py-4 ${
          collapsed ? 'justify-center px-0' : ''
        }`}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card text-xs font-medium text-foreground">
          RW
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">Relay Workspace</p>
            <p className="truncate text-xs text-subtle-foreground">Development</p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onToggleCollapsed}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={`flex items-center gap-2 border-t border-border px-4 py-3 text-sm text-muted-foreground hover:bg-card hover:text-foreground ${
          collapsed ? 'justify-center px-0' : ''
        }`}
      >
        {collapsed ? (
          <PanelLeftOpen className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        ) : (
          <>
            <PanelLeftClose className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span>Collapse</span>
          </>
        )}
      </button>
    </aside>
  );
}

export default Sidebar;
