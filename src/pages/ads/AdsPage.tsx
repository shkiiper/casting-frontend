import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/api/client";
import { Container } from "@/shared/ui/Container";
import { Input } from "@/shared/ui/Input";
import { Textarea } from "@/shared/ui/Textarea";
import { CityMultiSelect } from "@/shared/ui/CityMultiSelect";
import { InlineNav } from "@/shared/ui/InlineNav";
import { PageOctopusDecor } from "@/shared/ui/PageOctopusDecor";
import { CenterToast } from "@/shared/ui/CenterToast";
import type { PageResponse } from "@/types/common";
import { trimMultilineToNull, trimToNull } from "@/shared/lib/safety";
import { PAYMENTS_LOCKED_MESSAGE } from "@/shared/lib/payments";

type CastingResponse = {
  id: number;
  title: string;
  description?: string | null;
  city?: string | null;
  projectType?: string | null;
  active?: boolean;
};

type CreateCastingForm = {
  title: string;
  description: string;
  city: string;
  projectType: string;
  days: number;
};

const CASTING_DAY_PRICE = 300;
const CASTING_DAY_OPTIONS = [1, 3, 7, 14, 30];

const emptyForm = (): CreateCastingForm => ({
  title: "",
  description: "",
  city: "",
  projectType: "",
  days: 7,
});

export const AdsPage = () => {
  const [list, setList] = useState<CastingResponse[]>([]);
  const [form, setForm] = useState<CreateCastingForm>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const totalPrice = form.days * CASTING_DAY_PRICE;

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<PageResponse<CastingResponse>>(
          "/api/castings/my",
          { params: { page: 0, size: 50 } }
        );
        setList(res.data.content ?? []);
      } catch {
        setError("Не удалось загрузить объявления");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const requestPayment = async () => {
    const title = trimToNull(form.title, 120) ?? "";
    const description = trimMultilineToNull(form.description, 4000) ?? "";

    if (!title || title.length < 5) {
      setError("Заголовок должен быть не короче 5 символов");
      return;
    }

    if (!description || description.length < 20) {
      setError("Описание должно быть не короче 20 символов");
      return;
    }

    setForm((prev) => ({
      ...prev,
      title,
      description,
      city: trimToNull(prev.city, 120) ?? "",
      projectType: trimToNull(prev.projectType, 120) ?? "",
    }));
    setError(null);
    setPayOpen(true);
  };

  const startPayment = async () => {
    setSaving(true);
    setError(null);
    setPayOpen(false);
    setNotice(PAYMENTS_LOCKED_MESSAGE);
    window.setTimeout(() => setNotice(null), 2600);
    setSaving(false);
  };

  const deleteCasting = async (id: number) => {
    try {
      setDeletingId(id);
      setError(null);
      await api.post(`/api/castings/${id}/close`);
      setList((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setError("Не удалось удалить объявление");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#f6f6f4] text-slate-900">
      <PageOctopusDecor />
      <div className="relative z-10">
        <Container>
        <div className="mx-auto max-w-7xl mt-10">
          <div className="glass-object rounded-[28px] sm:rounded-[36px]">
            <InlineNav active="ads" />
            <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-5 sm:px-6 md:px-8 md:py-6">
              <div>
                <div className="text-xs text-slate-500">Объявления</div>
                <h1 className="text-2xl font-bold">Мои объявления</h1>
              </div>
              <Link to="/account" className="px-4 py-2 rounded-xl border text-sm">
                Вернуться в кабинет
              </Link>
            </header>

            <section className="grid gap-8 px-4 py-6 sm:px-6 md:px-8 md:py-8 lg:grid-cols-[1fr_1.1fr]">
              <div>
                <div className="font-semibold text-sm mb-3">
                  Создать объявление
                </div>
                <div className="glass-object-soft rounded-2xl p-6 space-y-4">
                  {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">
                      {error}
                    </div>
                  )}
                  <Input
                    value={form.title}
                    placeholder="Заголовок"
                    onChange={(value) =>
                      setForm({ ...form, title: value })
                    }
                  />
                  <CityMultiSelect
                    value={form.city}
                    placeholder="Выберите города"
                    onChange={(value) => setForm({ ...form, city: value })}
                  />
                  <Input
                    value={form.projectType}
                    placeholder="Тип проекта"
                    onChange={(value) =>
                      setForm({ ...form, projectType: value })
                    }
                  />
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Срок размещения
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {CASTING_DAY_OPTIONS.map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setForm({ ...form, days })}
                          className={[
                            "rounded-xl border px-3 py-2 text-sm transition-colors",
                            form.days === days
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-black/10 bg-white text-slate-700 hover:bg-slate-50",
                          ].join(" ")}
                        >
                          {days} дн.
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 text-sm text-slate-500">
                      {CASTING_DAY_PRICE} сом/день, итого {totalPrice} сом
                    </div>
                  </div>
                  <Textarea
                    value={form.description}
                    placeholder="Описание"
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                  <button
                    onClick={requestPayment}
                    disabled={saving}
                    className="px-6 py-3 bg-slate-900 text-white rounded-xl"
                  >
                    {saving ? "Готовим оплату..." : "Оплатить и создать"}
                  </button>
                </div>
              </div>

              <div>
                <div className="font-semibold text-sm mb-3">
                  Ваши объявления
                </div>
                <div className="glass-object-soft rounded-2xl p-6">
                  {loading ? (
                    <div className="text-sm text-slate-500">Загрузка...</div>
                  ) : list.length === 0 ? (
                    <div className="text-sm text-slate-500">
                      Пока нет объявлений.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {list.map((c) => (
                        <div key={c.id} className="glass-object-soft rounded-2xl p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="font-medium">{c.title}</div>
                              <div className="text-xs text-slate-500">
                                {c.city || "Без города"}
                                {c.projectType ? ` • ${c.projectType}` : ""}
                              </div>
                            </div>
                            <button
                              onClick={() => deleteCasting(c.id)}
                              disabled={deletingId === c.id}
                              className="px-3 py-1 text-xs rounded-lg border"
                            >
                              {deletingId === c.id ? "Удаляем..." : "Удалить"}
                            </button>
                          </div>
                          {c.description && (
                            <div className="text-sm text-slate-700 mt-2 line-clamp-3">
                              {c.description}
                            </div>
                          )}
                          <div className="text-xs text-slate-500 mt-2">
                            {c.active ? "Активно" : "Неактивно"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
        </Container>
      </div>

      <PayModal
        open={payOpen}
        title={form.title}
        city={form.city}
        projectType={form.projectType}
        days={form.days}
        totalPrice={totalPrice}
        saving={saving}
        onClose={() => setPayOpen(false)}
        onConfirm={startPayment}
      />
      {notice && <CenterToast message={notice} variant="info" />}
    </div>
  );
};

const PayModal = ({
  open,
  title,
  city,
  projectType,
  days,
  totalPrice,
  saving,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  city: string;
  projectType: string;
  days: number;
  totalPrice: number;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="glass-object w-full max-w-lg rounded-2xl p-6">
        <div className="text-lg font-semibold mb-2">Оплата размещения</div>
        <div className="text-sm text-slate-600 mb-4">
          После успешной оплаты объявление будет создано и опубликовано на выбранный срок.
        </div>
        <div className="glass-object-soft rounded-xl p-4 text-sm space-y-1">
          <div>
            <span className="text-slate-500">Заголовок: </span>
            {title || "—"}
          </div>
          <div>
            <span className="text-slate-500">Город: </span>
            {city || "—"}
          </div>
          <div>
            <span className="text-slate-500">Проект: </span>
            {projectType || "—"}
          </div>
          <div>
            <span className="text-slate-500">Срок: </span>
            {days} дн.
          </div>
          <div>
            <span className="text-slate-500">К оплате: </span>
            {totalPrice} сом
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            className="px-4 py-2 rounded-xl border text-sm"
            onClick={onClose}
            disabled={saving}
          >
            Отмена
          </button>
          <button
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm"
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? "Переходим к оплате..." : "Оплатить"}
          </button>
        </div>
      </div>
    </div>
  );
};
