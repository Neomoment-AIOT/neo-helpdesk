// app/lib/clientAuth.js
// Client-side helpers for storing auth/session and sending authorized requests.

const SESSION_KEY = "cust_session";
const TOKEN_KEY = "authToken";
const LEGACY_SESSION_KEY = "customerSession"; // cleanup only

export function saveCustomerSession(payload) {
  if (typeof window === "undefined") return;

  const s = {
    token: payload?.token ?? payload?.access_token ?? null,
    userId: payload?.user?.id ?? payload?.user_id ?? null,
    email: payload?.user?.email ?? null,
    name: payload?.user?.name ?? null,
    orgId: payload?.org?.id ?? payload?.organization_id ?? null,
    orgName: payload?.org?.name ?? null,
    role: payload?.role ?? null,
    memberships: payload?.memberships || [], // explicit memberships for multi-org
  };

  // Persist the session blob
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));

  // Persist token under a canonical key used by authHeaders
  if (s.token) localStorage.setItem(TOKEN_KEY, s.token);

  // Clean up any legacy key we no longer use
  localStorage.removeItem(LEGACY_SESSION_KEY);
}

export function getCustomerSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s?.token ? s : null;
  } catch {
    return null;
  }
}

export function clearCustomerSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(LEGACY_SESSION_KEY);
}

export function authHeaders(extra = {}) {
  if (typeof window === "undefined") return extra;

  // Primary: dedicated token key
  let token = localStorage.getItem(TOKEN_KEY);

  // Back-compat: fall back to token inside session blob, and self-heal
  if (!token) {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        token = s?.token || null;
        if (token) localStorage.setItem(TOKEN_KEY, token);
      }
    } catch {}
  }

  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}
