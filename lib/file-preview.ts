/** Content types the browser can show without downloading. HTML and SVG stay downloads. */

const PREVIEW_TYPES: Record<string, string> = {
  'image/jpeg': 'image/jpeg',
  'image/png': 'image/png',
  'image/gif': 'image/gif',
  'image/webp': 'image/webp',
  'image/avif': 'image/avif',
  'image/bmp': 'image/bmp',
  'application/pdf': 'application/pdf',
  'text/plain': 'text/plain; charset=utf-8',
  'text/csv': 'text/csv; charset=utf-8',
  'text/markdown': 'text/markdown; charset=utf-8',
  'application/json': 'application/json; charset=utf-8',
  'audio/mpeg': 'audio/mpeg',
  'audio/wav': 'audio/wav',
  'audio/mp4': 'audio/mp4',
  'audio/ogg': 'audio/ogg',
  'video/mp4': 'video/mp4',
  'video/webm': 'video/webm',
  'video/quicktime': 'video/quicktime',
};

const EXTENSION_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  bmp: 'image/bmp',
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  json: 'application/json',
  log: 'text/plain',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

export type FilePreviewKind = 'image' | 'pdf' | 'text' | 'audio' | 'video' | 'none';

export function previewContentType(name: string, type = '') {
  const normalized = type.toLowerCase().split(';')[0].trim();
  if (PREVIEW_TYPES[normalized]) return PREVIEW_TYPES[normalized];
  const extension = name.toLowerCase().split('.').pop() || '';
  const fromName = EXTENSION_TYPES[extension];
  return fromName ? PREVIEW_TYPES[fromName] : '';
}

export function filePreviewKind(name: string, type = ''): FilePreviewKind {
  const content = previewContentType(name, type);
  if (content.startsWith('image/')) return 'image';
  if (content === 'application/pdf') return 'pdf';
  if (content.startsWith('text/') || content.startsWith('application/json')) return 'text';
  if (content.startsWith('audio/')) return 'audio';
  if (content.startsWith('video/')) return 'video';
  return 'none';
}
