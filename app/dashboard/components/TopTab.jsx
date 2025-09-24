"use client";

export default function TopTab({ id, cur, setTab, children }) {
  const active = id === cur;
  return (
    <button
      onClick={() => setTab(id)}
      className={`px-4 py-1.5 rounded-lg text-sm border transition
        ${active ? "bg-black text-white border-black" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"}`}
    >
      {children}
    </button>
  );
}
