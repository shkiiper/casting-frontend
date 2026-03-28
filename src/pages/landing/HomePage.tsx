import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/shared/ui/Container';
import { InlineNav } from '@/shared/ui/InlineNav';
import { PageOctopusDecor } from '@/shared/ui/PageOctopusDecor';
import publicApi from '@/shared/api/publicClient';
import { PublicFooter } from '@/shared/ui/PublicFooter';
import actorIcon from '@/shared/assets/actor-icon.svg';
import directorIcon from '@/shared/assets/director-icon.svg';
import locationIcon from '@/shared/assets/location-icon.svg';
import type { PageResponse } from '@/types/common';

const studios = [
  'Atom Creative Studio',
  'Silverline Production',
  'Nomad Pictures',
  'Blue Frame Studio',
  'Kyrgyz Film Lab',
  'Ala-Too Media',
  'CineCraft Bishkek',
  'Steppe Studio',
  'Urban Lens',
  'Onset Production',
];

type CastingResponse = {
  id: number;
};

type CastingListResponse = PageResponse<CastingResponse> | CastingResponse[];

type HomeMetrics = {
  totalProfiles: number;
  activeAds: number;
  actorProfiles: number;
};

const profileDirections = [
  {
    title: 'Актёры',
    description: 'Подбор по типажу, возрасту, городу и опыту.',
    icon: actorIcon,
    to: '/actors',
  },
  {
    title: 'Креаторы',
    description: 'Операторы, режиссёры, монтажеры, SMM и продакшен-команды.',
    icon: directorIcon,
    to: '/creators',
  },
  {
    title: 'Локации',
    description: 'Студии, интерьеры и площадки с условиями аренды.',
    icon: locationIcon,
    to: '/locations',
  },
];

const steps = [
  {
    id: '01',
    title: 'Создайте объявление',
    text: 'Опишите проект, город, сроки и требования к участникам.',
  },
  {
    id: '02',
    title: 'Получайте отклики',
    text: 'Кандидаты откликаются напрямую, а вы видите их профили.',
  },
  {
    id: '03',
    title: 'Соберите команду',
    text: 'Открывайте контакты и быстро договаривайтесь о работе.',
  },
];

export const HomePage = () => {
  const [metrics, setMetrics] = useState<HomeMetrics>({
    totalProfiles: 0,
    activeAds: 0,
    actorProfiles: 0,
  });

  useEffect(() => {
    (async () => {
      const [actorsRes, creatorsRes, locationsRes, activeCastingsRes] =
        await Promise.allSettled([
          publicApi.get<PageResponse<unknown>>('/api/catalog/actors', {
            params: { page: 0, size: 1 },
          }),
          publicApi.get<PageResponse<unknown>>('/api/catalog/creators', {
            params: { page: 0, size: 1 },
          }),
          publicApi.get<PageResponse<unknown>>('/api/catalog/locations', {
            params: { page: 0, size: 1 },
          }),
          publicApi.get<CastingListResponse>('/api/castings/active', {
            params: { page: 0, size: 1 },
          }),
        ]);

      const actorProfiles =
        actorsRes.status === 'fulfilled' ? actorsRes.value.data.totalElements ?? 0 : 0;
      const creatorProfiles =
        creatorsRes.status === 'fulfilled' ? creatorsRes.value.data.totalElements ?? 0 : 0;
      const locationProfiles =
        locationsRes.status === 'fulfilled' ? locationsRes.value.data.totalElements ?? 0 : 0;

      const activeAds =
        activeCastingsRes.status === 'fulfilled'
          ? Array.isArray(activeCastingsRes.value.data)
            ? activeCastingsRes.value.data.length
            : activeCastingsRes.value.data.totalElements ?? 0
          : 0;

      setMetrics({
        totalProfiles: actorProfiles + creatorProfiles + locationProfiles,
        activeAds,
        actorProfiles,
      });
    })();
  }, []);

  const metricCards = useMemo(
    () => [
      { label: 'Профилей в каталоге', value: metrics.totalProfiles },
      { label: 'Активных объявлений', value: metrics.activeAds },
    ],
    [metrics]
  );

  return (
    <div className="relative min-h-screen bg-[#f3f4f7] text-slate-900">
      <PageOctopusDecor />
      <div className="relative z-10 pt-10 pb-16">
        <Container>
          <div className="relative mx-auto max-w-7xl overflow-visible rounded-[30px] border border-black/5 bg-white/88 shadow-[0_16px_56px_rgba(15,23,42,0.10)] sm:rounded-[36px] lg:rounded-[44px]">
            <InlineNav active="home" />

            <section className="px-4 pb-8 pt-6 sm:px-6 md:px-8 md:pb-10 md:pt-8">
              <div className="relative">
                <div className="hero-glass relative rounded-[30px] overflow-hidden">

                  <div className="relative p-5 sm:p-7 md:p-10 lg:p-12">
                    <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-10 items-center">
                      <div>
                        <div className="hero-glass-chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-slate-600">
                          <span className="h-6 w-6 rounded-full bg-slate-900 text-white grid place-items-center text-xs">
                            O
                          </span>
                          Onset platform
                        </div>

                        <h1 className="mt-6 text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-4xl md:mt-7 md:text-6xl">
                          Кастинг и продакшен
                          <span className="text-slate-500"> в одной системе</span>
                        </h1>

                        <div className="mt-8 flex flex-col sm:flex-row gap-3">
                          <Link to="/actors" className="w-full sm:w-auto">
                            <button
                              className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white shadow-[0_0_22px_rgba(255,255,255,0.52)] transition-colors hover:bg-slate-800 sm:w-auto sm:px-8"
                              type="button"
                            >
                              Перейти в каталог
                            </button>
                          </Link>
                          <Link to="/ads" className="w-full sm:w-auto">
                            <button
                              className="hero-glass-chip inline-flex w-full items-center justify-center rounded-xl px-6 py-3 font-semibold text-slate-900 transition-colors sm:w-auto sm:px-8"
                              type="button"
                            >
                              Смотреть объявления
                            </button>
                          </Link>
                        </div>
                      </div>

                      <div className="grid gap-3">
                        {metricCards.map((item) => (
                          <div
                            key={item.label}
                            className="hero-glass-card rounded-2xl p-4"
                          >
                            <div className="text-3xl font-extrabold">
                              {new Intl.NumberFormat('ru-RU').format(item.value)}
                            </div>
                            <div className="text-sm text-slate-600 mt-1">{item.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="hero-glass-footer relative px-6 py-5">
                    <div className="marquee">
                      <div className="marquee__track">
                        {[...studios, ...studios].map((studio, idx) => (
                          <span
                            key={`${studio}-${idx}`}
                            className="text-xs text-slate-500 tracking-wide"
                          >
                            {studio}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="relative px-4 pb-10 sm:px-6 md:px-8 md:pb-12">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-30 bg-gradient-to-b from-[#f3f4f7]/90 via-[#f3f4f7]/68 to-transparent"
              />
              <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold">Что есть на платформе</h2>
                  <p className="mt-2 text-slate-600">
                    Все ключевые роли и ресурсы для проекта в едином каталоге.
                  </p>
                </div>
                <Link to="/actors" className="text-sm text-slate-700 hover:text-slate-900">
                  Открыть каталог →
                </Link>
              </div>

              <div className="mt-8 grid md:grid-cols-3 gap-4">
                {profileDirections.map((item) => (
                  <Link
                    key={item.title}
                    to={item.to}
                    className="group hero-glass-card block rounded-[28px] p-6 transition-shadow hover:shadow-[0_14px_32px_rgba(15,23,42,0.14)] focus:outline-none focus:ring-2 focus:ring-slate-300/70"
                  >
                    <div className="h-10 w-10 rounded-xl bg-slate-900/5 grid place-items-center">
                      <img src={item.icon} alt="" className="h-6 w-6 opacity-80" />
                    </div>
                    <div className="mt-5 text-lg font-semibold underline-offset-4 group-hover:underline">
                      {item.title}
                    </div>
                    <div className="mt-2 text-sm text-slate-600 leading-relaxed">
                      {item.description}
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="px-4 pb-10 sm:px-6 md:px-8 md:pb-12">
              <div className="text-center">
                <h2 className="text-2xl md:text-3xl font-bold">Как это работает</h2>
                <p className="mt-2 text-slate-600 max-w-2xl mx-auto">
                  Простой процесс: публикуете запрос, получаете отклики и выбираете
                  подходящих людей.
                </p>
              </div>

              <div className="mt-8 grid md:grid-cols-3 gap-4">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className="hero-glass-card rounded-[28px] p-6"
                  >
                    <div className="text-xs font-bold tracking-wider text-slate-500">
                      {step.id}
                    </div>
                    <div className="mt-3 text-lg font-semibold">{step.title}</div>
                    <div className="mt-2 text-sm text-slate-600 leading-relaxed">
                      {step.text}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="px-4 pb-12 sm:px-6 md:px-8 md:pb-14">
              <div className="rounded-[24px] border border-black/5 bg-slate-900 p-6 text-white sm:rounded-[30px] md:p-10">
                <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-center">
                  <div>
                    <h3 className="text-2xl md:text-3xl font-bold">
                      Готовы закрыть кастинг быстрее?
                    </h3>
                    <p className="mt-2 text-slate-300 max-w-2xl">
                      Разместите объявление или найдите исполнителей в каталоге уже
                      сегодня.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link to="/auth/register">
                      <button
                        className="inline-flex items-center justify-center rounded-xl px-7 py-3 font-semibold bg-white text-slate-900 hover:bg-slate-100 transition-colors"
                        type="button"
                      >
                        Начать бесплатно
                      </button>
                    </Link>
                    <Link to="/ads">
                      <button
                        className="inline-flex items-center justify-center rounded-xl px-7 py-3 font-semibold border border-white/30 text-white hover:bg-white/10 transition-colors"
                        type="button"
                      >
                        Объявления
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </Container>
      </div>
      <div className="relative z-10">
        <PublicFooter />
      </div>
    </div>
  );
};
