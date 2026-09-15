"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { api } from "@/lib/api";
import { formatCompactNumber } from "@/lib/format";
import { WaitlistModal } from "./WaitlistModal";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "",
    description: "For side projects and evaluation.",
    features: ["1 workspace", "1,000 jobs / month", "Community support"],
    cta: "Start Free",
  },
  {
    name: "Pro",
    price: "$49",
    period: "/mo",
    description: "For small teams running production jobs.",
    features: ["3 workspaces", "50,000 jobs / month", "AI error analysis", "Email support"],
    cta: "Start Pro",
    highlighted: true,
  },
  {
    name: "Growth",
    price: "$199",
    period: "/mo",
    description: "For teams scaling background workloads.",
    features: ["10 workspaces", "500,000 jobs / month", "Workflows", "Priority support"],
    cta: "Start Growth",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For custom volume, security, and support needs.",
    features: ["Unlimited workspaces", "Custom job volume", "SSO", "Dedicated support"],
    cta: "Contact Sales",
  },
];

export function PricingSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>(undefined);
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);

  useEffect(() => {
    api
      .getWaitlistCount()
      .then((res) => setWaitlistCount(res.count))
      .catch(() => setWaitlistCount(null));
  }, []);

  function openWaitlist(plan: string) {
    setSelectedPlan(plan);
    setModalOpen(true);
  }

  return (
    <section id="pricing" className="border-b border-border/60 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Planned pricing
          </h2>
          <p className="mt-4 text-muted-foreground">
            Relay isn&apos;t generally available yet. This is our planned pricing — join the waitlist to get
            notified at launch.
          </p>
          {/* Real live count from GET /v1/waitlist/count - omitted entirely at 0 rather than showing "Join 0 teams". */}
          {waitlistCount !== null && waitlistCount > 0 && (
            <p className="mt-3 text-sm text-ai">
              Join {formatCompactNumber(waitlistCount)} {waitlistCount === 1 ? "team" : "teams"} on the
              waitlist.
            </p>
          )}
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`flex flex-col rounded-lg border p-5 ${
                tier.highlighted ? "border-ai bg-ai/5" : "border-border bg-card"
              }`}
            >
              <h3 className="text-sm font-semibold text-foreground">{tier.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-semibold text-foreground">{tier.price}</span>
                {tier.period && <span className="text-sm text-subtle-foreground">{tier.period}</span>}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{tier.description}</p>

              <ul className="mt-5 flex flex-1 flex-col gap-2">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => openWaitlist(tier.name)}
                className={`mt-6 rounded-md px-3.5 py-2 text-sm font-medium ${
                  tier.highlighted
                    ? "bg-ai text-white hover:opacity-90"
                    : "border border-border text-foreground hover:bg-background"
                }`}
              >
                {tier.cta}
              </button>
            </div>
          ))}
        </div>
      </div>

      <WaitlistModal open={modalOpen} onClose={() => setModalOpen(false)} plan={selectedPlan} />
    </section>
  );
}

export default PricingSection;
