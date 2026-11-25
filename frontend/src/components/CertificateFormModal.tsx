import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  FileText,
  ImagePlus,
  Loader2,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { api } from '../api/client';
import type { Certificate, CertificateType, Student } from '../types';
import { useToast } from './ToastContext';
import {
  compressCertificateImage,
  formatBytes,
  type CompressedImageResult,
} from '../utils/imageCompression';
import {
  CERTIFICATE_REASON_PRESETS,
  CERTIFICATE_TYPE_META,
} from '../utils/certificateLabels';

interface CertificateFormModalProps {
  open: boolean;
  students: Student[];
  editingCertificate?: Certificate | null;
  defaultStudentId?: number;
  onClose: () => void;
  onSaved: (certificate: Certificate, linkedUpdatedCount: number) => void;
}

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function CertificateFormModal({
  open,
  students,
  editingCertificate,
  defaultStudentId,
  onClose,
  onSaved,
}: CertificateFormModalProps) {
  const isEditing = Boolean(editingCertificate);
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<'photo' | 'details'>('photo');
  const [compressing, setCompressing] = useState(false);
  const [compressedInfo, setCompressedInfo] = useState<CompressedImageResult | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [studentId, setStudentId] = useState<number | ''>('');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);

  const [dateFrom, setDateFrom] = useState(getTodayIso);
  const [dateTo, setDateTo] = useState(getTodayIso);
  const [reason, setReason] = useState('');
  const [type, setType] = useState<CertificateType>('MEDICAL');
  const [documentNumber, setDocumentNumber] = useState('');
  const [comment, setComment] = useState('');

  const [impact, setImpact] = useState<{ lessonsCount: number; missedHours: number } | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [saving, setSaving] = useState(false);

  // Инициализация состояния при открытии модального окна
  useEffect(() => {
    if (!open) return;

    if (editingCertificate) {
      setStep('details');
      setStudentId(editingCertificate.studentId);
      const matched = students.find((s) => s.id === editingCertificate.studentId);
      setStudentSearch(matched?.fullName || editingCertificate.student?.fullName || '');
      setDateFrom(editingCertificate.dateFrom);
      setDateTo(editingCertificate.dateTo);
      setReason(editingCertificate.reason);
      setType(editingCertificate.type);
      setDocumentNumber(editingCertificate.documentNumber || '');
      setComment(editingCertificate.comment || '');
      setCompressedInfo(null);
      setPhotoRemoved(false);
    } else {
      const today = getTodayIso();
      setStep('photo');
      setCompressedInfo(null);
      setPhotoRemoved(false);
      if (defaultStudentId) {
        setStudentId(defaultStudentId);
        const matched = students.find((s) => s.id === defaultStudentId);
        setStudentSearch(matched?.fullName || '');
      } else {
        setStudentId('');
        setStudentSearch('');
      }
      setDateFrom(today);
      setDateTo(today);
      setReason('');
      setType('MEDICAL');
      setDocumentNumber('');
      setComment('');
    }
    setStudentDropdownOpen(false);
    setImpact(null);
  }, [open, editingCertificate, defaultStudentId, students]);

  // Актуальный URL превью фото (новое сжатое или существующее с сервера)
  const photoPreviewUrl = useMemo(() => {
    if (compressedInfo) return compressedInfo.dataUrl;
    if (editingCertificate?.hasPhoto && !photoRemoved) {
      return api.getCertificatePhotoUrl(editingCertificate.id, editingCertificate.updatedAt);
    }
    return null;
  }, [compressedInfo, editingCertificate, photoRemoved]);

  // Фильтрованный список студентов для быстрого поиска ФИО
  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    const list = students;
    if (!q) return list;
    return list.filter((s) => s.fullName.toLowerCase().includes(q));
  }, [students, studentSearch]);

  // Предварительный расчёт пропусков студента за выбранный период справки
  useEffect(() => {
    if (!open || step !== 'details' || typeof studentId !== 'number' || !dateFrom || !dateTo) {
      setImpact(null);
      return;
    }
    if (dateFrom > dateTo) {
      setImpact(null);
      return;
    }

    let active = true;
    setLoadingImpact(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.previewCertificateImpact(studentId, dateFrom, dateTo);
        if (active) setImpact(res);
      } catch {
        if (active) setImpact(null);
      } finally {
        if (active) setLoadingImpact(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, step, studentId, dateFrom, dateTo]);

  // Поддержка вставки скриншота/фото из буфера обмена (Ctrl+V)
  useEffect(() => {
    if (!open) return;
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            await processPhotoFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  });

  const processPhotoFile = async (file: File) => {
    setCompressing(true);
    try {
      const compressed = await compressCertificateImage(file);
      setCompressedInfo(compressed);
      setPhotoRemoved(false);
      setStep('details');
      showToast(
        'success',
        `Фото сжато (${formatBytes(compressed.originalBytes)} -> ${formatBytes(compressed.compressedBytes)})`,
      );
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Не удалось обработать фото');
    } finally {
      setCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processPhotoFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processPhotoFile(file);
    }
  };

  const handleDateFromChange = (nextFrom: string) => {
    setDateFrom(nextFrom);
    if (!dateTo || dateTo === dateFrom || dateTo < nextFrom) {
      setDateTo(nextFrom);
    }
  };

  const handleSelectStudent = (s: Student) => {
    setStudentId(s.id);
    setStudentSearch(s.fullName);
    setStudentDropdownOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof studentId !== 'number') {
      showToast('warning', 'Выберите ФИО студента из списка');
      return;
    }
    if (!dateFrom || !dateTo) {
      showToast('warning', 'Укажите даты начала и окончания справки');
      return;
    }
    if (dateFrom > dateTo) {
      showToast('warning', 'Дата начала не может быть позже даты окончания');
      return;
    }
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 2) {
      showToast('warning', 'Укажите причину со справки (минимум 2 символа)');
      return;
    }

    setSaving(true);
    try {
      let photoDataPayload: string | null | undefined = undefined;
      if (compressedInfo) {
        photoDataPayload = compressedInfo.dataUrl;
      } else if (photoRemoved) {
        photoDataPayload = null;
      }

      if (editingCertificate) {
        const res = await api.updateCertificate(editingCertificate.id, {
          studentId,
          dateFrom,
          dateTo,
          reason: trimmedReason,
          type,
          documentNumber: documentNumber.trim() || null,
          comment: comment.trim() || null,
          ...(photoDataPayload !== undefined ? { photoData: photoDataPayload } : {}),
        });
        showToast('success', 'Справка обновлена, пропуски синхронизированы');
        onSaved(res.certificate, res.linkedUpdatedCount);
      } else {
        const res = await api.createCertificate({
          studentId,
          dateFrom,
          dateTo,
          reason: trimmedReason,
          type,
          documentNumber: documentNumber.trim() || null,
          comment: comment.trim() || null,
          photoData: photoDataPayload ?? null,
        });
        const msg =
          res.linkedUpdatedCount > 0
            ? `Справка сохранена. Отмечено уважительными пар: ${res.linkedUpdatedCount}`
            : 'Справка сохранена в базу данных';
        showToast('success', msg);
        onSaved(res.certificate, res.linkedUpdatedCount);
      }
      onClose();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Ошибка сохранения справки');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div
        className={`w-full ${
          step === 'details' && photoPreviewUrl ? 'max-w-5xl' : 'max-w-2xl'
        } max-h-[92vh] flex flex-col rounded-2xl border border-borderSubtle bg-surface shadow-2xl overflow-hidden transition-all`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-borderSubtle">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 border border-accent/30 text-accent-soft">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                {isEditing ? 'Редактирование справки' : 'Добавление справки'}
              </h3>
              <p className="text-xs text-slate-400">
                {step === 'photo'
                  ? 'Шаг 1 из 2 • Загрузите фото документа (необязательно)'
                  : photoPreviewUrl
                    ? 'Шаг 2 из 2 • Спишите данные с фото и сохраните'
                    : 'Шаг 2 из 2 • Заполните данные со справки'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-elevated hover:text-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Hidden Shared File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'photo' ? (
            <div className="space-y-5">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !compressing && fileInputRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
                  dragOver
                    ? 'border-accent bg-accent/10'
                    : 'border-borderSubtle bg-elevated/50 hover:border-slate-600 hover:bg-elevated'
                }`}
              >
                {compressing ? (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <Loader2 className="h-9 w-9 animate-spin text-accent-soft" />
                    <div className="text-sm font-medium text-slate-200">
                      Сжимаем фотографию для быстрого сохранения...
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 border border-accent/25 text-accent-soft">
                      <Camera className="h-7 w-7" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-100">
                        Нажмите, перетащите фото или вставьте через Ctrl+V
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        После загрузки фото останется перед глазами, чтобы удобно заполнить ФИО, даты и причину
                      </p>
                    </div>
                    <div className="mt-1 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-medium text-white">
                      <Upload className="h-3.5 w-3.5" />
                      <span>Выбрать фото справки</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  Фото сжимается автоматически до ~150 КБ и хранится в PostgreSQL
                </span>
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="inline-flex items-center gap-2 rounded-xl border border-borderSubtle bg-elevated px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <span>Пропустить (без фото)</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <form
              id="certificate-details-form"
              onSubmit={handleSubmit}
              className={`grid grid-cols-1 ${photoPreviewUrl ? 'lg:grid-cols-12 gap-6' : 'gap-5'}`}
            >
              {/* Left Column: Photo Preview when available */}
              {photoPreviewUrl && (
                <div className="lg:col-span-5 flex flex-col gap-3">
                  <div className="rounded-2xl border border-borderSubtle bg-canvas p-3 flex flex-col items-center">
                    <img
                      src={photoPreviewUrl}
                      alt="Предпросмотр справки"
                      className="max-h-[380px] w-full rounded-xl object-contain"
                    />
                    {compressedInfo && (
                      <div className="mt-2 text-[11px] text-slate-400">
                        Сжато: {formatBytes(compressedInfo.compressedBytes)} ({compressedInfo.width}×{compressedInfo.height})
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={compressing}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-borderSubtle bg-elevated px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                      {compressing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ImagePlus className="h-3.5 w-3.5" />
                      )}
                      <span>Заменить фото</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCompressedInfo(null);
                        setPhotoRemoved(true);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-500/20 transition-colors"
                      title="Убрать фото"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Убрать</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Right Column: Data Form */}
              <div className={`${photoPreviewUrl ? 'lg:col-span-7' : ''} space-y-4`}>
                {!photoPreviewUrl && (
                  <div className="flex items-center justify-between rounded-xl border border-dashed border-borderSubtle bg-elevated/40 px-4 py-2.5">
                    <span className="text-xs text-slate-400">
                      Фото не прикреплено (можно вставить Ctrl+V в любой момент)
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={compressing}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-borderSubtle bg-elevated px-2.5 py-1 text-xs font-medium text-accent-soft hover:bg-slate-800 transition-colors"
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      <span>Добавить фото</span>
                    </button>
                  </div>
                )}

                {/* Searchable Student ФИО Picker */}
                <div className="relative">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    ФИО студента *
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      value={studentSearch}
                      onFocus={() => setStudentDropdownOpen(true)}
                      onChange={(e) => {
                        setStudentSearch(e.target.value);
                        setStudentId('');
                        setStudentDropdownOpen(true);
                      }}
                      placeholder="Начните вводить фамилию студента..."
                      className="w-full rounded-xl border border-borderSubtle bg-elevated pl-10 pr-9 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none"
                    />
                    {typeof studentId === 'number' && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
                    )}
                  </div>

                  {studentDropdownOpen && (
                    <div className="absolute z-20 mt-1.5 w-full max-h-52 overflow-y-auto rounded-xl border border-borderSubtle bg-elevated shadow-xl divide-y divide-borderSubtle/50">
                      {filteredStudents.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-slate-500">
                          Студент не найден в списке группы
                        </div>
                      ) : (
                        filteredStudents.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleSelectStudent(s)}
                            className={`w-full flex items-center justify-between px-3.5 py-2 text-left text-sm transition-colors ${
                              studentId === s.id
                                ? 'bg-accent/20 text-accent-soft font-medium'
                                : 'text-slate-200 hover:bg-surface'
                            }`}
                          >
                            <span>
                              {s.fullName}
                              {!s.isActive && (
                                <span className="ml-2 text-[11px] text-slate-500">(архив)</span>
                              )}
                            </span>
                            {studentId === s.id && <Check className="h-4 w-4 shrink-0" />}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Дата со справки (с) *
                    </label>
                    <div className="relative">
                      <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => handleDateFromChange(e.target.value)}
                        required
                        className="w-full rounded-xl border border-borderSubtle bg-elevated pl-9 pr-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Дата со справки (по) *
                    </label>
                    <div className="relative">
                      <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        type="date"
                        value={dateTo}
                        min={dateFrom}
                        onChange={(e) => setDateTo(e.target.value)}
                        required
                        className="w-full rounded-xl border border-borderSubtle bg-elevated pl-9 pr-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Impact Banner */}
                {typeof studentId === 'number' && dateFrom && dateTo && dateFrom <= dateTo && (
                  <div
                    className={`rounded-xl border px-3.5 py-2 text-xs ${
                      impact && impact.missedHours > 0
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                        : 'bg-elevated/60 border-borderSubtle text-slate-400'
                    }`}
                  >
                    {loadingImpact ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Проверяем пропуски за выбранный период...
                      </span>
                    ) : impact && impact.missedHours > 0 ? (
                      <span>
                        За эти даты уже зафиксировано пропусков: <strong>{impact.lessonsCount} пар</strong> (
                        <strong>{impact.missedHours} ч</strong>) — они автоматически станут уважительными.
                      </span>
                    ) : (
                      <span>
                        За эти даты пропусков пока нет — справка автоматически зачтёт уважительную причину, если появятся отметки.
                      </span>
                    )}
                  </div>
                )}

                {/* Reason */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Причина со справки *
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Например: ОРВИ, приём у стоматолога, освобождение на соревнования..."
                    required
                    className="w-full rounded-xl border border-borderSubtle bg-elevated px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {CERTIFICATE_REASON_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setReason(preset)}
                        className="rounded-lg border border-borderSubtle bg-elevated/80 px-2.5 py-1 text-[11px] text-slate-300 hover:border-accent/40 hover:text-white transition-colors"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Extra DB Fields: Type + Document Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Категория документа
                    </label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as CertificateType)}
                      className="w-full rounded-xl border border-borderSubtle bg-elevated px-3 py-2.5 text-sm text-slate-100 focus:border-accent focus:outline-none"
                    >
                      {(Object.keys(CERTIFICATE_TYPE_META) as CertificateType[]).map((key) => (
                        <option key={key} value={key}>
                          {CERTIFICATE_TYPE_META[key].label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Номер справки (необязательно)
                    </label>
                    <input
                      type="text"
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                      placeholder="Например: № 095/у-412"
                      className="w-full rounded-xl border border-borderSubtle bg-elevated px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Комментарий (необязательно)
                  </label>
                  <textarea
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Кем выдана, заметка куратора..."
                    className="w-full rounded-xl border border-borderSubtle bg-elevated px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none resize-none"
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {step === 'details' && (
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-borderSubtle bg-elevated/40">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setStep('photo')}
                className="rounded-xl border border-borderSubtle bg-surface px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-elevated transition-colors"
              >
                Назад к фото
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-borderSubtle bg-elevated px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                form="certificate-details-form"
                disabled={saving || compressing}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{isEditing ? 'Сохранить изменения' : 'Сохранить справку'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
