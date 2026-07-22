// Payment destinations and plan catalogue, shared by /payment and /verify.
//
// These were duplicated across app/payment/page.tsx and
// app/verify/VerifyClient.tsx -- two near-identical forks of the same checkout
// flow. Wallet addresses in particular must never drift between them.

export type PlanOption = {
  id: string;
  label: string;
  days: number;
  price: number;
  tagline: string;
  aliases: string[];
};

export const BINANCE_PAY_ID = "770585563";
export const USDT_TRX_ADDRESS = "TJ9tLX6NKF7Zub7v2S7TKnJrsyys1GZdoe";
export const LTC_ADDRESS = "LQyQgGRCNWnUzRtdAXDdTpyJVhEqrtz9TC";

// The two copies had diverged: /payment accepted "biweekly" as a plan alias and
// /verify did not, so the same deep link selected a plan on one page and not the
// other. This is the union, which only ever widens what each page accepts.
export const PLAN_OPTIONS: PlanOption[] = [
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
    aliases: ["bi-weekly", "15", "15 days", "15-day", "biweekly"],
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
