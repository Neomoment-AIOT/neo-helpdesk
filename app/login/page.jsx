"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveCustomerSession } from "../lib/clientAuth";

export default function LoginPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setErr("");

    if (!orgName.trim() || !pass.trim()) {
      setErr("Please fill all fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/public/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: orgName.trim(),
          password: pass,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErr(data?.error || "Login failed");
      } else {
        // { token, orgId, orgName }
        saveCustomerSession(data);
        router.replace("/customer/ticket");
      }
    } catch {
      setErr("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-200 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Welcome back</h1>
          <p className="text-sm text-gray-500">Log in to submit and track your tickets.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Organization name</label>
            <input
              className="w-full rounded-lg px-3 py-2.5 text-sm bg-gray-100 outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Organization name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              className="w-full rounded-lg px-3 py-2.5 text-sm bg-gray-100 outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="••••••••"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black hover:bg-gray-900 text-white text-base font-medium rounded-lg py-2.5 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-4 text-center text-base">
          New here?{" "}
          <button
            onClick={() => router.push("/")}
            className="text-black hover:underline font-bold"
          >
            Create an account
          </button>
        </div>
      </div>
    </div>
  );
}
