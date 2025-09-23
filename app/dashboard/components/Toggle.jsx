"use client";

export default function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between border border-slate-200 rounded px-3 py-2 text-sm bg-white">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
