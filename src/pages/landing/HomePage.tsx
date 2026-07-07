import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  MapPin,
  Radar,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { Container } from '@/shared/ui/Container';
import { InlineNav } from '@/shared/ui/InlineNav';
import { AnimatedCodeBackdrop } from '@/shared/ui/AnimatedCodeBackdrop';
import { PublicFooter } from '@/shared/ui/PublicFooter';
import actorIcon from '@/shared/assets/actor-icon.svg';
import directorIcon from '@/shared/assets/director-icon.svg';
import locationIcon from '@/shared/assets/location-icon.svg';

const studios = [
  'Атом Креатив',
  'Серебряная Линия',
  'Номад Пикчерс',
  'Синяя Рамка',
  'Кыргыз Фильм Лаб',
  'Ала-Тоо Медиа',
  'СинеКрафт Бишкек',
  'Степная Студия',
  'Городская Линза',
  'Онсет Продакшен',
];

const profileDirections = [
  {
    title: 'Актёры',
    description: 'Подбор по типажу, возрасту, городу и опыту.',
    icon: actorIcon,
    to: '/actors',
    meta: 'Типажи и портфолио',
  },
  {
    title: 'Креаторы',
    description: 'Операторы, режиссёры, монтажеры, SMM и продакшен-команды.',
    icon: directorIcon,
    to: '/creators',
    meta: 'Команда под задачу',
  },
  {
    title: 'Локации',
    description: 'Студии, интерьеры и площадки с условиями аренды.',
    icon: locationIcon,
    to: '/locations',
    meta: 'Площадки для съёмок',
  },
];

const steps = [
  {
    id: '01',
    title: 'Создайте объявление',
    text: 'Опишите проект, город, сроки и требования к участникам. Заявка выглядит понятно для исполнителей.',
    icon: Sparkles,
  },
  {
    id: '02',
    title: 'Получайте отклики',
    text: 'Кандидаты откликаются напрямую, а вы видите фото, опыт, контакты и актуальный статус профиля.',
    icon: Radar,
  },
  {
    id: '03',
    title: 'Соберите команду',
    text: 'Открывайте контакты и быстро договаривайтесь о работе без бесконечных чатов и таблиц.',
    icon: BadgeCheck,
  },
];

export const HomePage = () => {
  return (
    <div className="home-page relative min-h-screen overflow-x-hidden bg-[#f3f4f7] text-slate-900">
      <AnimatedCodeBackdrop />
      <div className="relative z-10 pb-8 pt-4 sm:pt-10">
        <Container>
          <div className="glass-object relative mx-auto max-w-7xl overflow-hidden rounded-[22px] sm:rounded-[36px] lg:rounded-[44px]">
            <div className="home-editorial-bg absolute inset-0">
              <div className="home-editorial-grid" />
            </div>

            <div className="relative z-10">
              <InlineNav active="home" />

              <section className="home-hero-stage home-hero-reimagined home-cover-hero min-w-0 overflow-hidden px-4 py-8 sm:px-6 md:px-8 md:py-14">
                <div className="home-cover-issue">Выпуск 01 · Бишкек</div>
                <div className="home-cover-date">Кастинги / люди / локации</div>

                <div className="home-cover-layout">
                  <div className="home-cover-copy">
                    <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/80 bg-white/62 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600 shadow-[0_10px_34px_rgba(15,23,42,0.06)] backdrop-blur sm:text-xs sm:tracking-[0.22em]">
                      <Sparkles size={16} />
                      <span className="truncate">Модный кастинг-дайджест</span>
                    </div>

                    <h1 className="home-cover-title mt-8 text-slate-950">
                      ONSET
                    </h1>
                    <div className="home-cover-headline">
                      Витрина кастингов как обложка модного журнала.
                    </div>
                    <p className="home-cover-lead">
                      Люди, локации и проекты собраны в аккуратную редакционную подборку,
                      где всё выглядит дорого, чисто и понятно с первого взгляда.
                    </p>

                    <div className="home-hero-actions mt-8 flex flex-col gap-3 sm:flex-row">
                      <Link
                        to="/ads"
                        className="inline-flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-full border border-slate-950 bg-slate-950 px-5 text-sm font-bold text-white shadow-[0_18px_46px_rgba(15,23,42,0.20)] transition-transform hover:-translate-y-0.5 sm:w-auto sm:px-6"
                      >
                        Смотреть кастинги
                        <ArrowRight size={18} />
                      </Link>
                      <Link
                        to="/actors"
                        className="inline-flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-full border border-white/80 bg-white/70 px-5 text-sm font-bold text-slate-900 shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur transition-colors hover:bg-white sm:w-auto sm:px-6"
                      >
                        Каталог
                      </Link>
                    </div>
                  </div>

                  <div className="home-cover-side" aria-hidden="true" />
                </div>
              </section>
            </div>
          </div>
        </Container>
      </div>

      <main className="relative z-10 pb-16">
        <Container>
          <section className="-mt-8 rounded-[28px] border border-white/80 bg-white/72 p-3 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur md:rounded-[36px] md:p-4">
            <div className="marquee">
              <div className="marquee__track py-3">
                {[...studios, ...studios].map((studio, idx) => (
                  <span
                    key={`${studio}-${idx}`}
                    className="text-xs font-semibold tracking-wide text-slate-600"
                  >
                    {studio}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="py-12 md:py-16">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
                  Каталог
                </div>
                <h2 className="mt-3 text-3xl font-black text-slate-900 md:text-5xl">
                  Выбирайте как в приложении
                </h2>
                <p className="mt-3 max-w-2xl text-slate-600">
                  Быстрые направления, понятные профили и визуальный выбор без ощущения
                  старой базы данных.
                </p>
              </div>
              <Link
                to="/actors"
                className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-slate-900"
              >
                Открыть каталог
                <ArrowRight size={17} />
              </Link>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {profileDirections.map((item, index) => (
                <Link
                  key={item.title}
                  to={item.to}
                  className="group relative min-h-[300px] overflow-hidden rounded-[28px] border border-white/80 bg-white/72 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur transition-transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-cyan-300/70"
                >
                  <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className={`home-direction-light home-direction-light--${index + 1}`} />
                  </div>
                  <div className="relative flex h-full flex-col justify-between">
                    <div className="flex items-center justify-between gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-900">
                        <img src={item.icon} alt="" className="h-7 w-7" />
                      </div>
                      <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-600">
                        {item.meta}
                      </span>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-slate-900">{item.title}</div>
                      <div className="mt-3 text-sm leading-6 text-slate-600">
                        {item.description}
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
                      Перейти
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="grid gap-5 pb-12 md:grid-cols-[0.9fr_1.1fr] md:pb-16">
            <div className="rounded-[28px] border border-white/80 bg-white/72 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300">
                Процесс
              </div>
              <h2 className="mt-3 text-3xl font-black text-slate-900 md:text-5xl">
                От идеи до команды без хаоса
              </h2>
              <p className="mt-4 text-slate-600">
                Главная задача ONSET — дать ощущение диспетчерской, где видно,
                кто нужен, кто готов и что уже можно брать в работу.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-2">
                <MiniIcon label="Кастинг" icon={<Sparkles size={18} />} />
                <MiniIcon label="Команда" icon={<UsersRound size={18} />} />
                <MiniIcon label="Локации" icon={<MapPin size={18} />} />
              </div>
            </div>

            <div className="grid gap-4">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.id}
                    className="grid gap-4 rounded-[24px] border border-white/80 bg-white/72 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur md:grid-cols-[72px_1fr]"
                  >
                    <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white text-slate-900">
                      <Icon size={26} />
                    </div>
                    <div>
                      <div className="text-xs font-bold tracking-[0.18em] text-slate-500">
                        {step.id}
                      </div>
                      <div className="mt-1 text-xl font-black text-slate-900">{step.title}</div>
                      <div className="mt-2 text-sm leading-6 text-slate-600">{step.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="overflow-hidden rounded-[32px] border border-white/80 bg-white/82 text-slate-900 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur">
            <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="p-6 md:p-10">
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-900">
                  <Sparkles size={15} />
                  Витрина профилей
                </div>
                <h3 className="mt-5 text-3xl font-black md:text-5xl">
                  Публикуйте проект как аккуратную редакционную подборку
                </h3>
                <p className="mt-4 max-w-2xl text-slate-600">
                  Для заказчика это короткий путь от задачи к реальным кандидатам.
                  Для исполнителя — место, где профиль выглядит как витрина, а не анкета.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/auth/register"
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white/80 px-6 text-sm font-bold text-slate-900 hover:bg-white"
                  >
                    Начать бесплатно
                  </Link>
                  <Link
                    to="/ads"
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 px-6 text-sm font-bold text-slate-900 hover:bg-slate-100"
                  >
                    Объявления
                  </Link>
                </div>
              </div>
              <div className="home-cta-editorial home-cta-cover relative min-h-[320px] overflow-hidden bg-white">
                <div className="home-cta-cover-line">Кастинг-отчёт</div>
                <div className="home-cta-cover-title">ONSET</div>
                <div className="home-cta-cover-meta">
                  <span>актёр</span>
                  <span>локация</span>
                  <span>команда</span>
                </div>
              </div>
            </div>
          </section>
        </Container>
      </main>

      <div className="relative z-10">
        <PublicFooter />
      </div>
    </div>
  );
};

const MiniIcon = ({ label, icon }: { label: string; icon: ReactNode }) => (
  <div className="rounded-2xl border border-white/80 bg-white/60 p-3 text-center backdrop-blur">
    <div className="mx-auto grid h-9 w-9 place-items-center rounded-xl bg-white text-slate-900">
      {icon}
    </div>
    <div className="mt-2 text-[11px] font-bold text-slate-600">{label}</div>
  </div>
);
