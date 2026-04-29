'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft,
  ShieldCheck,
  BadgeCheck,
  CheckCircle2,
  Copy,
  Sparkles,
  UserRound,
  Wallet,
} from 'lucide-react';

// --- ENVIRONMENT MODE ---
// 'auto'       : pick local when running on localhost/127.0.0.1, otherwise production
// 'local'      : force local URLs (for local-only testing against a local backend)
// 'production' : force production URLs
const MODE: "auto" | "local" | "production" = "auto";

const ENVIRONMENTS = {
  local: {
    apiBaseUrl: "http://localhost",
    siteOrigin: "http://localhost:3000",
  },
  production: {
    apiBaseUrl: "https://api.harvestbot.app",
    siteOrigin: "https://harvestbot.app",
  },
} as const;

const getEnv = () => {
  if (MODE !== "auto") return ENVIRONMENTS[MODE];
  if (typeof window === "undefined") return ENVIRONMENTS.production;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") {
    return ENVIRONMENTS.local;
  }
  return ENVIRONMENTS.production;
};

// --- CONSTANTS ---

const BINANCE_PAY_ID = "770585563";
const USDT_TRX_ADDRESS = "TJ9tLX6NKF7Zub7v2S7TKnJrsyys1GZdoe";
const LTC_ADDRESS = "LQyQgGRCNWnUzRtdAXDdTpyJVhEqrtz9TC";
const apiUrl = (path: string) => `${getEnv().apiBaseUrl}${path}`;

const PLAN_OPTIONS = [
  { id: "7d", label: "Weekly", days: 7, price: 2, tagline: "Quick boost for builder cycles", aliases: ["weekly", "7", "7 days", "7-day"] },
  { id: "15d", label: "Bi-Weekly", days: 15, price: 5, tagline: "Solid grind window", aliases: ["bi-weekly", "15", "15 days", "15-day", "biweekly"] },
  { id: "30d", label: "Monthly", days: 30, price: 8, tagline: "Best for long farms", aliases: ["monthly", "30", "30 days", "30-day"] },
  { id: "lifetime", label: "Lifetime", days: 3650, price: 35, tagline: "One payment, always on", aliases: ["lifetime", "3650", "3650 days"] },
];

// --- HELPERS ---

const formatUsd = (amount: number) => `$${amount}`;
const normalizePlanToken = (value: string | null | undefined) =>
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
    return "https://harvestbot.app/payment";
  }
  return `${window.location.origin}/payment`;
};

const getCleanReturnUrl = () => {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("discord_id");
  url.searchParams.delete("discord_name");
  url.searchParams.delete("discord_avatar");
  url.searchParams.delete("state");
  return url.toString();
};

const isLocalOrigin = (url: URL) =>
  ["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname);

const isAllowedReturnUrl = (url: URL) => {
  if (typeof window === "undefined") return false;
  if (url.origin === window.location.origin) return true;
  return isLocalOrigin(url) && url.pathname.replace(/\/$/, "") === "/payment";
};

const resolveReturnUrl = () => {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  const stateParam = params.get("state");
  if (stateParam) {
    try {
      const stateUrl = new URL(stateParam, window.location.origin);
      if (isAllowedReturnUrl(stateUrl)) {
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
      if (isAllowedReturnUrl(sessionUrl)) return sessionUrl.toString();
    } catch {
      // Ignore invalid session values.
    }
  }

  return getCleanReturnUrl();
};

const setOptionalStorageValue = (key: string, value: string | null) => {
  if (!value) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, value);
};

const buildDiscordReturnUrl = (
  returnUrl: string,
  identity?: { id?: string; name?: string; avatar?: string }
) => {
  if (!returnUrl) return "";
  try {
    const target = new URL(returnUrl, window.location.origin);
    if (!isAllowedReturnUrl(target)) return "";

    if (target.origin !== window.location.origin && identity?.id) {
      target.searchParams.set("discord_id", identity.id);
      if (identity.name) target.searchParams.set("discord_name", identity.name);
      if (identity.avatar) target.searchParams.set("discord_avatar", identity.avatar);
    }

    return target.toString();
  } catch {
    return "";
  }
};

const finishDiscordCallback = (
  returnUrl: string,
  identity?: { id?: string; name?: string; avatar?: string }
) => {
  sessionStorage.removeItem("discord_redirect_uri");
  sessionStorage.removeItem("discord_return_url");

  const targetUrl = buildDiscordReturnUrl(returnUrl, identity);
  if (!targetUrl) {
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }

  const target = new URL(targetUrl, window.location.origin);
  if (target.origin !== window.location.origin) {
    window.location.replace(target.toString());
    return;
  }

  window.history.replaceState({}, document.title, target.toString());
};

const getNumeric = (value: unknown): number | null => {
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

const resolveInitialPlanId = (incomingPlan: any) => {
  if (!incomingPlan) return PLAN_OPTIONS[0].id;
  const planLabel = String(incomingPlan.name ?? incomingPlan.label ?? incomingPlan.id ?? "");
  const normalized = normalizePlanToken(planLabel);
  const numericPrice = Number(String(incomingPlan.price ?? "").replace(/[^0-9.]/g, ""));
  const matched = PLAN_OPTIONS.find((p) => {
    if (numericPrice && numericPrice === p.price) return true;
    if (
      normalized &&
      (normalizePlanToken(p.label) === normalized ||
        normalizePlanToken(p.id) === normalized ||
        p.aliases.some((a) => normalizePlanToken(a) === normalized))
    ) {
      return true;
    }
    return false;
  });
  return matched?.id ?? PLAN_OPTIONS[0].id;
};

// --- CHECKOUT PAGE COMPONENT ---

function CheckoutPage() {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(() => {
    if (typeof window === "undefined") return PLAN_OPTIONS[0].id;
    const params = new URLSearchParams(window.location.search);
    const planParam = params.get("plan");
    const amountParam = getNumeric(params.get("amount"));
    const normalizedPlanParam = normalizePlanToken(planParam);
    const matched = PLAN_OPTIONS.find((p) => {
      const matchesAmount = amountParam !== null && amountParam === p.price;
      const matchesAlias =
        normalizedPlanParam &&
        (normalizePlanToken(p.label) === normalizedPlanParam ||
          p.aliases.some((alias) => normalizePlanToken(alias) === normalizedPlanParam));
      return matchesAmount || matchesAlias;
    });
    return matched?.id ?? PLAN_OPTIONS[0].id;
  });
  
  const [method, setMethod] = useState<"binance_pay" | "gift_card" | "crypto">(() => {
    if (typeof window === "undefined") return "binance_pay";
    const params = new URLSearchParams(window.location.search);
    const paymentParam = params.get("payment");
    if (["binance_pay", "gift_card"].includes(paymentParam ?? "")) {
      return paymentParam as "binance_pay" | "gift_card";
    }
    if (["USDT", "LTC"].includes(paymentParam ?? "")) {
      return "crypto";
    }
    return "binance_pay";
  });
  
  const [coin, setCoin] = useState<"USDT" | "LTC">(() => {
    if (typeof window === "undefined") return "USDT";
    const params = new URLSearchParams(window.location.search);
    const paymentParam = params.get("payment");
    if (paymentParam === "LTC") return "LTC";
    if (paymentParam === "USDT") return "USDT";
    return "USDT";
  });
  
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
  const [verifyState, setVerifyState] = useState<{
    status: "idle" | "loading" | "success" | "error";
    message?: string;
    key?: string;
    alreadyVerified?: boolean;
    isExistingUser?: boolean;
  }>({ status: "idle" });
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedPlan = PLAN_OPTIONS.find((p) => p.id === selectedPlanId) ?? PLAN_OPTIONS[0];
  const discordAvatarUrl =
    discordId && discordAvatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatar}.png?size=96`
      : null;
  const discordInitial = discordName?.trim().charAt(0).toUpperCase() ?? "D";
  const isDiscordLinked = Boolean(discordId);

  const buildReturnUrl = () => {
    if (typeof window === "undefined") return "";
    const baseUrl = getCleanReturnUrl();
    let url;
    try {
      url = new URL(baseUrl || `${window.location.origin}/payment`);
    } catch {
      url = new URL(`${window.location.origin}/payment`);
    }
    if (!url.searchParams.has("plan")) url.searchParams.set("plan", selectedPlan.label);
    return url.toString();
  };

  // Hydrate Discord identity from localStorage
  useEffect(() => {
    setDiscordId(getStoredDiscordId());
    setDiscordName(getStoredDiscordName());
    setDiscordAvatar(getStoredDiscordAvatar());
  }, []);

  // Handle Discord OAuth callback (?code=) or ?discord_id= directly.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    const discordParam = params.get("discord_id");
    if (discordParam) {
      const discordNameParam = params.get("discord_name");
      const discordAvatarParam = params.get("discord_avatar");
      const storedId = getStoredDiscordId();
      if (storedId && storedId !== discordParam) {
        localStorage.removeItem("discord_name");
        localStorage.removeItem("discord_avatar");
        setDiscordName(null);
        setDiscordAvatar(null);
      }
      localStorage.setItem("discord_id", discordParam);
      setDiscordId(discordParam);
      setOptionalStorageValue("discord_name", discordNameParam);
      setOptionalStorageValue("discord_avatar", discordAvatarParam);
      setDiscordName(discordNameParam || null);
      setDiscordAvatar(discordAvatarParam || null);
      const returnUrl = resolveReturnUrl();
      finishDiscordCallback(returnUrl);
      return;
    }

    const codeParam = params.get("code");
    if (!codeParam) return;

    const redirectUri = resolveDiscordRedirectUri();
    if (!redirectUri) return;
    const callbackUrl = new URL(apiUrl("/api/auth/discord/callback"));
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
        finishDiscordCallback(returnUrl, {
          id: receivedId,
          name: data?.name ? String(data.name) : "",
          avatar: data?.avatar ? String(data.avatar) : "",
        });
      })
      .catch(() => {
        if (!active) return;
        const returnUrl = resolveReturnUrl();
        finishDiscordCallback(returnUrl);
      });

    return () => {
      active = false;
    };
  }, []);

  // Reset verify state when changes alter the payment context.
  useEffect(() => {
    setVerifyState({ status: "idle" });
  }, [method, coin, selectedPlanId]);

  // Live LTC quote when crypto + LTC.
  useEffect(() => {
    if (method !== "crypto" || coin !== "LTC") {
      setLtcQuote(null);
      setQuoteStatus("idle");
      return;
    }
    let active = true;
    setQuoteStatus("loading");

    fetch(apiUrl("/api/v1/payments/USDTtoLTC"), {
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

  // Sync URL whenever plan, method, or coin changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const paymentParam = method === "crypto" ? coin : method;
    const url = new URL(window.location.href);
    url.searchParams.set("plan", selectedPlan.label.toLowerCase());
    url.searchParams.set("payment", paymentParam);
    window.history.replaceState({}, document.title, url.toString());
  }, [selectedPlanId, method, coin, selectedPlan.label]);

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
    const loginUrl = new URL(apiUrl("/api/auth/discord/login"));
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
    const payload: Record<string, string> = {};

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
      const res = await fetch(apiUrl("/api/v1/payments/verify"), {
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
        const webhookRes = await fetch(apiUrl("/api/payment/webhook"), {
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
    return `${formatUsd(selectedPlan.price)} USDT`;
  })();

  const isVerifyDisabled = isDiscordLinked && verifyState.status === "loading";
  const verifyButtonLabel = !isDiscordLinked
    ? "Connect Discord to continue"
    : verifyState.status === "loading"
      ? "Verifying..."
      : "Verify payment";
  const handlePrimaryAction = isDiscordLinked ? handleVerify : startDiscordLogin;

  const methodLabel =
    method === "binance_pay" ? "Binance Pay" : method === "gift_card" ? "Binance Gift Card" : `Crypto (${coin})`;

  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 font-sans relative selection:bg-[#23f8ff]/30">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 right-[-10%] w-72 h-72 md:w-[28rem] md:h-[28rem] bg-[#23f8ff]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-72 h-72 md:w-[28rem] md:h-[28rem] bg-purple-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-16 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-[#23f8ff]/5 blur-[120px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 lg:pt-10 pb-6 lg:pb-9">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <button
                onClick={handleBack}
                className="group inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-neutral-500 hover:text-[#23f8ff] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                Back to HarvestBot
              </button>
              <h1 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
                Payment Gateway
              </h1>
              <p className="mt-3 max-w-xl text-sm sm:text-base text-neutral-400">
                Pick your plan, pay with your preferred method, then verify to unlock access.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-neutral-900/60 backdrop-blur border border-white/5 px-4 py-2.5 self-start lg:self-auto">
              <ShieldCheck className="h-5 w-5 text-[#23f8ff]" />
              <div>
                <p className="text-sm font-semibold text-white">Secure checkout</p>
                <p className="text-xs text-neutral-500">Your information is encrypted and secure</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-14 grid gap-6 lg:gap-9 lg:grid-cols-[1.1fr_0.9fr] items-start">
          {/* LEFT: Plan + Payment method */}
          <section className="space-y-6 lg:space-y-8">
            {/* Step 1 — Plan */}
            <div className="rounded-2xl border border-white/5 bg-neutral-900/40 backdrop-blur px-5 py-5 sm:px-6 sm:py-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#23f8ff] font-bold">
                    Step 1 — Choose plan
                  </p>
                  <h2 className="mt-1.5 text-xl sm:text-2xl font-bold text-white">Access duration</h2>
                </div>
                <Sparkles className="h-5 w-5 text-[#23f8ff] shrink-0 mt-1" />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {PLAN_OPTIONS.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlanId(plan.id)}
                      aria-pressed={isSelected}
                      className={`relative rounded-xl border px-4 py-4 sm:px-5 sm:py-4 text-left transition-all ${
                        isSelected
                          ? "border-[#23f8ff]/50 bg-[#23f8ff]/[0.05] shadow-[0_0_30px_rgba(35,248,255,0.08)]"
                          : "border-white/5 bg-neutral-950/60 hover:border-white/10 hover:bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-base sm:text-lg font-bold text-white">{plan.label}</p>
                          <p className="text-xs sm:text-sm text-neutral-500">{plan.days} days access</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-xl sm:text-2xl font-bold ${isSelected ? "text-[#23f8ff]" : "text-white"}`}>
                            {formatUsd(plan.price)}
                          </p>
                          <p className="text-[10px] sm:text-xs text-neutral-500">one time</p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs sm:text-sm text-neutral-400">{plan.tagline}</p>
                      {isSelected && (
                        <div className="mt-3 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#23f8ff]">
                          <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          Selected
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2 — Payment method */}
            <div className="rounded-2xl border border-white/5 bg-neutral-900/40 backdrop-blur px-5 py-5 sm:px-6 sm:py-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#23f8ff] font-bold">
                    Step 2 — Payment method
                  </p>
                  <h2 className="mt-1.5 text-xl sm:text-2xl font-bold text-white">Select how you want to pay</h2>
                </div>
                <Wallet className="h-5 w-5 text-[#23f8ff] shrink-0 mt-1" />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {[
                  { id: "binance_pay" as const, title: "Binance Pay", desc: "Send to ID and verify order" },
                  { id: "gift_card" as const, title: "Binance Gift Card", desc: "Redeem code verification" },
                  { id: "crypto" as const, title: "Crypto", desc: "USDT (TRX) or LTC transfer" },
                ].map((option) => {
                  const isSelected = method === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setMethod(option.id)}
                      aria-pressed={isSelected}
                      className={`rounded-xl border px-4 py-4 text-left transition-all ${
                        isSelected
                          ? "border-[#23f8ff]/50 bg-[#23f8ff]/[0.05] shadow-[0_0_20px_rgba(35,248,255,0.08)]"
                          : "border-white/5 bg-neutral-950/60 hover:border-white/10 hover:bg-white/[0.02]"
                      }`}
                    >
                      <p className={`text-sm font-bold ${isSelected ? "text-white" : "text-neutral-200"}`}>{option.title}</p>
                      <p className="mt-2 text-xs text-neutral-500">{option.desc}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 rounded-xl border border-white/5 bg-[#050505] px-4 py-4 sm:px-5 sm:py-5">
                {method === "binance_pay" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">Binance Pay ID</p>
                        <p className="text-xs text-neutral-500">Send payment to the ID below.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(BINANCE_PAY_ID, "binance")}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1 text-[11px] font-semibold text-neutral-200 transition-colors"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copiedTarget === "binance" ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-neutral-950/60 px-4 py-2.5 font-mono text-base sm:text-lg font-bold text-[#23f8ff] tracking-wider">
                      {BINANCE_PAY_ID}
                    </div>
                    <ol className="list-decimal pl-5 text-xs sm:text-sm text-neutral-400 space-y-1.5">
                      <li>Open Binance Pay and send {formatUsd(selectedPlan.price)}.</li>
                      <li>Grab the Binance order ID after payment.</li>
                      <li>Paste the order ID in the verification panel.</li>
                    </ol>
                  </div>
                )}

                {method === "gift_card" && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-white">Binance Gift Card</p>
                      <p className="text-xs text-neutral-500">
                        Pay with a Binance gift card and verify the redeem code.
                      </p>
                    </div>
                    <ol className="list-decimal pl-5 text-xs sm:text-sm text-neutral-400 space-y-1.5">
                      <li>Buy a Binance USDT gift card for {formatUsd(selectedPlan.price)}.</li>
                      <li>Locate the redeem code provided by Binance.</li>
                      <li>Paste the redeem code in the verification panel.</li>
                    </ol>
                  </div>
                )}

                {method === "crypto" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCoin("USDT")}
                        className={`rounded-full border px-4 py-1.5 text-[11px] font-bold transition-all ${
                          coin === "USDT"
                            ? "border-[#23f8ff]/50 bg-[#23f8ff]/[0.05] text-[#23f8ff]"
                            : "border-white/10 bg-neutral-950 text-neutral-500 hover:text-neutral-300"
                        }`}
                      >
                        USDT (TRX)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCoin("LTC")}
                        className={`rounded-full border px-4 py-1.5 text-[11px] font-bold transition-all ${
                          coin === "LTC"
                            ? "border-[#23f8ff]/50 bg-[#23f8ff]/[0.05] text-[#23f8ff]"
                            : "border-white/10 bg-neutral-950 text-neutral-500 hover:text-neutral-300"
                        }`}
                      >
                        LTC
                      </button>
                    </div>

                    {coin === "USDT" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">USDT (TRX) address</p>
                            <p className="text-xs text-neutral-500">Network: TRON (TRX)</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(USDT_TRX_ADDRESS, "usdt")}
                            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1 text-[11px] font-semibold text-neutral-200 transition-colors"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            {copiedTarget === "usdt" ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-neutral-950/60 px-4 py-2.5 font-mono text-xs sm:text-sm font-semibold text-[#23f8ff] break-all">
                          {USDT_TRX_ADDRESS}
                        </div>
                        <p className="text-xs sm:text-sm text-neutral-400">
                          Send exactly {selectedPlan.price} USDT using TRON (TRX).
                        </p>
                      </div>
                    )}

                    {coin === "LTC" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">LTC address</p>
                            <p className="text-xs text-neutral-500">Network: Litecoin (LTC)</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(LTC_ADDRESS, "ltc")}
                            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1 text-[11px] font-semibold text-neutral-200 transition-colors"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            {copiedTarget === "ltc" ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-neutral-950/60 px-4 py-2.5 font-mono text-xs sm:text-sm font-semibold text-[#23f8ff] break-all">
                          {LTC_ADDRESS}
                        </div>
                        <p className="text-xs sm:text-sm text-neutral-400">
                          Send the LTC equivalent of {formatUsd(selectedPlan.price)}.
                        </p>
                      </div>
                    )}

                    <ol className="list-decimal pl-5 text-xs sm:text-sm text-neutral-400 space-y-1.5">
                      <li>Send the payment on the selected network.</li>
                      <li>Wait for confirmations (usually a few minutes).</li>
                      <li>Paste the transaction hash in the verification panel.</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* RIGHT: Discord + Summary + Verification */}
          <aside className="space-y-5 lg:space-y-6">
            {/* Step 3 — Discord */}
            <div className="rounded-2xl border border-white/5 bg-neutral-900/60 backdrop-blur px-5 py-5 sm:px-6 sm:py-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#23f8ff] font-bold">
                    Step 3 — Connect Discord
                  </p>
                  <h2 className="mt-1.5 text-xl sm:text-2xl font-bold text-white">Discord access</h2>
                </div>
                <UserRound className="h-5 w-5 text-[#23f8ff] shrink-0 mt-1" />
              </div>
              <p className="mt-3 text-xs sm:text-sm text-neutral-400">
                Link your Discord so we can deliver roles and verification updates.
              </p>
              <div className="mt-4 rounded-xl border border-white/5 bg-[#050505] px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {isDiscordLinked ? (
                      <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-200 min-w-0">
                        {discordAvatarUrl ? (
                          <img
                            src={discordAvatarUrl}
                            alt="Discord avatar"
                            className="h-8 w-8 rounded-full border border-white/10 object-cover shrink-0"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-neutral-900 text-[11px] font-bold uppercase text-neutral-300 shrink-0">
                            {discordInitial}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-[#23f8ff] font-bold">
                            Connected
                          </p>
                          <p className="text-sm font-semibold text-white truncate">
                            {discordName ?? "Discord connected"}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-neutral-400">No Discord linked yet.</p>
                    )}
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    {!isDiscordLinked && (
                      <button
                        type="button"
                        onClick={startDiscordLogin}
                        className="rounded-full bg-[#23f8ff] hover:bg-[#1edce3] px-4 py-2 text-xs font-bold text-neutral-950 shadow-[0_0_18px_rgba(35,248,255,0.25)] transition-colors"
                      >
                        Connect Discord
                      </button>
                    )}
                    {isDiscordLinked && (
                      <button
                        type="button"
                        onClick={handleDiscordLogout}
                        className="rounded-full border border-white/10 bg-neutral-950 hover:border-red-400/40 hover:text-red-200 px-3 py-2 text-[11px] font-semibold text-neutral-400 transition-colors"
                      >
                        Log out
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 — Payment summary */}
            <div className="rounded-2xl border border-white/5 bg-neutral-900/60 backdrop-blur px-5 py-5 sm:px-6 sm:py-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#23f8ff] font-bold">
                    Step 4 — Verify
                  </p>
                  <h2 className="mt-1.5 text-xl sm:text-2xl font-bold text-white">Payment summary</h2>
                </div>
                <BadgeCheck className="h-5 w-5 text-[#23f8ff] shrink-0 mt-1" />
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Plan</span>
                  <span className="font-semibold text-white">{selectedPlan.label}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Duration</span>
                  <span className="font-semibold text-white">{selectedPlan.days} days</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Payment method</span>
                  <span className="font-semibold text-white">{methodLabel}</span>
                </div>
                <div className="flex items-center justify-between text-sm pt-3 border-t border-white/5">
                  <span className="text-neutral-500">Amount to send</span>
                  <span className="font-bold text-base sm:text-lg text-white">{amountLabel}</span>
                </div>

                {method === "crypto" && coin === "LTC" && (
                  <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-[11px] sm:text-xs text-amber-200 leading-relaxed">
                    {quoteStatus === "loading" && "Fetching live LTC quote..."}
                    {quoteStatus === "error" &&
                      "Live conversion unavailable. Send the current LTC equivalent of the USD price."}
                    {quoteStatus === "idle" && ltcQuote &&
                      "Always send the exact amount of LTC required. Current amount already includes network fees. Sending more or less may result in failed verification."}
                  </div>
                )}
              </div>
            </div>

            {/* Verification details */}
            <div className="rounded-2xl border border-white/5 bg-neutral-900/60 backdrop-blur px-5 py-5 sm:px-6 sm:py-6">
              <h3 className="text-base sm:text-lg font-bold text-white">Verification details</h3>
              <p className="mt-2 text-xs sm:text-sm text-neutral-400">
                Submit the payment details properly to ensure smooth and quick verification.
              </p>

              <div className="mt-4 space-y-3.5">
                <div>
                  <label className="text-xs sm:text-sm font-semibold text-white" htmlFor="existing-username">
                    Existing username <span className="text-neutral-500 font-normal">(optional)</span>
                  </label>
                  <input
                    id="existing-username"
                    type="text"
                    value={existingUsername}
                    onChange={(e) => setExistingUsername(e.target.value)}
                    placeholder="Harvest Bot username to extend"
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#050505] px-3 py-2.5 text-xs sm:text-sm text-white outline-none placeholder:text-neutral-600 focus:border-[#23f8ff]/50 focus:ring-1 focus:ring-[#23f8ff]/30 transition-all"
                  />
                </div>

                {method === "binance_pay" && (
                  <div>
                    <label className="text-xs sm:text-sm font-semibold text-white" htmlFor="order-id">
                      Binance Pay order ID
                    </label>
                    <input
                      id="order-id"
                      type="text"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      placeholder="Order ID from Binance Pay"
                      className="mt-2 w-full rounded-lg border border-white/10 bg-[#050505] px-3 py-2.5 text-xs sm:text-sm text-white outline-none placeholder:text-neutral-600 focus:border-[#23f8ff]/50 focus:ring-1 focus:ring-[#23f8ff]/30 transition-all font-mono"
                    />
                  </div>
                )}

                {method === "gift_card" && (
                  <div>
                    <label className="text-xs sm:text-sm font-semibold text-white" htmlFor="redeem-code">
                      Gift card redeem code
                    </label>
                    <input
                      id="redeem-code"
                      type="text"
                      value={redeemCode}
                      onChange={(e) => setRedeemCode(e.target.value)}
                      placeholder="Binance gift card code (e.g. A1B2C3D4E5F6G7H8)"
                      className="mt-2 w-full rounded-lg border border-white/10 bg-[#050505] px-3 py-2.5 text-xs sm:text-sm text-white outline-none placeholder:text-neutral-600 focus:border-[#23f8ff]/50 focus:ring-1 focus:ring-[#23f8ff]/30 transition-all font-mono"
                    />
                  </div>
                )}

                {method === "crypto" && (
                  <div>
                    <label className="text-xs sm:text-sm font-semibold text-white" htmlFor="tx-id">
                      Transaction hash (txId)
                    </label>
                    <input
                      id="tx-id"
                      type="text"
                      value={txId}
                      onChange={(e) => setTxId(e.target.value)}
                      placeholder="Paste blockchain transaction hash"
                      className="mt-2 w-full rounded-lg border border-white/10 bg-[#050505] px-3 py-2.5 text-xs sm:text-sm text-white outline-none placeholder:text-neutral-600 focus:border-[#23f8ff]/50 focus:ring-1 focus:ring-[#23f8ff]/30 transition-all font-mono"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  disabled={isVerifyDisabled}
                  className="w-full rounded-lg bg-[#23f8ff] hover:bg-[#1edce3] px-4 py-3 text-sm font-bold text-neutral-950 transition-all hover:shadow-[0_0_24px_rgba(35,248,255,0.35)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-none"
                >
                  {verifyButtonLabel}
                </button>

                {verifyState.status !== "idle" && verifyState.message && (
                  <div
                    className={`rounded-lg px-4 py-2.5 text-xs sm:text-sm ${
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
                    <div className="rounded-lg border border-white/10 bg-[#050505] px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                        License key
                      </p>
                      <p className="mt-2 break-all font-mono text-xs sm:text-sm text-white">{verifyState.key}</p>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(verifyState.key ?? "", "key")}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1 text-[11px] font-semibold text-neutral-200 transition-colors"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copiedTarget === "key" ? "Copied" : "Copy key"}
                      </button>
                    </div>
                  )}

                {verifyState.status === "success" && !verifyState.isExistingUser && (
                  <div className="rounded-lg border border-white/10 bg-[#050505] px-4 py-3 text-xs sm:text-sm text-neutral-300">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                      Setup guide
                    </p>
                    <ol className="mt-2 list-decimal pl-5 space-y-1.5">
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

            <div className="rounded-2xl border border-white/5 bg-neutral-900/40 backdrop-blur px-5 py-4 text-xs sm:text-sm text-neutral-400">
              Need help? Message support on Discord with your transaction details.
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}

export default CheckoutPage;
