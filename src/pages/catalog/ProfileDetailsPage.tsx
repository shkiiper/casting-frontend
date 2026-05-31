import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import api from "@/api/client";
import { useSession } from "@/entities/user/model/authStore";
import publicApi from "@/shared/api/publicClient";
import { Container } from "@/shared/ui/Container";
import { InlineNav } from "@/shared/ui/InlineNav";
import { PublicFooter } from "@/shared/ui/PublicFooter";
import { pickProfilePhoto, resolveMediaUrl } from "@/shared/ui/useProfileAvatar";
import { getSubscriptionInfo, showContacts } from "@/api/customer";
import type { ContactInfoResponse, SubscriptionInfoResponse } from "@/types/customer";
import { extractProfilePremiumInfo, formatPremiumDate } from "@/shared/lib/profilePremium";

type ProfileType = "ACTOR" | "CREATOR" | "LOCATION";

type PublicProfile = {
  id: number;
  type: ProfileType;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  city?: string | null;
  age?: number | null;
  gender?: string | null;
  description?: string | null;
  activityType?: string | null;
  activityTypes?: string[] | null;
  locationName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contactWhatsapp?: string | null;
  contactTelegram?: string | null;
  mainPhotoUrl?: string | null;
  photoUrls?: string[] | null;
  portfolioPhotoUrls?: string[] | null;
  videoUrls?: string[] | null;
  minRate?: number | null;
  rateUnit?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  ethnicity?: string | null;
  bodyType?: string | null;
  hairColor?: string | null;
  eyeColor?: string | null;
  gameAgeFrom?: number | null;
  gameAgeTo?: number | null;
  playingAgeMin?: number | null;
  playingAgeMax?: number | null;
  unionMembership?: string | null;
  hasDriverLicense?: boolean | null;
  contactInstagram?: string | null;
  skills?: string[] | null;
  skillsJson?: string[] | string | null;
  bio?: string | null;
  experienceText?: string | null;
  experienceLevel?: string | null;
  projectFormats?: string[] | null;
  caseHighlights?: string[] | null;
  socialLinksJson?: string | null;
  premiumActive?: boolean | null;
  premiumExpiresAt?: string | null;
};

type PublicCatalogResponse = {
  content?: PublicProfile[];
};

type ProfileLocationState = {
  from?: string;
  profilePreview?: PublicProfile;
} | null;

const getActivityTypes = (profile?: Pick<PublicProfile, "activityType" | "activityTypes"> | null) => {
  if (!profile) return [];

  const arrayValues = Array.isArray(profile.activityTypes) ? profile.activityTypes : [];
  const legacyValues =
    typeof profile.activityType === "string"
      ? profile.activityType
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : [];

  return Array.from(new Set([...arrayValues, ...legacyValues]));
};

const profileTypeLabel: Record<ProfileType, string> = {
  ACTOR: "Актёр",
  CREATOR: "Креатор",
  LOCATION: "Локация",
};

const genderLabel: Record<string, string> = {
  MALE: "Мужской",
  FEMALE: "Женский",
  OTHER: "Другое",
};

const ethnicityLabel: Record<string, string> = {
  EUROPEAN: "Европеоидная",
  ASIAN: "Монголоидная",
  AFRICAN: "Негроидная",
  MIXED: "Метис",
  OTHER: "Другая",
  "ЕВРОПЕОИДНАЯ": "Европеоидная",
  "МОНГОЛОИДНАЯ": "Монголоидная",
  "НЕГРОИДНАЯ": "Негроидная",
  "МЕТИС": "Метис",
  "ДРУГАЯ": "Другая",
};

const rateUnitLabel: Record<string, string> = {
  PER_DAY: "за день",
  PER_HOUR: "за час",
  PER_PROJECT: "за проект",
};

const appearanceValueLabels: Record<string, string> = {
  Athletic: "Спортивное",
  Slim: "Худощавое",
  Average: "Среднее",
  "Plus-size": "Плотное",
  Other: "Другое",
  Black: "Черный",
  Brown: "Каштановый",
  Blonde: "Русый",
  Red: "Рыжий",
  Gray: "Седой",
  Blue: "Голубой",
  Green: "Зеленый",
  Hazel: "Ореховый",
};

const localizeAppearanceValue = (value?: string | null) =>
  value ? appearanceValueLabels[value] || value : null;

const localizeEthnicity = (value?: string | null) => {
  if (!value) return null;
  return ethnicityLabel[value.toUpperCase()] || value;
};

const localizeRate = (amount?: number | null, unit?: string | null) => {
  if (!amount) return null;
  const localizedUnit = unit ? rateUnitLabel[unit] || unit : "сом";
  return `${amount} ${localizedUnit}`;
};

const parseExperienceBundle = (raw?: string | null) => {
  if (!raw) {
    return {
      experienceLevel: "",
      projectFormats: [] as string[],
      caseHighlights: [] as string[],
      skills: [] as string[],
    };
  }

  const levelMatch = raw.match(/Уровень:\s*([\s\S]*?)(?:\n\nФорматы:|\n\nКейсы:|\n\nНавыки:|$)/i);
  const formatsMatch = raw.match(/Форматы:\s*([\s\S]*?)(?:\n\nКейсы:|$)/i);
  const casesMatch = raw.match(/Кейсы:\s*([\s\S]*?)(?:\n\nНавыки:|$)/i);
  const skillsMatch = raw.match(/Навыки:\s*([\s\S]*)$/i);

  const experienceLevel = levelMatch?.[1]?.trim() ?? "";
  const projectFormatsRaw = formatsMatch?.[1]?.trim() ?? "";
  const casesRaw = casesMatch?.[1]?.trim() ?? "";
  const skillsRaw = skillsMatch?.[1]?.trim() ?? "";

  const projectFormats = projectFormatsRaw
    ? projectFormatsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const caseHighlights = casesRaw
    ? casesRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const skills = skillsRaw
    ? skillsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  if (!experienceLevel && !projectFormats.length && !caseHighlights.length && !skills.length) {
    const lines = raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    return {
      experienceLevel: "",
      projectFormats: [],
      caseHighlights: lines.slice(0, 5),
      skills: [],
    };
  }

  return { experienceLevel, projectFormats, caseHighlights, skills };
};

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
};

const parseSkillsValue = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x).trim()).filter(Boolean);
      }
    } catch {
      return value
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    }
  }
  return [];
};

const pickString = (
  source: Record<string, unknown>,
  keys: string[]
): string | null => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
};

const deriveCreatorExperience = (profile?: PublicProfile | null) => {
  if (!profile) {
    return {
      experienceLevel: "",
      projectFormats: [] as string[],
      caseHighlights: [] as string[],
      skills: [] as string[],
    };
  }

  const source = profile as unknown as Record<string, unknown>;
  const rawExperience =
    pickString(source, ["experienceText", "experience", "experienceDescription"]) ||
    null;
  const parsed = parseExperienceBundle(rawExperience);

  const directExperienceLevel =
    pickString(source, ["experienceLevel", "level", "seniority"]) || "";
  const directProjectFormats = toStringArray(
    source.projectFormats ?? source.formats ?? source.projectTypes
  );
  const directCaseHighlights = toStringArray(
    source.caseHighlights ?? source.cases ?? source.achievements
  );
  const directSkills = toStringArray(source.skills);

  return {
    experienceLevel: directExperienceLevel || parsed.experienceLevel,
    projectFormats: directProjectFormats.length
      ? directProjectFormats
      : parsed.projectFormats,
    caseHighlights: directCaseHighlights.length
      ? directCaseHighlights
      : parsed.caseHighlights,
    skills: directSkills.length ? directSkills : parsed.skills,
  };
};

const normalizeProfile = (profile: PublicProfile): PublicProfile => ({
  ...profile,
  photoUrls: Array.isArray(profile.photoUrls) ? profile.photoUrls : [],
  portfolioPhotoUrls: Array.isArray(profile.portfolioPhotoUrls) ? profile.portfolioPhotoUrls : [],
  videoUrls: Array.isArray(profile.videoUrls) ? profile.videoUrls : [],
  skills: parseSkillsValue(profile.skillsJson).length
    ? parseSkillsValue(profile.skillsJson)
    : Array.isArray(profile.skills)
    ? profile.skills
    : [],
  projectFormats: Array.isArray(profile.projectFormats) ? profile.projectFormats : [],
  caseHighlights: Array.isArray(profile.caseHighlights) ? profile.caseHighlights : [],
});

const loadPublicProfileById = async (profileId: string) => {
  try {
    const { data } = await api.get<PublicProfile>(`/api/profile/${profileId}`);
    if (data?.id) {
      return normalizeProfile(data);
    }
  } catch {
    // fallback to public profile endpoint / catalog aggregation
  }

  try {
    const { data } = await publicApi.get<PublicProfile>(`/api/profile/${profileId}`);
    if (data?.id) {
      return normalizeProfile(data);
    }
  } catch {
    // fallback to catalog aggregation for older backend setups
  }

  const [actors, creators, locations] = await Promise.allSettled([
    publicApi.get<PublicCatalogResponse>("/api/catalog/actors", {
      params: { page: 0, size: 120 },
    }),
    publicApi.get<PublicCatalogResponse>("/api/catalog/creators", {
      params: { page: 0, size: 120 },
    }),
    publicApi.get<PublicCatalogResponse>("/api/catalog/locations", {
      params: { page: 0, size: 120 },
    }),
  ]);

  const list: PublicProfile[] = [];
  if (actors.status === "fulfilled") list.push(...(actors.value.data.content ?? []));
  if (creators.status === "fulfilled") list.push(...(creators.value.data.content ?? []));
  if (locations.status === "fulfilled") list.push(...(locations.value.data.content ?? []));

  const found = list.find((item) => String(item.id) === profileId) ?? null;
  return found ? normalizeProfile(found) : null;
};

export const ProfileDetailsPage = () => {
  const { id } = useParams();
  const { isAuthenticated, role } = useSession();
  const location = useLocation();
  const locationState = location.state as ProfileLocationState;
  const previewProfile = locationState?.profilePreview ?? null;
  const isCustomer = isAuthenticated && role === "CUSTOMER";
  const [profile, setProfile] = useState<PublicProfile | null>(previewProfile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [portfolioLightboxUrl, setPortfolioLightboxUrl] = useState<string | null>(null);
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
  const [videoModalTitle, setVideoModalTitle] = useState<string>("");
  const [bioExpanded, setBioExpanded] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfoResponse | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfoResponse | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) {
        setError("Профиль не найден");
        setLoading(false);
        return;
      }

      const hasPreviewForCurrentId =
        Boolean(previewProfile) && String(previewProfile?.id) === id;

      if (hasPreviewForCurrentId && previewProfile) {
        // Показываем превью сразу, но все равно догружаем полный профиль по id.
        setProfile(normalizeProfile(previewProfile));
      }

      try {
        const publicProfile = await loadPublicProfileById(id);
        if (publicProfile) {
          setProfile(publicProfile);
          setError(null);
        } else {
          setError("Профиль не найден");
        }
      } catch {
        if (hasPreviewForCurrentId && previewProfile) {
          setProfile(normalizeProfile(previewProfile));
          setError(null);
        } else {
          setError("Не удалось загрузить профиль");
        }

      } finally {
        setLoading(false);
      }
    })();
  }, [id, previewProfile]);

  useEffect(() => {
    if (!isCustomer) {
      setSubscription(null);
      setContactInfo(null);
      return;
    }
    (async () => {
      try {
        const info = await getSubscriptionInfo();
        setSubscription(info);
      } catch {
        setSubscription(null);
      }
    })();
  }, [isCustomer]);

  const name = useMemo(() => {
    if (!profile) return "";
    return (
      profile.locationName ||
      profile.displayName ||
      [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
      "Без имени"
    );
  }, [profile]);

  const photos = useMemo(() => {
    if (!profile) return [];
    const list = [...(profile.photoUrls ?? [])];
    const primaryPhoto = pickProfilePhoto(profile);
    if (!primaryPhoto) return list;
    const rest = list.filter((url) => url !== primaryPhoto);
    list.splice(0, list.length, primaryPhoto, ...rest);
    return list;
  }, [profile]);

  useEffect(() => {
    setActivePhoto(0);
  }, [photos.length]);

  const fromCastingResponses =
    locationState?.from === "casting-responses";

  const currentPhoto = photos[activePhoto] ?? photos[0] ?? null;
  const hasManyPhotos = photos.length > 1;
  const primaryGalleryPhoto = photos[0] ?? null;
  const sidePhotos = photos.slice(1);
  const videoList = (profile?.videoUrls ?? []).slice(0, 3);
  const portfolioPhotos = (profile?.portfolioPhotoUrls ?? []).slice(0, 8);
  const showPrev = () => {
    if (!photos.length) return;
    setActivePhoto((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const showNext = () => {
    if (!photos.length) return;
    setActivePhoto((prev) => (prev + 1) % photos.length);
  };

  useEffect(() => {
    if (!lightboxOpen && !portfolioLightboxUrl && !videoModalUrl) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightboxOpen(false);
        setPortfolioLightboxUrl(null);
        setVideoModalUrl(null);
        return;
      }

      if (!lightboxOpen || !hasManyPhotos) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPrev();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        showNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, portfolioLightboxUrl, videoModalUrl, hasManyPhotos, photos.length]);

  const openVideoModal = (url?: string | null, title?: string) => {
    const resolved = resolveMediaUrl(url ?? null);
    if (!resolved) return;
    setVideoModalTitle(title || "Видео");
    setVideoModalUrl(resolved);
  };

  const description = profile?.description?.trim() || profile?.bio?.trim() || "";
  const shortDescription =
    description.length > 260 ? `${description.slice(0, 260)}...` : description;
  const activityTypes = getActivityTypes(profile);

  const appearanceRows = [
    { label: "Тип профиля", value: profile ? profileTypeLabel[profile.type] : null },
    { label: "Тип деятельности", value: activityTypes.length ? activityTypes.join(", ") : null },
    { label: "Возраст", value: profile?.age ? `${profile.age} лет` : null },
    {
      label: "Пол",
      value: (profile?.gender && genderLabel[profile.gender]) || profile?.gender || null,
    },
    { label: "Рост", value: profile?.heightCm ? `${profile.heightCm} см` : null },
    { label: "Вес", value: profile?.weightKg ? `${profile.weightKg} кг` : null },
    { label: "Телосложение", value: localizeAppearanceValue(profile?.bodyType) },
    { label: "Цвет волос", value: localizeAppearanceValue(profile?.hairColor) },
    { label: "Цвет глаз", value: localizeAppearanceValue(profile?.eyeColor) },
    {
      label: "Ставка",
      value: localizeRate(profile?.minRate, profile?.rateUnit),
    },
  ].filter((row): row is { label: string; value: string } => Boolean(row.value));

  const gameAgeFrom = profile?.gameAgeFrom ?? profile?.playingAgeMin ?? null;
  const gameAgeTo = profile?.gameAgeTo ?? profile?.playingAgeMax ?? null;
  const playingAge =
    gameAgeFrom && gameAgeTo ? `${gameAgeFrom}-${gameAgeTo}` : null;

  const remainingContacts = subscription?.remainingContacts ?? 0;
  const contactsUnlocked = Boolean(
    contactInfo?.phone || contactInfo?.email || contactInfo?.telegram || contactInfo?.whatsapp
  );

  const unlockContacts = async () => {
    if (!profile?.id || !isCustomer || remainingContacts <= 0 || unlocking) return;
    try {
      setUnlocking(true);
      setContactsError(null);
      const opened = await showContacts(profile.id);
      setContactInfo(opened);
      const info = await getSubscriptionInfo();
      setSubscription(info);
    } catch {
      setContactsError("Не удалось открыть контакты. Проверьте лимит или попробуйте позже.");
    } finally {
      setUnlocking(false);
    }
  };

  const skills = profile?.skills?.filter(Boolean) ?? [];
  const creatorExperience = deriveCreatorExperience(profile);
  const creatorSkills = creatorExperience.skills.length
    ? creatorExperience.skills
    : profile?.skills ?? [];
  const catalogLink =
    profile?.type === "ACTOR"
      ? "/actors"
      : profile?.type === "CREATOR"
      ? "/creators"
      : profile?.type === "LOCATION"
      ? "/locations"
      : "/actors";
  const navActive =
    profile?.type === "ACTOR"
      ? "actors"
      : profile?.type === "CREATOR"
      ? "creators"
      : profile?.type === "LOCATION"
      ? "locations"
      : undefined;
  const premium = extractProfilePremiumInfo(profile);
  const topLine = [
    profile ? profileTypeLabel[profile.type] : null,
    profile?.city,
    profile?.type === "ACTOR" && profile.age ? `${profile.age} лет` : null,
    profile?.type === "CREATOR" && activityTypes.length ? activityTypes.slice(0, 2).join(", ") : null,
  ].filter(Boolean);
  const quickFacts = [
    {
      label: "Город",
      value: profile?.city || "Не указан",
    },
    {
      label: profile?.type === "LOCATION" ? "Тип" : "Роль",
      value:
        profile?.type === "CREATOR" && activityTypes.length
          ? activityTypes.slice(0, 2).join(", ")
          : profile
          ? profileTypeLabel[profile.type]
          : "—",
    },
    {
      label: profile?.type === "ACTOR" ? "Возраст" : "Ставка",
      value:
        profile?.type === "ACTOR"
          ? profile.age
            ? `${profile.age} лет`
            : "Не указан"
          : localizeRate(profile?.minRate, profile?.rateUnit) || "По запросу",
    },
    {
      label: profile?.type === "ACTOR" ? "Игровой возраст" : "Материалы",
      value:
        profile?.type === "ACTOR"
          ? playingAge || "Не указан"
          : `${photos.length} фото · ${videoList.length} видео`,
    },
  ];
  const heroTags =
    profile?.type === "CREATOR"
      ? creatorSkills.slice(0, 8)
      : profile?.type === "ACTOR"
      ? skills.slice(0, 8)
      : activityTypes.slice(0, 8);

  return (
    <div className="relative min-h-screen bg-[#f3f4f7] text-slate-900">
      <div className="relative z-10 pt-8 pb-16">
        <Container>
          <div
            className={[
              "mx-auto max-w-[1280px] overflow-visible rounded-[26px] border bg-white shadow-[0_18px_48px_rgba(15,23,42,0.10)] sm:rounded-[30px]",
              premium.active
                ? "border-amber-300/80 shadow-[0_20px_54px_rgba(217,119,6,0.18)]"
                : "border-black/5",
            ].join(" ")}
          >
            <InlineNav active={navActive} />

            <header
              className={[
                "flex flex-wrap items-center justify-between gap-4 border-b px-4 py-5 sm:px-6 md:px-8 md:py-6",
                premium.active
                  ? "border-amber-200/70 bg-[linear-gradient(135deg,rgba(255,251,235,0.95)_0%,rgba(255,255,255,0.92)_100%)]"
                  : "border-black/10 bg-slate-50/70",
              ].join(" ")}
            >
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Casting card
                </div>
                <h1 className="text-2xl md:text-3xl font-bold mt-1">{name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span>{topLine.join(" · ")}</span>
                  {premium.active ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                      Premium
                    </span>
                  ) : null}
                </div>
                {premium.active && premium.expiresAt ? (
                  <div className="mt-2 text-xs text-amber-700">
                    Продвижение активно до {formatPremiumDate(premium.expiresAt)}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                {fromCastingResponses && (
                  <Link
                    to="/account/casting-responses"
                    className="px-4 py-2 rounded-xl border border-black/15 bg-white text-sm font-medium hover:bg-slate-100"
                  >
                    ← Назад к откликам
                  </Link>
                )}
                <Link
                  to={catalogLink}
                  className="px-4 py-2 rounded-xl border border-black/15 bg-white text-sm font-medium hover:bg-slate-100"
                >
                  Назад в каталог
                </Link>
              </div>
            </header>

            <section className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
              {loading && (
                <div className="text-sm text-slate-500">Загрузка профиля...</div>
              )}

              {!loading && error && (
                <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              {!loading && !error && profile && (
                <div className="space-y-8">
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="grid gap-5 lg:grid-cols-[minmax(280px,0.78fr)_minmax(0,1fr)]">
                      <div className="space-y-3">
                        <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-slate-200 shadow-[0_22px_70px_rgba(15,23,42,0.16)]">
                          <div className="aspect-[3/4]">
                            {primaryGalleryPhoto ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setActivePhoto(0);
                                  setLightboxOpen(true);
                                }}
                                className="h-full w-full"
                              >
                                <img
                                  src={resolveMediaUrl(primaryGalleryPhoto) ?? undefined}
                                  alt={name}
                                  className="h-full w-full object-cover"
                                />
                              </button>
                            ) : (
                              <div className="grid h-full w-full place-items-center text-slate-500">
                                Фото отсутствует
                              </div>
                            )}
                          </div>

                          {videoList[0] && (
                            <button
                              type="button"
                              onClick={() => openVideoModal(videoList[0], "Интро-видео")}
                              className="absolute left-4 top-4 rounded-full border border-white/80 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm backdrop-blur hover:bg-white"
                            >
                              ▶ Интро
                            </button>
                          )}
                        </div>

                        <div className="rounded-[24px] border border-white/80 bg-white/88 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.10)] backdrop-blur">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                {profileTypeLabel[profile.type]}
                              </div>
                              <div className="mt-1 text-3xl font-black leading-none text-slate-900">
                                {name}
                              </div>
                            </div>
                            {premium.active ? (
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                                Premium
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 sm:overflow-visible sm:pb-0 xl:grid-cols-5">
                          {sidePhotos.length > 0 ? (
                            sidePhotos.map((url, index) => (
                              <button
                                key={`${url}-${index}`}
                                type="button"
                                onClick={() => {
                                  setActivePhoto(index + 1);
                                  setLightboxOpen(true);
                                }}
                                className="aspect-square h-20 shrink-0 overflow-hidden rounded-2xl border border-white/80 bg-slate-200 shadow-sm sm:h-auto"
                              >
                                <img
                                  src={resolveMediaUrl(url) ?? undefined}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              </button>
                            ))
                          ) : (
                            <div className="w-full rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-5 text-center text-sm text-slate-500 sm:col-span-4 xl:col-span-5">
                              Дополнительные медиа отсутствуют
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-white/80 bg-white/82 p-5 shadow-[0_18px_56px_rgba(15,23,42,0.09)] backdrop-blur md:p-6">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                            {profileTypeLabel[profile.type]}
                          </span>
                          {profile.city ? (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                              {profile.city}
                            </span>
                          ) : null}
                          {premium.active ? (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                              Premium
                            </span>
                          ) : null}
                        </div>

                        <h2 className="mt-5 text-3xl font-black leading-tight md:text-5xl">{name}</h2>
                        {topLine.length > 0 ? (
                          <div className="mt-3 text-base font-medium text-slate-600">
                            {topLine.join(" · ")}
                          </div>
                        ) : null}

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          {quickFacts.map((fact) => (
                            <div
                              key={fact.label}
                              className="rounded-2xl border border-slate-200 bg-white/75 px-4 py-3"
                            >
                              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                {fact.label}
                              </div>
                              <div className="mt-1 text-sm font-semibold text-slate-900">
                                {fact.value}
                              </div>
                            </div>
                          ))}
                        </div>

                        {description ? (
                          <div className="mt-6">
                            <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                              О профиле
                            </div>
                            <div className="mt-3 text-[15px] leading-7 text-slate-800">
                              {bioExpanded ? description : shortDescription}
                            </div>
                            {description.length > 260 && (
                              <button
                                type="button"
                                onClick={() => setBioExpanded((v) => !v)}
                                className="mt-2 text-sm font-semibold text-slate-700 hover:underline"
                              >
                                {bioExpanded ? "Свернуть" : "Показать больше"}
                              </button>
                            )}
                          </div>
                        ) : null}

                        {heroTags.length > 0 ? (
                          <div className="mt-6">
                            <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                              Сильные стороны
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {heroTags.map((tag, index) => (
                                <span
                                  key={`${tag}-${index}`}
                                  className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-900 shadow-sm"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
                      <ActionPanel
                        isAuthed={isAuthenticated}
                        isCustomer={isCustomer}
                        unlocking={unlocking}
                        hasRemainingContacts={remainingContacts > 0}
                        remainingContacts={remainingContacts}
                        contactsUnlocked={contactsUnlocked}
                        contactInfo={contactInfo}
                        onUnlock={unlockContacts}
                        error={contactsError}
                      />

                      <ProfileSummaryCard
                        facts={quickFacts}
                        photosCount={photos.length}
                        videosCount={videoList.length}
                      />
                    </aside>
                  </div>

                  <div className="space-y-8">
                      {profile.type === "ACTOR" && appearanceRows.length > 0 && (
                        <>
                          <SectionTitle title="Внешность" />
                          <AppearancePassport
                            rows={appearanceRows}
                            playingAge={playingAge}
                            ethnicity={localizeEthnicity(profile.ethnicity)}
                          />
                        </>
                      )}

                      {profile.type === "CREATOR" ? (
                        <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-4 md:p-6">
                          <h3 className="text-2xl md:text-[30px] font-bold pb-3 border-b border-black/10">
                            Опыт и кейсы
                          </h3>

                          <div className="mt-4">
                            <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
                              Уровень опыта
                            </div>
                            <div className="mt-2 rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 text-base font-semibold text-slate-900">
                              {creatorExperience.experienceLevel || "Не выбрано"}
                            </div>
                          </div>

                          <CreatorTagsBlock
                            title="Форматы проектов"
                            items={creatorExperience.projectFormats}
                            emptyText="Не указано"
                          />
                          <CreatorTagsBlock
                            title="Ключевые кейсы и достижения"
                            items={creatorExperience.caseHighlights}
                            emptyText="Не указано"
                          />
                          <CreatorTagsBlock
                            title="Навыки"
                            items={creatorSkills}
                            emptyText="Не указано"
                          />
                        </section>
                      ) : (
                        <>
                          {profile.experienceText?.trim() ? (
                            <>
                              <SectionTitle title="Опыт" />
                              <div className="mt-4 rounded-2xl border border-black/10 bg-white p-5 text-[15px] leading-7 text-slate-800">
                                {profile.experienceText}
                              </div>
                            </>
                          ) : null}

                          {skills.length > 0 ? (
                            <>
                              <SectionTitle title="Навыки" />
                              <div className="mt-4 flex flex-wrap gap-3">
                                {skills.map((skill, index) => (
                                  <span
                                    key={`${skill}-${index}`}
                                    className="px-4 py-2 rounded-full bg-white border border-black/10 text-sm"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </>
                          ) : null}
                        </>
                      )}

                      <SectionTitle title="Видео" />
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        {videoList.length > 0 ? (
                          videoList.map((video, index) => (
                            <VideoCard
                              key={`${video}-${index}`}
                              title={index === 0 ? "Видео 1" : `Видео ${index + 1}`}
                              subtitle={name}
                              year={profile.age ? String(new Date().getFullYear() - Math.max(profile.age - 20, 0)) : ""}
                              preview={photos[index]}
                              onOpen={() =>
                                openVideoModal(
                                  video,
                                  index === 0 ? "Видео 1" : `Видео ${index + 1}`
                                )
                              }
                            />
                          ))
                        ) : (
                          <EmptyBlock text="Видеоматериалы пока не добавлены" />
                        )}
                      </div>

                      {profile.type === "CREATOR" ? (
                        <>
                          <SectionTitle title="Портфолио" />
                          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                            {portfolioPhotos.length > 0 ? (
                              portfolioPhotos.map((url, index) => (
                                <button
                                  key={`${url}-${index}`}
                                  type="button"
                                  onClick={() => setPortfolioLightboxUrl(resolveMediaUrl(url))}
                                  className="overflow-hidden rounded-2xl border border-black/10 bg-slate-200 aspect-square"
                                >
                                  <img
                                    src={resolveMediaUrl(url) ?? undefined}
                                    alt={`Портфолио ${index + 1}`}
                                    className="h-full w-full object-cover"
                                  />
                                </button>
                              ))
                            ) : (
                              <EmptyBlock text="Портфолио пока не добавлено" />
                            )}
                          </div>
                        </>
                      ) : null}
                  </div>
                </div>
              )}
            </section>
          </div>
        </Container>
      </div>

      {lightboxOpen && currentPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 p-3 sm:p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative flex h-full w-full max-w-6xl items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={resolveMediaUrl(currentPhoto) ?? undefined}
              alt={name}
              className="max-h-full max-w-full object-contain rounded-xl"
            />
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute top-2 right-2 rounded-full w-9 h-9 bg-white/90 text-slate-900"
            >
              ✕
            </button>
            {hasManyPhotos && (
              <>
                <button
                  type="button"
                  onClick={showPrev}
                  className="absolute left-1 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-white/90 text-slate-900 sm:left-2 sm:h-10 sm:w-10"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={showNext}
                  className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-white/90 text-slate-900 sm:right-2 sm:h-10 sm:w-10"
                >
                  →
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {portfolioLightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 p-3 sm:p-4"
          onClick={() => setPortfolioLightboxUrl(null)}
        >
          <div
            className="relative flex h-full w-full max-w-6xl items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={portfolioLightboxUrl}
              alt="Портфолио"
              className="max-h-full max-w-full rounded-xl object-contain"
            />
            <button
              type="button"
              onClick={() => setPortfolioLightboxUrl(null)}
              className="absolute right-2 top-2 h-9 w-9 rounded-full bg-white/90 text-slate-900"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {videoModalUrl && (
        <div
          className="fixed inset-0 bg-white/90 z-50 flex items-center justify-center p-4"
          onClick={() => setVideoModalUrl(null)}
        >
          <div
            className="relative max-w-5xl w-full rounded-2xl bg-black p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between text-slate-900 px-2 pb-2">
              <div className="text-sm md:text-base">{videoModalTitle}</div>
              <button
                type="button"
                onClick={() => setVideoModalUrl(null)}
                className="rounded-full w-8 h-8 bg-white/15 hover:bg-white/25"
              >
                ✕
              </button>
            </div>
            <video
              src={videoModalUrl}
              controls
              controlsList="nodownload"
              disablePictureInPicture
              onContextMenu={(e) => e.preventDefault()}
              autoPlay
              playsInline
              className="w-full max-h-[75vh] rounded-xl bg-black"
            />
            <div className="mt-3 text-xs text-slate-600 px-2">
              Воспроизведение внутри страницы
            </div>
          </div>
        </div>
      )}
      <div className="relative z-10">
        <PublicFooter />
      </div>
    </div>
  );
};

const SectionTitle = ({ title }: { title: string }) => (
  <div className="mt-10 border-b border-black/10 relative">
    <div className="absolute left-0 bottom-0 h-[3px] w-28 bg-white/85" />
    <h3 className="text-2xl md:text-[30px] font-bold pb-3">{title}</h3>
  </div>
);

const AppearancePassport = ({
  rows,
  playingAge,
  ethnicity,
}: {
  rows: Array<{ label: string; value: string }>;
  playingAge: string | null;
  ethnicity: string | null;
}) => (
  <section className="mt-4 rounded-[28px] border border-white/80 bg-white/76 p-3 shadow-[0_14px_44px_rgba(15,23,42,0.07)] backdrop-blur sm:p-4 md:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Параметры профиля
        </div>
        <div className="mt-1 text-sm text-slate-500">Коротко для кастинга</div>
      </div>
      <div className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600">
        Публично
      </div>
    </div>

    {playingAge || ethnicity ? (
      <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
        {playingAge ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3 sm:px-4 sm:py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Игровой возраст
            </div>
            <div className="mt-1 text-2xl font-black leading-none text-slate-900 sm:text-3xl">
              {playingAge}
            </div>
          </div>
        ) : null}
        {ethnicity ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3 sm:px-4 sm:py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Этничность
            </div>
            <div className="mt-1 text-base font-bold leading-tight text-slate-900 sm:text-lg">
              {ethnicity}
            </div>
          </div>
        ) : null}
      </div>
    ) : null}

    <div className="mt-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        Детальные параметры
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map((row, index) => (
          <div
            key={`${row.label}-${index}`}
            className="min-h-[76px] rounded-2xl border border-slate-200 bg-white/82 px-3 py-3 shadow-sm"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              {row.label}
            </div>
            <div className="mt-1 text-sm font-bold leading-snug text-slate-900 sm:text-base">
              {row.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const CreatorTagsBlock = ({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: string[];
  emptyText: string;
}) => (
  <div className="mt-5 rounded-2xl border border-slate-200 bg-black/[0.02] p-4">
    <div className="text-xs uppercase tracking-[0.14em] text-slate-500">{title}</div>
    <div className="mt-3 flex flex-wrap gap-2">
      {items.length ? (
        items.map((item, index) => (
          <span
            key={`${title}-${item}-${index}`}
            className="px-3 py-1.5 rounded-full bg-white border border-black/10 text-sm text-slate-800"
          >
            {item}
          </span>
        ))
      ) : (
        <span className="text-sm text-slate-500">{emptyText}</span>
      )}
    </div>
  </div>
);

const EmptyBlock = ({ text }: { text: string }) => (
  <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-dashed border-black/20 p-6 text-base text-slate-500 bg-white">
    {text}
  </div>
);

const VideoCard = ({
  title,
  subtitle,
  year,
  preview,
  onOpen,
}: {
  title: string;
  subtitle: string;
  year?: string;
  preview?: string | null;
  onOpen: () => void;
}) => (
  <button
    type="button"
    onClick={onOpen}
    className="rounded-2xl border border-black/10 p-3 bg-white block hover:shadow-md transition-shadow"
  >
    <div className="text-lg font-semibold mb-2">{title}</div>
    <div className="rounded-xl overflow-hidden bg-white/85 aspect-video relative">
      {preview ? (
        <img
          src={resolveMediaUrl(preview) ?? undefined}
          alt=""
          className="w-full h-full object-cover opacity-70"
        />
      ) : null}
      <div className="absolute inset-0 grid place-items-center text-slate-900 text-2xl">▶</div>
    </div>
    <div className="text-sm mt-2 text-slate-800">{subtitle}</div>
    {year && <div className="text-sm text-slate-500">{year}</div>}
  </button>
);

const ProfileSummaryCard = ({
  facts,
  photosCount,
  videosCount,
}: {
  facts: Array<{ label: string; value: string }>;
  photosCount: number;
  videosCount: number;
}) => (
  <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
    <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
      Быстрый обзор
    </div>
    <div className="mt-4 grid gap-3">
      {facts.map((fact) => (
        <div
          key={fact.label}
          className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2"
        >
          <span className="text-xs text-slate-500">{fact.label}</span>
          <span className="text-right text-sm font-semibold text-slate-900">
            {fact.value}
          </span>
        </div>
      ))}
    </div>
    <div className="mt-4 grid grid-cols-2 gap-2">
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
        <div className="text-xs text-slate-500">Фото</div>
        <div className="text-lg font-bold text-slate-900">{photosCount}</div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
        <div className="text-xs text-slate-500">Видео</div>
        <div className="text-lg font-bold text-slate-900">{videosCount}</div>
      </div>
    </div>
  </div>
);

const ActionPanel = ({
  isAuthed,
  isCustomer,
  hasRemainingContacts,
  remainingContacts,
  contactsUnlocked,
  contactInfo,
  unlocking,
  onUnlock,
  error,
}: {
  isAuthed: boolean;
  isCustomer: boolean;
  hasRemainingContacts: boolean;
  remainingContacts: number;
  contactsUnlocked: boolean;
  contactInfo: ContactInfoResponse | null;
  unlocking: boolean;
  onUnlock: () => void;
  error: string | null;
}) => (
  <div className="rounded-2xl border border-black/10 bg-white p-5 sticky top-6 shadow-sm">
    <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Доступ к контактам</div>
    <div className="mt-2 text-sm text-slate-700">
      {isCustomer
        ? `Осталось токенов: ${remainingContacts}`
        : "Контакты открываются только заказчиком по токенам."}
    </div>

    {!isAuthed && (
      <Link
        to="/login"
        className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white/90 py-3 text-base font-semibold text-slate-900 hover:bg-slate-50"
      >
        Войти как заказчик
      </Link>
    )}

    {isAuthed && !isCustomer && (
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
        Текущая роль не может открывать контакты.
      </div>
    )}

    {isCustomer && !contactsUnlocked && (
      <button
        type="button"
        onClick={onUnlock}
        disabled={!hasRemainingContacts || unlocking}
        className="mt-4 w-full rounded-xl bg-slate-900 py-3 text-base font-semibold text-white shadow-sm shadow-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {unlocking ? "Открываем..." : hasRemainingContacts ? "Открыть контакты (1 токен)" : "Нет доступных токенов"}
      </button>
    )}

    {isCustomer && !hasRemainingContacts && !contactsUnlocked && (
      <div className="mt-3 text-sm text-slate-600">
        Токены закончились. Пополните подписку в кабинете заказчика.
      </div>
    )}

    {error && (
      <div className="mt-3 rounded-xl bg-red-50 text-red-700 px-3 py-2 text-sm">
        {error}
      </div>
    )}

    {contactsUnlocked && contactInfo && (
      <div className="mt-4 text-sm text-slate-700 space-y-1">
        {contactInfo.telegram && (
          <div>
            <span className="text-slate-500">Telegram:</span> @{contactInfo.telegram}
          </div>
        )}
        {contactInfo.phone && (
          <div>
            <span className="text-slate-500">Телефон:</span> {contactInfo.phone}
          </div>
        )}
        {contactInfo.whatsapp && (
          <div>
            <span className="text-slate-500">WhatsApp:</span> {contactInfo.whatsapp}
          </div>
        )}
        {contactInfo.email && (
          <div>
            <span className="text-slate-500">Email:</span> {contactInfo.email}
          </div>
        )}
        {!contactInfo.telegram &&
          !contactInfo.phone &&
          !contactInfo.whatsapp &&
          !contactInfo.email && (
        <div>
            <span className="text-slate-500">Контакты:</span> не указаны в профиле
          </div>
        )}
      </div>
    )}

    {isCustomer && contactsUnlocked && (
      <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
        Контакт открыт и сохранен в истории просмотренных.
      </div>
    )}
  </div>
);
