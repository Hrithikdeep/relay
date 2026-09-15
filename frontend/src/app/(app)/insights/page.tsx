"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ListChecks,
  RefreshCw,
  Sparkles,
  Timer,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import type { AiErrorPattern, Insights, Prediction } from "@/lib/types";
import { formatMs } from "@/lib/format";
import { CircularGauge } from "@/components/CircularGauge";
import { PredictionCard } from "@/components/insights/PredictionCard";
import { ErrorPatternCard } from "@/components/insights/ErrorPatternCard";

function healthStrokeClass(score: number): string {
  if (score >= 90) return "stroke-success";
  if (score >= 70) return "stroke-warning";
  return "stroke-danger";
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [errorPatterns, setErrorPatterns] = useState<AiErrorPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    return Promise.all([api.getInsights(), api.getPredictions(), api.getErrorPatterns()])
      .then(([insightsRes, predictionsRes, patternsRes]) => {
        setInsights(insightsRes);
        setPredictions(predictionsRes.data);
        setErrorPatterns(patternsRes.data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load AI insights.");
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">AI Insights</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What Relay AI noticed and learned, computed from real job history.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={loading || refreshing}
          className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading && (
        <div className="flex flex-col gap-6">
          <div className="h-48 animate-pulse rounded-lg bg-card" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="h-40 animate-pulse rounded-lg bg-card" />
            <div className="h-40 animate-pulse rounded-lg bg-card" />
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertCircle className="h-8 w-8 text-danger" />
          <p className="text-sm text-foreground">{error}</p>
          <button
            type="button"
            onClick={() => load(false)}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {!loading && !error && insights && (
        <>
          {/* Hero */}
          <div className="flex flex-col items-center gap-8 rounded-lg border border-border bg-card p-6 sm:flex-row sm:items-center">
            <div className="flex shrink-0 flex-col items-center gap-2">
              <CircularGauge
                value={insights.healthScore / 100}
                label="Health score"
                strokeClassName={healthStrokeClass(insights.healthScore)}
                size={140}
                valueClassName="text-2xl font-semibold tabular-nums text-foreground"
              />
            </div>

            <div className="grid w-full grid-cols-2 gap-6 sm:flex-1 sm:grid-cols-5">
              <StatCard icon={ListChecks} label="Total Jobs" value={insights.stats.totalJobs} />
              <StatCard icon={XCircle} label="Failed Jobs" value={insights.stats.failedJobs} tone="danger" />
              <StatCard
                icon={CheckCircle2}
                label="Success Rate"
                value={`${Math.round(insights.stats.successRate * 100)}%`}
                tone="success"
              />
              <StatCard icon={Timer} label="Avg Duration" value={formatMs(insights.stats.avgDurationMs)} />
              <StatCard icon={Sparkles} label="Error Patterns Learned" value={insights.stats.errorPatternsLearned} tone="ai" />
            </div>
          </div>

          {/* Predictions */}
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-foreground">Predictions</h2>
            {predictions.length === 0 ? (
              <EmptyPanel
                icon={Clock}
                message="No active predictions right now. Relay checks for error surges and capacity overload every few minutes."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {predictions.map((prediction, i) => (
                  <PredictionCard key={`${prediction.type}-${i}`} prediction={prediction} />
                ))}
              </div>
            )}
          </section>

          {/* Error patterns */}
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-foreground">Error Patterns</h2>
            {errorPatterns.length === 0 ? (
              <EmptyPanel
                icon={Sparkles}
                message="No recurring error patterns detected yet. Relay learns from job failures as they happen."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {errorPatterns.map((pattern) => (
                  <ErrorPatternCard key={pattern.id} pattern={pattern} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof ListChecks;
  label: string;
  value: string | number;
  tone?: "default" | "danger" | "success" | "ai";
}) {
  const toneClass = {
    default: "text-muted-foreground",
    danger: "text-danger",
    success: "text-success",
    ai: "text-ai",
  }[tone];

  return (
    <div className="flex flex-col gap-1.5">
      <span className={`flex items-center gap-1.5 text-xs uppercase tracking-wide text-subtle-foreground`}>
        <Icon className={`h-3.5 w-3.5 ${toneClass}`} />
        {label}
      </span>
      <span className="text-xl font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function EmptyPanel({ icon: Icon, message }: { icon: typeof Clock; message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card py-12 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-background text-subtle-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
