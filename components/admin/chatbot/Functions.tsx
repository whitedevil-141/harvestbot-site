"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, Pencil, Plus, RotateCcw, Save, Trash2, Wrench } from "lucide-react";
import { useAdminResource } from "@/hooks/useAdminResource";
import {
  BUILTIN_FUNCTION_HINT,
  config as configApi,
  functions as functionsApi,
  type AdminFunction,
  type Json,
} from "@/lib/chatbot-admin";
import {
  Alert,
  AsyncBlock,
  Badge,
  Button,
  ConfirmDialog,
  IconButton,
  JsonBlock,
  Mono,
  PageHeader,
  Panel,
  Rows,
  SearchInput,
  StatGrid,
  StatTile,
  Toggle,
} from "../ui";
import { useConfigBundle } from "./ConfigContext";
import { FunctionEditor } from "./FunctionEditor";

/** The list only needs a search box once it stops fitting on screen. */
const SEARCH_THRESHOLD = 8;

/**
 * The config field holding the enabled list is server-driven, so it is located
 * by shape rather than hard-coded: a `*tool*` key whose value is an array *or
 * null*.
 *
 * Null is the load-bearing half. It is the default, and it means "every
 * registered function" rather than "no field here" -- requiring an array found
 * nothing on a stock config and left every switch on the page permanently
 * read-only. Scalars like `max_tool_iterations` still fail the test, which is
 * what the value check is for.
 */
const findToolsField = (editableFields: readonly string[], config: Json): string | null =>
  editableFields.find(
    (field) => /tool/i.test(field) && (Array.isArray(config[field]) || config[field] === null),
  ) ?? null;

/** Parameter names off a JSON-schema `parameters` block, required ones first. */
function paramNames(parameters: Json | undefined): { name: string; required: boolean }[] {
  const properties = parameters?.properties;
  if (!properties || typeof properties !== "object") return [];
  const required = new Set(Array.isArray(parameters?.required) ? (parameters.required as string[]) : []);
  return Object.keys(properties as Json)
    .map((name) => ({ name, required: required.has(name) }))
    .sort((a, b) => Number(b.required) - Number(a.required) || a.name.localeCompare(b.name));
}

export function Functions() {
  const { bundle, loading, error, reload } = useConfigBundle();
  const list = useAdminResource(() => functionsApi.list(), []);

  // null = untouched, so a reload keeps flowing through until the first
  // toggle. After that the draft owns the screen.
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedVersion, setSavedVersion] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // `editing` holds the function being edited; null with `creating` set is the
  // new-function form. Two states rather than one nullable, because "editing
  // nothing" and "creating" are different screens.
  const [editing, setEditing] = useState<AdminFunction | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AdminFunction | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const toolsField = useMemo(
    () => (bundle ? findToolsField(bundle.editable_fields, bundle.config) : null),
    [bundle],
  );

  const items = useMemo<AdminFunction[]>(() => list.data?.items ?? [], [list.data]);
  const names = useMemo(() => items.map((item) => item.name), [items]);

  const serverEnabled = useMemo(
    () => items.filter((item) => item.enabled).map((item) => item.name),
    [items],
  );

  const enabled = draft ?? serverEnabled;
  const enabledSet = useMemo(() => new Set(enabled), [enabled]);
  const isDirty = useMemo(
    () => JSON.stringify([...enabled].sort()) !== JSON.stringify([...serverEnabled].sort()),
    [enabled, serverEnabled],
  );

  const customCount = items.filter((item) => item.source === "custom").length;
  const broken = items.filter((item) => item.error);

  const toggle = (name: string, on: boolean) => {
    const next = new Set(enabledSet);
    if (on) next.add(name);
    else next.delete(name);
    // Written back in list order so the saved array stays stable rather than
    // reordering on every toggle.
    setDraft(names.filter((item) => next.has(item)));
  };

  const allEnabled = names.length > 0 && enabled.length === names.length;

  const refresh = () => {
    list.refresh();
    reload();
  };

  const save = async () => {
    if (!toolsField) return;
    setSaving(true);
    setSaveError(null);
    try {
      // "Everything on" is saved as null, not as an exhaustive list. The two
      // are identical today and diverge the moment a function is added: null
      // means "every registered function", so a new one arrives enabled, where
      // a frozen list would silently exclude it and there would be nothing on
      // this page to suggest why.
      const result = await configApi.put(
        { [toolsField]: allEnabled ? null : enabled },
        "Enabled functions update",
      );
      setSavedVersion(result.version);
      setDraft(null);
      refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save the enabled functions.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletePending(true);
    setSaveError(null);
    try {
      await functionsApi.remove(deleting.name);
      setDeleting(null);
      // The deleted name may still be in the draft; drop it rather than
      // saving a config that names a function which no longer exists.
      setDraft((prev) => (prev ? prev.filter((name) => name !== deleting.name) : prev));
      refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not delete the function.");
    } finally {
      setDeletePending(false);
    }
  };

  const query = search.trim().toLowerCase();
  const visible = query
    ? items.filter((item) =>
        [item.name, item.description, item.url].some((field) =>
          String(field ?? "").toLowerCase().includes(query),
        ),
      )
    : items;

  return (
    <>
      <PageHeader
        title="Functions"
        description="The tools the model may call mid-answer. Built-in ones come from the server's code; the rest call an endpoint you define here."
        meta={
          <>
            <Badge tone="accent">
              {enabled.length}/{names.length} on
            </Badge>
            {customCount > 0 && <Badge tone="neutral">{customCount} custom</Badge>}
            {isDirty && <Badge tone="warn">unsaved</Badge>}
            {savedVersion !== null && !isDirty && <Badge tone="good">saved as v{savedVersion}</Badge>}
          </>
        }
        actions={
          <>
            <Button size="sm" variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-3.5 w-3.5" /> New function
            </Button>
            <Button
              size="sm"
              disabled={allEnabled || !toolsField}
              onClick={() => setDraft(names)}
              title="Enable every registered function"
            >
              Enable all
            </Button>
            <Button size="sm" disabled={!isDirty} onClick={() => setDraft(null)}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
            <Button
              size="sm"
              variant="primary"
              loading={saving}
              disabled={!isDirty || !toolsField}
              onClick={() => void save()}
            >
              <Save className="h-3.5 w-3.5" /> Save
            </Button>
          </>
        }
      />

      {saveError && <Alert onDismiss={() => setSaveError(null)}>{saveError}</Alert>}

      {bundle && !toolsField && (
        <Alert tone="warn">
          This config exposes no editable list of tools, so the switches below are read-only. Functions
          can still be created and edited; every one of them is callable.
        </Alert>
      )}

      {broken.length > 0 && (
        <Alert tone="bad">
          {broken.map((item) => item.name).join(", ")} {broken.length === 1 ? "is" : "are"} stored but
          not loadable, so {broken.length === 1 ? "it cannot" : "they cannot"} be called. Edit{" "}
          {broken.length === 1 ? "it" : "them"} to fix: {broken[0].error}
        </Alert>
      )}

      <AsyncBlock
        loading={(loading || list.loading) && !bundle && !list.data}
        error={error ?? list.error}
        onRetry={refresh}
      >
        <StatGrid>
          <StatTile label="Functions" value={names.length} hint="Everything the model can see" />
          <StatTile label="Enabled" value={enabled.length} hint="Callable on the next turn" />
          <StatTile label="Custom" value={customCount} hint="Defined from this dashboard" />
          <StatTile
            label="Config field"
            value={toolsField ?? "—"}
            hint={bundle ? `Active config v${bundle.version}` : undefined}
          />
        </StatGrid>

        <Panel
          title={
            <span className="flex items-center gap-2">
              <Wrench className="h-3.5 w-3.5 text-adm-mute" /> Callable functions
            </span>
          }
          description="Each switch writes the enabled list straight into the active config."
          padded={false}
          actions={
            items.length > SEARCH_THRESHOLD ? (
              <SearchInput value={search} onChange={setSearch} placeholder="Search functions…" />
            ) : undefined
          }
        >
          <AsyncBlock
            loading={list.loading && !list.data}
            error={null}
            isEmpty={visible.length === 0}
            emptyTitle={query ? "No function matches that search." : "No functions registered."}
          >
            <Rows>
              {visible.map((item) => {
                const params = paramNames(item.parameters);
                const open = expanded === item.name;
                const isCustom = item.source === "custom";

                return (
                  <li key={item.name} className="px-5 py-3">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <Toggle
                          label={
                            <span className="flex items-center gap-2">
                              <span className="font-mono">{item.name}</span>
                              {!isCustom && (
                                <Badge tone="neutral" title={BUILTIN_FUNCTION_HINT}>
                                  built-in
                                </Badge>
                              )}
                              {item.error && <Badge tone="bad">not loaded</Badge>}
                            </span>
                          }
                          hint={item.description ?? "No description."}
                          checked={enabledSet.has(item.name)}
                          disabled={!toolsField}
                          onChange={(on) => toggle(item.name, on)}
                        />
                        {isCustom && item.url && (
                          <Mono className="mt-1 block text-xs text-adm-mute">
                            {item.method} {item.url}
                          </Mono>
                        )}
                      </div>

                      {params.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpanded(open ? null : item.name)}
                          aria-expanded={open}
                          className="mt-2 flex shrink-0 items-center gap-1 text-xs text-adm-mute transition-colors hover:text-adm-text"
                        >
                          {params.length} param{params.length === 1 ? "" : "s"}
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
                        </button>
                      )}

                      {/* Built-ins are Python classes: there is nothing here to
                          edit, and offering the button would only ever 404. */}
                      {isCustom && (
                        <div className="flex shrink-0 items-center gap-1">
                          <IconButton label={`Edit ${item.name}`} onClick={() => setEditing(item)}>
                            <Pencil className="h-4 w-4" />
                          </IconButton>
                          <IconButton danger label={`Delete ${item.name}`} onClick={() => setDeleting(item)}>
                            <Trash2 className="h-4 w-4" />
                          </IconButton>
                        </div>
                      )}
                    </div>

                    {params.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 pl-1">
                        {params.map((param) => (
                          <Badge key={param.name} tone={param.required ? "accent" : "neutral"}>
                            {param.name}
                            {param.required ? " *" : ""}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {open && item.parameters && (
                      <div className="mt-2">
                        <JsonBlock value={item.parameters} />
                      </div>
                    )}
                  </li>
                );
              })}
            </Rows>
          </AsyncBlock>
        </Panel>
      </AsyncBlock>

      {(creating || editing) && (
        <FunctionEditor
          existing={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            refresh();
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          body={
            <>
              The model will no longer be able to call it. Past conversations that used it keep their
              transcripts, but the function itself cannot be recovered — its definition is not
              versioned the way the config is.
            </>
          }
          pending={deletePending}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
