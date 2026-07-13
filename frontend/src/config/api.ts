const rawUrl = import.meta.env.VITE_API_URL;

if (!rawUrl) {
  throw new Error(
    'VITE_API_URL environment variable is not set. ' +
    'Create a .env.local file with: VITE_API_URL=http://localhost:3001'
  );
}

// Strip trailing slash to prevent double-slash in path construction
export const API_BASE_URL = rawUrl.replace(/\/+$/, '');

/**
 * Build an absolute API URL for the given path.
 */
export const getApiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

/**
 * Build an absolute WebSocket URL for the given document and auth token.
 * Automatically maps http→ws and https→wss.
 */
export const getWsUrl = (docId: string, token: string | null): string => {
  const protocol = API_BASE_URL.startsWith('https') ? 'wss:' : 'ws:';
  const host = API_BASE_URL.replace(/^https?:\/\//, '');
  return `${protocol}//${host}/?docId=${docId}${
    token ? `&token=${encodeURIComponent(token)}` : ''
  }`;
};
