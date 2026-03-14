export interface PaymentInitResponse {
  paymentId?: string;
  externalId?: string;
  paymentUrl: string;
  status: string;
}

export interface CreateCastingPaymentRequest {
  title: string;
  description: string;
  city?: string | null;
  projectType?: string | null;
  days: number;
}

export interface CreateProfilePremiumPaymentRequest {
  profileId?: number;
}

export interface PaymentStatusResponse {
  externalId?: string;
  paymentId?: string;
  provider?: string;
  providerPaymentId?: string;
  status: string;
}
