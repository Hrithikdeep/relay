import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { CreateWorkspaceButton } from "./CreateWorkspaceButton";
import { GithubIcon } from "./GithubIcon";
import { Logo } from "./Logo";
import { REPO_URL } from "./links";

const NAV = [
  { href: "#problem", label: "Problem" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#open-source", label: "Open source" },
  { href: "#faq", label: "FAQ" },
];

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-(--l-border) bg-(--l-bg)/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 whitespace-nowrap text-sm text-(--l-muted) lg:flex">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="hover:text-(--l-accent)">
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="hidden whitespace-nowrap rounded-full border border-(--l-border) px-2.5 py-1 font-mono text-[11px] text-(--l-muted) xl:inline">
            open source · free during beta
          </span>
          <ThemeToggle />
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="hidden items-center gap-1.5 rounded-md border border-(--l-border) px-2.5 py-1.5 text-sm text-(--l-text) hover:bg-(--l-surface) sm:inline-flex"
          >
            <GithubIcon className="h-4 w-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
          <Link href="/sign-in" className="hidden px-2 py-1.5 text-sm text-(--l-muted) hover:text-(--l-accent) sm:inline">
            Sign in
          </Link>
          <CreateWorkspaceButton className="inline-flex min-h-9 items-center rounded-md bg-(--l-text) px-3.5 py-1.5 text-sm font-medium text-(--l-bg) transition-opacity hover:opacity-90">
            Create workspace
          </CreateWorkspaceButton>
        </div>
      </div>
    </header>
  );
}

export default LandingHeader;
