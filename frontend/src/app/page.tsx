import { AiAgentSection } from "@/components/landing/AiAgentSection";
import { DemoSection } from "@/components/landing/DemoSection";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { OpenSourceSection } from "@/components/landing/OpenSourceSection";
import { ProductShot } from "@/components/landing/ProductShot";
import { WorkflowsSection } from "@/components/landing/WorkflowsSection";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <LandingHero />
      <ProductShot />
      <FeatureGrid />
      <HowItWorks />
      <AiAgentSection />
      <WorkflowsSection />
      <OpenSourceSection />
      <DemoSection />
      <LandingFooter />
    </div>
  );
}
