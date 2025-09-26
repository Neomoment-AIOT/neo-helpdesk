"use client";

export default function TopTab({ id, cur, setTab, children }) {
  const active = id === cur;
  return (
    <button
      onClick={() => setTab(id)}
      className={`px-15 py-2 text-sm transition cursor-pointer inline-flex
        ${active 
          ? "bg-black text-white hover:bg-gray-800 shadow-md " 
          : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-50"
        }
        first:rounded-l-md last:rounded-r-md -ml-px`}
    >
      {children}
    </button>
  );
}
