import { Clock } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card">
        <Clock className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
      </div>
      <h2 className="text-lg font-medium text-foreground">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      <span className="mt-2 inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-subtle-foreground">
        Coming soon
      </span>
    </div>
  );
}

export default PlaceholderPage;
