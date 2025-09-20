"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getAdminSession } from "../../lib/adminAuth";

const STATUS_ORDER = ["NOT_STARTED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"];
const STATUS_LABEL = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};
const ACCENTS = {
  NOT_STARTED: "bg-rose-500",
  IN_PROGRESS: "bg-amber-500",
  ON_HOLD: "bg-yellow-500",
  COMPLETED: "bg-emerald-500",
  CANCELLED: "bg-slate-400",
};

function formatDurationSec(total) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s ? `${s}s` : ""}`.trim();
  return `${s}s`;
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[10px] rounded-full bg-gray-100 border">
      {children}
    </span>
  );
}

function TimeControls({ ticket, memberId, runningStart, totalSeconds, onStart, onStop }) {
  // ticking UI
  const [now, setNow] = useState(Date.now());
  const timerRef = useRef(null);

  useEffect(() => {
    if (!runningStart) return;
    timerRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timerRef.current);
  }, [runningStart]);

  const liveSeconds = runningStart
    ? Math.max(0, Math.floor((now - new Date(runningStart).getTime()) / 1000))
    : 0;

  const display = runningStart
    ? formatDurationSec(totalSeconds + liveSeconds)
    : formatDurationSec(totalSeconds);

  return (
    <div className="mt-2 flex items-center justify-between">
      <div className="text-[11px] text-gray-600">Time: <span className="font-medium">{display}</span></div>
      {runningStart ? (
        <button
          onClick={() => onStop(ticket.id)}
          className="text-xs bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded"
        >
          ⏸ Clock out
        </button>
      ) : (
        <button
          onClick={() => onStart(ticket.id)}
          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded"
        >
          ▶ Clock in
        </button>
      )}
    </div>
  );
}

function Card({ ticket, onClick, draggableProps, memberId, timeMap, onStart, onStop }) {
  const t = timeMap[ticket.id] || { runningStart: null, totalSeconds: 0 };

  return (
    <div className="rounded-lg border bg-white/95 hover:bg-white shadow-sm hover:shadow-md transition active:scale-[0.99]">
      <button
        {...draggableProps}
        onClick={onClick}
        className="w-full text-left px-3 pt-3"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono text-gray-500">{ticket.ticket_id}</span>
          {ticket.organization?.name && (
            <span className="inline-flex items-center rounded-full border bg-sky-50 text-sky-700 ring-1 ring-sky-200 px-2 py-0.5 text-[10px]">
              {ticket.organization.name}
            </span>
          )}
        </div>

        <div className="mt-2 text-sm font-medium leading-5 text-gray-900 line-clamp-2">
          {ticket.client_name}
        </div>

        <div className="mt-1 text-[12px] text-gray-600 leading-5 line-clamp-3">
          {ticket.description}
        </div>

        <div className="mt-2 text-[11px] text-gray-500">
          {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : ""}
        </div>
      </button>

      {/* Time controls (not part of the button area to avoid triggering modal when clicking) */}
      <div className="px-3 pb-3">
        <TimeControls
          ticket={ticket}
          memberId={memberId}
          runningStart={t.runningStart}
          totalSeconds={t.totalSeconds}
          onStart={onStart}
          onStop={onStop}
        />
      </div>
    </div>
  );
}

function ColumnHeader({ title, count, accent }) {
  return (
    <div
      className="sticky top-0 z-10 -mx-2 px-2 pb-2 pt-1"
      style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.85), rgba(255,255,255,0.6))" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${accent}`} />
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        </div>
        <span className="inline-flex items-center justify-center min-w-[26px] h-6 px-2 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 border">
          {count}
        </span>
      </div>
    </div>
  );
}

function Column({ status, title, tickets, onCardClick, onDropCard, memberId, timeMap, onStart, onStop }) {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e) => { e.preventDefault(); setIsOver(true); };
  const handleDragLeave = () => setIsOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData("text/plain");
    setIsOver(false);
    if (ticketId) onDropCard(Number(ticketId), status);
  };

  return (
    <div
      className="flex flex-col w-[300px] md:w-[320px] min-w-[280px] max-w-[360px] h-full rounded-xl border bg-gradient-to-b from-gray-50 to-white"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <ColumnHeader title={title} count={tickets.length} accent={ACCENTS[status]} />
      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2 space-y-2">
        <div className={`rounded-lg border-2 border-dashed transition ${isOver ? "border-blue-300 bg-blue-50/40" : "border-transparent"}`}>
          <div className="space-y-2 p-0.5">
            {tickets.map((t) => (
              <Card
                key={t.id}
                ticket={t}
                onClick={() => onCardClick(t)}
                draggableProps={{ draggable: true, onDragStart: (e) => e.dataTransfer.setData("text/plain", String(t.id)) }}
                memberId={memberId}
                timeMap={timeMap}
                onStart={onStart}
                onStop={onStop}
              />
            ))}
          </div>
        </div>
        {!tickets.length && !isOver && (
          <div className="text-xs text-gray-400 text-center py-6 select-none">No tickets</div>
        )}
      </div>
    </div>
  );
}

function TicketModal({ ticket, onClose, memberId, timeEntry, onStart, onStop }) {
  if (!ticket) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border">
        <div className="sticky top-0 bg-white/90 backdrop-blur border-b px-5 py-3 flex items-center justify-between rounded-t-2xl">
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

          {/* Time controls inside modal */}
          <div className="border rounded-lg p-3 bg-gray-50">
            <div className="text-xs font-semibold mb-2">Time tracking</div>
            <TimeControls
              ticket={ticket}
              memberId={memberId}
              runningStart={timeEntry?.runningStart || null}
              totalSeconds={timeEntry?.totalSeconds || 0}
              onStart={onStart}
              onStop={onStop}
            />
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

  // timeMap: { [ticketId]: { runningStart: string|null, totalSeconds: number } }
  const [timeMap, setTimeMap] = useState({});

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
      if (res.ok) {
        const list = Array.isArray(data.tickets) ? data.tickets : [];
        setTickets(list);

        // Load time summary for these tickets
        const ticketIds = list.map((t) => t.id);
        if (ticketIds.length) {
          const r2 = await fetch("/api/time/my", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ memberId: session.member.id, ticketIds }),
          });
          const d2 = await r2.json();
          if (r2.ok && d2?.summary) setTimeMap(d2.summary);
          else setTimeMap({});
        } else {
          setTimeMap({});
        }
      }
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

  // ---- Clock in/out handlers (optimistic) ----
  async function handleClockIn(ticketId) {
    // optimistic UI
    setTimeMap(prev => ({
      ...prev,
      [ticketId]: {
        runningStart: new Date().toISOString(),
        totalSeconds: prev?.[ticketId]?.totalSeconds ?? 0
      }
    }));

    const r = await fetch("/api/time/clock-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId, memberId: session.member.id }),
    });
    if (!r.ok) {
      // revert if failed
      setTimeMap(prev => ({
        ...prev,
        [ticketId]: { runningStart: null, totalSeconds: prev?.[ticketId]?.totalSeconds ?? 0 }
      }));
      const j = await r.json().catch(() => ({}));
      alert(j?.error || "Failed to clock in");
    } else {
      const j = await r.json();
      // align to server start (in case of drift)
      setTimeMap(prev => ({
        ...prev,
        [ticketId]: { runningStart: j.runningStart, totalSeconds: prev?.[ticketId]?.totalSeconds ?? 0 }
      }));
    }
  }

  async function handleClockOut(ticketId) {
    const r = await fetch("/api/time/clock-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId, memberId: session.member.id }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      alert(j?.error || "Failed to clock out");
      return;
    }
    // set total to server cumulative, and stop running
    setTimeMap(prev => ({
      ...prev,
      [ticketId]: { runningStart: null, totalSeconds: j.totalSeconds ?? (prev?.[ticketId]?.totalSeconds ?? 0) }
    }));
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-200">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/admin")} className="text-sm border rounded-lg px-3 py-1.5 hover:bg-gray-50">← Back</button>
            <h1 className="text-lg font-semibold">My tickets</h1>
          </div>
          <div className="text-sm text-gray-600">Signed in as <span className="font-medium">{session.member.name}</span></div>
        </div>
      </div>

      {/* Board */}
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
                onCardClick={(t) => setSelected(t)}
                onDropCard={moveTicket}
                memberId={session.member.id}
                timeMap={timeMap}
                onStart={handleClockIn}
                onStop={handleClockOut}
              />
            ))}
          </div>
        )}
      </div>

      <TicketModal
        ticket={selected}
        onClose={() => setSelected(null)}
        memberId={session?.member?.id}
        timeEntry={selected ? timeMap[selected.id] : null}
        onStart={handleClockIn}
        onStop={handleClockOut}
      />
    </div>
  );
}
