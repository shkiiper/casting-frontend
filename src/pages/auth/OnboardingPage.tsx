import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Camera,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";
import api from "@/api/client";
import { useSession } from "@/entities/user/model/authStore";
import { CityMultiSelect } from "@/shared/ui/CityMultiSelect";
import { Input } from "@/shared/ui/Input";
import { Textarea } from "@/shared/ui/Textarea";
import { CenterToast } from "@/shared/ui/CenterToast";
import {
  getApiErrorMessage,
  mergeUniqueUrls,
  sanitizeEmail,
  sanitizePhone,
  sanitizeTelegram,
  toOptionalNumber,
  trimMultilineToNull,
  trimMultilineToString,
  trimToNull,
} from "@/shared/lib/safety";
import {
  PHOTO_UPLOAD_HINT,
  isAllowedPhotoFile,
  preparePhotoFile,
} from "@/shared/lib/uploads";
import "./OnboardingPage.css";

const REGISTRATION_DRAFT_KEY = "pendingRegistrationDraft";
const ONBOARDING_DRAFT_PREFIX = "onboardingDraft:";

type Role = "CUSTOMER" | "ACTOR" | "CREATOR" | "LOCATION_OWNER" | "LOCATION" | "ADMIN";
type StepKind =
  | "name"
  | "city"
  | "about"
  | "experience"
  | "age"
  | "height"
  | "gender"
  | "specialty"
  | "rate"
  | "locationName"
  | "address"
  | "photo"
  | "contacts";

type OnboardingStep = {
  id: StepKind;
  eyebrow: string;
  title: string;
  optional?: boolean;
};

type OnboardingDraft = {
  firstName: string;
  lastName: string;
  displayName: string;
  city: string;
  bio: string;
  experienceText: string;
  age: number | "";
  heightCm: number | "";
  gender: "" | "MALE" | "FEMALE" | "OTHER";
  activityTypes: string[];
  minRate: number | "";
  rateUnit: string;
  locationName: string;
  address: string;
  rentPrice: number | "";
  contactPhone: string;
  contactEmail: string;
  contactTelegram: string;
  mainPhotoUrl: string;
  photoUrls: string[];
};

type ExistingProfileState = "unknown" | "missing" | "exists";

const emptyDraft = (): OnboardingDraft => ({
  firstName: "",
  lastName: "",
  displayName: "",
  city: "",
  bio: "",
  experienceText: "",
  age: "",
  heightCm: "",
  gender: "",
  activityTypes: [],
  minRate: "",
  rateUnit: "PER_DAY",
  locationName: "",
  address: "",
  rentPrice: "",
  contactPhone: "",
  contactEmail: "",
  contactTelegram: "",
  mainPhotoUrl: "",
  photoUrls: [],
});

const ROLE_COPY: Record<string, string> = {
  CUSTOMER: "Заказчик",
  ACTOR: "Актер",
  CREATOR: "Креатор",
  LOCATION_OWNER: "Локация",
  LOCATION: "Локация",
};

const GENDER_OPTIONS = [
  { value: "FEMALE", label: "Женский" },
  { value: "MALE", label: "Мужской" },
  { value: "OTHER", label: "Другое" },
] as const;

const CREATOR_SPECIALTIES = [
  "Режиссер",
  "Оператор",
  "Фотограф",
  "Продюсер",
  "Монтажер",
  "Кастинг-директор",
  "SMM / Контент",
  "Гример / Стилист",
  "VFX / Motion",
];

const resolveRole = (role?: string | null): Role | null => {
  const normalized = (role ?? "").toUpperCase();
  if (
    normalized === "CUSTOMER" ||
    normalized === "ACTOR" ||
    normalized === "CREATOR" ||
    normalized === "LOCATION_OWNER" ||
    normalized === "LOCATION" ||
    normalized === "ADMIN"
  ) {
    return normalized;
  }
  return null;
};

const onboardingKey = (role: Role | null) =>
  `${ONBOARDING_DRAFT_PREFIX}${role ?? "unknown"}`;

const getPreviewParams = () => {
  if (typeof window === "undefined") {
    return {
      preview: false,
      role: null as Role | null,
      step: null as number | null,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const step = params.get("previewStep");
  const parsedStep = step === null ? null : Number(step);

  return {
    preview: params.has("previewStep") || params.has("previewRole"),
    role: resolveRole(params.get("previewRole")),
    step: Number.isFinite(parsedStep) ? parsedStep : null,
  };
};

const previewDraft = (role: Role | null): Partial<OnboardingDraft> => {
  const common = {
    firstName: "Айдана",
    lastName: "Садыкова",
    displayName: "Onset Production",
    city: "Бишкек",
    bio: "Коротко о себе, стиле и задачах, с которыми комфортно работать.",
    experienceText: "Реклама, короткий метр, клипы, театр и съемки для брендов.",
    contactPhone: "+996 700 123 456",
    contactEmail: "actor@example.com",
    contactTelegram: "onset_actor",
  };

  if (isRoleLocation(role)) {
    return {
      ...common,
      locationName: "Loft 17",
      address: "Бишкек, район Филармонии",
      rentPrice: 12000,
      rateUnit: "PER_DAY",
    };
  }

  if (role === "CREATOR") {
    return {
      ...common,
      activityTypes: ["Режиссер", "Оператор"],
      minRate: 15000,
      rateUnit: "PER_PROJECT",
    };
  }

  return {
    ...common,
    age: 24,
    heightCm: 168,
    gender: "FEMALE",
  };
};

const parseJson = <T,>(raw: string | null): Partial<T> => {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Partial<T>;
  } catch {
    return {};
  }
};

const getRegistrationDefaults = () => {
  const sessionDraft = parseJson<{
    email: string;
    phone: string;
  }>(sessionStorage.getItem(REGISTRATION_DRAFT_KEY));

  return {
    contactEmail:
      sanitizeEmail(sessionDraft.email) ??
      sanitizeEmail(localStorage.getItem("pendingVerificationEmail")) ??
      "",
    contactPhone: sanitizePhone(sessionDraft.phone) ?? "",
  };
};

const getStepsForRole = (role: Role | null): OnboardingStep[] => {
  if (role === "CUSTOMER") {
    return [
      { id: "name", eyebrow: "1 из 5", title: "Как вас представить?" },
      { id: "city", eyebrow: "2 из 5", title: "В каком городе вы работаете?" },
      { id: "about", eyebrow: "3 из 5", title: "Что вы обычно ищете на площадке?", optional: true },
      { id: "photo", eyebrow: "4 из 5", title: "Добавим фото или логотип?", optional: true },
      { id: "contacts", eyebrow: "5 из 5", title: "Куда отправлять отклики?" },
    ];
  }

  if (role === "CREATOR") {
    return [
      { id: "name", eyebrow: "1 из 8", title: "Как вас зовут?" },
      { id: "city", eyebrow: "2 из 8", title: "Где вы берете проекты?" },
      { id: "specialty", eyebrow: "3 из 8", title: "Какая у вас специализация?" },
      { id: "about", eyebrow: "4 из 8", title: "Как коротко описать ваш стиль?", optional: true },
      { id: "experience", eyebrow: "5 из 8", title: "Какой опыт важно показать?", optional: true },
      { id: "rate", eyebrow: "6 из 8", title: "Какая минимальная ставка?", optional: true },
      { id: "photo", eyebrow: "7 из 8", title: "Добавим фото профиля?", optional: true },
      { id: "contacts", eyebrow: "8 из 8", title: "Как с вами связаться?" },
    ];
  }

  if (role === "LOCATION_OWNER" || role === "LOCATION") {
    return [
      { id: "locationName", eyebrow: "1 из 7", title: "Как называется локация?" },
      { id: "city", eyebrow: "2 из 7", title: "В каком городе локация?" },
      { id: "address", eyebrow: "3 из 7", title: "Где она находится?", optional: true },
      { id: "about", eyebrow: "4 из 7", title: "Что в ней особенного?", optional: true },
      { id: "rate", eyebrow: "5 из 7", title: "Сколько стоит аренда?", optional: true },
      { id: "photo", eyebrow: "6 из 7", title: "Покажем локацию фото?", optional: true },
      { id: "contacts", eyebrow: "7 из 7", title: "Кому писать по брони?" },
    ];
  }

  return [
    { id: "name", eyebrow: "1 из 9", title: "Как вас зовут?" },
    { id: "city", eyebrow: "2 из 9", title: "В каком городе вы снимаетесь?" },
    { id: "about", eyebrow: "3 из 9", title: "Расскажите о себе коротко", optional: true },
    { id: "experience", eyebrow: "4 из 9", title: "Какой у вас опыт?", optional: true },
    { id: "age", eyebrow: "5 из 9", title: "Сколько вам лет?" },
    { id: "height", eyebrow: "6 из 9", title: "Какой у вас рост?", optional: true },
    { id: "gender", eyebrow: "7 из 9", title: "Укажите пол" },
    { id: "photo", eyebrow: "8 из 9", title: "Добавим первое фото?", optional: true },
    { id: "contacts", eyebrow: "9 из 9", title: "Как с вами связаться?" },
  ];
};

const isRoleCustomer = (role: Role | null) => role === "CUSTOMER";
const isRoleLocation = (role: Role | null) =>
  role === "LOCATION_OWNER" || role === "LOCATION";

const hasName = (draft: OnboardingDraft, role: Role | null) =>
  isRoleCustomer(role)
    ? Boolean(trimToNull(draft.displayName, 120))
    : Boolean(trimToNull(draft.firstName, 80) && trimToNull(draft.lastName, 80));

const isStepComplete = (step: OnboardingStep, draft: OnboardingDraft, role: Role | null) => {
  if (step.optional) return true;

  switch (step.id) {
    case "name":
      return hasName(draft, role);
    case "locationName":
      return Boolean(trimToNull(draft.locationName, 120));
    case "city":
      return Boolean(trimToNull(draft.city, 120));
    case "age":
      return Boolean(toOptionalNumber(draft.age, { min: 14, max: 90, integer: true }));
    case "gender":
      return Boolean(draft.gender);
    case "specialty":
      return draft.activityTypes.length > 0;
    case "contacts":
      return Boolean(
        sanitizePhone(draft.contactPhone) ||
          sanitizeEmail(draft.contactEmail) ||
          sanitizeTelegram(draft.contactTelegram)
      );
    default:
      return true;
  }
};

const canCreatePerformerProfile = (draft: OnboardingDraft, role: Role | null) => {
  if (role === "ACTOR") {
    return hasName(draft, role) && Boolean(draft.gender) && Boolean(sanitizePhone(draft.contactPhone));
  }

  if (role === "CREATOR") {
    return hasName(draft, role) || draft.activityTypes.length > 0 || Boolean(trimToNull(draft.city, 120));
  }

  if (isRoleLocation(role)) {
    return Boolean(trimToNull(draft.locationName, 120) && trimToNull(draft.city, 120));
  }

  return false;
};

const normalizeActorPayload = (draft: OnboardingDraft) => ({
  published: false,
  firstName: trimToNull(draft.firstName, 80),
  lastName: trimToNull(draft.lastName, 80),
  city: trimToNull(draft.city, 120),
  description: trimMultilineToString(draft.bio, 4000),
  bio: trimMultilineToString(draft.bio, 4000),
  experienceText: trimMultilineToNull(draft.experienceText, 4000),
  gender: draft.gender || null,
  age: toOptionalNumber(draft.age, { min: 14, max: 90, integer: true }),
  heightCm: toOptionalNumber(draft.heightCm, { min: 100, max: 240, integer: true }),
  rateUnit: draft.rateUnit || "PER_DAY",
  contactPhone: sanitizePhone(draft.contactPhone),
  contactEmail: sanitizeEmail(draft.contactEmail),
  contactTelegram: sanitizeTelegram(draft.contactTelegram),
  mainPhotoUrl: trimToNull(draft.mainPhotoUrl || draft.photoUrls[0], 1500),
  photoUrls: mergeUniqueUrls([], draft.photoUrls, { maxItems: 20 }),
});

const normalizeCreatorPayload = (draft: OnboardingDraft) => {
  const activityTypes = draft.activityTypes
    .map((item) => trimToNull(item, 120))
    .filter((item): item is string => Boolean(item));

  return {
    published: false,
    firstName: trimToNull(draft.firstName, 80),
    lastName: trimToNull(draft.lastName, 80),
    city: trimToNull(draft.city, 120),
    description: trimMultilineToString(draft.bio, 4000),
    bio: trimMultilineToString(draft.bio, 4000),
    activityType: activityTypes.join(", ") || null,
    activityTypes: activityTypes.length ? activityTypes : null,
    experienceText: trimMultilineToNull(draft.experienceText, 4000),
    minRate: toOptionalNumber(draft.minRate, { min: 0, max: 100000000 }),
    rateUnit: draft.rateUnit || "PER_PROJECT",
    contactPhone: sanitizePhone(draft.contactPhone),
    contactEmail: sanitizeEmail(draft.contactEmail),
    contactTelegram: sanitizeTelegram(draft.contactTelegram),
    mainPhotoUrl: trimToNull(draft.mainPhotoUrl || draft.photoUrls[0], 1500),
    photoUrls: mergeUniqueUrls([], draft.photoUrls, { maxItems: 20 }),
  };
};

const normalizeLocationPayload = (draft: OnboardingDraft) => ({
  published: false,
  locationName: trimToNull(draft.locationName, 120),
  city: trimToNull(draft.city, 120),
  address: trimToNull(draft.address, 200),
  description: trimMultilineToString(draft.bio, 4000),
  rentPrice: toOptionalNumber(draft.rentPrice, { min: 0, max: 100000000 }),
  rentPriceUnit: draft.rateUnit || "PER_DAY",
  contactPhone: sanitizePhone(draft.contactPhone),
  contactEmail: sanitizeEmail(draft.contactEmail),
  contactTelegram: sanitizeTelegram(draft.contactTelegram),
  mainPhotoUrl: trimToNull(draft.mainPhotoUrl || draft.photoUrls[0], 1500),
  photoUrls: mergeUniqueUrls([], draft.photoUrls, { maxItems: 20 }),
});

export function OnboardingPage() {
  const navigate = useNavigate();
  const { role: rawRole } = useSession();
  const previewParams = useMemo(() => getPreviewParams(), []);
  const role = previewParams.role ?? resolveRole(rawRole);
  const steps = useMemo(() => getStepsForRole(role), [role]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<OnboardingDraft>(() => {
    const registrationDefaults = getRegistrationDefaults();
    const savedDraft = parseJson<OnboardingDraft>(
      localStorage.getItem(onboardingKey(previewParams.role ?? resolveRole(rawRole)))
    );

    return {
      ...emptyDraft(),
      ...registrationDefaults,
      ...savedDraft,
      ...(previewParams.preview ? previewDraft(previewParams.role ?? resolveRole(rawRole)) : {}),
    };
  });
  const [stepIndex, setStepIndex] = useState(
    previewParams.step === null
      ? 0
      : Math.min(Math.max(previewParams.step, 0), Math.max(steps.length - 1, 0))
  );
  const [profileState, setProfileState] = useState<ExistingProfileState>("unknown");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentStep = steps[stepIndex] ?? steps[0];
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);
  const roleLabel = ROLE_COPY[role ?? ""] ?? "Профиль";

  useEffect(() => {
    if (previewParams.preview) return;
    if (!role || role === "ADMIN") {
      navigate("/account", { replace: true });
      return;
    }

    localStorage.setItem(onboardingKey(role), JSON.stringify(draft));
  }, [draft, navigate, previewParams.preview, role]);

  useEffect(() => {
    if (previewParams.preview) {
      setProfileState("missing");
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      if (!role || role === "ADMIN") return;

      try {
        if (role === "CUSTOMER") {
          const { data } = await api.get<{
            displayName?: string | null;
            city?: string | null;
            description?: string | null;
            contactPhone?: string | null;
            contactEmail?: string | null;
            contactTelegram?: string | null;
            mainPhotoUrl?: string | null;
          }>("/api/customer/me");

          if (cancelled) return;
          setDraft((current) => ({
            ...current,
            displayName: current.displayName || data.displayName || "",
            city: current.city || data.city || "",
            bio: current.bio || data.description || "",
            contactPhone: current.contactPhone || data.contactPhone || "",
            contactEmail: current.contactEmail || data.contactEmail || "",
            contactTelegram: current.contactTelegram || data.contactTelegram || "",
            mainPhotoUrl: current.mainPhotoUrl || data.mainPhotoUrl || "",
            photoUrls: current.photoUrls.length
              ? current.photoUrls
              : data.mainPhotoUrl
              ? [data.mainPhotoUrl]
              : [],
          }));
          setProfileState("exists");
          return;
        }

        const { data } = await api.get<{
          firstName?: string | null;
          lastName?: string | null;
          city?: string | null;
          bio?: string | null;
          description?: string | null;
          experienceText?: string | null;
          gender?: "MALE" | "FEMALE" | "OTHER" | null;
          age?: number | null;
          heightCm?: number | null;
          activityTypes?: string[] | null;
          locationName?: string | null;
          address?: string | null;
          rentPrice?: number | null;
          contactPhone?: string | null;
          contactEmail?: string | null;
          contactTelegram?: string | null;
          mainPhotoUrl?: string | null;
          photoUrls?: string[] | null;
        }>("/api/profile/me");

        if (cancelled) return;
        setDraft((current) => ({
          ...current,
          firstName: current.firstName || data.firstName || "",
          lastName: current.lastName || data.lastName || "",
          city: current.city || data.city || "",
          bio: current.bio || data.bio || data.description || "",
          experienceText: current.experienceText || data.experienceText || "",
          gender: current.gender || data.gender || "",
          age: current.age || data.age || "",
          heightCm: current.heightCm || data.heightCm || "",
          activityTypes: current.activityTypes.length
            ? current.activityTypes
            : data.activityTypes ?? [],
          locationName: current.locationName || data.locationName || "",
          address: current.address || data.address || "",
          rentPrice: current.rentPrice || data.rentPrice || "",
          contactPhone: current.contactPhone || data.contactPhone || "",
          contactEmail: current.contactEmail || data.contactEmail || "",
          contactTelegram: current.contactTelegram || data.contactTelegram || "",
          mainPhotoUrl: current.mainPhotoUrl || data.mainPhotoUrl || "",
          photoUrls: current.photoUrls.length ? current.photoUrls : data.photoUrls ?? [],
        }));
        setProfileState("exists");
      } catch (profileError: unknown) {
        const status = (profileError as { response?: { status?: number } })?.response?.status;
        if (!cancelled) {
          setProfileState(status === 404 || status === 400 ? "missing" : "unknown");
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [previewParams.preview, role]);

  const patchDraft = (next: Partial<OnboardingDraft>) => {
    setDraft((current) => ({ ...current, ...next }));
  };

  const toggleSpecialty = (specialty: string) => {
    patchDraft({
      activityTypes: draft.activityTypes.includes(specialty)
        ? draft.activityTypes.filter((item) => item !== specialty)
        : [...draft.activityTypes, specialty],
    });
  };

  const uploadPhoto = async (file: File) => {
    if (!isAllowedPhotoFile(file)) {
      setError("Выберите фото в формате JPG, PNG, WEBP, HEIC или HEIF");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const fd = new FormData();
      fd.append("files", await preparePhotoFile(file));
      const { data } = await api.post<string[]>("/api/files/upload", fd);
      const photoUrls = mergeUniqueUrls(draft.photoUrls, data, { maxItems: 20 });
      patchDraft({
        photoUrls,
        mainPhotoUrl: draft.mainPhotoUrl || photoUrls[0] || "",
      });
    } catch (uploadError) {
      setError(getApiErrorMessage(uploadError, "Не удалось загрузить фото"));
    } finally {
      setUploading(false);
    }
  };

  const goNext = () => {
    if (!currentStep) return;
    if (!isStepComplete(currentStep, draft, role)) {
      setError("Заполните этот шаг, чтобы продолжить");
      return;
    }
    setError(null);
    if (stepIndex < steps.length - 1) {
      setStepIndex((current) => current + 1);
      return;
    }
    void finishOnboarding();
  };

  const skipStep = () => {
    setError(null);
    if (stepIndex < steps.length - 1) {
      setStepIndex((current) => current + 1);
      return;
    }
    void finishOnboarding();
  };

  const finishOnboarding = async () => {
    if (!role || role === "ADMIN") return;

    try {
      setSaving(true);
      setError(null);

      if (role === "CUSTOMER") {
        await api.patch("/api/customer/me", {
          displayName: trimToNull(draft.displayName, 120),
          description: trimMultilineToString(draft.bio, 2000),
          city: trimToNull(draft.city, 120),
          contactPhone: sanitizePhone(draft.contactPhone),
          contactEmail: sanitizeEmail(draft.contactEmail),
          contactTelegram: sanitizeTelegram(draft.contactTelegram),
          mainPhotoUrl: trimToNull(draft.mainPhotoUrl || draft.photoUrls[0], 1500),
        });
        completeAndGo();
        return;
      }

      if (!canCreatePerformerProfile(draft, role) && profileState !== "exists") {
        setNotice("Черновик сохранен. Остальное можно спокойно дописать в кабинете.");
        window.setTimeout(() => navigate("/account", { replace: true }), 700);
        return;
      }

      const endpoint = role === "ACTOR" ? "actor" : role === "CREATOR" ? "creator" : "location";
      const payload =
        role === "ACTOR"
          ? normalizeActorPayload(draft)
          : role === "CREATOR"
          ? normalizeCreatorPayload(draft)
          : normalizeLocationPayload(draft);

      if (profileState === "exists") {
        await api.patch(`/api/profile/${endpoint}`, payload);
      } else {
        await api.post(`/api/profile/${endpoint}`, payload);
      }

      completeAndGo();
    } catch (saveError) {
      setError(
        getApiErrorMessage(
          saveError,
          "Не удалось сохранить анкету. Черновик остался на устройстве."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const completeAndGo = () => {
    if (role) localStorage.removeItem(onboardingKey(role));
    setNotice("Анкета сохранена");
    window.dispatchEvent(new Event("profile-updated"));
    window.setTimeout(() => navigate("/account", { replace: true }), 500);
  };

  const renderStep = () => {
    if (!currentStep) return null;

    switch (currentStep.id) {
      case "name":
        return isRoleCustomer(role) ? (
          <Input
            autoFocus
            value={draft.displayName}
            placeholder="Имя, бренд или название компании"
            onChange={(value) => patchDraft({ displayName: value })}
          />
        ) : (
          <div className="onboarding-two-cols">
            <Input
              autoFocus
              value={draft.firstName}
              placeholder="Имя"
              onChange={(value) => patchDraft({ firstName: value })}
            />
            <Input
              value={draft.lastName}
              placeholder="Фамилия"
              onChange={(value) => patchDraft({ lastName: value })}
            />
          </div>
        );
      case "city":
        return (
          <CityMultiSelect
            value={draft.city}
            placeholder="Выберите город"
            onChange={(city) => patchDraft({ city })}
          />
        );
      case "about":
        return (
          <Textarea
            autoFocus
            value={draft.bio}
            placeholder={
              isRoleLocation(role)
                ? "Например: светлая квартира, индустриальный зал, есть гримерка..."
                : "2-3 предложения: типажи, стиль, сильные стороны или задачи"
            }
            onChange={(event) => patchDraft({ bio: event.target.value })}
          />
        );
      case "experience":
        return (
          <Textarea
            autoFocus
            value={draft.experienceText}
            placeholder="Проекты, съемки, реклама, театр, клиенты, награды"
            onChange={(event) => patchDraft({ experienceText: event.target.value })}
          />
        );
      case "age":
        return (
          <Input
            autoFocus
            type="number"
            min={14}
            max={90}
            value={draft.age}
            placeholder="Например, 24"
            onChange={(value) => patchDraft({ age: value ? Number(value) : "" })}
          />
        );
      case "height":
        return (
          <Input
            autoFocus
            type="number"
            min={100}
            max={240}
            value={draft.heightCm}
            placeholder="Рост в сантиметрах"
            onChange={(value) => patchDraft({ heightCm: value ? Number(value) : "" })}
          />
        );
      case "gender":
        return (
          <div className="onboarding-choice-grid">
            {GENDER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={draft.gender === option.value ? "is-selected" : ""}
                onClick={() => patchDraft({ gender: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
        );
      case "specialty":
        return (
          <div className="onboarding-chip-grid">
            {CREATOR_SPECIALTIES.map((specialty) => (
              <button
                key={specialty}
                type="button"
                className={draft.activityTypes.includes(specialty) ? "is-selected" : ""}
                onClick={() => toggleSpecialty(specialty)}
              >
                {draft.activityTypes.includes(specialty) ? <Check size={16} /> : null}
                {specialty}
              </button>
            ))}
          </div>
        );
      case "rate":
        return (
          <div className="onboarding-two-cols">
            <Input
              autoFocus
              type="number"
              min={0}
              value={isRoleLocation(role) ? draft.rentPrice : draft.minRate}
              placeholder={isRoleLocation(role) ? "Цена аренды" : "Минимальная ставка"}
              onChange={(value) =>
                isRoleLocation(role)
                  ? patchDraft({ rentPrice: value ? Number(value) : "" })
                  : patchDraft({ minRate: value ? Number(value) : "" })
              }
            />
            <select
              value={draft.rateUnit}
              onChange={(event) => patchDraft({ rateUnit: event.target.value })}
              className="onboarding-select"
            >
              <option value="PER_DAY">За день</option>
              <option value="PER_HOUR">За час</option>
              <option value="PER_PROJECT">За проект</option>
            </select>
          </div>
        );
      case "locationName":
        return (
          <Input
            autoFocus
            value={draft.locationName}
            placeholder="Например, Loft 17 или Дом у гор"
            onChange={(value) => patchDraft({ locationName: value })}
          />
        );
      case "address":
        return (
          <Input
            autoFocus
            value={draft.address}
            placeholder="Район, улица или ориентир"
            onChange={(value) => patchDraft({ address: value })}
          />
        );
      case "photo":
        return (
          <div className="onboarding-upload">
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadPhoto(file);
                event.currentTarget.value = "";
              }}
            />
            {draft.mainPhotoUrl ? (
              <div className="onboarding-photo-preview">
                <img src={draft.mainPhotoUrl} alt="" />
              </div>
            ) : (
              <div className="onboarding-photo-empty">
                <Camera size={28} />
              </div>
            )}
            <div>
              <button
                type="button"
                className="onboarding-upload-button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? <Loader2 size={18} className="onboarding-spin" /> : <Camera size={18} />}
                {uploading ? "Загружаем..." : "Выбрать фото"}
              </button>
              <div className="onboarding-muted">{PHOTO_UPLOAD_HINT}</div>
            </div>
          </div>
        );
      case "contacts":
        return (
          <div className="onboarding-stack">
            <Input
              autoFocus
              value={draft.contactPhone}
              placeholder="Телефон"
              onChange={(value) => patchDraft({ contactPhone: value })}
            />
            <Input
              type="email"
              value={draft.contactEmail}
              placeholder="Email"
              onChange={(value) => patchDraft({ contactEmail: value })}
            />
            <Input
              value={draft.contactTelegram}
              placeholder="Telegram без @"
              onChange={(value) => patchDraft({ contactTelegram: value })}
            />
          </div>
        );
      default:
        return null;
    }
  };

  if (!currentStep) {
    return null;
  }

  return (
    <div className="onboarding-root">
      <main className="onboarding-shell">
        <section className="onboarding-panel">
          <div className="onboarding-topline">
            <span>{roleLabel}</span>
            <span>{progress}%</span>
          </div>
          <div className="onboarding-progress" aria-hidden="true">
            <div style={{ width: `${progress}%` }} />
          </div>

          <div className="onboarding-question">
            <div className="onboarding-eyebrow">{currentStep.eyebrow}</div>
            <h1>{currentStep.title}</h1>
            {currentStep.optional ? (
              <p>Этот пункт можно пропустить и вернуться к нему позже.</p>
            ) : null}
          </div>

          <div className="onboarding-answer">{renderStep()}</div>

          {error ? <div className="onboarding-error">{error}</div> : null}

          <div className="onboarding-actions">
            <button
              type="button"
              className="onboarding-secondary"
              disabled={stepIndex === 0 || saving}
              onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
            >
              <ArrowLeft size={18} />
              Назад
            </button>

            <div className="onboarding-right-actions">
              {currentStep.optional ? (
                <button
                  type="button"
                  className="onboarding-text-button"
                  disabled={saving}
                  onClick={skipStep}
                >
                  Позже
                </button>
              ) : null}
              <button
                type="button"
                className="onboarding-primary"
                disabled={saving || uploading}
                onClick={goNext}
              >
                {saving ? (
                  <Loader2 size={18} className="onboarding-spin" />
                ) : stepIndex === steps.length - 1 ? (
                  <BadgeCheck size={18} />
                ) : (
                  <ArrowRight size={18} />
                )}
                {stepIndex === steps.length - 1 ? "Готово" : "Дальше"}
              </button>
            </div>
          </div>
        </section>

        <aside className="onboarding-side">
          <div className="onboarding-side-icon">
            <Sparkles size={22} />
          </div>
          <h2>Короткая анкета вместо длинной формы</h2>
          <p>
            Сначала собираем то, что помогает найти вас в каталоге. Фото, кейсы и детали
            можно спокойно добавить после входа в кабинет.
          </p>
          <div className="onboarding-mini-list">
            <span>Обязательное: имя, город, контакт</span>
            <span>Желательно: опыт, ставка, фото</span>
            <span>Позже: портфолио, видео, дополнительные параметры</span>
          </div>
        </aside>
      </main>

      {notice ? <CenterToast message={notice} /> : null}
      {error ? <CenterToast message={error} variant="error" /> : null}
    </div>
  );
}
