"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, CreditCard, Package, RefreshCw, TrendingUp, Wallet } from "lucide-react";
import {
  Alert,
  Button,
  DonutChart,
  PageHeader,
  Panel,
  SegmentedControl,
  StatGrid,
  StatTile,
  formatCurrency,
} from "../ui";
import { PLAN_IDS, type ChartPeriod, type PlanId, usePayments } from "./PaymentsProvider";
import { PaymentsChart } from "./PaymentsChart";
import { TransactionsTable } from "./TransactionsTable";

const PERIODS: ChartPeriod[] = ["week", "1m", "1yr", "lifetime"];

const RECENT_COUNT = 8;

const PLAN_COLORS: Record<PlanId, string> = {
  Weekly: "#2af6ff",
  "Bi-Weekly": "#60a5fa",
  Monthly: "#2dd4bf",
  Lifetime: "#fbbf24",
};

export function PaymentsOverview() {
  const {
    loading,
    error,
    fetchPayments,
    chartPeriod,
    setChartPeriod,
    filteredData,
    metrics,
    planTotals,
    planCounts,
  } = usePayments();

  const planBreakdown = useMemo(
    () =>
      PLAN_IDS.map((plan) => ({
        label: plan,
        value: planTotals[plan],
        color: PLAN_COLORS[plan],
      })),
    [planTotals],
  );

  return (
    <>
      <PageHeader
        title="Payments"
        description="Verified crypto payments, converted to their fiat equivalent at verification time."
        actions={
          <Button size="sm" onClick={() => void fetchPayments()} loading={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        }
      />

      {error && <Alert onRetry={fetchPayments}>{error}</Alert>}

      <StatGrid>
        <StatTile
          label="Total revenue"
          value={formatCurrency(metrics.totalRev)}
          icon={<Wallet className="h-5 w-5" />}
          hint="Verified, all time"
        />
        <StatTile
          label="This month"
          value={formatCurrency(metrics.monthlyRev)}
          icon={<TrendingUp className="h-5 w-5" />}
          delta={
            <span
              className={`adm-nums inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] font-medium ${
                metrics.growth < 0
                  ? "border-adm-bad/25 bg-adm-bad-dim text-adm-bad"
                  : "border-adm-good/25 bg-adm-good-dim text-adm-good"
              }`}
            >
              <ArrowUpRight className={`h-3 w-3 ${metrics.growth < 0 ? "rotate-90" : ""}`} />
              {metrics.growth}%
            </span>
          }
          hint="vs. the previous calendar month"
        />
        <StatTile
          label="Transactions"
          value={metrics.totalSales}
          icon={<CreditCard className="h-5 w-5" />}
          hint="Verified, all time"
        />
        <StatTile
          label="Top plan"
          value={metrics.mostSoldProduct}
          icon={<Package className="h-5 w-5" />}
          hint={`${planCounts[metrics.mostSoldProduct as PlanId] ?? 0} sales`}
        />
      </StatGrid>

      <Panel
        title="Revenue"
        description="Bucketed in UTC, so a payment does not move between buckets with your timezone."
        actions={
          <SegmentedControl options={PERIODS} value={chartPeriod} onChange={setChartPeriod} size="sm" />
        }
      >
        <div key={chartPeriod} className="adm-enter">
          <PaymentsChart data={filteredData} period={chartPeriod} />
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Plan breakdown" description="Lifetime revenue by price point.">
          <DonutChart rows={planBreakdown} format={(value) => formatCurrency(value)} />
        </Panel>

        <Panel
          className="lg:col-span-2"
          title="Recent transactions"
          description={`The ${RECENT_COUNT} most recent rows matching your filters.`}
          padded={false}
          actions={
            <Link
              href="/admin/payments/transactions"
              className="rounded-lg text-[13px] font-medium text-adm-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-adm-accent/40"
            >
              View all
            </Link>
          }
        >
          <TransactionsTable rows={filteredData.slice(0, RECENT_COUNT)} emptyHint="No payments have been verified yet." />
        </Panel>
      </div>
    </>
  );
}
