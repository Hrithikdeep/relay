import { Check, MessageSquare, X } from "lucide-react";

export function AiAgentSection() {
  return (
    <section className="border-b border-border/60 py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2">
        <div>
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-ai/10">
            <MessageSquare className="h-4 w-4 text-ai" />
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Operate your queues by chatting
          </h2>
          <p className="mt-4 text-muted-foreground">
            Ask the AI agent about your jobs, queues, and workers. For anything destructive, it asks first —
            nothing runs until you click Approve or Reject.
          </p>
        </div>

        {/* Illustrative UI only - no real data. */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-xl shadow-black/20">
          <div className="ml-auto w-fit max-w-[85%] rounded-lg bg-accent px-3 py-2 text-sm text-white">
            Pause the emails queue
          </div>
          <div className="mt-3 max-w-[90%] rounded-lg border border-border bg-background p-3">
            <p className="text-sm text-foreground">This action needs your confirmation before I run it.</p>
            <div className="mt-3 flex gap-2">
              <span className="flex items-center gap-1.5 rounded-md bg-success/15 px-3 py-1.5 text-xs font-medium text-success">
                <Check className="h-3.5 w-3.5" />
                Approve
              </span>
              <span className="flex items-center gap-1.5 rounded-md bg-danger/15 px-3 py-1.5 text-xs font-medium text-danger">
                <X className="h-3.5 w-3.5" />
                Reject
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AiAgentSection;
