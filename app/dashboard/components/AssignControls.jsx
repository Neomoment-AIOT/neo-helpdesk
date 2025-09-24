"use client";

import { useEffect, useState } from "react";

export default function AssignControls({
  allOrgs,
  defaultOrgId,
  customRolesByOrg,
  loadRolesForOrg,
  onAssign,
  builtInRoles = ["MANAGER", "DEVELOPER", "TESTER", "VIEWER"],
}) {
  const [toOrgId, setToOrgId] = useState(String(defaultOrgId));
  const [roleVal, setRoleVal] = useState("VIEWER");

  const rowCustom = customRolesByOrg[toOrgId] || [];
  const options = [
    ...builtInRoles.map((r) => ({ value: r, label: r })),
    ...rowCustom.map((cr) => ({ value: `custom:${cr.id}`, label: cr.name })),
  ];

  useEffect(() => {
    if (!customRolesByOrg[toOrgId]) {
      loadRolesForOrg(toOrgId);
    }
  }, [toOrgId, customRolesByOrg, loadRolesForOrg]);

  return (
    <div className="flex items-center gap-2">
      <select
        className="border border-slate-300 rounded px-2 py-1 text-sm bg-white"
        value={toOrgId}
        onChange={(e) => {
          const v = e.target.value;
          setToOrgId(v);
          setRoleVal("VIEWER"); // reset for the new org
        }}
      >
        {allOrgs.map((o) => (
          <option key={o.id} value={String(o.id)}>
            {o.name}
          </option>
        ))}
      </select>

      <select
        className="border border-slate-300 rounded px-2 py-1 text-sm bg-white"
        value={roleVal}
        onChange={(e) => setRoleVal(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <button
        onClick={() => onAssign(toOrgId, roleVal)}
        className="border border-slate-300 rounded px-2 py-1 text-sm hover:bg-slate-50"
      >
        Add
      </button>
    </div>
  );
}
