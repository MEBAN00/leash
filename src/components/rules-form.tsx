"use client";

import { useActionState, useEffect, useRef } from "react";
import { compileRulesAction } from "@/app/actions";
import { SubmitButton } from "./submit-button";

const examples = [
  {
    label: "Kid's party",
    text: "Party supplies only. $250 total. Ask me before anything over $40. Nothing from Amazon, no subscriptions, and never more than 15 of one thing.",
  },
  {
    label: "Weekly groceries",
    text: "Groceries, up to $120 a week. Ask me for any single order over $60. No alcohol. Only shop between 8am and 9pm.",
  },
  {
    label: "Office restock",
    text: "Office supplies from Staples or Target only, $300 a month, nothing over $75 per item. Rules expire at the end of the year.",
  },
];

export function RulesForm({ defaultPrompt = "" }: { defaultPrompt?: string }) {
  const [state, action] = useActionState(compileRulesAction, undefined);
  const ref = useRef<HTMLTextAreaElement>(null);
  const tzRef = useRef<HTMLInputElement>(null);

  // The person's timezone, for rules like "only between 8am and 9pm".
  useEffect(() => {
    if (tzRef.current) tzRef.current.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, []);

  return (
    <form action={action} className="space-y-4">
      <input ref={tzRef} type="hidden" name="timezone" defaultValue="UTC" />
      <label htmlFor="prompt" className="sr-only">
        Your rules
      </label>
      <textarea
        ref={ref}
        id="prompt"
        name="prompt"
        rows={5}
        required
        defaultValue={state?.value ?? defaultPrompt}
        placeholder="e.g. Party supplies, $250 total, ask me before anything over $40…"
        className="field resize-y text-[1.05rem] leading-relaxed"
      />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[0.85rem] text-ink-3">Start from</span>
        {examples.map((ex) => (
          <button
            key={ex.label}
            type="button"
            onClick={() => {
              if (ref.current) {
                ref.current.value = ex.text;
                ref.current.focus();
              }
            }}
            className="rounded-full px-3 py-1 text-[0.85rem] text-ink-2 ring-1 ring-line transition-colors hover:bg-paper-sunken hover:text-ink active:scale-[0.97]"
          >
            {ex.label}
          </button>
        ))}
      </div>
      {state?.error && (
        <p role="alert" className="text-[0.92rem] text-deny">
          {state.error}
        </p>
      )}
      <SubmitButton pendingLabel="Reading your rules…">Turn into rules</SubmitButton>
    </form>
  );
}
