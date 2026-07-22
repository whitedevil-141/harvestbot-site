"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, Clock, DollarSign, MessageSquare, Percent, RefreshCw, Zap } from "lucide-react";
import { useAdminResource, usePolling } from "@/hooks/useAdminResource";
import {
  ANALYTICS_METRICS,
  ANALYTICS_WINDOWS,
  analytics,
  type AnalyticsBucket,
  type AnalyticsMetric,
  type AnalyticsWindow,
  type BreakdownRow,
  type Json,
} from "@/lib/chatbot-admin";
import {
  AreaChart,
  AsyncBlock,
  Badge,
  BarList,
  Button,
  PageHeader,
  Panel,
  Rows,
  Row,
  SegmentedControl,
  SkeletonList,
  StatGrid,
  StatTile,
  formatNumber,
  formatTimestamp,
  formatUsd,
  humanize,
} from "../ui";

const pickString = (row: Json, keys: string[], fallback = "unknown"): string => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value) return value;
  }
  return fallback;
};

const pickNumber = (row: Json, keys: string[]): number => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return 0;
};

const toRows = (rows: BreakdownRow[] | null, labelKeys: string[]) =>
  (rows ?? []).map((row) => ({
    label: pickString(row, labelKeys),
    sublabel: typeof row.provider === "string" ? row.provider : undefined,
    value: pickNumber(row, ["count", "runs", "calls", "total", "value"]),
  }));

export function ChatbotOverview() {
  const [window, setWindow] = useState<AnalyticsWindow>("24h");
  const [metric, setMetric] = useState<AnalyticsMetric>("runs");
  const [bucket, setBucket] = useState<AnalyticsBucket>("hour");

  const overview = useAdminResource(() => analytics.overview(window), [window]);
  const series = useAdminResource(() => analytics.timeseries(metric, bucket, window), [metric, bucket, window]);
  const tools = useAdminResource(() => analytics.tools(window), [window]);
  const models = useAdminResource(() => analytics.models(window), [window]);
  const channels = useAdminResource(() => analytics.channels(window), [window]);
  const errors = useAdminResource(() => analytics.errors(15), []);

  const refreshAll = () => {
    overview.refresh();
    series.refresh();
    tools.refresh();
    models.refresh();
    channels.refresh();
    errors.refresh();
  };

  usePolling(refreshAll, 30_000);

  const points = (series.data?.points ?? []).map((point) => ({
    label: formatTimestamp(point.bucket).replace(", ", " "),
    value: pickNumber(point, ["value", "count", "total"]),
  }));

  const statCards = useMemo(() => {
    const data = overview.data as Record<string, unknown> | null | undefined;
    if (!data) return undefined;

    const cardDefs: {
      key: string;
      icon: React.ReactNode;
      hint: string;
      format: (v: unknown) => string;
    }[] = [];
    const push = (keys: string[], icon: React.ReactNode, hint: string, format: (v: unknown) => string) => {
      for (const key of keys) {
        if (key in data) {
          const value = data[key];
          if (typeof value === "number" && Number.isFinite(value)) {
            cardDefs.push({ key: humanize(key), icon, hint, format: () => format(value) });
            return;
          }
          if (typeof value === "string") {
            cardDefs.push({ key: humanize(key), icon, hint, format: () => value });
            return;
          }
        }
      }
    };

    push(["total_runs", "runs", "run_count"], <MessageSquare className="h-4 w-4" />, "Total runs", (v) => formatNumber(v as number));
    push(["total_tokens", "tokens", "token_count"], <Zap className="h-4 w-4" />, "Tokens consumed", (v) => formatNumber(v as number));
    push(["total_cost", "cost", "total_cost_usd"], <DollarSign className="h-4 w-4" />, "Total cost", (v) => formatUsd(v as number));
    push(["avg_latency", "latency", "avg_latency_ms", "latency_ms"], <Clock className="h-4 w-4" />, "Average latency", (v) => `${formatNumber(v as number)} ms`);
    push(["total_errors", "errors", "error_count"], <AlertTriangle className="h-4 w-4" />, "Failed runs", (v) => formatNumber(v as number));
    const runs = typeof data.total_runs === "number" ? data.total_runs : typeof data.runs === "number" ? data.runs : null;
    const tokens = typeof data.total_tokens === "number" ? data.total_tokens : typeof data.tokens === "number" ? data.tokens : null;
    const cost = typeof data.total_cost === "number" ? data.total_cost : typeof data.cost === "number" ? data.cost : typeof data.total_cost_usd === "number" ? data.total_cost_usd : null;
    const errors = typeof data.total_errors === "number" ? data.total_errors : typeof data.errors === "number" ? data.errors : typeof data.error_count === "number" ? data.error_count : null;

    if (runs !== null && tokens !== null) {
      cardDefs.push({
        key: "Avg tokens / run",
        icon: <Zap className="h-4 w-4" />,
        hint: `${formatNumber(tokens)} total tokens across ${formatNumber(runs)} runs`,
        format: () => (runs === 0 ? "0" : formatNumber(Math.round(tokens / runs))),
      });
    }

    if (runs !== null && cost !== null) {
      cardDefs.push({
        key: "Avg cost / run",
        icon: <DollarSign className="h-4 w-4" />,
        hint: `${formatUsd(cost)} total cost across ${formatNumber(runs)} runs`,
        format: () => (runs === 0 ? "$0" : formatUsd(cost / runs)),
      });
    }

    if (runs !== null && errors !== null) {
      cardDefs.push({
        key: "Success rate",
        icon: <Percent className="h-4 w-4" />,
        hint: runs === 0 ? "No runs" : `${formatNumber(errors)} failed out of ${formatNumber(runs)}`,
        format: () => (runs === 0 ? "—" : `${((runs - errors) / runs) * 100 >= 99.9 ? "99.9" : formatNumber(((runs - errors) / runs) * 100, 1)}%`),
      });
    }

    return cardDefs;
  }, [overview.data]);

  return (
    <>
      <PageHeader
        title="Chatbot"
        description={`Runs, tokens, cost, latency and errors over the last ${window}. Refreshes every 30 seconds.`}
        actions={
          <>
            <SegmentedControl options={ANALYTICS_WINDOWS} value={window} onChange={setWindow} size="sm" />
            <Button size="sm" onClick={refreshAll} loading={overview.loading}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </>
        }
      />

      <AsyncBlock
        loading={overview.loading && !overview.data}
        error={overview.error}
        onRetry={overview.refresh}
        isEmpty={statCards === undefined || statCards.length === 0}
        emptyTitle="No activity in this window."
        skeleton={<SkeletonList rows={4} />}
      >
        <StatGrid>
          {statCards?.map((card) => (
            <StatTile key={card.key} label={card.key} value={card.format(undefined)} icon={card.icon} hint={card.hint} />
          ))}
        </StatGrid>
      </AsyncBlock>

      <Panel
        title="Timeseries"
        description={`${metric} per ${bucket}`}
        actions={
          <>
            <SegmentedControl options={ANALYTICS_METRICS} value={metric} onChange={setMetric} size="sm" />
            <SegmentedControl options={["hour", "day"] as const} value={bucket} onChange={setBucket} size="sm" />
          </>
        }
      >
        <AsyncBlock loading={series.loading && !series.data} error={series.error} onRetry={series.refresh}>
          <div key={`${metric}-${bucket}-${window}`} className="adm-enter">
            <AreaChart
            points={points}
            ariaLabel={`${metric} per ${bucket} over ${window}`}
            minMax={metric === "cost" ? 1 : 10}
            yFormat={(value) => (metric === "cost" ? formatUsd(value, 2) : formatNumber(value))}
            renderTooltip={(point) => (
              <div className="min-w-28 space-y-1">
                <p className="text-[11px] text-adm-mute">{point.label}</p>
                <p className="adm-nums text-lg leading-none font-semibold text-adm-text">
                  {metric === "cost" ? formatUsd(point.value) : formatNumber(point.value, 2)}
                </p>
                <p className="text-[11px] text-adm-mute">{metric}</p>
              </div>
            )}
          />
          </div>
        </AsyncBlock>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Tools" description={`Calls in ${window}`}>
          <AsyncBlock loading={tools.loading && !tools.data} error={tools.error} onRetry={tools.refresh}>
            <BarList rows={toRows(tools.data, ["name", "tool"])} />
          </AsyncBlock>
        </Panel>
        <Panel title="Models" description={`Runs in ${window}`}>
          <AsyncBlock loading={models.loading && !models.data} error={models.error} onRetry={models.refresh}>
            <BarList rows={toRows(models.data, ["name", "model"])} />
          </AsyncBlock>
        </Panel>
        <Panel title="Channels" description={`Runs in ${window}`}>
          <AsyncBlock loading={channels.loading && !channels.data} error={channels.error} onRetry={channels.refresh}>
            <BarList rows={toRows(channels.data, ["name", "channel"])} />
          </AsyncBlock>
        </Panel>
      </div>

      <Panel title="Recent errors" description="Most recent failures across every channel." padded={false}>
        <AsyncBlock
          loading={errors.loading && !errors.data}
          error={errors.error}
          onRetry={errors.refresh}
          isEmpty={(errors.data ?? []).length === 0}
          emptyTitle="No recent errors."
        >
          <Rows>
            {(errors.data ?? []).map((row, index) => (
              <Row key={index}>
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-adm-bad" />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-[13px] text-adm-text">
                    {pickString(row, ["message", "error", "detail"], "Unknown error")}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="adm-nums text-xs text-adm-mute">
                      {formatTimestamp(pickString(row, ["created_at", "timestamp", "occurred_at"], ""))}
                    </span>
                    {typeof row.channel === "string" && <Badge>{row.channel}</Badge>}
                    {typeof row.model === "string" && <Badge tone="accent">{row.model}</Badge>}
                  </div>
                </div>
              </Row>
            ))}
          </Rows>
        </AsyncBlock>
      </Panel>
    </>
  );
}
