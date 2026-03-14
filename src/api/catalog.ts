// src/api/catalog.ts
import api from '@/shared/api/client';
import type { PageResponse, ProfileResponse } from '@/types/backend';

export interface SearchParams {
  type?: "ACTOR" | "CREATOR" | "LOCATION";
  page: number;
  size: number;
  city?: string;
  minAge?: number;
  maxAge?: number;
  gender?: string;
  ethnicity?: string;
  minRate?: number;
  maxRate?: number;
  activityType?: string;
  minRentPrice?: number;
  maxRentPrice?: number;
}

export async function getProfiles(params: SearchParams): Promise<PageResponse<ProfileResponse>> {
  const endpoint =
    params.type === "CREATOR"
      ? "/api/catalog/creators"
      : params.type === "LOCATION"
      ? "/api/catalog/locations"
      : "/api/catalog/actors";

  const { data } = await api.get<PageResponse<ProfileResponse>>(endpoint, { params });
  return data;
}

// Для дашборда/каталога
export async function getActors(): Promise<ProfileResponse[]> {
  const { content } = await getProfiles({ type: "ACTOR", page: 0, size: 50 });
  return content.filter(p => p.type === 'ACTOR'); // только актёры
}
