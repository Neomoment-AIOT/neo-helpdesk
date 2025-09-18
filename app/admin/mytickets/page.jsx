"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAdminSession, clearAdminSession } from "../../lib/adminAuth";

const STATUS_ORDER = ["NOT_STARTED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"];
const STATUS_LABEL = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function Badge({ children }) {
  return <span className="inline-flex items-center px-2 py-0.5 text-[10px] rounded-full bg-gray-100 border">{children}</span>;
}

function Column({ status, title, tickets, onCardClick, onDropCard }) {
  // native HTML5 drag & drop
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData("text/plain");
    if (ticketId) onDropCard(Number(ticketId), status);
  };
  return (
    <div
      className="bg-gray-50 border rounded-xl p-3 flex flex-col w-[280px] md:flex-1 min-w-[260px] h-full"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-gray-500">{tickets.length}</span>
      </div>
      <div className="mt-2 space-y-2 overflow-y-auto pr-1 min-h-0">
        {tickets.map((t) => (
          <button
            key={t.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/plain", String(t.id))}
            onClick={() => onCardClick(t)}
            className="w-full text-left bg-white border rounded-lg p-3 shadow-sm hover:shadow transition-shadow"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-gray-500">{t.ticket_id}</span>
              {t.organization?.name && <Badge>{t.organization.name}</Badge>}
            </div>
            <div className="mt-1 text-sm font-medium">{t.client_name}</div>
            <div className="mt-1 text-xs text-gray-600 break-words line-clamp-3">{t.description}</div>
            <div className="mt-2 text-[11px] text-gray-500">
              {t.created_at ? new Date(t.created_at).toLocaleString() : ""}
            </div>
          </button>
        ))}
        {!tickets.length && <div className="text-xs text-gray-400 text-center py-4">No tickets</div>}
      </div>
    </div>
  );
}

function TicketModal({ ticket, onClose }) {
  if (!ticket) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white/90 backdrop-blur border-b px-5 py-3 flex items-center justify-between rounded-t-xl">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">Ticket</span>
            <span className="font-semibold">{ticket.ticket_id}</span>
          </div>
          <button onClick={onClose} className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50">Close</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>Status: {ticket.status}</Badge>
            <Badge>Type: {ticket.ticket_type}</Badge>
            {ticket.organization?.name && <Badge>Org: {ticket.organization.name}</Badge>}
            {ticket.team?.name && <Badge>Team: {ticket.team.name}</Badge>}
            {ticket.assignee?.name && <Badge>Assignee: {ticket.assignee.name}</Badge>}
          </div>

          <div>
            <div className="text-xs text-gray-500">Client name</div>
            <div className="text-sm font-medium">{ticket.client_name}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Description</div>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{ticket.description}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div><div className="text-xs text-gray-500">Created</div><div>{ticket.created_at ? new Date(ticket.created_at).toLocaleString() : "—"}</div></div>
            <div><div className="text-xs text-gray-500">Started</div><div>{ticket.started_at ? new Date(ticket.started_at).toLocaleString() : "—"}</div></div>
            <div><div className="text-xs text-gray-500">Completed</div><div>{ticket.completed_at ? new Date(ticket.completed_at).toLocaleString() : "—"}</div></div>
            <div><div className="text-xs text-gray-500">Updated</div><div>{ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : "—"}</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyTicketsForMember() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const s = getAdminSession();
    if (!s?.member?.id) { router.replace("/admin/login"); return; }
    setSession(s);
  }, [router]);

  const load = useCallback(async () => {
    if (!session?.member?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets/list?assigneeId=${session.member.id}&page=1&pageSize=1000`);
      const data = await res.json();
      if (res.ok) setTickets(Array.isArray(data.tickets) ? data.tickets : []);
    } finally { setLoading(false); }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => {
    const map = Object.fromEntries(STATUS_ORDER.map(s => [s, []]));
    for (const t of tickets) {
      if (map[t.status]) map[t.status].push(t);
      else map.NOT_STARTED.push(t);
    }
    return map;
  }, [tickets]);

  async function moveTicket(ticketId, newStatus) {
    try {
      const res = await fetch("/api/tickets/update-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, status: newStatus, changedBy: session?.member?.name || "Member" }),
      });
      const data = await res.json();
      if (res.ok) {
        setTickets(prev => prev.map(t => (t.id === ticketId ? data.ticket : t)));
      } else {
        alert(data?.error || "Failed to update status");
      }
    } catch {
      alert("Network error");
    }
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/admin")} className="text-sm border rounded-lg px-3 py-1.5">← Back</button>
            <h1 className="text-lg font-semibold">My tickets</h1>
          </div>
          <div className="text-sm text-gray-600">
            Signed in as <span className="font-medium">{session.member.name}</span>
          </div>
        </div>
      </div>

      {/* Board with fixed height; columns scroll internally */}
      <div className="max-w-6xl mx-auto px-4 py-5 h-[calc(100vh-120px)] flex flex-col">
        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-3 flex-1 min-h-0">
            {STATUS_ORDER.map((s) => (
              <Column
                key={s}
                status={s}
                title={STATUS_LABEL[s]}
                tickets={grouped[s]}
                onCardClick={setSelected}
                onDropCard={moveTicket}
              />
            ))}
          </div>
        )}
      </div>

      <TicketModal ticket={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
