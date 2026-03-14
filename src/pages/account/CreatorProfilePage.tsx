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

/* ================= CONFIG ================= */

type WindowWithApiBase = Window & {
  __API_BASE_URL__?: string;
};

const API_BASE =
  (window as WindowWithApiBase).__API_BASE_URL__ || "http://localhost:8080";

function resolveMediaUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
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

const PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
const PHOTO_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];

const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov"];
const VIDEO_ACCEPT = [...VIDEO_TYPES, ...VIDEO_EXTENSIONS].join(",");

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

const isAllowedVideoFile = (file: File) => {
  const lowerName = file.name.toLowerCase();
  return (
    VIDEO_TYPES.includes(file.type) ||
    VIDEO_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
  );
};

const isAllowedPhotoFile = (file: File) => {
  const lowerName = file.name.toLowerCase();
  return (
    PHOTO_TYPES.includes(file.type) ||
    PHOTO_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
  );
};

/* ================= PAGE ================= */

export const CreatorProfilePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreatorProfileForm | null>(null);
  const [profileData, setProfileData] = useState<CreatorProfile | null>(null);
  const [pageState, setPageState] = useState<PageState>("LOADING");
  const [hasProfile, setHasProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<CreatorProfile>("/api/profile/me");
        setProfileData(res.data);
        setForm(mapToForm(res.data));
        setHasProfile(true);
      } catch (error: unknown) {
        const status = getErrorStatus(error);
        if (status === 404 || status === 400) {
          setForm(emptyForm());
          setHasProfile(false);
        } else if (!status || status >= 500) {
          setError("Не удалось загрузить профиль");
        }
      } finally {
        setPageState("READY");
      }
    })();
  }, []);

  const uploadFiles = async (files: File[], type: "photo" | "video") => {
    try {
      const uploaded: string[] = [];

      for (const file of files) {
        const fd = new FormData();
        fd.append("files", file);
        const { data: urls } = await api.post<string[]>("/api/files/upload", fd);
        uploaded.push(...urls);
      }

      setForm((prev) => {
        if (!prev) return prev;

        const nextPhotoUrls =
          type === "photo" ? [...prev.photoUrls, ...uploaded] : prev.photoUrls;
        const nextMainPhotoUrl =
          type === "photo"
            ? prev.mainPhotoUrl || nextPhotoUrls[0] || ""
            : prev.mainPhotoUrl;

        return {
          ...prev,
          photoUrls: nextPhotoUrls,
          videoUrls: type === "video" ? [...prev.videoUrls, ...uploaded] : prev.videoUrls,
          mainPhotoUrl: nextMainPhotoUrl,
        };
      });
    } catch (error: unknown) {
      if (getErrorStatus(error) !== 401) {
        setError("Ошибка загрузки файлов");
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
      setSaveNotice("Профиль успешно сохранен");
      window.setTimeout(() => setSaveNotice(null), 2500);
    } catch (error: unknown) {
      setSaveNotice(null);
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
          <div className="glass-object mx-auto max-w-7xl mt-8 rounded-[44px] overflow-visible">
          <InlineNav
            profileMenu={[
              {
                label: "Выйти",
                onClick: logout,
                danger: true,
              },
            ]}
          />

          <header className="glass-object-soft px-8 py-6 border-b border-white/50">
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
                    onChange={(next) => setForm({ ...form, published: next })}
                  />
                </div>
              )}
            </div>
          </header>

          <section className="px-8 py-8 space-y-6">
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
                  isVideo
                  onAdd={(files) => uploadFiles(files, "video")}
                  onRemove={(url) =>
                    setForm({
                      ...form,
                      videoUrls: form.videoUrls.filter((u) => u !== url),
                    })
                  }
                />

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="rounded-xl px-6 py-3 bg-slate-900 text-white min-w-44 disabled:opacity-60"
                  >
                    {saving
                      ? "Сохраняем..."
                      : hasProfile
                      ? "Сохранить изменения"
                      : "Сохранить профиль"}
                  </button>

                  <button
                    onClick={() => setForm(emptyForm())}
                    className="rounded-xl px-6 py-3 border text-slate-600"
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
      {saveNotice && <CenterToast message={saveNotice} />}
    </div>
  );
};

/* ================= MEDIA ================= */

const MediaSection = ({
  title,
  urls,
  accept,
  isVideo,
  onAdd,
  onRemove,
}: {
  title: string;
  urls: string[];
  accept: string;
  isVideo?: boolean;
  onAdd: (files: File[]) => void;
  onRemove: (url: string) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="glass-object-soft rounded-2xl p-5">
      <h3 className="font-semibold mb-3">{title}</h3>

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
    firstName: p.firstName ?? "",
    lastName: p.lastName ?? "",
    city: p.city ?? "",
    mainPhotoUrl: p.mainPhotoUrl ?? p.photoUrls?.[0] ?? "",
    description: p.description ?? "",
    bio: p.bio ?? "",
    experienceLevel: parsed.experienceLevel,
    projectFormats: parsed.projectFormats,
    caseHighlights: parsed.caseHighlights,
    skills: parsed.skills,
    activityType: p.activityType ?? "",
    minRate: p.minRate ?? "",
    rateUnit: p.rateUnit ?? "PER_PROJECT",
    contactPhone: p.contactPhone ?? "",
    contactEmail: p.contactEmail ?? "",
    contactWhatsapp: p.contactWhatsapp ?? "",
    contactTelegram: p.contactTelegram ?? "",
    socialLinks: parseSocialLinks(p.socialLinksJson),
    photoUrls: p.photoUrls ?? [],
    videoUrls: p.videoUrls ?? [],
  };
};

const parseSocialLinks = (raw?: string | null): string[] => {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((x) => String(x).trim()).filter(Boolean);
    }
    if (parsed && typeof parsed === "object") {
      return Object.values(parsed)
        .map((x) => String(x).trim())
        .filter(Boolean);
    }
    return [];
  } catch {
    return raw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
};

const normalize = (f: CreatorProfileForm) => {
  const socialLinks = f.socialLinks.map((x) => x.trim()).filter(Boolean);
  const experienceText = buildExperienceBundle(f);

  return {
    published: f.published,
    firstName: f.firstName || null,
    lastName: f.lastName || null,
    city: f.city || null,
    mainPhotoUrl: f.mainPhotoUrl || f.photoUrls[0] || null,
    description: f.description || null,
    bio: f.bio || null,
    experienceText: experienceText || null,
    activityType: f.activityType || null,
    minRate: f.minRate || null,
    rateUnit: f.rateUnit || null,
    contactPhone: f.contactPhone || null,
    contactEmail: f.contactEmail || null,
    contactWhatsapp: f.contactWhatsapp || null,
    contactTelegram: f.contactTelegram || null,
    socialLinksJson: socialLinks.length ? JSON.stringify(socialLinks) : null,
    photoUrls: f.photoUrls,
    videoUrls: f.videoUrls,
  };
};
