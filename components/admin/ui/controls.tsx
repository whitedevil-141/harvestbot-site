"use client";

import React, { useEffect, useState } from "react";
import { Check, ChevronDown, Copy, Lock, Search } from "lucide-react";
import { Spinner } from "./feedback";
import { copyText } from "./format";

/** Shared focus treatment for every interactive control. */
export const FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-adm-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-adm-bg";

const TRANSITION = "transition-all duration-200 ease-out";

// --- buttons ----------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-adm-accent text-adm-bg font-semibold hover:bg-adm-accent/90 shadow-[0_0_0_1px_rgba(42,246,255,0.08),0_4px_14px_-4px_rgba(42,246,255,0.25)] active:scale-[0.96]",
  secondary:
    "bg-adm-surface-2 text-adm-text border border-adm-line hover:border-adm-line-strong hover:bg-adm-elevated active:scale-[0.96]",
  ghost: "bg-transparent text-adm-dim border border-transparent hover:bg-white/[0.04] hover:text-adm-text active:scale-[0.96]",
  danger:
    "bg-transparent text-adm-bad border border-adm-bad/30 hover:bg-adm-bad-dim hover:border-adm-bad/50 active:scale-[0.96]",
};

const BUTTON_SIZES = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-[13px] gap-2",
};

export function Button({
  children,
  variant = "secondary",
  size = "md",
  loading = false,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: keyof typeof BUTTON_SIZES;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex shrink-0 items-center justify-center rounded-xl font-medium ${TRANSITION} disabled:cursor-not-allowed disabled:opacity-45 ${BUTTON_SIZES[size]} ${BUTTON_VARIANTS[variant]} ${FOCUS} ${className}`}
    >
      {loading && <Spinner className={`h-3.5 w-3.5 ${variant === "primary" ? "text-adm-bg" : ""}`} />}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  danger = false,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; danger?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      {...props}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-adm-mute ${TRANSITION} disabled:opacity-40 ${
        danger ? "hover:bg-adm-bad-dim hover:text-adm-bad" : "hover:bg-white/[0.04] hover:text-adm-text"
      } ${FOCUS} ${className}`}
    >
      {children}
    </button>
  );
}

// --- fields -----------------------------------------------------------------

const FIELD_BASE = `w-full rounded-xl border bg-adm-bg/80 px-3 text-[13px] text-adm-text placeholder:text-adm-mute ${TRANSITION} disabled:cursor-not-allowed disabled:text-adm-mute ${FOCUS}`;

const borderFor = (error?: string | null) =>
  error ? "border-adm-bad/50 hover:border-adm-bad" : "border-adm-line hover:border-adm-line-strong focus:border-adm-line-focus";

function Field({
  label,
  locked,
  hint,
  error,
  children,
}: {
  label?: React.ReactNode;
  locked?: boolean;
  hint?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-adm-dim">
          {label}
          {locked && <Lock className="h-3 w-3 text-adm-mute" />}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-adm-bad">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-adm-mute">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input({
  label,
  hint,
  error,
  locked,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  locked?: boolean;
}) {
  return (
    <Field label={label} hint={hint} error={error} locked={locked}>
      <input
        {...props}
        disabled={props.disabled || locked}
        className={`h-9 ${FIELD_BASE} ${borderFor(error)} ${className}`}
      />
    </Field>
  );
}

export function Textarea({
  label,
  hint,
  error,
  locked,
  mono = true,
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  locked?: boolean;
  mono?: boolean;
}) {
  return (
    <Field label={label} hint={hint} error={error} locked={locked}>
      <textarea
        {...props}
        disabled={props.disabled || locked}
        className={`py-2.5 leading-relaxed ${mono ? "font-mono text-xs" : ""} ${FIELD_BASE} ${borderFor(error)} ${className}`}
      />
    </Field>
  );
}

export type SelectOption = { value: string; label: string; disabled?: boolean };
/** A group renders as an <optgroup>; a bare option renders at the top level. */
export type SelectGroup = { label: string; options: SelectOption[] };
export type SelectItem = SelectOption | SelectGroup;

const isGroup = (item: SelectItem): item is SelectGroup => "options" in item;

const renderOption = (option: SelectOption) => (
  <option key={option.value} value={option.value} disabled={option.disabled} className="bg-adm-surface-2">
    {option.label}
  </option>
);

export function Select({
  label,
  hint,
  error,
  options,
  className = "",
  ...props
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  options: SelectItem[];
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      <span className="relative block">
        <select
          {...props}
          className={`h-9 appearance-none pr-9 ${FIELD_BASE} ${borderFor(error)} ${className}`}
        >
          {options.map((item) =>
            isGroup(item) ? (
              <optgroup key={item.label} label={item.label} className="bg-adm-surface-2">
                {item.options.map(renderOption)}
              </optgroup>
            ) : (
              renderOption(item)
            ),
          )}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-adm-mute" />
      </span>
    </Field>
  );
}

/**
 * A bounded number: the track carries the range, the box beside it stays
 * authoritative for exact values. Typing is not clamped mid-keystroke (that
 * makes "0.05" impossible to type); the value is clamped on blur instead.
 */
export function Slider({
  label,
  value,
  min,
  max,
  step,
  hint,
  error,
  suffix,
  disabled,
  onChange,
}: {
  label?: React.ReactNode;
  value: number | null;
  min: number;
  max: number;
  step: number;
  hint?: React.ReactNode;
  error?: string | null;
  suffix?: string;
  disabled?: boolean;
  onChange: (value: number | null) => void;
}) {
  const [text, setText] = useState(value === null ? "" : String(value));
  const [seen, setSeen] = useState(value);

  // Follow outside changes (Reset, reload) without fighting an active edit.
  // Adjusted during render rather than in an effect: React re-runs this pass
  // before committing, so the box never paints a stale number.
  if (value !== seen) {
    setSeen(value);
    if (Number(text) !== value) setText(value === null ? "" : String(value));
  }

  const commit = (next: string) => {
    setText(next);
    if (next.trim() === "") return onChange(null);
    const parsed = Number(next);
    if (Number.isFinite(parsed)) onChange(parsed);
  };

  const clampOnBlur = () => {
    if (value === null) return;
    const clamped = Math.min(max, Math.max(min, value));
    if (clamped !== value) {
      onChange(clamped);
      setText(String(clamped));
    }
  };

  const knobValue = Math.min(max, Math.max(min, value ?? min));

  return (
    <Field label={label} hint={hint} error={error}>
      <span className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={knobValue}
          disabled={disabled}
          aria-label={typeof label === "string" ? label : undefined}
          onChange={(event) => commit(event.target.value)}
          className={`h-9 min-w-0 flex-1 cursor-pointer accent-adm-accent disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`}
        />
        <span className="relative shrink-0">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={text}
            disabled={disabled}
            onChange={(event) => commit(event.target.value)}
            onBlur={clampOnBlur}
            className={`adm-nums h-9 w-24 text-right ${suffix ? "pr-7" : ""} ${FIELD_BASE} ${borderFor(error)}`}
          />
          {suffix && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-adm-mute">
              {suffix}
            </span>
          )}
        </span>
      </span>
    </Field>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  hint?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center gap-3 rounded-xl border border-adm-line bg-adm-bg px-3 py-2.5 text-left ${TRANSITION} hover:border-adm-line-strong disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`}
    >
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full ${TRANSITION} ${checked ? "bg-adm-accent" : "bg-white/15"}`}
      >
        <span
          className={`absolute top-1 h-3 w-3 rounded-full bg-adm-bg shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-4" : "translate-x-1"
          }`}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[13px] ${checked ? "text-adm-text" : "text-adm-dim"}`}>{label}</span>
        {hint && <span className="block truncate text-xs text-adm-mute">{hint}</span>}
      </span>
    </button>
  );
}

export function Checkbox({
  checked,
  onChange,
  className = "",
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> & {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      {...props}
      className={`h-4 w-4 shrink-0 cursor-pointer accent-adm-accent ${FOCUS} ${className}`}
    />
  );
}

// --- selection --------------------------------------------------------------

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  labels,
  size = "md",
  className = "",
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  labels?: Partial<Record<T, string>>;
  size?: "sm" | "md";
  className?: string;
}) {
  const itemHeight = size === "sm" ? "h-7 px-2.5 text-[11px]" : "h-8 px-3 text-xs";
  const activeIndex = options.indexOf(value);
  return (
    <div
      role="tablist"
      className={`relative inline-flex shrink-0 items-center gap-0.5 rounded-xl border border-adm-line bg-adm-bg p-1 ${className}`}
    >
      {options.length > 1 && activeIndex >= 0 && (
        <div
          className="pointer-events-none absolute top-1 bottom-1 rounded-lg bg-adm-accent shadow-[0_0_12px_-2px_rgba(42,246,255,0.35)] transition-all duration-200 ease-out"
          style={{
            left: `${(activeIndex / options.length) * 100}%`,
            width: `${100 / options.length}%`,
          }}
        />
      )}
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option)}
            className={`relative z-10 rounded-lg font-medium whitespace-nowrap ${itemHeight} ${TRANSITION} ${
              active ? "text-adm-bg" : "text-adm-dim hover:text-adm-text"
            } ${FOCUS}`}
          >
            {labels?.[option] ?? option}
          </button>
        );
      })}
    </div>
  );
}

/** A filter pill used for KB source filters and error filters. */
export function Chip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${TRANSITION} ${
        active
          ? "border-adm-accent/40 bg-adm-accent-dim text-adm-accent"
          : "border-adm-line bg-adm-bg text-adm-dim hover:border-adm-line-strong hover:text-adm-text"
      } ${FOCUS}`}
    >
      <span className="truncate">{children}</span>
      {typeof count === "number" && <span className="adm-nums text-adm-mute">{count}</span>}
    </button>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className = "",
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onSubmit?: () => void;
}) {
  return (
    <div className={`relative min-w-0 ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-adm-mute" />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && onSubmit) onSubmit();
        }}
        className={`h-9 w-full rounded-full border border-adm-line bg-adm-bg/80 pl-9 pr-3 text-[13px] text-adm-text placeholder:text-adm-mute ${TRANSITION} hover:border-adm-line-strong focus:border-adm-line-focus ${FOCUS}`}
      />
    </div>
  );
}

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(id);
  }, [copied]);

  return (
    <IconButton
      label={copied ? "Copied" : label}
      onClick={() => void copyText(value).then(setCopied)}
      className={copied ? "text-adm-accent" : ""}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </IconButton>
  );
}
