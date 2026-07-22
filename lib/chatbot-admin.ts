// Client for the chatbot admin tree at /api/chatbot/admin.
//
// Auth is not here: the whole dashboard shares one session, minted at
// /api/admin/auth/login and owned by lib/admin-auth.ts. This module only
// borrows that module's credentialed transport, so the cookie and the 401
// fallback behave identically across the payments and chatbot surfaces.
//
// Errors reuse ApiError from lib/api.ts; this module does not define a second
// error shape. The admin tree is exempt from the backend rate limiter, so
// callers may poll freely.

import { ApiError, ENDPOINTS, apiUrl } from "@/lib/api";
import { broadcastUnauthenticated, sessionFetch } from "@/lib/admin-auth";

const base = (path: string) => apiUrl(`${ENDPOINTS.chatbotAdmin}${path}`);

// --- transport -------------------------------------------------------------

type Query = Record<string, string | number | boolean | null | undefined>;

const withQuery = (path: string, query?: Query) => {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
};

/** Fetch a path inside the chatbot admin tree with the shared session cookie. */
const adminFetch = <T>(path: string, init?: RequestInit) =>
  sessionFetch<T>(`${ENDPOINTS.chatbotAdmin}${path}`, init);

const getJson = <T>(path: string, query?: Query) => adminFetch<T>(withQuery(path, query));

const postJson = <T>(path: string, payload?: unknown, query?: Query) =>
  adminFetch<T>(withQuery(path, query), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });

// --- shared types ----------------------------------------------------------

export type AnalyticsWindow = "1h" | "24h" | "7d" | "30d" | "90d";
export type AnalyticsMetric = "runs" | "tokens" | "cost" | "latency" | "errors";
export type AnalyticsBucket = "hour" | "day";

export const ANALYTICS_WINDOWS: AnalyticsWindow[] = ["1h", "24h", "7d", "30d", "90d"];
export const ANALYTICS_METRICS: AnalyticsMetric[] = ["runs", "tokens", "cost", "latency", "errors"];

export type Json = Record<string, unknown>;

// --- config ----------------------------------------------------------------

export type PricingEntry = { input?: number | null; output?: number | null } & Json;

export type ModelCatalogEntry = {
  /** "{base_url}|{model}" -- the round-trip identifier for pickers. */
  key: string;
  model: string;
  base_url: string;
  label?: string | null;
  provider?: string | null;
  pricing?: PricingEntry | null;
  key_configured?: boolean;
} & Json;

export type ModelCatalogGroup = { provider: string; entries: ModelCatalogEntry[] };

export type ModelPreset = {
  model: string;
  base_url: string;
  label?: string | null;
  provider?: string | null;
} & Json;

export type ProviderKey = { provider: string; env: string; configured: boolean };

export type AdminConfigBundle = {
  version: number;
  config: Json;
  defaults: Json;
  editable_fields: string[];
  available_tools: string[];
  default_system_prompt: string;
  /** USD per 1M tokens, keyed by model. */
  known_pricing: Record<string, PricingEntry>;
  model_presets: ModelPreset[];
  model_catalog: ModelCatalogGroup[];
  provider_keys: ProviderKey[];
  /** Display-only. Never patchable -- render read-only. */
  locked: Json;
};

export type ConfigHistoryRow = {
  version: number;
  note?: string | null;
  created_at: string;
  is_active: boolean;
};

export type ConfigWriteResult = { version: number; config: Json };

export const config = {
  get: () => getJson<AdminConfigBundle>("/config"),
  /** Partial patch. 400 = non-editable key, 422 = validation failure. */
  put: (patch: Json, note?: string) =>
    adminFetch<ConfigWriteResult>("/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patch, note }),
    }),
  history: (limit = 50) => getJson<ConfigHistoryRow[]>("/config/history", { limit }),
  historyOne: (version: number) => getJson<ConfigHistoryRow>(`/config/history/${version}`),
  revert: (version: number, note?: string) =>
    postJson<ConfigWriteResult>("/config/revert", { version, note }),
  /** Same contract as /playground/chat, but against an unsaved draft. */
  test: (request: PlaygroundRequest) => postJson<PlaygroundResponse>("/config/test", request),
};

/** The catalog's round-trip identifier. */
export const modelKey = (baseUrl: string, model: string) => `${baseUrl}|${model}`;

export const parseModelKey = (key: string): { base_url: string; model: string } => {
  const index = key.indexOf("|");
  if (index === -1) return { base_url: "", model: key };
  return { base_url: key.slice(0, index), model: key.slice(index + 1) };
};

/** The catalog rejects anything that is not http(s); check before the PUT. */
export const isHttpUrl = (value: string) => /^https?:\/\/\S+$/i.test(value.trim());

export const MODEL_CATALOG_LIMIT = 200;

// --- analytics -------------------------------------------------------------

export type AnalyticsOverview = Json;
export type TimeseriesPoint = { bucket: string; value: number } & Json;
export type TimeseriesResponse = { metric: string; bucket: string; window: string; points: TimeseriesPoint[] } & Json;
export type BreakdownRow = { name?: string; count?: number } & Json;
export type ErrorRow = { message?: string; created_at?: string } & Json;

export const analytics = {
  overview: (window: AnalyticsWindow) => getJson<AnalyticsOverview>("/analytics/overview", { window }),
  timeseries: (metric: AnalyticsMetric, bucket: AnalyticsBucket, window: AnalyticsWindow) =>
    getJson<TimeseriesResponse>("/analytics/timeseries", { metric, bucket, window }),
  tools: (window: AnalyticsWindow) => getJson<BreakdownRow[]>("/analytics/tools", { window }),
  models: (window: AnalyticsWindow) => getJson<BreakdownRow[]>("/analytics/models", { window }),
  channels: (window: AnalyticsWindow) => getJson<BreakdownRow[]>("/analytics/channels", { window }),
  errors: (limit = 25) => getJson<ErrorRow[]>("/analytics/errors", { limit }),
};

// --- conversations ---------------------------------------------------------

export type ConversationSummary = {
  id: string;
  channel?: string | null;
  started_at?: string | null;
  updated_at?: string | null;
  message_count?: number | null;
  has_error?: boolean | null;
  preview?: string | null;
} & Json;

export type ConversationPage = { items: ConversationSummary[]; next_cursor: string | null };

export type TranscriptMessage = { role: string; content: string; created_at?: string | null } & Json;

export type ConversationDetail = {
  id: string;
  transcript?: TranscriptMessage[];
  runs?: Json[];
  feedback?: Json[];
} & Json;

export type ConversationFilters = {
  q?: string;
  channel?: string;
  has_error?: boolean;
  cursor?: string | null;
  limit?: number;
};

export const conversations = {
  /** Cursor pagination: carry every active filter into the next-page request. */
  list: (filters: ConversationFilters = {}) =>
    getJson<ConversationPage>("/conversations", {
      q: filters.q,
      channel: filters.channel,
      has_error: filters.has_error,
      cursor: filters.cursor,
      limit: filters.limit,
    }),
  get: (id: string) => getJson<ConversationDetail>(`/conversations/${encodeURIComponent(id)}`),
  remove: (id: string) =>
    adminFetch<null>(`/conversations/${encodeURIComponent(id)}`, { method: "DELETE" }),
  feedback: (id: string, payload: Json) =>
    postJson<Json>(`/conversations/${encodeURIComponent(id)}/feedback`, payload),
  reset: (id: string) => postJson<Json>(`/conversations/${encodeURIComponent(id)}/reset`),
};

// --- knowledge base --------------------------------------------------------
//
// Two layers that the UI must keep distinct: stored documents are the durable
// originals, vector chunks are the derived index.

export type KbSource = { source: string; chunks?: number; ingested_at?: string | null } & Json;

export type KbChunk = {
  id: string;
  source: string;
  chunk: number;
  ingested_at?: string | null;
  text: string;
  char_count: number;
};

export type KbStoredItem = {
  source: string;
  /** 240 chars, not the full body -- fetch storedRaw for that. */
  preview: string;
  char_count: number;
  chunk_count: number;
  updated_at?: string | null;
} & Json;

export type Paged<T> = { items: T[]; total: number; limit: number; offset: number };
export type KbStoredPage = Paged<KbStoredItem> & { store_enabled: boolean };

export type KbHit = {
  id: string;
  text: string;
  source: string;
  chunk: number;
  score: number;
  /** false = below the min_score floor. Render dimmed: it is the tuning signal. */
  used: boolean;
};

export type KbSearchResult = {
  query: string;
  top_k: number;
  min_score: number;
  hits: KbHit[];
  embedding_backend: string;
};

export type KbIngestResult = { source: string; chunks_indexed: number; total_chunks: number };
export type KbReindexResult = { reindexed: string[]; skipped: string[] };

/** The upload cap; checked client-side so an oversized file is not sent at all. */
export const KB_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

export const kb = {
  sources: () => getJson<KbSource[]>("/kb/sources"),
  documents: (params: { source?: string; limit?: number; offset?: number } = {}) =>
    getJson<Paged<KbChunk>>("/kb/documents", params),
  stored: (params: { limit?: number; offset?: number } = {}) =>
    getJson<KbStoredPage>("/kb/stored", params),
  /** text/plain, not JSON. The path param may contain slashes. */
  storedRaw: async (source: string) => {
    // Not sessionFetch: this endpoint answers text/plain and the raw body is
    // the point, so the response is read directly.
    const res = await fetch(base(`/kb/stored/${source.split("/").map(encodeURIComponent).join("/")}`), {
      credentials: "include",
    });
    if (!res.ok) {
      if (res.status === 401) broadcastUnauthenticated();
      throw new ApiError(res.status, await res.text().catch(() => null));
    }
    return res.text();
  },
  ingest: (payload: { text: string; source: string; metadata?: Json }) =>
    postJson<KbIngestResult>("/kb/ingest", payload),
  upload: (file: File, source?: string) => {
    // No Content-Type header: the browser has to set the multipart boundary.
    const form = new FormData();
    form.append("file", file);
    if (source) form.append("source", source);
    return adminFetch<KbIngestResult>("/kb/upload", { method: "POST", body: form });
  },
  search: (query: string, topK?: number) =>
    postJson<KbSearchResult>("/kb/search", { query, top_k: topK }),
  /** Skips sources that are already fresh unless `force`. Slow -- show pending. */
  reindex: (params: { source?: string; force?: boolean } = {}) =>
    postJson<KbReindexResult>("/kb/reindex", undefined, params),
  deleteDocuments: (ids: string[]) =>
    postJson<{ deleted: number; total_chunks: number }>("/kb/documents/delete", { ids }),
  deleteSource: (source: string) =>
    adminFetch<{ source: string; deleted_chunks: number; total_chunks: number }>(
      `/kb/sources/${source.split("/").map(encodeURIComponent).join("/")}`,
      { method: "DELETE" },
    ),
};

// --- playground ------------------------------------------------------------

export type PlaygroundRequest = {
  message: string;
  session_id: string;
  /** Runs the turn against an unsaved draft. This is "test before save". */
  config_patch?: Json;
  reset_first?: boolean;
};

export type PlaygroundToolCall = { tool: string; arguments?: Json };

export type PlaygroundResponse = {
  reply?: string | null;
  error?: string | null;
  latency_ms?: number | null;
  total_tokens?: number | null;
  iterations?: number | null;
  model?: string | null;
  fallback_used?: boolean | null;
  tool_calls?: PlaygroundToolCall[];
};

export const playground = {
  chat: (request: PlaygroundRequest) => postJson<PlaygroundResponse>("/playground/chat", request),
  reset: (sessionId = "playground") =>
    adminFetch<null>(withQuery("/playground/reset", { session_id: sessionId }), { method: "POST" }),
};

// --- system ----------------------------------------------------------------

export type SystemStatus = {
  status: string;
  environment?: string;
  uptime_seconds?: number;
  llm?: Json;
  knowledge_base?: ({ embedding_backend?: string; degraded?: boolean } & Json) | null;
  sessions?: Json;
  /** db_size_bytes is null on the Supabase backend -- render "n/a", not 0 B. */
  storage?: ({ db_size_bytes?: number | null } & Json) | null;
  recorder?: Json;
  config?: { active_version?: number; total_versions?: number } & Json;
  tools?: string[];
  enabled_tools?: string[];
} & Json;

export type SystemTool = {
  name: string;
  description?: string;
  parameters?: Json;
  enabled: boolean;
};

export type ToolCallingStatus = "ok" | "salvaged" | "unsupported" | string;

export type ProbeResult = {
  provider?: string | null;
  model?: string | null;
  ok: boolean;
  /** 0 when the probe failed for a missing API key -- not a measured round-trip. */
  latency_ms?: number | null;
  reply?: string | null;
  tool_calling?: ToolCallingStatus | null;
  error?: string | null;
};

export const system = {
  status: () => getJson<SystemStatus>("/system/status"),
  tools: () => getJson<SystemTool[]>("/system/tools"),
  llmCheck: () => postJson<{ providers: ProbeResult[] }>("/system/llm-check"),
  /** Probes an arbitrary candidate before it is saved to the catalog. */
  llmProbe: (candidate: { base_url: string; model: string }) =>
    postJson<ProbeResult>("/system/llm-probe", candidate),
};

/**
 * A failed probe reports latency_ms: 0 when the provider key is missing. That
 * is a sentinel, not a measurement, so it must not render as "0 ms".
 */
export const probeLatency = (result: ProbeResult): string =>
  result.ok && result.latency_ms ? `${Math.round(result.latency_ms)} ms` : "—";
