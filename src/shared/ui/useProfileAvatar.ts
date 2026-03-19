import { useEffect, useState } from "react";
import api from "@/api/client";
import type { CustomerProfileResponse } from "@/types/customer";

type PerformerProfileResponse = {
  mainPhotoUrl?: string | null;
  photoUrls?: string[] | null;
};

type WindowWithApiBase = Window & {
  __API_BASE_URL__?: string;
};

const resolveApiBase = () => {
  const configuredBase =
    (window as WindowWithApiBase).__API_BASE_URL__?.trim().replace(/\/+$/, "") || "";

  const runsOnLocalhost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(
    window.location.hostname
  );
  const pointsToLocalApi =
    /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(configuredBase);

  if (!configuredBase) return "";
  if (!runsOnLocalhost && pointsToLocalApi) return "";
  return configuredBase;
};

const API_BASE = resolveApiBase();

let cachedToken: string | null = null;
let cachedAvatarUrl: string | null = null;
let cachedIsAuthed: boolean | null = null;
let inflightRequest: Promise<void> | null = null;

const pickAvatar = (
  profile?: PerformerProfileResponse | CustomerProfileResponse | null
) => {
  if (!profile) return null;
  if (profile.mainPhotoUrl) return profile.mainPhotoUrl;
  if ("photoUrls" in profile && Array.isArray(profile.photoUrls)) {
    return profile.photoUrls[0] || null;
  }
  return null;
};

export function resolveMediaUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("http")) {
    try {
      const parsed = new URL(url);
      const isLocalMediaHost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(parsed.hostname);
      const runsOnLocalhost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(
        window.location.hostname
      );

      if (!runsOnLocalhost && isLocalMediaHost) {
        return `${window.location.origin}${parsed.pathname}${parsed.search}`;
      }

      return url;
    } catch {
      return url;
    }
  }
  return API_BASE + url;
}

export function useProfileAvatar() {
  const initialToken = localStorage.getItem("accessToken");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    if (cachedToken && cachedToken === initialToken) return cachedAvatarUrl;
    return null;
  });
  const [isAuthed, setIsAuthed] = useState<boolean>(() => {
    if (cachedToken && cachedToken === initialToken && cachedIsAuthed !== null) {
      return cachedIsAuthed;
    }
    return Boolean(initialToken);
  });

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      cachedToken = null;
      cachedAvatarUrl = null;
      cachedIsAuthed = false;
      return;
    }

    if (cachedToken === token && cachedIsAuthed !== null) return;

    if (cachedToken !== token) {
      cachedToken = token;
      cachedAvatarUrl = null;
      cachedIsAuthed = true;
    }

    const role = (localStorage.getItem("role") ?? "").toUpperCase();
    const endpoint =
      role === "CUSTOMER" ? "/api/customer/me" : "/api/profile/me";

    if (!inflightRequest) {
      inflightRequest = api
        .get<CustomerProfileResponse | PerformerProfileResponse>(endpoint)
        .then((res) => {
          cachedAvatarUrl = pickAvatar(res.data);
          cachedIsAuthed = true;
        })
        .catch((error: unknown) => {
          const status = (error as { response?: { status?: number } })?.response
            ?.status;

          if (status === 401) {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("role");
            localStorage.removeItem("token");
            cachedToken = null;
            cachedAvatarUrl = null;
            cachedIsAuthed = false;
            return;
          }

          cachedAvatarUrl = null;
          cachedIsAuthed = true;
        })
        .finally(() => {
          inflightRequest = null;
        });
    }

    inflightRequest.finally(() => {
      const currentToken = localStorage.getItem("accessToken");
      if (!currentToken || currentToken !== cachedToken) return;
      setAvatarUrl(cachedAvatarUrl);
      setIsAuthed(Boolean(cachedIsAuthed));
    });
  }, []);

  useEffect(() => {
    const handler = () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      cachedToken = null;
      cachedAvatarUrl = null;
      cachedIsAuthed = null;
      inflightRequest = null;

      const role = (localStorage.getItem("role") ?? "").toUpperCase();
      const endpoint =
        role === "CUSTOMER" ? "/api/customer/me" : "/api/profile/me";

      api
        .get<CustomerProfileResponse | PerformerProfileResponse>(endpoint)
        .then((res) => {
          cachedToken = token;
          cachedAvatarUrl = pickAvatar(res.data);
          cachedIsAuthed = true;
          setAvatarUrl(cachedAvatarUrl);
          setIsAuthed(true);
        })
        .catch((error: unknown) => {
          const status = (error as { response?: { status?: number } })?.response
            ?.status;
          if (status === 401) {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("role");
            localStorage.removeItem("token");
            setAvatarUrl(null);
            setIsAuthed(false);
            return;
          }
          setAvatarUrl(null);
          setIsAuthed(true);
        });
    };

    window.addEventListener("profile-updated", handler);
    return () => window.removeEventListener("profile-updated", handler);
  }, []);

  return { avatarUrl, isAuthed };
}
