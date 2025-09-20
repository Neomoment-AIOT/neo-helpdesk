"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveCustomerSession } from "app/lib/clientAuth.js";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [orgPick, setOrgPick] = useState(null); // { memberships, creds }

  async function submit(creds, orgId) {
    const body = orgId ? { ...creds, orgId } : creds;
    const res = await fetch("/api/public/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Login failed");
    return data;
  }

  async function handleLogin(e) {
    e.preventDefault(); setErr(""); setLoading(true);
    try {
      const creds = { email: email.trim(), password };
      const data = await submit(creds);
      if (Array.isArray(data.memberships) && data.memberships.length > 1) {
        setOrgPick({ memberships: data.memberships, creds });
        return;
      }
      const s = saveCustomerSession(data);
      if (s?.role === "MANAGER") router.replace("/dashboard");
      else router.replace("/customer/ticket");
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  async function pickOrg(orgId) {
    setErr(""); setLoading(true);
    try {
      const data = await submit(orgPick.creds, orgId);
      const s = saveCustomerSession(data);
      if (s?.role === "MANAGER") router.replace("/dashboard");
      else router.replace("/customer/ticket");
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4">
      <div className="w-full max-w-md bg-white border rounded-2xl shadow-sm p-6">
<<<<<<< Updated upstream
<<<<<<< Updated upstream
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Create your account</h1>
          <p className="text-sm !text-gray-500">Register your organization and start submitting tickets.</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Organization name</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="e.g., Acme Corp"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Your name</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="••••••••"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </div>

          {err && <p className="text-sm !text-red-600">{err}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 !text-white text-sm font-medium rounded-lg py-2.5 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <button
            onClick={() => router.push("/login")}
            className="!text-blue-600 hover:underline"
          >
            Log in
          </button>
        </div>
=======
=======
>>>>>>> Stashed changes
        {!orgPick ? (
          <>
            <h1 className="text-xl font-semibold mb-2">Welcome back</h1>
            <p className="text-sm text-gray-500 mb-4">Log in with your email and password.</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200" value={email} onChange={e=>setEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input type="password" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200" value={password} onChange={e=>setPassword(e.target.value)} />
              </div>
              {err && <p className="text-sm text-red-600">{err}</p>}
              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg py-2.5 disabled:opacity-60">
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
            <div className="mt-4 text-center text-sm">New here? <a href="/signup" className="text-blue-600 hover:underline">Create an account</a></div>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold mb-2">Choose an organization</h1>
            <p className="text-xs text-gray-500 mb-3">Pick one to continue.</p>
            <ul className="space-y-2">
              {orgPick.memberships.map(m => (
                <li key={m.orgId}>
                  <button onClick={()=>pickOrg(m.orgId)} className="w-full text-left border rounded-lg px-3 py-2 hover:bg-gray-50">
                    <div className="text-sm font-medium">{m.orgName}</div>
                    <div className="text-[11px] text-gray-500">Role: {m.role}</div>
                  </button>
                </li>
              ))}
            </ul>
            {err && <p className="text-sm text-red-600 mt-3">{err}</p>}
          </>
        )}
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
      </div>
    </div>
  );
}
