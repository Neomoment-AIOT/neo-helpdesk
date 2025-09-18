"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MemberAuth() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // "login" or "signup"
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    const url = mode === "signup" ? "/api/members/signup" : "/api/members/login";
    const payload =
      mode === "signup"
        ? { name, username, email, contact, password }
        : { username, password };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage(
          mode === "signup"
            ? "Account created!"
            : `Welcome back, ${data.name}`
        );
        setName("");
        setUsername("");
        setEmail("");
        setContact("");
        setPassword("");

        // 🔑 Redirect if admin logs in
        if (mode === "login" && username.toLowerCase() === "admin") {
          router.push("/admin");
        }
      } else {
        setMessage(data.error);
      }
    } catch (err) {
      setMessage("Something went wrong");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">
        {mode === "signup" ? "Sign Up" : "Login"}
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === "signup" && (
          <>
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border p-2 rounded"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border p-2 rounded"
            />
            <input
              type="text"
              placeholder="Contact Number"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="border p-2 rounded"
            />
          </>
        )}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 rounded"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white py-2 rounded"
        >
          {mode === "signup" ? "Sign Up" : "Login"}
        </button>
      </form>

      <p className="mt-4 text-center">
        {mode === "signup"
          ? "Already have an account?"
          : "Don't have an account?"}{" "}
        <button
          className="text-blue-600 underline"
          onClick={() =>
            setMode(mode === "signup" ? "login" : "signup")
          }
        >
          {mode === "signup" ? "Login" : "Sign Up"}
        </button>
      </p>
      {message && (
        <p className="mt-2 text-center text-red-600">{message}</p>
      )}
    </div>
  );
}
