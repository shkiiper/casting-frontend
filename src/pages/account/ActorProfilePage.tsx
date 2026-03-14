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
  heightCm: number | "";
  weightKg: number | "";
  bodyType: string;
  hairColor: string;
  eyeColor: string;
  playingAgeMin: number | "";
  playingAgeMax: number | "";
  skills: string[];
  introVideoUrl: string;
  monologueVideoUrl: string;
  selfTapeVideoUrl: string;
  photoUrls: string[];
  videoUrls: string[];
};

type Mode = "LOADING" | "EMPTY" | "VIEW";

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
const BODY_TYPE_OPTIONS = ["Athletic", "Slim", "Average", "Plus-size", "Other"];
const HAIR_COLOR_OPTIONS = [
  "Black",
  "Brown",
  "Blonde",
  "Red",
  "Gray",
  "Other",
];
const EYE_COLOR_OPTIONS = ["Brown", "Blue", "Green", "Gray", "Hazel", "Other"];
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
];

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

const getErrorStatus = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } })?.response?.status;

/* ================= PAGE ================= */

export const ActorProfilePage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<ActorProfileForm | null>(null);
  const [profileData, setProfileData] = useState<ActorProfile | null>(null);
  const [mode, setMode] = useState<Mode>("LOADING");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  /* ---------- LOAD ---------- */

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<ActorProfile>("/api/profile/me");
        setProfileData(res.data);
        setForm(mapToForm(res.data));
        setMode("VIEW");
      } catch (e: unknown) {
        const status = getErrorStatus(e);
        if (status === 404 || status === 400) {
          setForm(emptyForm());
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
        const fd = new FormData();
        fd.append("files", file);
        const { data: urls } = await api.post<string[]>(
          "/api/files/upload",
          fd
        );
        uploaded.push(...urls);
      }

      setForm((prev) =>
        prev
          ? {
              ...prev,
              photoUrls:
                type === "photo"
                  ? [...prev.photoUrls, ...uploaded]
                  : prev.photoUrls,
              videoUrls:
                type === "video"
                  ? [...prev.videoUrls, ...uploaded]
                  : prev.videoUrls,
            }
          : prev
      );
    } catch (e: unknown) {
      if (getErrorStatus(e) !== 401) {
        setError("Ошибка загрузки файлов");
      }
    }
  };

  /* ---------- SAVE ---------- */

  const saveProfile = async () => {
    if (!form) return;

    try {
      setSaving(true);
      setError(null);
      setSaveNotice(null);

      const payload = normalize(form);

      const res =
        mode === "EMPTY"
          ? await api.post<ActorProfile>("/api/profile/actor", payload)
          : await api.patch<ActorProfile>("/api/profile/actor", payload);

      setProfileData(res.data);
      setForm(mapToForm(res.data));
      setMode("VIEW");
      setSaveNotice("Профиль успешно сохранен");
      window.setTimeout(() => setSaveNotice(null), 2500);
    } catch (e: unknown) {
      setSaveNotice(null);
      if (getErrorStatus(e) !== 401) {
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
                  title="Оплата premium профиля актёра"
                  onError={setError}
                />

                <EditForm form={form} setForm={setForm} />

                <MediaSection
                  title="Фотографии"
                  urls={form.photoUrls}
                  accept={PHOTO_TYPES.join(",")}
                  onAdd={(files) => uploadFiles(files, "photo")}
                  onRemove={(url) =>
                    setForm({
                      ...form,
                      photoUrls: form.photoUrls.filter((u) => u !== url),
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

                <div className="flex items-center justify-end gap-3 flex-wrap">
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="rounded-xl px-6 py-3 bg-slate-900 text-white min-w-44 disabled:opacity-60"
                  >
                    {saving ? "Сохраняем..." : "Сохранить изменения"}
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
}: {
  form: ActorProfileForm;
  setForm: (v: ActorProfileForm) => void;
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
            value={form.playingAgeMin === "" ? "" : String(form.playingAgeMin)}
            onChange={(e) =>
              setForm({
                ...form,
                playingAgeMin: e.target.value ? Number(e.target.value) : "",
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
            value={form.playingAgeMax === "" ? "" : String(form.playingAgeMax)}
            onChange={(e) =>
              setForm({
                ...form,
                playingAgeMax: e.target.value ? Number(e.target.value) : "",
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
    </div>

  </div>
);

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs text-slate-500 mb-1">{children}</div>
);

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
  heightCm: "",
  weightKg: "",
  bodyType: "",
  hairColor: "",
  eyeColor: "",
  playingAgeMin: "",
  playingAgeMax: "",
  skills: [],
  introVideoUrl: "",
  monologueVideoUrl: "",
  selfTapeVideoUrl: "",
  photoUrls: [],
  videoUrls: [],
});

const mapToForm = (p: ActorProfile): ActorProfileForm => ({
  published: Boolean(p.published),
  firstName: p.firstName ?? "",
  lastName: p.lastName ?? "",
  description: p.description ?? "",
  city: p.city ?? "",
  gender: p.gender ?? "",
  age: p.age ?? "",
  ethnicity: normalizeEthnicityFromApi(p.ethnicity),
  minRate: p.minRate ?? "",
  rateUnit: p.rateUnit ?? "PER_DAY",
  contactTelegram: p.contactTelegram ?? "",
  contactPhone: p.contactPhone ?? "",
  contactEmail: p.contactEmail ?? "",
  contactWhatsapp: p.contactWhatsapp ?? "",
  contactInstagram: p.contactInstagram ?? "",
  heightCm: p.heightCm ?? "",
  weightKg: p.weightKg ?? "",
  bodyType: p.bodyType ?? "",
  hairColor: p.hairColor ?? "",
  eyeColor: p.eyeColor ?? "",
  playingAgeMin: p.playingAgeMin ?? "",
  playingAgeMax: p.playingAgeMax ?? "",
  skills: p.skills ?? [],
  introVideoUrl: p.introVideoUrl ?? "",
  monologueVideoUrl: p.monologueVideoUrl ?? "",
  selfTapeVideoUrl: p.selfTapeVideoUrl ?? "",
  photoUrls: p.photoUrls ?? [],
  videoUrls: p.videoUrls ?? [],
});

const normalize = (f: ActorProfileForm) => ({
  ...f,
  published: f.published,
  age: f.age || null,
  ethnicity: f.ethnicity || null,
  minRate: f.minRate || null,
  contactTelegram: f.contactTelegram || null,
  contactPhone: f.contactPhone || null,
  contactEmail: f.contactEmail || null,
  contactWhatsapp: f.contactWhatsapp || null,
  contactInstagram: f.contactInstagram || null,
  heightCm: f.heightCm || null,
  weightKg: f.weightKg || null,
  bodyType: f.bodyType || null,
  hairColor: f.hairColor || null,
  eyeColor: f.eyeColor || null,
  playingAgeMin: f.playingAgeMin || null,
  playingAgeMax: f.playingAgeMax || null,
  skills: f.skills,
  introVideoUrl: f.introVideoUrl || null,
  monologueVideoUrl: f.monologueVideoUrl || null,
  selfTapeVideoUrl: f.selfTapeVideoUrl || null,
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
