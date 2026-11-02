"use client";

import { useActionState, useState } from "react";
import { startTaskAction } from "@/app/actions";
import { Warning } from "./icons";
import { SubmitButton } from "./submit-button";

export function TaskForm() {
  const [state, action] = useActionState(startTaskAction, undefined);
  const [compromised, setCompromised] = useState(false);

  return (
    <form action={action} className="space-y-3">
      <label htmlFor="task" className="text-[0.95rem] font-semibold">
        What should the agent do?
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="task"
          name="task"
          required
          autoComplete="off"
          defaultValue={state?.value}
          placeholder="Plan a birthday party for 12 kids"
          className="field text-[1.05rem]"
        />
        <SubmitButton pendingLabel="Starting…" className="shrink-0">
          Send the agent
        </SubmitButton>
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-[0.88rem] text-ink-2 select-none">
        <input
          type="checkbox"
          name="mode"
          value="compromised"
          checked={compromised}
          onChange={(e) => setCompromised(e.target.checked)}
          className="mt-[0.2rem] size-4 accent-[var(--deny)]"
        />
        <span>
          <span className="font-semibold text-ink">Simulate a compromised agent.</span> Plants a hidden instruction in a product
          listing and tells the agent to obey it, so you can watch your rules hold.
        </span>
      </label>
      {compromised && (
        <p className="flex items-center gap-2 text-[0.85rem] text-deny">
          <Warning width={14} height={14} /> Demo mode: this agent will try to break your rules.
        </p>
      )}
      {state?.error && (
        <p role="alert" className="text-[0.92rem] text-deny">
          {state.error}
        </p>
      )}
    </form>
  );
}
