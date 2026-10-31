import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 py-1">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent">
        <Sparkles className="h-4 w-4 text-white" strokeWidth={2} />
      </div>
      <span className="text-sm font-semibold tracking-tight text-(--l-text)">Relay</span>
    </Link>
  );
}

export default Logo;
