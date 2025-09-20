"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import TeamManager from "../components/TeamManager";

function formatDuration(totalSeconds = 0) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h ? `${h}h ` : ""}${m}m`.trim() || "0m";
}

async function parseJsonSafe(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { console.error("Non-JSON response:", text); return null; }
}

const STATUS_LABEL = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function classNames(...c) { return c.filter(Boolean).join(" "); }

function statusStyles(status) {
  switch (status) {
    case "NOT_STARTED": return "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200";
    case "IN_PROGRESS": return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200";
    case "ON_HOLD": return "bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-200";
    case "COMPLETED": return "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200";
    case "CANCELLED": return "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200";
    default: return "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200";
  }
}

function typeStyles(type) {
  return type === "EXTERNAL"
    ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200"
    : "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200";
}

function Chip({ children, className }) {
  return (
    <span className={classNames("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", className)}>
      {children}
    </span>
  );
}

function KeyValue({ label, value }) {
  return (
    <div className="text-xs">
      <div className="!text-gray-500">{label}</div>
      <div className="font-medium !text-gray-900">{value ?? "—"}</div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  // time spent per ticket (seconds) — read-only display
  const [timeSpent, setTimeSpent] = useState({}); // { [ticketId]: total_seconds }
  const [detailsTicket, setDetailsTicket] = useState(null);

  // left side
  const [members, setMembers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [teams, setTeams] = useState([]);

  // tickets
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const loadingRef = useRef(false);
  const observerRef = useRef(null);

  // filters/search
  const [ticketSearch, setTicketSearch] = useState("");
  const [organizations, setOrganizations] = useState([]);
  const [orgFilter, setOrgFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // modals
  const [activeTicket, setActiveTicket] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState("INTERNAL");
  const [newOrgId, setNewOrgId] = useState("");
  const [creating, setCreating] = useState(false);

  // --- fetch time summary (read-only) ---
  async function fetchTimeSummary(tix) {
    if (!tix?.length) return;
    const ids = tix.map(t => t.id).join(",");
    const res = await fetch(`/api/tickets/time/summary?ids=${ids}`);
    const data = await parseJsonSafe(res);
    if (!res.ok) return;

    const ts = {};
    for (const row of data.summary || []) {
      ts[row.ticketId] = row.total_seconds || 0;
    }
    setTimeSpent(ts);
  }

  // fetchers
  useEffect(() => {
    fetchOrganizations();
    fetchMembers();
    fetchTeams();
    loadTickets(1, ticketSearch, orgFilter, typeFilter, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchOrganizations() {
    const res = await fetch("/api/organizations/list");
    const data = await parseJsonSafe(res);
    setOrganizations(data?.organizations ?? []);
  }

  async function fetchMembers() {
    const res = await fetch("/api/members/list");
    const data = await parseJsonSafe(res);
    const arr = Array.isArray(data?.members) ? data.members : [];
    setMembers(arr.map(m => ({
      ...m,
      teams: Array.isArray(m.teams) ? m.teams : [],
      skills: Array.isArray(m.skills) ? m.skills : [],
    })));
  }

  async function fetchTeams() {
    const res = await fetch("/api/teams/list");
    const data = await parseJsonSafe(res);
    setTeams(Array.isArray(data?.teams) ? data.teams : []);
  }

  async function loadTickets(pageToLoad = page, q = ticketSearch, org = orgFilter, type = typeFilter, replace = false) {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const params = new URLSearchParams();
      params.set("page", String(pageToLoad));
      params.set("pageSize", "20");
      if (q) params.set("q", q);
      if (org !== "all") params.set("orgId", org);
      if (type !== "all") params.set("type", type);

      const res = await fetch(`/api/tickets/list?${params.toString()}`);
      const data = await parseJsonSafe(res);
      if (res.ok) {
        let nextList = [];
        setTickets(prev => {
          nextList = (pageToLoad === 1 || replace) ? (data.tickets || []) : [...prev, ...(data.tickets || [])];
          return nextList;
        });
        setTotal(data.total || 0);
        setPage(pageToLoad + 1);
        await fetchTimeSummary(nextList);
      }
    } finally {
      loadingRef.current = false;
    }
  }

  const bottomRef = useCallback((node) => {
    if (loadingRef.current) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && tickets.length < total) {
        loadTickets(page, ticketSearch, orgFilter, typeFilter);
      }
    }, { root: null, threshold: 1 });
    if (node) observerRef.current.observe(node);
  }, [tickets, total, page, ticketSearch, orgFilter, typeFilter]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadTickets(1, ticketSearch, orgFilter, typeFilter, true);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketSearch, orgFilter, typeFilter]);

  async function assignToMember(memberId) {
    if (!activeTicket) return;
    const res = await fetch("/api/tickets/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: activeTicket.ticket_id, memberId }),
    });
    const data = await parseJsonSafe(res);
    if (res.ok) {
      setTickets(prev => prev.map(t => t.id === activeTicket.id ? data.ticket : t));
      setActiveTicket(null);
    } else {
      alert(data?.error || "Failed to assign ticket");
    }
  }

  async function createTicket() {
    if (!newClientName.trim()) return alert("Please enter your name");
    if (!newDesc.trim()) return alert("Please enter a description");

    setCreating(true);
    try {
      const body = {
        client_name: newClientName.trim(),
        description: newDesc.trim(),
        organization_id: newOrgId ? Number(newOrgId) : undefined,
        ticket_type: newType,
      };

      const res = await fetch("/api/tickets/internal/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        alert(data?.error || "Failed to create ticket");
        return;
      }

      alert(`Your ticket has been created.\nTicket ID: ${data?.ticket?.ticket_id || "—"}`);

      setShowNewModal(false);
      setNewClientName("");
      setNewDesc("");
      setNewType("INTERNAL");
      setNewOrgId("");

      setPage(1);
      await loadTickets(1, ticketSearch, orgFilter, typeFilter, true);
    } finally {
      setCreating(false);
    }
  }

  const headerCount = useMemo(() => new Intl.NumberFormat().format(total), [total]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 h-[88vh] min-h-0">
        {/* Left: Teams/Skills */}
        <section className="lg:col-span-1 h-full min-h-0">
          <div className="h-full min-h-0">
            <TeamManager teams={teams} members={members} skills={skills} />
          </div>
        </section>

        {/* Right: Tickets */}
        <section className="lg:col-span-2 h-full min-h-0 flex flex-col">
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border p-4 flex flex-col h-full">
            {/* header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold tracking-tight">Tickets</h2>
                <span className="text-sm !text-gray-500">({headerCount})</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Search tickets or org..."
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  className="p-2 border rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <select
                  value={orgFilter}
                  onChange={(e) => setOrgFilter(e.target.value)}
                  className="p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="all">All organizations</option>
                  {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="all">All types</option>
                  <option value="INTERNAL">Internal</option>
                  <option value="EXTERNAL">External</option>
                </select>

                <button
                  onClick={() => router.push("/admin/mytickets")}
                  className="border px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition"
                >
                  My tickets
                </button>

                <button
                  onClick={() => setShowNewModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 !text-white px-3 py-2 rounded-lg text-sm ml-auto transition"
                >
                  + Ticket
                </button>
              </div>
            </div>

            {/* list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 md:pr-2">
              {tickets.map((t) => {
                const totalDisplay = formatDuration(timeSpent[t.id] || 0);
                return (
                  <article
                    key={t.id}
                    onClick={() => setDetailsTicket(t)}
                    className="group cursor-pointer border rounded-xl p-3 md:p-4 bg-white hover:bg-slate-50 transition shadow-[0_1px_0_rgba(0,0,0,0.03)]"
                  >
                    <div className="grid gap-3 md:grid-cols-12 md:gap-4 items-start">
                      {/* ID + created */}
                      <div className="md:col-span-2">
                        <div className="flex items-center justify-between md:block">
                          <span className="font-mono text-xs md:text-[13px] !text-gray-700">{t.ticket_id}</span>
                          <span className="ml-2 md:ml-0 block text-[11px] !text-gray-500">
                            {t.created_at ? new Date(t.created_at).toLocaleString() : ""}
                          </span>
                        </div>
                      </div>

                      {/* Middle: chips + content */}
                      <div className="md:col-span-6">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          {t.organization?.name && (
                            <Chip className="bg-sky-50 !text-sky-700 ring-1 ring-inset ring-sky-200">
                              {t.organization.name}
                            </Chip>
                          )}
                          <Chip className={typeStyles(t.ticket_type)}>{t.ticket_type}</Chip>
                          <Chip className={statusStyles(t.status)}>{STATUS_LABEL[t.status] ?? t.status}</Chip>
                          <Chip className="bg-violet-50 !text-violet-700 ring-1 ring-inset ring-violet-200">
                            ⏱ {totalDisplay}
                          </Chip>
                        </div>

                        <div className="font-semibold !text-gray-900 truncate">{t.client_name}</div>
                        <div className="mt-1 text-sm !text-gray-700 break-words line-clamp-2">
                          {t.description}
                        </div>

                      </div>

                      {/* timing */}
                      <div className="md:col-span-2 space-y-2">
                        <KeyValue label="Start" value={t.started_at ? new Date(t.started_at).toLocaleString() : "—"} />
                        <KeyValue label="End" value={t.completed_at ? new Date(t.completed_at).toLocaleString() : "—"} />
                      </div>

                      {/* team / assignee */}
                      <div className="md:col-span-1 space-y-2">
                        <KeyValue label="Team" value={t.team?.name || "—"} />
                        <KeyValue label="Assigned" value={t.assignee?.name || "—"} />
                      </div>

                      {/* action: assign only (clock controls removed) */}
                      {/* action: assign only */}
                      <div className="md:col-span-1">
                        <div className="flex md:justify-end">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setActiveTicket(t); }}
                            className="w-full md:w-auto text-sm px-3 py-1.5 rounded-lg border bg-white hover:bg-blue-50
                   !text-blue-700 border-blue-200 transition whitespace-nowrap"
                          >
                            {t.assignee?.name ? "Reassign" : "Assign"}
                          </button>
                        </div>
                      </div>

                    </div>
                  </article>
                );
              })}

              <div ref={bottomRef} className="h-6" />
              {!tickets.length && (
                <p className="!text-gray-500 mt-6 text-center text-sm">No tickets found</p>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Assign modal */}
      {activeTicket && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-2">
          <div className="bg-white rounded-2xl border shadow-xl w-full max-w-lg">
            <div className="px-5 py-4 border-b">
              <h3 className="font-semibold">Assign {activeTicket.ticket_id}</h3>
              <p className="text-sm !text-gray-600 mt-1 line-clamp-2">{activeTicket.description}</p>
            </div>

            <div className="px-5 py-4 space-y-2 max-h-80 overflow-y-auto">
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between border rounded-lg p-2">
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-xs !text-gray-500">{m.email}</div>
                    <div className="text-xs !text-gray-400">
                      {m.role} • {Array.isArray(m.teams) && m.teams.length ? m.teams.map(t => t.name).join(", ") : "—"}
                    </div>
                  </div>
                  <button
                    onClick={() => assignToMember(m.id)}
                    className="bg-blue-600 hover:bg-blue-700 !text-white px-3 py-1.5 rounded-lg text-sm transition"
                  >
                    Assign
                  </button>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t flex justify-end">
              <button
                onClick={() => setActiveTicket(null)}
                className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* +Ticket modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2">
          <div className="bg-white rounded-2xl border shadow-xl w-full max-w-lg">
            <div className="px-5 py-4 border-b">
              <h3 className="font-semibold">Create Ticket</h3>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Your name</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Who is creating this ticket?"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                >
                  <option value="INTERNAL">Internal</option>
                  <option value="EXTERNAL" disabled>External (use customer portal)</option>
                </select>
                <p className="text-xs !text-gray-500 mt-1">This endpoint creates INTERNAL tickets.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Organization (optional)</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  value={newOrgId}
                  onChange={(e) => setNewOrgId(e.target.value)}
                >
                  <option value="">— None —</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Describe the ticket..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowNewModal(false)} className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
              <button
                onClick={createTicket}
                disabled={creating}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 !text-white rounded-lg text-sm disabled:opacity-50 transition"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}


      <TicketDetailsModal
        ticket={detailsTicket}
        onClose={() => setDetailsTicket(null)}
        totalSeconds={detailsTicket ? (timeSpent[detailsTicket.id] || 0) : 0}
      />

    </div>
  );

  function TicketDetailsModal({ ticket, onClose, totalSeconds }) {
    if (!ticket) return null;
    const created = ticket.created_at ? new Date(ticket.created_at).toLocaleString() : "—";
    const started = ticket.started_at ? new Date(ticket.started_at).toLocaleString() : "—";
    const completed = ticket.completed_at ? new Date(ticket.completed_at).toLocaleString() : "—";
    const updated = ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : "—";

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2"
        role="dialog"
        aria-modal="true"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl border">
          {/* Header */}
          <div className="sticky top-0 bg-white/90 backdrop-blur border-b px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-xs !text-gray-500">Ticket</span>
                <span className="font-semibold">{ticket.ticket_id}</span>
              </div>
              <span className="inline-flex items-center rounded-full border bg-violet-50 !text-violet-700 ring-1 ring-violet-200 px-2 py-0.5 text-[11px]">
                ⏱ {formatDuration(totalSeconds || 0)}
              </span>
            </div>
            <button onClick={onClose} className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50">
              Close
            </button>
          </div>

          {/* Body (scrollable) */}
          <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[calc(90vh-56px)]">
            <div className="flex flex-wrap gap-2">
              <Chip className={statusStyles(ticket.status)}>{ticket.status}</Chip>
              <Chip className={ticket.ticket_type === "EXTERNAL"
                ? "bg-indigo-50 !text-indigo-700 ring-1 ring-indigo-200"
                : "bg-slate-50 !text-slate-700 ring-1 ring-slate-200"}>
                {ticket.ticket_type}
              </Chip>
              {ticket.organization?.name && <Chip className="bg-sky-50 !text-sky-700 ring-1 ring-sky-200">Org: {ticket.organization.name}</Chip>}
              {ticket.team?.name && <Chip className="bg-teal-50 !text-teal-700 ring-1 ring-teal-200">Team: {ticket.team.name}</Chip>}
              {ticket.assignee?.name && <Chip className="bg-amber-50 !text-amber-700 ring-1 ring-amber-200">Assignee: {ticket.assignee.name}</Chip>}
            </div>

            <div>
              <div className="text-xs !text-gray-500">Client name</div>
              <div className="text-sm font-medium">{ticket.client_name}</div>
            </div>

            <div>
              <div className="text-xs !text-gray-500 mb-1">Description</div>
              {/* Long text: scroll inside a soft container */}
              <div className="bg-gray-50 rounded-lg border p-3 text-sm !text-gray-800 whitespace-pre-wrap max-h-60 overflow-y-auto">
                {ticket.description || "—"}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><div className="text-xs !text-gray-500">Created</div><div>{created}</div></div>
              <div><div className="text-xs !text-gray-500">Started</div><div>{started}</div></div>
              <div><div className="text-xs !text-gray-500">Completed</div><div>{completed}</div></div>
              <div><div className="text-xs !text-gray-500">Updated</div><div>{updated}</div></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

}
