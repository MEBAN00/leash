import { generateText, Output } from "ai";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db";
import { agentModel } from "./agent/model";
import { recordEvent } from "./events";
import { policyRulesSchema, type PolicyRules } from "./policy/types";

const compiledSchema = z.object({
  title: z.string().describe("3-6 word name for this mandate, e.g. 'Party supplies under $250'"),
  rules: policyRulesSchema,
  unenforced: z
    .array(z.string())
    .describe("Requests from the user that none of the rule fields can express, in their words. Empty if none."),
});

export type CompiledMandate = z.infer<typeof compiledSchema>;

/** Turn the user's plain-English mandate into structured, enforceable rules. */
export async function compileMandate(prompt: string, timezone: string): Promise<CompiledMandate> {
  const { output } = await generateText({
    model: agentModel(),
    output: Output.object({ schema: compiledSchema }),
    system: [
      "You convert a person's plain-English spending instructions for an AI shopping agent into a strict JSON policy.",
      "Only encode what the person actually said. Use null for limits they didn't mention, empty arrays for lists they didn't mention.",
      "Money is integer cents in USD: $40 -> 4000.",
      "'Ask me', 'check with me', 'confirm' above an amount -> approvalItemThresholdCents (per item) or approvalOrderThresholdCents (whole order).",
      "'Never more than' / 'max' per item -> maxItemPriceCents (hard limit). Overall spending caps -> budget, with period day/week/month, or 'total' if no period given.",
      "Merchants are bare domains: 'no Amazon' -> blockedMerchants ['amazon.com']. Categories are short lowercase keywords: 'no alcohol' -> ['alcohol'].",
      "allowRecurring is false unless they explicitly allow subscriptions or recurring charges.",
      `allowedHours uses the person's timezone (${timezone}) unless they name one. expiresAt is an ISO 8601 datetime; resolve relative dates from now (${new Date().toISOString()}).`,
      "If they ask for something no field can express (e.g. 'only eco-friendly brands'), put it in unenforced. Never invent rules.",
    ].join("\n"),
    prompt,
  });
  return output;
}

export async function createDraftMandate(opts: { userId: string; walletId: string; prompt: string; compiled: CompiledMandate }) {
  const [m] = await db
    .insert(schema.mandates)
    .values({
      userId: opts.userId,
      walletId: opts.walletId,
      prompt: opts.prompt,
      title: opts.compiled.title,
      rules: opts.compiled.rules,
      unenforced: opts.compiled.unenforced,
      status: "draft",
    })
    .returning();
  return m;
}

export async function updateDraftRules(mandateId: string, rules: PolicyRules) {
  const parsed = policyRulesSchema.parse(rules);
  await db
    .update(schema.mandates)
    .set({ rules: parsed })
    .where(and(eq(schema.mandates.id, mandateId), eq(schema.mandates.status, "draft")));
}

/** Activate a draft; any previously active mandate for the user is revoked. */
export async function activateMandate(mandateId: string, userId: string) {
  await db.transaction(async (tx) => {
    await tx
      .update(schema.mandates)
      .set({ status: "revoked" })
      .where(and(eq(schema.mandates.userId, userId), eq(schema.mandates.status, "active"), ne(schema.mandates.id, mandateId)));
    await tx
      .update(schema.mandates)
      .set({ status: "active", activatedAt: new Date() })
      .where(and(eq(schema.mandates.id, mandateId), eq(schema.mandates.userId, userId)));
  });
  await recordEvent({ type: "mandate.activated", mandateId, payload: { mandateId } });
}

export async function revokeMandate(mandateId: string, userId: string) {
  await db
    .update(schema.mandates)
    .set({ status: "revoked" })
    .where(and(eq(schema.mandates.id, mandateId), eq(schema.mandates.userId, userId)));
}
