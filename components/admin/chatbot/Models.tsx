"use client";

import React, { useMemo, useState } from "react";
import { Eye, EyeOff, KeyRound, Plus, Save, Trash2, Wrench, Zap } from "lucide-react";
import {
  MODEL_CATALOG_LIMIT,
  config as configApi,
  flattenCatalog,
  flattenPresets,
  isAllowedLlmHost,
  modelKey,
  probeLatency,
  system,
  type AdminConfigBundle,
  type ProbeResult,
  type ProviderKey,
} from "@/lib/chatbot-admin";
import {
  Alert,
  AsyncBlock,
  Badge,
  Button,
  EmptyState,
  IconButton,
  Modal,
  PageHeader,
  Panel,
  Rows,
  SearchInput,
  Spinner,
  StatusDot,
  Table,
  Td,
  Th,
  Tr,
  formatUsd,
} from "../ui";
import { useConfigBundle } from "./ConfigContext";
import { ModelPicker, isChoiceReady, type ModelChoice } from "./ModelPicker";

type DraftEntry = {
  key: string;
  model: string;
  base_url: string;
  /** Free-text operator note. Matches ModelEntry.note on the server. */
  note?: string | null;
  provider?: string | null;
};

/** The catalog only needs a search box once it stops fitting on screen. */
const SEARCH_THRESHOLD = 8;

/** Where a configured key came from, in the words the operator needs. */
const SOURCE_HINT: Record<string, string> = {
  stored: "set here",
  env: "from environment",
  slot: "from environment (legacy slot key)",
};

/**
 * One provider's key. The stored value never leaves the server, so this only
 * ever sets or clears: the row shows status, and opens an input on demand
 * rather than holding a field per provider on screen at all times.
 *
 * Only a key set here can be removed. Clearing an environment-provided one is
 * not something this page can do -- the delete would appear to work and the
 * key would still resolve on the next turn -- so the button is simply absent,
 * and the source badge says why.
 */
function ProviderKeyRow({
  entry,
  probe,
  onSaved,
}: {
  entry: ProviderKey;
  probe?: ProbeResult;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState<"save" | "clear" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setEditing(false);
    setValue("");
    setReveal(false);
    setError(null);
  };

  const save = async () => {
    const key = value.trim();
    if (!key) return;
    setBusy("save");
    setError(null);
    try {
      await system.setProviderKey(entry.provider, key);
      close();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that key.");
    } finally {
      setBusy(null);
    }
  };

  const clear = async () => {
    setBusy("clear");
    setError(null);
    try {
      await system.deleteProviderKey(entry.provider);
      close();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove that key.");
    } finally {
      setBusy(null);
    }
  };

  return (
    // A plain <li> rather than <Row>: this row stacks an edit field under its
    // header, which Row's fixed `flex items-start` layout does not allow.
    <li className="space-y-2 px-5 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusDot tone={entry.configured ? "good" : "warn"} />
        <span className="text-[13px] font-medium text-adm-text">{entry.provider}</span>
        <span className="truncate font-mono text-[11px] text-adm-mute">{entry.env}</span>
        {entry.configured && entry.source && (
          <Badge tone={entry.source === "stored" ? "accent" : "neutral"}>
            {SOURCE_HINT[entry.source] ?? entry.source}
          </Badge>
        )}
        {probe && (
          <Badge tone={probe.ok ? "good" : "bad"} title={probe.error ?? undefined}>
            {probe.ok ? probeLatency(probe) : "unreachable"}
          </Badge>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-1">
          {!editing && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              {entry.configured ? "Replace" : "Set key"}
            </Button>
          )}
          {entry.source === "stored" && !editing && (
            <IconButton
              label={`Remove ${entry.provider} key`}
              danger
              disabled={busy !== null}
              onClick={() => void clear()}
            >
              {busy === "clear" ? <Spinner className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
            </IconButton>
          )}
        </span>
      </div>

      {editing && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="relative min-w-0 flex-1">
            <input
              autoFocus
              type={reveal ? "text" : "password"}
              value={value}
              placeholder={`Paste the ${entry.provider} key…`}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void save();
                if (event.key === "Escape") close();
              }}
              className="h-8 w-full rounded-lg border border-adm-line bg-adm-bg/80 pl-3 pr-9 font-mono text-xs text-adm-text placeholder:font-sans placeholder:text-adm-mute outline-none transition-all duration-200 hover:border-adm-line-strong focus:border-adm-line-focus"
            />
            <button
              type="button"
              aria-label={reveal ? "Hide key" : "Show key"}
              onClick={() => setReveal((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-adm-mute transition-colors hover:text-adm-text"
            >
              {reveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </span>
          <Button size="sm" variant="primary" loading={busy === "save"} disabled={!value.trim()} onClick={() => void save()}>
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={close}>
            Cancel
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-adm-bad">{error}</p>}
    </li>
  );
}

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
  const [search, setSearch] = useState("");

  const serverEntries = useMemo<DraftEntry[]>(
    () =>
      flattenCatalog(bundle).map((entry) => ({
        key: entry.key,
        model: entry.model,
        base_url: entry.base_url,
        note: entry.note ?? null,
        provider: entry.provider ?? null,
      })),
    [bundle],
  );

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

  /** The provider label the server would assign this endpoint, for a new row. */
  const providerFor = (baseUrl: string) =>
    [...serverEntries, ...flattenPresets(bundle)].find((entry) => entry.base_url === baseUrl)
      ?.provider ?? null;

  const addEntry = (candidate: { base_url: string; model: string; note?: string | null }) => {
    const baseUrl = candidate.base_url.trim();
    const model = candidate.model.trim();

    if (!isAllowedLlmHost(baseUrl)) return "Pick a supported provider.";
    if (!model) return "Model is required.";
    const key = modelKey(baseUrl, model);
    if (draft.some((entry) => entry.key === key)) return "That provider and model are already in the catalog.";
    if (draft.length >= MODEL_CATALOG_LIMIT) return `The catalog is capped at ${MODEL_CATALOG_LIMIT} entries.`;

    setEntries([
      ...draft,
      { key, base_url: baseUrl, model, note: candidate.note ?? null, provider: providerFor(baseUrl) },
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
          // Exactly the shape ModelEntry accepts: it forbids extra keys and
          // requires a provider, so an entry missing one is a 422 on save
          // rather than a field the server quietly ignores.
          [catalogField]: draft.map(({ base_url, model, note, provider }) => ({
            provider: provider || providerFor(base_url) || new URL(base_url).hostname,
            base_url,
            model,
            note: note ?? "",
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

  // Provider check results are shown on the key rows they belong to; anything
  // that does not match a known provider still gets rendered, just below.
  const probesByProvider = useMemo(() => {
    const map = new Map<string, ProbeResult>();
    for (const result of providerProbes ?? []) {
      if (result.provider) map.set(result.provider.toLowerCase(), result);
    }
    return map;
  }, [providerProbes]);

  const knownProviders = useMemo(
    () => new Set((bundle?.provider_keys ?? []).map((entry) => entry.provider.toLowerCase())),
    [bundle],
  );

  const unmatchedProbes = (providerProbes ?? []).filter(
    (result) => !result.provider || !knownProviders.has(result.provider.toLowerCase()),
  );

  const query = search.trim().toLowerCase();
  const visible = query
    ? draft.filter((entry) =>
        [entry.model, entry.base_url, entry.provider, entry.note]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(query)),
      )
    : draft;

  return (
    <>
      <PageHeader
        title="Models"
        description="Which LLMs the bot can use, and the provider keys that reach them."
        meta={
          <>
            <Badge tone="accent">{draft.length} models</Badge>
            {missingKeys.length > 0 && <Badge tone="warn">{missingKeys.length} key missing</Badge>}
            {isDirty && <Badge tone="warn">unsaved</Badge>}
          </>
        }
      />

      <AsyncBlock loading={loading && !bundle} error={error} onRetry={reload}>
        {bundle && (
          <>
            {/* Provider keys. The llm-check results land on these same rows
                rather than in a second block underneath. */}
            <Panel
              title={
                <span className="flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5 text-adm-mute" /> API keys
                </span>
              }
              description={
                allConfigured
                  ? `All ${bundle.provider_keys.length} provider keys set.`
                  : `${missingKeys.length} missing — ${missingKeys.map((k) => k.provider).join(", ")}. Models from those providers fail until a key is set.`
              }
              padded={false}
              actions={
                <Button size="sm" loading={checking} onClick={() => void runLlmCheck()}>
                  <Zap className="h-3.5 w-3.5" /> Check all
                </Button>
              }
            >
              <Rows>
                {bundle.provider_keys.map((entry) => (
                  <ProviderKeyRow
                    key={entry.provider}
                    entry={entry}
                    probe={probesByProvider.get(entry.provider.toLowerCase())}
                    onSaved={reload}
                  />
                ))}
              </Rows>

              {unmatchedProbes.length > 0 && (
                <div className="space-y-1.5 border-t border-adm-line px-5 py-3">
                  {unmatchedProbes.map((result, index) => (
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
                  {hasCatalog && draft.length > SEARCH_THRESHOLD && (
                    <SearchInput
                      value={search}
                      onChange={setSearch}
                      placeholder="Filter models…"
                      className="w-44"
                    />
                  )}
                  {hasCatalog && (
                    <Button
                      size="sm"
                      loading={probing !== null}
                      onClick={async () => {
                        for (const entry of draft) {
                          if (!probes[entry.key]) await probeEntry(entry);
                        }
                      }}
                    >
                      <Zap className="h-3.5 w-3.5" /> Test all
                    </Button>
                  )}
                  <Button size="sm" onClick={() => setAddModalOpen(true)} disabled={draft.length >= MODEL_CATALOG_LIMIT}>
                    <Plus className="h-3.5 w-3.5" /> Add
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
                <EmptyState
                  icon={<Wrench className="h-5 w-5" />}
                  title="No models configured yet"
                  hint="Add a preset from your provider, or enter a custom endpoint."
                  action={
                    <Button variant="primary" onClick={() => setAddModalOpen(true)}>
                      <Plus className="h-3.5 w-3.5" /> Add your first model
                    </Button>
                  }
                />
              )}

              {hasCatalog && visible.length === 0 && (
                <EmptyState title="No models match that filter." hint={`Searching ${draft.length} entries.`} />
              )}

              {hasCatalog && visible.length > 0 && (
                // The endpoint sits under the model name rather than in its own
                // column: it is long, rarely scanned, and cost one full column.
                <Table
                  head={
                    <>
                      <Th>Model</Th>
                      <Th>Pricing / 1M</Th>
                      <Th>Status</Th>
                      <Th align="right" />
                    </>
                  }
                >
                  {visible.map((entry) => {
                    const pricing = pricingFor(entry);
                    const configured = keyConfiguredFor(entry);
                    const probe = probes[entry.key];
                    return (
                      <Tr key={entry.key}>
                        <Td>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-xs text-adm-text">{entry.model}</span>
                            {entry.provider && <Badge>{entry.provider}</Badge>}
                            {configured === false && <Badge tone="warn">key missing</Badge>}
                          </div>
                          <p className="mt-0.5 truncate font-mono text-[11px] text-adm-mute" title={entry.base_url}>
                            {entry.base_url}
                            {entry.note ? ` · ${entry.note}` : ""}
                          </p>
                        </Td>
                        <Td className="adm-nums whitespace-nowrap">
                          {pricing ? (
                            <>
                              in {formatUsd(pricing.in)} / out {formatUsd(pricing.out)}
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
                              Test
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
          </>
        )}
      </AsyncBlock>

      {addModalOpen && (
        <AddModelModal
          bundle={bundle}
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

/**
 * One form for both paths: the dropdown lists every preset the providers offer,
 * and "Other model…" reveals a provider + model-id pair for anything newer than
 * the preset list. The optional probe runs before the entry reaches the draft,
 * so an unreachable model is caught here rather than after a save.
 */
function AddModelModal({
  bundle,
  onAdd,
  onClose,
}: {
  bundle: AdminConfigBundle | null;
  onAdd: (candidate: { base_url: string; model: string; note?: string | null }) => string | null;
  onClose: () => void;
}) {
  // Default to the first preset when there is one; otherwise open on the custom
  // branch, which is the only way to add anything at all.
  const [choice, setChoice] = useState<ModelChoice | null>(() => {
    const preset = flattenPresets(bundle)[0];
    return preset ? { model: preset.model, base_url: preset.base_url } : { model: "", base_url: "" };
  });
  const [error, setError] = useState<string | null>(null);
  const [probe, setProbe] = useState<ProbeResult | null>(null);
  const [probing, setProbing] = useState(false);

  const ready = choice !== null && isChoiceReady(choice);

  const runProbe = async () => {
    if (!choice || !ready) return;
    setProbing(true);
    setProbe(null);
    try {
      setProbe(await system.llmProbe({ base_url: choice.base_url.trim(), model: choice.model.trim() }));
    } catch (err) {
      setProbe({ ok: false, error: err instanceof Error ? err.message : "Probe failed." });
    } finally {
      setProbing(false);
    }
  };

  const handleAdd = () => {
    if (!choice || !ready) return;
    setError(null);
    const err = onAdd({
      base_url: choice.base_url.trim(),
      model: choice.model.trim(),
      note: choice.note ?? null,
    });
    if (err) setError(err);
  };

  return (
    <Modal
      title="Add a model"
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" variant="primary" disabled={!ready} onClick={handleAdd}>
            <Plus className="h-3.5 w-3.5" /> Add to catalog
          </Button>
        </>
      }
    >
      <ModelPicker
        bundle={bundle}
        value={choice}
        onChange={(next) => {
          setChoice(next);
          setProbe(null);
        }}
        label="Model"
        hint="Pick a suggested model, or choose “Other model…” to enter any model id your provider offers."
        showNoteInput
      />

      <div className="flex flex-wrap items-center gap-3 border-t border-adm-line pt-4">
        <Button size="sm" loading={probing} disabled={!ready} onClick={() => void runProbe()}>
          <Zap className="h-3.5 w-3.5" /> Test connection
        </Button>
        {probe ? (
          <ProbeSummary result={probe} />
        ) : (
          <span className="text-xs text-adm-mute">Optional — confirms the endpoint answers before you add it.</span>
        )}
      </div>

      {error && <Alert onDismiss={() => setError(null)}>{error}</Alert>}
    </Modal>
  );
}
