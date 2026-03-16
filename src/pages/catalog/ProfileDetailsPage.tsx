import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import api from "@/api/client";
import publicApi from "@/shared/api/publicClient";
import { Container } from "@/shared/ui/Container";
import { InlineNav } from "@/shared/ui/InlineNav";
import { PageOctopusDecor } from "@/shared/ui/PageOctopusDecor";
import { resolveMediaUrl } from "@/shared/ui/useProfileAvatar";
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
  locationName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contactWhatsapp?: string | null;
  contactTelegram?: string | null;
  mainPhotoUrl?: string | null;
  photoUrls?: string[] | null;
  videoUrls?: string[] | null;
  minRate?: number | null;
  rateUnit?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  bodyType?: string | null;
  hairColor?: string | null;
  eyeColor?: string | null;
  playingAgeMin?: number | null;
  playingAgeMax?: number | null;
  unionMembership?: string | null;
  hasDriverLicense?: boolean | null;
  contactInstagram?: string | null;
  skills?: string[] | null;
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
  videoUrls: Array.isArray(profile.videoUrls) ? profile.videoUrls : [],
  skills: Array.isArray(profile.skills) ? profile.skills : [],
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
  const location = useLocation();
  const locationState = location.state as ProfileLocationState;
  const previewProfile = locationState?.profilePreview ?? null;
  const isAuthed = Boolean(
    localStorage.getItem("accessToken") || localStorage.getItem("token")
  );
  const role = (localStorage.getItem("role") || "").toUpperCase();
  const isCustomer = isAuthed && role === "CUSTOMER";
  const [profile, setProfile] = useState<PublicProfile | null>(previewProfile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
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
          try {
            const publicProfile = await loadPublicProfileById(id);
            if (publicProfile) {
              setProfile(publicProfile);
              setError(null);
            } else {
              setError("Профиль не найден");
            }
          } catch {
            setError("Не удалось загрузить профиль");
          }
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
      profile.displayName ||
      [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
      "Без имени"
    );
  }, [profile]);

  const photos = useMemo(() => {
    if (!profile) return [];
    const list = [...(profile.photoUrls ?? [])];
    if (profile.mainPhotoUrl && !list.includes(profile.mainPhotoUrl)) {
      list.unshift(profile.mainPhotoUrl);
    }
    return list;
  }, [profile]);

  useEffect(() => {
    setActivePhoto(0);
  }, [photos.length]);

  const fromCastingResponses =
    locationState?.from === "casting-responses";

  const currentPhoto = photos[activePhoto] ?? photos[0] ?? null;
  const hasManyPhotos = photos.length > 1;
  const galleryPhotos = photos.slice(0, 5);
  const sidePhotos = galleryPhotos.slice(1, 5);
  const videoList = (profile?.videoUrls ?? []).slice(0, 3);
  const videoFields = [
    { label: "Интро-видео", url: profile?.videoUrls?.[0] ?? null },
    { label: "Актерский монолог", url: profile?.videoUrls?.[1] ?? null },
    { label: "Самопроба", url: profile?.videoUrls?.[2] ?? null },
  ];

  const showPrev = () => {
    if (!photos.length) return;
    setActivePhoto((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const showNext = () => {
    if (!photos.length) return;
    setActivePhoto((prev) => (prev + 1) % photos.length);
  };
  const openVideoModal = (url?: string | null, title?: string) => {
    const resolved = resolveMediaUrl(url ?? null);
    if (!resolved) return;
    setVideoModalTitle(title || "Видео");
    setVideoModalUrl(resolved);
  };

  const description =
    profile?.description?.trim() ||
    profile?.bio?.trim() ||
    "Описание пока не заполнено.";
  const shortDescription =
    description.length > 260 ? `${description.slice(0, 260)}...` : description;

  const appearanceRows = [
    { label: "Тип профиля", value: profileTypeLabel[profile?.type ?? "ACTOR"] },
    { label: "Тип деятельности", value: profile?.activityType || "Не указан" },
    { label: "Возраст", value: profile?.age ? `${profile.age} лет` : "Не указан" },
    {
      label: "Пол",
      value:
        (profile?.gender && genderLabel[profile.gender]) ||
        profile?.gender ||
        "Не указан",
    },
    { label: "Рост", value: profile?.heightCm ? `${profile.heightCm} см` : "Не указан" },
    { label: "Вес", value: profile?.weightKg ? `${profile.weightKg} кг` : "Не указан" },
    { label: "Телосложение", value: profile?.bodyType || "Не указано" },
    { label: "Цвет волос", value: profile?.hairColor || "Не указан" },
    { label: "Цвет глаз", value: profile?.eyeColor || "Не указан" },
    {
      label: "Ставка",
      value: profile?.minRate ? `${profile.minRate} ${profile.rateUnit || "сом"}` : "Не указана",
    },
  ];

  const playingAge =
    profile?.playingAgeMin && profile?.playingAgeMax
      ? `${profile.playingAgeMin}-${profile.playingAgeMax}`
      : profile?.age && profile.age > 0
      ? `${Math.max(18, profile.age - 8)}-${profile.age + 8}`
      : "—";

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

  const skills =
    profile?.skills && profile.skills.length > 0
      ? profile.skills
      : [
          profile?.activityType || "Актерское мастерство",
          profile?.type === "ACTOR" ? "Кастинг" : "Продакшн",
          profile?.city || "Мобильность",
        ];
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

  return (
    <div className="relative min-h-screen bg-[#eff1f4] text-[#111827]">
      <PageOctopusDecor />
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
                  Профиль
                </div>
                <h1 className="text-2xl md:text-3xl font-bold mt-1">{name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span>{profile ? profileTypeLabel[profile.type] : ""}</span>
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
                <div>
                  <div className="text-center mb-6">
                    <div className="inline-flex border-b-2 border-slate-900 text-slate-800 font-semibold text-sm md:text-base pb-2">
                      Детали и медиа
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[1.05fr_1fr]">
                    <div className="relative rounded-xl overflow-hidden border border-black/10 bg-slate-200 aspect-[4/5]">
                      {galleryPhotos[0] ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActivePhoto(0);
                            setLightboxOpen(true);
                          }}
                          className="w-full h-full"
                        >
                          <img
                            src={resolveMediaUrl(galleryPhotos[0]) ?? undefined}
                            alt={name}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ) : (
                        <div className="w-full h-full grid place-items-center text-slate-500">
                          Фото отсутствует
                        </div>
                      )}

                      {videoList[0] && (
                        <button
                          type="button"
                          onClick={() => openVideoModal(videoList[0], "Интро-видео")}
                          className="absolute left-4 bottom-4 px-4 py-2 rounded-xl bg-black/80 text-white text-sm font-medium hover:bg-black"
                        >
                          ▶ Смотреть интро-видео
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 auto-rows-[1fr]">
                      {sidePhotos.length > 0 ? (
                        sidePhotos.map((url, index) => (
                          <button
                            key={`${url}-${index}`}
                            type="button"
                            onClick={() => {
                              setActivePhoto(index + 1);
                              setLightboxOpen(true);
                            }}
                            className="rounded-xl overflow-hidden border border-black/10 bg-slate-200 aspect-square"
                          >
                            <img
                              src={resolveMediaUrl(url) ?? undefined}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))
                      ) : (
                        <div className="col-span-2 rounded-xl border border-dashed border-black/20 grid place-items-center text-sm text-slate-500 p-6">
                          Дополнительные медиа отсутствуют
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 grid gap-8 xl:mt-10 xl:grid-cols-[1fr_340px]">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold leading-tight">{name}</h2>
                      <p className="text-lg md:text-xl mt-2 text-slate-700">
                        {profile.city || "Город не указан"}
                      </p>
                      <p className="text-base md:text-lg mt-2 text-slate-700">
                        {(profile.gender && genderLabel[profile.gender]) ||
                          profile.gender ||
                          "Пол не указан"}
                      </p>

                      <div
                        className={[
                          "mt-6 inline-block rounded-2xl px-5 py-4",
                          premium.active
                            ? "border border-amber-200 bg-amber-50/80"
                            : "border border-black/10 bg-slate-50",
                        ].join(" ")}
                      >
                        <div className="text-lg font-semibold">Опытный</div>
                        <div className="text-slate-600 mt-1 text-sm">
                          Профессионал с подтвержденным опытом
                        </div>
                      </div>

                      <div className="mt-8 text-[15px] leading-7 text-slate-800">
                        {bioExpanded ? description : shortDescription}
                      </div>
                      {description.length > 260 && (
                        <button
                          type="button"
                          onClick={() => setBioExpanded((v) => !v)}
                          className="mt-2 text-slate-700 text-sm font-medium hover:underline"
                        >
                          {bioExpanded ? "Свернуть" : "Показать больше"}
                        </button>
                      )}

                      {profile.type === "ACTOR" && (
                        <>
                          <SectionTitle title="Внешность" />
                          <AppearancePassport
                            rows={appearanceRows}
                            playingAge={playingAge}
                            ethnicity="Белый / Европейская внешность"
                          />
                        </>
                      )}

                      <SectionTitle title="Видео-визитки и актерские материалы" />
                      <div className="mt-4 grid md:grid-cols-3 gap-3">
                        {videoFields.map((field) => (
                          <VideoField
                            key={field.label}
                            label={field.label}
                            url={field.url}
                            onOpen={(resolvedUrl) => {
                              setVideoModalTitle(field.label);
                              setVideoModalUrl(resolvedUrl);
                            }}
                          />
                        ))}
                      </div>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        {videoList.length > 0 ? (
                          videoList.map((video, index) => (
                            <VideoCard
                              key={`${video}-${index}`}
                              title={index === 0 ? "Ваше интро-видео" : `Видеообразец ${index + 1}`}
                              subtitle={name}
                              year={profile.age ? String(new Date().getFullYear() - Math.max(profile.age - 20, 0)) : ""}
                              preview={photos[index]}
                              onOpen={() =>
                                openVideoModal(
                                  video,
                                  index === 0 ? "Ваше интро-видео" : `Видеообразец ${index + 1}`
                                )
                              }
                            />
                          ))
                        ) : (
                          <EmptyBlock text="Видеоматериалы пока не добавлены" />
                        )}
                      </div>

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
                          <SectionTitle title="Опыт и проекты" />
                          <div className="mt-4 space-y-0 border border-black/10 rounded-2xl overflow-hidden bg-white">
                            <ExperienceRow
                              leftTitle={profile.activityType || "Кино"}
                              leftSubtitle={profileTypeLabel[profile.type]}
                              rightTitle={name}
                              rightSubtitle={profile.city || "Город"}
                            />
                            <ExperienceRow
                              leftTitle="Театр"
                              leftSubtitle="Главная роль"
                              rightTitle="Независимый проект"
                              rightSubtitle={profile.city || "Город"}
                            />
                            <ExperienceRow
                              leftTitle="Реклама"
                              leftSubtitle="Второстепенная роль"
                              rightTitle="Цифровая кампания"
                              rightSubtitle={profile.city || "Город"}
                            />
                          </div>

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
                      )}

                      <SectionTitle title="Образование и обучение" />
                      <div className="mt-4 border border-black/10 rounded-2xl overflow-hidden bg-white">
                        <EducationRow
                          year="2024"
                          school="In The Moment Acting Studio"
                          course="Мастер-класс"
                          teacher="Laurel Vouvray"
                          city={profile.city || "Austin"}
                        />
                        <EducationRow
                          year="2014"
                          school="New York Conservatory"
                          course="Актерское мастерство для кино и ТВ"
                          teacher="Richard Omar"
                          city="Нью-Йорк"
                        />
                      </div>
                    </div>

                    <aside className="space-y-6">
                      <ActionPanel
                        isAuthed={isAuthed}
                        isCustomer={isCustomer}
                        unlocking={unlocking}
                        hasRemainingContacts={remainingContacts > 0}
                        remainingContacts={remainingContacts}
                        contactsUnlocked={contactsUnlocked}
                        contactInfo={contactInfo}
                        onUnlock={unlockContacts}
                        error={contactsError}
                      />

                      <SidebarBlock title="Сайты и соцсети">
                        <p className="text-base">
                          Контакты и соцсети видны только заказчику с доступными токенами.
                        </p>
                      </SidebarBlock>
                    </aside>
                  </div>
                </div>
              )}
            </section>
          </div>
        </Container>
      </div>

      {lightboxOpen && currentPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4"
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

      {videoModalUrl && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
          onClick={() => setVideoModalUrl(null)}
        >
          <div
            className="relative max-w-5xl w-full rounded-2xl bg-black p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between text-white px-2 pb-2">
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
            <div className="mt-3 text-xs text-slate-300 px-2">
              Воспроизведение внутри страницы
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SectionTitle = ({ title }: { title: string }) => (
  <div className="mt-10 border-b border-black/10 relative">
    <div className="absolute left-0 bottom-0 h-[3px] w-28 bg-slate-900" />
    <h3 className="text-2xl md:text-[30px] font-bold pb-3">{title}</h3>
  </div>
);

const AppearancePassport = ({
  rows,
  playingAge,
  ethnicity,
}: {
  rows: Array<{ label: string; value: string }>;
  playingAge: string;
  ethnicity: string;
}) => (
  <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 md:p-6">
    <div className="flex flex-wrap items-end justify-between gap-3 pb-4 border-b border-slate-200">
      <div>
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
          Внешность
        </div>
        <div className="mt-1 text-lg md:text-xl font-semibold text-slate-900">
          Паспорт параметров
        </div>
      </div>
      <div className="text-xs text-slate-500">Публичные данные профиля</div>
    </div>

    <div className="mt-4 grid sm:grid-cols-2 gap-3">
      <div className="rounded-2xl border border-black/10 bg-black/[0.03] backdrop-blur-sm px-4 py-4">
        <div className="text-[11px] uppercase tracking-[0.14em] text-slate-600">
          Игровой возраст
        </div>
        <div className="mt-2 text-3xl md:text-[34px] leading-none font-semibold text-slate-900">
          {playingAge}
        </div>
      </div>
      <div className="rounded-2xl border border-black/10 bg-black/[0.03] backdrop-blur-sm px-4 py-4">
        <div className="text-[11px] uppercase tracking-[0.14em] text-slate-600">
          Этничность
        </div>
        <div className="mt-2 text-base md:text-lg font-medium text-slate-900 leading-tight">
          {ethnicity}
        </div>
      </div>
    </div>

    <div className="mt-4">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500 mb-2">
        Детальные параметры
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
        {rows.map((row, index) => (
          <div
            key={`${row.label}-${index}`}
            className="grid gap-1 border-b border-slate-200 px-4 py-3 last:border-b-0 sm:grid-cols-[160px_1fr] sm:gap-3 md:grid-cols-[220px_1fr]"
          >
            <div className="text-xs md:text-sm uppercase tracking-[0.08em] text-slate-500">
              {row.label}
            </div>
            <div className="text-sm md:text-base text-slate-900 font-medium">{row.value}</div>
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
    <div className="rounded-xl overflow-hidden bg-slate-900 aspect-video relative">
      {preview ? (
        <img
          src={resolveMediaUrl(preview) ?? undefined}
          alt=""
          className="w-full h-full object-cover opacity-70"
        />
      ) : null}
      <div className="absolute inset-0 grid place-items-center text-white text-2xl">▶</div>
    </div>
    <div className="text-sm mt-2 text-slate-800">{subtitle}</div>
    {year && <div className="text-sm text-slate-500">{year}</div>}
  </button>
);

const VideoField = ({
  label,
  url,
  onOpen,
}: {
  label: string;
  url?: string | null;
  onOpen: (resolvedUrl: string) => void;
}) => {
  const resolved = resolveMediaUrl(url ?? null);
  return (
    <div className="rounded-xl border border-black/10 bg-white px-3 py-3">
      <div className="text-xs uppercase tracking-[0.14em] text-slate-500 mb-2">
        {label}
      </div>
      <div className="rounded-lg border border-black/10 bg-slate-50 px-3 py-2 text-sm text-slate-700 truncate">
        {resolved ? "Видео добавлено" : "Видео не добавлено"}
      </div>
      <div className="mt-2">
        {resolved ? (
          <button
            type="button"
            onClick={() => onOpen(resolved)}
            className="rounded-lg px-3 py-1.5 text-sm bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            Смотреть
          </button>
        ) : (
          <span className="text-sm text-slate-400">Недоступно</span>
        )}
      </div>
    </div>
  );
};

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
        className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-black/85 text-white py-3 text-base font-semibold hover:bg-black"
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
        className="mt-4 w-full rounded-xl bg-black/85 text-white py-3 text-base font-semibold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
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

const SidebarBlock = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="pt-3 border-t border-black/15">
    <h4 className="text-xl font-bold mb-3">{title}</h4>
    <div>{children}</div>
  </section>
);

const ExperienceRow = ({
  leftTitle,
  leftSubtitle,
  rightTitle,
  rightSubtitle,
}: {
  leftTitle: string;
  leftSubtitle: string;
  rightTitle: string;
  rightSubtitle: string;
}) => (
  <div className="grid md:grid-cols-2 gap-4 p-4 border-b border-black/10 last:border-b-0">
    <div>
      <div className="text-lg font-semibold">{leftTitle}</div>
      <div className="text-sm text-slate-700">{leftSubtitle}</div>
    </div>
    <div>
      <div className="text-lg">{rightTitle}</div>
      <div className="text-sm text-slate-700">{rightSubtitle}</div>
    </div>
  </div>
);

const EducationRow = ({
  year,
  school,
  course,
  teacher,
  city,
}: {
  year: string;
  school: string;
  course: string;
  teacher: string;
  city: string;
}) => (
  <div className="grid gap-3 border-b border-black/10 p-4 last:border-b-0 md:grid-cols-[120px_1fr_1fr] md:gap-4">
    <div className="text-sm text-slate-500">{year}</div>
    <div>
      <div className="text-lg font-semibold">{school}</div>
      <div className="text-sm text-slate-700">{course}</div>
    </div>
    <div>
      <div className="text-lg">{teacher}</div>
      <div className="text-sm text-slate-700">{city}</div>
    </div>
  </div>
);
