"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Eraser, SendHorizonal, Sparkles, Terminal, User } from "lucide-react";
import { findModelFields, playground, type Json, type PlaygroundResponse } from "@/lib/chatbot-admin";
import {
  Badge,
  Button,
  CopyButton,
  EmptyState,
  KeyValueList,
  Panel,
  Spinner,
  formatNumber,
} from "../ui";
import { useConfigBundle } from "./ConfigContext";
import { ModelPicker, isChoiceReady, type ModelChoice } from "./ModelPicker";

type MessageMeta = {
  model?: string | null;
  latency_ms?: number | null;
  total_tokens?: number | null;
  iterations?: number | null;
  fallback_used?: boolean | null;
  tool_calls?: PlaygroundResponse["tool_calls"];
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: MessageMeta | null;
  error?: string | null;
};

const STARTERS = [
  "What can you help me with?",
  "How do I install the bot?",
  "What are the pricing plans?",
  "My key is not activating — what should I check?",
];

let msgIdCounter = 0;
const nextId = () => `msg_${++msgIdCounter}_${Date.now()}`;
const newSessionId = () => `playground_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const metaOf = (res: PlaygroundResponse): MessageMeta => ({
  model: res.model,
  latency_ms: res.latency_ms,
  total_tokens: res.total_tokens,
  iterations: res.iterations,
  fallback_used: res.fallback_used,
  tool_calls: res.tool_calls,
});

export function Playground() {
  const { bundle } = useConfigBundle();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [sessionId, setSessionId] = useState(newSessionId);
  const [model, setModel] = useState<ModelChoice | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // The override rides on config_patch, so it only exists when the running
  // config actually exposes a model field to patch.
  const { modelField, baseUrlField } = useMemo(
    () => findModelFields(bundle?.editable_fields ?? []),
    [bundle],
  );
  const canOverride = Boolean(modelField);

  const configPatch = useMemo<Json | undefined>(() => {
    if (!model || !modelField || !isChoiceReady(model)) return undefined;
    return {
      [modelField]: model.model.trim(),
      ...(baseUrlField ? { [baseUrlField]: model.base_url.trim() } : {}),
    };
  }, [model, modelField, baseUrlField]);

  const scrollDown = () => {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  };

  const append = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
    scrollDown();
  }, []);

  const replaceLast = useCallback((msg: Message) => {
    setMessages((prev) => {
      const next = [...prev];
      next[next.length - 1] = msg;
      return next;
    });
    scrollDown();
  }, []);

  // Grow with the content instead of scrolling a one-line box, capped so the
  // composer can never crowd out the transcript.
  const resizeInput = useCallback(() => {
    const node = inputRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 176)}px`;
  }, []);

  useEffect(resizeInput, [input, resizeInput]);

  const blocked = model !== null && !isChoiceReady(model);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || pending || blocked) return;
    setInput("");

    append({ id: nextId(), role: "user", content: text });

    const assistantId = nextId();
    append({ id: assistantId, role: "assistant", content: "", meta: null });
    setPending(true);

    try {
      const res: PlaygroundResponse = await playground.chat({
        message: text,
        session_id: sessionId,
        config_patch: configPatch,
      });

      replaceLast({
        id: assistantId,
        role: "assistant",
        content: res.error ? res.error : res.reply ?? "(empty reply)",
        error: res.error ?? null,
        meta: metaOf(res),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      replaceLast({ id: assistantId, role: "assistant", content: message, error: message });
    } finally {
      setPending(false);
    }
  }, [input, pending, blocked, sessionId, configPatch, append, replaceLast]);

  const handleReset = useCallback(async () => {
    setResetting(true);
    try {
      await playground.reset(sessionId);
    } catch {
      // A failed reset still ends this session client-side: the new id below
      // means nothing from the old one can leak into the next turn.
    } finally {
      setSessionId(newSessionId());
      setMessages([]);
      setResetting(false);
    }
  }, [sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const applyStarter = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const lastRun = [...messages].reverse().find((msg) => msg.role === "assistant" && msg.meta);

  return (
    // The viewport lock only applies once the rail sits beside the chat. Below
    // lg the two stack, so a fixed height would split it between them instead
    // of giving the transcript the screen.
    <div className="grid grid-cols-1 gap-4 lg:h-[calc(100dvh-4rem)] lg:min-h-[32rem] lg:grid-cols-[minmax(0,1fr)_20rem]">
      {/* Chat column */}
      <div className="flex h-[70dvh] min-h-[26rem] min-w-0 flex-col overflow-hidden rounded-2xl border border-adm-line bg-adm-surface lg:h-auto">
        <header className="flex items-center justify-between gap-4 border-b border-adm-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-adm-text">Playground</h2>
            <p className="mt-0.5 truncate text-xs text-adm-mute">
              Session <span className="font-mono text-adm-dim">{sessionId}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge tone={model ? "accent" : "neutral"}>{model?.model?.trim() || "active config"}</Badge>
            <Button size="sm" variant="ghost" onClick={() => void handleReset()} loading={resetting}>
              <Eraser className="h-3.5 w-3.5" /> New session
            </Button>
          </div>
        </header>

        <div ref={listRef} className="adm-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center">
              <EmptyState
                icon={<Terminal className="h-5 w-5" />}
                title="Send a message to start testing"
                hint="Messages persist across turns until you start a new session. Pick a model on the right to test one endpoint without changing the saved config."
              />
              <div className="flex flex-wrap justify-center gap-2 px-5">
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => applyStarter(starter)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-adm-line bg-adm-bg px-3 py-1.5 text-xs text-adm-dim transition-all duration-200 hover:border-adm-line-strong hover:text-adm-text"
                  >
                    <Sparkles className="h-3 w-3 text-adm-mute" />
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className="adm-enter group flex gap-3">
              <div
                className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                  msg.role === "user"
                    ? "border border-adm-line bg-adm-surface-2 text-adm-dim"
                    : "bg-adm-accent-dim text-adm-accent"
                }`}
              >
                {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="text-xs font-medium text-adm-dim">
                    {msg.role === "user" ? "You" : "Assistant"}
                  </span>
                  {msg.content && (
                    <span className="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                      <CopyButton value={msg.content} label="Copy message" />
                    </span>
                  )}
                </div>

                {msg.content ? (
                  <div
                    className={`break-words whitespace-pre-wrap rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                      msg.role === "user"
                        ? "border border-adm-line bg-adm-bg text-adm-text"
                        : msg.error
                          ? "border border-adm-bad/30 bg-adm-bad-dim text-adm-bad"
                          : "border border-adm-accent/15 bg-gradient-to-br from-adm-accent/[0.06] to-transparent text-adm-text"
                    }`}
                  >
                    {msg.content}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-2xl border border-adm-line bg-adm-bg px-4 py-3">
                    <Spinner className="h-4 w-4" />
                    <span className="text-[13px] text-adm-mute">Thinking&hellip;</span>
                  </div>
                )}

                {msg.meta && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-adm-mute">
                    {msg.meta.model && <span className="font-mono">{msg.meta.model}</span>}
                    {typeof msg.meta.latency_ms === "number" && (
                      <span className="adm-nums">{formatNumber(msg.meta.latency_ms)} ms</span>
                    )}
                    {typeof msg.meta.total_tokens === "number" && (
                      <span className="adm-nums">{formatNumber(msg.meta.total_tokens)} tokens</span>
                    )}
                    {msg.meta.fallback_used && <Badge tone="warn">fallback</Badge>}
                  </div>
                )}

                {msg.meta?.tool_calls && msg.meta.tool_calls.length > 0 && (
                  <details className="mt-2 rounded-xl border border-adm-line bg-adm-bg px-3 py-2">
                    <summary className="cursor-pointer text-[11px] text-adm-dim marker:text-adm-mute">
                      {msg.meta.tool_calls.length} tool call{msg.meta.tool_calls.length === 1 ? "" : "s"}
                    </summary>
                    <div className="mt-2 space-y-2">
                      {msg.meta.tool_calls.map((tc, idx) => (
                        <div key={idx} className="font-mono text-[11px] leading-relaxed text-adm-dim">
                          <span className="text-adm-accent">&#8627;</span>{" "}
                          <span className="font-semibold text-adm-text">{tc.tool}</span>
                          {tc.arguments && (
                            <pre className="adm-scroll mt-1 overflow-x-auto text-[10px] text-adm-mute">
                              {JSON.stringify(tc.arguments, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="shrink-0 border-t border-adm-line px-5 py-4">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message…"
              rows={1}
              disabled={pending}
              className="adm-scroll min-h-[44px] flex-1 resize-none rounded-xl border border-adm-line bg-adm-bg/80 px-4 py-3 text-[13px] text-adm-text placeholder:text-adm-mute outline-none transition-all duration-200 hover:border-adm-line-strong focus:border-adm-line-focus focus:ring-2 focus:ring-adm-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Button
              variant="primary"
              onClick={() => void send()}
              disabled={!input.trim() || pending || blocked}
              loading={pending}
              className="h-11 px-4"
              aria-label="Send message"
            >
              <SendHorizonal className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1.5 text-[11px] text-adm-mute">
            {blocked
              ? "Finish the custom endpoint on the right before sending."
              : "Enter to send · Shift+Enter for a newline"}
          </p>
        </div>
      </div>

      {/* Settings rail */}
      <div className="adm-scroll min-h-0 space-y-4 overflow-y-auto lg:pb-1">
        <Panel title="Model">
          {canOverride ? (
            <ModelPicker
              bundle={bundle}
              value={model}
              onChange={setModel}
              label={null}
              allowInherit
              hint={
                model
                  ? "This turn runs against the selected model only. Nothing is saved."
                  : "Runs against the saved config."
              }
            />
          ) : (
            <p className="text-[13px] text-adm-mute">
              The running config exposes no editable model field, so the playground always uses the active
              model.
            </p>
          )}
        </Panel>

        <Panel title="Last run">
          {lastRun?.meta ? (
            <KeyValueList
              items={[
                ["Model", lastRun.meta.model ?? "—"],
                [
                  "Latency",
                  typeof lastRun.meta.latency_ms === "number"
                    ? `${formatNumber(lastRun.meta.latency_ms)} ms`
                    : "—",
                ],
                [
                  "Tokens",
                  typeof lastRun.meta.total_tokens === "number"
                    ? formatNumber(lastRun.meta.total_tokens)
                    : "—",
                ],
                ["Iterations", typeof lastRun.meta.iterations === "number" ? lastRun.meta.iterations : "—"],
                ["Tool calls", lastRun.meta.tool_calls?.length ?? 0],
                [
                  "Fallback",
                  lastRun.meta.fallback_used ? <Badge tone="warn">used</Badge> : <span>no</span>,
                ],
              ]}
            />
          ) : (
            <p className="text-[13px] text-adm-mute">No runs in this session yet.</p>
          )}
        </Panel>

        <Panel title="Session">
          <div className="space-y-3">
            <p className="break-all font-mono text-[11px] text-adm-dim">{sessionId}</p>
            <p className="text-xs text-adm-mute">
              {messages.filter((m) => m.role === "user").length} message
              {messages.filter((m) => m.role === "user").length === 1 ? "" : "s"} sent
            </p>
            <Button size="sm" onClick={() => void handleReset()} loading={resetting}>
              <Eraser className="h-3.5 w-3.5" /> New session
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
