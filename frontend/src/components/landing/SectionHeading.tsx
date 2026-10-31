import type { ReactNode } from "react";

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="font-mono text-xs uppercase tracking-widest text-(--l-muted)">{children}</p>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-(--l-text) sm:text-4xl">
      {children}
    </h2>
  );
}
