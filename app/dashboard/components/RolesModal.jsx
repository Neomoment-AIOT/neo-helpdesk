"use client";

import Toggle from "./Toggle";

export default function RolesModal({ open, onClose, roleForm, setRoleForm, onSave, orgSelectId }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-4 w-full max-w-md space-y-3 shadow-xl border border-slate-200">
        <h3 className="font-semibold">Add Role</h3>
        <input
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
          placeholder="Role name (e.g. Project Manager)"
          value={roleForm.name}
          onChange={(e) => setRoleForm((f) => ({ ...f, name: e.target.value }))}
        />
        <div className="space-y-2">
          <Toggle
            label="Can view tickets (Kanban only)"
            checked={roleForm.can_view_tickets}
            onChange={(v) => setRoleForm((f) => ({ ...f, can_view_tickets: v }))}
          />
          <Toggle
            label="Can create tickets"
            checked={roleForm.can_send_tickets}
            onChange={(v) => setRoleForm((f) => ({ ...f, can_send_tickets: v }))}
          />
       
          <Toggle
            label="Can create roles"
            checked={!!roleForm.can_create_roles}
            onChange={(v) => setRoleForm((f) => ({ ...f, can_create_roles: v }))}
          />
          <Toggle
            label="Can create users"
            checked={roleForm.can_create_users}
            onChange={(v) => setRoleForm((f) => ({ ...f, can_create_users: v }))}
          />
          <Toggle
            label="Can create organizations"
            checked={roleForm.can_create_orgs}
            onChange={(v) => setRoleForm((f) => ({ ...f, can_create_orgs: v }))}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            className="border border-slate-300 rounded px-3 py-1.5 text-sm hover:bg-slate-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="btn-primary" onClick={onSave} disabled={!orgSelectId || !roleForm.name.trim()}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
