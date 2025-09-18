// simple localStorage-backed session for internal members
const KEY = "adminSession";

export function saveAdminSession(session) {
  // expected: { token, member: { id, name, email?, username?, ... } }
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function getAdminSession() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}

export function clearAdminSession() {
  localStorage.removeItem(KEY);
}
