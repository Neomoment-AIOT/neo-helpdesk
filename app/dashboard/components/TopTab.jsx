"use client";

export default function TopTab({ id, cur, setTab, children }) {
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
