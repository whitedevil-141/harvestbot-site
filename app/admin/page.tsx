"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/admin/ui";

/** /admin has no screen of its own; payments is the landing surface. */
export default function AdminIndex() {
  const router = useRouter();
  useEffect(() => router.replace("/admin/payments"), [router]);

  return (
    <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-adm-mute">
      <Spinner /> Opening payments…
    </div>
  );
}
