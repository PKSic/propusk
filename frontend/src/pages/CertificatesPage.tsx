import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Camera,
  FileCheck2,
  FileText,
  Filter,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  ZoomIn,
} from 'lucide-react';
import { api } from '../api/client';
import type { Certificate, CertificateType, Student } from '../types';
import { useToast } from '../components/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { CertificateFormModal } from '../components/CertificateFormModal';
import { CertificatePhotoLightbox } from '../components/CertificatePhotoLightbox';
import {
  CERTIFICATE_TYPE_META,
  formatDateSpan,
} from '../utils/certificateLabels';

export function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<CertificateType | ''>('');
  const [filterStudentId, setFilterStudentId] = useState<string>('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<Certificate | null>(null);
  const [lightboxCert, setLightboxCert] = useState<Certificate | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Certificate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getStudents({ includeArchived: true, sort: 'name_asc' });
        setStudents(res.students);
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Ошибка загрузки списка студентов');
      }
    })();
  }, [showToast]);

  const fetchCertificates = useCallback(async () => {
    try {
      const res = await api.getCertificates({
        search: search || undefined,
        type: filterType || undefined,
        studentId: filterStudentId ? Number(filterStudentId) : undefined,
      });
      setCertificates(res.certificates);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Ошибка загрузки справок');
    } finally {
      setLoading(false);
    }
  }, [search, filterType, filterStudentId, showToast]);

  useEffect(() => {
    const timer = setTimeout(fetchCertificates, 200);
    return () => clearTimeout(timer);
  }, [fetchCertificates]);

  const statsSummary = useMemo(() => {
    const total = certificates.length;
    const withPhoto = certificates.filter((c) => c.hasPhoto).length;
    const totalCoveredHours = certificates.reduce((sum, c) => sum + (c.coveredHours ?? 0), 0);
    return { total, withPhoto, totalCoveredHours };
  }, [certificates]);

  const handleOpenCreate = () => {
    setEditingCert(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (cert: Certificate) => {
    setEditingCert(cert);
    setModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.deleteCertificate(confirmDelete.id);
      setConfirmDelete(null);
      showToast('success', 'Справка удалена, учёт пропусков пересчитан');
      fetchCertificates();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Ошибка удаления справки');
    } finally {
      setDeleting(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setFilterType('');
    setFilterStudentId('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">
            Справки и оправдательные документы
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Учёт справок с фото и автоматическим зачётом уважительных пропусков
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors shadow-md shadow-accent/20"
        >
          <Plus className="h-4 w-4" />
          <span>Добавить справку</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-borderSubtle bg-surface p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Всего справок</div>
            <div className="mt-1 text-2xl font-semibold text-slate-100">{statsSummary.total}</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <FileText className="h-5 w-5" />
          </div>
        </div>
        <div className="rounded-2xl border border-borderSubtle bg-surface p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">С фотографиями</div>
            <div className="mt-1 text-2xl font-semibold text-sky-400">{statsSummary.withPhoto}</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Camera className="h-5 w-5" />
          </div>
        </div>
        <div className="rounded-2xl border border-borderSubtle bg-surface p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Закрыто часов по справкам</div>
            <div className="mt-1 text-2xl font-semibold text-emerald-400">
              {statsSummary.totalCoveredHours} ч
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <FileCheck2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-borderSubtle bg-surface p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-3">
          <Filter className="h-3.5 w-3.5" />
          <span>Поиск и фильтрация</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ФИО, причина, номер..."
              className="w-full rounded-xl border border-borderSubtle bg-elevated pl-10 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none"
            />
          </div>

          <select
            value={filterStudentId}
            onChange={(e) => setFilterStudentId(e.target.value)}
            className="rounded-xl border border-borderSubtle bg-elevated px-3 py-2 text-sm text-slate-200 focus:border-accent focus:outline-none"
          >
            <option value="">Все студенты</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as CertificateType | '')}
            className="rounded-xl border border-borderSubtle bg-elevated px-3 py-2 text-sm text-slate-200 focus:border-accent focus:outline-none"
          >
            <option value="">Все категории</option>
            {(Object.keys(CERTIFICATE_TYPE_META) as CertificateType[]).map((key) => (
              <option key={key} value={key}>
                {CERTIFICATE_TYPE_META[key].label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-borderSubtle bg-elevated px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Сбросить</span>
          </button>
        </div>
      </div>

      {/* Certificates List */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-accent-soft" />
        </div>
      ) : certificates.length === 0 ? (
        <div className="rounded-2xl border border-borderSubtle bg-surface p-10 text-center">
          <FileText className="mx-auto h-9 w-9 text-slate-500" />
          <p className="mt-3 text-sm font-medium text-slate-300">
            Справки пока не добавлены
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Нажмите «Добавить справку», чтобы загрузить фото (необязательно), выбрать студента и указать даты.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {certificates.map((cert) => {
            const typeMeta = CERTIFICATE_TYPE_META[cert.type];
            return (
              <div
                key={cert.id}
                className="rounded-2xl border border-borderSubtle bg-surface p-5 flex flex-col justify-between gap-4 hover:border-slate-700 transition-colors"
              >
                <div className="flex gap-4">
                  {/* Thumbnail or Placeholder */}
                  {cert.hasPhoto ? (
                    <button
                      type="button"
                      onClick={() => setLightboxCert(cert)}
                      className="group relative h-24 w-20 shrink-0 overflow-hidden rounded-xl border border-borderSubtle bg-canvas"
                      title="Открыть фото справки"
                    >
                      <img
                        src={api.getCertificatePhotoUrl(cert.id, cert.updatedAt)}
                        alt={cert.reason}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ZoomIn className="h-5 w-5 text-white" />
                      </div>
                    </button>
                  ) : (
                    <div className="h-24 w-20 shrink-0 rounded-xl border border-dashed border-borderSubtle bg-elevated/40 flex flex-col items-center justify-center text-slate-500">
                      <FileText className="h-6 w-6 opacity-60" />
                      <span className="mt-1 text-[10px]">Без фото</span>
                    </div>
                  )}

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium border ${typeMeta.badgeClass}`}
                      >
                        {typeMeta.shortLabel}
                      </span>
                      {cert.documentNumber && (
                        <span className="text-xs text-slate-400">№ {cert.documentNumber}</span>
                      )}
                    </div>

                    <Link
                      to={`/students/${cert.studentId}`}
                      className="mt-1.5 block truncate text-sm font-semibold text-slate-100 hover:text-accent-soft transition-colors"
                    >
                      {cert.student?.fullName}
                    </Link>

                    <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-300">
                      <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span>{formatDateSpan(cert.dateFrom, cert.dateTo)}</span>
                    </div>

                    <p className="mt-1.5 text-xs text-slate-300 line-clamp-2">
                      <span className="text-slate-500">Причина:</span> {cert.reason}
                    </p>
                    {cert.comment && (
                      <p className="mt-1 text-[11px] text-slate-400 line-clamp-1">
                        {cert.comment}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-borderSubtle/60 text-xs">
                  <div className="text-slate-400">
                    Зачтено пропусков:{' '}
                    <span className="font-semibold text-emerald-400">
                      {cert.coveredHours ?? 0} ч
                    </span>{' '}
                    <span className="text-slate-500">({cert.coveredLessonsCount ?? 0} пар)</span>
                  </div>

                  <div className="inline-flex items-center gap-1">
                    {cert.hasPhoto && (
                      <button
                        type="button"
                        onClick={() => setLightboxCert(cert)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-elevated hover:text-sky-300 transition-colors"
                        title="Посмотреть фото"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cert)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-elevated hover:text-slate-200 transition-colors"
                      title="Редактировать"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(cert)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      title="Удалить справку"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CertificateFormModal
        open={modalOpen}
        students={students}
        editingCertificate={editingCert}
        onClose={() => setModalOpen(false)}
        onSaved={() => fetchCertificates()}
      />

      <CertificatePhotoLightbox
        certificate={lightboxCert}
        onClose={() => setLightboxCert(null)}
      />

      <ConfirmModal
        open={Boolean(confirmDelete)}
        variant="danger"
        title="Удалить справку?"
        description={`Справка студента «${confirmDelete?.student?.fullName}» (${confirmDelete ? formatDateSpan(confirmDelete.dateFrom, confirmDelete.dateTo) : ''}) будет удалена. Пропуски за этот период снова станут неуважительными, если нет другой справки.`}
        confirmLabel="Удалить справку"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
