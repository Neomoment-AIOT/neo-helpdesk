// app/internal/login/page.jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveAdminSession } from "../lib/adminClientAuth";

export default function InternalLogin() {
  const router = useRouter();
  const [emailOrUsername, setEU] = useState("");
  const [password, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    if (!emailOrUsername.trim() || !password.trim()) {
      setErr("Please fill all fields.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/internal/loginmember", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrUsername, password }),
      });
      const data = await res.json();
      if (!res.ok) setErr(data?.error || "Login failed");
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
          <h1 className="text-xl font-semibold">Team Login</h1>
          <p className="text-sm !text-gray-500">Sign in to manage tickets.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email or Username</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="jane@company.com or janedoe"
              value={emailOrUsername}
              onChange={(e) => setEU(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPass(e.target.value)}
            />
          </div>

          {err && <p className="text-sm !text-red-600">{err}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 !text-white text-sm font-medium rounded-lg py-2.5 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          New teammate?{" "}
          <a href="/signupmembers" className="!text-blue-600 hover:underline">Create an account</a>
        </div>
      </div>
    </div>
  );
}
