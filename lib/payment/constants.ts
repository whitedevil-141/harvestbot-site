// Payment destinations and plan catalogue, shared by /payment and /verify.
//
// These were duplicated across app/payment/page.tsx and
// app/verify/VerifyClient.tsx -- two near-identical forks of the same checkout
// flow. Wallet addresses in particular must never drift between them.

export type PlanOption = {
  id: string;
  label: string;
  /** Total days granted, including promo bonus days while PROMO_ACTIVE. */
  days: number;
  baseDays: number;
  bonusDays: number;
  price: number;
  tagline: string;
  aliases: string[];
};

// Hammer Jam limited-time promo: bonus days on the subscription plans.
// Flip PROMO_ACTIVE to false to restore the standard 7/15/30-day durations.
export const PROMO_ACTIVE = true;
export const PROMO_NAME = "Hammer Jam";

export const BINANCE_PAY_ID = "770585563";
export const USDT_TRX_ADDRESS = "TJ9tLX6NKF7Zub7v2S7TKnJrsyys1GZdoe";
export const LTC_ADDRESS = "LQyQgGRCNWnUzRtdAXDdTpyJVhEqrtz9TC";
export const LTC_PAYMENT_ENABLED = true;
// Flip to false and redeploy the static site to show the maintenance screen.
export const CHECKOUT_ENABLED = true;
export const CHECKOUT_MAINTENANCE_MESSAGE =
  "Checkout is temporarily unavailable while we perform maintenance. Please check back soon.";

// The two copies had diverged: /payment accepted "biweekly" as a plan alias and
// /verify did not, so the same deep link selected a plan on one page and not the
// other. This is the union, which only ever widens what each page accepts.
type PlanDef = Omit<PlanOption, "days">;

const PLAN_DEFS: PlanDef[] = [
  {
    id: "7d",
    label: "Weekly",
    baseDays: 7,
    bonusDays: 3,
    price: 2,
    tagline: "Quick boost for builder cycles",
    aliases: ["weekly", "7", "7 days", "7-day", "10", "10 days", "10-day"],
  },
  {
    id: "15d",
    label: "Bi-Weekly",
    baseDays: 15,
    bonusDays: 5,
    price: 5,
    tagline: "Solid grind window",
    aliases: ["bi-weekly", "15", "15 days", "15-day", "biweekly", "20", "20 days", "20-day"],
  },
  {
    id: "30d",
    label: "Monthly",
    baseDays: 30,
    bonusDays: 10,
    price: 8,
    tagline: "Best for long farms",
    aliases: ["monthly", "30", "30 days", "30-day", "40", "40 days", "40-day"],
  },
  {
    id: "lifetime",
    label: "Lifetime",
    baseDays: 3650,
    bonusDays: 0,
    price: 35,
    tagline: "One payment, always on",
    aliases: ["lifetime", "3650", "3650 days"],
  },
];

export const PLAN_OPTIONS: PlanOption[] = PLAN_DEFS.map((plan) => ({
  ...plan,
  days: plan.baseDays + (PROMO_ACTIVE ? plan.bonusDays : 0),
}));

/** True when this plan currently carries promo bonus days. */
export const hasPromoBonus = (plan: PlanOption) => PROMO_ACTIVE && plan.bonusDays > 0;

/** e.g. "10 days (7 + 3 FREE)" while the promo is on, "7 days" otherwise. */
export const formatPlanDuration = (plan: PlanOption) =>
  hasPromoBonus(plan)
    ? `${plan.days} days (${plan.baseDays} + ${plan.bonusDays} FREE)`
    : `${plan.days} days`;
