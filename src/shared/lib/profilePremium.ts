type AnyRecord = Record<string, unknown>;

export type ProfilePremiumInfo = {
  active: boolean;
  expiresAt: string | null;
  canPurchase: boolean;
  paymentEndpoint: string;
  price: number | null;
  durationDays: number | null;
};

const readBoolean = (source: AnyRecord, keys: string[]) => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "boolean") return value;
  }
  return null;
};

const readString = (source: AnyRecord, keys: string[]) => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
};

const readNumber = (source: AnyRecord, keys: string[]) => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
};

export const extractProfilePremiumInfo = (profile: unknown): ProfilePremiumInfo => {
  const source = (profile ?? {}) as AnyRecord;

  const active =
    readBoolean(source, [
      "premiumActive",
      "isPremiumActive",
      "premium",
      "hasPremium",
      "premiumEnabled",
    ]) ?? false;

  const expiresAt = readString(source, [
    "premiumExpiresAt",
    "premiumUntil",
    "premiumEndDate",
    "premiumValidUntil",
  ]);

  const canPurchase =
    readBoolean(source, [
      "canBuyPremium",
      "canPurchasePremium",
      "premiumCanBePurchased",
      "premiumAvailableForPurchase",
    ]) ??
    !active;

  const paymentEndpoint =
    readString(source, [
      "premiumPurchaseEndpoint",
      "premiumPaymentEndpoint",
      "buyPremiumEndpoint",
      "purchasePremiumEndpoint",
    ]) ?? "/api/payments/profile-premium";

  const price = readNumber(source, [
    "premiumPrice",
    "profilePremiumPrice",
    "premiumAmount",
    "premiumCost",
  ]);

  const durationDays = readNumber(source, [
    "premiumDurationDays",
    "profilePremiumDurationDays",
    "premiumDays",
    "premiumDuration",
  ]);

  return {
    active,
    expiresAt,
    canPurchase,
    paymentEndpoint,
    price,
    durationDays,
  };
};

export const formatPremiumDate = (value?: string | null) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

export const formatSom = (value?: number | null) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat("ru-RU").format(value);
};
