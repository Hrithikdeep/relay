import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent">
        <Sparkles className="h-4 w-4 text-white" strokeWidth={2} />
      </div>
      <span className="text-sm font-semibold tracking-[0.2em] text-foreground">RELAY</span>
    </div>
  );
}

// Clerk's own form (so every sign-in method it supports keeps working),
// restyled with the app's CSS variables so it follows the light/dark theme
// and matches the rest of the page.
const clerkAppearance = {
  variables: { fontFamily: "inherit" },
  elements: {
    rootBox: { width: "100%" },
    cardBox: { width: "100%", boxShadow: "none", border: "none", background: "transparent" },
    card: { width: "100%", boxShadow: "none", border: "none", background: "transparent", padding: 0, gap: "16px" },
    header: { display: "none" },
    formFieldLabel: { fontSize: "14px", fontWeight: 500, color: "var(--foreground)" },
    formFieldInput: {
      borderRadius: "6px",
      border: "1px solid var(--border)",
      background: "var(--background)",
      color: "var(--foreground)",
      padding: "10px 12px",
      fontSize: "14px",
      boxShadow: "none",
      "&:focus": { borderColor: "var(--foreground)", boxShadow: "none", outline: "none" },
    },
    formFieldInputShowPasswordButton: { color: "var(--muted-foreground)" },
    formFieldAction: { color: "var(--muted-foreground)" },
    formButtonPrimary: {
      borderRadius: "6px",
      background: "var(--foreground)",
      color: "var(--background)",
      padding: "10px 14px",
      fontSize: "14px",
      fontWeight: 500,
      textTransform: "none",
      boxShadow: "none",
      "&:hover": { background: "var(--foreground)", opacity: 0.9 },
    },
    socialButtonsBlockButton: {
      borderRadius: "6px",
      border: "1px solid var(--border)",
      background: "transparent",
      color: "var(--foreground)",
      boxShadow: "none",
      "&:hover": { background: "var(--card)" },
    },
    dividerLine: { background: "var(--border)" },
    dividerText: { color: "var(--muted-foreground)" },
    footer: { background: "transparent", boxShadow: "none" },
    footerActionText: { color: "var(--muted-foreground)" },
    footerActionLink: { color: "var(--foreground)" },
  },
} as const;

export default function SignInPage() {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-card p-10 lg:flex">
        <Logo />
        <div>
          <p className="font-mono text-xs tracking-widest text-muted-foreground">
            AI-NATIVE JOB INFRASTRUCTURE
          </p>
          <h2 className="mt-4 font-serif text-5xl leading-[1.1] text-foreground">
            Infrastructure that thinks.
          </h2>
          <p className="mt-4 max-w-md text-base text-muted-foreground">
            Queues, workers and workflows — classified, retried and operated by AI.
          </p>
        </div>
        <p className="text-xs text-subtle-foreground">Your workspace is protected by access controls.</p>
      </aside>

      <main className="relative flex items-center justify-center px-4 py-12">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-[450px]">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sign in to your workspace</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your credentials to access the Relay dashboard.
          </p>

          <div className="mt-6">
            <SignIn appearance={clerkAppearance} signUpUrl="/sign-up" />
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
