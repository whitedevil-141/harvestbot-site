"use client";

import React, { useId, useMemo, useState } from "react";

/**
 * Hand-rolled SVG charts -- the project carries no charting dependency.
 *
 * Everything is drawn in a fixed viewBox and scaled by the browser, so there is
 * no resize observer and no measurement pass: the chart is correct on first
 * paint at any width.
 */

export type ChartPoint<M = undefined> = { label: string; value: number; meta?: M };

const W = 720;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 52 };

export function AreaChart<M>({
  points,
  yFormat = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 0 }),
  renderTooltip,
  minMax = 10,
  ariaLabel = "Time series",
}: {
  points: ChartPoint<M>[];
  yFormat?: (value: number) => string;
  renderTooltip?: (point: ChartPoint<M>) => React.ReactNode | null;
  minMax?: number;
  ariaLabel?: string;
}) {
  const gradientId = useId();
  const glowId = useId();
  const [hovered, setHovered] = useState<number | null>(null);

  const isSingle = points.length <= 1;
  const data = useMemo<ChartPoint<M>[]>(() => {
    if (!isSingle) return points;
    const middle = points.length ? points : [{ label: "Now", value: 0 } as ChartPoint<M>];
    return [{ label: "", value: 0 } as ChartPoint<M>, ...middle, { label: "", value: 0 } as ChartPoint<M>];
  }, [points, isSingle]);

  const max = Math.max(...data.map((point) => point.value), minMax);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const xAt = (index: number) => PAD.left + index * (innerW / Math.max(1, data.length - 1));
  const yAt = (value: number) => PAD.top + innerH - (value / max) * innerH;

  const line = data.map((point, index) => `${index === 0 ? "M" : "L"} ${xAt(index)} ${yAt(point.value)}`).join(" ");
  const area = `${line} L ${xAt(data.length - 1)} ${PAD.top + innerH} L ${PAD.left} ${PAD.top + innerH} Z`;

  const hoverable = (index: number) => !isSingle || index === 1;
  const active = hovered !== null && hoverable(hovered) ? data[hovered] : null;
  const tooltip = active && renderTooltip ? renderTooltip(active) : null;

  const onMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const x = ((event.clientX - rect.left) / rect.width) * W;
    const step = innerW / Math.max(1, data.length - 1);
    const index = Math.round((x - PAD.left) / (step || 1));
    setHovered(index >= 0 && index < data.length ? index : null);
  };

  const stride = Math.max(1, Math.ceil(data.length / 7));

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={ariaLabel}
        className="h-auto w-full"
        onMouseMove={onMove}
        onMouseLeave={() => setHovered(null)}
      >
        <title>{ariaLabel}</title>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2af6ff" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#2af6ff" stopOpacity={0} />
          </linearGradient>
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {[0, 0.5, 1].map((ratio) => {
          const y = PAD.top + ratio * innerH;
          return (
            <g key={ratio}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="rgba(255,255,255,0.05)" />
              <text
                x={PAD.left - 10}
                y={y + 3}
                fill="#71717a"
                fontSize="10"
                textAnchor="end"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {yFormat(max - ratio * max)}
              </text>
            </g>
          );
        })}

        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke="#2af6ff"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          filter={`url(#${glowId})`}
        />

        {active && hovered !== null && (
          <g>
            <line
              x1={xAt(hovered)}
              y1={PAD.top}
              x2={xAt(hovered)}
              y2={PAD.top + innerH}
              stroke="rgba(42,246,255,0.35)"
              strokeDasharray="4 3"
            />
            <circle cx={xAt(hovered)} cy={yAt(active.value)} r={4} fill="#030303" stroke="#2af6ff" strokeWidth="2.5" />
          </g>
        )}

        {data.map((point, index) => {
          if (!point.label) return null;
          const show = index % stride === 0 || index === data.length - 1;
          if (!show) return null;
          return (
            <text key={index} x={xAt(index)} y={H - 8} fill="#71717a" fontSize="10" textAnchor="middle">
              {point.label}
            </text>
          );
        })}
      </svg>

      {tooltip && hovered !== null && (
        <div
          className="pointer-events-none absolute top-3 z-10 -translate-x-1/2 rounded-xl border border-adm-line bg-adm-surface-2 px-3.5 py-2.5 shadow-2xl shadow-black/60"
          style={{ left: `${Math.min(88, Math.max(12, (xAt(hovered) / W) * 100))}%` }}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}

/** A tiny area chart for stat cards and compact trends. */
export function Sparkline({
  values,
  accent = "#2af6ff",
  className = "",
}: {
  values: number[];
  accent?: string;
  className?: string;
}) {
  const safe = values.length ? values : [0];
  const max = Math.max(...safe, 1);
  const min = Math.min(...safe, 0);
  const range = max - min || 1;
  const width = 120;
  const height = 40;
  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const xAt = (index: number) => pad + (index / (safe.length - 1 || 1)) * innerW;
  const yAt = (value: number) => pad + innerH - ((value - min) / range) * innerH;

  const line = safe.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`).join(" ");
  const area = `${line} L ${xAt(safe.length - 1)} ${height - pad} L ${pad} ${height - pad} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={`h-auto w-full ${className}`} preserveAspectRatio="none">
      <path d={area} fill={accent} fillOpacity={0.12} />
      <path d={line} fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Horizontal bars for the breakdown endpoints (tools, models, channels). */
export function BarList({
  rows,
  format = (value: number) => value.toLocaleString("en-US"),
  emptyLabel = "No data in this window.",
}: {
  rows: { label: string; value: number; sublabel?: string }[];
  format?: (value: number) => string;
  emptyLabel?: string;
}) {
  if (rows.length === 0) return <p className="py-8 text-center text-[13px] text-adm-mute">{emptyLabel}</p>;

  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={`${row.label}-${row.sublabel ?? ""}`}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="truncate text-[13px] text-adm-dim">
              {row.label}
              {row.sublabel && <span className="ml-2 text-xs text-adm-mute">{row.sublabel}</span>}
            </span>
            <span className="adm-nums shrink-0 text-[13px] font-medium text-adm-text">{format(row.value)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-adm-accent to-adm-accent/70"
              style={{ width: `${Math.max(3, (row.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Donut chart for categorical splits such as revenue by plan. */
export function DonutChart({
  rows,
  format = (value: number) => value.toLocaleString("en-US"),
  emptyLabel = "No data.",
}: {
  rows: { label: string; value: number; color?: string }[];
  format?: (value: number) => string;
  emptyLabel?: string;
}) {
  if (rows.length === 0) return <p className="py-8 text-center text-[13px] text-adm-mute">{emptyLabel}</p>;

  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1;
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  const colors = ["#2af6ff", "#2dd4bf", "#60a5fa", "#fbbf24", "#f87171", "#a78bfa"];

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative h-40 w-40">
        <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90">
          {rows.map((row, index) => {
            const fraction = row.value / total;
            const dash = fraction * circumference;
            const offset = -accumulated * circumference;
            accumulated += fraction;
            const color = row.color ?? colors[index % colors.length];
            return (
              <circle
                key={row.label}
                cx="20"
                cy="20"
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth="4"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="adm-nums text-lg font-semibold text-adm-text">{format(total)}</span>
          <span className="text-[10px] uppercase tracking-wider text-adm-mute">Total</span>
        </div>
      </div>
      <ul className="w-full space-y-2 sm:w-auto">
        {rows.map((row, index) => {
          const color = row.color ?? colors[index % colors.length];
          const percent = ((row.value / total) * 100).toFixed(1);
          return (
            <li key={row.label} className="flex items-center gap-2 text-[13px]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="truncate text-adm-dim">{row.label}</span>
              <span className="adm-nums ml-auto font-medium text-adm-text">{format(row.value)}</span>
              <span className="adm-nums w-10 text-right text-xs text-adm-mute">{percent}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
