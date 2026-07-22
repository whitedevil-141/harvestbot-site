"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, X } from "lucide-react";

// --- inline status ----------------------------------------------------------

export type Tone = "neutral" | "good" | "warn" | "bad" | "accent";

const BADGE_TONES: Record<Tone, string> = {
  neutral: "bg-white/[0.04] text-adm-dim border-adm-line",
  good: "bg-adm-good-dim text-adm-good border-adm-good/25",
  warn: "bg-adm-warn-dim text-adm-warn border-adm-warn/25",
  bad: "bg-adm-bad-dim text-adm-bad border-adm-bad/25",
  accent: "bg-adm-accent-dim text-adm-accent border-adm-accent/25",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
  title,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${BADGE_TONES[tone]} ${className}`}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

const DOT_TONES: Record<Tone, string> = {
  neutral: "bg-adm-mute",
  good: "bg-adm-good",
  warn: "bg-adm-warn",
  bad: "bg-adm-bad",
  accent: "bg-adm-accent",
};

export function StatusDot({ tone = "neutral", className = "" }: { tone?: Tone; className?: string }) {
  return <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${DOT_TONES[tone]} ${className}`} />;
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return <Loader2 className={`animate-spin text-adm-accent ${className}`} aria-hidden />;
}

// --- blocks -----------------------------------------------------------------

const ALERT_TONES: Record<"bad" | "warn" | "good" | "accent", string> = {
  bad: "border-adm-bad/25 bg-adm-bad-dim text-adm-bad",
  warn: "border-adm-warn/25 bg-adm-warn-dim text-adm-warn",
  good: "border-adm-good/25 bg-adm-good-dim text-adm-good",
  accent: "border-adm-accent/25 bg-adm-accent-dim text-adm-accent",
};

export function Alert({
  children,
  tone = "bad",
  onRetry,
  onDismiss,
}: {
  children: React.ReactNode;
  tone?: keyof typeof ALERT_TONES;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  const Icon = tone === "good" ? CheckCircle2 : tone === "accent" ? Info : AlertTriangle;
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-[13px] ${ALERT_TONES[tone]}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 break-words">{children}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold underline underline-offset-2 outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-current"
        >
          Retry
        </button>
      )}
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-current"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-adm-line bg-adm-surface-2 text-adm-mute">
          {icon}
        </div>
      )}
      <p className="text-[13px] font-medium text-adm-dim">{title}</p>
      {hint && <p className="max-w-sm text-xs text-adm-mute">{hint}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={`adm-shimmer rounded-lg bg-white/[0.04] ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-adm-line bg-adm-surface p-5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-4 h-8 w-32" />
      <Skeleton className="mt-2 h-3 w-20" />
    </div>
  );
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

/**
 * The loading / error / empty ladder every screen would otherwise repeat.
 * `loading` should be passed as "loading and nothing to show yet" so a refresh
 * does not blank out data that is still on screen.
 */
export function AsyncBlock({
  loading,
  error,
  isEmpty,
  emptyTitle = "Nothing here yet.",
  emptyHint,
  onRetry,
  skeleton,
  children,
}: {
  loading: boolean;
  error: string | null;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
  onRetry?: () => void;
  skeleton?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (error) return <Alert onRetry={onRetry}>{error}</Alert>;
  if (loading) {
    return (
      skeleton ?? (
        <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-adm-mute">
          <Spinner /> Loading…
        </div>
      )
    );
  }
  if (isEmpty) return <EmptyState title={emptyTitle} hint={emptyHint} />;
  return <>{children}</>;
}

// --- toasts -----------------------------------------------------------------

type Toast = { id: number; tone: "good" | "bad" | "accent"; message: string };

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((tone: Toast["tone"], message: string) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, tone, message }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 5000);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push("good", message),
      error: (message) => push("bad", message),
      info: (message) => push("accent", message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-5 z-100 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="adm-enter pointer-events-auto">
            <div className="rounded-xl border border-adm-line bg-adm-surface-2 shadow-2xl shadow-black/50">
              <Alert
                tone={toast.tone}
                onDismiss={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
              >
                {toast.message}
              </Alert>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside <ToastProvider>");
  return value;
}
