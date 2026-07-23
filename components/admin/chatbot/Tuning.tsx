"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Lock, Plus, RotateCcw, Save, X } from "lucide-react";
import {
  config as configApi,
  fieldErrorsFrom,
  findModelFields,
  type AdminConfigBundle,
  type Json,
} from "@/lib/chatbot-admin";
import {
  Alert,
  AsyncBlock,
  Badge,
  Button,
  Input,
  KeyValueList,
  PageHeader,
  Panel,
  Slider,
  Textarea,
  Toggle,
  humanize,
} from "../ui";
import { useConfigBundle } from "./ConfigContext";
import { ModelPicker, isChoiceReady, type ModelChoice } from "./ModelPicker";

/** Sections that render in the right-hand column; everything else goes left. */
const RIGHT_COLUMN = new Set(["Prompts", "Advanced"]);

const isPromptField = (key: string) => key.includes("prompt");

/**
 * Fields that have a better home than a raw editor on this page. Editing them
 * here is still possible through the API; hiding them keeps Tuning to the
 * settings you actually turn day to day.
 */
const MANAGED_ELSEWHERE: { match: RegExp; where: string; href: string }[] = [
  { match: /catalog|preset/i, where: "Models", href: "/admin/chatbot/models" },
  { match: /tool/i, where: "Functions", href: "/admin/chatbot/functions" },
];

const managedElsewhere = (key: string) => MANAGED_ELSEWHERE.find((entry) => entry.match.test(key)) ?? null;

/**
 * Bounded numbers get a slider instead of a bare number box. The max widens if
 * the saved value is already above it, so an out-of-range config still shows a
 * usable track rather than a knob pinned to the end.
 */
const RANGES: { match: RegExp; min: number; max: number; step: number; suffix?: string }[] = [
  { match: /temperature/i, min: 0, max: 2, step: 0.05 },
  { match: /top_p/i, min: 0, max: 1, step: 0.05 },
  { match: /penalty/i, min: -2, max: 2, step: 0.1 },
  { match: /min_score/i, min: 0, max: 1, step: 0.01 },
  { match: /top_k/i, min: 1, max: 20, step: 1 },
  { match: /max_tokens/i, min: 128, max: 8192, step: 128 },
  { match: /iterations/i, min: 1, max: 12, step: 1 },
  { match: /max_.*chars/i, min: 200, max: 8000, step: 100, suffix: "ch" },
];

const rangeFor = (key: string, value: number) => {
  const range = RANGES.find((entry) => entry.match.test(key));
  return range ? { ...range, max: Math.max(range.max, value) } : null;
};

/**
 * Field names come from the server, so sections are matched by pattern rather
 * than enumerated. Order is the render order; "Advanced" is the catch-all that
 * guarantees an unrecognised field is still shown rather than silently dropped.
 */
const SECTIONS: { title: string; hint: string; match: RegExp }[] = [
  { title: "Model", hint: "Which endpoint answers a turn.", match: /model|base_?url|api_base|provider/i },
  {
    title: "Generation",
    hint: "How the model writes its reply.",
    match: /temperature|top_p|max_tokens|penalty|stop|seed/i,
  },
  {
    title: "Retrieval",
    hint: "How the knowledge base is searched.",
    match: /kb|knowledge|top_k|min_score|embed|rag|chunk|rerank/i,
  },
  { title: "Tools", hint: "What the bot is allowed to call.", match: /tool/i },
  { title: "Prompts", hint: "The instructions prepended to every turn.", match: /prompt|persona|system/i },
];

const sectionFor = (key: string) => SECTIONS.find((section) => section.match.test(key))?.title ?? "Advanced";

export function Tuning() {
  const { bundle, loading, error, reload } = useConfigBundle();
  const [draft, setDraft] = useState<Json>({});
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [savedVersion, setSavedVersion] = useState<number | null>(null);
  // Fields whose JSON currently does not parse. Save is blocked while any is
  // present, so an unparsed string can never reach the API as a value.
  const [invalidJson, setInvalidJson] = useState<Record<string, true>>({});

  useEffect(() => {
    if (bundle) setDraft({ ...bundle.config });
  }, [bundle]);

  const editableFields = useMemo(() => bundle?.editable_fields ?? [], [bundle]);

  // The primary and fallback endpoints are the same pair of field shapes, so
  // they are located the same way over two disjoint halves of the field list.
  const { modelField, baseUrlField } = useMemo(
    () => findModelFields(editableFields.filter((field) => !/fallback/i.test(field))),
    [editableFields],
  );
  const { modelField: fallbackModelField, baseUrlField: fallbackBaseUrlField } = useMemo(
    () => findModelFields(editableFields.filter((field) => /fallback/i.test(field))),
    [editableFields],
  );

  /** Endpoint fields are folded into their picker, so they never render alone. */
  const foldedFields = useMemo(() => {
    const folded = new Set<string>();
    if (modelField && baseUrlField) folded.add(baseUrlField);
    if (fallbackModelField && fallbackBaseUrlField) folded.add(fallbackBaseUrlField);
    return folded;
  }, [modelField, baseUrlField, fallbackModelField, fallbackBaseUrlField]);

  const columns = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const key of editableFields) {
      if (foldedFields.has(key) || managedElsewhere(key)) continue;
      const title = sectionFor(key);
      map.set(title, [...(map.get(title) ?? []), key]);
    }
    const order = [...SECTIONS.map((section) => section.title), "Advanced"];
    const sections = order
      .filter((title) => (map.get(title)?.length ?? 0) > 0)
      .map((title) => ({
        title,
        hint: SECTIONS.find((section) => section.title === title)?.hint ?? "Everything else this config exposes.",
        keys: map.get(title) ?? [],
      }));

    const right = sections.filter((section) => RIGHT_COLUMN.has(section.title));
    // With nothing to put on the right, the left column takes everything rather
    // than leaving an empty panel beside it.
    return right.length > 0
      ? { left: sections.filter((section) => !RIGHT_COLUMN.has(section.title)), right }
      : { left: sections, right: [] };
  }, [editableFields, foldedFields]);

  const patch = useMemo<Json>(() => {
    if (!bundle) return {};
    const result: Json = {};
    for (const key of editableFields) {
      if (JSON.stringify(draft[key]) !== JSON.stringify(bundle.config[key])) result[key] = draft[key];
    }
    return result;
  }, [draft, bundle, editableFields]);

  const changed = Object.keys(patch).length;
  const isDirty = changed > 0;
  const hasInvalidJson = Object.keys(invalidJson).length > 0;

  const markJson = (key: string, valid: boolean) =>
    setInvalidJson((prev) => {
      if (valid) {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return prev[key] ? prev : { ...prev, [key]: true };
    });

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    setFieldErrors({});
    try {
      const result = await configApi.put(patch, note.trim() || undefined);
      setSavedVersion(result.version);
      setNote("");
      reload();
    } catch (err) {
      const { fields, banner } = fieldErrorsFrom(err);
      setFieldErrors(fields);
      setSaveError(banner);
    } finally {
      setSaving(false);
    }
  };

  /** Both columns render sections the same way; only the grouping differs. */
  const renderSection = (section: { title: string; hint: string; keys: string[] }) =>
    bundle && (
      <Section
        key={section.title}
        title={section.title}
        hint={section.hint}
        changedCount={section.keys.filter((key) => key in patch).length}
        defaultOpen={section.title !== "Advanced"}
      >
        {section.keys.map((key) =>
          key === modelField || key === fallbackModelField ? (
            <ModelField
              key={key}
              bundle={bundle}
              modelField={key}
              baseUrlField={key === modelField ? baseUrlField : fallbackBaseUrlField}
              draft={draft}
              error={fieldErrors[key]}
              onChange={(next) => setDraft((prev) => ({ ...prev, ...next }))}
            />
          ) : (
            <ConfigField
              key={key}
              name={key}
              value={draft[key]}
              defaultValue={bundle.defaults[key]}
              error={fieldErrors[key]}
              onChange={(value) => setDraft((prev) => ({ ...prev, [key]: value }))}
              onJsonValidity={(valid) => markJson(key, valid)}
            />
          ),
        )}
      </Section>
    );

  return (
    <>
      <PageHeader
        title="Tuning"
        description="Runtime configuration for the bot. Changes are versioned; test them on the Playground page before saving."
        meta={
          <>
            {bundle && <Badge tone="accent">v{bundle.version}</Badge>}
            {isDirty && <Badge tone="warn">unsaved</Badge>}
            {savedVersion !== null && !isDirty && <Badge tone="good">saved as v{savedVersion}</Badge>}
          </>
        }
      />

      <AsyncBlock loading={loading && !bundle} error={error} onRetry={reload}>
        {bundle && (
          <>
            {saveError && <Alert onDismiss={() => setSaveError(null)}>{saveError}</Alert>}

            <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-2">
              <Panel
                title="Editable settings"
                description={`${editableFields.length} fields`}
                actions={
                  <Button size="sm" disabled={!isDirty} onClick={() => setDraft({ ...bundle.config })}>
                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                  </Button>
                }
              >
                <div className="space-y-2.5">
                  {columns.left.map(renderSection)}
                  <p className="px-1 pt-1 text-xs text-adm-mute">
                    The model catalog lives on{" "}
                    <Link href="/admin/chatbot/models" className="text-adm-accent hover:underline">
                      Models
                    </Link>
                    , the callable tools on{" "}
                    <Link href="/admin/chatbot/functions" className="text-adm-accent hover:underline">
                      Functions
                    </Link>
                    .
                  </p>
                </div>
              </Panel>

              <div className="space-y-2.5">
                {columns.right.map(renderSection)}
                <LockedPanel locked={bundle.locked} />
              </div>
            </div>

            {/* One save bar for both columns. The scroll container in AdminShell
                is the sticky ancestor, so no extra wrapper is needed. */}
            <div className="sticky bottom-0 z-10 space-y-2 rounded-2xl border border-adm-line bg-adm-surface/95 px-4 py-3 backdrop-blur">
              {hasInvalidJson && (
                <Alert tone="warn">
                  {Object.keys(invalidJson).map(humanize).join(", ")} contain
                  {Object.keys(invalidJson).length === 1 ? "s" : ""} invalid JSON. Fix it before saving.
                </Alert>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <Input
                    value={note}
                    placeholder="Change note (optional)"
                    onChange={(event) => setNote(event.target.value)}
                  />
                </div>
                <Button
                  variant="primary"
                  loading={saving}
                  disabled={!isDirty || hasInvalidJson}
                  onClick={() => void save()}
                >
                  <Save className="h-3.5 w-3.5" />
                  Save {changed || ""} change{changed === 1 ? "" : "s"}
                </Button>
              </div>
            </div>
          </>
        )}
      </AsyncBlock>
    </>
  );
}

/** A collapsible group of related fields inside the settings panel. */
function Section({
  title,
  hint,
  changedCount,
  defaultOpen,
  children,
}: {
  title: string;
  hint: string;
  changedCount: number;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-xl border border-adm-line bg-adm-bg/40">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors duration-150 hover:bg-white/[0.03]"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-adm-mute transition-transform duration-200 ${
            open ? "" : "-rotate-90"
          }`}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium text-adm-text">{title}</span>
          <span className="block truncate text-xs text-adm-mute">{hint}</span>
        </span>
        {changedCount > 0 && <Badge tone="warn">{changedCount} changed</Badge>}
      </button>
      {open && <div className="space-y-3 border-t border-adm-line px-3.5 py-3">{children}</div>}
    </div>
  );
}

/**
 * The model and endpoint keys are two config fields but one decision, so they
 * are edited together and written back as a single draft update.
 */
function ModelField({
  bundle,
  modelField,
  baseUrlField,
  draft,
  error,
  onChange,
}: {
  bundle: AdminConfigBundle;
  modelField: string;
  baseUrlField: string | null;
  draft: Json;
  error?: string;
  onChange: (patch: Json) => void;
}) {
  const model = typeof draft[modelField] === "string" ? (draft[modelField] as string) : "";
  const baseUrl = baseUrlField && typeof draft[baseUrlField] === "string" ? (draft[baseUrlField] as string) : "";
  const value: ModelChoice | null = model || baseUrl ? { model, base_url: baseUrl } : null;

  return (
    <div>
      <ModelPicker
        bundle={bundle}
        value={value}
        onChange={(next) =>
          onChange({
            [modelField]: next?.model ?? "",
            ...(baseUrlField ? { [baseUrlField]: next?.base_url ?? "" } : {}),
          })
        }
        label={humanize(modelField)}
        error={error}
        hint={
          baseUrlField
            ? `Sets ${humanize(modelField).toLowerCase()} and ${humanize(baseUrlField).toLowerCase()} together.`
            : undefined
        }
      />
      {value && !isChoiceReady(value) && (
        <p className="mt-1 text-xs text-adm-warn">
          Pick a supported provider and enter a model id.
        </p>
      )}
    </div>
  );
}

/**
 * Holds its own text so an in-progress edit is never parsed away mid-keystroke.
 * `onChange` fires only on valid JSON; while it does not parse the draft keeps
 * its last good value and `onValidity(false)` blocks the save.
 */
function JsonField({
  label,
  value,
  error,
  onChange,
  onValidity,
}: {
  label: string;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
  onValidity: (valid: boolean) => void;
}) {
  const [text, setText] = useState(() => JSON.stringify(value ?? null, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);

  // Re-sync when the value changes from the outside (Reset, or a reload after
  // save) -- but not while this field is the one being edited.
  useEffect(() => {
    if (parseError) return;
    const serialized = JSON.stringify(value ?? null, null, 2);
    setText((prev) => {
      try {
        return JSON.stringify(JSON.parse(prev)) === JSON.stringify(value ?? null) ? prev : serialized;
      } catch {
        return serialized;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => () => onValidity(true), []); // eslint-disable-line react-hooks/exhaustive-deps

  const handle = (next: string) => {
    setText(next);
    try {
      const parsed = JSON.parse(next);
      setParseError(null);
      onValidity(true);
      onChange(parsed);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Invalid JSON.");
      onValidity(false);
    }
  };

  return (
    <Textarea
      label={`${label} (JSON)`}
      rows={4}
      value={text}
      error={parseError ?? error}
      hint={parseError ? undefined : "Saved only when this parses as JSON."}
      onChange={(event) => handle(event.target.value)}
    />
  );
}

/** A list of plain strings edits better as tags than as a JSON blob. */
function StringListField({
  label,
  value,
  error,
  onChange,
  onJsonValidity,
}: {
  label: string;
  value: string[];
  error?: string;
  onChange: (value: unknown) => void;
  onJsonValidity: (valid: boolean) => void;
}) {
  const [entry, setEntry] = useState("");
  const [raw, setRaw] = useState(false);

  if (raw) {
    return (
      <div>
        <JsonField label={label} value={value} error={error} onChange={onChange} onValidity={onJsonValidity} />
        <button
          type="button"
          onClick={() => setRaw(false)}
          className="mt-1 text-xs text-adm-accent hover:underline"
        >
          Back to list
        </button>
      </div>
    );
  }

  const add = () => {
    const next = entry.trim();
    if (!next || value.includes(next)) return;
    onChange([...value, next]);
    setEntry("");
  };

  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-adm-dim">{label}</span>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((item) => (
            <span
              key={item}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-adm-line bg-adm-bg px-2.5 py-1 text-xs text-adm-dim"
            >
              <span className="truncate">{item}</span>
              <button
                type="button"
                aria-label={`Remove ${item}`}
                onClick={() => onChange(value.filter((candidate) => candidate !== item))}
                className="shrink-0 text-adm-mute transition-colors hover:text-adm-bad"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={entry}
          placeholder="Add an item…"
          onChange={(event) => setEntry(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          className="h-9 w-full rounded-xl border border-adm-line bg-adm-bg/80 px-3 text-[13px] text-adm-text placeholder:text-adm-mute outline-none transition-all duration-200 hover:border-adm-line-strong focus:border-adm-line-focus"
        />
        <Button size="sm" className="h-9" disabled={!entry.trim()} onClick={add}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
      {error && <span className="mt-1 block text-xs text-adm-bad">{error}</span>}
      <button type="button" onClick={() => setRaw(true)} className="mt-1 text-xs text-adm-mute hover:text-adm-accent">
        Edit as JSON
      </button>
    </div>
  );
}

function ConfigField({
  name,
  value,
  defaultValue,
  error,
  onChange,
  onJsonValidity,
}: {
  name: string;
  value: unknown;
  defaultValue: unknown;
  error?: string;
  onChange: (value: unknown) => void;
  onJsonValidity: (valid: boolean) => void;
}) {
  const label = humanize(name);
  const reference = value ?? defaultValue;

  if (typeof reference === "boolean") {
    return <Toggle label={label} checked={Boolean(value)} onChange={onChange} />;
  }

  if (typeof reference === "number") {
    const current = typeof value === "number" ? value : null;
    const range = rangeFor(name, current ?? reference);
    const hint = defaultValue !== undefined ? `Default: ${String(defaultValue)}` : undefined;

    if (range) {
      return (
        <Slider
          label={label}
          value={current}
          min={range.min}
          max={range.max}
          step={range.step}
          suffix={range.suffix}
          hint={hint}
          error={error}
          onChange={onChange}
        />
      );
    }

    const isFloat = !Number.isInteger(reference) || name.includes("score") || name.includes("temperature");
    return (
      <Input
        label={label}
        type="number"
        step={isFloat ? "0.01" : "1"}
        value={current === null ? "" : String(current)}
        error={error}
        hint={hint}
        onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
      />
    );
  }

  if (isPromptField(name) || (typeof reference === "string" && reference.length > 120)) {
    return (
      <Textarea
        label={label}
        rows={6}
        value={typeof value === "string" ? value : ""}
        error={error}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  const current = value ?? reference;

  if (Array.isArray(current) && current.every((item) => typeof item === "string")) {
    return (
      <StringListField
        label={label}
        value={current as string[]}
        error={error}
        onChange={onChange}
        onJsonValidity={onJsonValidity}
      />
    );
  }

  if (Array.isArray(reference) || (reference !== null && typeof reference === "object")) {
    return (
      <JsonField label={label} value={current} error={error} onChange={onChange} onValidity={onJsonValidity} />
    );
  }

  return (
    <Input
      label={label}
      value={typeof value === "string" ? value : value === null || value === undefined ? "" : String(value)}
      error={error}
      hint={typeof defaultValue === "string" && defaultValue.length < 60 ? `Default: ${defaultValue}` : undefined}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function LockedPanel({ locked }: { locked: Json }) {
  const entries = Object.entries(locked ?? {});
  if (entries.length === 0) return null;
  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-adm-mute" /> Locked
        </span>
      }
      description="Display only — set by the environment, never patchable from here."
    >
      <KeyValueList
        items={entries.map(([key, value]): [string, React.ReactNode] => [
          humanize(key),
          typeof value === "boolean" ? (
            <Badge key={key} tone={value ? "good" : "neutral"}>
              {value ? "yes" : "no"}
            </Badge>
          ) : (
            String(value ?? "—")
          ),
        ])}
      />
    </Panel>
  );
}
