const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://zonas.primooo.dev/api';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error de conexión' }));
    throw new Error(err.message || err.error || 'Error del servidor');
  }
  return res.json();
}

export function getSocketUrl() {
  return process.env.NEXT_PUBLIC_SOCKET_URL || 'https://zonas.primooo.dev';
}
