"use client";

import React, { useMemo } from "react";
import { AreaChart, formatCurrency, type ChartPoint } from "../ui";
import { AMOUNT_TO_PLAN, PLAN_IDS, type ChartPeriod, type Payment, type PlanId } from "./PaymentsProvider";

type BucketMeta = { plans: Partial<Record<PlanId, { count: number; total: number }>>; totalSales: number };

/**
 * Revenue over time, bucketed by day or month depending on the period. The
 * bucketing is UTC throughout so a transaction does not hop buckets with the
 * viewer's timezone.
 */
export function PaymentsChart({ data, period }: { data: Payment[]; period: ChartPeriod }) {
  const points = useMemo<ChartPoint<BucketMeta>[]>(() => {
    const series: Record<string, { value: number; plans: BucketMeta["plans"]; totalSales: number }> = {};

    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const periodConfig: Record<ChartPeriod, { unit: "day" | "month"; count: number }> = {
      week: { unit: "day", count: 7 },
      "1m": { unit: "day", count: 30 },
      "1yr": { unit: "month", count: 12 },
      lifetime: { unit: "month", count: 1 },
    };

    const { unit } = periodConfig[period];
    const currentMonthStart = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), 1));

    let lifetimeCount = 1;
    if (period === "lifetime") {
      const earliest = data.reduce<Date | null>((min, tx) => {
        const date = new Date(tx.verified_at);
        if (Number.isNaN(date.getTime())) return min;
        return !min || date < min ? date : min;
      }, null);

      const lifetimeStart = earliest
        ? new Date(Date.UTC(earliest.getUTCFullYear(), earliest.getUTCMonth(), 1))
        : currentMonthStart;

      lifetimeCount =
        (currentMonthStart.getUTCFullYear() - lifetimeStart.getUTCFullYear()) * 12 +
        (currentMonthStart.getUTCMonth() - lifetimeStart.getUTCMonth()) +
        1;
    }

    const count = period === "lifetime" ? Math.max(1, lifetimeCount) : periodConfig[period].count;

    const startDate =
      unit === "day"
        ? new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), todayUtc.getUTCDate() - (count - 1)))
        : new Date(Date.UTC(currentMonthStart.getUTCFullYear(), currentMonthStart.getUTCMonth() - (count - 1), 1));

    const bucketDates: Date[] = [];
    for (let i = 0; i < count; i += 1) {
      const bucketDate = new Date(startDate);
      if (unit === "day") bucketDate.setUTCDate(startDate.getUTCDate() + i);
      else bucketDate.setUTCMonth(startDate.getUTCMonth() + i, 1);
      bucketDates.push(bucketDate);
    }

    const includeYear = new Set(bucketDates.map((date) => date.getUTCFullYear())).size > 1;
    const dayFormatter = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      ...(includeYear ? { year: "numeric" } : {}),
    });
    const monthFormatter = new Intl.DateTimeFormat("en-US", {
      month: "short",
      ...(includeYear ? { year: "numeric" } : {}),
    });

    const buckets = bucketDates.map((bucketDate) => ({
      key: unit === "day" ? bucketDate.toISOString().substring(0, 10) : bucketDate.toISOString().substring(0, 7),
      label: unit === "day" ? dayFormatter.format(bucketDate) : monthFormatter.format(bucketDate),
    }));

    const startKey = buckets[0]?.key;
    const endKey = buckets[buckets.length - 1]?.key;

    data.forEach((tx) => {
      const txDate = new Date(tx.verified_at);
      if (Number.isNaN(txDate.getTime())) return;

      const txKey = unit === "day" ? txDate.toISOString().substring(0, 10) : txDate.toISOString().substring(0, 7);
      if (!startKey || !endKey || txKey < startKey || txKey > endKey) return;

      series[txKey] ??= { value: 0, plans: {}, totalSales: 0 };
      series[txKey].value += tx.amount;
      series[txKey].totalSales += 1;

      const plan = AMOUNT_TO_PLAN[tx.amount];
      if (plan) {
        series[txKey].plans[plan] ??= { count: 0, total: 0 };
        series[txKey].plans[plan]!.count += 1;
        series[txKey].plans[plan]!.total += tx.amount;
      }
    });

    return buckets.map((bucket) => ({
      label: bucket.label,
      value: series[bucket.key]?.value ?? 0,
      meta: {
        plans: series[bucket.key]?.plans ?? {},
        totalSales: series[bucket.key]?.totalSales ?? 0,
      },
    }));
  }, [data, period]);

  return (
    <AreaChart<BucketMeta>
      points={points}
      ariaLabel="Revenue over time"
      minMax={50}
      yFormat={(value) => `$${Math.round(value).toLocaleString("en-US")}`}
      renderTooltip={(point) => {
        if (!point.meta || point.meta.totalSales === 0) return null;
        const { plans, totalSales } = point.meta;
        return (
          <div className="min-w-36 space-y-2">
            <p className="text-[11px] text-adm-mute">{point.label}</p>
            <p className="adm-nums text-lg leading-none font-semibold text-adm-text">
              {formatCurrency(point.value)}
            </p>
            <div className="space-y-1 border-t border-adm-line pt-2">
              {PLAN_IDS.map((plan) => {
                const row = plans[plan];
                if (!row) return null;
                return (
                  <div key={plan} className="flex items-center justify-between gap-4 text-[11px]">
                    <span className="text-adm-mute">{plan}</span>
                    <span className="adm-nums text-adm-dim">{row.count}</span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between gap-4 text-[11px]">
                <span className="text-adm-mute">Total sales</span>
                <span className="adm-nums font-medium text-adm-accent">{totalSales}</span>
              </div>
            </div>
          </div>
        );
      }}
    />
  );
}
