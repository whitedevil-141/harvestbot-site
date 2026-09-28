// The dashboard's payments session.
//
// One password mints a bearer token at /api/admin/auth/login. This module owns
// that session so every payments-admin request has the same notion of
// "signed in" and carries the same token.

import { ApiError, ENDPOINTS, apiUrl } from "@/lib/api";

// --- session token ---------------------------------------------------------
//
// The session is a bearer token minted at login and attached to every admin
// request. An in-memory copy is the source of truth for the tab; localStorage
// mirrors it so a reload stays signed in.

const TOKEN_KEY = "harvestbot:admin-token";

let memoryToken: string | null = null;

const getToken = (): string | null => {
  if (memoryToken) return memoryToken;
  if (typeof window === "undefined") return null;
  try {
    memoryToken = window.localStorage.getItem(TOKEN_KEY);
  } catch {
    memoryToken = null;
  }
  return memoryToken;
};

const setToken = (token: string) => {
  memoryToken = token;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage disabled (private mode); the token stays in memory for this tab */
  }
};

const clearToken = () => {
  memoryToken = null;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* nothing to clear */
  }
};

/** Authorization header for the stored token, or empty when signed out. */
export const authHeader = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// --- 401 broadcast ---------------------------------------------------------
//
// The cookie can expire mid-session, and a 401 from any admin endpoint means
// the whole dashboard has to fall back to the login card. Broadcasting it once
// here beats handling it in every screen.

const UNAUTHENTICATED_EVENT = "harvestbot:admin-unauthenticated";

/** Subscribe to session loss. Returns an unsubscribe function. */
export function onUnauthenticated(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = () => handler();
  window.addEventListener(UNAUTHENTICATED_EVENT, listener);
  return () => window.removeEventListener(UNAUTHENTICATED_EVENT, listener);
}

export const broadcastUnauthenticated = () => {
  clearToken();
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(UNAUTHENTICATED_EVENT));
};

// --- transport -------------------------------------------------------------

/**
 * Fetch an admin path with the bearer token attached. Returns parsed JSON,
 * or null for 204.
 *
 * `skipAuthBroadcast` exists for the login call, where a 401 means "wrong
 * password" and must not be mistaken for an expired session.
 */
export async function sessionFetch<T>(
  path: string,
  init: RequestInit & { skipAuthBroadcast?: boolean } = {},
): Promise<T> {
  const { skipAuthBroadcast, ...rest } = init;
  // Attach the bearer token. Headers() normalises whatever shape the caller
  // passed (object/array/Headers) and preserves things like Content-Type, or
  // the absent Content-Type a FormData upload needs for its own boundary.
  const headers = new Headers(rest.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(apiUrl(path), { ...rest, headers });

  if (res.status === 204) return null as T;

  const isJson = res.headers.get("Content-Type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && !skipAuthBroadcast) broadcastUnauthenticated();
    const retryAfter = Number(res.headers.get("Retry-After"));
    throw new ApiError(res.status, body, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null);
  }

  return body as T;
}

// --- session ---------------------------------------------------------------

export type SessionInfo = { authenticated: boolean; issued_at?: string | null };

const authUrl = (path: string) => `${ENDPOINTS.adminAuth}${path}`;

/** Login now returns the bearer token in the body, not a Set-Cookie. */
type LoginResponse = { token: string };

export const auth = {
  /**
   * 200 + { token } on success; the token is stored so every later request
   * carries it. 401 is a wrong password, 429 a throttle -- both thrown.
   */
  login: async (password: string): Promise<void> => {
    const res = await sessionFetch<LoginResponse>(authUrl("/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
      skipAuthBroadcast: true,
    });
    if (!res?.token) throw new ApiError(500, { detail: "Login did not return a token." });
    setToken(res.token);
  },
  /** Best-effort server-side revoke; the local token is cleared regardless. */
  logout: async (): Promise<void> => {
    try {
      await sessionFetch<null>(authUrl("/logout"), { method: "POST" });
    } finally {
      clearToken();
    }
  },
  /**
   * The single session check. With no stored token the answer is "signed out"
   * without a round-trip; otherwise /me validates the token and reports the
   * state in the body. /me always answers 200, so a routine boot-time probe
   * never trips the unauthenticated broadcast.
   */
  me: (): Promise<SessionInfo> => {
    if (!getToken()) return Promise.resolve({ authenticated: false });
    return sessionFetch<SessionInfo>(authUrl("/me"));
  },
};
