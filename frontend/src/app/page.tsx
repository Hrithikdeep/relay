import { Geist_Mono } from "next/font/google";
import { FaqSection } from "@/components/landing/FaqSection";
import { FeatureBento } from "@/components/landing/FeatureBento";
import { FinalCta } from "@/components/landing/FinalCta";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { OpenSourceSection } from "@/components/landing/OpenSourceSection";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { ProblemSection } from "@/components/landing/ProblemSection";

// The landing page has its own palette (a blue-tinted dark, and a white one
// with soft blue/lavender glows) that follows the app's light/dark toggle via
// the "light" class on <html>. The --l-* names are short aliases used by the
// landing components.
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const LANDING_CSS = `
.landing-root .font-mono { font-family: var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace; }
.landing-root {
  --l-bg: #0c0d14; --l-surface: #121420; --l-surface-2: #191c2b;
  --l-border: #1f2230; --l-border-strong: #2b2f42;
  --l-text: #eceef2; --l-muted: #9aa0b5; --l-pain: #f0613a;
  --l-accent: #4cb5ff; --l-accent-text: #04111f;
  --l-glow-1: rgba(76, 140, 255, 0.16); --l-glow-2: rgba(139, 92, 246, 0.13);
  --l-grid: rgba(255, 255, 255, 0.04); --l-shadow: rgba(0, 0, 0, 0.55);
  color-scheme: dark;
}
html.light .landing-root {
  --l-bg: #ffffff; --l-surface: #f6f7fc; --l-surface-2: #eceffa;
  --l-border: #e3e6f1; --l-border-strong: #cdd2e6;
  --l-text: #14161f; --l-muted: #5b6178; --l-pain: #e5484d;
  --l-accent: #2563eb; --l-accent-text: #ffffff;
  --l-glow-1: rgba(96, 140, 255, 0.28); --l-glow-2: rgba(150, 110, 250, 0.22);
  --l-grid: rgba(60, 70, 120, 0.07); --l-shadow: rgba(50, 60, 130, 0.30);
  color-scheme: light;
}
`;

export default function Home() {
  return (
    <div className={`landing-root ${geistMono.variable} min-h-screen overflow-x-clip bg-(--l-bg) text-(--l-text)`}>
      <style>{LANDING_CSS}</style>
      <LandingHeader />
      <main>
        <LandingHero />
        <ProblemSection />
        <HowItWorks />
        <FeatureBento />
        <OpenSourceSection />
        <SocialProofSection />
        <FaqSection />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
