"use client";

export default function TopTab({ id, cur, setTab, children }) {
  const active = id === cur;
  return (
    <button
      onClick={() => setTab(id)}
      className={`px-5 py-1.5 rounded-lg text-sm border transition cursor-pointer
        ${active ? "bg-black text-white border-gray-800" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"}`}
    >
      {children}
    </button>
  );
}
