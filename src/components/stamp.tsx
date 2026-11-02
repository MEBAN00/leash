"use client";

import { motion, useReducedMotion } from "motion/react";
import type { Decision } from "@/lib/policy/types";
import { Check, Cross, Hand } from "./icons";

const styles: Record<Decision, { label: string; className: string; Icon: typeof Check }> = {
  ALLOW: { label: "Allowed", className: "text-allow bg-allow-tint", Icon: Check },
  ASK: { label: "Ask first", className: "text-ask bg-ask-tint", Icon: Hand },
  DENY: { label: "Refused", className: "text-deny bg-deny-tint", Icon: Cross },
};

/** The policy decision, pressed onto the receipt like an ink stamp. */
export function Stamp({ decision, animate = false }: { decision: Decision; animate?: boolean }) {
  const reduce = useReducedMotion();
  const { label, className, Icon } = styles[decision];
  const play = animate && !reduce;

  return (
    <motion.span
      initial={play ? { scale: 1.35, rotate: -9, opacity: 0 } : false}
      animate={{ scale: 1, rotate: -3, opacity: 1 }}
      transition={{ type: "spring", bounce: 0.18, duration: 0.45, delay: play ? 0.25 : 0 }}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[0.8rem] font-bold tracking-[0.04em] uppercase ring-1 ring-current/30 ${className}`}
    >
      <Icon width={14} height={14} strokeWidth={2.2} />
      {label}
    </motion.span>
  );
}
