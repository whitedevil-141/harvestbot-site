"use client";

import React, { useCallback, useRef, useState } from "react";
import { Bot, Eraser, RefreshCw, SendHorizonal, Terminal, User } from "lucide-react";
import { playground, type PlaygroundResponse } from "@/lib/chatbot-admin";
import { Button, Spinner } from "../ui";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: {
    model?: string | null;
    latency_ms?: number | null;
    total_tokens?: number | null;
    iterations?: number | null;
    fallback_used?: boolean | null;
    tool_calls?: PlaygroundResponse["tool_calls"];
  } | null;
  error?: string | null;
};

let msgIdCounter = 0;
const nextId = () => `msg_${++msgIdCounter}_${Date.now()}`;

export function Playground() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [sessionId] = useState(() => `playground_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const listRef = useRef<HTMLDivElement>(null);

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

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || pending) return;
    setInput("");

    const userMsg: Message = { id: nextId(), role: "user", content: text };
    append(userMsg);

    const assistantId = nextId();
    const placeholder: Message = { id: assistantId, role: "assistant", content: "", meta: null };
    append(placeholder);
    setPending(true);

    try {
      const res: PlaygroundResponse = await playground.chat({
        message: text,
        session_id: sessionId,
      });

      if (res.error) {
        replaceLast({
          id: assistantId,
          role: "assistant",
          content: res.error,
          error: res.error,
          meta: {
            model: res.model,
            latency_ms: res.latency_ms,
            total_tokens: res.total_tokens,
            iterations: res.iterations,
            fallback_used: res.fallback_used,
            tool_calls: res.tool_calls,
          },
        });
      } else {
        replaceLast({
          id: assistantId,
          role: "assistant",
          content: res.reply ?? "(empty reply)",
          meta: {
            model: res.model,
            latency_ms: res.latency_ms,
            total_tokens: res.total_tokens,
            iterations: res.iterations,
            fallback_used: res.fallback_used,
            tool_calls: res.tool_calls,
          },
        });
      }
    } catch (err) {
      replaceLast({
        id: assistantId,
        role: "assistant",
        content: err instanceof Error ? err.message : "Request failed",
        error: err instanceof Error ? err.message : "Request failed",
      });
    } finally {
      setPending(false);
    }
  }, [input, pending, sessionId, append, replaceLast]);

  const handleReset = useCallback(async () => {
    setPending(true);
    try {
      await playground.reset(sessionId);
      setMessages([]);
    } catch {
      // fall through
    } finally {
      setPending(false);
    }
  }, [sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-adm-line bg-adm-surface">
      <header className="flex items-center justify-between gap-4 border-b border-adm-line px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-adm-text">Playground</h2>
          <p className="mt-0.5 text-xs text-adm-mute">
            Test the chatbot with any message. Session:{" "}
            <span className="font-mono text-adm-dim">{sessionId.slice(0, 28)}&hellip;</span>
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={handleReset} loading={pending}>
          <Eraser className="h-3.5 w-3.5" /> New session
        </Button>
      </header>

      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-adm-line bg-adm-surface-2 text-adm-mute">
              <Terminal className="h-5 w-5" />
            </div>
            <p className="text-[13px] font-medium text-adm-dim">Send a message to start testing</p>
            <p className="max-w-xs text-xs text-adm-mute">
              The playground uses the currently active config. Messages persist across turns until you reset the
              session.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`adm-enter flex gap-3 ${msg.role === "assistant" ? "" : ""}`}>
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
              <div className="mb-1 text-xs font-medium text-adm-dim">
                {msg.role === "user" ? "You" : "Assistant"}
              </div>

              {msg.content ? (
                <div
                  className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
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
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-adm-mute">
                  {msg.meta.model && (
                    <span>
                      Model: <span className="font-medium text-adm-dim">{msg.meta.model}</span>
                    </span>
                  )}
                  {typeof msg.meta.latency_ms === "number" && (
                    <span>
                      Latency: <span className="adm-nums font-medium text-adm-dim">{msg.meta.latency_ms} ms</span>
                    </span>
                  )}
                  {typeof msg.meta.total_tokens === "number" && (
                    <span>
                      Tokens: <span className="adm-nums font-medium text-adm-dim">{msg.meta.total_tokens}</span>
                    </span>
                  )}
                  {typeof msg.meta.iterations === "number" && (
                    <span>
                      Iterations: <span className="adm-nums font-medium text-adm-dim">{msg.meta.iterations}</span>
                    </span>
                  )}
                  {msg.meta.fallback_used && (
                    <span className="rounded-full border border-adm-warn/20 bg-adm-warn-dim px-2 py-0.5 text-adm-warn">
                      Fallback used
                    </span>
                  )}
                </div>
              )}

              {msg.meta?.tool_calls && msg.meta.tool_calls.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {msg.meta.tool_calls.map((tc, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-adm-line bg-adm-bg px-3 py-2 font-mono text-[11px] leading-relaxed text-adm-dim"
                    >
                      <span className="text-adm-accent">&#8627; tool_call</span>{" "}
                      <span className="font-semibold text-adm-text">{tc.tool}</span>
                      {tc.arguments && (
                        <pre className="mt-1 overflow-x-auto text-[10px] text-adm-mute">
                          {JSON.stringify(tc.arguments, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-adm-line px-5 py-4">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
            rows={1}
            disabled={pending}
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-adm-line bg-adm-bg/80 px-4 py-3 text-[13px] text-adm-text placeholder:text-adm-mute outline-none transition-all duration-200 hover:border-adm-line-strong focus:border-adm-line-focus focus:ring-2 focus:ring-adm-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button
            variant="primary"
            onClick={send}
            disabled={!input.trim() || pending}
            loading={pending}
            className="h-auto self-end px-4"
            aria-label="Send message"
          >
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
