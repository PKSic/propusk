import type { CertificateType } from '../types';

export const CERTIFICATE_TYPE_META: Record<
  CertificateType,
  { label: string; shortLabel: string; badgeClass: string }
> = {
  MEDICAL: {
    label: 'Медицинская справка',
    shortLabel: 'Болезнь',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/25',
  },
  EXEMPTION: {
    label: 'Освобождение / мероприятие',
    shortLabel: 'Освобождение',
    badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25',
  },
  FAMILY: {
    label: 'Заявление / семейные обстоятельства',
    shortLabel: 'Заявление',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  },
  OTHER: {
    label: 'Иная уважительная причина',
    shortLabel: 'Другое',
    badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/25',
  },
};

export const CERTIFICATE_REASON_PRESETS = [
  'ОРВИ / заболевание',
  'Приём у врача / обследование',
  'Участие в мероприятии / олимпиаде',
  'Семейные обстоятельства',
];

export function formatRuDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

export function formatDateSpan(dateFrom: string, dateTo: string): string {
  if (dateFrom === dateTo) return formatRuDate(dateFrom);
  return `${formatRuDate(dateFrom)} — ${formatRuDate(dateTo)}`;
}
