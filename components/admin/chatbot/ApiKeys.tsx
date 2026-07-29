"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, KeyRound, Plus, RefreshCw, Trash2 } from "lucide-react";
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

// ── Usage guide ─────────────────────────────────────────────────────────

function UsageGuide() {
  const [open, setOpen] = useState(false);

  return (
    <Panel
      title={
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-sm font-semibold text-adm-text hover:text-adm-accent transition-colors"
        >
          {open ? <ChevronDown className="h-4 w-4 text-adm-mute" /> : <ChevronRight className="h-4 w-4 text-adm-mute" />}
          Usage guide
        </button>
      }
      description="How API keys work, how callers use them, and best practices."
      padded={false}
    >
      {open && (
        <div className="space-y-6 p-5 text-[13px] leading-relaxed text-adm-dim">
          {/* 1. Overview */}
          <div className="space-y-2">
            <h3 className="font-semibold text-adm-text">What API keys are</h3>
            <p>
              API keys are <strong>inbound credentials</strong> that external services and scripts send to authenticate
              against the chatbot chat endpoints. Each key is a unique secret that identifies a specific caller.
            </p>
            <p>
              Keys listed here are stored in the database and can be created or revoked through this dashboard. The
              server also accepts keys set through the <code className="font-mono text-adm-dim">API_KEYS</code> environment
              variable &mdash; those are counted below but cannot be managed here.
            </p>
          </div>

          {/* 2. Creating a key */}
          <div className="space-y-2">
            <h3 className="font-semibold text-adm-text">Creating a key</h3>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Click <strong>New key</strong> in the top-right corner.</li>
              <li>Give it a descriptive name (e.g. <code className="font-mono text-adm-dim">discord-bot</code> or <code className="font-mono text-adm-dim">analytics-pipeline</code>).</li>
              <li>Click <strong>Create key</strong>.</li>
              <li><strong>Copy the secret immediately.</strong> It is shown only once &mdash; after you close the dialog it can never be retrieved again. If lost, revoke the key and create a replacement.</li>
            </ol>
          </div>

          {/* 3. Using the key */}
          <div className="space-y-2">
            <h3 className="font-semibold text-adm-text">Using the key</h3>
            <p>
              Callers send the key as the <code className="font-mono text-adm-dim">X-API-Key</code> HTTP header on every request to the chat endpoints:
            </p>
            <pre className="adm-scroll overflow-x-auto rounded-xl border border-adm-line bg-adm-bg p-3 text-[11px] leading-relaxed text-adm-dim">
{`curl https://api.harvestbot.app/api/chatbot/chat \\
  -H "X-API-Key: hb_abc123..." \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello", "session_id": "abc"}'`}
            </pre>
            <p>Or in JavaScript:</p>
            <pre className="adm-scroll overflow-x-auto rounded-xl border border-adm-line bg-adm-bg p-3 text-[11px] leading-relaxed text-adm-dim">
{`fetch("https://api.harvestbot.app/api/chatbot/chat", {
  method: "POST",
  headers: {
    "X-API-Key": "hb_abc123...",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ message: "Hello", session_id: "abc" }),
})`}</pre>
          </div>

          {/* 4. Best practices */}
          <div className="space-y-2">
            <h3 className="font-semibold text-adm-text">Best practices</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>One key per caller.</strong> If you have a Discord bot, a webhook, and a CI script, give each its own key. You can revoke one without affecting the others.</li>
              <li><strong>Use descriptive names.</strong> The name is how you identify a caller later. Include the environment (e.g. <code className="font-mono text-adm-dim">staging-slash-command</code> vs <code className="font-mono text-adm-dim">prod-slash-command</code>).</li>
              <li><strong>Rotate keys periodically.</strong> Create a new key, update your caller, then revoke the old one.</li>
              <li><strong>Store secrets safely.</strong> Use environment variables, secret managers, or vaults &mdash; never commit a key to version control.</li>
              <li><strong>Monitor last-used timestamps.</strong> A key that has never been used, or has not been used in a long time, may be a candidate for revocation.</li>
            </ul>
          </div>

          {/* 5. Revoking */}
          <div className="space-y-2">
            <h3 className="font-semibold text-adm-text">Revoking a key</h3>
            <p>
              Click the trash icon next to any key to revoke it. Revocation is <strong>immediate</strong>: any caller still
              sending that key starts receiving 401 responses on their next request. This cannot be undone.
            </p>
          </div>

          {/* 6. Environment keys */}
          <div className="space-y-2">
            <h3 className="font-semibold text-adm-text">Environment keys vs stored keys</h3>
            <p>
              Keys can come from two sources. Stored keys (shown in the table above) are managed through this dashboard
              and persist in the database. Environment keys are defined by the server operator via the{" "}
              <code className="font-mono text-adm-dim">API_KEYS</code> environment variable &mdash; they are counted in the
              footer but never listed or revocable here. Both types are accepted by the chat endpoints.
            </p>
          </div>
        </div>
      )}
    </Panel>
  );
}
