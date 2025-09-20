"use client";

const KEY = "nm_session";

export function saveCustomerSession(payload) {
  if (!payload || !payload.token) return null;
  const session = {
    token: payload.token,
    role: payload.role,
    orgId: payload.org?.id ?? payload.orgId,
    orgName: payload.org?.name ?? payload.orgName,
    user: payload.user || null,
    memberships: payload.memberships || [],
  };
  localStorage.setItem(KEY, JSON.stringify(session));
  return session;
}

export function getCustomerSession() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export function clearCustomerSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export function authHeaders(extra = {}) {
  const s = getCustomerSession();
  return {
    ...(s?.token ? { Authorization: `Bearer ${s.token}` } : {}),
    ...extra,
  };
}
