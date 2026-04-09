"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  CheckCircle2,
  Copy,
  ShieldCheck,
  Sparkles,
  UserRound,
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
  isExistingUser?: boolean;
};

const BINANCE_PAY_ID = "770585563";
const USDT_TRX_ADDRESS = "TJ9tLX6NKF7Zub7v2S7TKnJrsyys1GZdoe";
const LTC_ADDRESS = "LQyQgGRCNWnUzRtdAXDdTpyJVhEqrtz9TC";
const DISCORD_LOGIN_URL = "https://api.harvestbot.app/api/auth/discord/login";
const DISCORD_CALLBACK_URL = "https://api.harvestbot.app/api/auth/discord/callback";
const PAYMENT_WEBHOOK_URL = "https://api.harvestbot.app/api/payment/webhook";

const PLAN_OPTIONS: PlanOption[] = [
  {
    id: "7d",
    label: "Weekly",
    days: 7,
    price: 2,
    tagline: "Quick boost for builder cycles",
    aliases: ["weekly", "7", "7 days", "7-day"],
  },
  {
    id: "15d",
    label: "Bi-Weekly",
    days: 15,
    price: 5,
    tagline: "Solid grind window",
    aliases: ["bi-weekly", "15", "15 days", "15-day"],
  },
  {
    id: "30d",
    label: "Monthly",
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

const normalizePlanToken = (value?: string | null) =>
  (value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const getStoredDiscordId = () =>
  typeof window !== "undefined" ? localStorage.getItem("discord_id") : null;

const getStoredDiscordName = () =>
  typeof window !== "undefined" ? localStorage.getItem("discord_name") : null;

const getStoredDiscordAvatar = () =>
  typeof window !== "undefined" ? localStorage.getItem("discord_avatar") : null;

const resolveDiscordRedirectUri = () => {
  if (typeof window === "undefined") return "";
  const configured = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI;
  if (configured && configured.trim()) return configured.trim();
  if (window.location.hostname === "localhost") {
    return "https://harvestbot.app/verify";
  }
  return `${window.location.origin}/verify`;
};

const getCleanReturnUrl = () => {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("discord_id");
  url.searchParams.delete("state");
  return url.toString();
};

const resolveReturnUrl = () => {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  const stateParam = params.get("state");
  if (stateParam) {
    try {
      const stateUrl = new URL(stateParam, window.location.origin);
      if (stateUrl.origin === window.location.origin) {
        const hasPlan = stateUrl.searchParams.has("plan");
        const hasAmount = stateUrl.searchParams.has("amount");
        if (hasPlan || hasAmount) return stateUrl.toString();
      }
    } catch {
      // Ignore invalid state values.
    }
  }

  const sessionValue = sessionStorage.getItem("discord_return_url");
  if (sessionValue) {
    try {
      const sessionUrl = new URL(sessionValue, window.location.origin);
      if (sessionUrl.origin === window.location.origin) return sessionUrl.toString();
    } catch {
      // Ignore invalid session values.
    }
  }

  return getCleanReturnUrl();
};

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

export default function VerifyClient() {
  const searchParams = useSearchParams();
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedPlanId, setSelectedPlanId] = useState(PLAN_OPTIONS[0].id);
  const [method, setMethod] = useState<MethodId>("binance_pay");
  const [coin, setCoin] = useState<Coin>("USDT");
  const [discordId, setDiscordId] = useState<string | null>(null);
  const [discordName, setDiscordName] = useState<string | null>(null);
  const [discordAvatar, setDiscordAvatar] = useState<string | null>(null);
  const [orderId, setOrderId] = useState("");
  const [redeemCode, setRedeemCode] = useState("");
  const [txId, setTxId] = useState("");
  const [existingUsername, setExistingUsername] = useState("");
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null);
  const [ltcQuote, setLtcQuote] = useState<string | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<"idle" | "loading" | "error">("idle");
  const [verifyState, setVerifyState] = useState<VerifyState>({ status: "idle" });

  const selectedPlan =
    PLAN_OPTIONS.find((plan) => plan.id === selectedPlanId) ?? PLAN_OPTIONS[0];
  const discordAvatarUrl =
    discordId && discordAvatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatar}.png?size=96`
      : null;
  const discordInitial = discordName?.trim().charAt(0).toUpperCase() ?? "D";
  const isDiscordLinked = Boolean(discordId);
  const buildReturnUrl = () => {
    if (typeof window === "undefined") return "";
    const baseUrl = getCleanReturnUrl();
    let url: URL;

    try {
      url = new URL(baseUrl || `${window.location.origin}/verify`);
    } catch {
      url = new URL(`${window.location.origin}/verify`);
    }

    if (!url.searchParams.has("plan")) {
      url.searchParams.set("plan", selectedPlan.label);
    }
    if (!url.searchParams.has("amount")) {
      url.searchParams.set("amount", String(selectedPlan.price));
    }

    return url.toString();
  };

  useEffect(() => {
    setDiscordId(getStoredDiscordId());
    setDiscordName(getStoredDiscordName());
    setDiscordAvatar(getStoredDiscordAvatar());
  }, []);

  useEffect(() => {
    const planParam = normalizeQuery(searchParams.get("plan"));
    const normalizedPlanParam = normalizePlanToken(planParam);
    const amountParam = getNumeric(searchParams.get("amount"));

    const matched = PLAN_OPTIONS.find((plan) => {
      const matchesAmount = amountParam !== null && amountParam === plan.price;
      const matchesAlias =
        normalizedPlanParam &&
        (normalizePlanToken(plan.label) === normalizedPlanParam ||
          plan.aliases.some(
            (alias) => normalizePlanToken(alias) === normalizedPlanParam
          ));
      return matchesAmount || matchesAlias;
    });

    if (matched) setSelectedPlanId(matched.id);
  }, [searchParams]);

  useEffect(() => {
    const discordParam = searchParams.get("discord_id");
    if (discordParam) {
      const storedId = getStoredDiscordId();
      if (storedId && storedId !== discordParam) {
        localStorage.removeItem("discord_name");
        localStorage.removeItem("discord_avatar");
        setDiscordName(null);
        setDiscordAvatar(null);
      }

      localStorage.setItem("discord_id", discordParam);
      setDiscordId(discordParam);
      const returnUrl = resolveReturnUrl();
      sessionStorage.removeItem("discord_return_url");
      window.history.replaceState({}, document.title, returnUrl || window.location.pathname);
      return;
    }

    const codeParam = searchParams.get("code");
    if (!codeParam) return;

    const redirectUri = resolveDiscordRedirectUri();
    if (!redirectUri) return;
    const callbackUrl = new URL(DISCORD_CALLBACK_URL);
    callbackUrl.searchParams.set("code", codeParam);
    callbackUrl.searchParams.set("redirect_uri", redirectUri);
    callbackUrl.searchParams.set("return_url", resolveReturnUrl());

    let active = true;

    fetch(callbackUrl.toString())
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const receivedId = data?.discord_id ? String(data.discord_id) : "";
        if (receivedId) {
          localStorage.setItem("discord_id", receivedId);
          setDiscordId(receivedId);

          const receivedName = data?.name ? String(data.name) : "";
          const receivedAvatar = data?.avatar ? String(data.avatar) : "";

          if (receivedName) {
            localStorage.setItem("discord_name", receivedName);
            setDiscordName(receivedName);
          } else {
            localStorage.removeItem("discord_name");
            setDiscordName(null);
          }

          if (receivedAvatar) {
            localStorage.setItem("discord_avatar", receivedAvatar);
            setDiscordAvatar(receivedAvatar);
          } else {
            localStorage.removeItem("discord_avatar");
            setDiscordAvatar(null);
          }
        }
        const returnUrl = resolveReturnUrl();
        sessionStorage.removeItem("discord_return_url");
        window.history.replaceState({}, document.title, returnUrl || window.location.pathname);
      })
      .catch(() => {
        if (!active) return;
        const returnUrl = resolveReturnUrl();
        sessionStorage.removeItem("discord_return_url");
        window.history.replaceState({}, document.title, returnUrl || window.location.pathname);
      });

    return () => {
      active = false;
    };
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

  const startDiscordLogin = async () => {
    const redirectUri = resolveDiscordRedirectUri();
    if (!redirectUri) return;
    const loginUrl = new URL(DISCORD_LOGIN_URL);
    const returnUrl = buildReturnUrl();
    if (!returnUrl) return;

    sessionStorage.setItem("discord_return_url", returnUrl);

    try {
      const res = await fetch(loginUrl.toString());
      const data = await res.json().catch(() => ({}));
      const target = typeof data?.url === "string" ? data.url.trim() : "";
      if (!target) return;
      const authUrl = new URL(target);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("state", returnUrl);
      window.location.href = authUrl.toString();
    } catch {
      // Ignore login errors for now.
    }
  };

  const handleDiscordLogout = () => {
    localStorage.removeItem("discord_id");
    localStorage.removeItem("discord_name");
    localStorage.removeItem("discord_avatar");
    setDiscordId(null);
    setDiscordName(null);
    setDiscordAvatar(null);
  };

  const handleVerify = async () => {
    const storedDiscordId = discordId ?? getStoredDiscordId();
    if (!storedDiscordId) {
      alert("Connect Discord before payment");
      return;
    }

    setVerifyState({ status: "loading" });

    const trimmedExistingUsername = existingUsername.trim();
    const isExistingUser = Boolean(trimmedExistingUsername);
    let payload: Record<string, string> = { discord_id: storedDiscordId };

    if (trimmedExistingUsername) {
      payload.existing_username = trimmedExistingUsername;
    }

    if (method === "binance_pay") {
      if (!orderId.trim()) {
        setVerifyState({
          status: "error",
          message: "Enter your Binance Pay order ID to continue.",
        });
        return;
      }
      payload.order_id = orderId.trim();
    } else if (method === "gift_card") {
      if (!redeemCode.trim()) {
        setVerifyState({
          status: "error",
          message: "Enter your Binance gift card redeem code.",
        });
        return;
      }
      payload.redeem_code = redeemCode.trim();
    } else {
      if (!txId.trim()) {
        setVerifyState({
          status: "error",
          message: "Enter the transaction hash to verify crypto payments.",
        });
        return;
      }
      payload.coin = coin;
      payload.tx_id = txId.trim();
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
        const webhookRes = await fetch(PAYMENT_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ discord_id: storedDiscordId }),
        });

        if (!webhookRes.ok) {
          const webhookData = await webhookRes.json().catch(() => ({}));
          setVerifyState({
            status: "error",
            message:
              webhookData?.detail ||
              "Payment verified, but role assignment failed. Contact support.",
          });
          return;
        }

        const webhookData = await webhookRes.json().catch(() => ({}));
        const roleStatus = webhookData?.status ? String(webhookData.status) : "";
        const baseMessage = isExistingUser
          ? "Extension applied. Your access has been extended."
          : alreadyVerified
            ? "Transaction already verified. Your access is active."
            : "Payment verified. Access is being delivered.";

        setVerifyState({
          status: "success",
          message: isExistingUser
            ? baseMessage
            : roleStatus
              ? `${baseMessage} ${roleStatus}.`
              : baseMessage,
          key: isExistingUser ? undefined : data?.key ? String(data.key) : undefined,
          alreadyVerified,
          isExistingUser,
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
  const isVerifyDisabled = isDiscordLinked && verifyState.status === "loading";
  const verifyButtonLabel = !isDiscordLinked
    ? "Connect Discord to continue"
    : verifyState.status === "loading"
      ? "Verifying..."
      : "Verify payment";
  const handlePrimaryAction = isDiscordLinked ? handleVerify : startDiscordLogin;

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
                  <p className="text-xs text-slate-500">Your information is encrypted and secure</p>
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
                      Step 3 - Connect Discord
                    </p>
                    <h2 className="text-2xl font-semibold">Discord access</h2>
                  </div>
                  <UserRound className="h-5 w-5 text-[#23f8ff]" />
                </div>
                <p className="mt-3 text-sm text-slate-400">
                  Link your Discord so we can deliver roles and verification updates.
                </p>
                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {discordId ? (
                        <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">
                          {discordAvatarUrl ? (
                            <img
                              src={discordAvatarUrl}
                              alt="Discord avatar"
                              className="h-8 w-8 rounded-full border border-slate-700 object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-[11px] font-semibold uppercase text-slate-300">
                              {discordInitial}
                            </div>
                          )}
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                              Connected
                            </p>
                            <p className="text-sm font-semibold">
                              {discordName ?? "Discord connected"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400">No Discord linked yet.</p>
                      )}
                    </div>
                    <div className="ml-auto flex shrink-0 items-center gap-2">
                      {!discordId && (
                        <button
                          type="button"
                          onClick={startDiscordLogin}
                          className="rounded-full bg-[#23f8ff] px-4 py-2 text-xs font-semibold text-slate-900 shadow-[0_0_18px_rgba(35,248,255,0.35)] transition hover:bg-[#1ac2c7]"
                        >
                          Connect Discord
                        </button>
                      )}
                      {discordId && (
                        <button
                          type="button"
                          onClick={handleDiscordLogout}
                          className="rounded-full border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:border-red-400/60 hover:text-red-200"
                        >
                          Log out
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 px-5 py-5 shadow-lg shadow-black/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-[#23f8ff] font-semibold">
                      Step 4 - Verify
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
                  Submit the payment details properly to ensure smooth and quick verification.
                </p>

                <div className="mt-4 space-y-3.5">
                  <div>
                    <label className="text-sm font-semibold" htmlFor="existing-username">
                      Existing username (optional)
                    </label>
                    <input
                      id="existing-username"
                      type="text"
                      value={existingUsername}
                      onChange={(event) => setExistingUsername(event.target.value)}
                      placeholder="Harvest Bot username to extend"
                      className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-[#23f8ff] focus:ring-1 focus:ring-[#23f8ff]/40"
                    />
                  </div>
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

                  {/* {!isDiscordLinked && (
                    <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200">
                      Connect Discord to unlock payment verification.
                    </div>
                  )} */}

                  <button
                    type="button"
                    onClick={handlePrimaryAction}
                    disabled={isVerifyDisabled}
                    className="w-full rounded-xl bg-[#23f8ff] px-4 py-2.5 text-sm font-semibold text-slate-900 transition-all hover:bg-[#1ac2c7] hover:shadow-[0_0_20px_rgba(35,248,255,0.35)] disabled:cursor-not-allowed disabled:bg-[#23f8ff]/60"
                  >
                    {verifyButtonLabel}
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

                  {verifyState.status === "success" &&
                    !verifyState.isExistingUser &&
                    verifyState.key && (
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

                  {verifyState.status === "success" && !verifyState.isExistingUser && (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Setup guide
                      </p>
                      <ol className="mt-2 list-decimal pl-5 space-y-1.5 text-sm text-slate-300">
                        <li>
                          Download the bot from the home page or{" "}
                          <a
                            href="https://harvestbot.app/download/setup.exe"
                            className="text-[#23f8ff] hover:underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            https://harvestbot.app/download/setup.exe
                          </a>
                          .
                        </li>
                        <li>
                          Follow the setup tutorial in Discord:{" "}
                          <a
                            href="https://discord.com/channels/1436624981038727281/1475260520386007070"
                            className="text-[#23f8ff] hover:underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            setup-tutorial channel
                          </a>
                          .
                        </li>
                      </ol>
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
