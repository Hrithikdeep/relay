import { existsSync } from "node:fs";
import path from "node:path";
import { ProductShotImage } from "./ProductShotImage";

export function ProductShot() {
  const dir = path.join(process.cwd(), "public", "landing");
  const hasDark = existsSync(path.join(dir, "dashboard.png"));
  const hasLight = existsSync(path.join(dir, "dashboard-light.png"));

  return (
    <section className="px-6 pb-24">
      <div className="relative mx-auto max-w-5xl">
        <div
          className="pointer-events-none absolute -inset-4 rounded-3xl opacity-40 blur-2xl"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--ai))" }}
        />
        <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/30 ring-1 ring-ai/20">
          <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
            <span className="mx-auto rounded-md bg-background px-10 py-1 font-mono text-[11px] text-subtle-foreground">
              relay dashboard
            </span>
          </div>
          <ProductShotImage hasDark={hasDark} hasLight={hasLight} />
        </div>
      </div>
    </section>
  );
}

export default ProductShot;
