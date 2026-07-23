"use client";

import React, { useMemo } from "react";
import {
  ALLOWED_LLM_HOSTS,
  flattenCatalog,
  flattenPresets,
  isAllowedLlmHost,
  modelKey,
  type AdminConfigBundle,
} from "@/lib/chatbot-admin";
import { Badge, Input, Select, type SelectItem } from "../ui";

export type ModelChoice = { model: string; base_url: string; note?: string | null };

/** Sentinels. Neither can collide with a real key, which is always "{url}|{model}". */
const CUSTOM = "__custom__";
const INHERIT = "__inherit__";

/**
 * The one model selector for the Playground, the Models add form and Tuning:
 * a dropdown of everything already known, plus an "Other model…" branch for a
 * model id the presets have not caught up with yet.
 *
 * That branch takes a provider and a model id, not a free-text URL. The server
 * only accepts endpoints on ALLOWED_LLM_HOSTS, so a URL field could offer
 * nothing except ways to fail validation -- while the model id genuinely is
 * open-ended, because a provider adding a model must not require a deploy of
 * either side to become selectable.
 *
 * `value` is the source of truth. A value that is not in the catalog selects the
 * custom branch with its fields prefilled, so a model id typed once survives a
 * re-render instead of snapping back to the first dropdown entry.
 */
export function ModelPicker({
  bundle,
  value,
  onChange,
  label = "Model",
  hint,
  allowInherit = false,
  inheritLabel = "Use active config",
  includePresets = true,
  disabled,
  showNoteInput = false,
  error,
}: {
  bundle: AdminConfigBundle | null;
  value: ModelChoice | null;
  onChange: (value: ModelChoice | null) => void;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  allowInherit?: boolean;
  inheritLabel?: string;
  includePresets?: boolean;
  disabled?: boolean;
  /** The Models add form also collects an operator note; other call sites do not. */
  showNoteInput?: boolean;
  error?: string | null;
}) {
  const catalog = useMemo(() => flattenCatalog(bundle), [bundle]);

  const presets = useMemo(() => {
    if (!includePresets) return [];
    const known = new Set(catalog.map((entry) => entry.key));
    return flattenPresets(bundle).filter((preset) => !known.has(preset.key));
  }, [bundle, catalog, includePresets]);

  /**
   * Every endpoint that can be selected, as {provider, base_url}. Taken from
   * whatever the server actually offered rather than hard-coded, so the two
   * sides cannot disagree about which URL belongs to a provider.
   */
  const providers = useMemo(() => {
    const byUrl = new Map<string, { provider: string; base_url: string }>();
    for (const entry of [...presets, ...catalog]) {
      if (!entry.base_url || byUrl.has(entry.base_url)) continue;
      byUrl.set(entry.base_url, {
        provider: entry.provider || entry.base_url,
        base_url: entry.base_url,
      });
    }
    return [...byUrl.values()];
  }, [catalog, presets]);

  const knownByKey = useMemo(() => {
    const map = new Map<string, ModelChoice & { key_configured?: boolean; provider?: string | null }>();
    for (const entry of catalog) map.set(entry.key, entry);
    for (const preset of presets) map.set(preset.key, preset);
    return map;
  }, [catalog, presets]);

  // A value only counts as "picked from the list" when it round-trips to a known
  // key; anything else is a custom model and must open the custom branch.
  const valueKey = value ? modelKey(value.base_url, value.model) : null;
  const isCustom = Boolean(value) && !knownByKey.has(valueKey ?? "");
  const selected = value === null ? (allowInherit ? INHERIT : CUSTOM) : isCustom ? CUSTOM : (valueKey as string);

  const options = useMemo<SelectItem[]>(() => {
    const items: SelectItem[] = [];
    if (allowInherit) items.push({ value: INHERIT, label: inheritLabel });

    const byProvider = new Map<string, { value: string; label: string }[]>();
    for (const entry of catalog) {
      const provider = entry.provider || "Other";
      const suffix = entry.note ? ` — ${entry.note}` : "";
      const list = byProvider.get(provider) ?? [];
      list.push({ value: entry.key, label: `${entry.model}${suffix}` });
      byProvider.set(provider, list);
    }
    for (const [provider, list] of byProvider) items.push({ label: provider, options: list });

    if (presets.length > 0) {
      items.push({
        label: "Presets (not yet in catalog)",
        options: presets.map((preset) => ({
          value: preset.key,
          label: `${preset.model} — ${preset.provider}`,
        })),
      });
    }

    items.push({ value: CUSTOM, label: "Other model…" });
    return items;
  }, [allowInherit, inheritLabel, catalog, presets]);

  const handleSelect = (next: string) => {
    if (next === INHERIT) return onChange(null);
    if (next === CUSTOM) {
      // Keep whatever was typed before; otherwise open on the first provider so
      // the branch is never in a state with no endpoint at all.
      if (isCustom && value) return onChange(value);
      return onChange({ model: "", base_url: providers[0]?.base_url ?? "" });
    }
    const entry = knownByKey.get(next);
    if (entry) onChange({ model: entry.model, base_url: entry.base_url, note: entry.note ?? null });
  };

  const chosen = !isCustom && valueKey ? knownByKey.get(valueKey) : null;
  const keyMissing = chosen?.key_configured === false;

  const hostError =
    isCustom && value && value.base_url && !isAllowedLlmHost(value.base_url)
      ? `Only ${ALLOWED_LLM_HOSTS.join(" and ")} endpoints are supported.`
      : null;

  return (
    <div className="space-y-2">
      <Select
        label={label}
        hint={hint}
        error={error}
        options={options}
        value={selected}
        disabled={disabled}
        onChange={(event) => handleSelect(event.target.value)}
      />

      {keyMissing && (
        <Badge tone="warn">key missing for {chosen?.provider ?? "this provider"}</Badge>
      )}

      {isCustom && value && (
        <div className="space-y-2 rounded-xl border border-adm-line bg-adm-bg/60 p-3">
          <Select
            label="Provider"
            value={value.base_url}
            disabled={disabled}
            error={hostError}
            options={providers.map((entry) => ({ value: entry.base_url, label: entry.provider }))}
            onChange={(event) => onChange({ ...value, base_url: event.target.value })}
          />
          <Input
            label="Model ID"
            value={value.model}
            placeholder="moonshotai/kimi-k2-instruct"
            disabled={disabled}
            onChange={(event) => onChange({ ...value, model: event.target.value })}
          />
          {showNoteInput && (
            <Input
              label="Note (optional)"
              value={value.note ?? ""}
              placeholder="e.g. free tier, best quality"
              disabled={disabled}
              onChange={(event) => onChange({ ...value, note: event.target.value || null })}
            />
          )}
          <p className="text-xs text-adm-mute">
            Any model id the provider offers works — it does not have to be in the list above.
          </p>
        </div>
      )}
    </div>
  );
}

/** True when a choice is complete enough to send. `null` means "inherit", which is always valid. */
export const isChoiceReady = (choice: ModelChoice | null): boolean =>
  choice === null || (Boolean(choice.model.trim()) && isAllowedLlmHost(choice.base_url));
