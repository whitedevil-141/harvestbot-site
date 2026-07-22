"use client";

import React, { useMemo, useState } from "react";
import { KeyRound, Plus, Save, Trash2, Zap } from "lucide-react";
import {
  MODEL_CATALOG_LIMIT,
  config as configApi,
  isHttpUrl,
  modelKey,
  probeLatency,
  system,
  type ModelCatalogEntry,
  type ProbeResult,
} from "@/lib/chatbot-admin";
import {
  Alert,
  AsyncBlock,
  Badge,
  Button,
  IconButton,
  Input,
  PageHeader,
  Panel,
  Row,
  Rows,
  Table,
  Td,
  Th,
  Tr,
  formatUsd,
} from "../ui";
import { useConfigBundle } from "./ConfigContext";

type DraftEntry = { key: string; model: string; base_url: string; label?: string | null; provider?: string | null };

function ToolCallingBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  if (status === "ok") return <Badge tone="good">tools ok</Badge>;
  if (status === "salvaged") return <Badge tone="warn">tools salvaged</Badge>;
  if (status === "unsupported") return <Badge tone="neutral">tools unsupported</Badge>;
  return <Badge tone="bad">{status}</Badge>;
}

function ProbeSummary({ result }: { result: ProbeResult }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge tone={result.ok ? "good" : "bad"}>{result.ok ? "reachable" : "failed"}</Badge>
      <Badge>{probeLatency(result)}</Badge>
      <ToolCallingBadge status={result.tool_calling} />
      {result.error && <span className="break-all text-xs text-adm-bad">{result.error}</span>}
    </div>
  );
}

export function Models() {
  const { bundle, loading, error, reload } = useConfigBundle();

  const [entries, setEntries] = useState<DraftEntry[] | null>(null);
  const [probes, setProbes] = useState<Record<string, ProbeResult>>({});
  const [probing, setProbing] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [providerProbes, setProviderProbes] = useState<ProbeResult[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState({ base_url: "", model: "", label: "" });
  const [newEntryError, setNewEntryError] = useState<string | null>(null);

  const serverEntries = useMemo<DraftEntry[]>(() => {
    if (!bundle) return [];
    return bundle.model_catalog.flatMap((group) =>
      group.entries.map((entry: ModelCatalogEntry) => ({
        key: entry.key ?? modelKey(entry.base_url, entry.model),
        model: entry.model,
        base_url: entry.base_url,
        label: entry.label ?? null,
        provider: entry.provider ?? group.provider,
      })),
    );
  }, [bundle]);

  const draft = entries ?? serverEntries;
  const isDirty = JSON.stringify(draft) !== JSON.stringify(serverEntries);

  const catalogField = bundle?.editable_fields.find((field) => field.includes("catalog")) ?? "model_catalog";

  const keyConfiguredFor = (entry: DraftEntry) =>
    bundle?.model_catalog
      .flatMap((group) => group.entries)
      .find((candidate) => (candidate.key ?? modelKey(candidate.base_url, candidate.model)) === entry.key)
      ?.key_configured;

  const pricingFor = (entry: DraftEntry) => {
    const known = bundle?.known_pricing?.[entry.model];
    const fromCatalog = bundle?.model_catalog
      .flatMap((group) => group.entries)
      .find((candidate) => candidate.key === entry.key)?.pricing;
    return fromCatalog ?? known ?? null;
  };

  const addEntry = (candidate: { base_url: string; model: string; label?: string | null; provider?: string | null }) => {
    setNewEntryError(null);
    const baseUrl = candidate.base_url.trim();
    const model = candidate.model.trim();

    if (!isHttpUrl(baseUrl)) {
      setNewEntryError("Base URL must start with http:// or https://");
      return;
    }
    if (!model) {
      setNewEntryError("Model is required.");
      return;
    }
    const key = modelKey(baseUrl, model);
    if (draft.some((entry) => entry.key === key)) {
      setNewEntryError("That base URL and model are already in the catalog.");
      return;
    }
    if (draft.length >= MODEL_CATALOG_LIMIT) {
      setNewEntryError(`The catalog is capped at ${MODEL_CATALOG_LIMIT} entries.`);
      return;
    }

    setEntries([
      ...draft,
      { key, base_url: baseUrl, model, label: candidate.label ?? null, provider: candidate.provider ?? null },
    ]);
    setNewEntry({ base_url: "", model: "", label: "" });
  };

  const probeEntry = async (entry: DraftEntry) => {
    setProbing(entry.key);
    try {
      const result = await system.llmProbe({ base_url: entry.base_url, model: entry.model });
      setProbes((prev) => ({ ...prev, [entry.key]: result }));
    } catch (err) {
      setProbes((prev) => ({
        ...prev,
        [entry.key]: { ok: false, error: err instanceof Error ? err.message : "Probe failed." },
      }));
    } finally {
      setProbing(null);
    }
  };

  const runLlmCheck = async () => {
    setChecking(true);
    try {
      const result = await system.llmCheck();
      setProviderProbes(result.providers ?? []);
    } catch (err) {
      setProviderProbes([{ ok: false, error: err instanceof Error ? err.message : "Check failed." }]);
    } finally {
      setChecking(false);
    }
  };

  const saveCatalog = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await configApi.put(
        {
          [catalogField]: draft.map(({ base_url, model, label }) => ({
            base_url,
            model,
            ...(label ? { label } : {}),
          })),
        },
        "Model catalog update",
      );
      setEntries(null);
      reload();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save the catalog.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Models"
        description="The catalog the bot can be pointed at. Probe a candidate before saving it — a model that cannot call tools will not run the toolchain."
        meta={
          <>
            <Badge tone="accent">{draft.length} models</Badge>
            {isDirty && <Badge tone="warn">unsaved</Badge>}
          </>
        }
        actions={
          <Button size="sm" loading={checking} onClick={() => void runLlmCheck()}>
            <Zap className="h-3.5 w-3.5" /> Check providers
          </Button>
        }
      />

      <AsyncBlock loading={loading && !bundle} error={error} onRetry={reload}>
        {bundle && (
          <>
            <Panel
              title={
                <span className="flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5 text-adm-mute" /> Provider keys
                </span>
              }
              description="Read from the environment. Values are never returned by the API."
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {bundle.provider_keys.map((entry) => (
                  <div
                    key={entry.provider}
                    className="flex items-center justify-between gap-3 rounded-xl border border-adm-line bg-adm-bg px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] text-adm-text">{entry.provider}</p>
                      <p className="truncate font-mono text-[11px] text-adm-mute">{entry.env}</p>
                    </div>
                    <Badge tone={entry.configured ? "good" : "neutral"}>
                      {entry.configured ? "configured" : "missing"}
                    </Badge>
                  </div>
                ))}
              </div>

              {providerProbes && (
                <div className="mt-5 space-y-2 border-t border-adm-line pt-5">
                  {providerProbes.map((result, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] text-adm-dim">
                        {result.provider ?? "provider"}
                        {result.model ? ` · ${result.model}` : ""}
                      </span>
                      <ProbeSummary result={result} />
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel
              title="Catalog"
              description={`${draft.length} of ${MODEL_CATALOG_LIMIT} entries · saved to "${catalogField}"`}
              padded={false}
              actions={
                <>
                  <Button size="sm" disabled={!isDirty} onClick={() => setEntries(null)}>
                    Discard
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!isDirty}
                    loading={saving}
                    onClick={() => void saveCatalog()}
                  >
                    <Save className="h-3.5 w-3.5" /> Save catalog
                  </Button>
                </>
              }
            >
              {saveError && (
                <div className="p-5 pb-0">
                  <Alert onDismiss={() => setSaveError(null)}>{saveError}</Alert>
                </div>
              )}
              <Table
                head={
                  <>
                    <Th>Model</Th>
                    <Th>Base URL</Th>
                    <Th>Pricing / 1M</Th>
                    <Th>Probe</Th>
                    <Th align="right" />
                  </>
                }
              >
                {draft.map((entry) => {
                  const pricing = pricingFor(entry);
                  const configured = keyConfiguredFor(entry);
                  const probe = probes[entry.key];
                  return (
                    <Tr key={entry.key}>
                      <Td>
                        <span className="font-mono text-xs text-adm-text">{entry.model}</span>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {entry.provider && <Badge>{entry.provider}</Badge>}
                          {configured === false && <Badge tone="warn">no key</Badge>}
                          {entry.label && <span className="text-[11px] text-adm-mute">{entry.label}</span>}
                        </div>
                      </Td>
                      <Td className="max-w-xs break-all font-mono text-[11px]">{entry.base_url}</Td>
                      <Td className="adm-nums whitespace-nowrap">
                        {pricing ? (
                          <>
                            in {formatUsd(pricing.input)} · out {formatUsd(pricing.output)}
                          </>
                        ) : (
                          <span className="text-adm-mute">unknown</span>
                        )}
                      </Td>
                      <Td>
                        {probe ? (
                          <ProbeSummary result={probe} />
                        ) : (
                          <Button size="sm" loading={probing === entry.key} onClick={() => void probeEntry(entry)}>
                            Probe
                          </Button>
                        )}
                      </Td>
                      <Td className="text-right">
                        <IconButton
                          label="Remove from catalog"
                          danger
                          onClick={() => setEntries(draft.filter((item) => item.key !== entry.key))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconButton>
                      </Td>
                    </Tr>
                  );
                })}
                {draft.length === 0 && (
                  <Tr>
                    <Td colSpan={5} className="py-10 text-center text-adm-mute">
                      The catalog is empty. Add a preset or a custom entry below.
                    </Td>
                  </Tr>
                )}
              </Table>
            </Panel>

            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
              <Panel title="Add a model">
                <div className="space-y-3">
                  <Input
                    label="Base URL"
                    value={newEntry.base_url}
                    placeholder="https://api.example.com/v1"
                    onChange={(event) => setNewEntry({ ...newEntry, base_url: event.target.value })}
                  />
                  <Input
                    label="Model"
                    value={newEntry.model}
                    placeholder="claude-opus-4-8"
                    onChange={(event) => setNewEntry({ ...newEntry, model: event.target.value })}
                  />
                  <Input
                    label="Label (optional)"
                    value={newEntry.label}
                    onChange={(event) => setNewEntry({ ...newEntry, label: event.target.value })}
                  />
                  {newEntryError && <Alert onDismiss={() => setNewEntryError(null)}>{newEntryError}</Alert>}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="primary" onClick={() => addEntry(newEntry)}>
                      <Plus className="h-3.5 w-3.5" /> Add to catalog
                    </Button>
                    <Button
                      disabled={!isHttpUrl(newEntry.base_url) || !newEntry.model.trim()}
                      loading={probing === "new"}
                      onClick={() =>
                        void probeEntry({
                          key: "new",
                          base_url: newEntry.base_url.trim(),
                          model: newEntry.model.trim(),
                        })
                      }
                    >
                      Probe first
                    </Button>
                  </div>
                  {probes.new && <ProbeSummary result={probes.new} />}
                </div>
              </Panel>

              <Panel title="Suggested presets" description="Offered by the backend, grouped by endpoint." padded={false}>
                {bundle.model_presets.length === 0 ? (
                  <p className="p-5 text-[13px] text-adm-mute">No presets offered by the backend.</p>
                ) : (
                  <Rows>
                    {bundle.model_presets.map((preset) => {
                      const key = modelKey(preset.base_url, preset.model);
                      const already = draft.some((entry) => entry.key === key);
                      return (
                        <Row key={key}>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-mono text-xs text-adm-text">{preset.model}</p>
                            <p className="truncate text-[11px] text-adm-mute">{preset.base_url}</p>
                          </div>
                          <Button size="sm" disabled={already} onClick={() => addEntry(preset)}>
                            {already ? "Added" : "Add"}
                          </Button>
                        </Row>
                      );
                    })}
                  </Rows>
                )}
              </Panel>
            </div>
          </>
        )}
      </AsyncBlock>
    </>
  );
}
