"use client";

import { useState, useTransition } from "react";
import { approveAction, declineAction, refundAction, type ActionState } from "@/app/actions";
import { Spinner } from "./submit-button";

type Kind = "approve" | "decline" | "refund";
const actions: Record<Kind, (id: string) => Promise<ActionState>> = {
  approve: approveAction,
  decline: declineAction,
  refund: refundAction,
};

/** Approve / decline (for ASK) or refund (for paid) a purchase. */
export function PurchaseActions({ purchaseId, status, large = false }: { purchaseId: string; status: string; large?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState<Kind | null>(null);
  const [error, setError] = useState<string>();

  const run = (kind: Kind) => {
    setError(undefined);
    setRunning(kind);
    startTransition(async () => {
      const result = await actions[kind](purchaseId);
      if (result?.error) setError(result.error);
      setRunning(null);
    });
  };

  const size = large ? "min-h-12 text-base" : "";
  const label = (kind: Kind, idle: string, busy: string) =>
    running === kind ? (
      <>
        <Spinner />
        {busy}
      </>
    ) : (
      idle
    );

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2">
        {status === "pending_approval" && (
          <>
            <button className={`btn btn-primary ${size} ${large ? "flex-[2]" : ""}`} disabled={pending} onClick={() => run("approve")}>
              {label("approve", "Approve and pay", "Paying…")}
            </button>
            <button className={`btn btn-ghost ${size} ${large ? "flex-1" : ""}`} disabled={pending} onClick={() => run("decline")}>
              {label("decline", "Decline", "Declining…")}
            </button>
          </>
        )}
        {status === "paid" && (
          <button className="btn btn-ghost" disabled={pending} onClick={() => run("refund")}>
            {label("refund", "Refund", "Refunding…")}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-[0.9rem] text-deny">
          {error}
        </p>
      )}
    </div>
  );
}
