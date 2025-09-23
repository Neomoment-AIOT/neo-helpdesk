"use client";

export default function Meta({ label, value }) {
  return (
    <div className="border border-slate-200 rounded-lg p-2 bg-white">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="text-sm text-slate-800 break-all">{String(value ?? "-")}</div>
    </div>
  );
}
