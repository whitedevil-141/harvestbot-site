"use client";

import React, { createContext, useContext } from "react";
import { useAdminResource } from "@/hooks/useAdminResource";
import { config, type AdminConfigBundle } from "@/lib/chatbot-admin";
import { useAdminSession } from "../AdminAuth";

type ConfigValue = {
  bundle: AdminConfigBundle | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

const ConfigContext = createContext<ConfigValue | null>(null);

/**
 * GET /config is a fat single-call payload -- config, defaults, editable field
 * list, tool list, pricing, presets, the whole model catalog, provider key
 * status and the locked block. Tuning and Models both need it, so it is fetched
 * once here and invalidated by whichever screen mutates it.
 */
export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAdminSession();
  const { data, loading, error, refresh } = useAdminResource(() => config.get(), [], {
    enabled: status === "in",
  });

  return (
    <ConfigContext.Provider value={{ bundle: data, loading, error, reload: refresh }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfigBundle() {
  const value = useContext(ConfigContext);
  if (!value) throw new Error("useConfigBundle must be used inside <ConfigProvider>");
  return value;
}
