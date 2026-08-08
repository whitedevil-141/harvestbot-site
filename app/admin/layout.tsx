"use client";

import React from "react";
import { AdminAuthProvider, AdminLoginCard, useAdminSession } from "@/components/admin/AdminAuth";
import { AdminShell } from "@/components/admin/AdminShell";
import { ToastProvider } from "@/components/admin/ui";

/**
 * The whole admin tree sits behind one session.
 *
 * The shell mounts optimistically while the session is still being checked, so
 * the boot-time `auth.me()` overlaps with each screen's own data fetch instead
 * of blocking in front of it -- the redirect landing page and the payments
 * fetch no longer wait for auth to resolve first. Only a *confirmed* logged-out
 * state (auth.me() reporting `authenticated: false`, or any admin endpoint 401ing
 * -- see hooks/useAdminAuth.ts) drops the tree to the login card. Each screen
 * shows its own loading state until its data arrives, so the brief pre-auth
 * window renders spinners rather than stale numbers.
 */
function Gate({ children }: { children: React.ReactNode }) {
  const { status } = useAdminSession();

  if (status === "out") {
    return (
      <div className="adm-root flex h-dvh items-center justify-center bg-adm-bg px-4">
        <AdminLoginCard />
      </div>
    );
  }

  // "loading" and "in" both render the shell.
  return <AdminShell>{children}</AdminShell>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <ToastProvider>
        <Gate>{children}</Gate>
      </ToastProvider>
    </AdminAuthProvider>
  );
}
