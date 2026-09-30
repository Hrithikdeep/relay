import Link from "next/link";
import { Sparkles } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 md:flex-row md:justify-between">
        <div className="max-w-xs">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2} />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">Relay</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Built for developers.</p>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-subtle-foreground">Product</h4>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              <li>
                <Link href="/dashboard" className="hover:text-foreground">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/jobs" className="hover:text-foreground">
                  Jobs
                </Link>
              </li>
              <li>
                <Link href="/queues" className="hover:text-foreground">
                  Queues
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-subtle-foreground">Platform</h4>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              <li>
                <Link href="/workflows" className="hover:text-foreground">
                  Workflows
                </Link>
              </li>
              <li>
                <Link href="/insights" className="hover:text-foreground">
                  AI Insights
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-subtle-foreground">Resources</h4>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              <li>
                <Link href="/docs" className="hover:text-foreground">
                  Docs
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/Hrithikdeep/relay"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-6xl px-6 text-xs text-subtle-foreground">
        © {new Date().getFullYear()} Relay.
      </div>
    </footer>
  );
}

export default LandingFooter;
