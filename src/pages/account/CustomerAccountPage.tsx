import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/api/client";
import { getSubscriptionInfo, getViewedContacts } from "@/api/customer";
import { useSession } from "@/entities/user/model/authStore";
import {
  buildProfileCompletion,
  hasTextValue,
} from "@/shared/lib/profileCompletion";
import { Container } from "@/shared/ui/Container";
import { Input } from "@/shared/ui/Input";
import { Textarea } from "@/shared/ui/Textarea";
import { SubscriptionModal } from "@/features/subscription/SubscriptionModal";
import { PageOctopusDecor } from "@/shared/ui/PageOctopusDecor";
import { CenterToast } from "@/shared/ui/CenterToast";
import { DismissibleNotice } from "@/shared/ui/DismissibleNotice";
import { ProfileCompletionCard } from "@/shared/ui/ProfileCompletionCard";
import type {
  CustomerProfileResponse,
  SubscriptionInfoResponse,
  ViewedContactResponse,
} from "@/types/customer";
import { InlineNav } from "@/shared/ui/InlineNav";
import { resolveMediaUrl } from "@/shared/ui/useProfileAvatar";
import { PROFILE_MEDIA_MODERATION_WARNING } from "@/shared/lib/uploads";
import {
  REQUIRED_PROFILE_PHOTO_MESSAGE,
  useRequiredPhotoGuard,
} from "@/shared/lib/useRequiredPhotoGuard";
import { useUnsavedChangesGuard } from "@/shared/lib/useUnsavedChangesGuard";
import {
  getApiErrorMessage,
  sanitizeEmail,
  sanitizeHttpUrl,
  sanitizePhone,
  sanitizeTelegram,
  trimMultilineToNull,
  trimToNull,
} from "@/shared/lib/safety";

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

/* ================= TYPES ================= */

type CustomerProfileForm = {
  displayName: string;
  description: string;
  city: string;
  contactPhone: string;
  contactEmail: string;
  contactTelegram: string;
  mainPhotoUrl: string;
};

/* ================= HELPERS ================= */

const mapToForm = (p: CustomerProfileResponse): CustomerProfileForm => ({
  displayName: trimToNull(p.displayName, 120) ?? "",
  description: trimMultilineToNull(p.description, 2000) ?? "",
  city: trimToNull(p.city, 120) ?? "",
  contactPhone: sanitizePhone(p.contactPhone) ?? "",
  contactEmail: sanitizeEmail(p.contactEmail) ?? "",
  contactTelegram: sanitizeTelegram(p.contactTelegram) ?? "",
  mainPhotoUrl: trimToNull(p.mainPhotoUrl, 1500) ?? "",
});

const getCustomerFormSnapshot = (form: CustomerProfileForm | null) =>
  JSON.stringify({
    displayName: trimToNull(form?.displayName, 120),
    description: trimMultilineToNull(form?.description, 2000),
    city: trimToNull(form?.city, 120),
    contactPhone: sanitizePhone(form?.contactPhone),
    contactEmail: sanitizeEmail(form?.contactEmail),
    contactTelegram: sanitizeTelegram(form?.contactTelegram),
    mainPhotoUrl: trimToNull(form?.mainPhotoUrl, 1500),
  });

const toPercent = (used: number, limit: number) =>
  limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

const formatDateTime = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/* ================= PAGE ================= */

export const CustomerAccountPage = () => {
  const navigate = useNavigate();
  const { logout: clearSession } = useSession();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoSectionRef = useRef<HTMLDivElement>(null);
  const lastSavedSnapshotRef = useRef<string | null>(null);

  const [form, setForm] = useState<CustomerProfileForm | null>(null);

  const [subscription, setSubscription] =
    useState<SubscriptionInfoResponse | null>(null);
  const [viewedContacts, setViewedContacts] = useState<
    ViewedContactResponse[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [photoRequirementMessage, setPhotoRequirementMessage] = useState<string | null>(null);
  const [showModerationWarning, setShowModerationWarning] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<
    "SUBSCRIPTION" | "BOOSTERS"
  >("SUBSCRIPTION");
  const hasRequiredPhoto = Boolean(form?.mainPhotoUrl);
  const completion = useMemo(
    () =>
      buildProfileCompletion([
        { label: "Имя", done: hasTextValue(form?.displayName) },
        { label: "Город", done: hasTextValue(form?.city) },
        { label: "Описание", done: hasTextValue(form?.description) },
        { label: "Фото", done: hasTextValue(form?.mainPhotoUrl) },
        { label: "Контакты", done: hasTextValue(form?.contactPhone) || hasTextValue(form?.contactEmail) || hasTextValue(form?.contactTelegram) },
      ]),
    [form]
  );

  /* ---------- LOAD ---------- */

  useEffect(() => {
    (async () => {
      try {
        const [profileRes, subscriptionRes, viewedRes] =
          await Promise.all([
            api.get<CustomerProfileResponse>("/api/customer/me"),
            getSubscriptionInfo(),
            getViewedContacts(0, 6),
          ]);

        setForm(mapToForm(profileRes.data));
        lastSavedSnapshotRef.current = getCustomerFormSnapshot(mapToForm(profileRes.data));
        setSubscription(subscriptionRes);
        setViewedContacts(viewedRes.content ?? []);
      } catch {
        setError("Ошибка загрузки кабинета");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
    enabled: !loading && Boolean(form),
    hasPhoto: hasRequiredPhoto,
    onBlocked: revealPhotoRequirement,
  });

  useUnsavedChangesGuard({
    enabled: !loading && Boolean(form),
    hasUnsavedChanges:
      Boolean(form) && getCustomerFormSnapshot(form) !== lastSavedSnapshotRef.current,
  });

  /* ---------- UPLOAD PHOTO ---------- */

  const uploadAvatar = async (file: File) => {
    if (!form) return;

    const fd = new FormData();
    fd.append("files", file);

    try {
      setUploading(true);
      const { data: urls } = await api.post<string[]>(
        "/api/files/upload",
        fd
      );

      const next = sanitizeHttpUrl(urls?.[0]) || (typeof urls?.[0] === "string" && urls[0].startsWith("/") ? urls[0] : "");
      if (!next) {
        setError("Сервер вернул некорректный адрес фото");
        return;
      }
      const nextForm = { ...form, mainPhotoUrl: next };
      setForm(nextForm);
      await saveProfile(nextForm, "Фото профиля сохранено");
    } catch (error) {
      setError(getApiErrorMessage(error, "Ошибка загрузки фото"));
    } finally {
      setUploading(false);
    }
  };

  /* ---------- SAVE ---------- */

  const saveProfile = async (
    formToSave: CustomerProfileForm | null = form,
    successMessage = "Профиль успешно сохранен"
  ) => {
    if (!formToSave) return;

    try {
      setSaving(true);
      setError(null);
      setSaveNotice(null);

      const res = await api.patch<CustomerProfileResponse>(
        "/api/customer/me",
        {
          displayName: trimToNull(formToSave.displayName, 120),
          description: trimMultilineToNull(formToSave.description, 2000),
          city: trimToNull(formToSave.city, 120),
          contactPhone: sanitizePhone(formToSave.contactPhone),
          contactEmail: sanitizeEmail(formToSave.contactEmail),
          contactTelegram: sanitizeTelegram(formToSave.contactTelegram),
          mainPhotoUrl: trimToNull(formToSave.mainPhotoUrl, 1500),
        }
      );

      setForm(mapToForm(res.data));
      lastSavedSnapshotRef.current = getCustomerFormSnapshot(mapToForm(res.data));
      window.dispatchEvent(new Event("profile-updated"));
      setSaveNotice(successMessage);
      window.setTimeout(() => setSaveNotice(null), 2500);
    } catch (error) {
      setSaveNotice(null);
      setError(getApiErrorMessage(error, "Ошибка сохранения профиля"));
    } finally {
      setSaving(false);
    }
  };

  /* ---------- LOGOUT ---------- */

  const logout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  /* ---------- RENDER ---------- */

  const contactsUsed = subscription
    ? Math.max(subscription.totalLimit - subscription.remainingContacts, 0)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-600">
        Загрузка…
      </div>
    );
  }

  return (
    <div className="account-page relative min-h-screen bg-[#f3f4f7] text-slate-900">
      <PageOctopusDecor />
      <div className="relative z-10">
        <Container>
          <div className="glass-object mx-auto mt-6 max-w-7xl overflow-visible rounded-[30px] sm:mt-8 sm:rounded-[36px] lg:rounded-[44px]">
          <InlineNav
            profileMenu={[
              {
                label: "Создать объявление",
                onClick: () => navigate("/ads/manage"),
              },
              {
                label: "Мои объявления",
                onClick: () => navigate("/account/my-castings"),
              },
              {
                label: "Отклики на кастинг",
                onClick: () => navigate("/account/casting-responses"),
              },
              {
                label: "Выйти",
                onClick: logout,
                danger: true,
              },
            ]}
          />
          <header className="glass-object-soft flex flex-wrap items-center justify-between gap-3 border-b border-white/50 px-4 py-5 sm:px-6 md:px-8 md:py-6">
            <div>
              <div className="text-xs text-slate-500">Личный кабинет</div>
              <h1 className="text-2xl font-bold">Кабинет заказчика</h1>
            </div>

            <div />
          </header>

          <section className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
                {error}
              </div>
            )}

            <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
              <div className="space-y-8">
                <ProfileCompletionCard completion={completion} />

                <Section title="Профиль заказчика">
                  {form && (
                    <div className="space-y-6">
                      <div
                        ref={photoSectionRef}
                        className={[
                          "space-y-4 rounded-2xl",
                          photoRequirementMessage ? "border border-red-300 bg-red-50/60 p-4" : "",
                        ].join(" ")}
                      >
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="w-24 h-24 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center">
                          {form.mainPhotoUrl ? (
                            <img
                              src={resolveMediaUrl(form.mainPhotoUrl) ?? undefined}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-xs text-slate-400 text-center px-2">
                              Нет фото
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => photoInputRef.current?.click()}
                            className="px-4 py-2 rounded-xl border text-sm"
                            disabled={uploading}
                          >
                            {uploading ? "Загрузка..." : "Загрузить фото"}
                          </button>

                          {form.mainPhotoUrl && (
                            <button
                              onClick={() => {
                                const nextForm = { ...form, mainPhotoUrl: "" };
                                setForm(nextForm);
                                void saveProfile(nextForm, "Фото профиля удалено");
                              }}
                              className="px-4 py-2 rounded-xl border text-sm"
                              disabled={saving}
                            >
                              Удалить фото
                            </button>
                          )}
                        </div>

                        <input
                          ref={photoInputRef}
                          type="file"
                          accept={PHOTO_TYPES.join(",")}
                          hidden
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && isAllowedPhotoFile(file)) uploadAvatar(file);
                            e.currentTarget.value = "";
                          }}
                        />
                      </div>

                      {showModerationWarning ? (
                        <DismissibleNotice
                          message={PROFILE_MEDIA_MODERATION_WARNING}
                          onClose={() => setShowModerationWarning(false)}
                        />
                      ) : null}
                      {photoRequirementMessage ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          {photoRequirementMessage}
                        </div>
                      ) : null}
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <Input
                          value={form.displayName}
                          placeholder="Имя или название компании"
                          onChange={(value) =>
                            setForm({ ...form, displayName: value })
                          }
                        />

                        <Input
                          value={form.city}
                          placeholder="Город"
                          onChange={(value) =>
                            setForm({ ...form, city: value })
                          }
                        />

                        <Input
                          value={form.contactPhone}
                          placeholder="Телефон"
                          onChange={(value) =>
                            setForm({ ...form, contactPhone: value })
                          }
                        />

                        <Input
                          value={form.contactEmail}
                          placeholder="Email"
                          onChange={(value) =>
                            setForm({ ...form, contactEmail: value })
                          }
                        />

                        <Input
                          value={form.contactTelegram}
                          placeholder="Telegram"
                          onChange={(value) =>
                            setForm({ ...form, contactTelegram: value })
                          }
                        />
                      </div>

                      <Textarea
                        value={form.description}
                        placeholder="Описание"
                        onChange={(e) =>
                          setForm({
                            ...form,
                            description: e.target.value,
                          })
                        }
                      />

                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => void saveProfile()}
                          disabled={saving}
                          className="w-full rounded-xl bg-slate-900 px-6 py-3 text-white sm:w-auto"
                        >
                          {saving ? "Сохраняем..." : "Сохранить изменения"}
                        </button>
                        <Link
                          to="/account/my-castings"
                          className="w-full rounded-xl border px-6 py-3 text-center sm:w-auto"
                        >
                          Перейти к объявлениям
                        </Link>
                      </div>
                    </div>
                  )}
                </Section>

              </div>

              <aside className="space-y-8">
                <Section title="Тариф и контакты">
                  {subscription ? (
                    <div className="space-y-4">
                      <Info title="Тариф">{subscription.planName}</Info>
                      <Info title="Осталось контактов">
                        {subscription.remainingContacts} из {subscription.totalLimit}
                      </Info>
                      <Progress
                        value={toPercent(contactsUsed, subscription.totalLimit)}
                      />

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setModalMode("BOOSTERS");
                            setModalOpen(true);
                          }}
                          className="px-4 py-2 rounded-xl border text-sm"
                        >
                          Купить бустер
                        </button>
                        <button
                          onClick={() => {
                            setModalMode("SUBSCRIPTION");
                            setModalOpen(true);
                          }}
                          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm"
                        >
                          Обновить тариф
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">
                      Не удалось загрузить тариф.
                    </div>
                  )}
                </Section>

                <Section title="Просмотренные контакты">
                  {viewedContacts.length === 0 ? (
                    <div className="text-sm text-slate-500">
                      История пока пустая.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {viewedContacts.map((c) => (
                        <div key={`${c.profileId}-${c.viewedAt}`}>
                          <div className="text-sm font-medium">
                            {c.displayName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {c.city || "Без города"}
                            {c.viewedAt ? ` • ${formatDateTime(c.viewedAt)}` : ""}
                          </div>
                        </div>
                      ))}
                      <Link to="/catalog" className="text-sm text-slate-700">
                        Найти еще профили →
                      </Link>
                    </div>
                  )}
                </Section>
              </aside>
            </div>
          </section>
          </div>
        </Container>
      </div>

      <SubscriptionModal
        open={modalOpen}
        mode={modalMode}
        onClose={() => setModalOpen(false)}
        onSuccess={() => setModalOpen(false)}
      />
      {error && <CenterToast message={error} variant="error" />}
      {saveNotice && <CenterToast message={saveNotice} />}
    </div>
  );
};

/* ================= UI ================= */

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section>
    <div className="font-semibold text-sm mb-3">{title}</div>
    <div className="glass-object-soft rounded-2xl p-4 sm:p-6">{children}</div>
  </section>
);

const Info = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div>
    <div className="text-xs text-slate-500">{title}</div>
    <div className="text-sm">{children}</div>
  </div>
);

const Progress = ({ value }: { value: number }) => (
  <div className="h-2 bg-slate-200 rounded-full mt-2">
    <div
      className="h-full bg-slate-900 rounded-full"
      style={{ width: `${value}%` }}
    />
  </div>
);
