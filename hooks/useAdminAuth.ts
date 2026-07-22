"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { auth, onUnauthenticated } from "@/lib/admin-auth";

export type AuthStatus = "loading" | "in" | "out";

/**
 * The dashboard's session state. One cookie covers both the payments and
 * chatbot surfaces, so there is one of these for the whole app.
 *
 * Boots from GET /api/admin/auth/me, which always answers 200, so the initial
 * check never trips the 401 broadcast. After that any 401 from any admin
 * endpoint drops us back to "out" -- the cookie can expire mid-session and a
 * screen that keeps rendering stale data with dead requests is worse than a
 * login card.
 */
export function useAdminAuth() {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    auth
      .me()
      .then((session) => {
        if (!cancelled) setStatus(session?.authenticated ? "in" : "out");
      })
      .catch(() => {
        if (!cancelled) setStatus("out");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => onUnauthenticated(() => setStatus("out")), []);

  const login = useCallback(async (password: string) => {
    setPending(true);
    setError(null);
    try {
      await auth.login(password);
      setStatus("in");
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 401
            ? "Incorrect password."
            : err.isRateLimited
              ? `Too many attempts. Try again${err.retryAfter ? ` in ${err.retryAfter}s` : " shortly"}.`
              : err.message,
        );
      } else {
        setError("Could not reach the admin API. Check the backend and its DASHBOARD_ORIGIN.");
      }
      return false;
    } finally {
      setPending(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } finally {
      setStatus("out");
    }
  }, []);

  return { status, error, pending, login, logout };
}
