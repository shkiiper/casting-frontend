import api from "./client";
import type {
  SubscriptionInfoResponse,
  ContactInfoResponse,
  ViewedContactResponse,
} from "@/types/customer";
import type { PageResponse } from "@/types/common";


// GET /api/customer/subscription
export async function getSubscriptionInfo(): Promise<SubscriptionInfoResponse> {
  const { data } = await api.get<SubscriptionInfoResponse>(
    "/api/customer/subscription"
  );
  return data;
}

// POST /api/customer/profiles/{profileId}/contacts
export async function showContacts(
  profileId: number
): Promise<ContactInfoResponse> {
  const { data } = await api.post<ContactInfoResponse>(
    `/api/customer/profiles/${profileId}/contacts`
  );
  return data;
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
