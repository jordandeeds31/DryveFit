"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Check } from "lucide-react";

type Status = "idle" | "loading" | "success" | "error";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5787";

const WaitlistForm = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === "loading" || status === "success") return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch(`${API_URL}/api/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "Something went wrong");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong",
      );
    }
  };

  if (status === "success") {
    return (
      <div className="flex items-center gap-2 rounded-full border border-neon-green/30 bg-neon-green/10 px-5 py-3 text-sm font-medium text-neon-green">
        <Check className="h-4 w-4" />
        You&apos;re on the list — we&apos;ll email you at launch.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:items-start"
    >
      <div className="flex-1">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          disabled={status === "loading"}
          className="w-full rounded-full border border-border bg-white/[0.05] px-5 py-3 text-sm text-foreground placeholder:text-muted outline-none backdrop-blur-md transition focus:border-primary-blue-bright disabled:opacity-60"
        />
        {status === "error" && (
          <p className="mt-2 px-1 text-sm text-red-400">{errorMessage}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={status === "loading"}
        className="flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary-blue-bright px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {status === "loading" ? "Joining..." : "Join the waitlist"}
        {status !== "loading" && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
};

export default WaitlistForm;
