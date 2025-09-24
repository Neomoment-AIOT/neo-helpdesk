// app/internal/signup/page.jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveAdminSession } from "../lib/adminClientAuth";

export default function InternalSignup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");     // optional if using username
  const [username, setUsername] = useState(""); // optional
  const [password, setPass] = useState("");
  const [teamId, setTeamId] = useState("");   // optional
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    if (!name.trim() || !password.trim() || (!email.trim() && !username.trim())) {
      setErr("name, password and email or username are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/internal/signupmember", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          username: username.trim() || undefined,
          password,
          teamId: teamId ? Number(teamId) : undefined
        }),
      });
      const data = await res.json();
      if (!res.ok) setErr(data?.error || "Signup failed");
      else {
        saveAdminSession(data);
        router.replace("/admin");
      }
    } catch {
      setErr("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4">
      <div className="w-full max-w-md bg-white border rounded-2xl shadow-sm p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Create teammate account</h1>
          <p className="text-sm !text-gray-500">Sign up to manage and assign tickets.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full name</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm"
                   value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Email (optional)</label>
              <input type="email" className="w-full border rounded-lg px-3 py-2 text-sm"
                     value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Username (optional)</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm"
                     value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" className="w-full border rounded-lg px-3 py-2 text-sm"
                   value={password} onChange={(e) => setPass(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Primary Team (optional)</label>
            <input type="number" placeholder="Team ID" className="w-full border rounded-lg px-3 py-2 text-sm"
                   value={teamId} onChange={(e) => setTeamId(e.target.value)} />
          </div>

          {err && <p className="text-sm !text-red-600">{err}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 !text-white text-sm font-medium rounded-lg py-2.5 disabled:opacity-60">
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <a href="/internal/login" className="!text-blue-600 hover:underline">Sign in</a>
        </div>
      </div>
    </div>
  );
}
