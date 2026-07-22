// The dashboard's single session.
//
// One shared password mints an HttpOnly `admin_session` cookie at
// /api/admin/auth/login, and that one cookie authorises every operator
// surface -- /api/website/admin/* (verified payments) and /api/chatbot/admin/*
// (config, analytics, knowledge base, ...) alike. There is no bearer token and
// nothing readable from JS, so every admin request must be credentialed; a
// single omission silently 401s.
//
// This module owns the session so the payments and chatbot clients share it
// rather than each carrying their own notion of "signed in".

import { ApiError, ENDPOINTS, apiUrl } from "@/lib/api";

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
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(UNAUTHENTICATED_EVENT));
};

// --- transport -------------------------------------------------------------

/**
 * Fetch an admin path with the session cookie attached. Returns parsed JSON,
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
  const res = await fetch(apiUrl(path), { credentials: "include", ...rest });

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

export const auth = {
  /** 204 on success. 401 is a wrong password, 429 a throttle -- both thrown. */
  login: (password: string) =>
    sessionFetch<null>(authUrl("/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
      skipAuthBroadcast: true,
    }),
  logout: () => sessionFetch<null>(authUrl("/logout"), { method: "POST" }),
  /**
   * The single session check. /api/admin/auth/check answers the same question
   * with a 401, which would trip the unauthenticated broadcast on a routine
   * boot-time probe; /me always answers 200 and reports the state in the body,
   * so it is the only one this client uses.
   */
  me: () => sessionFetch<SessionInfo>(authUrl("/me")),
};
