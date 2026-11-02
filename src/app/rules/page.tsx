import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getActiveMandate } from "@/lib/data";
import { getDemoUser } from "@/lib/demo-user";

export default async function RulesIndex() {
  await connection();
  const user = await getDemoUser();
  const mandate = await getActiveMandate(user.id);
  redirect(mandate ? `/rules/${mandate.id}` : "/rules/new");
}
