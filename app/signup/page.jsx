"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveCustomerSession } from "app/lib/clientAuth.js";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [openMore, setOpenMore] = useState(false);

  const [form, setForm] = useState({
    organizationName: "",
    name: "",
    email: "",
    password: "",
    whatsapp: "",
    slackId: "",
    discordId: "",
    linkedin: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    latitude: "",
    longitude: "",
  });

  const input = "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200";
  const label = "text-xs font-medium text-gray-700";
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSignup(e) {
    e.preventDefault();
    setErr("");
    const { organizationName, name, email, password } = form;
    if (!organizationName.trim() || !name.trim() || !email.trim() || !password.trim()) {
      setErr("Please fill organization, your name, email, and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/public/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          organizationName: organizationName.trim(),
          name: name.trim(),
          email: email.trim(),
          latitude: form.latitude ? Number(form.latitude) : null,
          longitude: form.longitude ? Number(form.longitude) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data?.error || "Sign up failed"); return; }
      const s = saveCustomerSession(data);
      if (s?.role === "MANAGER") router.replace("/dashboard");
      else router.replace("/customer/ticket");
    } catch {
      setErr("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white px-4 py-6">
      <div className="mx-auto w-full max-w-md bg-white border rounded-2xl shadow-sm p-5">
        <header className="mb-4">
          <h1 className="text-lg font-semibold">Create your account</h1>
          <p className="text-xs text-gray-500">Register your organization and start submitting tickets.</p>
        </header>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-1">
            <label className={label}>Organization name</label>
            <input className={input} value={form.organizationName} onChange={e=>update("organizationName", e.target.value)} required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={label}>Your name</label>
              <input className={input} value={form.name} onChange={e=>update("name", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className={label}>Email</label>
              <input type="email" className={input} value={form.email} onChange={e=>update("email", e.target.value)} required />
            </div>
          </div>

          <div className="space-y-1">
            <label className={label}>Password</label>
            <input type="password" className={input} value={form.password} onChange={e=>update("password", e.target.value)} required />
          </div>

          <div className="border-t pt-3">
            <button type="button" className="w-full text-left text-xs text-gray-700 hover:text-gray-900 flex items-center justify-between" onClick={()=>setOpenMore(o=>!o)}>
              <span>More details (optional)</span>
              <span className="text-gray-500">{openMore ? "−" : "+"}</span>
            </button>

            {openMore && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input className={input} placeholder="WhatsApp" value={form.whatsapp} onChange={e=>update("whatsapp", e.target.value)} />
                  <input className={input} placeholder="Slack ID" value={form.slackId} onChange={e=>update("slackId", e.target.value)} />
                  <input className={input} placeholder="Discord ID" value={form.discordId} onChange={e=>update("discordId", e.target.value)} />
                  <input className={input} placeholder="LinkedIn URL" value={form.linkedin} onChange={e=>update("linkedin", e.target.value)} />
                </div>
                <input className={input} placeholder="Address" value={form.address} onChange={e=>update("address", e.target.value)} />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input className={input} placeholder="City" value={form.city} onChange={e=>update("city", e.target.value)} />
                  <input className={input} placeholder="State" value={form.state} onChange={e=>update("state", e.target.value)} />
                  <input className={input} placeholder="Postal code" value={form.postalCode} onChange={e=>update("postalCode", e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input className={input} placeholder="Country" value={form.country} onChange={e=>update("country", e.target.value)} />
                  <input className={input} placeholder="Latitude" inputMode="decimal" value={form.latitude} onChange={e=>update("latitude", e.target.value)} />
                  <input className={input} placeholder="Longitude" inputMode="decimal" value={form.longitude} onChange={e=>update("longitude", e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {err && <p className="text-xs text-red-600">{err}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs">
          Already have an account? <a href="/" className="text-blue-600 hover:underline">Log in</a>
        </p>
      </div>
    </div>
  );
}
