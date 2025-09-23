// app/login/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveCustomerSession } from "@/app/lib/clientAuth";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // selected org (when needed)
  const [orgId, setOrgId] = useState("");

  // memberships fetched for this email
  const [memberships, setMemberships] = useState([]); // [{orgId, orgName, role}]
  const [checking, setChecking] = useState(false);
  const [animateDrop, setAnimateDrop] = useState(false);

  const [msg, setMsg] = useState("");

  // fetch org memberships when email changes (debounced)
  useEffect(() => {
    setMsg("");
    setMemberships([]);
    setOrgId("");

    const e = email.trim().toLowerCase();
    if (!e) return;

    const t = setTimeout(async () => {
      setChecking(true);
      try {
        const res = await fetch(`/api/public/memberships?email=${encodeURIComponent(e)}`);
        const data = await res.json();
        if (res.ok) {
          const m = Array.isArray(data.memberships) ? data.memberships : [];
          setMemberships(m);

          if (m.length === 1) {
            // single org -> auto-select
            setOrgId(String(m[0].orgId));
          } else if (m.length > 1) {
            // multiple orgs -> attention animate
            setAnimateDrop(true);
            setTimeout(() => setAnimateDrop(false), 1200);
          }
        } else {
          // don’t block login; just show message
          setMsg(data?.error || "Could not check memberships");
        }
      } catch {
        // silent failure is fine; user can still attempt login
      } finally {
        setChecking(false);
      }
    }, 450);

    return () => clearTimeout(t);
  }, [email]);

  const multiOrgs = memberships.length > 1;
  const mustChooseOrg = multiOrgs; // enforce pick when multiple
  const loginDisabled =
    checking ||
    !email.trim() ||
    !password.trim() ||
    (mustChooseOrg && !orgId);

  async function doLogin() {
    setMsg("");

    // enforce UI rule in case of race:
    if (multiOrgs && !orgId) {
      setMsg("Please select your organization.");
      return;
    }

    try {
      const res = await fetch("/api/public/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          orgId: orgId ? Number(orgId) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Special case: server wants an org selection
        if (res.status === 409 && Array.isArray(data.memberships)) {
          setMemberships(data.memberships);
          setMsg("Select your organization to continue.");
          setAnimateDrop(true);
          setTimeout(() => setAnimateDrop(false), 1200);
          return;
        }
        setMsg(data?.error || "Login failed");
        return;
      }
      saveCustomerSession(data);
      router.replace("/dashboard");
    } catch {
      setMsg("Login failed");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h1 className="text-lg font-semibold mb-4">Sign in</h1>

        <label className="text-sm block mb-1">Email</label>
        <input
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          inputMode="email"
          autoComplete="username"
        />

        <label className="text-sm block mb-1">Password</label>
        <input
          type="password"
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm mb-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
        />

        {/* Org picker appears only when needed */}
        {multiOrgs && (
          <div className={`transition ${animateDrop ? "animate-pulse" : ""}`}>
            <label className="text-sm block mb-1">Choose your organization</label>
            <select
              className="w-full border border-indigo-300 rounded px-3 py-2 text-sm mb-3 bg-white focus:outline-none"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
            >
              <option value="" disabled>
                Select organization…
              </option>
              {memberships.map((m) => (
                <option key={m.orgId} value={String(m.orgId)}>
                  {m.orgName}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 -mt-2 mb-2">
              We found multiple organizations for this email. Please pick one.
            </p>
          </div>
        )}

        {/* Optional helpful hint when exactly 1 org */}
        {!multiOrgs && orgId && memberships.length === 1 && (
          <div className="text-[12px] text-slate-500 mb-3">
            Organization: <span className="font-medium">{memberships[0].orgName}</span>
          </div>
        )}

        {msg && <p className="text-sm text-red-600 mb-3">{msg}</p>}

        <button
          onClick={doLogin}
          disabled={loginDisabled}
          className={`w-full rounded-lg px-3 py-2 text-sm text-white ${
            loginDisabled ? "bg-indigo-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {checking ? "Checking…" : "Log in"}
        </button>

        <p className="text-xs text-slate-500 mt-3">
          New here? <a className="underline" href="/signup">Create an account</a>
        </p>
      </div>
    </main>
  );
}
