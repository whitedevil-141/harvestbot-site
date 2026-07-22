"use client";

import React from "react";
import { AdminAuthProvider, AdminLoginCard, useAdminSession } from "@/components/admin/AdminAuth";
import { AdminShell } from "@/components/admin/AdminShell";
import { Spinner, ToastProvider } from "@/components/admin/ui";

/**
 * The whole admin tree sits behind one session.
 *
 * The shell and every screen stay unmounted until the session is confirmed, so
 * nothing fetches behind the login card, and any 401 from any admin endpoint
 * drops the tree straight back to it (see hooks/useAdminAuth.ts).
 */
function Gate({ children }: { children: React.ReactNode }) {
  const { status } = useAdminSession();

  if (status === "loading") {
    return (
      <div className="adm-root flex h-dvh items-center justify-center gap-2 bg-adm-bg text-[13px] text-adm-mute">
        <Spinner /> Checking session…
      </div>
    );
  }

  if (status === "out") {
    return (
      <div className="adm-root flex h-dvh items-center justify-center bg-adm-bg px-4">
        <AdminLoginCard />
      </div>
    );
  }

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
