// Payment destinations and plan catalogue, shared by /payment and /verify.
//
// These were duplicated across app/payment/page.tsx and
// app/verify/VerifyClient.tsx -- two near-identical forks of the same checkout
// flow. Wallet addresses in particular must never drift between them.

export type PlanOption = {
  id: string;
  label: string;
  days: number;
  /** Price actually charged (USDT): the sale price while SALE_ACTIVE. */
  price: number;
  /** Regular price (USDT), shown struck through while the sale is on. */
  originalPrice: number;
  tagline: string;
  aliases: string[];
};

// Limited-time sale. Flip SALE_ACTIVE to false to restore the regular prices.
export const SALE_ACTIVE = true;

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
type PlanDef = Omit<PlanOption, "price"> & { salePrice: number };

const PLAN_DEFS: PlanDef[] = [
  {
    id: "7d",
    label: "Weekly",
    days: 7,
    originalPrice: 2,
    salePrice: 1,
    tagline: "Quick boost for builder cycles",
    aliases: ["weekly", "7", "7 days", "7-day"],
  },
  {
    id: "15d",
    label: "Bi-Weekly",
    days: 15,
    originalPrice: 5,
    salePrice: 3,
    tagline: "Solid grind window",
    aliases: ["bi-weekly", "15", "15 days", "15-day", "biweekly"],
  },
  {
    id: "30d",
    label: "Monthly",
    days: 30,
    originalPrice: 8,
    salePrice: 6,
    tagline: "Best for long farms",
    aliases: ["monthly", "30", "30 days", "30-day"],
  },
  {
    id: "lifetime",
    label: "Lifetime",
    days: 3650,
    originalPrice: 35,
    salePrice: 25,
    tagline: "One payment, always on",
    aliases: ["lifetime", "3650", "3650 days"],
  },
];

export const PLAN_OPTIONS: PlanOption[] = PLAN_DEFS.map(({ salePrice, ...plan }) => ({
  ...plan,
  price: SALE_ACTIVE ? salePrice : plan.originalPrice,
}));

/**
 * Every price a plan has ever been sold at (regular and sale), so recorded
 * payments can be mapped back to a plan whichever price they were paid at.
 */
export const PLAN_PRICE_POINTS = PLAN_DEFS.map(({ label, originalPrice, salePrice }) => ({
  label,
  prices: [originalPrice, salePrice],
}));

/** True when the plan is currently discounted. */
export const isOnSale = (plan: PlanOption) => plan.price < plan.originalPrice;