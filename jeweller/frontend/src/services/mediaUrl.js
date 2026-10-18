const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';
const MEDIA_BASE_URL = import.meta.env.VITE_MEDIA_BASE_URL || new URL(API_BASE_URL).origin;
const FALLBACK_IMAGE = '/images/jewelry-placeholder.svg';

export const getMediaUrl = (path) => {
  if (!path) return FALLBACK_IMAGE;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/images/')) return path;
  return `${MEDIA_BASE_URL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
};

