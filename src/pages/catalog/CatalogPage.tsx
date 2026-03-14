import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import publicApi from '@/shared/api/publicClient';
import { Container } from '@/shared/ui/Container';
import { InlineNav } from '@/shared/ui/InlineNav';
import { PageOctopusDecor } from '@/shared/ui/PageOctopusDecor';
import { resolveMediaUrl } from '@/shared/ui/useProfileAvatar';

type Tab = 'ALL' | 'ACTOR' | 'CREATOR' | 'LOCATION';
type ProfileType = 'ACTOR' | 'CREATOR' | 'LOCATION';

type PageResponse<T> = {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
};

type ProfilePublic = {
  id: number;
  type: ProfileType;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  city?: string | null;
  mainPhotoUrl?: string | null;
  description?: string | null;
  age?: number | null;
  gender?: string | null;
  activityType?: string | null;
  locationName?: string | null;
  photoUrls?: string[] | null;
  ethnicity?: string | null;
  minRate?: number | null;
  premiumActive?: boolean | null;
  premiumExpiresAt?: string | null;
};

type Filters = {
  tab: Tab;
  city: string;
  search: string;

  // actors
  minAge: string;
  maxAge: string;
  gender: string;
  ethnicity: string;
  minRate: string;
  maxRate: string;

  activityType: string;

  minRentPrice: string;
  maxRentPrice: string;
};

const PAGE_SIZE = 12;
const AGE_RANGE_OPTIONS = Array.from({ length: 63 }, (_, i) => String(18 + i));
const DEFAULT_CITY_OPTIONS = [
  'Бишкек',
  'Алмата',
  'Нурсултан',
  'Ош',
  'Чолпон-Ата',
  'Каракол',
  'Джалал-Абад',
  'Нарын',
  'Талас',
  'Баткен',
  'Токмок',
  'Кант',
];
const CREATOR_ACTIVITY_OPTIONS = [
  'Режиссер',
  'Оператор',
  'Фотограф',
  'Монтажер',
  'Colorist',
  'Звукорежиссер',
  'Продюсер',
  'Сценарист',
  'SMM / Контент-креатор',
  'Арт-директор',
  'Графический дизайнер',
  'VFX / Motion',
  'Световик',
  'Гример / Стилист',
  'Кастинг-директор',
  'Другое',
];
const RENT_PRICE_OPTIONS = [
  '500',
  '1000',
  '1500',
  '2000',
  '3000',
  '5000',
  '7000',
  '10000',
  '15000',
  '20000',
];

function getPreviewPhoto(p: ProfilePublic) {
  if (p.mainPhotoUrl) return p.mainPhotoUrl;
  if (p.photoUrls?.length) return p.photoUrls[0];
  return null;
}

function buildName(p: ProfilePublic) {
  const n =
    p.displayName ||
    [p.firstName, p.lastName].filter(Boolean).join(' ') ||
    'Без имени';
  return n;
}

function buildEndpoint(tab: Tab) {
  if (tab === 'ACTOR') return '/api/catalog/actors';
  if (tab === 'CREATOR') return '/api/catalog/creators';
  if (tab === 'LOCATION') return '/api/catalog/locations';
  return '/api/catalog/actors';
}

function pathToTab(pathname: string): Tab | null {
  if (pathname.startsWith('/actors')) return 'ACTOR';
  if (pathname.startsWith('/creators')) return 'CREATOR';
  if (pathname.startsWith('/locations')) return 'LOCATION';
  return null;
}

export const CatalogPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeTab = useMemo(() => pathToTab(location.pathname), [location.pathname]);

  const [filters, setFilters] = useState<Filters>({
    tab: routeTab ?? 'ALL',
    city: '',
    search: '',
    minAge: '',
    maxAge: '',
    gender: '',
    ethnicity: '',
    minRate: '',
    maxRate: '',
    activityType: '',
    minRentPrice: '',
    maxRentPrice: '',
  });

  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!routeTab) return;
    setFilters((prev) => (prev.tab === routeTab ? prev : { ...prev, tab: routeTab }));
    setPage(0);
  }, [routeTab]);

  const serverFilters = useMemo(
    () => ({
      tab: filters.tab,
      city: filters.city,
      minAge: filters.minAge,
      maxAge: filters.maxAge,
      gender: filters.gender,
      ethnicity: filters.ethnicity,
      minRate: filters.minRate,
      maxRate: filters.maxRate,
      activityType: filters.activityType,
      minRentPrice: filters.minRentPrice,
      maxRentPrice: filters.maxRentPrice,
    }),
    [
      filters.tab,
      filters.city,
      filters.minAge,
      filters.maxAge,
      filters.gender,
      filters.ethnicity,
      filters.minRate,
      filters.maxRate,
      filters.activityType,
      filters.minRentPrice,
      filters.maxRentPrice,
    ],
  );

  const queryKey = useMemo(() => ['catalog', serverFilters, page], [serverFilters, page]);

  const query = useQuery({
    queryKey,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<PageResponse<ProfilePublic>> => {
      const makeParams = (tab: Exclude<Tab, 'ALL'>) => {
        const params: Record<string, string | number> = {
          page,
          size: PAGE_SIZE,
        };

        if (serverFilters.city.trim()) params.city = serverFilters.city.trim();

        if (tab === 'ACTOR') {
          if (serverFilters.minAge) params.minAge = serverFilters.minAge;
          if (serverFilters.maxAge) params.maxAge = serverFilters.maxAge;
          if (serverFilters.gender.trim()) params.gender = serverFilters.gender.trim();
          if (serverFilters.ethnicity.trim()) params.ethnicity = serverFilters.ethnicity.trim();
          if (serverFilters.minRate) params.minRate = serverFilters.minRate;
          if (serverFilters.maxRate) params.maxRate = serverFilters.maxRate;
        }

        if (tab === 'CREATOR') {
          if (serverFilters.activityType.trim()) {
            params.activityType = serverFilters.activityType.trim();
          }
        }

        if (tab === 'LOCATION') {
          if (serverFilters.minRentPrice) params.minRentPrice = serverFilters.minRentPrice;
          if (serverFilters.maxRentPrice) params.maxRentPrice = serverFilters.maxRentPrice;
        }

        return params;
      };

      if (serverFilters.tab === 'ALL') {
        const [a, c, l] = await Promise.allSettled([
          publicApi.get<PageResponse<ProfilePublic>>('/api/catalog/actors', {
            params: makeParams('ACTOR'),
          }),
          publicApi.get<PageResponse<ProfilePublic>>('/api/catalog/creators', {
            params: makeParams('CREATOR'),
          }),
          publicApi.get<PageResponse<ProfilePublic>>('/api/catalog/locations', {
            params: makeParams('LOCATION'),
          }),
        ]);

        const actors = a.status === 'fulfilled' ? (a.value.data?.content ?? []) : [];
        const creators = c.status === 'fulfilled' ? (c.value.data?.content ?? []) : [];
        const locations = l.status === 'fulfilled' ? (l.value.data?.content ?? []) : [];

        const merged = [...actors, ...creators, ...locations];
        const order: Record<ProfileType, number> = {
          ACTOR: 0,
          CREATOR: 1,
          LOCATION: 2,
        };
        merged.sort((x, y) => order[x.type] - order[y.type]);

        const actorsMeta = a.status === 'fulfilled' ? a.value.data : null;
        const creatorsMeta = c.status === 'fulfilled' ? c.value.data : null;
        const locationsMeta = l.status === 'fulfilled' ? l.value.data : null;

        return {
          content: merged,
          number: page,
          size: PAGE_SIZE * 3,
          totalElements:
            (actorsMeta?.totalElements ?? actors.length) +
            (creatorsMeta?.totalElements ?? creators.length) +
            (locationsMeta?.totalElements ?? locations.length),
          totalPages: Math.max(
            actorsMeta?.totalPages ?? 1,
            creatorsMeta?.totalPages ?? 1,
            locationsMeta?.totalPages ?? 1,
          ),
          last:
            (actorsMeta?.last ?? true) &&
            (creatorsMeta?.last ?? true) &&
            (locationsMeta?.last ?? true),
        };
      }

      const endpoint = buildEndpoint(serverFilters.tab);
      const res = await publicApi.get<PageResponse<ProfilePublic>>(endpoint, {
        params: makeParams(serverFilters.tab),
      });

      return {
        content: res.data?.content ?? [],
        number: res.data?.number ?? page,
        size: res.data?.size ?? PAGE_SIZE,
        totalElements: res.data?.totalElements ?? 0,
        totalPages: res.data?.totalPages ?? 1,
        last: res.data?.last ?? true,
      };
    },
  });

  const data = useMemo(() => query.data?.content ?? [], [query.data?.content]);
  const isLoading = query.isLoading;
  const isError = query.isError;

  const filtered = useMemo(() => {
    const s = filters.search.trim().toLowerCase();
    if (!s) return data;
    return data.filter((p) => {
      const name = buildName(p).toLowerCase();
      const city = (p.city ?? '').toLowerCase();
      const desc = (p.description ?? '').toLowerCase();
      return name.includes(s) || city.includes(s) || desc.includes(s);
    });
  }, [data, filters.search]);
  const cityOptions = useMemo(() => {
    const blockedCities = new Set(['калифорния', 'california']);
    const set = new Set(DEFAULT_CITY_OPTIONS);
    data.forEach((item) => {
      const city = item.city?.trim();
      if (city && !blockedCities.has(city.toLowerCase())) set.add(city);
    });
    return Array.from(set)
      .filter((city) => !blockedCities.has(city.toLowerCase()))
      .sort((a, b) => a.localeCompare(b, 'ru'));
  }, [data]);
  const creatorActivityOptions = useMemo(() => {
    const set = new Set(CREATOR_ACTIVITY_OPTIONS);
    data.forEach((item) => {
      const activity = item.activityType?.trim();
      if (activity) set.add(activity);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [data]);

  const title =
    routeTab === 'ACTOR'
      ? 'Каталог актёров'
      : routeTab === 'CREATOR'
      ? 'Каталог креаторов'
      : routeTab === 'LOCATION'
      ? 'Каталог локаций'
      : 'Каталог профилей';
  const glassInputClass =
    'mt-1 w-full rounded-xl border border-slate-300/85 bg-white/82 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none focus:ring-2 focus:ring-slate-300/70 focus:border-slate-500';
  const glassPanelClass =
    'glass-object rounded-2xl';

  const navActive =
    routeTab === 'ACTOR'
      ? 'actors'
      : routeTab === 'CREATOR'
      ? 'creators'
      : routeTab === 'LOCATION'
      ? 'locations'
      : undefined;
  return (
    <div className="relative min-h-screen bg-[#f4f6fa] text-slate-900">
      <PageOctopusDecor />
      <div className="relative z-10 pt-10 pb-16">
        <Container>
          <div className="glass-object mx-auto max-w-7xl rounded-[44px] overflow-visible">
            <InlineNav active={navActive} />

            {/* HEADER каталога */}
            <header className="glass-object-soft flex flex-col md:flex-row md:items-end md:justify-between gap-6 px-8 pt-8 pb-6 border-b border-white/50">
              <div>
                <div className="text-sm text-slate-500">Onset / каталог</div>
                <h1 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight">
                  {title}
                </h1>
                <p className="mt-2 text-slate-600">
                  Фильтруйте по типу, городу и параметрам — и открывайте профиль.
                </p>
              </div>
            </header>

            <div className="px-8 pb-10 pt-8">
              {/* FILTERS */}
              <div className={`${glassPanelClass} p-4`}>
                <div className="grid gap-3 lg:grid-cols-12">
                  <div className="lg:col-span-5">
                    <label className="text-xs text-slate-500">Поиск</label>
                    <input
                      value={filters.search}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          search: e.target.value,
                        }))
                      }
                      placeholder="Имя, город, описание..."
                      className={glassInputClass}
                    />
                  </div>

                  <div className="lg:col-span-4">
                    <label className="text-xs text-slate-500">Город</label>
                    <select
                      value={filters.city}
                      onChange={(e) => {
                        setFilters((prev) => ({ ...prev, city: e.target.value }));
                        setPage(0);
                      }}
                      className={glassInputClass}
                    >
                      <option value="">Все города</option>
                      {cityOptions.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-3 flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        setFilters({
                          tab: filters.tab,
                          city: '',
                          search: '',
                          minAge: '',
                          maxAge: '',
                          gender: '',
                          ethnicity: '',
                          minRate: '',
                          maxRate: '',
                          activityType: '',
                          minRentPrice: '',
                          maxRentPrice: '',
                        });
                        setPage(0);
                      }}
                      className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold border border-slate-300/85 bg-white/82 text-slate-700 hover:bg-white"
                    >
                      Сбросить фильтры
                    </button>
                  </div>
                </div>

                {filters.tab !== 'ALL' && (
                  <div className="mt-4 border-t border-white/60 pt-3">
                    <div className="text-xs font-semibold tracking-wide uppercase text-slate-500">
                      Параметры категории
                    </div>

                    {filters.tab === 'ACTOR' && (
                      <div className="mt-2.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <div>
                          <label className="text-xs text-slate-500">Возраст от</label>
                          <select
                            value={filters.minAge}
                            onChange={(e) => {
                              setFilters((prev) => ({
                                ...prev,
                                minAge: e.target.value,
                              }));
                              setPage(0);
                            }}
                            className={glassInputClass}
                          >
                            <option value="">Не выбрано</option>
                            {AGE_RANGE_OPTIONS.map((age) => (
                              <option key={`min-${age}`} value={age}>
                                {age}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs text-slate-500">Возраст до</label>
                          <select
                            value={filters.maxAge}
                            onChange={(e) => {
                              setFilters((prev) => ({
                                ...prev,
                                maxAge: e.target.value,
                              }));
                              setPage(0);
                            }}
                            className={glassInputClass}
                          >
                            <option value="">Не выбрано</option>
                            {AGE_RANGE_OPTIONS.map((age) => (
                              <option key={`max-${age}`} value={age}>
                                {age}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs text-slate-500">Пол</label>
                          <select
                            value={filters.gender}
                            onChange={(e) => {
                              setFilters((prev) => ({
                                ...prev,
                                gender: e.target.value,
                              }));
                              setPage(0);
                            }}
                            className={glassInputClass}
                          >
                            <option value="">Все</option>
                            <option value="MALE">Мужской</option>
                            <option value="FEMALE">Женский</option>
                            <option value="OTHER">Другое</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs text-slate-500">Ставка от</label>
                          <input
                            value={filters.minRate}
                            onChange={(e) => {
                              setFilters((prev) => ({
                                ...prev,
                                minRate: e.target.value,
                              }));
                              setPage(0);
                            }}
                            placeholder="1500"
                            className={glassInputClass}
                          />
                        </div>

                        <div>
                          <label className="text-xs text-slate-500">Этничность</label>
                          <input
                            value={filters.ethnicity}
                            onChange={(e) => {
                              setFilters((prev) => ({
                                ...prev,
                                ethnicity: e.target.value,
                              }));
                              setPage(0);
                            }}
                            placeholder="Например, ASIAN"
                            className={glassInputClass}
                          />
                        </div>

                        <div>
                          <label className="text-xs text-slate-500">Ставка до</label>
                          <input
                            value={filters.maxRate}
                            onChange={(e) => {
                              setFilters((prev) => ({
                                ...prev,
                                maxRate: e.target.value,
                              }));
                              setPage(0);
                            }}
                            placeholder="5000"
                            className={glassInputClass}
                          />
                        </div>
                      </div>
                    )}

                    {filters.tab === 'CREATOR' && (
                      <div className="mt-2.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                          <label className="text-xs text-slate-500">Тип деятельности</label>
                          <div className="relative">
                            <select
                              value={filters.activityType}
                              onChange={(e) => {
                                setFilters((prev) => ({
                                  ...prev,
                                  activityType: e.target.value,
                                }));
                                setPage(0);
                              }}
                              className={`${glassInputClass} pr-10`}
                            >
                              <option value="">Все типы</option>
                              {creatorActivityOptions.map((item) => (
                                <option key={item} value={item}>
                                  {item}
                                </option>
                              ))}
                            </select>
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                            >
                              ▾
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {filters.tab === 'LOCATION' && (
                      <div className="mt-2.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <label className="text-xs text-slate-500">Аренда от</label>
                          <select
                            value={filters.minRentPrice}
                            onChange={(e) => {
                              setFilters((prev) => ({
                                ...prev,
                                minRentPrice: e.target.value,
                              }));
                              setPage(0);
                            }}
                            className={glassInputClass}
                          >
                            <option value="">Не выбрано</option>
                            {RENT_PRICE_OPTIONS.map((price) => (
                              <option key={`rent-min-${price}`} value={price}>
                                {price}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs text-slate-500">Аренда до</label>
                          <select
                            value={filters.maxRentPrice}
                            onChange={(e) => {
                              setFilters((prev) => ({
                                ...prev,
                                maxRentPrice: e.target.value,
                              }));
                              setPage(0);
                            }}
                            className={glassInputClass}
                          >
                            <option value="">Не выбрано</option>
                            {RENT_PRICE_OPTIONS.map((price) => (
                              <option key={`rent-max-${price}`} value={price}>
                                {price}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* ERROR */}
              {isError && (
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
                  Не удалось загрузить каталог. Проверьте авторизацию и доступ.
                </div>
              )}

              {/* GRID / STATES */}
              <div className="mt-8">
                {isLoading ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div
                        key={i}
                        className={`${glassPanelClass} p-6`}
                      >
                        <div className="aspect-[3/4] rounded-2xl bg-slate-200/60 animate-pulse" />
                        <div className="mt-5 h-5 w-2/3 bg-slate-200/60 rounded animate-pulse" />
                        <div className="mt-3 h-4 w-1/2 bg-slate-200/60 rounded animate-pulse" />
                        <div className="mt-6 h-10 w-full bg-slate-200/60 rounded-xl animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className={`${glassPanelClass} p-10 text-center`}>
                    <div className="text-xl font-bold">Ничего не найдено</div>
                    <div className="mt-2 text-slate-600">
                      Попробуйте изменить фильтры или очистить поиск.
                    </div>
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={() => {
                          setFilters({
                            tab: filters.tab,
                            city: '',
                            search: '',
                            minAge: '',
                            maxAge: '',
                            gender: '',
                            ethnicity: '',
                            minRate: '',
                            maxRate: '',
                            activityType: '',
                            minRentPrice: '',
                            maxRentPrice: '',
                          });
                          setPage(0);
                        }}
                        className="rounded-xl px-6 py-3 font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                      >
                        Очистить
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>
                        Показано:{' '}
                        <span className="font-semibold text-slate-900">
                          {filtered.length}
                        </span>
                      </span>
                      <span>
                        Страница:{' '}
                        <span className="font-semibold text-slate-900">
                          {(query.data?.number ?? 0) + 1}
                        </span>
                        {' / '}
                        <span className="font-semibold text-slate-900">
                          {query.data?.totalPages ?? 1}
                        </span>
                      </span>
                    </div>

                    <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {filtered.map((p) => {
                        const name = buildName(p);
                        const subtitle =
                          [p.city, p.age ? `${p.age} лет` : null]
                            .filter(Boolean)
                            .join(' • ') || '—';

                        const badge =
                          p.type === 'ACTOR'
                            ? 'Актёр'
                            : p.type === 'CREATOR'
                            ? 'Креатор'
                            : 'Локация';

                        return (
                          <button
                              key={p.id}
                              type="button"
                              onClick={() =>
                                navigate(`/profiles/${p.id}`, {
                                  state: { profilePreview: p },
                                })
                              }
                              className="glass-object text-left rounded-[28px] p-6 transition-shadow hover:shadow-[0_14px_32px_rgba(15,23,42,0.14)]"
                            >
                              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/50 bg-slate-100/80">
                                {(() => {
                                  const photo = getPreviewPhoto(p);
                                  const src = resolveMediaUrl(photo);

                                  return src ? (
                                    <img
                                      src={src}
                                      alt={name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="h-full w-full grid place-items-center text-slate-400">
                                      Фото
                                    </div>
                                  );
                                })()}

                              <div className="absolute top-3 left-3 rounded-full bg-white/85 border border-white/70 px-3 py-1 text-xs font-semibold text-slate-700">
                                  {badge}
                                </div>
                                {p.premiumActive ? (
                                  <div className="absolute top-3 right-3 rounded-full bg-amber-400/95 px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm">
                                    Premium
                                  </div>
                                ) : null}
                              </div>

                              <div className="mt-5 font-bold text-lg">{name}</div>
                              <div className="mt-1 text-slate-600 text-sm">{subtitle}</div>

                              <div className="mt-4 text-sm text-slate-700 line-clamp-2 min-h-[40px]">
                                {p.description ??
                                  (p.type === 'LOCATION'
                                    ? p.locationName
                                    : p.activityType) ??
                                  '—'}
                              </div>

                              <div className="mt-6">
                                <div className="rounded-xl px-4 py-3 font-semibold bg-slate-900 text-white text-center">
                                  Открыть профиль
                                </div>
                                <div className="mt-2 text-xs text-slate-500 text-center">
                                  Контакты доступны в профиле по подписке
                                </div>
                              </div>
                            </button>

                        );
                      })}
                    </div>

                    {/* PAGINATION */}
                    <div className="mt-10 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className={[
                          'rounded-xl px-5 py-2 text-sm font-semibold border transition-colors',
                          page === 0
                            ? 'bg-white/60 text-slate-400 border-black/10 cursor-not-allowed'
                            : 'bg-white/80 text-slate-800 border-black/10 hover:bg-white',
                        ].join(' ')}
                      >
                        ← Назад
                      </button>

                      <button
                        type="button"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={Boolean(query.data?.last)}
                        className={[
                          'rounded-xl px-5 py-2 text-sm font-semibold border transition-colors',
                          query.data?.last
                            ? 'bg-white/60 text-slate-400 border-black/10 cursor-not-allowed'
                            : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800',
                        ].join(' ')}
                      >
                        Вперёд →
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
};
