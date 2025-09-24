"use client";
import { useState } from "react";

export default function TicketDetails() {
  const [ticketId, setTicketId] = useState("");
  const [ticket, setTicket] = useState(null);

  const fetchTicket = async () => {
    if (!ticketId.trim()) return;
    try {
      const res = await fetch(`/api/tickets/${ticketId}`);
      if (!res.ok) throw new Error("Ticket not found");
      const data = await res.json();
      setTicket(data);
    } catch (err) {
      alert(err.message);
      setTicket(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") fetchTicket();
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Search Ticket</h2>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Enter Ticket ID"
          value={ticketId}
          onChange={(e) => setTicketId(e.target.value)}
          onKeyDown={handleKeyDown}
          className="border p-2 flex-1 rounded"
        />
        <button
          onClick={fetchTicket}
          className="bg-blue-600 !text-white px-4 py-2 rounded"
        >
          Search
        </button>
      </div>

      {ticket && (
        <div className="bg-gray-100 p-4 rounded shadow space-y-2">
          <p><strong>ID:</strong> {ticket.ticket_id || "-"}</p>
          <p><strong>Client:</strong> {ticket.client_name || "-"}</p>
          <p><strong>Description:</strong> {ticket.description || "-"}</p>
          <p><strong>Status:</strong> {ticket.status || "-"}</p>
          <p><strong>Created:</strong> {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : "-"}</p>
          <p><strong>Start Time:</strong> {ticket.started_at ? new Date(ticket.started_at).toLocaleString() : "-"}</p>
          <p><strong>End Time:</strong> {ticket.completed_at ? new Date(ticket.completed_at).toLocaleString() : "-"}</p>
          <p><strong>Team:</strong> {ticket.teams?.name || "-"}</p>
          <p><strong>Assigned To:</strong> {ticket.members?.name || "-"}</p>

          <h3 className="font-bold mt-4">History</h3>
          {ticket.ticket_histories?.length > 0 ? (
            <ul className="list-disc ml-6">
              {ticket.ticket_histories.map((h) => (
                <li key={h.id}>
                  {h.status || "-"} - {h.created_at ? new Date(h.created_at).toLocaleString() : "-"} {h.note && `(${h.note})`}
                </li>
              ))}
            </ul>
          ) : (
            <p className="!text-gray-500">No history available</p>
          )}
        </div>
      )}
    </div>
  );
}
