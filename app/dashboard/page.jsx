"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCustomerSession, clearCustomerSession, authHeaders } from "../lib/clientAuth";

// UI components
import TopTab from "./components/TopTab";
import Card from "./components/Card";
import Toggle from "./components/Toggle";
import AssignControls from "./components/AssignControls";
import KanbanSection from "./components/KanbanSection";
import RolesModal from "./components/RolesModal";
import Meta from "./components/Meta";

const BUILTIN_ROLES = ["MANAGER", "DEVELOPER", "TESTER", "VIEWER"];

export default function DashboardPage() {
  const router = useRouter();
  const [lastCreatedTicketId, setLastCreatedTicketId] = useState(null);
  const [copied, setCopied] = useState(false);

  // ---- STATE ----
  const [session, setSession] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [tab, setTab] = useState("users");

  // Orgs
  const [orgParent, setOrgParent] = useState(null);
  const [orgChildren, setOrgChildren] = useState([]);
  const [orgSelectId, setOrgSelectId] = useState("");

  // Users
  const [users, setUsers] = useState([]);

  const [uForm, setUForm] = useState({ name: "", email: "", role: "VIEWER", orgId: "" });
  const [uMsg, setUMsg] = useState("");

  // Tickets
  const [tForm, setTForm] = useState({ client_name: "", description: "", organization_id: "" });
  const [tMsg, setTMsg] = useState("");

  // Sub-org form
  const [sForm, setSForm] = useState({ name: "", email: "", org_type: "NORMAL" });
  const [sMsg, setSMsg] = useState("");

  // Roles (for selected org -> Roles tab list)
  const [customRoles, setCustomRoles] = useState([]); // [{id,name,can_*}]
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleForm, setRoleForm] = useState({
    id: null,
    name: "",
    can_view_tickets: true,
    can_send_tickets: true,
    can_create_users: false,
    can_create_orgs: false,
    can_create_roles: false, // ✅ NEW
  });

  // ...

  function openNewRole() {
    setRoleForm({
      id: null,
      name: "",
      can_view_tickets: true,
      can_send_tickets: true,
      can_create_users: false,
      can_create_orgs: false,
      can_create_roles: false, // ✅ NEW
    });
    setRoleModalOpen(true);
  }


  // Roles cache for users table (per orgId)
  const [customRolesByOrg, setCustomRolesByOrg] = useState({}); // { [orgId]: [{id,name,...}] }

  // Local state for Kanban modal
  const [ticketDetail, setTicketDetail] = useState(null);
  useEffect(() => {
    if (!tMsg) return;
    const timer = setTimeout(() => {
      setTMsg("");
      setLastCreatedTicketId(null);
      setCopied(false);
    }, 60000);
    return () => clearTimeout(timer);
  }, [tMsg]);

  // ---- SESSION ----
  useEffect(() => {
    const s = getCustomerSession();
    if (!s) {
      router.replace("/");
      return;
    }
    setSession(s);
  }, [router]);

  // ---- LOADERS ----
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
    } catch { }
  }

  async function loadUsersFor(selectedOrgId) {
    try {
      const includeChildren = String(selectedOrgId) === String(session.orgId) ? "1" : "0";
      const qs = new URLSearchParams({ orgId: String(selectedOrgId), includeChildren });
      const res = await fetch(`/api/users/list?${qs}`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setUsers(data.users || []);
    } catch { }
  }

  async function loadRolesFor(orgId) {
    try {
      const qs = new URLSearchParams({ orgId: String(orgId) });
      const res = await fetch(`/api/roles/list?${qs}`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) {
        setCustomRoles((data.custom || []).map((cr) => ({
          ...cr,
          can_view_tickets: !!cr.can_view_tickets,
          can_create_roles: !!cr.can_create_roles, // ✅ NEW
        })));
      }
    } catch { }
  }

  async function loadTicketsFor(selectedOrgId) {
    try {
      const includeChildren = String(selectedOrgId) === String(session.orgId) ? "1" : "0";
      const qs = new URLSearchParams({ orgId: String(selectedOrgId), includeChildren });
      const res = await fetch(`/api/tickets/list?${qs}`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setTickets(data.tickets || []);
    } catch { }
  }

  async function loadRolesForOrg(orgId) {
    try {
      const qs = new URLSearchParams({ orgId: String(orgId) });
      const res = await fetch(`/api/roles/list?${qs}`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) return;
      setCustomRolesByOrg((prev) => ({
        ...prev,
        [String(orgId)]: (data.custom || []).map((cr) => ({
          ...cr,
          can_view_tickets: !!cr.can_view_tickets,
          can_create_roles: !!cr.can_create_roles, // ✅ NEW
        })),
      }));
    } catch { }
  }

  // After session: load orgs
  useEffect(() => {
    if (!session) return;
    loadOrgs(session.orgId);
  }, [session]);

  // When selected org changes: load users + roles + tickets
  useEffect(() => {
    if (!session || !orgSelectId) return;
    loadUsersFor(orgSelectId);
    loadRolesFor(orgSelectId);
    loadTicketsFor(orgSelectId);
  }, [session, orgSelectId]);

  // When users list changes: ensure we have role lists for each represented org
  useEffect(() => {
    if (!users.length) return;
    const ids = Array.from(new Set(users.map((u) => String(u.orgId))));
    ids.forEach((id) => {
      if (!customRolesByOrg[id]) loadRolesForOrg(id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users]);

  // ---- TICKETS ----
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

      // ✅ set the visible success message + capture the id
      const id = data?.ticket_id ?? data?.id ?? "";
      setTMsg(`✅ Ticket created: ${id}`);
      setLastCreatedTicketId(id);
      setCopied(false);

      setTForm({ client_name: "", description: "", organization_id: orgSelectId });
      await loadTicketsFor(orgSelectId);
    } catch {
      setTMsg("Failed");
    }
  }

  // ---- USERS ----
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
    const payload = value.startsWith("custom:")
      ? { userId, orgId, customRoleId: Number(value.split(":")[1]) }
      : { userId, orgId, role: value };

    const res = await fetch("/api/users/update-role", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err?.error || "Failed to update role");
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
      const err = await res.json().catch(() => ({}));
      alert(err?.error || "Failed to delete");
    }
  }

  async function assignToOrg(userId, toOrgId, value) {
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

    const viewingRoot = String(orgSelectId) === String(session.orgId);
    if (viewingRoot || String(toOrgId) === String(orgSelectId)) {
      setUsers((prev) => {
        const exists = prev.some((u) => u.userId === data.user.userId && u.orgId === data.user.orgId);
        return exists
          ? prev.map((u) => (u.userId === data.user.userId && u.orgId === data.user.orgId ? data.user : u))
          : [data.user, ...prev];
      });
    }
  }

  // ---- ROLES ----
  /*  function openNewRole() {
     setRoleForm({
       id: null,
       name: "",
       can_view_tickets: true,
       can_send_tickets: true,
       can_create_users: false,
       can_create_orgs: false,
     });
     setRoleModalOpen(true);
   } */
  // add this helper
  async function fetchOrgInfo(orgId) {
    const res = await fetch(`/api/organizations/info?orgId=${orgId}`, { headers: authHeaders() });
    if (!res.ok) return null;
    return await res.json(); // { id, name, org_type }
  }



  async function saveRole() {
    const payload = { ...roleForm, orgId: Number(orgSelectId) };
    try {
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
        setCustomRolesByOrg((prev) => ({
          ...prev,
          [String(orgSelectId)]: (prev[String(orgSelectId)] || [])
            .filter((r) => r.id !== data.role.id)
            .concat([{ ...data.role }]),
        }));
      } else {
        await loadRolesFor(orgSelectId);
        await loadRolesForOrg(orgSelectId);
      }
      setRoleModalOpen(false);
    } catch {
      alert("Failed to save role");
    }
  }

  // ---- PERMISSIONS & GATING ----
  const membershipOrgs = useMemo(
    () => (session?.memberships || []).map((m) => ({ id: m.orgId, name: m.orgName, role: m.role })),
    [session?.memberships]
  );

  const multiOrg = membershipOrgs.length > 1;

  const myRow = users.find(
    (u) =>
      String(u.orgId) === String(orgSelectId) &&
      (String(u.userId || "") === String(session?.userId || "") ||
        String(u.email || "") === String(session?.email || ""))
  );
  const selectedOrg = useMemo(() => {
    if (!orgSelectId) return null;
    if (String(orgParent?.id) === String(orgSelectId)) return orgParent;
    return orgChildren.find(c => String(c.id) === String(orgSelectId)) || null;
  }, [orgSelectId, orgParent, orgChildren]);

  const isClientOrg = selectedOrg?.org_type === 'CLIENT';
  //const canSeeOrgsTab = perms.can_create_orgs && !isClientOrg;  // already in your code

  const selectedOrgName = useMemo(() => {
    return membershipOrgs.find((o) => String(o.id) === String(orgSelectId))?.name || session?.orgName;
  }, [membershipOrgs, orgSelectId, session?.orgName]);

  const fallbackRoleFromMembership = useMemo(() => {
    return membershipOrgs.find((o) => String(o.id) === String(orgSelectId))?.role || session?.role || "VIEWER";
  }, [membershipOrgs, orgSelectId, session?.role]);

  const effectiveRole = useMemo(() => {
    const builtIn = myRow?.role ? String(myRow.role).toUpperCase() : null;
    const fb = fallbackRoleFromMembership ? String(fallbackRoleFromMembership).toUpperCase() : null;
    return builtIn || fb || "VIEWER";
  }, [myRow?.role, fallbackRoleFromMembership]);

  const accessibleOrgs = useMemo(() => {
    const fromMemberships = (session?.memberships || []).map((m) => ({ id: m.orgId, name: m.orgName }));
    const extras = [orgParent, ...orgChildren].filter(Boolean).map((o) => ({ id: o.id, name: o.name }));
    const map = new Map();
    [...fromMemberships, ...extras].forEach((o) => map.set(String(o.id), o));
    return Array.from(map.values()).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [session?.memberships, orgParent, orgChildren]);

  const perms = useMemo(
    () => derivePermissions({ effectiveRole, myRow, customRoles }),
    [effectiveRole, myRow, customRoles]
  );

  const canSeeKanban = perms.can_view_tickets || perms.can_send_tickets;
  const canSeeTicketsTab = perms.can_send_tickets;
  const canSeeUsersTab = perms.can_create_users;
  const canSeeOrgsTab = perms.can_create_orgs && !isClientOrg;
  const canSeeRolesTab = effectiveRole === "MANAGER" || perms.can_create_roles;

  const displayRoleLabel = useMemo(() => {
    if (myRow?.roleLabel) return myRow.roleLabel;
    if (myRow?.customRoleId) {
      const cr = customRoles.find((r) => Number(r.id) === Number(myRow.customRoleId));
      return cr?.name || "Custom";
    }
    if (myRow?.role) return myRow.role;
    return fallbackRoleFromMembership || "VIEWER";
  }, [myRow, customRoles, fallbackRoleFromMembership]);

  const ticketsByStatus = useMemo(() => {
    const buckets = {
      NOT_STARTED: [],
      IN_PROGRESS: [],
      ON_HOLD: [],
      COMPLETED: [],
      CANCELLED: [],
    };
    for (const t of tickets) {
      (buckets[t.status] || buckets.NOT_STARTED).push(t);
    }
    return buckets;
  }, [tickets]);

  const displayUserName = myRow?.name || session?.name || session?.email;

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

  // ---- RENDER ----
  if (!session) return null;

  const viewingRoot = String(orgSelectId) === String(session.orgId);

  return (
    <div className="min-h-screen bg-gray-200 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold">N</div>
            <div>
              <span className="text-sm !text-black font-semibold">{selectedOrgName}</span>
              <div className="text-base text-slate-500">
                Name : <span className="text-sm !text-black font-semibold">{displayUserName}</span>
              </div>
              <div className="text-base text-slate-500">
                Role : <span className="text-sm !text-black font-semibold">{displayRoleLabel}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">

            <div className="text-base text-slate-500">
              Organization:&nbsp;
              {membershipOrgs.length > 1 ? (
                <select
                  value={orgSelectId}
                  // in the <select onChange> handler:
                  onChange={async (e) => {
                    const v = e.target.value;
                    setOrgSelectId(v);
                    setUsers([]); setTickets([]); // avoid stale flash
                    setUForm(f => ({ ...f, orgId: v }));
                    setTForm(f => ({ ...f, organization_id: v }));
                    // ensure org_type is known for this selection
                    const info = await fetchOrgInfo(v);
                    if (info) {
                      // merge into orgParent/orgChildren caches so selectedOrg picks it up
                      if (String(orgParent?.id) === String(v)) setOrgParent(info);
                      else if (!orgChildren.some(c => String(c.id) === String(v))) setOrgChildren(cs => [info, ...cs]);
                    }
                    loadUsersFor(v);
                    loadRolesFor(v);
                    loadTicketsFor(v);
                  }}
                  className="border border-slate-300 rounded px-2 py-1 text-sm bg-white"
                >
                  {membershipOrgs.map((o) => (
                    <option key={o.id} value={String(o.id)}>
                      {o.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm !text-black font-semibold">{selectedOrgName}</span>
              )}
            </div>

            <button
              onClick={() => {
                clearCustomerSession();
                router.replace("/");
              }}
              className="text-sm border bg-black rounded-lg px-3 py-1.5 text-white cursor-pointer hover:bg-gray-800"
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
            </div>
          </div>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {tab === "users" && canSeeUsersTab && (
          <section className="space-y-8"> {/* Increased spacing */}
            {/* Create user card */}
            <Card title="Create User">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"> {/* Increased gap */}
                <input
                  className="border border-slate-300 rounded-lg px-4 py-3 text-base"
                  placeholder="Name"
                  value={uForm.name}
                  onChange={(e) => setUForm((f) => ({ ...f, name: e.target.value }))}
                />
                <input
                  className="border border-slate-300 rounded-lg px-4 py-3 text-base"
                  placeholder="Email"
                  value={uForm.email}
                  onChange={(e) => setUForm((f) => ({ ...f, email: e.target.value }))}
                />
                <select
                  className="border border-slate-300 rounded-lg px-4 py-3 text-base"
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
              {uMsg && <p className="text-base pt-3">{uMsg}</p>}
              <div className="pt-4">
                <button onClick={createUser} className="btn-primary text-base px-5 py-2.5">
                  Create User
                </button>
              </div>
            </Card>

            {/* Users table */}
            <Card
              title={
                viewingRoot
                  ? `Users in ${orgParent?.name} (incl. subtree)`
                  : `Users in ${((accessibleOrgs.find((o) => String(o.id) === String(orgSelectId))) || {}).name || ""}`
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-base"> {/* Increased text size */}
                  <thead>
                    <tr className="text-left text-slate-600">
                      <th className="py-3">Name</th>
                      <th className="py-3">Email</th>
                      <th className="py-3">Org</th>
                      <th className="py-3">Role</th>
                      <th className="py-3">Assign to Org</th>
                      <th className="py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const rowCustom = customRolesByOrg[String(u.orgId)] || [];
                      const rowRoleOptions = [
                        ...BUILTIN_ROLES.map((r) => ({ value: r, label: r })),
                        ...rowCustom.map((cr) => ({ value: `custom:${cr.id}`, label: cr.name })),
                      ];

                      return (
                        <tr key={`${u.userId}-${u.orgId}`} className="border-t border-slate-200">
                          <td className="py-3">{u.name}</td>
                          <td className="py-3">{u.email}</td>
                          <td className="py-3">{u.orgName}</td>
                          <td className="py-3">
                            <select
                              value={u.customRoleId ? `custom:${u.customRoleId}` : u.role}
                              onChange={(e) => updateRole(u.userId, u.orgId, e.target.value)}
                              className="border border-slate-300 rounded px-3 py-2 text-base bg-white"
                            >
                              {rowRoleOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3">
                            <AssignControls
                              allOrgs={accessibleOrgs}
                              defaultOrgId={orgSelectId}
                              customRolesByOrg={customRolesByOrg}
                              loadRolesForOrg={loadRolesForOrg}
                              onAssign={(toOrgId, val) => assignToOrg(u.userId, Number(toOrgId), val)}
                              builtInRoles={BUILTIN_ROLES}
                            />
                          </td>
                          <td className="py-3">
                            <button
                              onClick={() => deleteMembership(u.userId, u.orgId)}
                              className="text-red-600 hover:underline text-base"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {!users.length && (
                      <tr>
                        <td colSpan={6} className="text-center text-slate-500 py-6 text-base">
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
          <section className="space-y-8"> {/* Increased spacing */}
            <Card title="Create Sub-Organization">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"> {/* Increased gap */}
                <input
                  className="border border-slate-300 rounded-lg px-4 py-3 text-base" // Bigger input
                  placeholder="Name"
                  value={sForm.name}
                  onChange={(e) => setSForm((f) => ({ ...f, name: e.target.value }))}
                />
                <input
                  className="border border-slate-300 rounded-lg px-4 py-3 text-base"
                  placeholder="Email (optional)"
                  value={sForm.email}
                  onChange={(e) => setSForm((f) => ({ ...f, email: e.target.value }))}
                />
                <select
                  className="border border-slate-300 rounded-lg px-4 py-3 text-base"
                  value={sForm.org_type}
                  onChange={(e) =>
                    setSForm((f) => ({ ...f, org_type: e.target.value }))
                  }
                >
                  <option value="NORMAL">Normal</option>
                  <option value="CLIENT">Client</option>
                </select>
              </div>

              {sMsg && <p className="text-base pt-3">{sMsg}</p>} {/* Larger text */}

              <div className="pt-4">
                <button onClick={async () => {
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
                      org_type: sForm.org_type,
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
                  className="btn-primary text-base px-5 py-2.5"> {/* Larger button */}
                  Create Sub-Org
                </button>
              </div>
            </Card>

            <Card title={`Children of ${orgParent?.name || ""}`}>
              <ul className="space-y-3"> {/* Increased spacing */}
                {orgChildren.map((c) => (
                  <li
                    key={c.id}
                    className="border border-slate-200 rounded-lg px-4 py-3 flex items-center justify-between bg-white"
                  >
                    <div>
                      <div className="text-base font-medium">{c.name}</div> {/* Larger name */}
                      <div className="text-sm text-slate-500">ID: {c.id}</div> {/* Larger ID */}
                    </div>
                  </li>
                ))}
                {!orgChildren.length && (
                  <li className="text-base text-slate-500">
                    No sub-organizations yet.
                  </li>
                )}
              </ul>
            </Card>
          </section>
        )}

        {tab === "roles" && canSeeRolesTab && (
          <section className="space-y-8"> {/* Increased spacing */}
            <Card
              title="Roles"
              action={
                <button
                  onClick={openNewRole}
                  className="btn-primary text-base px-4 py-2 cursor-pointer" // Increased font and padding
                  disabled={!orgSelectId}
                  title={!orgSelectId ? "Pick an org first" : ""}
                >
                  New / Edit Role
                </button>
              }
            >
              <div className="text-base text-slate-600 mb-3"> {/* Increased font size */}
                Built-in: {BUILTIN_ROLES.join(", ")}
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-2"> {/* Increased font size */}
                  Custom roles in this org
                </div>
                <ul className="space-y-2"> {/* Increased vertical spacing */}
                  {customRoles.map((cr) => (
                    <li
                      key={cr.id}
                      className="flex items-center justify-between border border-slate-200 rounded px-4 py-3 bg-white" // Increased padding
                    >
                      <span className="text-base"> {/* Increased font size */}
                        {cr.name}
                        <span className="ml-3 text-sm text-slate-500"> {/* Increased font size */}
                          [
                          {[
                            cr.can_view_tickets && "view",
                            cr.can_send_tickets && "create tickets",
                            cr.can_create_users && "create users",
                            cr.can_create_orgs && "create orgs",
                            cr.can_create_roles && "create roles",
                          ]
                            .filter(Boolean)
                            .join(", ") || "no permissions"}
                          ]
                        </span>
                      </span>
                      <button
                        className="text-sm underline" // Increased font size
                        onClick={() => {
                          setRoleForm({
                            id: cr.id,
                            name: cr.name,
                            can_view_tickets: !!cr.can_view_tickets,
                            can_send_tickets: !!cr.can_send_tickets,
                            can_create_users: !!cr.can_create_users,
                            can_create_orgs: !!cr.can_create_orgs,
                            can_create_roles: !!cr.can_create_roles,
                          });
                          setRoleModalOpen(true);
                        }}
                      >
                        Edit
                      </button>
                    </li>
                  ))}
                  {!customRoles.length && (
                    <li className="text-base text-slate-500"> {/* Increased font size */}
                      No custom roles yet.
                    </li>
                  )}
                </ul>
              </div>
            </Card>
          </section>
        )}

        {tab === "tickets" && canSeeTicketsTab && (
          <section className="space-y-6">
            <Card title="Create Ticket">
              <div className="grid grid-cols-1 gap-4"> {/* Increased gap */}
                <input
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 text-base" // Increased padding & font size
                  placeholder="Client name"
                  value={tForm.client_name}
                  onChange={(e) =>
                    setTForm((f) => ({ ...f, client_name: e.target.value }))
                  }
                />
                <textarea
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 text-base min-h-[160px]" // Increased min height & font size
                  placeholder="Describe the issue"
                  value={tForm.description}
                  onChange={(e) =>
                    setTForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>

              {tMsg && (
                <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-base text-green-800">
                  <span className="truncate">{tMsg}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    {lastCreatedTicketId && (
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              String(lastCreatedTicketId)
                            );
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                          } catch {
                            alert("Failed to copy");
                          }
                        }}
                        className="border border-green-300 rounded px-3 py-1.5 text-sm hover:bg-green-100"
                        title="Copy Ticket ID"
                      >
                        {copied ? "Copied!" : "Copy ID"}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setTMsg("");
                        setLastCreatedTicketId(null);
                        setCopied(false);
                      }}
                      className="text-sm text-green-700 hover:underline"
                      title="Dismiss"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button onClick={createTicket} className="bg-black text-white rounded text-base px-5 py-2">
                  Create
                </button>
              </div>
            </Card>
          </section>
        )}

        {tab === "kanban" && (perms.can_view_tickets || perms.can_send_tickets) && (
          <KanbanSection
            ticketsByStatus={ticketsByStatus}
            ticketsCount={tickets.length}
            onRefresh={() => loadTicketsFor(orgSelectId)}
            onOpenTicket={setTicketDetail}
          />
        )}
      </main>

      {/* Roles Modal */}
      <RolesModal
        open={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        roleForm={roleForm}
        setRoleForm={setRoleForm}
        onSave={saveRole}
        orgSelectId={orgSelectId}
      />

      {/* Ticket Detail Modal (uses <Meta/>) */}
      {ticketDetail && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setTicketDetail(null)}
          aria-modal="true"
          role="dialog"
        >
          <div
            className="bg-white w-full max-w-2xl rounded-xl shadow-xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-200 flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-500">Ticket</div>
                <div className="text-lg font-semibold">
                  #{ticketDetail.ticket_id} — {ticketDetail.client_name || "Untitled ticket"}
                </div>
                {ticketDetail.status && (
                  <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600">
                    {ticketDetail.status}
                  </span>
                )}
              </div>
              <button
                className="text-slate-500 hover:text-slate-700 text-xl leading-none px-2"
                onClick={() => setTicketDetail(null)}
                aria-label="Close"
                title="Close"
              >
                ×
              </button>
            </div>

            <div className="px-4 py-3 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <Meta label="Organization" value={ticketDetail.orgName || ticketDetail.organization_id} />
                <Meta
                  label="Created At"
                  value={ticketDetail.created_at ? new Date(ticketDetail.created_at).toLocaleString() : "-"}
                />
                <Meta label="Internal ID" value={ticketDetail.id} />
                {ticketDetail.updated_at && (
                  <Meta label="Updated At" value={new Date(ticketDetail.updated_at).toLocaleString()} />
                )}
              </div>

              {ticketDetail.description && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">Description</div>
                  <div className="whitespace-pre-wrap text-sm border border-slate-200 rounded-lg p-3 bg-slate-50">
                    {ticketDetail.description}
                  </div>
                </div>
              )}

              <details className="text-xs text-slate-500">
                <summary className="cursor-pointer select-none">More details (raw)</summary>
                <pre className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg overflow-auto text-[11px] leading-relaxed">
                  {JSON.stringify(ticketDetail, null, 2)}
                </pre>
              </details>
            </div>

            <div className="px-4 py-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setTicketDetail(null)}
                className="border border-slate-300 rounded px-3 py-1.5 text-sm hover:bg-slate-50"
              >
                Close
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

function derivePermissions({ effectiveRole, myRow, customRoles }) {
  if (myRow?.customRoleId) {
    const cr = customRoles.find((r) => Number(r.id) === Number(myRow.customRoleId));
    if (cr) {
      return {
        can_view_tickets: !!cr.can_view_tickets,
        can_send_tickets: !!cr.can_send_tickets,
        can_create_users: !!cr.can_create_users,
        can_create_orgs: !!cr.can_create_orgs,
        can_create_roles: !!cr.can_create_roles, // ✅ NEW
      };
    }
  }

  switch ((effectiveRole || "VIEWER").toUpperCase()) {
    case "MANAGER":
      return {
        can_view_tickets: true,
        can_send_tickets: true,
        can_create_users: true,
        can_create_orgs: true,
        can_create_roles: true, // ✅ NEW: managers can manage roles
      };
    case "DEVELOPER":
    case "TESTER":
    case "VIEWER":
    default:
      return {
        can_view_tickets: true,
        can_send_tickets: false,
        can_create_users: false,
        can_create_orgs: false,
        can_create_roles: false, // ✅ NEW
      };
  }
}
