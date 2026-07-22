"use client";

import React, { useState } from "react";
import { RefreshCw, Zap } from "lucide-react";
import { useAdminResource, usePolling } from "@/hooks/useAdminResource";
import { probeLatency, system, type Json, type ProbeResult } from "@/lib/chatbot-admin";
import {
  Alert,
  AsyncBlock,
  Badge,
  Button,
  KeyValueList,
  PageHeader,
  Panel,
  Row,
  Rows,
  StatGrid,
  StatTile,
  formatBytes,
  formatDuration,
  formatTimestamp,
  humanize,
  type Tone,
} from "../ui";

const scalarEntries = (block: unknown): [string, React.ReactNode][] => {
  if (!block || typeof block !== "object") return [];
  return Object.entries(block as Json)
    .filter(([, value]) => value === null || ["string", "number", "boolean"].includes(typeof value))
    .map(([key, value]): [string, React.ReactNode] => {
      if (key === "db_size_bytes") return [humanize(key), formatBytes(value as number | null)];
      if (typeof value === "boolean") {
        return [
          humanize(key),
          <Badge key={key} tone={value ? "good" : "neutral"}>
            {value ? "yes" : "no"}
          </Badge>,
        ];
      }
      if (value === null || value === undefined) return [humanize(key), "n/a"];
      if (typeof value === "string" && /_at$|^last_/.test(key)) return [humanize(key), formatTimestamp(value)];
      return [humanize(key), String(value)];
    });
};

const statusTone = (status: string | undefined): Tone => {
  if (!status) return "neutral";
  const normalized = status.toLowerCase();
  if (["ok", "healthy", "up"].includes(normalized)) return "good";
  if (["degraded", "warning"].includes(normalized)) return "warn";
  return "bad";
};

const BLOCKS = ["llm", "knowledge_base", "sessions", "storage", "recorder"] as const;

export function SystemStatus() {
  const status = useAdminResource(() => system.status(), []);
  const tools = useAdminResource(() => system.tools(), []);
  const [checking, setChecking] = useState(false);
  const [providers, setProviders] = useState<ProbeResult[] | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  usePolling(() => status.refresh(), 30_000);

  const runCheck = async () => {
    setChecking(true);
    setCheckError(null);
    try {
      const result = await system.llmCheck();
      setProviders(result.providers ?? []);
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : "Provider check failed.");
    } finally {
      setChecking(false);
    }
  };

  const data = status.data;
  const knowledgeBase = data?.knowledge_base;

  return (
    <>
      <PageHeader
        title="System"
        description="Health of the running bot. Refreshes every 30 seconds."
        meta={
          <>
            {data && <Badge tone={statusTone(data.status)}>{data.status}</Badge>}
            {data?.environment && <Badge>{data.environment}</Badge>}
            {knowledgeBase?.degraded && <Badge tone="warn">KB degraded</Badge>}
          </>
        }
        actions={
          <>
            <Button size="sm" loading={checking} onClick={() => void runCheck()}>
              <Zap className="h-3.5 w-3.5" /> Probe providers
            </Button>
            <Button size="sm" onClick={status.refresh} loading={status.loading}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </>
        }
      />

      {checkError && <Alert onDismiss={() => setCheckError(null)}>{checkError}</Alert>}

      <AsyncBlock loading={status.loading && !data} error={status.error} onRetry={status.refresh}>
        {data && (
          <>
            <StatGrid>
              <StatTile label="Status" value={data.status} />
              <StatTile label="Uptime" value={formatDuration(data.uptime_seconds)} />
              <StatTile
                label="Active config"
                value={data.config?.active_version !== undefined ? `v${data.config.active_version}` : "—"}
                hint={
                  data.config?.total_versions !== undefined ? `${data.config.total_versions} versions saved` : undefined
                }
              />
              <StatTile
                label="Embedding backend"
                value={knowledgeBase?.embedding_backend ?? "—"}
                hint={knowledgeBase?.degraded ? "Running degraded" : undefined}
              />
            </StatGrid>

            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
              {BLOCKS.map((block) => {
                const entries = scalarEntries(data[block]);
                if (entries.length === 0) return null;
                return (
                  <Panel key={block} title={humanize(block)}>
                    <KeyValueList items={entries} />
                  </Panel>
                );
              })}
            </div>

            {providers && (
              <Panel title="Provider probes" description="Result of the last /system/llm-check." padded={false}>
                <Rows>
                  {providers.map((result, index) => (
                    <Row key={index} className="flex-wrap items-center gap-2">
                      <span className="text-[13px] text-adm-text">
                        {result.provider ?? "provider"}
                        {result.model ? ` · ${result.model}` : ""}
                      </span>
                      <Badge tone={result.ok ? "good" : "bad"}>{result.ok ? "reachable" : "failed"}</Badge>
                      <Badge>{probeLatency(result)}</Badge>
                      {result.tool_calling && (
                        <Badge
                          tone={
                            result.tool_calling === "ok" ? "good" : result.tool_calling === "salvaged" ? "warn" : "neutral"
                          }
                        >
                          tools {result.tool_calling}
                        </Badge>
                      )}
                      {result.error && <span className="break-all text-xs text-adm-bad">{result.error}</span>}
                    </Row>
                  ))}
                </Rows>
              </Panel>
            )}

            <Panel
              title="Tools"
              description="Registered tools and whether the current config enables them."
              padded={false}
            >
              <AsyncBlock
                loading={tools.loading && !tools.data}
                error={tools.error}
                onRetry={tools.refresh}
                isEmpty={(tools.data ?? []).length === 0}
                emptyTitle="No tools registered."
              >
                <Rows>
                  {(tools.data ?? []).map((tool) => (
                    <Row key={tool.name}>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs text-adm-text">{tool.name}</p>
                        {tool.description && <p className="mt-0.5 text-xs text-adm-mute">{tool.description}</p>}
                      </div>
                      <Badge tone={tool.enabled ? "good" : "neutral"}>{tool.enabled ? "enabled" : "disabled"}</Badge>
                    </Row>
                  ))}
                </Rows>
              </AsyncBlock>
            </Panel>
          </>
        )}
      </AsyncBlock>
    </>
  );
}
