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
    <main className="min-h-screen bg-gray-200 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
        <h1 className="text-2xl font-semibold mb-6">Create your organization</h1>

        <label className="text-base block mb-2">Organization name</label>
        <input
          className="w-full border border-slate-300 rounded px-4 py-3 text-base mb-4"
          value={organizationName}
          onChange={(e) => setOrganizationName(e.target.value)}
          placeholder="Acme Inc."
        />

        <label className="text-base block mb-2">Your name</label>
        <input
          className="w-full border border-slate-300 rounded px-4 py-3 text-base mb-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
        />

        <label className="text-base block mb-2">Email</label>
        <input
          className="w-full border border-slate-300 rounded px-4 py-3 text-base mb-4"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        <label className="text-base block mb-2">Password</label>
        <input
          type="password"
          className="w-full border border-slate-300 rounded px-4 py-3 text-base mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        {msg && <p className="text-base text-red-600 mb-4">{msg}</p>}

        <button
          onClick={doSignup}
          className="w-full bg-black hover:bg-gray-800 text-white rounded-lg px-4 py-3 text-base font-medium"
        >
          Sign up
        </button>

        <p className="text-sm text-slate-600 mt-4">
          Already have an account?{" "}
          <a className="underline font-medium" href="/">
            Log in
          </a>
        </p>
      </div>
    </main>
  );
}
