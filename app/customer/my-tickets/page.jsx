"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCustomerSession, clearCustomerSession, authHeaders } from "../../lib/clientAuth";

const STATUS_ORDER = ["NOT_STARTED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"];
const STATUS_LABEL = { NOT_STARTED:"Not started", IN_PROGRESS:"In progress", ON_HOLD:"On hold", COMPLETED:"Completed", CANCELLED:"Cancelled" };

function Card({ t }) {
  return (
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    <span className="inline-flex items-center px-2 py-0.5 text-[10px] rounded-full bg-gray-100 border">
      {children}
    </span>
  );
}

// 🔹 CHANGED: accept a "seconds" prop and render a time chip
function Card({ ticket, onClick, seconds }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border bg-white/95 hover:bg-white shadow-sm hover:shadow-md transition active:scale-[0.99] px-3 py-3"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono !text-gray-500">{ticket.ticket_id}</span>

        {/* Time spent chip */}
        <span className="inline-flex items-center rounded-full border bg-violet-50 !text-violet-700 ring-1 ring-violet-200 px-2 py-0.5 text-[10px]">
          ⏱ {formatDuration(seconds || 0)}
        </span>
      </div>

      {/* org badge if present */}
      {ticket.organization?.name && (
        <div className="mt-1">
          <span className="inline-flex items-center rounded-full border bg-sky-50 !text-sky-700 ring-1 ring-sky-200 px-2 py-0.5 text-[10px]">
            {ticket.organization.name}
          </span>
        </div>
      )}

      <div className="mt-2 text-sm font-medium leading-5 !text-gray-900 line-clamp-2">
        {ticket.client_name}
      </div>

      <div className="mt-1 text-[12px] !text-gray-600 leading-5 line-clamp-3">
        {ticket.description}
      </div>

      <div className="mt-2 text-[11px] !text-gray-500">
        {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : ""}
      </div>
    </button>
  );
}

function ColumnHeader({ status, title, count }) {
  return (
    <div
      className="sticky top-0 z-10 -mx-2 px-2 pb-2 pt-1"
      style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.85), rgba(255,255,255,0.6))" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${ACCENTS[status]}`} />
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        </div>
        <span className="inline-flex items-center justify-center min-w-[26px] h-6 px-2 rounded-full text-[11px] font-semibold bg-gray-100 !text-gray-700 border">
          {count}
        </span>
      </div>
    </div>
  );
}

// 🔹 CHANGED: pass timeSpentMap down so each Card shows its seconds
function Column({ status, title, tickets, onCardClick, timeSpentMap }) {
  return (
    <div className="flex flex-col w-[300px] md:w-[320px] min-w-[280px] max-w-[360px] h-full rounded-xl border bg-gradient-to-b from-gray-50 to-white">
      <ColumnHeader status={status} title={title} count={tickets.length} />
      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2 space-y-2">
        <div className="space-y-2 p-0.5">
          {tickets.map((t) => (
            <Card key={t.id} ticket={t} onClick={() => onCardClick(t)} seconds={timeSpentMap[t.id]} />
          ))}
          {!tickets.length && (
            <div className="text-xs !text-gray-400 text-center py-6 select-none">No tickets</div>
          )}
        </div>
      </div>
    </div>
  );
}

// 🔹 CHANGED: accept "seconds" so modal shows the same time chip
function TicketModal({ ticket, onClose, seconds }) {
  if (!ticket) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2"
      role="dialog"
      aria-modal="true"
      aria-label="Ticket details"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border">
        {/* header */}
        <div className="sticky top-0 bg-white/90 backdrop-blur border-b px-5 py-3 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-xs !text-gray-500">Ticket</span>
              <span className="font-semibold">{ticket.ticket_id}</span>
            </div>
            {/* Time spent chip */}
            <span className="inline-flex items-center rounded-full border bg-violet-50 !text-violet-700 ring-1 ring-violet-200 px-2 py-0.5 text-[11px]">
              ⏱ {formatDuration(seconds || 0)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        {/* content */}
        <div className="px-5 py-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>Status: {ticket.status}</Badge>
            {ticket.ticket_type && <Badge>Type: {ticket.ticket_type}</Badge>}
            {ticket.organization?.name && <Badge>Org: {ticket.organization.name}</Badge>}
            {ticket.team?.name && <Badge>Team: {ticket.team.name}</Badge>}
            {ticket.assignee?.name && <Badge>Assignee: {ticket.assignee.name}</Badge>}
          </div>

          <div>
            <div className="text-xs !text-gray-500">Client name</div>
            <div className="text-sm font-medium">{ticket.client_name}</div>
          </div>

          <div>
            <div className="text-xs !text-gray-500 mb-1">Description</div>
            <p className="text-sm !text-gray-800 whitespace-pre-wrap">{ticket.description}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs !text-gray-500">Created</div>
              <div>{ticket.created_at ? new Date(ticket.created_at).toLocaleString() : "—"}</div>
            </div>
            <div>
              <div className="text-xs !text-gray-500">Started</div>
              <div>{ticket.started_at ? new Date(ticket.started_at).toLocaleString() : "—"}</div>
            </div>
            <div>
              <div className="text-xs !text-gray-500">Completed</div>
              <div>{ticket.completed_at ? new Date(ticket.completed_at).toLocaleString() : "—"}</div>
            </div>
            <div>
              <div className="text-xs !text-gray-500">Updated</div>
              <div>{ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : "—"}</div>
            </div>
          </div>

          {Array.isArray(ticket.histories) && ticket.histories.length > 0 && (
            <div>
              <div className="text-xs !text-gray-500 mb-2">History</div>
              <ul className="space-y-2">
                {ticket.histories.map((h) => (
                  <li key={h.id} className="border rounded p-2">
                    <div className="text-xs !text-gray-500">
                      {h.created_at ? new Date(h.created_at).toLocaleString() : ""}
                    </div>
                    <div className="text-sm">
                      {h.status} {h.note ? `• ${h.note}` : ""}
                      {h.changed_by ? ` • by ${h.changed_by}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
=======
    <button className="w-full text-left rounded-lg border bg-white px-3 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono text-gray-500">{t.ticket_id}</span>
        <span className="text-[11px] text-gray-500">{t.organization?.name}</span>
      </div>
      <div className="mt-1 text-sm font-medium">{t.client_name}</div>
      <div className="mt-1 text-[12px] text-gray-600 line-clamp-3">{t.description}</div>
    </button>
>>>>>>> Stashed changes
=======
    <button className="w-full text-left rounded-lg border bg-white px-3 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono text-gray-500">{t.ticket_id}</span>
        <span className="text-[11px] text-gray-500">{t.organization?.name}</span>
      </div>
      <div className="mt-1 text-sm font-medium">{t.client_name}</div>
      <div className="mt-1 text-[12px] text-gray-600 line-clamp-3">{t.description}</div>
    </button>
>>>>>>> Stashed changes
  );
}

export default function MyTicketsPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [orgs, setOrgs] = useState({ parent: null, children: [] });
  const [orgFilter, setOrgFilter] = useState("all");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = getCustomerSession();
    if (!s) { router.replace("/login"); return; }
    setSession(s);
  }, [router]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const res = await fetch(`/api/organizations/children?parent_id=${session.orgId}`, { headers: authHeaders() });
      const data = await res.json().catch(()=>({}));
      setOrgs({ parent: data.parent || null, children: data.children || [] });
    })();
  }, [session]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      setLoading(true);
      const qs = new URLSearchParams({ page: "1", pageSize: "1000", type: "EXTERNAL" });
      if (orgFilter === "all") {
        qs.set("orgId", String(session.orgId));
        qs.set("includeChildren", "1");
      } else {
        qs.set("orgId", String(orgFilter));
      }
      const res = await fetch(`/api/tickets/list?${qs}`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setTickets(data.tickets || []);
      setLoading(false);
    })();
  }, [session, orgFilter]);

  const grouped = useMemo(() => {
    const m = Object.fromEntries(STATUS_ORDER.map(s=>[s, []]));
    for (const t of tickets) { (m[t.status] || m.NOT_STARTED).push(t); }
    return m;
  }, [tickets]);

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-xs !text-gray-500">Organization</div>
            <div className="font-semibold">{session.orgName}</div>
          </div>
          <div className="flex items-center gap-2">
<<<<<<< Updated upstream
<<<<<<< Updated upstream
            <button
              onClick={() => router.push("/customer/ticket")}
              className="text-sm border rounded-lg px-3 py-1.5 hover:bg-gray-50"
            >
              Create ticket
            </button>
            <button
              onClick={() => { clearCustomerSession(); router.replace("/login"); }}
              className="text-sm !text-gray-700 hover:text-gray-900 border rounded-lg px-3 py-1.5"
            >
              Log out
            </button>
=======
=======
>>>>>>> Stashed changes
            <select value={orgFilter} onChange={e=>setOrgFilter(e.target.value)} className="p-2 border rounded-lg text-sm">
              <option value="all">All ({orgs.parent?.name ?? "Org"} + subs)</option>
              {orgs.parent && <option value={orgs.parent.id}>{orgs.parent.name}</option>}
              {orgs.children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <a href="/customer/ticket" className="text-sm border rounded-lg px-3 py-1.5">Create ticket</a>
            <button onClick={()=>{ clearCustomerSession(); router.replace("/login"); }} className="text-sm border rounded-lg px-3 py-1.5">Log out</button>
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5">
        <h1 className="text-lg font-semibold mb-3">My tickets</h1>
        {loading ? (
          <div className="text-sm !text-gray-500">Loading…</div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-3">
            {STATUS_ORDER.map(s => (
              <div key={s} className="flex-0 w-[300px] rounded-xl border bg-white p-2">
                <div className="sticky top-0 bg-white z-10 pb-2">
                  <div className="text-sm font-semibold">{STATUS_LABEL[s]} <span className="text-xs text-gray-500">({grouped[s].length})</span></div>
                </div>
                <div className="space-y-2">
                  {grouped[s].map(t => <Card key={t.id} t={t} />)}
                  {!grouped[s].length && <div className="text-xs text-gray-400 text-center py-6">No tickets</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
