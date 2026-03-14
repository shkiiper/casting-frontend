export interface CustomerPlanResponse {
  id: number;
  name: string;

  pricePerPeriod?: number;
  periodDays: number;

  baseContactLimit: number;
  boosterPrice?: number;
  boosterContacts: number;

  castingPostPrice?: number;
  castingPostDays: number;

  active: boolean;
}

export interface SubscriptionPaymentRequest {
  planId: number;
}

export interface BoosterPaymentRequest {
  planId: number;
  boosterCount: number;
}
