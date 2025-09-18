// components/TeamManager.jsx
"use client";
import { useEffect, useState } from "react";

async function parseJsonSafe(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch (e) { console.error("Non-JSON response:", text); return null; }
}

export default function TeamManager({ teams: initialTeams = [], members: initialMembers = [], skills: initialSkills = [] }) {
  const [view, setView] = useState("teams"); // "teams" | "skills"
  const [localTeams, setLocalTeams] = useState(initialTeams);
  const [localSkills, setLocalSkills] = useState(initialSkills);
  const [localMembers, setLocalMembers] = useState(initialMembers);
  const [loading, setLoading] = useState(true);

  const [showAddEdit, setShowAddEdit] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [editing, setEditing] = useState(null); // {type: 'team'|'skill', item}

  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberModalTarget, setMemberModalTarget] = useState(null); // {type:'team'|'skill', item}
  const [viewMembersTarget, setViewMembersTarget] = useState(null);

  const API = {
    teamsList: "/api/teams/list",
    teamsAdd: "/api/teams/add",
    teamsUpdate: "/api/teams/update",
    teamsDelete: "/api/teams/delete",
    teamsAddMember: "/api/teams/add-member",

    skillsList: "/api/skills/list",
    skillsAdd: "/api/skills/add",
    skillsUpdate: "/api/skills/update",
    skillsDelete: "/api/skills/delete",
    skillsAddMember: "/api/skills/add-member",

    membersList: "/api/members/list",
  };

  async function fetchTeams() {
    try {
      const res = await fetch(API.teamsList);
      const data = await parseJsonSafe(res);
      setLocalTeams(Array.isArray(data?.teams) ? data.teams : []);
    } catch { setLocalTeams([]); }
  }
  async function fetchSkills() {
    try {
      const res = await fetch(API.skillsList);
      const data = await parseJsonSafe(res);
      setLocalSkills(Array.isArray(data?.skills) ? data.skills : []);
    } catch { setLocalSkills([]); }
  }
  async function fetchMembers() {
    try {
      const res = await fetch(API.membersList);
      const data = await parseJsonSafe(res);
      const arr = Array.isArray(data?.members) ? data.members : [];
      setLocalMembers(arr.map((m) => ({
        ...m,
        teams: Array.isArray(m.teams) ? m.teams : [],
        skills: Array.isArray(m.skills) ? m.skills : [],
      })));
    } catch { setLocalMembers([]); }
  }
  async function refreshAll() {
    setLoading(true);
    await Promise.all([fetchTeams(), fetchSkills(), fetchMembers()]);
    setLoading(false);
  }
  useEffect(() => { refreshAll(); }, []);

  // ---------- add / edit ----------
  function openAdd() {
    setEditing(null);
    setInputValue("");
    setShowAddEdit(true);
  }
  function openEdit(type, item) {
    setEditing({ type, item });
    setInputValue(type === "team" ? item?.name ?? "" : item?.skill ?? "");
    setShowAddEdit(true);
  }
  async function saveAddEdit() {
    const val = inputValue.trim();
    if (!val) return;

    if (editing) {
      if (editing.type === "team") {
        await fetch(API.teamsUpdate, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editing.item.id, name: val }) });
        await fetchTeams();
      } else {
        await fetch(API.skillsUpdate, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editing.item.id, skill: val }) });
        await fetchSkills();
      }
    } else {
      if (view === "teams") {
        await fetch(API.teamsAdd, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: val }) });
        await fetchTeams();
      } else {
        await fetch(API.skillsAdd, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skill: val }) });
        await fetchSkills();
      }
    }

    setShowAddEdit(false);
    setInputValue("");
    setEditing(null);
  }

  // ---------- delete ----------
  async function deleteItem(type, id) {
    if (!confirm(`Delete this ${type}?`)) return;
    if (type === "team") {
      await fetch(API.teamsDelete, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      await fetchTeams();
    } else {
      await fetch(API.skillsDelete, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      await fetchSkills();
    }
  }

  // ---------- add member to team/skill ----------
  async function addMemberToTeam(teamId, memberId) {
    await fetch(API.teamsAddMember, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamId, memberId }) });
    await fetchMembers();
    setMemberModalOpen(false);
    setMemberModalTarget(null);
  }
  async function addMemberToSkill(skillId, memberId) {
    const res = await fetch(API.skillsAddMember, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skillId, memberId }) });
    if (!res.ok) {
      const j = await parseJsonSafe(res);
      alert(j?.error || "Failed to add member to skill");
    }
    await fetchMembers();
    setMemberModalOpen(false);
    setMemberModalTarget(null);
  }

  function openMembersModalFor(type, item) {
    setMemberModalTarget({ type, item });
    setMemberModalOpen(true);
  }
  function openViewMembers(type, item) {
    setViewMembersTarget({ type, item });
  }

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-4 bg-white rounded-xl shadow-md flex flex-col h-full min-h-0">
      {/* Header with toggle + single Add button */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold">View</h3>
          <div
            role="button"
            onClick={() => setView(view === "teams" ? "skills" : "teams")}
            className="relative inline-flex h-7 w-14 items-center rounded-full cursor-pointer select-none bg-gray-300"
            title="Toggle Teams / Skills"
          >
            <span className={`absolute left-2 text-xs ${view === "teams" ? "text-white" : "text-gray-600"}`}>T</span>
            <span className={`absolute right-2 text-xs ${view === "skills" ? "text-white" : "text-gray-600"}`}>S</span>
            <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform duration-200 ${view === "skills" ? "translate-x-7" : "translate-x-0"}`} />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={openAdd} className="bg-blue-600 text-white px-3 py-2 rounded text-sm">
            {view === "teams" ? "+ Team" : "+ Skill"}
          </button>
          <button onClick={refreshAll} className="px-3 py-2 border rounded text-sm">Refresh</button>
        </div>
      </div>

      {/* Lists */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
        {view === "teams" ? (
          localTeams.length ? localTeams.map((team) => (
            <div
              key={team.id}
              className="flex items-center justify-between border rounded-lg p-2 hover:bg-gray-50 cursor-pointer"
              onClick={(e) => { if (e.target.closest('button')) return; openViewMembers("team", team); }}
            >
              <div>
                <div className="font-medium">{team.name}</div>
                <div className="text-xs text-gray-500">
                  {localMembers.filter(m => m.teams?.some(t => t.id === team.id)).length} member(s)
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openMembersModalFor("team", team)} className="text-xs bg-green-600 text-white px-2 py-1 rounded">+ Member</button>
                <button onClick={() => openEdit("team", team)} className="text-xs px-2 py-1 border rounded">Edit</button>
                <button onClick={() => deleteItem("team", team.id)} className="text-xs bg-red-500 text-white px-2 py-1 rounded">Delete</button>
              </div>
            </div>
          )) : <p className="text-gray-500">No teams yet.</p>
        ) : (
          localSkills.length ? localSkills.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between border rounded-lg p-2 hover:bg-gray-50 cursor-pointer"
              onClick={(e) => { if (e.target.closest('button')) return; openViewMembers("skill", s); }}
            >
              <div>
                <div className="font-medium">{s.skill}</div>
                <div className="text-xs text-gray-500">
                  {localMembers.filter(m => m.skills?.some(sk => sk.id === s.id)).length} member(s)
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openMembersModalFor("skill", s)} className="text-xs bg-green-600 text-white px-2 py-1 rounded">+ Member</button>
                <button onClick={() => openEdit("skill", s)} className="text-xs px-2 py-1 border rounded">Edit</button>
                <button onClick={() => deleteItem("skill", s.id)} className="text-xs bg-red-500 text-white px-2 py-1 rounded">Delete</button>
              </div>
            </div>
          )) : <p className="text-gray-500">No skills yet.</p>
        )}

        {/* View Members popup */}
        {viewMembersTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <h3 className="font-bold mb-3">
                {viewMembersTarget.type === "team"
                  ? `Members in ${viewMembersTarget.item.name}`
                  : `Members with ${viewMembersTarget.item.skill}`}
              </h3>

              {localMembers.filter(m =>
                viewMembersTarget.type === "team"
                  ? m.teams?.some(t => t.id === viewMembersTarget.item.id)
                  : m.skills?.some(sk => sk.id === viewMembersTarget.item.id)
              ).length ? (
                <ul className="space-y-2">
                  {localMembers
                    .filter(m =>
                      viewMembersTarget.type === "team"
                        ? m.teams?.some(t => t.id === viewMembersTarget.item.id)
                        : m.skills?.some(sk => sk.id === viewMembersTarget.item.id)
                    )
                    .map(m => (
                      <li key={m.id} className="border-b py-2">
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-gray-500">{m.email}</div>
                      </li>
                    ))}
                </ul>
              ) : <p className="text-gray-500">No members found</p>}

              <div className="mt-4 flex justify-end">
                <button onClick={() => setViewMembersTarget(null)} className="px-3 py-1 border rounded">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      {showAddEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="font-bold mb-3">{editing ? `Edit ${editing.type}` : `Add ${view === "teams" ? "Team" : "Skill"}`}</h3>
            <input
              className="w-full border rounded p-2 mb-4"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={editing ? "" : view === "teams" ? "Team name" : "Skill name"}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowAddEdit(false); setInputValue(""); setEditing(null); }} className="px-3 py-1 border rounded">Cancel</button>
              <button onClick={saveAddEdit} className="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Add members modal */}
      {memberModalOpen && memberModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <h3 className="font-bold mb-3">
              {memberModalTarget.type === "team"
                ? `Add member to ${memberModalTarget.item.name}`
                : `Add member to ${memberModalTarget.item.skill}`}
            </h3>

            {localMembers.length ? (
              <div className="space-y-2">
                {localMembers.map(m => (
                  <div key={m.id} className="flex items-center justify-between border-b py-2">
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-gray-500">{m.email}</div>
                    </div>
                    <button
                      onClick={() =>
                        memberModalTarget.type === "team"
                          ? addMemberToTeam(memberModalTarget.item.id, m.id)
                          : addMemberToSkill(memberModalTarget.item.id, m.id)
                      }
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-500">No members available</p>}

            <div className="mt-4 flex justify-end">
              <button onClick={() => { setMemberModalOpen(false); setMemberModalTarget(null); }} className="px-3 py-1 border rounded">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
