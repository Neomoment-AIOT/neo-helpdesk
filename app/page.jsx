"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveCustomerSession } from "./lib/clientAuth";

export default function SignupPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleSignup(e) {
    e.preventDefault();
    setErr("");
    if (!orgName.trim() || !name.trim() || !email.trim() || !pass.trim()) {
      setErr("Please fill all fields.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/public/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: orgName.trim(),
          name: name.trim(),
          email: email.trim(),
          password: pass,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error || "Sign up failed");
      } else {
        // expected: { token, orgId, orgName, name, email }
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
          <h1 className="text-xl font-semibold">Create your account</h1>
          <p className="text-sm text-gray-500">
            Register your organization and start submitting tickets.
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Organization name
            </label>
            <input
              className="w-full rounded-lg px-3 py-2.5 text-sm bg-gray-100 outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="e.g., Acme Corp"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Your name</label>
              <input
                className="w-full rounded-lg px-3 py-2.5 text-sm bg-gray-100 outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                className="w-full rounded-lg px-3 py-2.5 text-sm bg-gray-100 outline-none focus:ring-2 focus:ring-blue-200"
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
            className="w-full bg-black hover:bg-gray-800 text-white text-base font-medium rounded-lg py-2.5 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <div className="mt-4 text-center text-base">
          Already have an account?{" "}
          <button
            onClick={() => router.push("/login")}
            className="text-black hover:underline font-bold"
          >
            Log in
          </button>
        </div>
      </div>
    </div>
  );
}
