import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/api/client";
import { Container } from "@/shared/ui/Container";
import { Input } from "@/shared/ui/Input";
import { Textarea } from "@/shared/ui/Textarea";
import { InlineNav } from "@/shared/ui/InlineNav";
import { UrlListInput } from "@/shared/ui/UrlListInput";
import { HeaderPublishSwitch } from "@/shared/ui/HeaderPublishSwitch";
import { PageOctopusDecor } from "@/shared/ui/PageOctopusDecor";
import { CenterToast } from "@/shared/ui/CenterToast";
import { extractProfilePremiumInfo } from "@/shared/lib/profilePremium";
import { ProfilePremiumPanel } from "@/shared/ui/ProfilePremiumPanel";
import {
  REQUIRED_PROFILE_PHOTO_MESSAGE,
  useRequiredPhotoGuard,
} from "@/shared/lib/useRequiredPhotoGuard";
import {
  PHOTO_TYPES,
  VIDEO_ACCEPT,
  PHOTO_UPLOAD_HINT,
  VIDEO_UPLOAD_HINT,
  PROFILE_MEDIA_MODERATION_WARNING,
  isAllowedPhotoFile,
  isAllowedVideoFile,
  preparePhotoFile,
  assertVideoSize,
  getUploadErrorMessage,
} from "@/shared/lib/uploads";
import {
  mergeUniqueUrls,
  sanitizeEmail,
  sanitizeHttpUrl,
  sanitizePhone,
  sanitizeTelegram,
  toOptionalNumber,
  trimMultilineToNull,
  trimToNull,
} from "@/shared/lib/safety";

/* ================= CONFIG ================= */

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

function resolveMediaUrl(url?: string | null) {
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

/* ================= TYPES ================= */

type CreatorProfile = {
  id: number;
  type?: "CREATOR";
  published?: boolean | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  city?: string | null;
  mainPhotoUrl?: string | null;
  description?: string | null;
  bio?: string | null;
  experienceText?: string | null;
  activityType?: string | null;
  minRate?: number | null;
  rateUnit?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contactWhatsapp?: string | null;
  contactTelegram?: string | null;
  socialLinksJson?: string | null;
  photoUrls?: string[] | null;
  videoUrls?: string[] | null;
  premiumActive?: boolean | null;
  premiumExpiresAt?: string | null;
  canBuyPremium?: boolean | null;
  premiumPurchaseEndpoint?: string | null;
  premiumPrice?: number | null;
  premiumDurationDays?: number | null;
};

type CreatorProfileForm = {
  published: boolean;
  firstName: string;
  lastName: string;
  city: string;
  mainPhotoUrl: string;
  description: string;
  bio: string;
  experienceLevel: string;
  projectFormats: string[];
  caseHighlights: string[];
  skills: string[];
  activityType: string;
  minRate: number | "";
  rateUnit: string;
  contactPhone: string;
  contactEmail: string;
  contactWhatsapp: string;
  contactTelegram: string;
  socialLinks: string[];
  photoUrls: string[];
  videoUrls: string[];
};

type PageState = "LOADING" | "READY";

/* ================= CONSTS ================= */

const RATE_UNIT_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "За час", value: "PER_HOUR" },
  { label: "За день", value: "PER_DAY" },
  { label: "За проект", value: "PER_PROJECT" },
];

const ACTIVITY_TYPE_OPTIONS = [
  "Режиссер",
  "Оператор",
  "Фотограф",
  "Монтажер",
  "Colorist",
  "Звукорежиссер",
  "Продюсер",
  "Сценарист",
  "SMM / Контент-креатор",
  "Арт-директор",
  "Графический дизайнер",
  "VFX / Motion",
  "Световик",
  "Гример / Стилист",
  "Кастинг-директор",
  "Другое",
];

const CREATOR_SKILL_OPTIONS = [
  "Постановка света",
  "Кинематография",
  "Монтаж",
  "Color Grading",
  "Саунд-дизайн",
  "Режиссура",
  "Продюсирование",
  "Сценарий",
  "SMM",
  "Копирайтинг",
  "3D / VFX",
  "Motion",
  "Фото-ретушь",
  "Интервью",
  "Документалистика",
  "Работа с брендами",
  "Организация съемок",
  "Кастинг",
];

const EXPERIENCE_LEVEL_OPTIONS = [
  { value: "Junior (до 1 года)", label: "Junior (до 1 года)" },
  { value: "Middle (1-3 года)", label: "Middle (1-3 года)" },
  { value: "Senior (3-7 лет)", label: "Senior (3-7 лет)" },
  { value: "Lead (7+ лет)", label: "Lead (7+ лет)" },
];

const PROJECT_FORMAT_OPTIONS = [
  "Реклама",
  "Клипы",
  "Сериалы",
  "Кино",
  "YouTube / Reels",
  "Интервью",
  "Документалистика",
  "Event / Live",
];

const CASE_HIGHLIGHT_OPTIONS = [
  "5+ коммерческих проектов",
  "10+ коммерческих проектов",
  "20+ коммерческих проектов",
  "Работа с брендами",
  "Международные проекты",
  "Проекты под дедлайн",
  "Команда под ключ",
  "Есть награды / фестивали",
];

const getErrorStatus = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } })?.response?.status;

/* ================= PAGE ================= */

export const CreatorProfilePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreatorProfileForm | null>(null);
  const [profileData, setProfileData] = useState<CreatorProfile | null>(null);
  const [pageState, setPageState] = useState<PageState>("LOADING");
  const [hasProfile, setHasProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishSaving, setPublishSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const saveNoticeTimeoutRef = useRef<number | null>(null);
  const photoSectionRef = useRef<HTMLDivElement>(null);
  const [photoRequirementMessage, setPhotoRequirementMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<CreatorProfile>("/api/profile/me");
        const nextForm = mapToForm(res.data);
        setProfileData(res.data);
        setForm(nextForm);
        setHasProfile(true);
      } catch (error: unknown) {
        const status = getErrorStatus(error);
        if (status === 404 || status === 400) {
          const nextForm = emptyForm();
          setForm(nextForm);
          setHasProfile(false);
        } else if (!status || status >= 500) {
          setError("Не удалось загрузить профиль");
        }
      } finally {
        setPageState("READY");
      }
    })();
  }, []);

  useEffect(() => {
    return () => {
      if (saveNoticeTimeoutRef.current) {
        window.clearTimeout(saveNoticeTimeoutRef.current);
      }
    };
  }, []);

  const showSaveNotice = (message: string, timeout = 1800) => {
    if (saveNoticeTimeoutRef.current) {
      window.clearTimeout(saveNoticeTimeoutRef.current);
    }
    setSaveNotice(message);
    saveNoticeTimeoutRef.current = window.setTimeout(() => {
      setSaveNotice(null);
      saveNoticeTimeoutRef.current = null;
    }, timeout);
  };

  const uploadFiles = async (files: File[], type: "photo" | "video") => {
    try {
      const uploaded: string[] = [];

      for (const file of files) {
        const preparedFile =
          type === "photo"
            ? await preparePhotoFile(file)
            : (assertVideoSize(file), file);
        const fd = new FormData();
        fd.append("files", preparedFile);
        const { data: urls } = await api.post<string[]>("/api/files/upload", fd);
        uploaded.push(...mergeUniqueUrls([], urls, { maxItems: 20 }));
      }

      setForm((prev) => {
        if (!prev) return prev;

        const nextPhotoUrls =
          type === "photo"
            ? mergeUniqueUrls(prev.photoUrls, uploaded, { maxItems: 20 })
            : prev.photoUrls;
        const nextMainPhotoUrl =
          type === "photo"
            ? prev.mainPhotoUrl || nextPhotoUrls[0] || ""
            : prev.mainPhotoUrl;

        return {
          ...prev,
          photoUrls: nextPhotoUrls,
          videoUrls:
            type === "video"
              ? mergeUniqueUrls(prev.videoUrls, uploaded, { maxItems: 12 })
              : prev.videoUrls,
          mainPhotoUrl: nextMainPhotoUrl,
        };
      });
    } catch (error: unknown) {
      if (getErrorStatus(error) !== 401) {
        setError(getUploadErrorMessage(error, type));
      }
    }
  };

  const saveProfile = async () => {
    if (!form) return;

    try {
      setSaving(true);
      setError(null);
      setSaveNotice(null);

      const payload = normalize(form);
      const res =
        hasProfile
          ? await api.patch<CreatorProfile>("/api/profile/creator", payload)
          : await api.post<CreatorProfile>("/api/profile/creator", payload);

      setProfileData(res.data);
      setForm(mapToForm(res.data));
      setHasProfile(true);
      window.dispatchEvent(new Event("profile-updated"));
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      showSaveNotice("Профиль успешно сохранен");
    } catch (error: unknown) {
      if (getErrorStatus(error) !== 401) {
        setError("Ошибка сохранения профиля");
      }
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("role");
    localStorage.removeItem("token");
    sessionStorage.clear();
    navigate("/login", { replace: true });
  };

  const premium = extractProfilePremiumInfo(profileData);
  const hasRequiredPhoto = Boolean(form?.photoUrls.length);

  const revealPhotoRequirement = () => {
    setPhotoRequirementMessage(REQUIRED_PROFILE_PHOTO_MESSAGE);
    window.requestAnimationFrame(() => {
      photoSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  useEffect(() => {
    if (hasRequiredPhoto) {
      setPhotoRequirementMessage(null);
    }
  }, [hasRequiredPhoto]);

  useRequiredPhotoGuard({
    enabled: pageState !== "LOADING" && Boolean(form),
    hasPhoto: hasRequiredPhoto,
    onBlocked: revealPhotoRequirement,
  });

  const savePublished = async (next: boolean) => {
    if (!form) return;
    const nextForm = { ...form, published: next };
    setForm(nextForm);

    try {
      setPublishSaving(true);
      setError(null);
      const res =
        hasProfile
          ? await api.patch<CreatorProfile>("/api/profile/creator/visibility", null, {
              params: { published: next },
            })
          : await api.post<CreatorProfile>("/api/profile/creator", normalize(nextForm));

      setProfileData(res.data);
      const nextFormFromServer = mapToForm(res.data);
      setForm(nextFormFromServer);
      setHasProfile(true);
      window.dispatchEvent(new Event("profile-updated"));
      showSaveNotice(next ? "Профиль виден в каталоге" : "Профиль скрыт из каталога", 2200);
    } catch (error: unknown) {
      setForm(form);
      if (getErrorStatus(error) !== 401) {
        setError("Не удалось обновить видимость профиля");
      }
    } finally {
      setPublishSaving(false);
    }
  };

  if (pageState === "LOADING") {
    return (
      <div className="min-h-screen grid place-items-center text-slate-500">
        Загрузка профиля…
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#f3f4f7] text-slate-900">
      <PageOctopusDecor />
      <div className="relative z-10">
        <Container>
          <div className="glass-object mx-auto mt-6 max-w-7xl overflow-visible rounded-[30px] sm:mt-8 sm:rounded-[36px] lg:rounded-[44px]">
          <InlineNav
            profileMenu={[
              {
                label: "Выйти",
                onClick: logout,
                danger: true,
              },
            ]}
          />

          <header className="glass-object-soft border-b border-white/50 px-4 py-5 sm:px-6 md:px-8 md:py-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">Профиль креатора</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Заполните профиль, чтобы заказчики видели ваши услуги и медиа.
                </p>
              </div>
              {form && (
                <div className="self-start md:self-center">
                  <HeaderPublishSwitch
                    checked={form.published}
                    onChange={(next) => void savePublished(next)}
                    disabled={publishSaving}
                  />
                </div>
              )}
            </div>
          </header>

          <section className="space-y-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
            {error && (
              <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {form && (
              <>
                <ProfilePremiumPanel
                  premium={premium}
                  returnTo="/account"
                  title="Оплата premium профиля креатора"
                  onError={setError}
                />

                <EditForm form={form} setForm={setForm} />

                <MediaSection
                  title="Фотографии"
                  urls={form.photoUrls}
                  accept={PHOTO_TYPES.join(",")}
                  hint={PHOTO_UPLOAD_HINT}
                  containerRef={photoSectionRef}
                  highlight={Boolean(photoRequirementMessage)}
                  errorMessage={photoRequirementMessage}
                  onAdd={(files) => uploadFiles(files, "photo")}
                  onRemove={(url) =>
                    setForm((prev) => {
                      if (!prev) return prev;
                      const nextPhotoUrls = prev.photoUrls.filter((u) => u !== url);
                      return {
                        ...prev,
                        photoUrls: nextPhotoUrls,
                        mainPhotoUrl:
                          prev.mainPhotoUrl === url
                            ? nextPhotoUrls[0] || ""
                            : prev.mainPhotoUrl,
                      };
                    })
                  }
                />

                <MediaSection
                  title="Видео"
                  urls={form.videoUrls}
                  accept={VIDEO_ACCEPT}
                  hint={VIDEO_UPLOAD_HINT}
                  isVideo
                  onAdd={(files) => uploadFiles(files, "video")}
                  onRemove={(url) =>
                    setForm({
                      ...form,
                      videoUrls: form.videoUrls.filter((u) => u !== url),
                    })
                  }
                />

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="w-full rounded-xl bg-slate-900 px-6 py-3 text-white disabled:opacity-60 sm:min-w-44 sm:w-auto"
                  >
                    {saving ? "Сохраняем..." : hasProfile ? "Сохранить изменения" : "Сохранить профиль"}
                  </button>
                  <button
                    onClick={() => setForm(emptyForm())}
                    className="w-full rounded-xl border px-6 py-3 text-slate-600 sm:w-auto"
                  >
                    Очистить форму
                  </button>
                </div>
              </>
            )}
          </section>
          </div>
        </Container>
      </div>
      {error && <CenterToast message={error} variant="error" />}
      {saveNotice && <CenterToast message={saveNotice} />}
    </div>
  );
};

/* ================= MEDIA ================= */

const MediaSection = ({
  title,
  urls,
  accept,
  hint,
  isVideo,
  containerRef,
  highlight,
  errorMessage,
  onAdd,
  onRemove,
}: {
  title: string;
  urls: string[];
  accept: string;
  hint?: string;
  isVideo?: boolean;
  containerRef?: { current: HTMLDivElement | null };
  highlight?: boolean;
  errorMessage?: string | null;
  onAdd: (files: File[]) => void;
  onRemove: (url: string) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      ref={containerRef}
      className={[
        "glass-object-soft rounded-2xl p-5",
        highlight ? "border border-red-300 bg-red-50/60" : "",
      ].join(" ")}
    >
      <h3 className="font-semibold mb-3">{title}</h3>
      {hint ? <p className="mb-3 text-sm text-slate-500">{hint}</p> : null}
      <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {PROFILE_MEDIA_MODERATION_WARNING}
      </div>
      {errorMessage ? (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div
        className="border-2 border-dashed border-white/70 rounded-xl p-4 text-center cursor-pointer bg-white/30 hover:bg-white/60"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const files = Array.from(e.dataTransfer.files).filter((f) =>
            isVideo ? isAllowedVideoFile(f) : isAllowedPhotoFile(f)
          );
          if (files.length) onAdd(files);
        }}
      >
        Перетащите файлы или нажмите
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) {
              const files = Array.from(e.target.files).filter((f) =>
                isVideo ? isAllowedVideoFile(f) : isAllowedPhotoFile(f)
              );
              if (files.length) onAdd(files);
            }
            e.currentTarget.value = "";
          }}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
        {urls.map((url) => (
          <div key={url} className="relative group">
            {isVideo ? (
              <video
                src={resolveMediaUrl(url) ?? undefined}
                controls
                controlsList="nodownload"
                disablePictureInPicture
                onContextMenu={(e) => e.preventDefault()}
                className="rounded-xl w-full"
              />
            ) : (
              <img
                src={resolveMediaUrl(url) ?? undefined}
                className="rounded-xl object-cover aspect-square"
              />
            )}

            <button
              type="button"
              onClick={() => onRemove(url)}
              className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-6 h-6 text-xs opacity-0 group-hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ================= FORM ================= */

const EditForm = ({
  form,
  setForm,
}: {
  form: CreatorProfileForm;
  setForm: (v: CreatorProfileForm) => void;
}) => (
  <div className="space-y-5">
    <div className="glass-object-soft rounded-2xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-800">Основные данные</h2>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <FieldLabel>Имя</FieldLabel>
          <Input
            placeholder="Имя"
            value={form.firstName}
            onChange={(value) => setForm({ ...form, firstName: value })}
          />
        </div>

        <div>
          <FieldLabel>Фамилия</FieldLabel>
          <Input
            placeholder="Фамилия"
            value={form.lastName}
            onChange={(value) => setForm({ ...form, lastName: value })}
          />
        </div>

        <div>
          <FieldLabel>Город</FieldLabel>
          <Input
            placeholder="Бишкек"
            value={form.city}
            onChange={(value) => setForm({ ...form, city: value })}
          />
        </div>

        <div className="md:col-span-2">
          <FieldLabel>Тип деятельности</FieldLabel>
          <select
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
            value={form.activityType}
            onChange={(e) => setForm({ ...form, activityType: e.target.value })}
          >
            <option value="">Не выбрано</option>
            {form.activityType && !ACTIVITY_TYPE_OPTIONS.includes(form.activityType) && (
              <option value={form.activityType}>{form.activityType}</option>
            )}
            {ACTIVITY_TYPE_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

      </div>
    </div>

    <div className="glass-object-soft rounded-2xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-800">О себе</h2>

      <div>
        <FieldLabel>Короткое описание</FieldLabel>
        <Textarea
          placeholder="Чем вы занимаетесь и в чем ваша сильная сторона"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
    </div>

    <div className="glass-object-soft rounded-2xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-800">Опыт и кейсы</h2>

      <div>
        <FieldLabel>Уровень опыта</FieldLabel>
        <select
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
          value={form.experienceLevel}
          onChange={(e) => setForm({ ...form, experienceLevel: e.target.value })}
        >
          <option value="">Не выбрано</option>
          {EXPERIENCE_LEVEL_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-white/60 p-4 space-y-3 bg-white/30">
        <FieldLabel>Форматы проектов</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {PROJECT_FORMAT_OPTIONS.map((item) => {
            const selected = form.projectFormats.includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    projectFormats: selected
                      ? form.projectFormats.filter((v) => v !== item)
                      : [...form.projectFormats, item],
                  })
                }
                className={[
                  "px-3 py-1.5 rounded-full border text-sm transition-colors",
                  selected
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50",
                ].join(" ")}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-white/60 p-4 space-y-3 bg-white/30">
        <FieldLabel>Ключевые кейсы и достижения</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {CASE_HIGHLIGHT_OPTIONS.map((item) => {
            const selected = form.caseHighlights.includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    caseHighlights: selected
                      ? form.caseHighlights.filter((v) => v !== item)
                      : [...form.caseHighlights, item],
                  })
                }
                className={[
                  "px-3 py-1.5 rounded-full border text-sm transition-colors",
                  selected
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50",
                ].join(" ")}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-white/60 p-4 space-y-3 bg-white/30">
        <FieldLabel>Навыки</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {CREATOR_SKILL_OPTIONS.map((skill) => {
            const selected = form.skills.includes(skill);
            return (
              <button
                key={skill}
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    skills: selected
                      ? form.skills.filter((s) => s !== skill)
                      : [...form.skills, skill],
                  })
                }
                className={[
                  "px-3 py-1.5 rounded-full border text-sm transition-colors",
                  selected
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50",
                ].join(" ")}
              >
                {skill}
              </button>
            );
          })}
        </div>
      </div>
    </div>

    <div className="glass-object-soft rounded-2xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-800">Ставка и контакты</h2>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <FieldLabel>Ставка (минимум)</FieldLabel>
          <Input
            type="number"
            min={0}
            placeholder="5000"
            value={form.minRate === "" ? "" : String(form.minRate)}
            onChange={(value) =>
              setForm({ ...form, minRate: value ? Number(value) : "" })
            }
          />
        </div>

        <div>
          <FieldLabel>Единица ставки</FieldLabel>
          <select
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
            value={form.rateUnit}
            onChange={(e) => setForm({ ...form, rateUnit: e.target.value })}
          >
            {RATE_UNIT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>Телефон</FieldLabel>
          <Input
            placeholder="+996..."
            value={form.contactPhone}
            onChange={(value) => setForm({ ...form, contactPhone: value })}
          />
        </div>

        <div>
          <FieldLabel>Email</FieldLabel>
          <Input
            placeholder="name@example.com"
            value={form.contactEmail}
            onChange={(value) => setForm({ ...form, contactEmail: value })}
          />
        </div>

        <div>
          <FieldLabel>Telegram</FieldLabel>
          <Input
            placeholder="username (без @)"
            value={form.contactTelegram}
            onChange={(value) => setForm({ ...form, contactTelegram: value })}
          />
        </div>

        <div>
          <FieldLabel>WhatsApp</FieldLabel>
          <Input
            placeholder="+996..."
            value={form.contactWhatsapp}
            onChange={(value) => setForm({ ...form, contactWhatsapp: value })}
          />
        </div>
      </div>

      <UrlListInput
        label="Ссылки на соцсети / портфолио"
        values={form.socialLinks}
        onChange={(values) => setForm({ ...form, socialLinks: values })}
      />
    </div>
  </div>
);

/* ================= HELPERS ================= */

const FieldLabel = ({ children }: { children: ReactNode }) => (
  <div className="text-xs text-slate-500 mb-1">{children}</div>
);

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
    // Backward compatibility with old free-text format.
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

const buildExperienceBundle = (f: CreatorProfileForm) => {
  const parts: string[] = [];
  const experience = f.experienceLevel.trim();
  const formats = f.projectFormats.map((s) => s.trim()).filter(Boolean);
  const cases = f.caseHighlights.map((s) => s.trim()).filter(Boolean);
  const skills = f.skills.map((s) => s.trim()).filter(Boolean);

  if (experience) parts.push(`Уровень:\n${experience}`);
  if (formats.length) parts.push(`Форматы:\n${formats.join(", ")}`);
  if (cases.length) parts.push(`Кейсы:\n${cases.join(", ")}`);
  if (skills.length) parts.push(`Навыки:\n${skills.join(", ")}`);

  return parts.join("\n\n").trim();
};

const emptyForm = (): CreatorProfileForm => ({
  published: false,
  firstName: "",
  lastName: "",
  city: "",
  mainPhotoUrl: "",
  description: "",
  bio: "",
  experienceLevel: "",
  projectFormats: [],
  caseHighlights: [],
  skills: [],
  activityType: "",
  minRate: "",
  rateUnit: "PER_PROJECT",
  contactPhone: "",
  contactEmail: "",
  contactWhatsapp: "",
  contactTelegram: "",
  socialLinks: [],
  photoUrls: [],
  videoUrls: [],
});

const mapToForm = (p: CreatorProfile): CreatorProfileForm => {
  const parsed = parseExperienceBundle(p.experienceText);
  return {
    published: Boolean(p.published),
    firstName: trimToNull(p.firstName, 80) ?? "",
    lastName: trimToNull(p.lastName, 80) ?? "",
    city: trimToNull(p.city, 120) ?? "",
    mainPhotoUrl: trimToNull(p.mainPhotoUrl ?? p.photoUrls?.[0], 1500) ?? "",
    description: trimMultilineToNull(p.description, 2000) ?? "",
    bio: trimMultilineToNull(p.bio, 4000) ?? "",
    experienceLevel: parsed.experienceLevel,
    projectFormats: parsed.projectFormats,
    caseHighlights: parsed.caseHighlights,
    skills: parsed.skills,
    activityType: trimToNull(p.activityType, 120) ?? "",
    minRate: p.minRate ?? "",
    rateUnit: p.rateUnit ?? "PER_PROJECT",
    contactPhone: sanitizePhone(p.contactPhone) ?? "",
    contactEmail: sanitizeEmail(p.contactEmail) ?? "",
    contactWhatsapp: sanitizePhone(p.contactWhatsapp) ?? "",
    contactTelegram: sanitizeTelegram(p.contactTelegram) ?? "",
    socialLinks: parseSocialLinks(p.socialLinksJson),
    photoUrls: mergeUniqueUrls([], p.photoUrls ?? [], { maxItems: 20 }),
    videoUrls: mergeUniqueUrls([], p.videoUrls ?? [], { maxItems: 12 }),
  };
};

const parseSocialLinks = (raw?: string | null): string[] => {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((x) => sanitizeHttpUrl(String(x)))
        .filter((value): value is string => Boolean(value));
    }
    if (parsed && typeof parsed === "object") {
      return Object.values(parsed)
        .map((x) => sanitizeHttpUrl(String(x)))
        .filter((value): value is string => Boolean(value));
    }
    return [];
  } catch {
    return raw
      .split(",")
      .map((x) => sanitizeHttpUrl(x))
      .filter((value): value is string => Boolean(value));
  }
};

const normalize = (f: CreatorProfileForm) => {
  const socialLinks = f.socialLinks
    .map((x) => sanitizeHttpUrl(x))
    .filter((value): value is string => Boolean(value))
    .slice(0, 10);
  const experienceText = buildExperienceBundle(f);

  return {
    published: f.published,
    firstName: trimToNull(f.firstName, 80),
    lastName: trimToNull(f.lastName, 80),
    city: trimToNull(f.city, 120),
    mainPhotoUrl: trimToNull(f.mainPhotoUrl || f.photoUrls[0], 1500),
    description: trimMultilineToNull(f.description, 2000),
    bio: trimMultilineToNull(f.bio, 4000),
    experienceText: trimMultilineToNull(experienceText, 5000),
    activityType: trimToNull(f.activityType, 120),
    minRate: toOptionalNumber(f.minRate, { min: 0, max: 100000000 }),
    rateUnit: trimToNull(f.rateUnit, 40),
    contactPhone: sanitizePhone(f.contactPhone),
    contactEmail: sanitizeEmail(f.contactEmail),
    contactWhatsapp: sanitizePhone(f.contactWhatsapp),
    contactTelegram: sanitizeTelegram(f.contactTelegram),
    socialLinksJson: socialLinks.length ? JSON.stringify(socialLinks) : null,
    photoUrls: mergeUniqueUrls([], f.photoUrls, { maxItems: 20 }),
    videoUrls: mergeUniqueUrls([], f.videoUrls, { maxItems: 12 }),
  };
};
