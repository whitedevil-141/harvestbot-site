"use client";

import React from "react";
import { Button } from "./controls";

/**
 * Tables scroll inside their own container so a wide row never makes the page
 * scroll sideways on a phone.
 */
export function Table({
  head,
  children,
  minWidth = "min-w-[52rem]",
}: {
  head: React.ReactNode;
  children: React.ReactNode;
  minWidth?: string;
}) {
  return (
    <div className="adm-scroll overflow-x-auto">
      <table className={`w-full border-collapse text-left ${minWidth}`}>
        <thead className="bg-adm-surface-2/60">
          <tr>{head}</tr>
        </thead>
        <tbody className="divide-y divide-adm-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Th({
  children,
  align = "left",
  className = "",
}: {
  children?: React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  const alignment = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th
      scope="col"
      className={`whitespace-nowrap px-5 py-3 text-[11px] font-medium tracking-wider text-adm-mute uppercase ${alignment} ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className = "",
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={`px-5 py-3 align-middle text-[13px] text-adm-dim ${className}`}>
      {children}
    </td>
  );
}

export function Tr({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <tr className={`h-11 transition-colors duration-150 hover:bg-white/[0.025] ${className}`}>{children}</tr>;
}

// --- pagination -------------------------------------------------------------

/** Offset pagination, for the endpoints that return {total, limit, offset}. */
export function Pagination({
  total,
  limit,
  offset,
  onOffset,
  noun = "items",
}: {
  total: number;
  limit: number;
  offset: number;
  onOffset: (offset: number) => void;
  noun?: string;
}) {
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);
  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="adm-nums text-xs text-adm-mute">
        {from}–{to} of {total} {noun}
      </p>
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={offset === 0} onClick={() => onOffset(Math.max(0, offset - limit))}>
          Previous
        </Button>
        <Button size="sm" disabled={to >= total} onClick={() => onOffset(offset + limit)}>
          Next
        </Button>
      </div>
    </div>
  );
}

/** Numbered pagination for client-side page slicing (payments). */
export function PagePicker({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  const windowStart =
    totalPages <= 5 || page <= 3 ? 1 : page >= totalPages - 2 ? Math.max(1, totalPages - 4) : page - 2;
  const shown = Array.from({ length: Math.min(5, totalPages) }, (_, index) => windowStart + index).filter(
    (candidate) => candidate <= totalPages,
  );

  return (
    <div className="flex items-center gap-1.5">
      <Button size="sm" disabled={page === 1} onClick={() => onPage(Math.max(1, page - 1))}>
        Previous
      </Button>
      {shown.map((candidate) => (
        <Button
          key={candidate}
          size="sm"
          variant={candidate === page ? "primary" : "ghost"}
          onClick={() => onPage(candidate)}
          className="adm-nums w-8 px-0"
        >
          {candidate}
        </Button>
      ))}
      <Button size="sm" disabled={page >= totalPages} onClick={() => onPage(Math.min(totalPages, page + 1))}>
        Next
      </Button>
    </div>
  );
}

/**
 * Cursor pagination. The stack is held by the caller because only it knows
 * which filters invalidate the held cursors.
 */
export function CursorPager({
  page,
  hasPrevious,
  hasNext,
  loading,
  onPrevious,
  onNext,
}: {
  page: number;
  hasPrevious: boolean;
  hasNext: boolean;
  loading?: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="adm-nums mr-1 text-xs text-adm-mute">Page {page}</span>
      <Button size="sm" disabled={!hasPrevious || loading} onClick={onPrevious}>
        Previous
      </Button>
      <Button size="sm" disabled={!hasNext || loading} onClick={onNext}>
        Next
      </Button>
    </div>
  );
}
