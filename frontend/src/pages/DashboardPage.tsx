import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  BookOpenCheck,
  CalendarClock,
  Clock,
  Loader2,
  TrendingDown,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../api/client';
import type { DashboardData } from '../types';
import { useToast } from '../components/ToastContext';

function formatRuDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

function formatShortDate(dateStr: string) {
  const [, m, d] = dateStr.split('-');
  return `${d}.${m}`;
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.getDashboard();
        if (active) setData(res);
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Не удалось загрузить аналитику');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [showToast]);

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-accent-soft" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-borderSubtle bg-surface p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-slate-400" />
        <p className="mt-2 text-sm text-slate-400">Данные панели управления недоступны.</p>
      </div>
    );
  }

  const kpiCards = [
    {
      label: 'Всего студентов',
      value: data.kpi.totalStudents,
      sub: 'Активный состав группы',
      icon: Users,
      accent: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      label: 'Занятий за месяц',
      value: data.kpi.lessonsThisMonth,
      sub: `${formatRuDate(data.kpi.monthRange.from)} — ${formatRuDate(data.kpi.monthRange.to)}`,
      icon: BookOpenCheck,
      accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'Пропущено за неделю',
      value: `${data.kpi.missedHoursThisWeek} ч`,
      sub: `Уваж: ${data.kpi.excusedHoursThisWeek} ч • Неуваж: ${data.kpi.unexcusedHoursThisWeek} ч`,
      icon: Clock,
      accent: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      label: 'Пропущено за месяц',
      value: `${data.kpi.missedHoursThisMonth} ч`,
      sub: `Уваж: ${data.kpi.excusedHoursThisMonth} ч • Неуваж: ${data.kpi.unexcusedHoursThisMonth} ч`,
      icon: CalendarClock,
      accent: 'text-red-400 bg-red-500/10 border-red-500/20',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">
            Обзор посещаемости
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Актуальная сводка группы ВЕБ-32К по данным PostgreSQL
          </p>
        </div>
        <Link
          to="/attendance"
          className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          Отметить посещаемость
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-borderSubtle bg-surface p-5 transition-colors hover:border-slate-700"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{card.label}</span>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${card.accent}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-100">
                {card.value}
              </div>
              <div className="mt-1 text-xs text-slate-500">{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Chart + Top Absentees */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-borderSubtle bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Динамика пропусков по дням
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Пропущенные академические часы за последние 30 дней
              </p>
            </div>
          </div>

          {data.dailyChart.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-500">
              За последние 30 дней занятий ещё не зафиксировано
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.dailyChart} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="missedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#242938" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    stroke="#64748B"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748B"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#181C27',
                      borderColor: '#242938',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#F1F5F9',
                    }}
                    labelFormatter={(label) => `Дата: ${formatRuDate(String(label))}`}
                    formatter={(value: number) => [`${value} ч`, 'Пропущено часов']}
                  />
                  <Area
                    type="monotone"
                    dataKey="missedHours"
                    stroke="#6366F1"
                    strokeWidth={2}
                    fill="url(#missedGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Ranking */}
        <div className="rounded-2xl border border-borderSubtle bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Рейтинг пропусков</h2>
              <p className="text-xs text-slate-400 mt-0.5">Студенты с наибольшими пропусками</p>
            </div>
            <TrendingDown className="h-4 w-4 text-slate-400" />
          </div>

          {data.topAbsentees.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Нет данных о студентах
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.topAbsentees.map((student, idx) => (
                <Link
                  key={student.id}
                  to={`/students/${student.id}`}
                  className="flex items-center justify-between rounded-xl border border-borderSubtle/70 bg-elevated/60 px-3.5 py-2.5 hover:border-accent/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface text-xs font-semibold text-slate-400 border border-borderSubtle">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-200">
                        {student.fullName}
                      </div>
                      <div className="text-xs text-slate-500">
                        Посещаемость:{' '}
                        {student.attendanceRate !== null ? `${student.attendanceRate}%` : '—'}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right ml-3">
                    <span className="text-sm font-semibold text-red-400">
                      {student.missedHours} ч
                    </span>
                    <div className="text-[11px] text-slate-500">
                      <span className="text-sky-400">{student.excusedMissedHours} ув.</span>
                      {' / '}
                      <span>{student.unexcusedMissedHours} неув.</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Lessons */}
      <div className="rounded-2xl border border-borderSubtle bg-surface overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-borderSubtle">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Последние занятия</h2>
            <p className="text-xs text-slate-400 mt-0.5">Недавно проведённые учебные пары</p>
          </div>
          <Link
            to="/history"
            className="text-xs font-medium text-accent-soft hover:text-indigo-300 transition-colors"
          >
            Вся история
          </Link>
        </div>

        {data.recentLessons.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Проведённых занятий пока нет. Начните с отметки посещаемости.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-borderSubtle bg-elevated/50 text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3 font-medium">Дата</th>
                  <th className="px-5 py-3 font-medium">Предмет</th>
                  <th className="px-5 py-3 font-medium">Пара</th>
                  <th className="px-5 py-3 font-medium">Присутствовали</th>
                  <th className="px-5 py-3 font-medium">Отсутствовали</th>
                  <th className="px-5 py-3 font-medium text-right">Пропущено часов</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderSubtle/60">
                {data.recentLessons.map((lesson) => (
                  <tr
                    key={lesson.id}
                    className="hover:bg-elevated/40 transition-colors"
                  >
                    <td className="px-5 py-3.5 text-slate-300 whitespace-nowrap">
                      {formatRuDate(lesson.date)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-100">
                      <Link
                        to={`/attendance?lessonId=${lesson.id}`}
                        className="hover:text-accent-soft transition-colors"
                      >
                        {lesson.subject.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap">
                      {lesson.lessonNumber} пара
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                        {lesson.presentCount}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400 border border-red-500/20">
                        {lesson.absentCount}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-300">
                      {lesson.missedHours} ч
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
