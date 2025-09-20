"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCustomerSession, clearCustomerSession } from "./../../lib/clientAuth";

export default function CustomerTicketPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [clientName, setClientName] = useState("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [lastTicketId, setLastTicketId] = useState("");

  useEffect(() => {
    const s = getCustomerSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    setSession(s);
    if (s.name) setClientName(s.name);
  }, [router]);

  if (!session) return null;

  async function submitTicket(e) {
    e.preventDefault();
    setMsg("");
    setLastTicketId("");

    if (!clientName.trim() || !desc.trim()) {
      setMsg("Please fill your name and ticket description.");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        client_name: clientName.trim(),
        description: desc.trim(),
        organization_id: Number(session.orgId),
        // ticket_type: EXTERNAL is forced server-side
      };
      const res = await fetch("/api/tickets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.error || "Failed to submit ticket.");
      } else {
        setDesc("");
        setLastTicketId(data.ticket_id || data.ticket?.ticket_id);
        setMsg("✅ Ticket submitted! Our team will get back to you shortly.");
      }
    } catch {
      setMsg("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function logout() {
    clearCustomerSession();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-xs !text-gray-500">Organization</div>
            <div className="font-semibold">{session.orgName}</div>
          </div>
          <div className="flex items-center gap-2">
<<<<<<< HEAD
<<<<<<< Updated upstream
<<<<<<< Updated upstream
=======
>>>>>>> parent of 3e5f8a5 (1)
            <button
              onClick={() => router.push("/customer/my-tickets")}
              className="text-sm bg-gray-900 !text-white rounded-lg px-3 py-1.5"
            >
              My tickets
            </button>
            <button
              onClick={logout}
              className="text-sm !text-gray-700 hover:!text-gray-900 border rounded-lg px-3 py-1.5"
            >
              Log out
            </button>
<<<<<<< HEAD
=======
            <a href="/customer/my-tickets" className="text-sm bg-gray-900 text-white rounded-lg px-3 py-1.5">My tickets</a>
            <button onClick={logout} className="text-sm text-gray-700 border rounded-lg px-3 py-1.5">Log out</button>
>>>>>>> Stashed changes
=======
            <a href="/customer/my-tickets" className="text-sm bg-gray-900 text-white rounded-lg px-3 py-1.5">My tickets</a>
            <button onClick={logout} className="text-sm text-gray-700 border rounded-lg px-3 py-1.5">Log out</button>
>>>>>>> Stashed changes
=======
>>>>>>> parent of 3e5f8a5 (1)
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
<<<<<<< HEAD
<<<<<<< Updated upstream
<<<<<<< Updated upstream
=======
>>>>>>> parent of 3e5f8a5 (1)
        <div className="bg-white border rounded-2xl shadow-sm p-5 sm:p-6">
          <div className="mb-4">
            <h1 className="text-lg font-semibold">Submit a Support Ticket</h1>
            <p className="text-sm !text-gray-500">
              Please provide as much detail as possible — steps to reproduce, expected/actual behavior,
              screenshots/links, and any error messages. Detailed reports help us resolve your issue faster.
            </p>
          </div>

<<<<<<< HEAD
=======
        <div className="bg-white border rounded-2xl shadow-sm p-5">
          <h1 className="text-lg font-semibold mb-2">Submit a Support Ticket</h1>
>>>>>>> Stashed changes
=======
        <div className="bg-white border rounded-2xl shadow-sm p-5">
          <h1 className="text-lg font-semibold mb-2">Submit a Support Ticket</h1>
>>>>>>> Stashed changes
=======
>>>>>>> parent of 3e5f8a5 (1)
          <form onSubmit={submitTicket} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Your name</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="John Doe"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>

            <div>
<<<<<<< HEAD
<<<<<<< Updated upstream
<<<<<<< Updated upstream
=======
>>>>>>> parent of 3e5f8a5 (1)
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium mb-1">Describe the issue</label>
                <span className="text-[11px] !text-gray-500">
                  Tip: Include steps to reproduce & screenshots/links if possible.
                </span>
              </div>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 min-h-[140px]"
                placeholder="What happened? What did you expect? Any errors?"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>

            {msg && <p className="text-sm !text-gray-700">{msg}</p>}
<<<<<<< HEAD
=======
              <label className="block text-sm font-medium mb-1">Your name</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={clientName} onChange={e=>setClientName(e.target.value)} />
            </div>
=======
              <label className="block text-sm font-medium mb-1">Your name</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={clientName} onChange={e=>setClientName(e.target.value)} />
            </div>
>>>>>>> Stashed changes
            <div>
              <label className="block text-sm font-medium mb-1">Describe the issue</label>
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm min-h-[140px]" value={desc} onChange={e=>setDesc(e.target.value)} />
            </div>
            {msg && <p className="text-sm">{msg}</p>}
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> parent of 3e5f8a5 (1)
            {lastTicketId && (
              <div className="mt-2 rounded-lg bg-green-50 border border-green-200 p-3 text-sm">
                <div className="font-medium">Your ticket ID:</div>
                <div className="font-mono">{lastTicketId}</div>
<<<<<<< HEAD
<<<<<<< Updated upstream
<<<<<<< Updated upstream
=======
>>>>>>> parent of 3e5f8a5 (1)
                <div className="mt-1 !text-gray-600">
                  Our team will contact you shortly. You can track it under <strong>My tickets</strong>.
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 !text-white text-sm font-medium rounded-lg px-4 py-2.5 disabled:opacity-60"
              >
<<<<<<< HEAD
=======
              <button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 disabled:opacity-60">
>>>>>>> Stashed changes
=======
              </div>
            )}
            <div className="pt-2">
              <button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 disabled:opacity-60">
>>>>>>> Stashed changes
=======
>>>>>>> parent of 3e5f8a5 (1)
                {submitting ? "Submitting..." : "Submit ticket"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
