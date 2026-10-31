import { CreateWorkspaceButton } from "./CreateWorkspaceButton";
import { Logo } from "./Logo";
import { REPO_PATH, REPO_URL } from "./links";

const PRODUCT = [
  { href: "#problem", label: "Problem" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#faq", label: "FAQ" },
];

function ColumnTitle({ children }: { children: string }) {
  return <p className="font-mono text-[11px] uppercase tracking-widest text-(--l-muted)">{children}</p>;
}

const LINK = "flex min-h-10 items-center text-left text-sm text-(--l-muted) hover:text-(--l-accent)";

export function LandingFooter() {
  return (
    <footer>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-14 sm:px-6 sm:py-16 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-(--l-muted)">
            The open-source, AI-native background job queue for Node.js. Built in the open.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <ColumnTitle>Product</ColumnTitle>
          {PRODUCT.map((item) => (
            <a key={item.href} href={item.href} className={LINK}>
              {item.label}
            </a>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <ColumnTitle>Get started</ColumnTitle>
          <CreateWorkspaceButton className={LINK}>
            Create your workspace
          </CreateWorkspaceButton>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className={LINK}>
            GitHub repository
          </a>
          <a href={`${REPO_URL}#readme`} target="_blank" rel="noreferrer" className={LINK}>
            Self-host it
          </a>
        </div>
      </div>
      <div className="border-t border-(--l-border)">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-(--l-muted) sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© 2026 Relay · open source, built in the open</p>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="inline-block py-2 font-mono hover:text-(--l-accent)">
            {REPO_PATH}
          </a>
        </div>
      </div>
    </footer>
  );
}

export default LandingFooter;
