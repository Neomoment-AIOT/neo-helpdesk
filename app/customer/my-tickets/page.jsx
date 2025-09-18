"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCustomerSession, clearCustomerSession } from "../../lib/clientAuth";

const STATUS_ORDER = ["NOT_STARTED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"];
const STATUS_LABEL = {
    NOT_STARTED: "Not started",
    IN_PROGRESS: "In progress",
    ON_HOLD: "On hold",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
};

function Badge({ children }) {
    return (
        <span className="inline-flex items-center px-2 py-0.5 text-[10px] rounded-full bg-gray-100 border">
            {children}
        </span>
    );
}

function Column({ title, tickets, onCardClick }) {
    return (
        <div className="bg-gray-50 border rounded-xl p-3 flex flex-col w-[280px] md:flex-1 min-w-[260px] h-full">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{title}</h3>
                <span className="text-xs text-gray-500">{tickets.length}</span>
            </div>

            {/* key bit: make list area consume remaining height and scroll internally */}
            <div className="mt-2 space-y-2 overflow-y-auto pr-1 min-h-0">
                {tickets.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => onCardClick(t)}
                        className="w-full text-left bg-white border rounded-lg p-3 shadow-sm hover:shadow transition-shadow"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono text-gray-500">{t.ticket_id}</span>
                            {/*  {t.ticket_type && <Badge>{t.ticket_type}</Badge>} */}
                        </div>
                        <div className="mt-1 text-sm font-medium">{t.client_name}</div>
                        <div className="mt-1 text-xs text-gray-600 break-words line-clamp-3">
                            {t.description}
                        </div>
                        <div className="mt-2 text-[11px] text-gray-500">
                            {t.created_at ? new Date(t.created_at).toLocaleString() : ""}
                        </div>
                    </button>
                ))}

                {!tickets.length && (
                    <div className="text-xs text-gray-400 text-center py-4">No tickets</div>
                )}
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
            aria-label="Ticket details"
            onClick={(e) => {
                // click outside to close
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
                {/* header */}
                <div className="sticky top-0 bg-white/90 backdrop-blur border-b px-5 py-3 flex items-center justify-between rounded-t-xl">
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500">Ticket</span>
                        <span className="font-semibold">{ticket.ticket_id}</span>
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
                        <div className="text-xs text-gray-500">Client name</div>
                        <div className="text-sm font-medium">{ticket.client_name}</div>
                    </div>

                    <div>
                        <div className="text-xs text-gray-500 mb-1">Description</div>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{ticket.description}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                            <div className="text-xs text-gray-500">Created</div>
                            <div>{ticket.created_at ? new Date(ticket.created_at).toLocaleString() : "—"}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Started</div>
                            <div>{ticket.started_at ? new Date(ticket.started_at).toLocaleString() : "—"}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Completed</div>
                            <div>{ticket.completed_at ? new Date(ticket.completed_at).toLocaleString() : "—"}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Updated</div>
                            <div>{ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : "—"}</div>
                        </div>
                    </div>

                    {/* Optional: histories if your list endpoint includes them */}
                    {Array.isArray(ticket.histories) && ticket.histories.length > 0 && (
                        <div>
                            <div className="text-xs text-gray-500 mb-2">History</div>
                            <ul className="space-y-2">
                                {ticket.histories.map((h) => (
                                    <li key={h.id} className="border rounded p-2">
                                        <div className="text-xs text-gray-500">
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
    );
}

export default function MyTicketsPage() {
    const router = useRouter();
    const [session, setSession] = useState(null);
    const [allTickets, setAllTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null); // ← for modal

    useEffect(() => {
        const s = getCustomerSession();
        if (!s) {
            router.replace("/login");
            return;
        }
        setSession(s);
    }, [router]);

    useEffect(() => {
        async function load() {
            if (!session) return;
            setLoading(true);
            try {
                const res = await fetch(`/api/tickets/list?orgId=${session.orgId}&type=EXTERNAL&page=1&pageSize=1000`);
                const data = await res.json();
                if (res.ok) setAllTickets(data.tickets || []);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [session]);

    const grouped = useMemo(() => {
        const onlyExternal = allTickets.filter(t => t.ticket_type === "EXTERNAL");
        const map = Object.fromEntries(STATUS_ORDER.map((s) => [s, []]));
        for (const t of onlyExternal) {
            if (map[t.status]) map[t.status].push(t);
            else map.NOT_STARTED.push(t);
        }
        return map;
    }, [allTickets]);

    if (!session) return null;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top bar */}
            <div className="sticky top-0 z-10 bg-white border-b">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div>
                        <div className="text-xs text-gray-500">Organization</div>
                        <div className="font-semibold">{session.orgName}</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => router.push("/customer/ticket")}
                            className="text-sm border rounded-lg px-3 py-1.5"
                        >
                            Create ticket
                        </button>
                        <button
                            onClick={() => {
                                clearCustomerSession();
                                router.replace("/login");
                            }}
                            className="text-sm text-gray-700 hover:text-gray-900 border rounded-lg px-3 py-1.5"
                        >
                            Log out
                        </button>
                    </div>
                </div>
            </div>

            {/* Board: fix total height; let columns scroll inside */}
            <div className="max-w-6xl mx-auto px-4 py-5 h-[calc(100vh-120px)] flex flex-col">
                <h1 className="text-lg font-semibold mb-3">My tickets</h1>

                {loading ? (
                    <div className="text-sm text-gray-500">Loading…</div>
                ) : (
                    // The board area itself expands, but columns scroll internally.
                    <div className="flex gap-3 overflow-x-auto pb-3 flex-1 min-h-0">
                        {STATUS_ORDER.map((s) => (
                            <Column
                                key={s}
                                title={STATUS_LABEL[s]}
                                tickets={grouped[s]}
                                onCardClick={setSelected}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Fullscreen ticket modal */}
            <TicketModal ticket={selected} onClose={() => setSelected(null)} />
        </div>
    );
}
