"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import TeamManager from "../components/TeamManager";

async function parseJsonSafe(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch (e) { console.error("Non-JSON response:", text); return null; }
}

function Badge({ children }) {
  return <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-gray-100 border">{children}</span>;
}

export default function DashboardPage() {
  // left side
  const [members, setMembers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [teams, setTeams] = useState([]);
  const [newClientName, setNewClientName] = useState("");

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
  const [typeFilter, setTypeFilter] = useState("all"); // INTERNAL | EXTERNAL | all

  // modals
  const [activeTicket, setActiveTicket] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState("INTERNAL");
  const [newOrgId, setNewOrgId] = useState("");
  const [creating, setCreating] = useState(false);

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
        setTickets(prev => (pageToLoad === 1 || replace ? data.tickets : [...prev, ...data.tickets]));
        setTotal(data.total || 0);
        setPage(pageToLoad + 1);
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
        ticket_type: newType, // ignored by internal route, but ok to send
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

      // Success – show the generated ticket id
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


  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 h-[88vh] min-h-0">
        {/* Left: Teams/Skills */}
        <div className="lg:col-span-1 h-full min-h-0">
          <TeamManager teams={teams} members={members} skills={skills} />
        </div>

        {/* Right: Tickets */}
        <div className="lg:col-span-2 h-full min-h-0 flex flex-col">
          <div className="bg-white rounded-xl shadow-md p-4 flex flex-col h-full">
            {/* Header controls */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
              <h2 className="text-lg font-bold">Tickets <span className="text-gray-500 text-sm">({total})</span></h2>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Search tickets or org..."
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  className="p-2 border rounded text-sm w-full sm:w-64"
                />
                <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} className="p-2 border rounded text-sm">
                  <option value="all">All organizations</option>
                  {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="p-2 border rounded text-sm">
                  <option value="all">All types</option>
                  <option value="INTERNAL">Internal</option>
                  <option value="EXTERNAL">External</option>
                </select>
                <button onClick={() => setShowNewModal(true)} className="bg-blue-600 text-white px-3 py-2 rounded text-sm ml-auto">+ Ticket</button>
              </div>
            </div>

            {/* Tickets list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 md:pr-2">
              {tickets.map((t) => (
                <div key={t.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors flex flex-col gap-3 md:grid md:grid-cols-6 md:gap-4">
                  {/* ID + Created */}
                  <div>
                    <div className="font-mono text-[13px]">{t.ticket_id}</div>
                    <div className="text-xs text-gray-500">
                      {t.created_at ? new Date(t.created_at).toLocaleString() : ""}
                    </div>
                  </div>

                  {/* Org + Description */}
                  <div className="md:col-span-2">
                    <div className="flex items-center gap-2 mb-1">
                      {t.organization && <Badge>{t.organization.name}</Badge>}
                      <Badge>{t.ticket_type}</Badge>
                      <Badge>Status: {t.status}</Badge>
                    </div>
                    <div className="font-semibold truncate">{t.client_name}</div>
                    <div className="text-sm text-gray-700 break-words">{t.description}</div>
                  </div>

                  {/* Start / End */}
                  <div className="text-sm">
                    <div>Start: {t.started_at ? new Date(t.started_at).toLocaleString() : "—"}</div>
                    <div>End: {t.completed_at ? new Date(t.completed_at).toLocaleString() : "—"}</div>
                  </div>

                  {/* Team */}
                  <div className="text-sm">Team: {t.team?.name || "—"}</div>

                  {/* Assigned */}
                  <div className="text-sm">Assigned: {t.assignee?.name || "—"}</div>

                  {/* Actions */}
                  <div className="text-right">
                    <button onClick={() => setActiveTicket(t)} className="text-sm px-3 py-1 border rounded hover:bg-blue-50 w-full md:w-auto">
                      {t.assignee?.name ? "Reassign" : "Assign"}
                    </button>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} className="h-6" />
              {!tickets.length && <p className="text-gray-500 mt-4 text-center">No tickets found</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Assign modal */}
      {activeTicket && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="font-bold mb-2">Assign {activeTicket.ticket_id}</h3>
            <p className="text-sm text-gray-600 mb-3">{activeTicket.description}</p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between border-b py-2">
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-xs text-gray-500">{m.email}</div>
                    <div className="text-xs text-gray-400">
                      {m.role} • {Array.isArray(m.teams) && m.teams.length ? m.teams.map(t => t.name).join(", ") : "—"}
                    </div>
                  </div>
                  <button onClick={() => assignToMember(m.id)} className="bg-blue-600 text-white px-3 py-1 rounded">Assign</button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setActiveTicket(null)} className="px-3 py-1 border rounded">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* +Ticket modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="font-bold mb-4">Create Ticket</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Your name</label>
                <input
                  className="w-full border rounded p-2"
                  placeholder="Who is creating this ticket?"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  className="w-full border rounded p-2"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                >
                  <option value="INTERNAL">Internal</option>
                  <option value="EXTERNAL" disabled>External (use customer portal)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">This endpoint creates INTERNAL tickets.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Organization (optional)</label>
                <select
                  className="w-full border rounded p-2"
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
                  className="w-full border rounded p-2 min-h-[120px]"
                  placeholder="Describe the ticket..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowNewModal(false)} className="px-3 py-1 border rounded">Cancel</button>
              <button
                onClick={createTicket}
                disabled={creating}
                className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
