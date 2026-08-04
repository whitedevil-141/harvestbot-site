"use client";

import React, { useState } from "react";
import { Check, ChevronDown, ChevronRight, Copy, KeyRound, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useAdminResource } from "@/hooks/useAdminResource";
import { apiKeys, fieldErrorsFrom, type ApiKey, type ApiKeyCreated } from "@/lib/chatbot-admin";
import {
  Alert,
  AsyncBlock,
  Badge,
  Button,
  ConfirmDialog,
  CopyButton,
  EmptyState,
  IconButton,
  Input,
  Modal,
  Mono,
  PageHeader,
  Panel,
  Table,
  Td,
  Th,
  Tr,
  copyText,
  formatTimestamp,
  useToast,
} from "../ui";

export function ApiKeys() {
  const toast = useToast();
  const list = useAdminResource(() => apiKeys.list(), []);

  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<ApiKey | null>(null);
  const [revokePending, setRevokePending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const items = list.data?.items ?? [];
  const envKeys = list.data?.env_keys ?? 0;

  const revoke = async () => {
    if (!revoking) return;
    setRevokePending(true);
    setActionError(null);
    try {
      await apiKeys.revoke(revoking.name);
      toast.success(`Revoked ${revoking.name}.`);
      list.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not revoke that key.");
    } finally {
      setRevokePending(false);
      // Closed either way: the error banner sits on the page, behind the dialog.
      setRevoking(null);
    }
  };

  return (
    <>
      <PageHeader
        title="API keys"
        description="The keys callers send as X-API-Key to reach the chat endpoints. The secret is shown once, when the key is created — after that only its prefix is recoverable."
        meta={
          list.data ? (
            <Badge tone="accent">
              {items.length} {items.length === 1 ? "key" : "keys"}
            </Badge>
          ) : undefined
        }
        actions={
          <>
            <Button size="sm" loading={list.loading} onClick={list.refresh}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button size="sm" variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-3.5 w-3.5" /> New key
            </Button>
          </>
        }
      />

      {actionError && <Alert onDismiss={() => setActionError(null)}>{actionError}</Alert>}

      <UsageGuide />

      <Panel
        title={
          <span className="flex items-center gap-2">
            <KeyRound className="h-3.5 w-3.5 text-adm-mute" /> Issued keys
          </span>
        }
        description="Last used is written lazily and can trail real use by about a minute — a fresh “never used” on a key you just exercised is expected."
        padded={false}
        footer={
          envKeys > 0 ? (
            <p className="text-xs text-adm-mute">
              {envKeys} additional {envKeys === 1 ? "key" : "keys"} from the environment — set through{" "}
              <span className="font-mono text-adm-dim">API_KEYS</span>, so {envKeys === 1 ? "it is" : "they are"} not
              listed or revocable here.
            </p>
          ) : undefined
        }
      >
        <AsyncBlock loading={list.loading && !list.data} error={list.error} onRetry={list.refresh}>
          {items.length === 0 ? (
            <EmptyState
              icon={<KeyRound className="h-5 w-5" />}
              title="No API keys yet."
              hint="Issue one per caller — a key each means you can revoke one without cutting off the rest."
              action={
                <Button variant="primary" onClick={() => setCreating(true)}>
                  <Plus className="h-3.5 w-3.5" /> Create your first key
                </Button>
              }
            />
          ) : (
            <Table
              minWidth="min-w-[44rem]"
              head={
                <>
                  <Th>Name</Th>
                  <Th>Key</Th>
                  <Th>Created</Th>
                  <Th>Last used</Th>
                  <Th align="right" />
                </>
              }
            >
              {items.map((entry) => (
                <Tr key={entry.name}>
                  <Td className="text-adm-text">{entry.name}</Td>
                  <Td>
                    {/* The prefix is the only handle an operator has for matching a
                        row to a key someone is holding. */}
                    <Mono className="text-adm-text">{entry.key_prefix}…</Mono>
                  </Td>
                  <Td className="whitespace-nowrap">{formatTimestamp(entry.created_at)}</Td>
                  <Td className="whitespace-nowrap">
                    {entry.last_used_at ? formatTimestamp(entry.last_used_at) : <Badge>never used</Badge>}
                  </Td>
                  <Td className="text-right">
                    <IconButton label={`Revoke ${entry.name}`} danger onClick={() => setRevoking(entry)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                  </Td>
                </Tr>
              ))}
            </Table>
          )}
        </AsyncBlock>
      </Panel>

      {creating && <NewKeyModal onCreated={list.refresh} onClose={() => setCreating(false)} />}

      {revoking && (
        <ConfirmDialog
          title="Revoke this key?"
          confirmLabel="Revoke"
          pending={revokePending}
          onConfirm={() => void revoke()}
          onCancel={() => setRevoking(null)}
          body={
            <>
              <span className="font-mono text-adm-text">{revoking.name}</span> stops working immediately — anything
              still sending it starts getting 401s on the next request. This cannot be undone; a replacement is a new
              key with a new secret.
            </>
          }
        />
      )}
    </>
  );
}

/**
 * Create, then reveal. Both steps live in one component because the secret only
 * exists in the create response: holding it in the parent would mean a reveal
 * state reachable without a create having just happened.
 */
function NewKeyModal({ onCreated, onClose }: { onCreated: () => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [issued, setIssued] = useState<ApiKeyCreated | null>(null);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    setBanner(null);
    setFieldErrors({});
    try {
      setIssued(await apiKeys.create(trimmed));
      // Refresh behind the reveal, so the row is already there when it closes.
      onCreated();
    } catch (err) {
      const { fields, banner: message } = fieldErrorsFrom(err);
      setFieldErrors(fields);
      setBanner(message);
    } finally {
      setSaving(false);
    }
  };

  if (issued) {
    return (
      <Modal
        title="Key created"
        onClose={onClose}
        footer={
          <Button className="flex-1" variant="primary" onClick={onClose}>
            Done
          </Button>
        }
      >
        <Alert tone="warn">
          This is the only time the key is shown. Copy it now — it cannot be recovered, only replaced.
        </Alert>

        <div className="flex items-start gap-2 rounded-xl border border-adm-line bg-adm-bg p-3">
          <code className="min-w-0 flex-1 break-all font-mono text-xs leading-relaxed text-adm-text">
            {issued.api_key}
          </code>
          <CopyButton value={issued.api_key} label="Copy key" />
        </div>

        <p className="text-xs leading-relaxed text-adm-mute">
          Send it as the <span className="font-mono text-adm-dim">X-API-Key</span> header. Listed here as{" "}
          <span className="text-adm-dim">{issued.name}</span>.
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      title="New API key"
      onClose={onClose}
      footer={
        <>
          <Button className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" variant="primary" loading={saving} disabled={!name.trim()} onClick={() => void submit()}>
            <Plus className="h-3.5 w-3.5" /> Create key
          </Button>
        </>
      }
    >
      {banner && <Alert onDismiss={() => setBanner(null)}>{banner}</Alert>}

      <Input
        label="Name"
        value={name}
        placeholder="discord-bot"
        autoComplete="off"
        spellCheck={false}
        hint="How you'll recognise this caller later. The key itself is shown on the next screen."
        error={fieldErrors.name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") void submit();
        }}
      />
    </Modal>
  );
}

// ── Chatbot endpoint overview ────────────────────────────────────────

const CHATBOT_ENDPOINTS = [
  {
    method: "POST",
    path: "/api/chatbot/admin/playground/chat",
    description: "Send a message and get a reply. Creates or continues a conversation.",
    body: `{ "message": "string", "session_id": "string", "config_patch": "object (optional)", "reset_first": "boolean (optional)" }`,
    response: `{ "reply": "string | null", "error": "string | null", "latency_ms": "number", "total_tokens": "number", "iterations": "number", "model": "string", "fallback_used": "boolean", "tool_calls": "array" }`,
  },
  {
    method: "GET",
    path: "/api/chatbot/admin/conversations",
    description: "List chat conversations with cursor pagination.",
    query: `{ "q": "string (optional)", "channel": "string (optional)", "has_error": "boolean (optional)", "cursor": "string (optional)", "limit": "number (optional)" }`,
    response: `{ "items": "array", "next_cursor": "string | null" }`,
  },
  {
    method: "GET",
    path: "/api/chatbot/admin/conversations/{id}",
    description: "Get the full transcript and runs for one conversation.",
    response: `{ "id": "string", "transcript": "array", "runs": "array", "feedback": "array" }`,
  },
  {
    method: "POST",
    path: "/api/chatbot/admin/playground/reset",
    description: "Reset a conversation session by session_id.",
    query: `{ "session_id": "string" }`,
    response: "null",
  },
];

// The chatbot runs on its own backend now; these customer-facing endpoint docs
// point at it rather than the payments API. See lib/api.ts apiUrl() routing.
const BASE_URL = "https://chatbot.harvestbot.app";

function endpointMarkdown(ep: (typeof CHATBOT_ENDPOINTS)[number]) {
  return `### ${ep.method} ${BASE_URL}${ep.path}\n${ep.description}\n\n${ep.query ? `**Query:**\n\`\`\`json\n${ep.query}\n\`\`\`\n\n` : ""}${ep.body ? `**Body:**\n\`\`\`json\n${ep.body}\n\`\`\`\n\n` : ""}**Response:**\n\`\`\`json\n${ep.response}\n\`\`\``;
}

const ALL_ENDPOINTS_MARKDOWN = CHATBOT_ENDPOINTS.map(endpointMarkdown).join("\n\n---\n\n");

function UsageGuide() {
  const [open, setOpen] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const copyAll = async () => {
    await copyText(ALL_ENDPOINTS_MARKDOWN);
    setCopiedAll(true);
    window.setTimeout(() => setCopiedAll(false), 1800);
  };

  return (
    <Panel
      title={
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-sm font-semibold text-adm-text hover:text-adm-accent transition-colors"
        >
          {open ? <ChevronDown className="h-4 w-4 text-adm-mute" /> : <ChevronRight className="h-4 w-4 text-adm-mute" />}
          Chatbot endpoint overview
        </button>
      }
      description="Endpoints for sending and receiving chatbot messages"
      padded={false}
      actions={
        open ? (
          <Button size="sm" onClick={() => void copyAll()}>
            {copiedAll ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedAll ? "Copied" : "Copy all for LLMs"}
          </Button>
        ) : undefined
      }
    >
      {open && (
        <div className="space-y-4 p-5">
          <p className="text-[13px] text-adm-dim">
            Base URL: <code className="font-mono text-adm-text">{BASE_URL}</code>. Send{" "}
            <code className="font-mono text-adm-text">X-API-Key</code> on every request.
          </p>

          {CHATBOT_ENDPOINTS.map((ep) => (
            <section
              key={ep.path}
              className="rounded-xl border border-adm-line bg-adm-bg overflow-hidden"
            >
              <header className="flex items-center justify-between gap-4 border-b border-adm-line px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Badge tone={ep.method === "POST" ? "good" : "neutral"}>{ep.method}</Badge>
                  <code className="font-mono text-xs text-adm-text truncate">{ep.path}</code>
                </div>
                <CopyButton value={endpointMarkdown(ep)} label="Copy for LLMs" />
              </header>

              <div className="space-y-3 p-4 text-[13px] text-adm-dim">
                <p>{ep.description}</p>

                {ep.query && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-adm-mute">Query</p>
                    <pre className="adm-scroll overflow-x-auto rounded-lg border border-adm-line bg-adm-surface p-3 text-[11px] leading-relaxed">{ep.query}</pre>
                  </div>
                )}

                {ep.body && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-adm-mute">Body</p>
                    <pre className="adm-scroll overflow-x-auto rounded-lg border border-adm-line bg-adm-surface p-3 text-[11px] leading-relaxed">{ep.body}</pre>
                  </div>
                )}

                <div>
                  <p className="mb-1 text-xs font-medium text-adm-mute">Response</p>
                  <pre className="adm-scroll overflow-x-auto rounded-lg border border-adm-line bg-adm-surface p-3 text-[11px] leading-relaxed">{ep.response}</pre>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </Panel>
  );
}
