// components/TimeText.jsx
"use client";
import { useEffect, useState } from "react";

export default function TimeText({ value, placeholder = "—", options }) {
  const [text, setText] = useState(placeholder);
  useEffect(() => {
    if (!value) return;
    try {
      const d = new Date(value);
      // options lets you pass { dateStyle: 'medium', timeStyle: 'short' } etc.
      setText(d.toLocaleString(undefined, options));
    } catch {
      setText(placeholder);
    }
  }, [value, placeholder, options]);
  return <span>{text}</span>;
}
