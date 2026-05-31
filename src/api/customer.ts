import api from "./client";
import type {
  SubscriptionInfoResponse,
  ContactInfoResponse,
  ViewedContactResponse,
} from "@/types/customer";
import type { PageResponse } from "@/types/common";

type ContactPayload = {
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  telegram?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contactWhatsapp?: string | null;
  contactTelegram?: string | null;
};

type ContactResponsePayload = ContactPayload & {
  contacts?: ContactPayload | null;
  contactInfo?: ContactPayload | null;
};

const normalizeContactInfo = (payload: ContactResponsePayload): ContactInfoResponse => {
  const source = payload.contactInfo ?? payload.contacts ?? payload;

  return {
    phone: source.phone ?? source.contactPhone ?? undefined,
    email: source.email ?? source.contactEmail ?? undefined,
    whatsapp: source.whatsapp ?? source.contactWhatsapp ?? undefined,
    telegram: source.telegram ?? source.contactTelegram ?? undefined,
  };
};

// GET /api/customer/subscription
export async function getSubscriptionInfo(): Promise<SubscriptionInfoResponse> {
  const { data } = await api.get<SubscriptionInfoResponse>(
    "/api/customer/subscription"
  );
  return data;
}

// POST /api/customer/promo-codes/redeem
export async function redeemCustomerPromoCode(
  code: string
): Promise<SubscriptionInfoResponse> {
  const { data } = await api.post<SubscriptionInfoResponse>(
    "/api/customer/promo-codes/redeem",
    { code }
  );
  return data;
}

// POST /api/customer/profiles/{profileId}/contacts
export async function showContacts(
  profileId: number,
  profileType?: "ACTOR" | "CREATOR" | "LOCATION"
): Promise<ContactInfoResponse> {
  const { data } = await api.post<ContactResponsePayload>(
    `/api/customer/profiles/${profileId}/contacts`,
    profileType ? { profileType } : undefined
  );
  return normalizeContactInfo(data);
}

// GET /api/customer/contacts/viewed?page=&size=
export async function getViewedContacts(
  page: number,
  size: number
): Promise<PageResponse<ViewedContactResponse>> {
  const { data } = await api.get<PageResponse<ViewedContactResponse>>(
    "/api/customer/contacts/viewed",
    { params: { page, size } }
  );
  return data;
}
