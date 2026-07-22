// Single source of truth for backend endpoints.
//
// The backend serves two canonical prefixes, /api/website/* and /api/chatbot/*.
// It also still answers the retired /api/v1/* and /api/* paths as hidden
// aliases, but those exist to protect callers we do not control -- Discord's
// registered OAuth redirect URI and the payment provider's webhook URL. Our own
// frontend has no reason to be on that list, so everything here is canonical.
//
// Paths live in ENDPOINTS rather than at the call site because they were
// previously spread across four files and two near-identical checkout forks,
// which is why the last prefix change missed some of them.

export type ApiEnvironment = {
  apiBaseUrl: string;
  siteOrigin: string;
};

// 'auto'       : pick by hostname at runtime
// 'local'      : force local URLs (for local-only testing against a local backend)
// 'production' : force production URLs
type Mode = "auto" | "local" | "production";
// `as Mode` keeps the type widened: a plain annotated const narrows to its
// literal, which makes the branches below look like dead comparisons to tsc.
const MODE = "auto" as Mode;

/** Dev port of the backend. The host is not pinned -- see LOCAL_HOST_FALLBACK. */
const LOCAL_API_PORT = 8000;
const LOCAL_SITE_PORT = 3000;

// Used only when there is no window to read a hostname from (SSR/prerender).
// 127.0.0.1 rather than localhost: the backend binds v4, and localhost resolves
// to ::1 first on Windows, which fails to connect from Node.
const LOCAL_HOST_FALLBACK = "127.0.0.1";

const ENVIRONMENTS = {
  local: {
    apiBaseUrl: `http://${LOCAL_HOST_FALLBACK}:${LOCAL_API_PORT}`,
    siteOrigin: `http://${LOCAL_HOST_FALLBACK}:${LOCAL_SITE_PORT}`,
  },
  production: {
    apiBaseUrl: "https://api.harvestbot.app",
    siteOrigin: "https://harvestbot.app",
  },
} as const satisfies Record<string, ApiEnvironment>;

// Resolved at runtime, not build time. The site is a static export, so
// NEXT_PUBLIC_* is inlined when CI builds it -- an env-only switch would mean
// the deployed bundle could never be pointed at a local backend.
export const getEnv = (): ApiEnvironment => {
  const override = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (override) {
    return { apiBaseUrl: override.replace(/\/+$/, ""), siteOrigin: ENVIRONMENTS.production.siteOrigin };
  }
  if (typeof window === "undefined") {
    return MODE === "local" ? ENVIRONMENTS.local : ENVIRONMENTS.production;
  }
  const host = window.location.hostname;
  const isLoopback = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  if (MODE === "production" || (MODE === "auto" && !isLoopback)) {
    return ENVIRONMENTS.production;
  }

  // Local: keep the API on the *same hostname the page was loaded from*.
  //
  // The admin dashboard authenticates with an HttpOnly SameSite=Lax cookie, so
  // page and API must be same-site or the browser silently drops the cookie
  // from every credentialed request -- login returns 204 and everything after
  // it 401s. `localhost` and `127.0.0.1` are different sites even though they
  // resolve to the same interface, so pinning either one here breaks whichever
  // spelling the developer happens to type into the address bar. Ports are not
  // part of the site, so only the host has to match.
  //
  // In production the problem does not arise: harvestbot.app and
  // api.harvestbot.app share a registrable domain.
  const localHost = isLoopback ? host : LOCAL_HOST_FALLBACK;
  return {
    apiBaseUrl: `http://${localHost}:${LOCAL_API_PORT}`,
    siteOrigin: `http://${localHost}:${LOCAL_SITE_PORT}`,
  };
};

export const API_BASE = () => getEnv().apiBaseUrl;

export const apiUrl = (path: string) => `${getEnv().apiBaseUrl}${path}`;

export const ENDPOINTS = {
  // --- website: stats -----------------------------------------------------
  stats: "/api/website/stats",
  varsResources: "/api/website/vars/resources",

  // --- website: payments --------------------------------------------------
  paymentsUsdtToLtc: "/api/website/payments/USDTtoLTC",
  paymentsVerify: "/api/website/payments/verify",

  // --- website: discord OAuth + fulfilment ---------------------------------
  discordLogin: "/api/website/auth/discord/login",
  discordCallback: "/api/website/auth/discord/callback",
  paymentWebhook: "/api/website/payment/webhook",

  // --- admin: one session for every operator surface -----------------------
  // Canonical, and shared: the admin_session cookie minted here grants access
  // to both the website admin routes and the chatbot admin tree. The old
  // per-surface auth paths (/api/website/admin/auth/*, /api/v1/admin/auth/*)
  // have been removed from the backend; /api/chatbot/admin/auth/* survives only
  // as a legacy alias and is not targeted here. Paths hang off this base in
  // lib/admin-auth.ts.
  adminAuth: "/api/admin/auth",

  // --- website: operator surface (admin_session cookie) --------------------
  verifiedPayments: "/api/website/admin/verified_payments",

  // --- chatbot: admin console (admin_session cookie) -----------------------
  // Base of the tree only. The per-resource paths hang off it in
  // lib/chatbot-admin.ts, which owns that whole client.
  chatbotAdmin: "/api/chatbot/admin",

  // --- shared -------------------------------------------------------------
  health: "/api/health",
} as const;

// --- errors ----------------------------------------------------------------

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  /** Seconds to wait, when the backend rate limiter supplied one. */
  readonly retryAfter: number | null;

  constructor(status: number, body: unknown, retryAfter: number | null = null) {
    super(ApiError.messageFrom(status, body));
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.retryAfter = retryAfter;
  }

  get isRateLimited() {
    return this.status === 429;
  }

  // The backend has two error shapes: FastAPI's {detail} and the rate
  // limiter's {error, message, retry_after}. Both are unwrapped here so call
  // sites do not each grow their own guesswork.
  private static messageFrom(status: number, body: unknown): string {
    if (body && typeof body === "object") {
      const record = body as Record<string, unknown>;
      const detail = record.detail ?? record.message;
      if (typeof detail === "string" && detail.trim()) return detail;
    }
    return `HTTP ${status}`;
  }
}

const parseRetryAfter = (res: Response, body: unknown): number | null => {
  const header = Number(res.headers.get("Retry-After"));
  if (Number.isFinite(header) && header > 0) return header;
  if (body && typeof body === "object") {
    const value = Number((body as Record<string, unknown>).retry_after);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
};

/**
 * Fetch a canonical endpoint and parse JSON, throwing ApiError on non-2xx.
 *
 * Deliberately not used by the checkout flows: those inspect res.status
 * directly to treat a 409 "already verified" as success, and rewriting that
 * control flow does not belong in a path migration.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), init);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body, parseRetryAfter(res, body));
  return body as T;
}

// --- Discord OAuth ---------------------------------------------------------
// URL builders, not fetches: the callback URL is read by the page before any
// request is made, and the login URL is handed to the browser.

export const discordLoginUrl = () => new URL(apiUrl(ENDPOINTS.discordLogin));

export const discordCallbackUrl = (params: {
  code: string;
  redirectUri: string;
  returnUrl?: string;
}) => {
  const url = new URL(apiUrl(ENDPOINTS.discordCallback));
  url.searchParams.set("code", params.code);
  url.searchParams.set("redirect_uri", params.redirectUri);
  if (params.returnUrl) url.searchParams.set("return_url", params.returnUrl);
  return url;
};
