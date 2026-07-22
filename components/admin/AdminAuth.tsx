"use client";

import React, { createContext, useContext, useState } from "react";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Alert, Button, Input } from "./ui";

type AuthValue = ReturnType<typeof useAdminAuth>;

const AdminAuthContext = createContext<AuthValue | null>(null);

/**
 * Mounted in the admin layout, above every route, so the session survives
 * navigation and /api/admin/auth/me is issued once per visit.
 */
export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const value = useAdminAuth();
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminSession() {
  const value = useContext(AdminAuthContext);
  if (!value) throw new Error("useAdminSession must be used inside <AdminAuthProvider>");
  return value;
}

export function AdminLoginCard() {
  const { login, pending, error } = useAdminSession();
  const [password, setPassword] = useState("");

  return (
    <div className="adm-enter relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-adm-bg px-4">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="adm-glow h-[40rem] w-[40rem] rounded-full bg-adm-accent/10 blur-[120px]" />
      </div>
      <div className="relative w-full max-w-sm">
        <div className="rounded-2xl border border-adm-line bg-adm-surface/90 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-adm-accent-dim">
              <Image src="/logo.png" alt="" width={24} height={24} className="rounded" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-adm-text">HarvestBot admin</h1>
              <p className="text-xs text-adm-mute">Payments and chatbot console</p>
            </div>
          </div>

          <form
            className="mt-6 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (password) void login(password).then((ok) => ok && setPassword(""));
            }}
          >
            <Input
              label="Password"
              type="password"
              value={password}
              autoComplete="current-password"
              autoFocus
              placeholder="••••••••"
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {error && <Alert>{error}</Alert>}
            <Button type="submit" variant="primary" loading={pending} disabled={!password} className="w-full">
              Sign in
            </Button>
          </form>

          <p className="mt-4 text-xs leading-relaxed text-adm-mute">
            One password for both surfaces. The session is an HttpOnly cookie held by the browser, never by this page.
          </p>
        </div>
      </div>
    </div>
  );
}

export function SignOutButton({ full = false }: { full?: boolean }) {
  const { logout } = useAdminSession();
  return (
    <Button size="sm" variant="ghost" onClick={() => void logout()} className={full ? "w-full justify-start" : ""}>
      <LogOut className="h-3.5 w-3.5" />
      Sign out
    </Button>
  );
}
