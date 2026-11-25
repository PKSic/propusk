import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  FileCheck2,
  FileText,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserCheck,
  ZoomIn,
} from 'lucide-react';
import { api } from '../api/client';
import type {
  AttendanceStatus,
  Certificate,
  Student,
  StudentDetailResponse,
} from '../types';
import { useToast } from '../components/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { CertificateFormModal } from '../components/CertificateFormModal';
import { CertificatePhotoLightbox } from '../components/CertificatePhotoLightbox';
import {
  CERTIFICATE_TYPE_META,
  formatDateSpan,
  formatRuDate,
} from '../utils/certificateLabels';

type PeriodKey = 'week' | 'month' | 'all' | 'today' | 'custom';

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
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'absences'>('all');

  const [certModalOpen, setCertModalOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<Certificate | null>(null);
  const [lightboxCert, setLightboxCert] = useState<Certificate | null>(null);
  const [confirmDeleteCert, setConfirmDeleteCert] = useState<Certificate | null>(null);
  const [deletingCert, setDeletingCert] = useState(false);
  const [togglingAttendanceId, setTogglingAttendanceId] = useState<number | null>(null);

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
    api
      .getStudents({ includeArchived: true, sort: 'name_asc' })
      .then((res) => setAllStudents(res.students))
      .catch(() => {});
  }, [fetchDetail]);

  const handleApplyCustom = () => {
    if (!customFrom || !customTo) {
      showToast('warning', 'Укажите обе даты произвольного периода');
      return;
    }
    setPeriod('custom');
    fetchDetail(customFrom, customTo);
  };

  const handleToggleExcused = async (attendanceId: number, currentExcused: boolean) => {
    setTogglingAttendanceId(attendanceId);
    try {
      await api.toggleAttendanceExcused(attendanceId, !currentExcused);
      showToast(
        'success',
        !currentExcused ? 'Пропуск отмечен как уважительный' : 'Отметка уважительности снята',
      );
      await fetchDetail(
        period === 'custom' ? customFrom || undefined : undefined,
        period === 'custom' ? customTo || undefined : undefined,
      );
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Не удалось обновить статус пропуска');
    } finally {
      setTogglingAttendanceId(null);
    }
  };

  const handleDeleteCertConfirm = async () => {
    if (!confirmDeleteCert) return;
    setDeletingCert(true);
    try {
      await api.deleteCertificate(confirmDeleteCert.id);
      setConfirmDeleteCert(null);
      showToast('success', 'Справка удалена, статистика пересчитана');
      await fetchDetail(
        period === 'custom' ? customFrom || undefined : undefined,
        period === 'custom' ? customTo || undefined : undefined,
      );
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Ошибка удаления справки');
    } finally {
      setDeletingCert(false);
    }
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
            <span className="ml-1.5 text-slate-400">
              (<span className="text-sky-400">{data.periods.all.excusedMissedHours} ув.</span>
              {' / '}
              <span className="text-red-300">{data.periods.all.unexcusedMissedHours} неув.</span>)
            </span>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="rounded-2xl border border-borderSubtle bg-surface p-4">
          <div className="text-xs text-slate-400">Всего пропущено</div>
          <div className="mt-2 text-2xl font-semibold text-red-400">{activeStats.missedHours} ч</div>
        </div>
        <div className="rounded-2xl border border-borderSubtle bg-surface p-4">
          <div className="text-xs text-slate-400">По уважительной</div>
          <div className="mt-2 text-2xl font-semibold text-sky-400">
            {activeStats.excusedMissedHours} ч
          </div>
        </div>
        <div className="rounded-2xl border border-borderSubtle bg-surface p-4">
          <div className="text-xs text-slate-400">По неуважительной</div>
          <div className="mt-2 text-2xl font-semibold text-rose-400">
            {activeStats.unexcusedMissedHours} ч
          </div>
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
          <div className="text-xs text-slate-400">Пропуски (2ч / 1ч)</div>
          <div className="mt-2 text-2xl font-semibold text-amber-400">
            {activeStats.absentCount} / {activeStats.halfAbsentCount}
          </div>
        </div>
      </div>

      {/* Student Certificates Section */}
      <div className="rounded-2xl border border-borderSubtle bg-surface overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-borderSubtle">
          <div className="flex items-center gap-2.5">
            <FileCheck2 className="h-4 w-4 text-sky-400" />
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Справки студента ({data.certificates.length})
              </h2>
              <p className="text-xs text-slate-400">
                Оправдательные документы, автоматически зачитывающие пропуски в период действия
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingCert(null);
              setCertModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-xs font-medium text-white hover:bg-accent-hover transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Добавить справку</span>
          </button>
        </div>

        {data.certificates.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            У этого студента пока нет добавленных справок.
          </div>
        ) : (
          <div className="divide-y divide-borderSubtle/60">
            {data.certificates.map((cert) => {
              const typeMeta = CERTIFICATE_TYPE_META[cert.type];
              return (
                <div
                  key={cert.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 hover:bg-elevated/40 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {cert.hasPhoto ? (
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxCert({
                            ...cert,
                            student: {
                              id: data.student.id,
                              fullName: data.student.fullName,
                              isActive: data.student.isActive,
                            },
                          })
                        }
                        className="group relative h-14 w-12 shrink-0 overflow-hidden rounded-lg border border-borderSubtle bg-canvas"
                        title="Посмотреть фото справки"
                      >
                        <img
                          src={api.getCertificatePhotoUrl(cert.id, cert.updatedAt)}
                          alt={cert.reason}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ZoomIn className="h-4 w-4 text-white" />
                        </div>
                      </button>
                    ) : (
                      <div className="h-14 w-12 shrink-0 rounded-lg border border-dashed border-borderSubtle bg-elevated/40 flex items-center justify-center text-slate-500">
                        <FileText className="h-4 w-4 opacity-60" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium border ${typeMeta.badgeClass}`}
                        >
                          {typeMeta.shortLabel}
                        </span>
                        <span className="text-xs font-medium text-slate-200">
                          {formatDateSpan(cert.dateFrom, cert.dateTo)}
                        </span>
                        {cert.documentNumber && (
                          <span className="text-xs text-slate-400">№ {cert.documentNumber}</span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-slate-200">{cert.reason}</div>
                      {cert.comment && (
                        <div className="mt-0.5 text-xs text-slate-400">{cert.comment}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 self-end sm:self-center">
                    {cert.hasPhoto && (
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxCert({
                            ...cert,
                            student: {
                              id: data.student.id,
                              fullName: data.student.fullName,
                              isActive: data.student.isActive,
                            },
                          })
                        }
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-elevated hover:text-sky-300 transition-colors"
                        title="Открыть фото"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCert({
                          ...cert,
                          student: {
                            id: data.student.id,
                            fullName: data.student.fullName,
                            isActive: data.student.isActive,
                          },
                        });
                        setCertModalOpen(true);
                      }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-elevated hover:text-slate-200 transition-colors"
                      title="Редактировать"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteCert(cert)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      title="Удалить справку"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
                  <th className="px-5 py-3 font-medium">Причина / уважительность</th>
                  <th className="px-5 py-3 font-medium text-right">Пропущено</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderSubtle/60">
                {rows.map((item) => {
                  const isMissed = item.status === 'ABSENT' || item.status === 'HALF_ABSENT';
                  return (
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
                      <td className="px-5 py-3 text-slate-400 whitespace-nowrap">
                        {item.lessonNumber} пара
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-5 py-3">
                        {isMissed ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={togglingAttendanceId === item.id}
                              onClick={() => handleToggleExcused(item.id, item.isExcused)}
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium border transition-colors disabled:opacity-50 ${
                                item.isExcused
                                  ? 'bg-sky-500/15 text-sky-300 border-sky-500/25 hover:bg-sky-500/25'
                                  : 'bg-elevated text-slate-400 border-borderSubtle hover:text-slate-200'
                              }`}
                              title="Нажмите, чтобы переключить уважительность пропуска"
                            >
                              {togglingAttendanceId === item.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <ShieldCheck className="h-3 w-3" />
                              )}
                              <span>
                                {item.certificate
                                  ? 'По справке'
                                  : item.isExcused
                                    ? 'Уважительная'
                                    : 'Неуважительная'}
                              </span>
                            </button>
                            {item.certificate && (
                              <span className="text-xs text-slate-400 truncate max-w-[200px]">
                                {item.certificate.reason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-300 font-medium whitespace-nowrap">
                        {item.missedHours} ч
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CertificateFormModal
        open={certModalOpen}
        students={allStudents}
        editingCertificate={editingCert}
        defaultStudentId={data.student.id}
        onClose={() => setCertModalOpen(false)}
        onSaved={() =>
          fetchDetail(
            period === 'custom' ? customFrom || undefined : undefined,
            period === 'custom' ? customTo || undefined : undefined,
          )
        }
      />

      <CertificatePhotoLightbox
        certificate={lightboxCert}
        onClose={() => setLightboxCert(null)}
      />

      <ConfirmModal
        open={Boolean(confirmDeleteCert)}
        variant="danger"
        title="Удалить справку?"
        description={`Справка (${confirmDeleteCert ? formatDateSpan(confirmDeleteCert.dateFrom, confirmDeleteCert.dateTo) : ''}) будет удалена, а покрытые ею пропуски снова станут неуважительными.`}
        confirmLabel="Удалить"
        loading={deletingCert}
        onConfirm={handleDeleteCertConfirm}
        onCancel={() => setConfirmDeleteCert(null)}
      />
    </div>
  );
}
