"use client";

import React, { useEffect, useMemo, useState } from "react";
import { History, Lock, Play, RotateCcw, Save, Send } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useAdminResource } from "@/hooks/useAdminResource";
import { config as configApi, playground, type Json, type PlaygroundResponse } from "@/lib/chatbot-admin";
import {
  Alert,
  AsyncBlock,
  Badge,
  Button,
  Input,
  KeyValueList,
  PageHeader,
  Panel,
  Row,
  Rows,
  Spinner,
  Textarea,
  Toggle,
  formatNumber,
  formatTimestamp,
  humanize,
} from "../ui";
import { useConfigBundle } from "./ConfigContext";

const PLAYGROUND_SESSION = "playground";

const isToolField = (key: string) => key.includes("tool");
const isPromptField = (key: string) => key.includes("prompt");

function fieldErrorsFrom(error: unknown): { fields: Record<string, string>; banner: string | null } {
  if (!(error instanceof ApiError)) {
    return { fields: {}, banner: error instanceof Error ? error.message : "Save failed." };
  }
  const detail = (error.body as { detail?: unknown } | null)?.detail;
  if (Array.isArray(detail)) {
    const fields: Record<string, string> = {};
    for (const entry of detail) {
      const item = entry as { loc?: unknown[]; msg?: string };
      const key = Array.isArray(item.loc) ? String(item.loc[item.loc.length - 1]) : "";
      if (key && item.msg) fields[key] = item.msg;
    }
    return { fields, banner: Object.keys(fields).length ? null : error.message };
  }
  return { fields: {}, banner: error.message };
}

export function Tuning() {
  const { bundle, loading, error, reload } = useConfigBundle();
  const [draft, setDraft] = useState<Json>({});
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [savedVersion, setSavedVersion] = useState<number | null>(null);

  useEffect(() => {
    if (bundle) setDraft({ ...bundle.config });
  }, [bundle]);

  const editableFields = useMemo(() => bundle?.editable_fields ?? [], [bundle]);

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

  return (
    <>
      <PageHeader
        title="Tuning"
        description="Runtime configuration. Test a draft in the playground before saving it — the playground runs your unsaved changes without persisting them."
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
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
            <div className="space-y-4">
              <Panel
                title="Editable settings"
                description={`${editableFields.length} fields`}
                actions={
                  <Button size="sm" disabled={!isDirty} onClick={() => setDraft({ ...bundle.config })}>
                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                  </Button>
                }
              >
                <div className="space-y-4">
                  {saveError && <Alert onDismiss={() => setSaveError(null)}>{saveError}</Alert>}

                  {editableFields.map((key) => (
                    <ConfigField
                      key={key}
                      name={key}
                      value={draft[key]}
                      defaultValue={bundle.defaults[key]}
                      availableTools={bundle.available_tools}
                      error={fieldErrors[key]}
                      onChange={(value) => setDraft((prev) => ({ ...prev, [key]: value }))}
                    />
                  ))}

                  <div className="space-y-3 border-t border-adm-line pt-4">
                    <Input
                      label="Change note (optional)"
                      value={note}
                      placeholder="Why this change?"
                      onChange={(event) => setNote(event.target.value)}
                    />
                    <Button variant="primary" loading={saving} disabled={!isDirty} onClick={() => void save()}>
                      <Save className="h-3.5 w-3.5" />
                      Save {changed || ""} change{changed === 1 ? "" : "s"}
                    </Button>
                  </div>
                </div>
              </Panel>

              <LockedPanel locked={bundle.locked} />
              <HistoryPanel activeVersion={bundle.version} onReverted={reload} />
            </div>

            <PlaygroundPanel patch={patch} isDirty={isDirty} />
          </div>
        )}
      </AsyncBlock>
    </>
  );
}

function ConfigField({
  name,
  value,
  defaultValue,
  availableTools,
  error,
  onChange,
}: {
  name: string;
  value: unknown;
  defaultValue: unknown;
  availableTools: string[];
  error?: string;
  onChange: (value: unknown) => void;
}) {
  const label = humanize(name);
  const reference = value ?? defaultValue;

  if (isToolField(name) && Array.isArray(reference)) {
    const enabled = new Set((Array.isArray(value) ? value : []) as string[]);
    return (
      <div>
        <span className="mb-1.5 block text-xs font-medium text-adm-dim">{label}</span>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {availableTools.map((tool) => (
            <Toggle
              key={tool}
              label={tool}
              checked={enabled.has(tool)}
              onChange={(checked) => {
                const next = new Set(enabled);
                if (checked) next.add(tool);
                else next.delete(tool);
                onChange(availableTools.filter((item) => next.has(item)));
              }}
            />
          ))}
        </div>
        {error && <span className="mt-1 block text-xs text-adm-bad">{error}</span>}
      </div>
    );
  }

  if (typeof reference === "boolean") {
    return <Toggle label={label} checked={Boolean(value)} onChange={onChange} />;
  }

  if (typeof reference === "number") {
    const isFloat = !Number.isInteger(reference) || name.includes("score") || name.includes("temperature");
    return (
      <Input
        label={label}
        type="number"
        step={isFloat ? "0.01" : "1"}
        value={value === null || value === undefined ? "" : String(value)}
        error={error}
        hint={defaultValue !== undefined ? `Default: ${String(defaultValue)}` : undefined}
        onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
      />
    );
  }

  if (isPromptField(name) || (typeof reference === "string" && reference.length > 120)) {
    return (
      <Textarea
        label={label}
        rows={10}
        value={typeof value === "string" ? value : ""}
        error={error}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (Array.isArray(reference) || (reference !== null && typeof reference === "object")) {
    return (
      <Textarea
        label={`${label} (JSON)`}
        rows={5}
        value={typeof value === "string" ? value : JSON.stringify(value ?? reference, null, 2)}
        error={error}
        hint="Invalid JSON is held as text until it parses."
        onChange={(event) => {
          try {
            onChange(JSON.parse(event.target.value));
          } catch {
            onChange(event.target.value);
          }
        }}
      />
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

function HistoryPanel({ activeVersion, onReverted }: { activeVersion: number; onReverted: () => void }) {
  const history = useAdminResource(() => configApi.history(50), [activeVersion]);
  const [reverting, setReverting] = useState<number | null>(null);
  const [revertError, setRevertError] = useState<string | null>(null);

  const revert = async (version: number) => {
    setReverting(version);
    setRevertError(null);
    try {
      await configApi.revert(version, `Reverted to v${version}`);
      onReverted();
      history.refresh();
    } catch (err) {
      setRevertError(err instanceof Error ? err.message : "Revert failed.");
    } finally {
      setReverting(null);
    }
  };

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <History className="h-3.5 w-3.5 text-adm-mute" /> Version history
        </span>
      }
      padded={false}
    >
      {revertError && (
        <div className="p-5 pb-0">
          <Alert onDismiss={() => setRevertError(null)}>{revertError}</Alert>
        </div>
      )}
      <AsyncBlock
        loading={history.loading && !history.data}
        error={history.error}
        onRetry={history.refresh}
        isEmpty={(history.data ?? []).length === 0}
        emptyTitle="No saved versions yet."
      >
        <Rows>
          {(history.data ?? []).map((row) => (
            <Row key={row.version}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="adm-nums text-[13px] font-medium text-adm-text">v{row.version}</span>
                  {row.is_active && <Badge tone="good">active</Badge>}
                </div>
                <p className="mt-0.5 truncate text-xs text-adm-dim">{row.note || "No note"}</p>
                <p className="adm-nums text-xs text-adm-mute">{formatTimestamp(row.created_at)}</p>
              </div>
              <Button
                size="sm"
                disabled={row.is_active}
                loading={reverting === row.version}
                onClick={() => void revert(row.version)}
              >
                Revert
              </Button>
            </Row>
          ))}
        </Rows>
      </AsyncBlock>
    </Panel>
  );
}

function PlaygroundPanel({ patch, isDirty }: { patch: Json; isDirty: boolean }) {
  const [message, setMessage] = useState("");
  const [useDraft, setUseDraft] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PlaygroundResponse | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const send = async (resetFirst = false) => {
    if (!message.trim()) return;
    setRunning(true);
    setRunError(null);
    try {
      const response = await playground.chat({
        message: message.trim(),
        session_id: PLAYGROUND_SESSION,
        config_patch: useDraft && isDirty ? patch : undefined,
        reset_first: resetFirst,
      });
      setResult(response);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Playground request failed.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <Play className="h-3.5 w-3.5 text-adm-accent" /> Playground
        </span>
      }
      description={
        isDirty
          ? useDraft
            ? "Running against your unsaved draft."
            : "Running against the saved config."
          : "No unsaved changes — running the saved config."
      }
      actions={
        <Button size="sm" onClick={() => void playground.reset(PLAYGROUND_SESSION)}>
          <RotateCcw className="h-3.5 w-3.5" /> Reset session
        </Button>
      }
    >
      <div className="space-y-3">
        <Toggle
          label="Use unsaved draft"
          hint="Sends the pending patch as config_patch"
          checked={useDraft}
          disabled={!isDirty}
          onChange={setUseDraft}
        />

        <Textarea
          rows={4}
          mono={false}
          value={message}
          placeholder="Ask the bot something…"
          onChange={(event) => setMessage(event.target.value)}
        />

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" loading={running} disabled={!message.trim()} onClick={() => void send(false)}>
            <Send className="h-3.5 w-3.5" /> Send
          </Button>
          <Button loading={running} disabled={!message.trim()} onClick={() => void send(true)}>
            Send fresh
          </Button>
        </div>

        {runError && <Alert onDismiss={() => setRunError(null)}>{runError}</Alert>}

        {running && (
          <p className="flex items-center gap-2 text-[13px] text-adm-mute">
            <Spinner /> Waiting for the model…
          </p>
        )}

        {result && !running && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {result.model && <Badge tone="accent">{result.model}</Badge>}
              {result.fallback_used && <Badge tone="warn">fallback used</Badge>}
              {typeof result.latency_ms === "number" && <Badge>{formatNumber(result.latency_ms)} ms</Badge>}
              {typeof result.total_tokens === "number" && <Badge>{formatNumber(result.total_tokens)} tokens</Badge>}
              {typeof result.iterations === "number" && <Badge>{result.iterations} iterations</Badge>}
            </div>

            {result.error && <Alert>{result.error}</Alert>}

            {result.reply && (
              <div className="rounded-xl border border-adm-accent/20 bg-gradient-to-br from-adm-accent/8 to-transparent p-4">
                <p className="break-words whitespace-pre-wrap text-[13px] text-adm-text">{result.reply}</p>
              </div>
            )}

            {(result.tool_calls ?? []).length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-adm-mute uppercase">Tool calls</h3>
                <div className="space-y-2">
                  {(result.tool_calls ?? []).map((call, index) => (
                    <div key={index} className="rounded-xl border border-adm-line bg-adm-bg p-3">
                      <p className="font-mono text-xs text-adm-accent">{call.tool}</p>
                      <pre className="adm-scroll mt-1 overflow-x-auto text-[11px] text-adm-mute">
                        {JSON.stringify(call.arguments ?? {}, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
