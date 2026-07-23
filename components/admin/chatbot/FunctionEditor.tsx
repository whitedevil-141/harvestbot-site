"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, Play, Plus, Save, X } from "lucide-react";
import {
  HTTP_METHODS,
  METHODS_WITH_BODY,
  emptyWebhookSpec,
  fieldErrorsFrom,
  functions as functionsApi,
  type AdminFunction,
  type FunctionTestResult,
  type HttpMethod,
  type Json,
  type WebhookSpec,
} from "@/lib/chatbot-admin";
import { Alert, Badge, Button, IconButton, Input, JsonBlock, Modal, Select, Textarea } from "../ui";

/** The JSON-schema types worth offering. Anything else is hand-written JSON. */
const PARAM_TYPES = ["string", "number", "integer", "boolean"] as const;

export type ParamRow = {
  name: string;
  type: string;
  description: string;
  required: boolean;
};

/**
 * The parameter editor speaks rows; the API speaks JSON Schema. These two
 * convert between them and are the only place that knows the mapping.
 *
 * A schema the row editor cannot express (nested objects, enums, arrays of
 * objects) survives a round trip untouched *only* if it is never edited here —
 * which is why `schemaIsSimple` gates the editor and falls back to raw JSON.
 */
export const rowsFromSchema = (schema: Json | undefined): ParamRow[] => {
  const properties = (schema?.properties ?? {}) as Record<string, Json>;
  const required = new Set(Array.isArray(schema?.required) ? (schema.required as string[]) : []);
  return Object.entries(properties).map(([name, definition]) => ({
    name,
    type: typeof definition?.type === "string" ? definition.type : "string",
    description: typeof definition?.description === "string" ? definition.description : "",
    required: required.has(name),
  }));
};

export const schemaFromRows = (rows: ParamRow[]): Json => {
  const properties: Record<string, Json> = {};
  const required: string[] = [];
  for (const row of rows) {
    const name = row.name.trim();
    if (!name) continue;
    properties[name] = row.description.trim()
      ? { type: row.type, description: row.description.trim() }
      : { type: row.type };
    if (row.required) required.push(name);
  }
  return { type: "object", properties, ...(required.length ? { required } : {}) };
};

/** True when the row editor can represent this schema without losing anything. */
export const schemaIsSimple = (schema: Json | undefined): boolean => {
  const properties = schema?.properties;
  if (properties === undefined) return true;
  if (typeof properties !== "object" || properties === null) return false;
  return Object.values(properties as Record<string, Json>).every((definition) => {
    if (typeof definition !== "object" || definition === null) return false;
    const keys = Object.keys(definition);
    return (
      keys.every((key) => key === "type" || key === "description") &&
      PARAM_TYPES.includes(definition.type as (typeof PARAM_TYPES)[number])
    );
  });
};

/** Key/value rows, for headers and the query template. */
type Pair = { key: string; value: string };

const pairsFrom = (record: Record<string, string> | undefined): Pair[] =>
  Object.entries(record ?? {}).map(([key, value]) => ({ key, value }));

const recordFrom = (pairs: Pair[]): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const pair of pairs) {
    const key = pair.key.trim();
    if (key) out[key] = pair.value;
  }
  return out;
};

function PairRows({
  label,
  hint,
  pairs,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
}: {
  label: string;
  hint?: string;
  pairs: Pair[];
  onChange: (pairs: Pair[]) => void;
  keyPlaceholder: string;
  valuePlaceholder: string;
}) {
  const update = (index: number, patch: Partial<Pair>) =>
    onChange(pairs.map((pair, i) => (i === index ? { ...pair, ...patch } : pair)));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-adm-text">{label}</span>
        <Button size="sm" onClick={() => onChange([...pairs, { key: "", value: "" }])}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
      {hint && <p className="text-xs text-adm-mute">{hint}</p>}
      {pairs.map((pair, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={pair.key}
            placeholder={keyPlaceholder}
            className="flex-1"
            onChange={(event) => update(index, { key: event.target.value })}
          />
          <Input
            value={pair.value}
            placeholder={valuePlaceholder}
            className="flex-1 font-mono text-xs"
            onChange={(event) => update(index, { value: event.target.value })}
          />
          <IconButton
            label={`Remove ${pair.key || "row"}`}
            onClick={() => onChange(pairs.filter((_, i) => i !== index))}
          >
            <X className="h-4 w-4" />
          </IconButton>
        </div>
      ))}
    </div>
  );
}

/**
 * Create or edit one webhook function.
 *
 * `existing` decides which: with one, the name is locked, because the server
 * refuses a rename — `enabled_tools` and every recorded transcript reference
 * the old name, so a rename would quietly disable the function and orphan its
 * history. Creating a replacement is the honest version of that operation.
 */
export function FunctionEditor({
  existing,
  onClose,
  onSaved,
}: {
  existing: AdminFunction | null;
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const initial = useMemo<WebhookSpec>(() => {
    const blank = emptyWebhookSpec();
    if (!existing) return blank;
    return {
      ...blank,
      ...existing,
      name: existing.name,
      description: existing.description ?? "",
      parameters: existing.parameters ?? blank.parameters,
    } as WebhookSpec;
  }, [existing]);

  const [spec, setSpec] = useState<WebhookSpec>(initial);
  const [params, setParams] = useState<ParamRow[]>(() => rowsFromSchema(initial.parameters));
  const [headers, setHeaders] = useState<Pair[]>(() => pairsFrom(initial.headers));
  const [query, setQuery] = useState<Pair[]>(() => pairsFrom(initial.query));
  const [bodyText, setBodyText] = useState(() =>
    initial.body === null ? "" : JSON.stringify(initial.body, null, 2),
  );
  // Only when the stored schema is something the row editor would flatten.
  const [rawSchema, setRawSchema] = useState(() => !schemaIsSimple(initial.parameters));
  const [rawSchemaText, setRawSchemaText] = useState(() =>
    JSON.stringify(initial.parameters, null, 2),
  );

  const [advanced, setAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [testArgs, setTestArgs] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<FunctionTestResult | null>(null);

  const set = <K extends keyof WebhookSpec>(key: K, value: WebhookSpec[K]) =>
    setSpec((prev) => ({ ...prev, [key]: value }));

  const bodyError = useMemo(() => {
    if (!bodyText.trim()) return null;
    try {
      const parsed = JSON.parse(bodyText);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return "Must be a JSON object.";
      }
      return null;
    } catch {
      return "Not valid JSON.";
    }
  }, [bodyText]);

  const schemaError = useMemo(() => {
    if (!rawSchema) return null;
    try {
      JSON.parse(rawSchemaText);
      return null;
    } catch {
      return "Not valid JSON.";
    }
  }, [rawSchema, rawSchemaText]);

  /** The spec as the API takes it, assembled from every sub-editor. */
  const assemble = (): WebhookSpec => ({
    ...spec,
    name: spec.name.trim(),
    description: spec.description.trim(),
    parameters: rawSchema ? (JSON.parse(rawSchemaText) as Json) : schemaFromRows(params),
    url: spec.url.trim(),
    headers: recordFrom(headers),
    query: recordFrom(query),
    body: bodyText.trim() ? (JSON.parse(bodyText) as Json) : null,
  });

  const blocked = Boolean(bodyError || schemaError) || !spec.name.trim() || !spec.url.trim() || !spec.description.trim();

  const save = async () => {
    setSaving(true);
    setBanner(null);
    setFieldErrors({});
    try {
      const payload = assemble();
      if (existing) await functionsApi.update(existing.name, payload);
      else await functionsApi.create(payload);
      onSaved(payload.name);
    } catch (err) {
      const { fields, banner: message } = fieldErrorsFrom(err);
      setFieldErrors(fields);
      setBanner(message);
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    setBanner(null);
    setTestResult(null);
    try {
      // Sent as typed: the test inputs are text boxes, so a numeric parameter
      // would otherwise be tested as a string and pass where the real call
      // fails.
      const args: Json = {};
      for (const row of params) {
        const raw = testArgs[row.name];
        if (raw === undefined || raw === "") continue;
        args[row.name] =
          row.type === "number" || row.type === "integer"
            ? Number(raw)
            : row.type === "boolean"
              ? raw === "true"
              : raw;
      }
      setTestResult(await functionsApi.test(assemble(), args));
    } catch (err) {
      const { fields, banner: message } = fieldErrorsFrom(err);
      setFieldErrors(fields);
      setBanner(message ?? "The function could not be tested — check the fields above.");
    } finally {
      setTesting(false);
    }
  };

  const updateParam = (index: number, patch: Partial<ParamRow>) =>
    setParams(params.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <Modal
      title={existing ? `Edit ${existing.name}` : "New function"}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="primary" loading={saving} disabled={blocked} onClick={() => void save()}>
            <Save className="h-3.5 w-3.5" /> {existing ? "Save changes" : "Create function"}
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </>
      }
    >
      {banner && <Alert onDismiss={() => setBanner(null)}>{banner}</Alert>}

      <Input
        label="Name"
        hint={
          existing
            ? "The name is what the model calls, and cannot be changed. Create a new function instead."
            : "Letters, digits and underscores. This is what the model calls."
        }
        value={spec.name}
        locked={Boolean(existing)}
        error={fieldErrors.name}
        placeholder="check_order"
        className="font-mono"
        onChange={(event) => set("name", event.target.value)}
      />

      <Textarea
        label="Description"
        hint="The model reads this to decide when to call the function. Be specific about when it applies."
        mono={false}
        rows={2}
        value={spec.description}
        error={fieldErrors.description}
        placeholder="Look up the status of an order by its id."
        onChange={(event) => set("description", event.target.value)}
      />

      <div className="flex gap-2">
        <Select
          label="Method"
          className="w-32"
          value={spec.method}
          options={HTTP_METHODS.map((method) => ({ value: method, label: method }))}
          onChange={(event) => set("method", event.target.value as HttpMethod)}
        />
        <div className="flex-1">
          <Input
            label="URL"
            hint="Use {parameter} anywhere to substitute an argument. Values in the path are URL-encoded."
            value={spec.url}
            error={fieldErrors.url}
            placeholder="https://api.example.com/orders/{order_id}"
            className="font-mono text-xs"
            onChange={(event) => set("url", event.target.value)}
          />
        </div>
      </div>

      {/* Parameters */}
      <div className="space-y-2 rounded-xl border border-adm-line bg-adm-bg/60 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-adm-text">Parameters</span>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setRawSchema(!rawSchema)}>
              {rawSchema ? "Use the editor" : "Edit as JSON"}
            </Button>
            {!rawSchema && (
              <Button
                size="sm"
                onClick={() =>
                  setParams([...params, { name: "", type: "string", description: "", required: true }])
                }
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            )}
          </div>
        </div>

        {rawSchema ? (
          <Textarea
            rows={8}
            value={rawSchemaText}
            error={schemaError}
            hint="A JSON Schema object. Use this for nested or enumerated parameters the rows cannot express."
            onChange={(event) => setRawSchemaText(event.target.value)}
          />
        ) : params.length === 0 ? (
          <p className="text-xs text-adm-mute">
            No parameters. The model will call this function with no arguments.
          </p>
        ) : (
          params.map((row, index) => (
            <div key={index} className="flex items-start gap-2">
              <Input
                value={row.name}
                placeholder="order_id"
                className="w-40 font-mono text-xs"
                onChange={(event) => updateParam(index, { name: event.target.value })}
              />
              <Select
                value={row.type}
                className="w-28"
                options={PARAM_TYPES.map((type) => ({ value: type, label: type }))}
                onChange={(event) => updateParam(index, { type: event.target.value })}
              />
              <Input
                value={row.description}
                placeholder="What the model should put here"
                className="flex-1"
                onChange={(event) => updateParam(index, { description: event.target.value })}
              />
              <Button
                size="sm"
                variant={row.required ? "primary" : undefined}
                title={row.required ? "Required" : "Optional"}
                onClick={() => updateParam(index, { required: !row.required })}
              >
                {row.required ? "required" : "optional"}
              </Button>
              <IconButton
                label={`Remove ${row.name || "parameter"}`}
                onClick={() => setParams(params.filter((_, i) => i !== index))}
              >
                <X className="h-4 w-4" />
              </IconButton>
            </div>
          ))
        )}
        {fieldErrors.parameters && (
          <p className="text-xs text-adm-bad">{fieldErrors.parameters}</p>
        )}
      </div>

      {/* Advanced */}
      <button
        type="button"
        onClick={() => setAdvanced(!advanced)}
        aria-expanded={advanced}
        className="flex items-center gap-1 text-xs text-adm-mute transition-colors hover:text-adm-text"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${advanced ? "" : "-rotate-90"}`} />
        Headers, body and timeout
      </button>

      {advanced && (
        <div className="space-y-4 rounded-xl border border-adm-line bg-adm-bg/60 p-3">
          <PairRows
            label="Headers"
            hint="Sent on every call. A value may contain {parameter}."
            pairs={headers}
            onChange={setHeaders}
            keyPlaceholder="Authorization"
            valuePlaceholder="Bearer …"
          />

          <PairRows
            label="Query parameters"
            hint={
              METHODS_WITH_BODY.includes(spec.method)
                ? "Optional. Leave empty to send nothing in the query string."
                : "Leave empty to send every argument the URL did not already use."
            }
            pairs={query}
            onChange={setQuery}
            keyPlaceholder="format"
            valuePlaceholder="{order_id}"
          />

          <Textarea
            label="Body template"
            rows={5}
            value={bodyText}
            error={bodyError}
            hint={
              METHODS_WITH_BODY.includes(spec.method)
                ? 'JSON. A value that is exactly "{param}" keeps the argument\'s type. Leave empty to send the unused arguments as the body.'
                : `${spec.method} requests are sent without a body.`
            }
            placeholder='{ "id": "{order_id}", "include": "items" }'
            onChange={(event) => setBodyText(event.target.value)}
          />

          <Input
            label="Timeout (seconds)"
            type="number"
            min={1}
            max={30}
            value={spec.timeout_seconds}
            error={fieldErrors.timeout_seconds}
            hint="1–30. The turn waits this long, so keep it well under a user's patience."
            onChange={(event) => set("timeout_seconds", Number(event.target.value))}
          />
        </div>
      )}

      {/* Test */}
      <div className="space-y-2 rounded-xl border border-adm-line bg-adm-bg/60 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-adm-text">Try it</span>
          <Button size="sm" loading={testing} disabled={blocked} onClick={() => void runTest()}>
            <Play className="h-3.5 w-3.5" /> Run
          </Button>
        </div>
        <p className="text-xs text-adm-mute">
          Calls the endpoint once with these arguments, without saving. This is the same request the
          model would make.
        </p>
        {params
          .filter((row) => row.name.trim())
          .map((row) => (
            <Input
              key={row.name}
              label={
                <span className="font-mono">
                  {row.name}
                  {row.required ? " *" : ""}
                </span>
              }
              value={testArgs[row.name] ?? ""}
              placeholder={row.type}
              onChange={(event) => setTestArgs({ ...testArgs, [row.name]: event.target.value })}
            />
          ))}
        {testResult && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge tone={testResult.result.ok ? "good" : "bad"}>
                {testResult.result.ok ? "ok" : "failed"}
              </Badge>
              {testResult.result.status !== undefined && (
                <Badge tone="neutral">HTTP {testResult.result.status}</Badge>
              )}
              {testResult.result.error && (
                <span className="text-xs text-adm-bad">{testResult.result.error}</span>
              )}
            </div>
            <JsonBlock value={testResult.result.data ?? testResult.result} />
          </div>
        )}
      </div>
    </Modal>
  );
}
