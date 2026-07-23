"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type State<T> = { data: T | null; loading: boolean; error: string | null };

/**
 * Fetch-on-mount with refetch, shared by every admin screen so they do not each
 * hand-roll the same three pieces of state.
 *
 * `loader` is re-invoked whenever `deps` change. Responses are dropped if a
 * newer request has started since -- window switchers fire fast enough that
 * out-of-order responses are a real source of wrong numbers on screen.
 *
 * `enabled: false` keeps the hook idle; screens use it to avoid firing before
 * the session is confirmed.
 */
export function useAdminResource<T>(
  loader: () => Promise<T>,
  deps: readonly unknown[],
  options: { enabled?: boolean } = {},
) {
  const enabled = options.enabled ?? true;
  const [state, setState] = useState<State<T>>({ data: null, loading: enabled, error: null });
  const requestId = useRef(0);
  const loaderRef = useRef(loader);

  // Kept current in an effect that is declared before the fetch effect, so the
  // fetch below always sees the loader from this render, not the previous one.
  useEffect(() => {
    loaderRef.current = loader;
  });

  const run = useCallback(async () => {
    const id = ++requestId.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await loaderRef.current();
      if (requestId.current === id) setState({ data, loading: false, error: null });
    } catch (err) {
      if (requestId.current === id) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Request failed.",
        }));
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, run, ...deps]);

  return { ...state, refresh: run, setData: (data: T | null) => setState((s) => ({ ...s, data })) };
}

/**
 * Trails `value` by `delayMs`, so a filter can be typed into freely without
 * firing a request per keystroke. The first value is returned immediately.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (Object.is(debounced, value)) return;
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delayMs]);

  return debounced;
}

/** Re-run `callback` on an interval while `enabled`. The admin tree is rate-limit exempt. */
export function usePolling(callback: () => void, intervalMs: number, enabled = true) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => callbackRef.current(), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, enabled]);
}
