import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/client";
import { Container } from "@/shared/ui/Container";
import { Input } from "@/shared/ui/Input";
import { Textarea } from "@/shared/ui/Textarea";
import { InlineNav } from "@/shared/ui/InlineNav";
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
  normalizeStringArray,
  toOptionalNumber,
  trimMultilineToNull,
  trimToNull,
  sanitizeEmail,
  sanitizePhone,
  sanitizeTelegram,
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

export type Gender = "MALE" | "FEMALE" | "OTHER";

type ActorProfile = {
  id: number;
  type: "ACTOR";
  published?: boolean | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  description: string | null;
  city: string | null;
  gender: Gender | null;
  age: number | null;
  ethnicity: string | null;
  minRate: number | null;
  rateUnit: string | null;
  contactTelegram: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contactWhatsapp?: string | null;
  contactInstagram?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  bodyType?: string | null;
  hairColor?: string | null;
  eyeColor?: string | null;
  mainPhotoUrl?: string | null;
  bio?: string | null;
  experienceText?: string | null;
  gameAgeFrom?: number | null;
  gameAgeTo?: number | null;
  skillsJson?: string[] | string | null;
  playingAgeMin?: number | null;
  playingAgeMax?: number | null;
  skills?: string[] | null;
  introVideoUrl?: string | null;
  monologueVideoUrl?: string | null;
  selfTapeVideoUrl?: string | null;
  photoUrls: string[];
  videoUrls: string[];
  premiumActive?: boolean | null;
  premiumExpiresAt?: string | null;
  canBuyPremium?: boolean | null;
  premiumPurchaseEndpoint?: string | null;
  premiumPrice?: number | null;
  premiumDurationDays?: number | null;
};

type ActorProfileForm = {
  published: boolean;
  firstName: string;
  lastName: string;
  description: string;
  city: string;
  gender: Gender | "";
  age: number | "";
  ethnicity: string;
  minRate: number | "";
  rateUnit: string;
  contactTelegram: string;
  contactPhone: string;
  contactEmail: string;
  contactWhatsapp: string;
  contactInstagram: string;
  mainPhotoUrl: string;
  bio: string;
  experienceText: string;
  heightCm: number | "";
  weightKg: number | "";
  bodyType: string;
  hairColor: string;
  eyeColor: string;
  gameAgeFrom: number | "";
  gameAgeTo: number | "";
  skills: string[];
  introVideoUrl: string;
  monologueVideoUrl: string;
  selfTapeVideoUrl: string;
  photoUrls: string[];
  videoUrls: string[];
};

type Mode = "LOADING" | "EMPTY" | "VIEW";
type ManualSaveSection = "main" | "contacts";

/* ================= CONSTS ================= */

const GENDER_OPTIONS: Array<{ label: string; value: Gender }> = [
  { label: "Мужской", value: "MALE" },
  { label: "Женский", value: "FEMALE" },
  { label: "Другое", value: "OTHER" },
];
const ETHNICITY_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "Европеоидная", value: "EUROPEAN" },
  { label: "Монголоидная", value: "ASIAN" },
  { label: "Негроидная", value: "AFRICAN" },
  { label: "Метис", value: "MIXED" },
  { label: "Другая", value: "OTHER" },
];
const AGE_OPTIONS = Array.from({ length: 63 }, (_, i) => 18 + i);
const PLAYING_AGE_OPTIONS = Array.from({ length: 73 }, (_, i) => 8 + i);
const RATE_UNIT_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "За день", value: "PER_DAY" },
  { label: "За час", value: "PER_HOUR" },
  { label: "За проект", value: "PER_PROJECT" },
];
const BODY_TYPE_OPTIONS = [
  "Спортивное",
  "Худощавое",
  "Среднее",
  "Плотное",
  "Другое",
];
const HAIR_COLOR_OPTIONS = [
  "Черный",
  "Каштановый",
  "Русый",
  "Рыжий",
  "Седой",
  "Другое",
];
const EYE_COLOR_OPTIONS = [
  "Карий",
  "Голубой",
  "Зеленый",
  "Серый",
  "Ореховый",
  "Другое",
];
const SKILL_OPTIONS = [
  "Импровизация",
  "Сценический бой",
  "Вокал",
  "Танцы",
  "Акцент (EN)",
  "Дубляж",
  "Работа с хромакеем",
  "Комедия",
  "Драма",
  "Пластика",
  "Игра на гитаре",
  "Плавание",
  "Верховая езда",
  "Фехтование",
  "Акробатика",
  "Йога",
  "Озвучка",
  "Работа перед хромакеем",
  "Вождение авто",
  "Работа с детьми",
  "Работа с животными",
  "Модельная походка",
];

const getErrorStatus = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } })?.response?.status;

/* ================= PAGE ================= */

export const ActorProfilePage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<ActorProfileForm | null>(null);
  const [profileData, setProfileData] = useState<ActorProfile | null>(null);
  const [mode, setMode] = useState<Mode>("LOADING");
  const [saving, setSaving] = useState(false);
  const [publishSaving, setPublishSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const currentFormRef = useRef<ActorProfileForm | null>(null);
  const lastPersistedFormRef = useRef<ActorProfileForm | null>(null);
  const lastSavedAutoSnapshotRef = useRef<string | null>(null);
  const saveNoticeTimeoutRef = useRef<number | null>(null);
  const photoSectionRef = useRef<HTMLDivElement>(null);
  const [photoRequirementMessage, setPhotoRequirementMessage] = useState<string | null>(null);

  /* ---------- LOAD ---------- */

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<ActorProfile>("/api/profile/me");
        const nextForm = mapToForm(res.data);
        setProfileData(res.data);
        setForm(nextForm);
        currentFormRef.current = nextForm;
        lastPersistedFormRef.current = nextForm;
        lastSavedAutoSnapshotRef.current = getActorAutoSnapshot(nextForm);
        setMode("VIEW");
      } catch (e: unknown) {
        const status = getErrorStatus(e);
        if (status === 404 || status === 400) {
          const nextForm = emptyForm();
          setForm(nextForm);
          currentFormRef.current = nextForm;
          lastPersistedFormRef.current = nextForm;
          lastSavedAutoSnapshotRef.current = getActorAutoSnapshot(nextForm);
          setMode("EMPTY");
        } else if (!status || status >= 500) {
          setError("Не удалось загрузить профиль");
        }
        // 401 → глобальный UnauthorizedListener
      }
    })();
  }, []);

  /* ---------- UPLOAD ---------- */

  const uploadFiles = async (files: File[], type: "photo" | "video") => {
    try {
      const uploaded: string[] = [];

      // Загружаем по одному файлу: так стабильнее при серверных лимитах батча.
      for (const file of files) {
        const preparedFile =
          type === "photo"
            ? await preparePhotoFile(file)
            : (assertVideoSize(file), file);
        const fd = new FormData();
        fd.append("files", preparedFile);
        const { data: urls } = await api.post<string[]>(
          "/api/files/upload",
          fd
        );
        uploaded.push(...mergeUniqueUrls([], urls, { maxItems: 20 }));
      }

      setForm((prev) =>
        prev
          ? {
              ...prev,
              mainPhotoUrl:
                type === "photo"
                  ? prev.mainPhotoUrl || uploaded[0] || prev.mainPhotoUrl
                  : prev.mainPhotoUrl,
              photoUrls:
                type === "photo"
                  ? mergeUniqueUrls(prev.photoUrls, uploaded, { maxItems: 20 })
                  : prev.photoUrls,
              videoUrls:
                type === "video"
                  ? mergeUniqueUrls(prev.videoUrls, uploaded, { maxItems: 12 })
                  : prev.videoUrls,
            }
          : prev
      );
    } catch (e: unknown) {
      if (getErrorStatus(e) !== 401) {
        setError(getUploadErrorMessage(e, type));
      }
    }
  };

  /* ---------- SAVE ---------- */

  useEffect(() => {
    currentFormRef.current = form;
  }, [form]);

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

  const saveProfile = async (formToSave: ActorProfileForm, successMessage = "Изменения сохранены") => {
    const requestSnapshot = JSON.stringify(normalize(formToSave));

    try {
      setSaving(true);
      setError(null);

      const payload = normalize(formToSave);

      const res =
        mode === "EMPTY"
          ? await api.post<ActorProfile>("/api/profile/actor", payload)
          : await api.patch<ActorProfile>("/api/profile/actor", payload);

      setProfileData(res.data);
      const serverForm = mapToForm(res.data);
      const currentSnapshot = currentFormRef.current
        ? JSON.stringify(normalize(currentFormRef.current))
        : null;
      const persistedForm = currentSnapshot === requestSnapshot ? serverForm : formToSave;

      if (currentSnapshot === requestSnapshot) {
        setForm(serverForm);
        currentFormRef.current = serverForm;
      }
      lastPersistedFormRef.current = persistedForm;
      lastSavedAutoSnapshotRef.current = getActorAutoSnapshot(persistedForm);

      setMode("VIEW");
      showSaveNotice(successMessage);
    } catch (e: unknown) {
      if (getErrorStatus(e) !== 401) {
        setError("Ошибка сохранения профиля");
      }
    } finally {
      setSaving(false);
    }
  };

  const saveManualSection = async (section: ManualSaveSection) => {
    const currentForm = currentFormRef.current;
    if (!currentForm) return;

    const persistedForm = lastPersistedFormRef.current ?? currentForm;
    const formToSave =
      section === "main"
        ? {
            ...persistedForm,
            ...pickActorMainData(currentForm),
            ...pickActorAutoData(currentForm),
          }
        : {
            ...persistedForm,
            ...pickActorContactsData(currentForm),
            ...pickActorAutoData(currentForm),
          };

    await saveProfile(
      formToSave,
      section === "main" ? "Основные данные сохранены" : "О себе и контакты сохранены"
    );
  };

  useEffect(() => {
    if (!form || saving || publishSaving) return;

    const currentAutoSnapshot = getActorAutoSnapshot(form);
    if (currentAutoSnapshot === lastSavedAutoSnapshotRef.current) return;

    const persistedForm = lastPersistedFormRef.current ?? form;
    const formToSave = {
      ...persistedForm,
      ...pickActorAutoData(form),
    };

    const timeoutId = window.setTimeout(() => {
      void saveProfile(formToSave);
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [form, saving, publishSaving, mode]);

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
    enabled: mode !== "LOADING" && Boolean(form),
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
        mode === "EMPTY"
          ? await api.post<ActorProfile>("/api/profile/actor", normalize(nextForm))
          : await api.patch<ActorProfile>("/api/profile/actor/visibility", null, {
              params: { published: next },
            });

      setProfileData(res.data);
      const nextFormFromServer = mapToForm(res.data);
      setForm(nextFormFromServer);
      currentFormRef.current = nextFormFromServer;
      lastPersistedFormRef.current = nextFormFromServer;
      lastSavedAutoSnapshotRef.current = getActorAutoSnapshot(nextFormFromServer);
      setMode("VIEW");
      window.dispatchEvent(new Event("profile-updated"));
      showSaveNotice(next ? "Профиль виден в каталоге" : "Профиль скрыт из каталога", 2200);
    } catch (e: unknown) {
      setForm(form);
      if (getErrorStatus(e) !== 401) {
        setError("Не удалось обновить видимость профиля");
      }
    } finally {
      setPublishSaving(false);
    }
  };

  /* ---------- RENDER ---------- */

  if (mode === "LOADING") {
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
                <div className="text-xs text-slate-500">Личный кабинет</div>
                <h1 className="text-2xl font-bold">Профиль актёра</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Заполните базовые данные, чтобы вас легче находили в каталоге.
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
                  title="Оплата premium профиля актёра"
                  onError={setError}
                />

	                <EditForm
	                  form={form}
	                  setForm={setForm}
	                  onSaveMain={() => void saveManualSection("main")}
	                  onSaveContacts={() => void saveManualSection("contacts")}
	                  saving={saving || publishSaving}
	                />

	                <MediaSection
                  title="Фотографии"
                  urls={form.photoUrls}
                  accept={PHOTO_TYPES.join(",")}
                  hint={PHOTO_UPLOAD_HINT}
                  containerRef={photoSectionRef}
                  highlight={Boolean(photoRequirementMessage)}
                  errorMessage={photoRequirementMessage}
                  mainUrl={form.mainPhotoUrl}
                  onReorder={(nextUrls) =>
                    setForm({
                      ...form,
                      photoUrls: nextUrls,
                    })
                  }
                  onAdd={(files) => uploadFiles(files, "photo")}
                  onSetMain={(url) =>
                    setForm({
                      ...form,
                      mainPhotoUrl: url,
                    })
                  }
                  onRemove={(url) =>
                    setForm({
                      ...form,
                      mainPhotoUrl:
                        form.mainPhotoUrl === url
                          ? form.photoUrls.find((u) => u !== url) || ""
                          : form.mainPhotoUrl,
                      photoUrls: form.photoUrls.filter((u) => u !== url),
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
  mainUrl,
  onAdd,
  onSetMain,
  onReorder,
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
  mainUrl?: string;
  onAdd: (files: File[]) => void;
  onSetMain?: (url: string) => void;
  onReorder?: (nextUrls: string[]) => void;
  onRemove: (url: string) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draggedUrl, setDraggedUrl] = useState<string | null>(null);

  const moveUrl = (fromUrl: string, toUrl: string) => {
    if (!onReorder || fromUrl === toUrl) return;

    const fromIndex = urls.indexOf(fromUrl);
    const toIndex = urls.indexOf(toUrl);
    if (fromIndex === -1 || toIndex === -1) return;

    const nextUrls = [...urls];
    const [moved] = nextUrls.splice(fromIndex, 1);
    nextUrls.splice(toIndex, 0, moved);
    onReorder(nextUrls);
  };

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
      {!isVideo && onReorder ? (
        <p className="mb-3 text-sm text-slate-500">
          Перетаскивайте фото, чтобы менять порядок отображения в профиле.
        </p>
      ) : null}

      <div
        className="border-2 border-dashed border-white/70 rounded-xl p-4 text-center cursor-pointer bg-white/30 hover:bg-white/60"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const files = Array.from(e.dataTransfer.files).filter((f) =>
            isVideo
              ? isAllowedVideoFile(f)
              : isAllowedPhotoFile(f)
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
                isVideo
                  ? isAllowedVideoFile(f)
                  : isAllowedPhotoFile(f)
              );
              if (files.length) onAdd(files);
            }
            e.currentTarget.value = "";
          }}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
        {urls.map((url) => (
          <div
            key={url}
            className={[
              "relative group",
              !isVideo && onReorder && draggedUrl === url ? "opacity-60" : "",
            ].join(" ")}
            draggable={!isVideo && Boolean(onReorder)}
            onDragStart={() => {
              if (!isVideo && onReorder) setDraggedUrl(url);
            }}
            onDragEnd={() => setDraggedUrl(null)}
            onDragOver={(e) => {
              if (!isVideo && onReorder) e.preventDefault();
            }}
            onDrop={(e) => {
              if (isVideo || !onReorder || !draggedUrl) return;
              e.preventDefault();
              moveUrl(draggedUrl, url);
              setDraggedUrl(null);
            }}
          >
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

            {!isVideo && onReorder ? (
              <div className="absolute left-1 top-1 rounded-full bg-black/70 px-2 py-1 text-[11px] text-white">
                Перетащить
              </div>
            ) : null}

            {!isVideo && onSetMain ? (
              <button
                type="button"
                onClick={() => onSetMain(url)}
                className={[
                  "absolute left-1 bottom-1 rounded-full px-2 py-1 text-[11px]",
                  mainUrl === url
                    ? "bg-slate-900 text-white"
                    : "bg-white/90 text-slate-700",
                ].join(" ")}
              >
                {mainUrl === url ? "Главное фото" : "Сделать главным"}
              </button>
            ) : null}
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

/* ================= FORMS ================= */

const EditForm = ({
  form,
  setForm,
  onSaveMain,
  onSaveContacts,
  saving,
}: {
  form: ActorProfileForm;
  setForm: (v: ActorProfileForm) => void;
  onSaveMain: () => void;
  onSaveContacts: () => void;
  saving: boolean;
}) => (
  <div className="space-y-5">
    <div className="glass-object-soft rounded-2xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-800">
        Основные данные
      </h2>
      <div className="grid md:grid-cols-2 gap-4">
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
        <div className="md:col-span-2">
          <FieldLabel>Город</FieldLabel>
          <Input
            placeholder="Город"
            value={form.city}
            onChange={(value) => setForm({ ...form, city: value })}
          />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>О себе</FieldLabel>
          <Textarea
            placeholder="Коротко о себе, типажах и задачах, в которых вы сильны"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Опыт</FieldLabel>
          <Textarea
            placeholder="Фильмы, реклама, театр, сериалы, съемочный опыт"
            value={form.experienceText}
            onChange={(e) => setForm({ ...form, experienceText: e.target.value })}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSaveMain}
          disabled={saving}
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm text-white disabled:opacity-60"
        >
          Сохранить основные данные
        </button>
      </div>
    </div>

    <div className="glass-object-soft rounded-2xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-800">
        Параметры актёра
      </h2>
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <FieldLabel>Возраст</FieldLabel>
          <select
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
            value={form.age === "" ? "" : String(form.age)}
            onChange={(e) =>
              setForm({
                ...form,
                age: e.target.value ? Number(e.target.value) : "",
              })
            }
          >
            <option value="">Не выбран</option>
            {AGE_OPTIONS.map((age) => (
              <option key={age} value={age}>
                {age}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>Пол</FieldLabel>
          <select
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
            value={form.gender}
            onChange={(e) =>
              setForm({
                ...form,
                gender: (e.target.value as Gender) || "",
              })
            }
          >
            <option value="">Не выбран</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>Этническая принадлежность</FieldLabel>
          <select
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
            value={form.ethnicity}
            onChange={(e) =>
              setForm({ ...form, ethnicity: e.target.value })
            }
          >
            <option value="">Не выбрана</option>
            {form.ethnicity &&
              !ETHNICITY_OPTIONS.some(
                (eth) => eth.value === form.ethnicity
              ) && (
                <option value={form.ethnicity}>{form.ethnicity}</option>
              )}
            {ETHNICITY_OPTIONS.map((eth) => (
              <option key={eth.value} value={eth.value}>
                {eth.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>Рост (см)</FieldLabel>
          <Input
            type="number"
            min={100}
            max={240}
            placeholder="180"
            value={form.heightCm === "" ? "" : String(form.heightCm)}
            onChange={(value) =>
              setForm({
                ...form,
                heightCm: value ? Number(value) : "",
              })
            }
          />
        </div>

        <div>
          <FieldLabel>Вес (кг)</FieldLabel>
          <Input
            type="number"
            min={30}
            max={200}
            placeholder="75"
            value={form.weightKg === "" ? "" : String(form.weightKg)}
            onChange={(value) =>
              setForm({
                ...form,
                weightKg: value ? Number(value) : "",
              })
            }
          />
        </div>

        <div>
          <FieldLabel>Телосложение</FieldLabel>
          <select
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
            value={form.bodyType}
            onChange={(e) => setForm({ ...form, bodyType: e.target.value })}
          >
            <option value="">Не выбрано</option>
            {BODY_TYPE_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>Цвет волос</FieldLabel>
          <select
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
            value={form.hairColor}
            onChange={(e) => setForm({ ...form, hairColor: e.target.value })}
          >
            <option value="">Не выбрано</option>
            {HAIR_COLOR_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>Цвет глаз</FieldLabel>
          <select
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
            value={form.eyeColor}
            onChange={(e) => setForm({ ...form, eyeColor: e.target.value })}
          >
            <option value="">Не выбрано</option>
            {EYE_COLOR_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>Игровой возраст: от</FieldLabel>
          <select
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
            value={form.gameAgeFrom === "" ? "" : String(form.gameAgeFrom)}
            onChange={(e) =>
              setForm({
                ...form,
                gameAgeFrom: e.target.value ? Number(e.target.value) : "",
              })
            }
          >
            <option value="">Не выбран</option>
            {PLAYING_AGE_OPTIONS.map((age) => (
              <option key={`min-${age}`} value={age}>
                {age}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>Игровой возраст: до</FieldLabel>
          <select
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
            value={form.gameAgeTo === "" ? "" : String(form.gameAgeTo)}
            onChange={(e) =>
              setForm({
                ...form,
                gameAgeTo: e.target.value ? Number(e.target.value) : "",
              })
            }
          >
            <option value="">Не выбран</option>
            {PLAYING_AGE_OPTIONS.map((age) => (
              <option key={`max-${age}`} value={age}>
                {age}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>Ставка (минимум)</FieldLabel>
          <Input
            type="number"
            min={0}
            placeholder="5000"
            value={form.minRate === "" ? "" : String(form.minRate)}
            onChange={(value) =>
              setForm({
                ...form,
                minRate: value ? Number(value) : "",
              })
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

      </div>

    </div>

    <div className="glass-object-soft rounded-2xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-800">Навыки</h2>
      <div className="flex flex-wrap gap-2">
        {SKILL_OPTIONS.map((skill) => {
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

    <div className="glass-object-soft rounded-2xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-800">
        О себе и контакты
      </h2>
      <div>
        <FieldLabel>Описание</FieldLabel>
        <Textarea
          placeholder="Кратко о себе, опыте и амплуа"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div className="max-w-sm">
        <FieldLabel>Telegram</FieldLabel>
        <Input
          placeholder="Telegram (без @)"
          value={form.contactTelegram}
          onChange={(value) =>
            setForm({ ...form, contactTelegram: value })
          }
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
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
          <FieldLabel>WhatsApp</FieldLabel>
          <Input
            placeholder="+996..."
            value={form.contactWhatsapp}
            onChange={(value) =>
              setForm({ ...form, contactWhatsapp: value })
            }
          />
        </div>
        <div>
          <FieldLabel>Instagram</FieldLabel>
          <Input
            placeholder="@username"
            value={form.contactInstagram}
            onChange={(value) =>
              setForm({ ...form, contactInstagram: value })
            }
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSaveContacts}
          disabled={saving}
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm text-white disabled:opacity-60"
        >
          Сохранить о себе и контакты
        </button>
      </div>
    </div>

  </div>
);

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs text-slate-500 mb-1">{children}</div>
);

const pickActorMainData = (form: ActorProfileForm) => ({
  firstName: form.firstName,
  lastName: form.lastName,
  city: form.city,
  bio: form.bio,
  experienceText: form.experienceText,
});

const pickActorContactsData = (form: ActorProfileForm) => ({
  description: form.description,
  contactTelegram: form.contactTelegram,
  contactPhone: form.contactPhone,
  contactEmail: form.contactEmail,
  contactWhatsapp: form.contactWhatsapp,
  contactInstagram: form.contactInstagram,
});

const pickActorAutoData = (form: ActorProfileForm) => ({
  published: form.published,
  gender: form.gender,
  age: form.age,
  ethnicity: form.ethnicity,
  minRate: form.minRate,
  rateUnit: form.rateUnit,
  mainPhotoUrl: form.mainPhotoUrl,
  heightCm: form.heightCm,
  weightKg: form.weightKg,
  bodyType: form.bodyType,
  hairColor: form.hairColor,
  eyeColor: form.eyeColor,
  gameAgeFrom: form.gameAgeFrom,
  gameAgeTo: form.gameAgeTo,
  skills: form.skills,
  introVideoUrl: form.introVideoUrl,
  monologueVideoUrl: form.monologueVideoUrl,
  selfTapeVideoUrl: form.selfTapeVideoUrl,
  photoUrls: form.photoUrls,
  videoUrls: form.videoUrls,
});

const getActorAutoSnapshot = (form: ActorProfileForm) =>
  JSON.stringify(pickActorAutoData(form));

/* ================= HELPERS ================= */

const emptyForm = (): ActorProfileForm => ({
  published: false,
  firstName: "",
  lastName: "",
  description: "",
  city: "",
  gender: "",
  age: "",
  ethnicity: "",
  minRate: "",
  rateUnit: "PER_DAY",
  contactTelegram: "",
  contactPhone: "",
  contactEmail: "",
  contactWhatsapp: "",
  contactInstagram: "",
  mainPhotoUrl: "",
  bio: "",
  experienceText: "",
  heightCm: "",
  weightKg: "",
  bodyType: "",
  hairColor: "",
  eyeColor: "",
  gameAgeFrom: "",
  gameAgeTo: "",
  skills: [],
  introVideoUrl: "",
  monologueVideoUrl: "",
  selfTapeVideoUrl: "",
  photoUrls: [],
  videoUrls: [],
});

const parseSkillsFromApi = (value: string[] | string | null | undefined) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [value];
  } catch {
    return [value];
  }
};

const mapToForm = (p: ActorProfile): ActorProfileForm => ({
  published: Boolean(p.published),
  firstName: trimToNull(p.firstName, 80) ?? "",
  lastName: trimToNull(p.lastName, 80) ?? "",
  description: trimMultilineToNull(p.description, 4000) ?? "",
  city: trimToNull(p.city, 120) ?? "",
  gender: p.gender ?? "",
  age: p.age ?? "",
  ethnicity: normalizeEthnicityFromApi(p.ethnicity),
  minRate: p.minRate ?? "",
  rateUnit: p.rateUnit ?? "PER_DAY",
  contactTelegram: sanitizeTelegram(p.contactTelegram) ?? "",
  contactPhone: sanitizePhone(p.contactPhone) ?? "",
  contactEmail: sanitizeEmail(p.contactEmail) ?? "",
  contactWhatsapp: sanitizePhone(p.contactWhatsapp) ?? "",
  contactInstagram: trimToNull(p.contactInstagram, 100) ?? "",
  mainPhotoUrl: trimToNull(p.mainPhotoUrl ?? p.photoUrls?.[0], 1500) ?? "",
  bio: trimMultilineToNull(p.bio, 4000) ?? "",
  experienceText: trimMultilineToNull(p.experienceText, 4000) ?? "",
  heightCm: p.heightCm ?? "",
  weightKg: p.weightKg ?? "",
  bodyType: trimToNull(p.bodyType, 40) ?? "",
  hairColor: trimToNull(p.hairColor, 40) ?? "",
  eyeColor: trimToNull(p.eyeColor, 40) ?? "",
  gameAgeFrom: p.gameAgeFrom ?? p.playingAgeMin ?? "",
  gameAgeTo: p.gameAgeTo ?? p.playingAgeMax ?? "",
  skills: normalizeStringArray(
    parseSkillsFromApi(p.skillsJson).length ? parseSkillsFromApi(p.skillsJson) : p.skills,
    { maxItems: 20, maxItemLength: 80 }
  ),
  introVideoUrl: p.introVideoUrl ?? "",
  monologueVideoUrl: p.monologueVideoUrl ?? "",
  selfTapeVideoUrl: p.selfTapeVideoUrl ?? "",
  photoUrls: mergeUniqueUrls([], p.photoUrls ?? [], { maxItems: 20 }),
  videoUrls: mergeUniqueUrls([], p.videoUrls ?? [], { maxItems: 12 }),
});

const normalize = (f: ActorProfileForm) => ({
  published: Boolean(f.published),
  firstName: trimToNull(f.firstName, 80),
  lastName: trimToNull(f.lastName, 80),
  description: trimMultilineToNull(f.description, 4000),
  city: trimToNull(f.city, 120),
  gender: f.gender || null,
  age: toOptionalNumber(f.age, { min: 18, max: 80, integer: true }),
  ethnicity: trimToNull(f.ethnicity, 40),
  minRate: toOptionalNumber(f.minRate, { min: 0, max: 100000000 }),
  rateUnit: trimToNull(f.rateUnit, 40),
  contactTelegram: sanitizeTelegram(f.contactTelegram),
  contactPhone: sanitizePhone(f.contactPhone),
  contactEmail: sanitizeEmail(f.contactEmail),
  contactWhatsapp: sanitizePhone(f.contactWhatsapp),
  contactInstagram: trimToNull(f.contactInstagram, 100),
  mainPhotoUrl: trimToNull(f.mainPhotoUrl || f.photoUrls[0], 1500),
  bio: trimMultilineToNull(f.bio, 4000),
  experienceText: trimMultilineToNull(f.experienceText, 4000),
  heightCm: toOptionalNumber(f.heightCm, { min: 100, max: 240, integer: true }),
  weightKg: toOptionalNumber(f.weightKg, { min: 30, max: 250, integer: true }),
  bodyType: trimToNull(f.bodyType, 40),
  hairColor: trimToNull(f.hairColor, 40),
  eyeColor: trimToNull(f.eyeColor, 40),
  gameAgeFrom: toOptionalNumber(f.gameAgeFrom, { min: 8, max: 80, integer: true }),
  gameAgeTo: toOptionalNumber(f.gameAgeTo, { min: 8, max: 80, integer: true }),
  playingAgeMin: toOptionalNumber(f.gameAgeFrom, { min: 8, max: 80, integer: true }),
  playingAgeMax: toOptionalNumber(f.gameAgeTo, { min: 8, max: 80, integer: true }),
  skillsJson: normalizeStringArray(f.skills, { maxItems: 20, maxItemLength: 80 }),
  skills: normalizeStringArray(f.skills, { maxItems: 20, maxItemLength: 80 }),
  introVideoUrl: trimToNull(f.introVideoUrl, 1500),
  monologueVideoUrl: trimToNull(f.monologueVideoUrl, 1500),
  selfTapeVideoUrl: trimToNull(f.selfTapeVideoUrl, 1500),
  photoUrls: mergeUniqueUrls([], f.photoUrls, { maxItems: 20 }),
  videoUrls: mergeUniqueUrls([], f.videoUrls, { maxItems: 12 }),
});

const normalizeEthnicityFromApi = (value?: string | null) => {
  if (!value) return "";

  const byAlias: Record<string, string> = {
    EUROPEOIDNAIA: "EUROPEAN",
    EUROPEOID: "EUROPEAN",
    "ЕВРОПЕОИДНАЯ": "EUROPEAN",
    EUROPEAN: "EUROPEAN",
    MONGOLOIDNAIA: "ASIAN",
    MONGOLOID: "ASIAN",
    "МОНГОЛОИДНАЯ": "ASIAN",
    ASIAN: "ASIAN",
    NEGROIDNAIA: "AFRICAN",
    NEGROID: "AFRICAN",
    "НЕГРОИДНАЯ": "AFRICAN",
    AFRICAN: "AFRICAN",
    METIS: "MIXED",
    MESTIZO: "MIXED",
    MIXED: "MIXED",
    "МЕТИС": "MIXED",
    OTHER: "OTHER",
    "ДРУГАЯ": "OTHER",
  };

  const trimmed = value.trim();
  const normalized = byAlias[trimmed.toUpperCase()];
  return normalized ?? trimmed;
};
