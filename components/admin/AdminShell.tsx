"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  CreditCard,
  Cpu,
  FlaskConical,
  LayoutDashboard,
  Menu,
  MessagesSquare,
  Server,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SignOutButton } from "./AdminAuth";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

/**
 * The nav is the route table. Items are real links, so middle-click, copy-link
 * and the back button all behave, and the active item is derived from the URL
 * rather than from a state variable the page has to thread around.
 */
export const NAV: NavGroup[] = [
  {
    label: "Payments",
    items: [
      { href: "/admin/payments", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/payments/transactions", label: "Transactions", icon: CreditCard },
    ],
  },
  {
    label: "Chatbot",
    items: [
      { href: "/admin/chatbot", label: "Overview", icon: Activity },
      { href: "/admin/chatbot/playground", label: "Playground", icon: FlaskConical },
      { href: "/admin/chatbot/conversations", label: "Conversations", icon: MessagesSquare },
      { href: "/admin/chatbot/tuning", label: "Tuning", icon: SlidersHorizontal },
      { href: "/admin/chatbot/models", label: "Models", icon: Cpu },
      { href: "/admin/chatbot/knowledge", label: "Knowledge", icon: BookOpen },
      { href: "/admin/chatbot/system", label: "System", icon: Server },
    ],
  },
];

const normalize = (path: string) => (path.length > 1 ? path.replace(/\/+$/, "") : path);

function findPageTitle(path: string): string {
  const normalized = normalize(path);
  for (const group of NAV) {
    for (const item of group.items) {
      if (normalized === normalize(item.href)) return item.label;
    }
  }
  return "Dashboard";
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = normalize(usePathname() ?? "");
  const [menuOpen, setMenuOpen] = useState(false);

  const nav = (
    <nav className="flex flex-1 flex-col gap-7 overflow-y-auto px-3 py-5">
      {NAV.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.16em] text-adm-mute uppercase">
            {group.label}
          </p>
          {group.items.map((item) => {
            const active = pathname === normalize(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`group relative flex h-9 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-adm-accent/40 ${
                  active
                    ? "bg-adm-accent-dim text-adm-accent"
                    : "text-adm-dim hover:bg-white/[0.03] hover:text-adm-text"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-md bg-adm-accent" />
                )}
                <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-adm-accent" : "text-adm-mute"}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const brand = (
    <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-adm-line px-5">
      <Link href="/admin/payments" className="flex items-center gap-2.5 text-sm font-semibold text-adm-text">
        <Image src="/logo.png" alt="" width={24} height={24} className="rounded-md" />
        Harvest<span className="text-adm-accent">Bot</span>
      </Link>
      <button
        aria-label="Close menu"
        onClick={() => setMenuOpen(false)}
        className="text-adm-mute hover:text-adm-text md:hidden"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );

  const footer = (
    <div className="shrink-0 border-t border-adm-line px-3 py-3">
      <SignOutButton full />
    </div>
  );

  return (
    <div className="adm-root flex h-dvh overflow-hidden bg-adm-bg text-adm-text selection:bg-adm-accent/25">
      {/* Mobile drawer overlay */}
      <div
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-200 md:hidden ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-60 flex w-64 flex-col border-r border-adm-line bg-adm-surface transition-transform duration-200 md:relative md:z-auto md:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {brand}
        {nav}
        {footer}
      </aside>

      <main className="adm-scroll flex flex-1 flex-col overflow-hidden">
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-adm-line bg-adm-bg/85 px-4 backdrop-blur-md md:hidden">
          <div className="flex items-center gap-3">
            <button aria-label="Open menu" onClick={() => setMenuOpen(true)} className="text-adm-dim hover:text-adm-text">
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold">{findPageTitle(pathname)}</span>
          </div>
        </div>

        <div className="adm-enter flex-1 overflow-y-auto">
          <div key={pathname} className="mx-auto max-w-[84rem] space-y-6 p-4 md:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
