"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export function SignInForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function sendLink(event: React.FormEvent) {
    event.preventDefault();
    setState("sending");
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo() },
    });
    if (error) {
      setState("error");
      setMessage(
        error.status === 429
          ? "Too many links requested. Wait a minute and try again."
          : "The link wasn't sent. Check the address and try again.",
      );
      return;
    }
    setState("sent");
  }

  async function google() {
    await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
  }

  if (state === "sent") {
    return (
      <div role="status" className="rounded-xl rounded-xl border border-edge p-6">
        <h2 className="semiwide text-xl font-bold">Check your email</h2>
        <p className="mt-2 leading-relaxed text-graphite">
          We sent a sign-in link to <strong className="text-ink">{email}</strong>. Open it on this device to finish. It
          expires in an hour.
        </p>
        <button type="button" onClick={() => setState("idle")} className="link mt-4 text-[15px]">
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div>
      <button type="button" onClick={google} className="btn btn-secondary w-full">
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            fill="currentColor"
            d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.96S8.78 6.26 12 6.26c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.68 3.7 14.55 2.75 12 2.75 6.9 2.75 2.75 6.9 2.75 12S6.9 21.25 12 21.25c5.34 0 8.88-3.75 8.88-9.04 0-.6-.07-1.06-.15-1.51Z"
          />
        </svg>
        Continue with Google
      </button>

      <div className="my-6 flex items-center gap-4 text-[13px] text-graphite">
        <span className="h-px flex-1 bg-rule" />
        or use your email
        <span className="h-px flex-1 bg-rule" />
      </div>

      <form onSubmit={sendLink} noValidate={false}>
        <label htmlFor="email" className="label">
          Work email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          className="field h-11"
        />
        {state === "error" && (
          <p role="alert" className="mt-2 text-[14px] font-medium">
            {message}
          </p>
        )}
        <button type="submit" disabled={state === "sending" || !email} className="btn btn-primary mt-4 w-full">
          {state === "sending" ? "Sending link" : "Email me a sign-in link"}
        </button>
      </form>
      <p className="mt-4 text-[13px] leading-relaxed text-graphite">
        No password needed. New here? The same link creates your free account.
      </p>
    </div>
  );
}
