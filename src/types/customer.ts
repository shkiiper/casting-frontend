export interface SubscriptionInfoResponse {
  active: boolean;
  planName: string;
  totalLimit: number;
  remainingContacts: number;
}

export interface ContactInfoResponse {
  phone?: string;
  email?: string;
  whatsapp?: string;
  telegram?: string;
}

export interface ViewedContactResponse {
  profileId: number;
  profileType?: "ACTOR" | "CREATOR" | "LOCATION";
  displayName: string;
  mainPhotoUrl?: string;
  city?: string;
  viewedAt: string;
}

export interface CustomerProfileResponse {
  id: number;
  displayName?: string | null;
  city?: string | null;
  description?: string | null;
  mainPhotoUrl?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contactTelegram?: string | null;
  published?: boolean;
}
