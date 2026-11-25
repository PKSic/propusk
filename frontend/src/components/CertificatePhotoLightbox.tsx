import { X, ZoomIn } from 'lucide-react';
import { api } from '../api/client';
import type { Certificate } from '../types';
import { formatDateSpan } from '../utils/certificateLabels';

export function CertificatePhotoLightbox({
  certificate,
  onClose,
}: {
  certificate: Certificate | null;
  onClose: () => void;
}) {
  if (!certificate || !certificate.hasPhoto) return null;

  const photoUrl = api.getCertificatePhotoUrl(certificate.id, certificate.updatedAt);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-borderSubtle bg-surface shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-borderSubtle">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100 truncate">
              <ZoomIn className="h-4 w-4 text-accent-soft shrink-0" />
              <span className="truncate">
                {certificate.student?.fullName || 'Фото справки'}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {formatDateSpan(certificate.dateFrom, certificate.dateTo)} • {certificate.reason}
              {certificate.documentNumber ? ` • № ${certificate.documentNumber}` : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-elevated hover:text-slate-100 transition-colors"
            aria-label="Закрыть просмотр"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-canvas/90 p-4 flex items-center justify-center">
          <img
            src={photoUrl}
            alt={`Справка: ${certificate.reason}`}
            className="max-h-[75vh] w-auto rounded-lg object-contain border border-borderSubtle"
          />
        </div>
      </div>
    </div>
  );
}
