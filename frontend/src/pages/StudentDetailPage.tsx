import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Loader2, UserCheck } from 'lucide-react';
import { api } from '../api/client';
import type { AttendanceStatus, StudentDetailResponse } from '../types';
import { useToast } from '../components/ToastContext';

type PeriodKey = 'week' | 'month' | 'all' | 'today' | 'custom';

function formatRuDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  if (status === 'PRESENT') {
    return (
      <span className="inline-flex rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
        Присутствовал
      </span>
    );
  }
  if (status === 'HALF_ABSENT') {
    return (
      <span className="inline-flex rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/20">
        Половина пары (1 ч)
      </span>
    );
  }
  if (status === 'ABSENT') {
    return (
      <span className="inline-flex rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400 border border-red-500/20">
        Отсутствовал (2 ч)
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-md bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-400 border border-borderSubtle">
      Не отмечен
    </span>
  );
}

export function StudentDetailPage() {
  const { id } = useParams();
  const studentId = Number(id);

  const [data, setData] = useState<StudentDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'absences'>('all');

  const { showToast } = useToast();

  const fetchDetail = useCallback(
    async (from?: string, to?: string) => {
      if (!Number.isInteger(studentId) || studentId <= 0) return;
      try {
        const res = await api.getStudentDetail(studentId, from, to);
        setData(res);
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Не удалось загрузить профиль студента');
      } finally {
        setLoading(false);
      }
    },
    [studentId, showToast],
  );

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleApplyCustom = () => {
    if (!customFrom || !customTo) {
      showToast('warning', 'Укажите обе даты произвольного периода');
      return;
    }
    setPeriod('custom');
    fetchDetail(customFrom, customTo);
  };

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
        <p className="text-sm text-slate-400">Студент не найден.</p>
        <Link to="/students" className="mt-3 inline-block text-sm text-accent-soft hover:underline">
          Вернуться к списку
        </Link>
      </div>
    );
  }

  const activeStats =
    period === 'custom' && data.periods.custom
      ? data.periods.custom
      : period === 'custom'
        ? data.periods.all
        : data.periods[period];

  const rows = activeTab === 'all' ? data.history : data.absencesHistory;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/students"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Назад к студентам</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-slate-100">
              {data.student.fullName}
            </h1>
            {!data.student.isActive && (
              <span className="rounded-lg bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400 border border-borderSubtle">
                Архив
              </span>
            )}
          </div>
        </div>

        {/* Summary Quick Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="rounded-xl border border-borderSubtle bg-surface px-3 py-2">
            <span className="text-slate-400">За неделю: </span>
            <span className="font-semibold text-slate-100">{data.periods.week.missedHours} ч</span>
          </div>
          <div className="rounded-xl border border-borderSubtle bg-surface px-3 py-2">
            <span className="text-slate-400">За месяц: </span>
            <span className="font-semibold text-slate-100">{data.periods.month.missedHours} ч</span>
          </div>
          <div className="rounded-xl border border-borderSubtle bg-surface px-3 py-2">
            <span className="text-slate-400">Всего: </span>
            <span className="font-semibold text-red-400">{data.periods.all.missedHours} ч</span>
          </div>
        </div>
      </div>

      {/* Period Switcher */}
      <div className="rounded-2xl border border-borderSubtle bg-surface p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'today', label: 'Сегодня' },
            { key: 'week', label: 'Неделя' },
            { key: 'month', label: 'Месяц' },
            { key: 'all', label: 'Всё время' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setPeriod(item.key as PeriodKey)}
              className={`rounded-xl px-3.5 py-2 text-xs font-medium border transition-colors ${
                period === item.key
                  ? 'bg-accent/20 border-accent text-accent-soft'
                  : 'bg-elevated border-borderSubtle text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-500" />
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-xl border border-borderSubtle bg-elevated px-3 py-1.5 text-xs text-slate-200 focus:border-accent focus:outline-none"
          />
          <span className="text-slate-500 text-xs">—</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-xl border border-borderSubtle bg-elevated px-3 py-1.5 text-xs text-slate-200 focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={handleApplyCustom}
            className="rounded-xl border border-borderSubtle bg-elevated px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Применить период
          </button>
        </div>
      </div>

      {/* Period Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-borderSubtle bg-surface p-4">
          <div className="text-xs text-slate-400">Пропущено часов</div>
          <div className="mt-2 text-2xl font-semibold text-red-400">{activeStats.missedHours} ч</div>
        </div>
        <div className="rounded-2xl border border-borderSubtle bg-surface p-4">
          <div className="text-xs text-slate-400">Посещаемость</div>
          <div className="mt-2 text-2xl font-semibold text-emerald-400">
            {activeStats.attendanceRate !== null ? `${activeStats.attendanceRate}%` : '—'}
          </div>
        </div>
        <div className="rounded-2xl border border-borderSubtle bg-surface p-4">
          <div className="text-xs text-slate-400">Посещено пар</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">{activeStats.presentCount}</div>
        </div>
        <div className="rounded-2xl border border-borderSubtle bg-surface p-4">
          <div className="text-xs text-slate-400">Полные пропуски</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">{activeStats.absentCount}</div>
        </div>
        <div className="rounded-2xl border border-borderSubtle bg-surface p-4">
          <div className="text-xs text-slate-400">Половины пар</div>
          <div className="mt-2 text-2xl font-semibold text-amber-400">
            {activeStats.halfAbsentCount}
          </div>
        </div>
      </div>

      {/* History Tabs */}
      <div className="rounded-2xl border border-borderSubtle bg-surface overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-borderSubtle">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-accent/15 text-accent-soft border border-accent/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              История занятий ({data.history.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('absences')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'absences'
                  ? 'bg-red-500/15 text-red-300 border border-red-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              История пропусков ({data.absencesHistory.length})
            </button>
          </div>
          <UserCheck className="h-4 w-4 text-slate-500" />
        </div>

        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">Записей не найдено.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-borderSubtle bg-elevated/50 text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3 font-medium">Дата</th>
                  <th className="px-5 py-3 font-medium">Предмет</th>
                  <th className="px-5 py-3 font-medium">Пара</th>
                  <th className="px-5 py-3 font-medium">Статус</th>
                  <th className="px-5 py-3 font-medium text-right">Пропущено</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderSubtle/60">
                {rows.map((item) => (
                  <tr key={item.id} className="hover:bg-elevated/40 transition-colors">
                    <td className="px-5 py-3 text-slate-300 whitespace-nowrap">
                      {formatRuDate(item.date)}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-100">
                      <Link
                        to={`/attendance?lessonId=${item.lessonId}`}
                        className="hover:text-accent-soft transition-colors"
                      >
                        {item.subject.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-400">{item.lessonNumber} пара</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-5 py-3 text-right text-slate-300 font-medium">
                      {item.missedHours} ч
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
