"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCustomerSession, clearCustomerSession, authHeaders } from "../lib/clientAuth";

const BUILTIN_ROLES = ["MANAGER", "DEVELOPER", "TESTER", "VIEWER"];

export default function DashboardPage() {
  const router = useRouter();

  const [session, setSession] = useState(null);

  // tabs: users | orgs | roles | tickets | kanban
  const [tab, setTab] = useState("users");

  // Orgs
  const [orgParent, setOrgParent] = useState(null);
  const [orgChildren, setOrgChildren] = useState([]);
  const [orgSelectId, setOrgSelectId] = useState("");

  // Roles (for selected org)
  const [customRoles, setCustomRoles] = useState([]); // [{id,name,can_view_tickets,can_send_tickets,can_create_users,can_create_orgs}]
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleForm, setRoleForm] = useState({
    id: null,
    name: "",
    can_view_tickets: true, // NEW
    can_send_tickets: true,
    can_create_users: false,
    can_create_orgs: false,
  });

  // Users
  const [users, setUsers] = useState([]);
  const [uForm, setUForm] = useState({ name: "", email: "", role: "VIEWER", orgId: "" });
  const [uMsg, setUMsg] = useState("");

  // Tickets
  const [tForm, setTForm] = useState({ client_name: "", description: "", organization_id: "" });
  const [tMsg, setTMsg] = useState("");

  // Sub-org form
  const [sForm, setSForm] = useState({ name: "", email: "" });
  const [sMsg, setSMsg] = useState("");

  // --- session ---
  useEffect(() => {
    const s = getCustomerSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    setSession(s);
  }, [router]);

  // --- data loaders ---
  async function loadOrgs(parentId) {
    try {
      const res = await fetch(`/api/organizations/children?parent_id=${parentId}`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) {
        setOrgParent(data.parent);
        setOrgChildren(data.children || []);
        const all = [data.parent, ...(data.children || [])].filter(Boolean);
        const first = all[0]?.id ? String(all[0].id) : String(parentId);
        setOrgSelectId((prev) => prev || first);
        setUForm((f) => ({ ...f, orgId: f.orgId || first }));
        setTForm((f) => ({ ...f, organization_id: f.organization_id || first }));
      }
    } catch {}
  }

  async function loadUsersFor(selectedOrgId) {
    try {
      const includeChildren = String(selectedOrgId) === String(session.orgId) ? "1" : "0";
      const qs = new URLSearchParams({ orgId: String(selectedOrgId), includeChildren });
      const res = await fetch(`/api/users/list?${qs}`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setUsers(data.users || []);
    } catch {}
  }

  async function loadRolesFor(orgId) {
    try {
      const qs = new URLSearchParams({ orgId: String(orgId) });
      const res = await fetch(`/api/roles/list?${qs}`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok)
        setCustomRoles((data.custom || []).map((cr) => ({
          // tolerate backends that don't yet send can_view_tickets
          can_view_tickets: !!cr.can_view_tickets,
          ...cr,
        })));
    } catch {}
  }

  useEffect(() => {
    if (!session) return;
    loadOrgs(session.orgId);
  }, [session]);

  useEffect(() => {
    if (!session || !orgSelectId) return;
    loadUsersFor(orgSelectId);
    loadRolesFor(orgSelectId);
  }, [session, orgSelectId]);

  // --- Tickets ---
  async function createTicket() {
    setTMsg("");
    if (!tForm.client_name.trim() || !tForm.description.trim() || !tForm.organization_id) {
      setTMsg("Fill all fields");
      return;
    }
    try {
      const res = await fetch("/api/tickets/create", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          client_name: tForm.client_name.trim(),
          description: tForm.description.trim(),
          organization_id: Number(tForm.organization_id),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTMsg(data?.error || "Failed");
        return;
      }
      setTMsg(`✅ Ticket created: ${data.ticket_id}`);
      setTForm({ client_name: "", description: "", organization_id: orgSelectId });
    } catch {
      setTMsg("Failed");
    }
  }

  // --- Users ---
  async function createUser() {
    setUMsg("");
    if (!uForm.name.trim() || !uForm.email.trim() || !uForm.orgId) {
      setUMsg("Fill name, email, org");
      return;
    }
    const res = await fetch("/api/users/create", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        name: uForm.name.trim(),
        email: uForm.email.trim(),
        orgId: Number(uForm.orgId),
        role: uForm.role,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setUMsg(data?.error || "Failed");
      return;
    }
    setUMsg("✅ User created. Credentials sent by email.");
    setUForm({ name: "", email: "", role: "VIEWER", orgId: orgSelectId });
    await loadUsersFor(orgSelectId);
  }

  async function updateRole(userId, orgId, value) {
    // NOTE: backend should send the email "your role in X is Y" when this endpoint runs.
    const payload = value.startsWith("custom:")
      ? { userId, orgId, customRoleId: Number(value.split(":")[1]) }
      : { userId, orgId, role: value };

    const res = await fetch("/api/users/update-role", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      alert("Failed to update role");
      return;
    }

    const { user } = await res.json();
    setUsers((prev) =>
      prev.map((row) =>
        row.userId === user.userId && row.orgId === user.orgId
          ? { ...row, role: user.role, roleType: user.roleType, customRoleId: user.customRoleId, roleLabel: user.roleLabel }
          : row
      )
    );
  }

  async function deleteMembership(userId, orgId) {
    if (!confirm("Remove this user from the org?")) return;
    const res = await fetch("/api/users/delete", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ userId, orgId }),
    });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => !(u.userId === userId && u.orgId === orgId)));
    } else {
      alert("Failed to delete");
    }
  }

  async function assignToOrg(userId, toOrgId, value) {
    // NOTE: backend should send the email "your role in X is Y" when this endpoint runs.
    const payload = value.startsWith("custom:")
      ? { userId, toOrgId, customRoleId: Number(value.split(":")[1]) }
      : { userId, toOrgId, role: value };

    const res = await fetch("/api/users/assign", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data?.error || "Failed to assign");
      return;
    }

    const viewingRootLocal = String(orgSelectId) === String(session.orgId);
    if (viewingRootLocal || String(toOrgId) === String(orgSelectId)) {
      setUsers((prev) => {
        const exists = prev.some((u) => u.userId === data.user.userId && u.orgId === data.user.orgId);
        return exists
          ? prev.map((u) => (u.userId === data.user.userId && u.orgId === data.user.orgId ? data.user : u))
          : [data.user, ...prev];
      });
    }
  }

  // --- Roles modal ---
  function openNewRole() {
    setRoleForm({
      id: null,
      name: "",
      can_view_tickets: true,
      can_send_tickets: true,
      can_create_users: false,
      can_create_orgs: false,
    });
    setRoleModalOpen(true);
  }

  async function saveRole() {
    const payload = { ...roleForm, orgId: Number(orgSelectId) };
    const res = await fetch("/api/roles/upsert", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data?.error || "Failed to save role");
      return;
    }
    // Optimistic/instant update of dropdown without page refresh:
    if (data.role) {
      setCustomRoles((prev) => {
        const idx = prev.findIndex((r) => r.id === data.role.id);
        const next = { ...data.role, can_view_tickets: !!data.role.can_view_tickets };
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = next;
          return copy;
        }
        return [next, ...prev];
      });
    } else {
      // fallback to re-fetch if API didn't return the role
      await loadRolesFor(orgSelectId);
    }
    setRoleModalOpen(false);
  }

  // ---------- permissions & tab gating ----------
  const allOrgs = useMemo(() => [orgParent, ...orgChildren].filter(Boolean), [orgParent, orgChildren]);

  // Find my membership row for the selected org (safe even if session is null)
  const myRow = users.find(
    (u) =>
      String(u.orgId) === String(orgSelectId) &&
      (String(u.userId || "") === String(session?.userId || "") ||
        String(u.email || "") === String(session?.email || ""))
  );

  // Compute effective permissions from built-in or custom role
  const perms = derivePermissions({
    sessionRole: session?.role,
    myRow,
    customRoles,
  });

  const canSeeKanban = perms.can_view_tickets || perms.can_send_tickets; // create implies view
  const canSeeTicketsTab = perms.can_send_tickets;
  const canSeeUsersTab = perms.can_create_users;
  const canSeeOrgsTab = perms.can_create_orgs;
  const canSeeRolesTab = (session?.role || "").toUpperCase() === "MANAGER";

  // Keep the current tab valid for the current permissions
  useEffect(() => {
    const allowedOrder = [
      canSeeUsersTab && "users",
      canSeeOrgsTab && "orgs",
      canSeeRolesTab && "roles",
      canSeeTicketsTab && "tickets",
      canSeeKanban && "kanban",
    ].filter(Boolean);

    if (!allowedOrder.includes(tab)) {
      setTab(allowedOrder[0] || (canSeeKanban ? "kanban" : tab));
    }
  }, [canSeeUsersTab, canSeeOrgsTab, canSeeRolesTab, canSeeTicketsTab, canSeeKanban, tab]);
  // ---------- end gating ----------

  // ✅ No hooks after this point
  if (!session) return null;

  // Derived values for render (non-hook)
  const viewingRoot = String(orgSelectId) === String(session.orgId);
  const roleOptions = [
    ...BUILTIN_ROLES.map((r) => ({ value: r, label: r })),
    ...customRoles.map((cr) => ({ value: `custom:${cr.id}`, label: cr.name })),
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold">N</div>
            <div>
              <div className="text-xs text-slate-500">Organization</div>
              <div className="font-semibold">{session.orgName}</div>
              <div className="text-[11px] text-slate-500">Role: {session.role}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canSeeTicketsTab && (
              <a href="/customer/ticket" className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50">
                Customer view
              </a>
            )}
            <button
              onClick={() => {
                clearCustomerSession();
                router.replace("/login");
              }}
              className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        </div>

        {/* Top Nav */}
        <nav className="border-t border-slate-200">
          <div className="max-w-6xl mx-auto px-4 overflow-x-auto">
            <div className="flex items-center gap-2 py-2">
              {canSeeUsersTab && <TopTab id="users" cur={tab} setTab={setTab}>Users</TopTab>}
              {canSeeOrgsTab && <TopTab id="orgs" cur={tab} setTab={setTab}>Organizations</TopTab>}
              {canSeeRolesTab && <TopTab id="roles" cur={tab} setTab={setTab}>Roles</TopTab>}
              {canSeeTicketsTab && <TopTab id="tickets" cur={tab} setTab={setTab}>Create Tickets</TopTab>}
              {canSeeKanban && <TopTab id="kanban" cur={tab} setTab={setTab}>Kanban</TopTab>}

              {/* Right-side org selector */}
              <div className="ml-auto flex items-end gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500">Context organization</label>
                  <select
                    value={orgSelectId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setOrgSelectId(v);
                      setUForm((f) => ({ ...f, orgId: v }));
                      setTForm((f) => ({ ...f, organization_id: v }));
                      loadUsersFor(v);
                      loadRolesFor(v);
                    }}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white"
                  >
                    {allOrgs.map((o) => (
                      <option key={o.id} value={String(o.id)}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-slate-500 pb-1.5 whitespace-nowrap">
                  {viewingRoot ? "Showing root + subtree" : "Showing only this org"}
                </p>
              </div>
            </div>
          </div>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {tab === "users" && canSeeUsersTab && (
          <section className="space-y-6">
            {/* Create user card */}
            <Card title="Create User">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Name"
                  value={uForm.name}
                  onChange={(e) => setUForm((f) => ({ ...f, name: e.target.value }))}
                />
                <input
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Email"
                  value={uForm.email}
                  onChange={(e) => setUForm((f) => ({ ...f, email: e.target.value }))}
                />
                <select
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  value={uForm.role}
                  onChange={(e) => setUForm((f) => ({ ...f, role: e.target.value }))}
                >
                  {BUILTIN_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              {uMsg && <p className="text-sm pt-2">{uMsg}</p>}
              <div className="pt-2">
                <button onClick={createUser} className="btn-primary">
                  Create User
                </button>
              </div>
            </Card>

            {/* Users table */}
            <Card
              title={
                viewingRoot
                  ? `Users in ${orgParent?.name} (incl. subtree)`
                  : `Users in ${allOrgs.find((o) => String(o.id) === String(orgSelectId))?.name}`
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-600">
                      <th className="py-2">Name</th>
                      <th className="py-2">Email</th>
                      <th className="py-2">Org</th>
                      <th className="py-2">Role</th>
                      <th className="py-2">Assign to Org</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={`${u.userId}-${u.orgId}`} className="border-t border-slate-200">
                        <td className="py-2">{u.name}</td>
                        <td className="py-2">{u.email}</td>
                        <td className="py-2">{u.orgName}</td>
                        <td className="py-2">
                          <select
                            value={u.customRoleId ? `custom:${u.customRoleId}` : u.role}
                            onChange={(e) => updateRole(u.userId, u.orgId, e.target.value)}
                            className="border border-slate-300 rounded px-2 py-1 text-sm bg-white"
                          >
                            {roleOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <select
                              className="border border-slate-300 rounded px-2 py-1 text-sm bg-white"
                              defaultValue={orgSelectId}
                              id={`assign-org-${u.userId}-${u.orgId}`}
                            >
                              {allOrgs.map((o) => (
                                <option key={o.id} value={String(o.id)}>
                                  {o.name}
                                </option>
                              ))}
                            </select>
                            <select
                              className="border border-slate-300 rounded px-2 py-1 text-sm bg-white"
                              defaultValue={BUILTIN_ROLES[3]} // VIEWER
                              id={`assign-role-${u.userId}-${u.orgId}`}
                            >
                              {roleOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                const toOrg = document.getElementById(`assign-org-${u.userId}-${u.orgId}`).value;
                                const val = document.getElementById(`assign-role-${u.userId}-${u.orgId}`).value;
                                assignToOrg(u.userId, Number(toOrg), val);
                              }}
                              className="border border-slate-300 rounded px-2 py-1 text-sm hover:bg-slate-50"
                            >
                              Add
                            </button>
                          </div>
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => deleteMembership(u.userId, u.orgId)}
                            className="text-red-600 hover:underline text-sm"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!users.length && (
                      <tr>
                        <td colSpan={6} className="text-center text-slate-500 py-6">
                          No users
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>
        )}

        {tab === "orgs" && canSeeOrgsTab && (
          <section className="space-y-6">
            <Card title="Create Sub-Organization">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Name"
                  value={sForm.name}
                  onChange={(e) => setSForm((f) => ({ ...f, name: e.target.value }))}
                />
                <input
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Email (optional)"
                  value={sForm.email}
                  onChange={(e) => setSForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              {sMsg && <p className="text-sm pt-2">{sMsg}</p>}
              <div className="pt-2">
                <button
                  onClick={async () => {
                    setSMsg("");
                    if (!sForm.name.trim()) {
                      setSMsg("Name required");
                      return;
                    }
                    const res = await fetch("/api/organizations/create-sub", {
                      method: "POST",
                      headers: authHeaders({ "Content-Type": "application/json" }),
                      body: JSON.stringify({
                        parent_id: Number(session.orgId),
                        name: sForm.name.trim(),
                        email: sForm.email || null,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      setSMsg(data?.error || "Failed");
                      return;
                    }
                    setSMsg("✅ Sub-organization created");
                    setSForm({ name: "", email: "" });
                    await loadOrgs(session.orgId);
                  }}
                  className="btn-primary"
                >
                  Create Sub-Org
                </button>
              </div>
            </Card>

            <Card title={`Children of ${orgParent?.name || ""}`}>
              <ul className="space-y-2">
                {orgChildren.map((c) => (
                  <li
                    key={c.id}
                    className="border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between bg-white"
                  >
                    <div>
                      <div className="text-sm font-medium">{c.name}</div>
                      <div className="text-[11px] text-slate-500">ID: {c.id}</div>
                    </div>
                  </li>
                ))}
                {!orgChildren.length && <li className="text-sm text-slate-500">No sub-organizations yet.</li>}
              </ul>
            </Card>
          </section>
        )}

        {tab === "roles" && canSeeRolesTab && (
          <section className="space-y-6">
            <Card
              title="Roles"
              action={
                <button onClick={openNewRole} className="btn-primary">
                  New / Edit Role
                </button>
              }
            >
              <div className="text-sm text-slate-600 mb-2">
                Built-in: {BUILTIN_ROLES.join(", ")}
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Custom roles in this org</div>
                <ul className="space-y-1">
                  {customRoles.map((cr) => (
                    <li key={cr.id} className="flex items-center justify-between border border-slate-200 rounded px-3 py-2 bg-white">
                      <span className="text-sm">
                        {cr.name}
                        <span className="ml-2 text-[11px] text-slate-500">
                          [{[
                            cr.can_view_tickets && "view",
                            cr.can_send_tickets && "create tickets",
                            cr.can_create_users && "create users",
                            cr.can_create_orgs && "create orgs",
                          ].filter(Boolean).join(", ") || "no permissions"}]
                        </span>
                      </span>
                      <button
                        className="text-xs underline"
                        onClick={() => {
                          setRoleForm({
                            id: cr.id,
                            name: cr.name,
                            can_view_tickets: !!cr.can_view_tickets,
                            can_send_tickets: cr.can_send_tickets,
                            can_create_users: cr.can_create_users,
                            can_create_orgs: cr.can_create_orgs,
                          });
                          setRoleModalOpen(true);
                        }}
                      >
                        Edit
                      </button>
                    </li>
                  ))}
                  {!customRoles.length && <li className="text-sm text-slate-500">No custom roles yet.</li>}
                </ul>
              </div>
            </Card>
          </section>
        )}

        {tab === "tickets" && canSeeTicketsTab && (
          <section className="space-y-6">
            <Card title="Create Ticket">
              <div className="grid grid-cols-1 gap-3">
                <input
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Client name"
                  value={tForm.client_name}
                  onChange={(e) => setTForm((f) => ({ ...f, client_name: e.target.value }))}
                />
                <textarea
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm min-h-[120px]"
                  placeholder="Describe the issue"
                  value={tForm.description}
                  onChange={(e) => setTForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              {tMsg && <p className="text-sm pt-2">{tMsg}</p>}
              <div className="pt-2">
                <button onClick={createTicket} className="btn-primary">
                  Create
                </button>
              </div>
            </Card>
          </section>
        )}

        {tab === "kanban" && canSeeKanban && (
          <section className="space-y-6">
            {/* Frontend-only placeholder (keeps functionality unchanged) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KanbanColumn title="Not Started" />
              <KanbanColumn title="In Progress" />
              <KanbanColumn title="Completed" />
            </div>
            <p className="text-xs text-slate-500">
              (This is a visual placeholder; no changes to backend behavior.)
            </p>
          </section>
        )}
      </main>

      {/* Roles Modal */}
      {roleModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-4 w-full max-w-md space-y-3 shadow-xl border border-slate-200">
            <h3 className="font-semibold">Add / Update Role</h3>
            <input
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              placeholder="Role name (e.g. Project Manager)"
              value={roleForm.name}
              onChange={(e) => setRoleForm((f) => ({ ...f, name: e.target.value }))}
            />
            <div className="space-y-2">
              <Toggle
                label="Can view tickets (Kanban only)" // NEW
                checked={roleForm.can_view_tickets}
                onChange={(v) => setRoleForm((f) => ({ ...f, can_view_tickets: v }))}
              />
              <Toggle
                label="Can create tickets"
                checked={roleForm.can_send_tickets}
                onChange={(v) => setRoleForm((f) => ({ ...f, can_send_tickets: v }))}
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
              <button className="border border-slate-300 rounded px-3 py-1.5 text-sm hover:bg-slate-50" onClick={() => setRoleModalOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={saveRole}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tiny style helpers */}
      <style jsx global>{`
        .btn-primary {
          @apply bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2.5;
        }
      `}</style>
    </div>
  );
}

/* -------- helpers -------- */

function derivePermissions({ sessionRole, myRow, customRoles }) {
  // Built-in MANAGER: everything
  if ((sessionRole || "").toUpperCase() === "MANAGER") {
    return {
      can_view_tickets: true,
      can_send_tickets: true,
      can_create_users: true,
      can_create_orgs: true,
    };
  }

  // If I have a custom role on this org, use its flags
  if (myRow?.customRoleId) {
    const cr = customRoles.find((r) => Number(r.id) === Number(myRow.customRoleId));
    if (cr) {
      return {
        can_view_tickets: !!cr.can_view_tickets, // default false if missing
        can_send_tickets: !!cr.can_send_tickets,
        can_create_users: !!cr.can_create_users,
        can_create_orgs: !!cr.can_create_orgs,
      };
    }
  }

  // Fallback for non-manager built-ins: view-only Kanban
  return {
    can_view_tickets: true,
    can_send_tickets: false,
    can_create_users: false,
    can_create_orgs: false,
  };
}

/* -------- UI bits -------- */

function TopTab({ id, cur, setTab, children }) {
  const active = id === cur;
  return (
    <button
      onClick={() => setTab(id)}
      className={`px-3 py-1.5 rounded-lg text-sm border transition
        ${active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"}`}
    >
      {children}
    </button>
  );
}

function Card({ title, action, children }) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between border border-slate-200 rounded px-3 py-2 text-sm bg-white">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function KanbanColumn({ title }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3">
      <div className="font-medium text-slate-700 mb-2">{title}</div>
      <div className="space-y-2">
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700">Sample card</div>
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700">Sample card</div>
      </div>
    </div>
  );
}
