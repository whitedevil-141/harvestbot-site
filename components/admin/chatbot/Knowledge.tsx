"use client";

import React, { useRef, useState } from "react";
import { Database, FileText, RefreshCw, Search, Trash2, Upload } from "lucide-react";
import { useAdminResource } from "@/hooks/useAdminResource";
import { KB_UPLOAD_MAX_BYTES, kb, type KbSearchResult } from "@/lib/chatbot-admin";
import {
  Alert,
  AsyncBlock,
  Badge,
  Button,
  Checkbox,
  Chip,
  ConfirmDialog,
  Drawer,
  IconButton,
  Input,
  PageHeader,
  Pagination,
  Panel,
  Row,
  Rows,
  Spinner,
  Textarea,
  formatNumber,
  formatTimestamp,
  useToast,
} from "../ui";

const PAGE_SIZE = 25;

export function Knowledge() {
  const toast = useToast();
  const [storedOffset, setStoredOffset] = useState(0);
  const [chunkOffset, setChunkOffset] = useState(0);
  const [sourceFilter, setSourceFilter] = useState("");
  const [selectedChunks, setSelectedChunks] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<{ source: string; text: string } | null>(null);
  const [pendingSourceDelete, setPendingSourceDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const sources = useAdminResource(() => kb.sources(), []);
  const stored = useAdminResource(() => kb.stored({ limit: PAGE_SIZE, offset: storedOffset }), [storedOffset]);
  const chunks = useAdminResource(
    () => kb.documents({ source: sourceFilter || undefined, limit: PAGE_SIZE, offset: chunkOffset }),
    [sourceFilter, chunkOffset],
  );

  const refreshAll = () => {
    sources.refresh();
    stored.refresh();
    chunks.refresh();
  };

  const run = async (label: string, action: () => Promise<string | void>) => {
    setBusy(label);
    setActionError(null);
    try {
      const message = await action();
      if (message) toast.success(message);
      refreshAll();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(null);
    }
  };

  const toggleChunk = (id: string) =>
    setSelectedChunks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const reindexing = busy === "reindex" || busy === "reindex-force";

  return (
    <>
      <PageHeader
        title="Knowledge"
        description="Stored documents are the durable originals. Vector chunks are the derived index the retriever actually searches — deleting chunks does not delete the document."
        meta={stored.data && !stored.data.store_enabled ? <Badge tone="warn">document store disabled</Badge> : undefined}
        actions={
          <Button size="sm" onClick={refreshAll} loading={stored.loading}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        }
      />

      {actionError && <Alert onDismiss={() => setActionError(null)}>{actionError}</Alert>}

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <IngestPanel busy={busy} onRun={run} />
        <SearchPanel />
      </div>

      <Panel
        title={
          <span className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-adm-mute" /> Stored documents
          </span>
        }
        description="The originals, with a 240-character preview."
        padded={false}
        footer={
          stored.data ? (
            <Pagination
              total={stored.data.total}
              limit={stored.data.limit || PAGE_SIZE}
              offset={stored.data.offset || 0}
              onOffset={setStoredOffset}
              noun="documents"
            />
          ) : undefined
        }
      >
        <AsyncBlock
          loading={stored.loading && !stored.data}
          error={stored.error}
          onRetry={stored.refresh}
          isEmpty={(stored.data?.items ?? []).length === 0}
          emptyTitle="No stored documents."
        >
          <Rows>
            {(stored.data?.items ?? []).map((item) => (
              <Row key={item.source} className="group">
                <button
                  className="min-w-0 flex-1 text-left outline-none"
                  disabled={busy === `view:${item.source}`}
                  onClick={() =>
                    void run(`view:${item.source}`, async () => {
                      const text = await kb.storedRaw(item.source);
                      setViewing({ source: item.source, text });
                    })
                  }
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="break-all font-mono text-xs text-adm-text group-hover:text-adm-accent">
                      {item.source}
                    </span>
                    <Badge>{formatNumber(item.chunk_count)} chunks</Badge>
                    <Badge>{formatNumber(item.char_count)} chars</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[13px] text-adm-dim">{item.preview}</p>
                  <p className="adm-nums mt-1 text-xs text-adm-mute">{formatTimestamp(item.updated_at)}</p>
                </button>
                <IconButton
                  label="Delete this source and its chunks"
                  danger
                  onClick={() => setPendingSourceDelete(item.source)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </Row>
            ))}
          </Rows>
        </AsyncBlock>
      </Panel>

      <Panel
        title={
          <span className="flex items-center gap-2">
            <Database className="h-3.5 w-3.5 text-adm-mute" /> Vector chunks
          </span>
        }
        description="The derived index."
        actions={
          <>
            <Button
              size="sm"
              loading={busy === "reindex"}
              onClick={() =>
                void run("reindex", async () => {
                  const result = await kb.reindex({ source: sourceFilter || undefined });
                  return `Reindexed ${result.reindexed.length}, skipped ${result.skipped.length} (already fresh).`;
                })
              }
            >
              Reindex
            </Button>
            <Button
              size="sm"
              loading={busy === "reindex-force"}
              onClick={() =>
                void run("reindex-force", async () => {
                  const result = await kb.reindex({ source: sourceFilter || undefined, force: true });
                  return `Force reindexed ${result.reindexed.length} sources.`;
                })
              }
            >
              Force reindex
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={selectedChunks.size === 0}
              loading={busy === "delete-chunks"}
              onClick={() =>
                void run("delete-chunks", async () => {
                  const result = await kb.deleteDocuments([...selectedChunks]);
                  setSelectedChunks(new Set());
                  return `Deleted ${result.deleted} chunks. ${formatNumber(result.total_chunks)} remain.`;
                })
              }
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete {selectedChunks.size || ""}
            </Button>
          </>
        }
        footer={
          chunks.data ? (
            <Pagination
              total={chunks.data.total}
              limit={chunks.data.limit || PAGE_SIZE}
              offset={chunks.data.offset || 0}
              onOffset={setChunkOffset}
              noun="chunks"
            />
          ) : undefined
        }
      >
        <div className="space-y-4">
          {reindexing && (
            <p className="flex items-center gap-2 text-[13px] text-adm-dim">
              <Spinner /> Reindexing rebuilds embeddings and can take a while. Leave this open.
            </p>
          )}

          <div className="flex flex-wrap gap-1.5">
            <Chip
              active={sourceFilter === ""}
              onClick={() => {
                setSourceFilter("");
                setChunkOffset(0);
              }}
            >
              All sources
            </Chip>
            {(sources.data ?? []).map((source) => (
              <Chip
                key={source.source}
                active={sourceFilter === source.source}
                count={typeof source.chunks === "number" ? source.chunks : undefined}
                onClick={() => {
                  setSourceFilter(source.source);
                  setChunkOffset(0);
                }}
              >
                {source.source}
              </Chip>
            ))}
          </div>

          <AsyncBlock
            loading={chunks.loading && !chunks.data}
            error={chunks.error}
            onRetry={chunks.refresh}
            isEmpty={(chunks.data?.items ?? []).length === 0}
            emptyTitle="No chunks indexed for this filter."
          >
            <ul className="space-y-2">
              {(chunks.data?.items ?? []).map((chunk) => {
                const selected = selectedChunks.has(chunk.id);
                return (
                  <li
                    key={chunk.id}
                    className={`rounded-xl border p-3 transition-colors duration-150 ${
                      selected ? "border-adm-accent/30 bg-adm-accent-dim" : "border-adm-line bg-adm-bg"
                    }`}
                  >
                    <label className="flex cursor-pointer items-start gap-3">
                      <Checkbox checked={selected} onChange={() => toggleChunk(chunk.id)} className="mt-1" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="break-all font-mono text-[11px] text-adm-dim">{chunk.source}</span>
                          <Badge>chunk {chunk.chunk}</Badge>
                          <Badge>{formatNumber(chunk.char_count)} chars</Badge>
                          <span className="adm-nums text-[11px] text-adm-mute">
                            {formatTimestamp(chunk.ingested_at)}
                          </span>
                        </span>
                        <span className="mt-1.5 block line-clamp-3 whitespace-pre-wrap text-[13px] text-adm-dim">
                          {chunk.text}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </AsyncBlock>
        </div>
      </Panel>

      {viewing && (
        <Drawer title={<span className="break-all font-mono">{viewing.source}</span>} onClose={() => setViewing(null)}>
          <pre className="break-words whitespace-pre-wrap text-[13px] leading-relaxed text-adm-dim">
            {viewing.text}
          </pre>
        </Drawer>
      )}

      {pendingSourceDelete && (
        <ConfirmDialog
          title="Delete source"
          body={
            <>
              This removes <span className="break-all font-mono text-adm-text">{pendingSourceDelete}</span> and every
              chunk derived from it.
            </>
          }
          pending={busy === "delete-source"}
          onCancel={() => setPendingSourceDelete(null)}
          onConfirm={() =>
            void run("delete-source", async () => {
              const result = await kb.deleteSource(pendingSourceDelete);
              setPendingSourceDelete(null);
              return `Deleted ${result.deleted_chunks} chunks from ${result.source}.`;
            })
          }
        />
      )}
    </>
  );
}

function IngestPanel({
  busy,
  onRun,
}: {
  busy: string | null;
  onRun: (label: string, action: () => Promise<string | void>) => Promise<void>;
}) {
  const [source, setSource] = useState("");
  const [text, setText] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadFile = (file: File) => {
    setFileError(null);
    if (file.size > KB_UPLOAD_MAX_BYTES) {
      setFileError(`"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB. The cap is 5 MB.`);
      return;
    }
    void onRun("upload", async () => {
      const result = await kb.upload(file, source.trim() || undefined);
      setSource("");
      if (fileRef.current) fileRef.current.value = "";
      return `Indexed ${result.chunks_indexed} chunks from ${result.source}. ${formatNumber(result.total_chunks)} total.`;
    });
  };

  return (
    <Panel title="Ingest" description="Paste text or upload a file. Both are chunked and embedded.">
      <div className="space-y-3">
        <Input
          label="Source name"
          value={source}
          placeholder="handbook.md — reused as the identifier for updates"
          onChange={(event) => setSource(event.target.value)}
        />
        <Textarea
          label="Text"
          rows={5}
          mono={false}
          value={text}
          placeholder="Paste the document body…"
          onChange={(event) => setText(event.target.value)}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            loading={busy === "ingest"}
            disabled={!text.trim() || !source.trim()}
            onClick={() =>
              void onRun("ingest", async () => {
                const result = await kb.ingest({ text: text.trim(), source: source.trim() });
                setText("");
                return `Indexed ${result.chunks_indexed} chunks into ${result.source}.`;
              })
            }
          >
            Ingest text
          </Button>

          <label
            className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-adm-line bg-adm-surface-2 px-3 text-[13px] font-medium text-adm-text transition-colors duration-150 hover:border-adm-line-strong ${
              busy === "upload" ? "pointer-events-none opacity-50" : ""
            }`}
          >
            {busy === "upload" ? <Spinner className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
            Upload file
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) uploadFile(file);
              }}
            />
          </label>

          <span className="text-xs text-adm-mute">Max 5 MB</span>
        </div>

        {busy === "upload" && (
          <p className="flex items-center gap-2 text-[13px] text-adm-dim">
            <Spinner /> Uploading and embedding — large files take a while.
          </p>
        )}
        {fileError && <Alert onDismiss={() => setFileError(null)}>{fileError}</Alert>}
      </div>
    </Panel>
  );
}

function SearchPanel() {
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<KbSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    if (!query.trim()) return;
    setRunning(true);
    setError(null);
    try {
      setResult(await kb.search(query.trim(), topK ? Number(topK) : undefined));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-adm-mute" /> Retrieval preview
        </span>
      }
      description="Dimmed hits scored below the min_score floor and were not passed to the model."
    >
      <div className="space-y-3">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void search();
          }}
        >
          <div className="flex-1">
            <Input
              label="Query"
              value={query}
              placeholder="What would a user ask?"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="w-full sm:w-24">
            <Input
              label="top_k"
              type="number"
              min="1"
              value={topK}
              placeholder="default"
              onChange={(event) => setTopK(event.target.value)}
            />
          </div>
          <Button type="submit" variant="primary" loading={running} disabled={!query.trim()}>
            Search
          </Button>
        </form>

        {error && <Alert onDismiss={() => setError(null)}>{error}</Alert>}

        {result && (
          <>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="accent">{result.embedding_backend}</Badge>
              <Badge>top_k {result.top_k}</Badge>
              <Badge>min_score {result.min_score}</Badge>
              <Badge>{result.hits.length} hits</Badge>
            </div>

            {result.hits.length === 0 ? (
              <p className="text-[13px] text-adm-mute">Nothing matched that query.</p>
            ) : (
              <ul className="space-y-2">
                {result.hits.map((hit) => (
                  <li
                    key={hit.id}
                    className={`rounded-xl border border-adm-line bg-adm-bg p-3 ${hit.used ? "" : "opacity-45"}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="break-all font-mono text-[11px] text-adm-dim">{hit.source}</span>
                      <Badge>chunk {hit.chunk}</Badge>
                      <Badge tone={hit.used ? "good" : "neutral"}>score {hit.score.toFixed(3)}</Badge>
                      {!hit.used && <Badge>below floor</Badge>}
                    </div>
                    <p className="mt-1.5 line-clamp-4 whitespace-pre-wrap text-[13px] text-adm-dim">{hit.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}
