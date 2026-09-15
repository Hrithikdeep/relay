import Link from "next/link";
import { Sparkles } from "lucide-react";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent">
            <Sparkles className="h-4 w-4 text-white" strokeWidth={2} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">Relay</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#how-it-works" className="hover:text-foreground">
            How it works
          </a>
          <a href="#pricing" className="hover:text-foreground">
            Pricing
          </a>
          <Link href="/docs" className="hover:text-foreground">
            Docs
          </Link>
        </nav>

        {/* No login exists yet - links straight to the dashboard rather than
            an auth flow. Revisit once accounts/auth ship. */}
        <Link
          href="/dashboard"
          className="rounded-md bg-foreground px-3.5 py-1.5 text-sm font-medium text-background hover:opacity-90"
        >
          Open Dashboard
        </Link>
      </div>
    </header>
  );
}

export default LandingHeader;
