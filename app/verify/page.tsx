"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  CheckCircle2,
  Copy,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";

type PlanOption = {
  id: string;
  label: string;
  days: number;
  price: number;
  tagline: string;
  aliases: string[];
};

type MethodId = "binance_pay" | "gift_card" | "crypto";

type Coin = "USDT" | "LTC";

type VerifyState = {
  status: "idle" | "loading" | "success" | "error";
  message?: string;
  key?: string;
  alreadyVerified?: boolean;
};

const BINANCE_PAY_ID = "770585563";
const USDT_TRX_ADDRESS = "TJ9tLX6NKF7Zub7v2S7TKnJrsyys1GZdoe";
const LTC_ADDRESS = "LQyQgGRCNWnUzRtdAXDdTpyJVhEqrtz9TC";

const PLAN_OPTIONS: PlanOption[] = [
  {
    id: "7d",
    label: "7 Days",
    days: 7,
    price: 2,
    tagline: "Quick boost for builder cycles",
    aliases: ["weekly", "7", "7 days", "7-day"],
  },
  {
    id: "15d",
    label: "15 Days",
    days: 15,
    price: 5,
    tagline: "Solid grind window",
    aliases: ["bi-weekly", "15", "15 days", "15-day"],
  },
  {
    id: "30d",
    label: "30 Days",
    days: 30,
    price: 8,
    tagline: "Best for long farms",
    aliases: ["monthly", "30", "30 days", "30-day"],
  },
  {
    id: "lifetime",
    label: "Lifetime",
    days: 3650,
    price: 35,
    tagline: "One payment, always on",
    aliases: ["lifetime", "3650", "3650 days"],
  },
];

const formatUsd = (amount: number) => `$${amount}`;

const normalizeQuery = (value?: string | null) => value?.trim().toLowerCase() ?? "";

const getNumeric = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const formatLtc = (value: number) => {
  const trimmed = value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  return trimmed || value.toFixed(6);
};

const extractLtcQuote = (data: unknown) => {
  const record = (data ?? {}) as Record<string, unknown>;
  const candidates = [
    record.ltc_amount,
    record.ltcAmount,
    record.ltc_value,
    record.ltcValue,
    record.ltc,
    record.amount,
    record.value,
    record.result,
  ];

  for (const entry of candidates) {
    const numeric = getNumeric(entry);
    if (numeric !== null) return formatLtc(numeric);
    if (typeof entry === "string" && entry.trim()) return entry.trim();
  }

  return null;
};

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedPlanId, setSelectedPlanId] = useState(PLAN_OPTIONS[0].id);
  const [method, setMethod] = useState<MethodId>("binance_pay");
  const [coin, setCoin] = useState<Coin>("USDT");
  const [orderId, setOrderId] = useState("");
  const [redeemCode, setRedeemCode] = useState("");
  const [txId, setTxId] = useState("");
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null);
  const [ltcQuote, setLtcQuote] = useState<string | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<"idle" | "loading" | "error">("idle");
  const [verifyState, setVerifyState] = useState<VerifyState>({ status: "idle" });

  const selectedPlan =
    PLAN_OPTIONS.find((plan) => plan.id === selectedPlanId) ?? PLAN_OPTIONS[0];

  useEffect(() => {
    const planParam = normalizeQuery(searchParams.get("plan"));
    const amountParam = getNumeric(searchParams.get("amount"));

    const matched = PLAN_OPTIONS.find((plan) => {
      const matchesAmount = amountParam !== null && amountParam === plan.price;
      const matchesAlias =
        planParam && plan.aliases.some((alias) => planParam.includes(alias));
      return matchesAmount || matchesAlias;
    });

    if (matched) setSelectedPlanId(matched.id);
  }, [searchParams]);

  useEffect(() => {
    setVerifyState({ status: "idle" });
  }, [method, coin, selectedPlanId]);

  useEffect(() => {
    if (method !== "crypto" || coin !== "LTC") {
      setLtcQuote(null);
      setQuoteStatus("idle");
      return;
    }

    let active = true;
    setQuoteStatus("loading");

    fetch("https://api.harvestbot.app/api/v1/payments/USDTtoLTC", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: selectedPlan.price }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const quote = extractLtcQuote(data);
        if (quote) {
          setLtcQuote(quote);
          setQuoteStatus("idle");
          return;
        }
        setLtcQuote(null);
        setQuoteStatus("error");
      })
      .catch(() => {
        if (!active) return;
        setLtcQuote(null);
        setQuoteStatus("error");
      });

    return () => {
      active = false;
    };
  }, [method, coin, selectedPlan.price]);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedTarget(label);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopiedTarget(null), 1500);
    } catch {
      setCopiedTarget(null);
    }
  };

  const handleVerify = async () => {
    setVerifyState({ status: "loading" });

    let payload: Record<string, string> = {};

    if (method === "binance_pay") {
      if (!orderId.trim()) {
        setVerifyState({
          status: "error",
          message: "Enter your Binance Pay order ID to continue.",
        });
        return;
      }
      payload = { order_id: orderId.trim() };
    } else if (method === "gift_card") {
      if (!redeemCode.trim()) {
        setVerifyState({
          status: "error",
          message: "Enter your Binance gift card redeem code.",
        });
        return;
      }
      payload = { redeem_code: redeemCode.trim() };
    } else {
      if (!txId.trim()) {
        setVerifyState({
          status: "error",
          message: "Enter the transaction hash to verify crypto payments.",
        });
        return;
      }
      payload = { coin, tx_id: txId.trim() };
    }

    try {
      const res = await fetch("https://api.harvestbot.app/api/v1/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      const verifiedRaw = data?.verified;
      const verified =
        typeof verifiedRaw === "string"
          ? verifiedRaw.trim().toLowerCase() === "true"
          : Boolean(verifiedRaw);
      const statusText = String(data?.status ?? "").toLowerCase();
      const isSuccess = (statusText === "success" && verified) || Boolean(data?.success);
      const alreadyVerified =
        res.status === 409 &&
        typeof data?.detail === "string" &&
        data.detail.toLowerCase().includes("already verified");

      if (isSuccess || alreadyVerified) {
        setVerifyState({
          status: "success",
          message:
            data?.message ||
            (alreadyVerified
              ? "Transaction already verified. Your access is active."
              : "Payment verified. Access is being delivered."),
          key: data?.key ? String(data.key) : undefined,
          alreadyVerified,
        });
        return;
      }

      setVerifyState({
        status: "error",
        message:
          data?.message ||
          data?.detail ||
          "Verification failed. Double-check the details and try again.",
      });
    } catch {
      setVerifyState({
        status: "error",
        message: "Network error. Please try again in a moment.",
      });
    }
  };

  const amountLabel = (() => {
    if (method === "crypto") {
      if (coin === "USDT") return `${selectedPlan.price} USDT`;
      if (ltcQuote) return `${ltcQuote} LTC`;
      if (quoteStatus === "error") return "Check current LTC rate";
      if (quoteStatus === "loading") return "Fetching LTC quote...";
      return "LTC estimate pending";
    }
    return `${formatUsd(selectedPlan.price)} USD`;
  })();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-[#23f8ff] selection:text-slate-900">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.12; transform: scale(1.08); }
        }
        @keyframes reveal {
          0% { opacity: 0; transform: translateY(18px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 7s ease-in-out infinite 1.5s; }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
        .animate-reveal { animation: reveal 0.8s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .animate-float,
          .animate-float-delayed,
          .animate-pulse-slow,
          .animate-reveal {
            animation: none;
          }
        }
      `}</style>

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 right-[-12%] h-80 w-80 rounded-full bg-[#23f8ff]/15 blur-[140px] animate-pulse-slow" />
          <div
            className="absolute bottom-[-18%] left-[-12%] h-96 w-96 rounded-full bg-purple-500/15 blur-[160px] animate-pulse-slow"
            style={{ animationDelay: "2s" }}
          />
          <div className="absolute top-16 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-[#23f8ff]/10 blur-[120px] animate-float" />
        </div>

        <div className="relative z-10">
          <header className="max-w-6xl mx-auto px-5 pt-10 pb-9">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="animate-reveal">
                <a
                  href="/"
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 hover:text-[#23f8ff]"
                >
                  Back to Harvest Bot
                </a>
                <h1 className="mt-3 text-4xl md:text-5xl font-semibold tracking-tight">
                  Payment Gateway
                </h1>
                <p className="mt-3 max-w-xl text-base md:text-lg text-slate-400">
                  Pick your plan, pay with your preferred method, then verify to unlock access.
                </p>
              </div>
              <div
                className="animate-reveal flex items-center gap-3 rounded-2xl bg-slate-900/70 backdrop-blur border border-slate-800/80 px-4 py-2.5 shadow-lg shadow-black/20"
                style={{ animationDelay: "120ms" }}
              >
                <ShieldCheck className="h-5 w-5 text-[#23f8ff]" />
                <div>
                  <p className="text-sm font-semibold">Secure verification</p>
                  <p className="text-xs text-slate-500">No account details required</p>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-6xl mx-auto px-5 pb-14 grid gap-9 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="space-y-8 animate-reveal" style={{ animationDelay: "80ms" }}>
              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur px-5 py-5 shadow-lg shadow-black/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-[#23f8ff] font-semibold">
                      Step 1 - Choose plan
                    </p>
                    <h2 className="text-2xl font-semibold">Access duration</h2>
                  </div>
                  <Sparkles className="h-5 w-5 text-[#23f8ff]" />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {PLAN_OPTIONS.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`relative rounded-2xl border px-5 py-4 text-left transition-all ${
                          isSelected
                            ? "border-[#23f8ff] bg-slate-900/80 shadow-[0_0_30px_rgba(35,248,255,0.12)]"
                            : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                        }`}
                        aria-pressed={isSelected}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-lg font-semibold">{plan.label}</p>
                            <p className="text-sm text-slate-400">{plan.days} days access</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-semibold">{formatUsd(plan.price)}</p>
                            <p className="text-xs text-slate-500">one time</p>
                          </div>
                        </div>
                        <p className="mt-3 text-sm text-slate-400">{plan.tagline}</p>
                        {isSelected && (
                          <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#23f8ff]">
                            <CheckCircle2 className="h-4 w-4" />
                            Selected
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur px-5 py-5 shadow-lg shadow-black/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-[#23f8ff] font-semibold">
                      Step 2 - Payment method
                    </p>
                    <h2 className="text-2xl font-semibold">Select how you want to pay</h2>
                  </div>
                  <Wallet className="h-5 w-5 text-[#23f8ff]" />
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {[
                    {
                      id: "binance_pay" as MethodId,
                      title: "Binance Pay",
                      desc: "Send to ID and verify order",
                    },
                    {
                      id: "gift_card" as MethodId,
                      title: "Binance Gift Card",
                      desc: "Redeem code verification",
                    },
                    {
                      id: "crypto" as MethodId,
                      title: "Crypto",
                      desc: "USDT (TRX) or LTC transfer",
                    },
                  ].map((option) => {
                    const isSelected = method === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setMethod(option.id)}
                        className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                          isSelected
                            ? "border-[#23f8ff] bg-slate-900/80 shadow-[0_0_20px_rgba(35,248,255,0.12)]"
                            : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-100">{option.title}</p>
                        <p className="mt-2 text-xs text-slate-500">{option.desc}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-4">
                  {method === "binance_pay" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">Binance Pay ID</p>
                          <p className="text-xs text-slate-500">Send payment to the ID below.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(BINANCE_PAY_ID, "binance")}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-[#23f8ff]/40"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          {copiedTarget === "binance" ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-lg font-semibold tracking-wider">
                        {BINANCE_PAY_ID}
                      </div>
                      <ol className="list-decimal pl-5 text-sm text-slate-400 space-y-1.5">
                        <li>Open Binance Pay and send {formatUsd(selectedPlan.price)}.</li>
                        <li>Grab the Binance order ID after payment.</li>
                        <li>Paste the order ID in the verification panel.</li>
                      </ol>
                    </div>
                  )}

                  {method === "gift_card" && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-semibold">Binance Gift Card</p>
                        <p className="text-xs text-slate-500">
                          Pay with a Binance gift card and verify the redeem code.
                        </p>
                      </div>
                      <ol className="list-decimal pl-5 text-sm text-slate-400 space-y-1.5">
                        <li>Buy a Binance gift card for {formatUsd(selectedPlan.price)}.</li>
                        <li>Locate the redeem code provided by Binance.</li>
                        <li>Paste the redeem code in the verification panel.</li>
                      </ol>
                    </div>
                  )}

                  {method === "crypto" && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setCoin("USDT")}
                          className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-all ${
                            coin === "USDT"
                              ? "border-[#23f8ff] bg-slate-900 text-[#23f8ff]"
                              : "border-slate-800 bg-slate-950 text-slate-400"
                          }`}
                        >
                          USDT (TRX)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCoin("LTC")}
                          className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-all ${
                            coin === "LTC"
                              ? "border-[#23f8ff] bg-slate-900 text-[#23f8ff]"
                              : "border-slate-800 bg-slate-950 text-slate-400"
                          }`}
                        >
                          LTC (LTC)
                        </button>
                      </div>

                      {coin === "USDT" && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold">USDT (TRX) address</p>
                              <p className="text-xs text-slate-500">Network: TRON (TRX)</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(USDT_TRX_ADDRESS, "usdt")}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-[#23f8ff]/40"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              {copiedTarget === "usdt" ? "Copied" : "Copy"}
                            </button>
                          </div>
                          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-sm font-semibold break-all">
                            {USDT_TRX_ADDRESS}
                          </div>
                          <p className="text-sm text-slate-400">
                            Send exactly {selectedPlan.price} USDT using TRON (TRX).
                          </p>
                        </div>
                      )}

                      {coin === "LTC" && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold">LTC address</p>
                              <p className="text-xs text-slate-500">Network: Litecoin (LTC)</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(LTC_ADDRESS, "ltc")}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-[#23f8ff]/40"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              {copiedTarget === "ltc" ? "Copied" : "Copy"}
                            </button>
                          </div>
                          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-sm font-semibold break-all">
                            {LTC_ADDRESS}
                          </div>
                          <p className="text-sm text-slate-400">
                            Send the LTC equivalent of {formatUsd(selectedPlan.price)}.
                          </p>
                        </div>
                      )}

                      <ol className="list-decimal pl-5 text-sm text-slate-400 space-y-1.5">
                        <li>Send the payment on the selected network.</li>
                        <li>Wait for confirmations (usually a few minutes).</li>
                        <li>Paste the transaction hash in the verification panel.</li>
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <aside className="space-y-6 animate-reveal" style={{ animationDelay: "160ms" }}>
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 px-5 py-5 shadow-lg shadow-black/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-[#23f8ff] font-semibold">
                      Step 3 - Verify
                    </p>
                    <h2 className="text-2xl font-semibold">Payment summary</h2>
                  </div>
                  <BadgeCheck className="h-5 w-5 text-[#23f8ff]" />
                </div>

                <div className="mt-5 space-y-3.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Plan</span>
                    <span className="font-semibold">{selectedPlan.label}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Duration</span>
                    <span className="font-semibold">{selectedPlan.days} days</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Payment method</span>
                    <span className="font-semibold">
                      {method === "binance_pay" && "Binance Pay"}
                      {method === "gift_card" && "Binance Gift Card"}
                      {method === "crypto" && `Crypto (${coin})`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Amount to send</span>
                    <span className="font-semibold">{amountLabel}</span>
                  </div>

                  {method === "crypto" && coin === "LTC" && (
                    <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200">
                      {quoteStatus === "loading" && "Fetching live LTC quote..."}
                      {quoteStatus === "error" &&
                        "Live conversion unavailable. Send the current LTC equivalent of the USD price."}
                      {quoteStatus === "idle" && ltcQuote &&
                        "Always send the exact amount of LTC required. Current amount already includes network fees. Sending more or less may result in failed verification."}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 px-5 py-5 shadow-lg shadow-black/20">
                <h3 className="text-lg font-semibold">Verification details</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Submit exactly one field based on your payment method.
                </p>

                <div className="mt-4 space-y-3.5">
                  {method === "binance_pay" && (
                    <div>
                      <label className="text-sm font-semibold" htmlFor="order-id">
                        Binance Pay order ID
                      </label>
                      <input
                        id="order-id"
                        type="text"
                        value={orderId}
                        onChange={(event) => setOrderId(event.target.value)}
                        placeholder="Order ID from Binance Pay"
                        className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-[#23f8ff] focus:ring-1 focus:ring-[#23f8ff]/40"
                      />
                    </div>
                  )}

                  {method === "gift_card" && (
                    <div>
                      <label className="text-sm font-semibold" htmlFor="redeem-code">
                        Gift card redeem code
                      </label>
                      <input
                        id="redeem-code"
                        type="text"
                        value={redeemCode}
                        onChange={(event) => setRedeemCode(event.target.value)}
                        placeholder="Binance gift card code"
                        className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-[#23f8ff] focus:ring-1 focus:ring-[#23f8ff]/40"
                      />
                    </div>
                  )}

                  {method === "crypto" && (
                    <div>
                      <label className="text-sm font-semibold" htmlFor="tx-id">
                        Transaction hash (txId)
                      </label>
                      <input
                        id="tx-id"
                        type="text"
                        value={txId}
                        onChange={(event) => setTxId(event.target.value)}
                        placeholder="Paste blockchain transaction hash"
                        className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-[#23f8ff] focus:ring-1 focus:ring-[#23f8ff]/40"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={verifyState.status === "loading"}
                    className="w-full rounded-xl bg-[#23f8ff] px-4 py-2.5 text-sm font-semibold text-slate-900 transition-all hover:bg-[#1ac2c7] hover:shadow-[0_0_20px_rgba(35,248,255,0.35)] disabled:cursor-not-allowed disabled:bg-[#23f8ff]/60"
                  >
                    {verifyState.status === "loading" ? "Verifying..." : "Verify payment"}
                  </button>

                  {verifyState.status !== "idle" && verifyState.message && (
                    <div
                      className={`rounded-xl px-4 py-2.5 text-sm ${
                        verifyState.status === "success"
                          ? "border border-[#23f8ff]/40 bg-[#23f8ff]/10 text-[#9fefff]"
                          : "border border-red-500/40 bg-red-500/10 text-red-200"
                      }`}
                    >
                      {verifyState.message}
                    </div>
                  )}

                  {verifyState.status === "success" && verifyState.key && (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        License key
                      </p>
                      <p className="mt-2 break-all font-mono text-sm">{verifyState.key}</p>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(verifyState.key ?? "", "key")}
                        className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-[#23f8ff]/40"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copiedTarget === "key" ? "Copied" : "Copy key"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 px-5 py-4 text-sm text-slate-400 shadow-lg shadow-black/20">
                Need help? Message support on Discord with your transaction details.
              </div>
            </aside>
          </main>
        </div>
      </div>
    </div>
  );
}
