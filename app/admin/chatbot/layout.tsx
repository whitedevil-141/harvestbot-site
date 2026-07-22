"use client";

import React from "react";
import { ConfigProvider } from "@/components/admin/chatbot/ConfigContext";

/**
 * GET /config is one fat payload that Tuning and Models both need, so it is
 * fetched once for the whole chatbot subtree and invalidated by whichever
 * screen mutates it.
 */
export default function ChatbotLayout({ children }: { children: React.ReactNode }) {
  return <ConfigProvider>{children}</ConfigProvider>;
}
