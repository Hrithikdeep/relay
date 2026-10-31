import type { ReactNode } from "react";
import Link from "next/link";
import { docHref } from "@/lib/docs";
import { CodeBlock } from "./CodeBlock";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function PageHeader({ title, lead }: { title: string; lead: ReactNode }) {
  return (
    <header className="mb-2 border-b border-border pb-6">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">{lead}</p>
    </header>
  );
}

// h2/h3 get an id from their text so sections are linkable and the
// "On this page" list can find them.
export function H2({ children }: { children: string }) {
  const id = slugify(children);
  return (
    <h2 id={id} className="mt-6 scroll-mt-24 text-xl font-semibold text-foreground">
      <a href={`#${id}`} className="hover:underline">
        {children}
      </a>
    </h2>
  );
}

export function H3({ children }: { children: string }) {
  const id = slugify(children);
  return (
    <h3 id={id} className="mt-2 scroll-mt-24 text-base font-semibold text-foreground">
      {children}
    </h3>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-card px-1.5 py-0.5 font-mono text-xs text-foreground">{children}</code>;
}

export function DocLink({ slug, children }: { slug: string; children: ReactNode }) {
  return (
    <Link href={docHref(slug)} className="text-accent hover:underline">
      {children}
    </Link>
  );
}

export function List({ children }: { children: ReactNode }) {
  return <ul className="flex list-disc flex-col gap-1.5 pl-5">{children}</ul>;
}

export function Steps({ children }: { children: ReactNode }) {
  return <ol className="flex list-decimal flex-col gap-1.5 pl-5">{children}</ol>;
}

export function Callout({ title, children, tone = "note" }: { title: string; children: ReactNode; tone?: "note" | "warning" }) {
  const toneClass = tone === "warning" ? "border-warning/40 bg-warning/5" : "border-border bg-card";
  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <div className="mt-1.5 flex flex-col gap-2 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-card text-xs uppercase tracking-wide text-subtle-foreground">
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0 align-top">
              {row.map((cell, j) => (
                <td key={j} className={`px-3 py-2 ${j === 0 ? "font-mono text-xs text-foreground" : ""}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Endpoint({
  method,
  path,
  description,
  request,
  requestLabel = "Request body",
  response,
}: {
  method: "GET" | "POST" | "DELETE" | "PATCH";
  path: string;
  description: ReactNode;
  request?: string;
  requestLabel?: string;
  response: string;
}) {
  const methodColor = {
    GET: "text-accent border-accent/40",
    POST: "text-success border-success/40",
    DELETE: "text-danger border-danger/40",
    PATCH: "text-warning border-warning/40",
  }[method];

  return (
    <div
      id={slugify(`${method} ${path}`)}
      data-toc={`${method} ${path}`}
      className="flex scroll-mt-24 flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded border px-2 py-0.5 font-mono text-xs font-medium ${methodColor}`}>{method}</span>
        <code className="break-all font-mono text-sm text-foreground">{path}</code>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      {request && <CodeBlock label={requestLabel} code={request} />}
      {response.trimStart().startsWith("{") || response.trimStart().startsWith("[") ? (
        <CodeBlock label="Response" code={response} />
      ) : (
        <p className="text-xs text-subtle-foreground">{response}</p>
      )}
    </div>
  );
}

export function json(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export { CodeBlock };
