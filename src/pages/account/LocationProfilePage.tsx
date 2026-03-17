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
  mergeUniqueUrls,
  sanitizeEmail,
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

const API_BASE =
  (window as WindowWithApiBase).__API_BASE_URL__ || "http://localhost:8080";
const LOCATION_FALLBACK_KEY_PREFIX = "location-profile-fallback:";

function resolveMediaUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return API_BASE + url;
}

/* ================= TYPES ================= */

type LocationProfile = {
  id: number;
  published?: boolean | null;
  locationName: string | null;
  description: string | null;
  city: string | null;
  rentPrice: number | null;
  rentPriceUnit: string | null;
  extraConditions: string | null;
  address: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactTelegram: string | null;
  floor?: number | null;
  hasToilet?: boolean | null;
  availableFrom?: string | null;
  availableTo?: string | null;
  photoUrls: string[];
  premiumActive?: boolean | null;
  premiumExpiresAt?: string | null;
  canBuyPremium?: boolean | null;
  premiumPurchaseEndpoint?: string | null;
  premiumPrice?: number | null;
  premiumDurationDays?: number | null;
};

type LocationProfileForm = {
  published: boolean;
  locationName: string;
  description: string;
  city: string;
  rentPrice: number | "";
  address: string;
  extraConditions: string;
  contactPhone: string;
  contactEmail: string;
  contactTelegram: string;
  floor: number | "";
  hasToilet: "" | "YES" | "NO";
  availableFrom: string;
  availableTo: string;
  photoUrls: string[];
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

export const LocationProfilePage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<LocationProfileForm | null>(null);
  const [profileData, setProfileData] = useState<LocationProfile | null>(null);
  const [mode, setMode] = useState<Mode>("LOADING");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  /* ---------- LOAD ---------- */

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<LocationProfile>("/api/profile/me");
        const hydrated = hydrateLocationFromFallback(res.data);
        setProfileData(hydrated);
        setForm(mapToForm(hydrated));
        setMode("VIEW");
      } catch (e: unknown) {
        const status = getErrorStatus(e);
        if (status === 404 || status === 400) {
          setForm(emptyForm());
          setMode("EMPTY");
        } else if (!status || status >= 500) {
          setError("Не удалось загрузить профиль локации");
        }
        // 401 → глобальный UnauthorizedListener
      }
    })();
  }, []);

  /* ---------- UPLOAD ---------- */

  const uploadPhotos = async (files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));

    try {
      const { data: urls } = await api.post<string[]>(
        "/api/files/upload",
        fd
      );

      setForm((prev) =>
        prev
          ? { ...prev, photoUrls: mergeUniqueUrls(prev.photoUrls, urls, { maxItems: 20 }) }
          : prev
      );
    } catch (e: unknown) {
      if (getErrorStatus(e) !== 401) {
        setError("Ошибка загрузки фотографий");
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
          ? await api.post<LocationProfile>(
              "/api/profile/location",
              payload
            )
          : await api.patch<LocationProfile>(
              "/api/profile/location",
              payload
            );

      const merged = mergeLocationResponseWithForm(res.data, form);
      setProfileData(merged);
      persistLocationFallback(merged);
      setForm(mapToForm(merged));
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
        <header className="glass-object-soft flex flex-wrap items-center justify-between gap-3 border-b border-white/50 px-4 py-5 sm:px-6 md:px-8 md:py-6">
          <h1 className="text-2xl font-bold">Профиль локации</h1>

          <div className="flex items-center gap-3">
            {form && (
              <HeaderPublishSwitch
                checked={form.published}
                onChange={(next) => setForm({ ...form, published: next })}
              />
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
                title="Оплата premium профиля локации"
                onError={setError}
              />

              <EditForm form={form} setForm={setForm} />

              <MediaSection
                urls={form.photoUrls}
                onAdd={uploadPhotos}
                onRemove={(url) =>
                  setForm({
                    ...form,
                    photoUrls: form.photoUrls.filter((u) => u !== url),
                  })
                }
              />

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="w-full rounded-xl bg-slate-900 px-6 py-3 text-white sm:w-auto"
                >
                  {saving ? "Сохраняем..." : "Сохранить"}
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
  urls,
  onAdd,
  onRemove,
}: {
  urls: string[];
  onAdd: (files: File[]) => void;
  onRemove: (url: string) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <h3 className="font-semibold mb-2">Фотографии</h3>

      <div
        className="border-2 border-dashed border-white/70 rounded-xl p-4 text-center cursor-pointer bg-white/30 hover:bg-white/60"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const files = Array.from(e.dataTransfer.files).filter((f) =>
            isAllowedPhotoFile(f)
          );
          if (files.length) onAdd(files);
        }}
      >
        Перетащите файлы или нажмите
        <input
          ref={inputRef}
          type="file"
          accept={PHOTO_TYPES.join(",")}
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) {
              const files = Array.from(e.target.files).filter((f) =>
                isAllowedPhotoFile(f)
              );
              if (files.length) onAdd(files);
            }
            e.currentTarget.value = "";
          }}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
        {urls.map((url) => (
          <div key={url} className="relative group">
            <img
              src={resolveMediaUrl(url) ?? undefined}
              className="rounded-xl object-cover aspect-square"
            />
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
  form: LocationProfileForm;
  setForm: (v: LocationProfileForm) => void;
}) => (
  <div className="grid gap-6 md:grid-cols-2">
    <Input
      placeholder="Название локации"
      value={form.locationName}
          onChange={(value) =>
        setForm({ ...form, locationName: value })
      }
    />
    <Input
      placeholder="Город"
      value={form.city}
      onChange={(value) => setForm({ ...form, city: value })}
    />
    <Input
      placeholder="Адрес"
      value={form.address}
      onChange={(value) =>
        setForm({ ...form, address: value })
      }
    />
    <Input
      type="number"
      placeholder="Цена аренды (сом)"
      value={form.rentPrice}
      onChange={(value) =>
        setForm({
          ...form,
          rentPrice: value ? Number(value) : "",
        })
      }
    />
    <Textarea
      placeholder="Описание"
      value={form.description}
      onChange={(e) =>
        setForm({ ...form, description: e.target.value })
      }
    />
    <Input
      type="number"
      placeholder="Этаж"
      value={form.floor}
      onChange={(value) =>
        setForm({
          ...form,
          floor: value ? Number(value) : "",
        })
      }
    />
    <div>
      <div className="text-xs text-slate-500 mb-1">Наличие туалета</div>
      <select
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
        value={form.hasToilet}
        onChange={(e) =>
          setForm({
            ...form,
            hasToilet: e.target.value as LocationProfileForm["hasToilet"],
          })
        }
      >
        <option value="">Не выбрано</option>
        <option value="YES">Есть</option>
        <option value="NO">Нет</option>
      </select>
    </div>
    <Input
      type="time"
      placeholder="Время сдачи с"
      value={form.availableFrom}
      onChange={(value) =>
        setForm({ ...form, availableFrom: value })
      }
    />
    <Input
      type="time"
      placeholder="Время сдачи до"
      value={form.availableTo}
      onChange={(value) =>
        setForm({ ...form, availableTo: value })
      }
    />
    <Textarea
      placeholder="Условия аренды"
      value={form.extraConditions}
      onChange={(e) =>
        setForm({ ...form, extraConditions: e.target.value })
      }
    />
    <Input
      placeholder="Телефон"
      value={form.contactPhone}
      onChange={(value) =>
        setForm({ ...form, contactPhone: value })
      }
    />
    <Input
      placeholder="Email"
      value={form.contactEmail}
      onChange={(value) =>
        setForm({ ...form, contactEmail: value })
      }
    />
    <Input
      placeholder="Telegram"
      value={form.contactTelegram}
      onChange={(value) =>
        setForm({ ...form, contactTelegram: value })
      }
    />
  </div>
);

/* ================= HELPERS ================= */

const emptyForm = (): LocationProfileForm => ({
  published: false,
  locationName: "",
  description: "",
  city: "",
  rentPrice: "",
  address: "",
  extraConditions: "",
  contactPhone: "",
  contactEmail: "",
  contactTelegram: "",
  floor: "",
  hasToilet: "",
  availableFrom: "",
  availableTo: "",
  photoUrls: [],
});

const mapToForm = (p: LocationProfile): LocationProfileForm => ({
  published: Boolean(p.published),
  locationName: trimToNull(p.locationName, 120) ?? "",
  description: trimMultilineToNull(p.description, 4000) ?? "",
  city: trimToNull(p.city, 120) ?? "",
  rentPrice: p.rentPrice ?? "",
  address: trimToNull(p.address, 200) ?? "",
  extraConditions: trimMultilineToNull(p.extraConditions, 2000) ?? "",
  contactPhone: sanitizePhone(p.contactPhone) ?? "",
  contactEmail: sanitizeEmail(p.contactEmail) ?? "",
  contactTelegram: sanitizeTelegram(p.contactTelegram) ?? "",
  floor: p.floor ?? "",
  hasToilet:
    p.hasToilet === true ? "YES" : p.hasToilet === false ? "NO" : "",
  availableFrom: p.availableFrom ?? "",
  availableTo: p.availableTo ?? "",
  photoUrls: mergeUniqueUrls([], p.photoUrls ?? [], { maxItems: 20 }),
});

const normalize = (f: LocationProfileForm) => ({
  published: f.published,
  locationName: trimToNull(f.locationName, 120),
  description: trimMultilineToNull(f.description, 4000),
  city: trimToNull(f.city, 120),
  rentPrice: toOptionalNumber(f.rentPrice, { min: 0, max: 100000000 }),
  address: trimToNull(f.address, 200),
  extraConditions: trimMultilineToNull(f.extraConditions, 2000),
  contactPhone: sanitizePhone(f.contactPhone),
  contactEmail: sanitizeEmail(f.contactEmail),
  contactTelegram: sanitizeTelegram(f.contactTelegram),
  floor: toOptionalNumber(f.floor, { min: 0, max: 300, integer: true }),
  hasToilet:
    f.hasToilet === "YES" ? true : f.hasToilet === "NO" ? false : null,
  availableFrom: trimToNull(f.availableFrom, 20),
  availableTo: trimToNull(f.availableTo, 20),
  photoUrls: mergeUniqueUrls([], f.photoUrls, { maxItems: 20 }),
});

const mergeLocationResponseWithForm = (
  res: LocationProfile,
  form: LocationProfileForm
): LocationProfile => ({
  ...res,
  locationName: res.locationName ?? form.locationName,
  city: res.city ?? form.city,
  address: res.address ?? form.address,
  rentPrice:
    res.rentPrice === null || res.rentPrice === undefined
      ? typeof form.rentPrice === "number"
        ? form.rentPrice
        : null
      : res.rentPrice,
  description: res.description ?? form.description,
  extraConditions: res.extraConditions ?? form.extraConditions,
  contactPhone: res.contactPhone ?? form.contactPhone,
  contactEmail: res.contactEmail ?? form.contactEmail,
  contactTelegram: res.contactTelegram ?? form.contactTelegram,
  floor:
    res.floor === null || res.floor === undefined
      ? typeof form.floor === "number"
        ? form.floor
        : null
      : res.floor,
  hasToilet:
    typeof res.hasToilet === "boolean"
      ? res.hasToilet
      : form.hasToilet === "YES"
      ? true
      : form.hasToilet === "NO"
      ? false
      : null,
  availableFrom: res.availableFrom ?? form.availableFrom ?? null,
  availableTo: res.availableTo ?? form.availableTo ?? null,
  photoUrls:
    Array.isArray(res.photoUrls) && res.photoUrls.length
      ? res.photoUrls
      : form.photoUrls,
  published:
    typeof res.published === "boolean" ? res.published : form.published,
});

type LocationFallback = Pick<
  LocationProfile,
  | "address"
  | "rentPrice"
  | "rentPriceUnit"
  | "extraConditions"
  | "floor"
  | "hasToilet"
  | "availableFrom"
  | "availableTo"
>;

const persistLocationFallback = (profile: LocationProfile) => {
  if (!profile.id) return;
  const fallback: LocationFallback = {
    address: profile.address ?? null,
    rentPrice: profile.rentPrice ?? null,
    rentPriceUnit: profile.rentPriceUnit ?? null,
    extraConditions: profile.extraConditions ?? null,
    floor: profile.floor ?? null,
    hasToilet: profile.hasToilet ?? null,
    availableFrom: profile.availableFrom ?? null,
    availableTo: profile.availableTo ?? null,
  };
  localStorage.setItem(
    `${LOCATION_FALLBACK_KEY_PREFIX}${profile.id}`,
    JSON.stringify(fallback)
  );
};

const hydrateLocationFromFallback = (profile: LocationProfile): LocationProfile => {
  if (!profile.id) return profile;
  const raw = localStorage.getItem(
    `${LOCATION_FALLBACK_KEY_PREFIX}${profile.id}`
  );
  if (!raw) return profile;

  try {
    const fallback = JSON.parse(raw) as LocationFallback;
    return {
      ...profile,
      address: profile.address ?? fallback.address ?? null,
      rentPrice:
        profile.rentPrice === null || profile.rentPrice === undefined
          ? fallback.rentPrice ?? null
          : profile.rentPrice,
      rentPriceUnit: profile.rentPriceUnit ?? fallback.rentPriceUnit ?? null,
      extraConditions: profile.extraConditions ?? fallback.extraConditions ?? null,
      floor:
        profile.floor === null || profile.floor === undefined
          ? fallback.floor ?? null
          : profile.floor,
      hasToilet:
        typeof profile.hasToilet === "boolean"
          ? profile.hasToilet
          : fallback.hasToilet ?? null,
      availableFrom: profile.availableFrom ?? fallback.availableFrom ?? null,
      availableTo: profile.availableTo ?? fallback.availableTo ?? null,
    };
  } catch {
    return profile;
  }
};
