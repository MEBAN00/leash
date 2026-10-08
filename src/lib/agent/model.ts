import { createOpenAI } from "@ai-sdk/openai";
import { env } from "../env";

/** The agent's model. Change OPENAI_MODEL in .env.local to swap it. */
export function agentModel() {
  const openai = createOpenAI({ apiKey: env("OPENAI_API_KEY") });
  return openai(env("OPENAI_MODEL"));
}
