"use client";

import { LayoutDashboard } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

interface Props {
  hasDark: boolean;
  hasLight: boolean;
}

// Availability is decided on the server (see ProductShot.tsx), so a missing
// file never triggers a failed image request.
export function ProductShotImage({ hasDark, hasLight }: Props) {
  const { theme } = useTheme();
  const src =
    theme === "light" && hasLight ? "/landing/dashboard-light.png" : hasDark ? "/landing/dashboard.png" : null;

  if (!src) {
    return (
      <div className="flex aspect-[16/9] flex-col items-center justify-center gap-3 bg-background text-subtle-foreground">
        <LayoutDashboard className="h-8 w-8" strokeWidth={1.5} />
        <span className="text-sm">Dashboard screenshot</span>
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="Relay dashboard" className="block w-full" />;
}
