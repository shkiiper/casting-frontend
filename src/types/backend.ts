export interface AuthResponse {
  token: string | null;
  role?: string;
}

export interface ProfileResponse {
  id: number;
  type: "ACTOR" | "CREATOR" | "LOCATION";
  displayName?: string;
  firstName?: string;
  lastName?: string;
  published?: boolean;
  city?: string;
  age?: number;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  mainPhotoUrl?: string;
  photoUrls?: string[];
  portfolioPhotoUrls?: string[];
  videoUrls?: string[];
  description?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactWhatsapp?: string;
  contactTelegram?: string;
  activityType?: string;
  activityTypes?: string[];
  minRate?: number;
  rateUnit?: string;
  locationName?: string;

  premiumActive?: boolean;
  premiumExpiresAt?: string;
  canBuyPremium?: boolean;
  premiumPurchaseEndpoint?: string;
  premiumPrice?: number;
  premiumDurationDays?: number;
}

export interface SubscriptionInfoResponse {
  active: boolean;
  planName?: string;
  remainingContacts?: number;
  totalLimit?: number;
}

export interface ContactInfoResponse {
  phone?: string;
  email?: string;
  whatsapp?: string;
  telegram?: string;
}

export interface PageResponse<T> {
  content: T[];
  number?: number;
  page?: number;
  size: number;
  totalPages: number;
  totalElements: number;
  last: boolean;
}
