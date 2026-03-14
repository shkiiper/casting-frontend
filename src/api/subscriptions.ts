import api from "./client";
import type { PaymentInitResponse } from "../types/payment";
import type {
  BoosterPaymentRequest,
  CustomerPlanResponse,
  SubscriptionPaymentRequest,
} from "../types/subscription";

export async function getCustomerPlans(): Promise<CustomerPlanResponse[]> {
  const { data } = await api.get<CustomerPlanResponse[]>("/api/customer/plans");
  return data;
}

export async function initCustomerSubscriptionPayment(
  payload: SubscriptionPaymentRequest
): Promise<PaymentInitResponse> {
  const { data } = await api.post<PaymentInitResponse>(
    `/api/payments/subscription/${payload.planId}`
  );
  return data;
}

export async function initCustomerBoosterPayment(
  payload: BoosterPaymentRequest
): Promise<PaymentInitResponse> {
  const { data } = await api.post<PaymentInitResponse>(
    `/api/payments/booster/${payload.planId}`,
    null,
    {
      params: {
        boosterCount: payload.boosterCount,
      },
    }
  );
  return data;
}
