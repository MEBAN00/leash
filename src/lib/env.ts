import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PAYPAL_ENV: z.enum(["sandbox", "live"]).default("sandbox"),
  PAYPAL_CLIENT_ID: z.string().min(1),
  PAYPAL_CLIENT_SECRET: z.string().min(1),
  CHANNEL3_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1).default("gpt-6-luna"),
  APP_URL: z.string().url().default("http://localhost:3000"),
});

type Env = z.infer<typeof schema>;

/**
 * Read a single env var, validated. Lazy so that code which never touches
 * PayPal (e.g. policy engine tests) doesn't need every key set.
 */
export function env<K extends keyof Env>(key: K): Env[K] {
  const parsed = schema.shape[key].safeParse(process.env[key]);
  if (!parsed.success) {
    throw new Error(`Missing or invalid env var ${key}. See .env.example.`);
  }
  return parsed.data as Env[K];
}
