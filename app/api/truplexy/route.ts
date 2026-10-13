import { createHandler } from "@truplexy/server";

type TrustedCustomer = {
  name: string;
  email: string;
  metadata?: Record<string, unknown>;
};

function resolveTrustedCustomer(request: Request): TrustedCustomer | null {
  const customerHeader = request.headers.get("x-harvestbot-customer");

  if (!customerHeader) {
    return null;
  }

  try {
    const parsed = JSON.parse(customerHeader) as Partial<TrustedCustomer>;
    const name = parsed.name?.trim();
    const email = parsed.email?.trim();

    if (!name || !email) {
      return null;
    }

    return {
      name,
      email: email.toLowerCase(),
      metadata: parsed.metadata ?? { source: "harvestbot-site" },
    };
  } catch {
    return null;
  }
}

// Reads TRUPLEXY_CHAT_KEY from the environment (.env.local, or your host's settings).
export const POST = createHandler({
  customer: async (request) => {
    const customer = resolveTrustedCustomer(request);

    if (!customer) {
      return null;
    }

    return {
      name: customer.name,
      contacts: [{ type: "email", value: customer.email, primary: true }],
      metadata: customer.metadata ?? { source: "harvestbot-site" },
    };
  },
});
export const maxDuration = 60; // replies can take up to 45 seconds