import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { PricingSection } from "@/components/landing/PricingSection";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <LandingHero />
      <FeatureGrid />
      <HowItWorks />
      <PricingSection />
      <LandingFooter />
    </div>
  );
}
