"use client";

import React, { useState } from "react";
import { RefreshCw, RotateCcw, ThumbsUp, Trash2 } from "lucide-react";
import { useAdminResource } from "@/hooks/useAdminResource";
import { conversations, type ConversationDetail, type ConversationSummary } from "@/lib/chatbot-admin";
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

export function Conversations() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);

  const cursor = cursorStack[cursorStack.length - 1];

  const page = useAdminResource(
    () =>
      conversations.list({
        q: filters.q || undefined,
        channel: filters.channel || undefined,
        has_error: filters.hasError === "any" ? undefined : filters.hasError === "yes",
        cursor: cursor ?? undefined,
        limit: PAGE_SIZE,
      }),
    [filters.q, filters.channel, filters.hasError, cursor],
  );

  const [selected, setSelected] = useState<ConversationSummary | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ConversationSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const apply = (next: Filters) => {
    setDraft(next);
    setFilters(next);
    setCursorStack([null]);
  };

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
        actions={
          filters.q || filters.channel || filters.hasError !== "any" ? (
            <Button size="sm" variant="ghost" onClick={() => apply(EMPTY_FILTERS)}>
              Clear
            </Button>
          ) : undefined
        }
      >
        <form
          className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            apply(draft);
          }}
        >
          <div>
            <span className="mb-1.5 block text-xs font-medium text-adm-dim">Transcript search</span>
            <SearchInput
              value={draft.q}
              onChange={(value) => setDraft({ ...draft, q: value })}
              placeholder="Words in the transcript…"
            />
          </div>
          <Input
            label="Channel"
            value={draft.channel}
            placeholder="discord, web, …"
            onChange={(event) => setDraft({ ...draft, channel: event.target.value })}
          />
          <div>
            <span className="mb-1.5 block text-xs font-medium text-adm-dim">Errors</span>
            <div className="flex flex-wrap gap-1.5">
              {(["any", "yes", "no"] as const).map((option) => (
                <Chip
                  key={option}
                  active={draft.hasError === option}
                  onClick={() => setDraft({ ...draft, hasError: option })}
                >
                  {ERROR_LABELS[option]}
                </Chip>
              ))}
            </div>
          </div>
          <Button type="submit" variant="primary">
            Apply filters
          </Button>
        </form>
      </Panel>

      <Panel
        title="Sessions"
        padded={false}
        actions={
          <CursorPager
            page={cursorStack.length}
            hasPrevious={cursorStack.length > 1}
            hasNext={Boolean(page.data?.next_cursor)}
            loading={page.loading}
            onPrevious={() => setCursorStack((stack) => stack.slice(0, -1))}
            onNext={() => setCursorStack((stack) => [...stack, page.data?.next_cursor ?? null])}
          />
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
          <h3 className="mb-3 text-xs font-semibold tracking-wide text-adm-mute uppercase">Transcript</h3>
          {transcript.length === 0 ? (
            <p className="text-[13px] text-adm-mute">No messages recorded.</p>
          ) : (
            <div className="space-y-3">
              {transcript.map((message, index) => (
                <div
                  key={index}
                  className={`relative rounded-2xl border p-4 ${
                    message.role === "user"
                      ? "border-adm-line bg-adm-bg"
                      : "border-adm-accent/20 bg-gradient-to-br from-adm-accent/8 to-transparent"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <Badge tone={message.role === "user" ? "neutral" : "accent"}>{message.role}</Badge>
                    <span className="adm-nums text-[11px] text-adm-mute">{formatTimestamp(message.created_at)}</span>
                  </div>
                  <p className="break-words whitespace-pre-wrap text-[13px] text-adm-text">{message.content}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {runs.length > 0 && (
          <section>
            <h3 className="mb-3 text-xs font-semibold tracking-wide text-adm-mute uppercase">Runs</h3>
            <div className="space-y-2">
              {runs.map((row, index) => (
                <JsonBlock key={index} value={row} />
              ))}
            </div>
          </section>
        )}

        {feedbackRows.length > 0 && (
          <section>
            <h3 className="mb-3 text-xs font-semibold tracking-wide text-adm-mute uppercase">Recorded feedback</h3>
            <div className="space-y-2">
              {feedbackRows.map((row, index) => (
                <JsonBlock key={index} value={row} />
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
