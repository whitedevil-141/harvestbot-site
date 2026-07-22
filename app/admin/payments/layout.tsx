"use client";

import React from "react";
import { PaymentsProvider } from "@/components/admin/payments/PaymentsProvider";

/**
 * Payments state (the fetched rows, the search box, the filters, the page) is
 * held here so moving between Overview and Transactions does not refetch or
 * drop the operator's filters.
 */
export default function PaymentsLayout({ children }: { children: React.ReactNode }) {
  return <PaymentsProvider>{children}</PaymentsProvider>;
}
