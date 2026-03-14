import api from "@/api/client";
import type {
  CreateCastingPaymentRequest,
  CreateProfilePremiumPaymentRequest,
  PaymentInitResponse,
  PaymentStatusResponse,
} from "@/types/payment";

export async function createCastingPayment(payload: CreateCastingPaymentRequest) {
  const { data } = await api.post<PaymentInitResponse>("/api/payments/casting", payload);
  return data;
}

export async function createProfilePremiumPayment(
  endpoint = "/api/payments/profile-premium",
  payload?: CreateProfilePremiumPaymentRequest
) {
  const { data } = await api.post<PaymentInitResponse>(endpoint, payload ?? {});
  return data;
}

export async function getPaymentStatus(externalId: string) {
  const { data } = await api.get<PaymentStatusResponse>(
    `/api/payments/${encodeURIComponent(externalId)}`
  );
  return data;
}

export const getExternalIdFromInit = (value: {
  externalId?: string;
  paymentId?: string;
}) => value.externalId || value.paymentId || "";

export const isFinalPaymentStatus = (status?: string) => {
  const normalized = (status || "").toUpperCase();
  return normalized === "SUCCESS" || normalized === "FAILED";
};
