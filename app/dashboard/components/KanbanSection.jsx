"use client";

const STATUS_STYLES = {
  NOT_STARTED: "bg-red-50 text-red-700 border-red-200",
  IN_PROGRESS: "bg-yellow-50 text-yellow-800 border-yellow-200",
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
  ON_HOLD: "bg-orange-50 text-orange-700 border-orange-200",
  CANCELLED: "bg-slate-100 text-slate-600 border-slate-200",
};

function prettyStatus(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function KanbanSection({ ticketsByStatus, ticketsCount, onRefresh, onOpenTicket }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Kanban</h2>
        <button
          onClick={onRefresh}
          className="border border-slate-300 rounded px-2 py-1 text-sm hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KanbanColumn title="Not Started" items={ticketsByStatus.NOT_STARTED} onOpenTicket={onOpenTicket} />
        <KanbanColumn title="In Progress" items={ticketsByStatus.IN_PROGRESS} onOpenTicket={onOpenTicket} />
        <KanbanColumn title="On Hold" items={ticketsByStatus.ON_HOLD} onOpenTicket={onOpenTicket} />
        <KanbanColumn title="Completed" items={ticketsByStatus.COMPLETED} onOpenTicket={onOpenTicket} />
        <KanbanColumn title="Cancelled" items={ticketsByStatus.CANCELLED} onOpenTicket={onOpenTicket} />
      </div>

      {!ticketsCount && <p className="text-xs text-slate-500">No tickets found for this context.</p>}
    </section>
  );
}

function KanbanColumn({ title, items = [], onOpenTicket }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col">
      {/* sticky-ish column header */}
      <div className="font-medium text-slate-700 mb-2 flex items-center justify-between">
        <span>{title}</span>
        <span className="text-xs text-slate-500">{items.length}</span>
      </div>

      {/* Fixed-height body that scrolls internally */}
      <div className="space-y-2 flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 max-h-[70vh]">
        {items.map((t) => {
          const created = t.created_at ? new Date(t.created_at) : null;
          const timeStr = created ? created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
          const dateStr = created ? created.toLocaleDateString() : "";

          return (
            <button
              key={t.id}
              onClick={() => onOpenTicket(t)}
              className="w-full text-left rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 p-3"
            >
              {/* Top row: status tag (left) + time (right) */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full border ${STATUS_STYLES[t.status] || STATUS_STYLES.CANCELLED}`}
                >
                  {prettyStatus(t.status || "NOT_STARTED")}
                </span>
                <span className="text-[11px] text-slate-500">{timeStr}</span>
              </div>

              {/* Title row: client name + ticket id (ellipsis-safe) */}
              <div className="mt-1 flex items-center justify-between gap-2 min-w-0">
                <div className="font-medium truncate" title={t.client_name}>
                  {t.client_name || "Untitled ticket"}
                </div>
                <span
                  className="inline-block text-[11px] px-1.5 py-0.5 rounded-md border border-slate-300 bg-white text-slate-600 max-w-[120px] truncate"
                  title={`#${t.ticket_id}`}
                >
                  #{t.ticket_id}
                </span>
              </div>

              {/* Description */}
              {t.description && (
                <div className="text-xs text-slate-600 mt-2 line-clamp-3">
                  {t.description}
                </div>
              )}

              {/* Footer: org (left) + date (right) */}
              <div className="mt-2 flex items-center justify-between">
                <div className="text-[11px] text-slate-500 truncate">
                  {t.orgName || `Org ${t.organization_id || "-"}`}
                </div>
                <div className="text-[11px] text-slate-500">{dateStr}</div>
              </div>
            </button>
          );
        })}

        {!items.length && (
          <div className="text-xs text-slate-400 border border-dashed border-slate-300 rounded p-3">No tickets</div>
        )}
      </div>
    </div>
  );
}
