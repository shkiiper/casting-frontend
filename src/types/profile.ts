export interface ProfileResponse {
  id: number;
  type: "ACTOR" | "CREATOR" | "LOCATION";
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  published?: boolean | null;
  city?: string | null;
  age?: number | null;
  gender?: string | null;

  mainPhotoUrl?: string | null;
  photoUrls?: string[] | null;
  videoUrls?: string[] | null;

  description?: string | null;
  activityType?: string | null;
  activityTypes?: string[] | null;
  minRate?: number | null;
  rateUnit?: string | null;
  locationName?: string | null;

  contactPhone?: string | null;
  contactEmail?: string | null;
  contactWhatsapp?: string | null;
  contactTelegram?: string | null;

  premiumActive?: boolean | null;
  premiumExpiresAt?: string | null;
  canBuyPremium?: boolean | null;
  premiumPurchaseEndpoint?: string | null;
  premiumPrice?: number | null;
  premiumDurationDays?: number | null;
}
