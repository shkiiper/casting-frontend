import api from "./client";
import type { ProfileResponse } from "../types/profile";

export async function getProfile(id: number): Promise<ProfileResponse> {
  const { data } = await api.get<ProfileResponse>(`/api/profile/${id}`);
  return data;
}
