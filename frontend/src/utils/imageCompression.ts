export interface CompressedImageResult {
  dataUrl: string;
  mimeType: string;
  originalBytes: number;
  compressedBytes: number;
  width: number;
  height: number;
}

const MAX_INPUT_FILE_BYTES = 20 * 1024 * 1024;
const TARGET_MAX_DATA_URL_LENGTH = 900_000;

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Не удалось прочитать изображение'));
    img.src = src;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Ошибка чтения файла'));
      }
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsDataURL(file);
  });
}

function estimateBase64Bytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return 0;
  const base64 = dataUrl.slice(commaIdx + 1);
  return Math.round((base64.length * 3) / 4);
}

/**
 * Сжимает изображение на клиенте перед отправкой в PostgreSQL (Neon),
 * сохраняя читаемость текста на справках и укладываясь в лимиты Vercel.
 */
export async function compressCertificateImage(file: File): Promise<CompressedImageResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Выберите файл изображения (JPEG, PNG или WebP)');
  }
  if (file.size > MAX_INPUT_FILE_BYTES) {
    throw new Error('Размер исходного файла превышает 20 МБ');
  }

  const rawDataUrl = await readFileAsDataUrl(file);
  const img = await loadImageElement(rawDataUrl);

  const attempts = [
    { maxSide: 1400, quality: 0.78 },
    { maxSide: 1200, quality: 0.68 },
    { maxSide: 1000, quality: 0.56 },
    { maxSide: 850, quality: 0.48 },
  ];

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Браузер не поддерживает Canvas для сжатия изображений');
  }

  let bestDataUrl = '';
  let outWidth = img.naturalWidth;
  let outHeight = img.naturalHeight;

  for (const attempt of attempts) {
    const longestSide = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = longestSide > attempt.maxSide ? attempt.maxSide / longestSide : 1;
    outWidth = Math.max(1, Math.round(img.naturalWidth * scale));
    outHeight = Math.max(1, Math.round(img.naturalHeight * scale));

    canvas.width = outWidth;
    canvas.height = outHeight;

    // Белый фон на случай прозрачного PNG перед конвертацией в JPEG
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, outWidth, outHeight);
    ctx.drawImage(img, 0, 0, outWidth, outHeight);

    bestDataUrl = canvas.toDataURL('image/jpeg', attempt.quality);
    if (bestDataUrl.length <= TARGET_MAX_DATA_URL_LENGTH) {
      break;
    }
  }

  return {
    dataUrl: bestDataUrl,
    mimeType: 'image/jpeg',
    originalBytes: file.size,
    compressedBytes: estimateBase64Bytes(bestDataUrl),
    width: outWidth,
    height: outHeight,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} КБ`;
  return `${(kb / 1024).toFixed(1)} МБ`;
}
