"use client";

import { useActionState } from "react";
import { updateSettings, type FormState } from "@/app/actions";

type Props = { email: string; name: string | null; company: string | null; jobTitle: string | null; notifyEmail: boolean };

export function SettingsForm({ email, name, company, jobTitle, notifyEmail }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateSettings, { status: "idle" });

  return (
    <form action={action} className="max-w-lg space-y-5">
      <div>
        <span className="label">Email</span>
        <p className="py-1 text-graphite">{email}</p>
      </div>
      <div>
        <label htmlFor="full_name" className="label">
          Name
        </label>
        <input id="full_name" name="full_name" defaultValue={name ?? ""} autoComplete="name" className="field" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="company" className="label">
            Company
          </label>
          <input id="company" name="company" defaultValue={company ?? ""} autoComplete="organization" className="field" />
        </div>
        <div>
          <label htmlFor="job_title" className="label">
            Role
          </label>
          <input id="job_title" name="job_title" defaultValue={jobTitle ?? ""} placeholder="BIM modeller" className="field" />
        </div>
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-edge p-4 hover:border-blue">
        <input type="checkbox" name="notify_email" defaultChecked={notifyEmail} className="mt-1 h-4 w-4 accent-[#1f5fd6]" />
        <span>
          <span className="block font-medium">Email me about updates</span>
          <span className="block text-[14px] text-graphite">
            New versions of families you’ve downloaded, new families in categories you follow and progress on your requests.
          </span>
        </span>
      </label>
      {state.message && (
        <p role={state.status === "error" ? "alert" : "status"} className="text-[15px] font-medium">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Saving" : "Save settings"}
      </button>
    </form>
  );
}
