// app/lib/clientAuth.js
// Client-side helpers for storing auth/session and sending authorized requests.

export function saveCustomerSession({ token, user, org, role }) {
  if (typeof window === "undefined") return;
  const session = {
    token,
    userId: user?.id,
    name: user?.name,
    email: user?.email,
    orgId: org?.id,
    orgName: org?.name,
    role,
  };
  localStorage.setItem("authToken", token);
  localStorage.setItem("customerSession", JSON.stringify(session));
  return session;
}

export function getCustomerSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("customerSession");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearCustomerSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("authToken");
  localStorage.removeItem("customerSession");
}

export function authHeaders(extra = {}) {
  if (typeof window === "undefined") return extra;
  const token = localStorage.getItem("authToken");
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}
