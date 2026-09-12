'use client';

/** fetch 래퍼: JSON 파싱 + 서버 에러 메시지를 그대로 throw */
export async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(json?.error ?? `요청 실패 (${res.status})`);
  return json as T;
}

export const post = <T = any>(url: string, body: unknown) =>
  api<T>(url, { method: 'POST', body: JSON.stringify(body) });

export const patch = <T = any>(url: string, body: unknown) =>
  api<T>(url, { method: 'PATCH', body: JSON.stringify(body) });

export const del = <T = any>(url: string) => api<T>(url, { method: 'DELETE' });
