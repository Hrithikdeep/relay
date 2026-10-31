import type { Metadata } from "next";
import { PageHeader } from "@/components/docs/DocsKit";
import { FAQ } from "@/components/landing/FaqSection";

export const metadata: Metadata = { title: "FAQ · Relay Docs" };

export default function FaqPage() {
  return (
    <>
      <PageHeader title="FAQ" lead="Fair questions, straight answers." />
      <div className="flex flex-col">
        {FAQ.map((item, i) => (
          <details key={item.q} open={i === 0} className="group border-t border-border last:border-b">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-base font-medium text-foreground [&::-webkit-details-marker]:hidden">
              {item.q}
              <span className="shrink-0 font-mono text-accent transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>
    </>
  );
}
