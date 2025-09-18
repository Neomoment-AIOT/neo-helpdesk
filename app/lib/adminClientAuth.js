// app/lib/adminClientAuth.js
export function saveAdminSession(payload) {
    if (typeof window === "undefined") return;
    localStorage.setItem("adminSession", JSON.stringify(payload));
  }
  export function getAdminSession() {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem("adminSession") || "null"); } catch { return null; }
  }
  export function clearAdminSession() {
    if (typeof window === "undefined") return;
    localStorage.removeItem("adminSession");
  }
  