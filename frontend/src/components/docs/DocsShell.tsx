"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, Menu, Search, X } from "lucide-react";
import { DOC_GROUPS, DOC_PAGES, docHref, type DocPageMeta } from "@/lib/docs";

function normalize(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
}

function matches(page: DocPageMeta & { group: string }, query: string): boolean {
  const haystack = `${page.title} ${page.description} ${page.group} ${(page.keywords ?? []).join(" ")}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

function DocsNav({ pathname }: { pathname: string }) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();

  const groups = useMemo(
    () =>
      DOC_GROUPS.map((group) => ({
        ...group,
        pages: group.pages.filter((page) => !trimmed || matches({ ...page, group: group.title }, trimmed)),
      })).filter((group) => group.pages.length > 0),
    [trimmed]
  );

  return (
    <nav aria-label="Documentation" className="flex flex-col gap-4">
      <label className="relative block">
        <span className="sr-only">Search the docs</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search docs…"
          className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-subtle-foreground focus:border-subtle-foreground focus:outline-none"
        />
      </label>

      {groups.length === 0 && <p className="px-1 text-sm text-muted-foreground">No pages match “{trimmed}”.</p>}

      {groups.map((group) => (
        <div key={group.title}>
          <p className="mb-1.5 px-2 text-xs font-medium uppercase tracking-wide text-subtle-foreground">{group.title}</p>
          <ul className="flex flex-col gap-0.5">
            {group.pages.map((page) => {
              const href = docHref(page.slug);
              const active = normalize(pathname) === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-md px-2 py-1.5 text-sm transition-colors ${
                      active
                        ? "bg-card font-medium text-foreground"
                        : "text-muted-foreground hover:bg-card hover:text-foreground"
                    }`}
                  >
                    {page.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

function OnThisPage({ pathname }: { pathname: string }) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Read the rendered article's headings (and API endpoint cards) once the
  // page for this path has mounted.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const nodes = document.querySelectorAll<HTMLElement>("article h2[id], article h3[id], article [data-toc]");
      setHeadings(
        Array.from(nodes).map((node) => ({
          id: node.id,
          text: node.dataset.toc ?? node.textContent ?? "",
          level: node.tagName === "H3" ? 3 : 2,
        }))
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-90px 0px -65% 0px" }
    );
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <nav aria-label="On this page">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle-foreground">On this page</p>
      <ul className="flex flex-col gap-1 border-l border-border">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={`-ml-px block border-l py-0.5 text-[13px] leading-snug transition-colors ${h.level === 3 ? "pl-6" : "pl-3"} ${
                activeId === h.id
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function PrevNext({ pathname }: { pathname: string }) {
  const index = DOC_PAGES.findIndex((p) => docHref(p.slug) === normalize(pathname));
  if (index === -1) return null;
  const prev = DOC_PAGES[index - 1];
  const next = DOC_PAGES[index + 1];

  return (
    <div className="mt-12 grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
      {prev ? (
        <Link href={docHref(prev.slug)} className="group rounded-lg border border-border p-4 hover:border-subtle-foreground">
          <span className="flex items-center gap-1.5 text-xs text-subtle-foreground">
            <ArrowLeft className="h-3 w-3" /> Previous
          </span>
          <span className="mt-1 block text-sm font-medium text-foreground">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link href={docHref(next.slug)} className="group rounded-lg border border-border p-4 text-right hover:border-subtle-foreground sm:col-start-2">
          <span className="flex items-center justify-end gap-1.5 text-xs text-subtle-foreground">
            Next <ArrowRight className="h-3 w-3" />
          </span>
          <span className="mt-1 block text-sm font-medium text-foreground">{next.title}</span>
        </Link>
      )}
    </div>
  );
}

export function DocsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // The mobile menu remembers which page it was opened on, so it closes by
  // itself when you navigate (no effect needed to reset it).
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === pathname;
  const current = DOC_PAGES.find((p) => docHref(p.slug) === normalize(pathname));

  return (
    <div className="flex flex-col gap-6">
      <div className="lg:hidden">
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="docs-mobile-menu"
          onClick={() => setMenuPath(menuOpen ? null : pathname)}
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground"
        >
          <span className="flex items-center gap-2">
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            Docs menu
          </span>
          {current && <span className="truncate text-muted-foreground">{current.title}</span>}
        </button>
        {menuOpen && (
          <div id="docs-mobile-menu" className="mt-2 max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-background p-3">
            <DocsNav pathname={pathname} />
          </div>
        )}
      </div>

      <div className="grid gap-10 lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)_190px]">
        <aside className="sticky top-24 hidden max-h-[calc(100vh-8rem)] self-start overflow-y-auto pr-2 lg:block">
          <DocsNav pathname={pathname} />
        </aside>

        <div className="min-w-0">
          <article className="flex max-w-3xl flex-col gap-4 text-sm leading-relaxed text-muted-foreground">{children}</article>
          <div className="max-w-3xl">
            <PrevNext pathname={pathname} />
          </div>
        </div>

        <aside className="sticky top-24 hidden max-h-[calc(100vh-8rem)] self-start overflow-y-auto xl:block">
          <OnThisPage pathname={pathname} />
        </aside>
      </div>
    </div>
  );
}

export default DocsShell;
