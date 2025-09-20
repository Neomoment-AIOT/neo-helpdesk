// app/signup/page.jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveCustomerSession } from "@/app/lib/clientAuth";

export default function SignupPage() {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function doSignup() {
    setMsg("");
    if (!organizationName.trim() || !name.trim() || !email.trim() || !password.trim()) {
      setMsg("Please fill all fields");
      return;
    }
    try {
      const res = await fetch("/api/public/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: organizationName.trim(),
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.error || "Signup failed");
        return;
      }
      saveCustomerSession(data);
      router.replace("/dashboard");
    } catch {
      setMsg("Signup failed");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h1 className="text-lg font-semibold mb-4">Create your organization</h1>

        <label className="text-sm block mb-1">Organization name</label>
        <input
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm mb-3"
          value={organizationName}
          onChange={(e) => setOrganizationName(e.target.value)}
          placeholder="Acme Inc."
        />

        <label className="text-sm block mb-1">Your name</label>
        <input
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm mb-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
        />

        <label className="text-sm block mb-1">Email</label>
        <input
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        <label className="text-sm block mb-1">Password</label>
        <input
          type="password"
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm mb-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        {msg && <p className="text-sm text-red-600 mb-3">{msg}</p>}

        <button onClick={doSignup} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 py-2 text-sm">
          Sign up
        </button>

        <p className="text-xs text-slate-500 mt-3">
          Already have an account? <a className="underline" href="/">Log in</a>
        </p>
      </div>
    </main>
  );
}
