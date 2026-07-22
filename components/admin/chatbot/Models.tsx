"use client";

import React, { useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, HelpCircle, KeyRound, Plus, Save, Trash2, Wrench, Zap } from "lucide-react";
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
  Chip,
  IconButton,
  Input,
  Modal,
  PageHeader,
  Panel,
  Row,
  Rows,
  Select,
  Table,
  Td,
  Th,
  Tr,
  formatUsd,
} from "../ui";
import { useConfigBundle } from "./ConfigContext";

type DraftEntry = { key: string; model: string; base_url: string; label?: string | null; provider?: string | null };
type AddMethod = "preset" | "custom";

function ToolCallingBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  if (status === "ok") return <Badge tone="good">tools ok</Badge>;
  if (status === "salvaged") return <Badge tone="warn">tools salvaged</Badge>;
  if (status === "unsupported") return <Badge tone="neutral">no tool support</Badge>;
  return <Badge tone="bad">{status}</Badge>;
}

function ProbeSummary({ result, compact }: { result: ProbeResult; compact?: boolean }) {
  if (compact) {
    return (
      <Badge tone={result.ok ? "good" : "bad"}>
        {result.ok ? "reachable" : result.error?.slice(0, 40) ?? "failed"}
      </Badge>
    );
  }
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
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addMethod, setAddMethod] = useState<AddMethod>("preset");

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
    const baseUrl = candidate.base_url.trim();
    const model = candidate.model.trim();

    if (!isHttpUrl(baseUrl)) return "Base URL must start with http:// or https://";
    if (!model) return "Model is required.";
    const key = modelKey(baseUrl, model);
    if (draft.some((entry) => entry.key === key)) return "That base URL and model are already in the catalog.";
    if (draft.length >= MODEL_CATALOG_LIMIT) return `The catalog is capped at ${MODEL_CATALOG_LIMIT} entries.`;

    setEntries([
      ...draft,
      { key, base_url: baseUrl, model, label: candidate.label ?? null, provider: candidate.provider ?? null },
    ]);
    return null;
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
      setProbes({});
      reload();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save the catalog.");
    } finally {
      setSaving(false);
    }
  };

  const allConfigured = bundle?.provider_keys.every((k) => k.configured) ?? false;
  const missingKeys = bundle?.provider_keys.filter((k) => !k.configured) ?? [];
  const hasCatalog = draft.length > 0;
  const hasPresets = (bundle?.model_presets.length ?? 0) > 0;

  return (
    <>
      <PageHeader
        title="Models"
        description="Configure which LLMs the bot can use. Add a provider preset or a custom endpoint, then probe it to confirm it works."
        meta={
          <>
            <Badge tone="accent">{draft.length} models</Badge>
            {isDirty && <Badge tone="warn">unsaved</Badge>}
          </>
        }
        actions={
          <Button size="sm" loading={checking} onClick={() => void runLlmCheck()}>
            <Zap className="h-3.5 w-3.5" /> Check all providers
          </Button>
        }
      />

      <AsyncBlock loading={loading && !bundle} error={error} onRetry={reload}>
        {bundle && (
          <>
            {/* Provider keys — at a glance */}
            <Panel
              title={
                <span className="flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5 text-adm-mute" /> API keys
                </span>
              }
              description={
                allConfigured
                  ? "Every provider key is set. The bot can reach any matching model."
                  : `${missingKeys.length} key${missingKeys.length > 1 ? "s" : ""} missing — models from that provider will fail until it is set.`
              }
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {bundle.provider_keys.map((entry) => (
                  <div
                    key={entry.provider}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                      entry.configured
                        ? "border-adm-good/20 bg-adm-good-dim/30"
                        : "border-adm-warn/20 bg-adm-warn-dim/30"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-adm-text">{entry.provider}</p>
                      <p className="truncate font-mono text-[11px] text-adm-mute">{entry.env}</p>
                    </div>
                    {entry.configured ? (
                      <Badge tone="good">
                        <CheckCircle2 className="mr-1 inline h-3 w-3" />
                        Set
                      </Badge>
                    ) : (
                      <Badge tone="warn">
                        <HelpCircle className="mr-1 inline h-3 w-3" />
                        Missing
                      </Badge>
                    )}
                  </div>
                ))}
              </div>

              {missingKeys.length > 0 && (
                <div className="mt-4 rounded-xl border border-adm-warn/20 bg-adm-warn-dim/20 px-4 py-3 text-[13px] text-adm-warn">
                  Set <span className="font-mono font-semibold">{missingKeys.map((k) => k.env).join(", ")}</span> in the
                  server environment, then reload this page. The bot cannot reach models hosted by these providers until
                  the key is present.
                </div>
              )}

              {providerProbes && (
                <div className="mt-5 space-y-2 border-t border-adm-line pt-5">
                  <p className="text-xs font-medium text-adm-dim">Provider check results</p>
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

            {/* Main catalog table */}
            <Panel
              title={
                <span className="flex items-center gap-2">
                  <Wrench className="h-3.5 w-3.5 text-adm-mute" /> Active models
                </span>
              }
              description={`${draft.length} of ${MODEL_CATALOG_LIMIT} slots used`}
              padded={false}
              actions={
                <>
                  <Button size="sm" onClick={() => setAddModalOpen(true)} disabled={draft.length >= MODEL_CATALOG_LIMIT}>
                    <Plus className="h-3.5 w-3.5" /> Add model
                  </Button>
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
                    <Save className="h-3.5 w-3.5" /> Save
                  </Button>
                </>
              }
            >
              {saveError && (
                <div className="p-5 pb-0">
                  <Alert onDismiss={() => setSaveError(null)}>{saveError}</Alert>
                </div>
              )}

              {!hasCatalog && !isDirty && (
                <div className="flex flex-col items-center gap-4 px-5 py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-adm-line bg-adm-surface-2 text-adm-mute">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-adm-dim">No models configured yet</p>
                    <p className="mt-1 max-w-sm text-xs text-adm-mute">
                      Add a preset from your provider or enter a custom endpoint. Each model must pass a probe before the
                      bot can use it.
                    </p>
                  </div>
                  <Button variant="primary" onClick={() => setAddModalOpen(true)}>
                    <Plus className="h-3.5 w-3.5" /> Add your first model
                  </Button>
                </div>
              )}

              {hasCatalog && (
                <Table
                  head={
                    <>
                      <Th>Model</Th>
                      <Th>Endpoint</Th>
                      <Th>Pricing / 1M</Th>
                      <Th>Status</Th>
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
                            {configured === false && <Badge tone="warn">key missing</Badge>}
                            {entry.label && <span className="text-[11px] text-adm-mute">{entry.label}</span>}
                          </div>
                        </Td>
                        <Td className="max-w-xs break-all font-mono text-[11px] text-adm-dim">{entry.base_url}</Td>
                        <Td className="adm-nums whitespace-nowrap">
                          {pricing ? (
                            <>
                              in {formatUsd(pricing.input)} / out {formatUsd(pricing.output)}
                            </>
                          ) : (
                            <span className="text-adm-mute">unknown</span>
                          )}
                        </Td>
                        <Td>
                          {probe ? (
                            <ProbeSummary result={probe} compact />
                          ) : (
                            <Button size="sm" loading={probing === entry.key} onClick={() => void probeEntry(entry)}>
                              Test connection
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
                </Table>
              )}
            </Panel>

            {/* Quick probe all unsaved or unprobed */}
            {hasCatalog && (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-adm-line bg-adm-surface px-5 py-3">
                <span className="text-[13px] text-adm-dim">Not sure your models work?</span>
                <Button
                  size="sm"
                  loading={probing !== null}
                  onClick={async () => {
                    for (const entry of draft) {
                      if (!probes[entry.key]) await probeEntry(entry);
                    }
                  }}
                >
                  <Zap className="h-3.5 w-3.5" /> Test all connections
                </Button>
              </div>
            )}
          </>
        )}
      </AsyncBlock>

      {addModalOpen && (
        <AddModelModal
          presets={bundle?.model_presets ?? []}
          existingKeys={new Set(draft.map((e) => e.key))}
          presetsLoading={loading}
          onAdd={(candidate) => {
            const error = addEntry(candidate);
            if (error) return error;
            setAddModalOpen(false);
            return null;
          }}
          onClose={() => setAddModalOpen(false)}
        />
      )}
    </>
  );
}

function AddModelModal({
  presets,
  existingKeys,
  presetsLoading,
  onAdd,
  onClose,
}: {
  presets: { model: string; base_url: string; label?: string | null; provider?: string | null }[];
  existingKeys: Set<string>;
  presetsLoading: boolean;
  onAdd: (candidate: { base_url: string; model: string; label?: string | null; provider?: string | null }) => string | null;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<AddMethod>(presets.length > 0 ? "preset" : "custom");
  const [customUrl, setCustomUrl] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const handleAddPreset = async (preset: typeof presets[number]) => {
    setError(null);
    setAdding(true);
    try {
      const err = onAdd(preset);
      if (err) setError(err);
    } finally {
      setAdding(false);
    }
  };

  const handleAddCustom = async () => {
    setError(null);
    setAdding(true);
    try {
      const err = onAdd({ base_url: customUrl, model: customModel, label: customLabel || null });
      if (err) setError(err);
    } finally {
      setAdding(false);
    }
  };

  return (
    <Modal title="Add a model" onClose={onClose} size="md">
      {presets.length > 0 && (
        <div className="mb-2 flex gap-2">
          <Chip active={method === "preset"} onClick={() => setMethod("preset")}>
            From preset
          </Chip>
          <Chip active={method === "custom"} onClick={() => setMethod("custom")}>
            Custom endpoint
          </Chip>
        </div>
      )}

      {method === "preset" && (
        <div>
          <p className="mb-3 text-[13px] text-adm-dim">Pick a preset offered by one of your providers.</p>
          {presets.length === 0 ? (
            <p className="text-[13px] text-adm-mute">No presets available.</p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {presets.map((preset) => {
                const key = modelKey(preset.base_url, preset.model);
                const alreadyAdded = existingKeys.has(key);
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3 rounded-xl border border-adm-line bg-adm-bg px-4 py-3 transition-colors hover:border-adm-line-strong"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-[13px] text-adm-text">{preset.model}</p>
                      <p className="truncate text-[11px] text-adm-mute">{preset.base_url}</p>
                    </div>
                    <Button
                      size="sm"
                      variant={alreadyAdded ? "ghost" : "primary"}
                      disabled={alreadyAdded || adding}
                      onClick={() => handleAddPreset(preset)}
                    >
                      {alreadyAdded ? "Added" : "Add"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {method === "custom" && (
        <div className="space-y-3">
          <p className="text-[13px] text-adm-dim">
            Enter any OpenAI-compatible endpoint. Make sure the provider key is set in the server environment.
          </p>
          <Input
            label="Base URL"
            value={customUrl}
            placeholder="https://api.openai.com/v1"
            onChange={(e) => setCustomUrl(e.target.value)}
          />
          <Input
            label="Model name"
            value={customModel}
            placeholder="gpt-4o, claude-sonnet-4-20250514, ..."
            onChange={(e) => setCustomModel(e.target.value)}
          />
          <Input
            label="Label (optional)"
            value={customLabel}
            placeholder="e.g. Fastest model"
            onChange={(e) => setCustomLabel(e.target.value)}
          />
          <Button variant="primary" onClick={() => void handleAddCustom()} loading={adding} disabled={!customUrl.trim() || !customModel.trim()}>
            <Plus className="h-3.5 w-3.5" /> Add to catalog
          </Button>
        </div>
      )}

      {error && (
        <div className="mt-3">
          <Alert onDismiss={() => setError(null)}>{error}</Alert>
        </div>
      )}
    </Modal>
  );
}
