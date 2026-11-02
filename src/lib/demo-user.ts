import { db, schema } from "../db";

// Hackathon scope: one demo user, no sign-in.
const DEMO_EMAIL = "demo@leash.local";

export async function getDemoUser() {
  const [user] = await db
    .insert(schema.users)
    .values({ email: DEMO_EMAIL, name: "Demo" })
    .onConflictDoUpdate({ target: schema.users.email, set: { email: DEMO_EMAIL } })
    .returning();
  return user;
}
