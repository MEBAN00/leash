"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { replyToRunAction } from "@/app/actions";
import { Arrow } from "./icons";
import { Spinner } from "./submit-button";

/**
 * Reply to the agent without leaving the task: answer its question (tap a
 * suggested answer or type one), or send a follow-up after it finishes.
 */
export function RunReply({ runId, options = [], mode }: { runId: string; options?: string[]; mode: "answer" | "followup" }) {
  const [state, action] = useActionState(replyToRunAction, undefined);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="runId" value={runId} />
      {mode === "answer" && options.length > 0 && <Choices options={options} />}
      <div className="flex gap-2">
        <label htmlFor={`reply-${runId}`} className="sr-only">
          {mode === "answer" ? "Your answer" : "Reply to the agent"}
        </label>
        <input
          id={`reply-${runId}`}
          name="reply"
          autoComplete="off"
          defaultValue={state?.value}
          autoFocus={mode === "answer"}
          placeholder={mode === "answer" ? (options.length ? "Or type your own answer" : "Type your answer") : "Ask for something else, or change the plan"}
          className="field min-w-0"
        />
        <SendButton />
      </div>
      {state?.error && (
        <p role="alert" className="text-[0.9rem] text-deny">
          {state.error}
        </p>
      )}
    </form>
  );
}

function Choices({ options }: { options: string[] }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="submit"
          name="choice"
          value={o}
          disabled={pending}
          className="rounded-full bg-surface px-4 py-2 text-[0.95rem] font-medium ring-1 ring-line-strong transition-[transform,background-color] hover:bg-petrol-tint active:scale-[0.97] disabled:opacity-50"
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-label="Send reply" className="btn btn-primary shrink-0 px-4">
      {pending ? <Spinner /> : <Arrow />}
    </button>
  );
}
