"use client";

import React, { useEffect, useState } from "react";
import { RefreshCw, RotateCcw, ThumbsUp, Trash2, X } from "lucide-react";
import { useAdminResource, useDebouncedValue } from "@/hooks/useAdminResource";
import {
  conversations,
  type ConversationDetail,
  type ConversationSummary,
  type Json,
} from "@/lib/chatbot-admin";
import {
  Alert,
  AsyncBlock,
  Badge,
  Button,
  Chip,
  ConfirmDialog,
  CopyButton,
  CursorPager,
  Drawer,
  IconButton,
  Input,
  JsonBlock,
  PageHeader,
  Panel,
  Row,
  Rows,
  SearchInput,
  Spinner,
  Textarea,
  formatNumber,
  formatTimestamp,
} from "../ui";

const PAGE_SIZE = 25;

type Filters = { q: string; channel: string; hasError: "any" | "yes" | "no" };

const EMPTY_FILTERS: Filters = { q: "", channel: "", hasError: "any" };

const ERROR_LABELS: Record<Filters["hasError"], string> = {
  any: "Any",
  yes: "With errors",
  no: "Clean",
};

/** Pull a display value out of a loosely-typed run/feedback row. */
const pick = (row: Json, keys: string[]): string | number | null => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value) return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
};

export function Conversations() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);

  // Text filters trail the keystrokes; the chips apply immediately.
  const q = useDebouncedValue(filters.q, 350);
  const channel = useDebouncedValue(filters.channel, 350);

  const cursor = cursorStack[cursorStack.length - 1];

  const page = useAdminResource(
    () =>
      conversations.list({
        q: q || undefined,
        channel: channel || undefined,
        has_error: filters.hasError === "any" ? undefined : filters.hasError === "yes",
        cursor: cursor ?? undefined,
        limit: PAGE_SIZE,
      }),
    [q, channel, filters.hasError, cursor],
  );

  const [selected, setSelected] = useState<ConversationSummary | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ConversationSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // A changed filter invalidates every cursor already on the stack.
  useEffect(() => {
    setCursorStack([null]);
  }, [q, channel, filters.hasError]);

  const activeFilters: { key: string; label: string; clear: () => void }[] = [
    ...(filters.q ? [{ key: "q", label: `“${filters.q}”`, clear: () => setFilters((f) => ({ ...f, q: "" })) }] : []),
    ...(filters.channel
      ? [
          {
            key: "channel",
            label: `channel: ${filters.channel}`,
            clear: () => setFilters((f) => ({ ...f, channel: "" })),
          },
        ]
      : []),
    ...(filters.hasError !== "any"
      ? [
          {
            key: "hasError",
            label: ERROR_LABELS[filters.hasError],
            clear: () => setFilters((f) => ({ ...f, hasError: "any" })),
          },
        ]
      : []),
  ];

  const remove = async (id: string) => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await conversations.remove(id);
      setPendingDelete(null);
      if (selected?.id === id) setSelected(null);
      page.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete that conversation.");
    } finally {
      setDeleting(false);
    }
  };

  const items = page.data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Conversations"
        description="Transcripts, runs and feedback. Filters are carried into every page request."
        actions={
          <Button size="sm" onClick={page.refresh} loading={page.loading}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        }
      />

      {deleteError && <Alert onDismiss={() => setDeleteError(null)}>{deleteError}</Alert>}

      <Panel
        title="Filters"
        description="Results update as you type."
        actions={
          activeFilters.length > 0 ? (
            <Button size="sm" variant="ghost" onClick={() => setFilters(EMPTY_FILTERS)}>
              Clear all
            </Button>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <span className="mb-1.5 block text-xs font-medium text-adm-dim">Transcript search</span>
            <SearchInput
              value={filters.q}
              onChange={(value) => setFilters((f) => ({ ...f, q: value }))}
              placeholder="Words in the transcript…"
            />
          </div>
          <Input
            label="Channel"
            value={filters.channel}
            placeholder="discord, web, …"
            onChange={(event) => setFilters((f) => ({ ...f, channel: event.target.value }))}
          />
          <div>
            <span className="mb-1.5 block text-xs font-medium text-adm-dim">Errors</span>
            <div className="flex flex-wrap gap-1.5">
              {(["any", "yes", "no"] as const).map((option) => (
                <Chip
                  key={option}
                  active={filters.hasError === option}
                  onClick={() => setFilters((f) => ({ ...f, hasError: option }))}
                >
                  {ERROR_LABELS[option]}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <Panel
        title="Sessions"
        padded={false}
        description={
          activeFilters.length > 0 ? `${activeFilters.length} filter${activeFilters.length === 1 ? "" : "s"} active` : undefined
        }
        actions={
          <>
            {activeFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={filter.clear}
                className="inline-flex max-w-[12rem] items-center gap-1.5 rounded-full border border-adm-accent/40 bg-adm-accent-dim px-2.5 py-1 text-xs text-adm-accent transition-colors hover:border-adm-accent/60"
              >
                <span className="truncate">{filter.label}</span>
                <X className="h-3 w-3 shrink-0" />
              </button>
            ))}
            <CursorPager
              page={cursorStack.length}
              hasPrevious={cursorStack.length > 1}
              hasNext={Boolean(page.data?.next_cursor)}
              loading={page.loading}
              onPrevious={() => setCursorStack((stack) => stack.slice(0, -1))}
              onNext={() => setCursorStack((stack) => [...stack, page.data?.next_cursor ?? null])}
            />
          </>
        }
      >
        <AsyncBlock
          loading={page.loading && !page.data}
          error={page.error}
          onRetry={page.refresh}
          isEmpty={items.length === 0}
          emptyTitle="No conversations match these filters."
        >
          <Rows>
            {items.map((item) => (
              <Row key={item.id} className="group">
                <button onClick={() => setSelected(item)} className="min-w-0 flex-1 text-left outline-none">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-adm-text group-hover:text-adm-accent">{item.id}</span>
                    {item.channel && <Badge>{item.channel}</Badge>}
                    {item.has_error && <Badge tone="bad">error</Badge>}
                    {typeof item.message_count === "number" && (
                      <span className="adm-nums text-xs text-adm-mute">{item.message_count} messages</span>
                    )}
                  </div>
                  {item.preview && <p className="mt-1 line-clamp-2 text-[13px] text-adm-dim">{item.preview}</p>}
                  <p className="adm-nums mt-1 text-xs text-adm-mute">
                    {formatTimestamp(item.updated_at ?? item.started_at)}
                  </p>
                </button>
                <div className="flex shrink-0 items-center">
                  <CopyButton value={item.id} label="Copy session id" />
                  <IconButton label="Delete conversation" danger onClick={() => setPendingDelete(item)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconButton>
                </div>
              </Row>
            ))}
          </Rows>
        </AsyncBlock>
      </Panel>

      {selected && (
        <ConversationDrawer
          summary={selected}
          onClose={() => setSelected(null)}
          onDeleted={() => {
            setSelected(null);
            page.refresh();
          }}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete conversation"
          body={
            <>
              This permanently removes <span className="font-mono text-adm-text">{pendingDelete.id}</span>, its
              transcript and its runs. It cannot be undone.
            </>
          }
          pending={deleting}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void remove(pendingDelete.id)}
        />
      )}
    </>
  );
}

/**
 * Runs and feedback are free-form JSON from the recorder, so the summary line is
 * built defensively from whichever keys happen to be present, with the full row
 * still one disclosure away.
 */
function RecordRow({ row, kind }: { row: Json; kind: "run" | "feedback" }) {
  const model = pick(row, ["model", "llm_model"]);
  const latency = pick(row, ["latency_ms", "duration_ms"]);
  const tokens = pick(row, ["total_tokens", "tokens"]);
  const rating = pick(row, ["rating", "score"]);
  const comment = pick(row, ["comment", "note", "message"]);
  const created = pick(row, ["created_at", "timestamp", "started_at"]);
  const error = pick(row, ["error", "error_message"]);

  return (
    <div className="rounded-xl border border-adm-line bg-adm-bg px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {kind === "feedback" && rating !== null && (
          <Badge tone={String(rating) === "positive" ? "good" : "warn"}>{rating}</Badge>
        )}
        {model !== null && <Badge tone="accent">{model}</Badge>}
        {latency !== null && <span className="adm-nums text-[11px] text-adm-mute">{formatNumber(latency)} ms</span>}
        {tokens !== null && <span className="adm-nums text-[11px] text-adm-mute">{formatNumber(tokens)} tokens</span>}
        {error !== null && <Badge tone="bad">error</Badge>}
        {created !== null && (
          <span className="adm-nums ml-auto text-[11px] text-adm-mute">{formatTimestamp(String(created))}</span>
        )}
      </div>

      {comment !== null && <p className="mt-2 break-words text-[13px] text-adm-dim">{comment}</p>}
      {error !== null && <p className="mt-2 break-words text-[13px] text-adm-bad">{error}</p>}

      <details className="mt-2">
        <summary className="cursor-pointer text-[11px] text-adm-mute marker:text-adm-mute hover:text-adm-dim">
          Raw
        </summary>
        <div className="mt-2">
          <JsonBlock value={row} />
        </div>
      </details>
    </div>
  );
}

function ConversationDrawer({
  summary,
  onClose,
  onDeleted,
}: {
  summary: ConversationSummary;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const detail = useAdminResource<ConversationDetail>(() => conversations.get(summary.id), [summary.id]);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState({ rating: "positive", comment: "" });

  const run = async (label: string, action: () => Promise<unknown>) => {
    setBusy(label);
    setActionError(null);
    try {
      await action();
      detail.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "That action failed.");
    } finally {
      setBusy(null);
    }
  };

  const transcript = detail.data?.transcript ?? [];
  const runs = detail.data?.runs ?? [];
  const feedbackRows = detail.data?.feedback ?? [];

  return (
    <Drawer
      title={<span className="font-mono">{summary.id}</span>}
      subtitle={
        <>
          {summary.channel && <Badge>{summary.channel}</Badge>}
          {summary.has_error && <Badge tone="bad">error</Badge>}
          <span className="adm-nums text-xs text-adm-mute">
            {formatTimestamp(summary.updated_at ?? summary.started_at)}
          </span>
          {detail.loading && detail.data && <Spinner className="h-3 w-3" />}
        </>
      }
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            loading={busy === "reset"}
            onClick={() => void run("reset", () => conversations.reset(summary.id))}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset session state
          </Button>
          <Button
            size="sm"
            variant="danger"
            loading={busy === "delete"}
            onClick={() =>
              void run("delete", async () => {
                await conversations.remove(summary.id);
                onDeleted();
              })
            }
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      }
    >
      {actionError && <Alert onDismiss={() => setActionError(null)}>{actionError}</Alert>}

      <AsyncBlock loading={detail.loading && !detail.data} error={detail.error} onRetry={detail.refresh}>
        <section>
          <h3 className="mb-3 text-xs font-semibold tracking-wide text-adm-mute uppercase">
            Transcript
            {transcript.length > 0 && <span className="ml-2 text-adm-dim normal-case">{transcript.length}</span>}
          </h3>
          {transcript.length === 0 ? (
            <p className="text-[13px] text-adm-mute">No messages recorded.</p>
          ) : (
            <div className="space-y-3">
              {transcript.map((message, index) => {
                const isUser = message.role === "user";
                return (
                  <div key={index} className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[11px] font-medium text-adm-dim">{message.role}</span>
                      <span className="adm-nums text-[11px] text-adm-mute">
                        {formatTimestamp(message.created_at)}
                      </span>
                    </div>
                    <div
                      className={`max-w-[85%] break-words whitespace-pre-wrap rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                        isUser
                          ? "border border-adm-line bg-adm-bg text-adm-text"
                          : "border border-adm-accent/15 bg-gradient-to-br from-adm-accent/[0.06] to-transparent text-adm-text"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {runs.length > 0 && (
          <section>
            <h3 className="mb-3 text-xs font-semibold tracking-wide text-adm-mute uppercase">Runs</h3>
            <div className="space-y-2">
              {runs.map((row, index) => (
                <RecordRow key={index} row={row} kind="run" />
              ))}
            </div>
          </section>
        )}

        {feedbackRows.length > 0 && (
          <section>
            <h3 className="mb-3 text-xs font-semibold tracking-wide text-adm-mute uppercase">Recorded feedback</h3>
            <div className="space-y-2">
              {feedbackRows.map((row, index) => (
                <RecordRow key={index} row={row} kind="feedback" />
              ))}
            </div>
          </section>
        )}
      </AsyncBlock>

      <section className="border-t border-adm-line pt-5">
        <h3 className="mb-3 text-xs font-semibold tracking-wide text-adm-mute uppercase">Leave feedback</h3>
        <div className="space-y-3">
          <div className="flex gap-1.5">
            {["positive", "negative"].map((rating) => (
              <Chip
                key={rating}
                active={feedback.rating === rating}
                onClick={() => setFeedback({ ...feedback, rating })}
              >
                {rating}
              </Chip>
            ))}
          </div>
          <Textarea
            rows={3}
            mono={false}
            value={feedback.comment}
            placeholder="What went right or wrong in this conversation?"
            onChange={(event) => setFeedback({ ...feedback, comment: event.target.value })}
          />
          <Button
            variant="primary"
            size="sm"
            loading={busy === "feedback"}
            disabled={!feedback.comment.trim()}
            onClick={() =>
              void run("feedback", async () => {
                await conversations.feedback(summary.id, {
                  rating: feedback.rating,
                  comment: feedback.comment.trim(),
                });
                setFeedback({ rating: "positive", comment: "" });
              })
            }
          >
            <ThumbsUp className="h-3.5 w-3.5" /> Submit feedback
          </Button>
        </div>
      </section>
    </Drawer>
  );
}
