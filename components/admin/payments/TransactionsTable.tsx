"use client";

import React from "react";
import { Search } from "lucide-react";
import {
  Badge,
  CopyButton,
  EmptyState,
  StatusDot,
  Table,
  Td,
  Th,
  Tr,
  formatCurrency,
  formatDateTime,
  truncateHash,
} from "../ui";
import type { Payment } from "./PaymentsProvider";

export const displayId = (tx: Payment) => tx.transaction_id || tx.reference_id || tx.order_id || "N/A";

const COIN_TONE: Record<string, string> = {
  BTC: "text-amber-400",
  ETH: "text-indigo-400",
  LTC: "text-blue-400",
  GIFT: "text-pink-400",
  USDT: "text-adm-accent",
};

export function TransactionsTable({ rows, emptyHint }: { rows: Payment[]; emptyHint?: string }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Search className="h-6 w-6" />}
        title="No transactions found."
        hint={emptyHint ?? "Nothing matches the current search and filters."}
      />
    );
  }

  return (
    <Table
      head={
        <>
          <Th>Transaction</Th>
          <Th>Key</Th>
          <Th>Asset</Th>
          <Th align="right">Amount</Th>
          <Th>Verified</Th>
          <Th align="right">Status</Th>
        </>
      }
    >
      {rows.map((tx) => {
        const id = displayId(tx);
        const { dateStr, timeStr } = formatDateTime(tx.verified_at);
        return (
          <Tr key={tx.id} className="group">
            <Td>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-adm-text">{truncateHash(id)}</span>
                <span className="opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
                  <CopyButton value={id} label="Copy transaction id" />
                </span>
              </div>
            </Td>
            <Td>
              {tx.key ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-adm-mute">{truncateHash(tx.key)}</span>
                  <span className="opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
                    <CopyButton value={tx.key} label="Copy licence key" />
                  </span>
                </div>
              ) : (
                <span className="text-[11px] text-adm-mute">—</span>
              )}
            </Td>
            <Td>
              <div className="flex items-baseline gap-2">
                <span className={`text-[13px] font-medium ${COIN_TONE[tx.coin] ?? "text-adm-text"}`}>{tx.coin}</span>
                <span className="text-[11px] tracking-wide text-adm-mute uppercase">{tx.network.replace("_", " ")}</span>
              </div>
            </Td>
            <Td className="adm-nums text-right font-medium text-adm-text">{formatCurrency(tx.amount)}</Td>
            <Td>
              <span className="adm-nums text-[13px] text-adm-dim">{dateStr}</span>
              <span className="adm-nums ml-2 text-[11px] text-adm-mute">{timeStr}</span>
            </Td>
            <Td className="text-right">
              <Badge tone="good">
                <StatusDot tone="good" /> Verified
              </Badge>
            </Td>
          </Tr>
        );
      })}
    </Table>
  );
}
