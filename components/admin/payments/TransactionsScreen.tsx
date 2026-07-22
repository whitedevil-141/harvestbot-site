"use client";

import React, { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { ENDPOINTS } from "@/lib/api";
import { sessionFetch } from "@/lib/admin-auth";
import {
  Alert,
  Button,
  Input,
  Modal,
  PageHeader,
  PagePicker,
  Panel,
  SearchInput,
  Select,
  useToast,
} from "../ui";
import { usePayments } from "./PaymentsProvider";
import { TransactionsTable } from "./TransactionsTable";

const PAGE_SIZES = ["10", "20", "50", "100"];

const emptyDraft = () => ({
  transaction_id: "",
  network: "",
  amount: "",
  key: "",
});

type Draft = ReturnType<typeof emptyDraft>;

export function TransactionsScreen() {
  const {
    loading,
    error,
    fetchPayments,
    searchQuery,
    setSearchQuery,
    filteredData,
    paginatedData,
    uniqueCoins,
    uniqueNetworks,
    filterCoin,
    setFilterCoin,
    filterNetwork,
    setFilterNetwork,
    filterMinAmount,
    setFilterMinAmount,
    filterMaxAmount,
    setFilterMaxAmount,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
  } = usePayments();

  const [adding, setAdding] = useState(false);
  const hasFilters = Boolean(filterCoin || filterNetwork || filterMinAmount || filterMaxAmount);

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Every verified payment. Search covers the transaction id, licence key, coin and network."
        actions={
          <>
            <Button size="sm" onClick={() => void fetchPayments()} loading={loading}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button size="sm" variant="primary" onClick={() => setAdding(true)}>
              <Plus className="h-3.5 w-3.5" /> Add transaction
            </Button>
          </>
        }
      />

      {error && <Alert onRetry={fetchPayments}>{error}</Alert>}

      <Panel
        title="Filters"
        actions={
          hasFilters ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setFilterCoin("");
                setFilterNetwork("");
                setFilterMinAmount("");
                setFilterMaxAmount("");
              }}
            >
              Clear
            </Button>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="sm:col-span-2 lg:col-span-1">
            <span className="mb-1.5 block text-xs font-medium text-adm-dim">Search</span>
            <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Id, key, coin, network…" />
          </div>
          <Select
            label="Coin"
            value={filterCoin}
            onChange={(event) => setFilterCoin(event.target.value)}
            options={[{ value: "", label: "All coins" }, ...uniqueCoins.map((coin) => ({ value: coin, label: coin }))]}
          />
          <Select
            label="Network"
            value={filterNetwork}
            onChange={(event) => setFilterNetwork(event.target.value)}
            options={[
              { value: "", label: "All networks" },
              ...uniqueNetworks.map((network) => ({ value: network, label: network.replace("_", " ") })),
            ]}
          />
          <Input
            label="Min amount"
            type="number"
            min="0"
            value={filterMinAmount}
            placeholder="0"
            onChange={(event) => setFilterMinAmount(event.target.value)}
          />
          <Input
            label="Max amount"
            type="number"
            min="0"
            value={filterMaxAmount}
            placeholder="∞"
            onChange={(event) => setFilterMaxAmount(event.target.value)}
          />
        </div>
      </Panel>

      <Panel
        title="All transactions"
        description={`${filteredData.length} matching ${filteredData.length === 1 ? "row" : "rows"}`}
        padded={false}
        footer={
          filteredData.length > 0 ? (
            <div className="flex flex-col items-center justify-between gap-3 lg:flex-row">
              <div className="flex items-center gap-2 text-xs text-adm-mute">
                <span>Rows per page</span>
                <select
                  value={String(itemsPerPage)}
                  onChange={(event) => {
                    setItemsPerPage(Number(event.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 rounded-lg border border-adm-line bg-adm-bg px-2 text-xs text-adm-text outline-none focus-visible:ring-2 focus-visible:ring-adm-accent/40"
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size} className="bg-adm-surface-2">
                      {size}
                    </option>
                  ))}
                </select>
              </div>
              <PagePicker page={currentPage} totalPages={totalPages} onPage={setCurrentPage} />
            </div>
          ) : undefined
        }
      >
        <TransactionsTable rows={paginatedData} />
      </Panel>

      {adding && (
        <AddTransactionModal
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            fetchPayments();
          }}
        />
      )}
    </>
  );
}

/**
 * Manual entry for a payment that was settled outside the normal flow. The
 * server owns verified_at and the canonical row shape, so the list is refetched
 * rather than patched locally.
 */
function AddTransactionModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const set = (field: keyof Draft) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((prev) => ({ ...prev, [field]: event.target.value }));

  const submit = async () => {
    const amount = Number(draft.amount);
    const next: Partial<Record<keyof Draft, string>> = {};
    if (!draft.transaction_id.trim()) next.transaction_id = "Required.";
    if (!draft.network.trim()) next.network = "Required.";
    if (!draft.amount.trim()) next.amount = "Required.";
    else if (!Number.isFinite(amount) || amount <= 0) next.amount = "Must be a positive number.";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    setBanner(null);
    try {
      await sessionFetch(ENDPOINTS.verifiedPayments, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_id: draft.transaction_id.trim(),
          amount,
          coin: "USDT",
          network: draft.network.trim(),
          key: draft.key.trim() || null,
        }),
      });
      toast.success("Transaction added.");
      onAdded();
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Failed to add the transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Add transaction"
      onClose={onClose}
      footer={
        <>
          <Button className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" variant="primary" loading={submitting} onClick={() => void submit()}>
            Add transaction
          </Button>
        </>
      }
    >
      {banner && <Alert>{banner}</Alert>}

      <Input
        label="Transaction id"
        value={draft.transaction_id}
        error={errors.transaction_id}
        placeholder="0x… or the provider's reference"
        onChange={set("transaction_id")}
      />
      <Input label="Coin" value="USDT" disabled hint="Manual entries are recorded in USDT." readOnly />
      <Input
        label="Network"
        value={draft.network}
        error={errors.network}
        placeholder="Ethereum, Polygon, TRON…"
        onChange={set("network")}
      />
      <Input
        label="Amount (USD)"
        type="number"
        step="0.01"
        min="0"
        value={draft.amount}
        error={errors.amount}
        placeholder="8"
        onChange={set("amount")}
      />
      <Input
        label="Licence key"
        value={draft.key}
        placeholder="Optional"
        hint="Leave blank to have one issued elsewhere."
        onChange={set("key")}
      />
      <p className="text-xs text-adm-mute">
        The verification timestamp is set by the server when the row is written.
      </p>
    </Modal>
  );
}
