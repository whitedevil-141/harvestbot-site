"use client";

import React from "react";

/**
 * Surfaces that make up every admin screen. Elevation is expressed through
 * layered backgrounds and hairline borders rather than heavy shadows.
 */

export function PageHeader({
  title,
  description,
  actions,
  meta,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight text-adm-text">{title}</h1>
          {meta}
        </div>
        {description && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-adm-dim">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className = "",
  padded = true,
  footer,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  padded?: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-adm-line bg-adm-surface ${className}`}>
      {(title || actions) && (
        <header className="flex flex-col gap-3 border-b border-adm-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {title && <h2 className="truncate text-sm font-semibold text-adm-text">{title}</h2>}
            {description && <p className="mt-0.5 text-xs leading-relaxed text-adm-mute">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
        </header>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
      {footer && <div className="border-t border-adm-line px-5 py-3.5">{footer}</div>}
    </section>
  );
}

export function StatTile({
  label,
  value,
  hint,
  delta,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  delta?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-adm-line bg-adm-surface p-4 transition-all duration-200 hover:border-adm-line-strong">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-adm-accent/30 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      {icon && (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-adm-accent-dim text-adm-accent">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-medium text-adm-dim">{label}</p>
          {delta}
        </div>
        <p className="adm-nums mt-0.5 truncate text-2xl font-semibold tracking-tight text-adm-text">{value}</p>
        {hint && <p className="mt-0.5 truncate text-[11px] text-adm-mute">{hint}</p>}
      </div>
    </div>
  );
}

export function StatGrid({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 ${className}`}>{children}</div>;
}

export function KeyValueList({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
      {items.map(([key, value]) => (
        <div
          key={key}
          className="flex items-baseline justify-between gap-4 border-b border-adm-line py-2.5 last:border-0"
        >
          <dt className="shrink-0 text-xs text-adm-mute">{key}</dt>
          <dd className="adm-nums min-w-0 break-words text-right text-[13px] text-adm-text">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A flush, divided list -- the default body for anything row-shaped. */
export function Rows({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <ul className={`divide-y divide-adm-line ${className}`}>{children}</ul>;
}

export function Row({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <li
      onClick={onClick}
      className={`flex items-start gap-3 px-5 py-3.5 transition-colors duration-150 ${
        onClick ? "cursor-pointer hover:bg-white/[0.03]" : ""
      } ${className}`}
    >
      {children}
    </li>
  );
}

/** Monospace body text for ids, sources and payloads. */
export function Mono({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-mono text-xs text-adm-dim ${className}`}>{children}</span>;
}

/** Named JsonBlock, not Json: `Json` is the config payload type in lib/chatbot-admin. */
export function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="adm-scroll overflow-x-auto rounded-xl border border-adm-line bg-adm-bg p-3 text-[11px] leading-relaxed text-adm-dim">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
